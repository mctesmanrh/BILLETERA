create schema if not exists billetera;

create table billetera.wallet_settings (
  id text primary key,
  monthly_budget bigint not null default 1500000
    constraint wallet_settings_monthly_budget_nonnegative check (monthly_budget >= 0),
  active_month date not null default date_trunc(
    'month',
    timezone('America/Bogota', now())
  )::date,
  updated_at timestamptz not null default now(),
  constraint wallet_settings_singleton check (id = 'main'),
  constraint wallet_settings_active_month_first_day check (
    extract(day from active_month) = 1
  )
);

insert into billetera.wallet_settings (id, monthly_budget)
values ('main', 1500000)
on conflict (id) do nothing;

create table billetera.expenses (
  id text primary key,
  amount bigint not null
    constraint expenses_amount_positive check (amount > 0),
  category text not null
    constraint expenses_category_valid check (
      category in (
        'alimentacion',
        'transporte',
        'servicios',
        'salud',
        'entretenimiento',
        'otros'
      )
    ),
  spent_on date not null,
  description text not null
    constraint expenses_description_present check (
      char_length(btrim(description)) between 1 and 500
    ),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_active_spent_on_idx
  on billetera.expenses (spent_on desc, created_at desc)
  where deleted_at is null;

create index expenses_deleted_at_idx
  on billetera.expenses (deleted_at desc)
  where deleted_at is not null;

create table billetera.monthly_archives (
  month_start date primary key,
  monthly_budget bigint not null
    constraint monthly_archives_budget_nonnegative check (monthly_budget >= 0),
  total_spent bigint not null
    constraint monthly_archives_total_nonnegative check (total_spent >= 0),
  expense_count bigint not null
    constraint monthly_archives_expense_count_nonnegative check (expense_count >= 0),
  deleted_expense_count bigint not null
    constraint monthly_archives_deleted_count_nonnegative check (
      deleted_expense_count >= 0
    ),
  expenses jsonb not null default '[]'::jsonb,
  deleted_expenses jsonb not null default '[]'::jsonb,
  archived_at timestamptz not null default now(),
  constraint monthly_archives_month_first_day check (
    extract(day from month_start) = 1
  ),
  constraint monthly_archives_expenses_array check (
    jsonb_typeof(expenses) = 'array'
  ),
  constraint monthly_archives_deleted_expenses_array check (
    jsonb_typeof(deleted_expenses) = 'array'
  )
);

create or replace function billetera.rollover_wallet_month(p_target_month date)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, billetera
as $$
declare
  v_month date;
  v_next_month date;
  v_oldest_expense_month date;
  v_monthly_budget bigint;
  v_expenses jsonb;
  v_deleted_expenses jsonb;
  v_total_spent bigint;
  v_expense_count bigint;
  v_deleted_expense_count bigint;
  v_archived_months integer := 0;
  v_current_month date := date_trunc(
    'month',
    timezone('America/Bogota', now())
  )::date;
begin
  if p_target_month is null or extract(day from p_target_month) <> 1 then
    raise exception 'target month must be the first day of a month';
  end if;

  if p_target_month > v_current_month then
    raise exception 'target month cannot be in the future';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('tu-billetera-monthly-rollover', 0)
  );

  select active_month, monthly_budget
  into v_month, v_monthly_budget
  from billetera.wallet_settings
  where id = 'main'
  for update;

  if not found then
    insert into billetera.wallet_settings (id, monthly_budget, active_month)
    values ('main', 1500000, p_target_month)
    returning active_month, monthly_budget
    into v_month, v_monthly_budget;
  end if;

  select date_trunc('month', min(spent_on))::date
  into v_oldest_expense_month
  from billetera.expenses
  where spent_on < p_target_month;

  if v_oldest_expense_month is not null
     and v_oldest_expense_month < v_month then
    v_month := v_oldest_expense_month;
  end if;

  while v_month < p_target_month loop
    v_next_month := (v_month + interval '1 month')::date;

    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', expense.id,
            'amount', expense.amount,
            'category', expense.category,
            'date', to_char(expense.spent_on, 'YYYY-MM-DD'),
            'description', expense.description
          )
          order by expense.spent_on desc, expense.created_at desc
        ) filter (where expense.deleted_at is null),
        '[]'::jsonb
      ),
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', expense.id,
            'amount', expense.amount,
            'category', expense.category,
            'date', to_char(expense.spent_on, 'YYYY-MM-DD'),
            'description', expense.description,
            'deletedAt', expense.deleted_at
          )
          order by expense.spent_on desc, expense.created_at desc
        ) filter (where expense.deleted_at is not null),
        '[]'::jsonb
      ),
      coalesce(sum(expense.amount) filter (where expense.deleted_at is null), 0),
      count(*) filter (where expense.deleted_at is null),
      count(*) filter (where expense.deleted_at is not null)
    into
      v_expenses,
      v_deleted_expenses,
      v_total_spent,
      v_expense_count,
      v_deleted_expense_count
    from billetera.expenses as expense
    where expense.spent_on >= v_month
      and expense.spent_on < v_next_month;

    insert into billetera.monthly_archives (
      month_start,
      monthly_budget,
      total_spent,
      expense_count,
      deleted_expense_count,
      expenses,
      deleted_expenses,
      archived_at
    )
    values (
      v_month,
      v_monthly_budget,
      v_total_spent,
      v_expense_count,
      v_deleted_expense_count,
      v_expenses,
      v_deleted_expenses,
      now()
    )
    on conflict (month_start) do update
    set monthly_budget = excluded.monthly_budget,
        total_spent = excluded.total_spent,
        expense_count = excluded.expense_count,
        deleted_expense_count = excluded.deleted_expense_count,
        expenses = excluded.expenses,
        deleted_expenses = excluded.deleted_expenses,
        archived_at = excluded.archived_at;

    delete from billetera.expenses
    where spent_on >= v_month
      and spent_on < v_next_month;

    v_month := v_next_month;
    v_archived_months := v_archived_months + 1;
  end loop;

  update billetera.wallet_settings
  set active_month = p_target_month,
      updated_at = now()
  where id = 'main';

  return v_archived_months;
end;
$$;

comment on table billetera.wallet_settings is
  'Configuración mensual única de la billetera compartida.';

comment on table billetera.expenses is
  'Gastos activos y gastos recuperables de la papelera para el mes vigente.';

comment on table billetera.monthly_archives is
  'Instantáneas inmutables de los meses cerrados, disponibles para informes.';

comment on function billetera.rollover_wallet_month(date) is
  'Archiva meses cerrados y avanza el periodo activo en una transacción.';

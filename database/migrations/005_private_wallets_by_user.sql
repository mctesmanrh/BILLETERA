alter table billetera.wallet_settings
  drop constraint if exists wallet_settings_singleton;

alter table billetera.wallet_settings
  add column owner_id text not null default 'legacy-shared-wallet';

create unique index wallet_settings_owner_id_key
  on billetera.wallet_settings (owner_id);

alter table billetera.expenses
  add column owner_id text not null default 'legacy-shared-wallet';

alter table billetera.expenses
  drop constraint expenses_pkey;

alter table billetera.expenses
  add constraint expenses_pkey primary key (owner_id, id);

create index expenses_owner_active_spent_on_idx
  on billetera.expenses (owner_id, spent_on desc, created_at desc)
  where deleted_at is null;

create index expenses_owner_deleted_at_idx
  on billetera.expenses (owner_id, deleted_at desc)
  where deleted_at is not null;

alter table billetera.monthly_archives
  add column owner_id text not null default 'legacy-shared-wallet';

alter table billetera.monthly_archives
  drop constraint monthly_archives_pkey;

alter table billetera.monthly_archives
  add constraint monthly_archives_pkey primary key (owner_id, month_start);

create or replace function billetera.rollover_wallet_month_for_owner(
  p_owner_id text,
  p_target_month date
)
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
  if p_owner_id is null or char_length(btrim(p_owner_id)) = 0 then
    raise exception 'owner id is required';
  end if;

  if p_target_month is null or extract(day from p_target_month) <> 1 then
    raise exception 'target month must be the first day of a month';
  end if;

  if p_target_month > v_current_month then
    raise exception 'target month cannot be in the future';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('tu-billetera-monthly-rollover:' || p_owner_id, 0)
  );

  select active_month, monthly_budget
  into v_month, v_monthly_budget
  from billetera.wallet_settings
  where owner_id = p_owner_id
  for update;

  if not found then
    insert into billetera.wallet_settings (
      id,
      owner_id,
      display_name,
      monthly_budget,
      active_month
    )
    values (
      p_owner_id,
      p_owner_id,
      'MI BILLETERA',
      1500000,
      p_target_month
    )
    on conflict (owner_id) do nothing;

    select active_month, monthly_budget
    into v_month, v_monthly_budget
    from billetera.wallet_settings
    where owner_id = p_owner_id
    for update;
  end if;

  select date_trunc('month', min(spent_on))::date
  into v_oldest_expense_month
  from billetera.expenses
  where owner_id = p_owner_id
    and spent_on < p_target_month;

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
    where expense.owner_id = p_owner_id
      and expense.spent_on >= v_month
      and expense.spent_on < v_next_month;

    insert into billetera.monthly_archives (
      owner_id,
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
      p_owner_id,
      v_month,
      v_monthly_budget,
      v_total_spent,
      v_expense_count,
      v_deleted_expense_count,
      v_expenses,
      v_deleted_expenses,
      now()
    )
    on conflict (owner_id, month_start) do update
    set monthly_budget = excluded.monthly_budget,
        total_spent = excluded.total_spent,
        expense_count = excluded.expense_count,
        deleted_expense_count = excluded.deleted_expense_count,
        expenses = excluded.expenses,
        deleted_expenses = excluded.deleted_expenses,
        archived_at = excluded.archived_at;

    delete from billetera.expenses
    where owner_id = p_owner_id
      and spent_on >= v_month
      and spent_on < v_next_month;

    v_month := v_next_month;
    v_archived_months := v_archived_months + 1;
  end loop;

  update billetera.wallet_settings
  set active_month = p_target_month,
      updated_at = now()
  where owner_id = p_owner_id;

  return v_archived_months;
end;
$$;

create or replace function billetera.rollover_wallet_month(p_target_month date)
returns integer
language sql
security invoker
set search_path = pg_catalog, billetera
as $$
  select billetera.rollover_wallet_month_for_owner(
    'legacy-shared-wallet',
    p_target_month
  )
$$;

comment on column billetera.wallet_settings.owner_id is
  'Identificador Auth.js del propietario de la billetera.';

comment on column billetera.expenses.owner_id is
  'Propietario Auth.js que puede consultar o modificar el gasto.';

comment on column billetera.monthly_archives.owner_id is
  'Propietario Auth.js del informe mensual.';

comment on function billetera.rollover_wallet_month_for_owner(text, date) is
  'Archiva meses cerrados de una sola billetera y avanza su periodo activo.';

create schema if not exists billetera;

do $$
begin
  if to_regclass('billetera.wallet_settings') is null
     and to_regclass('public.wallet_settings') is not null then
    alter table public.wallet_settings set schema billetera;
  end if;

  if to_regclass('billetera.expenses') is null
     and to_regclass('public.expenses') is not null then
    alter table public.expenses set schema billetera;
  end if;

  if to_regclass('billetera.monthly_archives') is null
     and to_regclass('public.monthly_archives') is not null then
    alter table public.monthly_archives set schema billetera;
  end if;

  if to_regprocedure('billetera.rollover_wallet_month(date)') is null
     and to_regprocedure('public.rollover_wallet_month(date)') is not null then
    alter function public.rollover_wallet_month(date) set schema billetera;
  end if;
end
$$;

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

comment on schema billetera is
  'Datos aislados de Tu Billetera dentro del PostgreSQL compartido.';

comment on function billetera.rollover_wallet_month(date) is
  'Archiva meses cerrados y avanza el periodo activo en una transacción.';

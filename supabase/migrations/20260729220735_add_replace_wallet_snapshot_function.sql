create or replace function public.replace_wallet_snapshot(
  p_monthly_budget bigint,
  p_expenses jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_monthly_budget < 0 then
    raise exception 'monthly budget must be nonnegative';
  end if;

  if jsonb_typeof(p_expenses) <> 'array' then
    raise exception 'expenses must be a JSON array';
  end if;

  insert into public.wallet_settings (id, monthly_budget, updated_at)
  values ('main', p_monthly_budget, now())
  on conflict (id) do update
  set monthly_budget = excluded.monthly_budget,
      updated_at = excluded.updated_at;

  delete from public.expenses;

  insert into public.expenses (
    id,
    amount,
    category,
    spent_on,
    description,
    deleted_at,
    created_at,
    updated_at
  )
  select
    item.id,
    item.amount,
    item.category,
    item.spent_on,
    item.description,
    item.deleted_at,
    coalesce(item.created_at, now()),
    now()
  from jsonb_to_recordset(p_expenses) as item(
    id text,
    amount bigint,
    category text,
    spent_on date,
    description text,
    deleted_at timestamptz,
    created_at timestamptz
  );
end;
$$;

revoke all on function public.replace_wallet_snapshot(bigint, jsonb)
  from public, anon, authenticated;

grant execute on function public.replace_wallet_snapshot(bigint, jsonb)
  to service_role;

comment on function public.replace_wallet_snapshot(bigint, jsonb) is
  'Reemplaza atómicamente el presupuesto y los gastos. Solo puede ejecutarla el servidor con service_role.';

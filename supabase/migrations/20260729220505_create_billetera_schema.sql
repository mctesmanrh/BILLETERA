create table public.wallet_settings (
  id text primary key,
  monthly_budget bigint not null default 1500000
    constraint wallet_settings_monthly_budget_nonnegative check (monthly_budget >= 0),
  updated_at timestamptz not null default now(),
  constraint wallet_settings_singleton check (id = 'main')
);

insert into public.wallet_settings (id, monthly_budget)
values ('main', 1500000)
on conflict (id) do nothing;

create table public.expenses (
  id text primary key,
  amount bigint not null
    constraint expenses_amount_positive check (amount > 0),
  category text not null
    constraint expenses_category_valid check (
      category in ('alimentacion', 'transporte', 'servicios', 'salud', 'entretenimiento', 'otros')
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
  on public.expenses (spent_on desc, created_at desc)
  where deleted_at is null;

create index expenses_deleted_at_idx
  on public.expenses (deleted_at desc)
  where deleted_at is not null;

alter table public.wallet_settings enable row level security;
alter table public.expenses enable row level security;

revoke all on table public.wallet_settings from anon, authenticated;
revoke all on table public.expenses from anon, authenticated;

comment on table public.wallet_settings is
  'Configuración única de la billetera compartida de Angie y Jordan. Acceso exclusivo del servidor.';

comment on table public.expenses is
  'Gastos activos y eliminados lógicamente de Tu Billetera. Acceso exclusivo del servidor.';

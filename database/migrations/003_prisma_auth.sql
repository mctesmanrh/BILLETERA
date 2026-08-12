create schema if not exists billetera_auth;

create table if not exists billetera_auth.users (
  id text primary key,
  name text,
  email text unique,
  email_verified timestamptz(3),
  image text
);

create table if not exists billetera_auth.accounts (
  id text primary key,
  user_id text not null references billetera_auth.users(id) on delete cascade,
  type text not null,
  provider text not null,
  provider_account_id text not null,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  unique (provider, provider_account_id)
);

create index if not exists auth_accounts_user_id_idx
  on billetera_auth.accounts (user_id);

create table if not exists billetera_auth.sessions (
  id text primary key,
  session_token text not null unique,
  user_id text not null references billetera_auth.users(id) on delete cascade,
  expires timestamptz(3) not null
);

create index if not exists auth_sessions_user_id_idx
  on billetera_auth.sessions (user_id);

create table if not exists billetera_auth.verification_tokens (
  identifier text not null,
  token text not null,
  expires timestamptz(3) not null,
  unique (identifier, token)
);

comment on schema billetera_auth is
  'Usuarios, cuentas OAuth y sesiones de Tu Billetera gestionados por Auth.js y Prisma ORM.';

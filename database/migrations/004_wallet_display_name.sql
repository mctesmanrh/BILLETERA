alter table billetera.wallet_settings
  add column if not exists display_name text not null default 'ANGIE Y JORDAN';

update billetera.wallet_settings
set display_name = 'ANGIE Y JORDAN'
where char_length(btrim(display_name)) = 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'wallet_settings_display_name_present'
      and conrelid = 'billetera.wallet_settings'::regclass
  ) then
    alter table billetera.wallet_settings
      add constraint wallet_settings_display_name_present
      check (char_length(btrim(display_name)) between 1 and 60);
  end if;
end
$$;

comment on column billetera.wallet_settings.display_name is
  'Nombre editable que se muestra en el encabezado de la billetera.';

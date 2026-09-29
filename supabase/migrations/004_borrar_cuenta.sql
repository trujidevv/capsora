-- 004 · Borrar la cuenta desde la app (obligatorio para publicar en Google Play).
-- Ejecutar UNA vez en Supabase → SQL Editor → New query → pegar todo → Run.
-- Es seguro volver a ejecutarlo.
--
-- Al borrar el usuario de auth.users se borra en cascada todo lo suyo:
-- perfil, medicamentos → horarios → tomas, vínculos (como paciente y como
-- cuidador), latidos, móviles (dispositivos), avisos enviados e intentos de código.

begin;

create or replace function public.borrar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No has iniciado sesión';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.borrar_mi_cuenta() from public, anon;
grant execute on function public.borrar_mi_cuenta() to authenticated;

commit;

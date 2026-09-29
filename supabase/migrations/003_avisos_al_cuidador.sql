-- 003 · Avisos al móvil del cuidador cuando falta confirmar una toma.
-- Ejecutar UNA vez en Supabase → SQL Editor → New query → pegar todo → Run.
-- Es seguro volver a ejecutarlo.

-- ─────────────────────────────────────────────────────────────
-- 0. Extensiones para ejecutar la comprobación cada 5 minutos
-- ─────────────────────────────────────────────────────────────
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

begin;

-- ─────────────────────────────────────────────────────────────
-- 1. Zona horaria del paciente (el servidor tiene que saber cuándo son
--    "las 08:00" en su móvil: península y Canarias no coinciden)
-- ─────────────────────────────────────────────────────────────
alter table public.perfiles
  add column if not exists zona_horaria text not null default 'Europe/Madrid';

-- ─────────────────────────────────────────────────────────────
-- 2. Dispositivos: la "dirección" de avisos (token de Firebase) de cada móvil
-- ─────────────────────────────────────────────────────────────
create table if not exists public.dispositivos (
  token text primary key,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  actualizado_en timestamptz not null default now()
);
alter table public.dispositivos enable row level security;
create index if not exists dispositivos_usuario_idx on public.dispositivos (usuario_id);

drop policy if exists "ver mis dispositivos" on public.dispositivos;
create policy "ver mis dispositivos" on public.dispositivos
  for select to authenticated
  using (usuario_id = auth.uid());

drop policy if exists "borrar mis dispositivos" on public.dispositivos;
create policy "borrar mis dispositivos" on public.dispositivos
  for delete to authenticated
  using (usuario_id = auth.uid());
-- Sin INSERT/UPDATE directos: solo con registrar_dispositivo(). Así, si en un mismo
-- móvil entra otra cuenta, el token pasa a la cuenta nueva y la anterior deja de
-- recibir avisos en ese móvil.

create or replace function public.registrar_dispositivo(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No has iniciado sesión';
  end if;
  if p_token is null or length(p_token) < 20 or length(p_token) > 4096 then
    raise exception 'Token no válido';
  end if;

  insert into public.dispositivos (token, usuario_id, actualizado_en)
  values (p_token, auth.uid(), now())
  on conflict (token) do update
    set usuario_id = excluded.usuario_id, actualizado_en = now();

  -- Como mucho 5 móviles por persona (se quitan los más antiguos)
  delete from public.dispositivos d
  where d.usuario_id = auth.uid()
    and d.token not in (
      select d2.token from public.dispositivos d2
      where d2.usuario_id = auth.uid()
      order by d2.actualizado_en desc
      limit 5
    );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. Avisos ya enviados (para no avisar dos veces de la misma toma)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.avisos_cuidador (
  paciente_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  hora time not null,
  creado_en timestamptz not null default now(),
  primary key (paciente_id, fecha, hora)
);
alter table public.avisos_cuidador enable row level security;
-- Sin políticas: solo la usa el servidor.

-- ─────────────────────────────────────────────────────────────
-- 4. Tomas sin confirmar de las que hay que avisar.
--    Devuelve cada una UNA sola vez (la deja apuntada en avisos_cuidador).
--    Una fila por paciente y hora: si a las 08:00 tocaban tres pastillas, un solo aviso.
-- ─────────────────────────────────────────────────────────────
drop function if exists public.reclamar_avisos_cuidador(int, int);
create function public.reclamar_avisos_cuidador(
  p_espera_min int default 60,     -- minutos de margen antes de avisar
  p_ventana_horas int default 6    -- no se avisa de tomas más antiguas que esto
)
returns table (
  paciente uuid,
  cuidador uuid,
  nombre_paciente text,
  fecha_toma date,
  hora_toma time,
  num_medicamentos int,
  sin_senal boolean
)
language sql
volatile
security definer
set search_path = public
as $$
  -- Limpieza: lo de hace más de una semana ya no hace falta
  delete from public.avisos_cuidador where creado_en < now() - interval '7 days';

  with pacientes as (
    select v.usuario_id as pid,
           v.cuidador_id as cid,
           coalesce(nullif(trim(pf.nombre), ''), '') as pnombre,
           coalesce(
             (select tz.name from pg_timezone_names tz where tz.name = pf.zona_horaria limit 1),
             'Europe/Madrid'
           ) as zona
    from public.vinculos_cuidador v
    left join public.perfiles pf on pf.id = v.usuario_id
    where v.estado = 'activo' and v.cuidador_id is not null
  ),
  candidatas as (
    select p.pid, p.cid, p.pnombre, h.id as hid, m.id as mid, dia.f as f, h.hora as hh,
           (dia.f + h.hora) at time zone p.zona as momento,
           h.creado_en as h_creado, h.desactivado_en as h_desactivado
    from pacientes p
    join public.medicamentos m on m.usuario_id = p.pid
    join public.horarios h on h.medicamento_id = m.id
    cross join lateral (
      values ((now() at time zone p.zona)::date),
             ((now() at time zone p.zona)::date - 1)
    ) as dia(f)
  ),
  vencidas as (
    select c.*
    from candidatas c
    where c.momento <= now() - make_interval(mins => p_espera_min)
      and c.momento > now() - make_interval(hours => p_ventana_horas)
      and c.momento >= c.h_creado
      and (c.h_desactivado is null or c.momento < c.h_desactivado)
      and not exists (
        select 1 from public.tomas t
        where t.horario_id = c.hid
          and t.fecha = c.f
          and t.estado in ('tomado', 'omitido')
      )
  ),
  grupos as (
    select pid, cid, pnombre, f, hh, count(distinct mid)::int as nmed
    from vencidas
    group by pid, cid, pnombre, f, hh
  ),
  reclamadas as (
    insert into public.avisos_cuidador (paciente_id, fecha, hora)
    select pid, f, hh from grupos
    on conflict do nothing
    returning paciente_id, fecha, hora
  )
  select g.pid, g.cid, g.pnombre, g.f, g.hh, g.nmed,
         not coalesce((
           select l.notificaciones_ok and l.recibido_en > now() - interval '26 hours'
           from public.latidos l
           where l.usuario_id = g.pid
           limit 1
         ), false)
  from grupos g
  join reclamadas r on r.paciente_id = g.pid and r.fecha = g.f and r.hora = g.hh;
$$;

-- Si el envío falla, el servidor "suelta" el aviso para reintentarlo en 5 minutos
create or replace function public.soltar_aviso_cuidador(p_paciente uuid, p_fecha date, p_hora time)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.avisos_cuidador
  where paciente_id = p_paciente and fecha = p_fecha and hora = p_hora;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. Permisos
-- ─────────────────────────────────────────────────────────────
revoke all on function public.registrar_dispositivo(text) from public, anon;
grant execute on function public.registrar_dispositivo(text) to authenticated;

-- Estas dos solo las usa el servidor (la función "avisar-cuidadores")
revoke all on function public.reclamar_avisos_cuidador(int, int) from public, anon, authenticated;
revoke all on function public.soltar_aviso_cuidador(uuid, date, time) from public, anon, authenticated;
grant execute on function public.reclamar_avisos_cuidador(int, int) to service_role;
grant execute on function public.soltar_aviso_cuidador(uuid, date, time) to service_role;

commit;

-- ─────────────────────────────────────────────────────────────
-- 6. Clave secreta para que solo nuestro reloj pueda lanzar los avisos
--    (se genera sola; luego se copia a la función con la consulta del final)
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'cron_avisos') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_avisos');
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 7. Cada 5 minutos, llamar a la función "avisar-cuidadores"
-- ─────────────────────────────────────────────────────────────
select cron.schedule(
  'avisar-cuidadores',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := 'https://isiymqquggsckqvgskqg.supabase.co/functions/v1/avisar-cuidadores',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_avisos')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $cron$
);

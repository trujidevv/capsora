-- 002 · Modo cuidador, perfiles y mejoras de datos.
-- Ejecutar UNA vez en Supabase → SQL Editor → New query → pegar todo → Run.
-- Es seguro volver a ejecutarlo: todo está escrito para no duplicar nada.

begin;

-- ─────────────────────────────────────────────────────────────
-- 1. Perfiles: el nombre que ve el cuidador (auth.users no es accesible desde la app)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default '',
  creado_en timestamptz not null default now()
);
alter table public.perfiles enable row level security;

create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- Perfiles para las cuentas que ya existían
insert into public.perfiles (id, nombre)
select u.id, coalesce(nullif(trim(u.raw_user_meta_data ->> 'nombre'), ''), '')
from auth.users u
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 2. Medicamentos: color para reconocer la pastilla
-- ─────────────────────────────────────────────────────────────
alter table public.medicamentos add column if not exists color text;

-- ─────────────────────────────────────────────────────────────
-- 3. Horarios: desde cuándo y hasta cuándo cuenta cada hora
--    (al quitar una hora se desactiva, no se borra, para no perder el historial)
-- ─────────────────────────────────────────────────────────────
alter table public.horarios add column if not exists creado_en timestamptz not null default now();
alter table public.horarios add column if not exists desactivado_en timestamptz;

-- ─────────────────────────────────────────────────────────────
-- 4. Tomas: como máximo un registro por hora y día
-- ─────────────────────────────────────────────────────────────
delete from public.tomas
where ctid in (
  select ctid from (
    select ctid,
           row_number() over (
             partition by horario_id, fecha
             order by (estado = 'tomado') desc, confirmado_en desc nulls last
           ) as orden
    from public.tomas
  ) x
  where x.orden > 1
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tomas_horario_fecha_unica') then
    alter table public.tomas add constraint tomas_horario_fecha_unica unique (horario_id, fecha);
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. Latidos: una sola fila por usuario (se actualiza) + si los avisos están activos
-- ─────────────────────────────────────────────────────────────
alter table public.latidos add column if not exists notificaciones_ok boolean not null default true;

delete from public.latidos l
using public.latidos l2
where l.usuario_id = l2.usuario_id
  and (l.recibido_en, l.id) < (l2.recibido_en, l2.id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'latidos_usuario_unico') then
    alter table public.latidos add constraint latidos_usuario_unico unique (usuario_id);
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. Vínculos: invitación por código (el cuidador se rellena al aceptar)
-- ─────────────────────────────────────────────────────────────

-- La política de 001 permitía que cualquiera insertara un vínculo "activo" haciéndose
-- cuidador de otra persona. La función de cuidador nunca llegó a la app, así que en la
-- PRIMERA ejecución de esta migración se borran todos los vínculos existentes.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vinculos_cuidador' and column_name = 'codigo'
  ) then
    delete from public.vinculos_cuidador;
  end if;
end;
$$;

alter table public.vinculos_cuidador alter column cuidador_id drop not null;
alter table public.vinculos_cuidador add column if not exists codigo text;
alter table public.vinculos_cuidador add column if not exists expira_en timestamptz;

create unique index if not exists vinculos_codigo_unico
  on public.vinculos_cuidador (codigo) where codigo is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'vinculo_coherente') then
    alter table public.vinculos_cuidador add constraint vinculo_coherente check (
      (estado = 'pendiente' and cuidador_id is null and codigo is not null)
      or (estado = 'activo' and cuidador_id is not null and codigo is null)
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vinculo_no_autocuidado') then
    alter table public.vinculos_cuidador add constraint vinculo_no_autocuidado
      check (cuidador_id is null or cuidador_id <> usuario_id);
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 7. Índices para las consultas de la app
-- ─────────────────────────────────────────────────────────────
create index if not exists medicamentos_usuario_idx on public.medicamentos (usuario_id);
create index if not exists horarios_medicamento_idx on public.horarios (medicamento_id);
create index if not exists vinculos_usuario_idx on public.vinculos_cuidador (usuario_id);
create index if not exists vinculos_cuidador_idx on public.vinculos_cuidador (cuidador_id);

-- ─────────────────────────────────────────────────────────────
-- 8. Funciones auxiliares para las políticas (security definer = pueden leer
--    vinculos_cuidador sin que las políticas se llamen a sí mismas)
-- ─────────────────────────────────────────────────────────────
create or replace function public.es_cuidador_de(p_paciente uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vinculos_cuidador v
    where v.usuario_id = p_paciente
      and v.cuidador_id = auth.uid()
      and v.estado = 'activo'
  );
$$;

create or replace function public.es_mi_cuidador(p_cuidador uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vinculos_cuidador v
    where v.usuario_id = auth.uid()
      and v.cuidador_id = p_cuidador
      and v.estado = 'activo'
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- 9. Políticas
-- ─────────────────────────────────────────────────────────────

-- Perfiles
drop policy if exists "perfil propio" on public.perfiles;
create policy "perfil propio" on public.perfiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "cuidador ve perfil del paciente" on public.perfiles;
create policy "cuidador ve perfil del paciente" on public.perfiles
  for select to authenticated
  using (public.es_cuidador_de(id));

drop policy if exists "paciente ve perfil de su cuidador" on public.perfiles;
create policy "paciente ve perfil de su cuidador" on public.perfiles
  for select to authenticated
  using (public.es_mi_cuidador(id));

-- Lectura (solo lectura) para cuidadores con vínculo activo
drop policy if exists "cuidadores leen medicamentos" on public.medicamentos;
create policy "cuidadores leen medicamentos" on public.medicamentos
  for select to authenticated
  using (public.es_cuidador_de(usuario_id));

drop policy if exists "cuidadores leen horarios" on public.horarios;
create policy "cuidadores leen horarios" on public.horarios
  for select to authenticated
  using (
    exists (
      select 1 from public.medicamentos m
      where m.id = horarios.medicamento_id
        and public.es_cuidador_de(m.usuario_id)
    )
  );

drop policy if exists "cuidadores leen tomas" on public.tomas;
create policy "cuidadores leen tomas" on public.tomas
  for select to authenticated
  using (
    exists (
      select 1 from public.horarios h
      join public.medicamentos m on m.id = h.medicamento_id
      where h.id = tomas.horario_id
        and public.es_cuidador_de(m.usuario_id)
    )
  );

drop policy if exists "cuidadores leen latidos" on public.latidos;
create policy "cuidadores leen latidos" on public.latidos
  for select to authenticated
  using (public.es_cuidador_de(usuario_id));

-- Vínculos: se sustituye la política anterior, que dejaba a un cuidador
-- cambiar el usuario_id de un vínculo y "adoptar" a cualquier persona.
drop policy if exists "usuarios gestionan sus vinculos" on public.vinculos_cuidador;

drop policy if exists "ver mis vinculos" on public.vinculos_cuidador;
create policy "ver mis vinculos" on public.vinculos_cuidador
  for select to authenticated
  using (usuario_id = auth.uid() or cuidador_id = auth.uid());

-- Sin política de INSERT: las invitaciones solo se crean con crear_invitacion(),
-- que elige el código y la caducidad en el servidor (así no se pueden "probar" códigos
-- insertando filas en bloque).
drop policy if exists "crear invitacion propia" on public.vinculos_cuidador;

drop policy if exists "borrar mis vinculos" on public.vinculos_cuidador;
create policy "borrar mis vinculos" on public.vinculos_cuidador
  for delete to authenticated
  using (usuario_id = auth.uid() or cuidador_id = auth.uid());
-- (Sin política de UPDATE: aceptar una invitación solo es posible con aceptar_invitacion().)

-- ─────────────────────────────────────────────────────────────
-- 10. Invitaciones
-- ─────────────────────────────────────────────────────────────

-- Intentos fallidos de código (para frenar a quien pruebe códigos al azar).
create table if not exists public.intentos_invitacion (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  intentado_en timestamptz not null default now()
);
alter table public.intentos_invitacion enable row level security;
-- Sin políticas: nadie lo lee ni lo escribe desde la app, solo aceptar_invitacion().
create index if not exists intentos_usuario_idx on public.intentos_invitacion (usuario_id, intentado_en);

-- El paciente genera un código de 8 caracteres válido 48 horas.
-- 32^8 ≈ 1 billón de combinaciones + límite de intentos = imposible adivinarlo.
drop function if exists public.crear_invitacion();
create function public.crear_invitacion()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_codigo text;
  i int;
begin
  if auth.uid() is null then
    raise exception 'No has iniciado sesión';
  end if;

  delete from public.vinculos_cuidador v
  where v.usuario_id = auth.uid() and v.estado = 'pendiente';

  for intento in 1..10 loop
    v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_codigo := '';
    -- Bytes de un UUID v4 que son 100 % aleatorios (el 6 lleva la versión fija)
    foreach i in array array[0, 1, 2, 3, 4, 5, 7, 9] loop
      v_codigo := v_codigo || substr(v_alfabeto, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;

    begin
      insert into public.vinculos_cuidador (usuario_id, estado, codigo, expira_en)
      values (auth.uid(), 'pendiente', v_codigo, now() + interval '48 hours');
      return v_codigo;
    exception when unique_violation then
      -- Código repetido (muy improbable): se prueba otro.
    end;
  end loop;

  raise exception 'No se pudo generar el código. Inténtalo de nuevo.';
end;
$$;

-- El cuidador introduce el código. Devuelve {"ok": true, "paciente": id}
-- o {"ok": false, "motivo": "..."}. No lanza error al fallar: así el intento
-- fallido queda guardado y cuenta para el límite.
-- En el MVP cada persona tiene un solo cuidador: el nuevo sustituye al anterior.
drop function if exists public.aceptar_invitacion(text);
create function public.aceptar_invitacion(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));
  v_id uuid;
  v_paciente uuid;
  v_fallos int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'motivo', 'No has iniciado sesión');
  end if;

  -- Un intento cada vez por usuario: así no se puede saltar el límite con llamadas en paralelo
  perform pg_advisory_xact_lock(hashtext('aceptar_invitacion:' || auth.uid()::text));

  delete from public.intentos_invitacion where intentado_en < now() - interval '1 day';

  select count(*) into v_fallos
  from public.intentos_invitacion
  where usuario_id = auth.uid() and intentado_en > now() - interval '1 hour';
  if v_fallos >= 10 then
    return jsonb_build_object('ok', false, 'motivo', 'Demasiados intentos con códigos incorrectos. Espera una hora y vuelve a probar.');
  end if;

  select v.id, v.usuario_id
    into v_id, v_paciente
  from public.vinculos_cuidador v
  where v.codigo = v_codigo
    and v.estado = 'pendiente'
    and v.expira_en > now()
  for update;

  if v_id is null then
    insert into public.intentos_invitacion (usuario_id) values (auth.uid());
    return jsonb_build_object('ok', false, 'motivo', 'El código no es válido o ha caducado. Pide a tu familiar que te envíe uno nuevo.');
  end if;

  if v_paciente = auth.uid() then
    return jsonb_build_object('ok', false, 'motivo', 'Ese código es tuyo: tiene que usarlo tu familiar en su móvil.');
  end if;

  delete from public.vinculos_cuidador v
  where v.usuario_id = v_paciente and v.estado = 'activo';

  update public.vinculos_cuidador
  set cuidador_id = auth.uid(), estado = 'activo', codigo = null, expira_en = null
  where id = v_id;

  return jsonb_build_object('ok', true, 'paciente', v_paciente);
end;
$$;

-- Permisos: solo usuarios con sesión pueden llamar a las funciones
revoke all on function public.es_cuidador_de(uuid) from public, anon;
revoke all on function public.es_mi_cuidador(uuid) from public, anon;
revoke all on function public.crear_invitacion() from public, anon;
revoke all on function public.aceptar_invitacion(text) from public, anon;
grant execute on function public.es_cuidador_de(uuid) to authenticated;
grant execute on function public.es_mi_cuidador(uuid) to authenticated;
grant execute on function public.crear_invitacion() to authenticated;
grant execute on function public.aceptar_invitacion(text) to authenticated;

commit;

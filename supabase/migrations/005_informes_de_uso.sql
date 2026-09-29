-- ─────────────────────────────────────────────────────────────
-- 005. Informes de uso (solo para el panel de Supabase)
--
-- Dos vistas que se consultan en Table Editor → esquema «informes» y están
-- siempre al día. Van en un esquema propio y SIN permisos para la app: las
-- vistas no pasan por RLS y aquí salen los correos de todas las cuentas, así
-- que ni anon ni authenticated (la app, los usuarios) pueden leerlas. El esquema
-- tampoco está en «Exposed schemas» de la API. No muestran nombres de
-- medicamentos, solo números.
-- ─────────────────────────────────────────────────────────────

create schema if not exists informes;

-- Nadie más que el propietario (el panel de Supabase)
revoke all on schema informes from public, anon, authenticated;

-- 1. Uso día a día, últimos 30 días (también los días sin nada)
create or replace view informes.uso_por_dia as
with dias as (
  select generate_series(
           (now() at time zone 'Europe/Madrid')::date - 29,
           (now() at time zone 'Europe/Madrid')::date,
           interval '1 day'
         )::date as fecha
)
select d.fecha,
       count(distinct m.usuario_id)                as personas_que_marcaron,
       count(t.id) filter (where t.estado = 'tomado')  as tomadas,
       count(t.id) filter (where t.estado = 'omitido') as omitidas
from dias d
left join public.tomas t
       on t.fecha = d.fecha and t.estado in ('tomado', 'omitido')
left join public.horarios h     on h.id = t.horario_id
left join public.medicamentos m on m.id = h.medicamento_id
group by d.fecha
order by d.fecha desc;

-- 2. Cada cuenta: si la usa de verdad, si se atascó al empezar, si tiene los
--    avisos bloqueados…
create or replace view informes.uso_por_persona as
select u.email,
       u.created_at::date as alta,
       (select count(*) from public.medicamentos m where m.usuario_id = u.id) as medicamentos,
       (select count(distinct t.fecha)
          from public.tomas t
          join public.horarios h     on h.id = t.horario_id
          join public.medicamentos m on m.id = h.medicamento_id
         where m.usuario_id = u.id
           and t.fecha >= (now() at time zone 'Europe/Madrid')::date - 6
           and t.estado in ('tomado', 'omitido'))            as dias_usada_ultima_semana,
       (select max(t.confirmado_en)
          from public.tomas t
          join public.horarios h     on h.id = t.horario_id
          join public.medicamentos m on m.id = h.medicamento_id
         where m.usuario_id = u.id)                          as ultima_toma_marcada,
       l.recibido_en                                          as ultima_vez_abierta,
       l.notificaciones_ok                                    as avisos_activados,
       exists (select 1 from public.vinculos_cuidador v
                where v.usuario_id = u.id and v.estado = 'activo') as tiene_familiar,
       exists (select 1 from public.vinculos_cuidador v
                where v.cuidador_id = u.id and v.estado = 'activo') as es_familiar_de_alguien
from auth.users u
left join lateral (
  select recibido_en, notificaciones_ok
  from public.latidos
  where usuario_id = u.id
  order by recibido_en desc
  limit 1
) l on true
order by alta desc;

-- Por si algún permiso por defecto las alcanzara
revoke all on informes.uso_por_dia, informes.uso_por_persona
  from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Comprobación (ejecutar aparte, cada bloque por separado). Los dos tienen que
-- fallar con «permission denied for schema informes»:
--
--   begin; set local role authenticated; select * from informes.uso_por_persona; rollback;
--   begin; set local role anon;          select * from informes.uso_por_persona; rollback;
-- ─────────────────────────────────────────────────────────────

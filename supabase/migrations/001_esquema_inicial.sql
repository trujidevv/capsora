-- 001 · Esquema inicial (YA EJECUTADO en Supabase el 25/09/2026).
-- Se guarda aquí solo como registro. No hace falta volver a ejecutarlo.

-- Tabla de medicamentos
create table medicamentos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  dosis text,
  foto_url text,
  creado_en timestamptz not null default now()
);

-- Horarios de toma configurados para cada medicamento
create table horarios (
  id uuid primary key default gen_random_uuid(),
  medicamento_id uuid not null references medicamentos(id) on delete cascade,
  hora time not null,
  activo boolean not null default true
);

-- Registro de cada toma (una fila por toma programada/realizada)
create table tomas (
  id uuid primary key default gen_random_uuid(),
  horario_id uuid not null references horarios(id) on delete cascade,
  fecha date not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'tomado', 'omitido', 'sin_confirmar')),
  confirmado_en timestamptz
);

-- Vínculo cuidador-usuario
create table vinculos_cuidador (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  cuidador_id uuid not null references auth.users(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'activo')),
  creado_en timestamptz not null default now()
);

-- Latido diario (para distinguir "no tomó" de "no sabemos")
create table latidos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  recibido_en timestamptz not null default now()
);

-- Activar Row Level Security en todas las tablas
alter table medicamentos enable row level security;
alter table horarios enable row level security;
alter table tomas enable row level security;
alter table vinculos_cuidador enable row level security;
alter table latidos enable row level security;

-- Políticas: cada usuario solo ve/edita sus propios datos
create policy "usuarios gestionan sus medicamentos" on medicamentos
  for all using (auth.uid() = usuario_id);

create policy "usuarios gestionan horarios de sus medicamentos" on horarios
  for all using (
    exists (select 1 from medicamentos where medicamentos.id = horarios.medicamento_id and medicamentos.usuario_id = auth.uid())
  );

create policy "usuarios gestionan sus tomas" on tomas
  for all using (
    exists (
      select 1 from horarios
      join medicamentos on medicamentos.id = horarios.medicamento_id
      where horarios.id = tomas.horario_id and medicamentos.usuario_id = auth.uid()
    )
  );

create policy "usuarios gestionan sus vinculos" on vinculos_cuidador
  for all using (auth.uid() = usuario_id or auth.uid() = cuidador_id);

create policy "usuarios gestionan sus latidos" on latidos
  for all using (auth.uid() = usuario_id);

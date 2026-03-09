-- =============================================
-- ZAGA Import — Schema Supabase
-- Ejecuta TODO este script en:
-- Supabase → SQL Editor → New Query → Run
-- =============================================

-- 1. Tabla de perfiles (roles: admin o cliente)
create table public.perfiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  nombre text not null,
  rol text not null check (rol in ('admin', 'cliente')),
  cliente_nombre text, -- nombre exacto del cliente en cotizaciones
  created_at timestamptz default now()
);

-- 2. Tabla de cotizaciones
create table public.cotizaciones (
  id text primary key,
  nro text,
  cliente text,
  gestor text,
  estado text,
  tipo text,
  datos jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Activar Row Level Security en ambas tablas
alter table public.perfiles enable row level security;
alter table public.cotizaciones enable row level security;

-- 4. Política: cada usuario ve solo su propio perfil
create policy "ver perfil propio" on public.perfiles
  for select using (auth.uid() = id);

-- 5. Política: admins (Francisco y Luisa) tienen acceso total a cotizaciones
create policy "admins acceso total" on public.cotizaciones
  for all using (
    exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'admin'
    )
  );

-- 6. Política: clientes ven SOLO sus cotizaciones (solo lectura)
create policy "clientes ven las suyas" on public.cotizaciones
  for select using (
    exists (
      select 1 from public.perfiles
      where id = auth.uid()
        and rol = 'cliente'
        and cliente_nombre = public.cotizaciones.cliente
    )
  );

-- 7. Trigger para actualizar updated_at automáticamente
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cotizaciones_updated_at
  before update on public.cotizaciones
  for each row execute function public.update_updated_at();

-- =============================================
-- LISTO. Después de ejecutar esto, ve al
-- PASO 2 del README para crear los usuarios.
-- =============================================

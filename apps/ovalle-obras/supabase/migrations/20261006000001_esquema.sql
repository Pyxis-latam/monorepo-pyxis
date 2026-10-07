create type public.rol_usuario as enum ('admin', 'terreno');
create type public.estado_obra as enum ('activa', 'cerrada');

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  email text not null,
  rol public.rol_usuario not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table public.obras (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  estado public.estado_obra not null default 'activa',
  creado_en timestamptz not null default now(),
  creado_por uuid references public.perfiles (id)
);

create table public.importaciones (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  archivo_path text not null,
  filas integer not null,
  creado_en timestamptz not null default now(),
  creado_por uuid references public.perfiles (id)
);

create table public.partidas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  parent_id uuid references public.partidas (id) on delete cascade,
  codigo text not null,
  descripcion text not null,
  unidad text,
  cantidad numeric(14, 4) check (cantidad is null or cantidad > 0),
  precio_unitario numeric(14, 2) check (precio_unitario is null or precio_unitario >= 0),
  fecha_inicio date,
  fecha_fin date,
  orden integer not null,
  unique (obra_id, codigo),
  check (fecha_inicio is null or fecha_fin is null or fecha_fin >= fecha_inicio),
  check ((cantidad is null) = (unidad is null))
);
create index partidas_obra_idx on public.partidas (obra_id, orden);

create table public.reportes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  partida_id uuid not null references public.partidas (id) on delete restrict,
  autor uuid not null default auth.uid() references public.perfiles (id),
  cantidad numeric(14, 4) not null check (cantidad > 0),
  comentario text check (comentario is null or length(comentario) <= 1000),
  foto_path text,
  creado_en timestamptz not null default now(),
  anulado boolean not null default false,
  anulado_por uuid references public.perfiles (id),
  anulado_en timestamptz
);
create index reportes_obra_idx on public.reportes (obra_id, creado_en desc);
create index reportes_partida_idx on public.reportes (partida_id);

-- Un reporte nuevo: obra tomada de la partida (no del cliente), hora del servidor,
-- nunca nace anulado, y solo sobre hojas (partidas con cantidad).
create function public.preparar_reporte() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_obra uuid;
  v_cantidad numeric;
begin
  select p.obra_id, p.cantidad into v_obra, v_cantidad
  from public.partidas p where p.id = new.partida_id;
  if v_obra is null then
    raise exception 'partida inexistente' using errcode = 'P0001';
  end if;
  if v_cantidad is null then
    raise exception 'solo se puede reportar avance en partidas con cantidad' using errcode = 'P0001';
  end if;
  new.obra_id := v_obra;
  new.creado_en := now();
  new.anulado := false;
  new.anulado_por := null;
  new.anulado_en := null;
  return new;
end $$;

create trigger preparar_reporte before insert on public.reportes
for each row execute function public.preparar_reporte();

-- Cada usuario creado en Auth obtiene su perfil con nombre y rol de la metadata
-- que pone el admin al crearlo (no hay registro abierto).
create function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), new.email),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'rol')::public.rol_usuario, 'terreno')
  );
  return new;
end $$;

create trigger al_crear_usuario after insert on auth.users
for each row execute function public.crear_perfil();

create view public.partida_ejecutado with (security_invoker = true) as
select
  p.id as partida_id,
  p.obra_id,
  coalesce(sum(r.cantidad) filter (where not r.anulado), 0)::numeric as ejecutado
from public.partidas p
left join public.reportes r on r.partida_id = p.id
group by p.id, p.obra_id;

alter publication supabase_realtime add table public.reportes;

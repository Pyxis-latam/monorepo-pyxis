-- Rol del usuario actual; null si no tiene perfil o está desactivado.
create function public.rol_actual() returns public.rol_usuario
language sql stable security definer set search_path = '' as $$
  select p.rol from public.perfiles p where p.id = auth.uid() and p.activo
$$;

create function public.obra_activa(p_obra uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.obras o where o.id = p_obra and o.estado = 'activa')
$$;

-- GoTrue inserta el usuario solo con {provider, providers} en raw_app_meta_data y
-- escribe el app_metadata que pasa el admin (p. ej. { rol }) en un UPDATE posterior.
-- Por eso crear_perfil (AFTER INSERT) no alcanza a ver el rol: este trigger lo
-- sincroniza al perfil. app_metadata solo lo escribe el service role, asi que sigue
-- siendo una fuente confiable (user_metadata, editable por el cliente, se ignora).
create function public.sincronizar_rol() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_rol public.rol_usuario := (new.raw_app_meta_data ->> 'rol')::public.rol_usuario;
begin
  if v_rol is not null then
    update public.perfiles set rol = v_rol where id = new.id and rol is distinct from v_rol;
  end if;
  return new;
end $$;

create trigger al_cambiar_app_metadata after update of raw_app_meta_data on auth.users
for each row when (old.raw_app_meta_data is distinct from new.raw_app_meta_data)
execute function public.sincronizar_rol();

alter table public.perfiles enable row level security;
alter table public.obras enable row level security;
alter table public.importaciones enable row level security;
alter table public.partidas enable row level security;
alter table public.reportes enable row level security;

-- perfiles
create policy perfiles_admin on public.perfiles for all to authenticated
  using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');
create policy perfiles_propio on public.perfiles for select to authenticated
  using (id = auth.uid() and public.rol_actual() is not null);

-- obras
create policy obras_admin on public.obras for all to authenticated
  using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');
create policy obras_terreno on public.obras for select to authenticated
  using (public.rol_actual() = 'terreno' and estado = 'activa');

-- importaciones
create policy importaciones_admin on public.importaciones for all to authenticated
  using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');

-- partidas
create policy partidas_admin on public.partidas for all to authenticated
  using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');
create policy partidas_terreno on public.partidas for select to authenticated
  using (public.rol_actual() = 'terreno' and public.obra_activa(obra_id));

-- reportes
create policy reportes_admin_leer on public.reportes for select to authenticated
  using (public.rol_actual() = 'admin');
create policy reportes_admin_anular on public.reportes for update to authenticated
  using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');
create policy reportes_terreno_leer on public.reportes for select to authenticated
  using (public.rol_actual() = 'terreno' and public.obra_activa(obra_id));
create policy reportes_insertar on public.reportes for insert to authenticated
  with check (
    public.rol_actual() is not null
    and autor = auth.uid()
    and public.obra_activa(obra_id)
  );

-- Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('fotos', 'fotos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('importaciones', 'importaciones', false, 4718592, null);

-- fotos: <obra_id>/<autor_id>/<reporte_id>.jpg
create policy fotos_subir on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and public.rol_actual() is not null
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.obra_activa(((storage.foldername(name))[1])::uuid)
  );
create policy fotos_leer on storage.objects for select to authenticated
  using (
    bucket_id = 'fotos'
    and (
      public.rol_actual() = 'admin'
      or (public.rol_actual() = 'terreno' and public.obra_activa(((storage.foldername(name))[1])::uuid))
    )
  );

create policy importaciones_archivos on storage.objects for all to authenticated
  using (bucket_id = 'importaciones' and public.rol_actual() = 'admin')
  with check (bucket_id = 'importaciones' and public.rol_actual() = 'admin');

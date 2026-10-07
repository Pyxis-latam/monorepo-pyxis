create function public.aplicar_importacion(
  p_obra_id uuid,
  p_nombre text,
  p_partidas jsonb,
  p_archivo_path text
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_obra uuid;
  v_bloqueadas text;
  v_codigo text;
  v_padre text;
begin
  if public.rol_actual() is distinct from 'admin' then
    raise exception 'solo un admin puede importar' using errcode = '42501';
  end if;

  -- Todo padre referenciado debe venir en el archivo: uno que quedara fuera seria
  -- eliminado y, por el on delete cascade de parent_id, arrastraria a sus hijos.
  select e ->> 'codigo', e ->> 'codigo_padre' into v_codigo, v_padre
  from jsonb_array_elements(p_partidas) e
  where e ->> 'codigo_padre' is not null
    and not exists (select 1 from jsonb_array_elements(p_partidas) q where q ->> 'codigo' = e ->> 'codigo_padre')
  order by (e ->> 'orden')::integer
  limit 1;
  if found then
    raise exception 'Partida % tiene un padre % que no viene en el archivo', v_codigo, v_padre
      using errcode = 'P0001';
  end if;

  if p_obra_id is null then
    insert into public.obras (nombre, creado_por) values (p_nombre, auth.uid()) returning id into v_obra;
  else
    v_obra := p_obra_id;
  end if;

  select string_agg(p.codigo, ', ' order by p.orden) into v_bloqueadas
  from public.partidas p
  left join jsonb_array_elements(p_partidas) e on e ->> 'codigo' = p.codigo
  where p.obra_id = v_obra
    and exists (select 1 from public.reportes r where r.partida_id = p.id)
    and (e is null or e ->> 'cantidad' is null);
  if v_bloqueadas is not null then
    raise exception 'Partidas con reportes no pueden eliminarse ni volverse capítulo: %', v_bloqueadas
      using errcode = 'P0001';
  end if;

  insert into public.partidas (obra_id, codigo, descripcion, unidad, cantidad, precio_unitario, fecha_inicio, fecha_fin, orden)
  select
    v_obra,
    e ->> 'codigo',
    e ->> 'descripcion',
    e ->> 'unidad',
    (e ->> 'cantidad')::numeric,
    (e ->> 'precio_unitario')::numeric,
    (e ->> 'fecha_inicio')::date,
    (e ->> 'fecha_fin')::date,
    (e ->> 'orden')::integer
  from jsonb_array_elements(p_partidas) e
  on conflict (obra_id, codigo) do update set
    descripcion = excluded.descripcion,
    unidad = excluded.unidad,
    cantidad = excluded.cantidad,
    precio_unitario = excluded.precio_unitario,
    fecha_inicio = excluded.fecha_inicio,
    fecha_fin = excluded.fecha_fin,
    orden = excluded.orden;

  update public.partidas h
  set parent_id = padre.id
  from jsonb_array_elements(p_partidas) e
  left join public.partidas padre on padre.obra_id = v_obra and padre.codigo = e ->> 'codigo_padre'
  where h.obra_id = v_obra and h.codigo = e ->> 'codigo';

  -- El borrado va al final: con los hijos ya re-apuntados, el cascade solo alcanza
  -- partidas que no vienen en el archivo (las que tienen reportes ya se rechazaron).
  delete from public.partidas p
  where p.obra_id = v_obra
    and not exists (select 1 from jsonb_array_elements(p_partidas) e where e ->> 'codigo' = p.codigo);

  insert into public.importaciones (obra_id, archivo_path, filas, creado_por)
  values (v_obra, p_archivo_path, jsonb_array_length(p_partidas), auth.uid());

  return v_obra;
end $$;

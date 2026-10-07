import { notFound } from "next/navigation";
import { FormularioReporte } from "@/components/terreno/FormularioReporte";
import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export default async function Reportar({ params }: { params: Promise<{ id: string; partidaId: string }> }) {
  const { id, partidaId } = await params;
  const perfil = await exigirRol("terreno", "admin");
  const supabase = await crearClienteServidor();
  const [{ data: partida }, { data: ejecutado }] = await Promise.all([
    supabase.from("partidas").select("id, codigo, descripcion, unidad, cantidad").eq("id", partidaId).eq("obra_id", id).maybeSingle(),
    supabase.from("partida_ejecutado").select("ejecutado").eq("partida_id", partidaId).maybeSingle(),
  ]);
  if (!partida || partida.cantidad === null || partida.unidad === null) notFound();
  return (
    <FormularioReporte
      obraId={id}
      autorId={perfil.id}
      partida={{
        id: partida.id,
        codigo: partida.codigo,
        descripcion: partida.descripcion,
        unidad: partida.unidad,
        cantidad: Number(partida.cantidad),
        ejecutado: Number(ejecutado?.ejecutado ?? 0),
      }}
    />
  );
}

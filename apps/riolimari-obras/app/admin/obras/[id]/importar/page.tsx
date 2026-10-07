import { notFound } from "next/navigation";
import { FormularioImportacion } from "@/components/importacion/FormularioImportacion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export default async function Reimportar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const { data: obra } = await supabase.from("obras").select("nombre").eq("id", id).maybeSingle();
  if (!obra) notFound();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reimportar Excel — {obra.nombre}</h1>
      <p className="text-sm">Las partidas se cruzan por código. El avance ya reportado se conserva.</p>
      <FormularioImportacion obraId={id} />
    </div>
  );
}

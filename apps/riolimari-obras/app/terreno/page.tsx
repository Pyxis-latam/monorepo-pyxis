import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export default async function ObrasTerreno() {
  const supabase = await crearClienteServidor();
  const { data: obras } = await supabase.from("obras").select("id, nombre").eq("estado", "activa").order("nombre");
  if (obras?.length === 1) redirect(`/terreno/obras/${obras[0].id}`);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Obras</h1>
      {(obras ?? []).length === 0 && <p>No hay obras activas.</p>}
      {(obras ?? []).map((o) => (
        <Link key={o.id} href={`/terreno/obras/${o.id}`} className="block rounded-lg border border-obra-line bg-white p-4 font-medium">{o.nombre}</Link>
      ))}
    </div>
  );
}

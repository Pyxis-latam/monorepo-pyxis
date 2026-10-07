import { FormularioIngreso } from "@/components/auth/FormularioIngreso";
import { Logo } from "@/components/marca/Logo";
import { destinoSeguro } from "@/lib/auth/rutas";
import { NOMBRE_APP } from "@/lib/marca";

export default async function Ingresar({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string }>;
}) {
  const { siguiente } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-col items-center gap-4 bg-obra-accent px-6 py-10 text-white">
        <Logo alto={120} cargaInmediata />
        <h1 className="text-2xl font-bold">{NOMBRE_APP}</h1>
      </div>
      <div className="flex flex-1 justify-center p-6">
        <FormularioIngreso siguiente={destinoSeguro(siguiente ?? null)} />
      </div>
    </main>
  );
}

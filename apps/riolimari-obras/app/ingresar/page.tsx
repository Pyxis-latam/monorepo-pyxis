import { FormularioIngreso } from "@/components/auth/FormularioIngreso";
import { destinoSeguro } from "@/lib/auth/rutas";

export default async function Ingresar({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string }>;
}) {
  const { siguiente } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold">Ovalle Obras</h1>
      <FormularioIngreso siguiente={destinoSeguro(siguiente ?? null)} />
    </main>
  );
}

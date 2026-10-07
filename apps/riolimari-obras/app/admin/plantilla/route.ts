import { exigirRol } from "@/lib/auth/sesion";
import { construirPlantilla } from "@/lib/excel/plantilla";

export async function GET() {
  await exigirRol("admin");
  const archivo = await construirPlantilla();
  return new Response(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-presupuesto-riolimari.xlsx"',
    },
  });
}

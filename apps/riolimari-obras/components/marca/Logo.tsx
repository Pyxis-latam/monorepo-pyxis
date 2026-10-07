import Image from "next/image";
import { LOGO } from "@/lib/marca";

/**
 * Logo de Río Limarí a la altura pedida. Es blanco: el contenedor debe llevar `bg-obra-accent`.
 * Sin optimizar a propósito: es un PNG de 13 KB y así se sirve tal cual desde /public.
 */
export function Logo({ alto, cargaInmediata = false }: { alto: number; cargaInmediata?: boolean }) {
  return (
    <Image
      src={LOGO.ruta}
      alt={LOGO.alt}
      width={Math.round((alto * LOGO.ancho) / LOGO.alto)}
      height={alto}
      loading={cargaInmediata ? "eager" : undefined}
      unoptimized
    />
  );
}

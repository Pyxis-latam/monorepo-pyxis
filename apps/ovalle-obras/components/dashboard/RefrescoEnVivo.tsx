"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

export function RefrescoEnVivo({ obraId }: { obraId: string }) {
  const router = useRouter();
  const [conectado, setConectado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seCayo = useRef(false);

  useEffect(() => {
    const supabase = crearClienteNavegador();
    const programar = () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => router.refresh(), 1000);
    };
    const canal = supabase
      .channel(`obra-${obraId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reportes", filter: `obra_id=eq.${obraId}` }, programar)
      .subscribe((estado: string) => {
        if (estado === "SUBSCRIBED") {
          setConectado(true);
          // Al volver de una caída, recarga lo que pudo llegar mientras tanto.
          if (seCayo.current) programar();
          seCayo.current = false;
        } else {
          setConectado(false);
          seCayo.current = true;
        }
      });
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      supabase.removeChannel(canal);
    };
  }, [obraId, router]);

  return (
    <span className={`inline-flex items-center gap-2 text-sm ${conectado ? "text-obra-ok" : "text-obra-warn"}`}>
      <span className={`h-2 w-2 rounded-full ${conectado ? "bg-obra-ok" : "bg-obra-warn"}`} />
      {conectado ? "En vivo" : "Reconectando…"}
    </span>
  );
}

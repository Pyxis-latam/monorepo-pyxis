"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

export function RefrescoEnVivo({ obraId }: { obraId: string }) {
  const router = useRouter();
  const [conectado, setConectado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seCayo = useRef(false);

  useEffect(() => {
    const supabase = crearClienteNavegador();
    let activo = true;
    let canal: RealtimeChannel | null = null;
    const programar = () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => router.refresh(), 1000);
    };
    const abrirCanal = () => {
      if (!activo) return;
      canal = supabase
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
    };
    // En una carga completa el cliente aún no leyó la sesión de las cookies: un canal abierto antes entra
    // como anónimo y RLS no le entrega ningún reporte (queda "En vivo" pero sin eventos). Se espera a que
    // Realtime tenga el token del usuario; si falla se abre igual, como antes.
    supabase.realtime.setAuth().then(abrirCanal, abrirCanal);
    return () => {
      activo = false;
      if (temporizador.current) clearTimeout(temporizador.current);
      if (canal) supabase.removeChannel(canal);
    };
  }, [obraId, router]);

  return (
    <span className={`inline-flex items-center gap-2 text-sm ${conectado ? "text-obra-ok" : "text-obra-warn"}`}>
      <span className={`h-2 w-2 rounded-full ${conectado ? "bg-obra-ok" : "bg-obra-warn"}`} />
      {conectado ? "En vivo" : "Reconectando…"}
    </span>
  );
}

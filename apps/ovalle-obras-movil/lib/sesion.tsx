import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export type PerfilMovil = { id: string; nombre: string; rol: "admin" | "terreno" };

export type Sesion = {
  cargando: boolean;
  perfil: PerfilMovil | null;
  /** Hay sesión de Auth pero no hay un perfil activo para ese usuario. */
  sinAcceso: boolean;
  salir(): Promise<void>;
};

/** Perfil leído para un usuario; `perfil` es null si no existe o está inactivo. */
type PerfilLeido = { usuarioId: string; perfil: PerfilMovil | null };

async function salir() {
  await supabase.auth.signOut();
}

const SesionContext = createContext<Sesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  // undefined = todavía no sabemos si hay sesión; null = no hay sesión.
  const [usuarioId, setUsuarioId] = useState<string | null | undefined>(undefined);
  const [leido, setLeido] = useState<PerfilLeido | null>(null);

  useEffect(() => {
    let vigente = true;
    supabase.auth.getSession().then(({ data }) => {
      if (vigente) setUsuarioId(data.session?.user.id ?? null);
    });
    // El callback solo guarda el id; el perfil se consulta afuera (consultar Supabase dentro
    // del callback de Auth puede trabar el cliente).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      setUsuarioId(sesion?.user.id ?? null);
    });
    return () => {
      vigente = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!usuarioId) return;
    let vigente = true;
    supabase
      .from("perfiles")
      .select("id, nombre, rol, activo")
      .eq("id", usuarioId)
      .maybeSingle()
      .then(({ data }) => {
        if (!vigente) return;
        setLeido({
          usuarioId,
          perfil: data?.activo ? { id: data.id, nombre: data.nombre, rol: data.rol } : null,
        });
      });
    return () => {
      vigente = false;
    };
  }, [usuarioId]);

  // Se deriva en el render: si cambia el usuario, `cargando` vuelve a true en el mismo render,
  // sin un instante en que parezca que no hay sesión (lo que redirigiría a /ingresar).
  const valor = useMemo<Sesion>(() => {
    if (usuarioId === undefined) return { cargando: true, perfil: null, sinAcceso: false, salir };
    if (usuarioId === null) return { cargando: false, perfil: null, sinAcceso: false, salir };
    if (leido?.usuarioId !== usuarioId) return { cargando: true, perfil: null, sinAcceso: false, salir };
    return { cargando: false, perfil: leido.perfil, sinAcceso: leido.perfil === null, salir };
  }, [usuarioId, leido]);

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): Sesion {
  const sesion = useContext(SesionContext);
  if (!sesion) throw new Error("useSesion debe usarse dentro de <SesionProvider>");
  return sesion;
}

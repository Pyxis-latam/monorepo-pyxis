import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { supabase } from "@/lib/supabase";

export type PerfilMovil = { id: string; nombre: string; rol: "admin" | "terreno" };

export type Sesion = {
  cargando: boolean;
  perfil: PerfilMovil | null;
  /** Hay sesión de Auth y la consulta respondió, pero no hay un perfil activo para ese usuario. */
  sinAcceso: boolean;
  /** Hay sesión de Auth pero no se pudo consultar el perfil (sin señal, servidor caído…). */
  errorPerfil: boolean;
  /** Vuelve a consultar el perfil del usuario actual. */
  reintentar(): void;
  salir(): Promise<void>;
};

/**
 * Resultado de leer el perfil de un usuario en un intento dado. `perfil` es null si no existe
 * o está inactivo; `error` indica que la consulta misma falló.
 */
type PerfilLeido = { usuarioId: string; intento: number; perfil: PerfilMovil | null; error: boolean };

async function salir() {
  await supabase.auth.signOut();
}

async function leerPerfil(usuarioId: string): Promise<Pick<PerfilLeido, "perfil" | "error">> {
  try {
    const { data, error } = await supabase
      .from("perfiles")
      .select("id, nombre, rol, activo")
      .eq("id", usuarioId)
      .maybeSingle();
    if (error) return { perfil: null, error: true };
    return {
      perfil: data?.activo ? { id: data.id, nombre: data.nombre, rol: data.rol } : null,
      error: false,
    };
  } catch {
    return { perfil: null, error: true };
  }
}

const SesionContext = createContext<Sesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  // undefined = todavía no sabemos si hay sesión; null = no hay sesión.
  const [usuarioId, setUsuarioId] = useState<string | null | undefined>(undefined);
  const [intento, setIntento] = useState(0);
  const [leido, setLeido] = useState<PerfilLeido | null>(null);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

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
    leerPerfil(usuarioId).then((resultado) => {
      if (vigente) setLeido({ usuarioId, intento, ...resultado });
    });
    return () => {
      vigente = false;
    };
  }, [usuarioId, intento]);

  // Se deriva en el render: si cambia el usuario (o se reintenta), `cargando` vuelve a true en
  // el mismo render, sin un instante en que parezca que no hay sesión (lo que redirigiría a /ingresar).
  const valor = useMemo<Sesion>(() => {
    const acciones = { salir, reintentar };
    const sinPerfil = { perfil: null, sinAcceso: false, errorPerfil: false };
    if (usuarioId === undefined) return { ...acciones, ...sinPerfil, cargando: true };
    if (usuarioId === null) return { ...acciones, ...sinPerfil, cargando: false };
    if (leido?.usuarioId !== usuarioId || leido.intento !== intento) {
      return { ...acciones, ...sinPerfil, cargando: true };
    }
    return {
      ...acciones,
      cargando: false,
      perfil: leido.perfil,
      sinAcceso: !leido.error && leido.perfil === null,
      errorPerfil: leido.error,
    };
  }, [usuarioId, intento, leido, reintentar]);

  // Sin señal en obra: al volver a primer plano se reintenta solo.
  useEffect(() => {
    if (!valor.errorPerfil) return;
    const suscripcion = AppState.addEventListener("change", (estado) => {
      if (estado === "active") reintentar();
    });
    return () => suscripcion.remove();
  }, [valor.errorPerfil, reintentar]);

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): Sesion {
  const sesion = useContext(SesionContext);
  if (!sesion) throw new Error("useSesion debe usarse dentro de <SesionProvider>");
  return sesion;
}

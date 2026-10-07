import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Boton } from "@/components/Boton";
import { FormularioReporte } from "@/components/FormularioReporte";
import { useSesion } from "@/lib/sesion";
import { supabase } from "@/lib/supabase";
import { colores } from "@/lib/tema";

type Partida = { id: string; codigo: string; descripcion: string; unidad: string; cantidad: number; ejecutado: number };
type Estado =
  | { tipo: "cargando" }
  | { tipo: "error" }
  | { tipo: "noEncontrada" }
  | { tipo: "noReportable" }
  | { tipo: "ok"; partida: Partida };

async function consultarPartida(obraId: string, partidaId: string): Promise<Estado> {
  const [{ data: partida, error: errorPartida }, { data: ejecutado, error: errorEjecutado }] = await Promise.all([
    supabase
      .from("partidas")
      .select("id, codigo, descripcion, unidad, cantidad")
      .eq("id", partidaId)
      .eq("obra_id", obraId)
      .maybeSingle(),
    supabase.from("partida_ejecutado").select("ejecutado").eq("partida_id", partidaId).maybeSingle(),
  ]);
  // Sin lo ejecutado no se puede decir cuánto falta: un error no se muestra como 0.
  if (errorPartida || errorEjecutado) throw errorPartida ?? errorEjecutado;
  if (!partida) return { tipo: "noEncontrada" };
  if (partida.unidad === null || partida.cantidad === null) return { tipo: "noReportable" };
  return {
    tipo: "ok",
    partida: {
      id: partida.id,
      codigo: partida.codigo,
      descripcion: partida.descripcion,
      unidad: partida.unidad,
      cantidad: Number(partida.cantidad),
      ejecutado: Number(ejecutado?.ejecutado ?? 0),
    },
  };
}

/** Lee la partida y lo ejecutado; un fallo de red se devuelve como estado "error" (nunca lanza). */
async function leerPartida(obraId: string, partidaId: string): Promise<Estado> {
  try {
    return await consultarPartida(obraId, partidaId);
  } catch {
    return { tipo: "error" };
  }
}

export default function Reportar() {
  const { id, partidaId } = useLocalSearchParams<{ id: string; partidaId: string }>();
  const { perfil } = useSesion();
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });

  useEffect(() => {
    let vigente = true;
    void leerPartida(id, partidaId).then((resultado) => {
      if (vigente) setEstado(resultado);
    });
    return () => {
      vigente = false;
    };
  }, [id, partidaId]);

  function reintentar() {
    setEstado({ tipo: "cargando" });
    void leerPartida(id, partidaId).then(setEstado);
  }

  if (estado.tipo === "ok" && perfil) {
    return (
      <FormularioReporte
        obraId={id}
        autorId={perfil.id}
        partida={estado.partida}
        // Vuelve a la lista de la obra (que ya está en la pila) con el aviso de enviado.
        alEnviar={() => router.dismissTo(`/obras/${id}?enviado=1`)}
      />
    );
  }

  if (estado.tipo === "cargando" || estado.tipo === "ok") {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={colores.acento} />
      </View>
    );
  }

  return (
    <View style={estilos.centro}>
      <Text style={estilos.texto}>
        {estado.tipo === "error"
          ? "No pudimos cargar la partida. Revisa tu señal."
          : estado.tipo === "noEncontrada"
            ? "No encontramos esta partida."
            : "Esta partida no tiene unidad o cantidad presupuestada, no se puede reportar avance."}
      </Text>
      {estado.tipo === "error" ? (
        <View style={estilos.boton}>
          <Boton titulo="Reintentar" onPress={reintentar} />
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24, backgroundColor: colores.fondo },
  texto: { fontSize: 16, color: colores.texto, textAlign: "center" },
  boton: { alignSelf: "stretch" },
});

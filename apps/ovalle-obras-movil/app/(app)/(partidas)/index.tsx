import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Boton } from "@/components/Boton";
import { supabase } from "@/lib/supabase";
import { ALTO_TOQUE, colores } from "@/lib/tema";

type Obra = { id: string; nombre: string };
type Estado = { tipo: "cargando" } | { tipo: "error" } | { tipo: "ok"; obras: Obra[] };

/** Obras activas, o null si no se pudieron leer. */
async function leerObras(): Promise<Obra[] | null> {
  try {
    const { data, error } = await supabase.from("obras").select("id, nombre").eq("estado", "activa").order("nombre");
    return error ? null : data;
  } catch {
    return null;
  }
}

export default function Obras() {
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [refrescando, setRefrescando] = useState(false);

  const aplicar = useCallback((obras: Obra[] | null) => {
    if (obras === null) {
      // Si ya había una lista, un fallo al refrescar no la borra.
      setEstado((previo) => (previo.tipo === "ok" ? previo : { tipo: "error" }));
    } else if (obras.length === 1) {
      // Con una sola obra activa no hay nada que elegir: se entra directo (mientras navega queda en "cargando").
      router.replace(`/obras/${obras[0].id}`);
    } else {
      setEstado({ tipo: "ok", obras });
    }
  }, []);

  useEffect(() => {
    let vigente = true;
    void leerObras().then((obras) => {
      if (vigente) aplicar(obras);
    });
    return () => {
      vigente = false;
    };
  }, [aplicar]);

  async function refrescar() {
    setRefrescando(true);
    aplicar(await leerObras());
    setRefrescando(false);
  }

  function reintentar() {
    setEstado({ tipo: "cargando" });
    void leerObras().then(aplicar);
  }

  if (estado.tipo === "cargando") {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={colores.acento} />
      </View>
    );
  }

  if (estado.tipo === "error") {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.texto}>No pudimos cargar las obras. Revisa tu señal.</Text>
        <View style={estilos.boton}>
          <Boton titulo="Reintentar" onPress={reintentar} />
        </View>
      </View>
    );
  }

  return (
    <FlatList
      testID="lista-obras"
      data={estado.obras}
      keyExtractor={(obra) => obra.id}
      contentContainerStyle={estilos.lista}
      refreshing={refrescando}
      onRefresh={refrescar}
      ListEmptyComponent={<Text style={estilos.texto}>No hay obras activas.</Text>}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/obras/${item.id}`)}
          style={({ pressed }) => [estilos.obra, pressed && estilos.presionada]}
        >
          <Text style={estilos.nombre}>{item.nombre}</Text>
        </Pressable>
      )}
    />
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24, backgroundColor: colores.fondo },
  lista: { padding: 16, gap: 12 },
  texto: { fontSize: 16, color: colores.texto, textAlign: "center" },
  boton: { alignSelf: "stretch" },
  obra: {
    minHeight: ALTO_TOQUE,
    justifyContent: "center",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colores.linea,
    backgroundColor: colores.blanco,
  },
  presionada: { opacity: 0.7 },
  nombre: { fontSize: 18, fontWeight: "600", color: colores.texto },
});

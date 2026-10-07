import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, SectionList, StyleSheet, Text, TextInput, View } from "react-native";
import { cargarAvanceObra } from "@pyxis/ovalle-core/datos/obra";
import { hoyEnChile } from "@pyxis/ovalle-core/fechas";
import { buscarPartidas, enCursoHoy, itemsTerreno, type ItemPartida } from "@pyxis/ovalle-core/terreno/lista";
import { Boton } from "@/components/Boton";
import { TarjetaPartida } from "@/components/TarjetaPartida";
import { supabase } from "@/lib/supabase";
import { ALTO_TOQUE, colores } from "@/lib/tema";

type Estado =
  | { tipo: "cargando" }
  | { tipo: "error" }
  | { tipo: "noEncontrada" }
  | { tipo: "ok"; nombre: string; enCurso: ItemPartida[]; todas: ItemPartida[] };

type Seccion = { key: string; titulo: string | null; data: ItemPartida[] };

function armarSecciones(enCurso: ItemPartida[], todas: ItemPartida[], texto: string): Seccion[] {
  // Con búsqueda no hay secciones: una sola lista de resultados.
  if (texto.trim() !== "") {
    const resultado = buscarPartidas(todas, texto);
    return resultado.length > 0 ? [{ key: "busqueda", titulo: null, data: resultado }] : [];
  }
  const secciones: Seccion[] = [];
  if (enCurso.length > 0) secciones.push({ key: "en-curso", titulo: "En curso hoy", data: enCurso });
  // Los capítulos salen en el orden en que aparecen sus partidas.
  const porCapitulo = new Map<string | null, ItemPartida[]>();
  for (const item of todas) {
    const grupo = porCapitulo.get(item.capitulo);
    if (grupo) grupo.push(item);
    else porCapitulo.set(item.capitulo, [item]);
  }
  let n = 0;
  for (const [capitulo, data] of porCapitulo) secciones.push({ key: `capitulo-${n++}`, titulo: capitulo ?? "Partidas", data });
  return secciones;
}

export default function PartidasDeLaObra() {
  const { id, enviado } = useLocalSearchParams<{ id: string; enviado?: string }>();
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [actualizacionFallida, setActualizacionFallida] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [texto, setTexto] = useState("");
  // Solo vale la respuesta de la última consulta (al volver de un reporte puede haber dos en vuelo).
  const peticion = useRef(0);

  const cargar = useCallback(async () => {
    const numero = ++peticion.current;
    try {
      const hoy = hoyEnChile();
      const datos = await cargarAvanceObra(supabase, id, hoy);
      if (numero !== peticion.current) return;
      setActualizacionFallida(false);
      setEstado(
        datos
          ? { tipo: "ok", nombre: datos.obra.nombre, enCurso: enCursoHoy(datos.raices, hoy), todas: itemsTerreno(datos.raices) }
          : { tipo: "noEncontrada" },
      );
    } catch {
      if (numero !== peticion.current) return;
      // Si ya había una lista, un fallo al actualizar no la borra: solo se avisa.
      setActualizacionFallida(true);
      setEstado((previo) => (previo.tipo === "ok" ? previo : { tipo: "error" }));
    }
  }, [id]);

  // Al enfocar la pantalla (también al volver de enviar un reporte) se actualiza el avance.
  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const secciones = useMemo(
    () => (estado.tipo === "ok" ? armarSecciones(estado.enCurso, estado.todas, texto) : []),
    [estado, texto],
  );

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  function reintentar() {
    setEstado({ tipo: "cargando" });
    void cargar();
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
        <Text style={estilos.texto}>No pudimos cargar las partidas. Revisa tu señal.</Text>
        <View style={estilos.boton}>
          <Boton titulo="Reintentar" onPress={reintentar} />
        </View>
      </View>
    );
  }

  if (estado.tipo === "noEncontrada") {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.texto}>No encontramos esta obra.</Text>
      </View>
    );
  }

  return (
    <View style={estilos.pantalla}>
      <Stack.Screen options={{ title: estado.nombre }} />
      {enviado === "1" ? (
        <Text accessibilityLiveRegion="polite" style={estilos.enviado}>
          Reporte enviado ✓
        </Text>
      ) : null}
      {actualizacionFallida ? <Text style={estilos.fallo}>No pudimos actualizar. Revisa tu señal.</Text> : null}
      <TextInput
        accessibilityLabel="Buscar partida"
        placeholder="Buscar partida…"
        placeholderTextColor={colores.suave}
        value={texto}
        onChangeText={setTexto}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={estilos.buscador}
      />
      <SectionList
        testID="lista-partidas"
        sections={secciones}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        contentContainerStyle={estilos.lista}
        refreshing={refrescando}
        onRefresh={refrescar}
        renderSectionHeader={({ section }) =>
          section.titulo ? <Text style={estilos.seccion}>{section.titulo}</Text> : null
        }
        renderItem={({ item }) => (
          <View style={estilos.item}>
            <TarjetaPartida item={item} onPress={() => router.push(`/obras/${id}/partidas/${item.id}`)} />
          </View>
        )}
        ListEmptyComponent={
          <Text style={estilos.texto}>
            {estado.todas.length === 0 ? "Esta obra todavía no tiene partidas." : "No hay partidas que coincidan."}
          </Text>
        }
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24, backgroundColor: colores.fondo },
  texto: { fontSize: 16, color: colores.texto, textAlign: "center" },
  boton: { alignSelf: "stretch" },
  enviado: { margin: 16, marginBottom: 0, padding: 12, borderRadius: 10, backgroundColor: colores.fondoOk, fontSize: 16, color: colores.ok },
  fallo: { margin: 16, marginBottom: 0, padding: 12, borderRadius: 10, backgroundColor: colores.fondoAlerta, fontSize: 15, color: colores.alerta },
  buscador: {
    minHeight: ALTO_TOQUE,
    margin: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: 10,
    backgroundColor: colores.blanco,
    fontSize: 17,
    color: colores.texto,
  },
  lista: { paddingHorizontal: 16, paddingBottom: 24 },
  seccion: { marginTop: 12, marginBottom: 8, fontSize: 17, fontWeight: "700", color: colores.texto },
  item: { marginBottom: 8 },
});

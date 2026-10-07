import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from "react-native";
import { cargarFeed, type ReporteFeed } from "@pyxis/ovalle-core/datos/feed";
import { formatoCantidad, formatoMomento } from "@pyxis/ovalle-core/formato";
import { Boton } from "@/components/Boton";
import { useSesion } from "@/lib/sesion";
import { supabase } from "@/lib/supabase";
import { colores } from "@/lib/tema";

const MAXIMO_REPORTES = 30;
const ERROR_CARGA = "No pudimos cargar tus reportes. Revisa tu señal.";

type Estado = { tipo: "cargando" } | { tipo: "error" } | { tipo: "ok"; reportes: ReporteFeed[] };

function TarjetaReporte({ reporte }: { reporte: ReporteFeed }) {
  const { cantidad, partida, comentario, creado_en, anulado, fotoUrl } = reporte;
  const medida = [formatoCantidad(cantidad), partida.unidad].filter(Boolean).join(" ");
  return (
    <View style={[estilos.tarjeta, anulado && estilos.tarjetaAnulada]}>
      <View style={estilos.encabezado}>
        <Text style={estilos.momento}>{formatoMomento(creado_en)}</Text>
        {anulado ? <Text style={estilos.anulado}>Anulado</Text> : null}
      </View>
      <Text style={estilos.titulo}>{`${medida} · ${partida.codigo} ${partida.descripcion}`}</Text>
      {comentario ? <Text style={estilos.comentario}>{comentario}</Text> : null}
      {fotoUrl ? (
        <Image accessibilityLabel="Foto del reporte" source={{ uri: fotoUrl }} resizeMode="cover" style={estilos.foto} />
      ) : null}
    </View>
  );
}

export default function MisReportes() {
  const { perfil } = useSesion();
  const autorId = perfil?.id;
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [actualizacionFallida, setActualizacionFallida] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  // Solo vale la respuesta de la última consulta (enfocar y tirar hacia abajo pueden dejar dos en vuelo).
  const peticion = useRef(0);

  const cargar = useCallback(async () => {
    if (!autorId) return;
    const numero = ++peticion.current;
    try {
      // Con las URL firmadas por defecto: son las que Image necesita en el teléfono.
      const reportes = await cargarFeed(supabase, { autorId }, MAXIMO_REPORTES);
      if (numero !== peticion.current) return;
      setActualizacionFallida(false);
      setEstado({ tipo: "ok", reportes });
    } catch {
      if (numero !== peticion.current) return;
      // Si ya había una lista, un fallo al actualizar no la borra: solo se avisa.
      setActualizacionFallida(true);
      setEstado((previo) => (previo.tipo === "ok" ? previo : { tipo: "error" }));
    }
  }, [autorId]);

  // Las URL firmadas de las fotos duran 1 hora: al enfocar la pestaña se piden de nuevo, para que
  // una pantalla que quedó abierta mucho rato no muestre fotos rotas.
  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
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
        <Text style={estilos.texto}>{ERROR_CARGA}</Text>
        <View style={estilos.boton}>
          <Boton titulo="Reintentar" onPress={reintentar} />
        </View>
      </View>
    );
  }

  return (
    <View style={estilos.pantalla}>
      {actualizacionFallida ? (
        <Text accessibilityLiveRegion="polite" style={estilos.fallo}>
          {ERROR_CARGA}
        </Text>
      ) : null}
      <FlatList
        testID="lista-reportes"
        data={estado.reportes}
        keyExtractor={(reporte) => reporte.id}
        contentContainerStyle={estilos.lista}
        refreshing={refrescando}
        onRefresh={refrescar}
        ListEmptyComponent={<Text style={estilos.texto}>Todavía no has enviado reportes.</Text>}
        renderItem={({ item }) => <TarjetaReporte reporte={item} />}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24, backgroundColor: colores.fondo },
  texto: { fontSize: 16, color: colores.texto, textAlign: "center" },
  boton: { alignSelf: "stretch" },
  fallo: { margin: 16, marginBottom: 0, padding: 12, borderRadius: 10, backgroundColor: colores.fondoAlerta, fontSize: 15, color: colores.alerta },
  lista: { padding: 16, gap: 12 },
  tarjeta: {
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colores.linea,
    backgroundColor: colores.blanco,
  },
  tarjetaAnulada: { opacity: 0.6 },
  encabezado: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  momento: { fontSize: 14, color: colores.suave },
  anulado: { fontSize: 14, fontWeight: "700", color: colores.alerta },
  titulo: { fontSize: 17, fontWeight: "600", color: colores.texto },
  comentario: { fontSize: 15, color: colores.texto },
  foto: { width: "100%", aspectRatio: 4 / 3, borderRadius: 8, backgroundColor: colores.linea },
});

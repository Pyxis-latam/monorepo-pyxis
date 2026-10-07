import { randomUUID } from "expo-crypto";
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
  type ImagePickerResult,
} from "expo-image-picker";
import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { formatoCantidad, formatoPorcentaje } from "@pyxis/riolimari-core/formato";
import { avanceConReporte, parseCantidadIngresada } from "@pyxis/riolimari-core/reportes/cantidad";
import { clienteReportesDesde, enviarReporte } from "@pyxis/riolimari-core/reportes/enviar";
import { Boton } from "@/components/Boton";
import { prepararFotoMovil } from "@/lib/fotos";
import { supabase } from "@/lib/supabase";
import { ALTO_TOQUE, colores } from "@/lib/tema";

type Partida = { id: string; codigo: string; descripcion: string; unidad: string; cantidad: number; ejecutado: number };
type Modo = "cantidad" | "porcentaje";
/** Foto elegida: `ancho`/`alto` son los que informa el selector, los usa `prepararFotoMovil`. */
type Foto = { uri: string; ancho: number; alto: number };

const NOTA_FIJO = "Este reporte ya se intentó enviar. Reintenta tal cual; si necesitas corregirlo, revisa Mis reportes después.";

type Props = {
  obraId: string;
  autorId: string;
  partida: Partida;
  /** Se llama cuando el reporte quedó enviado. */
  alEnviar(): void;
};

function OpcionModo({ titulo, activa, deshabilitada, onPress }: { titulo: string; activa: boolean; deshabilitada: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activa, disabled: deshabilitada }}
      disabled={deshabilitada}
      onPress={onPress}
      style={[estilos.modo, activa && estilos.modoActivo, deshabilitada && estilos.atenuado]}
    >
      <Text style={[estilos.modoTexto, activa && estilos.modoTextoActivo]}>{titulo}</Text>
    </Pressable>
  );
}

export function FormularioReporte({ obraId, autorId, partida, alEnviar }: Props) {
  // Un id por reporte: los reintentos reutilizan el mismo y la BD no duplica.
  const [id, setId] = useState(randomUUID);
  const fotoSubida = useRef(false);
  // Bytes ya preparados de la foto elegida: los reintentos no vuelven a decodificarla.
  const preparada = useRef<{ uri: string; bytes: ArrayBuffer } | null>(null);
  // Tras un insert intentado el reporte pudo llegar a la BD (solo se perdió la respuesta): desde ahí el id, la foto y los
  // valores quedan fijos. Un reintento con otros valores daría 23505 ("enviado") y la BD conservaría los primeros.
  const [insertIntentado, setInsertIntentado] = useState(false);
  // Copia en ref para `cambiarFoto`: el resultado del selector llega en el cierre del render en que se abrió.
  const insertIntentadoRef = useRef(false);
  // Selector o permiso de cámara en curso: mientras tanto no se envía (la foto podría cambiar después).
  const [eligiendoFoto, setEligiendoFoto] = useState(false);
  const [modo, setModo] = useState<Modo>("cantidad");
  const [texto, setTexto] = useState("");
  const [comentario, setComentario] = useState("");
  const [foto, setFoto] = useState<Foto | null>(null);
  const [avisoCamara, setAvisoCamara] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const lectura = texto.trim() ? parseCantidadIngresada(texto, modo, partida.cantidad) : null;
  const seExcede = lectura?.ok && partida.ejecutado + lectura.cantidad > partida.cantidad;
  const bloqueado = insertIntentado || enviando;

  function marcarInsertIntentado() {
    insertIntentadoRef.current = true;
    setInsertIntentado(true);
  }

  function cambiarFoto(nueva: Foto | null) {
    if (insertIntentadoRef.current) return;
    // Sin insert intentado no hay reporte en la BD: la foto puede cambiar. Cada foto sube a <obra>/<autor>/<id>.jpg,
    // una ruta inmutable que no se sobrescribe, así que otra foto va con un id nuevo (si no, la subida daría 409
    // y el reporte quedaría con los bytes de la foto anterior).
    fotoSubida.current = false;
    setId(randomUUID());
    setFoto(nueva);
  }

  function recibirFoto(resultado: ImagePickerResult) {
    if (resultado.canceled || !resultado.assets[0]) return;
    const { uri, width, height } = resultado.assets[0];
    cambiarFoto({ uri, ancho: width, alto: height });
  }

  async function tomarFoto() {
    setAvisoCamara(null);
    setEligiendoFoto(true);
    try {
      const permiso = await requestCameraPermissionsAsync();
      if (!permiso.granted) {
        setAvisoCamara("Para tomar fotos, permite el acceso a la cámara en los ajustes del teléfono.");
        return;
      }
      recibirFoto(await launchCameraAsync({ mediaTypes: ["images"], quality: 1 }));
    } finally {
      setEligiendoFoto(false);
    }
  }

  async function elegirDeGaleria() {
    setAvisoCamara(null);
    setEligiendoFoto(true);
    try {
      recibirFoto(await launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 }));
    } finally {
      setEligiendoFoto(false);
    }
  }

  async function bytesDe(elegida: Foto): Promise<ArrayBuffer> {
    if (preparada.current?.uri === elegida.uri) return preparada.current.bytes;
    const bytes = await prepararFotoMovil(elegida.uri, elegida.ancho, elegida.alto);
    preparada.current = { uri: elegida.uri, bytes };
    return bytes;
  }

  async function enviar() {
    const r = parseCantidadIngresada(texto, modo, partida.cantidad);
    if (!r.ok) {
      setError(r.mensaje);
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      let bytes: ArrayBuffer | null = null;
      if (foto) {
        try {
          bytes = await bytesDe(foto);
        } catch {
          setError("No se pudo preparar la foto. Prueba con otra o quítala.");
          setFallo(true);
          return;
        }
      }
      const resultado = await enviarReporte(
        clienteReportesDesde(supabase),
        { id, obraId, partidaId: partida.id, autorId, cantidad: r.cantidad, comentario, foto: bytes },
        fotoSubida.current,
      );
      if (resultado.ok) {
        alEnviar();
        return;
      }
      fotoSubida.current = resultado.fotoSubida;
      if (resultado.insertIntentado) marcarInsertIntentado();
      setError(resultado.mensaje);
      setFallo(true);
    } catch {
      // No sabemos hasta dónde llegó el envío: el insert pudo salir. El id y la foto quedan fijos.
      marcarInsertIntentado();
      setError("Algo falló. Reintenta.");
      setFallo(true);
    } finally {
      setEnviando(false);
    }
  }

  // Los reportes se suman: lo que se ingresa es el avance de este reporte, no el total acumulado.
  const etiquetaCantidad = modo === "cantidad" ? `Avance de este reporte (${partida.unidad})` : "Avance de este reporte (%)";

  return (
    <ScrollView
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
    >
      <View style={estilos.grupo}>
        <Text style={estilos.codigo}>{partida.codigo}</Text>
        <Text style={estilos.titulo}>{partida.descripcion}</Text>
        <Text style={estilos.texto}>
          {`Llevas ${formatoCantidad(partida.ejecutado)} de ${formatoCantidad(partida.cantidad)} ${partida.unidad} (${formatoPorcentaje(avanceConReporte(partida))})`}
        </Text>
      </View>

      <View style={estilos.grupo}>
        <View style={estilos.fila}>
          <OpcionModo titulo={partida.unidad} activa={modo === "cantidad"} deshabilitada={bloqueado} onPress={() => setModo("cantidad")} />
          <OpcionModo titulo="%" activa={modo === "porcentaje"} deshabilitada={bloqueado} onPress={() => setModo("porcentaje")} />
        </View>
        <Text style={estilos.etiqueta}>{etiquetaCantidad}</Text>
        <TextInput
          accessibilityLabel={etiquetaCantidad}
          value={texto}
          onChangeText={setTexto}
          keyboardType="decimal-pad"
          editable={!bloqueado}
          style={[estilos.campo, estilos.campoCantidad, bloqueado && estilos.atenuado]}
        />
        {modo === "porcentaje" && lectura?.ok ? (
          <Text style={estilos.texto}>{`= ${formatoCantidad(lectura.cantidad)} ${partida.unidad}`}</Text>
        ) : null}
        {lectura?.ok ? (
          <Text style={estilos.texto}>{`Con este reporte quedaría en ${formatoPorcentaje(avanceConReporte(partida, lectura.cantidad))}`}</Text>
        ) : null}
        {seExcede ? (
          <Text style={estilos.aviso}>Con este reporte se supera lo presupuestado. Puedes enviarlo igual.</Text>
        ) : null}
      </View>

      <View style={estilos.grupo}>
        <Text style={estilos.etiqueta}>Foto (opcional)</Text>
        <Boton titulo="Tomar foto" variante="secundario" onPress={tomarFoto} deshabilitado={bloqueado} />
        <Boton titulo="Elegir de la galería" variante="secundario" onPress={elegirDeGaleria} deshabilitado={bloqueado} />
        {avisoCamara ? <Text style={estilos.aviso}>{avisoCamara}</Text> : null}
        {foto ? (
          <>
            <Image
              accessible
              accessibilityLabel="Foto adjunta"
              source={{ uri: foto.uri }}
              resizeMode="cover"
              style={estilos.miniatura}
            />
            <Boton titulo="Quitar foto" variante="secundario" onPress={() => cambiarFoto(null)} deshabilitado={bloqueado} />
          </>
        ) : null}
      </View>

      <View style={estilos.grupo}>
        <Text style={estilos.etiqueta}>Comentario (opcional)</Text>
        <TextInput
          accessibilityLabel="Comentario (opcional)"
          value={comentario}
          onChangeText={setComentario}
          multiline
          maxLength={1000}
          editable={!bloqueado}
          textAlignVertical="top"
          style={[estilos.campo, estilos.campoComentario, bloqueado && estilos.atenuado]}
        />
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={estilos.error}>
          {error}
        </Text>
      ) : null}
      {insertIntentado ? <Text style={estilos.texto}>{NOTA_FIJO}</Text> : null}

      <Boton
        titulo={enviando ? "Enviando…" : fallo ? "Reintentar" : "Enviar reporte"}
        onPress={enviar}
        ocupado={enviando}
        deshabilitado={eligiendoFoto}
      />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: 16, gap: 20 },
  grupo: { gap: 10 },
  fila: { flexDirection: "row", gap: 8 },
  codigo: { fontSize: 14, color: colores.texto },
  titulo: { fontSize: 20, fontWeight: "700", color: colores.texto },
  texto: { fontSize: 15, color: colores.texto },
  etiqueta: { fontSize: 15, fontWeight: "600", color: colores.texto },
  aviso: { fontSize: 15, color: colores.alerta },
  error: { fontSize: 15, color: colores.alerta, padding: 12, borderRadius: 10, backgroundColor: colores.fondoAlerta },
  atenuado: { opacity: 0.6 },
  modo: {
    flex: 1,
    minHeight: ALTO_TOQUE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colores.linea,
    backgroundColor: colores.blanco,
  },
  modoActivo: { backgroundColor: colores.texto, borderColor: colores.texto },
  modoTexto: { fontSize: 17, fontWeight: "600", color: colores.texto },
  modoTextoActivo: { color: colores.blanco },
  campo: {
    minHeight: ALTO_TOQUE,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: 10,
    backgroundColor: colores.blanco,
    paddingHorizontal: 14,
    fontSize: 18,
    color: colores.texto,
  },
  campoCantidad: { fontSize: 26 },
  campoComentario: { minHeight: 96, paddingVertical: 12 },
  miniatura: { width: "100%", height: 200, borderRadius: 10, backgroundColor: colores.linea },
});

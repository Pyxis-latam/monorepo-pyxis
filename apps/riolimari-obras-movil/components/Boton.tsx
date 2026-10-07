import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { ALTO_TOQUE, colores } from "@/lib/tema";

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: "primario" | "secundario";
  deshabilitado?: boolean;
  ocupado?: boolean;
};

export function Boton({ titulo, onPress, variante = "primario", deshabilitado = false, ocupado = false }: Props) {
  const inactivo = deshabilitado || ocupado;
  const primario = variante === "primario";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: ocupado }}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        primario ? estilos.primario : estilos.secundario,
        (inactivo || pressed) && estilos.atenuado,
      ]}
    >
      {ocupado ? <ActivityIndicator color={primario ? colores.blanco : colores.acento} /> : null}
      <Text style={[estilos.texto, primario ? estilos.textoPrimario : estilos.textoSecundario]}>{titulo}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: ALTO_TOQUE,
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primario: { backgroundColor: colores.acento },
  secundario: { backgroundColor: colores.blanco, borderWidth: 1, borderColor: colores.linea },
  atenuado: { opacity: 0.6 },
  texto: { fontSize: 17, fontWeight: "600" },
  textoPrimario: { color: colores.blanco },
  textoSecundario: { color: colores.texto },
});

import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatoCantidad, formatoPorcentaje } from "@pyxis/riolimari-core/formato";
import type { ItemPartida } from "@pyxis/riolimari-core/terreno/lista";
import { ALTO_TOQUE, colores } from "@/lib/tema";

type Props = { item: ItemPartida; onPress: () => void };

export function TarjetaPartida({ item, onPress }: Props) {
  const completa = item.porcentaje >= 1;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionada]}
    >
      <Text style={estilos.titulo}>{`${item.codigo} ${item.descripcion}`}</Text>
      <View style={estilos.pista}>
        {/* Pasarse del 100 % no desborda la barra. */}
        <View
          style={[
            estilos.relleno,
            { width: `${Math.min(Math.max(item.porcentaje, 0), 1) * 100}%` },
            completa && estilos.rellenoCompleto,
          ]}
        />
      </View>
      <Text style={estilos.avance}>
        {`${formatoPorcentaje(item.porcentaje)} · ${formatoCantidad(item.ejecutado)}/${formatoCantidad(item.cantidad)} ${item.unidad}`}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    minHeight: ALTO_TOQUE,
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colores.linea,
    backgroundColor: colores.blanco,
  },
  presionada: { opacity: 0.7 },
  titulo: { fontSize: 16, fontWeight: "600", color: colores.texto },
  pista: { height: 8, borderRadius: 4, backgroundColor: colores.linea, overflow: "hidden" },
  relleno: { height: 8, borderRadius: 4, backgroundColor: colores.acento },
  rellenoCompleto: { backgroundColor: colores.ok },
  avance: { fontSize: 14, color: colores.texto },
});

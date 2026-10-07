import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { useSesion } from "@/lib/sesion";
import { ALTO_TOQUE, colores } from "@/lib/tema";

/** Botón de encabezado: cierra la sesión, pero pide confirmar (volver a entrar exige un código por email). */
export function BotonSalir() {
  const { salir } = useSesion();

  function confirmar() {
    Alert.alert("¿Salir de la app?", "Para volver a entrar necesitarás un código que te llegará por email.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: () => void salir() },
    ]);
  }

  return (
    <Pressable accessibilityRole="button" onPress={confirmar} style={estilos.boton}>
      <Text style={estilos.texto}>Salir</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: { minHeight: ALTO_TOQUE, minWidth: ALTO_TOQUE, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  texto: { fontSize: 16, fontWeight: "600", color: colores.acento },
});

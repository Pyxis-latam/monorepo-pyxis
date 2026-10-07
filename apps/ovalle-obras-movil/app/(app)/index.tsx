import { StyleSheet, Text, View } from "react-native";
import { hoyEnChile } from "@pyxis/ovalle-core/fechas";
import { formatoFecha } from "@pyxis/ovalle-core/formato";
import { Boton } from "@/components/Boton";
import { useSesion } from "@/lib/sesion";
import { colores } from "@/lib/tema";

// Pantalla temporal: la lista de obras y partidas llega en la Task 23.
export default function Obras() {
  const { perfil, salir } = useSesion();
  return (
    <View style={estilos.pantalla}>
      <Text style={estilos.titulo}>Obras</Text>
      {perfil ? <Text style={estilos.texto}>Hola, {perfil.nombre}</Text> : null}
      <Text style={estilos.texto}>Hoy es {formatoFecha(hoyEnChile())}</Text>
      <Boton titulo="Salir" variante="secundario" onPress={salir} />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, padding: 24, gap: 16, backgroundColor: colores.fondo },
  titulo: { fontSize: 24, fontWeight: "700", color: colores.texto },
  texto: { fontSize: 16, color: colores.texto },
});

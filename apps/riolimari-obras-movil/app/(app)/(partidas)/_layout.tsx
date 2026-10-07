import { Stack } from "expo-router";
import { BotonSalir } from "@/components/BotonSalir";
import { colores } from "@/lib/tema";

const botonSalir = () => <BotonSalir />;

// Pila de la pestaña "Partidas": obras → partidas de la obra → formulario de reporte.
export default function LayoutPartidas() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colores.fondo },
        headerTintColor: colores.texto,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Obras", headerRight: botonSalir }} />
      {/* El título se reemplaza por el nombre de la obra al cargarla. */}
      <Stack.Screen name="obras/[id]" options={{ title: "Partidas", headerRight: botonSalir }} />
      <Stack.Screen name="obras/[id]/partidas/[partidaId]" options={{ title: "Reportar avance" }} />
    </Stack>
  );
}

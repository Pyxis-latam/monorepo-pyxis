import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Boton } from "@/components/Boton";
import { useSesion } from "@/lib/sesion";
import { colores } from "@/lib/tema";

export default function LayoutApp() {
  const { cargando, perfil, sinAcceso, errorPerfil, reintentar, salir } = useSesion();

  if (cargando) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={colores.acento} />
      </View>
    );
  }

  if (errorPerfil) {
    return (
      <SafeAreaView style={estilos.centro}>
        <Text style={estilos.texto}>No pudimos conectar con el servidor. Revisa tu señal.</Text>
        <View style={estilos.boton}>
          <Boton titulo="Reintentar" onPress={reintentar} />
        </View>
        <View style={estilos.boton}>
          <Boton titulo="Salir" variante="secundario" onPress={salir} />
        </View>
      </SafeAreaView>
    );
  }

  if (sinAcceso) {
    return (
      <SafeAreaView style={estilos.centro}>
        <Text style={estilos.titulo}>Tu cuenta no tiene acceso</Text>
        <Text style={estilos.texto}>Pide al administrador de la obra que active tu usuario.</Text>
        <View style={estilos.boton}>
          <Boton titulo="Salir" variante="secundario" onPress={salir} />
        </View>
      </SafeAreaView>
    );
  }

  if (!perfil) return <Redirect href="/ingresar" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colores.acento,
        // Sin íconos por ahora: solo la etiqueta, grande.
        tabBarIconStyle: { display: "none" },
        tabBarLabelStyle: { fontSize: 16, fontWeight: "600" },
      }}
    >
      {/* Cada pestaña con varias pantallas es un grupo con su propia pila (aquí, su encabezado). */}
      <Tabs.Screen name="(partidas)" options={{ title: "Partidas", headerShown: false }} />
    </Tabs>
  );
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
    backgroundColor: colores.fondo,
  },
  titulo: { fontSize: 22, fontWeight: "700", color: colores.texto, textAlign: "center" },
  texto: { fontSize: 16, color: colores.texto, textAlign: "center" },
  boton: { alignSelf: "stretch" },
});

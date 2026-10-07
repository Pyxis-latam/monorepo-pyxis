import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SesionProvider } from "@/lib/sesion";

export default function LayoutRaiz() {
  return (
    <SesionProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </SesionProvider>
  );
}

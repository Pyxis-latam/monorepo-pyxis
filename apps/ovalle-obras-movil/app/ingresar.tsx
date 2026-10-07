import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Boton } from "@/components/Boton";
import { supabase } from "@/lib/supabase";
import { ALTO_TOQUE, colores } from "@/lib/tema";

export default function Ingresar() {
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [paso, setPaso] = useState<"email" | "codigo">("email");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const emailLimpio = email.trim().toLowerCase();

  async function pedirCodigo() {
    setCargando(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: emailLimpio,
      options: { shouldCreateUser: false },
    });
    setCargando(false);
    if (error) {
      setError("No pudimos enviar el código. Revisa el email o pide acceso al administrador.");
      return;
    }
    setPaso("codigo");
  }

  async function verificar() {
    setCargando(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: emailLimpio,
      token: codigo.trim(),
      type: "email",
    });
    setCargando(false);
    if (error) {
      setError("El código no es válido o venció. Pide uno nuevo.");
      return;
    }
    router.replace("/");
  }

  function usarOtroEmail() {
    setPaso("email");
    setCodigo("");
    setError(null);
  }

  return (
    <SafeAreaView style={estilos.pantalla}>
      <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <Text style={estilos.titulo}>Ovalle Obras</Text>

          {paso === "email" ? (
            <View style={estilos.formulario}>
              <Text style={estilos.etiqueta}>Email</Text>
              <TextInput
                accessibilityLabel="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={() => emailLimpio && pedirCodigo()}
                style={estilos.campo}
              />
              <Boton
                titulo="Enviarme un código"
                onPress={pedirCodigo}
                deshabilitado={!emailLimpio}
                ocupado={cargando}
              />
            </View>
          ) : (
            <View style={estilos.formulario}>
              <Text style={estilos.texto}>
                Te enviamos un código de 6 dígitos a <Text style={estilos.negrita}>{emailLimpio}</Text>.
              </Text>
              <Text style={estilos.etiqueta}>Código</Text>
              <TextInput
                accessibilityLabel="Código"
                value={codigo}
                onChangeText={setCodigo}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                returnKeyType="done"
                onSubmitEditing={() => codigo.trim() && verificar()}
                style={[estilos.campo, estilos.campoCodigo]}
              />
              <Boton titulo="Ingresar" onPress={verificar} deshabilitado={!codigo.trim()} ocupado={cargando} />
              <Boton titulo="Usar otro email" variante="secundario" onPress={usarOtroEmail} deshabilitado={cargando} />
            </View>
          )}

          {error ? (
            <Text accessibilityRole="alert" style={estilos.error}>
              {error}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 24 },
  titulo: { fontSize: 28, fontWeight: "700", color: colores.texto, textAlign: "center" },
  formulario: { gap: 12 },
  etiqueta: { fontSize: 15, fontWeight: "600", color: colores.texto },
  texto: { fontSize: 16, color: colores.texto },
  negrita: { fontWeight: "700" },
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
  campoCodigo: { fontSize: 26, letterSpacing: 8, textAlign: "center" },
  error: { fontSize: 15, color: colores.alerta },
});

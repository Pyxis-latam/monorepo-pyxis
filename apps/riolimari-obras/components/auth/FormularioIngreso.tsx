"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

export function FormularioIngreso({ siguiente }: { siguiente: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [paso, setPaso] = useState<"email" | "codigo">("email");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function pedirCodigo(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error } = await crearClienteNavegador().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });
    setCargando(false);
    if (error) {
      setError("No pudimos enviar el código. Revisa el email o pide acceso al administrador.");
      return;
    }
    setPaso("codigo");
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error } = await crearClienteNavegador().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: codigo.trim(),
      type: "email",
    });
    setCargando(false);
    if (error) {
      setError("El código no es válido o venció. Pide uno nuevo.");
      return;
    }
    router.replace(siguiente);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      {paso === "email" ? (
        <form onSubmit={pedirCodigo} className="space-y-3">
          <label className="block text-sm font-medium" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-obra-line bg-white px-3 py-3 text-base"
          />
          <button disabled={cargando} className="w-full rounded-lg bg-obra-accent py-3 font-semibold text-white enabled:hover:bg-obra-accent-strong enabled:active:bg-obra-accent-strong disabled:opacity-60">
            Enviarme un código
          </button>
        </form>
      ) : (
        <form onSubmit={verificar} className="space-y-3">
          <p className="text-sm">Te enviamos un código de 6 dígitos a <strong>{email}</strong>.</p>
          <label className="block text-sm font-medium" htmlFor="codigo">Código</label>
          <input
            id="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="w-full rounded-lg border border-obra-line bg-white px-3 py-3 text-center text-2xl tracking-widest"
          />
          <button disabled={cargando} className="w-full rounded-lg bg-obra-accent py-3 font-semibold text-white enabled:hover:bg-obra-accent-strong enabled:active:bg-obra-accent-strong disabled:opacity-60">
            Ingresar
          </button>
          <button type="button" onClick={() => setPaso("email")} className="w-full text-sm underline">
            Usar otro email
          </button>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-obra-warn">{error}</p>}
    </div>
  );
}

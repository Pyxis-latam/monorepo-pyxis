import { createClient } from "@supabase/supabase-js";
import { adminServicio, crearUsuario } from "./helpers";

describe("perfil creado junto al usuario", () => {
  it("el rol sale de app_metadata (service role) y el nombre de user_metadata", async () => {
    const admin = await crearUsuario("admin", "Ana Admin");
    const terreno = await crearUsuario("terreno", "Tomas Terreno");
    const { data } = await adminServicio
      .from("perfiles")
      .select("id, rol, nombre")
      .in("id", [admin.id, terreno.id]);
    const porId = Object.fromEntries(data!.map((p) => [p.id, p]));
    expect(porId[admin.id]).toMatchObject({ rol: "admin", nombre: "Ana Admin" });
    expect(porId[terreno.id]).toMatchObject({ rol: "terreno", nombre: "Tomas Terreno" });
  });

  it("un rol puesto en user_metadata (editable por el cliente) no da privilegios", async () => {
    const email = `intruso-${crypto.randomUUID()}@test.local`;
    const { data, error } = await adminServicio.auth.admin.createUser({
      email,
      password: "clave-de-prueba-123",
      email_confirm: true,
      user_metadata: { nombre: "Intruso", rol: "admin" },
    });
    expect(error).toBeNull();
    const { data: perfil } = await adminServicio.from("perfiles").select("rol").eq("id", data.user!.id).single();
    expect(perfil!.rol).toBe("terreno");
  });

  it("el registro abierto esta bloqueado", async () => {
    const cliente = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await cliente.auth.signUp({
      email: `registro-${crypto.randomUUID()}@test.local`,
      password: "clave-de-prueba-123",
      options: { data: { nombre: "Intruso", rol: "admin" } },
    });
    expect(error).not.toBeNull();
  });
});

// Uso: npm run crear-admin -w @pyxis/ovalle-obras -- correo@dominio.cl "Nombre Apellido"
import { createClient } from "@supabase/supabase-js";

const [email, nombre] = process.argv.slice(2);
if (!email || !nombre) {
  console.error('Uso: npm run crear-admin -- correo@dominio.cl "Nombre Apellido"');
  process.exit(1);
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
// El trigger toma el rol de app_metadata (solo escribible con la service role) y el nombre de
// user_metadata. Poner `rol` en user_metadata crearía en silencio un usuario de terreno.
const { error } = await supabase.auth.admin.createUser({
  email: email.toLowerCase(),
  email_confirm: true,
  user_metadata: { nombre },
  app_metadata: { rol: "admin" },
});
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Admin ${email} creado. Ingresa con un código a ese email.`);

// Escribe .env.local con las claves de la instancia local de Supabase.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const status = JSON.parse(execSync("npx supabase status -o json", { encoding: "utf8" }));
const lineas = [
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}`,
  `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
];
writeFileSync(".env.local", lineas.join("\n") + "\n");
console.log("Escrito .env.local");

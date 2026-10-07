// Escribe .env.local de la app móvil a partir del de la web (Supabase local).
// El teléfono no llega a 127.0.0.1 del computador: se usa la IP de la red local.
// Uso: npm run env:local [-- <ip>]   (la IP es opcional; por defecto, la primera IPv4 no interna)
import { readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raizApp = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envWeb = resolve(raizApp, "../riolimari-obras/.env.local");

function leerEnv(ruta) {
  const valores = {};
  for (const linea of readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) valores[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return valores;
}

// Adaptadores virtuales (Hyper-V/WSL, Docker, VirtualBox, VMware…): el teléfono no los alcanza.
const VIRTUAL = /vethernet|wsl|hyper-v|docker|virtualbox|vboxnet|vmware|vmnet|^br-|^veth|^utun/i;

function ipLan() {
  const candidatas = Object.entries(networkInterfaces()).flatMap(([nombre, interfaces]) =>
    (interfaces ?? [])
      .filter((i) => i.family === "IPv4" && !i.internal)
      .map((i) => ({ nombre, ip: i.address })),
  );
  const fisica = candidatas.find((c) => !VIRTUAL.test(c.nombre));
  return (fisica ?? candidatas[0])?.ip ?? null;
}

let web;
try {
  web = leerEnv(envWeb);
} catch {
  console.error(`No existe ${envWeb}. Primero: npm run db:start -w @pyxis/riolimari-obras && npm run env:local -w @pyxis/riolimari-obras`);
  process.exit(1);
}

const url = web.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = web.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error(`${envWeb} no tiene NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.`);
  process.exit(1);
}

const ip = process.argv[2] ?? ipLan();
if (!ip) {
  console.error("No encontré una IPv4 de red local. Pásala a mano: npm run env:local -- 192.168.1.20");
  process.exit(1);
}

const urlLan = url.replace(/\/\/(127\.0\.0\.1|localhost)(?=[:/]|$)/, `//${ip}`);
const lineas = [`EXPO_PUBLIC_SUPABASE_URL=${urlLan}`, `EXPO_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`];
writeFileSync(resolve(raizApp, ".env.local"), lineas.join("\n") + "\n");
console.log(`Escrito .env.local (Supabase en ${urlLan})`);

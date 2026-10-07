// Genera los íconos de la web y de la app móvil a partir del logo blanco de Río Limarí
// (public/marca/logo-blanco.png, 591 × 482, blanco sobre transparente).
// Uso: npm run iconos -w @pyxis/riolimari-obras   (después, revisar y commitear las imágenes).
// sharp viene en el árbol con Next (dependencia opcional), no hace falta instalarlo.
import { writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const PRIMARIO = "#004D69";
const TRANSPARENTE = { r: 0, g: 0, b: 0, alpha: 0 };
/** Margen alrededor del logo en los íconos cuadrados, como fracción del lado. */
const MARGEN = 0.15;

const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const movil = resolve(web, "../riolimari-obras-movil");
const logo = join(web, "public/marca/logo-blanco.png");

/** El logo escalado para caber en `ancho` × `alto` px, sin deformarlo. */
function logoEn(ancho, alto) {
  return sharp(logo).resize(ancho, alto, { fit: "contain", background: TRANSPARENTE }).png().toBuffer();
}

/** Ícono opaco: cuadrado del color primario con el logo centrado y MARGEN en cada borde. */
async function cuadrado(lado) {
  const interior = Math.round(lado * (1 - 2 * MARGEN));
  const compuesto = await sharp({ create: { width: lado, height: lado, channels: 4, background: PRIMARIO } })
    .composite([{ input: await logoEn(interior, interior), gravity: "centre" }])
    .png()
    .toBuffer();
  // Sin canal alfa (el ícono ya es opaco): iOS no acepta íconos con transparencia.
  return sharp(compuesto).removeAlpha().png().toBuffer();
}

/** Distancia del centro del logo a su píxel visible más lejano, en px del logo original. */
async function radioLogo() {
  const { data, info } = await sharp(logo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [cx, cy] = [info.width / 2, info.height / 2];
  let radio = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 0) radio = Math.max(radio, Math.hypot(x + 0.5 - cx, y + 0.5 - cy));
    }
  }
  return radio;
}

/**
 * Logo sobre transparente, centrado y dentro de un círculo de diámetro `fraccion` del lado. Android
 * recorta el ícono adaptativo y el de la pantalla de inicio con máscaras (círculo, squircle…): lo que
 * queda en ese círculo nunca se corta.
 */
async function enCirculo(lado, fraccion) {
  const { width, height } = await sharp(logo).metadata();
  const escala = (lado * fraccion) / 2 / (await radioLogo());
  const [ancho, alto] = [Math.floor(width * escala), Math.floor(height * escala)];
  return sharp({ create: { width: lado, height: lado, channels: 4, background: TRANSPARENTE } })
    .composite([{ input: await logoEn(ancho, alto), gravity: "centre" }])
    .png()
    .toBuffer();
}

const salidas = [
  // Web: pestaña y PWA (app/icon.png, app/apple-icon.png los publica Next; los de public/ el manifest).
  [join(web, "app/icon.png"), () => cuadrado(512)],
  [join(web, "app/apple-icon.png"), () => cuadrado(180)],
  [join(web, "public/icon-192.png"), () => cuadrado(192)],
  [join(web, "public/icon-512.png"), () => cuadrado(512)],
  // App móvil (app.json).
  [join(movil, "assets/icon.png"), () => cuadrado(1024)],
  [join(movil, "assets/favicon.png"), () => cuadrado(48)],
  // Zona segura del ícono adaptativo: círculo de 66 dp en un lienzo de 108 dp (~61 %).
  [join(movil, "assets/adaptive-icon.png"), () => enCirculo(1024, 66 / 108)],
  // Android 12+ muestra el ícono de inicio dentro de un círculo de 2/3 de su tamaño.
  [join(movil, "assets/splash-icon.png"), () => enCirculo(1024, 2 / 3)],
];

for (const [ruta, generar] of salidas) {
  await writeFile(ruta, await generar());
  console.log(`Escrito ${relative(resolve(web, "../.."), ruta)}`);
}

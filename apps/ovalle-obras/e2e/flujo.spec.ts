import { expect, test, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { construirPlantilla } from "../lib/excel/plantilla";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// JPEG 1×1 válido.
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64",
);

async function crearUsuario(rol: "admin" | "terreno", nombre: string) {
  const email = `${rol}-${Date.now()}-${Math.round(Math.random() * 1e6)}@test.local`;
  // El trigger toma el rol de app_metadata (solo el servidor lo escribe) y el nombre de user_metadata.
  const { error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { nombre },
    app_metadata: { rol },
  });
  if (error) throw error;
  return email;
}

async function ingresar(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Enviarme un código" }).click();
  await expect(page.getByLabel("Código")).toBeVisible();
  const { data, error } = await supabase.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  await page.getByLabel("Código").fill(data.properties.email_otp);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

async function nuevaPagina(browser: Browser, movil: boolean) {
  const contexto = await browser.newContext(movil ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {});
  return contexto.newPage();
}

test("admin carga una obra, terreno reporta con foto y el admin lo ve en vivo", async ({ browser }) => {
  const emailAdmin = await crearUsuario("admin", "Ana Admin");
  const emailTerreno = await crearUsuario("terreno", "Juan Terreno");
  const nombreObra = `Edificio E2E ${Date.now()}`;

  // Admin crea la obra desde la plantilla.
  const admin = await nuevaPagina(browser, false);
  await ingresar(admin, emailAdmin);
  await admin.waitForURL("**/admin");
  await admin.getByRole("link", { name: "Nueva obra" }).click();
  await admin.getByLabel("Nombre de la obra").fill(nombreObra);
  await admin.getByLabel("Archivo Excel").setInputFiles({
    name: "obra.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: await construirPlantilla(),
  });
  await admin.getByRole("button", { name: "Revisar archivo" }).click();
  await expect(admin.getByText("Enfierradura losa P3")).toBeVisible();
  await admin.getByRole("button", { name: "Crear obra" }).click();
  await admin.waitForURL(/\/admin\/obras\/[0-9a-f-]+$/);
  const obraUrl = new URL(admin.url());
  const obraId = obraUrl.pathname.split("/").at(-1)!;
  await admin.goto(`${obraUrl.pathname}?vista=feed&filtro=todas`);
  await expect(admin.getByText("En vivo")).toBeVisible({ timeout: 15_000 });

  // Terreno reporta desde el celular.
  const terreno = await nuevaPagina(browser, true);
  await ingresar(terreno, emailTerreno);
  await terreno.waitForURL("**/terreno**");
  await terreno.goto(`/terreno/obras/${obraId}`);
  await terreno.getByRole("link", { name: /Enfierradura losa P3/ }).first().click();
  await terreno.getByLabel("Cantidad ejecutada (kg)").fill("20");
  await terreno.getByLabel("Foto (opcional)").setInputFiles({ name: "foto.jpg", mimeType: "image/jpeg", buffer: JPEG });
  await terreno.getByLabel("Comentario (opcional)").fill("Sector norte listo");
  await terreno.getByRole("button", { name: "Enviar reporte" }).click();
  await expect(terreno.getByText("Reporte enviado ✓")).toBeVisible();

  // Admin lo ve sin recargar.
  await expect(admin.getByText("Juan Terreno")).toBeVisible({ timeout: 15_000 });
  await expect(admin.getByText("20 kg · 1.1 Enfierradura losa P3")).toBeVisible();
  await expect(admin.getByRole("img", { name: "Foto del reporte de Juan Terreno" })).toBeVisible();
});

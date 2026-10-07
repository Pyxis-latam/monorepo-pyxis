> **Nota:** el 2026-10-07 la app se renombró a "Río Limarí Obras" (`apps/riolimari-obras`, `apps/riolimari-obras-movil`, `packages/riolimari-core`). Este documento es un registro histórico y conserva los nombres originales.

# Ovalle Obras — Plan de implementación (V1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App web para Constructora Ovalle donde el admin carga el presupuesto/programación de una obra desde Excel y el personal de terreno reporta avance desde el celular, con dashboard casi en tiempo real (tabla, Gantt, feed, avance valorizado, exportación).

**Architecture:** Next.js 16 (App Router) en `apps/ovalle-obras` dentro del monorepo. Supabase (Postgres + Auth + Storage + Realtime) es el backend; las reglas de acceso viven en políticas RLS versionadas como migraciones SQL. Toda la lógica de dominio (lectura/validación de Excel, cálculos de avance, escala del Gantt, preparación de reportes) son funciones puras en `lib/` con tests unitarios; las páginas solo cargan datos y renderizan.

**Tech Stack:** Next.js 16.2.12, React 19.2.4, TypeScript, Tailwind CSS 4, `@supabase/supabase-js` + `@supabase/ssr`, Supabase CLI (Docker local), `exceljs`, `@react-pdf/renderer`, Jest 30 + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-06-ovalle-obras-design.md`

## Global Constraints

- App en `apps/ovalle-obras`, paquete `@pyxis/ovalle-obras`; tsconfig extiende `@pyxis/typescript-config/nextjs.json`.
- Mismas versiones que la landing: `next` 16.2.12, `react`/`react-dom` 19.2.4, `eslint-config-next` 16.2.12 (una sola copia hoisteada en el monorepo).
- Node ≥ 24. Instalar dependencias siempre desde la raíz con `-w @pyxis/ovalle-obras`.
- Next 16: el archivo es `proxy.ts` (no `middleware.ts`); `params`/`searchParams` son `Promise` y se hace `await`; `cookies()` es async.
- Puerto de desarrollo `3001` (la landing usa 3000).
- Toda la UI en español de Chile. Montos en CLP con `formatoCLP`; fechas `dd-mm-aaaa` con `formatoFecha`; "hoy" se calcula en zona `America/Santiago` (`hoyEnChile`).
- Porcentajes se manejan internamente como fracción (0.45 = 45 %); solo se formatean en la UI.
- La clave `SUPABASE_SERVICE_ROLE_KEY` solo se usa en código de servidor (`lib/supabase/admin.ts`, que importa `server-only`) y en scripts.
- Sin registro abierto: solo usuarios creados por un admin. Ingreso con código de 6 dígitos al email.
- Excel ≤ 4 MB (límite de cuerpo de Vercel Functions = 4.5 MB). Fotos ≤ 10 MB, comprimidas en el navegador a máx. 1600 px JPEG calidad 0.8, subidas directo a Storage.
- Fuera de alcance V1: multi-empresa, asignación usuario↔obra, modo offline, importador Unysoft, edición del plan en la app, edición/borrado de reportes por terreno.
- `npm test` (unitarios) no requiere Docker. `test:db` y `test:e2e` requieren `npm run db:start` (Docker Desktop corriendo).

## Review Focus

1. **Números chilenos escritos como texto en el Excel** ("4.200", "1.150,5", "$ 12.000"): deben leerse como 4200, 1150.5 y 12000, nunca como 4.2. → test en Task 5 (`parseNumeroCL`) y Task 7 (`validarFilas`).
2. **Fechas de Excel que se corren un día** por zona horaria (exceljs entrega `Date` en UTC; formatear en hora local de Chile da el día anterior), y fechas como texto `03-11-2026` o número serial. → tests en Task 5 (`parseFecha`).
3. **Códigos que Excel convierte a número** (`1.10` guardado como número se lee `1.1` y choca con otra partida): se lee el texto mostrado de la celda y la plantilla formatea la columna como texto. → test en Task 6.
4. **Doble envío de un reporte** (doble toque, reintento tras error de red): no debe duplicar avance. El id del reporte se genera en el cliente una vez; un insert repetido devuelve `23505` y se trata como éxito. → tests en Task 3 (BD) y Task 18 (`enviarReporte`).
5. **Cantidad ingresada con coma decimal o en %** en el teclado del celular ("12,5", "40 %"): debe convertirse bien a la unidad de la partida y rechazar 0, negativos y texto. → tests en Task 18 (`parseCantidadIngresada`).

---

## Mapa de archivos

```
apps/ovalle-obras/
  package.json · next.config.ts · tsconfig.json · eslint.config.mjs · postcss.config.mjs
  jest.config.js · jest.setup.js · jest.db.config.js · playwright.config.ts · proxy.ts · README.md
  app/
    layout.tsx · globals.css · page.tsx · manifest.ts · icon.svg
    ingresar/page.tsx · sin-acceso/page.tsx · salir/route.ts
    admin/layout.tsx · admin/page.tsx · admin/plantilla/route.ts
    admin/obras/acciones.ts · admin/obras/nueva/page.tsx
    admin/obras/[id]/page.tsx · admin/obras/[id]/acciones.ts · admin/obras/[id]/importar/page.tsx
    admin/obras/[id]/exportar/excel/route.ts · admin/obras/[id]/exportar/pdf/route.ts
    admin/usuarios/page.tsx · admin/usuarios/acciones.ts
    terreno/layout.tsx · terreno/page.tsx · terreno/reportes/page.tsx
    terreno/obras/[id]/page.tsx · terreno/obras/[id]/partidas/[partidaId]/page.tsx
  components/
    auth/FormularioIngreso.tsx
    importacion/FormularioImportacion.tsx
    dashboard/Indicadores.tsx · TablaAvance.tsx · Gantt.tsx · Feed.tsx · BotonAnular.tsx · RefrescoEnVivo.tsx · Pestanas.tsx
    usuarios/FormularioUsuario.tsx
    terreno/ListaPartidas.tsx · FormularioReporte.tsx
  lib/
    env.ts · formato.ts · numeros.ts · fechas.ts
    supabase/servidor.ts · navegador.ts · admin.ts · database.types.ts (generado)
    auth/rutas.ts · auth/sesion.ts
    excel/columnas.ts · excel/leer.ts · excel/plantilla.ts · excel/validar.ts · excel/diferencias.ts
    avance/tipos.ts · avance/calculos.ts · avance/arbol.ts · avance/filtros.ts
    gantt/escala.ts
    datos/obra.ts · datos/feed.ts
    exportar/excel.ts · exportar/pdf.tsx
    usuarios/validar.ts
    terreno/lista.ts
    reportes/cantidad.ts · reportes/enviar.ts
    fotos/preparar.ts
  scripts/env-local.mjs · scripts/crear-admin.mjs
  supabase/config.toml · supabase/templates/codigo.html
  supabase/migrations/20261006000001_esquema.sql · 20261006000002_seguridad.sql · 20261006000003_importacion.sql
  supabase/tests/env.js · helpers.ts · rls.test.ts · importacion.test.ts
  e2e/flujo.spec.ts
```

Tests unitarios viven junto al archivo (`x.ts` → `x.test.ts`). Los tests de `lib/` que no tocan el DOM empiezan con el docblock `/** @jest-environment node */`.

---

### Task 1: Esqueleto de la app y formato

**Files:**
- Create: `apps/ovalle-obras/package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `jest.config.js`, `jest.setup.js`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `lib/formato.ts`
- Test: `apps/ovalle-obras/lib/formato.test.ts`

**Interfaces:**
- Produces: `formatoCLP(n: number): string`, `formatoPorcentaje(fraccion: number): string`, `formatoFecha(iso: string | null): string`, `formatoCantidad(n: number): string`, `slug(texto: string): string`

- [ ] **Step 1: Crear archivos de configuración**

`apps/ovalle-obras/package.json`:
```json
{
  "name": "@pyxis/ovalle-obras",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "lint": "eslint",
    "test": "jest",
    "test:db": "jest --config jest.db.config.js --runInBand",
    "test:e2e": "playwright test",
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:types": "supabase gen types typescript --local --schema public > lib/supabase/database.types.ts",
    "env:local": "node scripts/env-local.mjs",
    "crear-admin": "node --env-file=.env.local scripts/crear-admin.mjs"
  },
  "dependencies": {
    "next": "16.2.12",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@pyxis/typescript-config": "*",
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^7.0.0",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/jest": "^30.0.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.12",
    "jest": "^30.4.2",
    "jest-environment-jsdom": "^30.4.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

`apps/ovalle-obras/next.config.ts`:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Excel de presupuesto (≤ 4 MB) por server action; Vercel corta en 4.5 MB.
    serverActions: { bodySizeLimit: "4.5mb" },
    proxyClientMaxBodySize: "4.5mb",
  },
};

export default nextConfig;
```

`apps/ovalle-obras/tsconfig.json`:
```json
{
  "extends": "@pyxis/typescript-config/nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

`apps/ovalle-obras/eslint.config.mjs`:
```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Jest carga estos archivos como CommonJS.
  {
    files: ["jest.config.js", "jest.setup.js", "jest.db.config.js", "supabase/tests/env.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "lib/supabase/database.types.ts", "playwright-report/**", "test-results/**"]),
]);

export default eslintConfig;
```

`apps/ovalle-obras/postcss.config.mjs`:
```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

`apps/ovalle-obras/jest.config.js`:
```js
const nextJest = require("next/jest.js");

const createJestConfig = (nextJest.default || nextJest)({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // BD y e2e tienen su propio runner.
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/supabase/", "<rootDir>/e2e/"],
};

module.exports = createJestConfig(config);
```

`apps/ovalle-obras/jest.setup.js`:
```js
require("@testing-library/jest-dom");
```

- [ ] **Step 2: Layout, estilos y página temporal**

`apps/ovalle-obras/app/globals.css`:
```css
@import "tailwindcss";

@theme {
  --color-obra-bg: #f6f5f2;
  --color-obra-fg: #1d1d1b;
  --color-obra-accent: #d9622b;
  --color-obra-ok: #2f8f46;
  --color-obra-warn: #c0392b;
  --color-obra-line: #e2e0da;
}

body {
  background: var(--color-obra-bg);
  color: var(--color-obra-fg);
}
```

`apps/ovalle-obras/app/layout.tsx`:
```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ovalle Obras",
  description: "Avance de obra en terreno — Constructora Ovalle",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#d9622b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
```

`apps/ovalle-obras/app/page.tsx` (temporal; Task 4 lo reemplaza):
```tsx
export default function Inicio() {
  return <main className="p-8">Ovalle Obras</main>;
}
```

- [ ] **Step 3: Escribir el test de formato (falla)**

`apps/ovalle-obras/lib/formato.test.ts`:
```ts
/** @jest-environment node */
import { formatoCLP, formatoPorcentaje, formatoFecha, formatoCantidad, slug } from "./formato";

describe("formato", () => {
  it("formatea pesos chilenos sin decimales", () => {
    expect(formatoCLP(4830000)).toBe("$4.830.000");
    expect(formatoCLP(1150.6)).toBe("$1.151");
  });

  it("formatea fracciones como porcentaje con coma y un decimal", () => {
    expect(formatoPorcentaje(0.453)).toBe("45,3%");
    expect(formatoPorcentaje(1.2)).toBe("120,0%");
    expect(formatoPorcentaje(0)).toBe("0,0%");
  });

  it("formatea fechas ISO como dd-mm-aaaa y vacío como guion", () => {
    expect(formatoFecha("2026-11-03")).toBe("03-11-2026");
    expect(formatoFecha(null)).toBe("—");
  });

  it("formatea cantidades con separador de miles chileno", () => {
    expect(formatoCantidad(4200.5)).toBe("4.200,5");
    expect(formatoCantidad(12)).toBe("12");
  });

  it("genera slugs ASCII para nombres de archivo", () => {
    expect(slug("Edificio Ñuñoa — Etapa 2")).toBe("edificio-nunoa-etapa-2");
  });
});
```

- [ ] **Step 4: Instalar y correr el test para verlo fallar**

Run (desde la raíz del repo): `npm install`
Run: `npm test -w @pyxis/ovalle-obras -- lib/formato.test.ts`
Expected: FAIL — `Cannot find module './formato'`

- [ ] **Step 5: Implementar `lib/formato.ts`**

```ts
const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const cantidad = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 });

export function formatoCLP(n: number): string {
  return clp.format(Math.round(n));
}

/** Recibe una fracción (0.45) y devuelve "45,0%". */
export function formatoPorcentaje(fraccion: number): string {
  return `${(fraccion * 100).toFixed(1).replace(".", ",")}%`;
}

/** "2026-11-03" → "03-11-2026". */
export function formatoFecha(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${a}`;
}

export function formatoCantidad(n: number): string {
  return cantidad.format(n);
}

export function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- [ ] **Step 6: Verificar tests, lint y build**

Run: `npm test -w @pyxis/ovalle-obras`
Expected: PASS (5 tests)
Run: `npm run lint -w @pyxis/ovalle-obras` → sin errores.
Run: `npm run build -w @pyxis/ovalle-obras` → build OK.
Si `formatoCLP` devuelve un espacio duro u otro símbolo según la versión de ICU, ajustar la implementación (no el test) para producir exactamente `$4.830.000`.

- [ ] **Step 7: Commit**

```bash
git add apps/ovalle-obras package-lock.json
git commit -m "feat(ovalle-obras): scaffold Next.js app with formatting helpers"
```

---

### Task 2: Supabase local y esquema de datos

**Files:**
- Create: `apps/ovalle-obras/supabase/config.toml` (vía `supabase init`, luego editar), `supabase/templates/codigo.html`, `supabase/migrations/20261006000001_esquema.sql`, `scripts/env-local.mjs`, `lib/supabase/database.types.ts` (generado)

**Interfaces:**
- Produces: tablas `perfiles`, `obras`, `importaciones`, `partidas`, `reportes`; enums `rol_usuario` (`admin`|`terreno`), `estado_obra` (`activa`|`cerrada`); vista `partida_ejecutado(partida_id, obra_id, ejecutado)`; tipo TS `Database` en `lib/supabase/database.types.ts`; archivo `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 1: Instalar la CLI de Supabase e inicializar**

Run (raíz): `npm install -D supabase -w @pyxis/ovalle-obras`
Run: `npx -w @pyxis/ovalle-obras supabase --version`
Si falla porque npm no ejecutó el script de instalación (npm 11 avisa `allow-scripts`): `npm approve-scripts supabase` y luego `npm rebuild supabase`, y repetir.
Run (en `apps/ovalle-obras`): `npx supabase init` (responder "no" a las preguntas de VS Code/IntelliJ).
Expected: crea `supabase/config.toml` y `supabase/.gitignore`.

- [ ] **Step 2: Editar `supabase/config.toml`**

Dejar estos valores (buscar cada clave y reemplazar; agregar las secciones que no existan):
```toml
[auth]
site_url = "http://127.0.0.1:3001"
additional_redirect_urls = ["http://localhost:3001"]
enable_signup = false

[auth.rate_limit]
email_sent = 100

[auth.email]
enable_signup = false
otp_length = 6
otp_expiry = 3600
max_frequency = "1s"

[auth.email.template.magic_link]
subject = "Tu código de ingreso a Ovalle Obras"
content_path = "./supabase/templates/codigo.html"
```

`apps/ovalle-obras/supabase/templates/codigo.html`:
```html
<h2>Ovalle Obras</h2>
<p>Tu código de ingreso es:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
<p>Vence en 1 hora. Si no lo pediste, ignora este correo.</p>
```

- [ ] **Step 3: Escribir la migración del esquema**

`apps/ovalle-obras/supabase/migrations/20261006000001_esquema.sql`:
```sql
create type public.rol_usuario as enum ('admin', 'terreno');
create type public.estado_obra as enum ('activa', 'cerrada');

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  email text not null,
  rol public.rol_usuario not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table public.obras (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  estado public.estado_obra not null default 'activa',
  creado_en timestamptz not null default now(),
  creado_por uuid references public.perfiles (id)
);

create table public.importaciones (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  archivo_path text not null,
  filas integer not null,
  creado_en timestamptz not null default now(),
  creado_por uuid references public.perfiles (id)
);

create table public.partidas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  parent_id uuid references public.partidas (id) on delete cascade,
  codigo text not null,
  descripcion text not null,
  unidad text,
  cantidad numeric(14, 4) check (cantidad is null or cantidad > 0),
  precio_unitario numeric(14, 2) check (precio_unitario is null or precio_unitario >= 0),
  fecha_inicio date,
  fecha_fin date,
  orden integer not null,
  unique (obra_id, codigo),
  check (fecha_inicio is null or fecha_fin is null or fecha_fin >= fecha_inicio),
  check ((cantidad is null) = (unidad is null))
);
create index partidas_obra_idx on public.partidas (obra_id, orden);

create table public.reportes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  partida_id uuid not null references public.partidas (id) on delete restrict,
  autor uuid not null default auth.uid() references public.perfiles (id),
  cantidad numeric(14, 4) not null check (cantidad > 0),
  comentario text check (comentario is null or length(comentario) <= 1000),
  foto_path text,
  creado_en timestamptz not null default now(),
  anulado boolean not null default false,
  anulado_por uuid references public.perfiles (id),
  anulado_en timestamptz
);
create index reportes_obra_idx on public.reportes (obra_id, creado_en desc);
create index reportes_partida_idx on public.reportes (partida_id);

-- Un reporte nuevo: obra tomada de la partida (no del cliente), hora del servidor,
-- nunca nace anulado, y solo sobre hojas (partidas con cantidad).
create function public.preparar_reporte() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_obra uuid;
  v_cantidad numeric;
begin
  select p.obra_id, p.cantidad into v_obra, v_cantidad
  from public.partidas p where p.id = new.partida_id;
  if v_obra is null then
    raise exception 'partida inexistente' using errcode = 'P0001';
  end if;
  if v_cantidad is null then
    raise exception 'solo se puede reportar avance en partidas con cantidad' using errcode = 'P0001';
  end if;
  new.obra_id := v_obra;
  new.creado_en := now();
  new.anulado := false;
  new.anulado_por := null;
  new.anulado_en := null;
  return new;
end $$;

create trigger preparar_reporte before insert on public.reportes
for each row execute function public.preparar_reporte();

-- Cada usuario creado en Auth obtiene su perfil con nombre y rol de la metadata
-- que pone el admin al crearlo (no hay registro abierto).
create function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), new.email),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'rol')::public.rol_usuario, 'terreno')
  );
  return new;
end $$;

create trigger al_crear_usuario after insert on auth.users
for each row execute function public.crear_perfil();

create view public.partida_ejecutado with (security_invoker = true) as
select
  p.id as partida_id,
  p.obra_id,
  coalesce(sum(r.cantidad) filter (where not r.anulado), 0)::numeric as ejecutado
from public.partidas p
left join public.reportes r on r.partida_id = p.id
group by p.id, p.obra_id;

alter publication supabase_realtime add table public.reportes;
```

- [ ] **Step 4: Script que escribe `.env.local` desde Supabase local**

`apps/ovalle-obras/scripts/env-local.mjs`:
```js
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
```

- [ ] **Step 5: Levantar Supabase, aplicar y generar tipos**

Requiere Docker Desktop corriendo.
Run: `npm run db:start -w @pyxis/ovalle-obras` → imprime URLs y claves.
Run: `npm run db:reset -w @pyxis/ovalle-obras`
Expected: `Applying migration 20261006000001_esquema.sql...` sin errores.
Run: `npm run env:local -w @pyxis/ovalle-obras` → crea `apps/ovalle-obras/.env.local` (ignorado por git).
Run: `npm run db:types -w @pyxis/ovalle-obras`
Expected: `lib/supabase/database.types.ts` contiene `partidas`, `reportes`, `partida_ejecutado`, `rol_usuario`.
Si `status -o json` usa otros nombres de clave, ajustar el script a los nombres que imprime.

- [ ] **Step 6: Commit**

```bash
git add apps/ovalle-obras package-lock.json
git commit -m "feat(ovalle-obras): supabase local setup and data schema"
```

---

### Task 3: Seguridad (RLS + Storage) y tests de base de datos

**Files:**
- Create: `supabase/migrations/20261006000002_seguridad.sql`, `jest.db.config.js`, `supabase/tests/env.js`, `supabase/tests/helpers.ts`, `supabase/tests/rls.test.ts`

**Interfaces:**
- Consumes: esquema de Task 2.
- Produces: función SQL `public.rol_actual() returns rol_usuario` (null si no hay perfil activo); buckets `fotos` (ruta `<obra_id>/<autor_id>/<reporte_id>.jpg`) e `importaciones`; helpers de test `crearUsuario(rol)`, `crearObraConPartidas(estado?)`, `adminServicio`.

- [ ] **Step 1: Configurar el runner de BD**

`apps/ovalle-obras/jest.db.config.js`:
```js
const nextJest = require("next/jest.js");

const createJestConfig = (nextJest.default || nextJest)({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/supabase/tests/env.js"],
  testMatch: ["<rootDir>/supabase/tests/**/*.test.ts"],
  testTimeout: 30000,
};

module.exports = createJestConfig(config);
```

`apps/ovalle-obras/supabase/tests/env.js`:
```js
// next/jest no carga .env.local en modo test; estos tests lo necesitan.
process.loadEnvFile(require("node:path").join(__dirname, "../../.env.local"));
```

- [ ] **Step 2: Helpers de test**

Run (raíz): `npm install @supabase/supabase-js -w @pyxis/ovalle-obras`

`apps/ovalle-obras/supabase/tests/helpers.ts`:
```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const opciones = { auth: { persistSession: false, autoRefreshToken: false } };

export type Cliente = SupabaseClient<Database>;

/** Cliente con service role: salta RLS. Solo para preparar datos. */
export const adminServicio: Cliente = createClient<Database>(url, servicio, opciones);

export async function crearUsuario(rol: "admin" | "terreno", nombre = rol) {
  const email = `${rol}-${crypto.randomUUID()}@test.local`;
  const password = "clave-de-prueba-123";
  const { data, error } = await adminServicio.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, rol },
  });
  if (error) throw error;
  const cliente = createClient<Database>(url, anon, opciones);
  const { error: errorIngreso } = await cliente.auth.signInWithPassword({ email, password });
  if (errorIngreso) throw errorIngreso;
  return { id: data.user.id, email, cliente };
}

export async function crearObraConPartidas(estado: "activa" | "cerrada" = "activa") {
  const { data: obra, error } = await adminServicio
    .from("obras")
    .insert({ nombre: `Obra test ${crypto.randomUUID()}`, estado })
    .select("id")
    .single();
  if (error) throw error;
  const { data: capitulo, error: e1 } = await adminServicio
    .from("partidas")
    .insert({ obra_id: obra.id, codigo: "1", descripcion: "Obra gruesa", orden: 0 })
    .select("id")
    .single();
  if (e1) throw e1;
  const { data: hoja, error: e2 } = await adminServicio
    .from("partidas")
    .insert({
      obra_id: obra.id,
      parent_id: capitulo.id,
      codigo: "1.1",
      descripcion: "Enfierradura losa P3",
      unidad: "kg",
      cantidad: 100,
      precio_unitario: 1000,
      fecha_inicio: "2026-11-01",
      fecha_fin: "2026-11-30",
      orden: 1,
    })
    .select("id")
    .single();
  if (e2) throw e2;
  return { obraId: obra.id, capituloId: capitulo.id, hojaId: hoja.id };
}
```

- [ ] **Step 3: Escribir los tests de RLS (fallan: aún no hay políticas)**

`apps/ovalle-obras/supabase/tests/rls.test.ts`:
```ts
import { adminServicio, crearObraConPartidas, crearUsuario } from "./helpers";

describe("seguridad de datos", () => {
  it("terreno reporta en una hoja de obra activa; obra y hora las pone el servidor", async () => {
    const terreno = await crearUsuario("terreno");
    const { obraId, hojaId } = await crearObraConPartidas();
    const id = crypto.randomUUID();
    const { error } = await terreno.cliente.from("reportes").insert({
      id,
      obra_id: crypto.randomUUID(), // intento de falsear la obra: el trigger lo corrige
      partida_id: hojaId,
      autor: terreno.id,
      cantidad: 10,
      creado_en: "2000-01-01T00:00:00Z",
    });
    expect(error).toBeNull();
    const { data } = await adminServicio.from("reportes").select("*").eq("id", id).single();
    expect(data!.obra_id).toBe(obraId);
    expect(new Date(data!.creado_en).getFullYear()).toBeGreaterThan(2025);
  });

  it("un reporte repetido con el mismo id no duplica avance (23505)", async () => {
    const terreno = await crearUsuario("terreno");
    const { obraId, hojaId } = await crearObraConPartidas();
    const fila = { id: crypto.randomUUID(), obra_id: obraId, partida_id: hojaId, autor: terreno.id, cantidad: 5 };
    expect((await terreno.cliente.from("reportes").insert(fila)).error).toBeNull();
    const repetido = await terreno.cliente.from("reportes").insert(fila);
    expect(repetido.error?.code).toBe("23505");
    const { data } = await adminServicio.from("partida_ejecutado").select("ejecutado").eq("partida_id", hojaId).single();
    expect(Number(data!.ejecutado)).toBe(5);
  });

  it("terreno no puede reportar a nombre de otro usuario", async () => {
    const terreno = await crearUsuario("terreno");
    const otro = await crearUsuario("terreno");
    const { obraId, hojaId } = await crearObraConPartidas();
    const { error } = await terreno.cliente
      .from("reportes")
      .insert({ obra_id: obraId, partida_id: hojaId, autor: otro.id, cantidad: 1 });
    expect(error).not.toBeNull();
  });

  it("no se puede reportar sobre un capítulo ni con cantidad 0", async () => {
    const terreno = await crearUsuario("terreno");
    const { obraId, capituloId, hojaId } = await crearObraConPartidas();
    const enCapitulo = await terreno.cliente
      .from("reportes")
      .insert({ obra_id: obraId, partida_id: capituloId, autor: terreno.id, cantidad: 1 });
    expect(enCapitulo.error).not.toBeNull();
    const cero = await terreno.cliente
      .from("reportes")
      .insert({ obra_id: obraId, partida_id: hojaId, autor: terreno.id, cantidad: 0 });
    expect(cero.error).not.toBeNull();
  });

  it("terreno no ve ni reporta en obras cerradas", async () => {
    const terreno = await crearUsuario("terreno");
    const { obraId, hojaId } = await crearObraConPartidas("cerrada");
    const { data: obras } = await terreno.cliente.from("obras").select("id").eq("id", obraId);
    expect(obras).toEqual([]);
    const { error } = await terreno.cliente
      .from("reportes")
      .insert({ obra_id: obraId, partida_id: hojaId, autor: terreno.id, cantidad: 1 });
    expect(error).not.toBeNull();
  });

  it("terreno no puede anular; admin sí", async () => {
    const terreno = await crearUsuario("terreno");
    const admin = await crearUsuario("admin");
    const { obraId, hojaId } = await crearObraConPartidas();
    const id = crypto.randomUUID();
    await terreno.cliente.from("reportes").insert({ id, obra_id: obraId, partida_id: hojaId, autor: terreno.id, cantidad: 3 });

    await terreno.cliente.from("reportes").update({ anulado: true }).eq("id", id);
    let { data } = await adminServicio.from("reportes").select("anulado").eq("id", id).single();
    expect(data!.anulado).toBe(false);

    const { error } = await admin.cliente
      .from("reportes")
      .update({ anulado: true, anulado_por: admin.id, anulado_en: new Date().toISOString() })
      .eq("id", id);
    expect(error).toBeNull();
    ({ data } = await adminServicio.from("reportes").select("anulado").eq("id", id).single());
    expect(data!.anulado).toBe(true);
  });

  it("terreno no ve importaciones ni otros perfiles", async () => {
    const terreno = await crearUsuario("terreno");
    await crearUsuario("admin");
    const { data: imps } = await terreno.cliente.from("importaciones").select("id");
    expect(imps).toEqual([]);
    const { data: perfiles } = await terreno.cliente.from("perfiles").select("id");
    expect(perfiles).toEqual([{ id: terreno.id }]);
  });

  it("un usuario desactivado no ve nada", async () => {
    const terreno = await crearUsuario("terreno");
    await crearObraConPartidas();
    await adminServicio.from("perfiles").update({ activo: false }).eq("id", terreno.id);
    const { data } = await terreno.cliente.from("obras").select("id");
    expect(data).toEqual([]);
  });

  it("terreno sube fotos solo a su propia carpeta", async () => {
    const terreno = await crearUsuario("terreno");
    const otro = await crearUsuario("terreno");
    const { obraId } = await crearObraConPartidas();
    const foto = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" });
    const propia = await terreno.cliente.storage.from("fotos").upload(`${obraId}/${terreno.id}/${crypto.randomUUID()}.jpg`, foto);
    expect(propia.error).toBeNull();
    const ajena = await terreno.cliente.storage.from("fotos").upload(`${obraId}/${otro.id}/${crypto.randomUUID()}.jpg`, foto);
    expect(ajena.error).not.toBeNull();
  });
});
```

- [ ] **Step 4: Correr para verlos fallar**

Run: `npm run test:db -w @pyxis/ovalle-obras`
Expected: FAIL — p. ej. "terreno no ve ni reporta en obras cerradas" ve la obra (RLS desactivado) y el bucket `fotos` no existe.

- [ ] **Step 5: Escribir la migración de seguridad**

`apps/ovalle-obras/supabase/migrations/20261006000002_seguridad.sql`:
```sql
-- Rol del usuario actual; null si no tiene perfil o está desactivado.
create function public.rol_actual() returns public.rol_usuario
language sql stable security definer set search_path = '' as $$
  select p.rol from public.perfiles p where p.id = auth.uid() and p.activo
$$;

create function public.obra_activa(p_obra uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.obras o where o.id = p_obra and o.estado = 'activa')
$$;

alter table public.perfiles enable row level security;
alter table public.obras enable row level security;
alter table public.importaciones enable row level security;
alter table public.partidas enable row level security;
alter table public.reportes enable row level security;

-- perfiles
create policy perfiles_admin on public.perfiles for all to authenticated
  using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');
create policy perfiles_propio on public.perfiles for select to authenticated
  using (id = auth.uid() and public.rol_actual() is not null);

-- obras
create policy obras_admin on public.obras for all to authenticated
  using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');
create policy obras_terreno on public.obras for select to authenticated
  using (public.rol_actual() = 'terreno' and estado = 'activa');

-- importaciones
create policy importaciones_admin on public.importaciones for all to authenticated
  using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');

-- partidas
create policy partidas_admin on public.partidas for all to authenticated
  using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');
create policy partidas_terreno on public.partidas for select to authenticated
  using (public.rol_actual() = 'terreno' and public.obra_activa(obra_id));

-- reportes
create policy reportes_admin_leer on public.reportes for select to authenticated
  using (public.rol_actual() = 'admin');
create policy reportes_admin_anular on public.reportes for update to authenticated
  using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');
create policy reportes_terreno_leer on public.reportes for select to authenticated
  using (public.rol_actual() = 'terreno' and public.obra_activa(obra_id));
create policy reportes_insertar on public.reportes for insert to authenticated
  with check (
    public.rol_actual() is not null
    and autor = auth.uid()
    and public.obra_activa(obra_id)
  );

-- Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('fotos', 'fotos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('importaciones', 'importaciones', false, 4718592, null);

-- fotos: <obra_id>/<autor_id>/<reporte_id>.jpg
create policy fotos_subir on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and public.rol_actual() is not null
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.obra_activa(((storage.foldername(name))[1])::uuid)
  );
create policy fotos_leer on storage.objects for select to authenticated
  using (
    bucket_id = 'fotos'
    and (
      public.rol_actual() = 'admin'
      or (public.rol_actual() = 'terreno' and public.obra_activa(((storage.foldername(name))[1])::uuid))
    )
  );

create policy importaciones_archivos on storage.objects for all to authenticated
  using (bucket_id = 'importaciones' and public.rol_actual() = 'admin')
  with check (bucket_id = 'importaciones' and public.rol_actual() = 'admin');
```

- [ ] **Step 6: Aplicar y verificar**

Run: `npm run db:reset -w @pyxis/ovalle-obras`
Run: `npm run db:types -w @pyxis/ovalle-obras`
Run: `npm run test:db -w @pyxis/ovalle-obras`
Expected: PASS (9 tests)

- [ ] **Step 7: Commit**

```bash
git add apps/ovalle-obras package-lock.json
git commit -m "feat(ovalle-obras): row-level security, storage buckets and db tests"
```

---

### Task 4: Clientes Supabase, sesión e ingreso con código

**Files:**
- Create: `lib/env.ts`, `lib/supabase/servidor.ts`, `lib/supabase/navegador.ts`, `lib/supabase/admin.ts`, `lib/auth/rutas.ts`, `lib/auth/sesion.ts`, `proxy.ts`, `app/ingresar/page.tsx`, `components/auth/FormularioIngreso.tsx`, `app/sin-acceso/page.tsx`, `app/salir/route.ts`, `scripts/crear-admin.mjs`
- Modify: `app/page.tsx`
- Test: `lib/auth/rutas.test.ts`, `components/auth/FormularioIngreso.test.tsx`

**Interfaces:**
- Consumes: `Database` (Task 2).
- Produces:
  - `crearClienteServidor(): Promise<SupabaseClient<Database>>` (`lib/supabase/servidor.ts`)
  - `crearClienteNavegador(): SupabaseClient<Database>` (`lib/supabase/navegador.ts`)
  - `crearClienteAdmin(): SupabaseClient<Database>` (`lib/supabase/admin.ts`, solo servidor)
  - `type Rol = "admin" | "terreno"`, `rutaInicio(rol: Rol | null): string`, `destinoSeguro(siguiente: string | null): string`, `esRutaPublica(ruta: string): boolean` (`lib/auth/rutas.ts`)
  - `type Perfil = { id: string; nombre: string; email: string; rol: Rol }`, `obtenerPerfil(): Promise<Perfil | null>`, `exigirRol(...roles: Rol[]): Promise<Perfil>` (`lib/auth/sesion.ts`)

- [ ] **Step 1: Instalar dependencias**

Run (raíz): `npm install @supabase/ssr server-only -w @pyxis/ovalle-obras`

- [ ] **Step 2: Test de rutas (falla)**

`apps/ovalle-obras/lib/auth/rutas.test.ts`:
```ts
/** @jest-environment node */
import { destinoSeguro, esRutaPublica, rutaInicio } from "./rutas";

describe("rutas de auth", () => {
  it("lleva a cada rol a su inicio", () => {
    expect(rutaInicio("admin")).toBe("/admin");
    expect(rutaInicio("terreno")).toBe("/terreno");
    expect(rutaInicio(null)).toBe("/sin-acceso");
  });

  it("solo acepta destinos internos tras ingresar", () => {
    expect(destinoSeguro("/terreno/obras/1")).toBe("/terreno/obras/1");
    expect(destinoSeguro("//malo.com")).toBe("/");
    expect(destinoSeguro("https://malo.com")).toBe("/");
    expect(destinoSeguro(null)).toBe("/");
  });

  it("reconoce las rutas que no requieren sesión", () => {
    expect(esRutaPublica("/ingresar")).toBe(true);
    expect(esRutaPublica("/manifest.webmanifest")).toBe(true);
    expect(esRutaPublica("/admin")).toBe(false);
  });
});
```

Run: `npm test -w @pyxis/ovalle-obras -- lib/auth/rutas.test.ts` → FAIL (módulo no existe).

- [ ] **Step 3: Implementar rutas, env y clientes**

`apps/ovalle-obras/lib/auth/rutas.ts`:
```ts
export type Rol = "admin" | "terreno";

const PUBLICAS = ["/ingresar", "/manifest.webmanifest", "/icon.svg"];

export function rutaInicio(rol: Rol | null): string {
  if (rol === "admin") return "/admin";
  if (rol === "terreno") return "/terreno";
  return "/sin-acceso";
}

export function destinoSeguro(siguiente: string | null): string {
  if (!siguiente || !siguiente.startsWith("/") || siguiente.startsWith("//")) return "/";
  return siguiente;
}

export function esRutaPublica(ruta: string): boolean {
  return PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`));
}
```

`apps/ovalle-obras/lib/env.ts`:
```ts
function requerida(nombre: string, valor: string | undefined): string {
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

// Accesos literales para que Next pueda incrustar las NEXT_PUBLIC_* en el navegador.
export const supabaseUrl = () =>
  requerida("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabaseAnonKey = () =>
  requerida("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const supabaseServiceRoleKey = () =>
  requerida("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
```

`apps/ovalle-obras/lib/supabase/servidor.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import type { Database } from "./database.types";

export async function crearClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: el proxy ya refresca la sesión.
        }
      },
    },
  });
}
```

`apps/ovalle-obras/lib/supabase/navegador.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import type { Database } from "./database.types";

export function crearClienteNavegador() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
}
```

`apps/ovalle-obras/lib/supabase/admin.ts`:
```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";
import type { Database } from "./database.types";

/** Salta RLS. Usar solo después de verificar que quien llama es admin. */
export function crearClienteAdmin() {
  return createClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

`apps/ovalle-obras/lib/auth/sesion.ts`:
```ts
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { rutaInicio, type Rol } from "./rutas";

export type Perfil = { id: string; nombre: string; email: string; rol: Rol };

/** Perfil activo del usuario con sesión, o null. */
export async function obtenerPerfil(): Promise<Perfil | null> {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre, email, rol, activo")
    .eq("id", user.id)
    .maybeSingle();
  if (!data || !data.activo) return null;
  return { id: data.id, nombre: data.nombre, email: data.email, rol: data.rol };
}

export async function exigirRol(...roles: Rol[]): Promise<Perfil> {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar");
  const perfil = await obtenerPerfil();
  if (!perfil) redirect("/sin-acceso");
  if (!roles.includes(perfil.rol)) redirect(rutaInicio(perfil.rol));
  return perfil;
}
```

Run: `npm test -w @pyxis/ovalle-obras -- lib/auth/rutas.test.ts` → PASS.

- [ ] **Step 4: Proxy que refresca la sesión y exige ingreso**

`apps/ovalle-obras/proxy.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { esRutaPublica } from "@/lib/auth/rutas";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const ruta = request.nextUrl.pathname;
  if (!user && !esRutaPublica(ruta)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/ingresar";
    destino.search = ruta === "/" ? "" : `?siguiente=${encodeURIComponent(ruta + request.nextUrl.search)}`;
    return NextResponse.redirect(destino);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
```

- [ ] **Step 5: Test del formulario de ingreso (falla)**

`apps/ovalle-obras/components/auth/FormularioIngreso.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormularioIngreso } from "./FormularioIngreso";

const signInWithOtp = jest.fn();
const verifyOtp = jest.fn();
const replace = jest.fn();

jest.mock("@/lib/supabase/navegador", () => ({
  crearClienteNavegador: () => ({ auth: { signInWithOtp, verifyOtp } }),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: jest.fn() }),
}));

describe("FormularioIngreso", () => {
  beforeEach(() => jest.clearAllMocks());

  it("pide el código sin crear usuarios y luego lo verifica", async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    verifyOtp.mockResolvedValue({ error: null });
    render(<FormularioIngreso siguiente="/terreno" />);

    await userEvent.type(screen.getByLabelText("Email"), "juan@ovalle.cl");
    await userEvent.click(screen.getByRole("button", { name: "Enviarme un código" }));
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "juan@ovalle.cl",
      options: { shouldCreateUser: false },
    });

    await userEvent.type(await screen.findByLabelText("Código"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(verifyOtp).toHaveBeenCalledWith({ email: "juan@ovalle.cl", token: "123456", type: "email" });
    expect(replace).toHaveBeenCalledWith("/terreno");
  });

  it("muestra un error claro si el código no sirve", async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    verifyOtp.mockResolvedValue({ error: { message: "Token has expired or is invalid" } });
    render(<FormularioIngreso siguiente="/" />);
    await userEvent.type(screen.getByLabelText("Email"), "juan@ovalle.cl");
    await userEvent.click(screen.getByRole("button", { name: "Enviarme un código" }));
    await userEvent.type(await screen.findByLabelText("Código"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El código no es válido o venció");
    expect(replace).not.toHaveBeenCalled();
  });
});
```

Run: `npm test -w @pyxis/ovalle-obras -- components/auth` → FAIL (módulo no existe).

- [ ] **Step 6: Implementar ingreso, salida e inicio**

`apps/ovalle-obras/components/auth/FormularioIngreso.tsx`:
```tsx
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
          <button disabled={cargando} className="w-full rounded-lg bg-obra-accent py-3 font-semibold text-white disabled:opacity-60">
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
          <button disabled={cargando} className="w-full rounded-lg bg-obra-accent py-3 font-semibold text-white disabled:opacity-60">
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
```

`apps/ovalle-obras/app/ingresar/page.tsx`:
```tsx
import { FormularioIngreso } from "@/components/auth/FormularioIngreso";
import { destinoSeguro } from "@/lib/auth/rutas";

export default async function Ingresar({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string }>;
}) {
  const { siguiente } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold">Ovalle Obras</h1>
      <FormularioIngreso siguiente={destinoSeguro(siguiente ?? null)} />
    </main>
  );
}
```

`apps/ovalle-obras/app/sin-acceso/page.tsx`:
```tsx
export default function SinAcceso() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold">Tu cuenta no tiene acceso</h1>
      <p>Pide al administrador de la obra que active tu usuario.</p>
      <form action="/salir" method="post">
        <button className="underline">Salir</button>
      </form>
    </main>
  );
}
```

`apps/ovalle-obras/app/salir/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export async function POST(request: NextRequest) {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/ingresar", request.url), { status: 303 });
}
```

`apps/ovalle-obras/app/page.tsx` (reemplaza el temporal):
```tsx
import { redirect } from "next/navigation";
import { obtenerPerfil } from "@/lib/auth/sesion";
import { rutaInicio } from "@/lib/auth/rutas";

export default async function Inicio() {
  const perfil = await obtenerPerfil();
  redirect(rutaInicio(perfil?.rol ?? null));
}
```

- [ ] **Step 7: Script para crear el primer admin**

`apps/ovalle-obras/scripts/crear-admin.mjs`:
```js
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
const { error } = await supabase.auth.admin.createUser({
  email: email.toLowerCase(),
  email_confirm: true,
  user_metadata: { nombre, rol: "admin" },
});
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Admin ${email} creado. Ingresa con un código a ese email.`);
```

- [ ] **Step 8: Verificar**

Run: `npm test -w @pyxis/ovalle-obras` → PASS.
Run: `npm run lint -w @pyxis/ovalle-obras` y `npm run build -w @pyxis/ovalle-obras` → OK.
Manual: `npm run crear-admin -w @pyxis/ovalle-obras -- yo@test.local "Yo"`, `npm run dev -w @pyxis/ovalle-obras`, abrir http://localhost:3001 → redirige a `/ingresar`; pedir código; leer el correo en Mailpit (http://127.0.0.1:54324); ingresar → termina en `/admin` (404 por ahora, la página llega en Task 11).

- [ ] **Step 9: Commit**

```bash
git add apps/ovalle-obras package-lock.json
git commit -m "feat(ovalle-obras): supabase clients, session proxy and email-code login"
```

---

### Task 5: Números y fechas chilenos

**Files:**
- Create: `lib/numeros.ts`, `lib/fechas.ts`
- Test: `lib/numeros.test.ts`, `lib/fechas.test.ts`

**Interfaces:**
- Produces:
  - `type Resultado<T> = { ok: true; valor: T } | { ok: false }` (`lib/numeros.ts`)
  - `parseNumeroCL(v: unknown): Resultado<number | null>`
  - `parseFecha(v: unknown): Resultado<string | null>` → ISO `YYYY-MM-DD`
  - `hoyEnChile(ahora?: Date): string` → ISO `YYYY-MM-DD`
  - `diasEntre(desde: string, hasta: string): number`

- [ ] **Step 1: Tests (fallan)**

`apps/ovalle-obras/lib/numeros.test.ts`:
```ts
/** @jest-environment node */
import { parseNumeroCL } from "./numeros";

describe("parseNumeroCL", () => {
  it.each([
    [4200, 4200],
    ["4.200", 4200],
    ["1.150,5", 1150.5],
    ["$ 12.000", 12000],
    ["12,5", 12.5],
    ["0,75", 0.75],
    ["  300 ", 300],
    ["1234.5", 1234.5],
  ])("lee %p como %p", (entrada, esperado) => {
    expect(parseNumeroCL(entrada)).toEqual({ ok: true, valor: esperado });
  });

  it("trata vacío como null", () => {
    expect(parseNumeroCL(null)).toEqual({ ok: true, valor: null });
    expect(parseNumeroCL("  ")).toEqual({ ok: true, valor: null });
  });

  it("rechaza texto que no es número", () => {
    expect(parseNumeroCL("doce")).toEqual({ ok: false });
    expect(parseNumeroCL("1.2.3,4,5")).toEqual({ ok: false });
  });
});
```

`apps/ovalle-obras/lib/fechas.test.ts`:
```ts
/** @jest-environment node */
import { diasEntre, hoyEnChile, parseFecha } from "./fechas";

describe("parseFecha", () => {
  it("usa la fecha UTC de los Date de Excel (no se corre un día)", () => {
    expect(parseFecha(new Date(Date.UTC(2026, 10, 3)))).toEqual({ ok: true, valor: "2026-11-03" });
  });

  it("acepta texto dd-mm-aaaa y dd/mm/aaaa", () => {
    expect(parseFecha("03-11-2026")).toEqual({ ok: true, valor: "2026-11-03" });
    expect(parseFecha("3/11/2026")).toEqual({ ok: true, valor: "2026-11-03" });
  });

  it("acepta número serial de Excel", () => {
    expect(parseFecha(46329)).toEqual({ ok: true, valor: "2026-11-03" });
  });

  it("vacío es null; fechas imposibles son error", () => {
    expect(parseFecha(null)).toEqual({ ok: true, valor: null });
    expect(parseFecha("31-02-2026")).toEqual({ ok: false });
    expect(parseFecha("mañana")).toEqual({ ok: false });
  });
});

describe("hoyEnChile", () => {
  it("usa la zona horaria de Santiago", () => {
    // 2026-11-04 02:00 UTC = 2026-11-03 23:00 en Chile (UTC-3 en verano)
    expect(hoyEnChile(new Date("2026-11-04T02:00:00Z"))).toBe("2026-11-03");
  });
});

describe("diasEntre", () => {
  it("cuenta días calendario", () => {
    expect(diasEntre("2026-11-01", "2026-11-30")).toBe(29);
    expect(diasEntre("2026-11-01", "2026-11-01")).toBe(0);
  });
});
```

Run: `npm test -w @pyxis/ovalle-obras -- lib/numeros lib/fechas` → FAIL.

- [ ] **Step 2: Implementar**

`apps/ovalle-obras/lib/numeros.ts`:
```ts
export type Resultado<T> = { ok: true; valor: T } | { ok: false };

const MILES_CON_PUNTO = /^-?\d{1,3}(\.\d{3})+$/;

/** Lee números escritos a la chilena ("4.200", "1.150,5", "$ 12.000"). */
export function parseNumeroCL(v: unknown): Resultado<number | null> {
  if (v === null || v === undefined) return { ok: true, valor: null };
  if (typeof v === "number") return Number.isFinite(v) ? { ok: true, valor: v } : { ok: false };
  if (typeof v !== "string") return { ok: false };
  let t = v.replace(/\$/g, "").replace(/\s/g, "");
  if (t === "") return { ok: true, valor: null };
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (MILES_CON_PUNTO.test(t)) {
    t = t.replace(/\./g, "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(t)) return { ok: false };
  return { ok: true, valor: Number(t) };
}
```

`apps/ovalle-obras/lib/fechas.ts`:
```ts
import type { Resultado } from "./numeros";

const DIA_MS = 86_400_000;
const EPOCA_EXCEL = Date.UTC(1899, 11, 30);

function iso(a: number, m: number, d: number): string | null {
  const fecha = new Date(Date.UTC(a, m - 1, d));
  if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) return null;
  return fecha.toISOString().slice(0, 10);
}

/** Fecha de una celda Excel → "YYYY-MM-DD". */
export function parseFecha(v: unknown): Resultado<string | null> {
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) {
    return { ok: true, valor: null };
  }
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? { ok: false } : { ok: true, valor: v.toISOString().slice(0, 10) };
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return { ok: true, valor: new Date(EPOCA_EXCEL + Math.round(v) * DIA_MS).toISOString().slice(0, 10) };
  }
  if (typeof v === "string") {
    const m = v.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (m) {
      const valor = iso(Number(m[3]), Number(m[2]), Number(m[1]));
      return valor ? { ok: true, valor } : { ok: false };
    }
  }
  return { ok: false };
}

export function hoyEnChile(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / DIA_MS);
}
```

- [ ] **Step 3: Verificar**

Run: `npm test -w @pyxis/ovalle-obras -- lib/numeros lib/fechas` → PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/ovalle-obras/lib
git commit -m "feat(ovalle-obras): Chilean number and date parsing"
```

---

### Task 6: Lectura de Excel y plantilla descargable

**Files:**
- Create: `lib/excel/columnas.ts`, `lib/excel/leer.ts`, `lib/excel/plantilla.ts`
- Test: `lib/excel/leer.test.ts`

**Interfaces:**
- Produces:
  - `COLUMNAS: readonly { clave: ClaveColumna; titulo: string }[]`, `type ClaveColumna = "codigo" | "descripcion" | "unidad" | "cantidad" | "precio_unitario" | "fecha_inicio" | "fecha_fin"`
  - `type FilaCruda = { fila: number; codigo: string; descripcion: unknown; unidad: unknown; cantidad: unknown; precio_unitario: unknown; fecha_inicio: unknown; fecha_fin: unknown }`
  - `leerFilas(archivo: ArrayBuffer): Promise<{ ok: true; filas: FilaCruda[] } | { ok: false; error: string }>`
  - `construirPlantilla(): Promise<Buffer>`

- [ ] **Step 1: Instalar exceljs**

Run (raíz): `npm install exceljs -w @pyxis/ovalle-obras`

- [ ] **Step 2: Tests (fallan)**

`apps/ovalle-obras/lib/excel/leer.test.ts`:
```ts
/** @jest-environment node */
import ExcelJS from "exceljs";
import { leerFilas } from "./leer";
import { construirPlantilla } from "./plantilla";

async function libro(filas: unknown[][], formatoCodigoTexto = false): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet("Presupuesto");
  filas.forEach((f) => hoja.addRow(f));
  if (formatoCodigoTexto) hoja.getColumn(1).numFmt = "@";
  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}

const ENCABEZADOS = ["Código", "Descripción", "Unidad", "Cantidad", "Precio unitario", "Fecha inicio", "Fecha fin"];

describe("leerFilas", () => {
  it("lee la plantilla oficial ida y vuelta", async () => {
    const r = await leerFilas((await construirPlantilla()) as unknown as ArrayBuffer);
    if (!r.ok) throw new Error(r.error);
    expect(r.filas[0]).toMatchObject({ fila: 2, codigo: "1", descripcion: "Obra gruesa" });
    expect(r.filas[1]).toMatchObject({ codigo: "1.1", unidad: "kg", cantidad: 4200 });
  });

  it("acepta encabezados en otro orden, mayúsculas y sin tildes", async () => {
    const r = await leerFilas(
      await libro([
        ["DESCRIPCION", "codigo", "unidad", "cantidad", "precio UNITARIO", "fecha inicio", "fecha fin"],
        ["Excavación", "2.1", "m3", 50, 9000, null, null],
      ]),
    );
    if (!r.ok) throw new Error(r.error);
    expect(r.filas).toEqual([
      expect.objectContaining({ codigo: "2.1", descripcion: "Excavación", cantidad: 50, precio_unitario: 9000 }),
    ]);
  });

  it("toma el código como texto visible, no como número (1.10 ≠ 1.1)", async () => {
    const r = await leerFilas(await libro([ENCABEZADOS, ["1.10", "Partida diez", "m2", 1, 1, null, null]], true));
    if (!r.ok) throw new Error(r.error);
    expect(r.filas[0].codigo).toBe("1.10");
  });

  it("resuelve fórmulas y texto enriquecido; salta filas vacías", async () => {
    const r = await leerFilas(
      await libro([
        ENCABEZADOS,
        ["3", { richText: [{ text: "Termi" }, { text: "naciones" }] }, null, null, null, null, null],
        [null, null, null, null, null, null, null],
        ["3.1", "Pintura", "m2", { formula: "10*2", result: 20 }, 3500, null, null],
      ]),
    );
    if (!r.ok) throw new Error(r.error);
    expect(r.filas.map((f) => f.fila)).toEqual([2, 4]);
    expect(r.filas[0].descripcion).toBe("Terminaciones");
    expect(r.filas[1].cantidad).toBe(20);
  });

  it("explica qué columnas faltan", async () => {
    const r = await leerFilas(await libro([["Código", "Descripción"], ["1", "x"]]));
    expect(r).toEqual({ ok: false, error: expect.stringContaining("Unidad") });
  });

  it("rechaza archivos que no son Excel", async () => {
    const r = await leerFilas(new TextEncoder().encode("hola").buffer as ArrayBuffer);
    expect(r).toEqual({ ok: false, error: "El archivo no es un Excel válido (.xlsx)." });
  });
});
```

Run: `npm test -w @pyxis/ovalle-obras -- lib/excel/leer` → FAIL.

- [ ] **Step 3: Implementar columnas, lectura y plantilla**

`apps/ovalle-obras/lib/excel/columnas.ts`:
```ts
export type ClaveColumna =
  | "codigo"
  | "descripcion"
  | "unidad"
  | "cantidad"
  | "precio_unitario"
  | "fecha_inicio"
  | "fecha_fin";

export const COLUMNAS: readonly { clave: ClaveColumna; titulo: string }[] = [
  { clave: "codigo", titulo: "Código" },
  { clave: "descripcion", titulo: "Descripción" },
  { clave: "unidad", titulo: "Unidad" },
  { clave: "cantidad", titulo: "Cantidad" },
  { clave: "precio_unitario", titulo: "Precio unitario" },
  { clave: "fecha_inicio", titulo: "Fecha inicio" },
  { clave: "fecha_fin", titulo: "Fecha fin" },
];

export function normalizarEncabezado(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
```

`apps/ovalle-obras/lib/excel/leer.ts`:
```ts
import ExcelJS from "exceljs";
import { COLUMNAS, normalizarEncabezado, type ClaveColumna } from "./columnas";

export type FilaCruda = {
  fila: number;
  codigo: string;
  descripcion: unknown;
  unidad: unknown;
  cantidad: unknown;
  precio_unitario: unknown;
  fecha_inicio: unknown;
  fecha_fin: unknown;
};

function valorCelda(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return valorCelda(v.result as ExcelJS.CellValue);
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return String(v.text);
    if ("error" in v) return null;
    return null;
  }
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? null : t;
  }
  return v;
}

export async function leerFilas(
  archivo: ArrayBuffer,
): Promise<{ ok: true; filas: FilaCruda[] } | { ok: false; error: string }> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(archivo);
  } catch {
    return { ok: false, error: "El archivo no es un Excel válido (.xlsx)." };
  }
  const hoja = wb.worksheets[0];
  if (!hoja) return { ok: false, error: "El Excel no tiene hojas." };

  const indice = new Map<ClaveColumna, number>();
  hoja.getRow(1).eachCell((celda, col) => {
    const nombre = normalizarEncabezado(celda.text);
    const columna = COLUMNAS.find((c) => normalizarEncabezado(c.titulo) === nombre);
    if (columna) indice.set(columna.clave, col);
  });
  const faltantes = COLUMNAS.filter((c) => !indice.has(c.clave)).map((c) => c.titulo);
  if (faltantes.length > 0) {
    return { ok: false, error: `Faltan columnas en la primera fila: ${faltantes.join(", ")}.` };
  }

  const filas: FilaCruda[] = [];
  hoja.eachRow({ includeEmpty: false }, (row, numero) => {
    if (numero === 1) return;
    const celda = (clave: ClaveColumna) => row.getCell(indice.get(clave)!);
    const fila: FilaCruda = {
      fila: numero,
      // El texto visible evita que "1.10" llegue como el número 1.1.
      codigo: celda("codigo").text.trim(),
      descripcion: valorCelda(celda("descripcion").value),
      unidad: valorCelda(celda("unidad").value),
      cantidad: valorCelda(celda("cantidad").value),
      precio_unitario: valorCelda(celda("precio_unitario").value),
      fecha_inicio: valorCelda(celda("fecha_inicio").value),
      fecha_fin: valorCelda(celda("fecha_fin").value),
    };
    const vacia =
      fila.codigo === "" &&
      [fila.descripcion, fila.unidad, fila.cantidad, fila.precio_unitario, fila.fecha_inicio, fila.fecha_fin].every(
        (v) => v === null,
      );
    if (!vacia) filas.push(fila);
  });
  return { ok: true, filas };
}
```

`apps/ovalle-obras/lib/excel/plantilla.ts`:
```ts
import ExcelJS from "exceljs";
import { COLUMNAS } from "./columnas";

export async function construirPlantilla(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet("Presupuesto");
  hoja.columns = COLUMNAS.map((c) => ({ header: c.titulo, key: c.clave, width: c.clave === "descripcion" ? 40 : 16 }));
  hoja.getRow(1).font = { bold: true };
  // Código como texto: así "1.10" no se convierte en 1.1.
  hoja.getColumn("codigo").numFmt = "@";
  hoja.getColumn("fecha_inicio").numFmt = "dd-mm-yyyy";
  hoja.getColumn("fecha_fin").numFmt = "dd-mm-yyyy";
  hoja.getColumn("precio_unitario").numFmt = "#,##0";
  hoja.addRow({ codigo: "1", descripcion: "Obra gruesa" });
  hoja.addRow({
    codigo: "1.1",
    descripcion: "Enfierradura losa P3",
    unidad: "kg",
    cantidad: 4200,
    precio_unitario: 1150,
    fecha_inicio: new Date(Date.UTC(2026, 10, 3)),
    fecha_fin: new Date(Date.UTC(2026, 10, 14)),
  });
  hoja.addRow({
    codigo: "1.2",
    descripcion: "Hormigón losa P3",
    unidad: "m3",
    cantidad: 85,
    precio_unitario: 98000,
    fecha_inicio: new Date(Date.UTC(2026, 10, 15)),
    fecha_fin: new Date(Date.UTC(2026, 10, 18)),
  });
  const hojaAyuda = wb.addWorksheet("Instrucciones");
  [
    "Una fila por partida. El código define la jerarquía: 1 → 1.1 → 1.1.1.",
    "Filas sin Cantidad son capítulos: agrupan y suman a sus subpartidas.",
    "Filas con Cantidad son partidas reportables: necesitan Unidad y Precio unitario.",
    "Fechas en formato dd-mm-aaaa. Montos en pesos chilenos.",
  ].forEach((t) => hojaAyuda.addRow([t]));
  return Buffer.from(await wb.xlsx.writeBuffer());
}
```

- [ ] **Step 4: Verificar**

Run: `npm test -w @pyxis/ovalle-obras -- lib/excel/leer` → PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/ovalle-obras package-lock.json
git commit -m "feat(ovalle-obras): read budget Excel files and build the template"
```

---

### Task 7: Validación de filas importadas

**Files:**
- Create: `lib/excel/validar.ts`
- Test: `lib/excel/validar.test.ts`

**Interfaces:**
- Consumes: `FilaCruda` (Task 6), `parseNumeroCL` (Task 5), `parseFecha` (Task 5).
- Produces:
  - `type PartidaImportada = { codigo: string; codigo_padre: string | null; descripcion: string; unidad: string | null; cantidad: number | null; precio_unitario: number | null; fecha_inicio: string | null; fecha_fin: string | null; orden: number }`
  - `type ErrorFila = { fila: number; mensaje: string }`
  - `validarFilas(filas: FilaCruda[]): { partidas: PartidaImportada[]; errores: ErrorFila[] }`

- [ ] **Step 1: Tests (fallan)**

`apps/ovalle-obras/lib/excel/validar.test.ts`:
```ts
/** @jest-environment node */
import type { FilaCruda } from "./leer";
import { validarFilas } from "./validar";

function fila(n: number, datos: Partial<FilaCruda>): FilaCruda {
  return {
    fila: n,
    codigo: "",
    descripcion: null,
    unidad: null,
    cantidad: null,
    precio_unitario: null,
    fecha_inicio: null,
    fecha_fin: null,
    ...datos,
  };
}

describe("validarFilas", () => {
  it("arma capítulos y hojas con padre, orden y valores normalizados", () => {
    const r = validarFilas([
      fila(2, { codigo: "1", descripcion: "Obra gruesa" }),
      fila(3, {
        codigo: "1.1",
        descripcion: "Enfierradura",
        unidad: "kg",
        cantidad: "4.200",
        precio_unitario: "$ 1.150",
        fecha_inicio: "03-11-2026",
        fecha_fin: new Date(Date.UTC(2026, 10, 14)),
      }),
    ]);
    expect(r.errores).toEqual([]);
    expect(r.partidas).toEqual([
      { codigo: "1", codigo_padre: null, descripcion: "Obra gruesa", unidad: null, cantidad: null, precio_unitario: null, fecha_inicio: null, fecha_fin: null, orden: 0 },
      { codigo: "1.1", codigo_padre: "1", descripcion: "Enfierradura", unidad: "kg", cantidad: 4200, precio_unitario: 1150, fecha_inicio: "2026-11-03", fecha_fin: "2026-11-14", orden: 1 },
    ]);
  });

  it("reporta cada problema con su número de fila", () => {
    const r = validarFilas([
      fila(2, { codigo: "1", descripcion: "Cap" }),
      fila(3, { codigo: "1", descripcion: "Duplicada" }),
      fila(4, { codigo: "2.1", descripcion: "Sin padre", unidad: "m2", cantidad: 1, precio_unitario: 1 }),
      fila(5, { codigo: "1.1", descripcion: "Sin unidad", cantidad: 3, precio_unitario: 1 }),
      fila(6, { codigo: "1.2", descripcion: "Cantidad mala", unidad: "m2", cantidad: "mucho", precio_unitario: 1 }),
      fila(7, { codigo: "1.3", descripcion: "Fechas al revés", unidad: "m2", cantidad: 1, precio_unitario: 1, fecha_inicio: "10-11-2026", fecha_fin: "01-11-2026" }),
      fila(8, { codigo: "1.4", unidad: "m2", cantidad: 1, precio_unitario: 1 }),
      fila(9, { codigo: "1.x", descripcion: "Código raro" }),
      fila(10, { codigo: "1.5", descripcion: "Sin precio", unidad: "m2", cantidad: 1 }),
      fila(11, { codigo: "1.6", descripcion: "Cero", unidad: "m2", cantidad: 0, precio_unitario: 1 }),
    ]);
    expect(r.errores).toEqual([
      { fila: 3, mensaje: "Código 1 repetido (ya está en la fila 2)." },
      { fila: 4, mensaje: "La partida 2.1 no tiene capítulo padre 2 en el archivo." },
      { fila: 5, mensaje: "Una partida con cantidad necesita unidad." },
      { fila: 6, mensaje: "Cantidad no es un número." },
      { fila: 7, mensaje: "Fecha fin es anterior a fecha inicio." },
      { fila: 8, mensaje: "Falta la descripción." },
      { fila: 9, mensaje: "Código inválido: use números separados por puntos (ej. 1.2.3)." },
      { fila: 10, mensaje: "Una partida con cantidad necesita precio unitario." },
      { fila: 11, mensaje: "Cantidad debe ser mayor que 0." },
    ]);
  });

  it("no permite que una partida con cantidad tenga subpartidas", () => {
    const r = validarFilas([
      fila(2, { codigo: "1", descripcion: "Hoja", unidad: "m2", cantidad: 5, precio_unitario: 1 }),
      fila(3, { codigo: "1.1", descripcion: "Hija", unidad: "m2", cantidad: 1, precio_unitario: 1 }),
    ]);
    expect(r.errores).toEqual([
      { fila: 2, mensaje: "La partida 1 tiene cantidad y también subpartidas; deje la cantidad solo en las subpartidas." },
    ]);
  });

  it("exige al menos una fila", () => {
    expect(validarFilas([]).errores).toEqual([{ fila: 1, mensaje: "El archivo no tiene partidas." }]);
  });
});
```

Run: `npm test -w @pyxis/ovalle-obras -- lib/excel/validar` → FAIL.

- [ ] **Step 2: Implementar**

`apps/ovalle-obras/lib/excel/validar.ts`:
```ts
import { parseFecha } from "@/lib/fechas";
import { parseNumeroCL } from "@/lib/numeros";
import type { FilaCruda } from "./leer";

export type PartidaImportada = {
  codigo: string;
  codigo_padre: string | null;
  descripcion: string;
  unidad: string | null;
  cantidad: number | null;
  precio_unitario: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  orden: number;
};

export type ErrorFila = { fila: number; mensaje: string };

const CODIGO = /^\d+(\.\d+)*$/;

function texto(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

function padreDe(codigo: string): string | null {
  const i = codigo.lastIndexOf(".");
  return i === -1 ? null : codigo.slice(0, i);
}

export function validarFilas(filas: FilaCruda[]): { partidas: PartidaImportada[]; errores: ErrorFila[] } {
  if (filas.length === 0) return { partidas: [], errores: [{ fila: 1, mensaje: "El archivo no tiene partidas." }] };

  const errores: ErrorFila[] = [];
  const partidas: (PartidaImportada & { fila: number })[] = [];
  const filaPorCodigo = new Map<string, number>();

  filas.forEach((f, i) => {
    const error = (mensaje: string) => errores.push({ fila: f.fila, mensaje });
    const codigo = f.codigo.trim();
    if (!CODIGO.test(codigo)) return error("Código inválido: use números separados por puntos (ej. 1.2.3).");
    const previa = filaPorCodigo.get(codigo);
    if (previa !== undefined) return error(`Código ${codigo} repetido (ya está en la fila ${previa}).`);
    filaPorCodigo.set(codigo, f.fila);

    const descripcion = texto(f.descripcion);
    if (!descripcion) return error("Falta la descripción.");

    const cantidad = parseNumeroCL(f.cantidad);
    if (!cantidad.ok) return error("Cantidad no es un número.");
    const esHoja = cantidad.valor !== null;

    let unidad: string | null = null;
    let precio: number | null = null;
    let inicio: string | null = null;
    let fin: string | null = null;

    if (esHoja) {
      if (cantidad.valor! <= 0) return error("Cantidad debe ser mayor que 0.");
      unidad = texto(f.unidad);
      if (!unidad) return error("Una partida con cantidad necesita unidad.");
      const p = parseNumeroCL(f.precio_unitario);
      if (!p.ok) return error("Precio unitario no es un número.");
      if (p.valor === null) return error("Una partida con cantidad necesita precio unitario.");
      if (p.valor < 0) return error("Precio unitario no puede ser negativo.");
      precio = p.valor;
      const fi = parseFecha(f.fecha_inicio);
      if (!fi.ok) return error("Fecha inicio no es una fecha válida (dd-mm-aaaa).");
      const ff = parseFecha(f.fecha_fin);
      if (!ff.ok) return error("Fecha fin no es una fecha válida (dd-mm-aaaa).");
      inicio = fi.valor;
      fin = ff.valor;
      if (inicio && fin && fin < inicio) return error("Fecha fin es anterior a fecha inicio.");
    }

    partidas.push({
      fila: f.fila,
      codigo,
      codigo_padre: padreDe(codigo),
      descripcion,
      unidad,
      cantidad: cantidad.valor,
      precio_unitario: precio,
      fecha_inicio: inicio,
      fecha_fin: fin,
      orden: i,
    });
  });

  const porCodigo = new Map(partidas.map((p) => [p.codigo, p]));
  for (const p of partidas) {
    if (p.codigo_padre && !filaPorCodigo.has(p.codigo_padre)) {
      errores.push({ fila: p.fila, mensaje: `La partida ${p.codigo} no tiene capítulo padre ${p.codigo_padre} en el archivo.` });
    }
    const padre = p.codigo_padre ? porCodigo.get(p.codigo_padre) : undefined;
    if (padre && padre.cantidad !== null) {
      const mensaje = `La partida ${padre.codigo} tiene cantidad y también subpartidas; deje la cantidad solo en las subpartidas.`;
      if (!errores.some((e) => e.fila === padre.fila && e.mensaje === mensaje)) errores.push({ fila: padre.fila, mensaje });
    }
  }

  errores.sort((a, b) => a.fila - b.fila);
  return { partidas: partidas.map(({ fila: _fila, ...p }) => p), errores };
}
```

- [ ] **Step 3: Verificar**

Run: `npm test -w @pyxis/ovalle-obras -- lib/excel/validar` → PASS.
Run: `npm run lint -w @pyxis/ovalle-obras` → si `_fila` dispara `no-unused-vars`, reemplazar la desestructuración por `partidas.map((p) => { const { fila, ...resto } = p; void fila; return resto; })`.

- [ ] **Step 4: Commit**

```bash
git add apps/ovalle-obras/lib/excel
git commit -m "feat(ovalle-obras): validate imported budget rows"
```

---

### Task 8: Diferencias al reimportar

**Files:**
- Create: `lib/excel/diferencias.ts`
- Test: `lib/excel/diferencias.test.ts`

**Interfaces:**
- Consumes: `PartidaImportada` (Task 7).
- Produces:
  - `type PartidaExistente = Omit<PartidaImportada, "codigo_padre" | "orden"> & { tieneReportes: boolean }`
  - `type Diferencias = { agregadas: string[]; modificadas: string[]; eliminadas: string[]; bloqueadas: string[] }`
  - `calcularDiferencias(existentes: PartidaExistente[], nuevas: PartidaImportada[]): Diferencias`

- [ ] **Step 1: Tests (fallan)**

`apps/ovalle-obras/lib/excel/diferencias.test.ts`:
```ts
/** @jest-environment node */
import { calcularDiferencias, type PartidaExistente } from "./diferencias";
import type { PartidaImportada } from "./validar";

const base = { unidad: "m2", cantidad: 10, precio_unitario: 100, fecha_inicio: null, fecha_fin: null };
const existente = (codigo: string, tieneReportes = false, extra: Partial<PartidaExistente> = {}): PartidaExistente => ({
  codigo, descripcion: `P ${codigo}`, ...base, tieneReportes, ...extra,
});
const nueva = (codigo: string, extra: Partial<PartidaImportada> = {}): PartidaImportada => ({
  codigo, codigo_padre: null, descripcion: `P ${codigo}`, ...base, orden: 0, ...extra,
});

describe("calcularDiferencias", () => {
  it("separa agregadas, modificadas y eliminadas", () => {
    const d = calcularDiferencias(
      [existente("1"), existente("2"), existente("3")],
      [nueva("1"), nueva("2", { cantidad: 20 }), nueva("4")],
    );
    expect(d).toEqual({ agregadas: ["4"], modificadas: ["2"], eliminadas: ["3"], bloqueadas: [] });
  });

  it("bloquea eliminar partidas con reportes", () => {
    const d = calcularDiferencias([existente("1", true)], []);
    expect(d.bloqueadas).toEqual(["1"]);
  });

  it("bloquea convertir en capítulo una partida con reportes", () => {
    const d = calcularDiferencias(
      [existente("1", true)],
      [nueva("1", { cantidad: null, unidad: null, precio_unitario: null })],
    );
    expect(d.bloqueadas).toEqual(["1"]);
  });
});
```

Run: `npm test -w @pyxis/ovalle-obras -- lib/excel/diferencias` → FAIL.

- [ ] **Step 2: Implementar**

`apps/ovalle-obras/lib/excel/diferencias.ts`:
```ts
import type { PartidaImportada } from "./validar";

export type PartidaExistente = Omit<PartidaImportada, "codigo_padre" | "orden"> & { tieneReportes: boolean };

export type Diferencias = {
  agregadas: string[];
  modificadas: string[];
  eliminadas: string[];
  /** Cambios que la importación rechazaría (misma regla que aplicar_importacion en la BD). */
  bloqueadas: string[];
};

const CAMPOS = ["descripcion", "unidad", "cantidad", "precio_unitario", "fecha_inicio", "fecha_fin"] as const;

export function calcularDiferencias(existentes: PartidaExistente[], nuevas: PartidaImportada[]): Diferencias {
  const nuevasPorCodigo = new Map(nuevas.map((p) => [p.codigo, p]));
  const existentesPorCodigo = new Map(existentes.map((p) => [p.codigo, p]));
  const d: Diferencias = { agregadas: [], modificadas: [], eliminadas: [], bloqueadas: [] };

  for (const p of nuevas) {
    const previa = existentesPorCodigo.get(p.codigo);
    if (!previa) {
      d.agregadas.push(p.codigo);
      continue;
    }
    if (CAMPOS.some((c) => (previa[c] ?? null) !== (p[c] ?? null))) d.modificadas.push(p.codigo);
    if (previa.tieneReportes && p.cantidad === null) d.bloqueadas.push(p.codigo);
  }
  for (const p of existentes) {
    if (nuevasPorCodigo.has(p.codigo)) continue;
    d.eliminadas.push(p.codigo);
    if (p.tieneReportes) d.bloqueadas.push(p.codigo);
  }
  return d;
}
```

- [ ] **Step 3: Verificar y commit**

Run: `npm test -w @pyxis/ovalle-obras -- lib/excel/diferencias` → PASS.
```bash
git add apps/ovalle-obras/lib/excel
git commit -m "feat(ovalle-obras): diff budget re-imports by code"
```

---

### Task 9: Importación transaccional en la base de datos

**Files:**
- Create: `supabase/migrations/20261006000003_importacion.sql`, `supabase/tests/importacion.test.ts`

**Interfaces:**
- Consumes: esquema y `rol_actual()` (Tasks 2–3); forma de `PartidaImportada` (Task 7) como JSON.
- Produces: RPC `aplicar_importacion(p_obra_id uuid | null, p_nombre text | null, p_partidas jsonb, p_archivo_path text) returns uuid` (id de la obra). Errores: `42501` si no es admin; `P0001` con mensaje `Partidas con reportes no pueden eliminarse ni volverse capítulo: <códigos>`.

- [ ] **Step 1: Tests (fallan)**

`apps/ovalle-obras/supabase/tests/importacion.test.ts`:
```ts
import { adminServicio, crearUsuario } from "./helpers";

const partida = (codigo: string, codigo_padre: string | null, orden: number, cantidad: number | null = 10) => ({
  codigo,
  codigo_padre,
  descripcion: `Partida ${codigo}`,
  unidad: cantidad === null ? null : "m2",
  cantidad,
  precio_unitario: cantidad === null ? null : 1000,
  fecha_inicio: "2026-11-01",
  fecha_fin: "2026-11-10",
  orden,
});

describe("aplicar_importacion", () => {
  it("crea una obra con su árbol de partidas y registra la importación", async () => {
    const admin = await crearUsuario("admin");
    const { data: obraId, error } = await admin.cliente.rpc("aplicar_importacion", {
      p_obra_id: null,
      p_nombre: "Edificio Ñuñoa",
      p_partidas: [partida("1", null, 0, null), partida("1.1", "1", 1)],
      p_archivo_path: "2026-10-06/x.xlsx",
    });
    expect(error).toBeNull();
    const { data: partidas } = await adminServicio
      .from("partidas")
      .select("codigo, parent_id, id")
      .eq("obra_id", obraId!)
      .order("orden");
    expect(partidas!.map((p) => p.codigo)).toEqual(["1", "1.1"]);
    expect(partidas![1].parent_id).toBe(partidas![0].id);
    const { data: imps } = await adminServicio.from("importaciones").select("filas").eq("obra_id", obraId!);
    expect(imps).toEqual([{ filas: 2 }]);
  });

  it("reimporta: actualiza por código, agrega y elimina sin tocar reportes", async () => {
    const admin = await crearUsuario("admin");
    const { data: obraId } = await admin.cliente.rpc("aplicar_importacion", {
      p_obra_id: null, p_nombre: "Obra", p_partidas: [partida("1", null, 0, null), partida("1.1", "1", 1), partida("1.2", "1", 2)], p_archivo_path: "a.xlsx",
    });
    const { data: hoja } = await adminServicio.from("partidas").select("id").eq("obra_id", obraId!).eq("codigo", "1.1").single();
    await adminServicio.from("reportes").insert({ obra_id: obraId!, partida_id: hoja!.id, autor: admin.id, cantidad: 4 });

    const { error } = await admin.cliente.rpc("aplicar_importacion", {
      p_obra_id: obraId!, p_nombre: null,
      p_partidas: [partida("1", null, 0, null), partida("1.1", "1", 1, 50), partida("1.3", "1", 2)],
      p_archivo_path: "b.xlsx",
    });
    expect(error).toBeNull();
    const { data: partidas } = await adminServicio.from("partidas").select("id, codigo, cantidad").eq("obra_id", obraId!).order("orden");
    expect(partidas!.map((p) => p.codigo)).toEqual(["1", "1.1", "1.3"]);
    expect(partidas![1]).toMatchObject({ id: hoja!.id, cantidad: 50 });
  });

  it("rechaza eliminar partidas con reportes y no cambia nada", async () => {
    const admin = await crearUsuario("admin");
    const { data: obraId } = await admin.cliente.rpc("aplicar_importacion", {
      p_obra_id: null, p_nombre: "Obra", p_partidas: [partida("1", null, 0, null), partida("1.1", "1", 1)], p_archivo_path: "a.xlsx",
    });
    const { data: hoja } = await adminServicio.from("partidas").select("id").eq("obra_id", obraId!).eq("codigo", "1.1").single();
    await adminServicio.from("reportes").insert({ obra_id: obraId!, partida_id: hoja!.id, autor: admin.id, cantidad: 4 });

    const { error } = await admin.cliente.rpc("aplicar_importacion", {
      p_obra_id: obraId!, p_nombre: null, p_partidas: [partida("1", null, 0, null), partida("1.2", "1", 1)], p_archivo_path: "b.xlsx",
    });
    expect(error?.message).toContain("1.1");
    const { data: partidas } = await adminServicio.from("partidas").select("codigo").eq("obra_id", obraId!);
    expect(partidas!.map((p) => p.codigo).sort()).toEqual(["1", "1.1"]);
  });

  it("solo un admin puede importar", async () => {
    const terreno = await crearUsuario("terreno");
    const { error } = await terreno.cliente.rpc("aplicar_importacion", {
      p_obra_id: null, p_nombre: "Obra", p_partidas: [partida("1", null, 0)], p_archivo_path: "a.xlsx",
    });
    expect(error?.code).toBe("42501");
  });
});
```

Run: `npm run test:db -w @pyxis/ovalle-obras -- importacion` → FAIL (función no existe).

- [ ] **Step 2: Migración**

`apps/ovalle-obras/supabase/migrations/20261006000003_importacion.sql`:
```sql
create function public.aplicar_importacion(
  p_obra_id uuid,
  p_nombre text,
  p_partidas jsonb,
  p_archivo_path text
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_obra uuid;
  v_bloqueadas text;
begin
  if public.rol_actual() is distinct from 'admin' then
    raise exception 'solo un admin puede importar' using errcode = '42501';
  end if;

  if p_obra_id is null then
    insert into public.obras (nombre, creado_por) values (p_nombre, auth.uid()) returning id into v_obra;
  else
    v_obra := p_obra_id;
  end if;

  select string_agg(p.codigo, ', ' order by p.orden) into v_bloqueadas
  from public.partidas p
  left join jsonb_array_elements(p_partidas) e on e ->> 'codigo' = p.codigo
  where p.obra_id = v_obra
    and exists (select 1 from public.reportes r where r.partida_id = p.id)
    and (e is null or e ->> 'cantidad' is null);
  if v_bloqueadas is not null then
    raise exception 'Partidas con reportes no pueden eliminarse ni volverse capítulo: %', v_bloqueadas
      using errcode = 'P0001';
  end if;

  delete from public.partidas p
  where p.obra_id = v_obra
    and not exists (select 1 from jsonb_array_elements(p_partidas) e where e ->> 'codigo' = p.codigo);

  insert into public.partidas (obra_id, codigo, descripcion, unidad, cantidad, precio_unitario, fecha_inicio, fecha_fin, orden)
  select
    v_obra,
    e ->> 'codigo',
    e ->> 'descripcion',
    e ->> 'unidad',
    (e ->> 'cantidad')::numeric,
    (e ->> 'precio_unitario')::numeric,
    (e ->> 'fecha_inicio')::date,
    (e ->> 'fecha_fin')::date,
    (e ->> 'orden')::integer
  from jsonb_array_elements(p_partidas) e
  on conflict (obra_id, codigo) do update set
    descripcion = excluded.descripcion,
    unidad = excluded.unidad,
    cantidad = excluded.cantidad,
    precio_unitario = excluded.precio_unitario,
    fecha_inicio = excluded.fecha_inicio,
    fecha_fin = excluded.fecha_fin,
    orden = excluded.orden;

  update public.partidas h
  set parent_id = padre.id
  from jsonb_array_elements(p_partidas) e
  left join public.partidas padre on padre.obra_id = v_obra and padre.codigo = e ->> 'codigo_padre'
  where h.obra_id = v_obra and h.codigo = e ->> 'codigo';

  insert into public.importaciones (obra_id, archivo_path, filas, creado_por)
  values (v_obra, p_archivo_path, jsonb_array_length(p_partidas), auth.uid());

  return v_obra;
end $$;
```

- [ ] **Step 3: Aplicar, regenerar tipos y verificar**

Run: `npm run db:reset -w @pyxis/ovalle-obras`
Run: `npm run db:types -w @pyxis/ovalle-obras`
Run: `npm run test:db -w @pyxis/ovalle-obras` → PASS (13 tests).

- [ ] **Step 4: Commit**

```bash
git add apps/ovalle-obras
git commit -m "feat(ovalle-obras): transactional budget import RPC"
```

---

### Task 10: Cálculos de avance

**Files:**
- Create: `lib/avance/tipos.ts`, `lib/avance/calculos.ts`, `lib/avance/arbol.ts`, `lib/avance/filtros.ts`
- Test: `lib/avance/calculos.test.ts`, `lib/avance/arbol.test.ts`, `lib/avance/filtros.test.ts`

**Interfaces:**
- Consumes: `diasEntre` (Task 5).
- Produces (`lib/avance/tipos.ts`):
  ```ts
  export type Estado = "al_dia" | "atrasada" | "terminada" | "sin_fechas";
  export type PartidaPlan = { id: string; parent_id: string | null; codigo: string; descripcion: string; unidad: string | null; cantidad: number | null; precio_unitario: number | null; fecha_inicio: string | null; fecha_fin: string | null; orden: number };
  export type NodoAvance = PartidaPlan & { esHoja: boolean; nivel: number; ejecutado: number; porcentaje: number; porcentajeEsperado: number | null; montoPresupuestado: number; montoEjecutado: number; estado: Estado; hijos: NodoAvance[] };
  export type ResumenObra = { porcentajeFisico: number; montoPresupuestado: number; montoEjecutado: number; atrasadas: number; hojas: number };
  ```
  - `porcentajeEsperado(inicio: string | null, fin: string | null, hoy: string): number | null`, `estadoHoja(porcentaje: number, esperado: number | null): Estado` (`calculos.ts`)
  - `construirArbol(partidas: PartidaPlan[], ejecutado: Map<string, number>, hoy: string): NodoAvance[]`, `resumenObra(raices: NodoAvance[]): ResumenObra`, `aplanar(raices: NodoAvance[]): NodoAvance[]` (`arbol.ts`)
  - `type Filtro = "todas" | "atrasadas" | "en_curso" | "terminadas"`, `filtrarArbol(raices: NodoAvance[], filtro: Filtro, hoy: string): NodoAvance[]` (`filtros.ts`)

- [ ] **Step 1: Tipos**

`apps/ovalle-obras/lib/avance/tipos.ts`:
```ts
export type Estado = "al_dia" | "atrasada" | "terminada" | "sin_fechas";

export type PartidaPlan = {
  id: string;
  parent_id: string | null;
  codigo: string;
  descripcion: string;
  unidad: string | null;
  cantidad: number | null;
  precio_unitario: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  orden: number;
};

export type NodoAvance = PartidaPlan & {
  esHoja: boolean;
  nivel: number;
  /** Suma de reportes no anulados (0 en capítulos). */
  ejecutado: number;
  /** Fracción; en hojas ejecutado/cantidad (puede pasar de 1), en capítulos por monto. */
  porcentaje: number;
  porcentajeEsperado: number | null;
  montoPresupuestado: number;
  montoEjecutado: number;
  estado: Estado;
  hijos: NodoAvance[];
};

export type ResumenObra = {
  porcentajeFisico: number;
  montoPresupuestado: number;
  montoEjecutado: number;
  atrasadas: number;
  hojas: number;
};
```

- [ ] **Step 2: Tests (fallan)**

`apps/ovalle-obras/lib/avance/calculos.test.ts`:
```ts
/** @jest-environment node */
import { estadoHoja, porcentajeEsperado } from "./calculos";

describe("porcentajeEsperado", () => {
  it("interpola linealmente entre inicio y fin", () => {
    expect(porcentajeEsperado("2026-11-01", "2026-11-11", "2026-11-06")).toBeCloseTo(0.5);
  });
  it("se acota a 0 antes del inicio y a 1 desde el fin", () => {
    expect(porcentajeEsperado("2026-11-01", "2026-11-11", "2026-10-20")).toBe(0);
    expect(porcentajeEsperado("2026-11-01", "2026-11-11", "2026-11-11")).toBe(1);
    expect(porcentajeEsperado("2026-11-01", "2026-11-11", "2026-12-01")).toBe(1);
  });
  it("una partida de un día está al 100 % ese día", () => {
    expect(porcentajeEsperado("2026-11-05", "2026-11-05", "2026-11-05")).toBe(1);
    expect(porcentajeEsperado("2026-11-05", "2026-11-05", "2026-11-04")).toBe(0);
  });
  it("sin fechas no hay esperado", () => {
    expect(porcentajeEsperado(null, "2026-11-11", "2026-11-06")).toBeNull();
  });
});

describe("estadoHoja", () => {
  it("terminada si llega al 100 %", () => expect(estadoHoja(1, 0.5)).toBe("terminada"));
  it("atrasada si va bajo lo esperado", () => expect(estadoHoja(0.3, 0.5)).toBe("atrasada"));
  it("al día si iguala o supera lo esperado", () => expect(estadoHoja(0.5, 0.5)).toBe("al_dia"));
  it("sin fechas si no hay esperado y no terminó", () => expect(estadoHoja(0.2, null)).toBe("sin_fechas"));
});
```

`apps/ovalle-obras/lib/avance/arbol.test.ts`:
```ts
/** @jest-environment node */
import { aplanar, construirArbol, resumenObra } from "./arbol";
import type { PartidaPlan } from "./tipos";

const p = (id: string, codigo: string, parent_id: string | null, extra: Partial<PartidaPlan> = {}): PartidaPlan => ({
  id, codigo, parent_id, descripcion: codigo, unidad: null, cantidad: null, precio_unitario: null,
  fecha_inicio: null, fecha_fin: null, orden: Number(codigo.replace(/\./g, "")), ...extra,
});
const hoja = (cantidad: number, precio: number, inicio = "2026-11-01", fin = "2026-11-11") => ({
  unidad: "m2", cantidad, precio_unitario: precio, fecha_inicio: inicio, fecha_fin: fin,
});

const PARTIDAS = [
  p("c1", "1", null),
  p("h11", "1.1", "c1", hoja(100, 1000)), // $100.000
  p("h12", "1.2", "c1", hoja(10, 30000)), // $300.000
  p("c2", "2", null),
  p("h21", "2.1", "c2", hoja(50, 2000, "2026-12-01", "2026-12-10")), // $100.000
];

describe("construirArbol", () => {
  const ejecutado = new Map([["h11", 50], ["h12", 10], ["h21", 0]]);
  const raices = construirArbol(PARTIDAS, ejecutado, "2026-11-06");

  it("anida por parent_id respetando el orden", () => {
    expect(raices.map((n) => n.codigo)).toEqual(["1", "2"]);
    expect(raices[0].hijos.map((n) => n.codigo)).toEqual(["1.1", "1.2"]);
    expect(raices[0].hijos[0].nivel).toBe(1);
  });

  it("calcula hojas: %, montos y estado", () => {
    const [h11, h12] = raices[0].hijos;
    expect(h11).toMatchObject({ esHoja: true, ejecutado: 50, porcentaje: 0.5, montoPresupuestado: 100000, montoEjecutado: 50000, estado: "al_dia" });
    expect(h12).toMatchObject({ porcentaje: 1, estado: "terminada" });
  });

  it("topa el monto ejecutado en lo presupuestado aunque el % pase de 100", () => {
    const [n] = aplanar(construirArbol([p("h", "1", null, hoja(10, 100))], new Map([["h", 12]]), "2026-11-06"));
    expect(n.porcentaje).toBeCloseTo(1.2);
    expect(n.montoEjecutado).toBe(1000);
  });

  it("los capítulos suman montos y ponderan el % por monto", () => {
    expect(raices[0]).toMatchObject({ esHoja: false, montoPresupuestado: 400000, montoEjecutado: 350000, porcentaje: 0.875 });
  });

  it("un capítulo está atrasado si alguna hoja lo está", () => {
    const r = construirArbol(PARTIDAS, new Map([["h11", 10]]), "2026-11-06");
    expect(r[0].estado).toBe("atrasada");
  });
});

describe("resumenObra", () => {
  it("pondera el avance físico global por monto y cuenta atrasadas", () => {
    const r = construirArbol(PARTIDAS, new Map([["h11", 10], ["h12", 10]]), "2026-11-06");
    expect(resumenObra(r)).toEqual({
      montoPresupuestado: 500000,
      montoEjecutado: 310000,
      porcentajeFisico: 0.62,
      atrasadas: 1,
      hojas: 3,
    });
  });

  it("una obra sin montos tiene 0 % y no divide por cero", () => {
    expect(resumenObra([]).porcentajeFisico).toBe(0);
  });
});
```

`apps/ovalle-obras/lib/avance/filtros.test.ts`:
```ts
/** @jest-environment node */
import { construirArbol } from "./arbol";
import { filtrarArbol } from "./filtros";
import type { PartidaPlan } from "./tipos";

const base = { descripcion: "x", unidad: "m2", precio_unitario: 1, orden: 0 };
const PARTIDAS: PartidaPlan[] = [
  { ...base, id: "c", codigo: "1", parent_id: null, unidad: null, cantidad: null, precio_unitario: null, fecha_inicio: null, fecha_fin: null },
  { ...base, id: "a", codigo: "1.1", parent_id: "c", cantidad: 10, fecha_inicio: "2026-11-01", fecha_fin: "2026-11-11", orden: 1 },
  { ...base, id: "b", codigo: "1.2", parent_id: "c", cantidad: 10, fecha_inicio: "2026-11-01", fecha_fin: "2026-11-11", orden: 2 },
  { ...base, id: "d", codigo: "1.3", parent_id: "c", cantidad: 10, fecha_inicio: "2026-12-01", fecha_fin: "2026-12-11", orden: 3 },
];
const raices = construirArbol(PARTIDAS, new Map([["a", 1], ["b", 10]]), "2026-11-06");

describe("filtrarArbol", () => {
  it("deja los capítulos que contienen hojas que cumplen", () => {
    expect(filtrarArbol(raices, "atrasadas", "2026-11-06")[0].hijos.map((n) => n.codigo)).toEqual(["1.1"]);
    expect(filtrarArbol(raices, "terminadas", "2026-11-06")[0].hijos.map((n) => n.codigo)).toEqual(["1.2"]);
  });
  it("en curso = hoy dentro del rango y no terminada", () => {
    expect(filtrarArbol(raices, "en_curso", "2026-11-06")[0].hijos.map((n) => n.codigo)).toEqual(["1.1"]);
  });
  it("todas devuelve el árbol completo", () => {
    expect(filtrarArbol(raices, "todas", "2026-11-06")).toBe(raices);
  });
});
```

Run: `npm test -w @pyxis/ovalle-obras -- lib/avance` → FAIL.

- [ ] **Step 3: Implementar**

`apps/ovalle-obras/lib/avance/calculos.ts`:
```ts
import { diasEntre } from "@/lib/fechas";
import type { Estado } from "./tipos";

export function porcentajeEsperado(inicio: string | null, fin: string | null, hoy: string): number | null {
  if (!inicio || !fin) return null;
  if (hoy < inicio) return 0;
  if (hoy >= fin) return 1;
  const total = diasEntre(inicio, fin);
  return total <= 0 ? 1 : diasEntre(inicio, hoy) / total;
}

export function estadoHoja(porcentaje: number, esperado: number | null): Estado {
  if (porcentaje >= 1) return "terminada";
  if (esperado === null) return "sin_fechas";
  return porcentaje + 1e-9 < esperado ? "atrasada" : "al_dia";
}
```

`apps/ovalle-obras/lib/avance/arbol.ts`:
```ts
import { estadoHoja, porcentajeEsperado } from "./calculos";
import type { Estado, NodoAvance, PartidaPlan, ResumenObra } from "./tipos";

function estadoCapitulo(hijos: NodoAvance[]): Estado {
  if (hijos.length === 0) return "sin_fechas";
  if (hijos.some((h) => h.estado === "atrasada")) return "atrasada";
  if (hijos.every((h) => h.estado === "terminada")) return "terminada";
  if (hijos.every((h) => h.estado === "sin_fechas")) return "sin_fechas";
  return "al_dia";
}

export function construirArbol(partidas: PartidaPlan[], ejecutado: Map<string, number>, hoy: string): NodoAvance[] {
  const hijosDe = new Map<string | null, PartidaPlan[]>();
  for (const p of [...partidas].sort((a, b) => a.orden - b.orden)) {
    const lista = hijosDe.get(p.parent_id) ?? [];
    lista.push(p);
    hijosDe.set(p.parent_id, lista);
  }

  const nodo = (p: PartidaPlan, nivel: number): NodoAvance => {
    if (p.cantidad !== null) {
      const ej = ejecutado.get(p.id) ?? 0;
      const porcentaje = ej / p.cantidad;
      const precio = p.precio_unitario ?? 0;
      const esperado = porcentajeEsperado(p.fecha_inicio, p.fecha_fin, hoy);
      return {
        ...p,
        esHoja: true,
        nivel,
        ejecutado: ej,
        porcentaje,
        porcentajeEsperado: esperado,
        montoPresupuestado: p.cantidad * precio,
        montoEjecutado: Math.min(ej, p.cantidad) * precio,
        estado: estadoHoja(porcentaje, esperado),
        hijos: [],
      };
    }
    const hijos = (hijosDe.get(p.id) ?? []).map((h) => nodo(h, nivel + 1));
    const montoPresupuestado = hijos.reduce((s, h) => s + h.montoPresupuestado, 0);
    const montoEjecutado = hijos.reduce((s, h) => s + h.montoEjecutado, 0);
    return {
      ...p,
      esHoja: false,
      nivel,
      ejecutado: 0,
      porcentaje: montoPresupuestado > 0 ? montoEjecutado / montoPresupuestado : 0,
      porcentajeEsperado: null,
      montoPresupuestado,
      montoEjecutado,
      estado: estadoCapitulo(hijos),
      hijos,
    };
  };

  return (hijosDe.get(null) ?? []).map((p) => nodo(p, 0));
}

export function aplanar(raices: NodoAvance[]): NodoAvance[] {
  return raices.flatMap((n) => [n, ...aplanar(n.hijos)]);
}

export function resumenObra(raices: NodoAvance[]): ResumenObra {
  const hojas = aplanar(raices).filter((n) => n.esHoja);
  const montoPresupuestado = hojas.reduce((s, h) => s + h.montoPresupuestado, 0);
  const montoEjecutado = hojas.reduce((s, h) => s + h.montoEjecutado, 0);
  return {
    montoPresupuestado,
    montoEjecutado,
    porcentajeFisico: montoPresupuestado > 0 ? montoEjecutado / montoPresupuestado : 0,
    atrasadas: hojas.filter((h) => h.estado === "atrasada").length,
    hojas: hojas.length,
  };
}
```

`apps/ovalle-obras/lib/avance/filtros.ts`:
```ts
import type { NodoAvance } from "./tipos";

export type Filtro = "todas" | "atrasadas" | "en_curso" | "terminadas";

export function enCurso(n: NodoAvance, hoy: string): boolean {
  return (
    n.esHoja &&
    n.estado !== "terminada" &&
    n.fecha_inicio !== null &&
    n.fecha_fin !== null &&
    n.fecha_inicio <= hoy &&
    hoy <= n.fecha_fin
  );
}

export function filtrarArbol(raices: NodoAvance[], filtro: Filtro, hoy: string): NodoAvance[] {
  if (filtro === "todas") return raices;
  const cumple = (n: NodoAvance) =>
    filtro === "atrasadas" ? n.estado === "atrasada" : filtro === "terminadas" ? n.estado === "terminada" : enCurso(n, hoy);
  const podar = (nodos: NodoAvance[]): NodoAvance[] =>
    nodos.flatMap((n) => {
      if (n.esHoja) return cumple(n) ? [n] : [];
      const hijos = podar(n.hijos);
      return hijos.length > 0 ? [{ ...n, hijos }] : [];
    });
  return podar(raices);
}
```

- [ ] **Step 4: Verificar y commit**

Run: `npm test -w @pyxis/ovalle-obras -- lib/avance` → PASS.
```bash
git add apps/ovalle-obras/lib/avance
git commit -m "feat(ovalle-obras): progress, value and delay calculations"
```

---

### Task 11: Panel admin — obras e importación

**Files:**
- Create: `lib/datos/obra.ts`, `app/admin/layout.tsx`, `app/admin/page.tsx`, `app/admin/plantilla/route.ts`, `app/admin/obras/acciones.ts`, `app/admin/obras/nueva/page.tsx`, `app/admin/obras/[id]/importar/page.tsx`, `components/importacion/FormularioImportacion.tsx`
- Test: `components/importacion/FormularioImportacion.test.tsx`

**Interfaces:**
- Consumes: `crearClienteServidor` (Task 4), `exigirRol` (Task 4), `leerFilas`/`construirPlantilla` (Task 6), `validarFilas`/`PartidaImportada`/`ErrorFila` (Task 7), `calcularDiferencias`/`Diferencias` (Task 8), RPC `aplicar_importacion` (Task 9), `construirArbol`/`resumenObra` (Task 10), `hoyEnChile` (Task 5).
- Produces:
  - `type Obra = { id: string; nombre: string; estado: "activa" | "cerrada" }`
  - `type ClienteSupabase = SupabaseClient<Database>`
  - `cargarAvanceObra(supabase: ClienteSupabase, obraId: string, hoy: string): Promise<{ obra: Obra; raices: NodoAvance[]; resumen: ResumenObra } | null>` (`lib/datos/obra.ts`)
  - `type ResultadoVistaPrevia = { estado: "vista_previa"; partidas: PartidaImportada[]; errores: ErrorFila[]; diferencias: Diferencias | null } | { estado: "error"; mensaje: string }`
  - Server actions `previsualizarImportacion(formData: FormData): Promise<ResultadoVistaPrevia>` y `confirmarImportacion(formData: FormData): Promise<{ estado: "error"; mensaje: string }>` (redirige en éxito). `formData`: `archivo` (File), `nombre` (obra nueva) u `obraId` (reimportación).

- [ ] **Step 1: Carga de datos de una obra**

`apps/ovalle-obras/lib/datos/obra.ts`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { construirArbol, resumenObra } from "@/lib/avance/arbol";
import type { NodoAvance, ResumenObra } from "@/lib/avance/tipos";
import type { Database } from "@/lib/supabase/database.types";

export type ClienteSupabase = SupabaseClient<Database>;
export type Obra = { id: string; nombre: string; estado: "activa" | "cerrada" };

export async function cargarAvanceObra(
  supabase: ClienteSupabase,
  obraId: string,
  hoy: string,
): Promise<{ obra: Obra; raices: NodoAvance[]; resumen: ResumenObra } | null> {
  const [{ data: obra }, { data: partidas, error: e1 }, { data: ejecutado, error: e2 }] = await Promise.all([
    supabase.from("obras").select("id, nombre, estado").eq("id", obraId).maybeSingle(),
    supabase
      .from("partidas")
      .select("id, parent_id, codigo, descripcion, unidad, cantidad, precio_unitario, fecha_inicio, fecha_fin, orden")
      .eq("obra_id", obraId)
      .order("orden"),
    supabase.from("partida_ejecutado").select("partida_id, ejecutado").eq("obra_id", obraId),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (!obra) return null;
  const mapa = new Map((ejecutado ?? []).map((e) => [e.partida_id!, Number(e.ejecutado)]));
  const plan = (partidas ?? []).map((p) => ({
    ...p,
    cantidad: p.cantidad === null ? null : Number(p.cantidad),
    precio_unitario: p.precio_unitario === null ? null : Number(p.precio_unitario),
  }));
  const raices = construirArbol(plan, mapa, hoy);
  return { obra, raices, resumen: resumenObra(raices) };
}
```

- [ ] **Step 2: Server actions de importación**

`apps/ovalle-obras/app/admin/obras/acciones.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { leerFilas } from "@/lib/excel/leer";
import { validarFilas, type ErrorFila, type PartidaImportada } from "@/lib/excel/validar";
import { calcularDiferencias, type Diferencias } from "@/lib/excel/diferencias";

const MAX_BYTES = 4 * 1024 * 1024;

export type ResultadoVistaPrevia =
  | { estado: "vista_previa"; partidas: PartidaImportada[]; errores: ErrorFila[]; diferencias: Diferencias | null }
  | { estado: "error"; mensaje: string };

async function procesar(formData: FormData) {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Selecciona un archivo Excel." } as const;
  if (archivo.size > MAX_BYTES) return { error: "El archivo pesa más de 4 MB." } as const;
  const lectura = await leerFilas(await archivo.arrayBuffer());
  if (!lectura.ok) return { error: lectura.error } as const;
  return { archivo, ...validarFilas(lectura.filas) } as const;
}

async function diferenciasCon(obraId: string, partidas: PartidaImportada[]): Promise<Diferencias> {
  const supabase = await crearClienteServidor();
  const [{ data: existentes, error }, { data: reportes }] = await Promise.all([
    supabase
      .from("partidas")
      .select("id, codigo, descripcion, unidad, cantidad, precio_unitario, fecha_inicio, fecha_fin")
      .eq("obra_id", obraId),
    supabase.from("reportes").select("partida_id").eq("obra_id", obraId),
  ]);
  if (error) throw error;
  const conReportes = new Set((reportes ?? []).map((r) => r.partida_id));
  return calcularDiferencias(
    (existentes ?? []).map((p) => ({
      codigo: p.codigo,
      descripcion: p.descripcion,
      unidad: p.unidad,
      cantidad: p.cantidad === null ? null : Number(p.cantidad),
      precio_unitario: p.precio_unitario === null ? null : Number(p.precio_unitario),
      fecha_inicio: p.fecha_inicio,
      fecha_fin: p.fecha_fin,
      tieneReportes: conReportes.has(p.id),
    })),
    partidas,
  );
}

export async function previsualizarImportacion(formData: FormData): Promise<ResultadoVistaPrevia> {
  await exigirRol("admin");
  const r = await procesar(formData);
  if ("error" in r) return { estado: "error", mensaje: r.error! };
  const obraId = formData.get("obraId");
  const diferencias = typeof obraId === "string" && obraId ? await diferenciasCon(obraId, r.partidas) : null;
  return { estado: "vista_previa", partidas: r.partidas, errores: r.errores, diferencias };
}

export async function confirmarImportacion(formData: FormData): Promise<{ estado: "error"; mensaje: string }> {
  await exigirRol("admin");
  const r = await procesar(formData);
  if ("error" in r) return { estado: "error", mensaje: r.error! };
  if (r.errores.length > 0) return { estado: "error", mensaje: "El archivo tiene errores; corrígelos y vuelve a subirlo." };

  const obraIdForm = formData.get("obraId");
  const obraId = typeof obraIdForm === "string" && obraIdForm ? obraIdForm : null;
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!obraId && !nombre) return { estado: "error", mensaje: "Ponle un nombre a la obra." };

  const supabase = await crearClienteServidor();
  const ruta = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.xlsx`;
  const subida = await supabase.storage.from("importaciones").upload(ruta, r.archivo, {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  if (subida.error) return { estado: "error", mensaje: "No se pudo guardar el archivo. Intenta de nuevo." };

  const { data, error } = await supabase.rpc("aplicar_importacion", {
    p_obra_id: obraId,
    p_nombre: obraId ? null : nombre,
    p_partidas: r.partidas,
    p_archivo_path: ruta,
  });
  if (error || !data) return { estado: "error", mensaje: error?.message ?? "No se pudo importar." };

  revalidatePath("/admin");
  redirect(`/admin/obras/${data}`);
}
```
Si los tipos generados declaran `p_obra_id`/`p_nombre` como `string` no anulable, castear con `as unknown as string` en esas dos claves (Postgres sí acepta `null`).

- [ ] **Step 3: Test del formulario (falla)**

`apps/ovalle-obras/components/importacion/FormularioImportacion.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormularioImportacion } from "./FormularioImportacion";

const previsualizarImportacion = jest.fn();
const confirmarImportacion = jest.fn();
jest.mock("@/app/admin/obras/acciones", () => ({
  previsualizarImportacion: (fd: FormData) => previsualizarImportacion(fd),
  confirmarImportacion: (fd: FormData) => confirmarImportacion(fd),
}));

const archivo = new File(["x"], "obra.xlsx");
const partida = {
  codigo: "1.1", codigo_padre: "1", descripcion: "Enfierradura", unidad: "kg", cantidad: 4200,
  precio_unitario: 1150, fecha_inicio: "2026-11-03", fecha_fin: "2026-11-14", orden: 1,
};

describe("FormularioImportacion", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra los errores por fila y no deja confirmar", async () => {
    previsualizarImportacion.mockResolvedValue({
      estado: "vista_previa", partidas: [partida], errores: [{ fila: 7, mensaje: "Fecha fin es anterior a fecha inicio." }], diferencias: null,
    });
    render(<FormularioImportacion />);
    await userEvent.type(screen.getByLabelText("Nombre de la obra"), "Edificio Ñuñoa");
    await userEvent.upload(screen.getByLabelText("Archivo Excel"), archivo);
    await userEvent.click(screen.getByRole("button", { name: "Revisar archivo" }));
    expect(await screen.findByText("Fila 7: Fecha fin es anterior a fecha inicio.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear obra" })).toBeDisabled();
  });

  it("confirma enviando el mismo archivo y el nombre", async () => {
    previsualizarImportacion.mockResolvedValue({ estado: "vista_previa", partidas: [partida], errores: [], diferencias: null });
    confirmarImportacion.mockResolvedValue({ estado: "error", mensaje: "x" });
    render(<FormularioImportacion />);
    await userEvent.type(screen.getByLabelText("Nombre de la obra"), "Edificio Ñuñoa");
    await userEvent.upload(screen.getByLabelText("Archivo Excel"), archivo);
    await userEvent.click(screen.getByRole("button", { name: "Revisar archivo" }));
    expect(await screen.findByText("Enfierradura")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Crear obra" }));
    const fd: FormData = confirmarImportacion.mock.calls[0][0];
    expect(fd.get("nombre")).toBe("Edificio Ñuñoa");
    expect((fd.get("archivo") as File).name).toBe("obra.xlsx");
  });

  it("en reimportación muestra el resumen de cambios y los bloqueos", async () => {
    previsualizarImportacion.mockResolvedValue({
      estado: "vista_previa", partidas: [partida], errores: [],
      diferencias: { agregadas: ["1.3"], modificadas: ["1.1"], eliminadas: ["1.2"], bloqueadas: ["1.2"] },
    });
    render(<FormularioImportacion obraId="o1" />);
    await userEvent.upload(screen.getByLabelText("Archivo Excel"), archivo);
    await userEvent.click(screen.getByRole("button", { name: "Revisar archivo" }));
    expect(await screen.findByText("1 nuevas · 1 modificadas · 1 eliminadas")).toBeInTheDocument();
    expect(screen.getByText(/tienen reportes y no se pueden eliminar ni volverse capítulo: 1\.2/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aplicar cambios" })).toBeDisabled();
  });
});
```

Run: `npm test -w @pyxis/ovalle-obras -- components/importacion` → FAIL.

- [ ] **Step 4: Componente de importación**

`apps/ovalle-obras/components/importacion/FormularioImportacion.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { confirmarImportacion, previsualizarImportacion, type ResultadoVistaPrevia } from "@/app/admin/obras/acciones";
import { formatoCantidad, formatoCLP, formatoFecha } from "@/lib/formato";

export function FormularioImportacion({ obraId }: { obraId?: string }) {
  const [nombre, setNombre] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoVistaPrevia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function datos(): FormData {
    const fd = new FormData();
    if (archivo) fd.set("archivo", archivo);
    if (obraId) fd.set("obraId", obraId);
    else fd.set("nombre", nombre);
    return fd;
  }

  function revisar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    iniciar(async () => setResultado(await previsualizarImportacion(datos())));
  }

  function confirmar() {
    setError(null);
    iniciar(async () => {
      const r = await confirmarImportacion(datos());
      setError(r.mensaje);
    });
  }

  const vista = resultado?.estado === "vista_previa" ? resultado : null;
  const bloqueadas = vista?.diferencias?.bloqueadas ?? [];
  const puedeConfirmar = !!vista && vista.errores.length === 0 && bloqueadas.length === 0 && !pendiente;

  return (
    <div className="space-y-6">
      <form onSubmit={revisar} className="flex flex-wrap items-end gap-4">
        {!obraId && (
          <label className="flex flex-col text-sm">
            Nombre de la obra
            <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 w-72 rounded border border-obra-line bg-white px-3 py-2" />
          </label>
        )}
        <label className="flex flex-col text-sm">
          Archivo Excel
          <input
            type="file"
            required
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setResultado(null); }}
            className="mt-1"
          />
        </label>
        <button disabled={pendiente} className="rounded bg-obra-fg px-4 py-2 text-white disabled:opacity-60">Revisar archivo</button>
        <a href="/admin/plantilla" className="text-sm underline">Descargar plantilla</a>
      </form>

      {resultado?.estado === "error" && <p role="alert" className="text-obra-warn">{resultado.mensaje}</p>}

      {vista && (
        <section className="space-y-4">
          {vista.diferencias && (
            <p className="font-medium">
              {vista.diferencias.agregadas.length} nuevas · {vista.diferencias.modificadas.length} modificadas · {vista.diferencias.eliminadas.length} eliminadas
            </p>
          )}
          {bloqueadas.length > 0 && (
            <p role="alert" className="text-obra-warn">
              Estas partidas tienen reportes y no se pueden eliminar ni volverse capítulo: {bloqueadas.join(", ")}
            </p>
          )}
          {vista.errores.length > 0 && (
            <ul role="alert" className="list-disc pl-6 text-obra-warn">
              {vista.errores.map((e) => <li key={`${e.fila}-${e.mensaje}`}>Fila {e.fila}: {e.mensaje}</li>)}
            </ul>
          )}
          <div className="max-h-[50vh] overflow-auto rounded border border-obra-line bg-white">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-obra-bg text-left">
                <tr>{["Código", "Descripción", "Unidad", "Cantidad", "Precio unitario", "Inicio", "Fin"].map((t) => <th key={t} className="px-2 py-1">{t}</th>)}</tr>
              </thead>
              <tbody>
                {vista.partidas.map((p) => (
                  <tr key={p.codigo} className={p.cantidad === null ? "font-semibold" : ""}>
                    <td className="px-2 py-1">{p.codigo}</td>
                    <td className="px-2 py-1" style={{ paddingLeft: `${p.codigo.split(".").length * 0.75}rem` }}>{p.descripcion}</td>
                    <td className="px-2 py-1">{p.unidad ?? ""}</td>
                    <td className="px-2 py-1 text-right">{p.cantidad === null ? "" : formatoCantidad(p.cantidad)}</td>
                    <td className="px-2 py-1 text-right">{p.precio_unitario === null ? "" : formatoCLP(p.precio_unitario)}</td>
                    <td className="px-2 py-1">{p.cantidad === null ? "" : formatoFecha(p.fecha_inicio)}</td>
                    <td className="px-2 py-1">{p.cantidad === null ? "" : formatoFecha(p.fecha_fin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={confirmar} disabled={!puedeConfirmar} className="rounded bg-obra-accent px-4 py-2 font-semibold text-white disabled:opacity-40">
            {obraId ? "Aplicar cambios" : "Crear obra"}
          </button>
        </section>
      )}
      {error && <p role="alert" className="text-obra-warn">{error}</p>}
    </div>
  );
}
```

Run: `npm test -w @pyxis/ovalle-obras -- components/importacion` → PASS.

- [ ] **Step 5: Páginas, layout y plantilla**

`apps/ovalle-obras/app/admin/layout.tsx`:
```tsx
import Link from "next/link";
import { exigirRol } from "@/lib/auth/sesion";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const perfil = await exigirRol("admin");
  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-6 border-b border-obra-line bg-white px-6 py-3">
        <span className="font-bold">Ovalle Obras</span>
        <Link href="/admin">Obras</Link>
        <Link href="/admin/usuarios">Usuarios</Link>
        <span className="ml-auto text-sm">{perfil.nombre}</span>
        <form action="/salir" method="post"><button className="text-sm underline">Salir</button></form>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
```

`apps/ovalle-obras/app/admin/page.tsx`:
```tsx
import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cargarAvanceObra } from "@/lib/datos/obra";
import { hoyEnChile } from "@/lib/fechas";
import { formatoPorcentaje } from "@/lib/formato";

export default async function Obras() {
  const supabase = await crearClienteServidor();
  const { data: obras } = await supabase.from("obras").select("id, nombre, estado").order("creado_en", { ascending: false });
  const hoy = hoyEnChile();
  const avances = await Promise.all((obras ?? []).map((o) => cargarAvanceObra(supabase, o.id, hoy)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Obras</h1>
        <Link href="/admin/obras/nueva" className="rounded bg-obra-accent px-4 py-2 font-semibold text-white">Nueva obra</Link>
      </div>
      {(obras ?? []).length === 0 ? (
        <p>Aún no hay obras. Crea la primera subiendo su Excel de presupuesto.</p>
      ) : (
        <ul className="divide-y divide-obra-line rounded border border-obra-line bg-white">
          {(obras ?? []).map((o, i) => (
            <li key={o.id}>
              <Link href={`/admin/obras/${o.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-obra-bg">
                <span className="flex-1 font-medium">{o.nombre}</span>
                {o.estado === "cerrada" && <span className="text-xs uppercase">Cerrada</span>}
                <span className="tabular-nums">{formatoPorcentaje(avances[i]?.resumen.porcentajeFisico ?? 0)}</span>
                <span className="text-sm text-obra-warn">{avances[i]?.resumen.atrasadas ? `${avances[i]!.resumen.atrasadas} atrasadas` : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

`apps/ovalle-obras/app/admin/obras/nueva/page.tsx`:
```tsx
import { FormularioImportacion } from "@/components/importacion/FormularioImportacion";

export default function NuevaObra() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nueva obra</h1>
      <FormularioImportacion />
    </div>
  );
}
```

`apps/ovalle-obras/app/admin/obras/[id]/importar/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { FormularioImportacion } from "@/components/importacion/FormularioImportacion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export default async function Reimportar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const { data: obra } = await supabase.from("obras").select("nombre").eq("id", id).maybeSingle();
  if (!obra) notFound();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reimportar Excel — {obra.nombre}</h1>
      <p className="text-sm">Las partidas se cruzan por código. El avance ya reportado se conserva.</p>
      <FormularioImportacion obraId={id} />
    </div>
  );
}
```

`apps/ovalle-obras/app/admin/plantilla/route.ts`:
```ts
import { exigirRol } from "@/lib/auth/sesion";
import { construirPlantilla } from "@/lib/excel/plantilla";

export async function GET() {
  await exigirRol("admin");
  const archivo = await construirPlantilla();
  return new Response(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-presupuesto-ovalle.xlsx"',
    },
  });
}
```

- [ ] **Step 6: Verificar**

Run: `npm test -w @pyxis/ovalle-obras`, `npm run lint -w @pyxis/ovalle-obras`, `npm run build -w @pyxis/ovalle-obras` → OK.
Manual (con `db:start` y `dev`): ingresar como admin → "Nueva obra" → descargar plantilla → subirla → vista previa con 3 filas → "Crear obra" → redirige a `/admin/obras/<id>` (404 hasta Task 12; la obra aparece en `/admin`).

- [ ] **Step 7: Commit**

```bash
git add apps/ovalle-obras
git commit -m "feat(ovalle-obras): admin obras list and Excel import with preview"
```

---

### Task 12: Dashboard de obra — indicadores, tabla y filtros

**Files:**
- Create: `app/admin/obras/[id]/page.tsx`, `app/admin/obras/[id]/acciones.ts`, `components/dashboard/Indicadores.tsx`, `components/dashboard/TablaAvance.tsx`, `components/dashboard/Pestanas.tsx`
- Test: `components/dashboard/TablaAvance.test.tsx`

**Interfaces:**
- Consumes: `cargarAvanceObra` (Task 11), `aplanar` (Task 10), `filtrarArbol`/`Filtro` (Task 10), formato (Task 1).
- Produces:
  - `Indicadores({ resumen }: { resumen: ResumenObra })`
  - `TablaAvance({ raices }: { raices: NodoAvance[] })`
  - `Pestanas({ obraId, vista, filtro }: { obraId: string; vista: Vista; filtro: Filtro })`, `type Vista = "tabla" | "gantt" | "feed"`
  - Server actions `cambiarEstadoObra(obraId: string, estado: "activa" | "cerrada"): Promise<void>` y `anularReporte(reporteId: string, obraId: string): Promise<void>` (la segunda se usa en Task 14)
  - La página lee `?vista=` y `?filtro=`; Task 13 y 14 agregan las ramas `gantt` y `feed`.

- [ ] **Step 1: Test de la tabla (falla)**

`apps/ovalle-obras/components/dashboard/TablaAvance.test.tsx`:
```tsx
import { render, screen, within } from "@testing-library/react";
import { construirArbol } from "@/lib/avance/arbol";
import { TablaAvance } from "./TablaAvance";

const raices = construirArbol(
  [
    { id: "c", parent_id: null, codigo: "1", descripcion: "Obra gruesa", unidad: null, cantidad: null, precio_unitario: null, fecha_inicio: null, fecha_fin: null, orden: 0 },
    { id: "h", parent_id: "c", codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg", cantidad: 4200, precio_unitario: 1150, fecha_inicio: "2026-11-01", fecha_fin: "2026-11-11", orden: 1 },
  ],
  new Map([["h", 1050]]),
  "2026-11-06",
);

describe("TablaAvance", () => {
  it("muestra cada partida con presupuestado, ejecutado, %, monto y estado", () => {
    render(<TablaAvance raices={raices} />);
    const fila = screen.getByRole("row", { name: /Enfierradura losa P3/ });
    expect(within(fila).getByText("4.200 kg")).toBeInTheDocument();
    expect(within(fila).getByText("1.050 kg")).toBeInTheDocument();
    expect(within(fila).getByText("25,0%")).toBeInTheDocument();
    expect(within(fila).getByText("$1.207.500")).toBeInTheDocument();
    expect(within(fila).getByText("Atrasada")).toBeInTheDocument();
  });

  it("muestra los capítulos con su total en pesos", () => {
    render(<TablaAvance raices={raices} />);
    const fila = screen.getByRole("row", { name: /Obra gruesa/ });
    expect(within(fila).getByText("$4.830.000")).toBeInTheDocument();
  });

  it("avisa cuando el filtro no deja partidas", () => {
    render(<TablaAvance raices={[]} />);
    expect(screen.getByText("No hay partidas para este filtro.")).toBeInTheDocument();
  });
});
```

Run: `npm test -w @pyxis/ovalle-obras -- components/dashboard/TablaAvance` → FAIL.

- [ ] **Step 2: Componentes**

`apps/ovalle-obras/components/dashboard/TablaAvance.tsx`:
```tsx
import { aplanar } from "@/lib/avance/arbol";
import type { Estado, NodoAvance } from "@/lib/avance/tipos";
import { formatoCantidad, formatoCLP, formatoFecha, formatoPorcentaje } from "@/lib/formato";

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  al_dia: "Al día",
  atrasada: "Atrasada",
  terminada: "Terminada",
  sin_fechas: "Sin fechas",
};

const COLOR_ESTADO: Record<Estado, string> = {
  al_dia: "bg-obra-bg",
  atrasada: "bg-red-100 text-obra-warn",
  terminada: "bg-green-100 text-obra-ok",
  sin_fechas: "bg-obra-bg text-gray-500",
};

export function TablaAvance({ raices }: { raices: NodoAvance[] }) {
  const filas = aplanar(raices);
  if (filas.length === 0) return <p>No hay partidas para este filtro.</p>;
  return (
    <div className="overflow-auto rounded border border-obra-line bg-white">
      <table className="w-full text-sm">
        <thead className="bg-obra-bg text-left">
          <tr>
            {["Código", "Partida", "Presupuestado", "Ejecutado", "Avance", "$ Presupuesto", "$ Ejecutado", "Plazo", "Estado"].map((t) => (
              <th key={t} className="px-3 py-2 font-medium">{t}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-obra-line">
          {filas.map((n) => (
            <tr key={n.id} className={n.esHoja ? "" : "bg-obra-bg/60 font-semibold"}>
              <td className="px-3 py-2 tabular-nums">{n.codigo}</td>
              <td className="px-3 py-2" style={{ paddingLeft: `${0.75 + n.nivel * 1.25}rem` }}>{n.descripcion}</td>
              <td className="px-3 py-2 text-right tabular-nums">{n.esHoja ? `${formatoCantidad(n.cantidad!)} ${n.unidad}` : ""}</td>
              <td className="px-3 py-2 text-right tabular-nums">{n.esHoja ? `${formatoCantidad(n.ejecutado)} ${n.unidad}` : ""}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 rounded bg-obra-line">
                    <div className="h-2 rounded bg-obra-accent" style={{ width: `${Math.min(n.porcentaje, 1) * 100}%` }} />
                  </div>
                  <span className="tabular-nums">{formatoPorcentaje(n.porcentaje)}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatoCLP(n.montoPresupuestado)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatoCLP(n.montoEjecutado)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{n.esHoja && n.fecha_inicio ? `${formatoFecha(n.fecha_inicio)} → ${formatoFecha(n.fecha_fin)}` : ""}</td>
              <td className="px-3 py-2">
                <span className={`rounded px-2 py-0.5 text-xs ${COLOR_ESTADO[n.estado]}`}>{ETIQUETA_ESTADO[n.estado]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

`apps/ovalle-obras/components/dashboard/Indicadores.tsx`:
```tsx
import type { ResumenObra } from "@/lib/avance/tipos";
import { formatoCLP, formatoPorcentaje } from "@/lib/formato";

export function Indicadores({ resumen }: { resumen: ResumenObra }) {
  const tarjetas = [
    { titulo: "Avance físico", valor: formatoPorcentaje(resumen.porcentajeFisico), detalle: "ponderado por monto" },
    { titulo: "Ejecutado", valor: formatoCLP(resumen.montoEjecutado), detalle: `de ${formatoCLP(resumen.montoPresupuestado)}` },
    { titulo: "Partidas atrasadas", valor: String(resumen.atrasadas), detalle: `de ${resumen.hojas}` },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {tarjetas.map((t) => (
        <div key={t.titulo} className="rounded border border-obra-line bg-white p-4">
          <p className="text-sm text-gray-600">{t.titulo}</p>
          <p className="text-3xl font-bold tabular-nums">{t.valor}</p>
          <p className="text-sm text-gray-600">{t.detalle}</p>
        </div>
      ))}
    </div>
  );
}
```

`apps/ovalle-obras/components/dashboard/Pestanas.tsx`:
```tsx
import Link from "next/link";
import type { Filtro } from "@/lib/avance/filtros";

export type Vista = "tabla" | "gantt" | "feed";

const VISTAS: { valor: Vista; texto: string }[] = [
  { valor: "tabla", texto: "Tabla" },
  { valor: "gantt", texto: "Gantt" },
  { valor: "feed", texto: "Reportes" },
];
const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: "todas", texto: "Todas" },
  { valor: "atrasadas", texto: "Atrasadas" },
  { valor: "en_curso", texto: "En curso" },
  { valor: "terminadas", texto: "Terminadas" },
];

export function Pestanas({ obraId, vista, filtro }: { obraId: string; vista: Vista; filtro: Filtro }) {
  const href = (v: Vista, f: Filtro) => `/admin/obras/${obraId}?vista=${v}&filtro=${f}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-obra-line">
      <nav className="flex gap-1">
        {VISTAS.map((v) => (
          <Link key={v.valor} href={href(v.valor, filtro)} className={`px-4 py-2 ${vista === v.valor ? "border-b-2 border-obra-accent font-semibold" : ""}`}>
            {v.texto}
          </Link>
        ))}
      </nav>
      {vista !== "feed" && (
        <nav className="flex gap-2 text-sm">
          {FILTROS.map((f) => (
            <Link key={f.valor} href={href(vista, f.valor)} className={`rounded px-3 py-1 ${filtro === f.valor ? "bg-obra-fg text-white" : "bg-white"}`}>
              {f.texto}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
```

`apps/ovalle-obras/app/admin/obras/[id]/acciones.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export async function cambiarEstadoObra(obraId: string, estado: "activa" | "cerrada"): Promise<void> {
  await exigirRol("admin");
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("obras").update({ estado }).eq("id", obraId);
  if (error) throw error;
  revalidatePath(`/admin/obras/${obraId}`);
  revalidatePath("/admin");
}

export async function anularReporte(reporteId: string, obraId: string): Promise<void> {
  const perfil = await exigirRol("admin");
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("reportes")
    .update({ anulado: true, anulado_por: perfil.id, anulado_en: new Date().toISOString() })
    .eq("id", reporteId);
  if (error) throw error;
  revalidatePath(`/admin/obras/${obraId}`);
}
```

`apps/ovalle-obras/app/admin/obras/[id]/page.tsx`:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Indicadores } from "@/components/dashboard/Indicadores";
import { Pestanas, type Vista } from "@/components/dashboard/Pestanas";
import { TablaAvance } from "@/components/dashboard/TablaAvance";
import { filtrarArbol, type Filtro } from "@/lib/avance/filtros";
import { cargarAvanceObra } from "@/lib/datos/obra";
import { hoyEnChile } from "@/lib/fechas";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cambiarEstadoObra } from "./acciones";

const VISTAS: Vista[] = ["tabla", "gantt", "feed"];
const FILTROS: Filtro[] = ["todas", "atrasadas", "en_curso", "terminadas"];

export default async function DashboardObra({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vista?: string; filtro?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const vista: Vista = VISTAS.includes(q.vista as Vista) ? (q.vista as Vista) : "tabla";
  const filtro: Filtro = FILTROS.includes(q.filtro as Filtro) ? (q.filtro as Filtro) : "todas";
  const hoy = hoyEnChile();
  const supabase = await crearClienteServidor();
  const datos = await cargarAvanceObra(supabase, id, hoy);
  if (!datos) notFound();
  const { obra, raices, resumen } = datos;
  const filtradas = filtrarArbol(raices, filtro, hoy);
  const siguienteEstado = obra.estado === "activa" ? "cerrada" : "activa";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">{obra.nombre}{obra.estado === "cerrada" && " (cerrada)"}</h1>
        <a href={`/admin/obras/${id}/exportar/excel`} className="rounded border border-obra-line bg-white px-3 py-2 text-sm">Exportar Excel</a>
        <a href={`/admin/obras/${id}/exportar/pdf`} className="rounded border border-obra-line bg-white px-3 py-2 text-sm">Exportar PDF</a>
        <Link href={`/admin/obras/${id}/importar`} className="rounded border border-obra-line bg-white px-3 py-2 text-sm">Reimportar Excel</Link>
        <form action={cambiarEstadoObra.bind(null, id, siguienteEstado)}>
          <button className="rounded border border-obra-line bg-white px-3 py-2 text-sm">
            {obra.estado === "activa" ? "Cerrar obra" : "Reabrir obra"}
          </button>
        </form>
      </div>
      <Indicadores resumen={resumen} />
      <Pestanas obraId={id} vista={vista} filtro={filtro} />
      {vista === "tabla" && <TablaAvance raices={filtradas} />}
    </div>
  );
}
```

- [ ] **Step 3: Verificar**

Run: `npm test -w @pyxis/ovalle-obras`, `npm run lint -w @pyxis/ovalle-obras`, `npm run build -w @pyxis/ovalle-obras` → OK.
Manual: la obra creada en Task 11 muestra indicadores en 0 % y la tabla; los filtros cambian las filas; "Cerrar obra" la marca cerrada.

- [ ] **Step 4: Commit**

```bash
git add apps/ovalle-obras
git commit -m "feat(ovalle-obras): obra dashboard with KPIs, progress table and filters"
```

---

### Task 13: Gantt

**Files:**
- Create: `lib/gantt/escala.ts`, `components/dashboard/Gantt.tsx`
- Modify: `app/admin/obras/[id]/page.tsx` (rama `vista === "gantt"`)
- Test: `lib/gantt/escala.test.ts`, `components/dashboard/Gantt.test.tsx`

**Interfaces:**
- Consumes: `NodoAvance`, `aplanar` (Task 10), `diasEntre` (Task 5).
- Produces:
  - `type Rango = { desde: string; hasta: string; dias: number }`
  - `rangoDe(nodos: NodoAvance[]): Rango | null`, `posicionBarra(inicio: string, fin: string, rango: Rango): { izquierda: number; ancho: number }` (fracciones 0–1), `posicionDia(dia: string, rango: Rango): number | null`, `meses(rango: Rango): { etiqueta: string; izquierda: number }[]`
  - `Gantt({ raices, hoy }: { raices: NodoAvance[]; hoy: string })`

- [ ] **Step 1: Tests (fallan)**

`apps/ovalle-obras/lib/gantt/escala.test.ts`:
```ts
/** @jest-environment node */
import { construirArbol } from "@/lib/avance/arbol";
import { meses, posicionBarra, posicionDia, rangoDe } from "./escala";

const hoja = (id: string, inicio: string | null, fin: string | null) => ({
  id, parent_id: null, codigo: id, descripcion: id, unidad: "m2", cantidad: 1, precio_unitario: 1,
  fecha_inicio: inicio, fecha_fin: fin, orden: 0,
});

describe("escala del Gantt", () => {
  const nodos = construirArbol([hoja("a", "2026-11-01", "2026-11-10"), hoja("b", "2026-11-21", "2026-11-30"), hoja("c", null, null)], new Map(), "2026-11-05");
  const rango = rangoDe(nodos)!;

  it("cubre desde el primer inicio hasta el último fin, días inclusivos", () => {
    expect(rango).toEqual({ desde: "2026-11-01", hasta: "2026-11-30", dias: 30 });
  });

  it("ubica barras como fracción del rango", () => {
    expect(posicionBarra("2026-11-01", "2026-11-10", rango)).toEqual({ izquierda: 0, ancho: 10 / 30 });
    expect(posicionBarra("2026-11-21", "2026-11-30", rango)).toEqual({ izquierda: 20 / 30, ancho: 10 / 30 });
  });

  it("ubica el día de hoy o null si está fuera", () => {
    expect(posicionDia("2026-11-16", rango)).toBeCloseTo(15.5 / 30);
    expect(posicionDia("2027-01-01", rango)).toBeNull();
  });

  it("sin fechas no hay rango", () => {
    expect(rangoDe(construirArbol([hoja("c", null, null)], new Map(), "2026-11-05"))).toBeNull();
  });

  it("marca el inicio de cada mes", () => {
    const r = { desde: "2026-11-20", hasta: "2026-12-09", dias: 20 };
    expect(meses(r)).toEqual([
      { etiqueta: "nov 2026", izquierda: 0 },
      { etiqueta: "dic 2026", izquierda: 11 / 20 },
    ]);
  });
});
```

`apps/ovalle-obras/components/dashboard/Gantt.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { construirArbol } from "@/lib/avance/arbol";
import { Gantt } from "./Gantt";

describe("Gantt", () => {
  it("dibuja una barra por partida con fechas y su avance real", () => {
    const raices = construirArbol(
      [{ id: "h", parent_id: null, codigo: "1.1", descripcion: "Enfierradura", unidad: "kg", cantidad: 100, precio_unitario: 1, fecha_inicio: "2026-11-01", fecha_fin: "2026-11-10", orden: 0 }],
      new Map([["h", 40]]),
      "2026-11-05",
    );
    render(<Gantt raices={raices} hoy="2026-11-05" />);
    expect(screen.getByText("1.1 Enfierradura")).toBeInTheDocument();
    expect(screen.getByLabelText("Avance 40,0%")).toHaveStyle({ width: "40%" });
    expect(screen.getByLabelText("Hoy")).toBeInTheDocument();
  });

  it("explica cuando no hay fechas", () => {
    render(<Gantt raices={[]} hoy="2026-11-05" />);
    expect(screen.getByText("Las partidas no tienen fechas: no hay Gantt que mostrar.")).toBeInTheDocument();
  });
});
```

Run: `npm test -w @pyxis/ovalle-obras -- gantt Gantt` → FAIL.

- [ ] **Step 2: Implementar**

`apps/ovalle-obras/lib/gantt/escala.ts`:
```ts
import { aplanar } from "@/lib/avance/arbol";
import type { NodoAvance } from "@/lib/avance/tipos";
import { diasEntre } from "@/lib/fechas";

export type Rango = { desde: string; hasta: string; dias: number };

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function rangoDe(nodos: NodoAvance[]): Rango | null {
  const conFechas = aplanar(nodos).filter((n) => n.esHoja && n.fecha_inicio && n.fecha_fin);
  if (conFechas.length === 0) return null;
  const desde = conFechas.map((n) => n.fecha_inicio!).sort()[0];
  const hasta = conFechas.map((n) => n.fecha_fin!).sort().at(-1)!;
  return { desde, hasta, dias: diasEntre(desde, hasta) + 1 };
}

export function posicionBarra(inicio: string, fin: string, rango: Rango) {
  return {
    izquierda: diasEntre(rango.desde, inicio) / rango.dias,
    ancho: (diasEntre(inicio, fin) + 1) / rango.dias,
  };
}

/** Centro del día dentro del rango, o null si queda fuera. */
export function posicionDia(dia: string, rango: Rango): number | null {
  const d = diasEntre(rango.desde, dia);
  if (d < 0 || d >= rango.dias) return null;
  return (d + 0.5) / rango.dias;
}

export function meses(rango: Rango): { etiqueta: string; izquierda: number }[] {
  const resultado: { etiqueta: string; izquierda: number }[] = [];
  let [a, m] = rango.desde.split("-").map(Number);
  let dia = rango.desde;
  while (dia <= rango.hasta) {
    resultado.push({ etiqueta: `${MESES[m - 1]} ${a}`, izquierda: diasEntre(rango.desde, dia) / rango.dias });
    m += 1;
    if (m > 12) { m = 1; a += 1; }
    dia = `${a}-${String(m).padStart(2, "0")}-01`;
  }
  return resultado;
}
```

`apps/ovalle-obras/components/dashboard/Gantt.tsx`:
```tsx
import { aplanar } from "@/lib/avance/arbol";
import type { NodoAvance } from "@/lib/avance/tipos";
import { formatoPorcentaje } from "@/lib/formato";
import { meses, posicionBarra, posicionDia, rangoDe } from "@/lib/gantt/escala";

const pct = (f: number) => `${f * 100}%`;

export function Gantt({ raices, hoy }: { raices: NodoAvance[]; hoy: string }) {
  const rango = rangoDe(raices);
  if (!rango) return <p>Las partidas no tienen fechas: no hay Gantt que mostrar.</p>;
  const filas = aplanar(raices).filter((n) => !n.esHoja || (n.fecha_inicio && n.fecha_fin));
  const xHoy = posicionDia(hoy, rango);

  return (
    <div className="overflow-x-auto rounded border border-obra-line bg-white">
      <div className="min-w-[900px]">
        <div className="flex border-b border-obra-line text-xs text-gray-600">
          <div className="w-80 shrink-0 px-3 py-2">Partida</div>
          <div className="relative h-8 flex-1">
            {meses(rango).map((m) => (
              <span key={m.etiqueta} className="absolute top-2 border-l border-obra-line pl-1" style={{ left: pct(m.izquierda) }}>{m.etiqueta}</span>
            ))}
          </div>
        </div>
        {filas.map((n) => {
          const barra = n.esHoja ? posicionBarra(n.fecha_inicio!, n.fecha_fin!, rango) : null;
          const color = n.estado === "atrasada" ? "bg-obra-warn" : n.estado === "terminada" ? "bg-obra-ok" : "bg-obra-accent";
          return (
            <div key={n.id} className="flex border-b border-obra-line/60 text-sm">
              <div className={`w-80 shrink-0 truncate px-3 py-1.5 ${n.esHoja ? "" : "font-semibold"}`} style={{ paddingLeft: `${0.75 + n.nivel}rem` }}>
                {n.codigo} {n.descripcion}
              </div>
              <div className="relative flex-1">
                {barra && (
                  <div className="absolute top-1.5 h-4 rounded bg-obra-line" style={{ left: pct(barra.izquierda), width: pct(barra.ancho) }}>
                    <div aria-label={`Avance ${formatoPorcentaje(n.porcentaje)}`} className={`h-4 rounded ${color}`} style={{ width: pct(Math.min(n.porcentaje, 1)) }} />
                  </div>
                )}
                {xHoy !== null && <div aria-hidden className="absolute inset-y-0 w-px bg-obra-warn/70" style={{ left: pct(xHoy) }} />}
              </div>
            </div>
          );
        })}
        {xHoy !== null && <p aria-label="Hoy" className="px-3 py-1 text-xs text-obra-warn">Línea roja: hoy</p>}
      </div>
    </div>
  );
}
```

`apps/ovalle-obras/app/admin/obras/[id]/page.tsx` — agregar el import y la rama, bajo la de tabla:
```tsx
import { Gantt } from "@/components/dashboard/Gantt";
// ...
      {vista === "gantt" && <Gantt raices={filtradas} hoy={hoy} />}
```

- [ ] **Step 3: Verificar y commit**

Run: `npm test -w @pyxis/ovalle-obras` → PASS. `npm run lint -w @pyxis/ovalle-obras` → OK.
```bash
git add apps/ovalle-obras
git commit -m "feat(ovalle-obras): read-only Gantt with actual progress"
```

---

### Task 14: Feed en vivo y anulación

**Files:**
- Create: `lib/datos/feed.ts`, `components/dashboard/Feed.tsx`, `components/dashboard/BotonAnular.tsx`, `components/dashboard/RefrescoEnVivo.tsx`
- Modify: `app/admin/obras/[id]/page.tsx` (rama `feed` + `<RefrescoEnVivo>` siempre visible)
- Test: `components/dashboard/RefrescoEnVivo.test.tsx`, `components/dashboard/Feed.test.tsx`

**Interfaces:**
- Consumes: `anularReporte` (Task 12), `crearClienteNavegador` (Task 4), `ClienteSupabase` (Task 11).
- Produces:
  - `type ReporteFeed = { id: string; cantidad: number; comentario: string | null; creado_en: string; anulado: boolean; fotoUrl: string | null; partida: { codigo: string; descripcion: string; unidad: string | null }; autor: string }`
  - `cargarFeed(supabase: ClienteSupabase, filtro: { obraId?: string; autorId?: string }, limite?: number): Promise<ReporteFeed[]>` (Task 18 reutiliza `autorId`)
  - `Feed({ reportes, obraId }: { reportes: ReporteFeed[]; obraId: string })`
  - `RefrescoEnVivo({ obraId }: { obraId: string })`

- [ ] **Step 1: Tests (fallan)**

`apps/ovalle-obras/components/dashboard/RefrescoEnVivo.test.tsx`:
```tsx
import { act, render, screen } from "@testing-library/react";
import { RefrescoEnVivo } from "./RefrescoEnVivo";

const refresh = jest.fn();
let alCambiar: () => void = () => {};
let alEstado: (s: string) => void = () => {};
const canal = {
  on: jest.fn((_t: string, _f: unknown, cb: () => void) => { alCambiar = cb; return canal; }),
  subscribe: jest.fn((cb: (s: string) => void) => { alEstado = cb; return canal; }),
};
const removeChannel = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("@/lib/supabase/navegador", () => ({
  crearClienteNavegador: () => ({ channel: () => canal, removeChannel }),
}));

describe("RefrescoEnVivo", () => {
  beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
  afterEach(() => jest.useRealTimers());

  it("escucha solo los reportes de esta obra", () => {
    render(<RefrescoEnVivo obraId="o1" />);
    expect(canal.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "reportes", filter: "obra_id=eq.o1" },
      expect.any(Function),
    );
  });

  it("refresca (agrupando ráfagas) cuando llega un reporte", () => {
    render(<RefrescoEnVivo obraId="o1" />);
    act(() => { alEstado("SUBSCRIBED"); alCambiar(); alCambiar(); jest.advanceTimersByTime(1000); });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("avisa al perder conexión y recarga al volver", () => {
    render(<RefrescoEnVivo obraId="o1" />);
    act(() => alEstado("SUBSCRIBED"));
    expect(screen.getByText("En vivo")).toBeInTheDocument();
    act(() => alEstado("CHANNEL_ERROR"));
    expect(screen.getByText("Reconectando…")).toBeInTheDocument();
    act(() => { alEstado("SUBSCRIBED"); jest.advanceTimersByTime(1000); });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
```

`apps/ovalle-obras/components/dashboard/Feed.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { Feed } from "./Feed";

jest.mock("@/app/admin/obras/[id]/acciones", () => ({ anularReporte: jest.fn() }));

const base = {
  id: "r1", cantidad: 20, comentario: "Sector norte listo", creado_en: "2026-11-05T14:32:00Z", anulado: false,
  fotoUrl: "https://x/foto.jpg", partida: { codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg" }, autor: "Juan Pérez",
};

describe("Feed", () => {
  it("muestra autor, partida, cantidad, comentario, foto y hora de Chile", () => {
    render(<Feed reportes={[base]} obraId="o1" />);
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("20 kg · 1.1 Enfierradura losa P3")).toBeInTheDocument();
    expect(screen.getByText("Sector norte listo")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Foto del reporte de Juan Pérez" })).toBeInTheDocument();
    expect(screen.getByText("05-11-2026 11:32")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anular" })).toBeInTheDocument();
  });

  it("marca los anulados y no ofrece anularlos de nuevo", () => {
    render(<Feed reportes={[{ ...base, anulado: true }]} obraId="o1" />);
    expect(screen.getByText("Anulado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anular" })).not.toBeInTheDocument();
  });

  it("tiene un estado vacío", () => {
    render(<Feed reportes={[]} obraId="o1" />);
    expect(screen.getByText("Todavía no hay reportes de terreno.")).toBeInTheDocument();
  });
});
```

Run: `npm test -w @pyxis/ovalle-obras -- components/dashboard` → FAIL en los dos nuevos.

- [ ] **Step 2: Implementar carga, feed y refresco**

`apps/ovalle-obras/lib/datos/feed.ts`:
```ts
import type { ClienteSupabase } from "./obra";

export type ReporteFeed = {
  id: string;
  cantidad: number;
  comentario: string | null;
  creado_en: string;
  anulado: boolean;
  fotoUrl: string | null;
  partida: { codigo: string; descripcion: string; unidad: string | null };
  autor: string;
};

export async function cargarFeed(
  supabase: ClienteSupabase,
  filtro: { obraId?: string; autorId?: string },
  limite = 50,
): Promise<ReporteFeed[]> {
  let consulta = supabase
    .from("reportes")
    .select(
      "id, cantidad, comentario, foto_path, creado_en, anulado, partida:partidas(codigo, descripcion, unidad), autor:perfiles!reportes_autor_fkey(nombre)",
    )
    .order("creado_en", { ascending: false })
    .limit(limite);
  if (filtro.obraId) consulta = consulta.eq("obra_id", filtro.obraId);
  if (filtro.autorId) consulta = consulta.eq("autor", filtro.autorId);
  const { data, error } = await consulta;
  if (error) throw error;

  const rutas = (data ?? []).map((r) => r.foto_path).filter((p): p is string => !!p);
  const urls = new Map<string, string>();
  if (rutas.length > 0) {
    const { data: firmadas } = await supabase.storage.from("fotos").createSignedUrls(rutas, 3600);
    (firmadas ?? []).forEach((f) => { if (f.path && f.signedUrl) urls.set(f.path, f.signedUrl); });
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    cantidad: Number(r.cantidad),
    comentario: r.comentario,
    creado_en: r.creado_en,
    anulado: r.anulado,
    fotoUrl: r.foto_path ? urls.get(r.foto_path) ?? null : null,
    partida: r.partida!,
    // Terreno no puede leer perfiles ajenos; en "Mis reportes" el autor es uno mismo.
    autor: r.autor?.nombre ?? "",
  }));
}
```

`apps/ovalle-obras/components/dashboard/BotonAnular.tsx`:
```tsx
"use client";

import { useTransition } from "react";
import { anularReporte } from "@/app/admin/obras/[id]/acciones";

export function BotonAnular({ reporteId, obraId }: { reporteId: string; obraId: string }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <button
      disabled={pendiente}
      onClick={() => {
        if (confirm("¿Anular este reporte? Su cantidad deja de contar en el avance.")) {
          iniciar(() => anularReporte(reporteId, obraId));
        }
      }}
      className="text-sm text-obra-warn underline disabled:opacity-50"
    >
      Anular
    </button>
  );
}
```

`apps/ovalle-obras/components/dashboard/Feed.tsx`:
```tsx
import type { ReporteFeed } from "@/lib/datos/feed";
import { formatoCantidad } from "@/lib/formato";
import { BotonAnular } from "./BotonAnular";

const hora = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatoMomento(iso: string): string {
  return hora.format(new Date(iso)).replace(",", "");
}

export function Feed({ reportes, obraId, conAnular = true }: { reportes: ReporteFeed[]; obraId: string; conAnular?: boolean }) {
  if (reportes.length === 0) return <p>Todavía no hay reportes de terreno.</p>;
  return (
    <ul className="space-y-3">
      {reportes.map((r) => (
        <li key={r.id} className={`flex gap-4 rounded border border-obra-line bg-white p-3 ${r.anulado ? "opacity-50" : ""}`}>
          {r.fotoUrl && (
            <a href={r.fotoUrl} target="_blank" rel="noreferrer" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Storage */}
              <img src={r.fotoUrl} alt={`Foto del reporte de ${r.autor}`} className="h-20 w-20 rounded object-cover" />
            </a>
          )}
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {r.autor && <strong>{r.autor}</strong>}
              <span className="text-sm text-gray-600">{formatoMomento(r.creado_en)}</span>
              {r.anulado && <span className="rounded bg-obra-bg px-2 text-xs">Anulado</span>}
            </div>
            <p className={r.anulado ? "line-through" : ""}>
              {`${formatoCantidad(r.cantidad)} ${r.partida.unidad ?? ""} · ${r.partida.codigo} ${r.partida.descripcion}`}
            </p>
            {r.comentario && <p className="text-sm">{r.comentario}</p>}
          </div>
          {conAnular && !r.anulado && <BotonAnular reporteId={r.id} obraId={obraId} />}
        </li>
      ))}
    </ul>
  );
}
```

`apps/ovalle-obras/components/dashboard/RefrescoEnVivo.tsx`:
```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

export function RefrescoEnVivo({ obraId }: { obraId: string }) {
  const router = useRouter();
  const [conectado, setConectado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seCayo = useRef(false);

  useEffect(() => {
    const supabase = crearClienteNavegador();
    const programar = () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => router.refresh(), 1000);
    };
    const canal = supabase
      .channel(`obra-${obraId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reportes", filter: `obra_id=eq.${obraId}` }, programar)
      .subscribe((estado: string) => {
        if (estado === "SUBSCRIBED") {
          setConectado(true);
          // Al volver de una caída, recarga lo que pudo llegar mientras tanto.
          if (seCayo.current) programar();
          seCayo.current = false;
        } else {
          setConectado(false);
          seCayo.current = true;
        }
      });
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      supabase.removeChannel(canal);
    };
  }, [obraId, router]);

  return (
    <span className={`inline-flex items-center gap-2 text-sm ${conectado ? "text-obra-ok" : "text-obra-warn"}`}>
      <span className={`h-2 w-2 rounded-full ${conectado ? "bg-obra-ok" : "bg-obra-warn"}`} />
      {conectado ? "En vivo" : "Reconectando…"}
    </span>
  );
}
```

Nota: el estado inicial (antes del primer `SUBSCRIBED`) también marca `seCayo = false`; el primer `SUBSCRIBED` no refresca. El test "avisa al perder conexión" lo cubre.

`apps/ovalle-obras/app/admin/obras/[id]/page.tsx` — imports y cambios:
```tsx
import { Feed } from "@/components/dashboard/Feed";
import { RefrescoEnVivo } from "@/components/dashboard/RefrescoEnVivo";
import { cargarFeed } from "@/lib/datos/feed";
// ... después de cargar `datos`:
  const reportes = vista === "feed" ? await cargarFeed(supabase, { obraId: id }) : [];
// ... en el encabezado, antes de "Exportar Excel":
        <RefrescoEnVivo obraId={id} />
// ... bajo la rama del Gantt:
      {vista === "feed" && <Feed reportes={reportes} obraId={id} />}
```

- [ ] **Step 3: Verificar y commit**

Run: `npm test -w @pyxis/ovalle-obras` → PASS. `npm run lint -w @pyxis/ovalle-obras` y `npm run build -w @pyxis/ovalle-obras` → OK.
Manual: con el dashboard abierto en "Reportes", insertar un reporte desde Supabase Studio (http://127.0.0.1:54323) → aparece en ~1 s sin recargar.
```bash
git add apps/ovalle-obras
git commit -m "feat(ovalle-obras): live report feed with voiding"
```

---

### Task 15: Exportar a Excel y PDF

**Files:**
- Create: `lib/exportar/excel.ts`, `lib/exportar/pdf.tsx`, `app/admin/obras/[id]/exportar/excel/route.ts`, `app/admin/obras/[id]/exportar/pdf/route.ts`
- Test: `lib/exportar/excel.test.ts`

**Interfaces:**
- Consumes: `cargarAvanceObra`, `Obra` (Task 11), `aplanar`, `NodoAvance`, `ResumenObra` (Task 10), `ETIQUETA_ESTADO` (Task 12), formato (Task 1).
- Produces:
  - `type DatosInforme = { obra: Obra; raices: NodoAvance[]; resumen: ResumenObra; hoy: string }`
  - `construirExcelAvance(datos: DatosInforme): Promise<Buffer>`
  - `renderizarInformePdf(datos: DatosInforme): Promise<Buffer>`

- [ ] **Step 1: Instalar react-pdf**

Run (raíz): `npm install @react-pdf/renderer -w @pyxis/ovalle-obras`

- [ ] **Step 2: Test del Excel (falla)**

`apps/ovalle-obras/lib/exportar/excel.test.ts`:
```ts
/** @jest-environment node */
import ExcelJS from "exceljs";
import { construirArbol, resumenObra } from "@/lib/avance/arbol";
import { construirExcelAvance } from "./excel";

const raices = construirArbol(
  [
    { id: "c", parent_id: null, codigo: "1", descripcion: "Obra gruesa", unidad: null, cantidad: null, precio_unitario: null, fecha_inicio: null, fecha_fin: null, orden: 0 },
    { id: "h", parent_id: "c", codigo: "1.1", descripcion: "Enfierradura", unidad: "kg", cantidad: 4200, precio_unitario: 1150, fecha_inicio: "2026-11-01", fecha_fin: "2026-11-11", orden: 1 },
  ],
  new Map([["h", 1050]]),
  "2026-11-06",
);

describe("construirExcelAvance", () => {
  it("escribe resumen y una fila por partida con valores numéricos", async () => {
    const buf = await construirExcelAvance({
      obra: { id: "o", nombre: "Edificio Ñuñoa", estado: "activa" },
      raices,
      resumen: resumenObra(raices),
      hoy: "2026-11-06",
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const hoja = wb.getWorksheet("Avance")!;
    expect(hoja.getCell("A1").value).toBe("Edificio Ñuñoa — avance al 06-11-2026");
    expect(hoja.getCell("B3").value).toBeCloseTo(0.25);
    const encabezado = hoja.getRow(6).values as unknown[];
    expect(encabezado).toContain("Código");
    const hojaFila = hoja.getRow(8);
    expect(hojaFila.getCell(1).value).toBe("1.1");
    expect(hojaFila.getCell(4).value).toBe(4200);
    expect(hojaFila.getCell(5).value).toBe(1050);
    expect(hojaFila.getCell(6).value).toBeCloseTo(0.25);
    expect(hojaFila.getCell(10).value).toBe("Atrasada");
  });
});
```

Run: `npm test -w @pyxis/ovalle-obras -- lib/exportar` → FAIL.

- [ ] **Step 3: Implementar exportaciones**

`apps/ovalle-obras/lib/exportar/excel.ts`:
```ts
import ExcelJS from "exceljs";
import { aplanar } from "@/lib/avance/arbol";
import type { NodoAvance, ResumenObra } from "@/lib/avance/tipos";
import type { Obra } from "@/lib/datos/obra";
import { ETIQUETA_ESTADO } from "@/components/dashboard/TablaAvance";
import { formatoFecha } from "@/lib/formato";

export type DatosInforme = { obra: Obra; raices: NodoAvance[]; resumen: ResumenObra; hoy: string };

export async function construirExcelAvance({ obra, raices, resumen, hoy }: DatosInforme): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet("Avance");
  hoja.getCell("A1").value = `${obra.nombre} — avance al ${formatoFecha(hoy)}`;
  hoja.getCell("A1").font = { bold: true, size: 14 };
  hoja.addRow([]);
  hoja.getRow(3).values = ["Avance físico", resumen.porcentajeFisico];
  hoja.getCell("B3").numFmt = "0.0%";
  hoja.getRow(4).values = ["$ ejecutado / $ presupuestado", resumen.montoEjecutado, resumen.montoPresupuestado];
  hoja.getCell("B4").numFmt = "#,##0";
  hoja.getCell("C4").numFmt = "#,##0";
  hoja.getRow(5).values = ["Partidas atrasadas", resumen.atrasadas];

  hoja.getRow(6).values = ["Código", "Partida", "Unidad", "Presupuestado", "Ejecutado", "Avance", "$ Presupuesto", "$ Ejecutado", "Plazo", "Estado"];
  hoja.getRow(6).font = { bold: true };

  aplanar(raices).forEach((n, i) => {
    const fila = hoja.getRow(7 + i);
    fila.values = [
      n.codigo,
      `${"  ".repeat(n.nivel)}${n.descripcion}`,
      n.unidad ?? "",
      n.esHoja ? n.cantidad : null,
      n.esHoja ? n.ejecutado : null,
      n.porcentaje,
      n.montoPresupuestado,
      n.montoEjecutado,
      n.esHoja && n.fecha_inicio ? `${formatoFecha(n.fecha_inicio)} → ${formatoFecha(n.fecha_fin)}` : "",
      ETIQUETA_ESTADO[n.estado],
    ];
    if (!n.esHoja) fila.font = { bold: true };
    fila.getCell(6).numFmt = "0.0%";
    fila.getCell(7).numFmt = "#,##0";
    fila.getCell(8).numFmt = "#,##0";
  });
  hoja.columns.forEach((c, i) => { c.width = i === 1 ? 45 : 16; });
  return Buffer.from(await wb.xlsx.writeBuffer());
}
```

Si importar `ETIQUETA_ESTADO` desde un componente arrastra JSX al test de node, mover `ETIQUETA_ESTADO` a `lib/avance/tipos.ts` y reexportarlo desde `TablaAvance.tsx`.

`apps/ovalle-obras/lib/exportar/pdf.tsx`:
```tsx
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { aplanar } from "@/lib/avance/arbol";
import { formatoCantidad, formatoCLP, formatoFecha, formatoPorcentaje } from "@/lib/formato";
import { ETIQUETA_ESTADO } from "@/components/dashboard/TablaAvance";
import type { DatosInforme } from "./excel";

const s = StyleSheet.create({
  pagina: { padding: 28, fontSize: 8, fontFamily: "Helvetica" },
  titulo: { fontSize: 16, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 9, marginBottom: 12, color: "#555" },
  kpis: { flexDirection: "row", gap: 12, marginBottom: 14 },
  kpi: { flex: 1, borderWidth: 1, borderColor: "#ddd", padding: 8 },
  kpiValor: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#ddd", paddingVertical: 3 },
  encabezado: { fontFamily: "Helvetica-Bold", backgroundColor: "#f1f0ec" },
  capitulo: { fontFamily: "Helvetica-Bold" },
});

const COLS = [
  { t: "Código", w: 40 },
  { t: "Partida", w: 200 },
  { t: "Presup.", w: 70 },
  { t: "Ejecutado", w: 70 },
  { t: "Avance", w: 45 },
  { t: "$ Presupuesto", w: 75 },
  { t: "$ Ejecutado", w: 75 },
  { t: "Estado", w: 55 },
];

function InformePdf({ obra, raices, resumen, hoy }: DatosInforme) {
  return (
    <Document title={`${obra.nombre} — avance`}>
      <Page size="A4" orientation="landscape" style={s.pagina}>
        <Text style={s.titulo}>{obra.nombre}</Text>
        <Text style={s.sub}>Informe de avance al {formatoFecha(hoy)} · Constructora Ovalle</Text>
        <View style={s.kpis}>
          <View style={s.kpi}><Text>Avance físico</Text><Text style={s.kpiValor}>{formatoPorcentaje(resumen.porcentajeFisico)}</Text></View>
          <View style={s.kpi}><Text>Ejecutado</Text><Text style={s.kpiValor}>{formatoCLP(resumen.montoEjecutado)}</Text><Text>de {formatoCLP(resumen.montoPresupuestado)}</Text></View>
          <View style={s.kpi}><Text>Partidas atrasadas</Text><Text style={s.kpiValor}>{resumen.atrasadas} de {resumen.hojas}</Text></View>
        </View>
        <View style={[s.fila, s.encabezado]} fixed>
          {COLS.map((c) => <Text key={c.t} style={{ width: c.w }}>{c.t}</Text>)}
        </View>
        {aplanar(raices).map((n) => (
          <View key={n.id} style={n.esHoja ? s.fila : [s.fila, s.capitulo]} wrap={false}>
            <Text style={{ width: COLS[0].w }}>{n.codigo}</Text>
            <Text style={{ width: COLS[1].w, paddingLeft: n.nivel * 8 }}>{n.descripcion}</Text>
            <Text style={{ width: COLS[2].w }}>{n.esHoja ? `${formatoCantidad(n.cantidad!)} ${n.unidad}` : ""}</Text>
            <Text style={{ width: COLS[3].w }}>{n.esHoja ? `${formatoCantidad(n.ejecutado)} ${n.unidad}` : ""}</Text>
            <Text style={{ width: COLS[4].w }}>{formatoPorcentaje(n.porcentaje)}</Text>
            <Text style={{ width: COLS[5].w }}>{formatoCLP(n.montoPresupuestado)}</Text>
            <Text style={{ width: COLS[6].w }}>{formatoCLP(n.montoEjecutado)}</Text>
            <Text style={{ width: COLS[7].w }}>{ETIQUETA_ESTADO[n.estado]}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function renderizarInformePdf(datos: DatosInforme): Promise<Buffer> {
  return renderToBuffer(<InformePdf {...datos} />);
}
```

`apps/ovalle-obras/app/admin/obras/[id]/exportar/excel/route.ts`:
```ts
import { notFound } from "next/navigation";
import { exigirRol } from "@/lib/auth/sesion";
import { cargarAvanceObra } from "@/lib/datos/obra";
import { construirExcelAvance } from "@/lib/exportar/excel";
import { hoyEnChile } from "@/lib/fechas";
import { slug } from "@/lib/formato";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await exigirRol("admin");
  const { id } = await params;
  const hoy = hoyEnChile();
  const datos = await cargarAvanceObra(await crearClienteServidor(), id, hoy);
  if (!datos) notFound();
  const archivo = await construirExcelAvance({ ...datos, hoy });
  return new Response(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="avance-${slug(datos.obra.nombre)}-${hoy}.xlsx"`,
    },
  });
}
```

`apps/ovalle-obras/app/admin/obras/[id]/exportar/pdf/route.ts`:
```ts
import { notFound } from "next/navigation";
import { exigirRol } from "@/lib/auth/sesion";
import { cargarAvanceObra } from "@/lib/datos/obra";
import { renderizarInformePdf } from "@/lib/exportar/pdf";
import { hoyEnChile } from "@/lib/fechas";
import { slug } from "@/lib/formato";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await exigirRol("admin");
  const { id } = await params;
  const hoy = hoyEnChile();
  const datos = await cargarAvanceObra(await crearClienteServidor(), id, hoy);
  if (!datos) notFound();
  const archivo = await renderizarInformePdf({ ...datos, hoy });
  return new Response(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="avance-${slug(datos.obra.nombre)}-${hoy}.pdf"`,
    },
  });
}
```

- [ ] **Step 4: Verificar y commit**

Run: `npm test -w @pyxis/ovalle-obras -- lib/exportar` → PASS. `npm run build -w @pyxis/ovalle-obras` → OK.
Manual: en el dashboard, "Exportar Excel" y "Exportar PDF" descargan archivos que abren y muestran indicadores + tabla.
```bash
git add apps/ovalle-obras package-lock.json
git commit -m "feat(ovalle-obras): export progress to Excel and PDF"
```

---

### Task 16: Gestión de usuarios

**Files:**
- Create: `lib/usuarios/validar.ts`, `app/admin/usuarios/acciones.ts`, `app/admin/usuarios/page.tsx`, `components/usuarios/FormularioUsuario.tsx`
- Test: `lib/usuarios/validar.test.ts`

**Interfaces:**
- Consumes: `exigirRol` (Task 4), `crearClienteAdmin`, `crearClienteServidor` (Task 4).
- Produces:
  - `validarNuevoUsuario(formData: FormData): { ok: true; nombre: string; email: string; rol: Rol } | { ok: false; mensaje: string }`
  - `type EstadoFormulario = { mensaje: string; ok: boolean } | null`
  - Server actions `crearUsuario(prev: EstadoFormulario, formData: FormData): Promise<EstadoFormulario>`, `cambiarActivo(usuarioId: string, activo: boolean): Promise<void>`

- [ ] **Step 1: Test (falla)**

`apps/ovalle-obras/lib/usuarios/validar.test.ts`:
```ts
/** @jest-environment node */
import { validarNuevoUsuario } from "./validar";

const fd = (datos: Record<string, string>) => {
  const f = new FormData();
  Object.entries(datos).forEach(([k, v]) => f.set(k, v));
  return f;
};

describe("validarNuevoUsuario", () => {
  it("normaliza email y nombre", () => {
    expect(validarNuevoUsuario(fd({ nombre: "  Juan Pérez ", email: " Juan@Ovalle.CL ", rol: "terreno" }))).toEqual({
      ok: true, nombre: "Juan Pérez", email: "juan@ovalle.cl", rol: "terreno",
    });
  });
  it.each([
    [{ nombre: "", email: "a@b.cl", rol: "terreno" }, "Falta el nombre."],
    [{ nombre: "Ana", email: "no-es-email", rol: "terreno" }, "El email no es válido."],
    [{ nombre: "Ana", email: "a@b.cl", rol: "jefe" }, "Rol inválido."],
  ])("rechaza %p", (datos, mensaje) => {
    expect(validarNuevoUsuario(fd(datos))).toEqual({ ok: false, mensaje });
  });
});
```

Run: `npm test -w @pyxis/ovalle-obras -- lib/usuarios` → FAIL.

- [ ] **Step 2: Implementar**

`apps/ovalle-obras/lib/usuarios/validar.ts`:
```ts
import type { Rol } from "@/lib/auth/rutas";

export function validarNuevoUsuario(
  formData: FormData,
): { ok: true; nombre: string; email: string; rol: Rol } | { ok: false; mensaje: string } {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rol = String(formData.get("rol") ?? "");
  if (!nombre) return { ok: false, mensaje: "Falta el nombre." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, mensaje: "El email no es válido." };
  if (rol !== "admin" && rol !== "terreno") return { ok: false, mensaje: "Rol inválido." };
  return { ok: true, nombre, email, rol };
}
```

`apps/ovalle-obras/app/admin/usuarios/acciones.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { validarNuevoUsuario } from "@/lib/usuarios/validar";

export type EstadoFormulario = { mensaje: string; ok: boolean } | null;

export async function crearUsuario(_prev: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirRol("admin");
  const v = validarNuevoUsuario(formData);
  if (!v.ok) return { ok: false, mensaje: v.mensaje };
  const { error } = await crearClienteAdmin().auth.admin.createUser({
    email: v.email,
    email_confirm: true,
    user_metadata: { nombre: v.nombre, rol: v.rol },
  });
  if (error) {
    const yaExiste = /already|registered|exists/i.test(error.message);
    return { ok: false, mensaje: yaExiste ? "Ya existe un usuario con ese email." : "No se pudo crear el usuario." };
  }
  revalidatePath("/admin/usuarios");
  return { ok: true, mensaje: `${v.nombre} ya puede ingresar con un código enviado a ${v.email}.` };
}

export async function cambiarActivo(usuarioId: string, activo: boolean): Promise<void> {
  const perfil = await exigirRol("admin");
  if (perfil.id === usuarioId && !activo) throw new Error("No puedes desactivarte a ti mismo.");
  const admin = crearClienteAdmin();
  const { error } = await admin.from("perfiles").update({ activo }).eq("id", usuarioId);
  if (error) throw error;
  // El baneo corta la renovación de sesión; RLS ya bloquea los datos al instante.
  await admin.auth.admin.updateUserById(usuarioId, { ban_duration: activo ? "none" : "876000h" });
  revalidatePath("/admin/usuarios");
}
```

`apps/ovalle-obras/components/usuarios/FormularioUsuario.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { crearUsuario, type EstadoFormulario } from "@/app/admin/usuarios/acciones";

export function FormularioUsuario() {
  const [estado, accion, pendiente] = useActionState<EstadoFormulario, FormData>(crearUsuario, null);
  return (
    <form action={accion} className="flex flex-wrap items-end gap-3 rounded border border-obra-line bg-white p-4">
      <label className="flex flex-col text-sm">Nombre<input name="nombre" required className="mt-1 rounded border border-obra-line px-3 py-2" /></label>
      <label className="flex flex-col text-sm">Email<input name="email" type="email" required className="mt-1 rounded border border-obra-line px-3 py-2" /></label>
      <label className="flex flex-col text-sm">
        Rol
        <select name="rol" defaultValue="terreno" className="mt-1 rounded border border-obra-line px-3 py-2">
          <option value="terreno">Terreno</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <button disabled={pendiente} className="rounded bg-obra-accent px-4 py-2 font-semibold text-white disabled:opacity-60">Crear usuario</button>
      {estado && <p role="status" className={`w-full text-sm ${estado.ok ? "text-obra-ok" : "text-obra-warn"}`}>{estado.mensaje}</p>}
    </form>
  );
}
```

`apps/ovalle-obras/app/admin/usuarios/page.tsx`:
```tsx
import { FormularioUsuario } from "@/components/usuarios/FormularioUsuario";
import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cambiarActivo } from "./acciones";

export default async function Usuarios() {
  const yo = await exigirRol("admin");
  const supabase = await crearClienteServidor();
  const { data: usuarios } = await supabase.from("perfiles").select("id, nombre, email, rol, activo").order("nombre");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Usuarios</h1>
      <FormularioUsuario />
      <table className="w-full rounded border border-obra-line bg-white text-sm">
        <thead className="bg-obra-bg text-left">
          <tr><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Rol</th><th className="px-3 py-2">Estado</th><th /></tr>
        </thead>
        <tbody className="divide-y divide-obra-line">
          {(usuarios ?? []).map((u) => (
            <tr key={u.id}>
              <td className="px-3 py-2">{u.nombre}</td>
              <td className="px-3 py-2">{u.email}</td>
              <td className="px-3 py-2">{u.rol === "admin" ? "Admin" : "Terreno"}</td>
              <td className="px-3 py-2">{u.activo ? "Activo" : "Desactivado"}</td>
              <td className="px-3 py-2 text-right">
                {u.id !== yo.id && (
                  <form action={cambiarActivo.bind(null, u.id, !u.activo)}>
                    <button className="underline">{u.activo ? "Desactivar" : "Reactivar"}</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Verificar y commit**

Run: `npm test -w @pyxis/ovalle-obras`, `npm run lint -w @pyxis/ovalle-obras`, `npm run build -w @pyxis/ovalle-obras` → OK.
Manual: crear un usuario de terreno; ingresar con él en otra ventana (código en Mailpit); desactivarlo → su siguiente navegación queda sin datos y en `/sin-acceso`.
```bash
git add apps/ovalle-obras
git commit -m "feat(ovalle-obras): invite-only user management"
```

---

### Task 17: Terreno — obras y lista de partidas

**Files:**
- Create: `lib/terreno/lista.ts`, `app/terreno/layout.tsx`, `app/terreno/page.tsx`, `app/terreno/obras/[id]/page.tsx`, `components/terreno/ListaPartidas.tsx`
- Test: `lib/terreno/lista.test.ts`, `components/terreno/ListaPartidas.test.tsx`

**Interfaces:**
- Consumes: `cargarAvanceObra` (Task 11), `enCurso` (Task 10), `aplanar` (Task 10), `exigirRol` (Task 4).
- Produces:
  - `type ItemPartida = { id: string; codigo: string; descripcion: string; unidad: string; cantidad: number; ejecutado: number; porcentaje: number; capitulo: string | null }`
  - `itemsTerreno(raices: NodoAvance[]): ItemPartida[]`, `enCursoHoy(raices: NodoAvance[], hoy: string): ItemPartida[]`, `buscarPartidas(items: ItemPartida[], texto: string): ItemPartida[]`
  - `ListaPartidas({ obraId, enCurso, todas }: { obraId: string; enCurso: ItemPartida[]; todas: ItemPartida[] })`

- [ ] **Step 1: Tests (fallan)**

`apps/ovalle-obras/lib/terreno/lista.test.ts`:
```ts
/** @jest-environment node */
import { construirArbol } from "@/lib/avance/arbol";
import { buscarPartidas, enCursoHoy, itemsTerreno } from "./lista";

const raices = construirArbol(
  [
    { id: "c", parent_id: null, codigo: "1", descripcion: "Obra gruesa", unidad: null, cantidad: null, precio_unitario: null, fecha_inicio: null, fecha_fin: null, orden: 0 },
    { id: "a", parent_id: "c", codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg", cantidad: 100, precio_unitario: 1, fecha_inicio: "2026-11-01", fecha_fin: "2026-11-10", orden: 1 },
    { id: "b", parent_id: "c", codigo: "1.2", descripcion: "Hormigón losa P3", unidad: "m3", cantidad: 10, precio_unitario: 1, fecha_inicio: "2026-11-11", fecha_fin: "2026-11-15", orden: 2 },
  ],
  new Map([["a", 30]]),
  "2026-11-05",
);

describe("lista de terreno", () => {
  it("lista solo hojas, con su capítulo", () => {
    expect(itemsTerreno(raices)).toEqual([
      { id: "a", codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg", cantidad: 100, ejecutado: 30, porcentaje: 0.3, capitulo: "1 Obra gruesa" },
      { id: "b", codigo: "1.2", descripcion: "Hormigón losa P3", unidad: "m3", cantidad: 10, ejecutado: 0, porcentaje: 0, capitulo: "1 Obra gruesa" },
    ]);
  });

  it("en curso hoy = las que el Gantt dice que se están ejecutando", () => {
    expect(enCursoHoy(raices, "2026-11-05").map((i) => i.codigo)).toEqual(["1.1"]);
  });

  it("busca sin importar tildes ni mayúsculas, también por código", () => {
    const items = itemsTerreno(raices);
    expect(buscarPartidas(items, "hormigon").map((i) => i.codigo)).toEqual(["1.2"]);
    expect(buscarPartidas(items, "1.1").map((i) => i.codigo)).toEqual(["1.1"]);
    expect(buscarPartidas(items, "")).toBe(items);
  });
});
```

`apps/ovalle-obras/components/terreno/ListaPartidas.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListaPartidas } from "./ListaPartidas";

const a = { id: "a", codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg", cantidad: 100, ejecutado: 30, porcentaje: 0.3, capitulo: "1 Obra gruesa" };
const b = { id: "b", codigo: "1.2", descripcion: "Hormigón losa P3", unidad: "m3", cantidad: 10, ejecutado: 0, porcentaje: 0, capitulo: "1 Obra gruesa" };

describe("ListaPartidas", () => {
  it("muestra primero las en curso y enlaza al formulario", () => {
    render(<ListaPartidas obraId="o1" enCurso={[a]} todas={[a, b]} />);
    expect(screen.getByRole("heading", { name: "En curso hoy" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Enfierradura losa P3/ })[0]).toHaveAttribute("href", "/terreno/obras/o1/partidas/a");
  });

  it("al buscar oculta las secciones y filtra", async () => {
    render(<ListaPartidas obraId="o1" enCurso={[a]} todas={[a, b]} />);
    await userEvent.type(screen.getByRole("searchbox"), "hormi");
    expect(screen.queryByRole("heading", { name: "En curso hoy" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hormigón losa P3/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Enfierradura/ })).not.toBeInTheDocument();
  });
});
```

Run: `npm test -w @pyxis/ovalle-obras -- terreno` → FAIL.

- [ ] **Step 2: Implementar**

`apps/ovalle-obras/lib/terreno/lista.ts`:
```ts
import { enCurso } from "@/lib/avance/filtros";
import type { NodoAvance } from "@/lib/avance/tipos";

export type ItemPartida = {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  ejecutado: number;
  porcentaje: number;
  capitulo: string | null;
};

function recorrer(nodos: NodoAvance[], capitulo: string | null, fn: (n: NodoAvance, capitulo: string | null) => void) {
  for (const n of nodos) {
    if (n.esHoja) fn(n, capitulo);
    else recorrer(n.hijos, `${n.codigo} ${n.descripcion}`, fn);
  }
}

const item = (n: NodoAvance, capitulo: string | null): ItemPartida => ({
  id: n.id,
  codigo: n.codigo,
  descripcion: n.descripcion,
  unidad: n.unidad!,
  cantidad: n.cantidad!,
  ejecutado: n.ejecutado,
  porcentaje: n.porcentaje,
  capitulo,
});

export function itemsTerreno(raices: NodoAvance[]): ItemPartida[] {
  const items: ItemPartida[] = [];
  recorrer(raices, null, (n, c) => items.push(item(n, c)));
  return items;
}

export function enCursoHoy(raices: NodoAvance[], hoy: string): ItemPartida[] {
  const items: ItemPartida[] = [];
  recorrer(raices, null, (n, c) => { if (enCurso(n, hoy)) items.push(item(n, c)); });
  return items;
}

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function buscarPartidas(items: ItemPartida[], texto: string): ItemPartida[] {
  const q = normalizar(texto.trim());
  if (!q) return items;
  return items.filter((i) => normalizar(`${i.codigo} ${i.descripcion}`).includes(q));
}
```

`apps/ovalle-obras/components/terreno/ListaPartidas.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { buscarPartidas, type ItemPartida } from "@/lib/terreno/lista";
import { formatoCantidad, formatoPorcentaje } from "@/lib/formato";

function Tarjeta({ obraId, item }: { obraId: string; item: ItemPartida }) {
  return (
    <Link href={`/terreno/obras/${obraId}/partidas/${item.id}`} className="block rounded-lg border border-obra-line bg-white p-3 active:bg-obra-bg">
      <span className="block font-medium">{item.codigo} {item.descripcion}</span>
      <span className="mt-2 flex items-center gap-2 text-sm text-gray-600">
        <span className="h-2 flex-1 rounded bg-obra-line">
          <span className="block h-2 rounded bg-obra-accent" style={{ width: `${Math.min(item.porcentaje, 1) * 100}%` }} />
        </span>
        {formatoPorcentaje(item.porcentaje)} · {formatoCantidad(item.ejecutado)}/{formatoCantidad(item.cantidad)} {item.unidad}
      </span>
    </Link>
  );
}

export function ListaPartidas({ obraId, enCurso, todas }: { obraId: string; enCurso: ItemPartida[]; todas: ItemPartida[] }) {
  const [texto, setTexto] = useState("");
  const buscando = texto.trim() !== "";
  const resultado = buscarPartidas(todas, texto);
  const capitulos = [...new Set(resultado.map((i) => i.capitulo))];

  return (
    <div className="space-y-5">
      <input
        type="search"
        placeholder="Buscar partida…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="w-full rounded-lg border border-obra-line bg-white px-3 py-3 text-base"
      />
      {!buscando && enCurso.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">En curso hoy</h2>
          {enCurso.map((i) => <Tarjeta key={i.id} obraId={obraId} item={i} />)}
        </section>
      )}
      {capitulos.map((c) => (
        <section key={c ?? "sin"} className="space-y-2">
          {!buscando && <h2 className="font-semibold">{c ?? "Partidas"}</h2>}
          {resultado.filter((i) => i.capitulo === c).map((i) => <Tarjeta key={i.id} obraId={obraId} item={i} />)}
        </section>
      ))}
      {resultado.length === 0 && <p>No hay partidas que coincidan.</p>}
    </div>
  );
}
```

`apps/ovalle-obras/app/terreno/layout.tsx`:
```tsx
import Link from "next/link";
import { exigirRol } from "@/lib/auth/sesion";

export default async function TerrenoLayout({ children }: { children: React.ReactNode }) {
  await exigirRol("terreno", "admin");
  return (
    <div className="mx-auto min-h-screen max-w-lg pb-20">
      <main className="p-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-obra-line bg-white py-3 text-sm">
        <Link href="/terreno">Partidas</Link>
        <Link href="/terreno/reportes">Mis reportes</Link>
        <form action="/salir" method="post"><button>Salir</button></form>
      </nav>
    </div>
  );
}
```

`apps/ovalle-obras/app/terreno/page.tsx`:
```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export default async function ObrasTerreno() {
  const supabase = await crearClienteServidor();
  const { data: obras } = await supabase.from("obras").select("id, nombre").eq("estado", "activa").order("nombre");
  if (obras?.length === 1) redirect(`/terreno/obras/${obras[0].id}`);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Obras</h1>
      {(obras ?? []).length === 0 && <p>No hay obras activas.</p>}
      {(obras ?? []).map((o) => (
        <Link key={o.id} href={`/terreno/obras/${o.id}`} className="block rounded-lg border border-obra-line bg-white p-4 font-medium">{o.nombre}</Link>
      ))}
    </div>
  );
}
```

`apps/ovalle-obras/app/terreno/obras/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { ListaPartidas } from "@/components/terreno/ListaPartidas";
import { cargarAvanceObra } from "@/lib/datos/obra";
import { hoyEnChile } from "@/lib/fechas";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { enCursoHoy, itemsTerreno } from "@/lib/terreno/lista";

export default async function PartidasObra({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ enviado?: string }>;
}) {
  const { id } = await params;
  const { enviado } = await searchParams;
  const hoy = hoyEnChile();
  const datos = await cargarAvanceObra(await crearClienteServidor(), id, hoy);
  if (!datos) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{datos.obra.nombre}</h1>
      {enviado && <p role="status" className="rounded-lg bg-green-100 p-3 text-obra-ok">Reporte enviado ✓</p>}
      <ListaPartidas obraId={id} enCurso={enCursoHoy(datos.raices, hoy)} todas={itemsTerreno(datos.raices)} />
    </div>
  );
}
```

- [ ] **Step 3: Verificar y commit**

Run: `npm test -w @pyxis/ovalle-obras`, `npm run lint -w @pyxis/ovalle-obras`, `npm run build -w @pyxis/ovalle-obras` → OK.
Manual (DevTools en modo móvil): usuario de terreno entra, con una obra activa va directo a sus partidas.
```bash
git add apps/ovalle-obras
git commit -m "feat(ovalle-obras): field partida list with today's work first"
```

---

### Task 18: Terreno — reportar avance y mis reportes

**Files:**
- Create: `lib/reportes/cantidad.ts`, `lib/fotos/preparar.ts`, `lib/reportes/enviar.ts`, `components/terreno/FormularioReporte.tsx`, `app/terreno/obras/[id]/partidas/[partidaId]/page.tsx`, `app/terreno/reportes/page.tsx`
- Test: `lib/reportes/cantidad.test.ts`, `lib/fotos/preparar.test.ts`, `lib/reportes/enviar.test.ts`, `components/terreno/FormularioReporte.test.tsx`

**Interfaces:**
- Consumes: `parseNumeroCL` (Task 5), `crearClienteNavegador` (Task 4), `cargarFeed` + `Feed` (Task 14), `exigirRol` (Task 4).
- Produces:
  - `parseCantidadIngresada(texto: string, modo: "cantidad" | "porcentaje", cantidadPartida: number): { ok: true; cantidad: number } | { ok: false; mensaje: string }`
  - `dimensionesEscaladas(ancho: number, alto: number, maximo?: number): { ancho: number; alto: number }`, `prepararFoto(archivo: File, comprimir?: (f: File) => Promise<Blob>): Promise<Blob>`, `MAX_FOTO_BYTES = 10 * 1024 * 1024`
  - `type NuevoReporte = { id: string; obra_id: string; partida_id: string; autor: string; cantidad: number; comentario: string | null; foto_path: string | null }`
  - `type ClienteReportes = { subirFoto(ruta: string, foto: Blob): Promise<{ error: { message: string; statusCode?: string } | null }>; insertarReporte(fila: NuevoReporte): Promise<{ error: { code?: string; message: string } | null }> }`
  - `enviarReporte(cliente: ClienteReportes, datos: { id: string; obraId: string; partidaId: string; autorId: string; cantidad: number; comentario: string; foto: Blob | null }, fotoYaSubida: boolean): Promise<{ ok: true } | { ok: false; mensaje: string; fotoSubida: boolean }>`
  - `clienteReportesDesde(supabase: SupabaseClient<Database>): ClienteReportes`

- [ ] **Step 1: Tests de cantidad, foto y envío (fallan)**

`apps/ovalle-obras/lib/reportes/cantidad.test.ts`:
```ts
/** @jest-environment node */
import { parseCantidadIngresada } from "./cantidad";

describe("parseCantidadIngresada", () => {
  it("acepta coma decimal y separador de miles", () => {
    expect(parseCantidadIngresada("12,5", "cantidad", 100)).toEqual({ ok: true, cantidad: 12.5 });
    expect(parseCantidadIngresada("1.200", "cantidad", 4200)).toEqual({ ok: true, cantidad: 1200 });
  });
  it("convierte % a la unidad de la partida", () => {
    expect(parseCantidadIngresada("40", "porcentaje", 4200)).toEqual({ ok: true, cantidad: 1680 });
    expect(parseCantidadIngresada("12,5 %", "porcentaje", 80)).toEqual({ ok: true, cantidad: 10 });
  });
  it.each(["", "0", "-3", "mucho"])("rechaza %p", (t) => {
    expect(parseCantidadIngresada(t, "cantidad", 100)).toEqual({ ok: false, mensaje: "Ingresa una cantidad mayor que 0." });
  });
});
```

`apps/ovalle-obras/lib/fotos/preparar.test.ts`:
```ts
/** @jest-environment node */
import { dimensionesEscaladas, MAX_FOTO_BYTES, prepararFoto } from "./preparar";

describe("dimensionesEscaladas", () => {
  it("reduce el lado mayor a 1600 manteniendo proporción", () => {
    expect(dimensionesEscaladas(4032, 3024)).toEqual({ ancho: 1600, alto: 1200 });
    expect(dimensionesEscaladas(3024, 4032)).toEqual({ ancho: 1200, alto: 1600 });
  });
  it("no agranda fotos chicas", () => {
    expect(dimensionesEscaladas(800, 600)).toEqual({ ancho: 800, alto: 600 });
  });
});

describe("prepararFoto", () => {
  const archivo = (bytes: number) => new File([new Uint8Array(bytes)], "f.jpg", { type: "image/jpeg" });

  it("usa la versión comprimida", async () => {
    const comprimida = new Blob(["x"]);
    await expect(prepararFoto(archivo(10), async () => comprimida)).resolves.toBe(comprimida);
  });
  it("si no se puede comprimir, sube el original si no es enorme", async () => {
    const f = archivo(1000);
    await expect(prepararFoto(f, async () => { throw new Error("HEIC"); })).resolves.toBe(f);
  });
  it("si no se puede comprimir y es enorme, explica el problema", async () => {
    await expect(prepararFoto(archivo(MAX_FOTO_BYTES + 1), async () => { throw new Error("x"); })).rejects.toThrow(
      "La foto es muy pesada y no se pudo reducir. Prueba con otra.",
    );
  });
});
```

`apps/ovalle-obras/lib/reportes/enviar.test.ts`:
```ts
/** @jest-environment node */
import { enviarReporte, type ClienteReportes } from "./enviar";

const datos = { id: "r1", obraId: "o1", partidaId: "p1", autorId: "u1", cantidad: 20, comentario: "  listo ", foto: new Blob(["x"]) };

function cliente(over: Partial<ClienteReportes> = {}): ClienteReportes & { subirFoto: jest.Mock; insertarReporte: jest.Mock } {
  return {
    subirFoto: jest.fn().mockResolvedValue({ error: null }),
    insertarReporte: jest.fn().mockResolvedValue({ error: null }),
    ...over,
  } as never;
}

describe("enviarReporte", () => {
  it("sube la foto en la ruta obra/autor/reporte e inserta con id fijo", async () => {
    const c = cliente();
    await expect(enviarReporte(c, datos, false)).resolves.toEqual({ ok: true });
    expect(c.subirFoto).toHaveBeenCalledWith("o1/u1/r1.jpg", datos.foto);
    expect(c.insertarReporte).toHaveBeenCalledWith({
      id: "r1", obra_id: "o1", partida_id: "p1", autor: "u1", cantidad: 20, comentario: "listo", foto_path: "o1/u1/r1.jpg",
    });
  });

  it("sin foto ni comentario manda nulls", async () => {
    const c = cliente();
    await enviarReporte(c, { ...datos, foto: null, comentario: " " }, false);
    expect(c.subirFoto).not.toHaveBeenCalled();
    expect(c.insertarReporte).toHaveBeenCalledWith(expect.objectContaining({ comentario: null, foto_path: null }));
  });

  it("un reintento no vuelve a subir la foto ya subida", async () => {
    const c = cliente();
    await enviarReporte(c, datos, true);
    expect(c.subirFoto).not.toHaveBeenCalled();
    expect(c.insertarReporte).toHaveBeenCalledWith(expect.objectContaining({ foto_path: "o1/u1/r1.jpg" }));
  });

  it("si la foto ya existía (reintento tras corte), sigue", async () => {
    const c = cliente({ subirFoto: jest.fn().mockResolvedValue({ error: { message: "The resource already exists", statusCode: "409" } }) });
    await expect(enviarReporte(c, datos, false)).resolves.toEqual({ ok: true });
  });

  it("un insert duplicado (doble envío) cuenta como éxito", async () => {
    const c = cliente({ insertarReporte: jest.fn().mockResolvedValue({ error: { code: "23505", message: "duplicate key" } }) });
    await expect(enviarReporte(c, datos, false)).resolves.toEqual({ ok: true });
  });

  it("si falla la foto, avisa y no inserta", async () => {
    const c = cliente({ subirFoto: jest.fn().mockResolvedValue({ error: { message: "network" } }) });
    await expect(enviarReporte(c, datos, false)).resolves.toEqual({
      ok: false, mensaje: "No se pudo subir la foto. Revisa la conexión y reintenta.", fotoSubida: false,
    });
    expect(c.insertarReporte).not.toHaveBeenCalled();
  });

  it("si falla el insert, recuerda que la foto ya subió", async () => {
    const c = cliente({ insertarReporte: jest.fn().mockResolvedValue({ error: { message: "network" } }) });
    await expect(enviarReporte(c, datos, false)).resolves.toEqual({
      ok: false, mensaje: "No se pudo enviar el reporte. Revisa la conexión y reintenta.", fotoSubida: true,
    });
  });
});
```

Run: `npm test -w @pyxis/ovalle-obras -- lib/reportes lib/fotos` → FAIL.

- [ ] **Step 2: Implementar cantidad, foto y envío**

`apps/ovalle-obras/lib/reportes/cantidad.ts`:
```ts
import { parseNumeroCL } from "@/lib/numeros";

export function parseCantidadIngresada(
  texto: string,
  modo: "cantidad" | "porcentaje",
  cantidadPartida: number,
): { ok: true; cantidad: number } | { ok: false; mensaje: string } {
  const n = parseNumeroCL(texto.replace("%", ""));
  if (!n.ok || n.valor === null || n.valor <= 0) return { ok: false, mensaje: "Ingresa una cantidad mayor que 0." };
  const cantidad = modo === "porcentaje" ? (cantidadPartida * n.valor) / 100 : n.valor;
  return { ok: true, cantidad: Math.round(cantidad * 10000) / 10000 };
}
```

`apps/ovalle-obras/lib/fotos/preparar.ts`:
```ts
export const MAX_FOTO_BYTES = 10 * 1024 * 1024;
const LADO_MAXIMO = 1600;

export function dimensionesEscaladas(ancho: number, alto: number, maximo = LADO_MAXIMO) {
  const escala = Math.min(1, maximo / Math.max(ancho, alto));
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) };
}

/** Redimensiona en el navegador a JPEG (máx. 1600 px, calidad 0.8). */
export async function comprimirEnNavegador(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo);
  const { ancho, alto } = dimensionesEscaladas(imagen.width, imagen.height);
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext("2d")!.drawImage(imagen, 0, 0, ancho, alto);
  imagen.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob falló"))), "image/jpeg", 0.8),
  );
}

export async function prepararFoto(archivo: File, comprimir: (f: File) => Promise<Blob> = comprimirEnNavegador): Promise<Blob> {
  try {
    return await comprimir(archivo);
  } catch {
    if (archivo.size <= MAX_FOTO_BYTES) return archivo;
    throw new Error("La foto es muy pesada y no se pudo reducir. Prueba con otra.");
  }
}
```

`apps/ovalle-obras/lib/reportes/enviar.ts`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type NuevoReporte = {
  id: string;
  obra_id: string;
  partida_id: string;
  autor: string;
  cantidad: number;
  comentario: string | null;
  foto_path: string | null;
};

export type ClienteReportes = {
  subirFoto(ruta: string, foto: Blob): Promise<{ error: { message: string; statusCode?: string } | null }>;
  insertarReporte(fila: NuevoReporte): Promise<{ error: { code?: string; message: string } | null }>;
};

export function clienteReportesDesde(supabase: SupabaseClient<Database>): ClienteReportes {
  return {
    subirFoto: async (ruta, foto) => {
      const { error } = await supabase.storage.from("fotos").upload(ruta, foto, { contentType: foto.type || "image/jpeg" });
      return { error: error ? { message: error.message, statusCode: (error as { statusCode?: string }).statusCode } : null };
    },
    insertarReporte: async (fila) => {
      const { error } = await supabase.from("reportes").insert(fila);
      return { error: error ? { code: error.code, message: error.message } : null };
    },
  };
}

const yaExiste = (e: { message: string; statusCode?: string }) => e.statusCode === "409" || /already exists/i.test(e.message);

export async function enviarReporte(
  cliente: ClienteReportes,
  datos: { id: string; obraId: string; partidaId: string; autorId: string; cantidad: number; comentario: string; foto: Blob | null },
  fotoYaSubida: boolean,
): Promise<{ ok: true } | { ok: false; mensaje: string; fotoSubida: boolean }> {
  const ruta = datos.foto ? `${datos.obraId}/${datos.autorId}/${datos.id}.jpg` : null;
  if (datos.foto && !fotoYaSubida) {
    const { error } = await cliente.subirFoto(ruta!, datos.foto);
    if (error && !yaExiste(error)) {
      return { ok: false, mensaje: "No se pudo subir la foto. Revisa la conexión y reintenta.", fotoSubida: false };
    }
  }
  const comentario = datos.comentario.trim();
  const { error } = await cliente.insertarReporte({
    id: datos.id,
    obra_id: datos.obraId,
    partida_id: datos.partidaId,
    autor: datos.autorId,
    cantidad: datos.cantidad,
    comentario: comentario === "" ? null : comentario,
    foto_path: ruta,
  });
  // 23505: el mismo reporte ya llegó (doble toque o reintento) → no se duplica.
  if (error && error.code !== "23505") {
    return { ok: false, mensaje: "No se pudo enviar el reporte. Revisa la conexión y reintenta.", fotoSubida: !!ruta };
  }
  return { ok: true };
}
```

Run: `npm test -w @pyxis/ovalle-obras -- lib/reportes lib/fotos` → PASS.

- [ ] **Step 3: Test del formulario (falla)**

`apps/ovalle-obras/components/terreno/FormularioReporte.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormularioReporte } from "./FormularioReporte";

const enviarReporte = jest.fn();
const push = jest.fn();
jest.mock("@/lib/reportes/enviar", () => ({
  enviarReporte: (...a: unknown[]) => enviarReporte(...a),
  clienteReportesDesde: () => ({}),
}));
jest.mock("@/lib/supabase/navegador", () => ({ crearClienteNavegador: () => ({}) }));
jest.mock("@/lib/fotos/preparar", () => ({ prepararFoto: async (f: File) => f }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: jest.fn() }) }));

const partida = { id: "p1", codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg", cantidad: 4200, ejecutado: 4000 };

describe("FormularioReporte", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra lo que falta y avisa si se pasa de lo presupuestado", async () => {
    render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
    expect(screen.getByText("Faltan 200 kg de 4.200 kg")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Cantidad ejecutada (kg)"), "300");
    expect(screen.getByText("Con este reporte se supera lo presupuestado. Puedes enviarlo igual.")).toBeInTheDocument();
  });

  it("envía con el mismo id en el reintento y conserva lo escrito si falla", async () => {
    enviarReporte
      .mockResolvedValueOnce({ ok: false, mensaje: "No se pudo enviar el reporte. Revisa la conexión y reintenta.", fotoSubida: true })
      .mockResolvedValueOnce({ ok: true });
    render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
    await userEvent.type(screen.getByLabelText("Cantidad ejecutada (kg)"), "12,5");
    await userEvent.type(screen.getByLabelText("Comentario (opcional)"), "Sector norte");
    await userEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo enviar el reporte");
    expect(screen.getByLabelText("Comentario (opcional)")).toHaveValue("Sector norte");

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    const [, primero, fotoYaSubida1] = enviarReporte.mock.calls[0];
    const [, segundo, fotoYaSubida2] = enviarReporte.mock.calls[1];
    expect(segundo.id).toBe(primero.id);
    expect(primero.cantidad).toBe(12.5);
    expect([fotoYaSubida1, fotoYaSubida2]).toEqual([false, true]);
    expect(push).toHaveBeenCalledWith("/terreno/obras/o1?enviado=1");
  });

  it("en modo % convierte a la unidad", async () => {
    enviarReporte.mockResolvedValue({ ok: true });
    render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
    await userEvent.click(screen.getByRole("button", { name: "%" }));
    await userEvent.type(screen.getByLabelText("Porcentaje ejecutado"), "1");
    expect(screen.getByText("= 42 kg")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    expect(enviarReporte.mock.calls[0][1].cantidad).toBe(42);
  });

  it("no envía cantidades inválidas", async () => {
    render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
    await userEvent.type(screen.getByLabelText("Cantidad ejecutada (kg)"), "0");
    await userEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa una cantidad mayor que 0.");
    expect(enviarReporte).not.toHaveBeenCalled();
  });
});
```

Run: `npm test -w @pyxis/ovalle-obras -- components/terreno/FormularioReporte` → FAIL.

- [ ] **Step 4: Formulario y páginas**

`apps/ovalle-obras/components/terreno/FormularioReporte.tsx`:
```tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatoCantidad } from "@/lib/formato";
import { prepararFoto } from "@/lib/fotos/preparar";
import { parseCantidadIngresada } from "@/lib/reportes/cantidad";
import { clienteReportesDesde, enviarReporte } from "@/lib/reportes/enviar";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

type Partida = { id: string; codigo: string; descripcion: string; unidad: string; cantidad: number; ejecutado: number };

export function FormularioReporte({ obraId, autorId, partida }: { obraId: string; autorId: string; partida: Partida }) {
  const router = useRouter();
  // Un id por reporte: los reintentos reutilizan el mismo y la BD no duplica.
  const [id] = useState(() => crypto.randomUUID());
  const fotoSubida = useRef(false);
  const [modo, setModo] = useState<"cantidad" | "porcentaje">("cantidad");
  const [texto, setTexto] = useState("");
  const [comentario, setComentario] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const falta = Math.max(partida.cantidad - partida.ejecutado, 0);
  const lectura = texto.trim() ? parseCantidadIngresada(texto, modo, partida.cantidad) : null;
  const seExcede = lectura?.ok && partida.ejecutado + lectura.cantidad > partida.cantidad;

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    const r = parseCantidadIngresada(texto, modo, partida.cantidad);
    if (!r.ok) {
      setError(r.mensaje);
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const blob = foto ? await prepararFoto(foto) : null;
      const resultado = await enviarReporte(
        clienteReportesDesde(crearClienteNavegador()),
        { id, obraId, partidaId: partida.id, autorId, cantidad: r.cantidad, comentario, foto: blob },
        fotoSubida.current,
      );
      if (resultado.ok) {
        router.push(`/terreno/obras/${obraId}?enviado=1`);
        router.refresh();
        return;
      }
      fotoSubida.current = resultado.fotoSubida;
      setError(resultado.mensaje);
      setFallo(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo falló. Reintenta.");
      setFallo(true);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <div>
        <p className="text-sm text-gray-600">{partida.codigo}</p>
        <h1 className="text-xl font-bold">{partida.descripcion}</h1>
        <p className="text-sm">Faltan {formatoCantidad(falta)} {partida.unidad} de {formatoCantidad(partida.cantidad)} {partida.unidad}</p>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <button type="button" onClick={() => setModo("cantidad")} className={`flex-1 rounded-lg py-2 ${modo === "cantidad" ? "bg-obra-fg text-white" : "bg-white"}`}>{partida.unidad}</button>
          <button type="button" onClick={() => setModo("porcentaje")} className={`flex-1 rounded-lg py-2 ${modo === "porcentaje" ? "bg-obra-fg text-white" : "bg-white"}`}>%</button>
        </div>
        <label className="block text-sm font-medium" htmlFor="cantidad">
          {modo === "cantidad" ? `Cantidad ejecutada (${partida.unidad})` : "Porcentaje ejecutado"}
        </label>
        <input
          id="cantidad"
          inputMode="decimal"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="w-full rounded-lg border border-obra-line bg-white px-3 py-3 text-2xl"
        />
        {modo === "porcentaje" && lectura?.ok && <p className="text-sm">= {formatoCantidad(lectura.cantidad)} {partida.unidad}</p>}
        {seExcede && <p className="text-sm text-obra-warn">Con este reporte se supera lo presupuestado. Puedes enviarlo igual.</p>}
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Foto (opcional)</span>
        <input type="file" accept="image/*" capture="environment" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} className="block w-full" />
      </label>

      <label className="block space-y-2" htmlFor="comentario">
        <span className="text-sm font-medium">Comentario (opcional)</span>
        <textarea id="comentario" maxLength={1000} rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} className="w-full rounded-lg border border-obra-line bg-white px-3 py-2" />
      </label>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-obra-warn">{error}</p>}

      <button disabled={enviando} className="w-full rounded-lg bg-obra-accent py-4 text-lg font-semibold text-white disabled:opacity-60">
        {enviando ? "Enviando…" : fallo ? "Reintentar" : "Enviar reporte"}
      </button>
    </form>
  );
}
```

`apps/ovalle-obras/app/terreno/obras/[id]/partidas/[partidaId]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { FormularioReporte } from "@/components/terreno/FormularioReporte";
import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export default async function Reportar({ params }: { params: Promise<{ id: string; partidaId: string }> }) {
  const { id, partidaId } = await params;
  const perfil = await exigirRol("terreno", "admin");
  const supabase = await crearClienteServidor();
  const [{ data: partida }, { data: ejecutado }] = await Promise.all([
    supabase.from("partidas").select("id, codigo, descripcion, unidad, cantidad").eq("id", partidaId).eq("obra_id", id).maybeSingle(),
    supabase.from("partida_ejecutado").select("ejecutado").eq("partida_id", partidaId).maybeSingle(),
  ]);
  if (!partida || partida.cantidad === null || partida.unidad === null) notFound();
  return (
    <FormularioReporte
      obraId={id}
      autorId={perfil.id}
      partida={{
        id: partida.id,
        codigo: partida.codigo,
        descripcion: partida.descripcion,
        unidad: partida.unidad,
        cantidad: Number(partida.cantidad),
        ejecutado: Number(ejecutado?.ejecutado ?? 0),
      }}
    />
  );
}
```

`apps/ovalle-obras/app/terreno/reportes/page.tsx`:
```tsx
import { Feed } from "@/components/dashboard/Feed";
import { exigirRol } from "@/lib/auth/sesion";
import { cargarFeed } from "@/lib/datos/feed";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export default async function MisReportes() {
  const perfil = await exigirRol("terreno", "admin");
  const reportes = await cargarFeed(await crearClienteServidor(), { autorId: perfil.id }, 30);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Mis reportes</h1>
      <Feed reportes={reportes.map((r) => ({ ...r, autor: "" }))} obraId="" conAnular={false} />
    </div>
  );
}
```

- [ ] **Step 5: Verificar y commit**

Run: `npm test -w @pyxis/ovalle-obras`, `npm run lint -w @pyxis/ovalle-obras`, `npm run build -w @pyxis/ovalle-obras` → OK.
Manual (celular real en la misma red: `npm run dev -w @pyxis/ovalle-obras -- -H 0.0.0.0` y abrir `http://<IP-PC>:3001`): reportar con foto → el admin lo ve en el feed; "Mis reportes" lo lista.
```bash
git add apps/ovalle-obras
git commit -m "feat(ovalle-obras): field progress report with photo, retry-safe"
```

---

### Task 19: App instalable (PWA básica)

**Files:**
- Create: `app/manifest.ts`, `app/icon.svg`
- Test: `app/manifest.test.ts`

**Interfaces:**
- Produces: `/manifest.webmanifest` con `start_url: "/"` y `display: "standalone"`.

- [ ] **Step 1: Test (falla)**

`apps/ovalle-obras/app/manifest.test.ts`:
```ts
/** @jest-environment node */
import manifest from "./manifest";

it("declara una app instalable que abre en su inicio", () => {
  expect(manifest()).toMatchObject({
    name: "Ovalle Obras",
    short_name: "Obras",
    start_url: "/",
    display: "standalone",
    icons: [expect.objectContaining({ src: "/icon.svg" })],
  });
});
```

Run: `npm test -w @pyxis/ovalle-obras -- app/manifest` → FAIL.

- [ ] **Step 2: Implementar**

`apps/ovalle-obras/app/manifest.ts`:
```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ovalle Obras",
    short_name: "Obras",
    description: "Reporte de avance de obra — Constructora Ovalle",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f2",
    theme_color: "#d9622b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
```

`apps/ovalle-obras/app/icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#d9622b"/>
  <path d="M14 46h36M20 46V26l12-8 12 8v20M28 46V34h8v12" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
</svg>
```

- [ ] **Step 3: Verificar y commit**

Run: `npm test -w @pyxis/ovalle-obras -- app/manifest` → PASS. `npm run build -w @pyxis/ovalle-obras` lista `/manifest.webmanifest`.
```bash
git add apps/ovalle-obras/app
git commit -m "feat(ovalle-obras): installable web app manifest"
```

---

### Task 20: Prueba end-to-end del flujo completo

**Files:**
- Create: `playwright.config.ts`, `e2e/flujo.spec.ts`
- Modify: `apps/ovalle-obras/.gitignore` (crear si no existe)

**Interfaces:**
- Consumes: toda la app; `construirPlantilla` (Task 6); Supabase local + `.env.local` (Task 2).

- [ ] **Step 1: Instalar Playwright**

Run (raíz): `npm install -D @playwright/test -w @pyxis/ovalle-obras`
Run (en `apps/ovalle-obras`): `npx playwright install chromium`

`apps/ovalle-obras/.gitignore`:
```
playwright-report/
test-results/
```

`apps/ovalle-obras/playwright.config.ts`:
```ts
import { defineConfig, devices } from "@playwright/test";

process.loadEnvFile(".env.local");

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  use: { baseURL: "http://localhost:3001", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3001/ingresar",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 2: Escribir el test**

`apps/ovalle-obras/e2e/flujo.spec.ts`:
```ts
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
  const { error } = await supabase.auth.admin.createUser({ email, email_confirm: true, user_metadata: { nombre, rol } });
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
```

- [ ] **Step 3: Correr**

Requiere `npm run db:start -w @pyxis/ovalle-obras` y `.env.local`.
Run: `npm run test:e2e -w @pyxis/ovalle-obras`
Expected: PASS (1 test). Si falla, abrir el trace con `npx playwright show-trace test-results/**/trace.zip` y arreglar la app (no relajar el test). Si `generateLink` no devuelve un código aceptado por `verifyOtp` con `type: "email"`, leer el código del último correo en la API de Mailpit (`http://127.0.0.1:54324/api/v1/messages`) en vez de usar `generateLink`.

- [ ] **Step 4: Commit**

```bash
git add apps/ovalle-obras package-lock.json
git commit -m "test(ovalle-obras): end-to-end import → field report → live feed"
```

---

### Task 21: Documentación y puesta en producción

**Files:**
- Create: `apps/ovalle-obras/README.md`
- Modify: `README.md` (raíz, sección Layout)

**Interfaces:**
- Consumes: todo lo anterior.

- [ ] **Step 1: README de la app**

`apps/ovalle-obras/README.md`:
````markdown
# Ovalle Obras (`@pyxis/ovalle-obras`)

Avance de obra para Constructora Ovalle. El admin carga el presupuesto/programación
de una obra desde Excel; el personal de terreno reporta avance desde el celular
(cantidad o %, foto y comentario opcionales); el admin ve tabla plan vs real,
Gantt, feed en vivo, avance valorizado y exporta a Excel/PDF.

Diseño: `docs/superpowers/specs/2026-10-06-ovalle-obras-design.md`.

## Desarrollo local

Requiere Node 24 y Docker Desktop corriendo.

```bash
npm install                                   # en la raíz del repo
npm run db:start -w @pyxis/ovalle-obras       # Supabase local (Postgres, Auth, Storage, Realtime)
npm run db:reset -w @pyxis/ovalle-obras       # aplica las migraciones
npm run env:local -w @pyxis/ovalle-obras      # escribe .env.local con las claves locales
npm run crear-admin -w @pyxis/ovalle-obras -- tu@email.cl "Tu Nombre"
npm run dev -w @pyxis/ovalle-obras            # http://localhost:3001
```

Los correos con el código de ingreso llegan a Mailpit: http://127.0.0.1:54324.
Supabase Studio: http://127.0.0.1:54323.

## Tests

```bash
npm test -w @pyxis/ovalle-obras         # unitarios (sin Docker)
npm run test:db -w @pyxis/ovalle-obras  # políticas RLS e importación (Supabase local)
npm run test:e2e -w @pyxis/ovalle-obras # flujo completo en navegador (Supabase local)
```

Tras cambiar una migración: `npm run db:reset` y `npm run db:types`.

## Producción

1. **Vercel:** nuevo proyecto desde `Pyxis-latam/monorepo-pyxis`, Root Directory
   `apps/ovalle-obras`, preset Next.js. Activar "Skip deployments when there are no
   changes to the root directory or its dependencies".
2. **Supabase:** en el proyecto de Vercel → Storage → Supabase (Marketplace). Esto
   crea la base y agrega las variables de entorno. Verificar que existan
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
   `SUPABASE_SERVICE_ROLE_KEY`; si la integración usa otros nombres, agregar estos
   apuntando a los mismos valores (la app los lee en `lib/env.ts`).
3. **Migraciones:** `npx supabase login`, `npx supabase link --project-ref <ref>` y
   `npx supabase db push` (desde `apps/ovalle-obras`).
4. **Auth (dashboard de Supabase → Authentication):**
   - Desactivar "Allow new users to sign up".
   - Plantilla "Magic Link": usar el contenido de `supabase/templates/codigo.html`
     (debe incluir `{{ .Token }}`).
   - **SMTP propio** (p. ej. Resend): el correo integrado de Supabase solo envía a
     miembros del equipo y con un límite muy bajo; sin SMTP propio el personal de
     terreno no recibe su código.
   - Site URL: el dominio de producción.
5. **Primer admin:** con las variables de producción en `.env.local` temporalmente,
   `npm run crear-admin -- correo@ovalle.cl "Nombre"`; luego borrar ese `.env.local`.
````

- [ ] **Step 2: README raíz**

En `README.md` (raíz), sección **Layout**, reemplazar el bloque por:
```
apps/
  landing/             @pyxis/landing — pyxis-latam.cl (Next.js)
  ovalle-obras/        @pyxis/ovalle-obras — avance de obra, Constructora Ovalle (Next.js + Supabase)
packages/
  typescript-config/   @pyxis/typescript-config — shared tsconfig bases
```

- [ ] **Step 3: Verificación final del monorepo**

Run (raíz): `npm run lint` → ambas apps sin errores.
Run (raíz): `npm test` → landing 74 tests + ovalle-obras todos PASS.
Run (raíz): `npm run build` → ambas apps compilan.
Run: `npm run test:db -w @pyxis/ovalle-obras` y `npm run test:e2e -w @pyxis/ovalle-obras` → PASS.

- [ ] **Step 4: Commit**

```bash
git add README.md apps/ovalle-obras/README.md
git commit -m "docs(ovalle-obras): local setup, tests and production runbook"
```

---

## Anexo: app móvil Expo (Tasks 22–24)

Spec: sección 11 del spec. Estas tareas usan los módulos de `@pyxis/ovalle-core` creados en las Tasks 5, 10, 11, 14, 17 y 18 (`fechas`, `formato`, `avance/*`, `datos/obra`, `datos/feed`, `terreno/lista`, `reportes/cantidad`, `reportes/enviar`, `database.types`).

**Constraints de la app móvil** (además de las Global Constraints que apliquen):
- `apps/ovalle-obras-movil`, paquete `@pyxis/ovalle-obras-movil`, Expo SDK 57, expo-router, TypeScript estricto.
- Dependencias nativas SIEMPRE con `npx expo install <pkg>` (dentro de `apps/ovalle-obras-movil`) para que coincidan con el SDK; después `npm install` en la raíz si hace falta para sincronizar el lockfile.
- Variables: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (en `apps/ovalle-obras-movil/.env.local`, ignorado por git).
- Ante dudas de API de Expo / expo-router / expo-image-picker / expo-image-manipulator, leer la documentación del paquete instalado en `node_modules` (README, `build/*.d.ts`); no asumir APIs de memoria.
- No definir script `build` (turbo `build` es para las webs). Scripts: `dev` (`expo start`), `android`, `ios`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`jest`), `export:check` (`expo export --platform android --output-dir dist-check`).
- Ids de reporte con `randomUUID()` de `expo-crypto` (React Native no tiene `crypto.randomUUID`).
- UI en español de Chile, botones grandes (mín. 48 px de alto), pensada para usar con una mano en obra.

### Task 22: App Expo — esqueleto, cliente Supabase, sesión e ingreso

**Files:**
- Create: `apps/ovalle-obras-movil/` (package.json, app.json, tsconfig.json, babel/metro config si el SDK los necesita, eslint.config.js, jest config, `.gitignore`), `app/_layout.tsx`, `app/ingresar.tsx`, `app/(app)/_layout.tsx`, `app/(app)/index.tsx` (temporal: "Obras" + botón Salir), `lib/supabase.ts`, `lib/sesion.tsx`, `scripts/env-local.mjs`
- Test: `__tests__/ingresar.test.tsx`, `__tests__/sesion.test.tsx`

**Interfaces:**
- Consumes: `Database` de `@pyxis/ovalle-core/database.types`.
- Produces:
  - `supabase: SupabaseClient<Database>` (`lib/supabase.ts`): `createClient` con `auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }`; registra un listener de `AppState` que llama `supabase.auth.startAutoRefresh()` en `active` y `stopAutoRefresh()` en otro estado.
  - `type PerfilMovil = { id: string; nombre: string; rol: "admin" | "terreno" }`
  - `SesionProvider` y `useSesion(): { cargando: boolean; perfil: PerfilMovil | null; sinAcceso: boolean; salir(): Promise<void> }` (`lib/sesion.tsx`). `sinAcceso` = hay sesión de Auth pero no hay perfil activo.

- [ ] **Step 1: Crear la app**
  En `apps/`: `npx create-expo-app@latest ovalle-obras-movil --template blank-typescript --no-install`. Ajustar `package.json`: `"name": "@pyxis/ovalle-obras-movil"`, `"main": "expo-router/entry"`, scripts de los constraints, dependencia `"@pyxis/ovalle-core": "*"`. `app.json`: `name: "Ovalle Obras"`, `slug: "ovalle-obras"`, `scheme: "ovalleobras"`, `orientation: "portrait"`, plugin `expo-router`, plugin `expo-image-picker` con `cameraPermission: "Ovalle Obras usa la cámara para adjuntar fotos a los reportes de avance."`. tsconfig extiende `expo/tsconfig.base` con `strict: true` y alias `@/*` → `./*`. Borrar `App.tsx`/`index.ts` del template.
  Desde `apps/ovalle-obras-movil`: `npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar @react-native-async-storage/async-storage expo-image-picker expo-image-manipulator expo-crypto`; desde la raíz `npm install @supabase/supabase-js -w @pyxis/ovalle-obras-movil`. Dev: `jest-expo`, `jest`, `@testing-library/react-native`, `@types/jest`, `eslint`, `eslint-config-expo` (con `npx expo install -- --save-dev ...` o `npm install -D ... -w`).
  Si Metro no resuelve `@pyxis/ovalle-core` en el monorepo, crear `metro.config.js` con `getDefaultConfig(__dirname)` (Expo ≥ 52 ya configura monorepos; agregar `watchFolders`/`nodeModulesPaths` solo si `export:check` falla).

- [ ] **Step 2: Tests de ingreso y sesión (fallan)**
  `__tests__/ingresar.test.tsx` (mockear `@/lib/supabase` y `expo-router`):
  - Escribe email, toca "Enviarme un código" → `supabase.auth.signInWithOtp` recibe `{ email: "juan@ovalle.cl", options: { shouldCreateUser: false } }` (email en minúsculas y sin espacios).
  - Aparece el campo "Código"; escribe `123456`, toca "Ingresar" → `verifyOtp({ email, token: "123456", type: "email" })` y `router.replace("/")`.
  - Si `verifyOtp` devuelve error → se muestra "El código no es válido o venció. Pide uno nuevo." y no navega.
  - Si `signInWithOtp` devuelve error → "No pudimos enviar el código. Revisa el email o pide acceso al administrador."
  `__tests__/sesion.test.tsx`: con un cliente mock cuyo `auth.getSession` devuelve una sesión y `from("perfiles")…maybeSingle()` devuelve `{ id, nombre, rol, activo: true }` → `useSesion().perfil` queda con esos datos; con `activo: false` → `perfil` null y `sinAcceso` true; sin sesión → `perfil` null y `sinAcceso` false.
  Run: `npm test -w @pyxis/ovalle-obras-movil` → FAIL (módulos no existen).

- [ ] **Step 3: Implementar**
  - `lib/supabase.ts` como en Interfaces. Si `supabase-js` falla en Hermes por `URL`, agregar `react-native-url-polyfill/auto` como primer import.
  - `lib/sesion.tsx`: al montar, `getSession()`; escucha `onAuthStateChange`; con sesión carga `perfiles` (`id, nombre, rol, activo`) del usuario; `salir()` llama `signOut()`.
  - `app/_layout.tsx`: `SesionProvider` + `Stack` sin encabezados.
  - `app/ingresar.tsx`: mismos textos y flujo que la web (`apps/ovalle-obras/components/auth/FormularioIngreso.tsx`): "Email", "Enviarme un código", "Código", "Ingresar", "Usar otro email"; `keyboardType="email-address"` / `"number-pad"`, `autoComplete="one-time-code"` en el código.
  - `app/(app)/_layout.tsx`: mientras `cargando` → `ActivityIndicator`; sin perfil y sin `sinAcceso` → `<Redirect href="/ingresar" />`; con `sinAcceso` → pantalla "Tu cuenta no tiene acceso" + botón "Salir"; con perfil → `Tabs` con "Partidas" (`index`) y "Mis reportes" (`reportes`, se crea en Task 24; mientras no exista, no declararla).
  - `scripts/env-local.mjs`: lee `../ovalle-obras/.env.local`, toma `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, reemplaza `127.0.0.1`/`localhost` por la IP LAN IPv4 de la máquina (`os.networkInterfaces()`, primera no interna) y escribe `.env.local` con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Script npm `env:local`.
- [ ] **Step 4: Verificar**
  `npm test -w @pyxis/ovalle-obras-movil` → PASS. `npm run typecheck -w @pyxis/ovalle-obras-movil` → sin errores. `npm run lint -w @pyxis/ovalle-obras-movil` → sin errores. `npm run export:check -w @pyxis/ovalle-obras-movil` → termina exportando el bundle (Metro empaqueta, incluido `@pyxis/ovalle-core`). Borrar `dist-check/` y agregarlo a `.gitignore`. En la raíz, `npm test` y `npm run lint` siguen verdes para todas las apps.
- [ ] **Step 5: Commit** — `feat(ovalle-obras-movil): Expo app scaffold with Supabase session and email-code login`

### Task 23: App Expo — obras, partidas y reportar con foto

**Files:**
- Modify: `app/(app)/index.tsx` (lista real de obras)
- Create: `app/(app)/obras/[id].tsx`, `app/(app)/obras/[id]/partidas/[partidaId].tsx` (o la estructura equivalente de expo-router), `components/TarjetaPartida.tsx`, `components/FormularioReporte.tsx`, `lib/fotos.ts`, `lib/reportes.ts`
- Test: `__tests__/FormularioReporte.test.tsx`, `__tests__/fotos.test.ts`, `__tests__/reportes.test.ts`

**Interfaces:**
- Consumes: `cargarAvanceObra(supabase, obraId, hoy)` (`@pyxis/ovalle-core/datos/obra`), `hoyEnChile` (`fechas`), `itemsTerreno` / `enCursoHoy` / `buscarPartidas` / `ItemPartida` (`terreno/lista`), `parseCantidadIngresada` (`reportes/cantidad`), `enviarReporte` / `ClienteReportes` / `NuevoReporte` (`reportes/enviar`), `formatoCantidad` / `formatoPorcentaje` (`formato`), `supabase` y `useSesion` (Task 22).
- Produces:
  - `prepararFotoMovil(uri: string, ancho: number, alto: number): Promise<ArrayBuffer>` (`lib/fotos.ts`): redimensiona con expo-image-manipulator para que el lado mayor sea máx. 1600 (sin agrandar), JPEG calidad 0.8, y devuelve los bytes. Usa la API vigente del paquete instalado.
  - `clienteReportesMovil(cliente: SupabaseClient<Database>): ClienteReportes` (`lib/reportes.ts`): `subirFoto` hace `storage.from("fotos").upload(ruta, bytes, { contentType: "image/jpeg" })` y devuelve `{ error: { message, statusCode } | null }`; `insertarReporte` hace `from("reportes").insert(fila)` y devuelve `{ error: { code, message } | null }`.
  - `FormularioReporte({ obraId, autorId, partida, alEnviar })` con `partida: { id; codigo; descripcion; unidad; cantidad; ejecutado }` y `alEnviar(): void`.

- [ ] **Step 1: Tests (fallan)**
  - `__tests__/reportes.test.ts`: con un cliente mock, `subirFoto("o1/u1/r1.jpg", bytes)` llama `storage.from("fotos").upload("o1/u1/r1.jpg", bytes, { contentType: "image/jpeg" })`; un error de storage `{ message: "The resource already exists", statusCode: "409" }` se devuelve tal cual; `insertarReporte(fila)` propaga `error.code` (p. ej. `"23505"`).
  - `__tests__/fotos.test.ts`: con expo-image-manipulator mockeado, una foto de 4032×3024 se redimensiona a ancho 1600 (y una vertical 3024×4032 a alto 1600), con compresión 0.8 y formato JPEG; una de 800×600 no se agranda.
  - `__tests__/FormularioReporte.test.tsx` (mockear `@pyxis/ovalle-core/reportes/enviar` → `enviarReporte`, `@/lib/reportes`, `@/lib/fotos`, `@/lib/supabase`, `expo-image-picker`, `expo-crypto` → `randomUUID` fijo):
    - Muestra "Faltan 200 kg de 4.200 kg" para `{ cantidad: 4200, ejecutado: 4000, unidad: "kg" }`; al escribir 300 aparece "Con este reporte se supera lo presupuestado. Puedes enviarlo igual."
    - "12,5" → `enviarReporte` recibe `cantidad: 12.5`; si devuelve `{ ok: false, mensaje, fotoSubida: true }` se muestra el mensaje, se conserva el comentario y el botón dice "Reintentar"; el reintento usa el mismo `id` y `fotoYaSubida: true`; con `{ ok: true }` llama `alEnviar`.
    - Modo "%": "1" con cantidad 4200 muestra "= 42 kg" y envía 42.
    - "0" muestra "Ingresa una cantidad mayor que 0." y no envía.
  Run: `npm test -w @pyxis/ovalle-obras-movil` → FAIL.
- [ ] **Step 2: Implementar**
  - `app/(app)/index.tsx`: obras activas (`from("obras").select("id, nombre").eq("estado", "activa").order("nombre")`); con una sola, `router.replace` a ella; estado vacío "No hay obras activas."; pull-to-refresh.
  - `app/(app)/obras/[id].tsx`: `cargarAvanceObra(supabase, id, hoyEnChile())`; `TextInput` de búsqueda ("Buscar partida…"); sin búsqueda, sección "En curso hoy" (`enCursoHoy`) y luego por capítulo (`itemsTerreno`); con búsqueda, `buscarPartidas` sin secciones; `TarjetaPartida` con código, descripción, barra de avance y "x%, ejecutado/cantidad unidad"; pull-to-refresh; parámetro `enviado=1` muestra "Reporte enviado ✓".
  - Pantalla de partida: carga la partida (`partidas` + `partida_ejecutado`) y renderiza `FormularioReporte`; `alEnviar` → volver a la lista de la obra con `enviado=1`.
  - `FormularioReporte`: selector unidad / "%"; `TextInput` `keyboardType="decimal-pad"` con label "Cantidad ejecutada (<unidad>)" o "Porcentaje ejecutado"; "Tomar foto" (`launchCameraAsync`, pide permiso) y "Elegir de la galería" (`launchImageLibraryAsync`), miniatura y "Quitar foto"; comentario multilínea (máx. 1000) con label "Comentario (opcional)"; botón "Enviar reporte" / "Enviando…" / "Reintentar". Id del reporte con `randomUUID()` una sola vez (estado inicial); `fotoYaSubida` en un ref, igual que la web. Al enviar: `prepararFotoMovil(uri, ancho, alto)` si hay foto → `enviarReporte(clienteReportesMovil(supabase), { id, obraId, partidaId, autorId, cantidad, comentario, foto: bytes }, fotoYaSubida)`.
  - Si `enviarReporte` del core tipa `foto` como `Blob`, ampliarlo a `Blob | ArrayBuffer` en `packages/ovalle-core/src/reportes/enviar.ts` (y en `ClienteReportes.subirFoto`) sin cambiar su comportamiento; los tests del core deben seguir pasando.
- [ ] **Step 3: Verificar** — tests, typecheck, lint y `export:check` como en Task 22; `npm test -w @pyxis/ovalle-core` sigue verde.
- [ ] **Step 4: Commit** — `feat(ovalle-obras-movil): obras, partidas and photo progress reports`

### Task 24: App Expo — Mis reportes y documentación

**Files:**
- Create: `app/(app)/reportes.tsx`, `apps/ovalle-obras-movil/README.md`
- Modify: `app/(app)/_layout.tsx` (declarar la pestaña), `README.md` raíz (Layout), `apps/ovalle-obras/README.md` (sección "App móvil" con un enlace)
- Test: `__tests__/reportes-pantalla.test.tsx`

**Interfaces:**
- Consumes: `cargarFeed(supabase, { autorId }, 30)` y `ReporteFeed` (`@pyxis/ovalle-core/datos/feed`), `formatoCantidad` (`formato`), `useSesion` (Task 22).

- [ ] **Step 1: Test (falla)** — con `cargarFeed` mockeado devolviendo un reporte `{ cantidad: 20, partida: { codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg" }, comentario: "Sector norte", creado_en: "2026-11-05T14:32:00Z", anulado: false, fotoUrl: "https://x/f.jpg" }` y otro anulado: se ve "20 kg · 1.1 Enfierradura losa P3", "Sector norte", "05-11-2026 11:32" (hora de Chile), una imagen con accessibilityLabel "Foto del reporte", y "Anulado" en el segundo; sin reportes: "Todavía no has enviado reportes.". `cargarFeed` se llama con `{ autorId: <id del perfil> }` y 30.
- [ ] **Step 2: Implementar** — `FlatList` con pull-to-refresh; hora con `Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", ... })` armada con `formatToParts` como `dd-mm-aaaa HH:MM`; foto con `Image` (URL firmada).
- [ ] **Step 3: README de la app** — qué hace; requisitos (Expo Go SDK 57 en el teléfono, misma red Wi-Fi que el PC); pasos: `npm run db:start -w @pyxis/ovalle-obras`, `npm run env:local -w @pyxis/ovalle-obras`, `npm run env:local -w @pyxis/ovalle-obras-movil`, `npm run dev -w @pyxis/ovalle-obras-movil` y escanear el QR; tests; producción: `.env` con la URL y anon key del Supabase de producción, `npx eas build -p android --profile preview` (APK interno) y `eas submit` para tiendas (requiere cuentas Expo/Google/Apple — fuera de este repo). En el README raíz agregar a Layout `ovalle-obras-movil/  @pyxis/ovalle-obras-movil — app de terreno, Constructora Ovalle (Expo)` y `ovalle-core/  @pyxis/ovalle-core — lógica de dominio compartida web/móvil`.
- [ ] **Step 4: Verificar** — tests, typecheck, lint, `export:check` de la app; en la raíz `npm test`, `npm run lint`, `npm run build` verdes.
- [ ] **Step 5: Commit** — `feat(ovalle-obras-movil): my reports screen and docs`

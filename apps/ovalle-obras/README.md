# Ovalle Obras (`@pyxis/ovalle-obras`)

Avance de obra para Constructora Ovalle. El admin carga el presupuesto/programación
de una obra desde Excel; el personal de terreno reporta avance desde el celular
(cantidad o %, foto y comentario opcionales); el admin ve tabla plan vs real,
Gantt, feed en vivo, avance valorizado y exporta a Excel/PDF.

Diseño: [`docs/superpowers/specs/2026-10-06-ovalle-obras-design.md`](../../docs/superpowers/specs/2026-10-06-ovalle-obras-design.md).

## Cómo está organizado

```
apps/ovalle-obras/
  app/               rutas de Next.js: /ingresar, /admin/**, /terreno/**, /fotos/**
  components/        componentes de UI (auth, dashboard, importacion, terreno, usuarios)
  lib/               código propio de la web: excel/, exportar/, gantt/, fotos/, auth/,
                     usuarios/, supabase/ (clientes), env.ts
  proxy.ts           refresca la sesión y redirige a /ingresar si no hay usuario
  supabase/          config.toml, migraciones SQL, plantilla del correo y tests de BD
  scripts/           env-local.mjs y crear-admin.mjs
  e2e/               prueba de punta a punta (Playwright)
packages/ovalle-core/  @pyxis/ovalle-core — lógica de dominio compartida
                       (fechas, formato, cálculos de avance, lista de terreno, envío
                       de reportes, carga de datos y tipos generados de Supabase)
```

`@pyxis/ovalle-core` no depende de Next.js a propósito: está pensado para compartirse con
la app móvil Expo que prevé el diseño (sección 11; todavía no está en el repo). La web lo
importa como `@pyxis/ovalle-core/<ruta>` (p. ej. `@pyxis/ovalle-core/avance/arbol`).

## Desarrollo local

Requiere Node 24 y Docker Desktop corriendo.

```bash
npm install                                   # en la raíz del repo
npm run db:start -w @pyxis/ovalle-obras       # Supabase local (Postgres, Auth, Storage, Realtime)
npm run db:reset -w @pyxis/ovalle-obras       # aplica las migraciones desde cero (borra los datos locales)
npm run env:local -w @pyxis/ovalle-obras      # escribe .env.local con las claves locales
npm run crear-admin -w @pyxis/ovalle-obras -- tu@email.cl "Tu Nombre"
npm run dev -w @pyxis/ovalle-obras            # http://localhost:3001
```

Los correos con el código de ingreso llegan a Mailpit: http://127.0.0.1:54324.
Supabase Studio: http://127.0.0.1:54323. `npm run db:stop -w @pyxis/ovalle-obras` apaga todo.

Un `db:reset` borra también los usuarios: hay que volver a correr `crear-admin`.

### Variables de entorno

`env:local` las escribe en `apps/ovalle-obras/.env.local` (ignorado por git); en producción
son las variables del proyecto de Vercel. La app las lee en `lib/env.ts` (y `proxy.ts`).

| Variable | Dónde se usa |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | navegador y servidor |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navegador y servidor (el acceso real lo limitan las políticas RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor** (`lib/supabase/admin.ts`) y `crear-admin`; salta RLS, nunca con prefijo `NEXT_PUBLIC_` |

### Base de datos y tipos

Esquema, políticas RLS, buckets de Storage (`fotos`, `importaciones`) y la publicación de
Realtime viven en `supabase/migrations/` (nada se configura a mano). Tras cambiar una
migración:

```bash
npm run db:reset -w @pyxis/ovalle-obras   # la aplica en la base local
npm run db:types -w @pyxis/ovalle-obras   # regenera packages/ovalle-core/src/database.types.ts
```

## Tests

Desde la raíz, `npm run lint` y `npm test` corren todos los workspaces (no necesitan Docker).
Por separado:

```bash
npm test -w @pyxis/ovalle-obras         # unitarios de la web (sin Docker)
npm test -w @pyxis/ovalle-core          # unitarios de la lógica de dominio (sin Docker)
npm run test:db -w @pyxis/ovalle-obras  # políticas RLS e importación (Supabase local)
npm run test:e2e -w @pyxis/ovalle-obras # flujo completo en navegador (Supabase local)
```

- `test:db` y `test:e2e` necesitan el Supabase local corriendo (`db:start`) y el `.env.local`
  de `env:local`. Crean usuarios y obras de prueba en la base a la que apunte ese archivo:
  **nunca los corras con las claves de producción en `.env.local`.**
- `test:e2e` levanta `npm run dev` (puerto 3001) si no hay un servidor corriendo. La primera
  vez puede hacer falta `npx playwright install chromium`.

## Cómo funciona (lo que conviene saber al operar)

- **Ingreso:** sin contraseñas ni registro abierto. La persona escribe su email en
  `/ingresar`, recibe un código de 6 dígitos y lo ingresa. Solo entran usuarios que un admin
  creó antes (`shouldCreateUser: false`).
- **Roles y usuarios:** el rol (`admin` o `terreno`) vive en `app_metadata.rol` de Supabase
  Auth, que solo puede escribir la service role; el nombre, en `user_metadata.nombre`. Un
  trigger de la base crea el perfil. Los usuarios se crean desde la web en
  **Usuarios → Crear usuario** (nombre, email, rol) o con `crear-admin`. Crear un usuario no
  envía ningún correo: la persona va a `/ingresar` y pide su código. Desactivar un usuario
  le quita el acceso a los datos (RLS) y bloquea la renovación de su sesión.
- **Excel:** primera hoja con las columnas `Código | Descripción | Unidad | Cantidad | Precio
  unitario | Fecha inicio | Fecha fin` (plantilla descargable en `/admin/plantilla`). Máximo 4 MB.
  Reimportar una obra cruza por código; si una partida que ya tiene reportes no viene en el
  Excel (o pasaría a ser capítulo), la importación se rechaza.
- **Fotos:** el navegador las reduce a máx. 1600 px (JPEG 0.8) y las sube directo al bucket
  privado `fotos` en `<obra_id>/<autor_id>/<reporte_id>.jpg` (límite del bucket: 10 MB). La web
  las sirve en `/fotos/<ruta>`, que revisa RLS con la sesión del usuario y las deja en caché
  privada del navegador.
- **Datos grandes:** PostgREST devuelve como máximo 1000 filas por consulta (`max_rows`); la
  app pagina por sobre ese límite (`traerTodo`), así que una obra con más de 1000 partidas o
  reportes se carga completa.
- **En vivo:** el dashboard se suscribe a Realtime sobre `reportes`; el indicador pasa de
  "En vivo" a "Reconectando…" si el canal se cae.

## Producción

1. **Vercel:** nuevo proyecto desde `Pyxis-latam/monorepo-pyxis`, Root Directory
   `apps/ovalle-obras`, preset Next.js. Activar "Skip deployments when there are no
   changes to the root directory or its dependencies". Verificar que "Include source files
   outside of the Root Directory in the Build Step" esté activo (la app usa
   `packages/ovalle-core` y `@pyxis/typescript-config`) y que la versión de Node sea 24.x.
2. **Supabase:** en el proyecto de Vercel → Storage → Supabase (Marketplace). Esto
   crea la base y agrega las variables de entorno. Verificar que existan
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
   `SUPABASE_SERVICE_ROLE_KEY`; si la integración usa otros nombres, agregar estos
   apuntando a los mismos valores (la app los lee en `lib/env.ts`). Si las agregas después
   del primer deploy, hay que redeployar.
3. **Migraciones:** `npx supabase login`, `npx supabase link --project-ref <ref>` y
   `npx supabase db push` (desde `apps/ovalle-obras`). `link` pide la contraseña de la base
   (se puede restablecer en Supabase → Project Settings → Database). `db push` aplica
   solo las migraciones (tablas, RLS, buckets y Realtime); **no** sube `supabase/config.toml`
   (tiene el `site_url` local), así que la configuración de Auth va por el dashboard (paso
   siguiente). Repetir `db push` cada vez que se agregue una migración.
4. **Auth (dashboard de Supabase → Authentication):**
   - Desactivar "Allow new users to sign up". El proveedor Email debe seguir **activado**:
     apagarlo deshabilita también el ingreso por código ("Email logins are disabled").
   - Plantilla "Magic Link": usar el contenido de `supabase/templates/codigo.html`
     (debe incluir `{{ .Token }}`) y el asunto "Tu código de ingreso a Ovalle Obras".
     Es la plantilla que Supabase usa para el código de ingreso de un usuario existente.
   - Largo del código de email: 6 (la pantalla de ingreso dice "código de 6 dígitos") y
     vencimiento de 3600 s (la plantilla dice "Vence en 1 hora"), igual que `supabase/config.toml`.
   - **SMTP propio** (p. ej. Resend): el correo integrado de Supabase solo envía a
     miembros del equipo y con un límite muy bajo; sin SMTP propio el personal de
     terreno no recibe su código.
   - Site URL: el dominio de producción.
5. **Primer admin:** con las variables de producción en `apps/ovalle-obras/.env.local`
   temporalmente, `npm run crear-admin -w @pyxis/ovalle-obras -- correo@ovalle.cl "Nombre"`;
   luego borrar ese `.env.local` y volver a las claves locales con `npm run env:local`
   (mientras tenga claves de producción, `dev`, `test:db` y `test:e2e` apuntan a producción).
6. **Probar:** entrar a `/ingresar` con ese email (el código debe llegar por el SMTP
   configurado), crear un usuario de terreno en **Usuarios**, subir una obra con la
   plantilla y reportar avance desde un celular: debe aparecer en el feed del admin.

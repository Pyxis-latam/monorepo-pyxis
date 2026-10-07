# Río Limarí Obras móvil (`@pyxis/riolimari-obras-movil`)

App de terreno de Constructora e Inmobiliaria Río Limarí, hecha con Expo (SDK 57) y expo-router. Es la
versión nativa (Android/iOS) del flujo de terreno de la web [`apps/riolimari-obras`](../riolimari-obras/README.md):
usa el mismo proyecto Supabase, las mismas políticas RLS y la misma ruta de fotos. No agrega
endpoints. El admin sigue trabajando solo en la web; un admin que ingrese en la app ve lo
mismo que terreno.

Qué hace:

- **Ingreso** con el email y un código de 6 dígitos (sin contraseñas ni registro abierto: solo
  entran usuarios activos que un admin creó). La sesión queda guardada en el teléfono y se
  renueva sola mientras la app está en primer plano.
- **Partidas:** obras activas → partidas de la obra ("En curso hoy" primero, por capítulo, con
  buscador) → formulario para reportar avance (cantidad o %, foto con la cámara o la galería,
  comentario opcional). La foto se reduce en el teléfono a máx. 1600 px (JPEG 0,8). Si el envío
  falla, el formulario conserva lo escrito y reintenta con el mismo id de reporte.
- **Mis reportes:** tus últimos 30 reportes (cantidad, partida, comentario, foto, hora de Chile
  y si fueron anulados). Se actualiza al tirar hacia abajo y cada vez que vuelves a la pestaña
  (las fotos se piden con URL firmadas que duran 1 hora, así que una pantalla que quedó abierta
  mucho rato no muestra fotos rotas). Sin señal avisa y deja la lista anterior. Terreno solo ve
  reportes de obras activas (RLS): los de una obra cerrada desaparecen de esta lista.
- **Salir** desde el encabezado (pide confirmar: volver a entrar exige un código por email).

## Cómo está organizado

```
apps/riolimari-obras-movil/
  app/          rutas de expo-router: ingresar, (app)/(partidas)/** (obras → partidas → reporte)
                y (app)/reportes (Mis reportes); (app)/_layout.tsx es el guard de sesión y las pestañas
  components/   Boton, BotonSalir, FormularioReporte, TarjetaPartida
  lib/          supabase.ts (cliente; sesión en AsyncStorage), sesion.tsx, fotos.ts, tema.ts
  scripts/      env-local.mjs
  __tests__/    pruebas unitarias (jest-expo + Testing Library de React Native)
```

La lógica de dominio (fechas, formato, cálculos de avance, lista de terreno, envío de reportes,
feed y tipos de Supabase) vive en [`packages/riolimari-core`](../../packages/riolimari-core) y la
comparte con la web. Se importa como `@pyxis/riolimari-core/<ruta>`.

## Requisitos

- Node 24 y `npm install` en la raíz del repo (los workspaces se instalan juntos).
- Un teléfono con **Expo Go para SDK 57** (Android o iOS) en la **misma red Wi-Fi** que el PC.
- Para probar contra la base local: Docker Desktop corriendo (Supabase local).

## Desarrollo local (Expo Go)

```bash
npm install                                          # en la raíz del repo
npm run db:start -w @pyxis/riolimari-obras              # Supabase local
npm run env:local -w @pyxis/riolimari-obras             # .env.local de la web (de ahí salen las claves)
npm run env:local -w @pyxis/riolimari-obras-movil       # .env.local de la app, apuntando a la IP del PC
npm run dev -w @pyxis/riolimari-obras-movil             # expo start: escanea el QR con Expo Go
```

- Si aún no existe ningún usuario, crea un admin con `npm run crear-admin -w @pyxis/riolimari-obras -- tu@email.cl "Tu Nombre"`
  y, desde la web (**Usuarios → Crear usuario**), un usuario de terreno. Un `db:reset` borra también
  los usuarios.
- El código de ingreso llega a Mailpit, en el PC: http://127.0.0.1:54324.
- El teléfono no llega a `127.0.0.1` del PC, por eso `env:local` (de la app móvil) reemplaza
  `127.0.0.1`/`localhost` de la URL de Supabase por la IP de la red local. Sin argumentos usa la primera
  IPv4 no interna que no sea de un adaptador virtual (Hyper-V/WSL, Docker, VirtualBox, VMware…). Si elige
  una IP equivocada, pásala a mano: `npm run env:local -w @pyxis/riolimari-obras-movil -- 192.168.1.20`.
  Falla con un mensaje claro si falta el `.env.local` de la web.
- `.env.local` está ignorado por git y guarda una IP fija de tu red: si cambias de red (otro Wi-Fi, otra IP
  del PC), vuelve a correr `env:local` y reinicia Metro. Expo lee las variables `EXPO_PUBLIC_*` al empaquetar:
  después de cambiarlo, reinicia `npm run dev`. Si el teléfono no conecta con Supabase, revisa que el
  firewall del PC permita el puerto 54321.
- `npm run android` / `npm run ios` abren la app en un emulador o dispositivo conectado
  (equivalen a `expo start --android` / `--ios`).
- Ojo: `npm run dev` en la raíz corre el `dev` de **todas** las apps (también esta). Para trabajar solo
  en la app móvil usa siempre `-w @pyxis/riolimari-obras-movil`.

### Variables de entorno

| Variable | Qué es |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (en local, `http://<IP del PC>:54321`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | clave anónima; el acceso real lo limitan las políticas RLS |

Expo incrusta en la app todo lo que lleve el prefijo `EXPO_PUBLIC_`, así que ahí **nunca** va la `service_role`.

## Scripts y pruebas

| Script | Qué hace |
|---|---|
| `npm run dev -w @pyxis/riolimari-obras-movil` | `expo start` |
| `npm run android -w @pyxis/riolimari-obras-movil` | `expo start --android` |
| `npm run ios -w @pyxis/riolimari-obras-movil` | `expo start --ios` |
| `npm run env:local -w @pyxis/riolimari-obras-movil [-- <ip>]` | escribe `.env.local` desde el de la web |
| `npm test -w @pyxis/riolimari-obras-movil` | pruebas unitarias (`jest`; no necesitan Docker ni Supabase) |
| `npm run typecheck -w @pyxis/riolimari-obras-movil` | `tsc --noEmit` |
| `npm run lint -w @pyxis/riolimari-obras-movil` | `eslint .` |
| `npm run export:check -w @pyxis/riolimari-obras-movil` | `expo export` para Android: comprueba que Metro empaqueta la app dentro del monorepo |

`export:check` deja el resultado en `dist-check/` (ignorado por git; bórralo si quieres).
Desde la raíz, `npm run lint` y `npm test` también corren esta app. No hay script `build`: el
`npm run build` de la raíz es solo para las webs.

Las dependencias nativas se agregan con `npx expo install <paquete>` dentro de
`apps/riolimari-obras-movil`, para que la versión coincida con el SDK; después, `npm install` en la
raíz si hace falta sincronizar el lockfile.

## Producción

La app no se despliega en Vercel: se compila con [EAS](https://docs.expo.dev/eas/) y se reparte
como APK interno o por las tiendas. Nada de esto está configurado todavía en el repo (no hay
`eas.json`), y requiere cuentas que no son parte del repo: una cuenta de **Expo** y, para las
tiendas, de **Google Play** y **Apple Developer**.

1. **Backend:** el Supabase de producción ya debe estar listo según la sección "Producción" de la
   [web](../riolimari-obras/README.md#producción) (migraciones aplicadas, registro abierto desactivado,
   SMTP propio para que el código de ingreso llegue al personal de terreno).
2. **Variables:** al compilar, `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` deben apuntar al
   Supabase de producción (la URL del proyecto y la anon key, no la `service_role`). Sin ellas la app falla
   apenas arranca (`lib/supabase.ts` lanza un error al cargar), así que un build sin variables no sirve.
   - **Builds en la nube de EAS (lo normal):** define las dos como variables de entorno del proyecto en Expo,
     para el entorno que use el perfil de build (en el dashboard de expo.dev o con `npx eas env:create`).
     Es la vía principal: los archivos `.env*` de esta carpeta **no** llegan a EAS, porque están ignorados por
     git (`.gitignore` de la raíz ignora `.env*`) y EAS Build no sube lo que git ignora.
   - **Builds locales** (`eas build --local`, `expo run:*` en tu PC): sirve un archivo
     `apps/riolimari-obras-movil/.env` con esos dos valores. Sigue ignorado por git y **no** se sube a EAS. Ojo:
     `.env.local` tiene prioridad sobre `.env`, así que el de desarrollo (con la IP de tu red) no debe quedar
     ahí al compilar localmente.
3. **Identificadores:** `app.json` todavía no define `android.package` ni `ios.bundleIdentifier`; hay que
   elegirlos antes del primer build (después de publicar en una tienda ya no se pueden cambiar).
4. **APK interno (Android):** con la cuenta de Expo, `npx eas login`, vincular el proyecto (`npx eas init`)
   y crear `eas.json` con un perfil `preview` de distribución interna que genere un APK (ver la documentación
   de EAS Build sobre `eas.json`). Luego:

   ```bash
   cd apps/riolimari-obras-movil
   npx eas build -p android --profile preview
   ```

   EAS entrega un enlace para descargar e instalar el APK en los teléfonos del equipo.
5. **Tiendas:** un build de producción (`eas build` con el perfil correspondiente) y `npx eas submit`
   para subirlo a Google Play / App Store Connect, con las cuentas y fichas de cada tienda ya creadas.
6. **Probar:** entrar con un usuario de terreno real (el código debe llegar por el SMTP de producción),
   reportar avance con foto y comprobar que aparece en el feed del admin y en **Mis reportes**.

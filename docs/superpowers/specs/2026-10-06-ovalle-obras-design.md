# Ovalle Obras — diseño (V1)

Fecha: 2026-10-06 · Cliente: Constructora Ovalle · App: `apps/ovalle-obras` (`@pyxis/ovalle-obras`)

## 1. Objetivo

Constructora Ovalle hoy controla sus obras con Unysoft y se quiere cambiar. La
V1 resuelve un flujo concreto: el admin carga el presupuesto/programación de una
obra desde un Excel, el personal de terreno reporta avance desde el celular a
medida que ocurre, y el admin ve el avance real contra lo planificado casi en
tiempo real.

**Éxito en V1:** un admin crea una obra subiendo un Excel; un usuario de terreno
reporta avance parcial (con foto y comentario opcionales) desde el celular; el
admin ve ese reporte en su dashboard en segundos, con avance físico, avance
valorizado, estado de atraso, Gantt y exportación a Excel/PDF.

## 2. Alcance

**Incluye**
- Dos roles: `admin` (escritorio) y `terreno` (móvil).
- Varias obras en el modelo de datos; UI mínima para ellas (listado + crear).
- Importación de Excel con plantilla propia; reimportación por código.
- Reportes de avance parcial (cantidad o %), foto opcional, comentario opcional.
- Dashboard: indicadores, tabla plan vs real, Gantt, feed en vivo, exportar
  Excel y PDF.
- Gestión de usuarios por invitación.
- PWA básica instalable (sin modo offline).

**No incluye (V1)**
- Multi-empresa. Una instalación = una constructora.
- Asignación de usuarios de terreno a obras específicas (terreno ve todas las
  obras activas).
- Modo offline / cola de reportes sin conexión. Se asume que hay internet.
- Importador del formato de exportación de Unysoft (se agrega cuando haya un
  archivo real).
- Edición del plan dentro de la app (el plan cambia reimportando el Excel).
- Edición o borrado de reportes por terreno.

## 3. Arquitectura

- **App:** Next.js (App Router) en `apps/ovalle-obras`, proyecto de Vercel
  propio con Root Directory `apps/ovalle-obras`. tsconfig extiende
  `@pyxis/typescript-config/nextjs.json`.
- **Supabase**, provisionado desde el Vercel Marketplace (variables de entorno
  conectadas al proyecto de Vercel):
  - **Postgres.** Esquema y políticas en migraciones SQL versionadas en
    `apps/ovalle-obras/supabase/migrations`. Nada se configura a mano en el
    dashboard.
  - **Auth.** Solo por invitación; ingreso con código/link al email (sin
    contraseñas).
  - **Storage.** Bucket privado `fotos`; lectura vía URLs firmadas.
  - **Realtime.** El dashboard del admin se suscribe a inserts/updates en
    `reportes`.
- La clave de servicio de Supabase solo se usa en código de servidor (invitar
  usuarios). El navegador usa la clave anónima + sesión, sujeto a RLS.

## 4. Modelo de datos

```
perfiles      id (= auth.users.id) · nombre · rol ('admin'|'terreno') · activo · creado_en
obras         id · nombre · estado ('activa'|'cerrada') · creado_en · creado_por
importaciones id · obra_id · archivo_path · filas · creado_en · creado_por
partidas      id · obra_id · parent_id? · codigo · descripcion · unidad? · cantidad?
              · precio_unitario? · fecha_inicio? · fecha_fin? · orden
reportes      id · partida_id · autor · cantidad · comentario? · foto_path?
              · creado_en · anulado · anulado_por? · anulado_en?
```

- `partidas.codigo` es único por obra. `parent_id` se deriva del código
  (`1.2.3` → padre `1.2`).
- **Capítulo** = partida sin `cantidad`; agrupa y suma. **Hoja** = partida con
  `cantidad` y `unidad`; es lo único reportable.
- `reportes.cantidad` > 0, en la unidad de la partida. Los reportes son
  acumulativos: el ejecutado de una partida es la suma de sus reportes no
  anulados.
- El archivo Excel original se guarda en un bucket privado `importaciones`
  (solo admin) como respaldo.

### Valores calculados (consultas/vistas, no columnas)

- `ejecutado` = Σ `reportes.cantidad` no anulados.
- `% avance` = `ejecutado / cantidad` (puede pasar de 100 %; se muestra así).
- `$ presupuestado` = `cantidad × precio_unitario`; `$ ejecutado` =
  `min(ejecutado, cantidad) × precio_unitario`.
- **Capítulo:** suma los $ de sus hijos; su % = `$ ejecutado / $ presupuestado`.
- **Avance físico global de la obra** = `Σ $ ejecutado / Σ $ presupuestado`
  (ponderado por monto, porque las unidades no se pueden sumar).
- **% esperado hoy** de una hoja = interpolación lineal entre `fecha_inicio`
  (0 %) y `fecha_fin` (100 %), acotada a [0, 100].
- **Estado** de una hoja: `terminada` si % ≥ 100; `atrasada` si
  `% avance < % esperado hoy`; `al día` en otro caso; `sin fechas` si le faltan
  fechas.

## 5. Plantilla Excel e importación

Columnas (primera hoja, primera fila = encabezados, en este orden):
`Código | Descripción | Unidad | Cantidad | Precio unitario | Fecha inicio | Fecha fin`

- Fila sin `Cantidad` = capítulo (`Unidad`, `Precio`, fechas se ignoran).
- Fechas: fecha nativa de Excel o texto `dd-mm-aaaa`.
- Montos en CLP. Números con separador de miles chileno aceptados si vienen
  como texto.
- Plantilla descargable desde la app, con una fila de ejemplo.

**Validación (antes de guardar, error por fila):** código vacío o duplicado,
padre inexistente, hoja sin unidad, cantidad o precio negativo/no numérico,
fecha inválida, `fecha_fin < fecha_inicio`, archivo sin hoja o sin encabezados
esperados.

**Flujo:** subir → parsear en servidor → vista previa (árbol + errores) →
confirmar → guardar en una transacción (todo o nada) → registrar en
`importaciones`.

**Reimportación sobre una obra existente:** cruza por `codigo`. Actualiza filas
existentes, agrega nuevas. Si una partida que no viene en el Excel tiene
reportes, la importación se rechaza listando esas partidas. Partidas sin
reportes que no vienen en el Excel se eliminan. La vista previa muestra
agregadas / modificadas / eliminadas antes de confirmar.

## 6. Pantallas

### Admin (escritorio)
1. **Obras:** listado con % de avance global y estado; botón "Nueva obra"
   (nombre + Excel + vista previa); cerrar obra.
2. **Dashboard de obra:**
   - Indicadores: avance físico global, $ ejecutado / $ presupuestado,
     n.º de partidas atrasadas.
   - **Tabla:** árbol de partidas con presupuestado, ejecutado, %, $, estado;
     filtros atrasadas / en curso / terminadas.
   - **Gantt:** barras planificadas, avance real pintado sobre cada barra, línea
     de "hoy". Solo lectura.
   - **Feed:** reportes en vivo (autor, partida, cantidad, hora, miniatura de
     foto, comentario); acción "anular".
   - **Exportar:** Excel (tabla completa con avance) y PDF (indicadores +
     tabla, para mandante o estado de pago).
   - **Reimportar Excel.**
3. **Usuarios:** invitar por email con rol, desactivar/reactivar.

### Terreno (móvil)
1. Ingreso con código al email. Con una sola obra activa entra directo.
2. **Partidas:** buscador; arriba "en curso hoy" (hoy ∈ [inicio, fin]); luego el
   resto agrupado por capítulo; barra de avance por partida.
3. **Reportar:** cantidad en la unidad de la partida o en %, muestra lo que
   falta; foto opcional (cámara directa, comprimida a ~1600 px antes de subir);
   comentario opcional; enviar. Si la suma supera lo presupuestado, avisa y
   permite enviar.
4. **Mis reportes:** últimos enviados por el usuario, con su estado (anulado o
   no).

## 7. Seguridad (RLS)

| Tabla / recurso | admin | terreno |
|---|---|---|
| `perfiles` | todo | leer el propio |
| `obras` | todo | leer las `activa` |
| `partidas` | todo | leer las de obras activas |
| `importaciones` | todo | — |
| `reportes` | todo (incluye anular) | leer los de obras activas; insertar con `autor = auth.uid()` en hojas de obras activas |
| Storage `fotos` | leer todo | subir en su propia ruta; leer de obras activas |
| Storage `importaciones` | todo | — |

- Usuario con `perfiles.activo = false` no pasa ninguna política.
- Sin registro abierto: solo usuarios invitados por un admin.
- Invitaciones y cambios de rol en server actions con la clave de servicio,
  verificando que el que llama es admin.

## 8. Manejo de errores

- **Importación:** errores por fila en la vista previa; guardado transaccional.
- **Reporte:** si el envío falla, el formulario conserva cantidad, comentario y
  foto, muestra el error y permite reintentar. Si la foto subió pero el reporte
  no, el reintento reutiliza la foto ya subida.
- **Realtime:** indicador "reconectando"; al reconectar recarga los datos del
  dashboard.
- **Sesión expirada:** redirige a ingreso y vuelve a la pantalla anterior.

## 9. Pruebas

- **Unitarias (Jest):** parser y validador del Excel; cálculos (ejecutado, %,
  $, % esperado, estado, agregación de capítulos, avance global); diff de
  reimportación.
- **Base de datos:** pruebas de RLS contra Supabase local (terreno no puede
  anular, insertar a nombre de otro, ver obras cerradas ni importaciones;
  usuario desactivado no ve nada).
- **End-to-end (Playwright):** admin crea obra con Excel → terreno (viewport
  móvil) reporta con foto → reporte aparece en el feed y la tabla del admin.

## 10. Preguntas abiertas

- Formato real de exportación de Unysoft (para un importador futuro).
- Contenido exacto que el mandante espera en el PDF de avance (la V1 entrega
  indicadores + tabla).

## 11. Anexo (2026-10-06): app móvil nativa con Expo

Ampliación de alcance: además de la web responsiva, el usuario de **terreno** tiene
una app nativa (Android/iOS) hecha con **Expo**.

- **Ubicación:** `apps/ovalle-obras-movil` (`@pyxis/ovalle-obras-movil`), Expo SDK 57
  con expo-router. No se despliega en Vercel; se prueba con Expo Go y se compila con EAS.
- **Alcance:** solo el flujo de terreno — ingreso con código al email, obras activas,
  lista de partidas ("en curso hoy" primero + buscador), reportar avance (cantidad o %,
  foto con la cámara o la galería, comentario), "Mis reportes" y salir. El admin sigue
  siendo solo web. Un admin que ingrese en la app ve lo mismo que terreno.
- **Mismo backend:** el mismo proyecto Supabase, las mismas políticas RLS y la misma
  ruta de fotos (`<obra_id>/<autor_id>/<reporte_id>.jpg`). No hay endpoints nuevos.
- **Lógica compartida:** el paquete `packages/ovalle-core` (`@pyxis/ovalle-core`) contiene
  la lógica de dominio pura que usan la web y la app: números y fechas chilenas, formato,
  cálculos de avance, lista de terreno, cantidad ingresada, envío de reportes a prueba de
  reintentos, carga de datos de obra y feed, y los tipos generados de Supabase.
- **Fotos:** se reducen en el teléfono a máx. 1600 px JPEG 0.8 antes de subir.
- **Sesión:** se guarda en el teléfono (AsyncStorage) y se renueva sola mientras la app
  está en primer plano.
- **Errores:** igual que la web — si el envío falla, el formulario conserva lo escrito y
  la foto y ofrece reintentar con el mismo id de reporte.
- **Pruebas:** unitarias con jest-expo y Testing Library de React Native (ingreso,
  formulario de reporte, adaptador de Storage), typecheck, y un `expo export` que
  verifica que Metro empaqueta la app dentro del monorepo.

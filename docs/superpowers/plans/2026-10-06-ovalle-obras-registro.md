> **Nota:** el 2026-10-07 la app se renombró a "Río Limarí Obras" (`apps/riolimari-obras`, `apps/riolimari-obras-movil`, `packages/riolimari-core`). Este documento es un registro histórico y conserva los nombres originales.

# Ovalle Obras — registro de ejecución

Registro de la ejecución del plan `2026-10-06-ovalle-obras.md`: decisiones tomadas (líneas `Ruling:`), hallazgos menores diferidos (`minor (deferred)`) y el resultado de cada tarea y su revisión. Los menores diferidos son el backlog sugerido para la siguiente iteración.

```text
# SDD ledger — plan: docs/superpowers/plans/2026-10-06-ovalle-obras.md
Spec: docs/superpowers/specs/2026-10-06-ovalle-obras-design.md
Branch: feat/ovalle-obras (from main ec1adb5)

Scope change (user, 2026-10-06): add an Expo phone app for the terreno role; "apruebo todo, no me preguntes". 
Ruling: pure, platform-free modules (numeros, fechas, formato, avance/*, terreno/lista, reportes/cantidad, reportes/enviar, datos/obra, fotos dimensiones, database types) live in packages/ovalle-core (@pyxis/ovalle-core) instead of apps/ovalle-obras/lib, so web and mobile share them — avoids duplicating domain logic — cost if wrong: one import-path refactor.
Ruling: mobile app = apps/ovalle-obras-movil (@pyxis/ovalle-obras-movil), Expo SDK 57 + expo-router, terreno flow only (login code, obras, partidas, reportar con cámara, mis reportes); added as Tasks 22-24 after the plan — spec only had a responsive web for terreno — cost if wrong: extra app to maintain.

Pre-flight:
- T6→T7 FilaCruda: consistent.
- T7→T8/T9 PartidaImportada JSON keys match RPC (codigo, codigo_padre, ..., orden): consistent.
- T10→T11..T17 NodoAvance/ResumenObra/enCurso: consistent.
- T12 ETIQUETA_ESTADO consumed by T15 exports (node env) — Ruling: define ETIQUETA_ESTADO in core avance/tipos and re-export from TablaAvance — avoids JSX import in node tests — cost: none.
- T14 Feed conAnular used by T18: Feed signature includes optional conAnular — consistent.
- T4 crearClienteNavegador consumed by T14/T18: consistent.
Task 1: Ruling: formato.ts lives in packages/ovalle-core/src (not apps/ovalle-obras/lib); core tested with jest+@swc/jest; db:types writes to packages/ovalle-core/src/database.types.ts; web next.config adds transpilePackages — per scope ruling — cost: none.
Task 1: complete (commits ec1adb5..3e46788, tests: packages/ovalle-core npx jest → 5/5 pass; web lint OK; web build OK)
Executor switch: user approved subagent-driven execution after Task 1.
Task 1: note — executed inline before the executor switch; no per-task reviewer, covered by the final review.
Ruling: spec §11 + plan Tasks 22-24 appended for the Expo app (docs commit after Task 2 to avoid index-lock races) — written by controller per user's scope change — cost if wrong: rework of mobile tasks.
Ruling: hoyEnChile must build YYYY-MM-DD from Intl formatToParts (not rely on en-CA format output), so it is correct on Hermes/Android — carry into Task 5 — cost: none.
Ruling: datos/feed.ts also goes to ovalle-core (mobile "Mis reportes" reuses cargarFeed) — carry into Task 14 — cost: none.
Ruling: Tasks 5-8 (pure parsing/Excel logic with complete code) are batched into one implementer dispatch + one review — same shape, isolated, fully specified — cost if wrong: a larger review surface.
Task 2: dispatched (BASE 3e46788, sonnet)
Task 2: review → spec ✅, 1 Important (plan-mandated): crear_perfil takes rol from user-editable raw_user_meta_data.
Task 2: Ruling: rol comes from raw_app_meta_data (service-role-only); nombre stays in user_metadata. ALL later createUser calls (Task 3 helpers, Task 4 crear-admin, Task 16 crearUsuario, Task 20 e2e) must pass `app_metadata: { rol }` and `user_metadata: { nombre }` — defense in depth if hosted signup is ever enabled — cost if wrong: none (strictly safer).
Task 2: minor (deferred): reportes.obra_id required in Insert type though trigger overwrites it.
Task 2: minor (deferred): partidas.parent_id not constrained to same obra (only RPC writes it).
Task 2: minor (deferred): no CHECK tying anulado/anulado_por/anulado_en together.
Task 2: minor (deferred): env-local.mjs overwrites whole .env.local and throws raw stack if Supabase is down.
Task 2: minor (deferred): database.types.ts committed unformatted.
Task 2: minor (deferred): partida_ejecutado view columns typed nullable; consumers must handle null.
Task 2: minor (deferred): trigger behaviours verified by throwaway psql only (Task 3 db tests cover part).
Task 2: fix round 1 dispatched (resume implementer)
Task 2: fix round 1/5 (1 addressed, 0 open; commits 569b274..f53daa7)
Task 2: complete (commits 3e46788..f53daa7, review clean after 1 fix round)
Task 3: dispatched (BASE f53daa7, sonnet)
Task 3: implementer DONE_WITH_CONCERNS: set [auth.email] enable_signup=true (CLI false disables the whole email provider; open signup still blocked by [auth] enable_signup=false + new test); added sincronizar_rol trigger (GoTrue writes app_metadata in a later UPDATE); env.js uses util.parseEnv. Sent to review.
Task 3: review (opus) → spec ❌ 1 Important (plan-mandated): importaciones RLS test asserts on empty table. Deviations (auth.email enable_signup=true, sincronizar_rol trigger, env.js) judged correct and safe.
Task 3: minor (deferred): fotos policies cast foldername[1]::uuid → malformed path errors instead of RLS denial; a bad object could break terreno listings.
Task 3: minor (deferred): sincronizar_rol fires on any app_metadata change; role edited in perfiles directly could be undone — role changes must go via auth.admin.updateUserById(app_metadata).
Task 3: minor (deferred): rol_actual()/obra_activa() executable by anon (obra_activa leaks whether a uuid is an active obra).
Task 3: minor (deferred): policies call rol_actual()/auth.uid() unwrapped (per-row eval; wrap in (select ...)).
Task 3: minor (deferred): several negative tests accept any error (signup test should assert code signup_disabled).
Task 3: minor (deferred): deactivated-user test checks only obras; no test that user's own updateUser({data:{rol:'admin'}}) leaves profile unchanged.
Task 3: minor (deferred): importaciones bucket allowed_mime_types null (restrict to xlsx).
Task 3: minor (deferred): admin update of reportes.partida_id would leave obra_id stale.
Task 3: fix round 1 dispatched (resume implementer)
Task 3: fix round 1/5 (1 addressed, 0 open; commits 48fa333..25b9029)
Task 3: complete (commits f53daa7..25b9029, review clean after 1 fix round)
Task 4: dispatched (BASE 25b9029, sonnet)
Task 4: review → ❌ 4 Important: open redirect in destinoSeguro (/\host, TAB) [plan-mandated]; proxy matcher lost backslash; @supabase/ssr 0.12 setAll cache headers ignored [plan-mandated]; /salir not public → 405 after expired-session logout.
Task 4: minor (deferred): /ingresar searchParams.siguiente typed string but may be string[] → 500 on repeated param.
Task 4: minor (deferred): exigirRol calls getUser twice (plus proxy) — 3 auth round-trips per page.
Task 4: minor (deferred): no tests for lib/auth/sesion.ts or proxy.ts redirects (deactivated, role mismatch, no session).
Task 4: minor (deferred): proxy.ts reads process.env directly, not lib/env.
Task 4: minor (deferred): lib/env.ts exposes supabaseServiceRoleKey from a module also imported by the browser client.
Task 4: minor (deferred): /salir signOut() is global scope and unchecked.
Task 4: minor (deferred): FormularioIngreso copy ("Pide uno nuevo" without a button), "Usar otro email" doesn't clear error/code, 429 gets generic copy, no test for signInWithOtp error; replace assertion should use waitFor.
Task 4: minor (deferred): crear-admin.mjs doesn't validate env vars; /ingresar doesn't redirect users already logged in.
Task 4: jest.config moduleNameMapper "^@/(.*)$" added (needed for jest.mock("@/...")) — accepted.
Task 4: fix round 1 dispatched (resume implementer)
Task 4: fix round 1/5 (3 addressed, 1 open — destinoSeguro normalizes dot-segments to //host (new open redirect); commits 0e8c1ef..5ad6cf7)
Task 4: minor (deferred): /salir route-handler signOut cookie clears don't get the ssr cache headers.
Task 4: minor (deferred): proxy redirect for unauthenticated requests drops cookie writes made on the discarded response.
Task 4: fix round 2 dispatched (resume implementer)
Task 4: fix round 2/5 (1 addressed, 0 open; commits 5ad6cf7..fe6ef5e) — destinoSeguro now also rejects backslash/control chars and validates its output (fuzzed 2M inputs by re-reviewer)
Task 4: complete (commits 25b9029..fe6ef5e, review clean after 2 fix rounds)
Task 4: minor (deferred): standalone tsc reports toHaveTextContent missing in FormularioIngreso.test.tsx (jest-dom types not in tsconfig).
Tasks 5-8: dispatched as one batch (BASE fe6ef5e, sonnet)
Tasks 5-8: review → ❌ 4 Important (all plan-mandated): numeric 1.10 read as 1.1 (exceljs .text ignores numFmt); error/uncached formula cells → null → leaf becomes chapter; parseFecha unbounded (throws on 1e9, "+010000-01"); "0.125" read as 125.
Tasks 5-8: Ruling: fix all four (data-integrity in Review Focus) — numeric non-integer codes become a row error; error cells surface as strings; dates bounded to 1900-2200; thousands regex requires non-zero leading group — cost if wrong: none.
Tasks 5-8: minor (deferred): duplicate headers silently take last column; header only searched in row 1 of first sheet.
Tasks 5-8: minor (deferred): hyperlink with rich-text text → "[object Object]".
Tasks 5-8: minor (deferred): row with unidad/precio/fechas but no cantidad silently becomes a chapter (spec behaviour; consider warning).
Tasks 5-8: minor (deferred): error messages don't echo offending value; empty code says "Código inválido"; CODIGO accepts 01 / 1.01.
Tasks 5-8: minor (deferred): parseFecha rejects 3/11/26, 3.11.2026, 2026-11-03.
Tasks 5-8: minor (deferred): module-level Intl formatter with timeZone could throw at import on engines without tz (Hermes) — lazy init safer.
Tasks 5-8: minor (deferred): diasEntre returns NaN on bad input.
Tasks 5-8: minor (deferred): test gaps — negative/non-numeric price, invalid dates in validar; diferencias only mutates cantidad; template dates not asserted.
Tasks 5-8: minor (deferred): template instructions omit "cantidad > 0" and "precio ≥ 0".
Tasks 5-8: minor (deferred): exceljs pulls uuid <11.1.1 (npm audit low).
Tasks 5-8: fix round 1 dispatched (resume implementer)
Tasks 5-8: fix round 1/5 (4 addressed, 0 open; commits f657249..8395973)
Tasks 5-8: complete (commits fe6ef5e..8395973, review clean after 1 fix round)
Tasks 5-8: minor (deferred): Excel error strings (#REF!, #SIN_VALOR) now accepted as Descripción/Unidad text.
Tasks 5-8: minor (deferred): numeric date serials rounded (Math.round) → .5+ fraction rolls to next day; Math.floor is correct.
Tasks 5-8: minor (deferred): formula in Código without cached result reads "" (dropped or "Código inválido").
Task 9: dispatched (BASE 8395973, sonnet)
Task 9: review → ❌ 1 Important (plan-mandated): delete before re-parent cascades children that stay in the Excel (FK error on moved partida with reportes).
Task 9: Ruling: reorder to block-check → upsert → re-parent → delete, plus explicit dangling codigo_padre check (P0001) — matches spec "actualiza las existentes" — cost: none.
Task 9: minor (deferred): RPC accepts [] payload (deletes all partidas without reportes); null/malformed payload only fails incidentally — add jsonb_typeof/length guard.
Task 9: minor (deferred): duplicate codigo in payload → 21000 error and duplicated codes in message.
Task 9: minor (deferred): null/empty p_nombre or unknown p_obra_id give raw 23502/23514/23503 instead of friendly P0001.
Task 9: minor (deferred): no test proves rollback after a write (only pre-write rejections tested).
Task 9: minor (deferred): thin assertions (parent of new 1.3, reporte survival, errcode P0001).
Task 9: minor (deferred): no row lock on the obra during import (concurrent reporte/import).
Task 9: minor (deferred): execute on aplicar_importacion granted to anon/public by default.
Task 9: minor (deferred): generated types make p_obra_id/p_nombre non-nullable — Task 11 action needs a cast.
Task 9: fix round 1 dispatched (resume implementer)
Task 9: fix round 1/5 (1 addressed, 0 open; commits e1c3d09..bff859c)
Task 9: complete (commits 8395973..bff859c, review clean after 1 fix round)
Task 9: minor (deferred): self-parent / cyclic codigo_padre not guarded in SQL (validator derives parent from code, so unreachable from the app).
Task 10: dispatched (BASE bff859c, sonnet)
Task 10: review → spec ✅, 1 Important (plan-mandated): estadoHoja terminada uses strict >= 1 while atrasada has 1e-9 epsilon.
Task 10: minor (deferred): orphans (parent_id → missing id) silently dropped from tree and totals.
Task 10: minor (deferred): partida with cantidad AND children drops children (validator prevents).
Task 10: minor (deferred): chapter with all precio 0 shows porcentaje 0 while estado terminada.
Task 10: minor (deferred): estadoCapitulo [terminada, sin_fechas] → al_dia.
Task 10: minor (deferred): cantidad 0 → NaN (DB check prevents).
Task 10: minor (deferred): dead branch total<=0 in porcentajeEsperado.
Task 10: minor (deferred): filtrarArbol keeps unfiltered chapter totals (document for UI).
Task 10: minor (deferred): test gaps (3-level nesting, empty chapter, precio 0, sin_fechas via arbol, en_curso boundaries).
Task 10: minor (deferred): hoy must be strict YYYY-MM-DD (implicit contract).
Task 10: fix round 1 dispatched (resume implementer)
Task 10: fix round 1/5 (1 addressed, 0 open; commits 7dcb0af..edf41de)
Task 10: complete (commits bff859c..edf41de, review clean after 1 fix round)
Task 11: dispatched (BASE edf41de, sonnet)
Task 11: implementer DONE_WITH_CONCERNS (file input aria-required instead of required for jsdom; Storage cleanup on failed RPC; obras query error thrown) — sent to review
Task 11: review → spec ✅ (deviations accepted), 1 Important (plan-mandated): partidas/reportes queries truncated at PostgREST max_rows 1000; reportes error unchecked.
Task 11: Ruling: add core helper traerTodo (paged .range) used by cargarAvanceObra and diferenciasCon; check every error — budgets can exceed 1000 partidas — cost: none.
Task 11: minor (deferred): stale-preview race (file input enabled while preview pending).
Task 11: minor (deferred): no client-side 4 MB check (>4.5 MB surfaces as generic failure).
Task 11: minor (deferred): raw English RPC/FK errors shown; client obraId not validated (non-uuid throws).
Task 11: minor (deferred): admin list N+1 (3 queries per obra) and ignored query errors in admin/page.tsx and importar/page.tsx.
Task 11: minor (deferred): acciones.ts untested (size limit, auth, storage cleanup); confirm-error rendering and reimport obraId not asserted.
Task 11: minor (deferred): confirm error persists after choosing new file; pages rely on layout exigirRol only.
Task 11: fix round 1 dispatched (resume implementer)
Task 11: fix round 1/5 (1 addressed, 0 open; commits 63e0fea..600d7f5)
Task 11: complete (commits edf41de..600d7f5, review clean after 1 fix round)
Task 11: minor (deferred): traerTodo silently truncates if server max_rows < 1000; diferenciasCon fetches every reporte row just for a set of partida_ids.
Task 12: dispatched (BASE 600d7f5, sonnet)
Task 12: review → spec ✅, Approved; 1 Important (plan-mandated): anularReporte lacks .eq("anulado", false), doesn't tie obraId to the reporte, no zero-row check.
Task 12: Ruling: fix anularReporte inside Task 14 (where it is wired to the UI) with a test — avoids touching an unwired action twice — cost if wrong: none (not reachable before Task 14).
Task 12: minor (deferred): a11y — nav aria-label/aria-current, table caption/scope, focusable scroll wrapper, badge contrast.
Task 12: minor (deferred): malformed obra id → 500 (22P02) instead of 404.
Task 12: minor (deferred): thin tests (other badges, clamp, Indicadores, Pestanas, action auth).
Task 12: minor (deferred): filtered chapter rows show unfiltered totals/badge.
Task 12: minor (deferred): cambiarEstadoObra no runtime check of estado; no confirmation on "Cerrar obra"; anulado_en uses app clock.
Task 12: complete (commits 600d7f5..cd3d6c6, review approved; 1 Important carried to Task 14)
Task 13: dispatched (BASE cd3d6c6, sonnet)
Task 13: review → spec ✅, 2 Important (plan-mandated): false "no tienen fechas" message when a filter empties the tree; aria-label on role-less div/p and colour-only status.
Task 13: minor (deferred): month labels overlap/clip on long ranges or month-end starts.
Task 13: minor (deferred): Gantt range rescales with the filter (today line can vanish).
Task 13: minor (deferred): undated leaves silently omitted; "has both dates" predicate duplicated.
Task 13: minor (deferred): test gaps (year rollover in meses, one-day range, posicionDia bounds, bar left/width).
Task 13: minor (deferred): float noise in CSS %, non-sticky label column, truncate without title, track contrast.
Task 13: fix round 1 dispatched (resume implementer)
Task 13: fix round 1/5 (2 addressed, 0 open; commits 6a7e458..8c1d916)
Task 13: complete (commits cd3d6c6..8c1d916, review clean after 1 fix round)
Task 14: dispatched (BASE 8c1d916, sonnet) — carries Task 12 Important (anularReporte guards)
Task 14: review → spec ✅, Approved; 1 Important (plan-mandated): fresh signed URLs on every realtime refresh re-download up to 50 full-size photos; URLs expire after 1 h.
Task 14: Ruling: web serves photos via same-origin route app/fotos/[...ruta] (RLS-checked storage download, Cache-Control private immutable); cargarFeed gets {firmarFotos} option (default true for mobile) and returns fotoPath — cost if wrong: server bandwidth for photo proxying.
Task 14: minor (deferred): RefrescoEnVivo stale subscribe callbacks under strict mode → one spurious refresh in dev.
Task 14: minor (deferred): RefrescoEnVivo test useRouter mock unstable identity; unmount test can't distinguish re-run.
Task 14: minor (deferred): indicator starts "Reconectando…" (should be "Conectando…"), no aria-live.
Task 14: minor (deferred): report between SSR and first SUBSCRIBED missed until next event; debounce has no max-wait.
Task 14: minor (deferred): feed capped at 50 without hint; BotonAnular no pending label / no refresh on failure; voided opacity dims badge; double space when unidad null; serial awaits in page.
Task 14: fix round 1 dispatched (resume implementer)
Task 14: fix round 1/5 (1 addressed, 0 open; commits ead0609..73a00e3)
Task 14: complete (commits 8c1d916..73a00e3, review clean after 1 fix round)
Task 14: minor (deferred): /fotos route trusts stored content-type (bucket allowlist protects; add route allowlist for defense in depth).
Task 14: minor (deferred): private immutable 1-year cache outlives logout on shared browser profiles.
Task 14: minor (deferred): /fotos buffers the blob; Vercel response limit ~4.5 MB vs 10 MB bucket limit — stream data.stream() or keep photos compressed.
Task 14: minor (deferred): /fotos runs without proxy session refresh (expired token → 404 until next navigation).
Task 15: dispatched (BASE 73a00e3, sonnet)
Task 15: review → spec ✅, Approved, no Critical/Important.
Task 15: minor (deferred): Excel columns clipped (Plazo, KPI labels), quantity cells lack numFmt, no frozen header/autofilter.
Task 15: minor (deferred): export routes lack explicit Cache-Control private,no-store and try/catch logging; PDF route runtime/maxDuration.
Task 15: minor (deferred): PDF prints "null" when unidad null; English hyphenation; WinAnsi-only font; no page footer.
Task 15: minor (deferred): jest.config ESM transform list hard-coded and require.resolve of hyphenate runs for every jest run.
Task 15: minor (deferred): PDF test doesn't assert multi-page or table content; routes untested.
Task 15: complete (commits 73a00e3..420901f, review clean)
Task 16: dispatched (BASE 420901f, sonnet)
Task 16: review → spec ✅, Approved, no Critical/Important.
Task 16: minor (deferred): no test that exigirRol rejection prevents crearClienteAdmin use.
Task 16: minor (deferred): duplicate-email mapping by message regex (use error.code "email_exists"); generic error not logged.
Task 16: minor (deferred): no error.tsx under app/ — thrown action errors show framework error page.
Task 16: minor (deferred): success message implies an email was sent (none is until the user asks for a code).
Task 16: minor (deferred): React 19 form reset clears fields after validation error; last-admin race; unvalidated action args; no maxLength on nombre.
Task 16: complete (commits 420901f..34fef5b, review clean)
Task 17: dispatched (BASE 34fef5b, sonnet)
Task 17: review → spec ✅, Approved, no Critical/Important (closed-obra access confirmed blocked by RLS + notFound).
Task 17: minor (deferred): search is single substring (multi-word "hormigon p3" fails); capítulo not searchable; raw combining chars in regex duplicated from formato.
Task 17: minor (deferred): search input lacks aria-label; bottom-nav tap targets ~20px; no safe-area inset; min-h-screen.
Task 17: minor (deferred): en-curso partidas also listed again under capítulo (plan-mandated test relies on it).
Task 17: minor (deferred): nested capítulo label loses parent context; empty-state text when obra has no partidas.
Task 17: minor (deferred): terreno/page ignores query error; non-uuid id → 500; enviado banner contrast.
Task 17: minor (deferred): no windowing for >1000 partidas; thin tests for ordering/headings/boundaries.
Task 17: complete (commits 34fef5b..e955701, review clean)
Task 18: dispatched (BASE e955701, sonnet)
Task 18: review (opus) → ❌ 1 Important: implementer's new-id-on-photo-change fires after a failed INSERT (can duplicate progress) and not after a failed upload (where it is needed). id helper with getRandomValues fallback accepted.
Task 18: Ruling: enviarReporte returns insertIntentado; re-key only when no insert was attempted; lock photo input after an insert attempt; fieldset disabled while sending — preserves "no duplica avance" — cost if wrong: user can't swap photo after a failed insert (must send as is).
Task 18: minor (deferred): parseCantidadIngresada checks >0 before rounding → "0,00001" becomes 0 and DB rejects with a "connection" message; numeric(14,4) overflow same.
Task 18: minor (deferred): all non-23505 failures shown as "revisa la conexión" (RLS 42501, P0001, 23514, HEIC rejected by bucket).
Task 18: minor (deferred): corrections after a lost-but-landed insert are silently dropped (retry → 23505 → "enviado").
Task 18: minor (deferred): button re-enables after success during navigation; id lost on navigation away (sessionStorage per partida).
Task 18: minor (deferred): createImageBitmap full decode of 48MP photos; no explicit imageOrientation; uncompressed fallback stored as .jpg whatever its type.
Task 18: minor (deferred): partida_ejecutado query error shown as 0 ejecutado.
Task 18: minor (deferred): a11y — toggle aria-pressed, over-budget warning not announced, aria-invalid; Mis reportes alt "Foto del reporte de " (pass perfil.nombre); no obra name in Mis reportes; admin empty-state wording.
Task 18: fix round 1 dispatched (resume implementer)
Task 18: fix round 1/5 (1 addressed, 0 open; commits 07b1bd9..0b65875)
Task 18: complete (commits e955701..0b65875, review clean after 1 fix round)
Task 18: minor (deferred, consider at final review): after an insert attempt, cantidad/comentario remain editable; if the first insert landed, an edited retry resolves 23505 = success and the edit is silently dropped.
Task 18: minor (deferred): permanent insert errors lock the photo for the session; orphaned storage object when upload landed but response lost and photo swapped.
Task 19: dispatched (BASE 0b65875, haiku)
Task 19: complete (commits 0b65875..b17751d, review clean)
Task 20: dispatched (BASE b17751d, sonnet)
Task 20: implementer found & fixed a real product bug: RefrescoEnVivo subscribed before Realtime had the session token (channel joined anonymously → RLS delivered nothing while showing "En vivo"); fix awaits supabase.realtime.setAuth() first (+ unit tests). Reviewer verified the mechanism in realtime-js.
Task 20: review → spec ✅, 1 Important (plan-mandated): photo assertion passes on a broken image.
Task 20: minor (deferred): setAuth reject path opens anonymous channel, untested; unstable useRouter mock in RefrescoEnVivo tests.
Task 20: minor (deferred): failed login waits 90s; reuseExistingServer unconditional; loadEnvFile cwd-dependent; e2e leaves users/obra/storage object.
Task 20: fix round 1 dispatched (resume implementer)
Task 20: fix round 1/5 (1 addressed, 0 open; commits 4484d19..af84be4)
Task 20: complete (commits b17751d..af84be4, review clean after 1 fix round)
Task 21: dispatched (BASE af84be4, sonnet)
Task 21: review → spec ✅, Approved, no Critical/Important. Final verification at root: lint ✓, test ✓ (core 82, landing 74, web 116), build ✓, test:db 19 ✓, test:e2e 1 ✓.
Task 21: minor (deferred): README lacks where to get <ref> and prod keys; suggest Production-only env scoping for previews; email rate limit after custom SMTP; lib map omits lib/reportes; root README ovalle-core line mentions mobile app.
Task 21: complete (commits af84be4..f53745e, review clean)
Task 22: dispatched (BASE f53745e, opus)
Task 22: implementer DONE (opus): Expo SDK 57 app; react 19.2.3 nested under the app (root keeps 19.2.4); test-renderer pinned ~1.2.0 to avoid hoisting React 19.3; env-local skips virtual adapters + accepts IP arg. Controller verified root lockfile versions unchanged except 2 patch bumps.
Task 22: review (opus) → spec ✅ except 1 Important (partly plan-mandated): profile query error shown as "sin acceso" with no retry (field worker on weak signal ends up logging out).
Task 22: Ruling: add errorPerfil + reintentar() to useSesion (additive), auto-retry on AppState active, layout shows connection error with "Reintentar" — cost: none.
Task 22: minor (deferred): stale profile shown briefly when same user signs in again (clear leido on SIGNED_OUT).
Task 22: minor (deferred): onSubmitEditing ignores cargando (double OTP send); /ingresar doesn't redirect a signed-in user; code field no maxLength; Android alert not announced (accessibilityLiveRegion).
Task 22: minor (deferred): no tests for (app) guard branches, AppState wiring, "Usar otro email".
Task 22: minor (deferred): image-picker plugin adds RECORD_AUDIO and English photo/mic prompts — set Spanish photosPermission and microphonePermission false (Task 23/24).
Task 22: minor (deferred): template icon/splash leftovers, supportsTablet true; env-local overwrites .env.local; root dev starts Metro; typecheck not in turbo; button contrast 3.7:1.
Task 22: fix round 1 dispatched (resume implementer)
Task 22: fix round 1/5 (1 addressed, 0 open; commits 4225830..a498a44)
Task 22: complete (commits f53745e..a498a44, review clean after 1 fix round)
Task 22: minor (deferred): Salir offline may keep session (signOut global scope) — consider signOut({scope:"local"}); any query error copy says "revisa tu señal".
Task 23: Ruling: mobile reuses core clienteReportesDesde (already handles ArrayBuffer → image/jpeg) instead of a new lib/reportes.ts adapter — DRY — cost: none; mobile form mirrors web Task 18 state machine (insertIntentado, lock photo after insert attempt, disable while sending); image-picker plugin gets Spanish photosPermission and microphonePermission false.
Task 23: dispatched (BASE a498a44, sonnet)
Task 23: review (opus) → spec ✅, Approved, no Critical/Important. Deviations accepted: (partidas) route group with own Stack; header BotonSalir with confirm; uri-keyed JPEG bytes cache; photo lock when enviarReporte throws.
Task 23: minor (deferred, FLAG for final fix pass — breaks "no duplica avance" in a narrow race): picker result applied via stale closure (insertIntentado read at tap time; Enviar not blocked while picker pending) → re-key after an insert attempt.
Task 23: minor (deferred): picker/permission errors unhandled; denied message ignores canAskAgain, no openSettings shortcut.
Task 23: minor (deferred): leaving the form discards data silently (usePreventRemove); prepararFotoMovil doesn't release native images; obras list hides refresh failures; "Reporte enviado" banner persists.
Task 23: minor (deferred, web): web FormularioReporte doesn't lock photo/id when enviarReporte throws (mobile does).
Task 23: complete (commits a498a44..038f23d, review clean)
Task 24: dispatched (BASE 038f23d, sonnet)
Task 24: review → spec ✅, 2 Important: README production step relies on a gitignored .env (EAS cloud build → APK crashes at launch) [partly plan-mandated]; report photo Image lacks `accessible` (VoiceOver never reads label on iOS).
Task 24: minor (deferred): dimmed voided cards also dim the "Anulado" badge; stale-response guard untested; refresh spinner timing; missing autorId leaves "cargando".
Task 24: fix round 1 dispatched (resume implementer)
Task 24: fix round 1/5 (2 addressed, 0 open; commits cf5cfb6..979f184)
Task 24: complete (commits 038f23d..979f184, review clean after 1 fix round)
All tasks complete. Final whole-branch review next.
Final review (opus): Ready to merge "With fixes". No Critical. Important: (1) edited retry silently dropped after insert attempt (web+mobile) + web catch doesn't set insertIntentado; (2) labels ambiguous cumulative vs incremental ("Cantidad/Porcentaje ejecutado") → worker enters running total, partida marked terminada; (3) mobile Mis reportes re-signs and re-downloads full photos on every focus.
Final triage → fix in the same pass: mobile picker stale-closure race (Task 23 FLAG); numeric date serial Math.round → Math.floor (Focus 2); usuarios success copy implies an email was sent.
Final: Ruling: Task 22 minor "Salir offline may keep session" is stale (auth-js _signOut removes local session on network failure) — dropped.
Final: Ruling: Hermes Intl (formatToParts/timeZone/hourCycle/normalize) unverifiable here — accept; device check listed in the handoff — cost if wrong: wrong dates/times on device.
Final: Ruling: /fotos Blob vs Vercel 4.5 MB response limit — photos are compressed to 1600 px JPEG before upload; only uncompressed fallbacks could exceed — accept and list in handoff — cost: a rare oversized photo fails to display.
Final: Ruling: Android killing the activity while the camera is open (getPendingResultAsync) — out of V1 — cost: rare lost form.
Final: Ruling: signInWithOtp(shouldCreateUser:false) reveals registered emails — accepted for an internal tool — cost: email enumeration.
Final: Ruling: iOS PWA without PNG apple-touch-icon — accept for V1 (basic PWA) — cost: generic icon on iOS home screen.
Final: Ruling: hosted Supabase auth.users triggers / Marketplace env var names unverified — README tells the team to verify — cost: deploy-time adjustment.
Final: Ruling: RLS per-row function cost and per-obra admin list queries — out of V1 scale — cost: slower admin list with many obras.
Final: Ruling: admin can edit any reportes column via RLS — spec grants admin "todo" — cost: none.
Final: minor (deferred): numeric Código ≥1000 with Chilean thousands format (1.100 → 1100) not flagged.
Final: minor (deferred): "40 %" typed in cantidad mode counts as 40 units.
Final: minor (deferred): reimport preview shows only counts; unit change on partida with reportes not flagged.
Final: minor (deferred): global signOut scope; "Cerrar obra" without confirmation; Expo template icon/splash + supportsTablet; mobile typecheck not in root lint; README lacks Supabase email rate-limit note.
Final: ONE fix dispatch (BASE 979f184, opus)
Final: fix wave re-review → all 6 addressed, no new Critical/Important (commits 979f184..eedce31). Final review clean.
```

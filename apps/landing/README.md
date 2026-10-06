# Pyxis Landing Page (`@pyxis/landing`)

Landing page for Pyxis, a group with two divisions:

- **Pyxis Labs** — recomposes existing companies: makes them more efficient and
  more powerful without growing or shrinking them. First case: a 100-person B2B
  office-supplies distributor in Chile; next verticals are the retail niche,
  then furniture and construction.
- **Pyxis Ventures** — builds companies that run without people. The first is
  **Hermes**, the "Zero Man Wholesaler": a distributor of inks, cartridges and
  printers piloting in Chile and expanding country by country.

## Page structure

`app/page.tsx` composes, in order: `Header` → `Hero` (umbrella statement) →
`SocialProof` → `Divisions` (two cards linking to `#labs` / `#ventures`) →
`Labs` (recomposition steps + growth timeline by vertical) → `Ventures` (Hermes
intro + pillars) → `GlobeExpansion` (Hermes country map) → `Team` → `FinalCta` →
`Footer`. All copy, in Spanish and English, lives in `lib/i18n/dictionary.ts`.
`components/ui/StepGrid.tsx` and `components/ui/PhaseTimeline.tsx` are the
shared primitives for the three-column steps and the animated timeline.

## Local development

This app lives in the `monorepo-pyxis` workspace. Install once from the repo
root, then run it from the root or from this folder:

```bash
npm install                            # at the repo root
npm run dev -- --filter=@pyxis/landing # from the root, via turbo
# or, inside apps/landing:
npm run dev
```

Open http://localhost:3000.

## Tests

```bash
npm test     # inside apps/landing (or `npm test` at the root for every app)
npm run lint
```

## Deploying to Vercel

The Vercel project points at this folder:

1. **Settings → Build and Deployment → Root Directory**: `apps/landing`.
2. Framework Preset is auto-detected as **Next.js**; leave the build and
   install commands at their defaults (Vercel installs from the repo root
   because it detects the npm workspace).

The page is fully static (no environment variables, no API routes, no database) —
the primary call to action is a `mailto:equipo@pyxis-latam.cl` link, so there is
nothing to configure beyond the root directory.

## Team photos and bios

Founder photos live in `public/team/` (`vicente.jpg`, `felipe.jpg`) and are
rendered with `next/image` in `components/Team.tsx`. To replace a photo, drop a
new file with the same name.

Clicking a founder's name expands a card with their bio and experience. That
copy lives in `lib/i18n/dictionary.ts` under `team.members[*].bio` and
`team.members[*].experiences`. The `experiences` entries are placeholders marked
with a `// TODO` comment — replace them with the real roles from each LinkedIn
profile (LinkedIn blocks automated scraping, so this step is manual).

## Space / constellation theme

Type: `Geist` (display and body), `Instrument Serif` italic for the one accented
phrase in each headline (`components/ui/Emphasis.tsx`) and `Geist Mono` for the
small labels. All three load through `next/font/google` in `app/layout.tsx`.

- `components/PyxisCompass.tsx` — the animated Pyxis mark: a brass dial with a
  settling north needle and the four stars of Pyxis (the constellation of the
  mariner's compass). Below 48px it thickens its strokes and drops the
  constellation lines; `app/icon.tsx` and `app/opengraph-image.tsx` carry static
  versions of the same mark.
- `components/PageBackdrop.tsx` — fixed layer behind the whole page: three
  drifting nebula clouds (CSS, `app/globals.css`) plus the starfield.
- `components/ParticleField.tsx` — DPR-aware starfield with depth: near stars are
  larger, brighter, drift faster and parallax against the scroll; rare shooting
  stars.
- `components/ui/SpotlightCard.tsx` — the glass panel used by the division and
  team cards: hairline border, top light catch and a brass spotlight that
  follows the cursor.
- `components/diagrams/Recomposition.tsx` — Labs figure: twelve nodes that
  start tangled and settle around one hub when scrolled into view (same node
  count before and after).
- `components/diagrams/HermesLoop.tsx` — Ventures figure: a closed loop through
  Compra → Venta → Despacho with one pulse of light running it, empty centre.
- `components/GlobeSection.tsx` — placeholder that keeps the `#expansion`
  anchor and only downloads three.js and the night texture when the visitor
  scrolls within ~800px of the section.

## Contact

The primary call to action is `components/ui/ScheduleButton.tsx`, a link to
Vicente's Cal.com page (`SCHEDULE_URL` in that file). The header's "Hablemos"
is a real `mailto:` link whose plain click opens
`components/ContactDialog.tsx` (state in `lib/contact/ContactContext.tsx`)
with the calendar link, the address with a Copy button and a Gmail compose
link, because `mailto:` alone does nothing on machines without a default
mail client.

## Labs content

`components/LabsCase.tsx` is the anonymised case note (B2B office-supplies
distributor). The four engagement stages (Auditoría, Diagnóstico y plan,
Implementación, Postventa) and the case copy live in `lib/i18n/dictionary.ts`
under `labs.steps` and `labs.case`.

## Site plumbing

`app/not-found.tsx` (branded 404), `app/icon.svg` + `app/icon.tsx` (favicon),
`app/apple-icon.tsx` (home-screen icon), `app/robots.ts`, `app/sitemap.ts`
and `components/OrganizationJsonLd.tsx` (schema.org Organization). The
language choice persists in `localStorage` under `pyxis-lang`; the header
highlights the section on screen via `lib/useActiveSection.ts`.

## Globe

- `components/GlobeExpansion.tsx` — a full-screen, photorealistic 3D night globe
  (three.js + WebGL) that spins from Chile → Mexico → Brazil & Paraguay on its
  own every six seconds, or when you press the arrows (which stops the
  auto-advance). It shows vector **country borders** (the focused country is
  highlighted in gold) and **callout labels** (a line linking each country to a
  name card) that track the country as the globe rotates. Assets live in
  `public/globe/`: `earth-night.jpg` (4096×2048 NASA Black Marble, via the
  three-globe example assets) and `countries.geojson` (Natural Earth 110m).
  Framing/rotation are tuned via the constants at the top of the component
  (`FOV`, `CAMERA_Z`, `GLOBE_Y`, …); label offsets live in the `ANN` array. It
  falls back gracefully (no crash) where WebGL is unavailable.

All animations respect `prefers-reduced-motion`.

# monorepo-pyxis

Every Pyxis application lives here: our own sites and the apps we build for
clients. One repository, npm workspaces for dependencies and
[Turborepo](https://turborepo.com) for running tasks across apps.

## Layout

```
apps/
  landing/             @pyxis/landing — pyxis-latam.cl (Next.js)
  ovalle-obras/        @pyxis/ovalle-obras — avance de obra, Constructora Ovalle (Next.js + Supabase)
packages/
  ovalle-core/         @pyxis/ovalle-core — lógica de dominio compartida (web y app móvil)
  typescript-config/   @pyxis/typescript-config — shared tsconfig bases
```

- `apps/*` — deployable applications. One folder per app, one Vercel project per
  app (its Root Directory is the app folder).
- `packages/*` — code and config shared between apps. Apps depend on them by
  name, e.g. `"@pyxis/typescript-config": "*"`.

## Adding an app

1. Create `apps/<name>/` (for a client app, prefix the client:
   `apps/<client>-<app>/`).
2. Name the package `@pyxis/<name>` and give it whichever of the `dev`, `build`,
   `start`, `lint` and `test` scripts it needs — turbo picks them up.
3. For a Next.js app, extend the shared config in its `tsconfig.json`:
   `"extends": "@pyxis/typescript-config/nextjs.json"`, and add
   `"@pyxis/typescript-config": "*"` to its `devDependencies`.
4. Run `npm install` at the root.
5. In Vercel, import the repository as a new project and set its Root Directory
   to `apps/<name>`.

## Commands

Install once, at the root (Node 24+):

```bash
npm install
```

Run tasks for every app, or one app with `--filter`:

```bash
npm run dev                             # every app
npm run dev -- --filter=@pyxis/landing  # just the landing
npm run build
npm run lint
npm test
```

Add a dependency to one app with `npm install <pkg> -w @pyxis/<name>`.

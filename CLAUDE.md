# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ZAGA Import** — Internal SPA for ZAGA's China import quoting & tracking workflow. Production: `app.zagaimp.com` (Vercel). Repo: `zalduafrancisco-ops/Zaga-Imp`. Supabase project: `ohehdoeysmwllppmtstp`.

Note: this checkout lives at `C:\Proyectos\Zaga-Imp`. The global user instructions also reference a mirror at `C:\Users\zaldu\OneDrive\Documentos\2. ZAGA\02. Importaciones` — they are separate working copies of the same repo.

## Commands

```bash
npm install       # install deps
npm run dev       # Vite dev server (default http://localhost:5173)
npm run build     # production build to dist/
npm run preview   # serve the production build locally
```

There is **no** lint, typecheck, or test setup in this repo. Don't invent commands for them.

`.env` must define `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` (Vite env vars, read in `src/supabase.js`). The committed `.env` holds the publishable key used in dev and prod.

## Architecture

### Role-based single-page app
`src/App.jsx` is the router. It reads `auth.getSession()` from Supabase, loads the matching row from `public.perfiles`, and renders one of three top-level components based on `perfil.rol`:

| rol              | Component              | What it is                                            |
|------------------|------------------------|-------------------------------------------------------|
| `admin`          | `cotizador_importaciones.jsx` | Full cotizador (Francisco, Luisa) — ~3700 lines, the core app |
| `cliente`        | `ClientePortal.jsx`    | Read-only tracker for a single client's imports       |
| `agente_china`   | `PortalChina.jsx`      | Bilingual ES/ZH portal for the China-side agent       |

`Login.jsx` covers the unauthenticated state. All four components share the single `supabase` client from `src/supabase.js`.

### Data model (Supabase)
Schema lives in `PASO1_ejecutar_en_supabase.sql`. Two tables:

- `perfiles` — `{id (uuid = auth.users.id), email, nombre, rol, cliente_nombre}`. The SQL file only declares roles `admin` / `cliente`, but `agente_china` is used in code (`App.jsx:66`, `PortalChina.jsx`); the check constraint has been relaxed manually in the live DB. If you re-run the SQL from scratch you must extend the `check (rol in (...))` clause.
- `cotizaciones` — `{id, nro, cliente, gestor, estado, tipo, datos jsonb, created_at, updated_at}`. The scalar columns are denormalized copies; **the full cotization object lives inside `datos`** and is the source of truth. Admin writes upsert both the scalars and the whole `datos` blob (see `persist` in `cotizador_importaciones.jsx:346`).

RLS enforces: clients see only rows where `cotizaciones.cliente = perfiles.cliente_nombre` (exact string match — keep cliente names consistent). Admins have full access. There's a trigger that bumps `updated_at` on update.

### Sync strategy (important)
The cotizador keeps state in three places in this order of trust:
1. **Supabase** `cotizaciones` — authoritative.
2. React state (`cotizaciones` array + `cotizacionesRef`) — in-memory working copy.
3. `localStorage['zaga_v6']` — offline fallback + one-time migration source on first run.

`persist(list)` in `cotizador_importaciones.jsx` is the single write path: it updates state, writes localStorage, then upserts the full list to Supabase and deletes rows whose ids disappeared. **Never bypass it** with direct Supabase writes — doing so breaks the localStorage mirror and cross-tab state. Real-time UPDATE events on the `cotizaciones` table are subscribed at the bottom of the load `useEffect` (~line 298); they merge remote changes back into state and fire toasts for new China-agent notes.

### Quote types
A cotización's `tipo` is either `"cliente"` (quoting for a third-party client) or `"propia"` (ZAGA importing for itself). Each has its own calculation function near the top of `cotizador_importaciones.jsx`:

- `calcCliente` (line 84) — two-payment model (deposit + saldo), 19% IVA handling, comisiones, CDA, fulfillment, etc.
- `calcPropia` (line 128) — cost-per-unit, ROI, margin, marketplace commission scenarios.

These produce a `calc` object that's embedded into the cotización entry on save. `calcActual` at line 380 picks the right one based on `form.tipo`. When changing the pricing/fees model, update both functions and every place that reads from `calc.*`.

### Workflow state machines
Two parallel concepts live inside each cotización:

- `estado` — a single string from `ESTADOS_ORDEN` (see `ClientePortal.jsx:59`), shown as the headline status with matching `EST_LABEL` / `EST_COLOR` / `EST_BG` maps. These maps are duplicated across `cotizador_importaciones.jsx`, `ClientePortal.jsx`, and `PortalChina.jsx` — when you add or rename a state, update **all three**.
- `checklist` — per-step booleans. There are two shapes: `CHECKLIST_CLIENTE` and `CHECKLIST_PROPIA` (top of `cotizador_importaciones.jsx`). `ClientePortal.jsx` uses its own `CHECKLIST_FULL` and a `TIMELINE` list for the visual stepper. Keep these aligned when adding steps.

`PortalChina.jsx` segments cotizaciones into five tabs by state buckets (`ESTADOS_PEND_COT`, `ESTADOS_PEND_CLIENTE`, `ESTADOS_CONFIRMADAS`, `ESTADOS_CAMINO`, `ESTADOS_COMPLETADAS` — top of the file). Labels there are bilingual (`EST_ES` / `EST_ZH`).

### Backup / migration
The admin UI has Export/Import JSON buttons (`exportarDatos`, `importarDatos`, `confirmarImport` near line 323). The format is `{version:"zaga_v6", fecha, cotizaciones:[...]}`. Import goes through `persist`, so it's a full replacement, not a merge.

## Conventions in this codebase

- React 18, plain JSX, **no TypeScript**, no PropTypes.
- Styling is **all inline styles** (no CSS files, no Tailwind, no CSS-in-JS library). The design tokens are scattered literals — primary gold `#c9a055`, dark navy `#040c18`, status colors in the EST_* maps. Match the existing palette when adding UI.
- Single-file mega-components are the norm here (cotizador ≈ 3700 lines). Don't aggressively refactor into many files unless asked — the user's edit history is almost entirely "Update cotizador_importaciones.jsx".
- Spanish is the UI language (and the variable names mix Spanish/English freely — `cotizaciones`, `persist`, `gestor`, `calcCliente`). Keep copy in Spanish.
- Logos are imported as assets from `src/logo-white.png` and `src/logo-dark.png`.
- Dates are stored as ISO `YYYY-MM-DD` strings; money is CLP formatted with `fmt` / `fmtN` helpers (line 150).

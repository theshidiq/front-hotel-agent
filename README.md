# Sinara — Hotel Front Agent

Operations platform for Japanese hotels and ryokan: allergen-aware menus, kitchen
production, front-desk guest alerts, and staff shift scheduling. All allergen
data is stored in Japanese.

## Features

- **Allergen management.** Scan a product label (Japanese) with an OCR model. Ingredients and allergens are extracted, and the product is saved with its allergens linked.
- **Menus.** Build menu groups, courses and dishes from products. Allergens are derived from the linked products. Menus can also be scanned from a printed copy, edited by drag and drop, and exported to Excel and Word (vertical tategaki layout). Edited Excel files can be imported back.
- **Kitchen production.** Live production view for the kitchen, with guest allergen matching that accounts for different words for the same allergen.
- **Front desk.** Reservations, rooms and guest allergy alerts, with realtime updates and a guest mobile form (`/guest/[token]`).
- **Shifts.** Staff calendars, unavailability, priority rules and constraints, with optimized schedules from a Python OR-Tools service.
- **Multi-tenant.** Data is scoped per organization, with role-based access (see `docs/rbac-design.md`).

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | SvelteKit 2 + Svelte 5 (runes), Tailwind CSS, Vite, Cloudflare Pages adapter |
| Backend | NestJS 11 (Express, Socket.IO), class-validator, Swagger |
| Database | Supabase (PostgreSQL, Storage, Realtime, Auth) |
| OCR / AI | Qwen VL-OCR (DashScope), Gemini, Anthropic Claude |
| Scheduler | Python + Google OR-Tools CP-SAT (`services/ortools`) |
| Tooling | pnpm workspaces (pnpm ≥ 9, Node ≥ 20) |

## Repository layout

```
apps/
  web/              SvelteKit frontend (port 5173)
  api/              NestJS backend (port 3002), Swagger at /api/docs
services/
  ortools/          OR-Tools shift optimizer (Flask, port 5000)
supabase/
  migrations/       SQL migrations, numbered
  seed/             Seed data (rooms, reservations)
docs/               Design notes, feature plans and handoffs
assets/, branding/  Design files and brand material
```

## Getting started

```bash
pnpm install
cp .env.example .env   # then fill in the values
pnpm dev               # API on :3002 and web on :5173
```

To run the shift optimizer locally:

```bash
docker-compose -f docker-compose.dev.yml up ortools   # exposed on :5050
```

### Environment variables

The `.env` file lives at the repo root and both apps read it (Vite uses `envDir: '../../'`).

| Variable | Used by | Purpose |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | api | Server-side Supabase access (bypasses RLS) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | web | Browser Supabase client |
| `VITE_API_URL` | web | API base URL (default `http://localhost:3002`) |
| `VITE_GOOGLE_CLIENT_ID` | web | Google sign-in |
| `API_PORT`, `CORS_ORIGINS` | api | Server port and allowed origins |
| `ORGANIZATION_ID` | api | Default organization for local development (`RESTAURANT_ID` is legacy) |
| `QWEN_API_KEY`, `QWEN_MODEL`, `QWEN_API_URL` | api | Label OCR |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | api | Menu scanning |
| `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` | api | Menu scanning |
| `ORTOOLS_URL`, `ORTOOLS_SECRET`, `ORTOOLS_TIMEOUT` | api | Shift optimizer service |

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run API and web together |
| `pnpm dev:web` / `pnpm dev:api` | Run one app |
| `pnpm build` | Build everything |
| `pnpm --filter @front-hotel-agent/web check` | svelte-check type checking |
| `pnpm test` | Run the tests (API Jest specs) |
| `cd services/ortools && python -m pytest` | Scheduler tests |

## Database

Migrations are in `supabase/migrations` and are applied in numeric order. Core tables:
`allergens`, `products`, `product_allergens`, `menus`, `menu_products`, `menu_groups`,
`scan_sessions`, `rooms`, `reservations`, `guest_alerts`, `staffs`, shift tables, and
`organizations`. Most tables carry `organization_id`.

## Deployment

A push to `main` runs `.github/workflows/deploy.yml`:

- **Web** → Cloudflare Pages (project `sinara`)
- **API** → Fly.io (`front-hotel-agent-api`, root `fly.toml`)
- **OR-Tools** → Fly.io (`services/ortools/fly.toml`)

`docker-compose.yml` runs the API and the optimizer together in containers.

## Documentation

- API reference: `http://localhost:3002/api/docs` (Swagger)
- In-app user guides: `/docs` in the web app
- Engineering notes: `docs/`

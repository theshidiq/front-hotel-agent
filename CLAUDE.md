# Hotel Front Agent - Allergen Management System

## Project Overview

Hotel allergen management system with AI-powered OCR scanning. Scan product labels (Japanese text), extract ingredient/allergen data via Qwen VL-OCR, manage products, and compose menu items with auto-derived allergens.

## Tech Stack

- **Monorepo**: pnpm workspaces (pnpm >=9, node >=20)
- **Frontend**: SvelteKit 5 + Svelte 5 (runes: `$state`, `$derived`) + Tailwind CSS 3.4 + Vite 6
- **Backend**: NestJS 11 + Express + TypeScript
- **Database**: Supabase (PostgreSQL) - project ref `ymdyejrljmvajqjbejvh`
- **Storage**: Supabase Storage bucket `product-images`
- **OCR**: Qwen VL-OCR via DashScope API (Japanese text extraction)

## Monorepo Structure

```
front-hotel-agent/
├── apps/
│   ├── web/          # SvelteKit frontend (port 5173)
│   └── api/          # NestJS backend (port 3002)
├── packages/         # Shared libraries (reserved)
├── .env              # Environment variables (shared)
└── pnpm-workspace.yaml
```

## Commands

```bash
pnpm dev          # Run both frontend + backend
pnpm dev:web      # SvelteKit dev server (localhost:5173)
pnpm dev:api      # NestJS dev server (localhost:3002)
pnpm build        # Build all
pnpm build:web    # Build frontend
pnpm build:api    # Build backend
pnpm lint         # Lint all
pnpm test         # Test all
```

## Environment Variables (.env at root)

```
SUPABASE_URL=https://ymdyejrljmvajqjbejvh.supabase.co
SUPABASE_ANON_KEY=<jwt>
SUPABASE_SERVICE_KEY=<jwt>
PUBLIC_SUPABASE_URL=<same as SUPABASE_URL>
PUBLIC_SUPABASE_ANON_KEY=<same as SUPABASE_ANON_KEY>
RESTAURANT_ID=<uuid>
API_PORT=3002
QWEN_API_KEY=<dashscope key>
QWEN_MODEL=qwen-vl-ocr
QWEN_API_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions
```

## Frontend (apps/web)

**Single-page app** - all UI lives in `src/routes/+page.svelte` (large file).

### Key Files
- `src/routes/+page.svelte` - Main page with tabs (Products | Menu), forms, modals
- `src/lib/api.ts` - REST API client (all fetch calls to localhost:3002)
- `src/lib/supabase.ts` - Supabase client init + image upload helper

### UI Features
- **Tab navigation**: Products tab / Menu tab
- **Add Product**: Scan Image mode (OCR) or Add Manually mode
- **Product list**: Expandable cards with edit/delete, dietary badges (V/VG/H/GF)
- **Menu management**: Create menu items linking products, auto-derived allergens
- **Settings modals**: Manage Product Categories, Manage Allergens (CRUD)
- **Allergen search**: Always-visible textbox to filter allergens in forms

### Svelte 5 Patterns
- Uses runes: `$state()`, `$derived()`, not legacy `let` reactivity
- No stores - all state is local with runes
- Event handlers use `onclick={}` not `on:click={}`

### API Client Types (lib/api.ts)
- `Product`, `Allergen`, `Menu`, `ScanResult`
- `CreateProductData`, `UpdateProductData`
- `CreateMenuData`, `UpdateMenuData`
- Functions: `scanProduct()`, `getProducts()`, `createProduct()`, `updateProduct()`, `deleteProduct()`, `getAllergens()`, `createAllergen()`, `deleteAllergen()`, `getMenus()`, `createMenu()`, `updateMenu()`, `deleteMenu()`

## Backend (apps/api)

### Module Structure
```
src/
├── main.ts              # Bootstrap: CORS, validation pipe, Swagger at /api/docs
├── app.module.ts        # Root module
├── supabase/            # Global Supabase client provider
├── allergens/           # Allergen CRUD (controller + service)
├── products/            # Product CRUD with allergen linking
│   └── dto/             # CreateProductDto, UpdateProductDto, ProductResponse
├── menus/               # Menu CRUD with product linking + allergen derivation
│   └── dto/             # CreateMenuDto, UpdateMenuDto, MenuResponse
├── scan/                # Image scan workflow (upload → OCR → auto-save)
│   └── dto/             # CreateScanDto, ScanResultResponse
└── qwen/                # Qwen VL-OCR API integration
    └── dto/             # OcrExtractedData, QwenApiResponse
```

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/allergens` | List allergens (optional `?category=` filter) |
| POST | `/allergens` | Create allergen `{ name, category }` |
| DELETE | `/allergens/:id` | Delete allergen |
| GET | `/products` | List products with allergens |
| GET | `/products/:id` | Get product detail |
| POST | `/products` | Create product with `allergen_ids[]` |
| PUT | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |
| GET | `/menus` | List menus with products & derived allergens |
| GET | `/menus/:id` | Get menu detail |
| POST | `/menus` | Create menu with `product_ids[]` |
| PUT | `/menus/:id` | Update menu |
| DELETE | `/menus/:id` | Delete menu |
| POST | `/scan` | Scan image `{ imageUrl }` → OCR → auto-create product |
| GET | `/scan` | List scan sessions |
| GET | `/scan/:id` | Get scan result |

### Swagger Docs
Available at `http://localhost:3002/api/docs` when API is running.

### Key Patterns
- `SupabaseService` is global, injected everywhere - provides `getClient()` and `getRestaurantId()`
- Backend uses service key (bypasses RLS)
- Validation: `class-validator` + `class-transformer` via global `ValidationPipe`
- Allergen derivation: menus derive allergens from linked products at query time (service layer)

## Database Schema

### Tables
| Table | Key Columns |
|-------|-------------|
| `allergens` | id, name, category, is_mandatory_japan, created_at |
| `products` | id, restaurant_id, name, brand, category, ingredients_raw, nutrition_per_100g (jsonb), dietary flags, image_url |
| `product_allergens` | product_id, allergen_id, source ('label'\|'inferred') |
| `menus` | id, restaurant_id, name, description, price, category, image_url, is_available |
| `menu_products` | menu_id, product_id |
| `scan_sessions` | id, restaurant_id, image_url, status, product_id, raw_response (jsonb) |

### Relationships
```
Restaurant 1──N Products
Restaurant 1──N Menus
Restaurant 1──N ScanSessions
Product N──N Allergens  (via product_allergens)
Menu    N──N Products   (via menu_products)
ScanSession ──1 Product (optional FK)
```

### Allergen Categories
grain, egg, dairy, meat, fish, shellfish, nut, legume, other

### Constraints
- `product_allergens` has a check constraint on `source` column (allowed values: 'label', 'inferred')
- `menu_products` has UNIQUE(menu_id, product_id)
- All allergen names are in Japanese

## Scan Workflow
1. Frontend uploads image to Supabase Storage → gets public URL
2. POST `/scan` with `{ imageUrl }`
3. Backend creates `scan_sessions` record (pending → processing)
4. Calls Qwen VL-OCR API with Japanese extraction prompt
5. Parses response → auto-creates product + links allergens
6. Updates scan session (completed, links product_id)
7. Returns complete product with allergens

## Important Notes
- All allergens are stored in Japanese (43 total)
- Frontend API base URL is hardcoded to `http://localhost:3002` in `lib/api.ts`
- CORS is configured for `localhost:5173` and `localhost:3000`
- The `.env` file is at the repo root and Vite is configured to read from there (`envDir: '../../'`)
- Product categories are managed in frontend state (not persisted to DB)
- Menu categories: appetizer, main, dessert, beverage, side, special, other

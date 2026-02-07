# Implementation Plan: Qwen Vision OCR Integration

## Overview
Integrate Qwen VL-OCR API into NestJS backend to scan product packaging images and extract allergen/nutrition data.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   SvelteKit     │────▶│    NestJS API   │────▶│   Qwen VL-OCR   │
│   (Frontend)    │     │    (Backend)    │     │   (DashScope)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       │
        │               ┌─────────────────┐             │
        └──────────────▶│    Supabase     │◀────────────┘
                        │  (DB + Storage) │
                        └─────────────────┘
```

## User Flow (Auto-Save)

1. User uploads/captures product image → Supabase Storage
2. Frontend calls `POST /api/scan` with image URL
3. NestJS creates `scan_session` (status: pending)
4. NestJS calls Qwen VL-OCR API with image + prompt
5. Parse OCR response → extract product data (Japanese as-is)
6. **Auto-save** to `products` table + link allergens
7. Update `scan_session` (status: completed, product_id linked)
8. Return saved product data to frontend
9. User can edit product later via `PUT /products/:id`

**Key Decisions:**
- ✅ Auto-save: No confirmation step required
- ✅ Japanese text: Keep original label text as-is

---

## Implementation Steps

### Step 1: Supabase Module
**Files to create:**
- `apps/api/src/supabase/supabase.module.ts`
- `apps/api/src/supabase/supabase.service.ts`

**Purpose:** Centralized Supabase client for DB operations

```typescript
// supabase.service.ts
@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      configService.get('SUPABASE_URL'),
      configService.get('SUPABASE_SERVICE_KEY')
    );
  }

  getClient() { return this.supabase; }
}
```

---

### Step 2: Qwen Vision Module
**Files to create:**
- `apps/api/src/qwen/qwen.module.ts`
- `apps/api/src/qwen/qwen-vision.service.ts`
- `apps/api/src/qwen/dto/ocr-response.dto.ts`

**Purpose:** Call Qwen VL-OCR API and parse response

**API Endpoint:** `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`

**Request Format:**
```typescript
{
  model: 'qwen-vl-ocr',
  messages: [{
    role: 'user',
    content: [
      { type: 'image_url', image_url: { url: imageUrl } },
      { type: 'text', text: EXTRACTION_PROMPT }
    ]
  }]
}
```

**Extraction Prompt (Japanese - keep original text):**
```
この商品パッケージの画像から以下の情報を抽出し、JSON形式で返してください。
テキストは画像に書かれている通りそのまま抽出してください（翻訳不要）。

{
  "product_name": "商品名",
  "brand": "ブランド名またはメーカー名",
  "ingredients_raw": "原材料名（ラベルに記載されている通り）",
  "allergens": ["アレルギー物質1", "アレルギー物質2"],
  "nutrition_per_100g": {
    "calories": 数値,
    "protein": 数値,
    "fat": 数値,
    "carbs": 数値,
    "sodium": 数値
  },
  "storage_instructions": "保存方法",
  "preparation_instructions": "調理方法",
  "is_vegetarian": true/false,
  "is_vegan": true/false,
  "is_halal": true/false,
  "is_gluten_free": true/false,
  "category": "frozen/fresh/beverage/condiment/snack/prepared/ingredient/other"
}

注意：
- 情報が見つからない場合はnullを返してください
- アレルギー物質は「特定原材料」と「特定原材料に準ずるもの」を含めてください
- 動物性原料（肉、魚、卵、乳製品）が含まれる場合、is_vegetarianはfalse
```

---

### Step 3: Scan Module (Main Feature)
**Files to create:**
- `apps/api/src/scan/scan.module.ts`
- `apps/api/src/scan/scan.controller.ts`
- `apps/api/src/scan/scan.service.ts`
- `apps/api/src/scan/dto/create-scan.dto.ts`
- `apps/api/src/scan/dto/scan-response.dto.ts`

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/scan` | Scan image & auto-save product |
| GET | `/scan/:id` | Get scan session with product |
| GET | `/scan` | List recent scan sessions |

**POST /scan Flow (Auto-Save):**
1. Validate image URL
2. Create `scan_sessions` record (status: pending)
3. Call `QwenVisionService.extractProductData(imageUrl)`
4. Update `scan_sessions.raw_response` (status: processing)
5. Parse JSON response into product data
6. **Auto-create** `products` record
7. Match allergens from `allergens` table → create `product_allergens`
8. Update `scan_sessions` (status: completed, product_id linked)
9. Return complete product with allergens

---

### Step 4: Products Module
**Files to create:**
- `apps/api/src/products/products.module.ts`
- `apps/api/src/products/products.controller.ts`
- `apps/api/src/products/products.service.ts`
- `apps/api/src/products/dto/create-product.dto.ts`
- `apps/api/src/products/dto/product-response.dto.ts`

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/products` | List all products |
| GET | `/products/:id` | Get product with allergens |
| PUT | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |

---

### Step 5: Allergens Module
**Files to create:**
- `apps/api/src/allergens/allergens.module.ts`
- `apps/api/src/allergens/allergens.controller.ts`
- `apps/api/src/allergens/allergens.service.ts`

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/allergens` | List all allergens |
| GET | `/allergens?category=meat` | Filter by category |

---

## File Structure (Final)

```
apps/api/src/
├── main.ts
├── app.module.ts
├── app.controller.ts
├── app.service.ts
├── supabase/
│   ├── supabase.module.ts
│   └── supabase.service.ts
├── qwen/
│   ├── qwen.module.ts
│   ├── qwen-vision.service.ts
│   └── dto/
│       └── ocr-response.dto.ts
├── scan/
│   ├── scan.module.ts
│   ├── scan.controller.ts
│   ├── scan.service.ts
│   └── dto/
│       ├── create-scan.dto.ts
│       └── scan-response.dto.ts
├── products/
│   ├── products.module.ts
│   ├── products.controller.ts
│   ├── products.service.ts
│   └── dto/
│       ├── create-product.dto.ts
│       └── product-response.dto.ts
└── allergens/
    ├── allergens.module.ts
    ├── allergens.controller.ts
    └── allergens.service.ts
```

---

## Dependencies to Add

```bash
pnpm --filter @front-hotel-agent/api add @nestjs/axios axios
```

- `@nestjs/axios` - HTTP client for Qwen API calls
- `axios` - Required peer dependency

---

## Environment Variables Used

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (bypasses RLS) |
| `RESTAURANT_ID` | Default restaurant for products |
| `QWEN_API_KEY` | DashScope API key |
| `QWEN_MODEL` | Model name (qwen-vl-ocr) |

---

## Implementation Order

1. **Supabase Module** - Foundation for all DB operations
2. **Allergens Module** - Simple CRUD, verify DB connection
3. **Qwen Module** - Vision API integration
4. **Scan Module** - Core OCR workflow
5. **Products Module** - CRUD with allergen relationships

---

## Error Handling

- Qwen API timeout: 30s timeout, retry once
- Invalid image: Return 400 with message
- OCR parse failure: Save raw_response, status: failed
- Allergen not found: Create with source: 'inferred'

---

## Testing Strategy

1. Unit test: Qwen response parsing
2. Integration test: Full scan → product flow
3. Manual test: Real product images

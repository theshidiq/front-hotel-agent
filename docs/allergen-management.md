# Allergen Management System

## Overview

The Allergen Management System is a core subsystem of the Hotel Front Agent application, designed to manage food products, menus, and their associated allergens. It heavily utilizes an AI-powered OCR scanning feature to automatically extract Japanese ingredient and allergen data from product labels.

This document serves as a comprehensive guide to understanding the system's architecture, workflows, API structure, and potential integration points for LLM function calling (tooling).

## 1. Core Data Model (Supabase)

The system relies on Postgres tables stored in Supabase:

- **`products`**: Stores food products. Fields include `id`, `name`, `brand`, `category`, `ingredients_raw`, `nutrition_per_100g` (JSONB), and dietary flags (`is_vegetarian`, `is_vegan`, `is_halal`, `is_gluten_free`). Also includes `image_url` for product packaging/labels.
- **`allergens`**: A master list of allergens (43 total, stored in Japanese), with `category` (e.g., grain, egg, dairy, meat, fish, shellfish) and `is_mandatory_japan` flags.
- **`product_allergens`**: A junction table linking `products` and `allergens`. Contains a `source` column to indicate if the allergen was derived from the 'label' or 'inferred'.
- **`scan_sessions`**: Tracks OCR scanning workflows. Fields include `image_url`, `status`, `product_id` (foreign key set upon completion), and `raw_response` (JSONB from the OCR output).
- **`menus` & `menu_products`**: Menus are composed of multiple products. Allergens for a menu are dynamically derived at query time based on the linked products.

## 2. Product Scanning Workflow (AI OCR)

A primary feature of the system is the automated product onboarding via image scanning.

**User Flow:**
1. **Upload**: The user uploads or captures a photo of a product's ingredient label.
2. **Storage**: The image is compressed and uploaded to the `product-images` bucket in Supabase Storage. A public URL is returned.
3. **Trigger**: An API request is sent to `POST /scan` with the `{ imageUrl }`.
4. **OCR Processing**: The NestJS backend creates a `scan_sessions` record (status: pending/processing) and calls the **Qwen VL-OCR API** via DashScope API (`qwen-vl-ocr` model) using a specialized extraction prompt tailored for Japanese labels.
5. **Data Integration**: The backend parses the LLM output, automatically creates a new `products` record, and links matched `allergens` in `product_allergens`.
6. **Completion**: The `scan_sessions` record is updated to "completed" and linked to the new `product_id`. The client receives the complete product entity.

## 3. Manual Product Editing & Management

In addition to scanning, users can manage products manually through the UI (`apps/web/src/routes/+page.svelte`):

- **Creation**: Users can fill out a form detailing the product name, brand, dietary flags, and raw ingredients. They can toggle allergens manually via a searchable pill-based UI interface.
- **Editing**: When a product is selected to edit (`PUT /products/:id`), the user sees the pre-filled parameters (including those extracted via OCR) and can correct any LLM mistakes in the raw ingredients or modify the tagged allergens.
- **Allergen Settings**: Users can define new allergens or categories dynamically (`POST /allergens`, `POST /categories`).

## 4. Derived Allergens

Menu entities do not define their own allergens. Instead, the backend aggregates all unique allergens from the `products` linked to that `menu` via the `menu_products` junction table. This logic exists in the backend service layer ensuring that if a product's composition is updated, any menu containing that product instantly reflects the change.

## 5. API Endpoints

The NestJS backend (`apps/api`) runs on port 3002 and exposes standard REST CRUD operations. 

**Products:**
- `GET /products` - List products with nested allergens.
- `GET /products/:id` - Fetch single product.
- `POST /products` - Create product (receives `allergen_ids[]`).
- `PUT /products/:id` - Update product.
- `DELETE /products/:id` - Delete product.

**Allergens:**
- `GET /allergens` - List all master allergens.
- `POST /allergens` - Create a new allergen.
- `DELETE /allergens/:id` - Delete an allergen.

**Scanning:**
- `POST /scan` - Submit `imageUrl` for Qwen OCR processing.

## 6. LLM Function Tooling Integration

When building tool calling / function calling capabilities for an LLM chatbot to interact with this system, the following tools should be exposed:

### Tool Ideas

1. **`get_allergens_for_menu`**
   - **Description:** Retrieve the list of allergens present in a specific menu item.
   - **Internal mapping:** Call `GET /menus/:id` and read the nested `products` array and their inherited `allergens`.

2. **`check_dietary_compliance`**
   - **Description:** Check if a product or menu is safe for specific dietary restrictions (e.g., "Is this vegan?").
   - **Internal mapping:** Check the `is_vegan`, `is_halal`, `is_gluten_free`, etc., flags on the `products` endpoint.

3. **`update_product_ingredients`**
   - **Description:** Update the text for a product's raw ingredients or alter its allergen list. 
   - **Internal mapping:** Call `PUT /products/:id` with the missing `allergen_ids[]`.

4. **`trigger_label_scan`**
   - **Description:** Process an image of an ingredient label to auto-generate a product.
   - **Internal mapping:** Call `POST /scan` with an image URL.

5. **`search_products_by_allergen`**
   - **Description:** Find all products that *do not* contain a specific allergen, or *do* contain a specific allergen.
   - **Internal mapping:** Call `GET /products`, then iterate products to filter by the specified allergen name or ID.

### Interaction Context for LLM
When acting as an assistant for this system, the LLM must understand that **Allergen names are predominantly in Japanese**. Tool interfaces should expect or translate to Japanese strings when querying for specific allergens like "小麦" (wheat) or "卵" (egg).

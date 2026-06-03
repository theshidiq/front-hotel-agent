      <!-- Main Content -->
      <div class="flex-1 overflow-y-auto h-[calc(100vh-57px)] bg-white">
        <article class="max-w-[720px] mx-auto px-8 xl:px-12 py-16 pb-32">
          <!-- Doc Header -->
          <div id="overview" class="mb-14 pb-10 border-b border-slate-100">
            <div class="flex items-center gap-2 mb-5">
              <span
                class="px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200"
                >System Reference</span
              >
              <span class="text-slate-300 text-sm">/</span>
              <span class="text-sm text-slate-400 font-medium"
                >Allergen Module</span
              >
            </div>
            <h1
              class="text-[2.75rem] font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-5"
            >
              Allergen Management System
            </h1>
            <p class="text-lg text-slate-500 leading-[1.75] mb-4">
              The Allergen Management System is a core subsystem of the Hotel
              Front Agent application, designed to manage food products, menus,
              and their associated allergens.
            </p>
            <p class="text-base text-slate-500 leading-[1.75]">
              It heavily utilizes an AI-powered OCR scanning feature to
              automatically extract Japanese ingredient and allergen data from
              product labels. This document is a comprehensive guide to the
              system's architecture, workflows, API structure, and integration
              points for LLM function calling.
            </p>
          </div>

          <!-- Section 1 -->
          <section class="mb-16" id="core-data-model">
            <div class="flex items-center gap-3 mb-5">
              <span
                class="flex items-center justify-center w-7 h-7 bg-indigo-600 text-white text-xs font-bold rounded-full"
                >1</span
              >
              <h2 class="text-xl font-bold text-slate-900">
                Core Data Model <span class="text-slate-400 font-normal"
                  >(Supabase)</span
                >
              </h2>
            </div>
            <p class="text-slate-500 leading-relaxed mb-6">
              The system relies on the following Postgres tables stored in
              Supabase:
            </p>
            <div class="space-y-4">
              <div
                class="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div
                  class="shrink-0 w-1 rounded-full bg-indigo-400 self-stretch"
                ></div>
                <div>
                  <code
                    class="text-sm font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded"
                    >products</code
                  >
                  <p class="text-sm text-slate-600 leading-relaxed mt-2">
                    Stores food products. Fields include <code
                      class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                      >id</code
                    >,
                    <code
                      class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                      >name</code
                    >,
                    <code
                      class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                      >brand</code
                    >,
                    <code
                      class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                      >category</code
                    >,
                    <code
                      class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                      >ingredients_raw</code
                    >,
                    <code
                      class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                      >nutrition_per_100g</code
                    >
                    (JSONB), and dietary flags (<code
                      class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                      >is_vegetarian</code
                    >,
                    <code
                      class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                      >is_vegan</code
                    >,
                    <code
                      class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                      >is_halal</code
                    >,
                    <code
                      class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                      >is_gluten_free</code
                    >).
                  </p>
                </div>
              </div>
              <div
                class="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div
                  class="shrink-0 w-1 rounded-full bg-indigo-400 self-stretch"
                ></div>
                <div>
                  <code
                    class="text-sm font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded"
                    >allergens</code
                  >
                  <p class="text-sm text-slate-600 leading-relaxed mt-2">
                    A master list of 43 allergens, stored in Japanese. Includes
                    a <code
                      class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                      >category</code
                    >
                    field (e.g., grain, egg, dairy, meat, fish, shellfish) and
                    an
                    <code
                      class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                      >is_mandatory_japan</code
                    > flag.
                  </p>
                </div>
              </div>
              <div
                class="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div
                  class="shrink-0 w-1 rounded-full bg-indigo-400 self-stretch"
                ></div>
                <div>
                  <code
                    class="text-sm font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded"
                    >product_allergens</code
                  >
                  <p class="text-sm text-slate-600 leading-relaxed mt-2">
                    Junction table linking products and allergens. Contains a <code
                      class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                      >source</code
                    >
                    column indicating if the allergen was derived from the
                    <em>'label'</em>
                    or <em>'inferred'</em>.
                  </p>
                </div>
              </div>
              <div
                class="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div
                  class="shrink-0 w-1 rounded-full bg-indigo-400 self-stretch"
                ></div>
                <div>
                  <code
                    class="text-sm font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded"
                    >scan_sessions</code
                  >
                  <p class="text-sm text-slate-600 leading-relaxed mt-2">
                    Tracks OCR scanning workflows. Fields include <code
                      class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                      >image_url</code
                    >,
                    <code
                      class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                      >status</code
                    >,
                    <code
                      class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                      >product_id</code
                    >
                    (foreign key), and
                    <code
                      class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                      >raw_response</code
                    > (JSONB).
                  </p>
                </div>
              </div>
              <div
                class="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div
                  class="shrink-0 w-1 rounded-full bg-indigo-400 self-stretch"
                ></div>
                <div>
                  <code
                    class="text-sm font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded"
                    >menus &amp; menu_products</code
                  >
                  <p class="text-sm text-slate-600 leading-relaxed mt-2">
                    Menus are composed of multiple products. Allergens for a
                    menu are dynamically derived at query time based on the
                    linked products.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <!-- Section 2 -->
          <section class="mb-16" id="product-scanning-workflow">
            <div class="flex items-center gap-3 mb-5">
              <span
                class="flex items-center justify-center w-7 h-7 bg-indigo-600 text-white text-xs font-bold rounded-full"
                >2</span
              >
              <h2 class="text-xl font-bold text-slate-900">
                Product Scanning Workflow <span
                  class="text-slate-400 font-normal">(AI OCR)</span
                >
              </h2>
            </div>
            <p class="text-slate-500 leading-relaxed mb-6">
              A primary feature of the system is the automated product
              onboarding via image scanning.
            </p>
            <ol class="space-y-3">
              {#each [["Upload", "The user uploads or captures a photo of a product's ingredient label."], ["Storage", 'The image is compressed and uploaded to the <code class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded">product-images</code> bucket in Supabase Storage. A public URL is returned.'], ["Trigger", 'An API request is sent to <code class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded">POST /scan</code> with the image URL payload.'], ["OCR Processing", 'The NestJS backend creates a <code class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded">scan_sessions</code> record and calls the <strong class="font-semibold text-slate-700">Qwen VL-OCR API</strong> via DashScope using a specialized extraction prompt tailored for Japanese labels.'], ["Data Integration", 'The backend parses the LLM output, automatically creates a new <code class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded">products</code> record, and links matched <code class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded">allergens</code> in <code class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded">product_allergens</code>.'], ["Completion", 'The <code class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded">scan_sessions</code> record is updated to "completed" and linked to the new <code class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded">product_id</code>.']] as [step, desc], i}
                <li class="flex gap-4 items-start">
                  <span
                    class="shrink-0 flex items-center justify-center w-6 h-6 mt-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold"
                    >{i + 1}</span
                  >
                  <div>
                    <span class="font-semibold text-slate-800">{step}:</span>
                    <span class="text-sm text-slate-600 leading-relaxed ml-1"
                      >{@html desc}</span
                    >
                  </div>
                </li>
              {/each}
            </ol>
          </section>

          <!-- Section 3 -->
          <section class="mb-16" id="manual-editing">
            <div class="flex items-center gap-3 mb-5">
              <span
                class="flex items-center justify-center w-7 h-7 bg-indigo-600 text-white text-xs font-bold rounded-full"
                >3</span
              >
              <h2 class="text-xl font-bold text-slate-900">
                Manual Product Editing <span class="text-slate-400 font-normal"
                  >&amp; Management</span
                >
              </h2>
            </div>
            <p class="text-slate-500 leading-relaxed mb-6">
              In addition to scanning, users can manage products manually
              through the UI:
            </p>
            <ul class="space-y-4">
              <li class="flex gap-3">
                <span
                  class="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2"
                ></span>
                <div>
                  <span class="font-semibold text-slate-800">Creation:</span>
                  <span class="text-sm text-slate-600 leading-relaxed"
                    >Users fill out a form detailing the product name, dietary
                    flags, and raw ingredients. They can toggle allergens
                    manually via a searchable pill-based interface.</span
                  >
                </div>
              </li>
              <li class="flex gap-3">
                <span
                  class="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2"
                ></span>
                <div>
                  <span class="font-semibold text-slate-800">Editing:</span>
                  <span class="text-sm text-slate-600 leading-relaxed"
                    >When a product is selected to edit, the user sees
                    pre-filled parameters and can correct any LLM mistakes in
                    the raw ingredients or modify the tagged allergens.</span
                  >
                </div>
              </li>
              <li class="flex gap-3">
                <span
                  class="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2"
                ></span>
                <div>
                  <span class="font-semibold text-slate-800"
                    >Allergen Settings:</span
                  >
                  <span class="text-sm text-slate-600 leading-relaxed"
                    >Users can define new allergens or categories dynamically
                    without code changes.</span
                  >
                </div>
              </li>
            </ul>
          </section>

          <!-- Section 4 -->
          <section class="mb-16" id="derived-allergens">
            <div class="flex items-center gap-3 mb-5">
              <span
                class="flex items-center justify-center w-7 h-7 bg-indigo-600 text-white text-xs font-bold rounded-full"
                >4</span
              >
              <h2 class="text-xl font-bold text-slate-900">
                Derived Allergens
              </h2>
            </div>
            <p class="text-slate-500 leading-relaxed mb-4">
              Menu entities do not define their own allergens. Instead, the
              backend aggregates all unique allergens from the <code
                class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                >products</code
              >
              linked to that
              <code class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                >menu</code
              >
              via the
              <code class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                >menu_products</code
              > junction table.
            </p>
            <p class="text-slate-500 leading-relaxed">
              This logic exists in the backend service layer, ensuring that if a
              product's composition is updated, any menu containing that product
              instantly reflects the change — with no manual sync required.
            </p>
          </section>

          <!-- Section 5 -->
          <section class="mb-16" id="api-endpoints">
            <div class="flex items-center gap-3 mb-5">
              <span
                class="flex items-center justify-center w-7 h-7 bg-indigo-600 text-white text-xs font-bold rounded-full"
                >5</span
              >
              <h2 class="text-xl font-bold text-slate-900">API Endpoints</h2>
            </div>
            <p class="text-slate-500 leading-relaxed mb-8">
              The NestJS backend (<code
                class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                >apps/api</code
              >) exposes standard REST CRUD operations.
            </p>

            <h3
              id="products-endpoints"
              class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4"
            >
              Products
            </h3>
            <div
              class="overflow-hidden rounded-xl border border-slate-200 mb-8"
            >
              {#each [["GET", "/products", "List products with nested allergens"], ["GET", "/products/:id", "Fetch a single product"], ["POST", "/products", "Create a product (with allergen_ids[])"], ["PUT", "/products/:id", "Update a product"], ["DELETE", "/products/:id", "Delete a product"]] as [method, path, desc]}
                <div
                  class="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <span
                    class="shrink-0 w-14 text-center text-[11px] font-bold tracking-wide rounded px-1.5 py-0.5 {method ===
                    'GET'
                      ? 'bg-sky-50 text-sky-700'
                      : method === 'POST'
                        ? 'bg-green-50 text-green-700'
                        : method === 'PUT'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'}">{method}</span
                  >
                  <code class="text-sm font-mono text-slate-700 font-medium"
                    >{path}</code
                  >
                  <span class="text-sm text-slate-400 ml-auto">{desc}</span>
                </div>
              {/each}
            </div>

            <h3
              id="allergens-endpoints"
              class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4"
            >
              Allergens &amp; Scanning
            </h3>
            <div class="overflow-hidden rounded-xl border border-slate-200">
              {#each [["GET", "/allergens", "List all master allergens"], ["POST", "/allergens", "Create a new allergen"], ["POST", "/scan", "Submit imageUrl for Qwen OCR processing"]] as [method, path, desc]}
                <div
                  class="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <span
                    class="shrink-0 w-14 text-center text-[11px] font-bold tracking-wide rounded px-1.5 py-0.5 {method ===
                    'GET'
                      ? 'bg-sky-50 text-sky-700'
                      : 'bg-green-50 text-green-700'}">{method}</span
                  >
                  <code class="text-sm font-mono text-slate-700 font-medium"
                    >{path}</code
                  >
                  <span class="text-sm text-slate-400 ml-auto">{desc}</span>
                </div>
              {/each}
            </div>
          </section>

          <!-- Section 6 -->
          <section class="mb-16" id="llm-function-tooling">
            <div class="flex items-center gap-3 mb-5">
              <span
                class="flex items-center justify-center w-7 h-7 bg-indigo-600 text-white text-xs font-bold rounded-full"
                >6</span
              >
              <h2 class="text-xl font-bold text-slate-900">
                LLM Function Tooling
              </h2>
            </div>
            <p class="text-slate-500 leading-relaxed mb-8">
              When building tool calling capabilities for an LLM chatbot to
              interact with this system, expose the following tools:
            </p>

            <div class="space-y-4">
              <div
                class="p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition-all"
              >
                <code class="text-sm font-bold text-indigo-600"
                  >get_allergens_for_menu</code
                >
                <p class="text-sm text-slate-500 leading-relaxed mt-2">
                  Retrieve the list of allergens present in a specific menu.
                  Maps to <code
                    class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                    >GET /menus/:id</code
                  >
                  and reads the nested
                  <code
                    class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                    >products</code
                  > array.
                </p>
              </div>
              <div
                class="p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition-all"
              >
                <code class="text-sm font-bold text-indigo-600"
                  >check_dietary_compliance</code
                >
                <p class="text-sm text-slate-500 leading-relaxed mt-2">
                  Check if a product or menu is safe for specific dietary
                  restrictions. Maps to the <code
                    class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                    >is_vegan</code
                  >,
                  <code
                    class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                    >is_halal</code
                  > etc. flags on product records.
                </p>
              </div>
              <div
                class="p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition-all"
              >
                <code class="text-sm font-bold text-indigo-600"
                  >trigger_label_scan</code
                >
                <p class="text-sm text-slate-500 leading-relaxed mt-2">
                  Process an image of an ingredient label to auto-generate a
                  product record. Maps to <code
                    class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                    >POST /scan</code
                  >
                  with an
                  <code
                    class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                    >imageUrl</code
                  > payload.
                </p>
              </div>
            </div>

            <div
              class="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3"
            >
              <span class="text-amber-500 text-lg shrink-0">⚠️</span>
              <p class="text-sm text-amber-800 leading-relaxed">
                <strong class="font-semibold">LLM Context Note:</strong> Tool interfaces
                should expect or translate to Japanese strings when querying for
                specific allergens like "小麦" (wheat) or "卵" (egg), since names
                are stored primarily in Japanese.
              </p>
            </div>
          </section>

          <footer
            class="pt-8 border-t border-slate-100 text-sm text-slate-400 flex items-center justify-between"
          >
            <span>Hotel Front Agent Docs</span>
            <span>&copy; 2026</span>
          </footer>
        </article>
      </div>

      <!-- Right ToC Sidebar -->
      <aside
        class="hidden xl:flex xl:flex-col w-60 bg-white border-l border-slate-200 overflow-y-auto pt-12 px-6 h-[calc(100vh-57px)] sticky top-[57px]"
      >
        <p
          class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-5"
        >
          On this page
        </p>
        <nav class="flex flex-col gap-1 text-[13px]">
          <a
            href="#overview"
            class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            >Overview</a
          >
          <a
            href="#core-data-model"
            class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            >1. Core Data Model</a
          >
          <a
            href="#product-scanning-workflow"
            class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            >2. Product Scanning</a
          >
          <a
            href="#manual-editing"
            class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            >3. Manual Editing</a
          >
          <a
            href="#derived-allergens"
            class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            >4. Derived Allergens</a
          >
          <a
            href="#api-endpoints"
            class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            >5. API Endpoints</a
          >
          <div
            class="ml-4 flex flex-col gap-1 border-l border-slate-100 pl-3 mt-0.5"
          >
            <a
              href="#products-endpoints"
              class="py-1 text-slate-400 hover:text-indigo-500 transition-colors"
              >Products</a
            >
            <a
              href="#allergens-endpoints"
              class="py-1 text-slate-400 hover:text-indigo-500 transition-colors"
              >Allergens</a
            >
          </div>
          <a
            href="#llm-function-tooling"
            class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            >6. LLM Tooling</a
          >
        </nav>
      </aside>

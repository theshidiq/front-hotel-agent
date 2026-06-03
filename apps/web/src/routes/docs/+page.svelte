<script lang="ts">
    import { lang } from "$lib/stores/lang";

    const T = {
        en: {
            badge: "Feature Guide",
            section: "Allergen Management",
            h1: "Allergen Management",
            intro1: "Automatically track, manage, and display allergen information for every dish you serve — so your staff always has the right information, and your guests can feel safe.",
            intro2: "",

            what_h2: "What does this feature do?",
            what_p1:
                "When you add a food product to the system — such as a sauce, seasoning, or ingredient — the app reads its allergen information and stores it. Then, whenever that product is used in a dish on your menu, the allergens appear automatically on the allergen report.",

            card1_title: "Scan product labels",
            card1_desc:
                "Take a photo of any product's ingredient label. The app reads and extracts allergen info automatically using AI.",

            card2_title: "Review and correct",
            card2_desc:
                "Check what the AI detected. You can add or remove allergens manually if anything was missed or incorrect.",

            card3_title: "Print the report",
            card3_desc:
                "Generate a full allergen report by menu group — ready to print as PDF or export to Excel for regulatory use.",

            howto_h2: "How to manage products",
            howto_p: "There are two ways to add food products to the system:",
            method_a_title: "Scan a product label (Recommended)",
            method_a_desc:
                "Go to 商品管理 → Scan, upload or take a photo of the ingredient label on the product packaging. The AI reads the Japanese text and fills in the allergen data for you. You review and confirm.",
            method_b_title: "Enter manually",
            method_b_desc:
                "Go to 商品管理 → Add Product, fill in the product name and select allergens from the list. This works well for products without a label, or when corrections are needed.",

            allergens_h2: "Allergen categories",
            allergens_p:
                "The system tracks 43 allergens based on Japanese food labelling regulations. They are divided into groups:",
            allergens_note:
                "★ Mandatory allergens required under Japanese law (特定原材料) are automatically highlighted on the report.",

            report_h2: "The Allergen Report",
            report_p:
                "The allergen report shows all menu items grouped by course, with colour-coded allergen tags on each dish. It is automatically up to date whenever you change a product.",
            report_pdf: "Print as PDF",
            report_pdf_sub:
                "Use your browser's print dialog. Formatted for A4 paper.",
            report_excel: "Export to Excel (.xlsx)",
            report_excel_sub:
                "Download for record keeping or sharing with your kitchen team.",

            dev_note:
                "The sections below are intended for developers building integrations or LLM wrappers.",
            resp_h2: "Response Shape",
            resp_p: "Full shape of a product object returned from GET /products/:id.",
            api_h2: "API Endpoints",
            api_p: "REST endpoints exposed by the NestJS backend (apps/api).",
            api_products: "Products",
            api_allergens: "Allergens & Scanning",
            llm_h2: "LLM Function Tooling",
            llm_p: "Recommended tool definitions for LLM function calling against the allergen system:",

            nav_what: "What does it do?",
            nav_howto: "How to manage products",
            nav_types: "Allergen categories",
            nav_report: "The allergen report",
            nav_resp: "Response Shape",
            nav_api: "API Endpoints",
            nav_llm: "LLM Tooling",
            nav_everyone: "For everyone",
            nav_dev: "Developer",
        },
        ja: {
            badge: "ガイド",
            section: "アレルゲン管理",
            h1: "アレルゲン管理",
            intro1: "すべての料理のアレルゲン情報を自動で追跡・管理し、スタッフが常に正確な情報を把握できるようにします。",
            intro2: "",

            what_h2: "この機能でできること",
            what_p1:
                "食材をシステムに登録すると、アレルゲン情報が自動的に読み取られ、保存されます。その食材を使った料理がメニューに含まれると、アレルゲンが自動でアレルゲン一覧表に反映されます。",

            card1_title: "商品ラベルをスキャン",
            card1_desc:
                "商品の原材料ラベルを撮影するだけで、AIがアレルゲン情報を自動的に読み取ります。",

            card2_title: "確認・修正",
            card2_desc:
                "AIが検出した情報を確認できます。見落としや誤りがあれば手動で追加・削除が可能です。",

            card3_title: "一覧表の印刷",
            card3_desc:
                "メニューグループごとにアレルゲン一覧表を作成し、PDF印刷やExcel出力ができます。",

            howto_h2: "商品の登録方法",
            howto_p: "食材をシステムに登録する方法は2種類あります：",
            method_a_title: "ラベルをスキャン（推奨）",
            method_a_desc:
                "「商品管理」→「スキャン」から、商品パッケージの原材料表示ラベルを撮影してください。AIが日本語テキストを読み取り、アレルゲン情報を入力します。内容を確認してから保存してください。",
            method_b_title: "手動で入力",
            method_b_desc:
                "「商品管理」→「商品を追加」から、商品名を入力してアレルゲンをリストから選択してください。ラベルのない商品や情報を修正したい場合に便利です。",

            allergens_h2: "アレルゲンの種類",
            allergens_p:
                "システムでは日本の食品表示法に基づき、43種類のアレルゲンを管理しています：",
            allergens_note:
                "★ 特定原材料（法令による必須表示）はアレルゲン一覧表で自動的に強調表示されます。",

            report_h2: "アレルゲン一覧表",
            report_p:
                "アレルゲン一覧表には、コース別に全メニューが表示され、各料理にアレルゲンタグが色分けで示されます。食材情報を更新すると自動的に反映されます。",
            report_pdf: "PDF印刷",
            report_pdf_sub:
                "ブラウザの印刷機能を使用してください。A4サイズに対応しています。",
            report_excel: "Excelエクスポート (.xlsx)",
            report_excel_sub:
                "記録保管やキッチンスタッフとの共有のためにダウンロードできます。",

            dev_note:
                "以下のセクションは、連携システムやLLMラッパーを開発するエンジニア向けです。",
            resp_h2: "レスポンス構造",
            resp_p: "GET /products/:id から返される商品オブジェクトの構造です。",
            api_h2: "APIエンドポイント",
            api_p: "NestJSバックエンド（apps/api）が提供するREST APIです。",
            api_products: "商品 (Products)",
            api_allergens: "アレルゲン・スキャン",
            llm_h2: "LLM ファンクションツール",
            llm_p: "アレルゲンシステムに対してLLM関数呼び出しを実装するための推奨ツール定義です：",

            nav_what: "できること",
            nav_howto: "商品の登録方法",
            nav_types: "アレルゲンの種類",
            nav_report: "アレルゲン一覧表",
            nav_resp: "レスポンス構造",
            nav_api: "APIエンドポイント",
            nav_llm: "LLMツール",
            nav_everyone: "全ユーザー向け",
            nav_dev: "開発者向け",
        },
    };

    $: t = T[$lang];
</script>

<!-- Main Content -->
            <div
                class="flex-1 min-w-0 overflow-y-auto h-[calc(100vh-57px)] bg-white"
            >
                <article class="w-full px-8 xl:px-20 py-16 pb-32">
                    <!-- Page Header -->
                    <div
                        id="overview"
                        class="mb-14 pb-10 border-b border-slate-100"
                    >
                        <div class="flex items-center gap-2 mb-5">
                            <span
                                class="px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200"
                                >{t.badge}</span
                            >
                            <span class="text-slate-300">/</span>
                            <span class="text-sm text-slate-400 font-medium"
                                >{t.section}</span
                            >
                        </div>
                        <h1
                            class="text-[2.75rem] font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-5"
                        >
                            {t.h1}
                        </h1>
                        <p
                            class="text-lg text-slate-500 leading-[1.75] max-w-3xl"
                        >
                            {t.intro1}
                        </p>
                    </div>

                    <!-- SECTION 1: What is this? -->
                    <section id="what-is-this" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.what_h2}
                        </h2>
                        <p
                            class="text-slate-500 leading-relaxed mb-8 max-w-3xl"
                        >
                            {t.what_p1}
                        </p>
                        <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                            <div
                                class="p-5 rounded-xl border border-emerald-100 bg-emerald-50"
                            >
                                <div class="flex items-center gap-2 mb-3">
                                    <span
                                        class="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 shrink-0"
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            ><rect
                                                x="3"
                                                y="3"
                                                width="18"
                                                height="18"
                                                rx="2"
                                            /><path d="M3 9h18M9 21V9" /></svg
                                        >
                                    </span>
                                    <h3
                                        class="font-semibold text-emerald-900 text-sm"
                                    >
                                        {t.card1_title}
                                    </h3>
                                </div>
                                <p
                                    class="text-sm text-emerald-800 leading-relaxed"
                                >
                                    {t.card1_desc}
                                </p>
                            </div>
                            <div
                                class="p-5 rounded-xl border border-sky-100 bg-sky-50"
                            >
                                <div class="flex items-center gap-2 mb-3">
                                    <span
                                        class="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-100 text-sky-700 shrink-0"
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            ><path d="M12 20h9" /><path
                                                d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                                            /></svg
                                        >
                                    </span>
                                    <h3
                                        class="font-semibold text-sky-900 text-sm"
                                    >
                                        {t.card2_title}
                                    </h3>
                                </div>
                                <p class="text-sm text-sky-800 leading-relaxed">
                                    {t.card2_desc}
                                </p>
                            </div>
                            <div
                                class="p-5 rounded-xl border border-violet-100 bg-violet-50"
                            >
                                <div class="flex items-center gap-2 mb-3">
                                    <span
                                        class="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 text-violet-700 shrink-0"
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            ><polyline
                                                points="6 9 6 2 18 2 18 9"
                                            /><path
                                                d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
                                            /><rect
                                                x="6"
                                                y="14"
                                                width="12"
                                                height="8"
                                            /></svg
                                        >
                                    </span>
                                    <h3
                                        class="font-semibold text-violet-900 text-sm"
                                    >
                                        {t.card3_title}
                                    </h3>
                                </div>
                                <p
                                    class="text-sm text-violet-800 leading-relaxed"
                                >
                                    {t.card3_desc}
                                </p>
                            </div>
                        </div>
                    </section>

                    <!-- SECTION 2: How to use -->
                    <section id="how-to-use" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.howto_h2}
                        </h2>
                        <p
                            class="text-slate-500 leading-relaxed mb-8 max-w-3xl"
                        >
                            {t.howto_p}
                        </p>
                        <div class="space-y-4 max-w-3xl">
                            <div
                                class="flex gap-5 p-5 rounded-xl border border-slate-100 bg-slate-50"
                            >
                                <span
                                    class="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-bold shadow-sm"
                                    >A</span
                                >
                                <div>
                                    <h3
                                        class="font-semibold text-slate-800 mb-1"
                                    >
                                        {t.method_a_title}
                                    </h3>
                                    <p
                                        class="text-sm text-slate-500 leading-relaxed"
                                    >
                                        {t.method_a_desc}
                                    </p>
                                </div>
                            </div>
                            <div
                                class="flex gap-5 p-5 rounded-xl border border-slate-100 bg-slate-50"
                            >
                                <span
                                    class="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-bold shadow-sm"
                                    >B</span
                                >
                                <div>
                                    <h3
                                        class="font-semibold text-slate-800 mb-1"
                                    >
                                        {t.method_b_title}
                                    </h3>
                                    <p
                                        class="text-sm text-slate-500 leading-relaxed"
                                    >
                                        {t.method_b_desc}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- SECTION 3: Allergen types -->
                    <section id="allergen-types" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.allergens_h2}
                        </h2>
                        <p
                            class="text-slate-500 leading-relaxed mb-6 max-w-3xl"
                        >
                            {t.allergens_p}
                        </p>
                        <div
                            class="grid grid-cols-2 xl:grid-cols-3 gap-3 max-w-3xl"
                        >
                            {#each $lang === "en" ? [{ label: "Grains", ex: "Wheat, buckwheat", color: "bg-amber-50 border-amber-100 text-amber-800" }, { label: "Egg", ex: "Egg", color: "bg-yellow-50 border-yellow-100 text-yellow-800" }, { label: "Dairy", ex: "Milk, butter", color: "bg-blue-50 border-blue-100 text-blue-800" }, { label: "Meat", ex: "Chicken, pork, beef", color: "bg-red-50 border-red-100 text-red-800" }, { label: "Fish", ex: "Salmon, tuna", color: "bg-cyan-50 border-cyan-100 text-cyan-800" }, { label: "Shellfish", ex: "Shrimp, crab", color: "bg-orange-50 border-orange-100 text-orange-800" }] : [{ label: "穀類", ex: "小麦・そば", color: "bg-amber-50 border-amber-100 text-amber-800" }, { label: "卵", ex: "卵", color: "bg-yellow-50 border-yellow-100 text-yellow-800" }, { label: "乳製品", ex: "乳・バター", color: "bg-blue-50 border-blue-100 text-blue-800" }, { label: "肉類", ex: "鶏肉・豚肉・牛肉", color: "bg-red-50 border-red-100 text-red-800" }, { label: "魚類", ex: "サーモン・まぐろ", color: "bg-cyan-50 border-cyan-100 text-cyan-800" }, { label: "甲殻類", ex: "えび・かに", color: "bg-orange-50 border-orange-100 text-orange-800" }] as item}
                                <div
                                    class="p-3.5 rounded-xl border {item.color}"
                                >
                                    <p class="font-semibold text-sm">
                                        {item.label}
                                    </p>
                                    <p class="text-xs mt-0.5 opacity-75">
                                        {item.ex}
                                    </p>
                                </div>
                            {/each}
                        </div>
                        <p class="text-xs text-slate-400 mt-4 max-w-3xl italic">
                            {t.allergens_note}
                        </p>
                    </section>

                    <!-- SECTION 4: Report -->
                    <section id="report" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.report_h2}
                        </h2>
                        <p
                            class="text-slate-500 leading-relaxed mb-6 max-w-3xl"
                        >
                            {t.report_p}
                        </p>
                        <div
                            class="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-3xl"
                        >
                            <div
                                class="flex gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50"
                            >
                                <svg
                                    class="shrink-0 text-slate-400 mt-0.5"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    ><polyline
                                        points="6 9 6 2 18 2 18 9"
                                    /><path
                                        d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
                                    /><rect
                                        x="6"
                                        y="14"
                                        width="12"
                                        height="8"
                                    /></svg
                                >
                                <div>
                                    <p
                                        class="font-semibold text-slate-700 text-sm"
                                    >
                                        {t.report_pdf}
                                    </p>
                                    <p class="text-xs text-slate-400 mt-0.5">
                                        {t.report_pdf_sub}
                                    </p>
                                </div>
                            </div>
                            <div
                                class="flex gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50"
                            >
                                <svg
                                    class="shrink-0 text-slate-400 mt-0.5"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    ><path
                                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                                    /><polyline points="14 2 14 8 20 8" /></svg
                                >
                                <div>
                                    <p
                                        class="font-semibold text-slate-700 text-sm"
                                    >
                                        {t.report_excel}
                                    </p>
                                    <p class="text-xs text-slate-400 mt-0.5">
                                        {t.report_excel_sub}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- Developer Reference Divider -->
                    <div
                        id="dev-reference"
                        class="flex items-center gap-4 my-14"
                    >
                        <div class="flex-1 h-px bg-slate-200"></div>
                        <div
                            class="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold tracking-widest uppercase shrink-0"
                        >
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><polyline points="16 18 22 12 16 6" /><polyline
                                    points="8 6 2 12 8 18"
                                /></svg
                            >
                            Developer Reference
                        </div>
                        <div class="flex-1 h-px bg-slate-200"></div>
                    </div>
                    <p class="text-sm text-slate-400 text-center mb-12 -mt-8">
                        {t.dev_note}
                    </p>

                    <!-- Dev: Response Shape -->
                    <section id="response-shape" class="mb-16">
                        <div class="flex items-center gap-3 mb-5">
                            <span
                                class="flex items-center justify-center w-7 h-7 bg-indigo-600 text-white text-xs font-bold rounded-full"
                                >1</span
                            >
                            <h2 class="text-xl font-bold text-slate-900">
                                {t.resp_h2}
                            </h2>
                        </div>
                        <p
                            class="text-slate-500 leading-relaxed mb-6 max-w-3xl"
                        >
                            {t.resp_p}
                        </p>
                        <div
                            class="rounded-xl border border-slate-200 overflow-hidden"
                        >
                            <div
                                class="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700"
                            >
                                <span
                                    class="text-xs font-semibold text-slate-400 uppercase tracking-widest"
                                    >GET /products/:id — 200 OK</span
                                >
                                <span class="text-xs text-indigo-400 font-mono"
                                    >application/json</span
                                >
                            </div>
                            <pre
                                class="bg-[#0f1117] text-sm font-mono leading-relaxed overflow-x-auto p-5 text-slate-300"><code
                                    ><span class="text-slate-500">&#x7B;</span>
  <span class="text-sky-400">"id"</span><span class="text-slate-500">:</span
                                    > <span class="text-amber-300">"uuid"</span
                                    >,
  <span class="text-sky-400">"name"</span><span class="text-slate-500">:</span
                                    > <span class="text-amber-300"
                                        >"チキンライス"</span
                                    >,
  <span class="text-sky-400">"brand"</span><span class="text-slate-500">:</span
                                    > <span class="text-amber-300"
                                        >"Kagome"</span
                                    >,
  <span class="text-sky-400">"category"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-amber-300">"main"</span
                                    >,
  <span class="text-sky-400">"ingredients_raw"</span><span
                                        class="text-slate-500">:</span
                                    > <span class="text-amber-300"
                                        >"鶏肉, 米, トマトペースト..."</span
                                    >,
  <span class="text-sky-400">"is_vegetarian"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-purple-400">false</span
                                    >,
  <span class="text-sky-400">"is_vegan"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-purple-400">false</span
                                    >,
  <span class="text-sky-400">"is_halal"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-purple-400">false</span
                                    >,
  <span class="text-sky-400">"allergens"</span><span class="text-slate-500"
                                        >: [</span
                                    >
    <span class="text-slate-500">&#x7B;</span>
      <span class="text-sky-400">"id"</span><span class="text-slate-500">:</span
                                    > <span class="text-amber-300">"uuid"</span
                                    >,
      <span class="text-sky-400">"name"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-amber-300">"鶏肉"</span
                                    >,
      <span class="text-sky-400">"category"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-amber-300">"meat"</span
                                    >,
      <span class="text-sky-400">"source"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-amber-300">"label"</span
                                    >
    <span class="text-slate-500">&#x7D;</span>
  <span class="text-slate-500">],</span>
  <span class="text-sky-400">"created_at"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-amber-300"
                                        >"2026-03-01T10:00:00Z"</span
                                    >
<span class="text-slate-500">&#x7D;</span></code
                                ></pre>
                        </div>
                    </section>

                    <!-- Dev: API Endpoints -->
                    <section id="api-endpoints" class="mb-16">
                        <div class="flex items-center gap-3 mb-5">
                            <span
                                class="flex items-center justify-center w-7 h-7 bg-indigo-600 text-white text-xs font-bold rounded-full"
                                >2</span
                            >
                            <h2 class="text-xl font-bold text-slate-900">
                                {t.api_h2}
                            </h2>
                        </div>
                        <p
                            class="text-slate-500 leading-relaxed mb-8 max-w-3xl"
                        >
                            {t.api_p}
                        </p>
                        <h3
                            class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4"
                        >
                            {t.api_products}
                        </h3>
                        <div
                            class="overflow-hidden rounded-xl border border-slate-200 mb-8"
                        >
                            {#each [{ m: "GET", p: "/products", d: $lang === "en" ? "List products with nested allergens" : "アレルゲン付き商品一覧を取得", bg: "bg-sky-50 text-sky-700" }, { m: "GET", p: "/products/:id", d: $lang === "en" ? "Fetch a single product" : "1件の商品を取得", bg: "bg-sky-50 text-sky-700" }, { m: "POST", p: "/products", d: $lang === "en" ? "Create a product (with allergen_ids[])" : "商品を作成（allergen_ids[]を含む）", bg: "bg-green-50 text-green-700" }, { m: "PUT", p: "/products/:id", d: $lang === "en" ? "Update a product" : "商品を更新", bg: "bg-amber-50 text-amber-700" }, { m: "DELETE", p: "/products/:id", d: $lang === "en" ? "Delete a product" : "商品を削除", bg: "bg-red-50 text-red-700" }] as row, i}
                                <div
                                    class="flex items-center gap-4 px-5 py-3.5 {i <
                                    4
                                        ? 'border-b border-slate-100'
                                        : ''} hover:bg-slate-50 transition-colors"
                                >
                                    <span
                                        class="shrink-0 w-16 text-center text-[11px] font-bold tracking-wide rounded px-1.5 py-0.5 {row.bg}"
                                        >{row.m}</span
                                    >
                                    <code
                                        class="text-sm font-mono text-slate-700"
                                        >{row.p}</code
                                    >
                                    <span class="text-sm text-slate-400 ml-auto"
                                        >{row.d}</span
                                    >
                                </div>
                            {/each}
                        </div>
                        <h3
                            class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4"
                        >
                            {t.api_allergens}
                        </h3>
                        <div
                            class="overflow-hidden rounded-xl border border-slate-200"
                        >
                            {#each [{ m: "GET", p: "/allergens", d: $lang === "en" ? "List all master allergens" : "アレルゲン一覧取得", bg: "bg-sky-50 text-sky-700" }, { m: "POST", p: "/allergens", d: $lang === "en" ? "Create a new allergen" : "新しいアレルゲンを作成", bg: "bg-green-50 text-green-700" }, { m: "POST", p: "/scan", d: $lang === "en" ? "Submit imageUrl for Qwen OCR processing" : "画像URLをQwen OCRに送信", bg: "bg-green-50 text-green-700" }] as row, i}
                                <div
                                    class="flex items-center gap-4 px-5 py-3.5 {i <
                                    2
                                        ? 'border-b border-slate-100'
                                        : ''} hover:bg-slate-50 transition-colors"
                                >
                                    <span
                                        class="shrink-0 w-16 text-center text-[11px] font-bold tracking-wide rounded px-1.5 py-0.5 {row.bg}"
                                        >{row.m}</span
                                    >
                                    <code
                                        class="text-sm font-mono text-slate-700"
                                        >{row.p}</code
                                    >
                                    <span class="text-sm text-slate-400 ml-auto"
                                        >{row.d}</span
                                    >
                                </div>
                            {/each}
                        </div>
                    </section>

                    <!-- Dev: LLM Tooling -->
                    <section id="llm-tooling" class="mb-16">
                        <div class="flex items-center gap-3 mb-5">
                            <span
                                class="flex items-center justify-center w-7 h-7 bg-indigo-600 text-white text-xs font-bold rounded-full"
                                >3</span
                            >
                            <h2 class="text-xl font-bold text-slate-900">
                                {t.llm_h2}
                            </h2>
                        </div>
                        <p
                            class="text-slate-500 leading-relaxed mb-8 max-w-3xl"
                        >
                            {t.llm_p}
                        </p>
                        <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                            <div
                                class="p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition-all"
                            >
                                <code class="text-sm font-bold text-indigo-600"
                                    >get_allergens_for_menu</code
                                >
                                <p
                                    class="text-sm text-slate-500 leading-relaxed mt-2"
                                >
                                    {$lang === "en"
                                        ? "Retrieve allergens for a menu."
                                        : "メニューのアレルゲンを取得。"} →
                                    <code
                                        class="text-xs bg-slate-100 px-1 rounded"
                                        >GET /menus/:id</code
                                    >
                                </p>
                            </div>
                            <div
                                class="p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition-all"
                            >
                                <code class="text-sm font-bold text-indigo-600"
                                    >check_dietary_compliance</code
                                >
                                <p
                                    class="text-sm text-slate-500 leading-relaxed mt-2"
                                >
                                    {$lang === "en"
                                        ? "Check dietary flags per product."
                                        : "食事制限フラグを確認。"} →
                                    <code
                                        class="text-xs bg-slate-100 px-1 rounded"
                                        >is_vegan</code
                                    >,
                                    <code
                                        class="text-xs bg-slate-100 px-1 rounded"
                                        >is_halal</code
                                    >
                                </p>
                            </div>
                            <div
                                class="p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition-all"
                            >
                                <code class="text-sm font-bold text-indigo-600"
                                    >trigger_label_scan</code
                                >
                                <p
                                    class="text-sm text-slate-500 leading-relaxed mt-2"
                                >
                                    {$lang === "en"
                                        ? "Initiate OCR scan for a product image."
                                        : "商品画像のOCRスキャンを開始。"} →
                                    <code
                                        class="text-xs bg-slate-100 px-1 rounded"
                                        >POST /scan</code
                                    >
                                </p>
                            </div>
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

            <!-- Right ToC -->
            <aside
                class="hidden xl:flex xl:flex-col w-56 shrink-0 bg-white border-l border-slate-200 overflow-y-auto pt-12 px-6 h-[calc(100vh-57px)] sticky top-[57px]"
            >
                <p
                    class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4"
                >
                    {$lang === "en" ? "On this page" : "このページ"}
                </p>
                <nav class="flex flex-col gap-0.5 text-[13px]">
                    <p
                        class="text-[10px] font-semibold text-slate-300 uppercase tracking-widest px-3 mt-2 mb-1"
                    >
                        {t.nav_everyone}
                    </p>
                    <a
                        href="#what-is-this"
                        class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        >{t.nav_what}</a
                    >
                    <a
                        href="#how-to-use"
                        class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        >{t.nav_howto}</a
                    >
                    <a
                        href="#allergen-types"
                        class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        >{t.nav_types}</a
                    >
                    <a
                        href="#report"
                        class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        >{t.nav_report}</a
                    >
                    <p
                        class="text-[10px] font-semibold text-slate-300 uppercase tracking-widest px-3 mt-4 mb-1"
                    >
                        {t.nav_dev}
                    </p>
                    <a
                        href="#response-shape"
                        class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >{t.nav_resp}</a
                    >
                    <a
                        href="#api-endpoints"
                        class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >{t.nav_api}</a
                    >
                    <a
                        href="#llm-tooling"
                        class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >{t.nav_llm}</a
                    >
                </nav>
            </aside>

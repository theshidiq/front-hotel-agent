<script lang="ts">
    import { lang } from "$lib/stores/lang";

    const T = {
        en: {
            badge: "Feature Guide",
            section: "Kitchen Production",
            h1: "Kitchen Production",
            intro: "A real-time dashboard that aggregates daily PAX (meal headcount) from check-in reservations and surfaces guest allergen information for kitchen staff — so the team always has the right information before service.",
            open_btn: "Open Kitchen Dashboard",

            pax_h2: "1. PAX Summary Table",
            pax_p: "The top section of the page shows a table aggregating PAX (meal headcount) for checked-in reservations on the selected date, broken down by dinner, breakfast, and meal plan type.",
            pax_table_title: "PAX Table — Column Reference",
            pax_col: "Column",
            pax_desc_h: "Description",
            pax_note:
                'Only reservations with status = "checked_in" are counted. The table updates in real time via Supabase Realtime — no manual refresh needed.',

            allergen_h2: "2. Allergen Table (アレルギー情報)",
            allergen_p:
                "The lower section shows a summary of guest allergen declarations for the day. Each row represents a unique allergen that has been declared by one or more guests in currently checked-in reservations.",
            allergen_table_title: "Allergen Table — Column Reference",
            allergen_p2:
                "Each row is clickable — clicking it expands an inline detail panel below the row.",

            expand_h2: "3. Expandable Row Detail Panel",
            expand_p:
                "Clicking an allergen row opens an inline panel with structured information to help kitchen staff understand which dishes need ingredient adjustments.",
            expand_steps: [
                [
                    "Click to expand",
                    "Clicking an allergen row expands a detail panel beneath it. The chevron (›) icon rotates to indicate the open/closed state.",
                ],
                [
                    "Allergen card",
                    "The panel shows a summary card with the allergen name, guest count, and category.",
                ],
                [
                    "Menu group tags",
                    "Blue tags show which menu groups contain products that use this allergen (e.g. 和牛懐石, スタンダード).",
                ],
                [
                    "Product name tags",
                    "Amber tags show the specific products containing this allergen. Staff can use this to identify which ingredients to substitute.",
                ],
            ],
            expand_tip:
                "Multiple rows can be expanded simultaneously. The expanded state resets when the page data refreshes.",

            synonym_h2: "4. Allergen Synonym Map",
            synonym_p:
                "Guest declarations may use different names from those stored in the product database. A UI-level synonym mapping bridges this gap.",
            synonym_table_title: "allergenSynonymNames — Current Mapping",
            synonym_guest: "Guest declares",
            synonym_db: "Matched in DB",
            synonym_reason: "Reason",
            synonym_rows: [
                [
                    "グルテン (Gluten)",
                    "小麦 (Wheat)",
                    "Guests say 'gluten' but product labels read '小麦'",
                ],
                [
                    "乳 (Dairy)",
                    "牛乳, ミルク (Milk)",
                    "Guests say '乳' but product labels use '牛乳' or 'ミルク'",
                ],
            ],
            synonym_p2:
                'Handled inside the getMenusForAllergen() helper. When a guest declares "グルテン", the detail panel shows menus/products linked to both "グルテン" and "小麦".',
            synonym_code_label:
                "kitchen-production/+page.svelte — Synonym logic overview",

            flow_h2: "5. Data Flow",
            flow_p: "On page load the following APIs are fetched in parallel to build the dashboard:",
            flow_apis: [
                [
                    "getReservations(date)",
                    "Fetches all checked-in reservations for the selected date",
                ],
                [
                    "getMenuGroups()",
                    "Menu groups — used as row labels in the PAX table",
                ],
                [
                    "getMenus()",
                    "Full menus with allergen and product data — used to build the expandable panels",
                ],
            ],
            flow_diagram_title: "Data Dependency Diagram",
            flow_realtime_title: "Supabase Realtime",
            flow_realtime_desc:
                "The page subscribes to INSERT / UPDATE events on the reservations table. When front desk staff check in a guest, the kitchen dashboard updates automatically — no refresh required.",

            nav_pax: "1. PAX Table",
            nav_allergen: "2. Allergen Table",
            nav_expand: "3. Expandable Rows",
            nav_synonym: "4. Synonym Map",
            nav_flow: "5. Data Flow",
        },
        ja: {
            badge: "ガイド",
            section: "厨房生産管理",
            h1: "厨房生産管理",
            intro: "チェックイン済み予約から日別のPAX（食事人数）を自動集計し、アレルギー申告状況をリアルタイムで厨房スタッフに提供するダッシュボードです。サービス前に常に正確な情報を確認できます。",
            open_btn: "厨房ダッシュボードを開く",

            pax_h2: "1. PAX集計テーブル",
            pax_p: "ページ上部のテーブルには、選択した日付にチェックインした予約のPAX（食事人数）が、夕食・朝食・食事プラン別に集計されます。",
            pax_table_title: "PAX集計テーブル — 列構成",
            pax_col: "列",
            pax_desc_h: "内容",
            pax_note:
                "「チェックイン済み（status = checked_in）」の予約のみを集計します。Supabase リアルタイムにより自動更新されます。",

            allergen_h2: "2. アレルゲンテーブル（アレルギー情報）",
            allergen_p:
                "ページ下部のテーブルには、当日チェックイン済み予約からアレルゲンを申告したゲストの情報が集計されます。各行は、1名以上のゲストが申告した固有のアレルゲンを表します。",
            allergen_table_title: "アレルゲンテーブル — 列構成",
            allergen_p2:
                "各行はクリック可能です。クリックすると行の下に詳細パネルが展開されます。",

            expand_h2: "3. 展開行の詳細パネル",
            expand_p:
                "アレルゲン行をクリックすると、インラインの詳細パネルが表示されます。厨房スタッフが食材変更の判断をするための情報を提供します。",
            expand_steps: [
                [
                    "クリックで展開",
                    "アレルゲン行をクリックすると、行の下に詳細パネルが展開されます。chevron（›）アイコンが回転して開閉状態を示します。",
                ],
                [
                    "アレルゲンカード",
                    "申告されたアレルゲン名・人数・カテゴリが表示されます。",
                ],
                [
                    "メニューグループタグ",
                    "そのアレルゲンを含む商品が使われているメニューグループが青いタグで表示されます（例：和牛懐石、スタンダード）。",
                ],
                [
                    "商品名タグ",
                    "そのアレルゲンを含む具体的な商品名が琥珀色（amber）のタグで表示されます。スタッフはこの情報をもとに代替食材を検討できます。",
                ],
            ],
            expand_tip:
                "複数のアレルゲン行を同時に展開できます。データ再読み込み時には展開状態がリセットされます。",

            synonym_h2: "4. アレルゲン類義語マップ",
            synonym_p:
                "ゲストが申告するアレルゲン名と、商品データベースで使われているアレルゲン名が異なる場合があります。UIレベルの類義語マッピングでこの差を吸収しています。",
            synonym_table_title: "allergenSynonymNames — 現在の対応マップ",
            synonym_guest: "ゲスト申告名",
            synonym_db: "DB上の正式名",
            synonym_reason: "理由",
            synonym_rows: [
                [
                    "グルテン",
                    "小麦",
                    "ゲストは「グルテン」と言うが、商品表示は「小麦」",
                ],
                [
                    "乳",
                    "牛乳, ミルク",
                    "ゲストは「乳」と言うが、商品表示は「牛乳」「ミルク」など",
                ],
            ],
            synonym_p2:
                "getMenusForAllergen() ヘルパー関数内で処理されます。ゲストが「グルテン」と申告した場合、展開パネルには「グルテン」および「小麦」両方に関連する商品が表示されます。",
            synonym_code_label:
                "kitchen-production/+page.svelte — 類義語ロジック概要",

            flow_h2: "5. データフロー",
            flow_p: "ページロード時に以下のAPIを並列取得し、ダッシュボードを構築します。",
            flow_apis: [
                [
                    "getReservations(date)",
                    "当日のチェックイン済み予約一覧を取得",
                ],
                [
                    "getMenuGroups()",
                    "メニューグループ一覧（PAXテーブルの行ラベルに対応）",
                ],
                [
                    "getMenus()",
                    "各メニューのアレルゲン・商品情報（展開パネル用）",
                ],
            ],
            flow_diagram_title: "データ依存関係",
            flow_realtime_title: "Supabase リアルタイム更新",
            flow_realtime_desc:
                "reservations テーブルの INSERT / UPDATE をリアルタイムで購読しており、フロントでチェックインが完了すると厨房ダッシュボードも自動的に更新されます。手動リロード不要です。",

            nav_pax: "1. PAX集計テーブル",
            nav_allergen: "2. アレルゲンテーブル",
            nav_expand: "3. 展開行の詳細",
            nav_synonym: "4. 類義語マップ",
            nav_flow: "5. データフロー",
        },
    };

    $: t = T[$lang];

    const paxColumns = {
        en: [
            [
                "Menu Group",
                "e.g. 和牛懐石, スタンダード. The menu group name linked to the reservation",
            ],
            ["Dinner PAX", "Total guests with a dinner_time set"],
            ["Breakfast PAX", "Total guests with a breakfast_time set"],
            ["2 Meals (1泊2食)", 'Reservations with meal_plan = "2meals"'],
            [
                "Dinner only (夕食のみ)",
                'Reservations with meal_plan = "dinner_only"',
            ],
            [
                "Breakfast only (朝食のみ)",
                'Reservations with meal_plan = "breakfast_only"',
            ],
            [
                "Room only (素泊まり)",
                'Reservations with meal_plan = "room_only"',
            ],
            ["Total", "Grand total guests checked in for the day"],
        ],
        ja: [
            [
                "メニューグループ",
                "例：「和牛懐石」「スタンダード」など。予約に紐づいたメニューグループ名",
            ],
            ["夕食 PAX", "dinner_time が設定された予約の合計人数"],
            ["朝食 PAX", "breakfast_time が設定された予約の合計人数"],
            ["1泊2食", 'meal_plan = "2meals" の予約数'],
            ["夕食のみ", 'meal_plan = "dinner_only" の予約数'],
            ["朝食のみ", 'meal_plan = "breakfast_only" の予約数'],
            ["素泊まり", 'meal_plan = "room_only" の予約数'],
            ["合計", "当日チェックイン済み予約の総人数"],
        ],
    };

    const allergenColumns = {
        en: [
            ["Allergen", "The declared allergen name (e.g. 小麦, 卵, 乳)"],
            ["Count", "Total guests who declared this allergen"],
            ["Category", "e.g. 穀類, 乳製品, 魚介類"],
        ],
        ja: [
            ["アレルゲン名", "申告されたアレルゲン（例：小麦、卵、乳）"],
            ["人数", "そのアレルゲンを申告したゲストの合計人数"],
            ["カテゴリ", "「穀類」「乳製品」「魚介類」などのカテゴリ分類"],
        ],
    };
</script>

<div
    class="min-h-screen bg-[#F5F6FA] text-slate-800 font-sans flex flex-col antialiased"
>
    <main
        class="flex-1 flex flex-col min-h-screen w-full overflow-hidden relative"
    >
        <!-- Top Header — matches other docs pages exactly -->
        <header
            class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between"
        >
            <a
                href="/docs"
                class="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-all"
                title="Back to Docs"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg
                >
            </a>

            <!-- Language Toggle -->
            <div class="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                    on:click={() => lang.set("en")}
                    class="px-3 py-1.5 rounded-md text-xs font-bold transition-all {$lang ===
                    'en'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'}">EN</button
                >
                <button
                    on:click={() => lang.set("ja")}
                    class="px-3 py-1.5 rounded-md text-xs font-bold transition-all {$lang ===
                    'ja'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'}">日本語</button
                >
            </div>

            <span
                class="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-bold uppercase tracking-widest rounded-full border border-orange-200"
            >
                {$lang === "en" ? "Documentation" : "ドキュメント"}
            </span>
        </header>

        <div class="flex flex-1 w-full relative">
            <!-- Left Sidebar -->
            <aside
                class="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-slate-200 bg-white overflow-y-auto pt-8 pb-10 px-4 h-[calc(100vh-57px)] sticky top-[57px]"
            >
                <div class="mb-8">
                    <p
                        class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3 px-3"
                    >
                        {$lang === "en" ? "Guides" : "ガイド"}
                    </p>
                    <ul class="space-y-0.5">
                        <li>
                            <a
                                href="/docs"
                                class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                            >
                                {$lang === "en"
                                    ? "Allergen Management"
                                    : "アレルゲン管理"}
                            </a>
                        </li>
                        <li>
                            <a
                                href="/docs/menus"
                                class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                            >
                                {$lang === "en"
                                    ? "Menu System"
                                    : "メニューシステム"}
                            </a>
                        </li>
                        <li>
                            <a
                                href="/docs/front-desk"
                                class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                            >
                                {$lang === "en"
                                    ? "Front Desk"
                                    : "フロントデスク"}
                            </a>
                        </li>
                        <li>
                            <a
                                href="/docs/kitchen-production"
                                class="block px-3 py-2 text-sm font-semibold bg-orange-50 text-orange-700 rounded-lg"
                            >
                                {$lang === "en"
                                    ? "Kitchen Production"
                                    : "厨房生産管理"}
                            </a>
                        </li>
                        <li>
                            <a
                                href="/docs/shifts"
                                class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                            >
                                {$lang === "en"
                                    ? "Shift Management"
                                    : "シフト管理"}
                            </a>
                        </li>
                    </ul>
                </div>
            </aside>

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
                                class="px-2.5 py-0.5 text-[11px] font-semibold bg-orange-50 text-orange-700 rounded-full border border-orange-200"
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
                            {t.intro}
                        </p>
                        <div class="mt-6">
                            <a
                                href="/kitchen-production"
                                class="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                            >
                                <svg
                                    width="15"
                                    height="15"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    ><path
                                        d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                                    /><polyline points="15 3 21 3 21 9" /><line
                                        x1="10"
                                        y1="14"
                                        x2="21"
                                        y2="3"
                                    /></svg
                                >
                                {t.open_btn}
                            </a>
                        </div>
                    </div>

                    <!-- Section 1: PAX Table -->
                    <section id="pax-table" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.pax_h2}
                        </h2>
                        <p
                            class="text-slate-500 leading-relaxed mb-6 max-w-3xl"
                        >
                            {t.pax_p}
                        </p>

                        <div
                            class="rounded-xl border border-slate-200 overflow-hidden mb-6"
                        >
                            <div
                                class="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700"
                            >
                                <span
                                    class="text-xs font-semibold text-slate-400 uppercase tracking-widest"
                                    >{t.pax_table_title}</span
                                >
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm">
                                    <thead>
                                        <tr
                                            class="bg-slate-50 border-b border-slate-200"
                                        >
                                            <th
                                                class="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
                                                >{t.pax_col}</th
                                            >
                                            <th
                                                class="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
                                                >{t.pax_desc_h}</th
                                            >
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each paxColumns[$lang] as [col, desc], i}
                                            <tr
                                                class="{i % 2 === 0
                                                    ? 'bg-white'
                                                    : 'bg-slate-50'} border-b border-slate-100 last:border-0"
                                            >
                                                <td
                                                    class="px-4 py-3 font-mono text-xs font-semibold text-orange-700 whitespace-nowrap"
                                                    >{col}</td
                                                >
                                                <td
                                                    class="px-4 py-3 text-slate-600 text-sm"
                                                    >{desc}</td
                                                >
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div
                            class="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl max-w-3xl"
                        >
                            <svg
                                class="shrink-0 text-blue-500 mt-0.5"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><circle cx="12" cy="12" r="10" /><line
                                    x1="12"
                                    y1="8"
                                    x2="12"
                                    y2="12"
                                /><line
                                    x1="12"
                                    y1="16"
                                    x2="12.01"
                                    y2="16"
                                /></svg
                            >
                            <p class="text-sm text-blue-800 leading-relaxed">
                                {t.pax_note}
                            </p>
                        </div>
                    </section>

                    <!-- Section 2: Allergen Table -->
                    <section id="allergen-table" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.allergen_h2}
                        </h2>
                        <p
                            class="text-slate-500 leading-relaxed mb-6 max-w-3xl"
                        >
                            {t.allergen_p}
                        </p>

                        <div
                            class="rounded-xl border border-slate-200 overflow-hidden mb-6"
                        >
                            <div
                                class="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700"
                            >
                                <span
                                    class="text-xs font-semibold text-slate-400 uppercase tracking-widest"
                                    >{t.allergen_table_title}</span
                                >
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm">
                                    <thead>
                                        <tr
                                            class="bg-slate-50 border-b border-slate-200"
                                        >
                                            <th
                                                class="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
                                                >{t.pax_col}</th
                                            >
                                            <th
                                                class="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
                                                >{t.pax_desc_h}</th
                                            >
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each allergenColumns[$lang] as [col, desc], i}
                                            <tr
                                                class="{i % 2 === 0
                                                    ? 'bg-white'
                                                    : 'bg-slate-50'} border-b border-slate-100 last:border-0"
                                            >
                                                <td
                                                    class="px-4 py-3 font-mono text-xs font-semibold text-orange-700 whitespace-nowrap"
                                                    >{col}</td
                                                >
                                                <td
                                                    class="px-4 py-3 text-slate-600 text-sm"
                                                    >{desc}</td
                                                >
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <p class="text-slate-500 leading-relaxed max-w-3xl">
                            {t.allergen_p2}
                        </p>
                    </section>

                    <!-- Section 3: Expandable Rows -->
                    <section id="expandable-rows" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.expand_h2}
                        </h2>
                        <p
                            class="text-slate-500 leading-relaxed mb-6 max-w-3xl"
                        >
                            {t.expand_p}
                        </p>

                        <div class="space-y-4 max-w-3xl mb-6">
                            {#each t.expand_steps as [title, desc], i}
                                <div
                                    class="flex gap-5 p-5 rounded-xl border border-slate-100 bg-slate-50"
                                >
                                    <span
                                        class="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-bold shadow-sm"
                                        >{i + 1}</span
                                    >
                                    <div>
                                        <h3
                                            class="font-semibold text-slate-800 mb-1"
                                        >
                                            {title}
                                        </h3>
                                        <p
                                            class="text-sm text-slate-500 leading-relaxed"
                                        >
                                            {desc}
                                        </p>
                                    </div>
                                </div>
                            {/each}
                        </div>

                        <div
                            class="flex gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl max-w-3xl"
                        >
                            <svg
                                class="shrink-0 text-emerald-600 mt-0.5"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><circle cx="12" cy="12" r="10" /><line
                                    x1="12"
                                    y1="8"
                                    x2="12"
                                    y2="12"
                                /><line
                                    x1="12"
                                    y1="16"
                                    x2="12.01"
                                    y2="16"
                                /></svg
                            >
                            <p class="text-sm text-emerald-800 leading-relaxed">
                                {t.expand_tip}
                            </p>
                        </div>
                    </section>

                    <!-- Section 4: Synonym Map -->
                    <section id="synonym-map" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.synonym_h2}
                        </h2>
                        <p
                            class="text-slate-500 leading-relaxed mb-6 max-w-3xl"
                        >
                            {t.synonym_p}
                        </p>

                        <div
                            class="rounded-xl border border-slate-200 overflow-hidden mb-6"
                        >
                            <div
                                class="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700"
                            >
                                <span class="text-xs font-mono text-slate-400"
                                    >{t.synonym_table_title}</span
                                >
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm">
                                    <thead>
                                        <tr
                                            class="bg-slate-50 border-b border-slate-200"
                                        >
                                            <th
                                                class="px-4 py-2.5 text-left text-xs font-bold text-slate-500"
                                                >{t.synonym_guest}</th
                                            >
                                            <th
                                                class="px-4 py-2.5 text-left text-xs font-bold text-slate-500"
                                                >{t.synonym_db}</th
                                            >
                                            <th
                                                class="px-4 py-2.5 text-left text-xs font-bold text-slate-500"
                                                >{t.synonym_reason}</th
                                            >
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each t.synonym_rows as [guest, db, reason], i}
                                            <tr
                                                class="{i % 2 === 0
                                                    ? 'bg-white'
                                                    : 'bg-slate-50'} border-b border-slate-100 last:border-0"
                                            >
                                                <td class="px-4 py-3">
                                                    <span
                                                        class="inline-block bg-red-50 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-red-100"
                                                        >{guest}</span
                                                    >
                                                </td>
                                                <td class="px-4 py-3">
                                                    <span
                                                        class="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-blue-100"
                                                        >{db}</span
                                                    >
                                                </td>
                                                <td
                                                    class="px-4 py-3 text-slate-500 text-sm"
                                                    >{reason}</td
                                                >
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <p
                            class="text-slate-500 leading-relaxed mb-4 max-w-3xl"
                        >
                            {t.synonym_p2}
                        </p>

                        <div
                            class="rounded-xl border border-slate-200 overflow-hidden max-w-3xl"
                        >
                            <div
                                class="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700"
                            >
                                <span class="text-xs font-mono text-slate-400"
                                    >{t.synonym_code_label}</span
                                >
                            </div>
                            <pre
                                class="bg-[#0f1117] text-sm font-mono leading-relaxed overflow-x-auto p-5 text-slate-300"><code
                                    ><span class="text-slate-500"
                                        >// Synonym map definition</span
                                    >
<span class="text-purple-400">const</span> <span class="text-sky-400"
                                        >allergenSynonymNames</span
                                    > = <span class="text-slate-500">{`{`}</span
                                    >
  <span class="text-amber-300">'グルテン'</span>: [<span class="text-amber-300"
                                        >'小麦'</span
                                    >],
  <span class="text-amber-300">'乳'</span>:      [<span class="text-amber-300"
                                        >'牛乳'</span
                                    >, <span class="text-amber-300"
                                        >'ミルク'</span
                                    >],
<span class="text-slate-500">{`}`}</span>

<span class="text-slate-500"
                                        >// Searches using canonical name + all synonyms, deduplicates results</span
                                    >
<span class="text-purple-400">function</span> <span class="text-sky-400"
                                        >getMenusForAllergen</span
                                    >(allergenId, allergenName) <span
                                        class="text-slate-500">{`{`}</span
                                    >
  <span class="text-purple-400">const</span
                                    > names = [allergenName, ...(synonyms[allergenName] ?? [])];
  <span class="text-slate-500">// ...deduplication and return</span>
<span class="text-slate-500">{`}`}</span></code
                                ></pre>
                        </div>
                    </section>

                    <!-- Section 5: Data Flow -->
                    <section id="data-flow" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.flow_h2}
                        </h2>
                        <p
                            class="text-slate-500 leading-relaxed mb-6 max-w-3xl"
                        >
                            {t.flow_p}
                        </p>

                        <ol class="space-y-3 mb-8 max-w-3xl">
                            {#each t.flow_apis as [fn, desc], i}
                                <li class="flex gap-4 items-start">
                                    <span
                                        class="shrink-0 flex items-center justify-center w-6 h-6 mt-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold"
                                        >{i + 1}</span
                                    >
                                    <div>
                                        <code
                                            class="text-sm font-mono font-semibold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded"
                                            >{fn}</code
                                        >
                                        <span
                                            class="text-sm text-slate-500 ml-2"
                                            >{desc}</span
                                        >
                                    </div>
                                </li>
                            {/each}
                        </ol>

                        <div
                            class="rounded-xl border border-slate-200 overflow-hidden max-w-3xl mb-6"
                        >
                            <div
                                class="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700"
                            >
                                <span
                                    class="text-xs font-semibold text-slate-400 uppercase tracking-widest"
                                    >{t.flow_diagram_title}</span
                                >
                            </div>
                            <div class="p-6 bg-slate-50">
                                <div class="flex flex-col gap-3 text-sm">
                                    <div
                                        class="flex items-center gap-3 flex-wrap"
                                    >
                                        <div
                                            class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-700 shadow-sm"
                                        >
                                            reservations[]
                                        </div>
                                        <span class="text-slate-400">→</span>
                                        <div
                                            class="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 font-semibold shadow-sm"
                                        >
                                            PAX {$lang === "en"
                                                ? "Summary"
                                                : "集計"}
                                        </div>
                                        <span class="text-slate-400">+</span>
                                        <div
                                            class="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 font-semibold shadow-sm"
                                        >
                                            allergenSummary[]
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-700 shadow-sm"
                                        >
                                            menuGroups[]
                                        </div>
                                        <span class="text-slate-400">→</span>
                                        <div
                                            class="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 font-semibold shadow-sm"
                                        >
                                            PAX {$lang === "en"
                                                ? "Row Labels"
                                                : "行ラベル"}
                                        </div>
                                    </div>
                                    <div
                                        class="flex items-center gap-3 flex-wrap"
                                    >
                                        <div
                                            class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-700 shadow-sm"
                                        >
                                            menus[]
                                        </div>
                                        <span class="text-slate-400">→</span>
                                        <div
                                            class="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-semibold shadow-sm"
                                        >
                                            allergenMenuMap
                                        </div>
                                        <span class="text-slate-400">→</span>
                                        <div
                                            class="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-semibold shadow-sm"
                                        >
                                            {$lang === "en"
                                                ? "Detail Panel"
                                                : "展開パネル"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            class="flex gap-4 p-5 rounded-xl border border-slate-100 bg-slate-50 max-w-3xl"
                        >
                            <svg
                                class="shrink-0 text-slate-500 mt-0.5"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><circle cx="12" cy="12" r="10" /><polyline
                                    points="12 6 12 12 16 14"
                                /></svg
                            >
                            <div>
                                <p
                                    class="text-sm font-semibold text-slate-700 mb-1"
                                >
                                    {t.flow_realtime_title}
                                </p>
                                <p
                                    class="text-sm text-slate-500 leading-relaxed"
                                >
                                    {t.flow_realtime_desc}
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

            <!-- Right ToC Sidebar -->
            <aside
                class="hidden xl:flex xl:flex-col w-60 bg-white border-l border-slate-200 overflow-y-auto pt-12 px-6 h-[calc(100vh-57px)] sticky top-[57px]"
            >
                <p
                    class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-5"
                >
                    {$lang === "en" ? "On this page" : "このページ"}
                </p>
                <nav class="flex flex-col gap-1 text-[13px]">
                    <a
                        href="#overview"
                        class="px-3 py-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        >{$lang === "en" ? "Overview" : "概要"}</a
                    >
                    <a
                        href="#pax-table"
                        class="px-3 py-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        >{t.nav_pax}</a
                    >
                    <a
                        href="#allergen-table"
                        class="px-3 py-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        >{t.nav_allergen}</a
                    >
                    <a
                        href="#expandable-rows"
                        class="px-3 py-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        >{t.nav_expand}</a
                    >
                    <a
                        href="#synonym-map"
                        class="px-3 py-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        >{t.nav_synonym}</a
                    >
                    <a
                        href="#data-flow"
                        class="px-3 py-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        >{t.nav_flow}</a
                    >
                </nav>
            </aside>
        </div>
    </main>
</div>

<script lang="ts">
    import { lang } from "$lib/stores/lang";

    const T = {
        en: {
            badge: "Feature Guide",
            section: "Menu System",
            h1: "Menu System",
            intro1: "Organise your restaurant's dishes into seasonal menus and groupings — and have allergen and price information always up to date, automatically.",

            what_h2: "What does this feature do?",
            what_p1:
                "The Menu System is how you organise all food and drink offerings. Think of it like building a menu booklet — you start with a season, divide it into sections, then fill each section with dishes.",
            what_p2:
                "Once dishes are added, their allergen information appears automatically based on the ingredients registered in the system. No spreadsheets. No manual updates.",

            card1_title: "Seasonal menus",
            card1_desc:
                "Create a new menu for each season (e.g. Spring, Summer). Set start and end dates. Activate the current one.",

            card2_title: "Menu groups",
            card2_desc:
                'Within each season, create plan groups such as "Standard Plan", "Kids Plan", or "3-night Stay". Each group has its own list of courses.',

            card3_title: "Dishes (menu items)",
            card3_desc:
                "Add individual dishes to each group — with name, price, category, and photo. Allergens fill in automatically.",

            struct_h2: "How it's structured",
            struct_p:
                "Think of it like three levels stacked inside each other:",

            layer1_title: "Seasonal Menu",
            layer1_desc:
                'A named time period for your menu, like "Summer 2026". You can have multiple seasons ready and switch the active one when the time comes.',
            layer1_ex: 'e.g. "Summer 2026"',

            layer2_title: "Menu Group",
            layer2_desc:
                'A plan within the season, like "Day 1 Dinner" or "Kids Package". You can limit groups to guests staying a specific number of nights.',
            layer2_ex: 'e.g. "Day 1 Dinner", "Kids Package"',

            layer3_title: "Menu Item (Dish)",
            layer3_desc:
                'An individual dish added to a group, like "Grilled Salmon". You choose its course and which ingredients it uses.',
            layer3_ex: 'e.g. "Grilled Salmon" (main)',

            howto_h2: "How to set up a menu",
            step1_title: "Create a Seasonal Menu",
            step1_desc:
                "Go to メニュー管理 → Seasonal Menus → Create. Give it a name and date range. Set it as active when the season starts.",
            step2_title: "Add Menu Groups",
            step2_desc:
                "Inside the seasonal menu, create groups for each plan. You can set which course types each group allows and filter by number of stay nights.",
            step3_title: "Add dishes to each group",
            step3_desc:
                "Select a group and add menu items. Enter the name, price, category, and the ingredients it uses. Allergens are filled in automatically.",

            tips_h2: "Things to know",
            tip1_title: "Allergens update automatically",
            tip1_desc:
                "When you update an ingredient's allergen data, every dish containing that ingredient reflects the change immediately.",
            tip2_title: "Stay-period filtering",
            tip2_desc:
                "Menu groups can be restricted to guests staying a specific number of nights (e.g. 1 night, 2 nights).",
            tip3_title: "Kids menu linking",
            tip3_desc:
                "A standard adult menu group can be linked to a kids group so the right menu is shown without duplicating the structure.",
            tip4_title: "Course constraints",
            tip4_desc:
                "Each menu group defines which course types are allowed. Dishes can only be added to matching courses.",

            perm_title: "Who can make changes?",
            perm_desc:
                "Only users with the appropriate permission level can add, edit, or delete menu items, groups, or seasonal menus. Viewing and printing is available to all staff.",

            dev_note:
                "The sections below are intended for developers building integrations or LLM wrappers.",
            resp_h2: "Response Shape",
            resp_p: "Full shape of a menu item returned from GET /menus/:id.",
            api_h2: "API Endpoints",
            api_seasonal: "Seasonal Menus",
            api_groups: "Menu Groups",
            api_items: "Menu Items",
            llm_h2: "LLM Function Tooling",
            llm_p: "Recommended tool definitions for LLM function calling against the menu system:",

            nav_what: "What does it do?",
            nav_struct: "How it's structured",
            nav_howto: "How to set up",
            nav_tips: "Things to know",
            nav_perm: "Permissions",
            nav_resp: "Response Shape",
            nav_api: "API Endpoints",
            nav_llm: "LLM Tooling",
            nav_everyone: "For everyone",
            nav_dev: "Developer",
        },
        ja: {
            badge: "ガイド",
            section: "メニューシステム",
            h1: "メニューシステム",
            intro1: "レストランの料理を季節ごとのメニューとグループに整理し、アレルゲン・価格情報を常に自動で最新状態に保ちます。",

            what_h2: "この機能でできること",
            what_p1:
                "メニューシステムは、ホテルやレストランで提供するすべての料理・飲み物を管理する仕組みです。季節から始まり、コースごとにグループ化し、各グループに料理を追加していきます。",
            what_p2:
                "料理を登録すると、その食材に基づいてアレルゲン情報が自動的に表示されます。スプレッドシートや手動更新は不要です。",

            card1_title: "季節メニュー",
            card1_desc:
                "春・夏・秋・冬などの季節ごとにメニューを作成できます。期間を設定し、現在の季節を「有効」に切り替えます。",

            card2_title: "メニューグループ",
            card2_desc:
                "季節メニューの中に「スタンダードプラン」「お子様プラン」「3泊プラン」などのグループを作成できます。",

            card3_title: "料理（メニュー項目）",
            card3_desc:
                "各グループに料理を追加できます。名前・価格・カテゴリ・写真を入力すると、アレルゲンが自動で設定されます。",

            struct_h2: "構成について",
            struct_p: "3つの階層が入れ子になった構造です：",

            layer1_title: "季節メニュー",
            layer1_desc:
                "「2026年 夏季メニュー」などの名前と期間を持つメニュー全体のコンテナです。複数の季節を準備しておき、時期に合わせて切り替えられます。",
            layer1_ex: "例：「2026年 夏季メニュー」",

            layer2_title: "メニューグループ",
            layer2_desc:
                "季節メニューの中のプラン単位です。「1泊プラン夕食」や「お子様プラン」など。宿泊日数による絞り込みも可能です。",
            layer2_ex: "例：「1泊プラン夕食」「お子様プラン」",

            layer3_title: "料理（メニュー項目）",
            layer3_desc:
                "グループ内の個別の料理です。コース種類を選び、使用する食材を指定するとアレルゲンが自動で設定されます。",
            layer3_ex: "例：「グリルサーモン」（メイン）",

            howto_h2: "メニューの作成手順",
            step1_title: "季節メニューを作成する",
            step1_desc:
                "「メニュー管理」→「季節メニュー」→「作成」から名前と期間を設定します。シーズン開始時に「有効」に切り替えてください。",
            step2_title: "メニューグループを追加する",
            step2_desc:
                "季節メニューの中に各プランのグループを作成します。コース種類や宿泊日数の条件も設定できます。",
            step3_title: "各グループに料理を追加する",
            step3_desc:
                "グループを選択してメニュー項目を追加します。名前・価格・カテゴリ・食材を入力すると、アレルゲンが自動で設定されます。",

            tips_h2: "知っておきたいこと",
            tip1_title: "アレルゲンは自動更新",
            tip1_desc:
                "食材のアレルゲン情報を更新すると、その食材を使用している全料理に即時反映されます。",
            tip2_title: "宿泊日数フィルター",
            tip2_desc:
                "メニューグループを特定の宿泊日数のゲスト（例：1泊、2泊）に限定して表示できます。",
            tip3_title: "お子様メニューのリンク",
            tip3_desc:
                "大人メニューグループにお子様グループをリンクすることで、構造を重複させることなくゲストに適切なメニューを表示できます。",
            tip4_title: "コース制約",
            tip4_desc:
                "グループごとに許可するコース種類を設定できます。料理は一致するコースにのみ追加できます。",

            perm_title: "変更できる権限について",
            perm_desc:
                "メニュー項目・グループ・季節メニューの追加・編集・削除は、権限のあるユーザーのみ操作できます。閲覧・印刷は全スタッフが利用可能です。",

            dev_note:
                "以下は連携システムやLLMラッパーを開発するエンジニア向けです。",
            resp_h2: "レスポンス構造",
            resp_p: "GET /menus/:id から返されるメニュー項目の構造です。",
            api_h2: "APIエンドポイント",
            api_seasonal: "季節メニュー (Seasonal Menus)",
            api_groups: "メニューグループ (Menu Groups)",
            api_items: "メニュー項目 (Menu Items)",
            llm_h2: "LLM ファンクションツール",
            llm_p: "メニューシステムに対してLLM関数呼び出しを実装するための推奨ツール定義です：",

            nav_what: "できること",
            nav_struct: "構成について",
            nav_howto: "作成手順",
            nav_tips: "知っておきたいこと",
            nav_perm: "権限",
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
                                class="px-2.5 py-0.5 text-[11px] font-semibold bg-sky-50 text-sky-700 rounded-full border border-sky-200"
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

                    <!-- SECTION 1: What -->
                    <section id="what-is-this" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.what_h2}
                        </h2>
                        <p
                            class="text-slate-500 leading-relaxed mb-4 max-w-3xl"
                        >
                            {t.what_p1}
                        </p>
                        <p
                            class="text-slate-500 leading-relaxed mb-8 max-w-3xl"
                        >
                            {t.what_p2}
                        </p>
                        <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
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
                                            ><rect
                                                x="3"
                                                y="4"
                                                width="18"
                                                height="18"
                                                rx="2"
                                                ry="2"
                                            /><line
                                                x1="16"
                                                y1="2"
                                                x2="16"
                                                y2="6"
                                            /><line
                                                x1="8"
                                                y1="2"
                                                x2="8"
                                                y2="6"
                                            /><line
                                                x1="3"
                                                y1="10"
                                                x2="21"
                                                y2="10"
                                            /></svg
                                        >
                                    </span>
                                    <h3
                                        class="font-semibold text-sky-900 text-sm"
                                    >
                                        {t.card1_title}
                                    </h3>
                                </div>
                                <p class="text-sm text-sky-800 leading-relaxed">
                                    {t.card1_desc}
                                </p>
                            </div>
                            <div
                                class="p-5 rounded-xl border border-indigo-100 bg-indigo-50"
                            >
                                <div class="flex items-center gap-2 mb-3">
                                    <span
                                        class="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 shrink-0"
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
                                                x="2"
                                                y="7"
                                                width="20"
                                                height="14"
                                                rx="2"
                                            /><path
                                                d="M16 3H8l-2 4h12l-2-4z"
                                            /></svg
                                        >
                                    </span>
                                    <h3
                                        class="font-semibold text-indigo-900 text-sm"
                                    >
                                        {t.card2_title}
                                    </h3>
                                </div>
                                <p
                                    class="text-sm text-indigo-800 leading-relaxed"
                                >
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
                                            ><path
                                                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                                            /><circle
                                                cx="9"
                                                cy="7"
                                                r="4"
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

                    <!-- SECTION 2: Structure -->
                    <section id="structure" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.struct_h2}
                        </h2>
                        <p
                            class="text-slate-500 leading-relaxed mb-8 max-w-3xl"
                        >
                            {t.struct_p}
                        </p>
                        <div
                            class="flex flex-col md:flex-row gap-3 items-stretch mb-8"
                        >
                            <div
                                class="flex-1 p-5 rounded-xl border-2 border-sky-200 bg-sky-50"
                            >
                                <div class="flex items-center gap-2 mb-3">
                                    <span
                                        class="w-6 h-6 flex items-center justify-center bg-sky-600 text-white text-xs font-bold rounded-full"
                                        >1</span
                                    >
                                    <h3
                                        class="font-bold text-sky-900 text-sm uppercase tracking-wider"
                                    >
                                        {t.layer1_title}
                                    </h3>
                                </div>
                                <p
                                    class="text-sm text-sky-800 leading-relaxed mb-2"
                                >
                                    {t.layer1_desc}
                                </p>
                                <p class="text-xs text-sky-600 italic">
                                    {t.layer1_ex}
                                </p>
                            </div>
                            <div
                                class="hidden md:flex items-center text-slate-300 shrink-0 pt-2"
                            >
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    ><path d="M5 12h14M12 5l7 7-7 7" /></svg
                                >
                            </div>
                            <div
                                class="flex-1 p-5 rounded-xl border-2 border-indigo-200 bg-indigo-50"
                            >
                                <div class="flex items-center gap-2 mb-3">
                                    <span
                                        class="w-6 h-6 flex items-center justify-center bg-indigo-600 text-white text-xs font-bold rounded-full"
                                        >2</span
                                    >
                                    <h3
                                        class="font-bold text-indigo-900 text-sm uppercase tracking-wider"
                                    >
                                        {t.layer2_title}
                                    </h3>
                                </div>
                                <p
                                    class="text-sm text-indigo-800 leading-relaxed mb-2"
                                >
                                    {t.layer2_desc}
                                </p>
                                <p class="text-xs text-indigo-600 italic">
                                    {t.layer2_ex}
                                </p>
                            </div>
                            <div
                                class="hidden md:flex items-center text-slate-300 shrink-0 pt-2"
                            >
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    ><path d="M5 12h14M12 5l7 7-7 7" /></svg
                                >
                            </div>
                            <div
                                class="flex-1 p-5 rounded-xl border-2 border-violet-200 bg-violet-50"
                            >
                                <div class="flex items-center gap-2 mb-3">
                                    <span
                                        class="w-6 h-6 flex items-center justify-center bg-violet-600 text-white text-xs font-bold rounded-full"
                                        >3</span
                                    >
                                    <h3
                                        class="font-bold text-violet-900 text-sm uppercase tracking-wider"
                                    >
                                        {t.layer3_title}
                                    </h3>
                                </div>
                                <p
                                    class="text-sm text-violet-800 leading-relaxed mb-2"
                                >
                                    {t.layer3_desc}
                                </p>
                                <p class="text-xs text-violet-600 italic">
                                    {t.layer3_ex}
                                </p>
                            </div>
                        </div>
                    </section>

                    <!-- SECTION 3: How to use -->
                    <section id="how-to-use" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.howto_h2}
                        </h2>
                        <ol class="space-y-4 max-w-3xl">
                            {#each [{ n: 1, title: t.step1_title, desc: t.step1_desc }, { n: 2, title: t.step2_title, desc: t.step2_desc }, { n: 3, title: t.step3_title, desc: t.step3_desc }] as step}
                                <li
                                    class="flex gap-5 p-5 rounded-xl border border-slate-100 bg-slate-50 items-start"
                                >
                                    <span
                                        class="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-bold shadow-sm"
                                        >{step.n}</span
                                    >
                                    <div>
                                        <h3
                                            class="font-semibold text-slate-800 mb-1"
                                        >
                                            {step.title}
                                        </h3>
                                        <p
                                            class="text-sm text-slate-500 leading-relaxed"
                                        >
                                            {step.desc}
                                        </p>
                                    </div>
                                </li>
                            {/each}
                        </ol>
                    </section>

                    <!-- SECTION 4: Tips -->
                    <section id="features" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.tips_h2}
                        </h2>
                        <div
                            class="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-3xl"
                        >
                            {#each [{ icon: "check", color: "emerald", title: t.tip1_title, desc: t.tip1_desc }, { icon: "mail", color: "indigo", title: t.tip2_title, desc: t.tip2_desc }, { icon: "users", color: "violet", title: t.tip3_title, desc: t.tip3_desc }, { icon: "check-sq", color: "amber", title: t.tip4_title, desc: t.tip4_desc }] as tip}
                                <div
                                    class="flex gap-4 p-5 rounded-xl border border-slate-100 bg-white"
                                >
                                    <span
                                        class="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-{tip.color}-50 text-{tip.color}-600"
                                    >
                                        {#if tip.icon === "check"}
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                ><path
                                                    d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
                                                /><polyline
                                                    points="22 4 12 14.01 9 11.01"
                                                /></svg
                                            >
                                        {:else if tip.icon === "mail"}
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                ><path
                                                    d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                                                /><polyline
                                                    points="22,6 12,13 2,6"
                                                /></svg
                                            >
                                        {:else if tip.icon === "users"}
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                ><path
                                                    d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                                                /><circle
                                                    cx="9"
                                                    cy="7"
                                                    r="4"
                                                /><path
                                                    d="M23 21v-2a4 4 0 0 0-3-3.87"
                                                /></svg
                                            >
                                        {:else}
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                ><path
                                                    d="M9 11l3 3L22 4"
                                                /><path
                                                    d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
                                                /></svg
                                            >
                                        {/if}
                                    </span>
                                    <div>
                                        <h3
                                            class="font-semibold text-slate-800 text-sm mb-1"
                                        >
                                            {tip.title}
                                        </h3>
                                        <p
                                            class="text-xs text-slate-500 leading-relaxed"
                                        >
                                            {tip.desc}
                                        </p>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </section>

                    <!-- SECTION 5: Permissions -->
                    <section id="permissions" class="mb-16">
                        <div
                            class="flex gap-4 p-5 rounded-xl border border-slate-200 bg-slate-50 max-w-3xl"
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
                                ><path
                                    d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                                /></svg
                            >
                            <div>
                                <h3
                                    class="font-semibold text-slate-700 text-sm mb-1"
                                >
                                    {t.perm_title}
                                </h3>
                                <p
                                    class="text-sm text-slate-500 leading-relaxed"
                                >
                                    {t.perm_desc}
                                </p>
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
                                class="flex items-center justify-center w-7 h-7 bg-sky-600 text-white text-xs font-bold rounded-full"
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
                                    >GET /menus/:id — 200 OK</span
                                >
                                <span class="text-xs text-sky-400 font-mono"
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
  <span class="text-sky-400">"price"</span><span class="text-slate-500">:</span
                                    > <span class="text-purple-400">1200</span>,
  <span class="text-sky-400">"category"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-amber-300">"main"</span
                                    >,
  <span class="text-sky-400">"is_available"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-purple-400">true</span>,
  <span class="text-sky-400">"seasonal_menu_id"</span><span
                                        class="text-slate-500">:</span
                                    > <span class="text-amber-300">"uuid"</span
                                    >,
  <span class="text-sky-400">"menu_group_id"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-amber-300">"uuid"</span
                                    >,
  <span class="text-sky-400">"products"</span><span class="text-slate-500"
                                        >: [</span
                                    >
    <span class="text-slate-500">&#x7B;</span> <span class="text-sky-400"
                                        >"id"</span
                                    ><span class="text-slate-500">:</span> <span
                                        class="text-amber-300">"uuid"</span
                                    >, <span class="text-sky-400">"name"</span
                                    ><span class="text-slate-500">:</span> <span
                                        class="text-amber-300">"鶏もも肉"</span
                                    > <span class="text-slate-500">&#x7D;</span>
  <span class="text-slate-500">],</span>
  <span class="text-sky-400">"allergens"</span><span class="text-slate-500"
                                        >: [</span
                                    >
    <span class="text-slate-500">&#x7B;</span> <span class="text-sky-400"
                                        >"id"</span
                                    ><span class="text-slate-500">:</span> <span
                                        class="text-amber-300">"uuid"</span
                                    >, <span class="text-sky-400">"name"</span
                                    ><span class="text-slate-500">:</span> <span
                                        class="text-amber-300">"鶏肉"</span
                                    >, <span class="text-sky-400"
                                        >"category"</span
                                    ><span class="text-slate-500">:</span> <span
                                        class="text-amber-300">"meat"</span
                                    > <span class="text-slate-500">&#x7D;</span>
  <span class="text-slate-500">]</span>
<span class="text-slate-500">&#x7D;</span></code
                                ></pre>
                        </div>
                    </section>

                    <!-- Dev: API Endpoints -->
                    <section id="api-endpoints" class="mb-16">
                        <div class="flex items-center gap-3 mb-5">
                            <span
                                class="flex items-center justify-center w-7 h-7 bg-sky-600 text-white text-xs font-bold rounded-full"
                                >2</span
                            >
                            <h2 class="text-xl font-bold text-slate-900">
                                {t.api_h2}
                            </h2>
                        </div>

                        {#each [{ label: t.api_seasonal, rows: [{ m: "GET", p: "/seasonal-menus", en: "List all seasonal menus", ja: "季節メニュー一覧" }, { m: "POST", p: "/seasonal-menus", en: "Create (requires permission)", ja: "作成（権限必要）" }, { m: "PUT", p: "/seasonal-menus/:id", en: "Update (requires permission)", ja: "更新（権限必要）" }, { m: "DELETE", p: "/seasonal-menus/:id", en: "Delete — nullifies FK refs", ja: "削除（参照をnullに）" }] }, { label: t.api_groups, rows: [{ m: "GET", p: "/menu-groups", en: "Filter by seasonal_menu_id / nights", ja: "季節ID・宿泊数でフィルター" }, { m: "POST", p: "/menu-groups", en: "Create with allowed_courses[]", ja: "コース設定付きで作成" }, { m: "PUT", p: "/menu-groups/:id", en: "Update", ja: "更新" }, { m: "DELETE", p: "/menu-groups/:id", en: "Delete", ja: "削除" }] }, { label: t.api_items, rows: [{ m: "GET", p: "/menus", en: "List all — nested products + allergens", ja: "全件取得（食材・アレルゲン含む）" }, { m: "GET", p: "/menus/:id", en: "Single item with allergen data", ja: "1件取得（アレルゲン付き）" }, { m: "GET", p: "/menus/allergen-report", en: "Full report for PDF / Excel", ja: "PDF・Excel用レポート" }, { m: "POST", p: "/menus", en: "Create with product_ids[]", ja: "食材ID付きで作成" }, { m: "PUT", p: "/menus/:id", en: "Update — batch-replaces products", ja: "更新（食材を一括置換）" }, { m: "DELETE", p: "/menus/:id", en: "Delete", ja: "削除" }] }] as group}
                            <h3
                                class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4"
                            >
                                {group.label}
                            </h3>
                            <div
                                class="overflow-hidden rounded-xl border border-slate-200 mb-8"
                            >
                                {#each group.rows as row, i}
                                    <div
                                        class="flex items-center gap-4 px-5 py-3.5 {i <
                                        group.rows.length - 1
                                            ? 'border-b border-slate-100'
                                            : ''} hover:bg-slate-50 transition-colors"
                                    >
                                        <span
                                            class="shrink-0 w-16 text-center text-[11px] font-bold tracking-wide rounded px-1.5 py-0.5
                      {row.m === 'GET'
                                                ? 'bg-sky-50 text-sky-700'
                                                : row.m === 'POST'
                                                  ? 'bg-green-50 text-green-700'
                                                  : row.m === 'PUT'
                                                    ? 'bg-amber-50 text-amber-700'
                                                    : 'bg-red-50 text-red-700'}"
                                            >{row.m}</span
                                        >
                                        <code
                                            class="text-sm font-mono text-slate-700"
                                            >{row.p}</code
                                        >
                                        <span
                                            class="text-sm text-slate-400 ml-auto"
                                            >{$lang === "en"
                                                ? row.en
                                                : row.ja}</span
                                        >
                                    </div>
                                {/each}
                            </div>
                        {/each}
                    </section>

                    <!-- Dev: LLM Tooling -->
                    <section id="llm-tooling" class="mb-16">
                        <div class="flex items-center gap-3 mb-5">
                            <span
                                class="flex items-center justify-center w-7 h-7 bg-sky-600 text-white text-xs font-bold rounded-full"
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
                        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {#each [{ name: "get_seasonal_menus", en: "List available menus filtered by active status.", ja: "有効な季節メニューを取得。", route: "GET /seasonal-menus" }, { name: "get_menu_for_guest", en: "Fetch menu group by guest stay nights.", ja: "宿泊日数に応じたグループを取得。", route: "GET /menu-groups?stay_period_nights=N" }, { name: "get_dish_allergens", en: "Retrieve allergen data for a specific dish.", ja: "指定した料理のアレルゲンを取得。", route: "GET /menus/:id" }, { name: "get_allergen_report", en: "Full report for a group, suitable for LLM response.", ja: "グループ全体のレポートを取得。", route: "GET /menus/allergen-report" }] as tool}
                                <div
                                    class="p-5 rounded-xl border border-slate-200 bg-white hover:border-sky-200 hover:shadow-sm transition-all"
                                >
                                    <code class="text-sm font-bold text-sky-600"
                                        >{tool.name}</code
                                    >
                                    <p
                                        class="text-sm text-slate-500 leading-relaxed mt-2"
                                    >
                                        {$lang === "en" ? tool.en : tool.ja} →
                                        <code
                                            class="text-xs bg-slate-100 px-1 rounded"
                                            >{tool.route}</code
                                        >
                                    </p>
                                </div>
                            {/each}
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
                        class="px-3 py-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                        >{t.nav_what}</a
                    >
                    <a
                        href="#structure"
                        class="px-3 py-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                        >{t.nav_struct}</a
                    >
                    <a
                        href="#how-to-use"
                        class="px-3 py-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                        >{t.nav_howto}</a
                    >
                    <a
                        href="#features"
                        class="px-3 py-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                        >{t.nav_tips}</a
                    >
                    <a
                        href="#permissions"
                        class="px-3 py-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                        >{t.nav_perm}</a
                    >
                    <p
                        class="text-[10px] font-semibold text-slate-300 uppercase tracking-widest px-3 mt-4 mb-1"
                    >
                        {t.nav_dev}
                    </p>
                    <a
                        href="#response-shape"
                        class="px-3 py-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                        >{t.nav_resp}</a
                    >
                    <a
                        href="#api-endpoints"
                        class="px-3 py-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                        >{t.nav_api}</a
                    >
                    <a
                        href="#llm-tooling"
                        class="px-3 py-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                        >{t.nav_llm}</a
                    >
                </nav>
            </aside>

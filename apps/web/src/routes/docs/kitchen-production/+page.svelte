<div
    class="min-h-screen bg-[#F5F6FA] text-slate-800 font-sans flex flex-col antialiased"
>
    <main
        class="flex-1 flex flex-col min-h-screen max-w-[1600px] mx-auto w-full overflow-hidden relative"
    >
        <!-- Top Header -->
        <header
            class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between"
        >
            <a
                href="/docs"
                class="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium text-sm"
            >
                <span class="material-symbols-rounded text-base"
                    >arrow_back</span
                >
                ドキュメント一覧
            </a>
            <span
                class="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-bold uppercase tracking-widest rounded-full border border-orange-200"
            >
                Kitchen Production
            </span>
        </header>

        <!-- 3-Column Layout -->
        <div class="flex flex-1 w-full relative">
            <!-- Left Sidebar -->
            <aside
                class="hidden lg:flex lg:flex-col w-64 border-r border-slate-200 bg-white overflow-y-auto pt-8 pb-10 px-4 h-[calc(100vh-57px)] sticky top-[57px]"
            >
                <div class="mb-8">
                    <p
                        class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3 px-3"
                    >
                        ガイド
                    </p>
                    <ul class="space-y-0.5">
                        <li>
                            <a
                                href="/docs"
                                class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                                >アレルゲン管理</a
                            >
                        </li>
                        <li>
                            <a
                                href="/docs/menus"
                                class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                                >メニューシステム</a
                            >
                        </li>
                        <li>
                            <a
                                href="/docs/front-desk"
                                class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                                >フロントデスク</a
                            >
                        </li>
                        <li>
                            <a
                                href="/docs/kitchen-production"
                                class="block px-3 py-2 text-sm font-semibold bg-orange-50 text-orange-700 rounded-lg"
                                >厨房生産管理</a
                            >
                        </li>
                    </ul>
                </div>
                <div>
                    <p
                        class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3 px-3"
                    >
                        このページ
                    </p>
                    <ul class="space-y-0.5">
                        <li>
                            <a
                                href="#overview"
                                class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                                >概要</a
                            >
                        </li>
                        <li>
                            <a
                                href="#pax-table"
                                class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                                >1. PAX集計テーブル</a
                            >
                        </li>
                        <li>
                            <a
                                href="#allergen-table"
                                class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                                >2. アレルギー情報テーブル</a
                            >
                        </li>
                        <li>
                            <a
                                href="#expandable-rows"
                                class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                                >3. 展開行の詳細</a
                            >
                        </li>
                        <li>
                            <a
                                href="#synonym-mapping"
                                class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                                >4. アレルゲン類義語マップ</a
                            >
                        </li>
                        <li>
                            <a
                                href="#data-flow"
                                class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                                >5. データフロー</a
                            >
                        </li>
                    </ul>
                </div>
            </aside>

            <!-- Main Content -->
            <div class="flex-1 overflow-y-auto h-[calc(100vh-57px)] bg-white">
                <article
                    class="max-w-[720px] mx-auto px-8 xl:px-12 py-16 pb-32"
                >
                    <!-- Doc Header -->
                    <div
                        id="overview"
                        class="mb-14 pb-10 border-b border-slate-100"
                    >
                        <div class="flex items-center gap-2 mb-5">
                            <span
                                class="px-2.5 py-0.5 text-[11px] font-semibold bg-orange-50 text-orange-700 rounded-full border border-orange-200"
                                >Feature Guide</span
                            >
                            <span class="text-slate-300 text-sm">/</span>
                            <span class="text-sm text-slate-400 font-medium"
                                >Kitchen Production</span
                            >
                        </div>
                        <h1
                            class="text-[2.75rem] font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-5"
                        >
                            厨房生産管理
                        </h1>
                        <p class="text-lg text-slate-500 leading-[1.75] mb-4">
                            日別の食事予約PAX（人数）を集計し、アレルギー申告状況をリアルタイムで厨房スタッフに提供するダッシュボードです。チェックイン済み予約から自動集計され、常に最新の状態を保ちます。
                        </p>
                        <div class="flex items-center gap-3 mt-6">
                            <a
                                href="/kitchen-production"
                                class="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                            >
                                <span class="material-symbols-rounded text-base"
                                    >open_in_new</span
                                >
                                厨房ダッシュボードを開く
                            </a>
                        </div>
                    </div>

                    <!-- Section 1: PAX Table -->
                    <section class="mb-16" id="pax-table">
                        <div class="flex items-center gap-3 mb-5">
                            <span
                                class="flex items-center justify-center w-7 h-7 bg-orange-500 text-white text-xs font-bold rounded-full"
                                >1</span
                            >
                            <h2 class="text-xl font-bold text-slate-900">
                                PAX集計テーブル
                            </h2>
                        </div>
                        <p class="text-slate-500 leading-relaxed mb-6">
                            ページ上部のテーブルには、選択した日付にチェックインした予約のPAX（食事人数）が、夕食・朝食・食事プラン別に集計されます。
                        </p>

                        <!-- Visual mockup of table structure -->
                        <div
                            class="rounded-xl border border-slate-200 overflow-hidden mb-6"
                        >
                            <div
                                class="bg-slate-900 px-4 py-2.5 flex items-center gap-2"
                            >
                                <span
                                    class="text-xs font-semibold text-slate-400 uppercase tracking-widest"
                                    >PAX集計テーブル 構造</span
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
                                                >列</th
                                            >
                                            <th
                                                class="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
                                                >内容</th
                                            >
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each [["メニューグループ", "例：「和牛懐石」「スタンダード」など。予約に紐づいたメニューグループ名"], ["夕食 PAX", "dinner_time が設定された予約の合計人数"], ["朝食 PAX", "breakfast_time が設定された予約の合計人数"], ["1泊2食", 'meal_plan = "2meals" の予約数'], ["夕食のみ", 'meal_plan = "dinner_only" の予約数'], ["朝食のみ", 'meal_plan = "breakfast_only" の予約数'], ["素泊まり", 'meal_plan = "room_only" の予約数'], ["合計", "当日のチェックイン済み予約の総人数"]] as [col, desc], i}
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
                            class="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3"
                        >
                            <span
                                class="material-symbols-rounded text-blue-500 text-lg shrink-0"
                                >info</span
                            >
                            <p class="text-sm text-blue-800 leading-relaxed">
                                PAXは <strong
                                    >チェックイン済み（status = "checked_in"）</strong
                                > の予約のみを集計します。未チェックイン予約は含まれません。リアルタイム更新対応（Supabase
                                リアルタイム）。
                            </p>
                        </div>
                    </section>

                    <!-- Section 2: Allergen Table -->
                    <section class="mb-16" id="allergen-table">
                        <div class="flex items-center gap-3 mb-5">
                            <span
                                class="flex items-center justify-center w-7 h-7 bg-orange-500 text-white text-xs font-bold rounded-full"
                                >2</span
                            >
                            <h2 class="text-xl font-bold text-slate-900">
                                アレルギー情報テーブル（アレルギー情報）
                            </h2>
                        </div>
                        <p class="text-slate-500 leading-relaxed mb-6">
                            ページ下部の「アレルギー情報」テーブルには、当日チェックイン予約中でアレルゲン申告があったゲストの情報が集計されています。
                        </p>

                        <div
                            class="rounded-xl border border-slate-200 overflow-hidden mb-6"
                        >
                            <div class="bg-slate-900 px-4 py-2.5">
                                <span
                                    class="text-xs font-semibold text-slate-400 uppercase tracking-widest"
                                    >アレルゲン行の列構成</span
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
                                                >列</th
                                            >
                                            <th
                                                class="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
                                                >内容</th
                                            >
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each [["アレルゲン名", "申告されたアレルゲン（例：小麦、卵、乳）"], ["人数", "そのアレルゲンを申告したゲストの合計人数"], ["カテゴリ", "「穀類」「乳製品」「魚介類」などのカテゴリ分類"]] as [col, desc], i}
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

                        <p class="text-slate-500 leading-relaxed">
                            各行はクリック可能で、展開するとそのアレルゲンに関連するメニューグループと商品の詳細が表示されます。
                        </p>
                    </section>

                    <!-- Section 3: Expandable Rows -->
                    <section class="mb-16" id="expandable-rows">
                        <div class="flex items-center gap-3 mb-5">
                            <span
                                class="flex items-center justify-center w-7 h-7 bg-orange-500 text-white text-xs font-bold rounded-full"
                                >3</span
                            >
                            <h2 class="text-xl font-bold text-slate-900">
                                展開行の詳細パネル
                            </h2>
                        </div>
                        <p class="text-slate-500 leading-relaxed mb-6">
                            アレルゲン行をクリックすると、インライン展開パネルが表示されます。このパネルはキッチンスタッフが食材変更の判断をするための情報を提供します。
                        </p>

                        <div class="space-y-4 mb-6">
                            {#each [{ step: "クリックで展開", desc: "アレルゲン行をクリックすると、行の下に詳細パネルが展開されます。chevron（>）アイコンが回転して開閉状態を示します。", color: "bg-orange-50 border-orange-100" }, { step: "アレルゲンカード", desc: "展開パネルには、申告されたアレルゲンごとにカードが表示されます。各カードにはアレルゲン名・人数・カテゴリが記載されています。", color: "bg-slate-50 border-slate-100" }, { step: "メニューグループタグ", desc: "そのアレルゲンを含む商品が使われているメニューグループが青いタグで表示されます（例：和牛懐石、スタンダード）。", color: "bg-blue-50 border-blue-100" }, { step: "商品名タグ", desc: "そのアレルゲンを含む具体的な商品名が琥珀色（amber）のタグで表示されます。スタッフはこの情報をもとに代替食材の検討ができます。", color: "bg-amber-50 border-amber-100" }] as item, i}
                                <div
                                    class="flex gap-4 p-4 rounded-xl border {item.color}"
                                >
                                    <span
                                        class="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm"
                                        >{i + 1}</span
                                    >
                                    <div>
                                        <h3
                                            class="font-semibold text-slate-800 mb-1"
                                        >
                                            {item.step}
                                        </h3>
                                        <p
                                            class="text-sm text-slate-500 leading-relaxed"
                                        >
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                            {/each}
                        </div>

                        <div
                            class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex gap-3"
                        >
                            <span
                                class="material-symbols-rounded text-emerald-600 text-lg shrink-0"
                                >lightbulb</span
                            >
                            <p class="text-sm text-emerald-800 leading-relaxed">
                                <strong class="font-semibold"
                                    >複数行同時展開：</strong
                                >複数のアレルゲン行を同時に展開することができます。
                                データ再読み込み時には展開状態がリセットされます。
                            </p>
                        </div>
                    </section>

                    <!-- Section 4: Synonym Mapping -->
                    <section class="mb-16" id="synonym-mapping">
                        <div class="flex items-center gap-3 mb-5">
                            <span
                                class="flex items-center justify-center w-7 h-7 bg-orange-500 text-white text-xs font-bold rounded-full"
                                >4</span
                            >
                            <h2 class="text-xl font-bold text-slate-900">
                                アレルゲン類義語マップ
                            </h2>
                        </div>
                        <p class="text-slate-500 leading-relaxed mb-6">
                            ゲストが申告するアレルゲン名と、厨房・商品データベースで使われているアレルゲン名が異なる場合があります。そのために
                            UI レベルの類義語マッピング機能が実装されています。
                        </p>

                        <div
                            class="rounded-xl border border-slate-200 overflow-hidden mb-6"
                        >
                            <div
                                class="bg-slate-900 px-4 py-2.5 flex items-center gap-2"
                            >
                                <span class="text-xs font-mono text-slate-400"
                                    >allergenSynonymNames — 現在の対応マップ</span
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
                                                >ゲスト申告名</th
                                            >
                                            <th
                                                class="px-4 py-2.5 text-left text-xs font-bold text-slate-500"
                                                >DB上の正式名（類義語）</th
                                            >
                                            <th
                                                class="px-4 py-2.5 text-left text-xs font-bold text-slate-500"
                                                >理由</th
                                            >
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each [["グルテン", "小麦", "ゲストは「グルテン」と言うが、商品表示は「小麦」"], ["乳", "牛乳, ミルク", "ゲストは「乳」と言うが、商品表示は「牛乳」「ミルク」など"]] as [guest, db, reason], i}
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

                        <p class="text-slate-500 leading-relaxed mb-4">
                            類義語マッピングは <code
                                class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                                >getMenusForAllergen()</code
                            > ヘルパー関数内で処理されます。 ゲストが「グルテン」と申告した場合、展開パネルには「グルテン」および「小麦」両方に関連する商品が表示されます。
                        </p>

                        <div
                            class="rounded-xl border border-slate-200 overflow-hidden"
                        >
                            <div class="bg-slate-900 px-4 py-2.5">
                                <span class="text-xs font-mono text-slate-400"
                                    >kitchen-production/+page.svelte —
                                    類義語ロジック概要</span
                                >
                            </div>
                            <pre
                                class="bg-[#0f1117] text-sm font-mono leading-relaxed overflow-x-auto p-5 text-slate-300"><code
                                    ><span class="text-slate-500"
                                        >// 類義語マップ定義</span
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
                                        >// 検索時に本名＋類義語の両方でメニューを取得し重複排除</span
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
                    <section class="mb-16" id="data-flow">
                        <div class="flex items-center gap-3 mb-5">
                            <span
                                class="flex items-center justify-center w-7 h-7 bg-orange-500 text-white text-xs font-bold rounded-full"
                                >5</span
                            >
                            <h2 class="text-xl font-bold text-slate-900">
                                データフロー
                            </h2>
                        </div>
                        <p class="text-slate-500 leading-relaxed mb-6">
                            ページロード時に以下のAPIを並列取得し、画面を構築します。
                        </p>

                        <ol class="space-y-3 mb-8">
                            {#each [["getReservations(date)", "当日のチェックイン済み予約一覧を取得"], ["getMenuGroups()", "メニューグループ一覧（PAXテーブルの行に対応）"], ["getMenus()", "各メニューのアレルゲン・商品情報（展開パネル用）"]] as [fn, desc], i}
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

                        <!-- Flow diagram -->
                        <div
                            class="rounded-xl border border-slate-200 overflow-hidden"
                        >
                            <div class="bg-slate-900 px-4 py-2.5">
                                <span
                                    class="text-xs font-semibold text-slate-400 uppercase tracking-widest"
                                    >データ依存関係</span
                                >
                            </div>
                            <div class="p-6 bg-slate-50">
                                <div class="flex flex-col gap-2 text-sm">
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-700 shadow-sm"
                                        >
                                            reservations[]
                                        </div>
                                        <span class="text-slate-400">→</span>
                                        <div
                                            class="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 font-semibold shadow-sm"
                                        >
                                            PAX集計
                                        </div>
                                    </div>
                                    <div
                                        class="ml-4 border-l-2 border-slate-200 pl-4 py-1"
                                    >
                                        <span class="text-xs text-slate-400"
                                            >allergen_details[] より →
                                            allergenSummary[]パネル</span
                                        >
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
                                            PAX行ラベル
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-3">
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
                                            展開パネル
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            class="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl"
                        >
                            <p
                                class="text-sm font-semibold text-slate-700 mb-2"
                            >
                                Supabase リアルタイム更新
                            </p>
                            <p class="text-sm text-slate-500 leading-relaxed">
                                <code
                                    class="text-xs bg-slate-200/70 text-slate-700 px-1 rounded"
                                    >reservations</code
                                > テーブルへの INSERT / UPDATE をリアルタイムで購読しており、フロントでチェックインが完了すると厨房ダッシュボードも自動的に更新されます。キッチンスタッフは手動でリロードする必要がありません。
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
                        class="px-3 py-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        >Overview</a
                    >
                    <a
                        href="#pax-table"
                        class="px-3 py-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        >1. PAX集計テーブル</a
                    >
                    <a
                        href="#allergen-table"
                        class="px-3 py-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        >2. アレルギー情報</a
                    >
                    <a
                        href="#expandable-rows"
                        class="px-3 py-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        >3. 展開行の詳細</a
                    >
                    <a
                        href="#synonym-mapping"
                        class="px-3 py-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        >4. 類義語マップ</a
                    >
                    <a
                        href="#data-flow"
                        class="px-3 py-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        >5. データフロー</a
                    >
                </nav>
            </aside>
        </div>
    </main>
</div>

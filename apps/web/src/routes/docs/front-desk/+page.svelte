<script lang="ts">
    import { lang } from "$lib/stores/lang";

    const T = {
        en: {
            badge: "Feature Guide",
            section: "Front Desk",
            h1: "Front Desk",
            intro: "Manage all hotel reservations from one screen — check guests in and out, track room status, and get notified of new arrivals in real time.",

            stats_h2: "Dashboard summary cards",
            stats_p: "At the top of the page you will see four live counters:",
            stat1: "Total reservations — total count for the selected date range",
            stat2: "Awaiting arrival (到着待ち) — guests not yet checked in",
            stat3: "Currently staying (在館中) — guests already checked in",
            stat4: "Checked out (チェックアウト済) — guests who have left",
            stat5: "Vacant rooms (空室) — rooms with no active reservation",

            filter_h2: "Filters and search",
            filter_p:
                "The reservation table can be narrowed down using three controls:",
            tab1_title: "Status tabs",
            tab1_desc:
                "Four tabs at the top of the table: 到着待ち (awaiting), 在館中 (in-house), チェックアウト済 (checked out), 全て (all). The number in each tab shows the count.",
            tab2_title: "Date range dropdown",
            tab2_desc:
                "The 本日 (Today) button opens a dropdown. Options: Today, Past 3 days, Past 7 days, Past 30 days, All, or pick a specific date from the calendar.",
            tab3_title: "Guest / room search",
            tab3_desc:
                "Type a guest name (in kanji or kana) or room number into the search box on the right to instantly filter the table.",

            table_h2: "Reservation table columns",
            col1: "Room number + room name (e.g. 101 / 桜)",
            col2: "Guest name + kana reading below",
            col3: "Party size (人数)",
            col4: "Booking source — colour-coded badge (Rakuten, じゃらん, Booking.com, Expedia, Agoda, 直接予約, 電話, ウォークイン)",
            col5: "Stay period (宿泊期間) — check-in date and check-out date, number of nights shown below",
            col6: "Plan name and meal plan (夕食のみ, 1泊2食, 朝食のみ, 素泊まり)",
            col7: "Allergens — colour tags per allergen with count of guests affected",
            col8: "Status badge — 到着待ち / チェックイン済 / チェックアウト済",
            col9: "Action button — チェックイン (blue) for pending guests, チェックアウト (gray) for in-house guests",

            checkin_h2: "How to check in a guest",
            checkin_p:
                "Click the blue チェックイン button on any row. A 3-step wizard opens:",
            step1_title: "Step 1 — Find the reservation",
            step1_desc:
                "If you clicked from the table, this step is skipped and the reservation is pre-selected. Otherwise you can search by QR code, guest name, or phone number.",
            step2_title: "Step 2 — Confirm guest details",
            step2_desc:
                "Review the reservation: room, plan, stay dates, meal plan. Confirm the dinner time from the dropdown (17:30 – 20:00). Add any special requests.",
            step3_title: "Step 3 — Register allergens",
            step3_desc:
                'Search and select allergens from the master list. For each allergen, set how many people in the party are affected (person count). For seafood-based allergens, toggle "出汁もNG" (dashi also not OK) if applicable. Click チェックインを完了 to finish.',

            checkout_h2: "How to check out a guest",
            checkout_p:
                "Click the gray チェックアウト button on a row where the guest is already in-house. A confirmation dialog pops up. Click 確認 to complete checkout. The room status updates automatically.",

            rooms_h2: "Room status view",
            rooms_p:
                "Switch to 客室状況 in the sidebar to see all rooms as a grid. Each room card shows the room number, name, and current status:",
            room1: "空室 (Vacant) — green, no active reservation",
            room2: "チェックイン済 (Occupied) — blue, guest is currently staying",
            room3: "チェックアウト済 (Needs cleaning) — gray, guest has left",

            notif_h2: "Guest alerts and notifications",
            notif_p:
                "Switch to 通知 in the sidebar. The badge on the sidebar icon shows the count of unread alerts. Each alert shows the guest name, room, and what triggered it. Click 確認済み to dismiss an alert.",

            realtime_h2: "Real-time updates",
            realtime_p:
                "The 🔴 リアルタイム indicator in the header shows that the page is connected to a live data stream. Reservation changes made by another staff member (on another device) appear automatically without needing to refresh. Click 更新 to manually refresh if needed.",

            menu_h2: "Menu preview",
            menu_p: "Click お品書きプレビュー in the sidebar (if you have permission) to open a panel showing the current seasonal menu, grouped by course. You can scroll through all dishes and their allergen tags without leaving the front desk screen.",

            dev_note:
                "The sections below are for developers building integrations or LLM wrappers.",

            resp_h2: "Response Shape",
            resp_p: "Full shape of a reservation object returned from GET /reservations.",

            api_h2: "API Endpoints",
            api_res: "Reservations",
            api_rooms: "Rooms",
            api_alerts: "Guest Alerts",

            llm_h2: "LLM Function Tooling",
            llm_p: "Recommended tool definitions for LLM function calling against the front desk system:",

            nav_stats: "Dashboard cards",
            nav_filters: "Filters & search",
            nav_table: "Table columns",
            nav_checkin: "Check-in",
            nav_checkout: "Check-out",
            nav_rooms: "Room status",
            nav_notif: "Notifications",
            nav_realtime: "Real time",
            nav_menu: "Menu preview",
            nav_resp: "Response Shape",
            nav_api: "API Endpoints",
            nav_llm: "LLM Tooling",
            nav_everyone: "For everyone",
            nav_dev: "Developer",
        },
        ja: {
            badge: "ガイド",
            section: "フロントデスク",
            h1: "フロントデスク",
            intro: "ホテルの全予約を1画面で管理します。チェックイン・チェックアウト、客室状況の確認、新着ゲストのリアルタイム通知をこの画面から行えます。",

            stats_h2: "ダッシュボード集計カード",
            stats_p: "ページ上部に4つのリアルタイムカウンターが表示されます：",
            stat1: "予約数 — 選択した期間の予約合計件数",
            stat2: "到着待ち — まだチェックインしていないゲスト数",
            stat3: "在館中 — チェックイン済みのゲスト数",
            stat4: "チェックアウト済 — すでに退館したゲスト数",
            stat5: "空室 — 現在使用されていない客室数",

            filter_h2: "フィルターと検索",
            filter_p: "予約テーブルは3つのコントロールで絞り込みできます：",
            tab1_title: "ステータスタブ",
            tab1_desc:
                "テーブル上部の4タブ：到着待ち・在館中・チェックアウト済・全て。各タブに件数が表示されます。",
            tab2_title: "日付範囲ドロップダウン",
            tab2_desc:
                "「本日」ボタンを押すとドロップダウンが開きます。本日・過去3日間・過去7日間・過去30日間・全期間から選択できます。カレンダーで特定日を選ぶことも可能です。",
            tab3_title: "ゲスト・客室番号検索",
            tab3_desc:
                "右側の検索ボックスにゲスト名（漢字・かな）または客室番号を入力すると、テーブルがリアルタイムで絞り込まれます。",

            table_h2: "予約テーブルの列",
            col1: "客室番号と客室名（例：101 / 桜）",
            col2: "ゲスト名とふりがな（下段）",
            col3: "人数",
            col4: "予約元 — カラーバッジ（Rakuten・じゃらん・Booking.com・Expedia・Agoda・直接予約・電話・ウォークイン）",
            col5: "宿泊期間 — チェックイン〜チェックアウト日と泊数",
            col6: "プラン名と食事プラン（夕食のみ・1泊2食・朝食のみ・素泊まり）",
            col7: "アレルゲン — 種類ごとにタグ表示、影響人数付き",
            col8: "ステータスバッジ — 到着待ち / チェックイン済 / チェックアウト済",
            col9: "アクションボタン — 到着待ちは青い「チェックイン」、在館中はグレーの「チェックアウト」",

            checkin_h2: "チェックイン手順",
            checkin_p:
                "各行の青い「チェックイン」ボタンをクリックすると、3ステップのウィザードが開きます：",
            step1_title: "ステップ1 — 予約を検索",
            step1_desc:
                "テーブルからボタンを押した場合はこのステップが自動的にスキップされ、予約情報が表示されます。それ以外の場合はQRコード、ゲスト名、電話番号で検索できます。",
            step2_title: "ステップ2 — ゲスト情報の確認",
            step2_desc:
                "客室・プラン・宿泊日・食事プランを確認します。夕食時間をドロップダウン（17:30〜20:00）から選択し、特別リクエストがあれば入力します。",
            step3_title: "ステップ3 — アレルゲン登録",
            step3_desc:
                "マスターリストからアレルゲンを検索・選択します。各アレルゲンに対し、対象となる人数を入力します。海鮮系アレルゲンは「出汁もNG」の切り替えが可能です。「チェックインを完了」でチェックイン完了。",

            checkout_h2: "チェックアウト手順",
            checkout_p:
                "在館中のゲストの行にあるグレーの「チェックアウト」ボタンをクリックすると確認ダイアログが表示されます。「確認」を押してチェックアウト完了。客室ステータスが自動的に更新されます。",

            rooms_h2: "客室状況ビュー",
            rooms_p:
                "サイドバーの「客室状況」に切り替えると、全客室がグリッド表示されます。各カードに客室番号・名前・現在のステータスが表示されます：",
            room1: "空室（緑）— 予約なし",
            room2: "チェックイン済（青）— 在館中",
            room3: "チェックアウト済（グレー）— 清掃待ち",

            notif_h2: "ゲストアラート・通知",
            notif_p:
                "サイドバーの「通知」に切り替えます。サイドバーのアイコンに未読件数のバッジが表示されます。各アラートにはゲスト名・客室・発生原因が表示されます。「確認済み」をクリックして閉じます。",

            realtime_h2: "リアルタイム更新",
            realtime_p:
                "ヘッダーの「🔴 リアルタイム」インジケーターが点灯している間は、データがリアルタイムで同期されています。他のスタッフが別の端末で予約を変更すると、自動的に画面に反映されます。手動更新は「更新」ボタンから行えます。",

            menu_h2: "お品書きプレビュー",
            menu_p: "サイドバーの「お品書きプレビュー」をクリックすると（権限がある場合）、現在の季節メニューをコース別に確認できるパネルが表示されます。フロント業務を離れることなく全メニューとアレルゲンを確認できます。",

            dev_note:
                "以下は連携システムやLLMラッパーを開発するエンジニア向けです。",

            resp_h2: "レスポンス構造",
            resp_p: "GET /reservations から返される予約オブジェクトの構造です。",

            api_h2: "APIエンドポイント",
            api_res: "予約 (Reservations)",
            api_rooms: "客室 (Rooms)",
            api_alerts: "ゲストアラート (Guest Alerts)",

            llm_h2: "LLM ファンクションツール",
            llm_p: "フロントデスクシステムに対してLLM関数呼び出しを実装するための推奨ツール定義です：",

            nav_stats: "ダッシュボードカード",
            nav_filters: "フィルターと検索",
            nav_table: "テーブル列",
            nav_checkin: "チェックイン",
            nav_checkout: "チェックアウト",
            nav_rooms: "客室状況",
            nav_notif: "通知",
            nav_realtime: "リアルタイム",
            nav_menu: "お品書きプレビュー",
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
                                class="px-2.5 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-700 rounded-full border border-rose-200"
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
                    </div>

                    <!-- SECTION 1: Stats -->
                    <section id="stats" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.stats_h2}
                        </h2>
                        <p
                            class="text-slate-500 leading-relaxed mb-6 max-w-3xl"
                        >
                            {t.stats_p}
                        </p>
                        <div
                            class="grid grid-cols-1 xl:grid-cols-3 gap-3 max-w-3xl"
                        >
                            {#each [{ label: t.stat1, color: "bg-slate-50 border-slate-200 text-slate-700" }, { label: t.stat2, color: "bg-blue-50 border-blue-100 text-blue-700" }, { label: t.stat3, color: "bg-green-50 border-green-100 text-green-700" }, { label: t.stat4, color: "bg-slate-50 border-slate-100 text-slate-600" }, { label: t.stat5, color: "bg-amber-50 border-amber-100 text-amber-700" }] as card}
                                <div
                                    class="flex items-start gap-3 p-4 rounded-xl border {card.color}"
                                >
                                    <span
                                        class="w-2 h-2 rounded-full bg-current mt-1.5 shrink-0 opacity-50"
                                    ></span>
                                    <p class="text-sm leading-relaxed">
                                        {card.label}
                                    </p>
                                </div>
                            {/each}
                        </div>
                    </section>

                    <!-- SECTION 2: Filters -->
                    <section id="filters" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.filter_h2}
                        </h2>
                        <p
                            class="text-slate-500 leading-relaxed mb-6 max-w-3xl"
                        >
                            {t.filter_p}
                        </p>
                        <div class="space-y-4 max-w-3xl">
                            {#each [{ title: t.tab1_title, desc: t.tab1_desc, icon: "🗂" }, { title: t.tab2_title, desc: t.tab2_desc, icon: "📅" }, { title: t.tab3_title, desc: t.tab3_desc, icon: "🔍" }] as item}
                                <div
                                    class="flex gap-4 p-5 rounded-xl border border-slate-100 bg-slate-50"
                                >
                                    <span class="text-xl shrink-0"
                                        >{item.icon}</span
                                    >
                                    <div>
                                        <h3
                                            class="font-semibold text-slate-800 text-sm mb-1"
                                        >
                                            {item.title}
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
                    </section>

                    <!-- SECTION 3: Table columns -->
                    <section id="table" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.table_h2}
                        </h2>
                        <div
                            class="overflow-hidden rounded-xl border border-slate-200 max-w-3xl"
                        >
                            {#each [{ col: $lang === "en" ? "Room" : "客室", desc: t.col1 }, { col: $lang === "en" ? "Guest" : "ゲスト名", desc: t.col2 }, { col: $lang === "en" ? "Party" : "人数", desc: t.col3 }, { col: $lang === "en" ? "Source" : "予約元", desc: t.col4 }, { col: $lang === "en" ? "Stay" : "宿泊期間", desc: t.col5 }, { col: $lang === "en" ? "Plan" : "プラン", desc: t.col6 }, { col: $lang === "en" ? "Allergens" : "アレルゲン", desc: t.col7 }, { col: $lang === "en" ? "Status" : "ステータス", desc: t.col8 }, { col: $lang === "en" ? "Action" : "操作", desc: t.col9 }] as row, i}
                                <div
                                    class="flex items-start gap-4 px-5 py-3.5 {i <
                                    8
                                        ? 'border-b border-slate-100'
                                        : ''} hover:bg-slate-50 transition-colors"
                                >
                                    <span
                                        class="shrink-0 w-24 text-xs font-semibold text-slate-500 pt-0.5"
                                        >{row.col}</span
                                    >
                                    <p
                                        class="text-sm text-slate-600 leading-relaxed"
                                    >
                                        {row.desc}
                                    </p>
                                </div>
                            {/each}
                        </div>
                    </section>

                    <!-- SECTION 4: Check-in -->
                    <section id="checkin" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.checkin_h2}
                        </h2>
                        <p
                            class="text-slate-500 leading-relaxed mb-6 max-w-3xl"
                        >
                            {t.checkin_p}
                        </p>
                        <div class="space-y-4 max-w-3xl">
                            {#each [{ n: 1, title: t.step1_title, desc: t.step1_desc }, { n: 2, title: t.step2_title, desc: t.step2_desc }, { n: 3, title: t.step3_title, desc: t.step3_desc }] as step}
                                <div
                                    class="flex gap-5 p-5 rounded-xl border border-slate-100 bg-slate-50 items-start"
                                >
                                    <span
                                        class="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-rose-300 text-rose-600 text-sm font-bold shadow-sm"
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
                                </div>
                            {/each}
                        </div>
                    </section>

                    <!-- SECTION 5: Check-out -->
                    <section id="checkout" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.checkout_h2}
                        </h2>
                        <div
                            class="flex gap-4 p-5 max-w-3xl rounded-xl border border-slate-100 bg-slate-50"
                        >
                            <svg
                                class="shrink-0 text-slate-400 mt-0.5"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><path
                                    d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                                /><polyline points="16 17 21 12 16 7" /><line
                                    x1="21"
                                    y1="12"
                                    x2="9"
                                    y2="12"
                                /></svg
                            >
                            <p class="text-sm text-slate-500 leading-relaxed">
                                {t.checkout_p}
                            </p>
                        </div>
                    </section>

                    <!-- SECTION 6: Rooms -->
                    <section id="rooms" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.rooms_h2}
                        </h2>
                        <p
                            class="text-slate-500 leading-relaxed mb-6 max-w-3xl"
                        >
                            {t.rooms_p}
                        </p>
                        <div
                            class="grid grid-cols-1 xl:grid-cols-3 gap-3 max-w-3xl"
                        >
                            {#each [{ label: t.room1, color: "bg-emerald-50 border-emerald-100 text-emerald-700" }, { label: t.room2, color: "bg-sky-50 border-sky-100 text-sky-700" }, { label: t.room3, color: "bg-slate-50 border-slate-100 text-slate-600" }] as card}
                                <div class="p-4 rounded-xl border {card.color}">
                                    <p
                                        class="text-sm leading-relaxed font-medium"
                                    >
                                        {card.label}
                                    </p>
                                </div>
                            {/each}
                        </div>
                    </section>

                    <!-- SECTION 7: Notifications -->
                    <section id="notifications" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.notif_h2}
                        </h2>
                        <p class="text-slate-500 leading-relaxed max-w-3xl">
                            {t.notif_p}
                        </p>
                    </section>

                    <!-- SECTION 8: Realtime -->
                    <section id="realtime" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.realtime_h2}
                        </h2>
                        <div
                            class="flex gap-4 p-5 max-w-3xl rounded-xl border border-rose-100 bg-rose-50"
                        >
                            <span class="text-rose-400 shrink-0 mt-0.5">
                                <svg
                                    width="16"
                                    height="16"
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
                            </span>
                            <p class="text-sm text-rose-700 leading-relaxed">
                                {t.realtime_p}
                            </p>
                        </div>
                    </section>

                    <!-- SECTION 9: Menu Preview -->
                    <section id="menu-preview" class="mb-16">
                        <h2 class="text-xl font-bold text-slate-900 mb-4">
                            {t.menu_h2}
                        </h2>
                        <p class="text-slate-500 leading-relaxed max-w-3xl">
                            {t.menu_p}
                        </p>
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
                                class="flex items-center justify-center w-7 h-7 bg-rose-600 text-white text-xs font-bold rounded-full"
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
                                    >GET /reservations — 200 OK</span
                                >
                                <span class="text-xs text-rose-400 font-mono"
                                    >application/json</span
                                >
                            </div>
                            <pre
                                class="bg-[#0f1117] text-sm font-mono leading-relaxed overflow-x-auto p-5 text-slate-300"><code
                                    ><span class="text-slate-500">&#x7B;</span>
  <span class="text-sky-400">"id"</span><span class="text-slate-500">:</span
                                    > <span class="text-amber-300">"uuid"</span
                                    >,
  <span class="text-sky-400">"guest_name"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-amber-300"
                                        >"田中 太郎"</span
                                    >,
  <span class="text-sky-400">"guest_name_kana"</span><span
                                        class="text-slate-500">:</span
                                    > <span class="text-amber-300"
                                        >"タナカ タロウ"</span
                                    >,
  <span class="text-sky-400">"room_number"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-amber-300">"101"</span>,
  <span class="text-sky-400">"room_name"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-amber-300">"桜"</span>,
  <span class="text-sky-400">"party_size"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-purple-400">2</span>,
  <span class="text-sky-400">"check_in_date"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-amber-300"
                                        >"2026-03-01"</span
                                    >,
  <span class="text-sky-400">"check_out_date"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-amber-300"
                                        >"2026-03-03"</span
                                    >,
  <span class="text-sky-400">"booking_source"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-amber-300"
                                        >"rakuten"</span
                                    >,
  <span class="text-sky-400">"plan_name"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-amber-300"
                                        >"温泉満喫プラン"</span
                                    >,
  <span class="text-sky-400">"meal_plan"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-amber-300"
                                        >"2meals"</span
                                    >,
  <span class="text-sky-400">"dinner_time"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-amber-300">"18:30"</span
                                    >,
  <span class="text-sky-400">"status"</span><span class="text-slate-500">:</span
                                    > <span class="text-amber-300"
                                        >"confirmed"</span
                                    >,
  <span class="text-sky-400">"dietary_notes"</span><span class="text-slate-500"
                                        >:</span
                                    > <span class="text-amber-300"
                                        >"出汁制限: 魚（出汁もNG）"</span
                                    >,
  <span class="text-sky-400">"special_requests"</span><span
                                        class="text-slate-500">:</span
                                    > <span class="text-amber-300"
                                        >"アレルギー対応をお願いします"</span
                                    >,
  <span class="text-sky-400">"allergen_details"</span><span
                                        class="text-slate-500">: [</span
                                    >
    <span class="text-slate-500">&#x7B;</span> <span class="text-sky-400"
                                        >"allergen_id"</span
                                    ><span class="text-slate-500">:</span> <span
                                        class="text-amber-300">"uuid"</span
                                    >, <span class="text-sky-400"
                                        >"person_count"</span
                                    ><span class="text-slate-500">:</span> <span
                                        class="text-purple-400">1</span
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
                                class="flex items-center justify-center w-7 h-7 bg-rose-600 text-white text-xs font-bold rounded-full"
                                >2</span
                            >
                            <h2 class="text-xl font-bold text-slate-900">
                                {t.api_h2}
                            </h2>
                        </div>

                        {#each [{ label: t.api_res, rows: [{ m: "GET", p: "/reservations", en: "List reservations, optional ?date= filter", ja: "予約一覧（日付フィルター付き）" }, { m: "POST", p: "/reservations", en: "Create a reservation", ja: "予約作成" }, { m: "PUT", p: "/reservations/:id/checkin", en: "Check in — records dinner_time + allergen_details", ja: "チェックイン（夕食時間・アレルゲン登録）" }, { m: "PUT", p: "/reservations/:id/checkout", en: "Check out — sets status = checked_out", ja: "チェックアウト" }, { m: "GET", p: "/reservations/search", en: "Search by guest name or phone", ja: "ゲスト名・電話番号で検索" }, { m: "GET", p: "/reservations/qr/:code", en: "Lookup reservation by QR code", ja: "QRコードで予約を検索" }, { m: "DELETE", p: "/reservations", en: "Delete all reservations (admin only)", ja: "全予約削除（管理者のみ）" }] }, { label: t.api_rooms, rows: [{ m: "GET", p: "/rooms", en: "List all rooms with status", ja: "客室一覧（ステータス付き）" }, { m: "POST", p: "/rooms", en: "Create a room", ja: "客室作成" }, { m: "PUT", p: "/rooms/:id", en: "Update room status", ja: "ステータス更新" }] }, { label: t.api_alerts, rows: [{ m: "GET", p: "/guest-alerts", en: "Fetch unacknowledged alerts", ja: "未確認アラート取得" }, { m: "PUT", p: "/guest-alerts/:id/acknowledge", en: "Dismiss an alert", ja: "アラートを確認済みにする" }] }] as group}
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
                                            class="text-sm text-slate-400 ml-auto text-right"
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
                                class="flex items-center justify-center w-7 h-7 bg-rose-600 text-white text-xs font-bold rounded-full"
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
                            {#each [{ name: "get_todays_reservations", en: "Fetch all reservations for today.", ja: "本日の予約一覧を取得。" }, { name: "search_reservation_by_guest", en: "Find reservation by guest name or phone.", ja: "ゲスト名・電話番号で予約を検索。" }, { name: "checkin_guest", en: "Record check-in with dinner time and allergens.", ja: "チェックイン（夕食時間・アレルゲン登録）。" }, { name: "checkout_guest", en: "Record check-out for a reservation.", ja: "チェックアウトを記録。" }, { name: "get_room_status", en: "Get status of all or specific rooms.", ja: "客室の現在の状況を取得。" }, { name: "get_guest_alerts", en: "Fetch unread guest alerts for front desk.", ja: "フロント向け未読アラートを取得。" }] as tool}
                                <div
                                    class="p-5 rounded-xl border border-slate-200 bg-white hover:border-rose-200 hover:shadow-sm transition-all"
                                >
                                    <code
                                        class="text-sm font-bold text-rose-600"
                                        >{tool.name}</code
                                    >
                                    <p
                                        class="text-sm text-slate-500 leading-relaxed mt-2"
                                    >
                                        {$lang === "en" ? tool.en : tool.ja}
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
                        href="#stats"
                        class="px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >{t.nav_stats}</a
                    >
                    <a
                        href="#filters"
                        class="px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >{t.nav_filters}</a
                    >
                    <a
                        href="#table"
                        class="px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >{t.nav_table}</a
                    >
                    <a
                        href="#checkin"
                        class="px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >{t.nav_checkin}</a
                    >
                    <a
                        href="#checkout"
                        class="px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >{t.nav_checkout}</a
                    >
                    <a
                        href="#rooms"
                        class="px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >{t.nav_rooms}</a
                    >
                    <a
                        href="#notifications"
                        class="px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >{t.nav_notif}</a
                    >
                    <a
                        href="#realtime"
                        class="px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >{t.nav_realtime}</a
                    >
                    <a
                        href="#menu-preview"
                        class="px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >{t.nav_menu}</a
                    >
                    <p
                        class="text-[10px] font-semibold text-slate-300 uppercase tracking-widest px-3 mt-4 mb-1"
                    >
                        {t.nav_dev}
                    </p>
                    <a
                        href="#response-shape"
                        class="px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >{t.nav_resp}</a
                    >
                    <a
                        href="#api-endpoints"
                        class="px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >{t.nav_api}</a
                    >
                    <a
                        href="#llm-tooling"
                        class="px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >{t.nav_llm}</a
                    >
                </nav>
            </aside>

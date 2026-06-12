<script lang="ts">
    import { lang } from "$lib/stores/lang";

    const T = {
        en: {
            badge: "Feature Guide",
            section: "Staff Calendar & Shift Settings",
            h1: "Staff Calendar & Shift Settings",
            intro: "The viewing and configuration side of Shift Management. Browse staff to open their personal shift calendar, and fine-tune the rules the auto-scheduler follows.",

            what_h2: "How these screens fit together",
            what_p: "Shift Management has three connected screens. The Shift Calendar lists every staff member so you can pick one. Each person has their own calendar showing the shifts they have been given. Shift Settings is where an administrator configures the rules — limits, holidays, capabilities — that the automatic scheduler uses when it builds the roster.",
            card1_title: "Shift Calendar (staff list)",
            card1_desc: "A directory of all active staff. Tap a person to open their calendar.",
            card2_title: "Individual calendar",
            card2_desc: "One person's shifts across a period, with totals and holidays.",
            card3_title: "Shift Settings",
            card3_desc: "All the rules and constraints the scheduler follows, in one place.",

            list_h2: "Shift Calendar — choosing a staff member",
            list_p: "This page (シフトカレンダー) shows all active staff as cards in a grid. Use it to find and open someone's schedule.",
            list1_title: "Search",
            list1_desc: "Type into the スタッフを検索... (Search staff…) box to filter by name or position instantly.",
            list2_title: "Department tabs",
            list2_desc: "If you have more than one department, tabs appear — すべて (All) plus one per department — to narrow the list.",
            list3_title: "Open a calendar",
            list3_desc: "Each card shows the person's initial, name and position. Tap カレンダー (Calendar) to open their personal schedule.",

            indiv_h2: "Individual calendar — reading a schedule",
            indiv_p: "A single staff member's shifts shown as a month-style grid, with their name and position at the top.",
            indiv1_title: "Move between periods",
            indiv1_desc: "Use the left/right arrows to move between scheduling periods (e.g. “2024年5月度”). The date range is shown next to the arrows. Arrows are greyed out when there is no earlier or later period.",
            indiv2_title: "Reading the grid",
            indiv2_desc: "Days run 日 月 火 水 木 金 土 (Sun–Sat). Sundays and holidays are red, Saturdays blue. Each working day shows a colour-coded shift label; today has a blue ring. Tap a day for its date, holiday name and shift type.",
            indiv3_title: "Shift colours",
            indiv3_desc: "休み off (red), 早番 early (blue), 通常 normal (green), 遅番 late (purple), 特別 special (amber), 勤務 work (grey), 備考 notes (orange). A 祝 marker shows Japanese public holidays.",
            indiv4_title: "Totals and holidays",
            indiv4_desc: "Below the grid, badges count each shift type and the total (合計). A list (この期間の祝日) shows any public holidays falling in the period.",
            indiv_note_title: "View only",
            indiv_note_desc: "These calendars are for viewing. Shifts themselves are created and optimised on the Shift Management screen; this page shows the result clearly for each person.",

            settings_h2: "Shift Settings — the scheduler's rules",
            settings_p: "An administrator screen (シフト設定) where you configure everything the auto-scheduler obeys. Most settings apply to a single department (pick it with the 部署 selector at the top); a few are global. After changing a tab, press its Save button to apply. Login is required.",
            settings_intro2: "The settings are organised into tabs:",

            t_groups: "グループ (Groups) — staff group management",
            t_backup: "バックアップ (Backup) — backup coverage settings",
            t_capabilities: "シフト能力 (Shift Capabilities) — who can work early / late shifts",
            t_vacation: "休暇設定 (Vacation) — staff time-off and unavailable days",
            t_limits: "制限設定 (Limits) — daily and monthly staffing limits",
            t_priority: "優先ルール (Priority Rules) — shift priority rules",
            t_calendar: "カレンダー (Calendar Rules) — holidays and closed days",
            t_early: "早番設定 (Early Shift) — staff eligible for early shifts",
            t_period: "期間設定 (Period Configuration) — shift period dates (global)",
            t_solver: "ソルバー設定 (Solver Configuration) — the optimisation engine (global)",
            t_symbols: "シンボル設定 (Shift Symbols) — manage shift labels (global)",

            settings_tip_title: "Department vs. global",
            settings_tip_desc: "Tabs marked 部署 apply only to the department you have selected, so different teams can have different rules. Period, Solver and Symbol settings are global and affect the whole organisation.",

            nav_what: "How they fit together",
            nav_list: "Shift Calendar",
            nav_indiv: "Individual calendar",
            nav_settings: "Shift Settings",
            nav_everyone: "For everyone",
        },
        ja: {
            badge: "ガイド",
            section: "スタッフカレンダー・シフト設定",
            h1: "スタッフカレンダー・シフト設定",
            intro: "シフト管理の閲覧・設定側の画面です。スタッフを選んで個人のシフトカレンダーを開いたり、自動スケジューラが従うルールを細かく調整できます。",

            what_h2: "これらの画面の関係",
            what_p: "シフト管理には3つの連携した画面があります。シフトカレンダーは全スタッフを一覧表示し、一人を選べます。各人には自分のカレンダーがあり、割り当てられたシフトが表示されます。シフト設定では、管理者が自動スケジューラの使うルール（制限・祝日・能力など）を設定します。",
            card1_title: "シフトカレンダー（スタッフ一覧）",
            card1_desc: "全アクティブスタッフの一覧。人をタップするとカレンダーが開きます。",
            card2_title: "個人カレンダー",
            card2_desc: "一人の期間内シフトを、合計や祝日とともに表示。",
            card3_title: "シフト設定",
            card3_desc: "スケジューラが従う全ルール・制約を一か所で設定。",

            list_h2: "シフトカレンダー — スタッフの選択",
            list_p: "このページ（シフトカレンダー）は全アクティブスタッフをカードで一覧表示します。誰かのスケジュールを探して開くのに使います。",
            list1_title: "検索",
            list1_desc: "「スタッフを検索...」ボックスに入力すると、名前や役職で即座に絞り込めます。",
            list2_title: "部署タブ",
            list2_desc: "部署が複数ある場合、タブが表示されます — 「すべて」と部署ごとのタブ — で一覧を絞れます。",
            list3_title: "カレンダーを開く",
            list3_desc: "各カードに頭文字・名前・役職が表示されます。「カレンダー」をタップすると個人のスケジュールが開きます。",

            indiv_h2: "個人カレンダー — スケジュールの見方",
            indiv_p: "一人のスタッフのシフトを月カレンダー形式で表示し、上部に名前と役職が表示されます。",
            indiv1_title: "期間の移動",
            indiv1_desc: "左右の矢印でシフト期間（例：「2024年5月度」）を移動します。矢印の横に日付範囲が表示されます。前後の期間がない場合、矢印はグレーになります。",
            indiv2_title: "グリッドの見方",
            indiv2_desc: "曜日は 日 月 火 水 木 金 土 です。日曜・祝日は赤、土曜は青。各勤務日には色分けされたシフトラベルが表示され、本日は青い枠で囲まれます。日付をタップすると、日付・祝日名・シフト種別が表示されます。",
            indiv3_title: "シフトの色",
            indiv3_desc: "休み（赤）、早番（青）、通常（緑）、遅番（紫）、特別（琥珀）、勤務（グレー）、備考（オレンジ）。「祝」マークは日本の祝日を示します。",
            indiv4_title: "合計と祝日",
            indiv4_desc: "グリッドの下に、各シフト種別と合計のバッジが表示されます。「この期間の祝日」には、期間内の祝日が一覧表示されます。",
            indiv_note_title: "閲覧専用",
            indiv_note_desc: "これらのカレンダーは閲覧用です。シフト自体はシフト管理画面で作成・最適化され、このページでは各人の結果を分かりやすく表示します。",

            settings_h2: "シフト設定 — スケジューラのルール",
            settings_p: "自動スケジューラが従うすべてを設定する管理者画面（シフト設定）です。多くの設定は1つの部署に適用され（上部の「部署」セレクタで選択）、一部は全体共通です。タブを変更したら「保存」ボタンを押して反映します。ログインが必要です。",
            settings_intro2: "設定はタブで整理されています：",

            t_groups: "グループ — スタッフグループ管理",
            t_backup: "バックアップ — バックアップカバレッジ設定",
            t_capabilities: "シフト能力 — 早番・遅番の可否",
            t_vacation: "休暇設定 — スタッフ休暇・不在日",
            t_limits: "制限設定 — 日次・月次の人数制限",
            t_priority: "優先ルール — シフト優先度ルール",
            t_calendar: "カレンダー — 祝日・定休日",
            t_early: "早番設定 — 早番可能なスタッフ",
            t_period: "期間設定 — シフト期間の日付（全体）",
            t_solver: "ソルバー設定 — 最適化エンジン（全体）",
            t_symbols: "シンボル設定 — シフトラベルの管理（全体）",

            settings_tip_title: "部署別と全体共通",
            settings_tip_desc: "「部署」マーク付きのタブは選択中の部署にのみ適用されるため、チームごとに異なるルールを設定できます。期間・ソルバー・シンボル設定は全体共通で、組織全体に影響します。",

            nav_what: "画面の関係",
            nav_list: "シフトカレンダー",
            nav_indiv: "個人カレンダー",
            nav_settings: "シフト設定",
            nav_everyone: "全ユーザー向け",
        },
    };

    $: t = T[$lang];
</script>

<div class="flex-1 min-w-0 overflow-y-auto h-[calc(100vh-57px)] bg-white">
    <article class="w-full px-8 xl:px-20 py-16 pb-32">
        <!-- Page Header -->
        <div id="overview" class="mb-14 pb-10 border-b border-slate-100">
            <div class="flex items-center gap-2 mb-5">
                <span class="px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">{t.badge}</span>
                <span class="text-slate-300">/</span>
                <span class="text-sm text-slate-400 font-medium">{t.section}</span>
            </div>
            <h1 class="text-[2.75rem] font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-5">{t.h1}</h1>
            <p class="text-lg text-slate-500 leading-[1.75] max-w-3xl">{t.intro}</p>
        </div>

        <!-- What -->
        <section id="what-is-this" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.what_h2}</h2>
            <p class="text-slate-500 leading-relaxed mb-8 max-w-3xl">{t.what_p}</p>
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div class="p-5 rounded-xl border border-emerald-100 bg-emerald-50">
                    <h3 class="font-semibold text-emerald-900 text-sm mb-2">{t.card1_title}</h3>
                    <p class="text-sm text-emerald-800 leading-relaxed">{t.card1_desc}</p>
                </div>
                <div class="p-5 rounded-xl border border-sky-100 bg-sky-50">
                    <h3 class="font-semibold text-sky-900 text-sm mb-2">{t.card2_title}</h3>
                    <p class="text-sm text-sky-800 leading-relaxed">{t.card2_desc}</p>
                </div>
                <div class="p-5 rounded-xl border border-violet-100 bg-violet-50">
                    <h3 class="font-semibold text-violet-900 text-sm mb-2">{t.card3_title}</h3>
                    <p class="text-sm text-violet-800 leading-relaxed">{t.card3_desc}</p>
                </div>
            </div>
        </section>

        <!-- Staff list -->
        <section id="staff-list" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.list_h2}</h2>
            <p class="text-slate-500 leading-relaxed mb-8 max-w-3xl">{t.list_p}</p>
            <div class="space-y-4 max-w-3xl">
                {#each [{ title: t.list1_title, desc: t.list1_desc }, { title: t.list2_title, desc: t.list2_desc }, { title: t.list3_title, desc: t.list3_desc }] as item}
                    <div class="p-5 rounded-xl border border-slate-100 bg-slate-50">
                        <h3 class="font-semibold text-slate-800 mb-1.5">{item.title}</h3>
                        <p class="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                {/each}
            </div>
        </section>

        <!-- Individual calendar -->
        <section id="individual" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.indiv_h2}</h2>
            <p class="text-slate-500 leading-relaxed mb-8 max-w-3xl">{t.indiv_p}</p>
            <div class="space-y-4 max-w-3xl">
                {#each [{ title: t.indiv1_title, desc: t.indiv1_desc }, { title: t.indiv2_title, desc: t.indiv2_desc }, { title: t.indiv3_title, desc: t.indiv3_desc }, { title: t.indiv4_title, desc: t.indiv4_desc }] as item}
                    <div class="p-5 rounded-xl border border-slate-100 bg-slate-50">
                        <h3 class="font-semibold text-slate-800 mb-1.5">{item.title}</h3>
                        <p class="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                {/each}
            </div>
            <div class="mt-4 max-w-3xl p-5 rounded-xl border border-emerald-100 bg-emerald-50">
                <h3 class="font-semibold text-emerald-900 text-sm mb-1">{t.indiv_note_title}</h3>
                <p class="text-sm text-emerald-800 leading-relaxed">{t.indiv_note_desc}</p>
            </div>
        </section>

        <!-- Settings -->
        <section id="settings" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.settings_h2}</h2>
            <p class="text-slate-500 leading-relaxed mb-6 max-w-3xl">{t.settings_p}</p>
            <p class="text-slate-500 leading-relaxed mb-6 max-w-3xl">{t.settings_intro2}</p>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-3 max-w-3xl">
                {#each [t.t_groups, t.t_backup, t.t_capabilities, t.t_vacation, t.t_limits, t.t_priority, t.t_calendar, t.t_early, t.t_period, t.t_solver, t.t_symbols] as tab}
                    <div class="flex gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50">
                        <span class="shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-blue-400"></span>
                        <p class="text-sm text-slate-600 leading-relaxed">{tab}</p>
                    </div>
                {/each}
            </div>
            <div class="mt-6 max-w-3xl p-5 rounded-xl border border-amber-200 bg-amber-50">
                <h3 class="font-semibold text-amber-900 text-sm mb-1">{t.settings_tip_title}</h3>
                <p class="text-sm text-amber-800 leading-relaxed">{t.settings_tip_desc}</p>
            </div>
        </section>

        <footer class="pt-8 border-t border-slate-100 text-sm text-slate-400 flex items-center justify-between">
            <span>Hotel Front Agent Docs</span>
            <span>&copy; 2026</span>
        </footer>
    </article>
</div>

<!-- Right ToC -->
<aside class="hidden xl:flex xl:flex-col w-56 shrink-0 bg-white border-l border-slate-200 overflow-y-auto pt-12 px-6 h-[calc(100vh-57px)] sticky top-[57px]">
    <p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4">{$lang === "en" ? "On this page" : "このページ"}</p>
    <nav class="flex flex-col gap-0.5 text-[13px]">
        <p class="text-[10px] font-semibold text-slate-300 uppercase tracking-widest px-3 mt-2 mb-1">{t.nav_everyone}</p>
        <a href="#what-is-this" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_what}</a>
        <a href="#staff-list" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_list}</a>
        <a href="#individual" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_indiv}</a>
        <a href="#settings" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_settings}</a>
    </nav>
</aside>

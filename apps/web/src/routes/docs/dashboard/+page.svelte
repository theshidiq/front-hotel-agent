<script lang="ts">
    import { lang } from "$lib/stores/lang";

    const T = {
        en: {
            badge: "Feature Guide",
            section: "Dashboard",
            h1: "Dashboard",
            intro: "Your home screen after logging in. A friendly overview that greets you and gives you one-tap shortcuts to every part of the app.",

            what_h2: "What does this screen do?",
            what_p: "The dashboard is the first thing you see after you log in. It does not require any setup — it simply welcomes you and shows large, colour-coded cards that take you to the area you need. Everything else in the app is reachable from here.",

            card1_title: "A friendly greeting",
            card1_desc: "The top of the screen greets you by name and shows today's date. The greeting changes through the day — good morning, good afternoon, good evening.",
            card2_title: "Big shortcut cards",
            card2_desc: "Four colour-coded cards group the main areas of the app. Tap any card to go straight there.",
            card3_title: "Admin-only card",
            card3_desc: "If you are an administrator, an extra amber card appears for staff and permission settings. Other staff do not see it.",

            greeting_h2: "The greeting",
            greeting_p: "At the top you will see the date and a greeting with your name, for example “こんにちは、田中さん” (Good afternoon, Mr. Tanaka). The wording depends on the time of day:",
            g1: "Before 10:00 — おはようございます (Good morning)",
            g2: "10:00 to 17:00 — こんにちは (Good afternoon)",
            g3: "After 17:00 — こんばんは (Good evening)",

            cards_h2: "The shortcut cards",
            cards_p: "Tapping anywhere on a card opens its main area. Each card also lists smaller links inside it that jump to a specific page.",

            c_front_title: "フロント — Front Desk (blue)",
            c_front_desc: "Check guests in and out, manage reservations, and handle guest requests.",
            c_front_link: "予約管理 (Reservation Management) → opens the Front Desk",

            c_kitchen_title: "厨房・メニュー — Kitchen & Menu (orange)",
            c_kitchen_desc: "Design menus, manage food products and allergen information, and view kitchen production.",
            c_kitchen_link1: "メニュー管理 (Menu Management) → register and edit menus and products",
            c_kitchen_link2: "厨房生産管理 (Kitchen Production) → daily guest counts (PAX) and allergen info",

            c_staff_title: "スタッフ — Staff (green)",
            c_staff_desc: "Create and optimise shifts, and view the staff calendar.",
            c_staff_link1: "シフト管理 (Shift Management) → create shifts and auto-optimise",
            c_staff_link2: "シフトカレンダー (Shift Calendar) → view and manage shifts",

            c_docs_title: "ドキュメント — Documentation (purple)",
            c_docs_desc: "Operating manuals and system information, including these guides.",
            c_docs_link: "ドキュメント (Documentation) → user manuals and API specs",

            c_admin_title: "管理者設定 — Admin Settings (amber, admins only)",
            c_admin_desc: "Manage staff, roles and permissions, and system settings.",
            c_admin_link: "管理者ダッシュボード (Admin Dashboard) → staff, permissions and system settings",

            nav_h2: "How to move around",
            nav_p: "There are two ways to use a card:",
            nav_a_title: "Tap the card itself",
            nav_a_desc: "Tapping anywhere on the coloured card opens its main area (for example, tapping the Front Desk card opens the front desk).",
            nav_b_title: "Tap a link inside the card",
            nav_b_desc: "Each card lists one or two smaller links. Tap a link to jump straight to that specific page instead of the main area.",

            tip_title: "Good to know",
            tip_desc: "The dashboard never changes anything on its own — it is only a menu of shortcuts. You can always return here by going to the home screen, so it is a safe place to start from.",

            nav_what: "What does it do?",
            nav_greeting: "The greeting",
            nav_cards: "The shortcut cards",
            nav_move: "How to move around",
            nav_everyone: "For everyone",
        },
        ja: {
            badge: "ガイド",
            section: "ダッシュボード",
            h1: "ダッシュボード",
            intro: "ログイン後の最初の画面です。お名前で挨拶し、アプリの各機能へワンタップで移動できる入り口をまとめています。",

            what_h2: "この画面でできること",
            what_p: "ダッシュボードはログイン後に最初に表示される画面です。設定は不要で、あなたを迎え、必要な場所へ移動できる大きな色分けカードを表示します。アプリの他の機能はすべてここから移動できます。",

            card1_title: "やさしい挨拶",
            card1_desc: "画面上部にお名前と本日の日付が表示されます。時間帯に応じて「おはようございます」「こんにちは」「こんばんは」と変わります。",
            card2_title: "大きなショートカットカード",
            card2_desc: "4つの色分けカードがアプリの主要機能をまとめています。カードをタップするとその機能へ移動します。",
            card3_title: "管理者専用カード",
            card3_desc: "管理者の場合のみ、スタッフ・権限設定用の琥珀色カードが追加で表示されます。他のスタッフには表示されません。",

            greeting_h2: "挨拶について",
            greeting_p: "上部には日付と、お名前付きの挨拶が表示されます（例：「こんにちは、田中さん」）。文言は時間帯によって変わります：",
            g1: "10:00より前 — おはようございます",
            g2: "10:00〜17:00 — こんにちは",
            g3: "17:00より後 — こんばんは",

            cards_h2: "ショートカットカード",
            cards_p: "カードのどこかをタップするとその主要画面が開きます。各カード内には、特定のページへ移動する小さなリンクも表示されます。",

            c_front_title: "フロント（青）",
            c_front_desc: "ゲストのチェックイン・チェックアウト、予約管理、ゲスト対応を行います。",
            c_front_link: "予約管理 → フロントデスクを開く",

            c_kitchen_title: "厨房・メニュー（オレンジ）",
            c_kitchen_desc: "メニュー設計、食材・アレルゲン情報の管理、厨房生産管理を行います。",
            c_kitchen_link1: "メニュー管理 → メニュー・商品の登録・編集",
            c_kitchen_link2: "厨房生産管理 → 日別PAX集計・アレルギー情報",

            c_staff_title: "スタッフ（緑）",
            c_staff_desc: "シフトの作成・自動最適化、スタッフカレンダーの確認を行います。",
            c_staff_link1: "シフト管理 → シフトの作成・自動最適化",
            c_staff_link2: "シフトカレンダー → シフトの確認・管理",

            c_docs_title: "ドキュメント（紫）",
            c_docs_desc: "操作マニュアルやシステム情報（本ガイドを含む）を確認できます。",
            c_docs_link: "ドキュメント → 操作マニュアル・API仕様",

            c_admin_title: "管理者設定（琥珀色・管理者のみ）",
            c_admin_desc: "スタッフ、ロール・権限、システム設定を管理します。",
            c_admin_link: "管理者ダッシュボード → スタッフ・権限・システム設定",

            nav_h2: "画面の移動方法",
            nav_p: "カードの使い方は2通りあります：",
            nav_a_title: "カード自体をタップ",
            nav_a_desc: "色付きカードのどこかをタップすると、その主要画面が開きます（例：フロントカードをタップするとフロントデスクが開きます）。",
            nav_b_title: "カード内のリンクをタップ",
            nav_b_desc: "各カードには1〜2個の小さなリンクがあります。リンクをタップすると、主要画面ではなくその特定のページへ直接移動します。",

            tip_title: "知っておくと便利",
            tip_desc: "ダッシュボードはそれ自体が何かを変更することはありません。あくまでショートカットのメニューです。いつでもホーム画面から戻れるため、安心して出発点として使えます。",

            nav_what: "できること",
            nav_greeting: "挨拶について",
            nav_cards: "ショートカットカード",
            nav_move: "移動方法",
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

        <!-- What is this -->
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
                <div class="p-5 rounded-xl border border-amber-100 bg-amber-50">
                    <h3 class="font-semibold text-amber-900 text-sm mb-2">{t.card3_title}</h3>
                    <p class="text-sm text-amber-800 leading-relaxed">{t.card3_desc}</p>
                </div>
            </div>
        </section>

        <!-- Greeting -->
        <section id="greeting" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.greeting_h2}</h2>
            <p class="text-slate-500 leading-relaxed mb-6 max-w-3xl">{t.greeting_p}</p>
            <div class="space-y-3 max-w-3xl">
                {#each [t.g1, t.g2, t.g3] as g}
                    <div class="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50">
                        <span class="shrink-0 w-2 h-2 rounded-full bg-emerald-400"></span>
                        <p class="text-sm text-slate-600">{g}</p>
                    </div>
                {/each}
            </div>
        </section>

        <!-- Cards -->
        <section id="cards" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.cards_h2}</h2>
            <p class="text-slate-500 leading-relaxed mb-8 max-w-3xl">{t.cards_p}</p>
            <div class="space-y-4 max-w-3xl">
                {#each [
                    { title: t.c_front_title, desc: t.c_front_desc, links: [t.c_front_link], color: "border-blue-200 bg-blue-50", dot: "bg-slate-800" },
                    { title: t.c_kitchen_title, desc: t.c_kitchen_desc, links: [t.c_kitchen_link1, t.c_kitchen_link2], color: "border-orange-200 bg-orange-50", dot: "bg-orange-500" },
                    { title: t.c_staff_title, desc: t.c_staff_desc, links: [t.c_staff_link1, t.c_staff_link2], color: "border-green-200 bg-green-50", dot: "bg-green-500" },
                    { title: t.c_docs_title, desc: t.c_docs_desc, links: [t.c_docs_link], color: "border-violet-200 bg-violet-50", dot: "bg-violet-500" },
                    { title: t.c_admin_title, desc: t.c_admin_desc, links: [t.c_admin_link], color: "border-amber-200 bg-amber-50", dot: "bg-amber-500" },
                ] as card}
                    <div class="p-5 rounded-xl border {card.color}">
                        <div class="flex items-center gap-2 mb-1.5">
                            <span class="w-2.5 h-2.5 rounded-full {card.dot}"></span>
                            <h3 class="font-semibold text-slate-800">{card.title}</h3>
                        </div>
                        <p class="text-sm text-slate-600 leading-relaxed mb-3">{card.desc}</p>
                        <ul class="space-y-1.5">
                            {#each card.links as link}
                                <li class="text-sm text-slate-500 flex gap-2"><span class="text-slate-300">›</span>{link}</li>
                            {/each}
                        </ul>
                    </div>
                {/each}
            </div>
        </section>

        <!-- How to move around -->
        <section id="move-around" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.nav_h2}</h2>
            <p class="text-slate-500 leading-relaxed mb-8 max-w-3xl">{t.nav_p}</p>
            <div class="space-y-4 max-w-3xl">
                <div class="flex gap-5 p-5 rounded-xl border border-slate-100 bg-slate-50">
                    <span class="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-bold shadow-sm">A</span>
                    <div>
                        <h3 class="font-semibold text-slate-800 mb-1">{t.nav_a_title}</h3>
                        <p class="text-sm text-slate-500 leading-relaxed">{t.nav_a_desc}</p>
                    </div>
                </div>
                <div class="flex gap-5 p-5 rounded-xl border border-slate-100 bg-slate-50">
                    <span class="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-bold shadow-sm">B</span>
                    <div>
                        <h3 class="font-semibold text-slate-800 mb-1">{t.nav_b_title}</h3>
                        <p class="text-sm text-slate-500 leading-relaxed">{t.nav_b_desc}</p>
                    </div>
                </div>
            </div>
            <div class="mt-6 max-w-3xl p-5 rounded-xl border border-emerald-100 bg-emerald-50">
                <h3 class="font-semibold text-emerald-900 text-sm mb-1">{t.tip_title}</h3>
                <p class="text-sm text-emerald-800 leading-relaxed">{t.tip_desc}</p>
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
        <a href="#greeting" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_greeting}</a>
        <a href="#cards" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_cards}</a>
        <a href="#move-around" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_move}</a>
    </nav>
</aside>

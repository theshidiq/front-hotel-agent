<script lang="ts">
    import { lang } from "$lib/stores/lang";

    const T = {
        en: {
            badge: "Feature Guide",
            section: "Account & Setup",
            h1: "Account & Setup",
            intro: "Two related screens: the one-time Setup wizard that creates your workspace, and the My Account page where you check your profile, see your permissions, and log out.",

            what_h2: "What these screens are for",
            what_p: "Setup runs once, when an organization is first created — it builds your workspace and makes you its owner. My Account is for everyday use: it shows who you are, what you are allowed to do, and lets you sign out. Neither screen touches guest or menu data.",
            card1_title: "Setup wizard",
            card1_desc: "A short 3-step form that creates your organization. You only do this once.",
            card2_title: "My Account",
            card2_desc: "Your profile, role and permissions, with a Logout button. Available any time.",

            setup_h2: "Setup — creating your workspace",
            setup_p: "Setup appears the first time you sign in for a brand-new organization. If your account already belongs to a workspace, you are sent straight to the dashboard instead. It takes about two minutes and has three steps and a finish screen.",

            step1_title: "Step 1 — Business identity",
            step1_desc: "Enter your Organization name (required, e.g. “Sinara Grand Hotel”), choose your Workspace URL (required — the address after sinara.app/, using lowercase letters, numbers and hyphens), and pick a Business type from the cards: Hotel, Ryokan, Restaurant, Izakaya, Café, Clinic, Spa, Event Venue or Other.",
            step2_title: "Step 2 — Contact & branding (optional)",
            step2_desc: "All optional — you can change these later in Settings. Address, city, prefecture, postal code, and a phone number with a country-code picker (search by country name). Skip anything you do not have.",
            step3_title: "Step 3 — Workspace settings",
            step3_desc: "Choose a plan — Starter (free), Professional (most popular) or Business (enterprise). A summary box shows your organization name, type, chosen plan and URL so you can check everything before finishing. Your timezone is detected automatically.",
            step4_title: "Finish — Launch",
            step4_desc: "Tap Launch. The system creates your organization, sets up your scheduling periods, and links your owner account. You will see “Your workspace is ready!” with a checklist, then tap Go to dashboard.",

            setup_note_title: "If the URL is taken",
            setup_note_desc: "Workspace URLs must be unique. If the one you chose is already in use, the wizard returns to Step 1 and asks you to pick a different one.",

            account_h2: "My Account — your profile",
            account_p: "Open My Account to see your details at a glance. You must be logged in as staff; otherwise the page shows “Please log in to view your account” with a link to the login screen.",

            acc1_title: "Profile",
            acc1_desc: "Shows your name and email, plus your Role and Position. Administrators see “Admin” highlighted in amber.",
            acc2_title: "My Permissions",
            acc2_desc: "Lists exactly what you are allowed to do, each with a green tick — for example “View products”, “Create menus”, “Check guests in”. Administrators instead see a single badge: “Full access (Admin)”. If you have no permissions yet, it says “No permissions assigned. Contact your admin.”",
            acc3_title: "Logout",
            acc3_desc: "A full-width Logout button at the bottom signs you out and returns you to the login screen.",

            acc_tip_title: "Can't do something you expected?",
            acc_tip_desc: "Your buttons and pages are decided by your permissions, which are set by an administrator in the Admin Dashboard. If a feature is missing, check My Permissions — and ask your admin to adjust your role if needed.",

            nav_what: "What these are for",
            nav_setup: "Setup wizard",
            nav_account: "My Account",
            nav_everyone: "For everyone",
        },
        ja: {
            badge: "ガイド",
            section: "アカウント・初期設定",
            h1: "アカウント・初期設定",
            intro: "関連する2つの画面です：ワークスペースを作成する一度きりの初期設定ウィザードと、プロフィールや権限を確認しログアウトできる「マイアカウント」ページです。",

            what_h2: "これらの画面の目的",
            what_p: "初期設定は組織を最初に作成するときに一度だけ実行し、ワークスペースを構築してあなたをオーナーにします。マイアカウントは日常的に使うもので、自分が誰で何ができるかを表示し、ログアウトできます。どちらもゲストやメニューのデータには触れません。",
            card1_title: "初期設定ウィザード",
            card1_desc: "組織を作成する3ステップの短いフォーム。一度だけ行います。",
            card2_title: "マイアカウント",
            card2_desc: "プロフィール、ロールと権限、ログアウトボタン。いつでも利用できます。",

            setup_h2: "初期設定 — ワークスペースの作成",
            setup_p: "初期設定は、新しい組織で初めてサインインしたときに表示されます。すでにワークスペースに所属している場合は、代わりにダッシュボードへ移動します。所要時間は約2分で、3ステップと完了画面で構成されます。",

            step1_title: "ステップ1 — ビジネス情報",
            step1_desc: "組織名（必須・例：「Sinara Grand Hotel」）を入力し、ワークスペースURL（必須・sinara.app/ の後ろのアドレス。小文字・数字・ハイフンのみ）を選び、業種をカードから選択します：ホテル、旅館、レストラン、居酒屋、カフェ、クリニック、スパ、イベント会場、その他。",
            step2_title: "ステップ2 — 連絡先・ブランディング（任意）",
            step2_desc: "すべて任意で、後から設定で変更できます。住所、市区町村、都道府県、郵便番号、国番号選択付きの電話番号（国名で検索可能）。ない項目はスキップできます。",
            step3_title: "ステップ3 — ワークスペース設定",
            step3_desc: "プランを選びます — Starter（無料）、Professional（人気）、Business（エンタープライズ）。確認用のサマリーに組織名・業種・選択プラン・URLが表示されます。タイムゾーンは自動検出されます。",
            step4_title: "完了 — Launch",
            step4_desc: "「Launch」をタップします。システムが組織を作成し、シフト期間を設定し、オーナーアカウントを紐づけます。「Your workspace is ready!」とチェックリストが表示され、「Go to dashboard」をタップします。",

            setup_note_title: "URLが使用済みの場合",
            setup_note_desc: "ワークスペースURLは重複できません。選んだものが既に使われている場合、ウィザードはステップ1に戻り、別のURLを選ぶよう求めます。",

            account_h2: "マイアカウント — プロフィール",
            account_p: "マイアカウントを開くと、自分の情報をひと目で確認できます。スタッフとしてログインしている必要があります。そうでない場合は「Please log in to view your account」とログイン画面へのリンクが表示されます。",

            acc1_title: "プロフィール",
            acc1_desc: "名前とメール、ロールと役職を表示します。管理者は「Admin」が琥珀色で強調表示されます。",
            acc2_title: "マイ権限 (My Permissions)",
            acc2_desc: "自分にできることが緑のチェック付きで一覧表示されます（例：「View products」「Create menus」「Check guests in」）。管理者の場合は代わりに「Full access (Admin)」のバッジが1つ表示されます。権限がまだない場合は「No permissions assigned. Contact your admin.」と表示されます。",
            acc3_title: "ログアウト",
            acc3_desc: "下部の幅いっぱいの「Logout」ボタンでサインアウトし、ログイン画面に戻ります。",

            acc_tip_title: "できるはずの操作ができない場合",
            acc_tip_desc: "使えるボタンやページは権限によって決まり、権限は管理者が管理者ダッシュボードで設定します。機能が見当たらない場合はマイ権限を確認し、必要に応じて管理者にロールの調整を依頼してください。",

            nav_what: "目的",
            nav_setup: "初期設定ウィザード",
            nav_account: "マイアカウント",
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

        <!-- What these are for -->
        <section id="what-is-this" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.what_h2}</h2>
            <p class="text-slate-500 leading-relaxed mb-8 max-w-3xl">{t.what_p}</p>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-3xl">
                <div class="p-5 rounded-xl border border-sky-100 bg-sky-50">
                    <h3 class="font-semibold text-sky-900 text-sm mb-2">{t.card1_title}</h3>
                    <p class="text-sm text-sky-800 leading-relaxed">{t.card1_desc}</p>
                </div>
                <div class="p-5 rounded-xl border border-emerald-100 bg-emerald-50">
                    <h3 class="font-semibold text-emerald-900 text-sm mb-2">{t.card2_title}</h3>
                    <p class="text-sm text-emerald-800 leading-relaxed">{t.card2_desc}</p>
                </div>
            </div>
        </section>

        <!-- Setup -->
        <section id="setup" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.setup_h2}</h2>
            <p class="text-slate-500 leading-relaxed mb-8 max-w-3xl">{t.setup_p}</p>
            <div class="space-y-4 max-w-3xl">
                {#each [
                    { n: "1", title: t.step1_title, desc: t.step1_desc },
                    { n: "2", title: t.step2_title, desc: t.step2_desc },
                    { n: "3", title: t.step3_title, desc: t.step3_desc },
                    { n: "✓", title: t.step4_title, desc: t.step4_desc },
                ] as step}
                    <div class="flex gap-5 p-5 rounded-xl border border-slate-100 bg-slate-50">
                        <span class="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-bold shadow-sm">{step.n}</span>
                        <div>
                            <h3 class="font-semibold text-slate-800 mb-1">{step.title}</h3>
                            <p class="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                        </div>
                    </div>
                {/each}
            </div>
            <div class="mt-4 max-w-3xl p-5 rounded-xl border border-amber-200 bg-amber-50">
                <h3 class="font-semibold text-amber-900 text-sm mb-1">{t.setup_note_title}</h3>
                <p class="text-sm text-amber-800 leading-relaxed">{t.setup_note_desc}</p>
            </div>
        </section>

        <!-- Account -->
        <section id="account" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.account_h2}</h2>
            <p class="text-slate-500 leading-relaxed mb-8 max-w-3xl">{t.account_p}</p>
            <div class="space-y-4 max-w-3xl">
                {#each [
                    { title: t.acc1_title, desc: t.acc1_desc },
                    { title: t.acc2_title, desc: t.acc2_desc },
                    { title: t.acc3_title, desc: t.acc3_desc },
                ] as item}
                    <div class="p-5 rounded-xl border border-slate-100 bg-slate-50">
                        <h3 class="font-semibold text-slate-800 mb-1.5">{item.title}</h3>
                        <p class="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                {/each}
            </div>
            <div class="mt-4 max-w-3xl p-5 rounded-xl border border-emerald-100 bg-emerald-50">
                <h3 class="font-semibold text-emerald-900 text-sm mb-1">{t.acc_tip_title}</h3>
                <p class="text-sm text-emerald-800 leading-relaxed">{t.acc_tip_desc}</p>
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
        <a href="#setup" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_setup}</a>
        <a href="#account" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_account}</a>
    </nav>
</aside>

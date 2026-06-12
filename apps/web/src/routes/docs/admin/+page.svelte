<script lang="ts">
    import { lang } from "$lib/stores/lang";

    const T = {
        en: {
            badge: "Feature Guide",
            section: "Admin Dashboard",
            h1: "Admin Dashboard",
            intro: "The control centre for administrators. Organise your departments and positions, manage staff accounts, and decide exactly what each person is allowed to do.",

            access_title: "Administrators only",
            access_desc: "This screen is only available to staff with administrator access. Other staff will not see it. It does not change any guest or kitchen data — it manages people and permissions.",

            what_h2: "What can you do here?",
            what_p: "The Admin Dashboard opens to a simple menu with two areas. Pick the one you need:",
            menu1_title: "Organization",
            menu1_desc: "Departments, positions and staff hierarchy — set up your teams and the people in them.",
            menu2_title: "Role Management",
            menu2_desc: "Configure roles and permissions — decide what each kind of staff member is allowed to do.",

            org_h2: "Organization — departments, positions & staff",
            org_p: "This view has two panels. On the left are your departments (部署); on the right are the positions (役職) and staff (スタッフ) inside the department you select.",

            dept_title: "Departments (部署)",
            dept_desc: "Tap + 追加 (Add) to create a department. Give it a name and pick a colour from the 12 swatches, then tap 追加. Hover a department to 編集 (Edit) or 削除 (Delete) it. Staff in a deleted department simply become “部署未設定” (Unassigned) — they are not removed.",

            pos_title: "Positions (役職)",
            pos_desc: "Select a department, then tap + 役職追加 (Add Position) to create job titles such as front desk or kitchen. Each position can be edited or removed by hovering over it.",

            staff_title: "Staff (スタッフ)",
            staff_desc: "Tap + スタッフ追加 (Add Staff) to add a person. The only required field is 名前 (Name). You can also set メール (Email), 役職 (Position), ロール (Role), 雇用形態 (Employment Type — 社員 regular / 派遣 dispatch / パート part-time), and start/end periods. Tap any staff row to edit them later.",

            staff_filter_title: "Active, inactive and bulk actions",
            staff_filter_desc: "Three tabs filter the list: 在籍中 (Active), 無効 (Inactive), すべて (All). Tick the boxes on several staff to delete them together. Important: active staff are deactivated (reversible — you can re-enable them later), while inactive staff are permanently deleted (cannot be undone). The system always asks you to confirm first.",

            roles_h2: "Role Management — roles & permissions",
            roles_p: "A role is a named set of permissions, for example “Front Desk Staff” or “Kitchen Manager”. You give each person a role, and the role decides which buttons and pages they can use. This is safer and faster than setting permissions person by person.",

            role_create_title: "Creating a role",
            role_create_desc: "Tap New Role, type a name and an optional description, then tick the permissions it should include. Use the Search permissions… box to find them quickly. Permissions are grouped under Food Management, Front Desk and Admin. Tap Create Role to save.",

            role_edit_title: "Editing and deleting a role",
            role_edit_desc: "Tap a role card to open it. Change its name, description or ticked permissions and tap Save Changes. Delete removes the role (you will be asked to confirm). Set as Default marks the role used for new guest accounts — when it is the default it shows a green “Guest Default” badge.",

            perm_h2: "What the permissions mean",
            perm_p: "Permissions are grouped by area. Ticking one lets that role use that feature:",
            perm_food: "Food Management",
            perm_food_list: "Products (view, create, edit, delete, scan), Menus (view, preview, create, edit, delete, structure), Allergens (view, manage), Reports (print, export), Categories (manage)",
            perm_front: "Front Desk",
            perm_front_list: "Reservations (view, create, check-in, check-out), Rooms (view), Notifications (view, manage)",
            perm_admin: "Admin",
            perm_admin_list: "Staff (manage)",

            role_vs_admin_title: "Role vs. Admin — important",
            role_vs_admin_desc: "A Role grants a chosen set of permissions. The separate 管理者権限 (Admin) checkbox grants full access to everything, regardless of role. Give Admin only to people who truly need to manage the whole system.",

            dev_note: "The sections below are for developers building integrations or LLM wrappers.",
            api_h2: "API Endpoints",
            api_p: "REST endpoints used by the admin screen (apps/api).",
            api_staff: "Staff & Organization",
            api_roles: "Roles & Permissions",

            nav_what: "What can you do?",
            nav_org: "Organization",
            nav_roles: "Role Management",
            nav_perm: "Permissions explained",
            nav_api: "API Endpoints",
            nav_everyone: "For everyone",
            nav_dev: "Developer",
        },
        ja: {
            badge: "ガイド",
            section: "管理者ダッシュボード",
            h1: "管理者ダッシュボード",
            intro: "管理者のための管理画面です。部署・役職の整理、スタッフアカウントの管理、各メンバーの操作権限の設定を行えます。",

            access_title: "管理者専用",
            access_desc: "この画面は管理者権限を持つスタッフのみが利用できます。他のスタッフには表示されません。ゲストや厨房のデータは変更せず、人とその権限を管理します。",

            what_h2: "ここでできること",
            what_p: "管理者ダッシュボードを開くと、2つの領域があるシンプルなメニューが表示されます。必要なものを選んでください：",
            menu1_title: "組織 (Organization)",
            menu1_desc: "部署・役職・スタッフ階層 — チームと所属メンバーを設定します。",
            menu2_title: "ロール管理 (Role Management)",
            menu2_desc: "ロールと権限の設定 — 各スタッフが何をできるかを決めます。",

            org_h2: "組織 — 部署・役職・スタッフ",
            org_p: "この画面は2つのパネルに分かれています。左側は部署、右側は選択した部署内の役職とスタッフです。",

            dept_title: "部署",
            dept_desc: "「+ 追加」で部署を作成します。名前を入力し、12色から色を選んで「追加」をタップ。部署にカーソルを合わせると「編集」「削除」ができます。削除した部署のスタッフは「部署未設定」になるだけで、削除はされません。",

            pos_title: "役職",
            pos_desc: "部署を選択し、「+ 役職追加」でフロントや厨房などの役職を作成します。各役職はカーソルを合わせて編集・削除できます。",

            staff_title: "スタッフ",
            staff_desc: "「+ スタッフ追加」で人を追加します。必須項目は「名前」のみです。メール、役職、ロール、雇用形態（社員・派遣・パート）、開始・終了期間も設定できます。スタッフの行をタップすると後から編集できます。",

            staff_filter_title: "在籍中・無効・一括操作",
            staff_filter_desc: "3つのタブで一覧を絞り込めます：在籍中・無効・すべて。複数のスタッフのチェックボックスを選んでまとめて削除できます。重要：在籍中のスタッフは無効化（後から再有効化できます）、無効のスタッフは完全削除（取り消せません）されます。システムは必ず事前に確認します。",

            roles_h2: "ロール管理 — ロールと権限",
            roles_p: "ロールとは、権限のまとまりに名前を付けたものです（例：「フロントスタッフ」「厨房責任者」）。各メンバーにロールを割り当てると、そのロールが使えるボタンやページを決めます。一人ひとり個別に設定するより安全で速い方法です。",

            role_create_title: "ロールの作成",
            role_create_desc: "「New Role」をタップし、名前と任意の説明を入力して、含める権限にチェックを入れます。「Search permissions…」で素早く検索できます。権限は Food Management・Front Desk・Admin にグループ分けされています。「Create Role」で保存します。",

            role_edit_title: "ロールの編集・削除",
            role_edit_desc: "ロールカードをタップして開きます。名前・説明・権限を変更し「Save Changes」で保存。「Delete」でロールを削除します（確認あり）。「Set as Default」は新規ゲストアカウント用のロールを指定し、既定の場合は緑色の「Guest Default」バッジが表示されます。",

            perm_h2: "権限の意味",
            perm_p: "権限は領域ごとにグループ分けされています。チェックを入れると、そのロールがその機能を使えるようになります：",
            perm_food: "Food Management（食品管理）",
            perm_food_list: "商品（閲覧・作成・編集・削除・スキャン）、メニュー（閲覧・プレビュー・作成・編集・削除・構成）、アレルゲン（閲覧・管理）、レポート（印刷・エクスポート）、カテゴリ（管理）",
            perm_front: "Front Desk（フロント）",
            perm_front_list: "予約（閲覧・作成・チェックイン・チェックアウト）、客室（閲覧）、通知（閲覧・管理）",
            perm_admin: "Admin（管理）",
            perm_admin_list: "スタッフ（管理）",

            role_vs_admin_title: "ロールと管理者権限 — 重要",
            role_vs_admin_desc: "ロールは選んだ権限のまとまりを付与します。別途ある「管理者権限」チェックボックスは、ロールに関係なくすべてへのフルアクセスを付与します。システム全体の管理が本当に必要な人にのみ付与してください。",

            dev_note: "以下のセクションは、連携システムやLLMラッパーを開発するエンジニア向けです。",
            api_h2: "APIエンドポイント",
            api_p: "管理画面が使用するREST APIです（apps/api）。",
            api_staff: "スタッフ・組織",
            api_roles: "ロール・権限",

            nav_what: "できること",
            nav_org: "組織",
            nav_roles: "ロール管理",
            nav_perm: "権限の意味",
            nav_api: "APIエンドポイント",
            nav_everyone: "全ユーザー向け",
            nav_dev: "開発者向け",
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
            <p class="text-lg text-slate-500 leading-[1.75] max-w-3xl mb-6">{t.intro}</p>
            <div class="max-w-3xl p-4 rounded-xl border border-amber-200 bg-amber-50 flex gap-3">
                <span class="shrink-0 w-2 h-2 mt-2 rounded-full bg-amber-500"></span>
                <div>
                    <p class="font-semibold text-amber-900 text-sm">{t.access_title}</p>
                    <p class="text-sm text-amber-800 leading-relaxed mt-0.5">{t.access_desc}</p>
                </div>
            </div>
        </div>

        <!-- What can you do -->
        <section id="what-is-this" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.what_h2}</h2>
            <p class="text-slate-500 leading-relaxed mb-8 max-w-3xl">{t.what_p}</p>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-3xl">
                <div class="p-5 rounded-xl border border-sky-100 bg-sky-50">
                    <h3 class="font-semibold text-sky-900 text-sm mb-2">{t.menu1_title}</h3>
                    <p class="text-sm text-sky-800 leading-relaxed">{t.menu1_desc}</p>
                </div>
                <div class="p-5 rounded-xl border border-violet-100 bg-violet-50">
                    <h3 class="font-semibold text-violet-900 text-sm mb-2">{t.menu2_title}</h3>
                    <p class="text-sm text-violet-800 leading-relaxed">{t.menu2_desc}</p>
                </div>
            </div>
        </section>

        <!-- Organization -->
        <section id="organization" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.org_h2}</h2>
            <p class="text-slate-500 leading-relaxed mb-8 max-w-3xl">{t.org_p}</p>
            <div class="space-y-4 max-w-3xl">
                {#each [
                    { title: t.dept_title, desc: t.dept_desc },
                    { title: t.pos_title, desc: t.pos_desc },
                    { title: t.staff_title, desc: t.staff_desc },
                    { title: t.staff_filter_title, desc: t.staff_filter_desc },
                ] as item}
                    <div class="p-5 rounded-xl border border-slate-100 bg-slate-50">
                        <h3 class="font-semibold text-slate-800 mb-1.5">{item.title}</h3>
                        <p class="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                {/each}
            </div>
        </section>

        <!-- Roles -->
        <section id="roles" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.roles_h2}</h2>
            <p class="text-slate-500 leading-relaxed mb-8 max-w-3xl">{t.roles_p}</p>
            <div class="space-y-4 max-w-3xl">
                {#each [
                    { title: t.role_create_title, desc: t.role_create_desc },
                    { title: t.role_edit_title, desc: t.role_edit_desc },
                ] as item}
                    <div class="p-5 rounded-xl border border-slate-100 bg-slate-50">
                        <h3 class="font-semibold text-slate-800 mb-1.5">{item.title}</h3>
                        <p class="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                {/each}
            </div>
            <div class="mt-4 max-w-3xl p-5 rounded-xl border border-amber-200 bg-amber-50">
                <h3 class="font-semibold text-amber-900 text-sm mb-1">{t.role_vs_admin_title}</h3>
                <p class="text-sm text-amber-800 leading-relaxed">{t.role_vs_admin_desc}</p>
            </div>
        </section>

        <!-- Permissions explained -->
        <section id="permissions" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.perm_h2}</h2>
            <p class="text-slate-500 leading-relaxed mb-6 max-w-3xl">{t.perm_p}</p>
            <div class="space-y-4 max-w-3xl">
                {#each [
                    { title: t.perm_food, list: t.perm_food_list, color: "border-orange-100 bg-orange-50", text: "text-orange-900", sub: "text-orange-800" },
                    { title: t.perm_front, list: t.perm_front_list, color: "border-sky-100 bg-sky-50", text: "text-sky-900", sub: "text-sky-800" },
                    { title: t.perm_admin, list: t.perm_admin_list, color: "border-violet-100 bg-violet-50", text: "text-violet-900", sub: "text-violet-800" },
                ] as g}
                    <div class="p-5 rounded-xl border {g.color}">
                        <h3 class="font-semibold text-sm mb-1.5 {g.text}">{g.title}</h3>
                        <p class="text-sm leading-relaxed {g.sub}">{g.list}</p>
                    </div>
                {/each}
            </div>
        </section>

        <!-- Developer Reference Divider -->
        <div id="dev-reference" class="flex items-center gap-4 my-14">
            <div class="flex-1 h-px bg-slate-200"></div>
            <div class="flex items-center gap-2 px-4 py-2 rounded-full bg-navy text-white text-xs font-bold tracking-widest uppercase shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                Developer Reference
            </div>
            <div class="flex-1 h-px bg-slate-200"></div>
        </div>
        <p class="text-sm text-slate-400 text-center mb-12 -mt-8">{t.dev_note}</p>

        <!-- API Endpoints -->
        <section id="api-endpoints" class="mb-16">
            <div class="flex items-center gap-3 mb-5">
                <span class="flex items-center justify-center w-7 h-7 bg-indigo-600 text-white text-xs font-bold rounded-full">1</span>
                <h2 class="text-xl font-bold text-slate-900">{t.api_h2}</h2>
            </div>
            <p class="text-slate-500 leading-relaxed mb-8 max-w-3xl">{t.api_p}</p>
            <h3 class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">{t.api_staff}</h3>
            <div class="overflow-hidden rounded-xl border border-slate-200 mb-8">
                {#each [
                    { m: "GET", p: "/staff", d: $lang === "en" ? "List all staff" : "全スタッフ一覧", bg: "bg-sky-50 text-sky-700" },
                    { m: "POST", p: "/staff", d: $lang === "en" ? "Create a staff member" : "スタッフを作成", bg: "bg-green-50 text-green-700" },
                    { m: "PATCH", p: "/staff/:id/role", d: $lang === "en" ? "Assign a role" : "ロールを割り当て", bg: "bg-amber-50 text-amber-700" },
                    { m: "PATCH", p: "/staff/:id/admin", d: $lang === "en" ? "Toggle admin access" : "管理者権限を切替", bg: "bg-amber-50 text-amber-700" },
                    { m: "PATCH", p: "/staff/:id/deactivate", d: $lang === "en" ? "Deactivate (reversible)" : "無効化（再有効化可）", bg: "bg-amber-50 text-amber-700" },
                    { m: "DELETE", p: "/staff/:id", d: $lang === "en" ? "Permanently delete" : "完全削除", bg: "bg-red-50 text-red-700" },
                    { m: "GET", p: "/departments", d: $lang === "en" ? "List departments & positions" : "部署・役職一覧", bg: "bg-sky-50 text-sky-700" },
                ] as row, i}
                    <div class="flex items-center gap-4 px-5 py-3.5 {i < 6 ? 'border-b border-slate-100' : ''} hover:bg-slate-50 transition-colors">
                        <span class="shrink-0 w-16 text-center text-[11px] font-bold tracking-wide rounded px-1.5 py-0.5 {row.bg}">{row.m}</span>
                        <code class="text-sm font-mono text-slate-700">{row.p}</code>
                        <span class="text-sm text-slate-400 ml-auto">{row.d}</span>
                    </div>
                {/each}
            </div>
            <h3 class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">{t.api_roles}</h3>
            <div class="overflow-hidden rounded-xl border border-slate-200">
                {#each [
                    { m: "GET", p: "/roles", d: $lang === "en" ? "List roles with permissions" : "権限付きロール一覧", bg: "bg-sky-50 text-sky-700" },
                    { m: "GET", p: "/roles/permissions", d: $lang === "en" ? "List all permission keys" : "全権限キー一覧", bg: "bg-sky-50 text-sky-700" },
                    { m: "POST", p: "/roles", d: $lang === "en" ? "Create a role" : "ロールを作成", bg: "bg-green-50 text-green-700" },
                    { m: "PUT", p: "/roles/:id/permissions", d: $lang === "en" ? "Update role permissions" : "ロールの権限を更新", bg: "bg-amber-50 text-amber-700" },
                    { m: "PATCH", p: "/roles/:id/default", d: $lang === "en" ? "Set as guest default" : "ゲスト既定に設定", bg: "bg-amber-50 text-amber-700" },
                    { m: "DELETE", p: "/roles/:id", d: $lang === "en" ? "Delete a role" : "ロールを削除", bg: "bg-red-50 text-red-700" },
                ] as row, i}
                    <div class="flex items-center gap-4 px-5 py-3.5 {i < 5 ? 'border-b border-slate-100' : ''} hover:bg-slate-50 transition-colors">
                        <span class="shrink-0 w-16 text-center text-[11px] font-bold tracking-wide rounded px-1.5 py-0.5 {row.bg}">{row.m}</span>
                        <code class="text-sm font-mono text-slate-700">{row.p}</code>
                        <span class="text-sm text-slate-400 ml-auto">{row.d}</span>
                    </div>
                {/each}
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
        <a href="#organization" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_org}</a>
        <a href="#roles" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_roles}</a>
        <a href="#permissions" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_perm}</a>
        <p class="text-[10px] font-semibold text-slate-300 uppercase tracking-widest px-3 mt-4 mb-1">{t.nav_dev}</p>
        <a href="#api-endpoints" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_api}</a>
    </nav>
</aside>

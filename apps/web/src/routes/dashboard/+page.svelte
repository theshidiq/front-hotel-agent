<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { authState, signOut } from "$lib/auth.svelte";

    const isStaff = $derived(authState.isStaff);

    // Time-aware greeting
    function getGreeting(): string {
        const hour = new Date().getHours();
        if (hour < 10) return "おはようございます";
        if (hour < 17) return "こんにちは";
        return "こんばんは";
    }

    function getFormattedDate(): string {
        return new Date().toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
        });
    }

    onMount(() => {
        if (!isStaff) {
            window.location.href = "/login";
        }
    });

    // Category card definitions
    const categories = [
        {
            id: "front",
            icon: "room_service",
            title: "フロント",
            titleEn: "Front Desk",
            description: "チェックイン・チェックアウト、予約管理、ゲスト対応",
            color: "blue",
            primaryHref: "/front-desk",
            links: [
                {
                    icon: "calendar_today",
                    label: "予約管理",
                    href: "/front-desk",
                    description: "予約の確認・チェックイン・チェックアウト",
                },
            ],
        },
        {
            id: "kitchen",
            icon: "restaurant",
            title: "厨房・メニュー",
            titleEn: "Kitchen & Menu",
            description: "メニュー設計、食材管理、アレルギー情報、厨房生産管理",
            color: "orange",
            primaryHref: "/?tab=menu",
            links: [
                {
                    icon: "restaurant_menu",
                    label: "メニュー管理",
                    href: "/?tab=menu",
                    description: "メニュー・商品の登録・編集",
                },
                {
                    icon: "cooking",
                    label: "厨房生産管理",
                    href: "/kitchen-production",
                    description: "日別PAX集計・アレルギー情報",
                },
            ],
        },
        {
            id: "staff",
            icon: "badge",
            title: "スタッフ",
            titleEn: "Staff",
            description: "シフト管理、スタッフカレンダー",
            color: "green",
            primaryHref: "/shifts",
            links: [
                {
                    icon: "edit_calendar",
                    label: "シフト管理",
                    href: "/shifts",
                    description: "シフトの作成・自動最適化",
                },
                {
                    icon: "calendar_month",
                    label: "シフトカレンダー",
                    href: "/staff/calendar",
                    description: "シフトの確認・管理",
                },
            ],
        },
        {
            id: "docs",
            icon: "menu_book",
            title: "ドキュメント",
            titleEn: "Documentation",
            description: "操作マニュアル・システム仕様・開発者向け情報",
            color: "purple",
            primaryHref: "/docs",
            links: [
                {
                    icon: "code",
                    label: "ドキュメント",
                    href: "/docs",
                    description: "操作マニュアル・API仕様",
                },
            ],
        },
    ];

    const colorMap: Record<
        string,
        {
            bg: string;
            iconBg: string;
            iconText: string;
            border: string;
            hover: string;
            linkHover: string;
            badge: string;
        }
    > = {
        blue: {
            bg: "bg-blue-50",
            iconBg: "bg-blue-100",
            iconText: "text-blue-600",
            border: "border-blue-200",
            hover: "hover:border-blue-400 hover:shadow-blue-100",
            linkHover: "hover:bg-blue-50 hover:text-blue-700",
            badge: "bg-blue-100 text-blue-700",
        },
        orange: {
            bg: "bg-orange-50",
            iconBg: "bg-orange-100",
            iconText: "text-orange-600",
            border: "border-orange-200",
            hover: "hover:border-orange-400 hover:shadow-orange-100",
            linkHover: "hover:bg-orange-50 hover:text-orange-700",
            badge: "bg-orange-100 text-orange-700",
        },
        green: {
            bg: "bg-green-50",
            iconBg: "bg-green-100",
            iconText: "text-green-600",
            border: "border-green-200",
            hover: "hover:border-green-400 hover:shadow-green-100",
            linkHover: "hover:bg-green-50 hover:text-green-700",
            badge: "bg-green-100 text-green-700",
        },
        purple: {
            bg: "bg-purple-50",
            iconBg: "bg-purple-100",
            iconText: "text-purple-600",
            border: "border-purple-200",
            hover: "hover:border-purple-400 hover:shadow-purple-100",
            linkHover: "hover:bg-purple-50 hover:text-purple-700",
            badge: "bg-purple-100 text-purple-700",
        },
        amber: {
            bg: "bg-amber-50",
            iconBg: "bg-amber-100",
            iconText: "text-amber-600",
            border: "border-amber-300",
            hover: "hover:border-amber-500 hover:shadow-amber-100",
            linkHover: "hover:bg-amber-50 hover:text-amber-700",
            badge: "bg-amber-100 text-amber-700",
        },
    };
</script>

<svelte:head>
    <title>ダッシュボード — {authState.organization?.name ?? 'Sinara'}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Top Header -->
    <header
        class="bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between"
    >
        <div class="flex items-center gap-4">
            <div>
                <h1 class="text-xl font-bold text-white">{authState.organization?.name ?? 'Sinara'}</h1>
                {#if authState.organization?.display_name && authState.organization.display_name !== authState.organization.name}
                    <p class="text-xs text-slate-400">{authState.organization.display_name}</p>
                {/if}
            </div>
            <div class="h-6 w-px bg-slate-700"></div>
            <span class="text-sm font-medium text-slate-300"
                >ダッシュボード</span
            >
        </div>

        {#if authState.isStaff && authState.staff}
            <div class="flex items-center gap-3">
                <a
                    href={authState.isAdmin ? "/admin" : "/account"}
                    class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
                >
                    <div
                        class="w-7 h-7 rounded-full {authState.isAdmin
                            ? 'bg-amber-500'
                            : 'bg-blue-600'} flex items-center justify-center text-white text-xs font-bold"
                    >
                        {authState.staff.name.charAt(0).toUpperCase()}
                    </div>
                    <span class="text-sm font-medium hidden sm:block"
                        >{authState.staff.name}</span
                    >
                </a>
                <button
                    onclick={signOut}
                    class="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="ログアウト"
                >
                    <span class="material-symbols-rounded text-lg">logout</span>
                </button>
            </div>
        {/if}
    </header>

    <!-- Main content -->
    <main class="flex-1 px-6 py-10 max-w-6xl mx-auto w-full">
        <!-- Greeting section -->
        <div class="mb-10">
            <p class="text-sm text-gray-500 mb-1">{getFormattedDate()}</p>
            <h2 class="text-3xl font-bold text-gray-900">
                {getGreeting()}
                {#if authState.staff}
                    <span class="text-gray-600"
                        >、{authState.staff.name}さん</span
                    >
                {/if}
            </h2>
        </div>

        <!-- Category cards grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            {#each categories as cat}
                {@const c = colorMap[cat.color]}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <div
                    class="bg-white rounded-2xl border {c.border} shadow-sm {c.hover} hover:shadow-lg transition-all duration-200 overflow-hidden group cursor-pointer"
                    onclick={(e) => {
                        if (!(e.target as Element).closest("a"))
                            goto(cat.primaryHref);
                    }}
                >
                    <!-- Card header -->
                    <div class="px-6 pt-6 pb-4 flex items-start gap-4">
                        <div
                            class="w-14 h-14 rounded-xl {c.iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200"
                        >
                            <span
                                class="material-symbols-rounded text-3xl {c.iconText}"
                                >{cat.icon}</span
                            >
                        </div>
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <h3 class="text-lg font-bold text-gray-900">
                                    {cat.title}
                                </h3>
                                <span
                                    class="text-xs font-medium px-2 py-0.5 rounded-full {c.badge}"
                                    >{cat.titleEn}</span
                                >
                            </div>
                            <p
                                class="text-sm text-gray-500 mt-0.5 leading-relaxed"
                            >
                                {cat.description}
                            </p>
                        </div>
                    </div>

                    <!-- Divider -->
                    <div class="mx-6 border-t border-gray-100"></div>

                    <!-- Sub-links -->
                    <div class="px-4 py-3 space-y-1">
                        {#each cat.links as link}
                            <a
                                href={link.href}
                                class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 {c.linkHover} transition-colors group/link"
                            >
                                <span
                                    class="material-symbols-rounded text-xl text-gray-400 group-hover/link:{c.iconText.replace(
                                        'text-',
                                        '',
                                    )} transition-colors">{link.icon}</span
                                >
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-semibold">
                                        {link.label}
                                    </p>
                                    <p class="text-xs text-gray-400 truncate">
                                        {link.description}
                                    </p>
                                </div>
                                <span
                                    class="material-symbols-rounded text-sm text-gray-300 group-hover/link:text-gray-500 transition-colors"
                                    >chevron_right</span
                                >
                            </a>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>

        <!-- Admin card — only for admins -->
        {#if authState.isAdmin}
            {@const c = colorMap["amber"]}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
                class="mt-5 bg-white rounded-2xl border {c.border} shadow-sm {c.hover} hover:shadow-lg transition-all duration-200 overflow-hidden group cursor-pointer"
                onclick={(e) => {
                    if (!(e.target as Element).closest("a")) goto("/admin");
                }}
            >
                <div class="px-6 pt-6 pb-4 flex items-start gap-4">
                    <div
                        class="w-14 h-14 rounded-xl {c.iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200"
                    >
                        <span
                            class="material-symbols-rounded text-3xl {c.iconText}"
                            >admin_panel_settings</span
                        >
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <h3 class="text-lg font-bold text-gray-900">
                                管理者設定
                            </h3>
                            <span
                                class="text-xs font-medium px-2 py-0.5 rounded-full {c.badge}"
                                >Admin</span
                            >
                        </div>
                        <p class="text-sm text-gray-500 mt-0.5 leading-relaxed">
                            スタッフ管理、権限設定、システム設定
                        </p>
                    </div>
                </div>
                <div class="mx-6 border-t border-gray-100"></div>
                <div class="px-4 py-3 space-y-1">
                    <a
                        href="/admin"
                        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 {c.linkHover} transition-colors group/link"
                    >
                        <span
                            class="material-symbols-rounded text-xl text-gray-400 transition-colors"
                            >manage_accounts</span
                        >
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold">
                                管理者ダッシュボード
                            </p>
                            <p class="text-xs text-gray-400 truncate">
                                スタッフ・権限・システム設定
                            </p>
                        </div>
                        <span
                            class="material-symbols-rounded text-sm text-gray-300 group-hover/link:text-gray-500 transition-colors"
                            >chevron_right</span
                        >
                    </a>
                </div>
            </div>
        {/if}

        <!-- Footer -->
        <p class="text-center text-xs text-gray-400 mt-12">
            {authState.organization?.name ?? 'Sinara'} &middot; {new Date().getFullYear()}
        </p>
    </main>
</div>

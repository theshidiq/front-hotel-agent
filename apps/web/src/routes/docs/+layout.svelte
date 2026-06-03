<script lang="ts">
    import { lang } from "$lib/stores/lang";
    import { page } from "$app/stores";

    let { children } = $props();

    const navItems = [
        { href: "/docs", en: "Allergen Management", ja: "アレルゲン管理" },
        { href: "/docs/menus", en: "Menu System", ja: "メニューシステム" },
        { href: "/docs/front-desk", en: "Front Desk", ja: "フロントデスク" },
        {
            href: "/docs/kitchen-production",
            en: "Kitchen Production",
            ja: "厨房生産管理",
        },
        {
            href: "/docs/shifts",
            en: "Shift Management",
            ja: "シフト管理",
        },
    ];

    let currentPath = $derived($page.url.pathname);

    function isActive(href: string): boolean {
        if (href === "/docs") return currentPath === "/docs";
        return currentPath.startsWith(href);
    }
</script>

<div
    class="min-h-screen bg-[#F5F6FA] text-slate-800 font-sans flex flex-col antialiased"
>
    <main
        class="flex-1 flex flex-col min-h-screen w-full overflow-hidden relative"
    >
        <!-- Top Header -->
        <header
            class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between"
        >
            <a
                href="/"
                class="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                title="Back to Dashboard"
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
                    onclick={() => lang.set("en")}
                    class="px-3 py-1.5 rounded-md text-xs font-bold transition-all {$lang ===
                    'en'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'}">EN</button
                >
                <button
                    onclick={() => lang.set("ja")}
                    class="px-3 py-1.5 rounded-md text-xs font-bold transition-all {$lang ===
                    'ja'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'}">日本語</button
                >
            </div>

            <span
                class="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-widest rounded-full border border-indigo-200"
            >
                {$lang === "en" ? "Documentation" : "ドキュメント"}
            </span>
        </header>

        <div class="flex flex-1 w-full relative">
            <!-- Left Sidebar -->
            <aside
                class="hidden lg:flex lg:flex-col w-56 shrink-0 border-r border-slate-200 bg-white overflow-y-auto pt-8 pb-10 px-4 h-[calc(100vh-57px)] sticky top-[57px]"
            >
                <div>
                    <p
                        class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3 px-2"
                    >
                        {$lang === "en" ? "Guides" : "ガイド"}
                    </p>
                    <ul class="space-y-0.5">
                        {#each navItems as item}
                            <li>
                                <a
                                    href={item.href}
                                    class="flex items-center gap-2 px-2 py-2 text-sm rounded-lg transition-colors {isActive(item.href)
                                        ? 'font-semibold bg-indigo-50 text-indigo-700'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}"
                                >
                                    {$lang === "en" ? item.en : item.ja}
                                </a>
                            </li>
                        {/each}
                    </ul>
                </div>
            </aside>

            <!-- Page Content (injected by each sub-page) -->
            {@render children()}
        </div>
    </main>
</div>

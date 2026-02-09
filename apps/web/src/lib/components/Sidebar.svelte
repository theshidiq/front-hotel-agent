<script lang="ts">
	import { onMount } from 'svelte';

	type NavItem = {
		icon: string;
		label: string;
		badge?: number | string;
		badgeVariant?: 'count' | 'alert';
		active: boolean;
		href?: string;
		onclick?: () => void;
	};

	type NavSection = {
		label: string;
		items: NavItem[];
	};

	let {
		sections,
		collapsed = $bindable(false),
	}: {
		sections: NavSection[];
		collapsed?: boolean;
	} = $props();

	onMount(() => {
		const saved = localStorage.getItem('sidebar-collapsed');
		if (saved !== null) {
			collapsed = saved === 'true';
		}
	});

	function toggle() {
		collapsed = !collapsed;
		localStorage.setItem('sidebar-collapsed', String(collapsed));
	}
</script>

<aside
	class="bg-slate-900 border-r border-slate-700 flex flex-col shrink-0
		overflow-hidden transition-all duration-300 ease-in-out
		{collapsed ? 'w-16' : 'w-60'}"
>
	<!-- Brand Header + Toggle -->
	<div class="border-b border-slate-700 transition-all duration-300
		{collapsed ? 'p-3 flex flex-col items-center gap-2' : 'p-4 flex items-center justify-between'}">
		{#if collapsed}
			<span class="text-xl font-bold text-white">湖</span>
			<button
				onclick={toggle}
				class="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
				title="サイドバーを展開"
			>
				<span class="material-symbols-rounded text-lg rotate-180">chevron_left</span>
			</button>
		{:else}
			<div>
				<h1 class="text-2xl font-bold text-white whitespace-nowrap">湖南荘</h1>
				<p class="text-xs text-slate-400 mt-0.5 whitespace-nowrap">Konan-so Ryokan</p>
			</div>
			<button
				onclick={toggle}
				class="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
				title="サイドバーを折りたたむ"
			>
				<span class="material-symbols-rounded text-lg">chevron_left</span>
			</button>
		{/if}
	</div>

	<!-- Navigation -->
	<nav class="flex-1 p-3 overflow-hidden">
		{#each sections as section, i}
			{#if collapsed}
				{#if i > 0}
					<div class="my-2 mx-1 border-t border-slate-700"></div>
				{/if}
			{:else}
				<p class="px-3 py-2 {i > 0 ? 'mt-4' : ''} text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
					{section.label}
				</p>
			{/if}

			{#each section.items as item}
				{#if item.href}
					<a
						href={item.href}
						class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm
							font-medium transition-colors whitespace-nowrap
							{collapsed ? 'justify-center' : ''}
							{item.active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}"
						title={collapsed ? item.label : undefined}
					>
						<span class="material-symbols-rounded text-lg shrink-0">{item.icon}</span>
						{#if !collapsed}
							{item.label}
							{#if item.badge !== undefined}
								{#if item.badgeVariant === 'alert'}
									<span class="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
								{:else}
									<span class="ml-auto text-xs opacity-70">{item.badge}</span>
								{/if}
							{/if}
						{/if}
					</a>
				{:else}
					<button
						onclick={item.onclick}
						class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm
							font-medium transition-colors whitespace-nowrap
							{collapsed ? 'justify-center' : ''}
							{item.active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}"
						title={collapsed ? item.label : undefined}
					>
						<span class="material-symbols-rounded text-lg shrink-0">{item.icon}</span>
						{#if !collapsed}
							{item.label}
							{#if item.badge !== undefined}
								{#if item.badgeVariant === 'alert'}
									<span class="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
								{:else}
									<span class="ml-auto text-xs opacity-70">{item.badge}</span>
								{/if}
							{/if}
						{/if}
					</button>
				{/if}
			{/each}
		{/each}
	</nav>

</aside>

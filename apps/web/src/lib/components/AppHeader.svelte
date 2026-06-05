<script lang="ts">
	import { authState, signOut } from '$lib/auth.svelte';
	import GlobalSearch from '$lib/components/GlobalSearch.svelte';
	import { shell } from '$lib/stores/shell.svelte';

	let {
		breadcrumb,
		showMenuButton = true,
	}: { breadcrumb?: string; showMenuButton?: boolean } = $props();
</script>

<header
	class="bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center gap-4 justify-between"
>
	<!-- Left: hamburger (mobile) + org + breadcrumb -->
	<div class="flex items-center gap-3 md:gap-4 shrink-0">
		{#if showMenuButton && authState.isStaff}
			<button
				onclick={() => (shell.mobileOpen = true)}
				class="md:hidden p-1.5 -ml-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
				aria-label="メニューを開く"
			>
				<span class="material-symbols-rounded text-xl">menu</span>
			</button>
		{/if}
		<div>
			<h1 class="text-xl font-bold text-white">
				{authState.organization?.name ?? 'Sinara'}
			</h1>
			{#if authState.organization?.display_name && authState.organization.display_name !== authState.organization.name}
				<p class="text-xs text-slate-400">{authState.organization.display_name}</p>
			{/if}
		</div>
		{#if breadcrumb}
			<div class="h-6 w-px bg-slate-700 hidden md:block"></div>
			<span class="text-sm font-medium text-slate-300 hidden md:block">{breadcrumb}</span>
		{/if}
	</div>

	<!-- Center: global search -->
	<div class="flex-1 justify-center hidden sm:flex">
		<GlobalSearch />
	</div>

	<!-- Right: account + logout -->
	{#if authState.isStaff && authState.staff}
		<div class="flex items-center gap-3 shrink-0">
			<a
				href={authState.isAdmin ? '/admin' : '/account'}
				class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
			>
				<div
					class="w-7 h-7 rounded-full {authState.isAdmin
						? 'bg-amber-500'
						: 'bg-blue-600'} flex items-center justify-center text-white text-xs font-bold"
				>
					{authState.staff.name.charAt(0).toUpperCase()}
				</div>
				<span class="text-sm font-medium hidden sm:block">{authState.staff.name}</span>
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

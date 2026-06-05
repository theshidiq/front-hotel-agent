<script lang="ts">
	import { authState, signOut } from '$lib/auth.svelte';
	import GlobalSearch from '$lib/components/GlobalSearch.svelte';

	let { breadcrumb }: { breadcrumb?: string } = $props();
</script>

<header
	class="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 justify-between"
>
	<!-- Left: org + breadcrumb -->
	<div class="flex items-center gap-3 md:gap-4 shrink-0">
		<div>
			<h1 class="text-xl font-bold text-gray-900">
				{authState.organization?.name ?? 'Sinara'}
			</h1>
			{#if authState.organization?.display_name && authState.organization.display_name !== authState.organization.name}
				<p class="text-xs text-gray-500">{authState.organization.display_name}</p>
			{/if}
		</div>
		{#if breadcrumb}
			<div class="h-6 w-px bg-gray-200 hidden md:block"></div>
			<span class="text-sm font-medium text-gray-600 hidden md:block">{breadcrumb}</span>
		{/if}
	</div>

	<!-- Center: global search -->
	<div class="flex-1 justify-center hidden sm:flex">
		<GlobalSearch variant="light" />
	</div>

	<!-- Right: account + logout -->
	{#if authState.isStaff && authState.staff}
		<div class="flex items-center gap-3 shrink-0">
			<a
				href={authState.isAdmin ? '/admin' : '/account'}
				class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
			>
				<div
					class="w-7 h-7 rounded-full {authState.isAdmin
						? 'bg-amber-500'
						: 'bg-navy'} flex items-center justify-center text-white text-xs font-bold"
				>
					{authState.staff.name.charAt(0).toUpperCase()}
				</div>
				<span class="text-sm font-medium hidden sm:block">{authState.staff.name}</span>
			</a>
			<button
				onclick={signOut}
				class="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
				title="ログアウト"
			>
				<span class="material-symbols-rounded text-lg">logout</span>
			</button>
		</div>
	{/if}
</header>

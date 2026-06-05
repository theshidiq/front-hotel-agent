<script lang="ts">
	import { onMount } from "svelte";
	import { authState, signOut } from "$lib/auth.svelte";
	import GlobalSearch from "$lib/components/GlobalSearch.svelte";

	type NavItem = {
		icon: string;
		label: string;
		badge?: number | string;
		badgeVariant?: "count" | "alert";
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
		mobileOpen = $bindable(false),
	}: {
		sections: NavSection[];
		collapsed?: boolean;
		mobileOpen?: boolean;
	} = $props();

	const orgName = $derived(
		authState.organization?.name ?? authState.organization?.display_name ?? null
	);
	const orgSubtitle = $derived(
		authState.organization?.display_name && authState.organization.display_name !== authState.organization?.name
			? authState.organization.display_name
			: null
	);
	const orgInitial = $derived(orgName ? orgName.charAt(0).toUpperCase() : "S");

	onMount(() => {
		const saved = localStorage.getItem("sidebar-collapsed");
		if (saved !== null) {
			collapsed = saved === "true";
		}
	});

	function toggle() {
		collapsed = !collapsed;
		localStorage.setItem("sidebar-collapsed", String(collapsed));
	}

	function closeMobile() {
		mobileOpen = false;
	}
</script>

<!-- Mobile overlay sidebar -->
{#if mobileOpen}
	<div
		class="fixed inset-0 bg-black/50 z-[9998] md:hidden"
		onclick={closeMobile}
		aria-label="Close sidebar"
		role="button"
		tabindex="-1"
		onkeydown={(e) => e.key === 'Escape' && closeMobile()}
	></div>
	<aside
		class="fixed inset-y-0 left-0 z-[9999] w-64 bg-white border-r border-gray-200 flex flex-col md:hidden"
	>
		<!-- Brand Header + Close -->
		<div
			class="border-b border-gray-200 p-4 flex items-center justify-between"
		>
			<div>
				<h1 class="text-2xl font-bold text-gray-900 whitespace-nowrap">
					{orgName ?? "Sinara"}
				</h1>
				{#if orgSubtitle}
					<p class="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
						{orgSubtitle}
					</p>
				{/if}
			</div>
			<button
				onclick={closeMobile}
				class="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
				title="閉じる"
			>
				<span class="material-symbols-rounded text-lg">close</span>
			</button>
		</div>
		<!-- Search -->
		<div class="px-3 pt-3">
			<GlobalSearch variant="light" />
		</div>
		<!-- Navigation -->
		<nav class="flex-1 p-3 overflow-y-auto">
			{#each sections as section, i}
				<p
					class="px-3 py-2 {i > 0
						? 'mt-4'
						: ''} text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
				>
					{section.label}
				</p>
				{#each section.items as item}
					{#if item.href}
						<a
							href={item.href}
							onclick={closeMobile}
							class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm
								font-medium transition-colors whitespace-nowrap
								{item.active ? 'bg-navy text-white' : 'text-gray-700 hover:bg-gray-100'}"
						>
							<span
								class="material-symbols-rounded text-lg shrink-0"
								>{item.icon}</span
							>
							{item.label}
							{#if item.badge !== undefined}
								{#if item.badgeVariant === "alert"}
									<span
										class="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full"
										>{item.badge}</span
									>
								{:else}
									<span class="ml-auto text-xs opacity-70"
										>{item.badge}</span
									>
								{/if}
							{/if}
						</a>
					{:else}
						<button
							onclick={() => {
								item.onclick?.();
								closeMobile();
							}}
							class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm
								font-medium transition-colors whitespace-nowrap
								{item.active ? 'bg-navy text-white' : 'text-gray-700 hover:bg-gray-100'}"
						>
							<span
								class="material-symbols-rounded text-lg shrink-0"
								>{item.icon}</span
							>
							{item.label}
							{#if item.badge !== undefined}
								{#if item.badgeVariant === "alert"}
									<span
										class="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full"
										>{item.badge}</span
									>
								{:else}
									<span class="ml-auto text-xs opacity-70"
										>{item.badge}</span
									>
								{/if}
							{/if}
						</button>
					{/if}
				{/each}
			{/each}
		</nav>
		<!-- Staff Info -->
		{#if authState.isStaff && authState.staff}
			<div class="border-t border-gray-200 p-3">
				<div class="flex items-center gap-3 px-3 py-2">
					<a
						href={authState.isAdmin ? "/admin" : "/account"}
						onclick={closeMobile}
						class="flex items-center gap-3 flex-1 min-w-0 rounded-md hover:bg-gray-100 transition-colors -mx-1 px-1 py-0.5"
					>
						<div
							class="w-8 h-8 rounded-full {authState.isAdmin
								? 'bg-amber-500'
								: 'bg-navy'} flex items-center justify-center text-white text-sm font-bold shrink-0"
						>
							{authState.staff.name.charAt(0).toUpperCase()}
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-gray-900 truncate">
								{authState.staff.name}
							</p>
							<p class="text-xs text-gray-500 truncate">
								{#if authState.isAdmin}
									Admin
								{:else if authState.role}
									{authState.role.name}
								{:else}
									{authState.staff.position || "スタッフ"}
								{/if}
							</p>
						</div>
					</a>
					<button
						onclick={signOut}
						class="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
						title="ログアウト"
					>
						<span class="material-symbols-rounded text-lg"
							>logout</span
						>
					</button>
				</div>
			</div>
		{:else}
			<div class="border-t border-gray-200 p-3">
				<a
					href="/login"
					onclick={closeMobile}
					class="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
				>
					<span class="material-symbols-rounded text-lg shrink-0"
						>login</span
					>
					ログイン / Login
				</a>
			</div>
		{/if}
	</aside>
{/if}

<!-- Desktop sidebar -->
<aside
	class="bg-white border-r border-gray-200 flex-col shrink-0
		overflow-hidden transition-all duration-300 ease-in-out
		hidden md:flex
		{collapsed ? 'w-16' : 'w-60'}"
>
	<!-- Brand Header + Toggle -->
	<div
		class="border-b border-gray-200 transition-all duration-300
		{collapsed
			? 'p-3 flex flex-col items-center gap-2'
			: 'p-4 flex items-center justify-between'}"
	>
		{#if collapsed}
			<span class="text-xl font-bold text-gray-900">{orgInitial}</span>
			<button
				onclick={toggle}
				class="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
				title="サイドバーを展開"
			>
				<span class="material-symbols-rounded text-lg rotate-180"
					>chevron_left</span
				>
			</button>
		{:else}
			<div>
				<h1 class="text-2xl font-bold text-gray-900 whitespace-nowrap">
					{orgName ?? "Sinara"}
				</h1>
				{#if orgSubtitle}
					<p class="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
						{orgSubtitle}
					</p>
				{/if}
			</div>
			<button
				onclick={toggle}
				class="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
				title="サイドバーを折りたたむ"
			>
				<span class="material-symbols-rounded text-lg"
					>chevron_left</span
				>
			</button>
		{/if}
	</div>

	<!-- Search -->
	<div class="px-3 pt-3">
		{#if collapsed}
			<button
				onclick={toggle}
				class="w-full flex justify-center p-2 rounded-lg bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors"
				title="機能を検索"
				aria-label="機能を検索"
			>
				<span class="material-symbols-rounded text-lg">search</span>
			</button>
		{:else}
			<GlobalSearch variant="light" />
		{/if}
	</div>

	<!-- Navigation -->
	<nav class="flex-1 p-3 overflow-hidden">
		{#each sections as section, i}
			{#if collapsed}
				{#if i > 0}
					<div class="my-2 mx-1 border-t border-gray-200"></div>
				{/if}
			{:else}
				<p
					class="px-3 py-2 {i > 0
						? 'mt-4'
						: ''} text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
				>
					{section.label}
				</p>
			{/if}

			{#each section.items as item}
				{#if item.href}
					<a
						href={item.href}
						onclick={closeMobile}
						class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm
							font-medium transition-colors whitespace-nowrap
							{collapsed ? 'justify-center' : ''}
							{item.active ? 'bg-navy text-white' : 'text-gray-700 hover:bg-gray-100'}"
						title={collapsed ? item.label : undefined}
					>
						<span class="material-symbols-rounded text-lg shrink-0"
							>{item.icon}</span
						>
						{#if !collapsed}
							{item.label}
							{#if item.badge !== undefined}
								{#if item.badgeVariant === "alert"}
									<span
										class="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full"
										>{item.badge}</span
									>
								{:else}
									<span class="ml-auto text-xs opacity-70"
										>{item.badge}</span
									>
								{/if}
							{/if}
						{/if}
					</a>
				{:else}
					<button
						onclick={() => {
							item.onclick?.();
							closeMobile();
						}}
						class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm
							font-medium transition-colors whitespace-nowrap
							{collapsed ? 'justify-center' : ''}
							{item.active ? 'bg-navy text-white' : 'text-gray-700 hover:bg-gray-100'}"
						title={collapsed ? item.label : undefined}
					>
						<span class="material-symbols-rounded text-lg shrink-0"
							>{item.icon}</span
						>
						{#if !collapsed}
							{item.label}
							{#if item.badge !== undefined}
								{#if item.badgeVariant === "alert"}
									<span
										class="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full"
										>{item.badge}</span
									>
								{:else}
									<span class="ml-auto text-xs opacity-70"
										>{item.badge}</span
									>
								{/if}
							{/if}
						{/if}
					</button>
				{/if}
			{/each}
		{/each}
	</nav>

	<!-- Logged-in Staff Info -->
	{#if authState.isStaff && authState.staff}
		<div class="border-t border-gray-200 p-3">
			{#if collapsed}
				<div class="flex flex-col items-center gap-1">
					<a
						href={authState.isAdmin ? "/admin" : "/account"}
						class="w-8 h-8 rounded-full {authState.isAdmin
							? 'bg-amber-500'
							: 'bg-navy'} flex items-center justify-center text-white text-sm font-bold hover:ring-2 hover:ring-gray-300 transition-all"
						title={authState.staff.name}
					>
						{authState.staff.name.charAt(0).toUpperCase()}
					</a>
					<button
						onclick={signOut}
						class="w-full flex justify-center p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
						title="ログアウト"
					>
						<span class="material-symbols-rounded text-base"
							>logout</span
						>
					</button>
				</div>
			{:else}
				<div class="flex items-center gap-3 px-3 py-2">
					<a
						href={authState.isAdmin ? "/admin" : "/account"}
						class="flex items-center gap-3 flex-1 min-w-0 rounded-md hover:bg-gray-100 transition-colors -mx-1 px-1 py-0.5"
					>
						<div
							class="w-8 h-8 rounded-full {authState.isAdmin
								? 'bg-amber-500'
								: 'bg-navy'} flex items-center justify-center text-white text-sm font-bold shrink-0"
						>
							{authState.staff.name.charAt(0).toUpperCase()}
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-gray-900 truncate">
								{authState.staff.name}
							</p>
							<p class="text-xs text-gray-500 truncate">
								{#if authState.isAdmin}
									Admin
								{:else if authState.role}
									{authState.role.name}
								{:else}
									{authState.staff.position || "スタッフ"}
								{/if}
							</p>
						</div>
					</a>
					<button
						onclick={signOut}
						class="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
						title="ログアウト"
					>
						<span class="material-symbols-rounded text-lg"
							>logout</span
						>
					</button>
				</div>
			{/if}
		</div>
	{:else}
		<div class="border-t border-gray-200 p-3">
			{#if collapsed}
				<a
					href="/login"
					class="flex justify-center p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
					title="ログイン / Login"
				>
					<span class="material-symbols-rounded text-lg">login</span>
				</a>
			{:else}
				<a
					href="/login"
					class="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
				>
					<span class="material-symbols-rounded text-lg shrink-0"
						>login</span
					>
					ログイン / Login
				</a>
			{/if}
		</div>
	{/if}
</aside>

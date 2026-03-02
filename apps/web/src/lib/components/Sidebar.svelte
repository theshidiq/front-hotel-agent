<script lang="ts">
	import { onMount } from "svelte";
	import { authState, signOut } from "$lib/auth.svelte";

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
	<button
		class="fixed inset-0 bg-black/50 z-40 md:hidden"
		onclick={closeMobile}
		aria-label="Close sidebar"
	></button>
	<aside
		class="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-700 flex flex-col md:hidden"
	>
		<!-- Brand Header + Close -->
		<div
			class="border-b border-slate-700 p-4 flex items-center justify-between"
		>
			<div>
				<h1 class="text-2xl font-bold text-white whitespace-nowrap">
					湖南荘
				</h1>
				<p class="text-xs text-slate-400 mt-0.5 whitespace-nowrap">
					Konan-so Ryokan
				</p>
			</div>
			<button
				onclick={closeMobile}
				class="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
				title="閉じる"
			>
				<span class="material-symbols-rounded text-lg">close</span>
			</button>
		</div>
		<!-- Navigation -->
		<nav class="flex-1 p-3 overflow-y-auto">
			{#each sections as section, i}
				<p
					class="px-3 py-2 {i > 0
						? 'mt-4'
						: ''} text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap"
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
								{item.active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}"
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
								{item.active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}"
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
			<div class="border-t border-slate-700 p-3">
				<div class="flex items-center gap-3 px-3 py-2">
					<a
						href={authState.isAdmin ? "/admin" : "/account"}
						onclick={closeMobile}
						class="flex items-center gap-3 flex-1 min-w-0 rounded-md hover:bg-slate-800 transition-colors -mx-1 px-1 py-0.5"
					>
						<div
							class="w-8 h-8 rounded-full {authState.isAdmin
								? 'bg-amber-500'
								: 'bg-blue-600'} flex items-center justify-center text-white text-sm font-bold shrink-0"
						>
							{authState.staff.name.charAt(0).toUpperCase()}
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-white truncate">
								{authState.staff.name}
							</p>
							<p class="text-xs text-slate-400 truncate">
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
						class="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
						title="ログアウト"
					>
						<span class="material-symbols-rounded text-lg"
							>logout</span
						>
					</button>
				</div>
			</div>
		{:else}
			<div class="border-t border-slate-700 p-3">
				<a
					href="/login"
					onclick={closeMobile}
					class="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
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
	class="bg-slate-900 border-r border-slate-700 flex-col shrink-0
		overflow-hidden transition-all duration-300 ease-in-out
		hidden md:flex
		{collapsed ? 'w-16' : 'w-60'}"
>
	<!-- Brand Header + Toggle -->
	<div
		class="border-b border-slate-700 transition-all duration-300
		{collapsed
			? 'p-3 flex flex-col items-center gap-2'
			: 'p-4 flex items-center justify-between'}"
	>
		{#if collapsed}
			<span class="text-xl font-bold text-white">湖</span>
			<button
				onclick={toggle}
				class="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
				title="サイドバーを展開"
			>
				<span class="material-symbols-rounded text-lg rotate-180"
					>chevron_left</span
				>
			</button>
		{:else}
			<div>
				<h1 class="text-2xl font-bold text-white whitespace-nowrap">
					湖南荘
				</h1>
				<p class="text-xs text-slate-400 mt-0.5 whitespace-nowrap">
					Konan-so Ryokan
				</p>
			</div>
			<button
				onclick={toggle}
				class="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
				title="サイドバーを折りたたむ"
			>
				<span class="material-symbols-rounded text-lg"
					>chevron_left</span
				>
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
				<p
					class="px-3 py-2 {i > 0
						? 'mt-4'
						: ''} text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap"
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
							{item.active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}"
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
							{item.active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}"
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
		<div class="border-t border-slate-700 p-3">
			{#if collapsed}
				<div class="flex flex-col items-center gap-1">
					<a
						href={authState.isAdmin ? "/admin" : "/account"}
						class="w-8 h-8 rounded-full {authState.isAdmin
							? 'bg-amber-500'
							: 'bg-blue-600'} flex items-center justify-center text-white text-sm font-bold hover:ring-2 hover:ring-slate-500 transition-all"
						title={authState.staff.name}
					>
						{authState.staff.name.charAt(0).toUpperCase()}
					</a>
					<button
						onclick={signOut}
						class="w-full flex justify-center p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
						class="flex items-center gap-3 flex-1 min-w-0 rounded-md hover:bg-slate-800 transition-colors -mx-1 px-1 py-0.5"
					>
						<div
							class="w-8 h-8 rounded-full {authState.isAdmin
								? 'bg-amber-500'
								: 'bg-blue-600'} flex items-center justify-center text-white text-sm font-bold shrink-0"
						>
							{authState.staff.name.charAt(0).toUpperCase()}
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-white truncate">
								{authState.staff.name}
							</p>
							<p class="text-xs text-slate-400 truncate">
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
						class="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
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
		<div class="border-t border-slate-700 p-3">
			{#if collapsed}
				<a
					href="/login"
					class="flex justify-center p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
					title="ログイン / Login"
				>
					<span class="material-symbols-rounded text-lg">login</span>
				</a>
			{:else}
				<a
					href="/login"
					class="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
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

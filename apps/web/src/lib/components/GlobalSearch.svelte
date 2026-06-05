<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authState, can } from '$lib/auth.svelte';
	import { searchDestinations, type NavDestination } from '$lib/navigation';

	let query = $state('');
	let open = $state(false);
	let activeIndex = $state(0);
	let inputEl: HTMLInputElement | null = $state(null);
	let containerEl: HTMLDivElement | null = $state(null);

	const hasQuery = $derived(query.trim().length > 0);

	// Only search once the user types — an empty query would list every destination
	const results = $derived(
		hasQuery ? searchDestinations(query, { isAdmin: authState.isAdmin, can }) : []
	);

	// Keep the active index within bounds whenever results change
	$effect(() => {
		if (activeIndex >= results.length) activeIndex = 0;
	});

	function navigate(dest: NavDestination) {
		query = '';
		open = false;
		activeIndex = 0;
		inputEl?.blur();
		goto(dest.href);
	}

	function onInput() {
		open = true;
		activeIndex = 0;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			open = true;
			if (results.length) activeIndex = (activeIndex + 1) % results.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			open = true;
			if (results.length) activeIndex = (activeIndex - 1 + results.length) % results.length;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const dest = results[activeIndex];
			if (dest) navigate(dest);
		} else if (e.key === 'Escape') {
			if (query) {
				query = '';
			} else {
				open = false;
				inputEl?.blur();
			}
		}
	}

	function onGlobalKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
			e.preventDefault();
			open = true;
			inputEl?.focus();
		}
	}

	function onClickOutside(e: MouseEvent) {
		if (containerEl && !containerEl.contains(e.target as Node)) {
			open = false;
		}
	}

	onMount(() => {
		window.addEventListener('keydown', onGlobalKeydown);
		document.addEventListener('click', onClickOutside);
		return () => {
			window.removeEventListener('keydown', onGlobalKeydown);
			document.removeEventListener('click', onClickOutside);
		};
	});
</script>

<div bind:this={containerEl} class="relative w-full max-w-md">
	<div class="relative">
		<span
			class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400 pointer-events-none"
			>search</span
		>
		<input
			bind:this={inputEl}
			bind:value={query}
			oninput={onInput}
			onkeydown={onKeydown}
			onfocus={() => (open = true)}
			type="text"
			placeholder="機能を検索… (例: メニュースキャン)"
			aria-label="機能を検索"
			class="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-16 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
		/>
		<kbd
			class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 bg-slate-700/70 border border-slate-600 rounded px-1.5 py-0.5 pointer-events-none hidden sm:block"
			>⌘K</kbd
		>
	</div>

	{#if open && results.length > 0}
		<div
			class="absolute z-[10000] mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden max-h-[60vh] overflow-y-auto"
		>
			<ul class="py-1.5">
				{#each results as dest, i (dest.id)}
					<li>
						<button
							type="button"
							onmousedown={(e) => {
								e.preventDefault();
								navigate(dest);
							}}
							onmouseenter={() => (activeIndex = i)}
							class="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors {i ===
							activeIndex
								? 'bg-blue-50'
								: 'hover:bg-gray-50'}"
						>
							<span
								class="material-symbols-rounded text-xl shrink-0 {i === activeIndex
									? 'text-blue-600'
									: 'text-gray-400'}">{dest.icon}</span
							>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-semibold text-gray-900 truncate">
									{dest.label}
									<span class="font-normal text-gray-400">· {dest.labelEn}</span>
								</p>
								{#if dest.description}
									<p class="text-xs text-gray-400 truncate">{dest.description}</p>
								{/if}
							</div>
							<span
								class="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 shrink-0"
								>{dest.group}</span
							>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{:else if open && hasQuery}
		<div
			class="absolute z-[10000] mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-xl px-4 py-6 text-center"
		>
			<p class="text-sm text-gray-400">結果が見つかりません</p>
		</div>
	{:else if open}
		<div
			class="absolute z-[10000] mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-xl px-4 py-3 text-center"
		>
			<p class="text-xs text-gray-400">
				機能名を入力して検索（例: メニュースキャン、シフト、予約）
			</p>
		</div>
	{/if}
</div>

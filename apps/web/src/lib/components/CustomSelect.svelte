<script lang="ts">
	type Option = { value: string; label: string };

	let {
		value = $bindable(''),
		options = [] as Option[],
		placeholder = 'Select...',
		class: className = '',
	}: {
		value: string | null | undefined;
		options: Option[];
		placeholder?: string;
		class?: string;
	} = $props();

	let open = $state(false);
	let triggerEl: HTMLButtonElement | null = $state(null);

	const currentValue = $derived(value ?? '');
	const selectedLabel = $derived(
		options.find(o => o.value === currentValue)?.label || ''
	);

	function toggle() {
		open = !open;
	}

	function select(optionValue: string) {
		value = optionValue;
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			open = false;
			triggerEl?.focus();
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (triggerEl && !triggerEl.closest('.custom-select-wrapper')?.contains(e.target as Node)) {
			open = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="custom-select-wrapper relative {className}">
	<button
		bind:this={triggerEl}
		type="button"
		onclick={toggle}
		class="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-navy transition-colors"
	>
		<span class={selectedLabel ? 'text-gray-900' : 'text-gray-400'}>
			{selectedLabel || placeholder}
		</span>
		<svg class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform {open ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if open}
		<div class="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 max-h-60 overflow-y-auto">
			{#if currentValue}
				<button
					type="button"
					onclick={() => select('')}
					class="w-full px-4 py-2.5 text-left text-sm text-gray-400 hover:bg-gray-50 transition-colors"
				>
					{placeholder}
				</button>
			{/if}
			{#each options as option}
				<button
					type="button"
					onclick={() => select(option.value)}
					class="w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors {option.value === currentValue ? 'text-slate-800 font-medium bg-blue-50/50' : 'text-gray-700 hover:bg-gray-50'}"
				>
					<span>{option.label}</span>
					{#if option.value === currentValue}
						<svg class="w-5 h-5 text-slate-800 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

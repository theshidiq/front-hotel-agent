<script lang="ts">
	import type { SchedulePeriod } from '$lib/shifts/types';

	interface Props {
		periods: SchedulePeriod[];
		selectedPeriodId: string | null;
		onSelect: (periodId: string) => void;
	}

	let { periods, selectedPeriodId, onSelect }: Props = $props();

	// State for dropdown/picker
	let isOpen = $state(false);
	let selectedYear = $state(new Date().getFullYear());
	let buttonRef: HTMLButtonElement | null = $state(null);
	let dropdownPosition = $state({ top: 0, left: 0 });

	// Calculate dropdown position when opened
	function updateDropdownPosition() {
		if (buttonRef) {
			const rect = buttonRef.getBoundingClientRect();
			dropdownPosition = {
				top: rect.bottom + window.scrollY + 8,
				left: rect.left + window.scrollX
			};
		}
	}

	// Get unique years from periods
	let availableYears = $derived(() => {
		const years = new Set<number>();
		periods.forEach(p => {
			const year = parseInt(p.start_date.split('-')[0]);
			years.add(year);
		});
		return Array.from(years).sort();
	});

	// Get periods for the selected year
	let periodsForYear = $derived(() => {
		return periods.filter(p => {
			const year = parseInt(p.start_date.split('-')[0]);
			return year === selectedYear;
		}).sort((a, b) => a.start_date.localeCompare(b.start_date));
	});

	// Current selected period
	let currentPeriod = $derived(periods.find(p => p.id === selectedPeriodId));

	// Navigate to previous/next year
	function prevYear() {
		const years = availableYears();
		const currentIndex = years.indexOf(selectedYear);
		if (currentIndex > 0) {
			selectedYear = years[currentIndex - 1];
		}
	}

	function nextYear() {
		const years = availableYears();
		const currentIndex = years.indexOf(selectedYear);
		if (currentIndex < years.length - 1) {
			selectedYear = years[currentIndex + 1];
		}
	}

	// Navigate to previous/next period (for arrow buttons)
	function prevPeriod() {
		if (!selectedPeriodId) return;
		const sortedPeriods = [...periods].sort((a, b) => a.start_date.localeCompare(b.start_date));
		const currentIndex = sortedPeriods.findIndex(p => p.id === selectedPeriodId);
		if (currentIndex > 0) {
			onSelect(sortedPeriods[currentIndex - 1].id);
		}
	}

	function nextPeriod() {
		if (!selectedPeriodId) return;
		const sortedPeriods = [...periods].sort((a, b) => a.start_date.localeCompare(b.start_date));
		const currentIndex = sortedPeriods.findIndex(p => p.id === selectedPeriodId);
		if (currentIndex < sortedPeriods.length - 1) {
			onSelect(sortedPeriods[currentIndex + 1].id);
		}
	}

	// Check if we can navigate
	let canGoPrev = $derived(() => {
		if (!selectedPeriodId) return false;
		const sortedPeriods = [...periods].sort((a, b) => a.start_date.localeCompare(b.start_date));
		const currentIndex = sortedPeriods.findIndex(p => p.id === selectedPeriodId);
		return currentIndex > 0;
	});

	let canGoNext = $derived(() => {
		if (!selectedPeriodId) return false;
		const sortedPeriods = [...periods].sort((a, b) => a.start_date.localeCompare(b.start_date));
		const currentIndex = sortedPeriods.findIndex(p => p.id === selectedPeriodId);
		return currentIndex < sortedPeriods.length - 1;
	});

	// Handle period selection
	function handleSelect(periodId: string) {
		onSelect(periodId);
		isOpen = false;
	}

	// Update selected year when current period changes
	$effect(() => {
		if (currentPeriod) {
			selectedYear = parseInt(currentPeriod.start_date.split('-')[0]);
		}
	});

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.period-picker')) {
			isOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="period-picker relative inline-flex items-center gap-1">
	<!-- Previous Period Button -->
	<button
		type="button"
		class="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		onclick={prevPeriod}
		disabled={!canGoPrev()}
		title="前の期間"
	>
		<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
		</svg>
	</button>

	<!-- Period Display Button (opens picker) -->
	<button
		type="button"
		bind:this={buttonRef}
		class="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors min-w-[180px] justify-center"
		onclick={(e) => { e.stopPropagation(); updateDropdownPosition(); isOpen = !isOpen; }}
	>
		<span class="material-symbols-rounded text-gray-500 text-lg">calendar_month</span>
		<span class="font-medium text-gray-900">
			{#if currentPeriod}
				{currentPeriod.start_date.split('-')[0]}年 {currentPeriod.label}
			{:else}
				期間を選択
			{/if}
		</span>
	</button>

	<!-- Next Period Button -->
	<button
		type="button"
		class="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		onclick={nextPeriod}
		disabled={!canGoNext()}
		title="次の期間"
	>
		<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
		</svg>
	</button>

	<!-- Dropdown Picker (using fixed positioning to escape overflow containers) -->
	{#if isOpen}
		<div
			class="fixed bg-white rounded-lg shadow-xl border border-gray-200 min-w-[320px]"
			style="top: {dropdownPosition.top}px; left: {dropdownPosition.left}px; z-index: 9999;"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Year Navigation -->
			<div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
				<button
					type="button"
					class="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
					onclick={prevYear}
					disabled={availableYears().indexOf(selectedYear) === 0}
				>
					<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<span class="text-lg font-bold text-gray-900">{selectedYear}年</span>
				<button
					type="button"
					class="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
					onclick={nextYear}
					disabled={availableYears().indexOf(selectedYear) === availableYears().length - 1}
				>
					<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			</div>

			<!-- Period Grid -->
			<div class="p-3">
				<div class="grid grid-cols-2 gap-2">
					{#each periodsForYear() as period}
						<button
							type="button"
							class="px-4 py-3 rounded-lg text-center font-medium transition-colors {
								period.id === selectedPeriodId
									? 'bg-blue-600 text-white'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}"
							onclick={() => handleSelect(period.id)}
						>
							{period.label}
						</button>
					{/each}
				</div>

				{#if periodsForYear().length === 0}
					<div class="text-center text-gray-500 py-4">
						この年の期間はありません
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { authState } from '$lib/auth.svelte';
	import { getReservations, getMenuGroups, type Reservation, type MenuGroup } from '$lib/api';
	import { supabase } from '$lib/supabase';
	import type { RealtimeChannel } from '@supabase/supabase-js';

	const isStaff = $derived(authState.isStaff);

	// Date picker state
	let showDateDropdown = $state(false);
	let selectedDate = $state<string | null>(null);

	// Data
	let reservations = $state<Reservation[]>([]);
	let menuGroups = $state<MenuGroup[]>([]);
	let loading = $state(true);
	let lastRefresh = $state<Date | null>(null);

	// Derived: which menu groups are kids menus
	const kidsMenuGroupIds = $derived(
		new Set(menuGroups.flatMap(mg => mg.kids_group_ids || []))
	);

	// Simplified PAX count: one row per menu group + stay night combination
	interface SimplifiedPaxRow {
		menuGroupId: string;
		menuGroupName: string;
		stayNight: number;
		count: number;
		isKidsMenu: boolean;
	}

	const simplifiedPaxData = $derived.by(() => {
		const rows: SimplifiedPaxRow[] = [];

		if (!selectedDate) return [];

		const targetDate = new Date(selectedDate);
		targetDate.setHours(0, 0, 0, 0);

		// Get all confirmed reservations
		const confirmedReservations = reservations.filter(r => r.status === 'confirmed');

		// Count guests by menu group and stay night
		const counts: Record<string, SimplifiedPaxRow> = {};

		confirmedReservations.forEach(res => {
			const checkInDate = new Date(res.check_in_date);
			checkInDate.setHours(0, 0, 0, 0);
			const checkOutDate = new Date(res.check_out_date);
			checkOutDate.setHours(0, 0, 0, 0);

			// Only count guests who are actually staying on the selected date
			if (targetDate < checkInDate || targetDate >= checkOutDate) {
				return;
			}

			// Calculate which night of their stay this is
			const daysDiff = Math.floor((targetDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
			const stayNight = daysDiff + 1; // 1泊目, 2泊目, 3泊目, etc.

			// Find matching menu groups by stay_period_nights
			const matchingGroups = menuGroups.filter(mg =>
				mg.stay_period_nights && mg.stay_period_nights.includes(stayNight)
			);

			matchingGroups.forEach(mg => {
				const key = `${mg.id}-${stayNight}`;
				if (!counts[key]) {
					counts[key] = {
						menuGroupId: mg.id,
						menuGroupName: mg.name,
						stayNight,
						count: 0,
						isKidsMenu: kidsMenuGroupIds.has(mg.id)
					};
				}
				counts[key].count += res.party_size;
			});
		});

		// Convert to array and sort by stay night, then by menu group name
		return Object.values(counts).sort((a, b) => {
			if (a.stayNight !== b.stayNight) return a.stayNight - b.stayNight;
			return a.menuGroupName.localeCompare(b.menuGroupName);
		});
	});

	// Calendar functions
	function formatDateISO(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function getCalendarDays() {
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth();

		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startPadding = firstDay.getDay(); // 0 = Sunday

		const days: Array<{ date: Date; dateStr: string; isToday: boolean; isPast: boolean }> = [];

		// Add padding for days before month starts
		for (let i = 0; i < startPadding; i++) {
			const d = new Date(year, month, -(startPadding - i - 1));
			days.push({
				date: d,
				dateStr: formatDateISO(d),
				isToday: false,
				isPast: true,
			});
		}

		// Add days of current month
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		for (let day = 1; day <= lastDay.getDate(); day++) {
			const d = new Date(year, month, day);
			d.setHours(0, 0, 0, 0);
			days.push({
				date: d,
				dateStr: formatDateISO(d),
				isToday: d.getTime() === today.getTime(),
				isPast: d < today,
			});
		}

		return days;
	}

	function selectSpecificDate(dateStr: string) {
		selectedDate = dateStr;
		showDateDropdown = false;
		loadData();
	}

	// Load data
	async function loadData() {
		loading = true;
		try {
			const [resData, mgData] = await Promise.all([
				getReservations(undefined, 'confirmed'), // Get ALL confirmed reservations
				getMenuGroups()
			]);
			reservations = resData;
			menuGroups = mgData;
			lastRefresh = new Date();
			console.log(`✅ Data refreshed at ${lastRefresh.toLocaleTimeString('ja-JP')}`);
		} catch (err) {
			console.error('Failed to load data:', err);
		} finally {
			loading = false;
		}
	}

	// Real-time subscription
	let realtimeChannel: RealtimeChannel | null = null;

	onMount(() => {
		if (!isStaff) {
			window.location.href = '/login';
			return;
		}
		// Set today's date by default
		const now = new Date();
		selectedDate = formatDateISO(now);
		loadData();

		// Subscribe to real-time changes on reservations and menu_groups tables
		realtimeChannel = supabase
			.channel('kitchen-production-changes')
			.on(
				'postgres_changes',
				{
					event: '*', // Listen to all events: INSERT, UPDATE, DELETE
					schema: 'public',
					table: 'reservations'
				},
				(payload) => {
					console.log('🔔 Reservation changed:', payload);
					loadData(); // Reload data when reservations change
				}
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'menu_groups'
				},
				(payload) => {
					console.log('🔔 Menu group changed:', payload);
					loadData(); // Reload data when menu groups change
				}
			)
			.subscribe((status, err) => {
				console.log('📡 Kitchen realtime status:', status, err);
				if (status === 'CHANNEL_ERROR') {
					console.error('❌ Channel error - Supabase free tier allows only 2 concurrent real-time connections. Close other tabs or upgrade plan.');
				}
			});
	});

	onDestroy(() => {
		if (realtimeChannel) {
			supabase.removeChannel(realtimeChannel);
		}
	});
</script>

<div class="h-screen flex flex-col overflow-hidden bg-gray-50">
	<!-- Header -->
	<header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<!-- Date Selector (moved to left) -->
			<div class="relative">
				<button
					onclick={() => (showDateDropdown = !showDateDropdown)}
					class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
				>
					<span class="material-symbols-rounded text-xl text-gray-500">calendar_month</span>
					{selectedDate ? new Date(selectedDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
					<span class="material-symbols-rounded text-base text-gray-400 transition-transform {showDateDropdown ? 'rotate-180' : ''}">expand_more</span>
				</button>

				{#if showDateDropdown}
					<!-- Backdrop to close dropdown -->
					<button
						class="fixed inset-0 z-10"
						onclick={() => (showDateDropdown = false)}
						aria-label="Close dropdown"
					></button>

					<!-- Calendar View -->
					<div class="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-20">
						<!-- Month header -->
						<div class="text-center mb-3">
							<span class="text-sm font-semibold text-gray-900">
								{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
							</span>
						</div>

						<!-- Day headers -->
						<div class="grid grid-cols-7 gap-1 mb-2">
							{#each ['日', '月', '火', '水', '木', '金', '土'] as day}
								<div class="text-center text-xs font-medium text-gray-500 py-1">
									{day}
								</div>
							{/each}
						</div>

						<!-- Calendar days -->
						<div class="grid grid-cols-7 gap-1">
							{#each getCalendarDays() as { date, dateStr, isToday, isPast }}
								{@const isSelected = selectedDate === dateStr}
								<button
									onclick={() => selectSpecificDate(dateStr)}
									class="aspect-square p-1 text-xs rounded-lg transition-colors relative
										{isSelected ? 'bg-blue-500 text-white font-semibold' :
										isToday ? 'bg-blue-100 text-blue-700 font-semibold' :
										isPast && date.getMonth() !== new Date().getMonth() ? 'text-gray-300' :
										isPast ? 'text-gray-400 hover:bg-gray-100' :
										'text-gray-900 hover:bg-gray-100'}"
								>
									{date.getDate()}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<div>
				<h1 class="text-2xl font-bold text-gray-900">厨房生産管理</h1>
				<p class="text-sm text-gray-600 mt-0.5">Kitchen Production Table</p>
			</div>
		</div>

		<!-- Real-time indicator -->
		<div class="flex items-center gap-2 text-xs text-gray-500">
			<span class="material-symbols-rounded text-sm text-green-600 {loading ? 'animate-spin' : ''}">sensors</span>
			<div class="flex flex-col">
				<span class="flex items-center gap-1">
					<span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
					リアルタイム更新
				</span>
				{#if lastRefresh}
					<span class="text-xs text-gray-400">最終更新: {lastRefresh.toLocaleTimeString('ja-JP')}</span>
				{/if}
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex-1 overflow-auto p-6">
			{#if loading}
				<div class="flex items-center justify-center h-64">
					<div class="text-center">
						<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
						<p class="mt-4 text-gray-600">読み込み中...</p>
					</div>
				</div>
			{:else}
				<!-- PAX Summary Table (Simplified) -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
					<div class="px-6 py-4 border-b border-gray-200">
						<h2 class="text-lg font-semibold text-gray-900">滞在期間別 PAX集計</h2>
					</div>

					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-gray-50 border-b border-gray-200">
								<tr>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Menu Group
									</th>
									<th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
										Total PAX
									</th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								{#if simplifiedPaxData.length === 0}
									<tr>
										<td colspan="2" class="px-6 py-12 text-center text-gray-500">
											データがありません
										</td>
									</tr>
								{:else}
									{#each simplifiedPaxData as row}
										<tr class="hover:bg-gray-50">
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="flex items-center gap-2">
													<span class="text-sm font-medium text-gray-900">{row.menuGroupName}</span>
													<span class="text-xs text-gray-500">({row.stayNight}泊目)</span>
													{#if row.isKidsMenu}
														<span class="px-2 py-0.5 text-xs bg-pink-100 text-pink-800 rounded">子供</span>
													{/if}
												</div>
											</td>
											<td class="px-6 py-4 text-center whitespace-nowrap">
												<span class="text-sm font-semibold text-gray-900">{row.count}</span>
											</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
	</main>
</div>

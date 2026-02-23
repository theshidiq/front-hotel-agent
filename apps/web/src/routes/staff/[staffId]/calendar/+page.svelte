<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchStaffById, fetchPeriods, fetchStaffShifts, findCurrentPeriodIndex, calculateStats } from '$lib/calendar/api';
	import { getShiftColor, SHIFT_COLORS } from '$lib/calendar/shift-colors';
	import type { Period, StaffInfo, Shifts, ShiftStats } from '$lib/calendar/types';

	let { data } = $props();

	const DAY_HEADERS = ['日', '月', '火', '水', '木', '金', '土'];

	function formatLocalDate(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	let staff = $state<StaffInfo | null>(null);
	let periods = $state<Period[]>([]);
	let currentPeriodIdx = $state(0);
	let shifts = $state<Shifts>({});
	let stats = $state<ShiftStats>({ off: 0, early: 0, normal: 0, late: 0, special: 0, work: 0, custom: 0, total: 0 });
	let loading = $state(true);
	let loadingShifts = $state(false);
	let error = $state<string | null>(null);
	let tappedDate = $state<string | null>(null);

	const currentPeriod = $derived(periods[currentPeriodIdx] ?? null);
	const canGoPrev = $derived(currentPeriodIdx > 0);
	const canGoNext = $derived(currentPeriodIdx < periods.length - 1);

	const calendarWeeks = $derived.by(() => {
		if (!currentPeriod) return [];

		const startDate = new Date(currentPeriod.start_date + 'T00:00:00');
		const endDate = new Date(currentPeriod.end_date + 'T00:00:00');

		// Pad to start on Sunday
		const calStart = new Date(startDate);
		calStart.setDate(calStart.getDate() - calStart.getDay());

		// Pad to end on Saturday
		const calEnd = new Date(endDate);
		calEnd.setDate(calEnd.getDate() + (6 - calEnd.getDay()));

		const weeks: { date: Date; dateStr: string; inPeriod: boolean; shift: string }[][] = [];
		let currentWeek: typeof weeks[0] = [];
		const cursor = new Date(calStart);

		while (cursor <= calEnd) {
			const dateStr = formatLocalDate(cursor);
			const inPeriod = dateStr >= currentPeriod.start_date && dateStr <= currentPeriod.end_date;
			currentWeek.push({
				date: new Date(cursor),
				dateStr,
				inPeriod,
				shift: inPeriod ? (shifts[dateStr] ?? '') : '',
			});

			if (currentWeek.length === 7) {
				weeks.push(currentWeek);
				currentWeek = [];
			}
			cursor.setDate(cursor.getDate() + 1);
		}

		if (currentWeek.length > 0) {
			weeks.push(currentWeek);
		}

		return weeks;
	});

	function isToday(dateStr: string): boolean {
		return dateStr === formatLocalDate(new Date());
	}

	async function loadInitialData() {
		loading = true;
		error = null;
		try {
			const staffId = data.staffId;
			const [staffData, periodsData] = await Promise.all([
				fetchStaffById(staffId),
				fetchPeriods(),
			]);

			if (!staffData) {
				error = 'スタッフが見つかりません';
				loading = false;
				return;
			}

			staff = staffData;
			periods = periodsData;
			currentPeriodIdx = findCurrentPeriodIndex(periodsData);

			await loadShifts();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'データの取得に失敗しました';
		} finally {
			loading = false;
		}
	}

	async function loadShifts() {
		if (!staff) return;
		loadingShifts = true;
		tappedDate = null;
		try {
			const data = await fetchStaffShifts(staff.id, currentPeriodIdx);
			shifts = data;
			stats = calculateStats(data);
		} catch {
			shifts = {};
			stats = { off: 0, early: 0, normal: 0, late: 0, special: 0, work: 0, custom: 0, total: 0 };
		} finally {
			loadingShifts = false;
		}
	}

	function goPrev() {
		if (!canGoPrev) return;
		currentPeriodIdx--;
		loadShifts();
	}

	function goNext() {
		if (!canGoNext) return;
		currentPeriodIdx++;
		loadShifts();
	}

	function toggleTap(dateStr: string) {
		tappedDate = tappedDate === dateStr ? null : dateStr;
	}

	onMount(() => {
		loadInitialData();
	});
</script>

<svelte:head>
	<title>{staff ? `${staff.name} シフト` : 'シフトカレンダー'}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col font-['Noto_Sans_JP',sans-serif]">
	<!-- Header -->
	<header class="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
		<div class="max-w-md mx-auto flex items-center justify-between">
			<a
				href="/staff/calendar"
				class="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors text-sm"
			>
				<span class="material-symbols-rounded text-lg">arrow_back</span>
				<span>一覧</span>
			</a>
			<div class="text-center">
				<h1 class="text-base font-bold text-gray-900">シフトカレンダー</h1>
			</div>
			<div class="w-12"></div>
		</div>
	</header>

	<main class="flex-1 px-3 py-3">
		<div class="max-w-md mx-auto">
			{#if loading}
				<div class="flex flex-col items-center justify-center py-20 gap-4">
					<span class="material-symbols-rounded text-4xl text-gray-300 animate-pulse">calendar_month</span>
					<p class="text-sm text-gray-400">読み込み中...</p>
				</div>
			{:else if error}
				<div class="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
					<span class="material-symbols-rounded text-red-500 shrink-0">error</span>
					<p class="text-sm text-red-700">{error}</p>
				</div>
			{:else if staff && currentPeriod}
				<!-- Staff Info + Period Nav -->
				<div class="bg-white rounded-xl border border-gray-200 p-3 mb-3 flex items-center justify-between">
					<div class="flex items-center gap-2.5">
						<div class="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
							{staff.name.charAt(0)}
						</div>
						<div>
							<p class="font-bold text-sm text-gray-900">{staff.name}</p>
							<p class="text-[11px] text-gray-500">
								{staff.position || ''}{staff.position && staff.status ? ' · ' : ''}{staff.status || ''}
							</p>
						</div>
					</div>
				</div>

				<!-- Period Navigation -->
				<div class="flex items-center justify-between mb-3 bg-white rounded-xl border border-gray-200 px-3 py-2.5">
					<button
						onclick={goPrev}
						disabled={!canGoPrev}
						class="p-1 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
					>
						<span class="material-symbols-rounded text-xl">chevron_left</span>
					</button>
					<div class="text-center">
						<span class="text-sm font-semibold text-gray-800">{currentPeriod.label}</span>
						<p class="text-[10px] text-gray-400">{currentPeriod.start_date.slice(5).replace('-', '/')} ~ {currentPeriod.end_date.slice(5).replace('-', '/')}</p>
					</div>
					<button
						onclick={goNext}
						disabled={!canGoNext}
						class="p-1 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
					>
						<span class="material-symbols-rounded text-xl">chevron_right</span>
					</button>
				</div>

				<!-- Calendar Grid -->
				<div class="bg-white rounded-xl border border-gray-200 mb-4 relative overflow-hidden">
					{#if loadingShifts}
						<div class="absolute inset-0 bg-white/70 flex items-center justify-center rounded-xl z-10">
							<span class="material-symbols-rounded text-2xl text-gray-400 animate-pulse">hourglass_empty</span>
						</div>
					{/if}

					<table class="w-full border-collapse">
						<thead>
							<tr>
								{#each DAY_HEADERS as day, i}
									<th class="text-center text-xs font-bold py-2.5 border-b-2 border-gray-200
										{i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400'}">
										{day}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each calendarWeeks as week}
								<tr>
									{#each week as { dateStr, date, inPeriod, shift }}
										{@const dayOfWeek = date.getDay()}
										{@const color = getShiftColor(shift)}
										{@const today = isToday(dateStr)}
										{#if inPeriod}
											<td class="border border-gray-100 p-0 {color.bg} relative
												{today ? 'ring-2 ring-blue-500 ring-inset z-10' : ''}">
												<button
													onclick={() => toggleTap(dateStr)}
													class="w-full flex flex-col items-center justify-center py-2.5 px-1 active:brightness-90"
												>
													<span class="text-xs font-bold leading-none
														{dayOfWeek === 0 ? 'text-red-600' : dayOfWeek === 6 ? 'text-blue-600' : color.text}">
														{date.getDate()}
													</span>
													<span class="text-[10px] leading-none mt-1.5 {color.text} opacity-75">
														{#if shift !== undefined && shift !== ''}
															{SHIFT_COLORS[shift] ? SHIFT_COLORS[shift].label : shift.length > 3 ? shift.slice(0, 3) + '…' : shift}
														{:else}
															&nbsp;
														{/if}
													</span>
												</button>
												{#if tappedDate === dateStr}
													<div class="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2.5 py-1.5 rounded-md shadow-lg whitespace-nowrap z-20 pointer-events-none">
														{dateStr.slice(5)} {shift ? (SHIFT_COLORS[shift] ? SHIFT_COLORS[shift].label : shift) : '勤務'}
														<div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
													</div>
												{/if}
											</td>
										{:else}
											<td class="border border-gray-50 p-0 bg-gray-50/50">
												<div class="flex items-center justify-center py-2.5 px-1">
													<span class="text-[10px] text-gray-300">{date.getDate()}</span>
												</div>
											</td>
										{/if}
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Legend + Stats combined -->
				<div class="bg-white rounded-xl border border-gray-200 p-4 mb-4">
					<div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] mb-3 pb-3 border-b border-gray-100">
						{#each Object.entries(SHIFT_COLORS) as [, color]}
							<div class="flex items-center gap-1">
								<span class="w-2.5 h-2.5 rounded-sm {color.bg} border border-gray-200"></span>
								<span class="text-gray-500">{color.label}</span>
							</div>
						{/each}
					</div>
					<div class="flex flex-wrap gap-2 text-xs">
						{#if stats.off > 0}
							<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-700">休み <strong>{stats.off}</strong></span>
						{/if}
						{#if stats.early > 0}
							<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700">早番 <strong>{stats.early}</strong></span>
						{/if}
						{#if stats.normal > 0}
							<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700">通常 <strong>{stats.normal}</strong></span>
						{/if}
						{#if stats.late > 0}
							<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 text-purple-700">遅番 <strong>{stats.late}</strong></span>
						{/if}
						{#if stats.special > 0}
							<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700">特別 <strong>{stats.special}</strong></span>
						{/if}
						{#if stats.work > 0}
							<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600">勤務 <strong>{stats.work}</strong></span>
						{/if}
						{#if stats.custom > 0}
							<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-50 text-orange-700">備考 <strong>{stats.custom}</strong></span>
						{/if}
						<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-200 text-gray-700">合計 <strong>{stats.total}</strong></span>
					</div>
				</div>
			{/if}
		</div>
	</main>
</div>

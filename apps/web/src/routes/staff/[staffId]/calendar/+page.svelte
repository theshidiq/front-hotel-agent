<script lang="ts">
	import { fetchStaffById, fetchPeriods, fetchStaffShifts, findCurrentPeriodIndex, calculateStats } from '$lib/calendar/api';
	import { authState } from '$lib/auth.svelte';
	import { getShiftColor, SHIFT_COLORS } from '$lib/calendar/shift-colors';
	import { getHolidayName } from '$lib/calendar/japanese-holidays';
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

	const periodHolidays = $derived.by(() => {
		if (!currentPeriod) return [];
		const result: { dateStr: string; name: string }[] = [];
		const cursor = new Date(currentPeriod.start_date + 'T00:00:00');
		const end = new Date(currentPeriod.end_date + 'T00:00:00');
		while (cursor <= end) {
			const dateStr = formatLocalDate(cursor);
			const name = getHolidayName(dateStr);
			if (name) result.push({ dateStr, name });
			cursor.setDate(cursor.getDate() + 1);
		}
		return result;
	});

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

		const weeks: { date: Date; dateStr: string; inPeriod: boolean; shift: string; holiday: string | null }[][] = [];
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
				holiday: getHolidayName(dateStr),
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
			const idx = findCurrentPeriodIndex(periodsData);
			currentPeriodIdx = idx;

			await loadShifts(periodsData[idx]);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'データの取得に失敗しました';
		} finally {
			loading = false;
		}
	}

	async function loadShifts(period: Period) {
		if (!staff) return;
		loadingShifts = true;
		tappedDate = null;
		try {
			const data = await fetchStaffShifts(staff.id, period, staff.department_id);
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
		const newIdx = currentPeriodIdx - 1;
		currentPeriodIdx = newIdx;
		loadShifts(periods[newIdx]);
	}

	function goNext() {
		if (!canGoNext) return;
		const newIdx = currentPeriodIdx + 1;
		currentPeriodIdx = newIdx;
		loadShifts(periods[newIdx]);
	}

	function toggleTap(dateStr: string) {
		tappedDate = tappedDate === dateStr ? null : dateStr;
	}

	let initialized = $state(false);
	$effect(() => {
		if (authState.loading || initialized) return;
		initialized = true;
		loadInitialData();
	});
</script>

<svelte:head>
	<title>{staff ? `${staff.name} シフト` : 'シフトカレンダー'}</title>
</svelte:head>

<div class="min-h-screen bg-gray-100 flex flex-col font-['Noto_Sans_JP',sans-serif]">
	<!-- Header -->
	<header class="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
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

	<main class="flex-1 px-3 py-4">
		<div class="max-w-md mx-auto">
			{#if loading}
				<div class="flex flex-col items-center justify-center py-20 gap-4">
					<span class="material-symbols-rounded text-4xl text-gray-300 animate-pulse">calendar_month</span>
					<p class="text-sm text-gray-400">読み込み中...</p>
				</div>
			{:else if error}
				<div class="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
					<span class="material-symbols-rounded text-red-500 shrink-0">error</span>
					<p class="text-sm text-red-700">{error}</p>
				</div>
			{:else if staff && currentPeriod}
				<!-- Staff Info Card -->
				<div class="bg-white rounded-xl shadow-sm p-3.5 mb-3 flex items-center gap-3">
					<div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
						{staff.name.charAt(0)}
					</div>
					<div>
						<p class="font-bold text-[15px] text-gray-900">{staff.name}</p>
						<p class="text-xs text-gray-500">
							{staff.position || ''}{staff.position && staff.status ? ' · ' : ''}{staff.status || ''}
						</p>
					</div>
				</div>

				<!-- Period Navigation -->
				<div class="flex items-center justify-between mb-3 bg-white rounded-xl shadow-sm px-2 py-2.5">
					<button
						onclick={goNext}
						disabled={!canGoNext}
						class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
					>
						<span class="material-symbols-rounded text-xl">chevron_left</span>
					</button>
					<div class="text-center">
						<span class="text-sm font-bold text-gray-900">{currentPeriod.label}</span>
						<p class="text-[10px] text-gray-400 mt-0.5">{currentPeriod.start_date.slice(5).replace('-', '/')} ~ {currentPeriod.end_date.slice(5).replace('-', '/')}</p>
					</div>
					<button
						onclick={goPrev}
						disabled={!canGoPrev}
						class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
					>
						<span class="material-symbols-rounded text-xl">chevron_right</span>
					</button>
				</div>

				<!-- Calendar Grid -->
				<div class="bg-white rounded-xl shadow-sm mb-3 relative overflow-hidden">
					{#if loadingShifts}
						<div class="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10 backdrop-blur-sm">
							<span class="material-symbols-rounded text-2xl text-gray-400 animate-pulse">hourglass_empty</span>
						</div>
					{/if}

					<table class="w-full border-collapse">
						<thead>
							<tr>
								{#each DAY_HEADERS as day, i}
									<th class="text-center text-[11px] font-bold py-2.5
										{i === 0 ? 'text-red-600' : i === 6 ? 'text-blue-600' : 'text-gray-700'}">
										{day}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each calendarWeeks as week}
								<tr>
									{#each week as { dateStr, date, inPeriod, shift, holiday }}
										{@const dayOfWeek = date.getDay()}
										{@const color = getShiftColor(shift)}
										{@const today = isToday(dateStr)}
										{@const hasShift = shift !== undefined && shift !== ''}
										{@const isHoliday = holiday !== null}
										{#if inPeriod}
											<td class="border border-gray-100/80 p-0 relative {hasShift ? color.bg : ''}
												{today ? 'ring-2 ring-blue-500 ring-inset z-10' : ''}">
												<button
													onclick={() => toggleTap(dateStr)}
													class="w-full flex flex-col items-center justify-center py-2 px-1 active:brightness-95 transition-all"
												>
													<span class="text-[13px] font-bold leading-none
														{dayOfWeek === 0 || isHoliday ? 'text-red-600' : dayOfWeek === 6 ? 'text-blue-600' : hasShift ? color.text : 'text-gray-800'}">
														{date.getDate()}
													</span>
													{#if hasShift}
														<span class="mt-1.5 text-[9px] font-semibold leading-none {color.text}">
															{SHIFT_COLORS[shift] ? SHIFT_COLORS[shift].label : shift.length > 3 ? shift.slice(0, 3) + '…' : shift}
														</span>
													{:else if isHoliday}
														<span class="mt-1.5 text-[9px] leading-none text-red-400">祝</span>
													{:else}
														<span class="mt-1.5 text-[9px] leading-none text-gray-300">&nbsp;</span>
													{/if}
												</button>
												{#if tappedDate === dateStr}
													<div class="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-20 pointer-events-none">
														{dateStr.slice(5)}{isHoliday ? ' ' + holiday : ''} {shift ? (SHIFT_COLORS[shift] ? SHIFT_COLORS[shift].label : shift) : ''}
														<div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
													</div>
												{/if}
											</td>
										{:else}
											<td class="border border-gray-100/40 p-0 bg-gray-50">
												<div class="flex items-center justify-center py-2 px-1">
													<span class="text-[11px] {getHolidayName(dateStr) ? 'text-red-300' : 'text-gray-300'} leading-none">{date.getDate()}</span>
													<span class="mt-1.5 text-[9px] leading-none">&nbsp;</span>
												</div>
											</td>
										{/if}
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Legend + Stats -->
				<div class="bg-white rounded-xl shadow-sm p-4 mb-4">
					<div class="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[11px] mb-3 pb-3 border-b border-gray-100">
						{#each Object.entries(SHIFT_COLORS) as [, color]}
							<div class="flex items-center gap-1.5">
								<span class="w-2.5 h-2.5 rounded-full {color.dot}"></span>
								<span class="text-gray-600 font-medium">{color.label}</span>
							</div>
						{/each}
						<div class="flex items-center gap-1.5">
							<span class="text-[11px] font-bold text-red-600 leading-none">祝</span>
							<span class="text-gray-600 font-medium">祝日</span>
						</div>
					</div>
					<div class="flex flex-wrap gap-2 text-xs">
						{#if stats.off > 0}
							<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-medium">休み <strong>{stats.off}</strong></span>
						{/if}
						{#if stats.early > 0}
							<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">早番 <strong>{stats.early}</strong></span>
						{/if}
						{#if stats.normal > 0}
							<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">通常 <strong>{stats.normal}</strong></span>
						{/if}
						{#if stats.late > 0}
							<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-medium">遅番 <strong>{stats.late}</strong></span>
						{/if}
						{#if stats.special > 0}
							<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">特別 <strong>{stats.special}</strong></span>
						{/if}
						{#if stats.work > 0}
							<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">勤務 <strong>{stats.work}</strong></span>
						{/if}
						{#if stats.custom > 0}
							<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 font-medium">備考 <strong>{stats.custom}</strong></span>
						{/if}
						<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-800 text-white font-medium">合計 <strong>{stats.total}</strong></span>
					</div>
				</div>
			{#if periodHolidays.length > 0}
				<div class="bg-white rounded-xl shadow-sm p-4 mb-4">
					<p class="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">この期間の祝日</p>
					<ul class="space-y-1.5">
						{#each periodHolidays as { dateStr, name }}
							<li class="flex items-center gap-2.5 text-[12px]">
								<span class="text-red-500 font-bold shrink-0">{dateStr.slice(5).replace('-', '/')}</span>
								<span class="text-gray-700">{name}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
			{/if}
		</div>
	</main>
</div>

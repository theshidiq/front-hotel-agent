<script lang="ts">
	import type { CalendarRule } from '$lib/shifts/types';
	import { createCalendarRule, deleteCalendarRule } from '$lib/shifts/api';
	import { Calendar, Plus, Trash2, X, List, Grid3x3, Maximize2, Minimize2 } from 'lucide-svelte';

	interface Props {
		calendarRules: CalendarRule[];
		onRulesChange: () => Promise<void>;
		departmentId?: string;
	}

	let { calendarRules, onRulesChange, departmentId }: Props = $props();

	// State
	let loading = $state(false);
	let showModal = $state(false);
	let viewMode = $state<'grid' | 'list'>('grid');
	let fullscreen = $state(false);
	let feedbackMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// Form state
	let ruleForm = $state({
		date: '',
		rule_type: 'must_day_off' as 'must_work' | 'must_day_off',
		reason: ''
	});

	// Japanese public holidays from API: { "2026-01-01": "元日", ... }
	let japaneseHolidays = $state<Record<string, string>>({});

	$effect(() => {
		fetch('https://holidays-jp.github.io/api/v1/date.json', {
			headers: { Accept: 'application/json' }
		})
			.then(r => r.json())
			.then(data => { japaneseHolidays = data; })
			.catch(() => { /* silently ignore — holidays are display-only */ });
	});

	// ESC to exit fullscreen
	$effect(() => {
		function onKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape' && fullscreen) fullscreen = false;
		}
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	// Calendar grid: 3-month view base
	let gridBaseYear = $state(new Date().getFullYear());
	let gridBaseMonth = $state(new Date().getMonth()); // 0-indexed

	// Fullscreen view: show all 12 months of a year
	let fullscreenYear = $state(new Date().getFullYear());

	// Build months array for 3-month grid
	const gridMonths = $derived(() => {
		const months = [];
		for (let i = 0; i < 3; i++) {
			let m = gridBaseMonth + i;
			let y = gridBaseYear;
			if (m > 11) { m -= 12; y += 1; }
			months.push({ year: y, month: m });
		}
		return months;
	});

	// Build all 12 months for fullscreen year view
	const fullscreenMonths = $derived(() => {
		return Array.from({ length: 12 }, (_, m) => ({ year: fullscreenYear, month: m }));
	});

	// Today's date string for highlighting
	const todayStr = new Date().toISOString().slice(0, 10);

	// Build a lookup: dateStr -> CalendarRule
	const rulesMap = $derived(() => {
		const map: Record<string, CalendarRule> = {};
		calendarRules.forEach(r => { map[r.date] = r; });
		return map;
	});

	// Group rules by month (for list view)
	const rulesByMonth = $derived(() => {
		const grouped: Record<string, CalendarRule[]> = {};
		calendarRules.forEach(rule => {
			const date = new Date(rule.date + 'T00:00:00');
			const monthKey = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`;
			if (!grouped[monthKey]) grouped[monthKey] = [];
			grouped[monthKey].push(rule);
		});
		Object.keys(grouped).forEach(key => {
			grouped[key].sort((a, b) => a.date.localeCompare(b.date));
		});
		return Object.fromEntries(
			Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))
		);
	});

	// Build calendar grid cells for a given year/month
	function buildMonthCells(year: number, month: number): (number | null)[] {
		const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const cells: (number | null)[] = [];
		for (let i = 0; i < firstDay; i++) cells.push(null);
		for (let d = 1; d <= daysInMonth; d++) cells.push(d);
		return cells;
	}

	function toDateStr(year: number, month: number, day: number): string {
		return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	}

	// Click a day cell: cycle none → must_work → must_day_off → delete
	async function handleDayClick(year: number, month: number, day: number) {
		if (loading) return;
		const dateStr = toDateStr(year, month, day);
		const existing = rulesMap()[dateStr];

		loading = true;
		feedbackMessage = null;

		try {
			if (!existing) {
				await createCalendarRule({ date: dateStr, rule_type: 'must_work', reason: '', ...(departmentId ? { department_id: departmentId } : {}) });
			} else if (existing.rule_type === 'must_work') {
				await deleteCalendarRule(existing.id);
				await createCalendarRule({ date: dateStr, rule_type: 'must_day_off', reason: existing.reason || '', ...(departmentId ? { department_id: departmentId } : {}) });
			} else {
				await deleteCalendarRule(existing.id);
			}
			await onRulesChange();
		} catch (error) {
			feedbackMessage = {
				type: 'error',
				text: `操作に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
			};
		} finally {
			loading = false;
		}
	}

	// Date formatting
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr + 'T00:00:00');
		const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
		return `${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`;
	}

	function formatFullDate(dateStr: string): string {
		const date = new Date(dateStr + 'T00:00:00');
		const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
		return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${weekdays[date.getDay()]})`;
	}

	const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

	// 3-month grid navigation
	function prevMonths() {
		let m = gridBaseMonth - 3;
		let y = gridBaseYear;
		if (m < 0) { m += 12; y -= 1; }
		gridBaseMonth = m;
		gridBaseYear = y;
	}

	function nextMonths() {
		let m = gridBaseMonth + 3;
		let y = gridBaseYear;
		if (m > 11) { m -= 12; y += 1; }
		gridBaseMonth = m;
		gridBaseYear = y;
	}

	// Open add modal
	function openAddModal() {
		ruleForm = { date: '', rule_type: 'must_day_off', reason: '' };
		showModal = true;
	}

	// Save rule from modal
	async function saveRule() {
		if (!ruleForm.date) return;
		loading = true;
		feedbackMessage = null;
		try {
			await createCalendarRule({ ...ruleForm, ...(departmentId ? { department_id: departmentId } : {}) });
			await onRulesChange();
			showModal = false;
			feedbackMessage = { type: 'success', text: 'カレンダールールを追加しました' };
			setTimeout(() => { feedbackMessage = null; }, 3000);
		} catch (error) {
			feedbackMessage = {
				type: 'error',
				text: `保存に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
			};
		} finally {
			loading = false;
		}
	}

	// Delete rule from list view
	async function handleDeleteRule(rule: CalendarRule) {
		if (!confirm(`${formatFullDate(rule.date)}のルールを削除しますか？`)) return;
		loading = true;
		feedbackMessage = null;
		try {
			await deleteCalendarRule(rule.id);
			await onRulesChange();
			feedbackMessage = { type: 'success', text: 'ルールを削除しました' };
			setTimeout(() => { feedbackMessage = null; }, 3000);
		} catch (error) {
			feedbackMessage = {
				type: 'error',
				text: `削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
			};
		} finally {
			loading = false;
		}
	}

	// Quick add common holidays
	const commonHolidays = [
		{ label: '元日', month: 1, day: 1 },
		{ label: '成人の日', month: 1, day: 8 },
		{ label: '建国記念の日', month: 2, day: 11 },
		{ label: '春分の日', month: 3, day: 20 },
		{ label: '昭和の日', month: 4, day: 29 },
		{ label: '憲法記念日', month: 5, day: 3 },
		{ label: 'みどりの日', month: 5, day: 4 },
		{ label: 'こどもの日', month: 5, day: 5 },
		{ label: '海の日', month: 7, day: 15 },
		{ label: '山の日', month: 8, day: 11 },
		{ label: '敬老の日', month: 9, day: 16 },
		{ label: '秋分の日', month: 9, day: 22 },
		{ label: 'スポーツの日', month: 10, day: 14 },
		{ label: '文化の日', month: 11, day: 3 },
		{ label: '勤労感謝の日', month: 11, day: 23 },
		{ label: '天皇誕生日', month: 2, day: 23 }
	];

	async function addHoliday(holiday: { label: string; month: number; day: number }) {
		const year = new Date().getFullYear();
		const date = `${year}-${String(holiday.month).padStart(2, '0')}-${String(holiday.day).padStart(2, '0')}`;
		loading = true;
		feedbackMessage = null;
		try {
			await createCalendarRule({ date, rule_type: 'must_day_off', reason: holiday.label, ...(departmentId ? { department_id: departmentId } : {}) });
			await onRulesChange();
			feedbackMessage = { type: 'success', text: `${holiday.label}を追加しました` };
			setTimeout(() => { feedbackMessage = null; }, 3000);
		} catch (error) {
			feedbackMessage = {
				type: 'error',
				text: `追加に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
			};
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<!-- Feedback Message -->
	{#if feedbackMessage}
		<div
			class="rounded-lg p-4 {feedbackMessage.type === 'success'
				? 'bg-green-50 text-green-800 border border-green-200'
				: 'bg-red-50 text-red-800 border border-red-200'}"
		>
			<div class="flex items-center gap-2">
				{#if feedbackMessage.type === 'success'}
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
					</svg>
				{:else}
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
					</svg>
				{/if}
				<span class="font-medium">{feedbackMessage.text}</span>
			</div>
		</div>
	{/if}

	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h3 class="text-lg font-semibold text-gray-900">カレンダールール</h3>
			<p class="text-sm text-gray-600">特定の日に全員休みまたは全員出勤を設定します。</p>
		</div>
		<div class="flex items-center gap-2">
			<!-- View toggle -->
			<div class="flex rounded-lg border border-gray-200 overflow-hidden">
				<button
					type="button"
					onclick={() => viewMode = 'grid'}
					class="px-3 py-1.5 flex items-center gap-1.5 text-sm transition-colors
						{viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}"
					title="カレンダー表示"
				>
					<Grid3x3 class="w-4 h-4" />
					<span class="hidden sm:inline">カレンダー</span>
				</button>
				<button
					type="button"
					onclick={() => viewMode = 'list'}
					class="px-3 py-1.5 flex items-center gap-1.5 text-sm transition-colors border-l border-gray-200
						{viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}"
					title="リスト表示"
				>
					<List class="w-4 h-4" />
					<span class="hidden sm:inline">リスト</span>
				</button>
			</div>
			<!-- Fullscreen toggle (grid only) -->
			{#if viewMode === 'grid'}
				<button
					type="button"
					onclick={() => { fullscreen = true; fullscreenYear = new Date().getFullYear(); }}
					class="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors"
					title="年間表示（全画面）"
				>
					<Maximize2 class="w-4 h-4" />
				</button>
			{/if}
			<button
				type="button"
				onclick={openAddModal}
				class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
			>
				<Plus class="w-4 h-4" />
				ルール追加
			</button>
		</div>
	</div>

	<!-- Info Box -->
	<div class="rounded-lg bg-blue-50 p-4 border border-blue-200">
		<div class="flex items-start gap-3">
			<Calendar class="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
			<div class="text-sm text-blue-800">
				<p class="font-medium mb-1">カレンダールールについて</p>
				{#if viewMode === 'grid'}
					<p>日付をクリックするとルールが切り替わります: <span class="font-semibold text-green-700">全員出勤</span> → <span class="font-semibold text-red-700">全員休み</span> → 削除。全画面ボタンで年間カレンダーを表示できます。</p>
				{:else}
					<p>祝日や定休日など、特定の日に全員休みまたは全員出勤を設定できます。ここで設定したルールはシフト生成時に自動的に適用されます。</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Quick Add Holidays -->
	<div class="rounded-lg border border-gray-200 bg-white p-4">
		<h4 class="font-medium text-gray-900 mb-3">祝日を素早く追加</h4>
		<div class="flex flex-wrap gap-2">
			{#each commonHolidays.slice(0, 8) as holiday}
				<button
					type="button"
					onclick={() => addHoliday(holiday)}
					disabled={loading}
					class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
				>
					{holiday.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- ── GRID VIEW ── -->
	{#if viewMode === 'grid'}
		<div class="rounded-lg border border-gray-200 bg-white overflow-hidden">
			<!-- Grid navigation -->
			<div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
				<button
					type="button"
					onclick={prevMonths}
					disabled={loading}
					class="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<span class="text-sm font-medium text-gray-700">
					{gridMonths()[0].year}年{MONTH_NAMES[gridMonths()[0].month]} 〜 {gridMonths()[2].year}年{MONTH_NAMES[gridMonths()[2].month]}
				</span>
				<button
					type="button"
					onclick={nextMonths}
					disabled={loading}
					class="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			</div>

			<!-- Legend -->
			<div class="flex flex-wrap items-center gap-4 px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
				<div class="flex items-center gap-1.5">
					<div class="w-4 h-4 rounded bg-white border border-gray-300"></div>
					<span>ルールなし</span>
				</div>
				<div class="flex items-center gap-1.5">
					<div class="w-4 h-4 rounded bg-green-100 border border-green-400 flex items-center justify-center text-green-700 font-bold" style="font-size:9px">出</div>
					<span>全員出勤</span>
				</div>
				<div class="flex items-center gap-1.5">
					<div class="w-4 h-4 rounded bg-red-100 border border-red-400 flex items-center justify-center text-red-700 font-bold" style="font-size:9px">休</div>
					<span>全員休み</span>
				</div>
				<div class="flex items-center gap-1.5">
					<div class="w-4 h-4 rounded bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-700 font-bold" style="font-size:9px">祝</div>
					<span>祝日</span>
				</div>
				<div class="flex items-center gap-1.5">
					<div class="w-4 h-4 rounded border-2 border-blue-500 flex items-center justify-center text-blue-600 font-bold" style="font-size:9px">今</div>
					<span>今日</span>
				</div>
				<span class="text-gray-400">※ クリックで切り替え</span>
			</div>

			<!-- 3-month calendar grid -->
			<div class="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
				{#each gridMonths() as { year, month }}
					{@const cells = buildMonthCells(year, month)}
					<div class="p-4">
						<h5 class="text-center font-semibold text-gray-800 mb-3">
							{year}年{MONTH_NAMES[month]}
						</h5>
						<div class="grid grid-cols-7 mb-1">
							{#each ['日','月','火','水','木','金','土'] as dow, i}
								<div class="text-center text-xs font-medium py-1
									{i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}">
									{dow}
								</div>
							{/each}
						</div>
						<div class="grid grid-cols-7 gap-1">
							{#each cells as cell}
								{#if cell === null}
									<div></div>
								{:else}
									{@const dateStr = toDateStr(year, month, cell)}
									{@const rule = rulesMap()[dateStr]}
									{@const holidayName = japaneseHolidays[dateStr]}
									{@const dow = new Date(year, month, cell).getDay()}
									{@const isHoliday = !!holidayName && !rule}
									{@const isToday = dateStr === todayStr}
									<button
										type="button"
										onclick={() => handleDayClick(year, month, cell)}
										disabled={loading}
										class="aspect-square rounded text-xs font-medium transition-all
											flex flex-col items-center justify-center leading-none
											disabled:cursor-not-allowed
											{isToday ? 'ring-2 ring-blue-500 ring-inset z-10' : ''}
											{rule?.rule_type === 'must_work'
												? 'bg-green-100 text-green-800 border border-green-400 hover:bg-green-200'
												: rule?.rule_type === 'must_day_off'
												? 'bg-red-100 text-red-800 border border-red-400 hover:bg-red-200'
												: isHoliday
												? 'bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200'
												: dow === 0
												? 'bg-white text-red-400 border border-transparent hover:bg-red-50'
												: dow === 6
												? 'bg-white text-blue-400 border border-transparent hover:bg-blue-50'
												: 'bg-white text-gray-700 border border-transparent hover:bg-gray-50'}"
										title={rule
											? `${formatDate(dateStr)}: ${rule.rule_type === 'must_work' ? '全員出勤' : '全員休み'}${rule.reason ? ` (${rule.reason})` : ''}${holidayName ? ` / ${holidayName}` : ''}`
											: holidayName
											? `${formatDate(dateStr)}: ${holidayName}`
											: isToday ? '今日' : formatDate(dateStr)}
									>
										<span class="{isToday ? 'font-bold text-blue-600' : ''}">{cell}</span>
										{#if rule}
											<span style="font-size:8px; line-height:1; margin-top:1px">
												{rule.rule_type === 'must_work' ? '出' : '休'}
											</span>
										{:else if isHoliday}
											<span class="w-full text-center truncate px-0.5" style="font-size:7px; line-height:1; margin-top:1px">
												{holidayName}
											</span>
										{/if}
									</button>
								{/if}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>

	<!-- ── LIST VIEW ── -->
	{:else}
		{#if calendarRules.length === 0}
			<div class="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
				<Calendar class="w-12 h-12 text-gray-400 mx-auto mb-4" />
				<p class="text-gray-500 font-medium">カレンダールールがありません</p>
				<p class="text-sm text-gray-400 mt-1">上のボタンからルールを追加してください</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each Object.entries(rulesByMonth()) as [month, rules]}
					<div class="rounded-lg border border-gray-200 bg-white overflow-hidden">
						<div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
							<h4 class="font-medium text-gray-900">{month}</h4>
						</div>
						<div class="divide-y divide-gray-200">
							{#each rules as rule}
								<div class="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
									<div class="flex items-center gap-4">
										<span class="w-24 font-medium text-gray-900">{formatDate(rule.date)}</span>
										<span class="px-3 py-1 rounded-full text-sm font-medium
											{rule.rule_type === 'must_day_off'
												? 'bg-red-100 text-red-700'
												: 'bg-green-100 text-green-700'}">
											{rule.rule_type === 'must_day_off' ? '全員休み' : '全員出勤'}
										</span>
										{#if rule.reason}
											<span class="text-sm text-gray-500">{rule.reason}</span>
										{/if}
									</div>
									<button
										type="button"
										onclick={() => handleDeleteRule(rule)}
										disabled={loading}
										class="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
									>
										<Trash2 class="w-4 h-4" />
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<!-- ── FULLSCREEN YEAR VIEW ── -->
{#if fullscreen}
	<div class="fixed inset-0 z-50 bg-gray-50 flex flex-col" style="font-family: inherit">
		<!-- Header — matches settings page header style -->
		<div class="shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
			<!-- Year nav -->
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={() => fullscreenYear -= 1}
					disabled={loading}
					class="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors disabled:opacity-50"
				>
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<span class="text-lg font-bold text-gray-900 w-20 text-center">{fullscreenYear}年</span>
				<button
					type="button"
					onclick={() => fullscreenYear += 1}
					disabled={loading}
					class="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors disabled:opacity-50"
				>
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
				<button
					type="button"
					onclick={() => fullscreenYear = new Date().getFullYear()}
					class="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
				>
					今年
				</button>
			</div>

			<!-- Legend -->
			<div class="hidden md:flex items-center gap-4 text-xs text-gray-500">
				<div class="flex items-center gap-1.5">
					<div class="w-3 h-3 rounded bg-green-200 border border-green-400"></div><span class="text-gray-700">全員出勤</span>
				</div>
				<div class="flex items-center gap-1.5">
					<div class="w-3 h-3 rounded bg-red-200 border border-red-400"></div><span class="text-gray-700">全員休み</span>
				</div>
				<div class="flex items-center gap-1.5">
					<div class="w-3 h-3 rounded bg-orange-200 border border-orange-300"></div><span class="text-gray-700">祝日</span>
				</div>
				<div class="flex items-center gap-1.5">
					<div class="w-3 h-3 rounded border-2 border-blue-500"></div><span class="text-gray-700">今日</span>
				</div>
				<span class="text-gray-400">クリックで切り替え · ESCで閉じる</span>
			</div>

			<!-- Feedback + close -->
			<div class="flex items-center gap-3">
				{#if feedbackMessage}
					<div class="text-xs font-medium px-3 py-1.5 rounded-lg
						{feedbackMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
						{feedbackMessage.text}
					</div>
				{/if}
				<button
					type="button"
					onclick={() => fullscreen = false}
					class="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
					title="閉じる (ESC)"
				>
					<Minimize2 class="w-4 h-4" />
				</button>
			</div>
		</div>

		<!-- 12-month grid — fills remaining height exactly, no scroll -->
		<div class="flex-1 min-h-0 p-3" style="display:grid; grid-template-rows: 1fr; align-items: stretch;">
			<div style="display:grid; grid-template-columns: repeat(4,1fr); grid-template-rows: repeat(3,1fr); gap: 8px; height:100%;">
				{#each fullscreenMonths() as { year, month }}
					{@const cells = buildMonthCells(year, month)}
					<div class="bg-white rounded-lg border-2 border-gray-200 overflow-hidden flex flex-col min-h-0">
						<!-- Month header — same card header style as constraints tab -->
						<div class="shrink-0 px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-center">
							<span class="font-semibold text-sm text-gray-800">{MONTH_NAMES[month]}</span>
						</div>
						<!-- Calendar body fills remaining height -->
						<div class="flex-1 min-h-0 flex flex-col p-1.5">
							<!-- DOW headers -->
							<div class="grid grid-cols-7 shrink-0 mb-0.5">
								{#each ['日','月','火','水','木','金','土'] as d, i}
									<div class="text-center font-medium leading-none py-0.5
										{i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400'}"
										style="font-size:9px">
										{d}
									</div>
								{/each}
							</div>
							<!-- Day cells grid — flex-1 so it fills all remaining height -->
							<div class="flex-1 min-h-0 grid grid-cols-7" style="grid-template-rows: repeat(6, 1fr); gap:4px;">
								{#each Array(42) as _, i}
									{@const cellIdx = i}
									{@const firstDay = new Date(year, month, 1).getDay()}
									{@const daysInMonth = new Date(year, month + 1, 0).getDate()}
									{@const day = cellIdx - firstDay + 1}
									{@const valid = day >= 1 && day <= daysInMonth}
									{#if !valid}
										<div></div>
									{:else}
										{@const dateStr = toDateStr(year, month, day)}
										{@const rule = rulesMap()[dateStr]}
										{@const holidayName = japaneseHolidays[dateStr]}
										{@const dow = new Date(year, month, day).getDay()}
										{@const isHoliday = !!holidayName && !rule}
										{@const isToday = dateStr === todayStr}
										<button
											type="button"
											onclick={() => handleDayClick(year, month, day)}
											disabled={loading}
											class="w-full h-full rounded flex flex-col items-center justify-center leading-none
												transition-colors disabled:cursor-not-allowed font-medium
												{isToday ? 'ring-2 ring-blue-500 ring-inset z-10' : ''}
												{rule?.rule_type === 'must_work'
													? 'bg-green-100 text-green-800 border border-green-400 hover:bg-green-200'
													: rule?.rule_type === 'must_day_off'
													? 'bg-red-100 text-red-800 border border-red-400 hover:bg-red-200'
													: isHoliday
													? 'bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200'
													: dow === 0
													? 'text-red-400 hover:bg-red-50'
													: dow === 6
													? 'text-blue-400 hover:bg-blue-50'
													: 'text-gray-700 hover:bg-gray-50'}"
											style="font-size:10px"
											title={rule
												? `${formatDate(dateStr)}: ${rule.rule_type === 'must_work' ? '全員出勤' : '全員休み'}${rule.reason ? ` (${rule.reason})` : ''}${holidayName ? ` / ${holidayName}` : ''}`
												: holidayName
												? `${formatDate(dateStr)}: ${holidayName}`
												: isToday ? '今日' : formatDate(dateStr)}
										>
											<span class="{isToday ? 'font-bold text-blue-600' : ''}" style="font-size:10px">{day}</span>
											{#if rule}
												<span style="font-size:7px; line-height:1; margin-top:1px">
													{rule.rule_type === 'must_work' ? '出' : '休'}
												</span>
											{:else if isHoliday}
												<span class="w-full text-center truncate px-0.5" style="font-size:6px; line-height:1; margin-top:1px">
													{holidayName}
												</span>
											{/if}
										</button>
									{/if}
								{/each}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<!-- Add Rule Modal -->
{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full">
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<h3 class="text-lg font-semibold text-gray-900">カレンダールール追加</h3>
				<button
					type="button"
					onclick={() => showModal = false}
					class="p-1 text-gray-400 hover:text-gray-600"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<div class="p-4 space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">日付 <span class="text-red-500">*</span></label>
					<input
						type="date"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
						bind:value={ruleForm.date}
						required
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">ルールタイプ <span class="text-red-500">*</span></label>
					<select
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
						bind:value={ruleForm.rule_type}
					>
						<option value="must_day_off">全員休み</option>
						<option value="must_work">全員出勤</option>
					</select>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">理由</label>
					<input
						type="text"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
						bind:value={ruleForm.reason}
						placeholder="例: 定休日、正月、祝日"
					/>
				</div>
			</div>

			<div class="flex justify-end gap-3 p-4 border-t border-gray-200">
				<button
					type="button"
					onclick={() => showModal = false}
					disabled={loading}
					class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
				>
					キャンセル
				</button>
				<button
					type="button"
					onclick={saveRule}
					disabled={loading || !ruleForm.date}
					class="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? '追加中...' : '追加'}
				</button>
			</div>
		</div>
	</div>
{/if}

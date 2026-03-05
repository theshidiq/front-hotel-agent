<script lang="ts">
	import { untrack } from 'svelte';
	import type { DailyLimits, MonthlyLimits, ORToolsSolverConfig, ScheduleStaff } from '$lib/shifts/types';
	import {
		updateDailyLimits,
		updateMonthlyLimits,
		updateSolverConfig,
		getAllMonthlyLimits,
		createMonthlyLimitRecord,
		updateMonthlyLimitRecord,
		deleteMonthlyLimitRecord,
		type MonthlyLimitRecord
	} from '$lib/shifts/api';

	interface Props {
		dailyLimits: DailyLimits | null;
		monthlyLimits: MonthlyLimits | null;
		solverConfig: ORToolsSolverConfig | null;
		staff: ScheduleStaff[];        // all active staff — for name lookups
		periodStaff: ScheduleStaff[]; // staff active in current period — for chip pickers
		onSave: () => Promise<void>;
		departmentId?: string;
	}

	let { dailyLimits, monthlyLimits, solverConfig, staff = [], periodStaff = [], onSave, departmentId }: Props = $props();

	// Active section
	let activeSection = $state<'daily' | 'monthly' | 'staff_type' | 'solver'>('daily');

	// Daily limits form
	let dailyForm = $state({
		minOffPerDay: 2,
		maxOffPerDay: 4,
		minEarlyPerDay: 1,
		maxEarlyPerDay: 3,
		minWorkingStaffPerDay: 5,
		is_hard_constraint: false
	});

	// Monthly limits form (global "all" scope — the default row)
	let monthlyForm = $state({
		min_count: 6,
		max_count: 10,
		is_hard_constraint: false,
		exclude_calendar_rules: true
	});

	// All monthly limit records (global + per-staff)
	let allMonthlyLimitRecords = $state<MonthlyLimitRecord[]>([]);
	let loadingMonthlyRecords = $state(false);

	// New individual limit form
	let showAddForm = $state(false);
	let addForm = $state({
		scope: 'individual' as 'all' | 'staff_status' | 'individual',
		targetIds: [] as string[],
		min_count: 6,
		max_count: 10,
		is_hard_constraint: false,
		exclude_calendar_rules: true
	});

	const STAFF_STATUS_OPTIONS = ['社員', '派遣', 'パート'];

	const activeStaff = $derived(periodStaff.filter(s => s.is_active));

	// Inline edit state — one record open at a time
	let editingId = $state<string | null>(null);
	let editForm = $state({
		scope: 'individual' as 'all' | 'staff_status' | 'individual',
		targetIds: [] as string[],
		min_count: 0,
		max_count: 10,
		is_hard_constraint: false,
		exclude_calendar_rules: true,
	});

	function resolveCount(cfg: Record<string, unknown> | undefined, cfgKey: string, topLevel: number | string | null | undefined, fallback: number): number {
		const fromCfg = cfg?.[cfgKey];
		if (typeof fromCfg === 'number') return fromCfg;
		if (fromCfg !== undefined && fromCfg !== null) {
			const n = Number(fromCfg);
			if (!isNaN(n)) return n;
		}
		if (topLevel !== undefined && topLevel !== null) {
			const n = Number(topLevel);
			if (!isNaN(n)) return n;
		}
		return fallback;
	}

	function openEdit(record: MonthlyLimitRecord) {
		editingId = record.id;
		const cfg = record.limit_config;
		editForm = {
			scope: (cfg?.scope as 'all' | 'staff_status' | 'individual') || 'individual',
			targetIds: (cfg?.targetIds as string[]) || [],
			min_count: resolveCount(cfg, 'minCount', record.min_count, 0),
			max_count: resolveCount(cfg, 'maxCount', record.max_count, 10),
			is_hard_constraint: record.is_hard_constraint ?? false,
			exclude_calendar_rules: (cfg?.excludeCalendarRules as boolean) ?? (cfg?.exclude_calendar_rules as boolean) ?? true,
		};
	}

	function cancelEdit() {
		editingId = null;
	}

	async function saveEdit(id: string) {
		isSaving = true;
		feedbackMessage = null;
		try {
			await updateMonthlyLimitRecord(id, {
				scope: editForm.scope,
				targetIds: editForm.targetIds,
				min_count: editForm.min_count,
				max_count: editForm.max_count,
				is_hard_constraint: editForm.is_hard_constraint,
				exclude_calendar_rules: editForm.exclude_calendar_rules,
			});
			editingId = null;
			await loadAllMonthlyLimits();
			feedbackMessage = { type: 'success', text: '制限を更新しました' };
			setTimeout(() => { feedbackMessage = null; }, 3000);
		} catch (error) {
			feedbackMessage = { type: 'error', text: `更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}` };
		} finally {
			isSaving = false;
		}
	}

	async function loadAllMonthlyLimits() {
		loadingMonthlyRecords = true;
		try {
			allMonthlyLimitRecords = await getAllMonthlyLimits(departmentId);
		} catch {
			// ignore — records are optional
		} finally {
			loadingMonthlyRecords = false;
		}
	}

	async function addMonthlyLimitRecord() {
		if (addForm.targetIds.length === 0 && addForm.scope !== 'all') return;
		isSaving = true;
		feedbackMessage = null;
		try {
			await createMonthlyLimitRecord({
				scope: addForm.scope,
				targetIds: addForm.targetIds,
				min_count: addForm.min_count,
				max_count: addForm.max_count,
				is_hard_constraint: addForm.is_hard_constraint,
				exclude_calendar_rules: addForm.exclude_calendar_rules,
			}, departmentId);
			showAddForm = false;
			addForm = { scope: 'individual', targetIds: [], min_count: 6, max_count: 10, is_hard_constraint: false, exclude_calendar_rules: true };
			await loadAllMonthlyLimits();
			feedbackMessage = { type: 'success', text: '個別制限を追加しました' };
			setTimeout(() => { feedbackMessage = null; }, 3000);
		} catch (error) {
			feedbackMessage = { type: 'error', text: `追加に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}` };
		} finally {
			isSaving = false;
		}
	}

	async function removeMonthlyLimitRecord(id: string) {
		isSaving = true;
		try {
			await deleteMonthlyLimitRecord(id);
			await loadAllMonthlyLimits();
			feedbackMessage = { type: 'success', text: '制限を削除しました' };
			setTimeout(() => { feedbackMessage = null; }, 3000);
		} catch (error) {
			feedbackMessage = { type: 'error', text: `削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}` };
		} finally {
			isSaving = false;
		}
	}

	function getStaffName(id: string): string {
		return staff.find(s => s.id === id)?.name ?? `(削除済み)`;
	}

	function getScopeLabel(record: MonthlyLimitRecord): string {
		const scope = record.limit_config?.scope || 'all';
		const targets = record.limit_config?.targetIds as string[] | undefined;
		if (scope === 'all') return 'デフォルト（全員）';
		if (scope === 'staff_status') return targets?.join(', ') ?? 'スタッフ種別';
		if (scope === 'individual') {
			if (!targets || targets.length === 0) return '個別スタッフ';
			return targets.map(getStaffName).join(', ');
		}
		return scope;
	}

	// Click-outside action to close inline edit
	function clickOutside(node: HTMLElement, callback: () => void) {
		function handleClick(event: MouseEvent) {
			if (!node.contains(event.target as Node)) {
				callback();
			}
		}
		document.addEventListener('pointerdown', handleClick, true);
		return {
			destroy() {
				document.removeEventListener('pointerdown', handleClick, true);
			}
		};
	}

	// Staff type limits — stored in daily_limits.limit_config.staffTypeLimits
	const DEFAULT_STAFF_TYPE_LIMITS = {
		'社員': { minOff: 0, maxOff: 1, maxEarly: 2, maxMonthlyEarlyShifts: 3, isHard: false },
		'派遣': { minOff: 0, maxOff: 1, maxEarly: 2, maxMonthlyEarlyShifts: 5, isHard: false },
		'パート': { minOff: 0, maxOff: 2, maxEarly: 1, maxMonthlyEarlyShifts: 5, isHard: false }
	};
	let staffTypeLimits = $state<Record<string, { minOff: number; maxOff: number; maxEarly: number; maxMonthlyEarlyShifts: number; isHard: boolean }>>(
		structuredClone(DEFAULT_STAFF_TYPE_LIMITS)
	);

	// Solver config form — 5-day rest + penalty weights + advanced settings
	let solverForm = $state({
		// 5-day rest
		fiveDayRestIsHard: false,
		// Penalty weights
		penaltyFiveDayRest: 200,
		penaltyStaffGroup: 100,
		penaltyMonthlyLimit: 80,
		penaltyDailyLimitMax: 50,
		penaltyDailyLimitMin: 50,
		penaltyAdjacentConflict: 30,
		penaltyStaffStatusShift: 150,   // #5 — 派遣/パート forbidden shift penalty
		// #4 — staff status shift restrictions toggle
		disableStaffStatusShiftRestrictions: false,
		// #6 & #7 — post-period constraints
		postPeriodEnabled: false,
		postPeriodDays: 2,
		postPeriodIsHard: true,
		postPeriodMinLength: 3,
		// #8 — adjacent conflict toggle
		disableAdjacentConflict: false,
	});

	// State
	let isSaving = $state(false);
	let hasChanges = $state(false);
	let feedbackMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// Load all monthly limit records when switching to monthly section
	$effect(() => {
		if (activeSection === 'monthly') {
			untrack(() => { loadAllMonthlyLimits(); });
		}
	});

	// Initialize forms from props — only re-runs when props change.
	// Writes to form state are wrapped in untrack so they don't create a reactive cycle.
	$effect(() => {
		const dl = dailyLimits;
		const ml = monthlyLimits;
		const sc = solverConfig;
		untrack(() => {
			if (dl) {
				const lc = dl.limit_config as Record<string, unknown>;
				dailyForm = {
					minOffPerDay: (lc.minOffPerDay as number) ?? 2,
					maxOffPerDay: (lc.maxOffPerDay as number) ?? 4,
					minEarlyPerDay: (lc.minEarlyPerDay as number) ?? 1,
					maxEarlyPerDay: (lc.maxEarlyPerDay as number) ?? 3,
					minWorkingStaffPerDay: (lc.minWorkingStaffPerDay as number) ?? 5,
					is_hard_constraint: dl.is_hard_constraint ?? false
				};
				// Load staff type limits from limit_config.staffTypeLimits if present
				type StlEntry = { minOff?: number; maxOff?: number; maxEarly?: number; maxMonthlyEarlyShifts?: number; isHard?: boolean };
				const stl = lc.staffTypeLimits as Record<string, StlEntry> | undefined;
				if (stl) {
					const merged: Record<string, { minOff: number; maxOff: number; maxEarly: number; maxMonthlyEarlyShifts: number; isHard: boolean }> = structuredClone(DEFAULT_STAFF_TYPE_LIMITS);
					for (const [type, vals] of Object.entries(stl)) {
						const def = DEFAULT_STAFF_TYPE_LIMITS[type as keyof typeof DEFAULT_STAFF_TYPE_LIMITS];
						merged[type] = {
							minOff: vals.minOff ?? def?.minOff ?? 0,
							maxOff: vals.maxOff ?? def?.maxOff ?? 1,
							maxEarly: vals.maxEarly ?? def?.maxEarly ?? 2,
							maxMonthlyEarlyShifts: vals.maxMonthlyEarlyShifts ?? def?.maxMonthlyEarlyShifts ?? 5,
							isHard: vals.isHard ?? false
						};
					}
					staffTypeLimits = merged;
				}
			}
			if (ml) {
				const mlc = ml.limit_config as Record<string, unknown> | undefined;
				monthlyForm = {
					min_count: ml.min_count ?? 6,
					max_count: ml.max_count ?? 10,
					is_hard_constraint: ml.is_hard_constraint ?? false,
					exclude_calendar_rules: (mlc?.exclude_calendar_rules as boolean) ?? true
				};
			}
			if (sc) {
				const hw = sc.hard_constraints;
				const pw = sc.penalty_weights;
				const ss = sc.solver_settings;
				solverForm = {
					fiveDayRestIsHard: hw?.fiveDayRest ?? false,
					penaltyFiveDayRest: pw?.fiveDayRest ?? 200,
					penaltyStaffGroup: pw?.staffGroup ?? 100,
					penaltyMonthlyLimit: pw?.monthlyLimit ?? 80,
					penaltyDailyLimitMax: pw?.dailyLimitMax ?? 50,
					penaltyDailyLimitMin: pw?.dailyLimitMin ?? 50,
					penaltyAdjacentConflict: pw?.adjacentConflict ?? 30,
					penaltyStaffStatusShift: pw?.staffStatusShift ?? 150,
					disableStaffStatusShiftRestrictions: ss?.disableStaffStatusShiftRestrictions ?? false,
					postPeriodEnabled: ss?.postPeriodEnabled ?? false,
					postPeriodDays: ss?.postPeriodDays ?? 2,
					postPeriodIsHard: ss?.postPeriodIsHard ?? true,
					postPeriodMinLength: ss?.postPeriodMinLength ?? 3,
					disableAdjacentConflict: ss?.disableAdjacentConflict ?? false,
				};
			}
			hasChanges = false;
		});
	});

	function markChanged() {
		hasChanges = true;
	}

	async function saveDailyLimits() {
		isSaving = true;
		feedbackMessage = null;

		try {
			await updateDailyLimits(dailyForm, departmentId);
			feedbackMessage = { type: 'success', text: '日次制限を保存しました' };
			hasChanges = false;
			await onSave();
			setTimeout(() => { feedbackMessage = null; }, 3000);
		} catch (error) {
			feedbackMessage = {
				type: 'error',
				text: `保存に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
			};
		} finally {
			isSaving = false;
		}
	}

	async function saveMonthlyLimits() {
		isSaving = true;
		feedbackMessage = null;

		try {
			await updateMonthlyLimits(monthlyForm, departmentId);
			feedbackMessage = { type: 'success', text: '月次制限を保存しました' };
			hasChanges = false;
			await onSave();
			setTimeout(() => { feedbackMessage = null; }, 3000);
		} catch (error) {
			feedbackMessage = {
				type: 'error',
				text: `保存に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
			};
		} finally {
			isSaving = false;
		}
	}

	async function saveStaffTypeLimits() {
		isSaving = true;
		feedbackMessage = null;

		try {
			// Staff type limits are stored inside daily_limits.limit_config.staffTypeLimits
			await updateDailyLimits({ staffTypeLimits }, departmentId);
			feedbackMessage = { type: 'success', text: 'スタッフタイプ別制限を保存しました' };
			hasChanges = false;
			await onSave();
			setTimeout(() => { feedbackMessage = null; }, 3000);
		} catch (error) {
			feedbackMessage = {
				type: 'error',
				text: `保存に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
			};
		} finally {
			isSaving = false;
		}
	}

	async function saveSolverConfig() {
		isSaving = true;
		feedbackMessage = null;

		try {
			await updateSolverConfig({
				hard_constraints: { fiveDayRest: solverForm.fiveDayRestIsHard },
				penalty_weights: {
					fiveDayRest: solverForm.penaltyFiveDayRest,
					staffGroup: solverForm.penaltyStaffGroup,
					monthlyLimit: solverForm.penaltyMonthlyLimit,
					dailyLimitMax: solverForm.penaltyDailyLimitMax,
					dailyLimitMin: solverForm.penaltyDailyLimitMin,
					adjacentConflict: solverForm.penaltyAdjacentConflict,
					staffStatusShift: solverForm.penaltyStaffStatusShift,
				},
				disableStaffStatusShiftRestrictions: solverForm.disableStaffStatusShiftRestrictions,
				postPeriodEnabled: solverForm.postPeriodEnabled,
				postPeriodDays: solverForm.postPeriodDays,
				postPeriodIsHard: solverForm.postPeriodIsHard,
				postPeriodMinLength: solverForm.postPeriodMinLength,
				disableAdjacentConflict: solverForm.disableAdjacentConflict,
			});
			feedbackMessage = { type: 'success', text: 'ソルバー設定を保存しました' };
			hasChanges = false;
			await onSave();
			setTimeout(() => { feedbackMessage = null; }, 3000);
		} catch (error) {
			feedbackMessage = {
				type: 'error',
				text: `保存に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
			};
		} finally {
			isSaving = false;
		}
	}

	function getSectionClass(section: string): string {
		return activeSection === section
			? 'border-blue-600 text-blue-600 bg-blue-50'
			: 'border-gray-200 text-gray-600 hover:bg-gray-50';
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
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clip-rule="evenodd"
						/>
					</svg>
				{:else}
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clip-rule="evenodd"
						/>
					</svg>
				{/if}
				<span class="font-medium">{feedbackMessage.text}</span>
			</div>
		</div>
	{/if}

	<!-- Section Tabs -->
	<div class="flex gap-2 border-b border-gray-200 pb-4">
		<button
			type="button"
			onclick={() => activeSection = 'daily'}
			class="px-4 py-2 rounded-lg border-2 font-medium transition-colors {getSectionClass('daily')}"
		>
			日次制限
		</button>
		<button
			type="button"
			onclick={() => activeSection = 'monthly'}
			class="px-4 py-2 rounded-lg border-2 font-medium transition-colors {getSectionClass('monthly')}"
		>
			月次制限
		</button>
		<button
			type="button"
			onclick={() => activeSection = 'staff_type'}
			class="px-4 py-2 rounded-lg border-2 font-medium transition-colors {getSectionClass('staff_type')}"
		>
			スタッフタイプ別
		</button>
		<button
			type="button"
			onclick={() => activeSection = 'solver'}
			class="px-4 py-2 rounded-lg border-2 font-medium transition-colors {getSectionClass('solver')}"
		>
			ソルバー設定
		</button>
	</div>

	<!-- Daily Limits Section -->
	{#if activeSection === 'daily'}
		<div class="rounded-lg border border-gray-200 bg-white p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">日次制限設定</h3>
			<p class="text-sm text-gray-600 mb-6">1日あたりの休みや早番の人数制限を設定します。</p>

			<!-- OR-Tools info banner -->
			<div class="mb-6 flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
				<span class="material-symbols-rounded text-blue-600 mt-0.5 shrink-0">auto_fix_high</span>
				<div>
					<span class="font-medium">OR-Tools連携：</span>
					各日の休み・早番人数がこの範囲に収まるよう最適化します。ハード制約にすると必ず守られ、ソフト制約はペナルティで調整されます。
				</div>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<!-- Off Limits -->
				<div class="space-y-4 p-4 rounded-lg bg-red-50 border border-red-200">
					<h4 class="font-medium text-red-800">休み人数</h4>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">最小</label>
						<input
							type="number"
							class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
							bind:value={dailyForm.minOffPerDay}
							onchange={markChanged}
							min="0"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">最大</label>
						<input
							type="number"
							class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
							bind:value={dailyForm.maxOffPerDay}
							onchange={markChanged}
							min="0"
						/>
					</div>
				</div>

				<!-- Early Limits -->
				<div class="space-y-4 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
					<h4 class="font-medium text-yellow-800">早番人数</h4>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">最小</label>
						<input
							type="number"
							class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
							bind:value={dailyForm.minEarlyPerDay}
							onchange={markChanged}
							min="0"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">最大</label>
						<input
							type="number"
							class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
							bind:value={dailyForm.maxEarlyPerDay}
							onchange={markChanged}
							min="0"
						/>
					</div>
				</div>

				<!-- Working Staff -->
				<div class="space-y-4 p-4 rounded-lg bg-green-50 border border-green-200">
					<h4 class="font-medium text-green-800">最小出勤人数</h4>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">人数</label>
						<input
							type="number"
							class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
							bind:value={dailyForm.minWorkingStaffPerDay}
							onchange={markChanged}
							min="0"
						/>
					</div>
					<p class="text-xs text-gray-500">この人数以上が出勤するように調整されます</p>
				</div>
			</div>

			<!-- Hard Constraint Toggle -->
			<div class="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
				<label class="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={dailyForm.is_hard_constraint}
						onchange={markChanged}
						class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					/>
					<div>
						<span class="font-medium text-gray-900">ハード制約として設定</span>
						<p class="text-sm text-gray-500">チェックすると、この制限は必ず守られます（ソフト制約は可能な限り守られます）</p>
					</div>
				</label>
			</div>

			<!-- Save Button -->
			<div class="mt-6 flex justify-end">
				<button
					type="button"
					onclick={saveDailyLimits}
					disabled={isSaving}
					class="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{isSaving ? '保存中...' : '日次制限を保存'}
				</button>
			</div>
		</div>
	{/if}

	<!-- Monthly Limits Section -->
	{#if activeSection === 'monthly'}
		<div class="rounded-lg border border-gray-200 bg-white p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">月次制限設定</h3>
			<p class="text-sm text-gray-600 mb-6">1ヶ月あたりの休み日数を設定します。デフォルト（全員）と個別スタッフの両方を設定できます。</p>

			<!-- OR-Tools info banner -->
			<div class="mb-6 flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
				<span class="material-symbols-rounded text-blue-600 mt-0.5 shrink-0">auto_fix_high</span>
				<div>
					<span class="font-medium">OR-Tools連携：</span>
					個別設定 &gt; スタッフ種別 &gt; 全員（デフォルト）の優先順でスタッフに適用されます。
				</div>
			</div>

			<!-- Default (all) monthly limit form -->
			<div class="p-4 rounded-lg bg-purple-50 border border-purple-200 mb-6">
				<h4 class="font-medium text-purple-800 mb-4">デフォルト設定（全員）</h4>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">最小休み日数</label>
						<input
							type="number"
							class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
							bind:value={monthlyForm.min_count}
							onchange={markChanged}
							min="0"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">最大休み日数</label>
						<input
							type="number"
							class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
							bind:value={monthlyForm.max_count}
							onchange={markChanged}
							min="0"
						/>
					</div>
					<div class="flex items-center gap-3">
						<label class="flex items-center gap-2 cursor-pointer">
							<input type="checkbox" bind:checked={monthlyForm.is_hard_constraint} onchange={markChanged} class="w-4 h-4 rounded border-gray-300 text-blue-600" />
							<span class="text-sm font-medium text-gray-700">ハード制約</span>
						</label>
					</div>
					<div class="flex items-center gap-3">
						<label class="flex items-center gap-2 cursor-pointer">
							<input type="checkbox" bind:checked={monthlyForm.exclude_calendar_rules} onchange={markChanged} class="w-4 h-4 rounded border-gray-300 text-blue-600" />
							<span class="text-sm font-medium text-gray-700">カレンダールール除外</span>
						</label>
					</div>
				</div>
				<div class="mt-4 flex justify-end">
					<button
						type="button"
						onclick={saveMonthlyLimits}
						disabled={isSaving}
						class="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition-colors"
					>
						{isSaving ? '保存中...' : 'デフォルト設定を保存'}
					</button>
				</div>
			</div>

			<!-- Per-staff monthly limit records -->
			<div class="mb-4 flex items-center justify-between">
				<h4 class="font-medium text-gray-800">個別・スタッフ種別設定</h4>
				<button
					type="button"
					onclick={() => { showAddForm = !showAddForm; }}
					class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
				>
					<span class="material-symbols-rounded text-base">add</span>
					追加
				</button>
			</div>

			{#if showAddForm}
				<div class="mb-4 p-4 rounded-lg border border-blue-200 bg-blue-50">
					<h5 class="font-medium text-blue-800 mb-3">新しい個別制限</h5>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<!-- Scope selector -->
						<div class="md:col-span-2">
							<label class="block text-sm font-medium text-gray-700 mb-1">対象スコープ</label>
							<div class="flex gap-2">
								{#each [['individual','個別スタッフ'], ['staff_status','スタッフ種別']] as [val, label]}
									<button
										type="button"
										onclick={() => { addForm.scope = val as 'individual' | 'staff_status'; addForm.targetIds = []; }}
										class="px-3 py-1.5 text-sm rounded-lg border-2 transition-colors {addForm.scope === val ? 'border-blue-500 bg-blue-100 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}"
									>
										{label}
									</button>
								{/each}
							</div>
						</div>

						<!-- Target IDs picker -->
						<div class="md:col-span-2">
							<label class="block text-sm font-medium text-gray-700 mb-1">
								{addForm.scope === 'individual' ? 'スタッフを選択' : 'スタッフ種別を選択'}
							</label>
							<div class="flex flex-wrap gap-2">
								{#if addForm.scope === 'individual'}
									{#each activeStaff as s}
										<button
											type="button"
											onclick={() => {
												if (addForm.targetIds.includes(s.id)) {
													addForm.targetIds = addForm.targetIds.filter(id => id !== s.id);
												} else {
													addForm.targetIds = [...addForm.targetIds, s.id];
												}
											}}
											class="px-2.5 py-1 text-xs rounded-full border transition-colors {addForm.targetIds.includes(s.id) ? 'border-blue-500 bg-blue-100 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}"
										>
											{s.name}
										</button>
									{/each}
								{:else}
									{#each STAFF_STATUS_OPTIONS as status}
										<button
											type="button"
											onclick={() => {
												if (addForm.targetIds.includes(status)) {
													addForm.targetIds = addForm.targetIds.filter(s => s !== status);
												} else {
													addForm.targetIds = [...addForm.targetIds, status];
												}
											}}
											class="px-3 py-1.5 text-sm rounded-full border transition-colors {addForm.targetIds.includes(status) ? 'border-blue-500 bg-blue-100 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}"
										>
											{status}
										</button>
									{/each}
								{/if}
							</div>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">最小休み日数</label>
							<input type="number" class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none" bind:value={addForm.min_count} min="0" />
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">最大休み日数</label>
							<input type="number" class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none" bind:value={addForm.max_count} min="0" />
						</div>
						<div class="flex items-center gap-3">
							<label class="flex items-center gap-2 cursor-pointer">
								<input type="checkbox" bind:checked={addForm.is_hard_constraint} class="w-4 h-4 rounded border-gray-300 text-blue-600" />
								<span class="text-sm font-medium text-gray-700">ハード制約</span>
							</label>
						</div>
					</div>
					<div class="mt-4 flex justify-end gap-2">
						<button type="button" onclick={() => { showAddForm = false; }} class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
						<button
							type="button"
							onclick={addMonthlyLimitRecord}
							disabled={isSaving || (addForm.scope !== 'all' && addForm.targetIds.length === 0)}
							class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
						>
							{isSaving ? '保存中...' : '追加'}
						</button>
					</div>
				</div>
			{/if}

			{#if loadingMonthlyRecords}
				<div class="text-sm text-gray-400 py-4 text-center">読み込み中...</div>
			{:else}
				{@const individualRecords = allMonthlyLimitRecords.filter(r => (r.limit_config?.scope || 'all') !== 'all')}
				{#if individualRecords.length === 0}
					<div class="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">個別設定はありません。「追加」ボタンで追加できます。</div>
				{:else}
					<div class="space-y-2">
						{#each individualRecords as record}
							{#if editingId === record.id}
								<!-- Inline edit form -->
								<div class="rounded-lg border-2 border-blue-300 bg-blue-50 p-4" use:clickOutside={cancelEdit}>
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										<!-- Scope -->
										<div class="md:col-span-2">
											<label class="block text-xs font-medium text-gray-600 mb-1">対象スコープ</label>
											<div class="flex gap-2">
												{#each [['individual','個別スタッフ'], ['staff_status','スタッフ種別']] as [val, lbl]}
													<button type="button"
														onclick={() => { editForm.scope = val as 'individual' | 'staff_status'; editForm.targetIds = []; }}
														class="px-3 py-1.5 text-xs rounded-lg border-2 transition-colors {editForm.scope === val ? 'border-blue-500 bg-blue-100 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-white'}"
													>{lbl}</button>
												{/each}
											</div>
										</div>
										<!-- Target picker -->
										<div class="md:col-span-2">
											<label class="block text-xs font-medium text-gray-600 mb-1">
												{editForm.scope === 'individual' ? 'スタッフ' : 'スタッフ種別'}
											</label>
											<div class="flex flex-wrap gap-1.5">
												{#if editForm.scope === 'individual'}
													{#each activeStaff as s}
														<button type="button"
															onclick={() => {
																if (editForm.targetIds.includes(s.id)) {
																	editForm.targetIds = editForm.targetIds.filter(id => id !== s.id);
																} else {
																	editForm.targetIds = [...editForm.targetIds, s.id];
																}
															}}
															class="px-2.5 py-1 text-xs rounded-full border transition-colors {editForm.targetIds.includes(s.id) ? 'border-blue-500 bg-blue-100 text-blue-700' : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'}"
														>{s.name}</button>
													{/each}
												{:else}
													{#each STAFF_STATUS_OPTIONS as status}
														<button type="button"
															onclick={() => {
																if (editForm.targetIds.includes(status)) {
																	editForm.targetIds = editForm.targetIds.filter(s => s !== status);
																} else {
																	editForm.targetIds = [...editForm.targetIds, status];
																}
															}}
															class="px-3 py-1.5 text-xs rounded-full border transition-colors {editForm.targetIds.includes(status) ? 'border-blue-500 bg-blue-100 text-blue-700' : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'}"
														>{status}</button>
													{/each}
												{/if}
											</div>
										</div>
										<!-- Min/Max -->
										<div>
											<label class="block text-xs font-medium text-gray-600 mb-1">最小休み日数</label>
											<input type="number" class="w-full border rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white" bind:value={editForm.min_count} min="0" max="31" />
										</div>
										<div>
											<label class="block text-xs font-medium text-gray-600 mb-1">最大休み日数</label>
											<input type="number" class="w-full border rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white" bind:value={editForm.max_count} min="0" max="31" />
										</div>
										<!-- Toggles -->
										<div class="flex items-center gap-4">
											<label class="flex items-center gap-2 cursor-pointer">
												<input type="checkbox" bind:checked={editForm.is_hard_constraint} class="w-4 h-4 rounded border-gray-300 text-blue-600" />
												<span class="text-xs font-medium text-gray-700">ハード制約</span>
											</label>
											<label class="flex items-center gap-2 cursor-pointer">
												<input type="checkbox" bind:checked={editForm.exclude_calendar_rules} class="w-4 h-4 rounded border-gray-300 text-blue-600" />
												<span class="text-xs font-medium text-gray-700">カレンダー除外</span>
											</label>
										</div>
									</div>
									<div class="mt-4 flex items-center justify-between">
										<button type="button" onclick={() => removeMonthlyLimitRecord(record.id)} disabled={isSaving}
											class="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 flex items-center gap-1">
											<span class="material-symbols-rounded text-sm">delete</span>削除
										</button>
										<div class="flex gap-2">
											<button type="button" onclick={cancelEdit} class="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-white">キャンセル</button>
											<button type="button" onclick={() => saveEdit(record.id)} disabled={isSaving || editForm.targetIds.length === 0}
												class="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
												{isSaving ? '保存中...' : '保存'}
											</button>
										</div>
									</div>
								</div>
							{:else}
								<!-- Collapsed row — click to edit -->
								<button
									type="button"
									onclick={() => openEdit(record)}
									class="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 bg-white transition-colors text-left"
								>
									<span class="material-symbols-rounded text-gray-400 text-base shrink-0">edit</span>
									<div class="flex-1 min-w-0">
										<div class="text-sm font-medium text-gray-800 truncate">{getScopeLabel(record)}</div>
										<div class="text-xs text-gray-500 mt-0.5">
											休み: {resolveCount(record.limit_config, 'minCount', record.min_count, 0)}〜{resolveCount(record.limit_config, 'maxCount', record.max_count, 10)}日
											{record.is_hard_constraint ? ' · ハード' : ' · ソフト'}
										</div>
									</div>
									<span class="material-symbols-rounded text-gray-300 text-base shrink-0">chevron_right</span>
								</button>
							{/if}
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	{/if}

	<!-- Solver Config Section -->
	{#if activeSection === 'solver'}
		<div class="rounded-lg border border-gray-200 bg-white p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">ソルバー設定</h3>
			<p class="text-sm text-gray-600 mb-6">OR-Toolsの制約モードとペナルティウェイトを設定します。</p>

			<!-- OR-Tools info banner -->
			<div class="mb-6 flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
				<span class="material-symbols-rounded text-blue-600 mt-0.5 shrink-0">auto_fix_high</span>
				<div>
					<span class="font-medium">OR-Tools連携：</span>
					ハード制約は必ず守られます（違反時は解なし）。ソフト制約はペナルティで調整され、スケジュール生成に柔軟性を持たせます。
				</div>
			</div>

			<!-- 5-day rest constraint -->
			<div class="mb-6 p-4 rounded-lg border border-orange-200 bg-orange-50">
				<h4 class="font-semibold text-orange-800 mb-3 flex items-center gap-2">
					<span class="material-symbols-rounded text-orange-600">calendar_today</span>
					5連勤制限（労働基準法）
				</h4>
				<p class="text-sm text-orange-700 mb-4">6日間のウィンドウで最低1日の休みを確保します（最大5連続勤務日）。</p>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="p-3 rounded-lg bg-white border border-orange-200">
						<label class="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={solverForm.fiveDayRestIsHard}
								onchange={markChanged}
								class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							/>
							<div>
								<span class="font-medium text-gray-900">ハード制約として設定</span>
								<p class="text-sm text-gray-500">チェックすると必ず守られます（解なしになる可能性あり）</p>
							</div>
						</label>
					</div>
					<div class:opacity-50={solverForm.fiveDayRestIsHard}>
						<label class="block text-sm font-medium text-gray-700 mb-1">ペナルティウェイト（ソフト時）</label>
						<input
							type="number"
							class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none disabled:opacity-50"
							bind:value={solverForm.penaltyFiveDayRest}
							onchange={markChanged}
							disabled={solverForm.fiveDayRestIsHard}
							min="0"
							max="10000"
						/>
						<p class="text-xs text-gray-500 mt-1">大きいほど優先度が高い（デフォルト: 200）</p>
					</div>
				</div>
			</div>

			<!-- Penalty weights -->
			<div class="p-4 rounded-lg border border-gray-200">
				<h4 class="font-semibold text-gray-800 mb-3">ペナルティウェイト</h4>
				<p class="text-sm text-gray-600 mb-4">値が大きいほど、その制約の違反を避けようとします。</p>
				<div class="grid grid-cols-2 md:grid-cols-3 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">スタッフグループ</label>
						<input
							type="number"
							class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
							bind:value={solverForm.penaltyStaffGroup}
							onchange={markChanged}
							min="0"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">月次制限</label>
						<input
							type="number"
							class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
							bind:value={solverForm.penaltyMonthlyLimit}
							onchange={markChanged}
							min="0"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">日次制限（最大超過）</label>
						<input
							type="number"
							class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
							bind:value={solverForm.penaltyDailyLimitMax}
							onchange={markChanged}
							min="0"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">日次制限（最小未満）</label>
						<input
							type="number"
							class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
							bind:value={solverForm.penaltyDailyLimitMin}
							onchange={markChanged}
							min="0"
						/>
					</div>
					<div class:opacity-50={solverForm.disableAdjacentConflict}>
						<label class="block text-sm font-medium text-gray-700 mb-1">隣接シフト矛盾</label>
						<input
							type="number"
							class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
							bind:value={solverForm.penaltyAdjacentConflict}
							onchange={markChanged}
							disabled={solverForm.disableAdjacentConflict}
							min="0"
						/>
						<p class="text-xs text-gray-500 mt-1">休み→早番など連続不整合</p>
					</div>
					<div class:opacity-50={solverForm.disableStaffStatusShiftRestrictions}>
						<label class="block text-sm font-medium text-gray-700 mb-1">雇用形態シフト制限違反</label>
						<input
							type="number"
							class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
							bind:value={solverForm.penaltyStaffStatusShift}
							onchange={markChanged}
							disabled={solverForm.disableStaffStatusShiftRestrictions}
							min="0"
						/>
						<p class="text-xs text-gray-500 mt-1">派遣/パートの禁止シフト違反（デフォルト: 150）</p>
					</div>
				</div>
			</div>

			<!-- Staff status shift restrictions toggle -->
			<div class="mt-4 p-4 rounded-lg border border-gray-200">
				<h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
					<span class="material-symbols-rounded text-gray-600 text-lg">manage_accounts</span>
					雇用形態シフト制限
				</h4>
				<p class="text-sm text-gray-600 mb-3">派遣・パートスタッフへの早番/遅番制限を設定します。</p>
				<div class="p-3 rounded-lg bg-gray-50 border border-gray-200">
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={solverForm.disableStaffStatusShiftRestrictions}
							onchange={markChanged}
							class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<div>
							<span class="font-medium text-gray-900">制限を無効化</span>
							<p class="text-sm text-gray-500">チェックすると派遣/パートが早番・遅番に自由にアサインされます</p>
						</div>
					</label>
				</div>
			</div>

			<!-- Adjacent conflict toggle -->
			<div class="mt-4 p-4 rounded-lg border border-gray-200">
				<h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
					<span class="material-symbols-rounded text-gray-600 text-lg">swap_horiz</span>
					隣接シフト矛盾防止
				</h4>
				<p class="text-sm text-gray-600 mb-3">休み→早番など前日との不整合シフトを防止します。</p>
				<div class="p-3 rounded-lg bg-gray-50 border border-gray-200">
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={solverForm.disableAdjacentConflict}
							onchange={markChanged}
							class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<div>
							<span class="font-medium text-gray-900">防止を無効化</span>
							<p class="text-sm text-gray-500">チェックすると隣接シフト矛盾チェックをスキップします</p>
						</div>
					</label>
				</div>
			</div>

			<!-- Post-period constraint -->
			<div class="mt-4 p-4 rounded-lg border border-purple-200 bg-purple-50">
				<h4 class="font-semibold text-purple-800 mb-3 flex items-center gap-2">
					<span class="material-symbols-rounded text-purple-600">event_available</span>
					クローズ後の制約（ポストピリオド）
				</h4>
				<p class="text-sm text-purple-700 mb-4">連続閉店日の翌日に休みを取らせないよう制限します。</p>
				<div class="space-y-4">
					<div class="p-3 rounded-lg bg-white border border-purple-200">
						<label class="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={solverForm.postPeriodEnabled}
								onchange={markChanged}
								class="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
							/>
							<div>
								<span class="font-medium text-gray-900">制約を有効化</span>
								<p class="text-sm text-gray-500">クローズ期間後のポストピリオド制約を使用する</p>
							</div>
						</label>
					</div>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4" class:opacity-50={!solverForm.postPeriodEnabled}>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">保護日数</label>
							<input
								type="number"
								class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
								bind:value={solverForm.postPeriodDays}
								onchange={markChanged}
								disabled={!solverForm.postPeriodEnabled}
								min="1"
								max="7"
							/>
							<p class="text-xs text-gray-500 mt-1">閉店後に保護する日数（デフォルト: 2）</p>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">最小クローズ日数</label>
							<input
								type="number"
								class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
								bind:value={solverForm.postPeriodMinLength}
								onchange={markChanged}
								disabled={!solverForm.postPeriodEnabled}
								min="1"
								max="14"
							/>
							<p class="text-xs text-gray-500 mt-1">制約を発動する最小連続閉店日数（デフォルト: 3）</p>
						</div>
						<div class="p-3 rounded-lg bg-white border border-purple-200" class:opacity-100={solverForm.postPeriodEnabled}>
							<label class="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									bind:checked={solverForm.postPeriodIsHard}
									onchange={markChanged}
									disabled={!solverForm.postPeriodEnabled}
									class="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
								/>
								<div>
									<span class="font-medium text-gray-900 text-sm">ハード制約</span>
									<p class="text-xs text-gray-500">チェックで必須（ソフトはペナルティで調整）</p>
								</div>
							</label>
						</div>
					</div>
				</div>
			</div>

			<!-- Save Button -->
			<div class="mt-6 flex justify-end">
				<button
					type="button"
					onclick={saveSolverConfig}
					disabled={isSaving}
					class="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{isSaving ? '保存中...' : 'ソルバー設定を保存'}
				</button>
			</div>
		</div>
	{/if}

	<!-- Staff Type Limits Section -->
	{#if activeSection === 'staff_type'}
		<div class="rounded-lg border border-gray-200 bg-white p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">スタッフタイプ別制限</h3>
			<p class="text-sm text-gray-600 mb-6">雇用形態ごとに1日あたりの休み人数を制限します。</p>

			<!-- OR-Tools info banner -->
			<div class="mb-6 flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
				<span class="material-symbols-rounded text-blue-600 mt-0.5 shrink-0">auto_fix_high</span>
				<div>
					<span class="font-medium">OR-Tools連携：</span>
					雇用形態ごとの制限は <code class="bg-blue-100 px-1 rounded">limit_config.staffTypeLimits</code> に保存され、OR-Toolsが各タイプの同日休み人数を制御します。
				</div>
			</div>

			<div class="space-y-4">
				{#each Object.entries(staffTypeLimits) as [type, limits]}
					<div class="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
						<div class="flex items-center justify-between mb-4">
							<div class="flex items-center gap-2">
								<span class="px-3 py-1 rounded-full text-sm font-medium
									{type === '社員' ? 'bg-blue-100 text-blue-800' :
									 type === '派遣' ? 'bg-green-100 text-green-800' :
									 'bg-purple-100 text-purple-800'}">
									{type}
								</span>
							</div>
						</div>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">最小休み人数/日</label>
								<input
									type="number"
									class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
									bind:value={limits.minOff}
									onchange={markChanged}
									min="0"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">最大休み人数/日</label>
								<input
									type="number"
									class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
									bind:value={limits.maxOff}
									onchange={markChanged}
									min="0"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">最大早番人数/日</label>
								<input
									type="number"
									class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
									bind:value={limits.maxEarly}
									onchange={markChanged}
									min="0"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">最大早番数/月</label>
								<input
									type="number"
									class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
									bind:value={limits.maxMonthlyEarlyShifts}
									onchange={markChanged}
									min="0"
								/>
								<p class="text-xs text-gray-500 mt-1">月間の最大早番回数（未設定時はデフォルト値を使用）</p>
							</div>
							<div class="flex items-center pt-2">
								<label class="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										bind:checked={limits.isHard}
										onchange={markChanged}
										class="w-4 h-4 rounded border-gray-300 text-blue-600"
									/>
									<span class="text-sm font-medium text-gray-700">ハード制約</span>
								</label>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Save Button -->
			<div class="mt-6 flex justify-end">
				<button
					type="button"
					onclick={saveStaffTypeLimits}
					disabled={isSaving}
					class="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{isSaving ? '保存中...' : 'スタッフタイプ別制限を保存'}
				</button>
			</div>
		</div>
	{/if}
</div>

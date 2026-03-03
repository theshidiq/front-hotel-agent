<script lang="ts">
	import { untrack } from 'svelte';
	import type { DailyLimits, MonthlyLimits, ORToolsSolverConfig } from '$lib/shifts/types';
	import { updateDailyLimits, updateMonthlyLimits, updateSolverConfig } from '$lib/shifts/api';

	interface Props {
		dailyLimits: DailyLimits | null;
		monthlyLimits: MonthlyLimits | null;
		solverConfig: ORToolsSolverConfig | null;
		onSave: () => Promise<void>;
	}

	let { dailyLimits, monthlyLimits, solverConfig, onSave }: Props = $props();

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

	// Monthly limits form
	let monthlyForm = $state({
		min_count: 6,
		max_count: 10,
		is_hard_constraint: false,
		exclude_calendar_rules: true
	});

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
			await updateDailyLimits(dailyForm);
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
			await updateMonthlyLimits(monthlyForm);
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
			await updateDailyLimits({ staffTypeLimits });
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
			<p class="text-sm text-gray-600 mb-6">1ヶ月あたりの休み日数の制限を設定します。</p>

			<!-- OR-Tools info banner -->
			<div class="mb-6 flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
				<span class="material-symbols-rounded text-blue-600 mt-0.5 shrink-0">auto_fix_high</span>
				<div>
					<span class="font-medium">OR-Tools連携：</span>
					各スタッフの月間休み日数がこの範囲に収まるよう調整します。公平な休み分配を実現します。
				</div>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div class="space-y-4 p-4 rounded-lg bg-purple-50 border border-purple-200">
					<h4 class="font-medium text-purple-800">月間休み日数</h4>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">最小休み日数</label>
						<input
							type="number"
							class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
							bind:value={monthlyForm.min_count}
							onchange={markChanged}
							min="0"
						/>
						<p class="text-xs text-gray-500 mt-1">各スタッフは最低この日数休める</p>
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
						<p class="text-xs text-gray-500 mt-1">各スタッフの休みはこの日数まで</p>
					</div>
				</div>

				<div class="space-y-4">
					<!-- Hard Constraint -->
					<div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
						<label class="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={monthlyForm.is_hard_constraint}
								onchange={markChanged}
								class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							/>
							<div>
								<span class="font-medium text-gray-900">ハード制約</span>
								<p class="text-sm text-gray-500">必ず守る制約として設定</p>
							</div>
						</label>
					</div>

					<!-- Exclude Calendar Rules -->
					<div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
						<label class="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={monthlyForm.exclude_calendar_rules}
								onchange={markChanged}
								class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							/>
							<div>
								<span class="font-medium text-gray-900">カレンダールールを除外</span>
								<p class="text-sm text-gray-500">カレンダールールの休みをカウントから除外</p>
							</div>
						</label>
					</div>
				</div>
			</div>

			<!-- Save Button -->
			<div class="mt-6 flex justify-end">
				<button
					type="button"
					onclick={saveMonthlyLimits}
					disabled={isSaving}
					class="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{isSaving ? '保存中...' : '月次制限を保存'}
				</button>
			</div>
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

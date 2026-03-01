<script lang="ts">
	import type { DailyLimits, MonthlyLimits } from '$lib/shifts/types';
	import { getDailyLimits, updateDailyLimits, getMonthlyLimits, updateMonthlyLimits } from '$lib/shifts/api';

	interface Props {
		dailyLimits: DailyLimits | null;
		monthlyLimits: MonthlyLimits | null;
		onSave: () => Promise<void>;
	}

	let { dailyLimits, monthlyLimits, onSave }: Props = $props();

	// Active section
	let activeSection = $state<'daily' | 'monthly' | 'staff_type'>('daily');

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

	// Staff type limits (future feature)
	let staffTypeLimits = $state<Record<string, { minOff: number; maxOff: number }>>({
		'社員': { minOff: 1, maxOff: 2 },
		'派遣': { minOff: 1, maxOff: 2 },
		'パート': { minOff: 1, maxOff: 2 }
	});

	// State
	let isSaving = $state(false);
	let hasChanges = $state(false);
	let feedbackMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// Initialize forms from props
	$effect(() => {
		if (dailyLimits) {
			dailyForm = {
				minOffPerDay: dailyLimits.limit_config.minOffPerDay ?? 2,
				maxOffPerDay: dailyLimits.limit_config.maxOffPerDay ?? 4,
				minEarlyPerDay: dailyLimits.limit_config.minEarlyPerDay ?? 1,
				maxEarlyPerDay: dailyLimits.limit_config.maxEarlyPerDay ?? 3,
				minWorkingStaffPerDay: dailyLimits.limit_config.minWorkingStaffPerDay ?? 5,
				is_hard_constraint: dailyLimits.is_hard_constraint ?? false
			};
		}
		if (monthlyLimits) {
			monthlyForm = {
				min_count: monthlyLimits.min_count ?? 6,
				max_count: monthlyLimits.max_count ?? 10,
				is_hard_constraint: monthlyLimits.is_hard_constraint ?? false,
				exclude_calendar_rules: true
			};
		}
		hasChanges = false;
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
			// TODO: Implement staff type limits API
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
	</div>

	<!-- Daily Limits Section -->
	{#if activeSection === 'daily'}
		<div class="rounded-lg border border-gray-200 bg-white p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">日次制限設定</h3>
			<p class="text-sm text-gray-600 mb-6">1日あたりの休みや早番の人数制限を設定します。</p>

			<!-- Info Box -->
			<div class="mb-6 rounded-lg bg-blue-50 p-4 border border-blue-200">
				<div class="flex items-start gap-3">
					<svg class="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clip-rule="evenodd"
						/>
					</svg>
					<div class="text-sm text-blue-800">
						<p class="font-medium mb-1">日次制限について</p>
						<p>毎日の出勤バランスを維持するための制限です。ハード制約に設定すると、必ず守られます。</p>
					</div>
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

			<!-- Info Box -->
			<div class="mb-6 rounded-lg bg-blue-50 p-4 border border-blue-200">
				<div class="flex items-start gap-3">
					<svg class="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clip-rule="evenodd"
						/>
					</svg>
					<div class="text-sm text-blue-800">
						<p class="font-medium mb-1">月次制限について</p>
						<p>各スタッフの月間休み日数を管理します。公平な休み分配のために使用されます。</p>
					</div>
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

	<!-- Staff Type Limits Section -->
	{#if activeSection === 'staff_type'}
		<div class="rounded-lg border border-gray-200 bg-white p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">スタッフタイプ別制限</h3>
			<p class="text-sm text-gray-600 mb-6">雇用形態ごとに1日あたりの休み人数を制限します。</p>

			<!-- Info Box -->
			<div class="mb-6 rounded-lg bg-yellow-50 p-4 border border-yellow-200">
				<div class="flex items-start gap-3">
					<svg class="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
					<div class="text-sm text-yellow-800">
						<p class="font-medium mb-1">スタッフタイプ別制限について</p>
						<p>社員・派遣・パートなど、雇用形態ごとに同時に休める人数を制限できます。</p>
					</div>
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
								<label class="block text-sm font-medium text-gray-700 mb-1">最小休み人数</label>
								<input
									type="number"
									class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
									bind:value={limits.minOff}
									onchange={markChanged}
									min="0"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">最大休み人数</label>
								<input
									type="number"
									class="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
									bind:value={limits.maxOff}
									onchange={markChanged}
									min="0"
								/>
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

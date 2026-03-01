<script lang="ts">
	import type { PeriodConfiguration } from '$lib/shifts/api';
	import type { SchedulePeriod } from '$lib/shifts/types';
	import { updatePeriodConfiguration, regeneratePeriods } from '$lib/shifts/api';

	interface Props {
		periodConfig: PeriodConfiguration | null;
		periods: SchedulePeriod[];
		onSave: () => Promise<void>;
	}

	let { periodConfig = null, periods = [], onSave }: Props = $props();

	// Local state using SvelteKit 5 runes
	let startDay = $state(periodConfig?.start_day ?? 1);
	let endDay = $state(periodConfig?.end_day ?? 31);
	let isSaving = $state(false);
	let isRegenerating = $state(false);
	let showConfirmModal = $state(false);
	let feedbackMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// Update local state when props change
	$effect(() => {
		if (periodConfig) {
			startDay = periodConfig.start_day;
			endDay = periodConfig.end_day;
		}
	});

	// Common preset configurations
	const presets = [
		{ label: '1日〜末日', startDay: 1, endDay: 31 },
		{ label: '21日〜20日', startDay: 21, endDay: 20 },
		{ label: '16日〜15日', startDay: 16, endDay: 15 },
		{ label: '26日〜25日', startDay: 26, endDay: 25 }
	];

	// Derived explanation text
	const periodExplanation = $derived(() => {
		if (endDay >= startDay) {
			return `毎月${startDay}日から${endDay}日まで`;
		} else {
			return `毎月${startDay}日から翌月${endDay}日まで`;
		}
	});

	// Date formatting helper
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
	}

	// Calculate number of days in period
	function calculateDays(start: string, end: string): number {
		const startDate = new Date(start);
		const endDate = new Date(end);
		const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
	}

	// Apply preset
	function applyPreset(preset: { startDay: number; endDay: number }) {
		startDay = preset.startDay;
		endDay = preset.endDay;
	}

	// Save configuration
	async function handleSave() {
		isSaving = true;
		feedbackMessage = null;

		try {
			await updatePeriodConfiguration({
				start_day: startDay,
				end_day: endDay
			});

			await onSave();

			feedbackMessage = {
				type: 'success',
				text: '期間設定を保存しました'
			};

			// Auto-hide success message after 3 seconds
			setTimeout(() => {
				feedbackMessage = null;
			}, 3000);
		} catch (error) {
			feedbackMessage = {
				type: 'error',
				text: `保存に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
			};
		} finally {
			isSaving = false;
		}
	}

	// Regenerate periods
	async function handleRegenerate() {
		isRegenerating = true;
		feedbackMessage = null;

		try {
			await regeneratePeriods();
			await onSave();

			showConfirmModal = false;
			feedbackMessage = {
				type: 'success',
				text: '期間を再生成しました'
			};

			// Auto-hide success message after 3 seconds
			setTimeout(() => {
				feedbackMessage = null;
			}, 3000);
		} catch (error) {
			feedbackMessage = {
				type: 'error',
				text: `再生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
			};
		} finally {
			isRegenerating = false;
		}
	}

	// Generate day options (1-31)
	const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);
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

	<!-- Period Configuration Section -->
	<div class="rounded-lg border border-gray-200 bg-white p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">期間設定</h3>

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
					<p class="font-medium mb-1">シフト期間について</p>
					<p>スケジュール期間は月をまたいで設定できます。例えば「21日〜20日」とすると、毎月21日から翌月20日までが1つの期間になります。</p>
				</div>
			</div>
		</div>

		<!-- Day Selectors -->
		<div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<label for="start-day" class="block text-sm font-medium text-gray-700 mb-2">
					開始日
				</label>
				<select
					id="start-day"
					bind:value={startDay}
					class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
				>
					{#each dayOptions as day}
						<option value={day}>{day}日</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="end-day" class="block text-sm font-medium text-gray-700 mb-2">
					終了日
				</label>
				<select
					id="end-day"
					bind:value={endDay}
					class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
				>
					{#each dayOptions as day}
						<option value={day}>{day}日</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Period Explanation -->
		<div class="mb-6 rounded-lg bg-gray-50 p-4 border border-gray-200">
			<p class="text-sm text-gray-600 mb-1">設定内容:</p>
			<p class="text-lg font-semibold text-gray-900">{periodExplanation()}</p>
		</div>

		<!-- Preset Buttons -->
		<div class="mb-6">
			<p class="text-sm font-medium text-gray-700 mb-3">よく使う設定:</p>
			<div class="flex flex-wrap gap-2">
				{#each presets as preset}
					<button
						type="button"
						onclick={() => applyPreset(preset)}
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
					>
						{preset.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Save Button -->
		<div class="flex justify-end">
			<button
				type="button"
				onclick={handleSave}
				disabled={isSaving}
				class="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				{isSaving ? '保存中...' : '設定を保存'}
			</button>
		</div>
	</div>

	<!-- Current Periods Display -->
	<div class="rounded-lg border border-gray-200 bg-white p-6">
		<div class="flex items-center justify-between mb-4">
			<h3 class="text-lg font-semibold text-gray-900">現在の期間 (次の6ヶ月)</h3>
			<button
				type="button"
				onclick={() => (showConfirmModal = true)}
				class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
			>
				期間を再生成
			</button>
		</div>

		{#if periods.length === 0}
			<div class="text-center py-8 text-gray-500">
				<p>期間が設定されていません</p>
				<p class="text-sm mt-2">上記の設定を保存後、期間を再生成してください</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each periods as period}
					<div class="rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
						<div class="flex items-center justify-between">
							<div>
								<h4 class="font-semibold text-gray-900">{period.label}</h4>
								<p class="text-sm text-gray-600 mt-1">
									{formatDate(period.start_date)} 〜 {formatDate(period.end_date)}
								</p>
							</div>
							<div class="text-right">
								<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
									{calculateDays(period.start_date, period.end_date)}日間
								</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Info Box for Regeneration -->
	<div class="rounded-lg bg-yellow-50 p-4 border border-yellow-200">
		<div class="flex items-start gap-3">
			<svg class="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
				<path
					fill-rule="evenodd"
					d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
					clip-rule="evenodd"
				/>
			</svg>
			<div class="text-sm text-yellow-800">
				<p class="font-medium mb-1">期間の再生成について</p>
				<p>
					期間を再生成すると、現在の設定に基づいて今後6ヶ月分の期間が作り直されます。既存のスケジュールデータは影響を受けませんが、期間の区切りが変わります。
				</p>
			</div>
		</div>
	</div>
</div>

<!-- Confirmation Modal -->
{#if showConfirmModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">期間の再生成</h3>
			<p class="text-sm text-gray-600 mb-6">
				現在の設定に基づいて期間を再生成します。この操作により、既存の期間定義が更新されます。続行しますか?
			</p>
			<div class="flex justify-end gap-3">
				<button
					type="button"
					onclick={() => (showConfirmModal = false)}
					disabled={isRegenerating}
					class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					キャンセル
				</button>
				<button
					type="button"
					onclick={handleRegenerate}
					disabled={isRegenerating}
					class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{isRegenerating ? '再生成中...' : '再生成する'}
				</button>
			</div>
		</div>
	</div>
{/if}

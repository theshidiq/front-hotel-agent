<script lang="ts">
	import type { CalendarRule } from '$lib/shifts/types';
	import { getCalendarRules, createCalendarRule, deleteCalendarRule } from '$lib/shifts/api';
	import { Calendar, Plus, Trash2, X } from 'lucide-svelte';

	interface Props {
		calendarRules: CalendarRule[];
		onRulesChange: () => Promise<void>;
	}

	let { calendarRules, onRulesChange }: Props = $props();

	// State
	let loading = $state(false);
	let showModal = $state(false);
	let feedbackMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// Form state
	let ruleForm = $state({
		date: '',
		rule_type: 'must_day_off' as 'must_work' | 'must_day_off',
		reason: ''
	});

	// Group rules by month
	let rulesByMonth = $derived(() => {
		const grouped: Record<string, CalendarRule[]> = {};

		calendarRules.forEach(rule => {
			const date = new Date(rule.date);
			const monthKey = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`;

			if (!grouped[monthKey]) {
				grouped[monthKey] = [];
			}
			grouped[monthKey].push(rule);
		});

		// Sort rules within each month
		Object.keys(grouped).forEach(key => {
			grouped[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
		});

		// Sort months
		return Object.fromEntries(
			Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))
		);
	});

	// Date formatting
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
		return `${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`;
	}

	function formatFullDate(dateStr: string): string {
		const date = new Date(dateStr);
		const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
		return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${weekdays[date.getDay()]})`;
	}

	// Open add modal
	function openAddModal() {
		ruleForm = {
			date: '',
			rule_type: 'must_day_off',
			reason: ''
		};
		showModal = true;
	}

	// Save rule
	async function saveRule() {
		if (!ruleForm.date) return;

		loading = true;
		feedbackMessage = null;

		try {
			await createCalendarRule(ruleForm);
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

	// Delete rule
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
			await createCalendarRule({
				date,
				rule_type: 'must_day_off',
				reason: holiday.label
			});
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

	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h3 class="text-lg font-semibold text-gray-900">カレンダールール</h3>
			<p class="text-sm text-gray-600">特定の日に全員休みまたは全員出勤を設定します。</p>
		</div>
		<button
			type="button"
			onclick={openAddModal}
			class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
		>
			<Plus class="w-4 h-4" />
			ルール追加
		</button>
	</div>

	<!-- Info Box -->
	<div class="rounded-lg bg-blue-50 p-4 border border-blue-200">
		<div class="flex items-start gap-3">
			<Calendar class="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
			<div class="text-sm text-blue-800">
				<p class="font-medium mb-1">カレンダールールについて</p>
				<p>祝日や定休日など、特定の日に全員休みまたは全員出勤を設定できます。ここで設定したルールはシフト生成時に自動的に適用されます。</p>
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

	<!-- Rules List -->
	{#if calendarRules.length === 0}
		<div class="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
			<Calendar class="w-12 h-12 text-gray-400 mx-auto mb-4" />
			<p class="text-gray-500 font-medium">カレンダールールがありません</p>
			<p class="text-sm text-gray-400 mt-1">上のボタンからルールを追加してください</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each Object.entries(rulesByMonth) as [month, rules]}
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
</div>

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

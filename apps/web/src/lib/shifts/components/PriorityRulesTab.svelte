<script lang="ts">
	import { createPriorityRule, updatePriorityRule, deletePriorityRule } from '$lib/shifts/api';
	import type { PriorityRule } from '$lib/shifts/api';
	import type { ScheduleStaff } from '$lib/shifts/types';

	interface Props {
		priorityRules: PriorityRule[];
		allStaff: ScheduleStaff[];
		onRulesChange: () => Promise<void>;
		departmentId?: string;
	}

	let { priorityRules, allStaff, onRulesChange, departmentId }: Props = $props();

	// State
	let isCreating = $state(false);
	let editingRuleId = $state<string | null>(null);
	let filterStaffId = $state<string>('');
	let isLoading = $state(false);
	let deleteConfirmRuleId = $state<string | null>(null);
	let formError = $state<string | null>(null);
	let formSuccess = $state<string | null>(null);

	// Form state
	let formData = $state<Partial<PriorityRule>>({
		name: '',
		description: '',
		staff_ids: [],
		rule_type: 'preferred_shift',
		shift_type: 'any',
		days_of_week: [],
		allowed_shifts: [],
		priority_level: 50,
		is_hard_constraint: false,
		penalty_weight: 50,
		is_active: true
	});

	// Rule type configurations
	const ruleTypes = [
		{
			value: 'preferred_shift',
			label: '希望シフト',
			icon: '⭐',
			description: 'スタッフが希望するシフト'
		},
		{
			value: 'avoid_shift',
			label: '回避シフト',
			icon: '❌',
			description: '可能な限り避けるシフト'
		},
		{
			value: 'required_off',
			label: '必須休み',
			icon: '🏠',
			description: '必ず休みにする日'
		},
		{
			value: 'avoid_shift_with_exceptions',
			label: '例外付き回避',
			icon: '🚫',
			description: '特定のシフトを除いて回避'
		}
	] as const;

	const shiftTypes = [
		{ value: 'early', label: '早番', symbol: '△' },
		{ value: 'late', label: '遅番', symbol: '◇' },
		{ value: 'off', label: '休み', symbol: '×' },
		{ value: 'any', label: 'すべて', symbol: '全' }
	] as const;

	const daysOfWeek = [
		{ value: 0, label: '日', short: '日' },
		{ value: 1, label: '月', short: '月' },
		{ value: 2, label: '火', short: '火' },
		{ value: 3, label: '水', short: '水' },
		{ value: 4, label: '木', short: '木' },
		{ value: 5, label: '金', short: '金' },
		{ value: 6, label: '土', short: '土' }
	] as const;

	// Derived state
	const filteredRules = $derived(
		filterStaffId
			? priorityRules.filter(
					(rule) => rule.staff_ids && rule.staff_ids.includes(filterStaffId)
				)
			: priorityRules
	);

	const activeRule = $derived(
		editingRuleId ? priorityRules.find((r) => r.id === editingRuleId) : null
	);

	const showExceptionShifts = $derived(formData.rule_type === 'avoid_shift_with_exceptions');

	// Helper functions
	function getRuleTypeConfig(type: string) {
		return ruleTypes.find((t) => t.value === type) || ruleTypes[0];
	}

	function getShiftTypeConfig(type: string) {
		return shiftTypes.find((t) => t.value === type) || shiftTypes[3];
	}

	function getStaffName(staffId: string) {
		return allStaff.find((s) => s.id === staffId)?.name || '不明';
	}

	function resetForm() {
		formData = {
			name: '',
			description: '',
			staff_ids: [],
			rule_type: 'preferred_shift',
			shift_type: 'any',
			days_of_week: [],
			allowed_shifts: [],
			priority_level: 50,
			is_hard_constraint: false,
			penalty_weight: 50,
			is_active: true
		};
		isCreating = false;
		editingRuleId = null;
	}

	function startCreate() {
		resetForm();
		isCreating = true;
	}

	function startEdit(rule: PriorityRule) {
		formData = {
			name: rule.name,
			description: rule.description,
			staff_ids: rule.staff_ids,
			rule_type: rule.rule_type,
			shift_type: rule.shift_type,
			days_of_week: rule.days_of_week,
			allowed_shifts: rule.allowed_shifts,
			priority_level: rule.priority_level,
			is_hard_constraint: rule.is_hard_constraint,
			penalty_weight: rule.penalty_weight,
			is_active: rule.is_active,
		};
		editingRuleId = rule.id;
		isCreating = false;
	}

	function cancelEdit() {
		resetForm();
	}

	function toggleDay(day: number) {
		const days = formData.days_of_week || [];
		if (days.includes(day)) {
			formData.days_of_week = days.filter((d) => d !== day);
		} else {
			formData.days_of_week = [...days, day].sort();
		}
	}

	function toggleStaff(staffId: string) {
		const staffIds = formData.staff_ids || [];
		if (staffIds.includes(staffId)) {
			formData.staff_ids = staffIds.filter((id) => id !== staffId);
		} else {
			formData.staff_ids = [...staffIds, staffId];
		}
	}

	function toggleAllowedShift(shift: string) {
		const shifts = formData.allowed_shifts || [];
		if (shifts.includes(shift)) {
			formData.allowed_shifts = shifts.filter((s) => s !== shift);
		} else {
			formData.allowed_shifts = [...shifts, shift];
		}
	}

	function validateForm(): string | null {
		if (!formData.name?.trim()) return 'ルール名を入力してください';
		if (!formData.days_of_week || formData.days_of_week.length === 0)
			return '少なくとも1つの曜日を選択してください';
		if (!formData.staff_ids || formData.staff_ids.length === 0)
			return '少なくとも1人のスタッフを選択してください';
		if (
			formData.rule_type === 'avoid_shift_with_exceptions' &&
			(!formData.allowed_shifts || formData.allowed_shifts.length === 0)
		) {
			return '例外シフトを選択してください';
		}
		return null;
	}

	async function handleSave() {
		const validationError = validateForm();
		if (validationError) {
			formError = validationError;
			setTimeout(() => { formError = null; }, 5000);
			return;
		}

		isLoading = true;
		formError = null;
		formSuccess = null;
		try {
			if (editingRuleId) {
				await updatePriorityRule(editingRuleId, formData);
			} else {
				await createPriorityRule(formData, departmentId);
			}
			await onRulesChange();
			resetForm();
			formSuccess = editingRuleId ? 'ルールを更新しました' : 'ルールを追加しました';
			setTimeout(() => { formSuccess = null; }, 3000);
		} catch (err) {
			console.error('Failed to save priority rule:', err);
			formError = err instanceof Error ? err.message : 'ルールの保存に失敗しました';
			setTimeout(() => { formError = null; }, 5000);
		} finally {
			isLoading = false;
		}
	}

	async function handleDelete(ruleId: string) {
		deleteConfirmRuleId = ruleId;
	}

	async function confirmDelete() {
		if (!deleteConfirmRuleId) return;

		isLoading = true;
		formError = null;
		try {
			await deletePriorityRule(deleteConfirmRuleId);
			await onRulesChange();
			deleteConfirmRuleId = null;
		} catch (err) {
			console.error('Failed to delete priority rule:', err);
			formError = err instanceof Error ? err.message : 'ルールの削除に失敗しました';
			setTimeout(() => { formError = null; }, 5000);
		} finally {
			isLoading = false;
		}
	}

	function cancelDelete() {
		deleteConfirmRuleId = null;
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h3 class="text-lg font-semibold text-gray-900">優先ルール管理</h3>
			<p class="text-sm text-gray-500 mt-1">スタッフのシフト希望や制約を設定</p>
		</div>
		<button
			onclick={startCreate}
			disabled={isCreating || editingRuleId !== null}
			class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
		>
			+ 新規ルール追加
		</button>
	</div>

	<!-- Filter -->
	{#if !isCreating && !editingRuleId}
		<div class="flex items-center gap-3">
			<label for="staff-filter" class="text-sm font-medium text-gray-700">
				スタッフで絞り込み:
			</label>
			<select
				id="staff-filter"
				bind:value={filterStaffId}
				class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			>
				<option value="">すべて表示</option>
				{#each allStaff as staff}
					<option value={staff.id}>{staff.name}</option>
				{/each}
			</select>
			{#if filterStaffId}
				<button
					onclick={() => (filterStaffId = '')}
					class="text-sm text-gray-500 hover:text-gray-700"
				>
					クリア
				</button>
			{/if}
		</div>
	{/if}

	<!-- Form (Create/Edit) -->
	{#if isCreating || editingRuleId}
		<div class="bg-white border-2 border-blue-500 rounded-xl p-6 shadow-lg">
			<div class="flex items-center justify-between mb-6">
				<h4 class="text-lg font-semibold text-gray-900">
					{editingRuleId ? 'ルールを編集' : '新規ルール作成'}
				</h4>
				<button
					onclick={cancelEdit}
					disabled={isLoading}
					class="text-gray-400 hover:text-gray-600"
				>
					✕
				</button>
			</div>

			<div class="space-y-5">
				<!-- Name -->
				<div>
					<label for="rule-name" class="block text-sm font-medium text-gray-700 mb-1">
						ルール名 <span class="text-red-500">*</span>
					</label>
					<input
						id="rule-name"
						type="text"
						bind:value={formData.name}
						placeholder="例: 木曜日早番希望"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>

				<!-- Description -->
				<div>
					<label for="rule-desc" class="block text-sm font-medium text-gray-700 mb-1">
						説明
					</label>
					<textarea
						id="rule-desc"
						bind:value={formData.description}
						placeholder="ルールの詳細を記入"
						rows="2"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					></textarea>
				</div>

				<!-- Rule Type -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						ルールタイプ <span class="text-red-500">*</span>
					</label>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{#each ruleTypes as type}
							<button
								type="button"
								onclick={() => (formData.rule_type = type.value)}
								class="flex items-start gap-3 p-3 border rounded-lg transition-all {formData.rule_type ===
								type.value
									? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
									: 'border-gray-300 hover:border-gray-400'}"
							>
								<span class="text-2xl">{type.icon}</span>
								<div class="text-left">
									<div class="font-medium text-gray-900">{type.label}</div>
									<div class="text-xs text-gray-500 mt-0.5">{type.description}</div>
								</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Shift Type -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						シフトタイプ <span class="text-red-500">*</span>
					</label>
					<div class="flex flex-wrap gap-2">
						{#each shiftTypes as shift}
							<button
								type="button"
								onclick={() => (formData.shift_type = shift.value)}
								class="px-4 py-2 border rounded-lg font-medium transition-all {formData.shift_type ===
								shift.value
									? 'border-blue-500 bg-blue-500 text-white'
									: 'border-gray-300 text-gray-700 hover:border-gray-400'}"
							>
								{shift.symbol} {shift.label}
							</button>
						{/each}
					</div>
				</div>

				<!-- Days of Week -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						曜日 <span class="text-red-500">*</span>
					</label>
					<div class="flex flex-wrap gap-2">
						{#each daysOfWeek as day}
							<button
								type="button"
								onclick={() => toggleDay(day.value)}
								class="w-12 h-12 rounded-full font-bold transition-all {formData.days_of_week?.includes(
									day.value
								)
									? 'bg-blue-500 text-white ring-2 ring-blue-300'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
							>
								{day.short}
							</button>
						{/each}
					</div>
				</div>

				<!-- Exception Shifts (for avoid_shift_with_exceptions) -->
				{#if showExceptionShifts}
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							許可するシフト <span class="text-red-500">*</span>
						</label>
						<div class="flex flex-wrap gap-2">
							{#each shiftTypes.filter((s) => s.value !== 'any') as shift}
								<button
									type="button"
									onclick={() => toggleAllowedShift(shift.value)}
									class="px-4 py-2 border rounded-lg font-medium transition-all {formData.allowed_shifts?.includes(
										shift.value
									)
										? 'border-green-500 bg-green-500 text-white'
										: 'border-gray-300 text-gray-700 hover:border-gray-400'}"
								>
									{shift.symbol} {shift.label}
								</button>
							{/each}
						</div>
						<p class="text-xs text-gray-500 mt-1">
							選択したシフトのみ許可され、その他は回避されます
						</p>
					</div>
				{/if}

				<!-- Staff Selection -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						対象スタッフ <span class="text-red-500">*</span>
					</label>
					<div class="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
						{#each allStaff as staff}
							<label class="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
								<input
									type="checkbox"
									checked={formData.staff_ids?.includes(staff.id)}
									onchange={() => toggleStaff(staff.id)}
									class="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
								/>
								<span class="text-sm text-gray-700">{staff.name}</span>
								{#if staff.position}
									<span class="text-xs text-gray-500">({staff.position})</span>
								{/if}
							</label>
						{/each}
					</div>
					<p class="text-xs text-gray-500 mt-1">
						選択中: {formData.staff_ids?.length || 0}人
					</p>
				</div>

				<!-- Hard Constraint Toggle -->
				<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
					<input
						type="checkbox"
						id="hard-constraint"
						bind:checked={formData.is_hard_constraint}
						class="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
					/>
					<label for="hard-constraint" class="flex-1">
						<div class="text-sm font-medium text-gray-900">厳格な制約として扱う</div>
						<div class="text-xs text-gray-500 mt-0.5">
							有効にすると、このルールは必ず守られます（ペナルティではなく制約）
						</div>
					</label>
				</div>

				<!-- Penalty Weight (if not hard constraint) -->
				{#if !formData.is_hard_constraint}
					<div>
						<label for="penalty-weight" class="block text-sm font-medium text-gray-700 mb-2">
							ペナルティ重み: {formData.penalty_weight || 50}
						</label>
						<input
							type="range"
							id="penalty-weight"
							bind:value={formData.penalty_weight}
							min="1"
							max="100"
							class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
						/>
						<div class="flex justify-between text-xs text-gray-500 mt-1">
							<span>低 (1)</span>
							<span>中 (50)</span>
							<span>高 (100)</span>
						</div>
					</div>
				{/if}

				<!-- Active Toggle -->
				<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
					<input
						type="checkbox"
						id="is-active"
						bind:checked={formData.is_active}
						class="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
					/>
					<label for="is-active" class="flex-1">
						<div class="text-sm font-medium text-gray-900">ルールを有効化</div>
						<div class="text-xs text-gray-500 mt-0.5">
							無効にすると、このルールはスケジュール生成に適用されません
						</div>
					</label>
				</div>

				<!-- Feedback -->
			{#if formError}
				<div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</div>
			{:else if formSuccess}
				<div class="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{formSuccess}</div>
			{/if}

			<!-- Actions -->
				<div class="flex gap-3 pt-4 border-t">
					<button
						onclick={handleSave}
						disabled={isLoading}
						class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
					>
						{isLoading ? '保存中...' : editingRuleId ? '更新' : '作成'}
					</button>
					<button
						onclick={cancelEdit}
						disabled={isLoading}
						class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:cursor-not-allowed transition-colors"
					>
						キャンセル
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Rules List -->
	{#if !isCreating && !editingRuleId}
		{#if filteredRules.length === 0}
			<div class="text-center py-12 bg-gray-50 rounded-xl">
				<div class="text-6xl mb-4">📋</div>
				<p class="text-gray-500 text-lg">優先ルールがありません</p>
				<p class="text-gray-400 text-sm mt-2">「新規ルール追加」ボタンから作成してください</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{#each filteredRules as rule}
					{@const ruleTypeConfig = getRuleTypeConfig(rule.rule_type)}
					{@const shiftTypeConfig = getShiftTypeConfig(rule.shift_type)}
					<div
						class="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow {!rule.is_active
							? 'opacity-60'
							: ''}"
					>
						<!-- Header -->
						<div class="flex items-start justify-between mb-3">
							<div class="flex-1">
								<h5 class="font-semibold text-gray-900 text-lg">{rule.name}</h5>
								{#if rule.description}
									<p class="text-sm text-gray-500 mt-1">{rule.description}</p>
								{/if}
							</div>
							{#if !rule.is_active}
								<span
									class="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full font-medium"
								>
									無効
								</span>
							{/if}
						</div>

						<!-- Badges -->
						<div class="flex flex-wrap gap-2 mb-3">
							<span
								class="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium"
							>
								{ruleTypeConfig.icon}
								{ruleTypeConfig.label}
							</span>
							<span
								class="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium"
							>
								{shiftTypeConfig.symbol}
								{shiftTypeConfig.label}
							</span>
							{#if rule.is_hard_constraint}
								<span
									class="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full font-medium"
								>
									厳格
								</span>
							{/if}
						</div>

						<!-- Days -->
						<div class="flex items-center gap-2 mb-3">
							<span class="text-xs font-medium text-gray-500">曜日:</span>
							<div class="flex gap-1">
								{#each rule.days_of_week || [] as dayNum}
									<span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-medium">
										{daysOfWeek[dayNum]?.short}
									</span>
								{/each}
							</div>
						</div>

						<!-- Exception Shifts -->
						{#if rule.rule_type === 'avoid_shift_with_exceptions' && rule.allowed_shifts}
							<div class="flex items-center gap-2 mb-3">
								<span class="text-xs font-medium text-gray-500">許可:</span>
								<div class="flex gap-1">
									{#each rule.allowed_shifts as shiftType}
										{@const config = getShiftTypeConfig(shiftType)}
										<span
											class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium"
										>
											{config.symbol} {config.label}
										</span>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Staff Count -->
						<div class="flex items-center gap-2 mb-4">
							<span class="text-xs font-medium text-gray-500">対象:</span>
							<span class="text-sm text-gray-700">
								{rule.staff_ids?.length || 0}人のスタッフ
							</span>
						</div>

						<!-- Penalty Weight (if not hard constraint) -->
						{#if !rule.is_hard_constraint}
							<div class="mb-4">
								<div class="flex justify-between text-xs text-gray-500 mb-1">
									<span>ペナルティ重み</span>
									<span>{rule.penalty_weight || 50}</span>
								</div>
								<div class="w-full bg-gray-200 rounded-full h-2">
									<div
										class="bg-blue-500 h-2 rounded-full transition-all"
										style="width: {rule.penalty_weight || 50}%"
									></div>
								</div>
							</div>
						{/if}

						<!-- Actions -->
						<div class="flex gap-2 pt-4 border-t">
							<button
								onclick={() => startEdit(rule)}
								disabled={isLoading}
								class="flex-1 px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
							>
								編集
							</button>
							<button
								onclick={() => handleDelete(rule.id)}
								disabled={isLoading}
								class="px-3 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
							>
								削除
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- Delete Confirmation Modal -->
	{#if deleteConfirmRuleId}
		{@const ruleToDelete = priorityRules.find((r) => r.id === deleteConfirmRuleId)}
		<div
			class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
			onclick={cancelDelete}
		>
			<div
				class="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl"
				onclick={(e) => e.stopPropagation()}
			>
				<h4 class="text-lg font-semibold text-gray-900 mb-3">ルールを削除</h4>
				<p class="text-gray-600 mb-2">
					本当に「<strong>{ruleToDelete?.name}</strong>」を削除しますか？
				</p>
				<p class="text-sm text-red-600 mb-6">この操作は取り消せません。</p>

				<div class="flex gap-3">
					<button
						onclick={confirmDelete}
						disabled={isLoading}
						class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
					>
						{isLoading ? '削除中...' : '削除'}
					</button>
					<button
						onclick={cancelDelete}
						disabled={isLoading}
						class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:cursor-not-allowed transition-colors"
					>
						キャンセル
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

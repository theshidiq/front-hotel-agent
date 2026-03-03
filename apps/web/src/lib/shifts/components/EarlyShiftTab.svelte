<script lang="ts">
	import { untrack } from 'svelte';
	import type { EarlyShiftPreference } from '$lib/shifts/api';
	import type { ScheduleStaff } from '$lib/shifts/types';
	import { bulkUpsertEarlyShiftPreferences } from '$lib/shifts/api';
	import { ChevronDown, ChevronUp, Check, X } from 'lucide-svelte';

	interface Props {
		earlyShiftPreferences: EarlyShiftPreference[];
		allStaff: ScheduleStaff[];
		onSave: () => Promise<void>;
	}

	let { earlyShiftPreferences, allStaff, onSave }: Props = $props();

	// Local state for preferences
	let preferences = $state<Map<string, boolean>>(new Map());
	let isSaving = $state(false);
	let hasChanges = $state(false);

	// Collapsible sections state
	let expandedSections = $state<Set<string>>(new Set(['社員', '派遣', 'パート']));

	// Initialize preferences from props
	$effect(() => {
		const staff = allStaff;
		const prefs = earlyShiftPreferences;
		untrack(() => {
			const newPrefs = new Map<string, boolean>();
			staff.forEach(s => newPrefs.set(s.id, false));
			prefs.forEach(pref => newPrefs.set(pref.staff_id, pref.can_do_early_shift));
			preferences = newPrefs;
			hasChanges = false;
		});
	});

	// Group staff by type
	let groupedStaff = $derived(() => {
		const groups: Record<string, ScheduleStaff[]> = {
			'社員': [],
			'派遣': [],
			'パート': []
		};

		allStaff.forEach(staff => {
			const type = staff.staff_status || 'パート';
			if (groups[type]) {
				groups[type].push(staff);
			}
		});

		// Sort staff by name within each group
		Object.keys(groups).forEach(key => {
			groups[key].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
		});

		return groups;
	});

	// Calculate statistics
	let stats = $derived(() => {
		const total = allStaff.length;
		let canDoEarly = 0;
		let cannotDoEarly = 0;

		preferences.forEach(value => {
			if (value) {
				canDoEarly++;
			} else {
				cannotDoEarly++;
			}
		});

		return { total, canDoEarly, cannotDoEarly };
	});

	function togglePreference(staffId: string) {
		const current = preferences.get(staffId) ?? false;
		preferences.set(staffId, !current);
		preferences = new Map(preferences); // Trigger reactivity
		hasChanges = true;
	}

	function toggleSection(type: string) {
		if (expandedSections.has(type)) {
			expandedSections.delete(type);
		} else {
			expandedSections.add(type);
		}
		expandedSections = new Set(expandedSections);
	}

	async function handleSave() {
		isSaving = true;
		try {
			const preferencesArray = Array.from(preferences.entries()).map(([staff_id, can_do_early_shift]) => ({
				staff_id,
				can_do_early_shift
			}));

			await bulkUpsertEarlyShiftPreferences({ preferences: preferencesArray });
			hasChanges = false;
			await onSave();
		} catch (error) {
			console.error('Failed to save early shift preferences:', error);
			alert('保存に失敗しました。もう一度お試しください。');
		} finally {
			isSaving = false;
		}
	}

	function enableAll() {
		allStaff.forEach(staff => {
			preferences.set(staff.id, true);
		});
		preferences = new Map(preferences);
		hasChanges = true;
	}

	function disableAll() {
		allStaff.forEach(staff => {
			preferences.set(staff.id, false);
		});
		preferences = new Map(preferences);
		hasChanges = true;
	}

	function enableByType(type: string) {
		const staffInType = groupedStaff()[type] || [];
		staffInType.forEach(staff => {
			preferences.set(staff.id, true);
		});
		preferences = new Map(preferences);
		hasChanges = true;
	}

	function getTypeBadgeColor(type: string): string {
		switch (type) {
			case '社員':
				return 'bg-blue-100 text-blue-800 border-blue-200';
			case '派遣':
				return 'bg-green-100 text-green-800 border-green-200';
			case 'パート':
				return 'bg-purple-100 text-purple-800 border-purple-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	}
</script>

<div class="space-y-6">
	<!-- Summary Statistics -->
	<div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
		<h3 class="text-lg font-semibold text-gray-800 mb-4">統計サマリー</h3>
		<div class="grid grid-cols-3 gap-4">
			<div class="bg-white rounded-lg p-4 border border-gray-200">
				<div class="text-sm text-gray-600 mb-1">総スタッフ数</div>
				<div class="text-2xl font-bold text-gray-900">{stats().total}</div>
			</div>
			<div class="bg-white rounded-lg p-4 border border-green-200">
				<div class="text-sm text-gray-600 mb-1">早番可能</div>
				<div class="text-2xl font-bold text-green-600 flex items-center gap-2">
					<Check class="w-5 h-5" />
					{stats().canDoEarly}
				</div>
			</div>
			<div class="bg-white rounded-lg p-4 border border-red-200">
				<div class="text-sm text-gray-600 mb-1">早番不可</div>
				<div class="text-2xl font-bold text-red-600 flex items-center gap-2">
					<X class="w-5 h-5" />
					{stats().cannotDoEarly}
				</div>
			</div>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="flex flex-wrap gap-3">
		<button
			onclick={enableAll}
			class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium shadow-sm"
		>
			全員を早番可能にする
		</button>
		<button
			onclick={disableAll}
			class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium shadow-sm"
		>
			全員を早番不可にする
		</button>

		<div class="relative">
			<select
				onchange={(e) => {
					const type = e.currentTarget.value;
					if (type) {
						enableByType(type);
						e.currentTarget.value = '';
					}
				}}
				class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm cursor-pointer appearance-none pr-10"
			>
				<option value="">雇用形態別で有効化</option>
				<option value="社員">社員のみ有効化</option>
				<option value="派遣">派遣のみ有効化</option>
				<option value="パート">パートのみ有効化</option>
			</select>
			<ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
		</div>
	</div>

	<!-- Staff Table by Type -->
	<div class="space-y-4">
		{#each Object.entries(groupedStaff()) as [type, staffList]}
			{@const isExpanded = expandedSections.has(type)}
			{@const enabledCount = staffList.filter(s => preferences.get(s.id) ?? false).length}

			<div class="border border-gray-200 rounded-lg overflow-hidden">
				<!-- Section Header -->
				<button
					onclick={() => toggleSection(type)}
					class="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
				>
					<div class="flex items-center gap-3">
						<span class={`px-3 py-1 rounded-full text-sm font-medium border ${getTypeBadgeColor(type)}`}>
							{type}
						</span>
						<span class="text-gray-700 font-medium">
							{staffList.length}名 (早番可能: {enabledCount})
						</span>
					</div>
					{#if isExpanded}
						<ChevronUp class="w-5 h-5 text-gray-500" />
					{:else}
						<ChevronDown class="w-5 h-5 text-gray-500" />
					{/if}
				</button>

				<!-- Staff List -->
				{#if isExpanded}
					<div class="divide-y divide-gray-200">
						{#each staffList as staff}
							{@const enabled = preferences.get(staff.id) ?? false}
							<div class="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors">
								<div class="flex-1">
									<div class="font-medium text-gray-900">{staff.name}</div>
									<div class="text-sm text-gray-500 mt-1">
										<span class={`inline-block px-2 py-0.5 rounded text-xs border ${getTypeBadgeColor(staff.staff_status || 'パート')}`}>
											{staff.staff_status || 'パート'}
										</span>
									</div>
								</div>

								<!-- Toggle Switch -->
								<button
									onclick={() => togglePreference(staff.id)}
									class="relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 {enabled ? 'bg-green-500 focus:ring-green-500' : 'bg-gray-300 focus:ring-gray-400'}"
									role="switch"
									aria-checked={enabled}
									aria-label="{staff.name}の早番設定を切り替え"
								>
									<span
										class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ease-in-out {enabled ? 'translate-x-5' : 'translate-x-0'}"
									></span>
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Save Button -->
	<div class="sticky bottom-0 bg-white border-t border-gray-200 pt-4 pb-2">
		<button
			onclick={handleSave}
			disabled={!hasChanges || isSaving}
			class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg disabled:shadow-none"
		>
			{#if isSaving}
				保存中...
			{:else if hasChanges}
				変更を保存する
			{:else}
				変更なし
			{/if}
		</button>
	</div>
</div>

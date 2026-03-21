<script lang="ts">
	import { getShiftSymbolConfig, updateShiftSymbolConfig, type ShiftSymbolConfig } from '$lib/shifts/api';

	interface Props {
		onSave?: () => Promise<void>;
	}

	let { onSave }: Props = $props();

	let symbols = $state<ShiftSymbolConfig[]>([]);
	let loading = $state(true);
	let hasChanges = $state(false);
	let isSaving = $state(false);
	let saveError = $state<string | null>(null);
	let saveSuccess = $state(false);

	// Add-new-symbol form
	let showAddForm = $state(false);
	let newSymbol = $state('');
	let newLabel = $state('');
	let newColor = $state('#6b7280');

	$effect(() => {
		loadConfig();
	});

	async function loadConfig() {
		try {
			loading = true;
			symbols = await getShiftSymbolConfig();
		} catch (e) {
			saveError = e instanceof Error ? e.message : '読み込みに失敗しました';
		} finally {
			loading = false;
		}
	}

	function markChanged() {
		hasChanges = true;
	}

	function addSymbol() {
		const trimmed = newSymbol.trim();
		if (!trimmed || !newLabel.trim()) return;
		// Prevent duplicates
		if (symbols.some(s => s.symbol === trimmed)) {
			saveError = 'そのシンボルはすでに存在します';
			setTimeout(() => { saveError = null; }, 3000);
			return;
		}
		symbols = [...symbols, { symbol: trimmed, label: newLabel.trim(), color: newColor, enabled: true, isDefault: false }];
		newSymbol = '';
		newLabel = '';
		newColor = '#6b7280';
		showAddForm = false;
		hasChanges = true;
	}

	function removeSymbol(idx: number) {
		symbols = symbols.filter((_, i) => i !== idx);
		hasChanges = true;
	}

	async function handleSave() {
		if (!hasChanges) return;
		isSaving = true;
		saveError = null;
		saveSuccess = false;
		try {
			await updateShiftSymbolConfig(symbols);
			await onSave?.();
			hasChanges = false;
			saveSuccess = true;
			setTimeout(() => { saveSuccess = false; }, 3000);
		} catch (e) {
			saveError = e instanceof Error ? e.message : '保存に失敗しました';
			setTimeout(() => { saveError = null; }, 5000);
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="space-y-8">
	{#if loading}
		<div class="py-12 text-center text-sm text-gray-500 dark:text-gray-400">読み込み中...</div>
	{:else}
		<!-- Built-in & custom symbols list -->
		<div>
			<h3 class="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">シフトシンボル一覧</h3>
			<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
				ラベルや色を変更できます。デフォルトシンボルは削除できません。
			</p>

			<div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
				<table class="w-full text-sm">
					<thead class="bg-gray-50 dark:bg-gray-800">
						<tr>
							<th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">シンボル</th>
							<th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">ラベル</th>
							<th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">色</th>
							<th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">有効</th>
							<th class="px-4 py-3"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
						{#each symbols as sym, i (sym.symbol)}
							<tr class="bg-white dark:bg-gray-900">
								<!-- Symbol preview -->
								<td class="px-4 py-3">
									<span
										class="inline-block w-8 text-center text-xl font-bold"
										style="color: {sym.color}"
									>
										{sym.symbol === '' ? '　' : sym.symbol}
									</span>
									{#if sym.isDefault}
										<span class="ml-1 text-xs text-gray-400 dark:text-gray-500">デフォルト</span>
									{/if}
								</td>

								<!-- Label input -->
								<td class="px-4 py-3">
									<input
										type="text"
										bind:value={symbols[i].label}
										onchange={markChanged}
										maxlength={20}
										class="w-32 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
									/>
								</td>

								<!-- Color picker -->
								<td class="px-4 py-3">
									<div class="flex items-center gap-2">
										<input
											type="color"
											bind:value={symbols[i].color}
											onchange={markChanged}
											class="h-8 w-10 cursor-pointer rounded border border-gray-300 p-0.5 dark:border-gray-600"
										/>
										<span class="font-mono text-xs text-gray-500 dark:text-gray-400">{sym.color}</span>
									</div>
								</td>

								<!-- Enable toggle -->
								<td class="px-4 py-3">
									<label class="relative inline-flex cursor-pointer items-center">
										<input
											type="checkbox"
											bind:checked={symbols[i].enabled}
											onchange={markChanged}
											class="peer sr-only"
										/>
										<div
											class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"
										></div>
									</label>
								</td>

								<!-- Delete (custom only) -->
								<td class="px-4 py-3 text-right">
									{#if !sym.isDefault}
										<button
											type="button"
											onclick={() => removeSymbol(i)}
											class="rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
											title="削除"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Add custom symbol -->
		<div>
			<h3 class="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">カスタムシンボルを追加</h3>

			{#if !showAddForm}
				<button
					type="button"
					onclick={() => { showAddForm = true; }}
					class="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					シンボルを追加
				</button>
			{:else}
				<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
					<div class="flex flex-wrap items-end gap-4">
						<div>
							<label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">シンボル（Unicode文字）</label>
							<input
								type="text"
								bind:value={newSymbol}
								placeholder="例: ◆"
								maxlength={2}
								class="w-20 rounded border border-gray-300 px-2 py-1.5 text-center text-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">ラベル</label>
							<input
								type="text"
								bind:value={newLabel}
								placeholder="例: 夜番"
								maxlength={20}
								class="w-32 rounded border border-gray-300 px-2 py-1.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">色</label>
							<input
								type="color"
								bind:value={newColor}
								class="h-9 w-12 cursor-pointer rounded border border-gray-300 p-0.5 dark:border-gray-600"
							/>
						</div>
						<div class="flex gap-2">
							<button
								type="button"
								onclick={addSymbol}
								disabled={!newSymbol.trim() || !newLabel.trim()}
								class="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
							>
								追加
							</button>
							<button
								type="button"
								onclick={() => { showAddForm = false; newSymbol = ''; newLabel = ''; newColor = '#6b7280'; }}
								class="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
							>
								キャンセル
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Save feedback -->
		{#if saveError}
			<div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
				{saveError}
			</div>
		{:else if saveSuccess}
			<div class="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
				設定を保存しました
			</div>
		{/if}

		<!-- Action buttons -->
		<div class="flex justify-end border-t border-gray-200 pt-6 dark:border-gray-700">
			<button
				type="button"
				onclick={handleSave}
				disabled={!hasChanges || isSaving}
				class="rounded-lg bg-blue-600 px-8 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if isSaving}
					保存中...
				{:else if hasChanges}
					変更を保存
				{:else}
					保存済み
				{/if}
			</button>
		</div>
	{/if}
</div>

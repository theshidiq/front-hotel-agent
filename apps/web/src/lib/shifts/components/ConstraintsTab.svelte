<script lang="ts">
	import type { ORToolsSolverConfig } from '$lib/shifts/types';
	import { updateSolverConfig } from '$lib/shifts/api';

	interface Props {
		solverConfig: ORToolsSolverConfig | null;
		onSave: () => Promise<void>;
	}

	let { solverConfig, onSave }: Props = $props();

	// Preset configurations
	const PRESETS = {
		strict: {
			label: 'Strict Mode',
			icon: '🔒',
			color: 'red',
			description: 'High penalties, minimal violations. For legal compliance.',
			penalty_weights: {
				staffGroup: 200,
				fiveDayRest: 300,
				monthlyLimit: 150,
				dailyLimitMax: 100,
				dailyLimitMin: 100,
				adjacentConflict: 60
			},
			hard_constraints: {
				dailyLimits: true,
				fiveDayRest: true,
				staffGroups: true,
				monthlyLimits: true
			}
		},
		balanced: {
			label: 'Balanced Mode',
			icon: '⚖️',
			color: 'blue',
			description: 'Medium penalties, reasonable trade-offs. For daily use.',
			penalty_weights: {
				staffGroup: 100,
				fiveDayRest: 200,
				monthlyLimit: 80,
				dailyLimitMax: 50,
				dailyLimitMin: 50,
				adjacentConflict: 30
			},
			hard_constraints: {
				dailyLimits: false,
				fiveDayRest: true,
				staffGroups: false,
				monthlyLimits: false
			}
		},
		flexible: {
			label: 'Flexible Mode',
			icon: '🌊',
			color: 'green',
			description: 'Lower penalties, prioritizes solutions. For complex scenarios.',
			penalty_weights: {
				staffGroup: 50,
				fiveDayRest: 100,
				monthlyLimit: 40,
				dailyLimitMax: 25,
				dailyLimitMin: 25,
				adjacentConflict: 15
			},
			hard_constraints: {
				dailyLimits: false,
				fiveDayRest: false,
				staffGroups: false,
				monthlyLimits: false
			}
		}
	};

	// Local state
	let localConfig = $state<ORToolsSolverConfig>({
		penalty_weights: {
			staffGroup: 100,
			fiveDayRest: 200,
			monthlyLimit: 80,
			dailyLimitMax: 50,
			dailyLimitMin: 50,
			adjacentConflict: 30
		},
		hard_constraints: {
			dailyLimits: false,
			fiveDayRest: true,
			staffGroups: false,
			monthlyLimits: false
		},
		solver_settings: {
			timeout: 30,
			numWorkers: 4
		}
	});

	let selectedPreset = $state<'strict' | 'balanced' | 'flexible' | null>('balanced');
	let isSaving = $state(false);
	let hasChanges = $state(false);

	// Initialize from props
	$effect(() => {
		if (solverConfig) {
			localConfig = JSON.parse(JSON.stringify(solverConfig));
			// Detect current preset
			detectPreset();
		}
	});

	// Track changes
	$effect(() => {
		if (solverConfig && localConfig) {
			hasChanges = JSON.stringify(solverConfig) !== JSON.stringify(localConfig);
		}
	});

	function detectPreset() {
		for (const [key, preset] of Object.entries(PRESETS)) {
			const weightsMatch =
				JSON.stringify(preset.penalty_weights) === JSON.stringify(localConfig.penalty_weights);
			const constraintsMatch =
				JSON.stringify(preset.hard_constraints) === JSON.stringify(localConfig.hard_constraints);

			if (weightsMatch && constraintsMatch) {
				selectedPreset = key as 'strict' | 'balanced' | 'flexible';
				return;
			}
		}
		selectedPreset = null; // Custom configuration
	}

	function applyPreset(presetKey: 'strict' | 'balanced' | 'flexible') {
		const preset = PRESETS[presetKey];
		localConfig.penalty_weights = { ...preset.penalty_weights };
		localConfig.hard_constraints = { ...preset.hard_constraints };
		selectedPreset = presetKey;
		hasChanges = true;
	}

	function resetToDefaults() {
		applyPreset('balanced');
		localConfig.solver_settings = {
			timeout: 30,
			numWorkers: 4
		};
	}

	async function handleSave() {
		if (!hasChanges) return;

		isSaving = true;
		try {
			await updateSolverConfig(localConfig);
			await onSave();
			hasChanges = false;
		} catch (error) {
			console.error('Failed to save solver config:', error);
			alert('保存に失敗しました');
		} finally {
			isSaving = false;
		}
	}

	function getPresetCardClasses(presetKey: string) {
		const preset = PRESETS[presetKey as keyof typeof PRESETS];
		const isSelected = selectedPreset === presetKey;

		const baseClasses = 'cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md';
		const colorClasses = {
			red: isSelected
				? 'border-red-500 bg-red-50 dark:bg-red-950'
				: 'border-gray-200 hover:border-red-300 dark:border-gray-700',
			blue: isSelected
				? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
				: 'border-gray-200 hover:border-blue-300 dark:border-gray-700',
			green: isSelected
				? 'border-green-500 bg-green-50 dark:bg-green-950'
				: 'border-gray-200 hover:border-green-300 dark:border-gray-700'
		};

		return `${baseClasses} ${colorClasses[preset.color as keyof typeof colorClasses]}`;
	}

	function getSliderColor(value: number, max: number) {
		const percentage = (value / max) * 100;
		if (percentage < 33) return 'bg-green-500';
		if (percentage < 66) return 'bg-yellow-500';
		return 'bg-red-500';
	}
</script>

<div class="space-y-8">
	<!-- Preset Modes Section -->
	<div>
		<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">プリセットモード</h3>
		<div class="grid gap-4 md:grid-cols-3">
			{#each Object.entries(PRESETS) as [key, preset]}
				<button
					type="button"
					class={getPresetCardClasses(key)}
					onclick={() => applyPreset(key as 'strict' | 'balanced' | 'flexible')}
				>
					<div class="flex items-start gap-3">
						<span class="text-3xl">{preset.icon}</span>
						<div class="flex-1 text-left">
							<h4 class="font-semibold text-gray-900 dark:text-gray-100">
								{preset.label}
							</h4>
							<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
								{preset.description}
							</p>
						</div>
					</div>
					{#if selectedPreset === key}
						<div class="mt-3 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
							<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								/>
							</svg>
							<span>選択中</span>
						</div>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Penalty Weights Section -->
	<div>
		<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">ペナルティウェイト</h3>
		<p class="mb-6 text-sm text-gray-600 dark:text-gray-400">
			各制約の重要度を調整します。値が大きいほど、その制約を優先的に満たそうとします。
		</p>

		<div class="space-y-6">
			<!-- Staff Group -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<label class="font-medium text-gray-700 dark:text-gray-300">
						スタッフグループ制約
					</label>
					<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
						{localConfig.penalty_weights.staffGroup}
					</span>
				</div>
				<input
					type="range"
					min="10"
					max="300"
					step="5"
					bind:value={localConfig.penalty_weights.staffGroup}
					onchange={() => detectPreset()}
					class="w-full accent-blue-600"
				/>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
					同一グループ内で休みが重複しないように制御
				</p>
			</div>

			<!-- 5-Day Rest -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<label class="font-medium text-gray-700 dark:text-gray-300">5連勤制限</label>
					<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
						{localConfig.penalty_weights.fiveDayRest}
					</span>
				</div>
				<input
					type="range"
					min="10"
					max="500"
					step="10"
					bind:value={localConfig.penalty_weights.fiveDayRest}
					onchange={() => detectPreset()}
					class="w-full accent-red-600"
				/>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
					5日以上連続勤務を防ぐ（労働基準法対応）
				</p>
			</div>

			<!-- Monthly Limit -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<label class="font-medium text-gray-700 dark:text-gray-300">月間休日制限</label>
					<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
						{localConfig.penalty_weights.monthlyLimit}
					</span>
				</div>
				<input
					type="range"
					min="10"
					max="200"
					step="5"
					bind:value={localConfig.penalty_weights.monthlyLimit}
					onchange={() => detectPreset()}
					class="w-full accent-purple-600"
				/>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
					各スタッフの月間休日数の公平性を保つ
				</p>
			</div>

			<!-- Daily Limit Max -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<label class="font-medium text-gray-700 dark:text-gray-300">
						1日の最大休日数制限
					</label>
					<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
						{localConfig.penalty_weights.dailyLimitMax}
					</span>
				</div>
				<input
					type="range"
					min="10"
					max="150"
					step="5"
					bind:value={localConfig.penalty_weights.dailyLimitMax}
					onchange={() => detectPreset()}
					class="w-full accent-orange-600"
				/>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
					1日に休むスタッフが多くなりすぎないように制御
				</p>
			</div>

			<!-- Daily Limit Min -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<label class="font-medium text-gray-700 dark:text-gray-300">
						1日の最小休日数制限
					</label>
					<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
						{localConfig.penalty_weights.dailyLimitMin}
					</span>
				</div>
				<input
					type="range"
					min="10"
					max="150"
					step="5"
					bind:value={localConfig.penalty_weights.dailyLimitMin}
					onchange={() => detectPreset()}
					class="w-full accent-teal-600"
				/>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
					1日に休むスタッフが少なくなりすぎないように制御
				</p>
			</div>

			<!-- Adjacent Conflict -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<label class="font-medium text-gray-700 dark:text-gray-300">隣接シフト衝突</label>
					<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
						{localConfig.penalty_weights.adjacentConflict}
					</span>
				</div>
				<input
					type="range"
					min="10"
					max="100"
					step="5"
					bind:value={localConfig.penalty_weights.adjacentConflict}
					onchange={() => detectPreset()}
					class="w-full accent-gray-600"
				/>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
					連続する日に望ましくないシフトパターンを防ぐ
				</p>
			</div>
		</div>
	</div>

	<!-- Hard Constraints Section -->
	<div>
		<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">ハード制約</h3>
		<p class="mb-6 text-sm text-gray-600 dark:text-gray-400">
			ONにした制約は必ず満たされます。解が見つからない場合、スケジュール生成は失敗します。
		</p>

		<div class="space-y-4">
			<!-- Daily Limits -->
			<div class="flex items-start justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<div class="flex-1">
					<label class="font-medium text-gray-700 dark:text-gray-300">1日の休日数制限</label>
					<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
						1日の最小・最大休日数を必ず守る
					</p>
				</div>
				<label class="relative inline-flex cursor-pointer items-center">
					<input
						type="checkbox"
						bind:checked={localConfig.hard_constraints.dailyLimits}
						onchange={() => detectPreset()}
						class="peer sr-only"
					/>
					<div
						class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"
					></div>
				</label>
			</div>

			<!-- 5-Day Rest -->
			<div class="flex items-start justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<div class="flex-1">
					<label class="font-medium text-gray-700 dark:text-gray-300">5連勤制限</label>
					<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
						5日以上の連続勤務を絶対に防ぐ（推奨：ON）
					</p>
				</div>
				<label class="relative inline-flex cursor-pointer items-center">
					<input
						type="checkbox"
						bind:checked={localConfig.hard_constraints.fiveDayRest}
						onchange={() => detectPreset()}
						class="peer sr-only"
					/>
					<div
						class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"
					></div>
				</label>
			</div>

			<!-- Staff Groups -->
			<div class="flex items-start justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<div class="flex-1">
					<label class="font-medium text-gray-700 dark:text-gray-300">スタッフグループ制約</label>
					<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
						同一グループ内で休みを必ず分散させる
					</p>
				</div>
				<label class="relative inline-flex cursor-pointer items-center">
					<input
						type="checkbox"
						bind:checked={localConfig.hard_constraints.staffGroups}
						onchange={() => detectPreset()}
						class="peer sr-only"
					/>
					<div
						class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"
					></div>
				</label>
			</div>

			<!-- Monthly Limits -->
			<div class="flex items-start justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<div class="flex-1">
					<label class="font-medium text-gray-700 dark:text-gray-300">月間休日制限</label>
					<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
						各スタッフの月間休日数を必ず範囲内に収める
					</p>
				</div>
				<label class="relative inline-flex cursor-pointer items-center">
					<input
						type="checkbox"
						bind:checked={localConfig.hard_constraints.monthlyLimits}
						onchange={() => detectPreset()}
						class="peer sr-only"
					/>
					<div
						class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"
					></div>
				</label>
			</div>
		</div>
	</div>

	<!-- Solver Settings Section -->
	<div>
		<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">ソルバー設定</h3>
		<div class="grid gap-4 md:grid-cols-2">
			<!-- Timeout -->
			<div>
				<label class="mb-2 block font-medium text-gray-700 dark:text-gray-300">
					タイムアウト（秒）
				</label>
				<input
					type="number"
					min="5"
					max="300"
					step="5"
					bind:value={localConfig.solver_settings.timeout}
					class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
				/>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
					最適化の最大実行時間（推奨：30-60秒）
				</p>
			</div>

			<!-- Workers -->
			<div>
				<label class="mb-2 block font-medium text-gray-700 dark:text-gray-300">
					ワーカー数
				</label>
				<select
					bind:value={localConfig.solver_settings.numWorkers}
					class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
				>
					<option value={1}>1 スレッド</option>
					<option value={2}>2 スレッド</option>
					<option value={4}>4 スレッド（推奨）</option>
					<option value={8}>8 スレッド</option>
				</select>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
					並列処理のスレッド数（多いほど高速だがCPU負荷が増加）
				</p>
			</div>
		</div>
	</div>

	<!-- Action Buttons -->
	<div class="flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-700">
		<button
			type="button"
			onclick={resetToDefaults}
			class="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
		>
			デフォルトに戻す
		</button>

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
</div>

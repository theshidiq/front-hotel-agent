<script lang="ts">
	import {
		previewMenuImport,
		applyMenuImport,
		AuthExpiredError,
		type MenuImportPreview,
	} from '$lib/api';

	interface Props {
		onClose: () => void;
		/** Called after a successful apply so the caller can refresh its data. */
		onApplied?: () => void;
	}
	let { onClose, onApplied }: Props = $props();

	// pick → review → done. The review step IS the safety mechanism: nothing is
	// written until the chef has seen the diff and confirmed it.
	let step: 'pick' | 'review' | 'done' = $state('pick');
	let file: File | null = $state(null);
	let preview = $state<MenuImportPreview | null>(null);
	let busy = $state(false);
	let error: string | null = $state(null);
	let dragOver = $state(false);

	// Deleting dishes requires its own opt-in, separate from confirming the diff.
	let allowDeletes = $state(false);
	let result = $state<{ applied: MenuImportPreview['summary']; skipped_deletes: number } | null>(
		null,
	);

	const deletions = $derived(preview?.changes.filter((c) => c.kind === 'delete') ?? []);
	const edits = $derived(preview?.changes.filter((c) => c.kind !== 'delete') ?? []);

	function pick(f: File | null) {
		if (!f) return;
		if (!f.name.toLowerCase().endsWith('.xlsx')) {
			error = 'Excelファイル（.xlsx）を選んでください';
			return;
		}
		file = f;
		error = null;
		runPreview();
	}

	async function runPreview() {
		if (!file) return;
		busy = true;
		error = null;
		try {
			preview = await previewMenuImport(file);
			allowDeletes = false; // never carry an opt-in across files
			step = 'review';
		} catch (err: any) {
			error =
				err instanceof AuthExpiredError
					? 'セッションが切れました。再ログインしてください。'
					: err?.message || 'ファイルの確認に失敗しました';
		} finally {
			busy = false;
		}
	}

	async function runApply() {
		if (!file || !preview) return;
		busy = true;
		error = null;
		try {
			result = await applyMenuImport(file, preview.token, allowDeletes);
			step = 'done';
			onApplied?.();
		} catch (err: any) {
			error =
				err instanceof AuthExpiredError
					? 'セッションが切れました。再ログインしてください。'
					: err?.message || 'インポートに失敗しました';
		} finally {
			busy = false;
		}
	}

	function reset() {
		step = 'pick';
		file = null;
		preview = null;
		result = null;
		allowDeletes = false;
		error = null;
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		pick(e.dataTransfer?.files?.[0] ?? null);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !busy) onClose();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
	<div class="bg-white w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl">
		<!-- Header -->
		<header class="border-b border-stone-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
			<div>
				<h2 class="text-sm font-medium text-stone-800 tracking-wide">Excelから読み込み</h2>
				<p class="text-[11px] text-stone-500 mt-0.5">
					書き出したファイルを編集して戻します（確認するまで保存されません）
				</p>
			</div>
			<button
				onclick={onClose}
				disabled={busy}
				class="text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-40"
				aria-label="閉じる"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</header>

		<div class="flex-1 overflow-y-auto px-6 py-5">
			{#if error}
				<div class="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>
			{/if}

			<!-- STEP 1: choose a file -->
			{#if step === 'pick'}
				<div
					class="border-2 border-dashed {dragOver ? 'border-stone-500 bg-stone-50' : 'border-stone-300'} px-6 py-12 text-center transition-colors"
					ondragover={(e) => { e.preventDefault(); dragOver = true; }}
					ondragleave={() => { dragOver = false; }}
					ondrop={onDrop}
					role="region"
					aria-label="ファイルをドロップ"
				>
					<svg class="w-8 h-8 mx-auto text-stone-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
							d="M7 16a4 4 0 01-.88-7.9A5 5 0 1115.9 6H16a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
					</svg>
					<p class="text-xs text-stone-600 mb-1">Excelファイル（.xlsx）をドロップ</p>
					<p class="text-[11px] text-stone-400 mb-4">または</p>
					<label class="inline-block px-4 py-2 border border-stone-300 text-[10px] tracking-widest uppercase text-stone-700 hover:border-stone-400 cursor-pointer transition-colors">
						ファイルを選ぶ
						<input
							type="file"
							accept=".xlsx"
							class="hidden"
							onchange={(e) => pick((e.currentTarget as HTMLInputElement).files?.[0] ?? null)}
						/>
					</label>
					{#if busy}
						<p class="text-[11px] text-stone-500 mt-4">確認中…</p>
					{/if}
				</div>
				<p class="text-[11px] text-stone-500 mt-4 leading-relaxed">
					「Excel」ボタンで書き出したファイルを使ってください。<br />
					データシート（「〜 data」）の <code class="bg-stone-100 px-1">dish_text</code> 欄などを編集できます。
					ID列は変更しないでください。
				</p>

			<!-- STEP 2: review the diff (nothing is written yet) -->
			{:else if step === 'review' && preview}
				<div class="flex items-center gap-4 mb-5 text-xs">
					<span class="text-emerald-700">変更 {preview.summary.updates}</span>
					<span class="text-blue-700">追加 {preview.summary.inserts}</span>
					<span class="text-red-700">削除 {preview.summary.deletes}</span>
					<span class="text-stone-400">変更なし {preview.summary.unchanged}</span>
				</div>

				{#each preview.warnings as warning}
					<div class="mb-3 border border-amber-300 bg-amber-50 px-4 py-2.5 text-[11px] text-amber-900">
						{warning}
					</div>
				{/each}

				{#if preview.changes.length === 0}
					<p class="text-xs text-stone-500 py-8 text-center">変更はありません。</p>
				{:else}
					{#if edits.length > 0}
						<div class="mb-5">
							<h3 class="text-[10px] tracking-widest uppercase text-stone-500 mb-2">変更・追加</h3>
							<div class="border border-stone-200 divide-y divide-stone-100 max-h-52 overflow-y-auto">
								{#each edits as c (c.dish_id + c.kind)}
									<div class="px-3 py-2 text-xs flex items-start gap-2">
										<span class="text-[9px] uppercase tracking-wider mt-0.5 {c.kind === 'insert' ? 'text-blue-600' : 'text-emerald-600'}">
											{c.kind === 'insert' ? '追加' : '変更'}
										</span>
										<div class="min-w-0 flex-1">
											<span class="text-stone-400 text-[10px]">{c.course_name}</span>
											<div>
												{#if c.before}<span class="text-stone-400 line-through">{c.before}</span>{/if}
												<span class="text-stone-800">{c.after}</span>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Deletions are visually separated and gated behind their own opt-in. -->
					{#if deletions.length > 0}
						<div class="border-2 border-red-300 bg-red-50/50">
							<div class="px-3 py-2 border-b border-red-200 flex items-center gap-2">
								<svg class="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
								<h3 class="text-[10px] tracking-widest uppercase text-red-800 font-medium">
									削除される料理 {deletions.length}件
								</h3>
							</div>
							<div class="divide-y divide-red-100 max-h-40 overflow-y-auto">
								{#each deletions as c (c.dish_id)}
									<div class="px-3 py-1.5 text-xs">
										<span class="text-stone-400 text-[10px]">{c.course_name}</span>
										<span class="text-red-800 ml-2">{c.before}</span>
									</div>
								{/each}
							</div>
							<label class="flex items-start gap-2 px-3 py-3 border-t border-red-200 cursor-pointer">
								<input type="checkbox" bind:checked={allowDeletes} class="mt-0.5" />
								<span class="text-[11px] text-red-900 leading-snug">
									これらの料理を削除することを確認しました。<br />
									<span class="text-red-700">チェックしない場合、削除は行われません（変更・追加のみ保存）。</span>
								</span>
							</label>
						</div>
					{/if}
				{/if}

			<!-- STEP 3: result -->
			{:else if step === 'done' && result}
				<div class="py-8 text-center">
					<svg class="w-10 h-10 mx-auto text-emerald-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p class="text-sm text-stone-800 mb-2">保存しました</p>
					<p class="text-xs text-stone-500">
						変更 {result.applied.updates}・追加 {result.applied.inserts}・削除 {result.applied.deletes}
					</p>
					{#if result.skipped_deletes > 0}
						<p class="text-[11px] text-amber-700 mt-3">
							{result.skipped_deletes}件の削除は行いませんでした（確認されていないため）。
						</p>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<footer class="border-t border-stone-200 px-6 py-3 flex items-center justify-end gap-2 flex-shrink-0">
			{#if step === 'review'}
				<button
					onclick={reset}
					disabled={busy}
					class="px-4 py-2 text-[10px] tracking-widest uppercase text-stone-500 hover:text-stone-800 transition-colors disabled:opacity-40"
				>
					別のファイル
				</button>
				<button
					onclick={runApply}
					disabled={busy || (preview?.changes.length ?? 0) === 0}
					class="px-5 py-2 bg-stone-800 text-white text-[10px] tracking-widest uppercase hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{busy ? '保存中…' : deletions.length > 0 && !allowDeletes ? '変更のみ保存' : '保存する'}
				</button>
			{:else if step === 'done'}
				<button
					onclick={onClose}
					class="px-5 py-2 bg-stone-800 text-white text-[10px] tracking-widest uppercase hover:bg-stone-700 transition-colors"
				>
					閉じる
				</button>
			{:else}
				<button
					onclick={onClose}
					disabled={busy}
					class="px-4 py-2 text-[10px] tracking-widest uppercase text-stone-500 hover:text-stone-800 transition-colors disabled:opacity-40"
				>
					キャンセル
				</button>
			{/if}
		</footer>
	</div>
</div>

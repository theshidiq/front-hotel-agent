<script lang="ts">
	import {
		menuScanExtract,
		menuScanConfirm,
		menuScanSaveDraft,
		menuScanDeleteDraft,
		menuScanGetDrafts,
	} from '$lib/api';
	import type { ScannedMenuCourse, MenuGroup, MenuScanDraft } from '$lib/api';

	interface Props {
		menuGroups: MenuGroup[];
		onConfirmed: () => void;
		onClose: () => void;
	}

	let { menuGroups, onConfirmed, onClose }: Props = $props();

	type Step = 'upload' | 'loading' | 'review' | 'saving';

	let step: Step = $state('upload');
	let selectedFile: File | null = $state(null);
	let previewUrl: string | null = $state(null);
	let menuTitle: string | null = $state(null);
	let courses: ScannedMenuCourse[] = $state([]);
	let selectedGroupId: string = $state(menuGroups[0]?.id ?? '');
	let sessionId: string | null = $state(null);
	let imageUrl: string = $state('');
	let error: string | null = $state(null);
	let abortController: AbortController | null = $state(null);
	let fileInput: HTMLInputElement = $state() as HTMLInputElement;
	let dragOver = $state(false);
	let drafts: MenuScanDraft[] = $state([]);
	let loadingDrafts = $state(true);
	let savingDraft = $state(false);
	let saveTimer: ReturnType<typeof setTimeout> | null = null;

	// Only show non-kids groups (groups with allowed_courses defined)
	const selectableGroups = $derived(
		menuGroups.filter(g => g.allowed_courses && g.allowed_courses.length > 0)
	);

	const selectedGroupName = $derived(
		selectableGroups.find(g => g.id === selectedGroupId)?.name ?? ''
	);

	// Drafts for the currently selected group
	const groupDrafts = $derived(
		drafts.filter(d => d.menu_group_id === selectedGroupId)
	);

	// Load drafts on mount
	$effect(() => {
		menuScanGetDrafts().then(d => {
			drafts = d;
			loadingDrafts = false;
		});
	});

	// Auto-save draft whenever courses change (debounced 2s)
	$effect(() => {
		if (step !== 'review' || courses.length === 0) return;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => autoSaveDraft(), 2000);
	});

	async function autoSaveDraft() {
		if (!selectedGroupId || courses.length === 0 || savingDraft) return;
		savingDraft = true;
		try {
			const result = await menuScanSaveDraft({
				menu_group_id: selectedGroupId,
				menu_title: menuTitle,
				courses,
				image_url: imageUrl,
				session_id: sessionId,
			});
			sessionId = result.session_id;
		} catch {
			// silent — draft save failure shouldn't block the chef
		} finally {
			savingDraft = false;
		}
	}

	function handleFileSelect(file: File) {
		selectedFile = file;
		previewUrl = URL.createObjectURL(file);
		error = null;
	}

	function onFileInputChange(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files?.[0]) handleFileSelect(input.files[0]);
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files?.[0];
		if (file && file.type.startsWith('image/')) handleFileSelect(file);
	}

	async function startScan() {
		if (!selectedFile || !selectedGroupId) return;
		step = 'loading';
		error = null;
		abortController = new AbortController();
		try {
			const result = await menuScanExtract(selectedFile, selectedGroupId, abortController.signal);
			menuTitle = result.menu_title;
			courses = result.courses.map(c => ({ ...c }));
			sessionId = result.session_id ?? null;
			imageUrl = result.image_url;
			step = 'review';
			// Refresh drafts list
			drafts = await menuScanGetDrafts();
		} catch (err: any) {
			if (err.name === 'AbortError') {
				step = 'upload';
			} else {
				error = err.message || 'スキャンに失敗しました';
				step = 'upload';
			}
		}
	}

	function cancelScan() {
		abortController?.abort();
		step = 'upload';
	}

	function resumeDraft(draft: MenuScanDraft) {
		sessionId = draft.session_id;
		menuTitle = draft.menu_title;
		courses = draft.courses.map(c => ({ ...c }));
		imageUrl = draft.image_url;
		selectedGroupId = draft.menu_group_id;
		step = 'review';
	}

	async function discardDraft(draft: MenuScanDraft, e: MouseEvent) {
		e.stopPropagation();
		await menuScanDeleteDraft(draft.session_id);
		drafts = drafts.filter(d => d.session_id !== draft.session_id);
		if (sessionId === draft.session_id) {
			sessionId = null;
			step = 'upload';
		}
	}

	function updateCourse(idx: number, field: keyof ScannedMenuCourse, value: string) {
		courses = courses.map((c, i) =>
			i === idx ? { ...c, [field]: value || null } : c,
		);
	}

	function addCourse() {
		courses = [
			...courses,
			{ name: '', reading: null, description: null, category: 'other', sort_order: courses.length + 1 },
		];
	}

	function removeCourse(idx: number) {
		courses = courses.filter((_, i) => i !== idx);
	}

	async function confirmSave() {
		if (!selectedGroupId) return;
		// Save latest draft state first
		if (saveTimer) clearTimeout(saveTimer);
		await autoSaveDraft();

		step = 'saving';
		error = null;
		try {
			await menuScanConfirm({
				courses: courses.map(c => ({
					name: c.name,
					description: c.description,
					category: c.category,
				})),
				menu_group_id: selectedGroupId,
				seasonal_menu_id: null,
				draft_session_id: sessionId,
			});
			onConfirmed();
		} catch (err: any) {
			error = err.message || '保存に失敗しました';
			step = 'review';
		}
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleString('ja-JP', {
			month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && step !== 'saving') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="fixed inset-0 bg-stone-100 z-[60] flex flex-col overflow-hidden font-sans">

	<!-- ── Header ── -->
	<header class="border-b border-stone-200 px-6 py-3 flex justify-between items-center bg-white flex-shrink-0">
		<div class="flex items-center gap-5">
			<div class="flex items-center gap-2">
				<div class="w-1 h-5 bg-accent"></div>
				<h1 class="font-serif-jp text-lg tracking-[0.15em]">手書きメニュースキャン</h1>
			</div>

			{#if step === 'review' || step === 'saving'}
			<div class="h-6 w-px bg-stone-200"></div>
			<div class="flex flex-col gap-0.5">
				<span class="text-[8px] uppercase tracking-widest text-stone-400">保存先グループ</span>
				<select
					bind:value={selectedGroupId}
					disabled={step === 'saving'}
					class="text-xs font-medium text-stone-700 bg-transparent border-none outline-none cursor-pointer hover:text-stone-900 pr-4"
				>
					{#each selectableGroups as group}
						<option value={group.id}>{group.name}</option>
					{/each}
				</select>
			</div>
			{#if savingDraft}
			<span class="text-[9px] text-stone-400 tracking-wide animate-pulse">下書き保存中...</span>
			{:else if sessionId}
			<span class="text-[9px] text-stone-400 tracking-wide">● 下書き保存済み</span>
			{/if}
			{/if}
		</div>

		<div class="flex items-center gap-2">
			{#if step === 'review'}
			<button
				onclick={addCourse}
				class="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 text-[9px] tracking-[0.12em] hover:bg-stone-50 transition-colors uppercase font-medium"
			>
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Add Course
			</button>
			<button
				onclick={confirmSave}
				disabled={courses.length === 0 || courses.some(c => !c.name.trim())}
				class="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 text-white text-[9px] tracking-[0.12em] hover:bg-stone-700 transition-colors uppercase font-medium disabled:opacity-40 disabled:cursor-not-allowed"
			>
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
				確認して保存 ({courses.length})
			</button>
			{/if}
			{#if step !== 'saving'}
			<button
				onclick={onClose}
				class="px-3 py-1.5 border border-stone-200 text-[9px] tracking-[0.12em] hover:bg-stone-50 transition-colors uppercase font-medium"
			>
				Close
			</button>
			{/if}
		</div>
	</header>

	<!-- ── Step 1: Upload ── -->
	{#if step === 'upload'}
	<div class="flex-1 flex gap-6 p-8 overflow-auto">

		<!-- Left: scan form -->
		<div class="bg-white border border-stone-200 w-full max-w-md p-8 flex flex-col gap-5 shadow-sm flex-shrink-0 h-fit">
			<div class="text-center">
				<p class="font-serif-jp text-base tracking-[0.12em] text-stone-700">手書きメニューを撮影</p>
				<p class="text-xs text-stone-400 mt-1">シェフの手書きお品書きをスキャンします</p>
			</div>

			<!-- Group selector -->
			<div class="flex flex-col gap-1">
				<label class="text-[9px] uppercase tracking-widest text-stone-400">保存先グループ</label>
				<select
					bind:value={selectedGroupId}
					class="w-full text-sm text-stone-700 border border-stone-200 px-3 py-2 outline-none focus:border-stone-400 bg-white"
				>
					{#each selectableGroups as group}
						<option value={group.id}>{group.name}</option>
					{/each}
				</select>
			</div>

			<!-- Drop zone -->
			<div
				class="border-2 border-dashed transition-colors cursor-pointer select-none
					{dragOver ? 'border-stone-500 bg-stone-50' : 'border-stone-200 hover:border-stone-300'}
					{previewUrl ? 'p-3' : 'p-8 text-center'}"
				ondragover={(e) => { e.preventDefault(); dragOver = true; }}
				ondragleave={() => { dragOver = false; }}
				ondrop={onDrop}
				onclick={() => fileInput.click()}
				role="button"
				tabindex="0"
				onkeypress={(e) => { if (e.key === 'Enter') fileInput.click(); }}
				aria-label="画像を選択またはドロップ"
			>
				{#if previewUrl}
					<img src={previewUrl} alt="プレビュー" class="max-h-52 mx-auto object-contain" />
					<p class="text-center text-[10px] text-stone-400 mt-2 tracking-wide">クリックして変更</p>
				{:else}
					<div class="flex flex-col items-center gap-3 text-stone-400">
						<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
								d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						<div>
							<p class="text-sm font-medium text-stone-600">クリックして写真を選択</p>
							<p class="text-xs text-stone-400 mt-0.5">またはここにドロップ</p>
						</div>
					</div>
				{/if}
			</div>

			<input
				bind:this={fileInput}
				type="file"
				accept="image/*"
				capture="environment"
				class="hidden"
				onchange={onFileInputChange}
			/>

			{#if error}
			<p class="text-xs text-red-500 bg-red-50 px-3 py-2 border border-red-100">{error}</p>
			{/if}

			<button
				onclick={startScan}
				disabled={!selectedFile || !selectedGroupId}
				class="w-full py-2.5 bg-stone-800 text-white text-[10px] tracking-widest uppercase hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
				</svg>
				スキャン開始
			</button>
		</div>

		<!-- Right: saved drafts -->
		{#if !loadingDrafts && drafts.length > 0}
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2 mb-4">
				<svg class="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
				<h3 class="text-xs font-medium text-stone-600 uppercase tracking-widest">保存済み下書き</h3>
			</div>
			<div class="flex flex-col gap-2">
				{#each drafts as draft}
				<div
					class="bg-white border border-stone-200 px-4 py-3 flex items-center justify-between hover:border-stone-300 cursor-pointer transition-colors group"
					onclick={() => resumeDraft(draft)}
					role="button"
					tabindex="0"
					onkeypress={(e) => e.key === 'Enter' && resumeDraft(draft)}
				>
					<div class="flex items-center gap-4 min-w-0">
						{#if draft.image_url}
						<img src={draft.image_url} alt="" class="w-10 h-10 object-cover flex-shrink-0 border border-stone-100" />
						{/if}
						<div class="min-w-0">
							<p class="font-serif-jp text-sm tracking-[0.1em] text-stone-700 truncate">
								{draft.menu_title ?? '無題のメニュー'}
							</p>
							<p class="text-[10px] text-stone-400 mt-0.5">
								{selectableGroups.find(g => g.id === draft.menu_group_id)?.name ?? ''}
								· {draft.courses.length} コース
								· {formatDate(draft.updated_at)}
							</p>
						</div>
					</div>
					<div class="flex items-center gap-2 flex-shrink-0">
						<span class="text-[9px] uppercase tracking-widest text-stone-400 group-hover:text-stone-600 transition-colors">
							再開 →
						</span>
						<button
							onclick={(e) => discardDraft(draft, e)}
							class="text-stone-300 hover:text-red-400 transition-colors p-1"
							title="下書きを削除"
							aria-label="下書きを削除"
						>
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</button>
					</div>
				</div>
				{/each}
			</div>
		</div>
		{/if}
	</div>
	{/if}

	<!-- ── Step 2: Loading ── -->
	{#if step === 'loading'}
	<div class="flex-1 flex flex-col items-center justify-center gap-6">
		<div class="relative w-14 h-14">
			<div class="absolute inset-0 border-2 border-stone-200 rounded-full"></div>
			<div class="absolute inset-0 border-2 border-t-stone-800 rounded-full animate-spin"></div>
		</div>
		<div class="text-center">
			<p class="font-serif-jp text-base tracking-[0.15em] text-stone-700">手書きメニューを解析中</p>
			<p class="text-xs text-stone-400 mt-1.5">Claude Vision が文字を読み取っています...</p>
		</div>
		<button
			onclick={cancelScan}
			class="px-4 py-1.5 text-[10px] tracking-widest uppercase border border-stone-200 hover:bg-stone-200 transition-colors text-stone-500"
		>
			キャンセル
		</button>
	</div>
	{/if}

	<!-- ── Step 3 & 4: Review — お品書き vertical kaiseki layout ── -->
	{#if step === 'review' || step === 'saving'}
	<div class="flex-1 overflow-hidden flex flex-col bg-stone-100">

		<!-- Sub-header bar -->
		<div class="flex-shrink-0 border-b border-stone-200 bg-white px-6 py-2 flex items-center gap-4">
			<span class="text-[9px] uppercase tracking-widest text-stone-400">
				{courses.length} コース抽出 — 各列をクリックして編集
			</span>
			{#if error}
			<span class="text-xs text-red-500 ml-auto">{error}</span>
			{/if}
		</div>

		<!-- A4-landscape paper area -->
		<div class="flex-1 flex items-center justify-center p-6 overflow-hidden">
			<div class="a4-paper bg-white shadow-lg border border-stone-200 flex flex-col w-full h-full relative">
				<div class="flex-1 flex overflow-hidden" dir="rtl">

					<!-- Title column (far right) — readonly preview -->
					<div class="flex-none flex flex-col border-l border-stone-200 paper-title-col" dir="ltr">
						<div class="flex-1 flex items-start justify-center pt-4 pb-3 px-1">
							<div class="tategaki font-serif-jp text-lg font-light text-stone-800 leading-loose h-fit mt-1">
								{menuTitle || selectedGroupName}
							</div>
						</div>
					</div>

					<!-- Course columns — right to left -->
					{#each courses as course, idx}
					<div
						class="flex-none border-l border-stone-200 flex flex-col relative group course-col"
						dir="ltr"
					>
						<!-- Delete button -->
						<button
							onclick={() => removeCourse(idx)}
							class="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity text-stone-300 hover:text-red-500 bg-white/80 rounded-full p-1"
							aria-label="このコースを削除"
							title="削除"
						>
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>

						<!-- Course header (vertical text, top) -->
						<div class="px-2 pt-5 pb-1 flex flex-col items-center flex-shrink-0 course-header-box">
							<div
								class="tategaki font-serif-jp text-2xl font-normal text-stone-900 outline-none text-center hover:bg-stone-50/60 focus:bg-orange-50/40 rounded transition-colors px-1 min-h-[3em] tracking-[0.15em]"
								contenteditable="plaintext-only"
								spellcheck="false"
								onblur={(e) => updateCourse(idx, 'name', (e.target as HTMLElement).innerText)}
								role="textbox"
								tabindex="0"
								aria-label="コース名"
							>{course.name}</div>
						</div>

						<!-- 一 dash separator -->
						<div class="flex justify-center flex-shrink-0 py-1">
							<span class="font-serif-jp text-lg text-stone-800">一</span>
						</div>

						<!-- Dish details (vertical text, flows right→left into sub-columns when overflowing) -->
						<div class="flex-1 px-2 pt-2 pb-4 overflow-hidden flex justify-end">
							<div
								class="dish-details tategaki font-serif-jp text-lg leading-loose text-stone-700 outline-none hover:bg-stone-50/60 focus:bg-orange-50/40 rounded transition-colors px-1 h-full"
								contenteditable="plaintext-only"
								spellcheck="false"
								data-placeholder="料理詳細..."
								onblur={(e) => updateCourse(idx, 'description', (e.target as HTMLElement).innerText)}
								role="textbox"
								tabindex="0"
								aria-label="料理の詳細"
							>{course.description ?? ''}</div>
						</div>
					</div>
					{/each}

					{#if courses.length === 0}
					<div class="flex-1 flex flex-col items-center justify-center text-stone-300 gap-2 p-8" dir="ltr">
						<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
						</svg>
						<span class="text-xs font-serif-jp">「Add Course」でコースを追加してください</span>
					</div>
					{/if}

				</div>
			</div>
		</div>

		<!-- Bottom bar -->
		<div class="flex-shrink-0 border-t border-stone-200 bg-white px-6 py-3 flex justify-between items-center">
			<button
				onclick={() => { step = 'upload'; }}
				disabled={step === 'saving'}
				class="flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-widest uppercase border border-stone-200 hover:bg-stone-50 transition-colors text-stone-500 disabled:opacity-40"
			>
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				戻る
			</button>

			{#if step === 'saving'}
			<div class="flex items-center gap-2 text-stone-500 text-xs">
				<div class="w-3.5 h-3.5 border border-t-stone-600 rounded-full animate-spin"></div>
				メニューを作成中...
			</div>
			{/if}
		</div>
	</div>
	{/if}

</div>

<style>
	.bg-accent { background-color: #C2410C; }

	.font-serif-jp {
		font-family: 'Noto Serif JP', 'YuMincho', 'Hiragino Mincho Pro', Georgia, serif;
	}

	.tategaki {
		writing-mode: vertical-rl;
		text-orientation: mixed;
		font-family: 'Noto Serif JP', 'YuMincho', 'Hiragino Mincho Pro', Georgia, serif;
	}

	.a4-paper {
		aspect-ratio: 297 / 210;
		max-height: 100%;
	}

	.paper-title-col {
		width: clamp(60px, 7%, 120px);
	}

	.course-header-box {
		min-height: 5.5em;
		justify-content: center;
	}

	/* Each course column is wide enough to allow multiple vertical sub-lines */
	.course-col {
		width: clamp(80px, 9%, 130px);
	}

	/* Dish details:
	   writing-mode: vertical-rl means text reads top-to-bottom.
	   When the text exceeds container height, it naturally wraps into a new
	   line to the LEFT — exactly like Japanese kaiseki menu paper.
	   We just need to ensure the container has a constrained height
	   and the text can expand horizontally inside the column. */
	.dish-details {
		max-height: 100%;
		max-width: 100%;
		word-break: break-all;
	}

	/* Placeholder for empty contenteditable */
	[contenteditable][data-placeholder]:empty::before {
		content: attr(data-placeholder);
		color: rgb(214 211 209);
		writing-mode: vertical-rl;
	}
</style>

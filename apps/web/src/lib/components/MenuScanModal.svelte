<script lang="ts">
	import {
		menuScanExtract,
		menuScanConfirm,
		menuScanSaveDraft,
		menuScanDeleteDraft,
		menuScanGetDrafts,
	} from '$lib/api';
	import type { ScannedMenuCourse, MenuGroup, MenuScanDraft } from '$lib/api';
	import { dndzone, SHADOW_ITEM_MARKER_PROPERTY_NAME, type DndEvent } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';

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

	// ── Editable dish model (drag-and-drop source of truth) ──
	// Each course holds its dishes as STABLE sub-column arrays (cols: Dish[][]).
	// svelte-dnd-action mutates each column array directly, so the arrays must be
	// real state (not derived on the fly) — otherwise the drag shadow gets stuck.
	// `courses` (above) stays the serialized form consumed by save/draft/share/PDF.
	type Dish = { id: string; text: string };
	type WorkCourse = {
		id: string;
		name: string;
		reading: string | null;
		category: string;
		sort_order: number;
		cols: Dish[][];   // sub-columns, col 0 = first/rightmost
	};
	let workCourses: WorkCourse[] = $state([]);
	let dishIdSeq = 0;
	const newId = (p: string) => `${p}-${Date.now().toString(36)}-${(dishIdSeq++).toString(36)}`;

	const DEFAULT_PER_COL = 3;   // default split: 3 dishes per column

	// Split a flat dish list into default sub-columns of DEFAULT_PER_COL.
	function defaultCols(dishes: Dish[]): Dish[][] {
		if (dishes.length === 0) return [[]];
		const cols: Dish[][] = [];
		for (let i = 0; i < dishes.length; i += DEFAULT_PER_COL) {
			cols.push(dishes.slice(i, i + DEFAULT_PER_COL));
		}
		return cols;
	}

	// Build the ID'd work model from the serialized courses (called on enter-review).
	function buildWorkCourses(src: ScannedMenuCourse[]): WorkCourse[] {
		return src.map((c) => ({
			id: newId('course'),
			name: c.name,
			reading: c.reading,
			category: c.category,
			sort_order: c.sort_order,
			cols: defaultCols(splitItems(c.description).map((text) => ({ id: newId('dish'), text }))),
		}));
	}

	// Serialize the work model back into `courses`. Dishes are emitted in
	// column order (col 0 first), joined with ・ — backend stays a flat string.
	function syncCoursesFromWork() {
		courses = workCourses.map((wc, i) => {
			const ordered = wc.cols.flat();
			return {
				name: wc.name,
				reading: wc.reading,
				category: wc.category,
				sort_order: i + 1,
				description: ordered.map((d) => d.text).join('・') || null,
			};
		});
	}
	let selectedGroupId: string = $state(menuGroups[0]?.id ?? '');
	let sessionId: string | null = $state(null);
	let imageUrl: string = $state('');
	let error: string | null = $state(null);
	let abortController: AbortController | null = $state(null);
	let fileInput: HTMLInputElement = $state() as HTMLInputElement;
	let dragOver = $state(false);
	let editingNameIdx: number | null = $state(null);  // which course's name is being edited

	// ── Fit-to-width scaling ──
	// The paper has a fixed natural width so the layout is identical on every
	// device. When the viewport is narrower, we scale the whole paper down so it
	// always fits with no horizontal scroll (proportions stay the same).
	let paperScale = $state(1);
	let scaledPaperH = $state(0);   // height the scaled paper occupies in layout flow
	let scaledPaperW = $state(0);   // width  the scaled paper occupies in layout flow

	const COL_W = 130;        // course column width (matches CSS)
	const TITLE_W = 115;      // title column width (matches CSS)
	const PAPER_PAD_X = 32;   // .a4-paper px-4 → 16px * 2

	// Natural paper width computed directly from the column count, so the paper
	// is always exactly wide enough to show every course (no clipping).
	let paperNaturalW = $derived(TITLE_W + courses.length * COL_W + PAPER_PAD_X);

	function fitPaper(scrollEl: HTMLElement) {
		const cs = getComputedStyle(scrollEl);
		const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
		const avail = scrollEl.clientWidth - padX;
		const paper = scrollEl.querySelector('.a4-paper') as HTMLElement | null;
		if (!paper) return;
		const naturalH = paper.offsetHeight;
		const scale = Math.min(1, avail / paperNaturalW);
		paperScale = scale;
		scaledPaperH = naturalH * scale;
		scaledPaperW = paperNaturalW * scale;
	}

	// Svelte action: keep the paper fitted to the scroll area on mount + resize.
	function fitToWidth(node: HTMLElement) {
		const update = () => fitPaper(node);
		const ro = new ResizeObserver(update);
		ro.observe(node);
		// Also observe the paper itself (its height changes as columns are edited)
		const paper = node.querySelector('.a4-paper');
		if (paper) ro.observe(paper);
		update();
		return { destroy() { ro.disconnect(); } };
	}

	// Dish-detail editor popup
	let descEditorIdx: number | null = $state(null);   // which course's description is open in the editor
	let descEditorItems: string[] = $state([]);        // working list of dish items
	let descEditorItemFocus: number | null = $state(null);  // which item input to autofocus

	function openDescEditor(idx: number) {
		descEditorItems = workCourses[idx].cols.flat().map((d) => d.text);
		if (descEditorItems.length === 0) descEditorItems = [''];
		descEditorIdx = idx;
		descEditorItemFocus = descEditorItems.length - 1;
	}

	function addDescItem() {
		descEditorItems = [...descEditorItems, ''];
		descEditorItemFocus = descEditorItems.length - 1;
	}

	function removeDescItem(i: number) {
		descEditorItems = descEditorItems.filter((_, idx) => idx !== i);
	}

	function saveDescEditor() {
		if (descEditorIdx === null) return;
		// The editor is a flat text list; re-apply the default column split.
		// (Fine column arrangement is done by dragging dishes between columns.)
		const dishes = descEditorItems
			.map((s) => s.trim())
			.filter(Boolean)
			.map((text) => ({ id: newId('dish'), text }));
		const cols = defaultCols(dishes);
		workCourses = workCourses.map((c, i) => (i === descEditorIdx ? { ...c, cols } : c));
		descEditorIdx = null;
	}

	function cancelDescEditor() {
		descEditorIdx = null;
	}

	// Kids menu callout box (overlay on the お品書き paper)
	let kidsName: string = $state('子供 CK70');
	let kidsItems: string[] = $state(['造里', '本日の肉料理', '香物', '香物']);
	let showKidsBox: boolean = $state(true);
	let editingKidsName = $state(false);
	let editingKidsItemIdx: number | null = $state(null);
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

	// Convert ASCII digits to full-width so they render upright in vertical text
	// (e.g. 令和8年 → 令和８年). Letters are left as-is.
	function toFullWidthDigits(s: string): string {
		return s.replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0xFEE0));
	}

	const displayTitle = $derived(toFullWidthDigits(menuTitle || selectedGroupName));

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

	// Keep the serialized `courses` in sync with the editable work model.
	$effect(() => {
		// touch workCourses deeply so this re-runs on any dish/name/order change
		JSON.stringify(workCourses);
		syncCoursesFromWork();
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

	// Auto-focus for plain <input> elements (optionally gated by a boolean)
	function autoFocusInput(node: HTMLInputElement, shouldFocus: boolean = true) {
		if (shouldFocus === false) return;
		node.focus();
		node.select();
	}

	// ── Print & Share ───────────────────────────────────────────────────────

	let paperEl: HTMLDivElement | null = $state(null);   // the お品書き A4 paper element
	let generatingPdf = $state(false);
	let isCapturing = $state(false);   // true only while rendering for PDF/print → dishes auto-balance

	// Render the on-screen paper to an A4 landscape PDF (looks exactly like the screen).
	async function buildPdf(): Promise<import('jspdf').jsPDF | null> {
		if (!paperEl) return null;
		const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
			import('html2canvas-pro'),
			import('jspdf'),
		]);

		// Hide editing affordances during capture, and neutralise the on-screen
		// fit-to-width scaling so the FULL paper (all columns) is captured at its
		// natural size — otherwise the scaled/clipped layout drops the last column.
		const prevTransform = paperEl.style.transform;
		const prevWidth = paperEl.style.width;
		isCapturing = true;                 // switch dishes to balanced multi-column layout
		paperEl.classList.add('capturing');
		paperEl.style.transform = 'none';
		paperEl.style.width = paperNaturalW + 'px';
		// two frames so the balanced layout fully renders before capture
		await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

		let canvas: HTMLCanvasElement;
		try {
			canvas = await html2canvas(paperEl, {
				scale: 2,                 // crisp output
				backgroundColor: '#ffffff',
				useCORS: true,
				logging: false,
				width: paperEl.scrollWidth,
				height: paperEl.scrollHeight,
				windowWidth: paperEl.scrollWidth,
			});
		} finally {
			paperEl.classList.remove('capturing');
			paperEl.style.transform = prevTransform;
			paperEl.style.width = prevWidth;
			isCapturing = false;
		}

		const imgData = canvas.toDataURL('image/jpeg', 0.95);
		const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
		const pageW = pdf.internal.pageSize.getWidth();   // 297
		const pageH = pdf.internal.pageSize.getHeight();  // 210

		// Fit the captured paper within the page while preserving aspect ratio
		const imgRatio = canvas.width / canvas.height;
		const pageRatio = pageW / pageH;
		let w = pageW, h = pageH;
		if (imgRatio > pageRatio) {
			h = pageW / imgRatio;
		} else {
			w = pageH * imgRatio;
		}
		const x = (pageW - w) / 2;
		const y = (pageH - h) / 2;
		pdf.addImage(imgData, 'JPEG', x, y, w, h);
		return pdf;
	}

	async function handlePrint() {
		generatingPdf = true;
		try {
			const pdf = await buildPdf();
			if (pdf) {
				pdf.autoPrint();
				// Open the PDF in a new tab/window which triggers the print dialog
				const blobUrl = pdf.output('bloburl');
				window.open(blobUrl, '_blank');
			}
		} catch (err) {
			console.error('Print failed:', err);
			window.print();   // fallback
		} finally {
			generatingPdf = false;
		}
	}

	async function handleDownloadPdf() {
		generatingPdf = true;
		try {
			const pdf = await buildPdf();
			if (pdf) {
				const title = (menuTitle || selectedGroupName || 'menu').replace(/[\s\/\\]+/g, '_');
				pdf.save(`${title}.pdf`);
			}
		} catch (err) {
			console.error('PDF download failed:', err);
		} finally {
			generatingPdf = false;
		}
	}

	// Web Share API — opens native share sheet (AirDrop on iOS/macOS Safari, etc.)
	let canShare = $state(false);
	let sharing = $state(false);
	$effect(() => {
		canShare = typeof navigator !== 'undefined' && !!navigator.share;
	});

	async function handleShare() {
		if (!navigator.share) {
			alert('お使いのブラウザは共有機能に対応していません。Safari をお試しください。');
			return;
		}
		sharing = true;
		try {
			const title = (menuTitle || selectedGroupName || 'お品書き');
			const fileName = title.replace(/[\s\/\\]+/g, '_');

			// Try to share the visual PDF (AirDrop sends the actual menu image)
			const pdf = await buildPdf();
			const blob = pdf ? pdf.output('blob') : null;
			const file = blob ? new File([blob], `${fileName}.pdf`, { type: 'application/pdf' }) : null;

			if (file && navigator.canShare?.({ files: [file] })) {
				await navigator.share({ title, files: [file] });
			} else {
				// Fallback to plain-text share
				const lines = [
					title, '',
					...courses.map(c => `【${c.name}】\n${c.description ?? ''}`),
				];
				if (showKidsBox) {
					lines.push('', `【${kidsName}】`, ...kidsItems.map(i => `・${i}`));
				}
				await navigator.share({ title, text: lines.join('\n') });
			}
		} catch (err: any) {
			if (err.name !== 'AbortError') {
				console.error('Share failed:', err);
			}
		} finally {
			sharing = false;
		}
	}

	// Auto-focus action — places caret at end when switching to edit mode
	function autoFocusContentEditable(node: HTMLElement, shouldFocus: boolean = true) {
		if (shouldFocus === false) return;
		node.focus();
		const range = document.createRange();
		range.selectNodeContents(node);
		range.collapse(false);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);
	}

	// Split long course names (> 3 chars) into 2 balanced vertical lines.
	// Returns [firstHalf, secondHalf]. Caller renders firstHalf on the RIGHT,
	// secondHalf on the LEFT (Japanese reading order — top-to-bottom, right-to-left).
	// Names ≤ 3 chars are returned as a single-element array.
	function splitCourseName(name: string): string[] {
		if (!name) return [''];
		if (name.length <= 3) return [name];
		const mid = Math.ceil(name.length / 2);
		return [name.slice(0, mid), name.slice(mid)];
	}

	// Split description into individual dish items (by ・、,，or newline)
	function splitItems(description: string | null | undefined): string[] {
		if (!description) return [];
		return description.trim().split(/[・、,，\n]+/).map(s => s.trim()).filter(Boolean);
	}

	// Group items into balanced sub-columns based on total character length.
	// `targetPerCol` defaults to 14 chars per visual column. For columns sitting
	// next to the kids box overlay, pass a smaller value (e.g. 8) so the text
	// stays shorter vertically and wraps into more sub-columns horizontally.
	function balanceByLength(items: string[], targetPerCol = 14): string[][] {
		if (items.length === 0) return [];
		if (items.length <= 3 && targetPerCol >= 10) return [items];

		const totalChars = items.reduce((s, i) => s + i.length, 0);
		const numCols = Math.max(1, Math.ceil(totalChars / targetPerCol));
		const targetActual = totalChars / numCols;

		const groups: string[][] = [];
		let current: string[] = [];
		let currentLen = 0;

		for (const item of items) {
			current.push(item);
			currentLen += item.length + 1;
			if (currentLen >= targetActual && groups.length < numCols - 1) {
				groups.push(current);
				current = [];
				currentLen = 0;
			}
		}
		if (current.length > 0) groups.push(current);
		return groups;
	}

	async function startScan() {
		if (!selectedFile || !selectedGroupId) return;
		step = 'loading';
		error = null;
		abortController = new AbortController();
		try {
			const result = await menuScanExtract(selectedFile, selectedGroupId, abortController.signal);
			menuTitle = result.menu_title;
			workCourses = buildWorkCourses(result.courses);
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
		workCourses = buildWorkCourses(draft.courses);
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

	function updateCourse(idx: number, field: 'name' | 'reading' | 'category', value: string) {
		workCourses = workCourses.map((c, i) =>
			i === idx ? { ...c, [field]: value || (field === 'category' ? 'other' : null) } : c,
		);
	}

	function addCourse() {
		workCourses = [
			...workCourses,
			{ id: newId('course'), name: '', reading: null, category: 'other', sort_order: workCourses.length + 1, cols: [[]] },
		];
	}

	function removeCourse(idx: number) {
		workCourses = workCourses.filter((_, i) => i !== idx);
	}

	// ── Dish drag-and-drop (svelte-dnd-action) ──
	const flipDurationMs = 160;

	// While dragging (consider): just set the affected column's items as the lib
	// gives them (it manages the shadow placeholder). Do NOT rebuild/renumber here.
	function considerSubCol(courseIdx: number, colIdx: number, e: CustomEvent<DndEvent<Dish>>) {
		const wc = workCourses[courseIdx];
		if (!wc) return;
		const cols = wc.cols.map((c) => c.slice());
		while (cols.length <= colIdx) cols.push([]);
		cols[colIdx] = e.detail.items;
		workCourses[courseIdx] = { ...wc, cols };
	}

	// On drop (finalize): set the column, then drop any now-empty columns so we
	// don't accumulate blank sub-columns. (Single empty column for an empty course
	// is preserved by defaultCols at render time.)
	function finalizeSubCol(courseIdx: number, colIdx: number, e: CustomEvent<DndEvent<Dish>>) {
		const wc = workCourses[courseIdx];
		if (!wc) return;
		const cols = wc.cols.map((c) => c.slice());
		while (cols.length <= colIdx) cols.push([]);
		cols[colIdx] = e.detail.items;
		const pruned = cols.filter((c) => c.length > 0);
		workCourses[courseIdx] = { ...wc, cols: pruned.length ? pruned : [[]] };
		newColZone = [];
	}

	// The leftmost "new column" drop target binds to this shared array (only one
	// drag at a time). During consider it shows the incoming dish; on finalize the
	// finalizeSubCol above appends it as a real new column.
	let newColZone: Dish[] = $state([]);
	function considerNewCol(e: CustomEvent<DndEvent<Dish>>) {
		newColZone = e.detail.items;
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
		if (e.key === 'Escape') {
			if (descEditorIdx !== null) { cancelDescEditor(); return; }
			if (step !== 'saving') onClose();
			return;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="menu-scan-modal fixed inset-0 bg-stone-100 z-[60] flex flex-col overflow-hidden font-sans">

	<!-- ── Header ── -->
	<header class="border-b border-stone-200 px-6 py-3 flex justify-between items-center bg-white flex-shrink-0 print:hidden">
		<div class="flex items-center gap-5">
			{#if step === 'review'}
			<button
				onclick={() => { step = 'upload'; }}
				class="flex items-center gap-1.5 px-2 py-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors rounded print:hidden"
				title="戻る"
				aria-label="戻る"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				<span class="text-[10px] tracking-[0.12em] uppercase font-medium">戻る</span>
			</button>
			<div class="h-6 w-px bg-stone-200"></div>
			{/if}
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
				class="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 text-[9px] tracking-[0.12em] hover:bg-stone-50 transition-colors uppercase font-medium print:hidden"
			>
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Add Course
			</button>
			{#if canShare}
			<button
				onclick={handleShare}
				disabled={sharing}
				class="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 text-[9px] tracking-[0.12em] hover:bg-stone-50 transition-colors uppercase font-medium print:hidden disabled:opacity-40"
				title="共有 (AirDrop, メッセージなど)"
			>
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
				</svg>
				Share
			</button>
			{/if}
			<button
				onclick={handleDownloadPdf}
				disabled={generatingPdf}
				class="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 text-[9px] tracking-[0.12em] hover:bg-stone-50 transition-colors uppercase font-medium print:hidden disabled:opacity-40"
				title="PDF保存"
			>
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
				PDF
			</button>
			<button
				onclick={handlePrint}
				disabled={generatingPdf}
				class="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 text-[9px] tracking-[0.12em] hover:bg-stone-50 transition-colors uppercase font-medium print:hidden disabled:opacity-40"
				title="印刷"
			>
				{#if generatingPdf}
				<div class="w-3 h-3 border border-stone-300 border-t-stone-600 rounded-full animate-spin"></div>
				{:else}
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
				</svg>
				{/if}
				Print
			</button>
			<button
				onclick={confirmSave}
				disabled={courses.length === 0 || courses.some(c => !c.name.trim())}
				class="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 text-white text-[9px] tracking-[0.12em] hover:bg-stone-700 transition-colors uppercase font-medium disabled:opacity-40 disabled:cursor-not-allowed print:hidden"
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
				class="px-3 py-1.5 border border-stone-200 text-[9px] tracking-[0.12em] hover:bg-stone-50 transition-colors uppercase font-medium print:hidden"
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
		<div class="flex-shrink-0 border-b border-stone-200 bg-white px-6 py-2 flex items-center gap-4 print:hidden">
			<span class="text-[9px] uppercase tracking-widest text-stone-400">
				{courses.length} コース抽出 — 各列をクリックして編集
			</span>
			{#if error}
			<span class="text-xs text-red-500 ml-auto">{error}</span>
			{/if}
		</div>

		<!-- A4-landscape paper area. The paper has a fixed natural width (consistent
		     across devices) and is scaled down to fit narrower screens — no
		     horizontal scroll. PDF capture removes the scale (see .capturing). -->
		<div class="scan-paper-scroll flex-1 flex items-start justify-center p-6 overflow-auto" use:fitToWidth>
			<!-- Sizing wrapper reserves the *scaled* footprint so the flow size is correct -->
			<div class="scan-paper-fit" style="height: {scaledPaperH ? scaledPaperH + 'px' : 'auto'}; width: {scaledPaperW ? scaledPaperW + 'px' : '1360px'};">
			<div bind:this={paperEl} class="a4-paper bg-white shadow-lg border border-stone-200 flex flex-col relative pt-6 px-4" style="width: {paperNaturalW ? paperNaturalW + 'px' : 'max-content'}; transform: scale({paperScale}); transform-origin: top left;">
				<div class="scan-paper-columns flex" dir="rtl">

					<!-- Title column (far right) — top-aligned to match course columns, larger font -->
					<div class="flex-none flex flex-col border-l border-stone-200 paper-title-col" dir="ltr">
						<div class="flex-1 flex items-start justify-center px-1 pt-[8%]">
							<div class="tategaki font-serif-jp text-4xl font-light text-stone-800 leading-loose tracking-[0.25em] text-center">
								{displayTitle}
							</div>
						</div>
					</div>

					<!-- Course columns — right to left, evenly distributed. -->
					{#each workCourses as course, idx (course.id)}
					{@const isUnderKidsBox = showKidsBox && (idx === 0 || idx === 1)}
					{@const dishCount = course.cols.reduce((n, c) => n + c.length, 0)}
					{@const groups = course.cols.map((col) => col.map((d) => d.text))}
					{@const nameLines = splitCourseName(course.name)}
					{@const isEditingName = editingNameIdx === idx}
					<div
						class="flex-1 min-w-0 min-h-0 border-l border-stone-200 flex flex-col relative group course-col overflow-hidden"
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

						<!-- Course header — long names pre-split into 2 vertical lines (right-to-left)
						     so the 一 separator stays at the same height across all columns.
						     Click → flat edit mode; blur → saves & re-splits. -->
						<div class="pt-2 pb-1 flex items-start justify-center flex-shrink-0 course-header-box">
							{#if isEditingName}
								<div
									class="tategaki font-serif-jp text-2xl font-normal text-stone-900 outline-none bg-orange-50/40 rounded px-1 tracking-[0.15em] text-center"
									contenteditable="plaintext-only"
									spellcheck="false"
									use:autoFocusContentEditable
									onblur={(e) => {
										updateCourse(idx, 'name', (e.target as HTMLElement).innerText);
										editingNameIdx = null;
									}}
									role="textbox"
									tabindex="0"
									aria-label="コース名"
								>{course.name}</div>
							{:else}
								<div
									class="flex flex-row-reverse gap-1 cursor-text hover:bg-stone-50/60 rounded transition-colors px-1"
									onclick={() => { editingNameIdx = idx; }}
									role="button"
									tabindex="0"
									onkeydown={(e) => { if (e.key === 'Enter') editingNameIdx = idx; }}
									aria-label="コース名を編集"
								>
									{#each nameLines as line}
										<div class="tategaki font-serif-jp text-2xl font-normal text-stone-900 tracking-[0.15em]">
											{line}
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<!-- 一 dash separator -->
						<div class="flex justify-center flex-shrink-0 py-1">
							<span class="font-serif-jp text-xl text-stone-800">一</span>
						</div>

						{#if isCapturing}
							<!-- PDF/PRINT view: pre-balanced groups, each its own vertical sub-column
							     (the handwritten-menu look). Static, no drag affordances. -->
							<div
								class="flex-1 px-2 pt-3 overflow-hidden {groups.length <= 1 ? 'block' : 'flex justify-center items-start gap-2'}"
								style="padding-bottom: {isUnderKidsBox ? '30%' : '1rem'}"
							>
								{#if dishCount > 0 && groups.length <= 1}
									<div class="w-full grid place-items-center py-1">
										<div class="dish-display tategaki font-serif-jp text-xl text-stone-700 h-fit">
											{groups[0].join('　')}
										</div>
									</div>
								{:else if dishCount > 0}
									<div class="flex flex-row-reverse items-start gap-2 py-1">
										{#each groups as group, gIdx}
											<div class="dish-display tategaki font-serif-jp text-xl text-stone-700 h-fit {gIdx > 0 ? 'mt-[2.5em]' : ''}">
												{group.join('　')}
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{:else}
							<!-- EDIT view: dishes flow into stepped sub-columns (right→left),
							     each a drop zone. Drag up/down to reorder, left/right to move
							     a dish into another sub-column, or onto another course. Drag a
							     dish into the leftmost dashed zone to start a NEW column. -->
							<div
								class="flex-1 px-2 pt-3 overflow-auto flex flex-row-reverse justify-center items-start gap-1.5 cursor-pointer"
								style="padding-bottom: {isUnderKidsBox ? '30%' : '1rem'}"
								onclick={(e) => { if (e.target === e.currentTarget) openDescEditor(idx); }}
								role="button"
								tabindex="-1"
								aria-label="料理を編集"
							>
								{#if dishCount === 0}
									<button
										onclick={() => openDescEditor(idx)}
										class="dish-placeholder tategaki font-serif-jp text-base text-stone-300 hover:text-stone-500 transition-colors py-2"
										aria-label="料理を追加"
									>料理詳細...</button>
								{/if}
								{#each course.cols as col, colIdx (colIdx)}
									<div
										class="dish-dndzone flex flex-col items-center gap-1 {colIdx > 0 ? 'mt-[2.5em]' : ''}"
										use:dndzone={{ items: col, flipDurationMs, dropTargetStyle: { outline: '2px dashed #C29E67', 'border-radius': '6px' }, type: 'dish' }}
										onconsider={(e) => considerSubCol(idx, colIdx, e)}
										onfinalize={(e) => finalizeSubCol(idx, colIdx, e)}
									>
										{#each col as dish (dish.id)}
											<div
												class="dish-card group/dish relative tategaki font-serif-jp text-xl text-stone-700 px-1.5 py-1 rounded cursor-grab active:cursor-grabbing hover:bg-orange-50/60 transition-colors"
												class:dish-shadow={dish[SHADOW_ITEM_MARKER_PROPERTY_NAME]}
												animate:flip={{ duration: flipDurationMs }}
												onclick={() => openDescEditor(idx)}
												onkeydown={(e) => { if (e.key === 'Enter') openDescEditor(idx); }}
												role="button"
												tabindex="0"
												aria-label="{dish.text} を編集"
											>
												{dish.text}
											</div>
										{/each}
									</div>
								{/each}
								{#if dishCount > 0}
									<!-- New-column drop target (leftmost). Drag a dish here to split. -->
									<div
										class="dish-newcol-zone flex flex-col items-center justify-start gap-1 min-w-[1.6em] self-stretch rounded border border-dashed border-transparent hover:border-stone-300 transition-colors mt-[2.5em]"
										use:dndzone={{ items: newColZone, flipDurationMs, dropTargetStyle: { outline: '2px dashed #C29E67', 'border-radius': '6px' }, type: 'dish' }}
										onconsider={considerNewCol}
										onfinalize={(e) => finalizeSubCol(idx, course.cols.length, e)}
										aria-label="新しい列に移動"
									>
										{#each newColZone as dish (dish.id)}
											<div class="dish-card tategaki font-serif-jp text-xl text-stone-700 px-1.5 py-1" class:dish-shadow={dish[SHADOW_ITEM_MARKER_PROPERTY_NAME]}>{dish.text}</div>
										{/each}
									</div>
								{/if}
							</div>
							<!-- Add / edit dishes -->
							<div class="flex justify-center flex-shrink-0 pb-1 print:hidden">
								<button
									onclick={() => openDescEditor(idx)}
									class="text-[10px] text-stone-400 hover:text-stone-700 transition-colors"
									aria-label="料理を編集"
								>
									{dishCount === 0 ? '＋ 料理' : '編集'}
								</button>
							</div>
						{/if}
					</div>
					{/each}

					{#if workCourses.length === 0}
					<div class="flex-1 flex flex-col items-center justify-center text-stone-300 gap-2 p-8" dir="ltr">
						<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
						</svg>
						<span class="text-xs font-serif-jp">「Add Course」でコースを追加してください</span>
					</div>
					{/if}

				<!-- Kids menu callout — sits inside the menu band, anchored to the
				     bottom-right corner (over the 食前酒 / 前菜 area). -->
				<div class="scan-kids-wrap" dir="ltr">
				{#if showKidsBox}
				<div class="kids-box border-2 border-dashed border-stone-400 bg-white px-4 py-3 flex flex-col gap-1.5 group/kids shadow-sm w-[180px]" dir="ltr">
					<!-- Remove button (only on hover) -->
					<button
						onclick={() => { showKidsBox = false; }}
						class="absolute top-1 right-1 opacity-0 group-hover/kids:opacity-100 transition-opacity text-stone-400 hover:text-red-500 p-0.5"
						aria-label="子供メニューを削除"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>

					<!-- Kids menu header -->
					{#if editingKidsName}
						<input
							type="text"
							bind:value={kidsName}
							onblur={() => { editingKidsName = false; }}
							onkeydown={(e) => { if (e.key === 'Enter') editingKidsName = false; }}
							use:autoFocusInput
							class="font-serif-jp text-lg font-medium text-stone-800 bg-white outline-none border border-stone-300 rounded px-1.5 py-0.5 tracking-wider"
						/>
					{:else}
						<button
							onclick={() => { editingKidsName = true; }}
							class="font-serif-jp text-lg font-medium text-stone-800 tracking-wider text-left hover:bg-stone-50 rounded px-1.5 py-0.5 transition-colors"
						>
							{kidsName}
						</button>
					{/if}

					<!-- Divider -->
					<div class="w-full border-t border-dashed border-stone-300"></div>

					<!-- Items -->
					<div class="flex flex-col gap-1">
						{#each kidsItems as item, kidsIdx}
							{#if editingKidsItemIdx === kidsIdx}
								<input
									type="text"
									bind:value={kidsItems[kidsIdx]}
									onblur={() => { editingKidsItemIdx = null; }}
									onkeydown={(e) => { if (e.key === 'Enter') editingKidsItemIdx = null; }}
									use:autoFocusInput
									class="font-serif-jp text-base text-stone-700 bg-white outline-none border border-stone-300 rounded px-1.5 py-0.5"
								/>
							{:else}
								<div class="group/item flex items-center gap-2">
									<span class="text-stone-500 text-sm">・</span>
									<button
										onclick={() => { editingKidsItemIdx = kidsIdx; }}
										class="font-serif-jp text-base text-stone-700 hover:bg-stone-50 rounded px-1.5 py-0.5 transition-colors flex-1 text-left tracking-wide"
									>
										{item}
									</button>
									<button
										onclick={() => { kidsItems = kidsItems.filter((_, i) => i !== kidsIdx); }}
										class="opacity-0 group-hover/item:opacity-100 transition-opacity text-stone-300 hover:text-red-500 p-0.5"
										aria-label="項目を削除"
									>
										<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							{/if}
						{/each}

						<!-- Add item button (hidden on print) -->
						<button
							onclick={() => { kidsItems = [...kidsItems, '']; editingKidsItemIdx = kidsItems.length; }}
							class="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 mt-1.5 transition-colors print:hidden"
						>
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
							追加
						</button>
					</div>
				</div>
				{:else}
				<!-- Show "Add kids menu" button when hidden -->
				<button
					onclick={() => { showKidsBox = true; }}
					class="scan-add-kids flex items-center gap-1 px-2 py-1 border border-dashed border-stone-300 text-[10px] text-stone-400 hover:text-stone-600 hover:border-stone-400 transition-colors print:hidden"
				>
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					子供メニュー
				</button>
				{/if}
				</div>
				</div>
			</div>
			</div>
		</div>

		<!-- Bottom bar -->
		{#if step === 'saving'}
		<!-- Floating saving spinner overlay (no full bottom bar) -->
		<div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-stone-800 text-white text-xs rounded-full shadow-lg print:hidden">
			<div class="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin"></div>
			メニューを作成中...
		</div>
		{/if}
	</div>
	{/if}

	<!-- ── Dish detail editor popup ── -->
	{#if descEditorIdx !== null}
	<div
		class="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4 print:hidden"
		onclick={(e) => { if (e.target === e.currentTarget) saveDescEditor(); }}
		role="dialog"
		aria-modal="true"
		aria-label="料理詳細の編集"
	>
		<div class="bg-white w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl rounded-lg overflow-hidden">
			<!-- Header -->
			<div class="px-5 py-3 border-b border-stone-200 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<div class="w-1 h-5 bg-accent"></div>
					<span class="font-serif-jp text-base tracking-[0.1em] text-stone-800">
						{courses[descEditorIdx]?.name || 'コース'} の料理
					</span>
				</div>
				<button onclick={cancelDescEditor} class="p-1.5 hover:bg-stone-100 rounded text-stone-400" aria-label="閉じる">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Item list -->
			<div class="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
				{#each descEditorItems as item, i (i)}
					<div class="flex items-center gap-2">
						<span class="text-stone-400 text-sm w-4 text-center">{i + 1}</span>
						<input
							type="text"
							bind:value={descEditorItems[i]}
							use:autoFocusInput={descEditorItemFocus === i}
							onkeydown={(e) => {
								if (e.key === 'Enter') { e.preventDefault(); addDescItem(); }
							}}
							placeholder="料理名を入力..."
							class="flex-1 font-serif-jp text-sm text-stone-700 border border-stone-200 rounded px-3 py-2 outline-none focus:border-stone-400"
						/>
						<button
							onclick={() => removeDescItem(i)}
							class="p-1.5 text-stone-300 hover:text-red-500 transition-colors"
							aria-label="削除"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</button>
					</div>
				{/each}

				<button
					onclick={addDescItem}
					class="flex items-center gap-1.5 mt-1 px-3 py-2 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-50 rounded transition-colors self-start"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					料理を追加
				</button>
			</div>

			<!-- Footer -->
			<div class="px-5 py-3 border-t border-stone-200 flex justify-end gap-2">
				<button
					onclick={cancelDescEditor}
					class="px-4 py-2 text-[10px] tracking-widest uppercase border border-stone-200 hover:bg-stone-50 transition-colors text-stone-500"
				>
					キャンセル
				</button>
				<button
					onclick={saveDescEditor}
					class="px-4 py-2 text-[10px] tracking-widest uppercase bg-stone-800 text-white hover:bg-stone-700 transition-colors"
				>
					保存
				</button>
			</div>
		</div>
	</div>
	{/if}

</div>

<style>
	.bg-accent { background-color: #C2410C; }

	/* During PDF capture, hide all editing affordances so the output is clean */
	:global(.a4-paper.capturing) button[aria-label="このコースを削除"],
	:global(.a4-paper.capturing) button[aria-label="子供メニューを削除"],
	:global(.a4-paper.capturing) button[aria-label="項目を削除"],
	:global(.a4-paper.capturing) .kids-box button:last-child {
		display: none !important;
	}
	/* Hide the "+ 追加" add-item buttons inside the kids box during capture */
	:global(.a4-paper.capturing) .kids-box > div:last-child > button {
		display: none !important;
	}
	/* Remove the paper border + shadow + all column dividers in the captured output */
	:global(.a4-paper.capturing) {
		border: none !important;
		box-shadow: none !important;
	}
	/* Hide empty-course placeholders in the captured output */
	:global(.a4-paper.capturing) .dish-placeholder {
		display: none !important;
	}
	:global(.a4-paper.capturing) .course-col,
	:global(.a4-paper.capturing) .paper-title-col,
	:global(.a4-paper.capturing) .border-l {
		border-left: none !important;
	}

	.font-serif-jp {
		font-family: 'Noto Serif JP', 'YuMincho', 'Hiragino Mincho Pro', Georgia, serif;
	}

	.tategaki {
		writing-mode: vertical-rl;
		text-orientation: mixed;
		font-family: 'Noto Serif JP', 'YuMincho', 'Hiragino Mincho Pro', Georgia, serif;
	}

	/* Horizontal text (e.g. the small edit button under a vertical dish list) */
	.writing-mode-horizontal {
		writing-mode: horizontal-tb;
	}

	/* Draggable dish cards — vertical text, comfortable hit area for touch.
	   Must NOT shrink (flex parent would otherwise squish the height and force
	   the vertical text to wrap sideways). Width hugs the text. */
	.dish-card {
		flex: 0 0 auto;            /* keep natural vertical-text height, never shrink */
		height: auto;
		width: max-content;        /* hug the single vertical line of text */
		max-width: 100%;
		white-space: nowrap;       /* one vertical line — don't wrap into side columns */
		touch-action: none;        /* let the DnD lib own the gesture on touch */
		user-select: none;
	}
	.dish-dndzone {
		min-height: 3em;
		width: max-content;   /* hug the vertical text so columns aren't artificially wide */
		min-width: 1.4em;     /* but stay droppable even when empty */
	}
	/* The drag placeholder/shadow the library inserts — show it faintly so the
	   chef sees where the dish will land, without it looking like a real dish. */
	.dish-shadow {
		opacity: 0.35;
		background: #faf3e8;
	}
	.dish-newcol-zone {
		min-height: 4em;
	}

	/* The paper width is driven by its columns (max-content) so EVERY course
	   column is fully shown at a readable width — no matter how many there are.
	   fitToWidth then scales the whole paper down to fit the screen with no
	   horizontal scroll. During PDF capture (.capturing) it fits a single A4. */
	.a4-paper {
		width: max-content;
		flex: none;
	}

	/* Wrapper that holds the scaled paper; its width/height are set in JS to the
	   scaled footprint so the scroll area reserves the right space and the
	   unscaled paper box (1600px) doesn't push out a horizontal scrollbar. */
	.scan-paper-fit {
		max-width: 100%;
		overflow: hidden;
	}

	.scan-paper-columns {
		height: 794px;
		position: relative;   /* anchor for the kids box */
		width: 100%;          /* fills the explicit-width paper */
		flex: none;
	}

	/* Fixed, roomy column width so every course shows fully and the paper's
	   max-content width is the exact sum of all columns. */
	.scan-paper-columns > :global(.course-col) {
		width: 130px;
		flex: 0 0 130px;   /* override Tailwind flex-1 so columns don't shrink/grow */
		min-width: 0;
	}

	/* Kids box lives INSIDE the menu band, in the lower-right area (over the
	   前菜 region, offset from the right edge so it isn't flush to the corner). */
	.scan-kids-wrap {
		position: absolute;
		bottom: 1.5rem;
		right: 12%;
		left: auto;
	}

	/* ---- PDF capture ----
	   Capture the paper at its full natural width (all columns, no fit-scaling).
	   The captured image is then fitted to the A4 page in buildPdf() via
	   addImage(), so we must NOT squish columns here — that dropped the last
	   column. Width/transform are cleared in JS during capture. */
	:global(.a4-paper.capturing) {
		transform: none !important;   /* drop the on-screen fit scaling */
	}
	:global(.a4-paper.capturing) .scan-paper-columns {
		overflow: visible !important;   /* never clip a column during capture */
	}

	@media print {
		@page {
			size: A4 landscape;
			margin: 0;
		}

		/* Hide everything except the modal */
		:global(html, body) {
			margin: 0 !important;
			padding: 0 !important;
			overflow: visible !important;
		}
		:global(body > *) { visibility: hidden !important; }
		:global(.menu-scan-modal),
		:global(.menu-scan-modal *) { visibility: visible !important; }

		/* Fill the entire printable area, whatever the user's margin choice */
		:global(.menu-scan-modal) {
			position: fixed !important;
			top: 0 !important;
			left: 0 !important;
			width: 100% !important;
			height: 100% !important;
			background: white !important;
			padding: 4mm !important;
			margin: 0 !important;
			overflow: hidden !important;
			display: flex !important;
			flex-direction: column !important;
			box-sizing: border-box !important;
		}

		/* Remove inner paddings AND remove the items-center alignment so
		   the paper stretches to fill the page instead of being vertically centered. */
		:global(.menu-scan-modal .p-6),
		:global(.menu-scan-modal .px-6),
		:global(.menu-scan-modal .py-2),
		:global(.menu-scan-modal .py-3) {
			padding: 0 !important;
		}
		:global(.menu-scan-modal .items-center) {
			align-items: stretch !important;
		}

		.a4-paper {
			box-shadow: none !important;
			border: none !important;
			width: 100% !important;
			height: 100% !important;
			min-height: 100% !important;
			max-height: 100% !important;
			aspect-ratio: auto !important;
			page-break-inside: avoid;
			overflow: hidden !important;
		}

		/* Print: smaller fonts + comfortable line-height */
		:global(.menu-scan-modal .tategaki) {
			line-height: 1.8 !important;
			letter-spacing: 0.05em !important;
		}
		:global(.menu-scan-modal .font-serif-jp) {
			line-height: 1.6 !important;
		}
		:global(.menu-scan-modal .leading-loose) {
			line-height: 1.8 !important;
		}
		:global(.menu-scan-modal .leading-relaxed) {
			line-height: 1.7 !important;
		}

		/* Reduce font sizes for print to give more breathing room overall */
		:global(.menu-scan-modal .text-3xl) { font-size: 1.4rem !important; }
		:global(.menu-scan-modal .text-2xl) { font-size: 0.95rem !important; }
		:global(.menu-scan-modal .text-lg)  { font-size: 0.75rem !important; }
		:global(.menu-scan-modal .text-base){ font-size: 0.7rem !important; }
		:global(.menu-scan-modal .text-sm)  { font-size: 0.65rem !important; }

		/* Slim course header zone proportionally */
		:global(.menu-scan-modal .course-header-box) {
			height: 4em !important;
		}

		/* Remove the dividing borders between course columns + title column on print */
		:global(.menu-scan-modal .course-col),
		:global(.menu-scan-modal .paper-title-col) {
			border: none !important;
		}
		:global(.menu-scan-modal .border-l) { border-left: none !important; }
		:global(.menu-scan-modal .border-r) { border-right: none !important; }


		/* Kids box — compact print version */
		.kids-box {
			page-break-inside: avoid;
			width: 130px !important;
			padding: 0.4rem 0.6rem !important;
			gap: 0.2rem !important;
			border-width: 1px !important;
			bottom: 0.3cm !important;
		}
		:global(.menu-scan-modal .kids-box .gap-1) { gap: 0.1rem !important; }
		:global(.menu-scan-modal .kids-box .gap-1\.5) { gap: 0.15rem !important; }
		:global(.menu-scan-modal .kids-box .gap-2) { gap: 0.2rem !important; }
		:global(.menu-scan-modal .kids-box .py-0\.5) { padding-top: 0 !important; padding-bottom: 0 !important; }

		/* Hide all delete buttons & non-essential controls on print */
		:global(.menu-scan-modal button[aria-label="このコースを削除"]),
		:global(.menu-scan-modal button[aria-label="子供メニューを削除"]),
		:global(.menu-scan-modal button[aria-label="項目を削除"]) {
			display: none !important;
		}
	}

	.paper-title-col {
		width: clamp(70px, 8%, 120px);
	}

	/* Fixed header zone — fits 3 vertical kanji.
	   Names with 4+ chars are pre-split into 2 vertical lines side-by-side. */
	.course-header-box {
		height: 6em;
	}

	/* Course columns share the paper width evenly via flex-1.
	   Min width ensures readability when there are many courses. */
	.course-col {
		min-width: 60px;
	}

	/* Dish details — editing mode (single contenteditable line) */
	.dish-details {
		max-height: 100%;
		max-width: 100%;
		word-break: break-all;
	}

	/* Dish details — display mode. Each sub-column flows naturally; groups
	   are pre-calculated in JS for balanced length. */
	.dish-display {
		max-height: 100%;
		word-break: keep-all;
		line-height: 1.9;
	}

	/* Placeholder for empty contenteditable */
	[contenteditable][data-placeholder]:empty::before {
		content: attr(data-placeholder);
		color: rgb(214 211 209);
		writing-mode: vertical-rl;
	}
</style>

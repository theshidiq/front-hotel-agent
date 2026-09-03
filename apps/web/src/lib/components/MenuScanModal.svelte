<script lang="ts">
	import {
		menuScanExtract,
		menuScanSync,
		menuScanGetMenus,
		menuScanGetMenu,
		menuScanSetDishProduct,
		downloadMenuExcel,
		downloadMenuWord,
		getProducts,
		AuthExpiredError,
	} from '$lib/api';
	import type { MenuGroup, SeasonalMenu, SavedMenuSummary, Product } from '$lib/api';
	import MenuImportModal from './MenuImportModal.svelte';
	import { dndzone, SHADOW_ITEM_MARKER_PROPERTY_NAME, type DndEvent } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { tick } from 'svelte';

	interface Props {
		menuGroups: MenuGroup[];
		seasonalMenus?: SeasonalMenu[];
		onConfirmed: () => void;
		onClose: () => void;
	}

	let { menuGroups, seasonalMenus = [], onConfirmed, onClose }: Props = $props();

	type Step = 'upload' | 'loading' | 'review' | 'saving';

	let step: Step = $state('upload');
	let selectedFile: File | null = $state(null);
	let previewUrl: string | null = $state(null);
	let menuTitle: string | null = $state(null);
	// Serialized print/PDF form of the menu (flat description + string cols).
	// The rows-backed source of truth is the menu_dishes the sync writes; this
	// stays only for the on-screen layout, share image, and PDF generation.
	type PrintCourse = {
		name: string;
		reading: string | null;
		category: string;
		sort_order: number;
		description: string | null;
		cols: string[][];
	};
	let courses: PrintCourse[] = $state([]);

	// ── Editable dish model (drag-and-drop source of truth) ──
	// Each course holds its dishes as STABLE sub-column arrays (cols: Dish[][]).
	// svelte-dnd-action mutates each column array directly, so the arrays must be
	// real state (not derived on the fly) — otherwise the drag shadow gets stuck.
	// `courses` (above) stays the serialized form consumed by save/draft/share/PDF.
	// A dish's `id` is a STABLE UUID — it is the menu_dishes primary key. The
	// backend diff-upserts by this id, so the id must persist across edits for a
	// dish's product link (allergens) to survive. New dishes mint a fresh UUID.
	type Dish = { id: string; text: string; product_id?: string | null };
	type WorkCourse = {
		id: string;            // local-only work id
		menuId: string | null; // menus.id once the course row exists (null = new)
		name: string;
		reading: string | null;
		category: string;
		sort_order: number;
		cols: Dish[][];   // sub-columns, col 0 = first/rightmost
	};
	let workCourses: WorkCourse[] = $state([]);
	const uuid = () =>
		(globalThis.crypto?.randomUUID?.() ??
			`${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);
	const newId = (_p: string) => uuid();

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

	// Build the id'd work model from courses (called on enter-review / re-open).
	// Accepts both shapes:
	//  • OCR/extract & saved-menu rows: cols as {id,text}[][] — ids are PRESERVED
	//    (they are real menu_dishes ids; keeping them is what makes links survive).
	//  • Legacy draft: cols as string[][] or just a description — ids are minted.
	function buildWorkCourses(src: any[]): WorkCourse[] {
		return src.map((c) => {
			let cols: Dish[][];
			const hasIdCols =
				Array.isArray(c.cols) &&
				c.cols.some((col: any[]) => Array.isArray(col) && col.some((d) => d && typeof d === 'object'));
			if (hasIdCols) {
				cols = c.cols.map((col: any[]) =>
					(col ?? []).map((d) => ({ id: d.id ?? uuid(), text: d.text, product_id: d.product_id ?? null })),
				);
			} else if (Array.isArray(c.cols) && c.cols.length > 0 && c.cols.some((col: any[]) => col.length > 0)) {
				cols = c.cols.map((col: string[]) => (col ?? []).map((text) => ({ id: uuid(), text })));
			} else {
				cols = defaultCols(splitItems(c.description).map((text) => ({ id: uuid(), text })));
			}
			return {
				id: newId('course'),
				menuId: c.id ?? null,
				name: c.name,
				reading: c.reading,
				category: c.category,
				sort_order: c.sort_order,
				cols,
			};
		});
	}

	// Serialize the work model back into `courses`. Dishes are emitted in
	// column order (col 0 first), joined with ・ — backend stays a flat string.
	// `cols` carries the sub-column split so drafts can restore it after refresh.
	function syncCoursesFromWork() {
		courses = workCourses.map((wc, i) => {
			const ordered = wc.cols.flat();
			return {
				name: wc.name,
				reading: wc.reading,
				category: wc.category,
				sort_order: i + 1,
				description: ordered.map((d) => d.text).join('・') || null,
				cols: wc.cols.map((col) => col.map((d) => d.text)),
			};
		});
	}

	// Rich payload for the rows-as-source-of-truth sync (cols keep {id,text}).
	// Empty dishes are dropped so they don't become blank rows; the __kids meta
	// course is excluded here (handled separately, still draft-only).
	function buildSyncCourses() {
		return workCourses.map((wc, i) => ({
			id: wc.menuId ?? undefined,
			name: wc.name,
			reading: wc.reading,
			category: wc.category,
			sort_order: i + 1,
			cols: wc.cols.map((col) =>
				col
					.filter((d) => (d.text ?? '').trim())
					.map((d) => ({ id: d.id, text: d.text.trim() })),
			),
		}));
	}
	let selectedGroupId: string = $state(menuGroups[0]?.id ?? '');
	let groupTouched = $state(false);  // chef manually changed the group → stop auto-selecting

	// Season is inferred from the menu title the chef hand-wrote (e.g. "令和八年 夏の
	// 献立 一般" → 夏), not picked. The chef already writes it; making him choose again
	// is redundant friction. If the title names a season that doesn't exist yet, the
	// backend auto-creates it on confirm.
	const SEASON_KANJI = ['春', '夏', '秋', '冬'];
	const inferredSeasonName = $derived(
		SEASON_KANJI.find((s) => (menuTitle ?? '').includes(s)) ?? null
	);

	// Group is also inferred from the title: the chef writes the variant after 献立
	// (e.g. "…夏の献立 滞在" → 滞在). Space-normalize both sides so messy OCR spacing
	// ("献立　　滞在", "子供 A  CK70") still matches. If a group with that name exists
	// we auto-select it; if not, the backend auto-creates it on confirm.
	const norm = (s: string) => s.replace(/[　\s]+/g, ' ').trim();
	const inferredGroupName = $derived.by(() => {
		const t = norm(menuTitle ?? '');
		const m = t.match(/献立\s*(.+)$/);   // everything after 献立
		return m ? norm(m[1]) : null;
	});
	// Auto-select the matching group when the chef hasn't manually overridden.
	$effect(() => {
		if (groupTouched || !inferredGroupName) return;
		const match = selectableGroups.find((g) => norm(g.name) === inferredGroupName);
		if (match) selectedGroupId = match.id;
	});
	let sessionId: string | null = $state(null);
	let imageUrl: string = $state('');
	let error: string | null = $state(null);
	let abortController: AbortController | null = $state(null);
	let fileInput: HTMLInputElement = $state() as HTMLInputElement;
	let dragOver = $state(false);
	let editingNameIdx: number | null = $state(null);  // which course's name is being edited
	let editingTitle = $state(false);                  // whether the menu title is being edited

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

	// Dish-detail editor popup.
	// Holds dishes as {id,text,product_id} so ids are PRESERVED on save — a dish's
	// product link (allergens) must survive editing its sibling rows. New rows get
	// a fresh UUID; existing rows keep their id (= menu_dishes PK).
	type EditDish = { id: string; text: string; product_id: string | null };
	let descEditorIdx: number | null = $state(null);   // which course's dishes are open
	let descEditorItems: EditDish[] = $state([]);
	let descEditorItemFocus: number | null = $state(null);  // which item input to autofocus

	function openDescEditor(idx: number) {
		descEditorItems = workCourses[idx].cols.flat().map((d) => ({
			id: d.id,
			text: d.text,
			product_id: (d as any).product_id ?? null,
		}));
		if (descEditorItems.length === 0) {
			descEditorItems = [{ id: uuid(), text: '', product_id: null }];
		}
		descEditorIdx = idx;
		descEditorItemFocus = descEditorItems.length - 1;
		linkSearchForDish = null;
		// Resolve display info for already-linked dishes (product name + allergens).
		seedDishLinks();
	}

	// Populate dishLinks for dishes that already carry a product_id, so the popup
	// shows the linked product + allergens without needing a re-link.
	async function seedDishLinks() {
		const linkedIds = descEditorItems.filter((d) => d.product_id);
		if (linkedIds.length === 0) return;
		await ensureProducts();
		const byId = new Map(allProducts.map((p) => [p.id, p]));
		const next = { ...dishLinks };
		for (const d of linkedIds) {
			const p = d.product_id ? byId.get(d.product_id) : null;
			if (p && !next[d.id]) {
				next[d.id] = {
					name: p.name,
					allergens: p.allergens.map((a) => ({ id: a.id, name: a.name })),
				};
			}
		}
		dishLinks = next;
	}

	function addDescItem() {
		descEditorItems = [...descEditorItems, { id: uuid(), text: '', product_id: null }];
		descEditorItemFocus = descEditorItems.length - 1;
	}

	function removeDescItem(i: number) {
		descEditorItems = descEditorItems.filter((_, idx) => idx !== i);
	}

	function saveDescEditor() {
		if (descEditorIdx === null) return;
		// Keep each dish's id (and product link); re-apply the default column split.
		// Fine column arrangement is still done by dragging dishes between columns.
		const dishes = descEditorItems
			.filter((d) => d.text.trim())
			.map((d) => ({ id: d.id, text: d.text.trim(), product_id: d.product_id }));
		const cols = defaultCols(dishes as any);
		workCourses = workCourses.map((c, i) => (i === descEditorIdx ? { ...c, cols } : c));
		descEditorIdx = null;
		// Saving the dish editor may have REMOVED dishes — allow this sync to prune.
		requestPrune();
	}

	function cancelDescEditor() {
		descEditorIdx = null;
		linkSearchForDish = null;
	}

	// ── Dish → product linking (allergen source) ──
	let allProducts: Product[] = $state([]);
	let productsLoaded = $state(false);
	let linkSearchForDish: string | null = $state(null);  // dish id whose link search is open
	let linkSearchTerm = $state('');
	let linkingDishId: string | null = $state(null);       // dish id with a link request in flight
	// dish id → linked product (name + allergens) for display in the popup
	let dishLinks: Record<string, { name: string; allergens: { id: string; name: string }[] }> = $state({});

	// A dish can only be linked once it exists as a menu_dishes row — i.e. it's in
	// the work-model (loaded from rows or synced). Brand-new popup rows must be
	// saved (popup 保存 → debounced sync) before the link button is usable.
	const persistedDishIds = $derived(
		new Set(workCourses.flatMap((wc) => wc.cols.flat().map((d) => d.id))),
	);

	async function ensureProducts() {
		if (productsLoaded) return;
		try {
			allProducts = await getProducts();
			productsLoaded = true;
		} catch (e) {
			console.error('[menu-scan] failed to load products', e);
		}
	}

	async function openLinkSearch(dishId: string) {
		if (linkSearchForDish === dishId) { linkSearchForDish = null; return; }
		// The dish must exist as a menu_dishes row before it can be linked. Persist
		// any pending edits (including a just-typed dish) first so the PATCH targets
		// a real row rather than 404-ing.
		await flushSave();
		linkSearchForDish = dishId;
		linkSearchTerm = '';
		ensureProducts();
	}

	const linkSearchResults = $derived.by(() => {
		const q = linkSearchTerm.trim().toLowerCase();
		const list = q
			? allProducts.filter((p) => p.name.toLowerCase().includes(q))
			: allProducts;
		return list.slice(0, 8);
	});

	async function linkDishToProduct(dishId: string, product: Product) {
		linkingDishId = dishId;
		try {
			const res = await menuScanSetDishProduct(dishId, product.id);
			// reflect in the popup row, the work-model, and the link display map
			descEditorItems = descEditorItems.map((d) =>
				d.id === dishId ? { ...d, product_id: res.product_id } : d,
			);
			applyDishProductToWork(dishId, res.product_id);
			dishLinks = { ...dishLinks, [dishId]: { name: product.name, allergens: res.allergens } };
			linkSearchForDish = null;
		} catch (e: any) {
			error = e.message || '商品の紐付けに失敗しました';
		} finally {
			linkingDishId = null;
		}
	}

	async function unlinkDish(dishId: string) {
		linkingDishId = dishId;
		try {
			await menuScanSetDishProduct(dishId, null);
			descEditorItems = descEditorItems.map((d) =>
				d.id === dishId ? { ...d, product_id: null } : d,
			);
			applyDishProductToWork(dishId, null);
			const { [dishId]: _drop, ...rest } = dishLinks;
			dishLinks = rest;
		} catch (e: any) {
			error = e.message || '紐付け解除に失敗しました';
		} finally {
			linkingDishId = null;
		}
	}

	// Keep the work-model's dish in sync so re-opening the popup shows the link.
	function applyDishProductToWork(dishId: string, productId: string | null) {
		workCourses = workCourses.map((wc) => ({
			...wc,
			cols: wc.cols.map((col) =>
				col.map((d) => (d.id === dishId ? { ...d, product_id: productId } : d)),
			),
		}));
	}

	// Kids menu callout box (overlay on the お品書き paper). Items carry stable ids
	// so the backend diff-upserts them safely (persisted as a linked kids group).
	// NO default seed: a hardcoded list with mount-time ids gets re-minted across
	// renders, so the backend sees "new" ids for the same text and DUPLICATES the
	// rows. The box starts hidden/empty and is populated only by hydration (opening
	// a saved menu) or explicit user entry. kidsGroupId tracks the resolved kids
	// group so a rename UPDATES it instead of spawning a new linked group.
	let kidsName: string = $state('子供 CK70');
	let kidsItems: { id: string; text: string }[] = $state([]);
	let kidsGroupId: string | null = $state(null);
	let showKidsBox: boolean = $state(false);
	let editingKidsName = $state(false);
	let editingKidsItemIdx: number | null = $state(null);
	let savedMenus: SavedMenuSummary[] = $state([]);
	let loadingDrafts = $state(true);
	let savingDraft = $state(false);
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let suppressSync = $state(false);  // true while loading a menu — blocks load-time syncs

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

	// Split text into segments so Latin/romaji words (e.g. "OIL") can render
	// horizontally upright (tate-chu-yoko, 縦中横) inside vertical Japanese text,
	// while everything else (kana, kanji, ー, punctuation) keeps the default
	// vertical 'mixed' orientation. Only runs of up to 4 Latin chars are combined
	// upright; longer runs would squash, so they fall back to normal flow.
	type TextSeg = { t: string; tcy: boolean };
	function tateChuYoko(text: string): TextSeg[] {
		const segs: TextSeg[] = [];
		// Match runs of ASCII letters/digits (a romaji word or abbreviation).
		const re = /[A-Za-z0-9][A-Za-z0-9.&'-]*/g;
		let last = 0;
		let m: RegExpExecArray | null;
		while ((m = re.exec(text)) !== null) {
			if (m.index > last) segs.push({ t: text.slice(last, m.index), tcy: false });
			// Combine upright only if short enough to fit one slot; else leave inline.
			segs.push({ t: m[0], tcy: m[0].length <= 4 });
			last = m.index + m[0].length;
		}
		if (last < text.length) segs.push({ t: text.slice(last), tcy: false });
		return segs;
	}

	// Saved scanned menus (already one entry per menu group from the backend).
	const visibleDrafts = $derived(savedMenus);

	// Load saved menus on mount
	$effect(() => {
		menuScanGetMenus().then(d => {
			savedMenus = d;
			loadingDrafts = false;
		}).catch((err) => {
			loadingDrafts = false;
			if (err instanceof AuthExpiredError) {
				error = 'セッションが切れました。再ログインしてください。';
			}
		});
	});

	// Keep the serialized `courses` in sync with the editable work model.
	$effect(() => {
		// touch workCourses deeply so this re-runs on any dish/name/order change
		JSON.stringify(workCourses);
		syncCoursesFromWork();
	});

	// Auto-save draft whenever courses, the title, OR the kids box change (debounced)
	$effect(() => {
		// touch reactive state so editing any of these schedules a save
		void menuTitle; void kidsName; void showKidsBox; JSON.stringify(kidsItems);
		void courses;
		if (suppressSync || step !== 'review' || courses.length === 0) return;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => autoSaveDraft(), 800);
	});

	// Force-save any pending edits immediately (cancels the debounce). Awaits the
	// REAL completion (including a queued re-save) so callers — link, close, back —
	// never race a still-in-flight sync. Call before leaving the review screen.
	async function flushSave() {
		if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
		if (step === 'review' && workCourses.length > 0) {
			await autoSaveDraft();
		}
	}

	// Syncs are SERIALIZED: only one /sync runs at a time. A request arriving mid-
	// flight is coalesced into a single trailing re-save (latest state wins). This
	// prevents overlapping syncs from racing on menu_dishes (the dup-key crash).
	let savePromise: Promise<void> | null = null;
	let saveQueued = false;
	// Set true by explicit user removals (delete dish/course) so the NEXT sync is
	// allowed to prune (delete) on the backend. Cleared once consumed. Autosync
	// otherwise never prunes — it can only add/update, never wipe.
	let pendingPrune = false;
	function requestPrune() { pendingPrune = true; autoSaveDraft(); }
	function autoSaveDraft(): Promise<void> {
		if (suppressSync || !selectedGroupId || workCourses.length === 0) return Promise.resolve();
		// Never sync a menu whose courses all have empty cols — that's stale/loading
		// state and the backend would (correctly) refuse, but skip the round-trip.
		const hasAnyDish = workCourses.some((wc) => wc.cols.some((col) => col.length > 0));
		if (!hasAnyDish) return Promise.resolve();
		if (savePromise) {
			// A save is running — ensure exactly one more runs after it, and return a
			// promise that resolves when the whole chain (incl. the trailing run) ends.
			saveQueued = true;
			return savePromise;
		}
		savePromise = runSync().finally(() => {
			savePromise = null;
			if (saveQueued) { saveQueued = false; autoSaveDraft(); }
		});
		return savePromise;
	}

	// Persist the editing menu directly into relational rows (menus + menu_dishes).
	// The backend diff-upserts; dishes keep their stable ids so product links survive.
	async function runSync(): Promise<void> {
		savingDraft = true;
		const prune = pendingPrune;
		pendingPrune = false;  // consume — deletes apply only on this run
		try {
			const result = await menuScanSync({
				menu_group_id: selectedGroupId,
				group_name: groupTouched ? null : inferredGroupName,
				season_name: inferredSeasonName,
				menu_title: menuTitle,
				session_id: sessionId,
				courses: buildSyncCourses(),
				// Kids box → linked kids menu_group. Only sent when shown AND has a name;
				// null/omitted leaves any existing kids menu untouched (non-destructive).
				kids:
					showKidsBox && kidsName.trim()
						? { id: kidsGroupId, name: kidsName.trim(), items: kidsItems.filter((i) => i.text.trim()) }
						: null,
				prune,
			});
			// Reconcile: adopt the resolved group + any newly-created course ids so
			// subsequent saves update in place. Once the group is resolved server-
			// side, stop title-inference from re-selecting.
			if (result?.group_id) { selectedGroupId = result.group_id; groupTouched = true; }
			// Adopt the resolved kids group id so a later rename UPDATES it (keyed by id)
			// instead of spawning a new linked group.
			if (result?.kids_group_id && !kidsGroupId) kidsGroupId = result.kids_group_id;
			if (Array.isArray(result?.courses)) {
				const idByName = new Map<string, string>(
					result.courses.map((c: any) => [c.name, c.id]),
				);
				// Only reassign workCourses if a menuId was ACTUALLY newly filled in.
				// `.map()` always returns a fresh array, so an unconditional assignment
				// changes the reference every sync → the serialize effect re-runs →
				// `courses` rebuilds → the autosave effect reschedules → an endless
				// self-perpetuating sync loop with no user edit. Guarding on a real
				// change breaks that feedback loop (idempotent: a sync that fills in
				// no new ids leaves workCourses untouched).
				let changed = false;
				const next = workCourses.map((wc) => {
					if (wc.menuId) return wc;
					const id = idByName.get(wc.name);
					if (id) { changed = true; return { ...wc, menuId: id }; }
					return wc;
				});
				if (changed) workCourses = next;
			}
		} catch (err) {
			console.error('[menu-scan] menu sync failed', err);
			// Re-arm a pending prune so an explicit delete isn't lost to a failed save.
			if (prune) pendingPrune = true;
			if (err instanceof AuthExpiredError) {
				// Session died mid-edit. STOP auto-syncing — re-login reloads fresh data;
				// syncing now would push stale state. The work-model is untouched.
				suppressSync = true;
				error = 'セッションが切れました。再ログインしてください。';
			} else {
				error = '保存に失敗しました。再ログインが必要かもしれません。';
			}
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

	// Excel round-trip import (preview-gated; see MenuImportModal).
	let showImport = $state(false);

	// Word download of the CURRENT menu — editable presentation copy. Flushes any
	// pending edit first so the document matches what's on screen.
	let exportingWord = $state(false);
	async function handleDownloadWord() {
		if (exportingWord || !selectedGroupId) return;
		exportingWord = true;
		error = null;
		try {
			await flushSave();
			await downloadMenuWord(selectedGroupId);
		} catch (err: any) {
			error = err?.message || 'Wordの書き出しに失敗しました';
		} finally {
			exportingWord = false;
		}
	}

	// Word download of ALL menus, one per page. Read-only, like the Excel
	// archive: this is the presentation copy of every menu in one document.
	let exportingWordAll = $state(false);
	async function exportAllWord() {
		if (exportingWordAll) return;
		exportingWordAll = true;
		error = null;
		try {
			await downloadMenuWord();
		} catch (err: any) {
			error = err?.message || 'Wordの書き出しに失敗しました';
		} finally {
			exportingWordAll = false;
		}
	}

	// Excel archive download (all menus). Read-only: never touches menu data.
	let exportingExcel = $state(false);
	async function exportAllExcel() {
		if (exportingExcel) return;
		exportingExcel = true;
		error = null;
		try {
			await downloadMenuExcel();
		} catch (err: any) {
			error = err?.message || 'Excelの書き出しに失敗しました';
		} finally {
			exportingExcel = false;
		}
	}

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

	// Native browser print. Unlike html2canvas it renders vertical Japanese text
	// correctly — including the katakana long-vowel mark (ー). The @media print CSS
	// lays the paper out for A4; isCapturing switches dishes to the balanced view.
	// Used for BOTH the PRINT button and the PDF button (PDF = "Save as PDF" in
	// the print dialog) so the two outputs are identical.
	async function nativePrint() {
		isCapturing = true;
		// Add the .capturing class too, so the capture-only CSS (hide the course
		// header, show the in-column course name aligned over the first dish column)
		// applies to native print — not just to the html2canvas path.
		paperEl?.classList.add('capturing');
		await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
		const restore = () => {
			isCapturing = false;
			paperEl?.classList.remove('capturing');
			window.removeEventListener('afterprint', restore);
		};
		window.addEventListener('afterprint', restore);
		try {
			window.print();
		} finally {
			setTimeout(restore, 1000);
		}
	}

	async function handlePrint() {
		await nativePrint();
	}

	async function handleDownloadPdf() {
		// Same native dialog — the chef picks "Save as PDF" as the destination.
		await nativePrint();
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
					lines.push('', `【${kidsName}】`, ...kidsItems.map(i => `・${i.text}`));
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
			// extract now returns row-backed courses (cols of {id,text}); ids are
			// preserved so the editor and DB share dish ids from the first save.
			workCourses = buildWorkCourses(result.courses as any[]);
			sessionId = result.session_id ?? null;
			imageUrl = result.image_url;
			step = 'review';
			// Refresh the saved-menus list.
			savedMenus = await menuScanGetMenus();
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

	// Re-open a saved menu: load its full courses + dishes (rows) into the editor.
	// Dish ids are preserved so subsequent syncs update in place (links survive).
	async function openSavedMenu(summary: SavedMenuSummary) {
		// Suppress sync for the WHOLE load. If anything fails (esp. a 401), we must
		// NOT enter review with stale/empty work-model and we must NOT re-enable
		// sync — otherwise the next reactive tick would push garbage and wipe data.
		suppressSync = true;
		// CRITICAL: cancel any pending/in-flight sync from the PREVIOUS menu before
		// switching groups. Otherwise a queued save fires after selectedGroupId flips
		// and writes the old menu's courses onto the new group (group bleed → wipe).
		if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
		saveQueued = false;
		pendingPrune = false;
		if (savePromise) { try { await savePromise; } catch { /* ignore */ } }
		try {
			const full = await menuScanGetMenu(summary.menu_group_id);
			// Only commit state once the load fully succeeded.
			selectedGroupId = full.menu_group_id;
			groupTouched = true;  // group is already resolved; don't re-infer
			sessionId = null;     // no scan session needed; sync targets the group
			imageUrl = summary.image_url ?? '';
			menuTitle = full.menu_title;
			workCourses = buildWorkCourses(full.courses as any[]);
			// Rehydrate the kids box from the linked kids group (if any).
			if (full.kids && full.kids.items.length > 0) {
				kidsGroupId = full.kids.id ?? null;
				kidsName = full.kids.name;
				kidsItems = full.kids.items.map((i) => ({ id: i.id, text: i.text }));
				showKidsBox = true;
			} else {
				kidsGroupId = null;
				kidsItems = [];
				showKidsBox = false;
			}
			step = 'review';
			// Release suppression only after a clean load + settled effects, so
			// genuine edits sync but the load itself never does.
			await tick();
			suppressSync = false;
		} catch (err: any) {
			// Load failed — stay on the list, keep sync OFF, leave existing data alone.
			// (suppressSync stays true so no sync fires against stale work-model.)
			if (err instanceof AuthExpiredError) {
				error = 'セッションが切れました。再ログインしてください。';
			} else {
				error = err.message || 'メニューの読み込みに失敗しました';
			}
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
			{ id: newId('course'), menuId: null, name: '', reading: null, category: 'other', sort_order: workCourses.length + 1, cols: [[]] },
		];
	}

	function removeCourse(idx: number) {
		workCourses = workCourses.filter((_, i) => i !== idx);
		// Explicit course removal — allow this sync to prune the deleted course.
		requestPrune();
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
		// Saving is continuous (every edit syncs to rows). "Confirm" just flushes
		// any pending edit and closes — there is no separate write step anymore.
		step = 'saving';
		error = null;
		try {
			if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
			await autoSaveDraft();
			onConfirmed();
		} catch (err: any) {
			error = err.message || '保存に失敗しました';
			step = 'review';
		}
	}

	// Close wrapper — flush pending edits before the modal goes away.
	async function handleClose() {
		await flushSave();
		onClose();
	}

	// Back to the upload screen — flush first so review edits persist as a draft,
	// then RELOAD the drafts list so it reflects the freshest server state (avoids
	// resuming a stale/duplicate copy that the cached list still showed).
	async function goBackToUpload() {
		await flushSave();
		step = 'upload';
		try { savedMenus = await menuScanGetMenus(); } catch { /* keep cached list */ }
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (descEditorIdx !== null) { cancelDescEditor(); return; }
			if (step !== 'saving') handleClose();
			return;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Render vertical text with short romaji/Latin runs kept horizontal & upright
     (tate-chu-yoko). Japanese chars, ー, and punctuation render normally. -->
{#snippet vtext(text: string)}{#each tateChuYoko(text) as seg}{#if seg.tcy}<span class="tcy">{seg.t}</span>{:else}{seg.t}{/if}{/each}{/snippet}

<div class="menu-scan-modal fixed inset-0 bg-stone-100 z-[60] flex flex-col overflow-hidden font-sans">

	<!-- ── Header ── -->
	<header class="border-b border-stone-200 px-6 py-3 flex justify-between items-center bg-white flex-shrink-0 print:hidden">
		<div class="flex items-center gap-5">
			{#if step === 'review'}
			<button
				onclick={goBackToUpload}
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
					onchange={() => groupTouched = true}
					disabled={step === 'saving'}
					class="text-xs font-medium text-stone-700 bg-transparent border-none outline-none cursor-pointer hover:text-stone-900 pr-4"
				>
					{#each selectableGroups as group}
						<option value={group.id}>{group.name}</option>
					{/each}
				</select>
			</div>
			{#if inferredSeasonName}
			<div class="h-6 w-px bg-stone-200"></div>
			<div class="flex flex-col gap-0.5">
				<span class="text-[8px] uppercase tracking-widest text-stone-400">季節（自動）</span>
				<span class="text-xs font-medium text-stone-700">{inferredSeasonName}</span>
			</div>
			{/if}
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
			<!-- Word: the EDITABLE presentation copy (real vertical Japanese), for
			     staff who need to change wording without the app. -->
			<button
				onclick={handleDownloadWord}
				disabled={exportingWord || !selectedGroupId}
				class="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 text-[9px] tracking-[0.12em] hover:bg-stone-50 transition-colors uppercase font-medium print:hidden disabled:opacity-40"
				title="Word保存（編集可能）"
			>
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
				{exportingWord ? '…' : 'Word'}
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
				onclick={handleClose}
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
					onchange={() => groupTouched = true}
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

		<!-- Right: saved drafts (newest per group; older duplicates hidden) -->
		{#if !loadingDrafts && visibleDrafts.length > 0}
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2 mb-4">
				<svg class="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
				<h3 class="text-xs font-medium text-stone-600 uppercase tracking-widest">保存済みメニュー</h3>
				<!-- Excel archive: all menus in one workbook (layout + data sheets). -->
				<button
					onclick={exportAllExcel}
					disabled={exportingExcel}
					class="ml-auto flex items-center gap-1.5 px-2.5 py-1 border border-stone-300 text-[10px] tracking-widest uppercase text-stone-600 hover:text-stone-900 hover:border-stone-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
					title="全メニューをExcelファイルに書き出す"
				>
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
					</svg>
					{exportingExcel ? '書き出し中…' : 'Excel'}
				</button>
				<!-- All menus as one Word document, a page each. -->
				<button
					onclick={exportAllWord}
					disabled={exportingWordAll}
					class="flex items-center gap-1.5 px-2.5 py-1 border border-stone-300 text-[10px] tracking-widest uppercase text-stone-600 hover:text-stone-900 hover:border-stone-400 transition-colors disabled:opacity-40"
					title="全メニューを1つのWord文書に書き出す（1ページ1メニュー）"
				>
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					{exportingWordAll ? '書き出し中…' : 'Word'}
				</button>
				<!-- Round-trip: bring an edited workbook back in (preview-gated). -->
				<button
					onclick={() => { showImport = true; }}
					class="flex items-center gap-1.5 px-2.5 py-1 border border-stone-300 text-[10px] tracking-widest uppercase text-stone-600 hover:text-stone-900 hover:border-stone-400 transition-colors"
					title="編集したExcelファイルを読み込む"
				>
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
					</svg>
					読込
				</button>
			</div>
			<div class="flex flex-col gap-2">
				{#each visibleDrafts as draft (draft.menu_group_id)}
				<div
					class="bg-white border border-stone-200 px-4 py-3 flex items-center justify-between hover:border-stone-300 cursor-pointer transition-colors group"
					onclick={() => openSavedMenu(draft)}
					role="button"
					tabindex="0"
					onkeypress={(e) => e.key === 'Enter' && openSavedMenu(draft)}
				>
					<div class="flex items-center gap-4 min-w-0">
						{#if draft.image_url}
						<img src={draft.image_url} alt="" class="w-10 h-10 object-cover flex-shrink-0 border border-stone-100" />
						{/if}
						<div class="min-w-0">
							<p class="font-serif-jp text-sm tracking-[0.1em] text-stone-700 truncate">
								{draft.menu_title || '無題のメニュー'}
							</p>
							<p class="text-[10px] text-stone-400 mt-0.5">
								{draft.group_name}
								· {draft.course_count} コース
								· {draft.dish_count} 品
							</p>
						</div>
					</div>
					<div class="flex items-center gap-2 flex-shrink-0">
						<span class="text-[9px] uppercase tracking-widest text-stone-400 group-hover:text-stone-600 transition-colors">
							開く →
						</span>
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

					<!-- Title column (far right) — click to edit the menu title. -->
					<div class="flex-none flex flex-col border-l border-stone-200 paper-title-col" dir="ltr">
						<div class="flex-1 flex items-start justify-center px-1 pt-[8%]">
							{#if editingTitle}
								<div
									class="tategaki font-serif-jp text-4xl font-light text-stone-800 leading-loose tracking-[0.25em] text-center outline-none bg-orange-50/40 rounded px-1 whitespace-break-spaces"
									contenteditable="plaintext-only"
									spellcheck="false"
									use:autoFocusContentEditable
									onblur={(e) => {
										// Keep the title exactly as typed — including spaces the chef
										// adds for layout. Only fall back to null when it's blank.
										const v = (e.target as HTMLElement).innerText.replace(/\n/g, '');
										menuTitle = v.trim() ? v : null;
										editingTitle = false;
									}}
									role="textbox"
									tabindex="0"
									aria-label="献立タイトル"
								>{menuTitle || selectedGroupName}</div>
							{:else}
								<div
									class="tategaki font-serif-jp text-4xl font-light text-stone-800 leading-loose tracking-[0.25em] text-center cursor-text hover:bg-stone-50/60 rounded transition-colors px-1 print:cursor-default print:hover:bg-transparent whitespace-break-spaces"
									onclick={() => { if (!isCapturing) editingTitle = true; }}
									role="button"
									tabindex="0"
									onkeydown={(e) => { if (e.key === 'Enter') editingTitle = true; }}
									aria-label="献立タイトルを編集"
								>{displayTitle}</div>
							{/if}
						</div>
					</div>

					<!-- Course columns — right to left, evenly distributed. -->
					{#each workCourses as course, idx (course.id)}
					{@const isUnderKidsBox = showKidsBox && (idx === 0 || idx === 1)}
					{@const dishCount = course.cols.reduce((n, c) => n + c.length, 0)}
					{@const groups = course.cols.map((col) => col.map((d) => d.text))}
					{@const nameLines = splitCourseName(course.name)}
					{@const isEditingName = editingNameIdx === idx}
					{@const stepEm = 1.5}
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

						<!-- Inline name editor: only shown while actively editing. The static
						     aligned name lives inside the first dish column (below) so it lines
						     up over that column in BOTH the on-screen preview and print/PDF. -->
						{#if isEditingName}
							<div class="pt-2 pb-1 flex items-start justify-center flex-shrink-0 course-header-box print:hidden">
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
							</div>
						{/if}

						{#if isCapturing}
							<!-- PDF/PRINT view: pre-balanced groups, each its own vertical sub-column
							     (the handwritten-menu look). Static, no drag affordances.
							     The first column carries the 一 at its top so the mark is centered
							     over that column; the fixed .dish-ichi-row height keeps it aligned
							     across courses. -->
							<div
								class="flex-1 px-2 pt-20 overflow-hidden {groups.length <= 1 ? 'flex justify-center' : 'flex flex-row-reverse justify-center items-start gap-0'}"
								style="padding-bottom: {isUnderKidsBox ? '30%' : '1rem'}"
							>
								{#if dishCount > 0 && groups.length <= 1}
									<div class="relative flex flex-col items-center">
										<div class="cap-course-name is-single">
											{#each nameLines as line}
												<div class="cap-name-line tategaki font-serif-jp text-xl font-normal text-stone-900 tracking-[0.15em]">{line}</div>
											{/each}
										</div>
										<div class="dish-ichi-row flex items-center"><span class="font-serif-jp text-xl text-stone-800">一</span></div>
										<div class="dish-display tategaki font-serif-jp text-xl text-stone-700 h-fit">
											{@render vtext(groups[0].join('　'))}
										</div>
									</div>
								{:else if dishCount > 0}
									{#each groups as group, gIdx}
										<div class="relative flex flex-col items-center" style="margin-top: {gIdx === 0 ? 0 : stepEm}em;">
											{#if gIdx === 0}
												<div class="cap-course-name" class:is-single={nameLines.length === 1}>
													{#each nameLines as line}
														<div class="cap-name-line tategaki font-serif-jp text-xl font-normal text-stone-900 tracking-[0.15em]">{line}</div>
													{/each}
												</div>
											{/if}
											<div class="dish-ichi-row flex items-center">
												{#if gIdx === 0}<span class="font-serif-jp text-xl text-stone-800">一</span>{/if}
											</div>
											<div class="dish-display tategaki font-serif-jp text-xl text-stone-700 h-fit">
												{@render vtext(group.join('　'))}
											</div>
										</div>
									{/each}
								{/if}
							</div>
						{:else}
							<!-- EDIT view: dishes flow into stepped sub-columns (right→left),
							     each a drop zone. Drag up/down to reorder, left/right to move
							     a dish into another sub-column, or onto another course. Drag a
							     dish into the leftmost dashed zone to start a NEW column.
							     The 一 sits in a fixed-height row atop the first column so it's
							     centered over the dish AND aligned across courses. -->
							<div
								class="flex-1 px-2 pt-20 overflow-auto flex flex-row-reverse justify-center items-start gap-0.5 cursor-pointer"
								style="padding-bottom: {isUnderKidsBox ? '30%' : '1rem'}"
								onclick={(e) => { if (e.target === e.currentTarget) openDescEditor(idx); }}
								role="button"
								tabindex="-1"
								aria-label="料理を編集"
							>
								{#if dishCount === 0}
									<div class="relative flex flex-col items-center">
										{#if !isEditingName}
											<div
												class="cap-course-name is-single cursor-text hover:bg-stone-50/60 rounded transition-colors"
												onclick={() => { editingNameIdx = idx; }}
												role="button"
												tabindex="0"
												onkeydown={(e) => { if (e.key === 'Enter') editingNameIdx = idx; }}
												aria-label="コース名を編集"
											>
												{#each nameLines as line}
													<div class="cap-name-line tategaki font-serif-jp text-xl font-normal text-stone-900 tracking-[0.15em]">{line}</div>
												{/each}
											</div>
										{/if}
										<button
											onclick={() => openDescEditor(idx)}
											class="dish-placeholder tategaki font-serif-jp text-base text-stone-300 hover:text-stone-500 transition-colors py-2"
											aria-label="料理を追加"
										>料理詳細...</button>
									</div>
								{/if}
								{#each course.cols as col, colIdx (colIdx)}
									<!-- First/rightmost column sits highest = the "main". Later columns
									     clear the course name (only the first column carries it) then step
									     down by an increasing amount, giving the staircase look. -->
									<div class="relative flex flex-col items-center" style="margin-top: {colIdx === 0 ? 0 : stepEm}em;">
										{#if colIdx === 0 && !isEditingName}
											<!-- Aligned course name over the first column (WYSIWYG with print).
											     Click to edit. Long names split into 2 tight vertical lines. -->
											<div
												class="cap-course-name cursor-text hover:bg-stone-50/60 rounded transition-colors" class:is-single={nameLines.length === 1 || course.cols.length <= 1}
												onclick={() => { editingNameIdx = idx; }}
												role="button"
												tabindex="0"
												onkeydown={(e) => { if (e.key === 'Enter') editingNameIdx = idx; }}
												aria-label="コース名を編集"
											>
												{#each nameLines as line}
													<div class="cap-name-line tategaki font-serif-jp text-xl font-normal text-stone-900 tracking-[0.15em]">{line}</div>
												{/each}
											</div>
										{/if}
										<div class="dish-ichi-row flex items-center">
											{#if colIdx === 0}<span class="font-serif-jp text-xl text-stone-800 select-none">一</span>{/if}
										</div>
										<div
											class="dish-dndzone flex flex-col items-center gap-1"
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
												{@render vtext(dish.text)}
											</div>
										{/each}
									</div>
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
				<div class="kids-box border-2 border-dashed border-stone-400 bg-white px-2.5 py-2 flex flex-col gap-1 group/kids shadow-sm w-max min-w-[140px] max-w-[260px]" dir="ltr">
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
						{#each kidsItems as item, kidsIdx (item.id)}
							{#if editingKidsItemIdx === kidsIdx}
								<input
									type="text"
									bind:value={kidsItems[kidsIdx].text}
									placeholder="メニュー名を入力"
									onblur={() => {
										// Drop the item if left blank, so empty bullets don't linger.
										if (!kidsItems[kidsIdx].text.trim()) {
											kidsItems = kidsItems.filter((_, i) => i !== kidsIdx);
										}
										editingKidsItemIdx = null;
									}}
									onkeydown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
									use:autoFocusInput
									class="font-serif-jp text-base text-stone-700 bg-white outline-none border border-stone-300 rounded px-2 py-1 w-full min-w-[160px] placeholder:text-stone-300"
								/>
							{:else}
								<div class="group/item flex items-start gap-1">
									<span class="text-stone-500 text-base leading-tight font-serif-jp">・</span>
									<button
										onclick={() => { editingKidsItemIdx = kidsIdx; }}
										class="font-serif-jp text-base leading-tight hover:bg-stone-50 rounded px-1 py-0.5 transition-colors text-left tracking-wide whitespace-nowrap {item.text.trim() ? 'text-stone-700' : 'text-stone-300'}"
									>
										{item.text.trim() ? item.text : 'メニュー名を入力'}
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
							onclick={() => { kidsItems = [...kidsItems, { id: newId('kid'), text: '' }]; editingKidsItemIdx = kidsItems.length; }}
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
					onclick={() => { showKidsBox = true; if (kidsItems.length === 0) kidsItems = [{ id: newId('kid'), text: '' }]; }}
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
				{#each descEditorItems as item, i (item.id)}
					{@const linked = item.product_id != null}
					<div class="flex flex-col gap-1.5">
						<div class="flex items-center gap-2">
							<span class="text-stone-400 text-sm w-4 text-center">{i + 1}</span>
							<input
								type="text"
								bind:value={descEditorItems[i].text}
								use:autoFocusInput={descEditorItemFocus === i}
								onkeydown={(e) => {
									if (e.key === 'Enter') { e.preventDefault(); addDescItem(); }
								}}
								placeholder="料理名を入力..."
								class="flex-1 font-serif-jp text-sm text-stone-700 border border-stone-200 rounded px-3 py-2 outline-none focus:border-stone-400"
							/>
							<!-- Link product (allergen source) — only once the dish is persisted -->
							<button
								onclick={() => openLinkSearch(item.id)}
								disabled={!persistedDishIds.has(item.id)}
								class="p-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed {linked ? 'text-emerald-600 hover:text-emerald-700' : 'text-stone-300 hover:text-stone-600'}"
								title={!persistedDishIds.has(item.id) ? '保存後に紐付けできます' : (linked ? '紐付け済み — 変更' : '商品を紐付け（アレルギー）')}
								aria-label="商品を紐付け"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 11-5.656-5.656l1.5-1.5m6.656-2.828a4 4 0 010-5.656l3-3a4 4 0 115.656 5.656l-1.5 1.5" />
								</svg>
							</button>
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

						<!-- Linked product chip + allergens -->
						{#if linked && dishLinks[item.id]}
							<div class="ml-6 flex items-center flex-wrap gap-1.5">
								<span class="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
									{dishLinks[item.id].name}
								</span>
								{#each dishLinks[item.id].allergens as a (a.id)}
									<span class="text-[10px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">{a.name}</span>
								{/each}
								<button onclick={() => unlinkDish(item.id)} class="text-[10px] text-stone-400 hover:text-red-500 underline">解除</button>
							</div>
						{:else if linked}
							<div class="ml-6 text-[11px] text-emerald-700">紐付け済み</div>
						{/if}

						<!-- Product search dropdown -->
						{#if linkSearchForDish === item.id}
							<div class="ml-6 border border-stone-200 rounded p-2 bg-stone-50">
								<input
									type="text"
									bind:value={linkSearchTerm}
									placeholder="商品を検索..."
									class="w-full text-sm border border-stone-200 rounded px-2 py-1.5 outline-none focus:border-stone-400 mb-1.5"
								/>
								<div class="flex flex-col gap-1 max-h-40 overflow-y-auto">
									{#if !productsLoaded}
										<span class="text-[11px] text-stone-400 px-1">読み込み中...</span>
									{:else}
										{#each linkSearchResults as p (p.id)}
											<button
												onclick={() => linkDishToProduct(item.id, p)}
												disabled={linkingDishId === item.id}
												class="text-left text-sm px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-stone-200 flex items-center justify-between gap-2 disabled:opacity-50"
											>
												<span class="text-stone-700 truncate">{p.name}</span>
												{#if p.allergens.length}
													<span class="text-[10px] text-amber-600 flex-shrink-0">{p.allergens.length} アレルゲン</span>
												{/if}
											</button>
										{:else}
											<span class="text-[11px] text-stone-400 px-1">該当する商品なし</span>
										{/each}
									{/if}
								</div>
							</div>
						{/if}
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

{#if showImport}
	<MenuImportModal
		onClose={() => { showImport = false; }}
		onApplied={async () => {
			// Rows changed underneath us — reload the saved-menu list so counts and
			// any reopened menu reflect what the import actually wrote.
			try { savedMenus = await menuScanGetMenus(); } catch { /* keep cached list */ }
		}}
	/>
{/if}

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
	/* The course name renders INSIDE the first dish column (cap-course-name) so
	   it aligns over that column — both on screen (edit) AND in print/PDF. This
	   keeps WYSIWYG: the preview matches the printed sheet. The old centered
	   header is no longer rendered. Long names split into 2 tight side-by-side
	   vertical lines (Japanese order: first half right, second half left). */
	.cap-course-name {
		position: absolute;            /* sits ABOVE the column, occupies no layout
		                                  height — so column 1's 一/dishes stay at the
		                                  same baseline as every other column. */
		/* Fixed header zone. The box font-size matches the NAME size (text-xl =
		   1.25rem, the SAME as the dishes) so the names and dish text align and the
		   box's em units track the actual glyph height.
		   Height = 3 lines tall (the longest split half); names top-align so the
		   header row is even across courses; bottom sits just above the 一. */
		font-size: 1.25rem;            /* = text-xl, same as the dish text */
		bottom: calc(100% + 0.15em);
		height: 3.2em;                 /* 3 chars tall at line-height 1, + slack */
		/* Right-anchor the name to the first dish column's right edge. Each name
		   half is a 1-char-wide vertical line — the same width as a dish column —
		   so half 1 sits over dish-col-1 and half 2 over dish-col-2, reading as one
		   aligned 2-column block (what the chef wants for 本日の肉料理). */
		right: 0;
		display: flex;
		flex-direction: row-reverse;   /* first half on the right */
		justify-content: flex-start;
		align-items: flex-start;       /* names hang from the shared TOP line → even row */
		gap: 0;                        /* tight — the two halves sit flush */
		white-space: nowrap;
	}
	/* Single-line names (≤3 chars) stay centered over their one column. */
	.cap-course-name.is-single {
		right: auto;
		left: 50%;
		transform: translateX(-50%);
		justify-content: center;
	}
	.cap-course-name .cap-name-line {
		font-size: 1em;                /* inherit the box font — drop the text-xl
		                                  utility's own sizing so em math is consistent */
		line-height: 1;
		width: 1.25em;                 /* one column width, matching a dish column */
		text-align: center;
	}

	.font-serif-jp {
		font-family: 'Noto Serif JP', 'YuMincho', 'Hiragino Mincho Pro', Georgia, serif;
	}

	.tategaki {
		writing-mode: vertical-rl;
		text-orientation: mixed;
		font-family: 'Noto Serif JP', 'YuMincho', 'Hiragino Mincho Pro', Georgia, serif;
	}

	/* tate-chu-yoko: a short romaji/Latin run rendered horizontal & upright in one
	   vertical slot, so e.g. "OIL" reads left-to-right instead of rotated. Only
	   applied to Latin runs (see tateChuYoko()); the rest of the line is unaffected,
	   so kana, kanji, ー and punctuation keep their normal vertical orientation. */
	:global(.tategaki .tcy) {
		text-combine-upright: all;
		-webkit-text-combine: horizontal;   /* Safari */
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
	/* Fixed-height slot for the 一 separator, centered over its column, so the
	   mark aligns with the dish below AND lines up across every course. */
	.dish-ichi-row {
		height: 2em;
		justify-content: center;
		flex-shrink: 0;
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
	/* Kids box sits in the lower-right band, between the menu title column and the
	   食前酒 column: tucked under the title (115px) and spilling left over 食前酒.
	   Small right offset pulls it toward the title side. */
	.scan-kids-wrap {
		position: absolute;
		bottom: 1.5rem;
		right: 10px;
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

		/* Print all menu text in near-black for a crisp printed/PDF menu
		   (on-screen uses warm greys like stone-700, which look faded in print). */
		:global(.menu-scan-modal .tategaki),
		:global(.menu-scan-modal .dish-display),
		:global(.menu-scan-modal .font-serif-jp) {
			color: #111 !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
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

		/* Fill the entire printable area with comfortable margins on all sides */
		:global(.menu-scan-modal) {
			position: fixed !important;
			top: 0 !important;
			left: 0 !important;
			width: 100% !important;
			height: 100% !important;
			background: white !important;
			padding: 8mm 12mm !important;
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
			transform: none !important;   /* drop on-screen fit-to-width scaling */
		}

		/* Make the paper fill the page height (no fixed 794px band) so the whole
		   menu — including the kids box at the bottom — fits on one A4 page. */
		:global(.menu-scan-modal .scan-paper-scroll) {
			height: 100% !important;
			overflow: visible !important;
			padding: 0 !important;
			align-items: stretch !important;
		}
		:global(.menu-scan-modal .scan-paper-fit) {
			width: 100% !important;
			height: 100% !important;
			overflow: visible !important;
		}
		:global(.menu-scan-modal .scan-paper-columns) {
			height: 100% !important;
			width: 100% !important;
		}
		/* Let course columns share the page width evenly when printing */
		:global(.menu-scan-modal .scan-paper-columns > .course-col) {
			flex: 1 1 0 !important;
			width: auto !important;
		}

		/* Print: comfortable line-height for vertical Japanese text */
		:global(.menu-scan-modal .tategaki) {
			line-height: 2 !important;
			letter-spacing: 0.08em !important;
		}
		:global(.menu-scan-modal .font-serif-jp) {
			line-height: 1.8 !important;
		}
		:global(.menu-scan-modal .leading-loose) {
			line-height: 2 !important;
		}

		/* Font sizes — larger for readability, matching the screen sizes closely */
		:global(.menu-scan-modal .text-4xl) { font-size: 1.8rem !important; }  /* title */
		:global(.menu-scan-modal .text-3xl) { font-size: 1.5rem !important; }
		:global(.menu-scan-modal .text-2xl) { font-size: 1.2rem !important; }  /* course names */
		:global(.menu-scan-modal .text-xl)  { font-size: 1rem !important; }    /* dish items + 一 */
		:global(.menu-scan-modal .text-lg)  { font-size: 0.9rem !important; }
		:global(.menu-scan-modal .text-base){ font-size: 0.85rem !important; }
		:global(.menu-scan-modal .text-sm)  { font-size: 0.8rem !important; }

		/* Course header zone — taller for larger font */
		:global(.menu-scan-modal .course-header-box) {
			height: 5em !important;
		}

		/* Remove the dividing borders between course columns + title column on print */
		:global(.menu-scan-modal .course-col),
		:global(.menu-scan-modal .paper-title-col) {
			border: none !important;
		}
		:global(.menu-scan-modal .border-l) { border-left: none !important; }
		:global(.menu-scan-modal .border-r) { border-right: none !important; }


		/* Kids box wrapper — keep it absolutely positioned under 食前酒 in print
		   too (the on-screen position lives on .scan-kids-wrap, so print must
		   override it here or the box drifts). */
		:global(.menu-scan-modal .scan-kids-wrap) {
			position: absolute !important;
			bottom: 0.5cm !important;
			right: 10px !important;
			left: auto !important;
		}

		/* Kids box — readable print version */
		.kids-box {
			page-break-inside: avoid;
			width: max-content !important;   /* fit the text, no wrapping */
			min-width: 140px !important;
			max-width: 260px !important;
			padding: 0.4rem 0.6rem !important;
			gap: 0.25rem !important;
			border-width: 1.5px !important;
		}

		/* Hide all delete buttons & non-essential controls on print */
		:global(.menu-scan-modal button[aria-label="このコースを削除"]),
		:global(.menu-scan-modal button[aria-label="子供メニューを削除"]),
		:global(.menu-scan-modal button[aria-label="項目を削除"]) {
			display: none !important;
		}
	}

	.paper-title-col {
		width: 115px;   /* fixed (matches TITLE_W) so the kids box sits under 食前酒 consistently */
		flex: none;
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

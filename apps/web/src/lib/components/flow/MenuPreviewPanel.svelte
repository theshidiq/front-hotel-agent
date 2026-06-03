<script lang="ts">
	interface CourseColumn {
		courseId: string;
		courseName: string;
		courseValue: string;
		menus: { id: string; name: string; price: number | null; description: string | null }[];
	}

	interface AvailableCourse {
		id: string;
		label: string;
		value: string;
	}

	interface KidsGroupInfo {
		id: string;
		name: string;
		courseNames: string[];
	}

	interface LinkableGroup {
		id: string;
		name: string;
	}

	interface Props {
		groupId: string;
		groupName: string;
		seasonName: string | null;
		displayTitle: string | null;
		courses: CourseColumn[];
		availableCourses: AvailableCourse[];
		kidsGroup: KidsGroupInfo | null;
		linkableGroups: LinkableGroup[];
		readonly?: boolean;
		onUpdateDisplayTitle?: (title: string) => void;
		onToggleCourse?: (groupId: string, courseId: string) => Promise<void>;
		onReorderCourses?: (groupId: string, courseIds: string[]) => Promise<void>;
		onLinkKidsGroup?: (kidsGroupId: string | null) => void;
		onDeleteMenu?: (menuId: string) => void;
		onClose: () => void;
		onMenusCreated?: () => void;
	}

	let {
		groupId,
		groupName,
		seasonName,
		displayTitle,
		courses,
		availableCourses,
		kidsGroup,
		linkableGroups,
		readonly = false,
		onUpdateDisplayTitle,
		onToggleCourse,
		onReorderCourses,
		onLinkKidsGroup,
		onDeleteMenu,
		onClose,
		onMenusCreated,
	}: Props = $props();

	// --- Japanese era + season auto-detection ---

	const kanjiNumbers: Record<number, string> = {
		1: '元', 2: '二', 3: '三', 4: '四', 5: '五',
		6: '六', 7: '七', 8: '八', 9: '九', 10: '十',
		11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五',
		16: '十六', 17: '十七', 18: '十八', 19: '十九', 20: '二十',
	};

	function getJapaneseEraYear(date: Date): { era: string; year: number; kanjiYear: string } {
		const y = date.getFullYear();
		// Reiwa started May 1, 2019
		const reiwaYear = y - 2018;
		const kanji = kanjiNumbers[reiwaYear] ?? String(reiwaYear);
		return { era: '令和', year: reiwaYear, kanjiYear: kanji };
	}

	type SeasonKey = '春' | '夏' | '秋' | '冬';

	function detectSeason(date: Date): SeasonKey {
		const m = date.getMonth() + 1;
		if (m >= 3 && m <= 5) return '春';
		if (m >= 6 && m <= 8) return '夏';
		if (m >= 9 && m <= 11) return '秋';
		return '冬';
	}

	const seasonOptions: { value: SeasonKey; label: string; desc: string }[] = [
		{ value: '春', label: '春', desc: '3月〜5月' },
		{ value: '夏', label: '夏', desc: '6月〜8月' },
		{ value: '秋', label: '秋', desc: '9月〜11月' },
		{ value: '冬', label: '冬', desc: '12月〜2月' },
	];

	const now = new Date();
	const eraInfo = getJapaneseEraYear(now);
	const detectedSeason = detectSeason(now);

	// Parse existing displayTitle to restore previous selections, or use auto-detected defaults
	function parseExistingTitle(title: string | null): { era: string; kanjiYear: string; season: SeasonKey; suffix: string } {
		if (!title) return { era: eraInfo.era, kanjiYear: eraInfo.kanjiYear, season: seasonName as SeasonKey ?? detectedSeason, suffix: groupName };
		// Try to parse "令和八年　冬メニュー　新規" pattern
		const match = title.match(/^(令和)([\u4e00-\u9fff]+)年[\s　]+(春|夏|秋|冬)/);
		if (match) {
			const parsedSeason = match[3] as SeasonKey;
			// Extract suffix after "メニュー　" or after season
			const suffixMatch = title.match(/(春|夏|秋|冬)(?:メニュー)?[\s　]*(.*)/);
			const suffix = suffixMatch?.[2]?.trim() || groupName;
			return { era: match[1], kanjiYear: match[2], season: parsedSeason, suffix };
		}
		return { era: eraInfo.era, kanjiYear: eraInfo.kanjiYear, season: seasonName as SeasonKey ?? detectedSeason, suffix: groupName };
	}

	const parsed = parseExistingTitle(displayTitle);

	// Selectable state
	let selectedSeason: SeasonKey = $state(parsed.season);
	let titleSuffix = $state(parsed.suffix);

	// Composed title
	const composedTitle = $derived(`${eraInfo.era}${eraInfo.kanjiYear}年　${selectedSeason}メニュー　${titleSuffix}`);

	// Auto-save when composition changes (only in edit mode)
	let lastSavedTitle = $state(displayTitle ?? '');

	$effect(() => {
		if (!readonly && composedTitle !== lastSavedTitle) {
			lastSavedTitle = composedTitle;
			onUpdateDisplayTitle?.(composedTitle);
		}
	});

	// Active course selection
	let activeCourseId: string | null = $state(null);

	// Dropdowns
	let showAddCourseDropdown = $state(false);
	let showTitleConfig = $state(false);
	let addCourseEl: HTMLDivElement | undefined = $state(undefined);

	// Drag & drop reordering
	let dragIndex: number | null = $state(null);
	let dropIndex: number | null = $state(null);

	// Reversed courses (right-to-left reading order)
	const reversedCourses = $derived([...courses].reverse());

	// Dynamic text sizing based on number of courses
	const isCompact = $derived(courses.length > 8);

	// Kids group dropdown
	let showKidsDropdown = $state(false);
	let kidsDropdownEl: HTMLDivElement | undefined = $state(undefined);

	// Print
	function handlePrint() {
		window.print();
	}
	const headerTextClass = $derived(isCompact ? 'text-base tracking-[0.3em]' : 'text-xl tracking-[0.4em]');
	const menuTextClass = $derived(isCompact ? 'text-sm tracking-[0.2em]' : 'text-base tracking-[0.3em]');
	const menuDescClass = $derived(isCompact ? 'text-[10px] tracking-[0.15em]' : 'text-xs tracking-[0.2em]');
	const titleTextClass = $derived(isCompact ? 'text-base tracking-[0.3em]' : 'text-lg tracking-[0.4em]');

	function handleWindowClick(e: MouseEvent) {
		if (showAddCourseDropdown && addCourseEl && !addCourseEl.contains(e.target as Node)) {
			showAddCourseDropdown = false;
		}
		if (showKidsDropdown && kidsDropdownEl && !kidsDropdownEl.contains(e.target as Node)) {
			showKidsDropdown = false;
		}
	}

	async function handleAddCourse(courseId: string) {
		if (readonly || !onToggleCourse) return;
		await onToggleCourse(groupId, courseId);
		showAddCourseDropdown = false;
	}

	function handleDragStart(e: DragEvent, index: number) {
		if (readonly) return;
		dragIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dropIndex = index;
	}

	function handleDragLeave(e: DragEvent, el: HTMLElement) {
		// Only clear if actually leaving the element (not entering a child)
		if (!el.contains(e.relatedTarget as Node)) {
			dropIndex = null;
		}
	}

	async function handleDrop(index: number) {
		if (readonly || !onReorderCourses || dragIndex === null || dragIndex === index) {
			dragIndex = null;
			dropIndex = null;
			return;
		}
		// reversedCourses is in display order (reversed from data order)
		// We reorder in display order, then reverse back to data order
		const reordered = [...reversedCourses];
		const [moved] = reordered.splice(dragIndex, 1);
		reordered.splice(index, 0, moved);
		// Reverse back to data order and extract IDs
		const newIds = [...reordered].reverse().map(c => c.courseId);
		dragIndex = null;
		dropIndex = null;
		await onReorderCourses(groupId, newIds);
	}

	function handleDragEnd() {
		dragIndex = null;
		dropIndex = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@200;300;400;500;700&display=swap" rel="stylesheet" />
</svelte:head>

<svelte:window onclick={handleWindowClick} onkeydown={handleKeydown} />

<!-- Fullscreen overlay -->
<div class="fixed inset-0 bg-stone-100 z-[55] flex flex-col overflow-hidden">
	<!-- Header -->
	<header class="border-b border-stone-200 px-6 py-3 flex justify-between items-center bg-white flex-shrink-0 print:hidden">
		<div class="flex items-center gap-5">
			<div class="flex items-center gap-2">
				<div class="w-1 h-5 bg-accent"></div>
				<h1 class="font-serif-jp text-lg tracking-[0.15em]">{readonly ? 'お品書きプレビュー' : 'お品書き編集'}</h1>
			</div>
			<div class="h-6 w-px bg-stone-200"></div>
			<div class="flex flex-col">
				<span class="text-[8px] uppercase tracking-widest text-stone-400">Menu Group</span>
				<span class="text-xs font-medium text-stone-600">{groupName}</span>
			</div>
		</div>
		<div class="flex items-center gap-2">
			{#if !readonly}
			<div class="relative" bind:this={addCourseEl}>
				<button
					onclick={(e) => { e.stopPropagation(); showAddCourseDropdown = !showAddCourseDropdown; }}
					class="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 text-[9px] tracking-[0.12em] hover:bg-stone-50 transition-colors uppercase font-medium"
				>
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Add Course
				</button>
				{#if showAddCourseDropdown}
					<div class="absolute right-0 top-full mt-1 z-20 bg-white border border-stone-200 rounded-lg shadow-lg min-w-[180px] py-1">
						{#each availableCourses as course}
							<button
								onclick={() => handleAddCourse(course.id)}
								class="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
							>
								{course.label}
							</button>
						{/each}
						{#if availableCourses.length === 0}
							<p class="px-3 py-2 text-xs text-stone-400 text-center">全コース割り当て済み</p>
						{/if}
					</div>
				{/if}
			</div>
			{/if}
			<!-- Kids group link -->
			{#if !readonly}
			<div class="relative" bind:this={kidsDropdownEl}>
				<button
					onclick={(e) => { e.stopPropagation(); showKidsDropdown = !showKidsDropdown; }}
					class="flex items-center gap-1.5 px-3 py-1.5 border text-[9px] tracking-[0.12em] hover:bg-stone-50 transition-colors uppercase font-medium {kidsGroup ? 'border-orange-300 text-orange-700 bg-orange-50/50' : 'border-stone-200'}"
				>
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
					{kidsGroup ? kidsGroup.name : '子供メニュー'}
				</button>
				{#if showKidsDropdown}
					<div class="absolute right-0 top-full mt-1 z-20 bg-white border border-stone-200 rounded-lg shadow-lg min-w-[200px] py-1">
						<p class="px-3 py-1.5 text-[8px] uppercase tracking-widest text-stone-400 font-bold border-b border-stone-100">子供メニューグループ</p>
						{#if kidsGroup}
							<button
								onclick={() => { onLinkKidsGroup?.(null); showKidsDropdown = false; }}
								class="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
							>
								リンク解除
							</button>
							<div class="border-t border-stone-100"></div>
						{/if}
						{#each linkableGroups as g}
							<button
								onclick={() => { onLinkKidsGroup?.(g.id); showKidsDropdown = false; }}
								class="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors {kidsGroup?.id === g.id ? 'bg-orange-50 font-medium' : ''}"
							>
								{g.name}
								{#if kidsGroup?.id === g.id}
									<span class="text-orange-500 text-xs ml-1">✓</span>
								{/if}
							</button>
						{/each}
						{#if linkableGroups.length === 0}
							<p class="px-3 py-2 text-xs text-stone-400 text-center">他のグループがありません</p>
						{/if}
					</div>
				{/if}
			</div>
			{/if}
			{#if !readonly}
			<button
				onclick={handlePrint}
				class="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 text-[9px] tracking-[0.12em] hover:bg-stone-50 transition-colors uppercase font-medium print:hidden"
			>
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
				</svg>
				Print
			</button>
			{/if}
			<button
				onclick={onClose}
				class="px-3 py-1.5 border border-stone-200 text-[9px] tracking-[0.12em] hover:bg-stone-50 transition-colors uppercase font-medium print:hidden"
			>
				Close
			</button>
		</div>
	</header>

	<!-- A4 Landscape paper area (scrolls on screen; fixed A4 for print) -->
	<div class="flex-1 flex items-start justify-center p-6 overflow-auto print:p-0 print:overflow-visible print:items-stretch">
		<div class="a4-paper bg-white shadow-lg border border-stone-200 flex flex-col relative print:shadow-none print:border-0" data-print-area>
			<!-- Paper content -->
			<div class="paper-columns flex" dir="rtl">

				<!-- Title column (far right) -->
				<div class="flex-none flex flex-col border-l border-stone-200 relative paper-title-col" dir="ltr">
					<!-- Title preview (vertical text) — clickable -->
					<button
						class="title-column flex-1 flex items-start justify-center pt-4 pb-3 px-1 relative group transition-colors {showTitleConfig ? 'bg-orange-50/40' : readonly ? '' : 'hover:bg-stone-50/50'} {readonly ? 'cursor-default' : ''}"
						onclick={() => { if (!readonly) showTitleConfig = !showTitleConfig; }}
					disabled={readonly}
					>
				{#if !readonly}
						<!-- Edit hint badge (top) -->
						<div class="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 text-stone-400 text-[8px] tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity {showTitleConfig ? '!opacity-100 !bg-orange-100 !text-orange-500' : ''}">
							<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
							編集
						</div>
				{/if}

						<div class="tategaki font-serif-jp {titleTextClass} font-light text-stone-800 leading-loose h-fit mt-1">
							{composedTitle}
						</div>

						<!-- Dashed border hint on hover -->
						<div class="absolute inset-2 border border-dashed border-transparent group-hover:border-stone-300 rounded transition-colors {showTitleConfig ? '!border-orange-300' : ''} pointer-events-none"></div>
					</button>

					<!-- Title config popover -->
					{#if showTitleConfig}
						<div class="absolute top-4 right-full mr-2 z-30 bg-white border border-stone-200 rounded-lg shadow-xl p-4 min-w-[240px]">
							<div class="flex items-center justify-between mb-3">
								<span class="text-xs font-semibold text-stone-700">タイトル設定</span>
								<button onclick={() => { showTitleConfig = false; }} class="text-stone-400 hover:text-stone-600">
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>

							<!-- Era + Year (auto-detected, display only) -->
							<div class="mb-3">
								<label class="text-[10px] text-stone-400 uppercase tracking-wider block mb-1">年号</label>
								<div class="flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-lg border border-stone-100">
									<span class="text-sm font-serif-jp text-stone-800">{eraInfo.era}{eraInfo.kanjiYear}年</span>
									<span class="text-[9px] text-stone-400 ml-auto">({now.getFullYear()})</span>
								</div>
							</div>

							<!-- Season selector -->
							<div class="mb-3">
								<label class="text-[10px] text-stone-400 uppercase tracking-wider block mb-1">季節</label>
								<div class="grid grid-cols-4 gap-1">
									{#each seasonOptions as opt}
										<button
											onclick={() => { selectedSeason = opt.value; }}
											class="flex flex-col items-center py-2 rounded-lg border transition-all text-center {selectedSeason === opt.value ? 'bg-orange-50 border-orange-300 text-orange-800' : 'border-stone-100 hover:bg-stone-50 text-stone-600'}"
										>
											<span class="text-sm font-serif-jp">{opt.label}</span>
											<span class="text-[8px] text-stone-400 mt-0.5">{opt.desc}</span>
										</button>
									{/each}
								</div>
								{#if detectedSeason === selectedSeason}
									<p class="text-[9px] text-green-600 mt-1">現在の季節と一致</p>
								{/if}
							</div>

							<!-- Suffix (group name, editable) -->
							<div>
								<label class="text-[10px] text-stone-400 uppercase tracking-wider block mb-1">メニュー名</label>
								<input
									type="text"
									bind:value={titleSuffix}
									class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-orange-300 focus:border-orange-300 font-serif-jp"
									placeholder={groupName}
								/>
							</div>

							<!-- Preview -->
							<div class="mt-4 pt-3 border-t border-stone-100">
								<label class="text-[10px] text-stone-400 uppercase tracking-wider block mb-1">プレビュー</label>
								<p class="text-sm font-serif-jp text-stone-800 tracking-wider">{composedTitle}</p>
							</div>
						</div>
					{/if}
				</div>

				<!-- Course columns (reversed: first course = rightmost) -->
				{#each reversedCourses as course, i}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="flex-1 min-w-0 border-l flex flex-col transition-all {readonly ? 'cursor-default' : 'cursor-grab'} {activeCourseId === course.courseId ? 'bg-orange-50/20' : readonly ? '' : 'hover:bg-stone-50/20'} {dragIndex === i ? 'opacity-30 scale-[0.97]' : ''} {dropIndex === i && dragIndex !== null && dragIndex !== i ? 'bg-orange-50/30 border-l-orange-400 border-l-2' : 'border-stone-100'}"
						onclick={() => { if (!readonly) activeCourseId = course.courseId; }}
						onkeydown={(e) => { if (!readonly && (e.key === 'Enter' || e.key === ' ')) activeCourseId = course.courseId; }}
						role="button"
						tabindex="0"
						dir="ltr"
						draggable={!readonly}
						ondragstart={(e) => handleDragStart(e, i)}
						ondragover={(e) => handleDragOver(e, i)}
						ondragleave={(e) => handleDragLeave(e, e.currentTarget as HTMLElement)}
						ondrop={() => handleDrop(i)}
						ondragend={handleDragEnd}
					>
						<!-- Course header (fixed height) + dash separator -->
						<div class="px-1 pt-4 pb-1 flex flex-col items-center flex-shrink-0 course-header-box">
							<div class="tategaki {headerTextClass} font-serif-jp font-normal text-stone-900">
								{course.courseName}
							</div>
						</div>
						<div class="flex justify-center flex-shrink-0 py-1">
							<span class="font-serif-jp {menuTextClass} text-stone-800">一</span>
						</div>

						<!-- Menu items: fill down first, then wrap left (column layout) -->
						<div class="flex-1 px-1 pt-1 pb-2 overflow-hidden">
							<div class="menu-items-column flex flex-col flex-wrap items-center h-full {isCompact ? 'gap-x-1 gap-y-3' : 'gap-x-2 gap-y-4'}">
								{#each course.menus as menu}
									<div class="flex flex-col items-center group relative">
										<div class="tategaki font-serif-jp {menuTextClass} leading-relaxed text-stone-800 h-fit">
											{menu.name}
										</div>
										{#if menu.description}
											<div class="tategaki font-serif-jp {menuDescClass} text-stone-400 font-light mt-2 h-fit">
												{menu.description}
											</div>
										{/if}
									{#if !readonly}
										<button
											onclick={(e) => { e.stopPropagation(); onDeleteMenu?.(menu.id); }}
											class="mt-1 opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 transition-all"
											title="Delete"
										>
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									{/if}
									</div>
								{/each}

							</div>
						</div>
					</div>
				{/each}

				{#if courses.length === 0}
					<div class="flex-1 flex flex-col items-center justify-center text-stone-300 gap-2 p-8" dir="ltr">
						<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
						</svg>
						<span class="text-xs font-serif-jp">コースを追加してください</span>
					</div>
				{/if}
			</div>

			<!-- Kids group box — its own block below the menu (screen),
			     pinned to bottom-right corner only when printing -->
			{#if kidsGroup}
				<div class="kids-box-wrap flex justify-end px-3 pb-3 pt-2 print:p-0" dir="ltr">
					<div class="kids-box border border-dashed border-stone-400 bg-white p-3 print:absolute print:bottom-3 print:right-3">
						<div class="font-serif-jp text-xs font-medium text-stone-800 text-center border-b border-stone-300 pb-1.5 mb-2">
							{kidsGroup.name}
						</div>
						{#if kidsGroup.courseNames.length > 0}
							<div class="flex flex-col items-center gap-0.5">
								{#each kidsGroup.courseNames as name}
									<span class="font-serif-jp text-[11px] text-stone-700">・{name}</span>
								{/each}
							</div>
						{:else}
							<div class="font-serif-jp text-[10px] text-stone-300 text-center py-2">
								コース未設定
							</div>
						{/if}
					</div>
				</div>
			{/if}

		</div>
	</div>
</div>

<style>
	.bg-accent {
		background-color: #C2410C;
	}

	.font-serif-jp {
		font-family: 'Noto Serif JP', 'YuMincho', 'Hiragino Mincho Pro', Georgia, serif;
	}

	.tategaki {
		writing-mode: vertical-rl;
		text-orientation: mixed;
		font-family: 'Noto Serif JP', 'YuMincho', 'Hiragino Mincho Pro', Georgia, serif;
	}

	/* On screen the paper is a FIXED-pixel A4-landscape canvas so the layout is
	   identical on every device/resolution (no viewport-relative shrinking).
	   The outer area scrolls when this canvas + the kids box exceed the window.
	   Print reapplies viewport-filling A4 (see @media print below). */
	.a4-paper {
		width: 1123px;   /* ~A4 landscape width  @ 96dpi minus margins */
		flex: none;      /* true fixed canvas — never shrink to fit the screen */
	}

	/* The vertical-text column band gets a real, fixed height so menu items have
	   room to lay out instead of cramming to fit the screen height. Taller than a
	   typical laptop viewport so the page reliably scrolls. */
	.paper-columns {
		height: 920px;
	}

	.paper-title-col {
		width: 110px;
		flex: none;
	}

	/* Each course column keeps a readable min-width; paper scrolls if too many. */
	.paper-columns > :global(div[class*="border-l"]) {
		min-width: 96px;
	}

	.course-header-box {
		height: 5.5em;
		justify-content: center;
	}

	/* Kids area sits below the menu on screen with a clear separating space */
	.kids-box-wrap {
		border-top: 1px dashed #e7e5e4;
		margin-top: 8px;
	}

	.kids-box {
		width: 240px;
		overflow: hidden;
	}

	/* No separator line / top margin when printing (kids box floats to corner) */
	@media print {
		.kids-box-wrap {
			border-top: 0 !important;
			margin-top: 0 !important;
		}
	}

	.menu-items-column {
		direction: rtl;
	}

	.custom-scroll::-webkit-scrollbar {
		width: 3px;
	}
	.custom-scroll::-webkit-scrollbar-thumb {
		background: #e7e5e4;
		border-radius: 2px;
	}

	/* Print styles */
	@media print {
		@page {
			size: A4 landscape;
			margin: 10mm;
		}

		:global(body *) {
			visibility: hidden;
		}

		/* Show only the preview overlay and its contents */
		:global(body [data-print-area]),
		:global(body [data-print-area] *) {
			visibility: visible;
		}

		:global(body [data-print-area]) {
			position: fixed;
			top: 0;
			left: 0;
			/* Restore single-page A4 fill for print/PDF (screen uses a fixed canvas) */
			width: 100vw !important;
			height: 100vh !important;
			max-width: none !important;
			overflow: hidden !important;
		}

		/* Reapply viewport-relative proportions and corner kids box for print */
		:global([data-print-area] .paper-columns) {
			height: auto !important;
			flex: 1 1 auto !important;
			overflow: hidden !important;
		}
		:global([data-print-area] .paper-columns > div[class*='border-l']) {
			min-width: 0 !important;
		}
		:global([data-print-area] .paper-title-col) {
			width: clamp(60px, 7%, 120px) !important;
		}
		:global([data-print-area] .kids-box-wrap) {
			padding: 0 !important;
		}

		/* Hide interactive buttons (delete, dropdown, etc.) but NOT the title column button */
		:global([data-print-area] .group .opacity-0),
		:global([data-print-area] .group-hover\:opacity-100) {
			display: none !important;
		}

		/* Hide title config popover */
		:global([data-print-area] .absolute.z-30) {
			display: none !important;
		}

		/* Hide the edit hint badge inside the title column */
		:global([data-print-area] .title-column .opacity-0) {
			display: none !important;
		}

		/* Hide dashed border hints (decorative only, not kids-box) */
		:global([data-print-area] .title-column .border-dashed) {
			border-color: transparent !important;
		}

		/* Ensure kids box border prints with exact colors */
		:global([data-print-area] .kids-box) {
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
			border-color: #a8a29e !important;
		}
	}
</style>

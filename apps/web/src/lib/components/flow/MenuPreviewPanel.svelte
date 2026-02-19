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

	interface Props {
		groupId: string;
		groupName: string;
		seasonName: string | null;
		displayTitle: string | null;
		courses: CourseColumn[];
		availableCourses: AvailableCourse[];
		onUpdateDisplayTitle: (title: string) => void;
		onToggleCourse: (groupId: string, courseId: string) => Promise<void>;
		onDeleteMenu: (menuId: string) => void;
		onClose: () => void;
	}

	let {
		groupId,
		groupName,
		seasonName,
		displayTitle,
		courses,
		availableCourses,
		onUpdateDisplayTitle,
		onToggleCourse,
		onDeleteMenu,
		onClose,
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

	// Auto-save when composition changes
	let lastSavedTitle = $state(displayTitle ?? '');

	$effect(() => {
		if (composedTitle !== lastSavedTitle) {
			lastSavedTitle = composedTitle;
			onUpdateDisplayTitle(composedTitle);
		}
	});

	// Active course selection
	let activeCourseId: string | null = $state(null);

	// Dropdowns
	let showAddCourseDropdown = $state(false);
	let showSubCourseDropdown = $state(false);
	let showTitleConfig = $state(false);
	let addCourseEl: HTMLDivElement | undefined = $state(undefined);
	let subCourseEl: HTMLDivElement | undefined = $state(undefined);

	// Reversed courses (right-to-left reading order)
	const reversedCourses = $derived([...courses].reverse());

	function handleWindowClick(e: MouseEvent) {
		if (showAddCourseDropdown && addCourseEl && !addCourseEl.contains(e.target as Node)) {
			showAddCourseDropdown = false;
		}
		if (showSubCourseDropdown && subCourseEl && !subCourseEl.contains(e.target as Node)) {
			showSubCourseDropdown = false;
		}
	}

	async function handleAddCourse(courseId: string) {
		await onToggleCourse(groupId, courseId);
		showAddCourseDropdown = false;
	}

	async function handleAddSubCourse(courseId: string) {
		await onToggleCourse(groupId, courseId);
		showSubCourseDropdown = false;
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
	<header class="border-b border-stone-200 px-6 py-3 flex justify-between items-center bg-white flex-shrink-0">
		<div class="flex items-center gap-5">
			<div class="flex items-center gap-2">
				<div class="w-1 h-5 bg-accent"></div>
				<h1 class="font-serif-jp text-lg tracking-[0.15em]">お品書き編集</h1>
			</div>
			<div class="h-6 w-px bg-stone-200"></div>
			<div class="flex flex-col">
				<span class="text-[8px] uppercase tracking-widest text-stone-400">Menu Group</span>
				<span class="text-xs font-medium text-stone-600">{groupName}</span>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<div class="relative" bind:this={addCourseEl}>
				<button
					onclick={(e) => { e.stopPropagation(); showAddCourseDropdown = !showAddCourseDropdown; showSubCourseDropdown = false; }}
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
			<button
				onclick={onClose}
				class="px-3 py-1.5 border border-stone-200 text-[9px] tracking-[0.12em] hover:bg-stone-50 transition-colors uppercase font-medium"
			>
				Close
			</button>
		</div>
	</header>

	<!-- A4 Landscape paper area -->
	<div class="flex-1 flex items-center justify-center p-6 overflow-hidden">
		<div class="a4-paper bg-white shadow-lg border border-stone-200 flex flex-col w-full max-w-[1120px] h-full max-h-[680px]">
			<!-- Paper content -->
			<div class="flex-1 flex overflow-x-auto overflow-y-hidden course-scroll" dir="rtl">

				<!-- Title column (far right) -->
				<div class="flex-none w-44 flex flex-col border-l border-stone-200 relative" dir="ltr">
					<!-- Title preview (vertical text) — clickable -->
					<button
						class="title-column flex-1 flex items-start justify-center pt-8 pb-6 px-3 relative group transition-colors {showTitleConfig ? 'bg-orange-50/40' : 'hover:bg-stone-50/50'}"
						onclick={() => { showTitleConfig = !showTitleConfig; }}
					>
						<!-- Edit hint badge (top) -->
						<div class="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 text-stone-400 text-[8px] tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity {showTitleConfig ? '!opacity-100 !bg-orange-100 !text-orange-500' : ''}">
							<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
							編集
						</div>

						<div class="tategaki font-serif-jp text-base tracking-[0.45em] font-light text-stone-800 leading-loose h-fit mt-4">
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
				{#each reversedCourses as course}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="flex-none w-44 border-l border-stone-100 flex flex-col transition-colors {activeCourseId === course.courseId ? 'bg-orange-50/20' : 'hover:bg-stone-50/20'}"
						onclick={() => { activeCourseId = course.courseId; }}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') activeCourseId = course.courseId; }}
						role="button"
						tabindex="0"
						dir="ltr"
					>
						<!-- Course header -->
						<div class="px-3 pt-6 pb-4 flex flex-col items-center border-b border-stone-200 flex-shrink-0">
							<div class="tategaki text-lg tracking-[0.4em] font-serif-jp font-normal h-auto text-stone-900">
								{course.courseName}
							</div>
						</div>

						<!-- Menu items -->
						<div class="flex-1 px-2 pt-5 pb-4 overflow-y-auto custom-scroll">
							<div class="flex gap-4 justify-center">
								{#each course.menus as menu}
									<div class="flex flex-col items-center group relative">
										<div class="tategaki font-serif-jp text-[13px] tracking-[0.3em] leading-relaxed text-stone-800 h-fit">
											<span class="block text-center mb-1">一</span>
											<span>{menu.name}</span>
										</div>
										{#if menu.description}
											<div class="tategaki font-serif-jp text-[10px] tracking-[0.2em] text-stone-400 font-light mt-3 h-fit">
												{menu.description}
											</div>
										{/if}
										<button
											onclick={(e) => { e.stopPropagation(); onDeleteMenu(menu.id); }}
											class="mt-2 opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 transition-all"
											title="Delete"
										>
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								{/each}

								{#if course.menus.length === 0}
									<div class="flex items-center justify-center h-24">
										<span class="text-[10px] text-stone-200 font-serif-jp">—</span>
									</div>
								{/if}
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

			<!-- Sub-course area -->
			<div class="border-t border-stone-200 bg-stone-50/30 px-4 py-3 flex-shrink-0 relative" bind:this={subCourseEl}>
				<button
					onclick={(e) => { e.stopPropagation(); showSubCourseDropdown = !showSubCourseDropdown; showAddCourseDropdown = false; }}
					class="w-full h-full border border-dashed border-stone-200 rounded px-4 py-2 flex items-center justify-center gap-2 hover:bg-white hover:border-stone-300 transition-colors"
				>
					<span class="text-[8px] uppercase tracking-[0.25em] font-bold text-stone-300">Sub-course Preview</span>
					<span class="text-stone-400 text-xs">＋</span>
				</button>

				{#if showSubCourseDropdown}
					<div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-20 bg-white border border-stone-200 rounded-lg shadow-lg min-w-[200px] py-1">
						<p class="px-3 py-1.5 text-[8px] uppercase tracking-widest text-stone-400 font-bold border-b border-stone-100">Choose a course</p>
						{#each availableCourses as course}
							<button
								onclick={() => handleAddSubCourse(course.id)}
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

	.a4-paper {
		aspect-ratio: 297 / 210;
	}

	.course-scroll::-webkit-scrollbar {
		height: 3px;
	}
	.course-scroll::-webkit-scrollbar-track {
		background: transparent;
	}
	.course-scroll::-webkit-scrollbar-thumb {
		background: #e7e5e4;
		border-radius: 2px;
	}

	.custom-scroll::-webkit-scrollbar {
		width: 3px;
	}
	.custom-scroll::-webkit-scrollbar-thumb {
		background: #e7e5e4;
		border-radius: 2px;
	}
</style>

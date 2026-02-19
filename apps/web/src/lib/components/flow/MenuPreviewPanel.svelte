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
		displayTitle,
		courses,
		availableCourses,
		onUpdateDisplayTitle,
		onToggleCourse,
		onDeleteMenu,
		onClose,
	}: Props = $props();

	// Title input
	let titleInput = $state(displayTitle ?? '');

	// Sync when displayTitle prop changes (e.g. after save round-trip)
	$effect(() => {
		titleInput = displayTitle ?? '';
	});

	// Active course selection
	let activeCourseId: string | null = $state(null);

	// Dropdowns
	let showAddCourseDropdown = $state(false);
	let showSubCourseDropdown = $state(false);
	let addCourseEl: HTMLDivElement | undefined = $state(undefined);
	let subCourseEl: HTMLDivElement | undefined = $state(undefined);

	function handleWindowClick(e: MouseEvent) {
		if (showAddCourseDropdown && addCourseEl && !addCourseEl.contains(e.target as Node)) {
			showAddCourseDropdown = false;
		}
		if (showSubCourseDropdown && subCourseEl && !subCourseEl.contains(e.target as Node)) {
			showSubCourseDropdown = false;
		}
	}

	function handleTitleSubmit() {
		const trimmed = titleInput.trim();
		if (trimmed !== (displayTitle ?? '')) {
			onUpdateDisplayTitle(trimmed);
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
	<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;500;700&display=swap" rel="stylesheet" />
</svelte:head>

<svelte:window onclick={handleWindowClick} onkeydown={handleKeydown} />

<!-- Fullscreen overlay -->
<div class="fixed inset-0 bg-stone-100 z-[55] flex flex-col overflow-hidden">
	<!-- Header -->
	<header class="border-b border-stone-200 px-6 py-3 flex justify-between items-center bg-white flex-shrink-0">
		<div class="flex items-center gap-5">
			<div class="flex items-center gap-2">
				<div class="w-1 h-5 bg-primary"></div>
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
			<!-- Paper: course columns + input column -->
			<div class="flex-1 flex overflow-x-auto overflow-y-hidden course-scroll">
				{#each courses as course}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="flex-none w-48 border-r border-stone-100 flex flex-col transition-colors {activeCourseId === course.courseId ? 'bg-orange-50/30' : 'hover:bg-stone-50/30'}"
						onclick={() => { activeCourseId = course.courseId; }}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') activeCourseId = course.courseId; }}
						role="button"
						tabindex="0"
					>
						<!-- Course name -->
						<div class="px-4 py-5 flex flex-col items-center border-b border-stone-100 relative flex-shrink-0">
							{#if activeCourseId === course.courseId}
								<div class="absolute top-0 right-0 w-[1px] h-8 bg-primary"></div>
							{/if}
							<div class="tategaki-course text-xl h-28 flex items-center justify-center tracking-[0.35em]">
								{course.courseName}
							</div>
						</div>

						<!-- Menu items -->
						<div class="flex-1 px-3 py-4 overflow-y-auto custom-scroll flex gap-5 justify-center">
							{#each course.menus as menu}
								<div class="flex flex-col items-center group">
									<p class="tategaki-item text-[13px] font-medium leading-relaxed tracking-[0.25em] h-fit">{menu.name}</p>
									{#if menu.description}
										<p class="text-[8px] text-stone-400 mt-3 uppercase tracking-widest font-light tategaki-item">{menu.description}</p>
									{/if}
									<button
										onclick={(e) => { e.stopPropagation(); onDeleteMenu(menu.id); }}
										class="mt-1.5 opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 transition-all"
										title="Delete"
									>
										<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							{/each}

							{#if course.menus.length === 0}
								<div class="flex items-center justify-center h-full">
									<span class="text-[10px] text-stone-200">—</span>
								</div>
							{/if}
						</div>
					</div>
				{/each}

				<!-- Title column -->
				<div class="flex-none w-36 flex flex-col border-l border-dashed border-stone-200">
					<div class="flex-1 flex items-start justify-center px-3 py-6">
						<div class="tategaki-input-wrap">
							<input
								type="text"
								bind:value={titleInput}
								placeholder="御品書きタイトル"
								class="tategaki-input bg-transparent border-0 border-b border-stone-200 focus:border-orange-700 focus:ring-0 text-[15px] tracking-[0.25em] placeholder:text-stone-200 w-6 px-0 py-1"
								onkeydown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
								onblur={handleTitleSubmit}
							/>
						</div>
					</div>
				</div>

				{#if courses.length === 0}
					<div class="flex-1 flex flex-col items-center justify-center text-stone-300 gap-2 p-8">
						<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
						</svg>
						<span class="text-xs font-serif-jp">コースを追加してください</span>
					</div>
				{/if}
			</div>

			<!-- Sub-course area -->
			<div class="border-t border-stone-100 bg-stone-50/30 px-4 py-3 flex-shrink-0 relative" bind:this={subCourseEl}>
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
	.bg-primary {
		background-color: #C2410C;
	}

	.font-serif-jp {
		font-family: 'Noto Serif JP', 'YuMincho', 'Hiragino Mincho Pro', Georgia, serif;
	}

	.tategaki-course {
		writing-mode: vertical-rl;
		text-orientation: mixed;
		font-family: 'Noto Serif JP', 'YuMincho', 'Hiragino Mincho Pro', Georgia, serif;
	}

	.tategaki-item {
		writing-mode: vertical-rl;
		text-orientation: mixed;
		font-family: 'Noto Serif JP', 'YuMincho', 'Hiragino Mincho Pro', Georgia, serif;
	}

	.tategaki-input-wrap {
		writing-mode: vertical-rl;
		text-orientation: mixed;
	}

	.tategaki-input {
		writing-mode: vertical-rl;
		text-orientation: mixed;
		font-family: 'Noto Serif JP', 'YuMincho', 'Hiragino Mincho Pro', Georgia, serif;
	}

	.a4-paper {
		/* A4 landscape feel */
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

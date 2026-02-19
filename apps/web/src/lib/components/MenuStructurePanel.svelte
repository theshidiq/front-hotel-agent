<script lang="ts">
	import type { SeasonalMenu, MenuGroup, Menu, Product, CreateSeasonalMenuData, CreateMenuGroupData, UpdateMenuGroupData, UpdateSeasonalMenuData, CreateMenuData, UpdateMenuData, UpdateCategoryData } from '$lib/api';
	import MenuPreviewPanel from './flow/MenuPreviewPanel.svelte';
	import MenuFormSidebar from './flow/MenuFormSidebar.svelte';
	import CourseDetailSidebar from './flow/CourseDetailSidebar.svelte';

	interface Props {
		seasonalMenus: SeasonalMenu[];
		menuGroups: MenuGroup[];
		menuCategories: { value: string; label: string; id: string; image_url?: string | null; description?: string | null; price?: number | null }[];
		menus: Menu[];
		onCreateSeason: (data: CreateSeasonalMenuData) => Promise<void>;
		onUpdateSeason: (id: string, data: UpdateSeasonalMenuData) => Promise<void>;
		onDeleteSeason: (id: string) => Promise<void>;
		onCreateGroup: (data: CreateMenuGroupData) => Promise<void>;
		onUpdateGroup: (id: string, data: UpdateMenuGroupData) => Promise<void>;
		onDeleteGroup: (id: string) => Promise<void>;
		onCreateCourse: (name: string) => Promise<void>;
		onUpdateCourse: (id: string, name: string) => Promise<void>;
		onUpdateCourseDetails: (id: string, data: UpdateCategoryData) => Promise<void>;
		onDeleteCourse: (id: string) => Promise<void>;
		products: Product[];
		productAlternates: Record<string, string[]>;
		onAddAlternate: (productId: string, alternateProductId: string) => Promise<void>;
		onRemoveAlternate: (productId: string, alternateProductId: string) => Promise<void>;
		onCreateMenu: (data: CreateMenuData) => Promise<void>;
		onUpdateMenu: (id: string, data: UpdateMenuData) => Promise<void>;
		onDeleteMenu: (id: string) => Promise<void>;
		onSwitchToTree: () => void;
		onClose: () => void;
	}

	let {
		seasonalMenus,
		menuGroups,
		menuCategories,
		menus,
		onCreateSeason,
		onUpdateSeason,
		onDeleteSeason,
		onCreateGroup,
		onUpdateGroup,
		onDeleteGroup,
		onCreateCourse,
		onUpdateCourse,
		onUpdateCourseDetails,
		onDeleteCourse,
		products,
		productAlternates,
		onAddAlternate,
		onRemoveAlternate,
		onCreateMenu,
		onUpdateMenu,
		onDeleteMenu,
		onSwitchToTree,
		onClose,
	}: Props = $props();

	// --- State ---

	// Accordion: which seasons are expanded (all expanded by default)
	let expandedSeasons: Set<string> = $state(new Set(seasonalMenus.map(s => s.id)));

	// Keep expanded set in sync when new seasons are added
	$effect(() => {
		for (const s of seasonalMenus) {
			if (!expandedSeasons.has(s.id)) {
				expandedSeasons = new Set([...expandedSeasons, s.id]);
			}
		}
	});

	// Course toggle dropdown
	let courseToggleGroupId: string | null = $state(null);

	// Active group for preview panel
	let activeGroupId: string | null = $state(null);

	// Menu sidebar
	let sidebarContext: { groupId: string; courseValue: string; courseName: string; seasonalMenuId?: string | null } | null = $state(null);

	// Course detail sidebar
	let detailContext: { courseId: string; groupId: string; courseValue: string; courseName: string } | null = $state(null);

	// Inline editing
	let editingSeasonId: string | null = $state(null);
	let editSeasonName = $state('');
	let editSeasonStartDate = $state('');
	let editSeasonEndDate = $state('');
	let editingGroupId: string | null = $state(null);
	let editGroupName = $state('');

	// Add season form
	let showAddSeason = $state(false);
	let newSeasonName = $state('');
	let newSeasonStartDate = $state('');
	let newSeasonEndDate = $state('');
	let isSubmitting = $state(false);

	// Add course
	let showAddCourse = $state(false);
	let newCourseName = $state('');
	let isAddingCourse = $state(false);
	let addCourseError = $state('');

	// Toast
	let toast: { message: string; timeout: ReturnType<typeof setTimeout> } | null = $state(null);

	function showToast(message: string) {
		if (toast) clearTimeout(toast.timeout);
		const timeout = setTimeout(() => { toast = null; }, 2000);
		toast = { message, timeout };
	}

	// Inline delete confirmation
	let confirmDeleteId: string | null = $state(null);
	let confirmDeleteType: 'season' | 'group' | 'course' | null = $state(null);
	let confirmDeleteTimeout: ReturnType<typeof setTimeout> | null = $state(null);

	function requestDelete(id: string, type: 'season' | 'group' | 'course') {
		if (confirmDeleteTimeout) clearTimeout(confirmDeleteTimeout);
		confirmDeleteId = id;
		confirmDeleteType = type;
		confirmDeleteTimeout = setTimeout(() => { confirmDeleteId = null; confirmDeleteType = null; }, 3000);
	}

	function confirmDelete() {
		if (!confirmDeleteId || !confirmDeleteType) return;
		if (confirmDeleteTimeout) clearTimeout(confirmDeleteTimeout);
		const id = confirmDeleteId;
		const type = confirmDeleteType;
		confirmDeleteId = null;
		confirmDeleteType = null;
		if (type === 'season') { onDeleteSeason(id); showToast('Season deleted'); }
		else if (type === 'group') { onDeleteGroup(id); showToast('Group deleted'); }
		else if (type === 'course') { onDeleteCourse(id); showToast('Course deleted'); }
	}

	function cancelDelete() {
		if (confirmDeleteTimeout) clearTimeout(confirmDeleteTimeout);
		confirmDeleteId = null;
		confirmDeleteType = null;
	}

	// --- Derived ---

	const courseNameMap = $derived.by(() => {
		const map = new Map<string, string>();
		for (const c of menuCategories) map.set(c.id, c.label);
		return map;
	});

	function getCourseName(courseId: string, fallback: string): string {
		return courseNameMap.get(courseId) ?? fallback;
	}

	const menuCountMap = $derived.by(() => {
		const map = new Map<string, number>();
		for (const menu of menus) {
			if (menu.menu_group_id && menu.category) {
				const key = `${menu.menu_group_id}_${menu.category}`;
				map.set(key, (map.get(key) || 0) + 1);
			}
		}
		return map;
	});

	function getMenuCount(groupId: string, courseValue: string): number {
		return menuCountMap.get(`${groupId}_${courseValue}`) || 0;
	}

	const unassignedGroups = $derived(menuGroups.filter(g => !g.seasonal_menu_id));

	// Active group data for preview
	const activeGroup = $derived(menuGroups.find(g => g.id === activeGroupId) ?? null);

	const activeGroupCourses = $derived.by(() => {
		if (!activeGroup) return [];
		return (activeGroup.allowed_courses || []).map(ac => ({
			courseId: ac.category_id,
			courseName: getCourseName(ac.category_id, ac.category_name),
			courseValue: ac.category_value,
			menus: menus
				.filter(m => m.menu_group_id === activeGroup.id && m.category === ac.category_value)
				.map(m => ({ id: m.id, name: m.name, price: m.price, description: m.description })),
		}));
	});

	const activeGroupSeasonName = $derived(
		activeGroup?.seasonal_menu_id
			? seasonalMenus.find(s => s.id === activeGroup.seasonal_menu_id)?.name ?? null
			: null
	);

	const activeGroupAvailableCourses = $derived.by(() => {
		if (!activeGroup) return [];
		const assignedIds = new Set(activeGroup.allowed_courses.map(c => c.category_id));
		return menuCategories.filter(c => !assignedIds.has(c.id));
	});

	// Detail sidebar derived
	const detailMenus = $derived(
		detailContext
			? menus.filter(m => m.menu_group_id === detailContext!.groupId && m.category === detailContext!.courseValue)
			: []
	);
	const detailCategory = $derived(
		detailContext ? menuCategories.find(c => c.id === detailContext!.courseId) : null
	);

	// --- Handlers ---

	function toggleSeason(id: string) {
		const next = new Set(expandedSeasons);
		if (next.has(id)) next.delete(id); else next.add(id);
		expandedSeasons = next;
	}

	async function submitSeason() {
		if (!newSeasonName.trim() || isSubmitting) return;
		isSubmitting = true;
		try {
			await onCreateSeason({
				name: newSeasonName.trim(),
				start_date: newSeasonStartDate || undefined,
				end_date: newSeasonEndDate || undefined,
			});
			showAddSeason = false;
			newSeasonName = '';
			newSeasonStartDate = '';
			newSeasonEndDate = '';
		} finally {
			isSubmitting = false;
		}
	}

	function startEditSeason(s: SeasonalMenu) {
		editingSeasonId = s.id;
		editSeasonName = s.name;
		editSeasonStartDate = s.start_date ?? '';
		editSeasonEndDate = s.end_date ?? '';
	}

	function submitEditSeason(id: string) {
		const season = seasonalMenus.find(s => s.id === id);
		if (!season) { editingSeasonId = null; return; }
		const trimmedName = editSeasonName.trim();
		const updates: Record<string, string | undefined> = {};
		if (trimmedName && trimmedName !== season.name) updates.name = trimmedName;
		if (editSeasonStartDate !== (season.start_date ?? '')) updates.start_date = editSeasonStartDate || undefined;
		if (editSeasonEndDate !== (season.end_date ?? '')) updates.end_date = editSeasonEndDate || undefined;
		if (Object.keys(updates).length > 0) onUpdateSeason(id, updates);
		editingSeasonId = null;
	}

	async function handleAddGroup(seasonId: string) {
		if (isSubmitting) return;
		isSubmitting = true;
		try {
			await onCreateGroup({ name: 'New Group', seasonal_menu_id: seasonId || undefined });
		} finally {
			isSubmitting = false;
		}
	}

	function startEditGroup(g: MenuGroup) {
		editingGroupId = g.id;
		editGroupName = g.name;
	}

	function submitEditGroup(id: string) {
		const trimmed = editGroupName.trim();
		if (trimmed && trimmed !== menuGroups.find(g => g.id === id)?.name) {
			onUpdateGroup(id, { name: trimmed });
		}
		editingGroupId = null;
	}

	async function handleToggleCourse(groupId: string, courseId: string) {
		const group = menuGroups.find(g => g.id === groupId);
		if (!group) return;
		const currentIds = group.allowed_courses.map(c => c.category_id);
		const newIds = currentIds.includes(courseId)
			? currentIds.filter(id => id !== courseId)
			: [...currentIds, courseId];
		await onUpdateGroup(groupId, { course_ids: newIds });
	}

	function handleOpenCourseDetail(courseId: string, groupId: string, courseValue: string, courseName: string) {
		detailContext = { courseId, groupId, courseValue, courseName };
	}

	function handleDeleteMenuFromTree(menuId: string) {
		const menu = menus.find(m => m.id === menuId);
		onDeleteMenu(menuId);
		showToast(`${menu?.name ?? 'Menu item'} deleted`);
	}

	async function handleCreateMenuFromSidebar(data: CreateMenuData) {
		await onCreateMenu(data);
		sidebarContext = null;
	}

	async function submitNewCourse() {
		if (!newCourseName.trim() || isAddingCourse) return;
		isAddingCourse = true;
		addCourseError = '';
		try {
			await onCreateCourse(newCourseName.trim());
			newCourseName = '';
			showAddCourse = false;
		} catch (err: unknown) {
			addCourseError = err instanceof Error ? err.message : 'Failed to add course';
		} finally {
			isAddingCourse = false;
		}
	}

	function handleWindowClick(e: MouseEvent) {
		if (!editingSeasonId && !editingGroupId) return;
		const target = e.target as HTMLElement;
		if (target.closest('[data-edit-form]')) return;
		if (editingSeasonId) submitEditSeason(editingSeasonId);
		if (editingGroupId) submitEditGroup(editingGroupId);
	}
</script>

<svelte:window onclick={handleWindowClick} />

<!-- Full-screen overlay -->
<div class="fixed inset-0 bg-gray-50 z-50 flex flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
		<div>
			<h2 class="text-xl font-bold text-gray-900">Menu Structure</h2>
			<p class="text-sm text-gray-500">Organize seasonal menus, groups, and courses</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				onclick={onSwitchToTree}
				class="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
				title="Switch to tree view"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
				</svg>
				Tree View
			</button>
			<button
				onclick={onClose}
				aria-label="Close"
				class="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Content (scrollable) -->
	<div class="flex-1 overflow-y-auto px-6 py-5">
		<div class="max-w-4xl mx-auto space-y-4">

			<!-- Add Seasonal Menu button -->
			{#if !showAddSeason}
				<button
					onclick={() => { showAddSeason = true; }}
					class="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-green-300 text-green-700 rounded-xl hover:bg-green-50 hover:border-green-400 transition-colors text-sm font-medium"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Add Seasonal Menu
				</button>
			{:else}
				<div class="bg-white border-2 border-green-300 rounded-xl p-4 space-y-3">
					<h3 class="text-sm font-semibold text-green-800">New Seasonal Menu</h3>
					<input
						type="text"
						bind:value={newSeasonName}
						placeholder="Season name (e.g., Summer 2025)"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400"
						onkeydown={(e) => e.key === 'Enter' && submitSeason()}
					/>
					<div class="flex gap-2">
						<input type="date" bind:value={newSeasonStartDate} class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
						<input type="date" bind:value={newSeasonEndDate} class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
					</div>
					<div class="flex gap-2">
						<button onclick={submitSeason} disabled={isSubmitting || !newSeasonName.trim()} class="flex-1 bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50">
							{isSubmitting ? 'Adding...' : 'Add Season'}
						</button>
						<button onclick={() => { showAddSeason = false; }} class="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
					</div>
				</div>
			{/if}

			<!-- Seasonal Menus -->
			{#each seasonalMenus as season}
				{@const groups = menuGroups.filter(g => g.seasonal_menu_id === season.id)}
				<div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
					<!-- Season header (clickable accordion) -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						onclick={() => toggleSeason(season.id)}
						class="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left cursor-pointer"
					>
						<svg class="w-4 h-4 text-gray-400 transition-transform {expandedSeasons.has(season.id) ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
						<div class="w-2 h-8 bg-green-500 rounded-full flex-shrink-0"></div>
						<div class="flex-1 min-w-0">
							{#if editingSeasonId === season.id}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div class="flex flex-wrap items-center gap-2" onclick={(e) => e.stopPropagation()} data-edit-form>
									<input
										type="text"
										bind:value={editSeasonName}
										class="font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 text-sm w-48 focus:ring-2 focus:ring-green-400"
										onkeydown={(e) => { if (e.key === 'Enter') submitEditSeason(season.id); if (e.key === 'Escape') { editingSeasonId = null; } }}
										autofocus
									/>
									<input
										type="date"
										bind:value={editSeasonStartDate}
										class="bg-white border border-gray-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-green-400"
									/>
									<span class="text-xs text-gray-400">~</span>
									<input
										type="date"
										bind:value={editSeasonEndDate}
										class="bg-white border border-gray-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-green-400"
									/>
									<button onclick={() => submitEditSeason(season.id)} class="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">Save</button>
									<button onclick={() => { editingSeasonId = null; }} class="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
								</div>
							{:else}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<span
									class="font-semibold text-gray-900 cursor-pointer hover:underline hover:text-green-700"
									ondblclick={(e) => { e.stopPropagation(); startEditSeason(season); }}
									title="Double-click to edit"
								>{season.name}</span>
							{/if}
							{#if !(editingSeasonId === season.id) && (season.start_date || season.end_date)}
								<span class="text-xs text-gray-400 ml-2">{season.start_date ?? '?'} ~ {season.end_date ?? '?'}</span>
							{/if}
						</div>
						<span class="text-xs text-gray-400">{groups.length} group{groups.length !== 1 ? 's' : ''}</span>
						<div class="flex items-center gap-1">
							<button onclick={(e) => { e.stopPropagation(); startEditSeason(season); }} class="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors" title="Rename">
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
							</button>
							<button onclick={(e) => { e.stopPropagation(); handleAddGroup(season.id); }} class="p-1.5 rounded-lg hover:bg-green-100 text-green-500 hover:text-green-700 transition-colors" title="Add group">
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
							</button>
							{#if confirmDeleteId === season.id && confirmDeleteType === 'season'}
								<span class="text-xs text-red-600 font-medium ml-1">削除?</span>
								<button onclick={(e) => { e.stopPropagation(); confirmDelete(); }} class="text-red-500 hover:text-red-700 text-xs font-bold">Yes</button>
								<button onclick={(e) => { e.stopPropagation(); cancelDelete(); }} class="text-gray-400 hover:text-gray-600 text-xs">No</button>
							{:else}
								<button onclick={(e) => { e.stopPropagation(); requestDelete(season.id, 'season'); }} class="p-1.5 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors" title="Delete season">
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
								</button>
							{/if}
						</div>
					</div>

					<!-- Groups (expanded) -->
					{#if expandedSeasons.has(season.id)}
						<div class="border-t border-gray-100 px-5 py-3 space-y-3 bg-gray-50/50">
							{#each groups as group}
								{@const courseCount = group.allowed_courses?.length || 0}
								<div class="bg-white rounded-lg border border-gray-200 p-4">
									<!-- Group header -->
									<div class="flex items-center gap-3 mb-3">
										<div class="w-1.5 h-6 bg-indigo-500 rounded-full flex-shrink-0"></div>
										{#if editingGroupId === group.id}
											<!-- svelte-ignore a11y_no_static_element_interactions -->
											<div class="flex items-center gap-2" data-edit-form onclick={(e) => e.stopPropagation()}>
												<input
													type="text"
													bind:value={editGroupName}
													class="font-medium text-gray-900 bg-white border border-indigo-300 rounded px-2 py-1 text-sm w-40 focus:ring-2 focus:ring-indigo-400"
													onkeydown={(e) => { if (e.key === 'Enter') submitEditGroup(group.id); if (e.key === 'Escape') editingGroupId = null; }}
													autofocus
												/>
												<button onclick={() => submitEditGroup(group.id)} class="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">Save</button>
												<button onclick={() => { editingGroupId = null; }} class="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
											</div>
										{:else}
											<!-- svelte-ignore a11y_no_static_element_interactions -->
											<span
												class="font-medium text-gray-900 text-sm cursor-pointer hover:underline hover:text-indigo-700"
												ondblclick={() => startEditGroup(group)}
												title="Double-click to edit"
											>{group.name}</span>
										{/if}
										<span class="text-xs text-gray-400">{courseCount} course{courseCount !== 1 ? 's' : ''}</span>
										<div class="ml-auto flex items-center gap-1">
											<button onclick={() => { activeGroupId = group.id; }} class="flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-md text-xs font-medium hover:bg-orange-100 transition-colors" title="Preview お品書き">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
												Preview
											</button>
											<button onclick={() => { courseToggleGroupId = courseToggleGroupId === group.id ? null : group.id; }} class="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100 transition-colors" title="Manage courses">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
												Courses
											</button>
											<button onclick={() => startEditGroup(group)} class="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Rename">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
											</button>
											{#if confirmDeleteId === group.id && confirmDeleteType === 'group'}
												<span class="text-xs text-red-600 font-medium">削除?</span>
												<button onclick={() => confirmDelete()} class="text-red-500 hover:text-red-700 text-xs font-bold">Yes</button>
												<button onclick={() => cancelDelete()} class="text-gray-400 hover:text-gray-600 text-xs">No</button>
											{:else}
												<button onclick={() => requestDelete(group.id, 'group')} class="p-1.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors" title="Delete group">
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
												</button>
											{/if}
										</div>
									</div>

									<!-- Course toggle dropdown -->
									{#if courseToggleGroupId === group.id}
										<div class="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
											<p class="text-xs font-medium text-blue-800 mb-2">Toggle courses for this group:</p>
											<div class="flex flex-wrap gap-1.5">
												{#each menuCategories as course}
													{@const isAssigned = group.allowed_courses.some(c => c.category_id === course.id)}
													<button
														onclick={() => handleToggleCourse(group.id, course.id)}
														class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors {isAssigned ? 'bg-blue-600 text-white' : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-100'}"
													>
														{course.label}
													</button>
												{/each}
											</div>
										</div>
									{/if}

									<!-- Course chips -->
									{#if courseCount > 0}
										<div class="flex flex-wrap gap-2">
											{#each group.allowed_courses as ac}
												{@const count = getMenuCount(group.id, ac.category_value)}
												<button
													onclick={() => handleOpenCourseDetail(ac.category_id, group.id, ac.category_value, getCourseName(ac.category_id, ac.category_name))}
													class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors hover:shadow-sm {count > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}"
												>
													<span class="font-medium">{getCourseName(ac.category_id, ac.category_name)}</span>
													<span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold {count > 0 ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-500'}">{count}</span>
												</button>
											{/each}
										</div>
									{:else}
										<p class="text-xs text-gray-400">No courses assigned — click <strong>Courses</strong> to add</p>
									{/if}
								</div>
							{/each}

							{#if groups.length === 0}
								<p class="text-sm text-gray-400 text-center py-4">No groups yet. Click <strong>+</strong> on the season header to add one.</p>
							{/if}
						</div>
					{/if}
				</div>
			{/each}

			<!-- Unassigned groups -->
			{#if unassignedGroups.length > 0}
				<div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
					<div class="px-5 py-4 flex items-center gap-3 border-b border-gray-100">
						<div class="w-2 h-8 bg-gray-400 rounded-full flex-shrink-0"></div>
						<span class="font-semibold text-gray-700">Unassigned Groups</span>
						<span class="text-xs text-gray-400">{unassignedGroups.length}</span>
					</div>
					<div class="px-5 py-3 space-y-3 bg-gray-50/50">
						{#each unassignedGroups as group}
							{@const courseCount = group.allowed_courses?.length || 0}
							<div class="bg-white rounded-lg border border-gray-200 p-4">
								<div class="flex items-center gap-3 mb-3">
									<div class="w-1.5 h-6 bg-gray-400 rounded-full flex-shrink-0"></div>
									{#if editingGroupId === group.id}
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<div class="flex items-center gap-2" data-edit-form onclick={(e) => e.stopPropagation()}>
											<input
												type="text"
												bind:value={editGroupName}
												class="font-medium text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 text-sm w-40 focus:ring-2 focus:ring-indigo-400"
												onkeydown={(e) => { if (e.key === 'Enter') submitEditGroup(group.id); if (e.key === 'Escape') editingGroupId = null; }}
												autofocus
											/>
											<button onclick={() => submitEditGroup(group.id)} class="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">Save</button>
											<button onclick={() => { editingGroupId = null; }} class="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
										</div>
									{:else}
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<span
											class="font-medium text-gray-900 text-sm cursor-pointer hover:underline hover:text-indigo-700"
											ondblclick={() => startEditGroup(group)}
											title="Double-click to edit"
										>{group.name}</span>
									{/if}
									<span class="text-xs text-gray-400">{courseCount} course{courseCount !== 1 ? 's' : ''}</span>
									<div class="ml-auto flex items-center gap-1">
										<button onclick={() => { activeGroupId = group.id; }} class="flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-md text-xs font-medium hover:bg-orange-100 transition-colors">
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
											Preview
										</button>
										<button onclick={() => { courseToggleGroupId = courseToggleGroupId === group.id ? null : group.id; }} class="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100 transition-colors">
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
											Courses
										</button>
										<button onclick={() => startEditGroup(group)} class="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Rename">
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
										</button>
										{#if confirmDeleteId === group.id && confirmDeleteType === 'group'}
											<span class="text-xs text-red-600 font-medium">削除?</span>
											<button onclick={() => confirmDelete()} class="text-red-500 hover:text-red-700 text-xs font-bold">Yes</button>
											<button onclick={() => cancelDelete()} class="text-gray-400 hover:text-gray-600 text-xs">No</button>
										{:else}
											<button onclick={() => requestDelete(group.id, 'group')} class="p-1.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors" title="Delete group">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
											</button>
										{/if}
									</div>
								</div>

								{#if courseToggleGroupId === group.id}
									<div class="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
										<p class="text-xs font-medium text-blue-800 mb-2">Toggle courses for this group:</p>
										<div class="flex flex-wrap gap-1.5">
											{#each menuCategories as course}
												{@const isAssigned = group.allowed_courses.some(c => c.category_id === course.id)}
												<button
													onclick={() => handleToggleCourse(group.id, course.id)}
													class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors {isAssigned ? 'bg-blue-600 text-white' : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-100'}"
												>
													{course.label}
												</button>
											{/each}
										</div>
									</div>
								{/if}

								{#if courseCount > 0}
									<div class="flex flex-wrap gap-2">
										{#each group.allowed_courses as ac}
											{@const count = getMenuCount(group.id, ac.category_value)}
											<button
												onclick={() => handleOpenCourseDetail(ac.category_id, group.id, ac.category_value, getCourseName(ac.category_id, ac.category_name))}
												class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors hover:shadow-sm {count > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}"
											>
												<span class="font-medium">{getCourseName(ac.category_id, ac.category_name)}</span>
												<span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold {count > 0 ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-500'}">{count}</span>
											</button>
										{/each}
									</div>
								{:else}
									<p class="text-xs text-gray-400">No courses assigned — click <strong>Courses</strong> to add</p>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Available Courses footer -->
	<div class="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0">
		<div class="max-w-4xl mx-auto">
			<div class="flex items-center justify-between mb-2">
				<div>
					<h3 class="text-sm font-semibold text-gray-900">Available Courses</h3>
					<p class="text-xs text-gray-500">Courses available for assignment to menu groups</p>
				</div>
				<button onclick={() => { showAddCourse = !showAddCourse; newCourseName = ''; addCourseError = ''; }} class="text-sm text-blue-600 hover:text-blue-800 font-medium">
					{showAddCourse ? 'Cancel' : '+ Add Course'}
				</button>
			</div>

			{#if showAddCourse}
				<div class="flex gap-2 mb-3">
					<input type="text" bind:value={newCourseName} placeholder="Course name (e.g., Appetizer)" class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400" onkeydown={(e) => e.key === 'Enter' && submitNewCourse()} />
					<button onclick={submitNewCourse} disabled={isAddingCourse || !newCourseName.trim()} class="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
						{isAddingCourse ? 'Adding...' : 'Add'}
					</button>
				</div>
				{#if addCourseError}
					<p class="text-xs text-red-500 mb-2">{addCourseError}</p>
				{/if}
			{/if}

			<div class="flex flex-wrap gap-2">
				{#each menuCategories as course}
					{#if confirmDeleteId === course.id && confirmDeleteType === 'course'}
						<div class="flex items-center gap-1.5 bg-red-50 border border-red-300 rounded-full px-3 py-1 animate-pulse">
							<span class="text-sm text-red-700">削除?</span>
							<button onclick={() => confirmDelete()} class="text-red-500 hover:text-red-700 font-bold text-xs">Yes</button>
							<span class="text-red-200">|</span>
							<button onclick={() => cancelDelete()} class="text-gray-400 hover:text-gray-600 text-xs">No</button>
						</div>
					{:else}
						<div class="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
							<span class="text-sm text-blue-800">{course.label}</span>
							<button onclick={() => requestDelete(course.id, 'course')} class="text-blue-400 hover:text-red-500 transition-colors" title="Delete course">
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
							</button>
						</div>
					{/if}
				{/each}
				{#if menuCategories.length === 0}
					<p class="text-sm text-gray-400">No courses defined yet. Add one above.</p>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Menu Preview Panel -->
{#if activeGroup}
	<MenuPreviewPanel
		groupId={activeGroup.id}
		groupName={activeGroup.name}
		seasonName={activeGroupSeasonName}
		displayTitle={activeGroup.display_title ?? null}
		courses={activeGroupCourses}
		availableCourses={activeGroupAvailableCourses}
		onUpdateDisplayTitle={(title) => { onUpdateGroup(activeGroup!.id, { display_title: title }); }}
		onToggleCourse={handleToggleCourse}
		onDeleteMenu={handleDeleteMenuFromTree}
		onClose={() => { activeGroupId = null; }}
	/>
{/if}

<!-- Menu Form Sidebar -->
{#if sidebarContext}
	<MenuFormSidebar
		context={sidebarContext}
		{products}
		onSubmit={handleCreateMenuFromSidebar}
		onClose={() => { sidebarContext = null; }}
	/>
{/if}

<!-- Course Detail Sidebar -->
{#if detailContext}
	<CourseDetailSidebar
		courseId={detailContext.courseId}
		courseName={detailContext.courseName}
		courseCategory={detailCategory}
		menus={detailMenus}
		{products}
		{productAlternates}
		{onAddAlternate}
		{onRemoveAlternate}
		groupId={detailContext.groupId}
		seasonalMenuId={menuGroups.find(g => g.id === detailContext?.groupId)?.seasonal_menu_id}
		onUpdateCourseDetails={(id, data) => onUpdateCourseDetails(id, data)}
		onRenameCourse={(id, name) => onUpdateCourse(id, name)}
		onCreateMenu={handleCreateMenuFromSidebar}
		onDeleteMenu={(id) => { onDeleteMenu(id); showToast('Menu item deleted'); }}
		onClose={() => { detailContext = null; }}
	/>
{/if}

<!-- Toast -->
{#if toast}
	<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
		{toast.message}
	</div>
{/if}

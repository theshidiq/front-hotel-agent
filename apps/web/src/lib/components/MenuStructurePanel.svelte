<script lang="ts">
	import type { SeasonalMenu, MenuGroup, Menu, Product, CreateSeasonalMenuData, CreateMenuGroupData, UpdateMenuGroupData, UpdateSeasonalMenuData, CreateMenuData, UpdateMenuData, UpdateCategoryData } from '$lib/api';
	import MenuPreviewPanel from './flow/MenuPreviewPanel.svelte';
	import MenuFormSidebar from './flow/MenuFormSidebar.svelte';
	import CourseDetailSidebar from './flow/CourseDetailSidebar.svelte';
	import MenuScanModal from './MenuScanModal.svelte';

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
		onClose: () => void;
		autoOpenScan?: boolean;
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
		onClose,
		autoOpenScan = false,
	}: Props = $props();

	// --- State ---

	let showScanModal = $state(autoOpenScan);

	// Open scan modal when the autoOpenScan flag flips to true (e.g. user clicks the sidebar shortcut)
	$effect(() => {
		if (autoOpenScan) showScanModal = true;
	});

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

	// Kids link dropdown
	let kidsLinkGroupId: string | null = $state(null);

	// Stay period dropdown
	let stayDropdownGroupId: string | null = $state(null);

	// Active group for preview panel
	let activeGroupId: string | null = $state(null);

	// Active kids group for preview (default to first linked kids group, or null)
	let activeKidsGroupId: string | null = $state(null);

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
	let showCoursesDropdown = $state(false);
	let showAddCourse = $state(false);
	let newCourseName = $state('');
	let isAddingCourse = $state(false);
	let addCourseError = $state('');

	// Rename course
	let renamingCourseId: string | null = $state(null);
	let renameCourseValue = $state('');

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

	// Link maps: parent→kids (array) and kids→parent
	const kidsGroupsMap = $derived.by(() => {
		const map = new Map<string, Array<{ id: string; name: string }>>();
		for (const g of menuGroups) {
			if (g.kids_group_ids && g.kids_group_ids.length > 0) {
				const kids = g.kids_group_ids
					.map(id => menuGroups.find(k => k.id === id))
					.filter(k => k !== undefined)
					.map(k => ({ id: k!.id, name: k!.name }));
				if (kids.length > 0) map.set(g.id, kids);
			}
		}
		return map;
	});

	const parentGroupNameMap = $derived.by(() => {
		const map = new Map<string, { id: string; name: string }>();
		for (const g of menuGroups) {
			if (g.kids_group_ids && g.kids_group_ids.length > 0) {
				for (const kidsId of g.kids_group_ids) {
					map.set(kidsId, { id: g.id, name: g.name });
				}
			}
		}
		return map;
	});

	// For a kids group, get parent group's menu count for a shared course
	function getLinkedMenuCount(groupId: string, courseValue: string): number {
		const parent = parentGroupNameMap.get(groupId);
		if (!parent) return 0;
		return menuCountMap.get(`${parent.id}_${courseValue}`) || 0;
	}

	const unassignedGroups = $derived(menuGroups.filter(g => !g.seasonal_menu_id));

	// Build grouped structure: parent groups with their linked kids nested underneath
	// Kids groups that are linked to a parent are hidden from the top-level list
	interface GroupCluster {
		parent: MenuGroup;
		children: MenuGroup[]; // linked kids groups
	}

	function buildGroupClusters(groups: MenuGroup[]): GroupCluster[] {
		// Find all group IDs that are kids (linked to by some parent)
		const kidsIds = new Set<string>();
		for (const g of groups) {
			if (g.kids_group_ids && g.kids_group_ids.length > 0) {
				for (const kidId of g.kids_group_ids) {
					const kid = groups.find(k => k.id === kidId);
					if (kid) kidsIds.add(kid.id);
				}
			}
		}

		// Top-level = groups that are NOT kids of another group in this list
		const clusters: GroupCluster[] = [];
		for (const g of groups) {
			if (kidsIds.has(g.id)) continue; // skip, will be nested under parent
			const children: MenuGroup[] = [];
			if (g.kids_group_ids && g.kids_group_ids.length > 0) {
				for (const kidId of g.kids_group_ids) {
					const kid = groups.find(k => k.id === kidId);
					if (kid) children.push(kid);
				}
			}
			clusters.push({ parent: g, children });
		}

		// Also add any orphaned kids (kids whose parent isn't in this group list)
		for (const g of groups) {
			if (kidsIds.has(g.id)) {
				const hasParentInList = groups.some(p => p.kids_group_ids?.includes(g.id));
				if (!hasParentInList) {
					clusters.push({ parent: g, children: [] });
				}
			}
		}

		return clusters;
	}

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

	// Kids groups derived — show all linked kids groups for the active group
	const activeKidsGroups = $derived.by(() => {
		if (!activeGroup?.kids_group_ids || activeGroup.kids_group_ids.length === 0) return [];
		return activeGroup.kids_group_ids
			.map(id => menuGroups.find(g => g.id === id))
			.filter(g => g !== undefined) as MenuGroup[];
	});

	// Auto-select first kids group when active group changes, or use the currently selected one
	$effect(() => {
		if (activeGroup && activeKidsGroups.length > 0) {
			// If currently selected kids group is not in the new active group's kids list, reset to first
			if (!activeKidsGroupId || !activeGroup.kids_group_ids?.includes(activeKidsGroupId)) {
				// Default to first kids group (e.g., "子供 A CK70")
				activeKidsGroupId = activeKidsGroups[0].id;
			}
		} else {
			activeKidsGroupId = null;
		}
	});

	// Active kids group for preview — show the selected kids group's courses
	const activeKidsGroup = $derived.by(() => {
		if (!activeGroup || !activeKidsGroupId) return null;
		const kg = menuGroups.find(g => g.id === activeKidsGroupId);
		if (!kg) return null;
		// Show kids group's courses that also exist in the main group
		const mainCourseIds = new Set(activeGroup.allowed_courses.map(c => c.category_id));
		const sharedCourseNames = kg.allowed_courses
			.filter(c => mainCourseIds.has(c.category_id))
			.map(c => c.category_name);
		return {
			id: kg.id,
			name: kg.name,
			courseNames: sharedCourseNames,
		};
	});

	const activeLinkableGroups = $derived.by(() => {
		if (!activeGroup || !activeGroup.kids_group_ids || activeGroup.kids_group_ids.length === 0) return [];
		// Only show the linked kids groups in the preview selector
		return activeGroup.kids_group_ids
			.map(id => menuGroups.find(g => g.id === id))
			.filter(g => g !== undefined)
			.map(g => ({ id: g!.id, name: g!.name }));
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
		const beforeCount = menuGroups.length;
		try {
			await onCreateGroup({ name: 'New Group', seasonal_menu_id: seasonId || undefined });
			// Wait a tick for the menuGroups prop to update
			await new Promise(resolve => setTimeout(resolve, 0));
			// Find the newly created group (should be the new one)
			if (menuGroups.length > beforeCount) {
				const newGroup = menuGroups.find((g, idx) => idx >= beforeCount);
				if (newGroup) {
					editingGroupId = newGroup.id;
					editGroupName = ''; // Start with empty string so placeholder shows
				}
			}
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
		const currentGroup = menuGroups.find(g => g.id === id);

		// If empty, keep the current name or use "New Group" as fallback
		const finalName = trimmed || currentGroup?.name || 'New Group';

		if (finalName !== currentGroup?.name) {
			onUpdateGroup(id, { name: finalName });
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

	async function handleReorderCourses(groupId: string, courseIds: string[]) {
		await onUpdateGroup(groupId, { course_ids: courseIds });
	}

	function handleToggleKidsLink(groupId: string, kidsGroupId: string) {
		const group = menuGroups.find(g => g.id === groupId);
		if (!group) return;
		const currentIds = group.kids_group_ids || [];
		const newIds = currentIds.includes(kidsGroupId)
			? currentIds.filter(id => id !== kidsGroupId)
			: [...currentIds, kidsGroupId];
		onUpdateGroup(groupId, { kids_group_ids: newIds });
		showToast(currentIds.includes(kidsGroupId) ? 'Kids group unlinked' : 'Kids group linked');
	}

	function handleStayPeriodChange(groupId: string, value: string) {
		if (value === '') {
			// No restriction
			onUpdateGroup(groupId, { stay_period_nights: null });
			showToast('Stay period: Any duration');
		} else if (value === '1') {
			onUpdateGroup(groupId, { stay_period_nights: [1] });
			showToast('Stay period: 1 night');
		} else if (value === '2') {
			onUpdateGroup(groupId, { stay_period_nights: [2] });
			showToast('Stay period: 2 nights');
		} else if (value === '3+') {
			onUpdateGroup(groupId, { stay_period_nights: [3, 4, 5, 6, 7] });
			showToast('Stay period: 3+ nights');
		}
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

	function startRenameCourse(course: { id: string; label: string }) {
		renamingCourseId = course.id;
		renameCourseValue = course.label;
	}

	function submitRenameCourse(id: string) {
		const trimmed = renameCourseValue.trim();
		const current = menuCategories.find(c => c.id === id);
		if (trimmed && current && trimmed !== current.label) {
			onUpdateCourse(id, trimmed);
		}
		renamingCourseId = null;
	}

	// Action to focus input element
	function focusInput(node: HTMLInputElement) {
		// Use requestAnimationFrame to ensure DOM is ready
		requestAnimationFrame(() => {
			node.focus();
			node.select(); // Select all text if any exists
		});
	}

	function handleWindowClick(e: MouseEvent) {
		const target = e.target as HTMLElement;

		// Close course editor when clicking outside it
		if (detailContext && !target.closest('[data-course-editor]') && !target.closest('[data-course-chip]')) {
			detailContext = null;
		}

		// Close courses dropdown when clicking outside it
		if (showCoursesDropdown && !target.closest('[data-courses-dropdown]')) {
			showCoursesDropdown = false;
			showAddCourse = false;
		}

		// Close course toggle dropdown when clicking outside it
		if (courseToggleGroupId && !target.closest('[data-course-toggle-dropdown]') && !target.closest('[data-course-toggle-button]')) {
			courseToggleGroupId = null;
		}

		// Close kids link dropdown when clicking outside it
		if (kidsLinkGroupId && !target.closest('[data-kids-link-dropdown]') && !target.closest('[data-kids-link-button]')) {
			kidsLinkGroupId = null;
		}

	// Close stay dropdown when clicking outside it
	if (stayDropdownGroupId && !target.closest('[data-stay-dropdown-menu]') && !target.closest('[data-stay-dropdown-button]')) {
		stayDropdownGroupId = null;
	}


		if (!editingSeasonId && !editingGroupId && !renamingCourseId) return;
		if (target.closest('[data-edit-form]')) return;
		if (editingSeasonId) submitEditSeason(editingSeasonId);
		if (editingGroupId) submitEditGroup(editingGroupId);
		if (renamingCourseId) submitRenameCourse(renamingCourseId);
	}
</script>

<svelte:window onclick={handleWindowClick} />

{#snippet groupCard(group: MenuGroup, isChild: boolean)}
	{@const courseCount = group.allowed_courses?.length || 0}
	<div class="bg-white rounded-lg border p-4 {isChild ? 'border-purple-200 ml-6' : 'border-gray-200'}">
		<!-- Group header -->
		<div class="flex items-center gap-3 mb-3">
			<div class="w-1.5 h-6 rounded-full flex-shrink-0 {isChild ? 'bg-purple-400' : 'bg-indigo-500'}"></div>
			{#if isChild}
				<span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 font-medium flex-shrink-0">子供</span>
			{/if}
			{#if editingGroupId === group.id}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="flex items-center gap-2" data-edit-form onclick={(e) => e.stopPropagation()}>
					<input
						type="text"
						bind:value={editGroupName}
						placeholder="Enter group name"
						use:focusInput
						class="font-medium text-gray-900 bg-white border border-indigo-300 rounded px-2 py-1 text-sm w-40 focus:ring-2 focus:ring-indigo-400"
						onkeydown={(e) => { if (e.key === 'Enter' && !e.isComposing) submitEditGroup(group.id); if (e.key === 'Escape') editingGroupId = null; }}
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
			{#if kidsGroupsMap.get(group.id)}
				{@const kidsGroups = kidsGroupsMap.get(group.id)}
				<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-[10px] text-purple-700 font-medium">
					<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" /></svg>
					子供: {kidsGroups?.map(k => k.name).join(', ')}
				</span>
			{/if}
			{#if group.stay_period_nights && group.stay_period_nights.length > 0}
				{@const below3 = group.stay_period_nights.filter(n => n < 3).sort((a, b) => a - b)}
				{@const above2 = group.stay_period_nights.filter(n => n >= 3).sort((a, b) => a - b)}
				{@const has3Plus = above2.length >= 5}
				{@const displayText = [...below3.map(n => `${n}`), ...(has3Plus ? ['3+'] : above2.map(n => `${n}`))].join(', ')}
				<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[10px] text-teal-700 font-medium">
					<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
					{displayText}泊
				</span>
			{/if}
			{#if parentGroupNameMap.get(group.id)}
				<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-[10px] text-purple-700 font-medium">
					<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" /></svg>
					親: {parentGroupNameMap.get(group.id)?.name}
				</span>
			{/if}
			<div class="ml-auto flex items-center gap-1">
				{#if !isChild}
					<button onclick={() => { activeGroupId = group.id; }} class="flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-md text-xs font-medium hover:bg-orange-100 transition-colors" title="Preview お品書き">
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
						Preview
					</button>
				{/if}
				<button data-course-toggle-button onclick={() => { courseToggleGroupId = courseToggleGroupId === group.id ? null : group.id; }} class="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-slate-800 rounded-md text-xs font-medium hover:bg-blue-100 transition-colors" title="Manage courses">
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
					Courses
				</button>
				{#if !isChild}
					{@const hasKidsLinks = group.kids_group_ids && group.kids_group_ids.length > 0}
					<button data-kids-link-button onclick={() => { kidsLinkGroupId = kidsLinkGroupId === group.id ? null : group.id; }} class="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors {hasKidsLinks ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}" title="Link kids groups">
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" /></svg>
						Kids
					</button>
{@const currentValue = !group.stay_period_nights || group.stay_period_nights.length === 0 ? '' : group.stay_period_nights.includes(1) && group.stay_period_nights.length === 1 ? '1' : group.stay_period_nights.includes(2) && group.stay_period_nights.length === 1 ? '2' : '3+'}
					{@const displayLabel = currentValue === '' ? 'Stay' : currentValue === '1' ? '1泊' : currentValue === '2' ? '2泊' : '3+泊'}
					{@const isStayOpen = stayDropdownGroupId === group.id}
					<div class="relative inline-block">
						<button
							data-stay-dropdown-button
							onclick={() => { stayDropdownGroupId = stayDropdownGroupId === group.id ? null : group.id; }}
							class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 {currentValue ? 'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100 focus:ring-teal-500' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 focus:ring-navy'}"
							title="Stay period"
						>
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
							{displayLabel}
							<svg class="w-2.5 h-2.5 transition-transform {isStayOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
						</button>
						{#if isStayOpen}
							<div data-stay-dropdown-menu class="absolute z-10 mt-1 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px]">
								<button
									onclick={() => { handleStayPeriodChange(group.id, ''); stayDropdownGroupId = null; }}
									class="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors {currentValue === '' ? 'bg-blue-50 text-slate-800 font-medium' : 'text-gray-700'}"
								>
									Any duration
								</button>
								<button
									onclick={() => { handleStayPeriodChange(group.id, '1'); stayDropdownGroupId = null; }}
									class="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors {currentValue === '1' ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'}"
								>
									1泊 (1 night)
								</button>
								<button
									onclick={() => { handleStayPeriodChange(group.id, '2'); stayDropdownGroupId = null; }}
									class="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors {currentValue === '2' ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'}"
								>
									2泊 (2 nights)
								</button>
								<button
									onclick={() => { handleStayPeriodChange(group.id, '3+'); stayDropdownGroupId = null; }}
									class="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors {currentValue === '3+' ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'}"
								>
									3+泊 (3+ nights)
								</button>
							</div>
						{/if}
					</div>
				{/if}
				<button onclick={(e) => { e.stopPropagation(); startEditGroup(group); }} class="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Rename">
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
			<div data-course-toggle-dropdown class="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
				<p class="text-xs font-medium text-slate-900 mb-2">Toggle courses for this group:</p>
				<div class="flex flex-wrap gap-1.5">
					{#each menuCategories as course}
						{@const isAssigned = group.allowed_courses.some(c => c.category_id === course.id)}
						<button
							onclick={() => handleToggleCourse(group.id, course.id)}
							class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors {isAssigned ? 'bg-navy text-white' : 'bg-white border border-blue-200 text-slate-800 hover:bg-blue-100'}"
						>
							{course.label}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Kids link dropdown -->
		{#if kidsLinkGroupId === group.id}
			<div data-kids-link-dropdown class="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
				<p class="text-xs font-medium text-purple-800 mb-2">Link kids menu groups (multi-select):</p>
				<div class="flex flex-wrap gap-1.5">
					{#each menuGroups.filter(g => {
						// Exclude the current group itself
						if (g.id === group.id) return false;
						// Include if already linked to this group
						if (group.kids_group_ids?.includes(g.id)) return true;
						// Exclude if linked to any other group
						const isLinkedToOther = menuGroups.some(other =>
							other.id !== group.id && other.kids_group_ids?.includes(g.id)
						);
						return !isLinkedToOther;
					}) as candidate}
						{@const isLinked = group.kids_group_ids?.includes(candidate.id)}
						<button
							onclick={() => handleToggleKidsLink(group.id, candidate.id)}
							class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors {isLinked ? 'bg-purple-600 text-white' : 'bg-white border border-purple-200 text-purple-700 hover:bg-purple-100'}"
						>
							{candidate.name}
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
					{@const linkedCount = getLinkedMenuCount(group.id, ac.category_value)}
					{@const isActiveCourse = detailContext?.courseId === ac.category_id && detailContext?.groupId === group.id}
					<button
						data-course-chip
						onclick={() => handleOpenCourseDetail(ac.category_id, group.id, ac.category_value, getCourseName(ac.category_id, ac.category_name))}
						class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors hover:shadow-sm {isActiveCourse ? 'bg-amber-200 border-amber-500 text-amber-900 ring-2 ring-amber-400 ring-offset-1' : count > 0 || linkedCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}"
					>
						<span class="font-medium">{getCourseName(ac.category_id, ac.category_name)}</span>
						{#if linkedCount > 0 && count === 0}
							<span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 text-purple-700" title="Inherited from {parentGroupNameMap.get(group.id)?.name}">{linkedCount}</span>
						{:else}
							<span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold {count > 0 ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-500'}">{count}</span>
						{/if}
					</button>
				{/each}
			</div>
		{:else}
			<p class="text-xs text-gray-400">No courses assigned — click <strong>Courses</strong> to add</p>
		{/if}
	</div>
{/snippet}

<!-- Full-screen overlay -->
<div class="fixed inset-0 bg-gray-50 z-50 flex flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
		<div>
			<h2 class="text-xl font-bold text-gray-900">Menu Structure</h2>
			<p class="text-sm text-gray-500">Organize seasonal menus, groups, and courses</p>
		</div>
		<div class="flex items-center gap-2">
			<!-- Manage Courses dropdown -->
			<div class="relative" data-courses-dropdown>
				<button
					onclick={(e) => { e.stopPropagation(); showCoursesDropdown = !showCoursesDropdown; if (!showCoursesDropdown) { showAddCourse = false; } }}
					class="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors {showCoursesDropdown ? 'bg-blue-100 text-slate-800' : 'text-gray-600 hover:bg-gray-100'}"
					title="Manage courses"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
					Courses
					<span class="bg-blue-100 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{menuCategories.length}</span>
				</button>
				{#if showCoursesDropdown}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-[55] p-4" onclick={(e) => e.stopPropagation()}>
						<div class="flex items-center justify-between mb-3">
							<h3 class="text-sm font-semibold text-gray-900">Available Courses</h3>
							<button onclick={() => { showAddCourse = !showAddCourse; newCourseName = ''; addCourseError = ''; }} class="text-xs text-slate-800 hover:text-slate-900 font-medium">
								{showAddCourse ? 'Cancel' : '+ Add'}
							</button>
						</div>

						{#if showAddCourse}
							<div class="flex gap-2 mb-3">
								<input type="text" bind:value={newCourseName} placeholder="Course name" class="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400" onkeydown={(e) => e.key === 'Enter' && !e.isComposing && submitNewCourse()} />
								<button onclick={submitNewCourse} disabled={isAddingCourse || !newCourseName.trim()} class="bg-navy text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-navy-700 disabled:opacity-50">
									{isAddingCourse ? '...' : 'Add'}
								</button>
							</div>
							{#if addCourseError}
								<p class="text-xs text-red-500 mb-2">{addCourseError}</p>
							{/if}
						{/if}

						<div class="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
							{#each menuCategories as course}
								{#if confirmDeleteId === course.id && confirmDeleteType === 'course'}
									<div class="flex items-center gap-1.5 bg-red-50 border border-red-300 rounded-full px-3 py-1 animate-pulse">
										<span class="text-sm text-red-700">Delete?</span>
										<button onclick={() => confirmDelete()} class="text-red-500 hover:text-red-700 font-bold text-xs">Yes</button>
										<span class="text-red-200">|</span>
										<button onclick={() => cancelDelete()} class="text-gray-400 hover:text-gray-600 text-xs">No</button>
									</div>
								{:else if renamingCourseId === course.id}
									<div class="flex items-center gap-1.5 bg-blue-100 border border-blue-400 rounded-full px-1.5 py-0.5" data-edit-form>
										<input
											type="text"
											bind:value={renameCourseValue}
											class="bg-transparent border-none text-sm text-blue-900 font-medium w-24 focus:outline-none focus:ring-0 px-1"
											onkeydown={(e) => { if (e.key === 'Enter' && !e.isComposing) submitRenameCourse(course.id); if (e.key === 'Escape') renamingCourseId = null; }}
											autofocus
										/>
										<button onclick={() => submitRenameCourse(course.id)} class="text-slate-800 hover:text-slate-900 transition-colors" title="Save">
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
										</button>
										<button onclick={() => { renamingCourseId = null; }} class="text-gray-400 hover:text-gray-600 transition-colors" title="Cancel">
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
										</button>
									</div>
								{:else}
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div class="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
										<span
											class="text-sm text-slate-900 cursor-pointer hover:underline"
											ondblclick={() => startRenameCourse(course)}
											title="Double-click to rename"
										>{course.label}</span>
										<button onclick={() => requestDelete(course.id, 'course')} class="text-blue-400 hover:text-red-500 transition-colors" title="Delete course">
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
										</button>
									</div>
								{/if}
							{/each}
							{#if menuCategories.length === 0}
								<p class="text-sm text-gray-400">No courses yet. Add one above.</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>
			<button
				onclick={() => { showScanModal = true; }}
				class="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
				title="Scan handwritten menu"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				Scan Menu
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

	<!-- Two-column content -->
	<div class="flex-1 flex flex-row overflow-hidden">
		<!-- Left panel: Accordion + Available Courses -->
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
						onkeydown={(e) => e.key === 'Enter' && !e.isComposing && submitSeason()}
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
				{@const clusters = buildGroupClusters(groups)}
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
										onkeydown={(e) => { if (e.key === 'Enter' && !e.isComposing) submitEditSeason(season.id); if (e.key === 'Escape') { editingSeasonId = null; } }}
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
							{#each clusters as cluster}
								<div class="space-y-1">
									{@render groupCard(cluster.parent, false)}
									{#each cluster.children as child}
										{@render groupCard(child, true)}
									{/each}
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
				{@const unassignedClusters = buildGroupClusters(unassignedGroups)}
				<div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
					<div class="px-5 py-4 flex items-center gap-3 border-b border-gray-100">
						<div class="w-2 h-8 bg-gray-400 rounded-full flex-shrink-0"></div>
						<span class="font-semibold text-gray-700">Unassigned Groups</span>
						<span class="text-xs text-gray-400">{unassignedGroups.length}</span>
					</div>
					<div class="px-5 py-3 space-y-3 bg-gray-50/50">
						{#each unassignedClusters as cluster}
							<div class="space-y-1">
								{@render groupCard(cluster.parent, false)}
								{#each cluster.children as child}
									{@render groupCard(child, true)}
								{/each}
							</div>
						{/each}
					</div>
				</div>
			{/if}

		</div>
		</div>

		<!-- Right panel: Course Editor -->
		<div class="w-[450px] flex-shrink-0 border-l border-gray-200 flex flex-col bg-white" data-course-editor>
			{#if detailContext}
				<CourseDetailSidebar
					embedded={true}
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
			{:else}
				<div class="flex-1 flex flex-col items-center justify-center text-gray-400">
					<svg class="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
					</svg>
					<p class="text-sm font-medium">Select a course to edit</p>
					<p class="text-xs mt-1">Click on a course chip in the panel</p>
				</div>
			{/if}
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
		kidsGroup={activeKidsGroup}
		linkableGroups={activeLinkableGroups}
		onUpdateDisplayTitle={(title) => { onUpdateGroup(activeGroup!.id, { display_title: title }); }}
		onToggleCourse={handleToggleCourse}
		onReorderCourses={handleReorderCourses}
		onLinkKidsGroup={(kidsGroupId) => { activeKidsGroupId = kidsGroupId; }}
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

{#if showScanModal}
	<MenuScanModal
		menuGroups={menuGroups}
		seasonalMenus={seasonalMenus}
		onConfirmed={() => { showScanModal = false; }}
		onClose={() => { showScanModal = false; }}
	/>
{/if}

<!-- Toast -->
{#if toast}
	<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
		{toast.message}
	</div>
{/if}

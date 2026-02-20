<script lang="ts">
	import type { SeasonalMenu, MenuGroup, Menu, Product, CreateSeasonalMenuData, CreateMenuGroupData, UpdateMenuGroupData, UpdateSeasonalMenuData, CreateMenuData, UpdateMenuData, UpdateCategoryData } from '$lib/api';
	import { SvelteFlow, Background, type Node, type Edge, Position } from '@xyflow/svelte';
	import dagre from '@dagrejs/dagre';
	import SeasonNode from './flow/SeasonNode.svelte';
	import GroupNode from './flow/GroupNode.svelte';
	import CourseNode from './flow/CourseNode.svelte';
	import AddButtonNode from './flow/AddButtonNode.svelte';
	import CourseToggleNode from './flow/CourseToggleNode.svelte';
	import MenuListNode from './flow/MenuListNode.svelte';
	import MenuFormSidebar from './flow/MenuFormSidebar.svelte';
	import CourseDetailSidebar from './flow/CourseDetailSidebar.svelte';
	import MenuPreviewPanel from './flow/MenuPreviewPanel.svelte';

	import '@xyflow/svelte/dist/style.css';

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
		onSwitchToPanel?: () => void;
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
		onSwitchToPanel,
		onClose,
	}: Props = $props();

	// Node type registry
	const nodeTypes = {
		season: SeasonNode,
		group: GroupNode,
		course: CourseNode,
		addButton: AddButtonNode,
		courseToggle: CourseToggleNode,
		menuList: MenuListNode,
	};

	// Node dimensions for dagre layout
	const NODE_DIMS: Record<string, { width: number; height: number }> = {
		season: { width: 240, height: 90 },
		group: { width: 220, height: 80 },
		course: { width: 200, height: 45 },
		addButton: { width: 200, height: 45 },
		courseToggle: { width: 280, height: 220 },
		unassignedRoot: { width: 220, height: 50 },
		menuList: { width: 220, height: 100 },
	};

	// Flow state
	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);

	// Course toggle state
	let courseToggleGroupId: string | null = $state(null);

	// Active group for menu preview
	let activeGroupId: string | null = $state(null);

	// Menu sidebar state
	let sidebarContext: { groupId: string; courseValue: string; courseName: string; seasonalMenuId?: string | null } | null = $state(null);

	// Inline form state
	let addingSeasonForm = $state(false);
	let newSeasonName = $state('');
	let newSeasonStartDate = $state('');
	let newSeasonEndDate = $state('');


	let isSubmitting = $state(false);

	// Course management state
	let showAddCourse = $state(false);
	let newCourseName = $state('');
	let isAddingCourse = $state(false);
	let addCourseError = $state('');

	// Rename course
	let renamingCourseId: string | null = $state(null);
	let renameCourseValue = $state('');

	// Toast notification
	let toast: { message: string; timeout: ReturnType<typeof setTimeout> } | null = $state(null);

	function showToast(message: string) {
		if (toast) clearTimeout(toast.timeout);
		const timeout = setTimeout(() => { toast = null; }, 2000);
		toast = { message, timeout };
	}

	// Course name lookup (menuCategories is the source of truth for names)
	const courseNameMap = $derived.by(() => {
		const map = new Map<string, string>();
		for (const c of menuCategories) {
			map.set(c.id, c.label);
		}
		return map;
	});

	function getCourseName(courseId: string, fallback: string): string {
		return courseNameMap.get(courseId) ?? fallback;
	}

	// Menu count helper
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

	// Link name helpers for tree nodes
	function getLinkedKidsName(groupId: string): string | null {
		const g = menuGroups.find(mg => mg.id === groupId);
		if (!g?.kids_group_id) return null;
		return menuGroups.find(mg => mg.id === g.kids_group_id)?.name ?? null;
	}

	function getLinkedParentName(groupId: string): string | null {
		const parent = menuGroups.find(mg => mg.kids_group_id === groupId);
		return parent?.name ?? null;
	}

	// Active group preview data
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

	// Kids group derived — show courses that overlap with the main (parent) group
	const activeKidsGroup = $derived.by(() => {
		if (!activeGroup?.kids_group_id) return null;
		const kg = menuGroups.find(g => g.id === activeGroup.kids_group_id);
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
		if (!activeGroup) return [];
		return menuGroups
			.filter(g => g.id !== activeGroup.id)
			.map(g => ({ id: g.id, name: g.name }));
	});

	// Dagre layout
	function layoutWithDagre(rawNodes: Node[], rawEdges: Edge[]): { nodes: Node[]; edges: Edge[] } {
		const g = new dagre.graphlib.Graph();
		g.setDefaultEdgeLabel(() => ({}));
		g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 });

		for (const node of rawNodes) {
			const dims = NODE_DIMS[node.type ?? 'addButton'] ?? { width: 200, height: 50 };
			g.setNode(node.id, { width: dims.width, height: dims.height });
		}

		for (const edge of rawEdges) {
			g.setEdge(edge.source, edge.target);
		}

		dagre.layout(g);

		const layoutedNodes = rawNodes.map((node) => {
			const pos = g.node(node.id);
			const dims = NODE_DIMS[node.type ?? 'addButton'] ?? { width: 200, height: 50 };
			return {
				...node,
				position: {
					x: pos.x - dims.width / 2,
					y: pos.y - dims.height / 2,
				},
			};
		});

		return { nodes: layoutedNodes, edges: rawEdges };
	}

	// Action handlers
	function startAddSeason() {
		addingSeasonForm = true;
		newSeasonName = '';
		newSeasonStartDate = '';
		newSeasonEndDate = '';
	}

	function cancelAddSeason() {
		addingSeasonForm = false;
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
			addingSeasonForm = false;
		} finally {
			isSubmitting = false;
		}
	}

	function handleDeleteSeason(seasonId: string, groupCount: number) {
		const msg = groupCount > 0
			? `Delete this seasonal menu? ${groupCount} group(s) will become unassigned.`
			: 'Delete this seasonal menu?';
		if (confirm(msg)) {
			onDeleteSeason(seasonId);
		}
	}

	async function handleAddGroup(seasonId: string) {
		if (isSubmitting) return;
		isSubmitting = true;
		try {
			await onCreateGroup({
				name: 'New Group',
				seasonal_menu_id: seasonId || undefined,
			});
		} finally {
			isSubmitting = false;
		}
	}

	function handleDeleteGroup(groupId: string) {
		if (confirm('Delete this menu group?')) {
			onDeleteGroup(groupId);
		}
	}

	function handleUpdateSeason(seasonId: string, data: Partial<{ name: string; start_date?: string; end_date?: string }>) {
		onUpdateSeason(seasonId, data);
	}

	function handleRenameGroup(groupId: string, newName: string) {
		onUpdateGroup(groupId, { name: newName });
	}

	function handleRenameCourse(courseId: string, newName: string) {
		onUpdateCourse(courseId, newName);
	}

	function toggleCoursePanel(groupId: string) {
		courseToggleGroupId = courseToggleGroupId === groupId ? null : groupId;
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

	// Inline delete confirmation for courses
	let confirmDeleteCourseId: string | null = $state(null);
	let confirmDeleteTimeout: ReturnType<typeof setTimeout> | null = $state(null);

	function requestDeleteCourse(id: string) {
		if (confirmDeleteTimeout) clearTimeout(confirmDeleteTimeout);
		confirmDeleteCourseId = id;
		confirmDeleteTimeout = setTimeout(() => { confirmDeleteCourseId = null; }, 3000);
	}

	function confirmDeleteCourse(id: string) {
		if (confirmDeleteTimeout) clearTimeout(confirmDeleteTimeout);
		confirmDeleteCourseId = null;
		onDeleteCourse(id);
		showToast('Course deleted');
	}

	function cancelDeleteCourse() {
		if (confirmDeleteTimeout) clearTimeout(confirmDeleteTimeout);
		confirmDeleteCourseId = null;
	}

	function handleOpenMenuSidebar(groupId: string, courseValue: string, courseName: string) {
		const group = menuGroups.find(g => g.id === groupId);
		sidebarContext = {
			groupId,
			courseValue,
			courseName,
			seasonalMenuId: group?.seasonal_menu_id || null,
		};
	}

	function handleCloseSidebar() {
		sidebarContext = null;
	}

	async function handleCreateMenuFromSidebar(data: CreateMenuData) {
		await onCreateMenu(data);
		sidebarContext = null;
	}

	function handleDeleteMenuFromTree(menuId: string) {
		const menu = menus.find(m => m.id === menuId);
		onDeleteMenu(menuId);
		showToast(`${menu?.name ?? 'Menu item'} deleted`);
	}

	// Course detail sidebar state
	let detailContext: { courseId: string; groupId: string; courseValue: string; courseName: string } | null = $state(null);

	const detailMenus = $derived(
		detailContext
			? menus.filter(m => m.menu_group_id === detailContext!.groupId && m.category === detailContext!.courseValue)
			: []
	);

	// Get the category object for detail sidebar
	const detailCategory = $derived(
		detailContext ? menuCategories.find(c => c.id === detailContext!.courseId) : null
	);

	function handleOpenCourseDetail(courseId: string, groupId: string, courseValue: string, courseName: string) {
		detailContext = { courseId, groupId, courseValue, courseName };
	}

	function handleCloseCourseDetail() {
		detailContext = null;
	}

	async function handleUpdateCourseDetailsFromDetail(id: string, data: UpdateCategoryData) {
		await onUpdateCourseDetails(id, data);
	}

	function handleDeleteMenuFromDetail(id: string) {
		onDeleteMenu(id);
	}


	// Build tree from data
	function buildTree() {
		const rawNodes: Node[] = [];
		const rawEdges: Edge[] = [];

		// Root: Add Season button
		rawNodes.push({
			id: 'add-season-btn',
			type: 'addButton',
			position: { x: 0, y: 0 },
			data: {
				label: '+ Add Seasonal Menu',
				onClick: startAddSeason,
				hasTarget: false,
				hasSource: true,
			},
		});

		// Seasonal menus
		for (const season of seasonalMenus) {
			const groups = menuGroups.filter(g => g.seasonal_menu_id === season.id);
			const seasonNodeId = `season-${season.id}`;

			rawNodes.push({
				id: seasonNodeId,
				type: 'season',
				position: { x: 0, y: 0 },
				data: {
					season,
					groupCount: groups.length,
					onAddGroup: handleAddGroup,
					onDelete: handleDeleteSeason,
					onUpdate: handleUpdateSeason,
				},
			});

			rawEdges.push({
				id: `e-root-${season.id}`,
				source: 'add-season-btn',
				target: seasonNodeId,
				type: 'smoothstep',
				style: 'stroke: #22c55e; stroke-width: 2;',
			});

			// Groups under this season
			for (const group of groups) {
				const groupNodeId = `group-${group.id}`;
				const courseCount = group.allowed_courses?.length || 0;

				rawNodes.push({
					id: groupNodeId,
					type: 'group',
					position: { x: 0, y: 0 },
					data: {
						group,
						courseCount,
						linkedKidsName: getLinkedKidsName(group.id),
						linkedParentName: getLinkedParentName(group.id),
						onToggleCourses: toggleCoursePanel,
						onDelete: handleDeleteGroup,
						onRename: handleRenameGroup,
						isActive: activeGroupId === group.id,
						onSelectGroup: (id: string) => { activeGroupId = id; },
					},
				});

				rawEdges.push({
					id: `e-season-group-${group.id}`,
					source: seasonNodeId,
					target: groupNodeId,
					type: 'smoothstep',
					style: 'stroke: #6366f1; stroke-width: 2;',
				});

				// Course toggle panel (if open)
				if (courseToggleGroupId === group.id) {
					const toggleNodeId = `toggle-${group.id}`;
					rawNodes.push({
						id: toggleNodeId,
						type: 'courseToggle',
						position: { x: 0, y: 0 },
						data: {
							groupId: group.id,
							allCourses: menuCategories,
							selectedCourseIds: group.allowed_courses.map(c => c.category_id),
							onToggle: handleToggleCourse,
						},
					});

					rawEdges.push({
						id: `e-group-toggle-${group.id}`,
						source: groupNodeId,
						target: toggleNodeId,
						type: 'smoothstep',
						animated: true,
						style: 'stroke: #6366f1; stroke-width: 1; stroke-dasharray: 5 5;',
					});
				}

				// Course leaf nodes (only explicitly assigned courses)
				if (group.allowed_courses?.length > 0) {
					for (const c of group.allowed_courses) {
						const courseNodeId = `course-${group.id}-${c.category_value}`;
						rawNodes.push({
							id: courseNodeId,
							type: 'course',
							position: { x: 0, y: 0 },
							data: {
								courseId: c.category_id,
								courseName: getCourseName(c.category_id, c.category_name),
								courseValue: c.category_value,
								groupId: group.id,
								menuCount: getMenuCount(group.id, c.category_value),
								isRestricted: true,
								onRename: handleRenameCourse,
								
								onViewDetail: handleOpenCourseDetail,
							},
						});

						rawEdges.push({
							id: `e-group-course-${group.id}-${c.category_value}`,
							source: groupNodeId,
							target: courseNodeId,
							type: 'smoothstep',
							style: 'stroke: #3b82f6; stroke-width: 1.5;',
						});

						// Menu list node (if menus exist for this group+course)
						const courseMenus = menus.filter(
							m => m.menu_group_id === group.id && m.category === c.category_value
						);
						if (courseMenus.length > 0) {
							const menuListNodeId = `menus-${group.id}-${c.category_value}`;
							rawNodes.push({
								id: menuListNodeId,
								type: 'menuList',
								position: { x: 0, y: 0 },
								data: {
									menus: courseMenus,
									onDelete: handleDeleteMenuFromTree,
								},
							});
							rawEdges.push({
								id: `e-course-menus-${group.id}-${c.category_value}`,
								source: courseNodeId,
								target: menuListNodeId,
								type: 'smoothstep',
								style: 'stroke: #f59e0b; stroke-width: 1.5;',
							});
						}
					}
				}

			}
		}

		// Unassigned groups
		const unassigned = menuGroups.filter(g => !g.seasonal_menu_id);
		if (unassigned.length > 0) {
			const unassignedRootId = 'unassigned-root';
			rawNodes.push({
				id: unassignedRootId,
				type: 'addButton',
				position: { x: 0, y: 0 },
				data: {
					label: `Unassigned Groups (${unassigned.length})`,
					onClick: () => handleAddGroup(''),
					hasTarget: false,
					hasSource: true,
				},
			});

			for (const group of unassigned) {
				const groupNodeId = `group-${group.id}`;
				const courseCount = group.allowed_courses?.length || 0;

				rawNodes.push({
					id: groupNodeId,
					type: 'group',
					position: { x: 0, y: 0 },
					data: {
						group,
						courseCount,
						linkedKidsName: getLinkedKidsName(group.id),
						linkedParentName: getLinkedParentName(group.id),
						onToggleCourses: toggleCoursePanel,
						onDelete: handleDeleteGroup,
						onRename: handleRenameGroup,
						isActive: activeGroupId === group.id,
						onSelectGroup: (id: string) => { activeGroupId = id; },
					},
				});

				rawEdges.push({
					id: `e-unassigned-group-${group.id}`,
					source: unassignedRootId,
					target: groupNodeId,
					type: 'smoothstep',
					style: 'stroke: #9ca3af; stroke-width: 1.5;',
				});

				// Course toggle panel
				if (courseToggleGroupId === group.id) {
					const toggleNodeId = `toggle-${group.id}`;
					rawNodes.push({
						id: toggleNodeId,
						type: 'courseToggle',
						position: { x: 0, y: 0 },
						data: {
							groupId: group.id,
							allCourses: menuCategories,
							selectedCourseIds: group.allowed_courses.map(c => c.category_id),
							onToggle: handleToggleCourse,
						},
					});

					rawEdges.push({
						id: `e-group-toggle-${group.id}`,
						source: groupNodeId,
						target: toggleNodeId,
						type: 'smoothstep',
						animated: true,
						style: 'stroke: #6366f1; stroke-width: 1; stroke-dasharray: 5 5;',
					});
				}

				// Course leaf nodes (only explicitly assigned courses)
				if (group.allowed_courses?.length > 0) {
					for (const c of group.allowed_courses) {
						const courseNodeId = `course-${group.id}-${c.category_value}`;
						rawNodes.push({
							id: courseNodeId,
							type: 'course',
							position: { x: 0, y: 0 },
							data: {
								courseId: c.category_id,
								courseName: getCourseName(c.category_id, c.category_name),
								courseValue: c.category_value,
								groupId: group.id,
								menuCount: getMenuCount(group.id, c.category_value),
								isRestricted: true,
								onRename: handleRenameCourse,
								
								onViewDetail: handleOpenCourseDetail,
							},
						});

						rawEdges.push({
							id: `e-group-course-${group.id}-${c.category_value}`,
							source: groupNodeId,
							target: courseNodeId,
							type: 'smoothstep',
							style: 'stroke: #3b82f6; stroke-width: 1.5;',
						});

						// Menu list node (if menus exist for this group+course)
						const courseMenus = menus.filter(
							m => m.menu_group_id === group.id && m.category === c.category_value
						);
						if (courseMenus.length > 0) {
							const menuListNodeId = `menus-${group.id}-${c.category_value}`;
							rawNodes.push({
								id: menuListNodeId,
								type: 'menuList',
								position: { x: 0, y: 0 },
								data: {
									menus: courseMenus,
									onDelete: handleDeleteMenuFromTree,
								},
							});
							rawEdges.push({
								id: `e-course-menus-${group.id}-${c.category_value}`,
								source: courseNodeId,
								target: menuListNodeId,
								type: 'smoothstep',
								style: 'stroke: #f59e0b; stroke-width: 1.5;',
							});
						}
					}
				}

			}
		}

		return layoutWithDagre(rawNodes, rawEdges);
	}

	// Rebuild tree whenever data changes
	$effect(() => {
		// Touch reactive dependencies
		seasonalMenus;
		menuGroups;
		menuCategories;
		menus;
		courseToggleGroupId;
		activeGroupId;

		const result = buildTree();
		nodes = result.nodes;
		edges = result.edges;
	});
</script>

<!-- Full-screen overlay -->
<div class="fixed inset-0 bg-gray-50 z-50 flex flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
		<div>
			<h2 class="text-xl font-bold text-gray-900">Menu Structure</h2>
			<p class="text-sm text-gray-500">Configure seasonal menus, groups, and courses — pan & zoom to explore</p>
		</div>
		<div class="flex items-center gap-2">
			{#if onSwitchToPanel}
				<button
					onclick={onSwitchToPanel}
					class="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
					title="Switch to panel view"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
					</svg>
					Panel View
				</button>
			{/if}
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

	<!-- Inline add forms (floating above the canvas) -->
	{#if addingSeasonForm}
		<div class="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 bg-white rounded-xl shadow-xl border-2 border-green-400 p-4 min-w-[350px]">
			<h3 class="text-sm font-semibold text-green-800 mb-3">New Seasonal Menu</h3>
			<div class="space-y-2">
				<input
					type="text"
					bind:value={newSeasonName}
					placeholder="Season name (e.g., Summer 2025)"
					class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400"
					onkeydown={(e) => e.key === 'Enter' && !e.isComposing && submitSeason()}
				/>
				<div class="flex gap-2">
					<input
						type="date"
						bind:value={newSeasonStartDate}
						class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400"
					/>
					<input
						type="date"
						bind:value={newSeasonEndDate}
						class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400"
					/>
				</div>
				<div class="flex gap-2">
					<button
						onclick={submitSeason}
						disabled={isSubmitting || !newSeasonName.trim()}
						class="flex-1 bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
					>
						{isSubmitting ? 'Adding...' : 'Add Season'}
					</button>
					<button
						onclick={cancelAddSeason}
						class="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- SvelteFlow canvas -->
	<div class="flex-1 relative">
		<SvelteFlow
			bind:nodes
			bind:edges
			{nodeTypes}
			fitView
			nodesDraggable={true}
			nodesConnectable={false}
			elementsSelectable={true}
			panOnDrag={true}
			zoomOnScroll={true}
			minZoom={0.2}
			maxZoom={2}
			defaultEdgeOptions={{ type: 'smoothstep' }}
			onpaneclick={() => { if (courseToggleGroupId) courseToggleGroupId = null; activeGroupId = null; }}
		>
			<Background />
		</SvelteFlow>
	</div>

	<!-- Bottom: Available Courses (always visible when no group selected) -->
	<div class="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0">
			<div class="flex items-center justify-between mb-2">
				<div>
					<h3 class="text-sm font-semibold text-gray-900">Available Courses</h3>
					<p class="text-xs text-gray-500">Courses available for assignment to menu groups</p>
				</div>
				<button
					onclick={() => { showAddCourse = !showAddCourse; newCourseName = ''; }}
					class="text-sm text-blue-600 hover:text-blue-800 font-medium"
				>
					{showAddCourse ? 'Cancel' : '+ Add Course'}
				</button>
			</div>

			{#if showAddCourse}
				<div class="flex gap-2 mb-3">
					<input
						type="text"
						bind:value={newCourseName}
						placeholder="Course name (e.g., Appetizer)"
						class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
						onkeydown={(e) => e.key === 'Enter' && !e.isComposing && submitNewCourse()}
					/>
					<button
						onclick={submitNewCourse}
						disabled={isAddingCourse || !newCourseName.trim()}
						class="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
					>
						{isAddingCourse ? 'Adding...' : 'Add'}
					</button>
				</div>
				{#if addCourseError}
					<p class="text-xs text-red-500 mb-2">{addCourseError}</p>
				{/if}
			{/if}

			<div class="flex flex-wrap gap-2">
				{#each menuCategories as course}
					{#if confirmDeleteCourseId === course.id}
						<div class="flex items-center gap-1.5 bg-red-50 border border-red-300 rounded-full px-3 py-1 animate-pulse">
							<span class="text-sm text-red-700">削除?</span>
							<button
								onclick={() => confirmDeleteCourse(course.id)}
								class="text-red-500 hover:text-red-700 font-bold text-xs transition-colors"
							>
								Yes
							</button>
							<span class="text-red-200">|</span>
							<button
								onclick={cancelDeleteCourse}
								class="text-gray-400 hover:text-gray-600 text-xs transition-colors"
							>
								No
							</button>
						</div>
					{:else if renamingCourseId === course.id}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="flex items-center gap-1.5 bg-blue-100 border border-blue-400 rounded-full px-1.5 py-0.5" onclick={(e) => e.stopPropagation()}>
							<input
								type="text"
								bind:value={renameCourseValue}
								class="bg-transparent border-none text-sm text-blue-900 font-medium w-24 focus:outline-none focus:ring-0 px-1"
								onkeydown={(e) => { if (e.key === 'Enter' && !e.isComposing) submitRenameCourse(course.id); if (e.key === 'Escape') renamingCourseId = null; }}
								autofocus
							/>
							<button onclick={() => submitRenameCourse(course.id)} class="text-blue-600 hover:text-blue-800 transition-colors" title="Save">
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
								class="text-sm text-blue-800 cursor-pointer hover:underline"
								ondblclick={() => startRenameCourse(course)}
								title="Double-click to rename"
							>{course.label}</span>
							<button
								onclick={() => requestDeleteCourse(course.id)}
								class="text-blue-400 hover:text-red-500 transition-colors"
								title="Delete course"
							>
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
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

<!-- Menu Preview Panel (fullscreen overlay) -->
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
		onLinkKidsGroup={(kidsGroupId) => { onUpdateGroup(activeGroup!.id, { kids_group_id: kidsGroupId }); }}
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
		onClose={handleCloseSidebar}
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
		onUpdateCourseDetails={handleUpdateCourseDetailsFromDetail}
		onRenameCourse={handleRenameCourse}
		onCreateMenu={handleCreateMenuFromSidebar}
		onDeleteMenu={handleDeleteMenuFromDetail}
		onClose={handleCloseCourseDetail}
	/>
{/if}

<!-- Toast notification -->
{#if toast}
	<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg animate-fade-in">
		{toast.message}
	</div>
{/if}

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translate(-50%, 8px); }
		to { opacity: 1; transform: translate(-50%, 0); }
	}
	.animate-fade-in {
		animation: fade-in 0.2s ease-out;
	}
	:global(.svelte-flow) {
		background-color: #f9fafb;
	}
	:global(.svelte-flow .svelte-flow__handle) {
		width: 8px;
		height: 8px;
		border: 2px solid #d1d5db;
		background: white;
	}
	:global(.svelte-flow .svelte-flow__edge-path) {
		stroke-width: 2;
	}
</style>

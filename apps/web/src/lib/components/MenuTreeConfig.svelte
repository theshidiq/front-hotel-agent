<script lang="ts">
	import type { SeasonalMenu, MenuGroup, Menu, Product, CreateSeasonalMenuData, CreateMenuGroupData, UpdateMenuGroupData, UpdateSeasonalMenuData, CreateMenuData } from '$lib/api';
	import { SvelteFlow, Background, type Node, type Edge, Position } from '@xyflow/svelte';
	import dagre from '@dagrejs/dagre';
	import SeasonNode from './flow/SeasonNode.svelte';
	import GroupNode from './flow/GroupNode.svelte';
	import CourseNode from './flow/CourseNode.svelte';
	import AddButtonNode from './flow/AddButtonNode.svelte';
	import CourseToggleNode from './flow/CourseToggleNode.svelte';
	import MenuListNode from './flow/MenuListNode.svelte';
	import MenuFormSidebar from './flow/MenuFormSidebar.svelte';

	import '@xyflow/svelte/dist/style.css';

	interface Props {
		seasonalMenus: SeasonalMenu[];
		menuGroups: MenuGroup[];
		menuCategories: { value: string; label: string; id: string }[];
		menus: Menu[];
		onCreateSeason: (data: CreateSeasonalMenuData) => Promise<void>;
		onUpdateSeason: (id: string, data: UpdateSeasonalMenuData) => Promise<void>;
		onDeleteSeason: (id: string) => Promise<void>;
		onCreateGroup: (data: CreateMenuGroupData) => Promise<void>;
		onUpdateGroup: (id: string, data: UpdateMenuGroupData) => Promise<void>;
		onDeleteGroup: (id: string) => Promise<void>;
		onCreateCourse: (name: string) => Promise<void>;
		onUpdateCourse: (id: string, name: string) => Promise<void>;
		onDeleteCourse: (id: string) => Promise<void>;
		products: Product[];
		onCreateMenu: (data: CreateMenuData) => Promise<void>;
		onDeleteMenu: (id: string) => Promise<void>;
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
		onDeleteCourse,
		products,
		onCreateMenu,
		onDeleteMenu,
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

	async function submitNewCourse() {
		if (!newCourseName.trim() || isAddingCourse) return;
		isAddingCourse = true;
		try {
			await onCreateCourse(newCourseName.trim());
			newCourseName = '';
			showAddCourse = false;
		} finally {
			isAddingCourse = false;
		}
	}

	function handleDeleteCourse(id: string) {
		if (confirm('Delete this course? It will be removed from all groups.')) {
			onDeleteCourse(id);
		}
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
		if (confirm('Delete this menu item?')) {
			onDeleteMenu(menuId);
		}
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
						onToggleCourses: toggleCoursePanel,
						onDelete: handleDeleteGroup,
						onRename: handleRenameGroup,
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
								courseName: c.category_name,
								courseValue: c.category_value,
								groupId: group.id,
								menuCount: getMenuCount(group.id, c.category_value),
								isRestricted: true,
								onRename: handleRenameCourse,
								onAddMenu: handleOpenMenuSidebar,
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
						onToggleCourses: toggleCoursePanel,
						onDelete: handleDeleteGroup,
						onRename: handleRenameGroup,
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
								courseName: c.category_name,
								courseValue: c.category_value,
								groupId: group.id,
								menuCount: getMenuCount(group.id, c.category_value),
								isRestricted: true,
								onRename: handleRenameCourse,
								onAddMenu: handleOpenMenuSidebar,
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
					onkeydown={(e) => e.key === 'Enter' && submitSeason()}
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
			onpaneclick={() => { if (courseToggleGroupId) courseToggleGroupId = null; }}
		>
			<Background />
		</SvelteFlow>
	</div>

	<!-- Bottom: Available Courses management -->
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
					onkeydown={(e) => e.key === 'Enter' && submitNewCourse()}
				/>
				<button
					onclick={submitNewCourse}
					disabled={isAddingCourse || !newCourseName.trim()}
					class="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
				>
					{isAddingCourse ? 'Adding...' : 'Add'}
				</button>
			</div>
		{/if}

		<div class="flex flex-wrap gap-2">
			{#each menuCategories as course}
				<div class="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
					<span class="text-sm text-blue-800">{course.label}</span>
					<button
						onclick={() => handleDeleteCourse(course.id)}
						class="text-blue-400 hover:text-red-500 transition-colors"
						title="Delete course"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/each}
			{#if menuCategories.length === 0}
				<p class="text-sm text-gray-400">No courses defined yet. Add one above.</p>
			{/if}
		</div>
	</div>
</div>

<!-- Menu Form Sidebar -->
{#if sidebarContext}
	<MenuFormSidebar
		context={sidebarContext}
		{products}
		onSubmit={handleCreateMenuFromSidebar}
		onClose={handleCloseSidebar}
	/>
{/if}

<style>
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

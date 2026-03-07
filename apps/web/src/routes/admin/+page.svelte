<script lang="ts">
	import { authState } from '$lib/auth.svelte';
	import {
		getRoles,
		getRolePermissionsList,
		createRole,
		updateRoleApi,
		updateRolePermissions,
		deleteRole,
		setRoleAsDefault,
		clearRoleDefault,
		type Role,
	} from '$lib/api';
	import OrgManagement from '$lib/components/OrgManagement.svelte';

	// ── Navigation State ──
	type AdminSection = 'menu' | 'staff' | 'roles';
	let activeSection: AdminSection = $state('menu');

	// ── State ──
	let roles: Role[] = $state([]);
	let allPermissions: string[] = $state([]);
	let loading = $state(false);
	let error = $state('');

	// Role management
	let editingRole: Role | null = $state(null);
	let editingPermissions: Set<string> = $state(new Set());
	let editRoleName = $state('');
	let editRoleDescription = $state('');
	let showNewRole = $state(false);
	let newRoleName = $state('');
	let newRoleDescription = $state('');
	let newRolePermissions: Set<string> = $state(new Set());
	let roleSaving = $state(false);

	// Permission search and collapse
	let permissionSearch = $state('');
	let newRolePermissionSearch = $state('');
	let collapsedSections: Set<string> = $state(new Set());
	let newRoleCollapsedSections: Set<string> = $state(new Set());

	// Permission groups organized by page
	interface PermGroup { label: string; permissions: { key: string; label: string }[] }
	interface PageSection { label: string; icon: string; groups: Record<string, PermGroup> }

	const permissionPages: Record<string, PageSection> = {
		food: {
			label: 'Food Management',
			icon: 'restaurant',
			groups: {
				products: {
					label: 'Products',
					permissions: [
						{ key: 'products.view', label: 'View' },
						{ key: 'products.create', label: 'Create' },
						{ key: 'products.edit', label: 'Edit' },
						{ key: 'products.delete', label: 'Delete' },
						{ key: 'products.scan', label: 'Scan' },
					],
				},
				menus: {
					label: 'Menus',
					permissions: [
						{ key: 'menus.view', label: 'View' },
						{ key: 'menus.preview', label: 'Preview' },
						{ key: 'menus.create', label: 'Create' },
						{ key: 'menus.edit', label: 'Edit' },
						{ key: 'menus.delete', label: 'Delete' },
						{ key: 'menus.structure', label: 'Structure' },
					],
				},
				allergens: {
					label: 'Allergens',
					permissions: [
						{ key: 'allergens.view', label: 'View' },
						{ key: 'allergens.manage', label: 'Manage' },
					],
				},
				reports: {
					label: 'Reports',
					permissions: [
						{ key: 'reports.print', label: 'Print' },
						{ key: 'reports.export', label: 'Export' },
					],
				},
				categories: {
					label: 'Categories',
					permissions: [
						{ key: 'categories.manage', label: 'Manage' },
					],
				},
			},
		},
		frontDesk: {
			label: 'Front Desk',
			icon: 'concierge',
			groups: {
				reservations: {
					label: 'Reservations',
					permissions: [
						{ key: 'reservations.view', label: 'View' },
						{ key: 'reservations.create', label: 'Create' },
						{ key: 'reservations.checkin', label: 'Check-in' },
						{ key: 'reservations.checkout', label: 'Check-out' },
					],
				},
				rooms: {
					label: 'Rooms',
					permissions: [
						{ key: 'rooms.view', label: 'View' },
					],
				},
				notifications: {
					label: 'Notifications',
					permissions: [
						{ key: 'notifications.view', label: 'View' },
						{ key: 'notifications.manage', label: 'Manage' },
					],
				},
			},
		},
		admin: {
			label: 'Admin',
			icon: 'admin_panel_settings',
			groups: {
				staff: {
					label: 'Staff',
					permissions: [
						{ key: 'staff.manage', label: 'Manage' },
					],
				},
			},
		},
	};

	function getRoleName(roleId: string | null): string {
		if (!roleId) return '-';
		const role = roles.find((r) => r.id === roleId);
		return role ? role.name : '-';
	}

	// ── Load data ──
	async function loadRolesData() {
		loading = true;
		error = '';
		try {
			const [r, p] = await Promise.all([getRoles(), getRolePermissionsList()]);
			roles = r;
			allPermissions = p;
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	// Load data when section changes (wait for auth to be ready)
	$effect(() => {
		if (activeSection === 'roles' && roles.length === 0 && !authState.loading && authState.isStaff) {
			loadRolesData();
		}
	});

	let initialized = $state(false);

	$effect(() => {
		if (authState.loading || initialized) return;
		initialized = true;
		if (!authState.isAdmin) {
			window.location.href = '/';
			return;
		}
	});

	// ── Role actions ──
	function startEditingRole(role: Role) {
		showNewRole = false;
		editingRole = role;
		editingPermissions = new Set(role.permissions);
		editRoleName = role.name;
		editRoleDescription = role.description || '';
	}

	function startNewRole() {
		editingRole = null;
		showNewRole = !showNewRole;
		if (showNewRole) {
			newRoleName = '';
			newRoleDescription = '';
			newRolePermissions = new Set();
		}
	}

	function togglePermission(perm: string) {
		const newSet = new Set(editingPermissions);
		if (newSet.has(perm)) {
			newSet.delete(perm);
		} else {
			newSet.add(perm);
		}
		editingPermissions = newSet;
	}

	function toggleSection(sectionKey: string) {
		const newSet = new Set(collapsedSections);
		if (newSet.has(sectionKey)) {
			newSet.delete(sectionKey);
		} else {
			newSet.add(sectionKey);
		}
		collapsedSections = newSet;
	}

	function toggleNewRoleSection(sectionKey: string) {
		const newSet = new Set(newRoleCollapsedSections);
		if (newSet.has(sectionKey)) {
			newSet.delete(sectionKey);
		} else {
			newSet.add(sectionKey);
		}
		newRoleCollapsedSections = newSet;
	}

	// Filter permissions based on search
	function filterPermissions(page: PageSection, searchTerm: string): PageSection | null {
		if (!searchTerm) return page;

		const search = searchTerm.toLowerCase();
		const filteredGroups: Record<string, PermGroup> = {};

		for (const [groupKey, group] of Object.entries(page.groups)) {
			const matchingPerms = group.permissions.filter(p =>
				p.label.toLowerCase().includes(search) ||
				p.key.toLowerCase().includes(search) ||
				group.label.toLowerCase().includes(search)
			);

			if (matchingPerms.length > 0) {
				filteredGroups[groupKey] = { ...group, permissions: matchingPerms };
			}
		}

		if (Object.keys(filteredGroups).length === 0) return null;

		return { ...page, groups: filteredGroups };
	}

	async function saveRoleChanges() {
		if (!editingRole) return;
		roleSaving = true;
		try {
			// Save name/description if changed
			if (editRoleName.trim() !== editingRole.name || editRoleDescription.trim() !== (editingRole.description || '')) {
				await updateRoleApi(editingRole.id, {
					name: editRoleName.trim(),
					description: editRoleDescription.trim() || undefined,
				});
			}
			// Save permissions
			await updateRolePermissions(editingRole.id, [...editingPermissions]);
			await loadRolesData();
			editingRole = null;
		} catch (e: any) {
			error = e.message;
		} finally {
			roleSaving = false;
		}
	}

	function toggleNewRolePermission(perm: string) {
		const newSet = new Set(newRolePermissions);
		if (newSet.has(perm)) {
			newSet.delete(perm);
		} else {
			newSet.add(perm);
		}
		newRolePermissions = newSet;
	}

	async function handleCreateRole() {
		if (!newRoleName.trim()) return;
		roleSaving = true;
		try {
			const role = await createRole({
				name: newRoleName.trim(),
				description: newRoleDescription.trim() || undefined,
				permissions: [...newRolePermissions],
			});
			// If permissions were selected, save them too
			if (newRolePermissions.size > 0) {
				await updateRolePermissions(role.id, [...newRolePermissions]);
			}
			newRoleName = '';
			newRoleDescription = '';
			newRolePermissions = new Set();
			showNewRole = false;
			await loadRolesData();
		} catch (e: any) {
			error = e.message;
		} finally {
			roleSaving = false;
		}
	}

	async function handleToggleDefault(role: Role) {
		try {
			if (role.is_default) {
				await clearRoleDefault(role.id);
			} else {
				await setRoleAsDefault(role.id);
			}
			await loadRolesData();
		} catch (e: any) {
			error = e.message;
		}
	}

	async function handleDeleteRole(id: string) {
		if (!confirm('Are you sure you want to delete this role?')) return;
		try {
			await deleteRole(id);
			if (editingRole?.id === id) editingRole = null;
			await loadRolesData();
		} catch (e: any) {
			error = e.message;
		}
	}
</script>

<svelte:head>
	<title>Admin Dashboard</title>
</svelte:head>

{#if !authState.isAdmin && !authState.loading}
	<div class="flex items-center justify-center min-h-screen">
		<div class="text-center">
			<p class="text-lg text-gray-600">Admin access required</p>
			<a href="/" class="mt-4 inline-block text-blue-600 hover:underline">Back to App</a>
		</div>
	</div>
{:else}
<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
		<div class="max-w-5xl mx-auto flex items-center justify-between">
			<div class="flex items-center gap-3">
				<a href="/" class="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors">
					<span class="material-symbols-rounded text-xl">arrow_back</span>
					<span class="text-sm hidden sm:inline">Back to App</span>
				</a>
			</div>
			<h1 class="text-lg font-bold text-gray-900">Admin Dashboard</h1>
			<div class="w-20"></div>
		</div>
	</header>

	<main class="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
		{#if error}
			<div class="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
				<span class="material-symbols-rounded text-red-500">error</span>
				<span class="text-sm text-red-700">{error}</span>
				<button onclick={() => error = ''} class="ml-auto text-red-400 hover:text-red-600">
					<span class="material-symbols-rounded text-lg">close</span>
				</button>
			</div>
		{/if}

		{#if authState.loading}
			<div class="flex flex-col items-center justify-center py-20 gap-3">
				<svg class="w-8 h-8 animate-spin text-blue-600" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
				<p class="text-sm text-gray-500">Authenticating...</p>
			</div>
		{:else if activeSection === 'menu'}
			<!-- Admin Menu -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 py-8">
				<button
					onclick={() => activeSection = 'staff'}
					class="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all text-left"
				>
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
							<span class="material-symbols-rounded text-2xl text-blue-600">corporate_fare</span>
						</div>
						<div>
							<h3 class="text-lg font-semibold text-gray-900">Organization</h3>
							<p class="text-sm text-gray-500 mt-1">Departments, positions &amp; staff hierarchy</p>
						</div>
					</div>
				</button>

				<button
					onclick={() => activeSection = 'roles'}
					class="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-purple-300 transition-all text-left"
				>
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
							<span class="material-symbols-rounded text-2xl text-purple-600">shield</span>
						</div>
						<div>
							<h3 class="text-lg font-semibold text-gray-900">Role Management</h3>
							<p class="text-sm text-gray-500 mt-1">Configure roles and permissions</p>
						</div>
					</div>
				</button>
			</div>
		{:else if activeSection === 'staff'}
			<!-- Back button -->
			<button
				onclick={() => activeSection = 'menu'}
				class="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
			>
				<span class="material-symbols-rounded text-xl">arrow_back</span>
				<span class="text-sm">Back to Menu</span>
			</button>

			<OrgManagement />
		{:else if activeSection === 'roles'}
			<!-- Back button -->
			<button
				onclick={() => activeSection = 'menu'}
				class="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
			>
				<span class="material-symbols-rounded text-xl">arrow_back</span>
				<span class="text-sm">Back to Menu</span>
			</button>

			{#if loading}
				<div class="flex items-center justify-center py-20">
					<svg class="w-8 h-8 animate-spin text-blue-600" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
					</svg>
				</div>
			{:else}

			<!-- ══════ ROLE MANAGEMENT ══════ -->
			<section class="bg-white rounded-xl shadow-sm border border-gray-200">
				<div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
					<h2 class="text-base font-semibold text-gray-900 flex items-center gap-2">
						<span class="material-symbols-rounded text-lg text-gray-500">shield</span>
						Role Management
					</h2>
					<button
						onclick={startNewRole}
						class="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
					>
						<span class="material-symbols-rounded text-lg">add</span>
						New Role
					</button>
				</div>

				<!-- Role cards -->
				<div class="px-5 py-4">
					<div class="flex flex-wrap gap-3 mb-4">
						{#each roles as role}
							<button
								onclick={() => startEditingRole(role)}
								class="px-4 py-3 border rounded-lg text-left transition-all min-w-[120px]
									{editingRole?.id === role.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
							>
								<div class="flex items-center gap-1.5">
									<p class="text-sm font-medium text-gray-900">{role.name}</p>
									{#if role.is_default}
										<span class="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">Guest Default</span>
									{/if}
								</div>
								<p class="text-xs text-gray-500 mt-0.5">{role.permissions.length} permissions</p>
							</button>
						{/each}
					</div>

					<!-- Permission editor (edit existing role) -->
					{#if editingRole}
						<div class="border border-gray-200 rounded-lg p-5 bg-gray-50/50">
							<div class="flex items-center justify-between mb-4">
								<div class="flex items-center gap-3 flex-1 min-w-0">
									<input
										bind:value={editRoleName}
										class="text-sm font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-0 py-0.5 w-40"
										placeholder="Role name"
									/>
									<input
										bind:value={editRoleDescription}
										class="text-xs text-gray-500 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-0 py-0.5 flex-1"
										placeholder="Description (optional)"
									/>
								</div>
								<div class="flex items-center gap-2 shrink-0">
									<button
										onclick={() => handleToggleDefault(editingRole!)}
										class="px-3 py-1.5 text-sm rounded-lg transition-colors
											{editingRole!.is_default ? 'text-green-700 bg-green-50 hover:bg-green-100' : 'text-gray-600 hover:bg-gray-100'}"
										title={editingRole!.is_default ? 'Remove as guest default' : 'Set as guest default role'}
									>
										{editingRole!.is_default ? 'Guest Default' : 'Set as Default'}
									</button>
									<button
										onclick={() => handleDeleteRole(editingRole!.id)}
										class="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
									>
										Delete
									</button>
									<button
										onclick={() => editingRole = null}
										class="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg"
									>
										Cancel
									</button>
								</div>
							</div>

							<!-- Search permissions -->
							<div class="mb-4">
								<div class="relative">
									<span class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
									<input
										type="text"
										bind:value={permissionSearch}
										placeholder="Search permissions..."
										class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									/>
									{#if permissionSearch}
										<button
											onclick={() => permissionSearch = ''}
											class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
										>
											<span class="material-symbols-rounded text-lg">close</span>
										</button>
									{/if}
								</div>
							</div>

							<div class="space-y-2 max-h-[500px] overflow-y-auto pr-2">
								{#each Object.entries(permissionPages) as [pageKey, page]}
									{@const filtered = filterPermissions(page, permissionSearch)}
									{#if filtered}
										<div class="border border-gray-200 rounded-lg bg-white">
											<button
												type="button"
												onclick={() => toggleSection(pageKey)}
												class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
											>
												<div class="flex items-center gap-2">
													<span class="material-symbols-rounded text-base text-gray-400">{page.icon}</span>
													<p class="text-xs font-semibold text-gray-700 uppercase tracking-wider">{page.label}</p>
													<span class="text-xs text-gray-500">
														({Object.values(filtered.groups).reduce((sum, g) => sum + g.permissions.length, 0)} permissions)
													</span>
												</div>
												<span class="material-symbols-rounded text-gray-400 transition-transform {collapsedSections.has(pageKey) ? '' : 'rotate-180'}">
													expand_more
												</span>
											</button>

											{#if !collapsedSections.has(pageKey)}
												<div class="px-4 pb-3 space-y-3">
													{#each Object.entries(filtered.groups) as [groupKey, group]}
														<div>
															<p class="text-xs font-medium text-gray-500 mb-2">{group.label}</p>
															<div class="flex flex-wrap gap-2">
																{#each group.permissions as perm}
																	<button
																		type="button"
																		onclick={() => togglePermission(perm.key)}
																		class="flex items-center gap-2 px-3 py-1.5 border rounded-lg cursor-pointer transition-colors
																			{editingPermissions.has(perm.key) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}"
																	>
																		<span class="material-symbols-rounded text-sm">
																			{editingPermissions.has(perm.key) ? 'check_box' : 'check_box_outline_blank'}
																		</span>
																		<span class="text-sm">{perm.label}</span>
																	</button>
																{/each}
															</div>
														</div>
													{/each}
												</div>
											{/if}
										</div>
									{/if}
								{/each}
							</div>

							<div class="flex justify-end mt-5">
								<button
									onclick={saveRoleChanges}
									disabled={roleSaving || !editRoleName.trim()}
									class="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
								>
									{roleSaving ? 'Saving...' : 'Save Changes'}
								</button>
							</div>
						</div>
					{/if}

					<!-- New role form (below role cards, same position as edit panel) -->
					{#if showNewRole}
						<div class="border border-green-200 rounded-lg p-5 bg-green-50/30">
							<div class="flex items-center justify-between mb-4">
								<div class="flex items-center gap-3 flex-1 min-w-0">
									<input
										bind:value={newRoleName}
										class="text-sm font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none px-0 py-0.5 w-40"
										placeholder="Role name"
									/>
									<input
										bind:value={newRoleDescription}
										class="text-xs text-gray-500 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none px-0 py-0.5 flex-1"
										placeholder="Description (optional)"
									/>
								</div>
								<button
									onclick={() => { showNewRole = false; newRoleName = ''; newRoleDescription = ''; newRolePermissions = new Set(); newRolePermissionSearch = ''; }}
									class="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg shrink-0"
								>
									Cancel
								</button>
							</div>

							<!-- Search permissions -->
							<div class="mb-4">
								<div class="relative">
									<span class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
									<input
										type="text"
										bind:value={newRolePermissionSearch}
										placeholder="Search permissions..."
										class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									/>
									{#if newRolePermissionSearch}
										<button
											onclick={() => newRolePermissionSearch = ''}
											class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
										>
											<span class="material-symbols-rounded text-lg">close</span>
										</button>
									{/if}
								</div>
							</div>

							<div class="space-y-2 max-h-[500px] overflow-y-auto pr-2">
								{#each Object.entries(permissionPages) as [pageKey, page]}
									{@const filtered = filterPermissions(page, newRolePermissionSearch)}
									{#if filtered}
										<div class="border border-gray-200 rounded-lg bg-white">
											<button
												type="button"
												onclick={() => toggleNewRoleSection(pageKey)}
												class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
											>
												<div class="flex items-center gap-2">
													<span class="material-symbols-rounded text-base text-gray-400">{page.icon}</span>
													<p class="text-xs font-semibold text-gray-700 uppercase tracking-wider">{page.label}</p>
													<span class="text-xs text-gray-500">
														({Object.values(filtered.groups).reduce((sum, g) => sum + g.permissions.length, 0)} permissions)
													</span>
												</div>
												<span class="material-symbols-rounded text-gray-400 transition-transform {newRoleCollapsedSections.has(pageKey) ? '' : 'rotate-180'}">
													expand_more
												</span>
											</button>

											{#if !newRoleCollapsedSections.has(pageKey)}
												<div class="px-4 pb-3 space-y-3">
													{#each Object.entries(filtered.groups) as [, group]}
														<div>
															<p class="text-xs font-medium text-gray-500 mb-2">{group.label}</p>
															<div class="flex flex-wrap gap-2">
																{#each group.permissions as perm}
																	<button
																		type="button"
																		onclick={() => toggleNewRolePermission(perm.key)}
																		class="flex items-center gap-2 px-3 py-1.5 border rounded-lg cursor-pointer transition-colors
																			{newRolePermissions.has(perm.key) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}"
																	>
																		<span class="material-symbols-rounded text-sm">
																			{newRolePermissions.has(perm.key) ? 'check_box' : 'check_box_outline_blank'}
																		</span>
																		<span class="text-sm">{perm.label}</span>
																	</button>
																{/each}
															</div>
														</div>
													{/each}
												</div>
											{/if}
										</div>
									{/if}
								{/each}
							</div>

							<div class="flex justify-end mt-5">
								<button
									onclick={handleCreateRole}
									disabled={roleSaving || !newRoleName.trim()}
									class="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
								>
									{roleSaving ? 'Creating...' : 'Create Role'}
								</button>
							</div>
						</div>
					{/if}
				</div>
			</section>
			{/if}
		{/if}


	</main>
</div>
{/if}

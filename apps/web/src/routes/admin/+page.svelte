<script lang="ts">
	import { onMount } from 'svelte';
	import { authState } from '$lib/auth.svelte';
	import {
		getStaffs,
		getRoles,
		getRolePermissionsList,
		createRole,
		updateRoleApi,
		updateRolePermissions,
		deleteRole,
		setRoleAsDefault,
		clearRoleDefault,
		createStaff,
		updateStaffRole,
		updateStaffAdmin,
		type StaffMember,
		type Role,
		type CreateStaffData,
	} from '$lib/api';

	// ── State ──
	let staffList: StaffMember[] = $state([]);
	let roles: Role[] = $state([]);
	let allPermissions: string[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	// Staff form
	let showAddStaff = $state(false);
	let newStaffName = $state('');
	let newStaffEmail = $state('');
	let newStaffPosition = $state('');
	let staffSaving = $state(false);

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

	// Staff detail modal
	let selectedStaff: StaffMember | null = $state(null);
	let staffDetailSaving = $state(false);

	// Permission groups for display
	const permissionGroups: Record<string, { label: string; permissions: { key: string; label: string }[] }> = {
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
		settings: {
			label: 'Settings',
			permissions: [
				{ key: 'categories.manage', label: 'Categories' },
				{ key: 'staff.manage', label: 'Staff' },
			],
		},
	};

	function getRoleName(roleId: string | null): string {
		if (!roleId) return '-';
		const role = roles.find((r) => r.id === roleId);
		return role ? role.name : '-';
	}

	// ── Load data ──
	async function loadAll() {
		loading = true;
		error = '';
		try {
			const [s, r, p] = await Promise.all([getStaffs(), getRoles(), getRolePermissionsList()]);
			staffList = s;
			roles = r;
			allPermissions = p;
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	function waitForAuth(): Promise<void> {
		return new Promise((resolve) => {
			if (!authState.loading) { resolve(); return; }
			const interval = setInterval(() => {
				if (!authState.loading) { clearInterval(interval); resolve(); }
			}, 50);
		});
	}

	onMount(async () => {
		await waitForAuth();
		if (!authState.isAdmin) {
			window.location.href = '/';
			return;
		}
		loadAll();
	});

	// ── Staff actions ──
	async function handleCreateStaff() {
		if (!newStaffName.trim() || !newStaffEmail.trim()) return;
		staffSaving = true;
		try {
			await createStaff({
				name: newStaffName.trim(),
				email: newStaffEmail.trim(),
				position: newStaffPosition.trim(),
			});
			newStaffName = '';
			newStaffEmail = '';
			newStaffPosition = '';
			showAddStaff = false;
			await loadAll();
		} catch (e: any) {
			error = e.message;
		} finally {
			staffSaving = false;
		}
	}

	async function handleChangeRole(staffId: string, roleId: string) {
		try {
			await updateStaffRole(staffId, roleId || null);
			await loadAll();
		} catch (e: any) {
			error = e.message;
		}
	}

	async function handleToggleAdmin(staff: StaffMember) {
		staffDetailSaving = true;
		try {
			await updateStaffAdmin(staff.id, !staff.is_admin);
			await loadAll();
			selectedStaff = null;
		} catch (e: any) {
			error = e.message;
		} finally {
			staffDetailSaving = false;
		}
	}

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
			await loadAll();
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
			await loadAll();
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
			await loadAll();
		} catch (e: any) {
			error = e.message;
		}
	}

	async function handleDeleteRole(id: string) {
		if (!confirm('Are you sure you want to delete this role?')) return;
		try {
			await deleteRole(id);
			if (editingRole?.id === id) editingRole = null;
			await loadAll();
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

		{#if loading}
			<div class="flex items-center justify-center py-20">
				<svg class="w-8 h-8 animate-spin text-blue-600" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
			</div>
		{:else}
			<!-- ══════ STAFF MANAGEMENT ══════ -->
			<section class="bg-white rounded-xl shadow-sm border border-gray-200">
				<div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
					<h2 class="text-base font-semibold text-gray-900 flex items-center gap-2">
						<span class="material-symbols-rounded text-lg text-gray-500">group</span>
						Staff Management
					</h2>
					<button
						onclick={() => showAddStaff = !showAddStaff}
						class="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
					>
						<span class="material-symbols-rounded text-lg">person_add</span>
						Add Staff
					</button>
				</div>

				{#if showAddStaff}
					<div class="px-5 py-4 bg-blue-50/50 border-b border-gray-100">
						<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<input
								bind:value={newStaffName}
								placeholder="Name"
								class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
							<input
								bind:value={newStaffEmail}
								type="email"
								placeholder="Email"
								class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
							<input
								bind:value={newStaffPosition}
								placeholder="Position"
								class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
						<div class="flex justify-end gap-2 mt-3">
							<button
								onclick={() => { showAddStaff = false; newStaffName = ''; newStaffEmail = ''; newStaffPosition = ''; }}
								class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
							>
								Cancel
							</button>
							<button
								onclick={handleCreateStaff}
								disabled={staffSaving || !newStaffName.trim() || !newStaffEmail.trim()}
								class="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
							>
								{staffSaving ? 'Adding...' : 'Add'}
							</button>
						</div>
					</div>
				{/if}

				<div class="divide-y divide-gray-100">
					{#each staffList as staff}
						<div class="px-5 py-3 flex items-center gap-4">
							<div class="w-9 h-9 rounded-full {staff.is_admin ? 'bg-amber-500' : 'bg-blue-600'} flex items-center justify-center text-white text-sm font-bold shrink-0">
								{staff.name.charAt(0).toUpperCase()}
							</div>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<p class="text-sm font-medium text-gray-900 truncate">{staff.name}</p>
									{#if staff.is_admin}
										<span class="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">Admin</span>
									{/if}
								</div>
								<p class="text-xs text-gray-500 truncate">{staff.email || '-'}</p>
							</div>
							<div class="flex items-center gap-3">
								{#if !staff.is_admin}
									<select
										value={staff.role_id || ''}
										onchange={(e) => handleChangeRole(staff.id, (e.target as HTMLSelectElement).value)}
										class="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500"
									>
										<option value="">No role</option>
										{#each roles as role}
											<option value={role.id}>{role.name}</option>
										{/each}
									</select>
								{:else}
									<span class="text-xs text-amber-600 font-medium">All Access</span>
								{/if}
								<button
									onclick={() => selectedStaff = staff}
									class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
									title="Details"
								>
									<span class="material-symbols-rounded text-lg">more_horiz</span>
								</button>
							</div>
						</div>
					{/each}
				</div>
			</section>

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

							<div class="space-y-4">
								{#each Object.entries(permissionGroups) as [groupKey, group]}
									<div>
										<p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{group.label}</p>
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
									onclick={() => { showNewRole = false; newRoleName = ''; newRoleDescription = ''; newRolePermissions = new Set(); }}
									class="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg shrink-0"
								>
									Cancel
								</button>
							</div>

							<div class="space-y-4">
								{#each Object.entries(permissionGroups) as [, group]}
									<div>
										<p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{group.label}</p>
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
	</main>
</div>
{/if}

<!-- Staff detail modal -->
{#if selectedStaff}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
		<div class="bg-white rounded-xl shadow-xl max-w-md w-full">
			<div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
				<h3 class="text-base font-semibold text-gray-900">Staff Details</h3>
				<button
					onclick={() => selectedStaff = null}
					class="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
				>
					<span class="material-symbols-rounded text-xl">close</span>
				</button>
			</div>
			<div class="px-5 py-4 space-y-4">
				<div class="flex items-center gap-3">
					<div class="w-12 h-12 rounded-full {selectedStaff.is_admin ? 'bg-amber-500' : 'bg-blue-600'} flex items-center justify-center text-white text-lg font-bold">
						{selectedStaff.name.charAt(0).toUpperCase()}
					</div>
					<div>
						<p class="font-medium text-gray-900">{selectedStaff.name}</p>
						<p class="text-sm text-gray-500">{selectedStaff.email || '-'}</p>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3 text-sm">
					<div>
						<p class="text-gray-500">Position</p>
						<p class="font-medium">{selectedStaff.position || '-'}</p>
					</div>
					<div>
						<p class="text-gray-500">Role</p>
						<p class="font-medium">{getRoleName(selectedStaff.role_id)}</p>
					</div>
				</div>

				<!-- Admin toggle -->
				<div class="border border-gray-200 rounded-lg p-4">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-gray-900 flex items-center gap-1.5">
								<span class="material-symbols-rounded text-amber-500 text-lg">star</span>
								Admin Access
							</p>
							<p class="text-xs text-gray-500 mt-0.5">Grants full access to all features</p>
						</div>
						{#if selectedStaff.id === authState.staff?.id}
							<span class="text-xs text-gray-400">Cannot change own status</span>
						{:else}
							<button
								onclick={() => handleToggleAdmin(selectedStaff!)}
								disabled={staffDetailSaving}
								aria-label="Toggle admin access"
								class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors
									{selectedStaff.is_admin ? 'bg-amber-500' : 'bg-gray-300'}"
							>
								<span
									class="inline-block h-4 w-4 rounded-full bg-white transition-transform
										{selectedStaff.is_admin ? 'translate-x-6' : 'translate-x-1'}"
								></span>
							</button>
						{/if}
					</div>
				</div>
			</div>
			<div class="px-5 py-3 border-t border-gray-100 flex justify-end">
				<button
					onclick={() => selectedStaff = null}
					class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<script lang="ts">
	import { authState, signOut } from '$lib/auth.svelte';

	const permissionLabels: Record<string, string> = {
		'products.view': 'View products',
		'products.create': 'Create products',
		'products.edit': 'Edit products',
		'products.delete': 'Delete products',
		'products.scan': 'Scan product labels',
		'menus.view': 'View menus',
		'menus.create': 'Create menus',
		'menus.edit': 'Edit menus',
		'menus.delete': 'Delete menus',
		'menus.structure': 'Configure menu structure',
		'allergens.view': 'View allergens',
		'allergens.manage': 'Manage allergens',
		'reports.print': 'Print reports',
		'reports.export': 'Export reports',
		'categories.manage': 'Manage categories',
		'staff.manage': 'Manage staff',
	};
</script>

<svelte:head>
	<title>My Account</title>
</svelte:head>

{#if !authState.isStaff && !authState.loading}
	<div class="flex items-center justify-center min-h-screen">
		<div class="text-center">
			<p class="text-lg text-gray-600">Please log in to view your account</p>
			<a href="/login" class="mt-4 inline-block text-blue-600 hover:underline">Login</a>
		</div>
	</div>
{:else if authState.staff}
<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
		<div class="max-w-lg mx-auto flex items-center justify-between">
			<a href="/" class="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors">
				<span class="material-symbols-rounded text-xl">arrow_back</span>
				<span class="text-sm">Back to App</span>
			</a>
			<h1 class="text-lg font-bold text-gray-900">My Account</h1>
			<div class="w-20"></div>
		</div>
	</header>

	<main class="max-w-lg mx-auto p-4 md:p-6 space-y-6">
		<!-- Profile card -->
		<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
			<div class="flex items-center gap-4">
				<div class="w-14 h-14 rounded-full {authState.isAdmin ? 'bg-amber-500' : 'bg-blue-600'} flex items-center justify-center text-white text-xl font-bold">
					{authState.staff.name.charAt(0).toUpperCase()}
				</div>
				<div>
					<h2 class="text-lg font-semibold text-gray-900">{authState.staff.name}</h2>
					<p class="text-sm text-gray-500">{authState.staff.email}</p>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4 mt-5 text-sm">
				<div>
					<p class="text-gray-500">Role</p>
					<p class="font-medium">
						{#if authState.isAdmin}
							<span class="text-amber-600">Admin</span>
						{:else if authState.role}
							{authState.role.name}
						{:else}
							-
						{/if}
					</p>
				</div>
				<div>
					<p class="text-gray-500">Position</p>
					<p class="font-medium">{authState.staff.position || '-'}</p>
				</div>
			</div>
		</div>

		<!-- Permissions -->
		<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
			<h3 class="text-sm font-semibold text-gray-900 mb-3">My Permissions</h3>
			{#if authState.isAdmin}
				<div class="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
					<span class="material-symbols-rounded text-amber-500 text-lg">star</span>
					<span class="text-sm text-amber-700">Full access (Admin)</span>
				</div>
			{:else if authState.permissions.length > 0}
				<div class="space-y-1.5">
					{#each authState.permissions as perm}
						<div class="flex items-center gap-2 text-sm">
							<span class="material-symbols-rounded text-green-500 text-base">check_circle</span>
							<span class="text-gray-700">{permissionLabels[perm] || perm}</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-gray-500">No permissions assigned. Contact your admin.</p>
			{/if}
		</div>

		<!-- Logout -->
		<button
			onclick={signOut}
			class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors shadow-sm"
		>
			<span class="material-symbols-rounded text-lg">logout</span>
			Logout
		</button>
	</main>
</div>
{/if}

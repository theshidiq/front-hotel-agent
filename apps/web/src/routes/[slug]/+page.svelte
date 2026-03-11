<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { loadGuestPermissions } from '$lib/auth.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	onMount(async () => {
		// Load guest permissions for this org, then go to the front-desk
		await loadGuestPermissions(data.org.id);
		goto('/front-desk', { replaceState: true });
	});
</script>

<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#888;">
	Loading {data.org.display_name ?? data.org.name}…
</div>

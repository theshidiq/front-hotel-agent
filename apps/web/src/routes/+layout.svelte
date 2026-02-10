<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { initAuth } from '$lib/auth.svelte';

	let { children } = $props();

	onMount(() => {
		initAuth();
	});
</script>

<div class="min-h-screen bg-gray-50">
	{@render children()}
</div>

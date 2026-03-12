<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { initAuth } from '$lib/auth.svelte';

	let { children } = $props();

	onMount(() => {
		initAuth();
	});
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0"
	/>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	{@render children()}
</div>

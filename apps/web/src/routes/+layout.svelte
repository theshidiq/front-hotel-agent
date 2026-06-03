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
	<!-- App fonts loaded globally so every page renders identically across OSes.
	     Previously some pages named these fonts but never loaded them, causing
	     OS-specific fallbacks (Mac vs Windows) with different metrics.
	     - Noto Serif JP: vertical menu (was falling back to Hiragino / Yu Mincho)
	     - Instrument Sans: login / signup / setup / landing UI
	     - IBM Plex Sans / Mono: setup wizard
	     - Gloock: landing display headings -->
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;500&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:ital,wght@0,400;0,500;1,400&family=Gloock:ital@0;1&display=swap"
	/>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	{@render children()}
</div>

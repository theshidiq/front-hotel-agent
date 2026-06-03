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
	<!-- Noto Serif JP: load explicitly so the vertical menu renders identically on
	     every OS (Mac would otherwise fall back to Hiragino, Windows to Yu Mincho). -->
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;500&display=swap"
	/>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	{@render children()}
</div>

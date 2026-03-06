<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import {
		authState,
		signInWithGoogle,
		signInWithGoogleIdToken,
	} from "$lib/auth.svelte";

	const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

	let oneTapDismissed = $state(false);
	let signingIn = $state(false);
	let redirected = false;

	const isStaff = $derived(authState.isStaff);

	// Auto-redirect if already authenticated
	$effect(() => {
		if (isStaff && !authState.loading && !redirected) {
			redirected = true;
			goto("/dashboard");
		}
	});

	async function handleOneTapCredential(credential: string) {
		signingIn = true;
		await signInWithGoogleIdToken(credential);
		signingIn = false;
		// If successful, $effect above will redirect
	}

	function initOneTap() {
		if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) {
			oneTapDismissed = true;
			return;
		}

		window.google.accounts.id.initialize({
			client_id: GOOGLE_CLIENT_ID,
			callback: (response: { credential: string }) => {
				handleOneTapCredential(response.credential);
			},
			auto_select: true,
			cancel_on_tap_outside: false,
		});

		window.google.accounts.id.prompt((notification: any) => {
			// Show fallback button if One Tap is not displayed or dismissed
			if (
				notification.isNotDisplayed?.() ||
				notification.isDismissedMoment?.()
			) {
				oneTapDismissed = true;
			}
		});

		// Fallback: show button after 3s in case prompt() never fires the callback
		setTimeout(() => {
			if (!signingIn) oneTapDismissed = true;
		}, 3000);
	}

	onMount(() => {
		// Already authenticated — $effect will handle redirect
		if (authState.isStaff) return;

		if (!GOOGLE_CLIENT_ID) {
			oneTapDismissed = true;
			return;
		}

		// Load Google Identity Services script
		if (window.google?.accounts?.id) {
			initOneTap();
		} else {
			const script = document.createElement("script");
			script.src = "https://accounts.google.com/gsi/client";
			script.async = true;
			script.defer = true;
			script.onload = () => initOneTap();
			script.onerror = () => { oneTapDismissed = true; };
			document.head.appendChild(script);
		}
	});

	function handleFallbackLogin() {
		signInWithGoogle(window.location.origin + "/login");
	}
</script>

<svelte:head>
	<title>ログイン — Sinara</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
	<!-- Logo / Brand -->
	<div class="mb-10 text-center">
		<a href="/" class="inline-block">
			<h1 class="text-3xl font-bold text-white tracking-tight">Sinara</h1>
		</a>
		<p class="mt-2 text-sm text-slate-400">スタッフポータル</p>
	</div>

	<!-- Card -->
	<div class="w-full max-w-sm">
		<!-- Auth error -->
		{#if authState.error}
			<div
				class="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3"
			>
				<span class="material-symbols-rounded text-red-400 shrink-0 text-lg"
					>error</span
				>
				<p class="text-sm text-red-300">{authState.error}</p>
			</div>
		{/if}

		<!-- Loading / signing in -->
		{#if authState.loading || signingIn}
			<div class="flex flex-col items-center gap-4 py-12">
				<span
					class="material-symbols-rounded text-4xl text-blue-400 animate-spin"
					>progress_activity</span
				>
				<p class="text-sm text-slate-400">
					{authState.loading ? "確認中..." : "ログイン中..."}
				</p>
			</div>
		{:else if !isStaff}
			<div
				class="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center"
			>
				<div
					class="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-5"
				>
					<span class="material-symbols-rounded text-2xl text-slate-300"
						>lock</span
					>
				</div>

				<h2 class="text-lg font-semibold text-white mb-1">ログイン</h2>
				<p class="text-sm text-slate-400 mb-7">
					{#if oneTapDismissed}
						Googleアカウントでサインインしてください
					{:else}
						Googleアカウントを確認中...
					{/if}
				</p>

				<!-- Google One Tap renders here automatically — show fallback button when dismissed -->
				{#if oneTapDismissed || !GOOGLE_CLIENT_ID}
					<button
						onclick={handleFallbackLogin}
						class="w-full flex items-center justify-center gap-3 px-4 py-3
							bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-xl
							border border-gray-200 transition-colors shadow-sm"
					>
						<!-- Google "G" icon -->
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 48 48"
							class="w-5 h-5 shrink-0"
						>
							<path
								fill="#EA4335"
								d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
							/>
							<path
								fill="#4285F4"
								d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
							/>
							<path
								fill="#FBBC05"
								d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
							/>
							<path
								fill="#34A853"
								d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
							/>
							<path fill="none" d="M0 0h48v48H0z" />
						</svg>
						Googleでログイン
					</button>
				{:else}
					<!-- Placeholder while One Tap prompt is loading -->
					<div class="flex items-center justify-center gap-2 py-3 text-slate-500 text-sm">
						<span class="material-symbols-rounded text-base animate-pulse"
							>hourglass_empty</span
						>
						Googleアカウントを確認中...
					</div>
					<!-- Show fallback link after a delay -->
					<button
						onclick={() => (oneTapDismissed = true)}
						class="mt-4 text-xs text-slate-600 hover:text-slate-400 transition-colors underline"
					>
						別のアカウントでログイン
					</button>
				{/if}
			</div>

			<!-- Back link -->
			<div class="mt-6 text-center">
				<a
					href="/"
					class="text-xs text-slate-600 hover:text-slate-400 transition-colors"
				>
					← トップページに戻る
				</a>
			</div>
		{/if}
	</div>
</div>

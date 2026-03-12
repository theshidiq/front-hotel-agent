<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authState, signInWithGoogle, signInWithGoogleIdToken, signInWithEmail } from '$lib/auth.svelte';

	const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

	let oneTapDismissed = $state(false);
	let signingIn = $state(false);
	let redirected = false;

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let emailError = $state('');
	let passwordError = $state('');
	let formError = $state('');
	let submitting = $state(false);

	const isStaff = $derived(authState.isStaff);

	$effect(() => {
		if (authState.loading || redirected) return;
		if (isStaff) { redirected = true; goto('/dashboard'); }
	});

	async function handleOneTapCredential(credential: string) {
		signingIn = true;
		await signInWithGoogleIdToken(credential);
		signingIn = false;
	}

	function initOneTap() {
		if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) { oneTapDismissed = true; return; }
		window.google.accounts.id.initialize({
			client_id: GOOGLE_CLIENT_ID,
			callback: (r: { credential: string }) => handleOneTapCredential(r.credential),
			auto_select: true,
			cancel_on_tap_outside: false,
		});
		window.google.accounts.id.prompt((n: any) => {
			if (n.isNotDisplayed?.() || n.isDismissedMoment?.()) oneTapDismissed = true;
		});
		setTimeout(() => { if (!signingIn) oneTapDismissed = true; }, 3000);
	}

	onMount(() => {
		if (authState.isStaff) return;
		if (!GOOGLE_CLIENT_ID) { oneTapDismissed = true; return; }
		if (window.google?.accounts?.id) { initOneTap(); }
		else {
			const s = document.createElement('script');
			s.src = 'https://accounts.google.com/gsi/client';
			s.async = true; s.defer = true;
			s.onload = () => initOneTap();
			s.onerror = () => { oneTapDismissed = true; };
			document.head.appendChild(s);
		}
	});

	function validateEmail(v: string) {
		if (!v) return 'メールアドレスを入力してください';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return '正しいメールアドレスを入力してください';
		return '';
	}

	async function handleEmailLogin() {
		emailError = validateEmail(email);
		passwordError = !password ? 'パスワードを入力してください' : '';
		if (emailError || passwordError) return;
		submitting = true; formError = '';
		const result = await signInWithEmail(email, password);
		submitting = false;
		if (!result.success) { formError = result.error || 'ログインに失敗しました'; }
		else if (!redirected) { redirected = true; goto(authState.isStaff ? '/dashboard' : '/setup'); }
	}

	function handleGoogleLogin() { signInWithGoogle(window.location.origin + '/login'); }
</script>

<svelte:head><title>ログイン — Sinara</title></svelte:head>

<div class="min-h-screen bg-white flex flex-col items-center justify-center px-4" style="font-family:'Instrument Sans',sans-serif;">

	<!-- Brand -->
	<a href="/" class="mb-10 text-center block">
		<div class="text-2xl font-bold text-[#1A2744] tracking-tight">Sinara</div>
		<div class="mt-1 text-sm text-gray-400">スタッフポータル</div>
	</a>

	<!-- Card -->
	<div class="w-full max-w-sm bg-white border border-[#E5E1DA] rounded-2xl p-8" style="border-width:1.5px;">

		<h1 class="text-lg font-semibold text-[#1A2744] mb-6 text-center">ログイン</h1>

		{#if authState.error}
			<div class="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
				<p class="text-sm text-red-600">{authState.error}</p>
			</div>
		{/if}

		{#if authState.loading || signingIn}
			<div class="flex flex-col items-center gap-3 py-10">
				<svg class="w-6 h-6 animate-spin text-[#B8956A]" viewBox="0 0 24 24" fill="none">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
				</svg>
				<p class="text-sm text-gray-400">{authState.loading ? '確認中...' : 'ログイン中...'}</p>
			</div>

		{:else if !isStaff}

			<!-- Google -->
			<button onclick={handleGoogleLogin}
				class="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-5"
				style="border:1.5px solid #E5E1DA; border-radius:8px;">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="w-5 h-5 shrink-0">
					<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
					<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
					<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
					<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
				</svg>
				Googleでログイン
			</button>

			<!-- Divider -->
			<div class="flex items-center gap-3 mb-5">
				<div class="flex-1 h-px bg-[#E5E1DA]"></div>
				<span class="text-xs text-gray-400">または</span>
				<div class="flex-1 h-px bg-[#E5E1DA]"></div>
			</div>

			<!-- Email form -->
			<div class="space-y-3">
				{#if formError}
					<div class="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
						<p class="text-sm text-red-600">{formError}</p>
					</div>
				{/if}

				<div>
					<input type="email" bind:value={email} placeholder="メールアドレス" autocomplete="email"
						oninput={() => { emailError = ''; formError = ''; }}
						class="w-full px-3 py-2.5 text-sm bg-white rounded-lg outline-none placeholder:text-gray-400 text-gray-900 transition-colors"
						style="border:1.5px solid {emailError ? '#f87171' : '#E5E1DA'}; border-radius:8px;"/>
					{#if emailError}<p class="mt-1 text-xs text-red-500">{emailError}</p>{/if}
				</div>

				<div>
					<div class="relative">
						<input type={showPassword ? 'text' : 'password'} bind:value={password} placeholder="パスワード"
							autocomplete="current-password"
							oninput={() => { passwordError = ''; formError = ''; }}
							class="w-full px-3 py-2.5 pr-10 text-sm bg-white rounded-lg outline-none placeholder:text-gray-400 text-gray-900 transition-colors"
							style="border:1.5px solid {passwordError ? '#f87171' : '#E5E1DA'}; border-radius:8px;"/>
						<button type="button" onclick={() => showPassword = !showPassword} tabindex="-1"
							class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
							{#if showPassword}
								<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
									<path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
									<line x1="1" y1="1" x2="23" y2="23"/>
								</svg>
							{:else}
								<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
								</svg>
							{/if}
						</button>
					</div>
					{#if passwordError}<p class="mt-1 text-xs text-red-500">{passwordError}</p>{/if}
				</div>

				<button onclick={handleEmailLogin} disabled={submitting}
					class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
					style="background:#1A2744; color:#F5F1EC; border-radius:8px;">
					{#if submitting}
						<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
						</svg>
						ログイン中...
					{:else}
						ログイン
					{/if}
				</button>

				<div class="text-right pt-0.5">
					<a href="/forgot-password" class="text-xs text-gray-400 hover:text-[#B8956A] transition-colors">
						パスワードをお忘れの方
					</a>
				</div>
			</div>

		{/if}
	</div>

	<!-- Sign up link -->
	<p class="mt-6 text-xs text-gray-400">
		アカウントをお持ちでない方
		<a href="/signup" class="text-[#B8956A] hover:underline ml-1">新規登録</a>
	</p>

</div>

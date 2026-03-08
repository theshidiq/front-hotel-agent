<script lang="ts">
	import { goto } from '$app/navigation';
	import { signUpWithEmail, signInWithGoogle } from '$lib/auth.svelte';

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let showConfirm = $state(false);

	let emailError = $state('');
	let passwordError = $state('');
	let confirmError = $state('');
	let formError = $state('');
	let submitting = $state(false);
	let sent = $state(false);

	function validateEmail(val: string): string {
		if (!val) return 'メールアドレスを入力してください';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return '正しいメールアドレスを入力してください';
		return '';
	}

	async function handleSignup() {
		emailError = validateEmail(email);
		passwordError = password.length < 8 ? 'パスワードは8文字以上で入力してください' : '';
		confirmError = password !== confirmPassword ? 'パスワードが一致しません' : '';
		if (emailError || passwordError || confirmError) return;

		submitting = true;
		formError = '';
		const result = await signUpWithEmail(email, password);
		submitting = false;

		if (!result.success) {
			if (result.error?.includes('すでに登録')) {
				emailError = result.error;
			} else {
				formError = result.error || '登録に失敗しました';
			}
		} else if (result.needsConfirmation) {
			sent = true;
		} else {
			goto('/setup');
		}
	}

	function handleGoogleSignup() {
		signInWithGoogle(window.location.origin + '/login');
	}
</script>

<svelte:head>
	<title>新規登録 — Sinara</title>
</svelte:head>

<div class="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-10" style="font-family: 'Instrument Sans', sans-serif;">

	<div class="mb-8 text-center">
		<a href="/" class="inline-block">
			<h1 class="text-2xl font-bold text-[#1A2744] tracking-tight">Sinara</h1>
		</a>
		<p class="mt-1 text-sm text-gray-500">アカウント作成</p>
	</div>

	{#if sent}
		<div class="w-full max-w-sm text-center py-8">
			<div class="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
				<svg class="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="20 6 9 17 4 12"/>
				</svg>
			</div>
			<h2 class="text-base font-semibold text-gray-900 mb-2">確認メールを送信しました</h2>
			<p class="text-sm text-gray-500 mb-6">メールをご確認ください。<br/>リンクをクリックして登録を完了してください。</p>
			<a href="/login" class="text-sm text-[#B8956A] hover:underline">ログインページへ戻る</a>
		</div>

	{:else}

		<!-- Two-column layout on md+, stacked on mobile -->
		<div class="w-full max-w-2xl">

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-0 md:divide-x md:divide-[#E5E1DA]">

				<!-- Left: Google signup -->
				<div class="flex flex-col items-center justify-center px-6 py-4 gap-4">
					<div class="text-center">
						<p class="text-sm font-medium text-gray-700 mb-1">Googleアカウントで登録</p>
						<p class="text-xs text-gray-400">すばやく簡単に始められます</p>
					</div>
					<button
						onclick={handleGoogleSignup}
						class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-[#E5E1DA] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
						style="border-width: 1.5px; border-radius: 8px;"
					>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="w-5 h-5 shrink-0">
							<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
							<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
							<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
							<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
						</svg>
						Googleで登録
					</button>
				</div>

				<!-- Divider (mobile: horizontal, desktop: vertical via divide-x above) -->
				<div class="flex md:hidden items-center gap-3 px-6">
					<div class="flex-1 h-px bg-[#E5E1DA]"></div>
					<span class="text-xs text-gray-400">または</span>
					<div class="flex-1 h-px bg-[#E5E1DA]"></div>
				</div>
				<div class="hidden md:flex items-center justify-center relative">
					<span class="absolute text-xs text-gray-400 bg-white px-2" style="left: -1px; transform: translateX(-50%);">または</span>
				</div>

				<!-- Right: Email/password signup -->
				<div class="px-6 py-4 space-y-3">
					<div class="text-center mb-1">
						<p class="text-sm font-medium text-gray-700 mb-1">メールアドレスで登録</p>
						<p class="text-xs text-gray-400">メールとパスワードを設定</p>
					</div>

					{#if formError}
						<div class="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
							<p class="text-sm text-red-600">{formError}</p>
						</div>
					{/if}

					<!-- Email -->
					<div>
						<input
							type="email"
							bind:value={email}
							placeholder="メールアドレス"
							autocomplete="email"
							oninput={() => { emailError = ''; formError = ''; }}
							class="w-full px-3 py-2.5 text-sm bg-white rounded-lg outline-none transition-colors placeholder:text-gray-400 text-gray-900"
							style="border: 1.5px solid {emailError ? '#f87171' : '#E5E1DA'}; border-radius: 8px;"
						/>
						{#if emailError}
							<p class="mt-1 text-xs text-red-500">{emailError}</p>
						{/if}
					</div>

					<!-- Password -->
					<div>
						<div class="relative">
							<input
								type={showPassword ? 'text' : 'password'}
								bind:value={password}
								placeholder="パスワード (8文字以上)"
								autocomplete="new-password"
								oninput={() => { passwordError = ''; }}
								class="w-full px-3 py-2.5 pr-10 text-sm bg-white rounded-lg outline-none transition-colors placeholder:text-gray-400 text-gray-900"
								style="border: 1.5px solid {passwordError ? '#f87171' : '#E5E1DA'}; border-radius: 8px;"
							/>
							<button type="button" onclick={() => showPassword = !showPassword}
								class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" tabindex="-1">
								{#if showPassword}
									<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
										<path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
										<line x1="1" y1="1" x2="23" y2="23"/>
									</svg>
								{:else}
									<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
									</svg>
								{/if}
							</button>
						</div>
						{#if passwordError}
							<p class="mt-1 text-xs text-red-500">{passwordError}</p>
						{/if}
					</div>

					<!-- Confirm password -->
					<div>
						<div class="relative">
							<input
								type={showConfirm ? 'text' : 'password'}
								bind:value={confirmPassword}
								placeholder="パスワード（確認）"
								autocomplete="new-password"
								oninput={() => { confirmError = ''; }}
								class="w-full px-3 py-2.5 pr-10 text-sm bg-white rounded-lg outline-none transition-colors placeholder:text-gray-400 text-gray-900"
								style="border: 1.5px solid {confirmError ? '#f87171' : '#E5E1DA'}; border-radius: 8px;"
							/>
							<button type="button" onclick={() => showConfirm = !showConfirm}
								class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" tabindex="-1">
								{#if showConfirm}
									<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
										<path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
										<line x1="1" y1="1" x2="23" y2="23"/>
									</svg>
								{:else}
									<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
									</svg>
								{/if}
							</button>
						</div>
						{#if confirmError}
							<p class="mt-1 text-xs text-red-500">{confirmError}</p>
						{/if}
					</div>

					<!-- Submit -->
					<button
						onclick={handleSignup}
						disabled={submitting}
						class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
						style="background: #1A2744; color: #F5F1EC; border-radius: 8px;"
					>
						{#if submitting}
							<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
							</svg>
							送信中...
						{:else}
							アカウントを作成
						{/if}
					</button>
				</div>

			</div>

			<div class="mt-6 text-center">
				<p class="text-xs text-gray-400">
					すでにアカウントをお持ちの方
					<a href="/login" class="text-[#B8956A] hover:underline ml-1">ログイン</a>
				</p>
			</div>

		</div>
	{/if}
</div>

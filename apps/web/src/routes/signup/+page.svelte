<script lang="ts">
	import { goto } from '$app/navigation';
	import { signUpWithEmail } from '$lib/auth.svelte';

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
			// Email confirmation disabled — immediately redirect to setup
			goto('/setup');
		}
	}
</script>

<svelte:head>
	<title>新規登録 — Sinara</title>
</svelte:head>

<div class="min-h-screen bg-white flex flex-col items-center justify-center px-4" style="font-family: 'Instrument Sans', sans-serif;">

	<div class="mb-8 text-center">
		<a href="/" class="inline-block">
			<h1 class="text-2xl font-bold text-[#1A2744] tracking-tight">Sinara</h1>
		</a>
		<p class="mt-1 text-sm text-gray-500">アカウント作成</p>
	</div>

	<div class="w-full max-w-sm">

		{#if sent}
			<!-- Success state -->
			<div class="text-center py-8">
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

			<div class="space-y-3">

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
						{#if showPassword}
							<input
								type="text"
								bind:value={password}
								placeholder="パスワード (8文字以上)"
								autocomplete="new-password"
								oninput={() => { passwordError = ''; }}
								class="w-full px-3 py-2.5 pr-10 text-sm bg-white rounded-lg outline-none transition-colors placeholder:text-gray-400 text-gray-900"
								style="border: 1.5px solid {passwordError ? '#f87171' : '#E5E1DA'}; border-radius: 8px;"
							/>
						{:else}
							<input
								type="password"
								bind:value={password}
								placeholder="パスワード (8文字以上)"
								autocomplete="new-password"
								oninput={() => { passwordError = ''; }}
								class="w-full px-3 py-2.5 pr-10 text-sm bg-white rounded-lg outline-none transition-colors placeholder:text-gray-400 text-gray-900"
								style="border: 1.5px solid {passwordError ? '#f87171' : '#E5E1DA'}; border-radius: 8px;"
							/>
						{/if}
						<button
							type="button"
							onclick={() => showPassword = !showPassword}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
							tabindex="-1"
						>
							{#if showPassword}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
									<path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
									<line x1="1" y1="1" x2="23" y2="23"/>
								</svg>
							{:else}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
									<circle cx="12" cy="12" r="3"/>
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
						{#if showConfirm}
							<input
								type="text"
								bind:value={confirmPassword}
								placeholder="パスワード（確認）"
								autocomplete="new-password"
								oninput={() => { confirmError = ''; }}
								class="w-full px-3 py-2.5 pr-10 text-sm bg-white rounded-lg outline-none transition-colors placeholder:text-gray-400 text-gray-900"
								style="border: 1.5px solid {confirmError ? '#f87171' : '#E5E1DA'}; border-radius: 8px;"
							/>
						{:else}
							<input
								type="password"
								bind:value={confirmPassword}
								placeholder="パスワード（確認）"
								autocomplete="new-password"
								oninput={() => { confirmError = ''; }}
								class="w-full px-3 py-2.5 pr-10 text-sm bg-white rounded-lg outline-none transition-colors placeholder:text-gray-400 text-gray-900"
								style="border: 1.5px solid {confirmError ? '#f87171' : '#E5E1DA'}; border-radius: 8px;"
							/>
						{/if}
						<button
							type="button"
							onclick={() => showConfirm = !showConfirm}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
							tabindex="-1"
						>
							{#if showConfirm}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
									<path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
									<line x1="1" y1="1" x2="23" y2="23"/>
								</svg>
							{:else}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
									<circle cx="12" cy="12" r="3"/>
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
					style="background: #1A2744; color: #F5F1EC; border-radius: 8px; margin-top: 4px;"
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

			<div class="mt-6 text-center">
				<p class="text-xs text-gray-400">
					すでにアカウントをお持ちの方
					<a href="/login" class="text-[#B8956A] hover:underline ml-1">ログイン</a>
				</p>
			</div>

		{/if}
	</div>
</div>

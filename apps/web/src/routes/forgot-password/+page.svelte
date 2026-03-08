<script lang="ts">
	import { resetPasswordForEmail } from '$lib/auth.svelte';

	let email = $state('');
	let emailError = $state('');
	let formError = $state('');
	let submitting = $state(false);
	let sent = $state(false);

	function validateEmail(val: string): string {
		if (!val) return 'メールアドレスを入力してください';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return '正しいメールアドレスを入力してください';
		return '';
	}

	async function handleReset() {
		emailError = validateEmail(email);
		if (emailError) return;

		submitting = true;
		formError = '';
		const result = await resetPasswordForEmail(email);
		submitting = false;

		if (!result.success) {
			formError = result.error || 'メール送信に失敗しました';
		} else {
			sent = true;
		}
	}
</script>

<svelte:head>
	<title>パスワードをお忘れの方 — Sinara</title>
</svelte:head>

<div class="min-h-screen bg-white flex flex-col items-center justify-center px-4" style="font-family: 'Instrument Sans', sans-serif;">

	<div class="mb-8 text-center">
		<a href="/" class="inline-block">
			<h1 class="text-2xl font-bold text-[#1A2744] tracking-tight">Sinara</h1>
		</a>
		<p class="mt-1 text-sm text-gray-500">パスワードのリセット</p>
	</div>

	<div class="w-full max-w-sm">

		{#if sent}
			<!-- Success -->
			<div class="text-center py-8">
				<div class="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
					<svg class="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="20 6 9 17 4 12"/>
					</svg>
				</div>
				<h2 class="text-base font-semibold text-gray-900 mb-2">メールを送信しました</h2>
				<p class="text-sm text-gray-500 mb-6">パスワードリセット用のメールを送信しました。<br/>メールをご確認ください。</p>
				<a href="/login" class="text-sm text-[#B8956A] hover:underline">ログインページへ戻る</a>
			</div>

		{:else}

			<p class="text-sm text-gray-500 mb-5">
				登録したメールアドレスを入力してください。パスワードリセット用のリンクを送信します。
			</p>

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

				<!-- Submit -->
				<button
					onclick={handleReset}
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
						リセットリンクを送信
					{/if}
				</button>
			</div>

			<div class="mt-6 text-center">
				<a href="/login" class="text-xs text-gray-400 hover:text-[#B8956A] transition-colors">
					← ログインに戻る
				</a>
			</div>

		{/if}
	</div>
</div>

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authState, signInWithGoogle, setPendingStaffEmail } from '$lib/auth.svelte';
	import { getStaffs, updateStaffEmail, createStaff, type StaffMember } from '$lib/api';

	let staffList = $state<StaffMember[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');
	let error = $state<string | null>(null);

	// Email input modal
	let selectedStaff = $state<StaffMember | null>(null);
	let emailInput = $state('');
	let emailSaving = $state(false);

	// Registration form
	let showRegForm = $state(false);
	let regName = $state('');
	let regEmail = $state('');
	let regPosition = $state('スタッフ');
	let regLoading = $state(false);

	// Signing in state
	let signingInEmail = $state<string | null>(null);

	const isStaff = $derived(authState.isStaff);

	// Redirect to home when authenticated as staff
	$effect(() => {
		if (isStaff && !authState.loading) {
			goto('/');
		}
	});

	const filteredStaffs = $derived(
		staffList.filter(
			(s) =>
				s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()))
		)
	);

	async function loadStaffs() {
		loading = true;
		error = null;
		try {
			staffList = await getStaffs();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'スタッフリストの取得に失敗しました';
		} finally {
			loading = false;
		}
	}

	function openEmailModal(staff: StaffMember) {
		selectedStaff = staff;
		emailInput = staff.email || '';
		error = null;
	}

	function closeEmailModal() {
		selectedStaff = null;
		emailInput = '';
		emailSaving = false;
	}

	async function handleEmailSubmit() {
		if (!selectedStaff || !emailInput.trim()) return;

		const email = emailInput.trim().toLowerCase();
		emailSaving = true;
		error = null;

		try {
			// Update email in DB if changed or new
			if (email !== (selectedStaff.email || '').toLowerCase()) {
				const updated = await updateStaffEmail(selectedStaff.id, email);
				// Update local list
				staffList = staffList.map((s) => (s.id === updated.id ? updated : s));
			}

			// Proceed with Google OAuth
			signingInEmail = email;
			setPendingStaffEmail(email);
			closeEmailModal();
			signInWithGoogle(window.location.origin + '/login');
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'メールアドレスの更新に失敗しました';
			emailSaving = false;
		}
	}

	async function handleRegister() {
		if (!regName.trim() || !regEmail.trim()) return;
		regLoading = true;
		error = null;
		try {
			const newStaff = await createStaff({
				name: regName.trim(),
				email: regEmail.trim().toLowerCase(),
				position: regPosition,
			});
			staffList = [...staffList, newStaff];
			regName = '';
			regEmail = '';
			regPosition = 'スタッフ';
			showRegForm = false;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'スタッフ登録に失敗しました';
		} finally {
			regLoading = false;
		}
	}

	function getInitial(name: string): string {
		return name.charAt(0).toUpperCase();
	}

	const avatarColors = [
		'bg-blue-600',
		'bg-emerald-600',
		'bg-purple-600',
		'bg-rose-600',
		'bg-amber-600',
		'bg-cyan-600',
		'bg-indigo-600',
		'bg-pink-600',
	];

	function getAvatarColor(index: number): string {
		return avatarColors[index % avatarColors.length];
	}

	onMount(() => {
		loadStaffs();
	});
</script>

<div class="min-h-screen bg-slate-900 flex flex-col">
	<!-- Header -->
	<header class="border-b border-slate-700 px-6 py-4">
		<div class="max-w-4xl mx-auto flex items-center justify-between">
			<div class="flex items-center gap-4">
				<a
					href="/"
					class="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
				>
					<span class="material-symbols-rounded text-lg">arrow_back</span>
					<span class="text-sm">戻る</span>
				</a>
			</div>
			<div class="text-center">
				<h1 class="text-xl font-bold text-white">湖南荘</h1>
				<p class="text-xs text-slate-400">スタッフログイン</p>
			</div>
			<div class="w-16"></div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex-1 px-6 py-8">
		<div class="max-w-4xl mx-auto">
			<!-- Auth Error -->
			{#if authState.error}
				<div class="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
					<span class="material-symbols-rounded text-red-400 shrink-0">error</span>
					<div>
						<p class="text-sm text-red-300">{authState.error}</p>
					</div>
				</div>
			{/if}

			<!-- Local Error -->
			{#if error}
				<div class="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
					<span class="material-symbols-rounded text-red-400 shrink-0">error</span>
					<p class="text-sm text-red-300">{error}</p>
				</div>
			{/if}

			<!-- Auth Loading -->
			{#if authState.loading}
				<div class="flex flex-col items-center justify-center py-16 gap-4">
					<span class="material-symbols-rounded text-4xl text-blue-400 animate-pulse">hourglass_empty</span>
					<p class="text-slate-400">認証中...</p>
				</div>
			{:else}
				<!-- Search -->
				<div class="mb-6">
					<div class="relative">
						<span class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="スタッフを検索..."
							class="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white
								placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
				</div>

				<!-- Staff Grid -->
				{#if loading}
					<div class="flex flex-col items-center justify-center py-16 gap-4">
						<span class="material-symbols-rounded text-4xl text-slate-400 animate-pulse">group</span>
						<p class="text-slate-400">スタッフを読み込み中...</p>
					</div>
				{:else if filteredStaffs.length === 0}
					<div class="flex flex-col items-center justify-center py-16 gap-4">
						<span class="material-symbols-rounded text-4xl text-slate-500">person_off</span>
						<p class="text-slate-400">
							{searchQuery ? 'スタッフが見つかりません' : 'スタッフが登録されていません'}
						</p>
					</div>
				{:else}
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
						{#each filteredStaffs as staff, i}
							<button
								onclick={() => openEmailModal(staff)}
								disabled={signingInEmail !== null}
								class="flex flex-col items-center gap-3 p-5 bg-slate-800 border border-slate-700
									rounded-xl hover:bg-slate-750 hover:border-blue-500/50 transition-all
									disabled:opacity-50 disabled:cursor-not-allowed group"
							>
								<div
									class="w-14 h-14 rounded-full {getAvatarColor(i)} flex items-center justify-center
										text-white text-xl font-bold group-hover:scale-110 transition-transform"
								>
									{getInitial(staff.name)}
								</div>
								<div class="text-center min-w-0 w-full">
									<p class="text-sm font-medium text-white truncate">{staff.name}</p>
									<p class="text-xs text-slate-400 truncate">{staff.position || 'スタッフ'}</p>
								</div>
								{#if signingInEmail && signingInEmail === (staff.email || '')}
									<span class="text-xs text-blue-400 flex items-center gap-1">
										<span class="material-symbols-rounded text-sm animate-spin">progress_activity</span>
										ログイン中...
									</span>
								{:else}
									<span
										class="text-xs text-slate-500 group-hover:text-blue-400 flex items-center gap-1 transition-colors"
									>
										<span class="material-symbols-rounded text-sm">login</span>
										{staff.email ? 'ログイン' : 'メール設定'}
									</span>
								{/if}
							</button>
						{/each}
					</div>
				{/if}

				<!-- Staff Registration (only for authenticated staff) -->
				{#if isStaff}
					<div class="border-t border-slate-700 pt-6">
						{#if showRegForm}
							<div class="bg-slate-800 border border-slate-700 rounded-xl p-6">
								<div class="flex items-center justify-between mb-4">
									<h3 class="text-sm font-medium text-white flex items-center gap-2">
										<span class="material-symbols-rounded text-lg">person_add</span>
										新しいスタッフを登録
									</h3>
									<button
										onclick={() => (showRegForm = false)}
										class="p-1 text-slate-400 hover:text-white transition-colors"
									>
										<span class="material-symbols-rounded text-lg">close</span>
									</button>
								</div>
								<form
									onsubmit={(e) => {
										e.preventDefault();
										handleRegister();
									}}
									class="grid grid-cols-1 sm:grid-cols-2 gap-4"
								>
									<div>
										<label for="reg-name" class="block text-xs text-slate-400 mb-1">名前</label>
										<input
											id="reg-name"
											type="text"
											bind:value={regName}
											required
											placeholder="山田 太郎"
											class="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-white text-sm
												placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									</div>
									<div>
										<label for="reg-email" class="block text-xs text-slate-400 mb-1">メールアドレス</label>
										<input
											id="reg-email"
											type="email"
											bind:value={regEmail}
											required
											placeholder="tanaka@example.com"
											class="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-white text-sm
												placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									</div>
									<div>
										<label for="reg-position" class="block text-xs text-slate-400 mb-1">役職</label>
										<input
											id="reg-position"
											type="text"
											bind:value={regPosition}
											required
											placeholder="スタッフ"
											class="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-white text-sm
												placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									</div>
									<div class="flex items-end">
										<button
											type="submit"
											disabled={regLoading || !regName.trim() || !regEmail.trim()}
											class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium
												rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed
												flex items-center justify-center gap-2"
										>
											{#if regLoading}
												<span class="material-symbols-rounded text-sm animate-spin">progress_activity</span>
												登録中...
											{:else}
												<span class="material-symbols-rounded text-sm">person_add</span>
												登録
											{/if}
										</button>
									</div>
								</form>
							</div>
						{:else}
							<button
								onclick={() => (showRegForm = true)}
								class="w-full flex items-center justify-center gap-2 py-3 text-sm text-slate-400
									hover:text-blue-400 transition-colors border border-dashed border-slate-700
									hover:border-blue-500/50 rounded-xl"
							>
								<span class="material-symbols-rounded text-lg">person_add</span>
								新しいスタッフを追加
							</button>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	</main>
</div>

<!-- Email Input Modal -->
{#if selectedStaff}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<!-- Backdrop -->
		<button
			class="absolute inset-0 bg-black/60 backdrop-blur-sm"
			onclick={closeEmailModal}
			aria-label="閉じる"
		></button>

		<!-- Modal -->
		<div class="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
			<button
				onclick={closeEmailModal}
				class="absolute top-4 right-4 p-1 text-slate-400 hover:text-white transition-colors"
			>
				<span class="material-symbols-rounded text-lg">close</span>
			</button>

			<!-- Staff info -->
			<div class="flex flex-col items-center gap-3 mb-6">
				<div
					class="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center
						text-white text-2xl font-bold"
				>
					{getInitial(selectedStaff.name)}
				</div>
				<div class="text-center">
					<p class="text-lg font-medium text-white">{selectedStaff.name}</p>
					<p class="text-sm text-slate-400">{selectedStaff.position || 'スタッフ'}</p>
				</div>
			</div>

			<!-- Email form -->
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleEmailSubmit();
				}}
			>
				<label for="staff-email" class="block text-sm text-slate-300 mb-2">
					Googleアカウントのメールアドレス
				</label>
				<input
					id="staff-email"
					type="email"
					bind:value={emailInput}
					required
					placeholder="example@gmail.com"
					class="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white
						placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
				/>
				{#if selectedStaff.email}
					<p class="text-xs text-slate-500 mb-4 -mt-2">
						現在のメール: {selectedStaff.email}
					</p>
				{/if}
				<button
					type="submit"
					disabled={emailSaving || !emailInput.trim()}
					class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium
						rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
						flex items-center justify-center gap-2"
				>
					{#if emailSaving}
						<span class="material-symbols-rounded text-sm animate-spin">progress_activity</span>
						保存中...
					{:else}
						<span class="material-symbols-rounded text-sm">login</span>
						Googleでログイン
					{/if}
				</button>
			</form>
		</div>
	</div>
{/if}

<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import {
		getReservationByQR,
		getAllergens,
		updateReservationByToken,
		type Reservation,
		type Allergen,
		type GuestUpdateData,
	} from '$lib/api';

	// Get token from URL
	let token = $derived($page.params.token);

	// State
	let reservation = $state<Reservation | null>(null);
	let allergens = $state<Allergen[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let saving = $state(false);
	let saved = $state(false);

	// Form state
	let selectedAllergenIds = $state<string[]>([]);
	let dietaryNotes = $state('');
	let specialRequests = $state('');

	// Group allergens by category
	let allergensByCategory = $derived(() => {
		const grouped: Record<string, Allergen[]> = {};
		for (const allergen of allergens) {
			if (!grouped[allergen.category]) {
				grouped[allergen.category] = [];
			}
			grouped[allergen.category].push(allergen);
		}
		return grouped;
	});

	const categoryLabels: Record<string, string> = {
		grain: '穀類',
		egg: '卵',
		dairy: '乳製品',
		meat: '肉類',
		fish: '魚介類',
		shellfish: '甲殻類',
		nut: 'ナッツ類',
		legume: '豆類',
		other: 'その他',
	};

	// Load data
	async function loadData() {
		loading = true;
		error = null;

		try {
			const [reservationData, allergensData] = await Promise.all([
				getReservationByQR(token),
				getAllergens(),
			]);

			reservation = reservationData;
			allergens = allergensData;

			// Initialize form with existing data
			selectedAllergenIds = reservation.allergen_ids || [];
			dietaryNotes = reservation.dietary_notes || '';
			specialRequests = reservation.special_requests || '';
		} catch (e) {
			error = e instanceof Error ? e.message : '予約情報の取得に失敗しました';
		} finally {
			loading = false;
		}
	}

	// Toggle allergen selection
	function toggleAllergen(allergenId: string) {
		if (selectedAllergenIds.includes(allergenId)) {
			selectedAllergenIds = selectedAllergenIds.filter((id) => id !== allergenId);
		} else {
			selectedAllergenIds = [...selectedAllergenIds, allergenId];
		}
		saved = false;
	}

	// Save allergen information
	async function handleSave() {
		if (!reservation) return;

		saving = true;
		try {
			const data: GuestUpdateData = {
				allergen_ids: selectedAllergenIds,
				dietary_notes: dietaryNotes,
				special_requests: specialRequests,
			};

			reservation = await updateReservationByToken(token, data);
			saved = true;
		} catch (e) {
			alert(e instanceof Error ? e.message : '保存に失敗しました');
		} finally {
			saving = false;
		}
	}

	// Format date
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		const days = ['日', '月', '火', '水', '木', '金', '土'];
		return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${days[date.getDay()]}）`;
	}

	onMount(() => {
		loadData();
	});
</script>

<svelte:head>
	<title>ご予約情報 - 湖南荘</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="min-h-screen bg-stone-50 font-['Noto_Sans_JP',sans-serif]">
	<!-- Header -->
	<header class="bg-stone-800 text-white py-6">
		<div class="max-w-lg mx-auto px-4 text-center">
			<h1 class="text-2xl font-bold">湖南荘</h1>
			<p class="text-stone-300 text-sm mt-1">Konan-so Ryokan</p>
		</div>
	</header>

	<main class="max-w-lg mx-auto px-4 py-6">
		{#if loading}
			<div class="bg-white rounded-xl shadow-sm p-8 text-center">
				<div class="animate-spin rounded-full h-10 w-10 border-b-2 border-stone-600 mx-auto"></div>
				<p class="mt-4 text-stone-500">読み込み中...</p>
			</div>
		{:else if error}
			<div class="bg-white rounded-xl shadow-sm p-8 text-center">
				<div class="text-red-500 mb-4">
					<svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<h2 class="text-lg font-bold text-stone-800 mb-2">エラー</h2>
				<p class="text-stone-600">{error}</p>
			</div>
		{:else if reservation}
			<!-- Reservation Info Card -->
			<div class="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
				<div class="bg-stone-800 text-white px-6 py-4">
					<p class="text-stone-300 text-sm">ご予約情報</p>
					<h2 class="text-xl font-bold mt-1">{reservation.guest_name} 様</h2>
				</div>
				<div class="p-6 space-y-4">
					<div class="flex justify-between items-center py-2 border-b border-stone-100">
						<span class="text-stone-500">お部屋</span>
						<span class="font-medium">
							{reservation.room_number}号室
							{#if reservation.room_name}
								<span class="text-stone-500">（{reservation.room_name}）</span>
							{/if}
						</span>
					</div>
					<div class="flex justify-between items-center py-2 border-b border-stone-100">
						<span class="text-stone-500">チェックイン</span>
						<span class="font-medium">{formatDate(reservation.check_in_date)}</span>
					</div>
					<div class="flex justify-between items-center py-2 border-b border-stone-100">
						<span class="text-stone-500">チェックアウト</span>
						<span class="font-medium">{formatDate(reservation.check_out_date)}</span>
					</div>
					<div class="flex justify-between items-center py-2 border-b border-stone-100">
						<span class="text-stone-500">人数</span>
						<span class="font-medium">{reservation.party_size}名様</span>
					</div>
					{#if reservation.plan_name}
						<div class="flex justify-between items-center py-2 border-b border-stone-100">
							<span class="text-stone-500">プラン</span>
							<span class="font-medium">{reservation.plan_name}</span>
						</div>
					{/if}
					{#if reservation.meal_plan}
						<div class="flex justify-between items-center py-2">
							<span class="text-stone-500">お食事</span>
							<span class="font-medium">{reservation.meal_plan}</span>
						</div>
					{/if}

					{#if reservation.status === 'checked_in'}
						{#if reservation.dinner_time}
							<div class="flex justify-between items-center py-2 border-t border-stone-100">
								<span class="text-stone-500">夕食時間</span>
								<span class="font-medium text-amber-600">{reservation.dinner_time}</span>
							</div>
						{/if}
						{#if reservation.breakfast_time}
							<div class="flex justify-between items-center py-2">
								<span class="text-stone-500">朝食時間</span>
								<span class="font-medium text-amber-600">{reservation.breakfast_time}</span>
							</div>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Allergen Form -->
			<div class="bg-white rounded-xl shadow-sm overflow-hidden">
				<div class="px-6 py-4 border-b border-stone-100">
					<h3 class="font-bold text-stone-800">アレルギー情報</h3>
					<p class="text-sm text-stone-500 mt-1">
						お食事でお避けになりたい食材をお選びください
					</p>
				</div>

				<div class="p-6 space-y-6">
					{#each Object.entries(allergensByCategory()) as [category, categoryAllergens]}
						<div>
							<h4 class="text-sm font-medium text-stone-600 mb-3">
								{categoryLabels[category] || category}
							</h4>
							<div class="flex flex-wrap gap-2">
								{#each categoryAllergens as allergen (allergen.id)}
									<button
										type="button"
										onclick={() => toggleAllergen(allergen.id)}
										class="px-4 py-2 text-sm rounded-full border-2 transition-all {selectedAllergenIds.includes(
											allergen.id
										)
											? 'bg-red-50 border-red-400 text-red-700 font-medium'
											: 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'}"
									>
										{allergen.name}
									</button>
								{/each}
							</div>
						</div>
					{/each}

					<!-- Selected allergens summary -->
					{#if selectedAllergenIds.length > 0}
						<div class="bg-red-50 rounded-lg p-4">
							<p class="text-sm font-medium text-red-800 mb-2">選択中のアレルギー:</p>
							<div class="flex flex-wrap gap-1">
								{#each selectedAllergenIds as id}
									{@const allergen = allergens.find((a) => a.id === id)}
									{#if allergen}
										<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-sm">
											{allergen.name}
										</span>
									{/if}
								{/each}
							</div>
						</div>
					{/if}

					<!-- Dietary Notes -->
					<div>
						<label for="dietary-notes" class="block text-sm font-medium text-stone-700 mb-2">
							その他の食事制限・ご要望
						</label>
						<textarea
							id="dietary-notes"
							bind:value={dietaryNotes}
							rows="3"
							placeholder="ベジタリアン、宗教上の理由など..."
							class="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
							oninput={() => (saved = false)}
						></textarea>
					</div>

					<!-- Special Requests -->
					<div>
						<label for="special-requests" class="block text-sm font-medium text-stone-700 mb-2">
							特別なリクエスト
						</label>
						<textarea
							id="special-requests"
							bind:value={specialRequests}
							rows="3"
							placeholder="お祝い、お子様用の椅子など..."
							class="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
							oninput={() => (saved = false)}
						></textarea>
					</div>

					<!-- Save Button -->
					<button
						onclick={handleSave}
						disabled={saving}
						class="w-full py-4 rounded-lg font-medium text-white transition-all {saved
							? 'bg-green-600'
							: 'bg-stone-800 hover:bg-stone-700'} disabled:opacity-50"
					>
						{#if saving}
							保存中...
						{:else if saved}
							保存しました
						{:else}
							アレルギー情報を保存
						{/if}
					</button>
				</div>
			</div>

			<!-- Footer Note -->
			<div class="mt-6 text-center text-sm text-stone-500">
				<p>ご不明な点がございましたら、</p>
				<p>フロントまでお気軽にお問い合わせください。</p>
			</div>
		{/if}
	</main>
</div>

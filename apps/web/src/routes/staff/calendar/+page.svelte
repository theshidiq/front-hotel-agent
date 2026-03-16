<script lang="ts">
	import { getShiftStaff } from '$lib/shifts/api';
	import { getDepartments, type OrgDepartment } from '$lib/api';
	import { authState } from '$lib/auth.svelte';
	import type { ScheduleStaff } from '$lib/shifts/types';

	let staffList = $state<ScheduleStaff[]>([]);
	let departments = $state<OrgDepartment[]>([]);
	let activeDeptId = $state<string | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchQuery = $state('');

	const filteredStaff = $derived(
		staffList.filter((s) => {
			const matchesDept = !activeDeptId || s.department_id === activeDeptId;
			const q = searchQuery.toLowerCase();
			const matchesSearch =
				!q ||
				s.name.toLowerCase().includes(q) ||
				(s.position && s.position.toLowerCase().includes(q));
			return matchesDept && matchesSearch && s.is_active;
		})
	);

	const avatarColors = [
		'bg-blue-500',
		'bg-emerald-500',
		'bg-purple-500',
		'bg-rose-500',
		'bg-amber-500',
		'bg-cyan-500',
		'bg-indigo-500',
		'bg-pink-500',
	];

	function getAvatarColor(index: number): string {
		return avatarColors[index % avatarColors.length];
	}

	function getInitial(name: string): string {
		return name.charAt(0).toUpperCase();
	}

	async function load() {
		loading = true;
		error = null;
		try {
			const [staff, depts] = await Promise.all([
				getShiftStaff(),
				getDepartments(),
			]);
			staffList = staff;
			departments = depts;
			if (depts.length > 0) activeDeptId = depts[0].id;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'データの取得に失敗しました';
		} finally {
			loading = false;
		}
	}

	let initialized = $state(false);
	$effect(() => {
		if (authState.loading || initialized) return;
		initialized = true;
		load();
	});
</script>

<svelte:head>
	<title>シフトカレンダー</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col font-['Noto_Sans_JP',sans-serif]">
	<!-- Header -->
	<header class="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-10">
		<div class="max-w-4xl mx-auto">
			<div class="flex items-center justify-between mb-3">
				<a
					href="/"
					class="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors text-sm"
				>
					<span class="material-symbols-rounded text-lg">arrow_back</span>
					<span>戻る</span>
				</a>
				<div class="text-center">
					<h1 class="text-lg font-bold text-gray-900">シフトカレンダー</h1>
					<p class="text-xs text-gray-500">Shift Calendar</p>
				</div>
				<div class="w-14"></div>
			</div>
			<!-- Search -->
			<div class="relative mb-3">
				<span class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="スタッフを検索..."
					class="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 text-sm
						placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>
			<!-- Department filter tabs -->
			{#if departments.length > 1}
				<div class="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
					<button
						onclick={() => activeDeptId = null}
						class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
							{activeDeptId === null ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
					>
						すべて
					</button>
					{#each departments as dept}
						<button
							onclick={() => activeDeptId = dept.id}
							class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
								{activeDeptId === dept.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
						>
							{dept.name}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex-1 px-4 sm:px-6 py-6">
		<div class="max-w-4xl mx-auto">
			{#if error}
				<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
					<span class="material-symbols-rounded text-red-500 shrink-0">error</span>
					<p class="text-sm text-red-700">{error}</p>
				</div>
			{/if}

			{#if loading}
				<div class="flex flex-col items-center justify-center py-20 gap-4">
					<span class="material-symbols-rounded text-4xl text-gray-300 animate-pulse">group</span>
					<p class="text-sm text-gray-400">スタッフを読み込み中...</p>
				</div>
			{:else if filteredStaff.length === 0}
				<div class="flex flex-col items-center justify-center py-20 gap-4">
					<span class="material-symbols-rounded text-4xl text-gray-300">person_off</span>
					<p class="text-sm text-gray-400">
						{searchQuery ? 'スタッフが見つかりません' : 'スタッフが登録されていません'}
					</p>
				</div>
			{:else}
				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
					{#each filteredStaff as staff, i}
						<a
							href="/staff/{staff.id}/calendar"
							class="flex flex-col items-center gap-3 p-4 sm:p-5 bg-white border border-gray-200
								rounded-xl hover:border-blue-400 hover:shadow-md transition-all group"
						>
							<div
								class="w-12 h-12 sm:w-14 sm:h-14 rounded-full {getAvatarColor(i)} flex items-center justify-center
									text-white text-lg sm:text-xl font-bold group-hover:scale-110 transition-transform"
							>
								{getInitial(staff.name)}
							</div>
							<div class="text-center min-w-0 w-full">
								<p class="text-sm font-medium text-gray-900 truncate">{staff.name}</p>
								<p class="text-xs text-gray-500 truncate">{staff.position || staff.status || 'スタッフ'}</p>
							</div>
							<span class="text-xs text-gray-400 group-hover:text-blue-500 flex items-center gap-1 transition-colors">
								<span class="material-symbols-rounded text-sm">calendar_month</span>
								カレンダー
							</span>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</main>
</div>

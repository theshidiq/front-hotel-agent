<script lang="ts">
	import {
		getDepartments, createDepartment, updateDepartment, deleteDepartment,
		createPosition, updatePosition, deletePosition,
		getAllStaffs, createStaff, updateStaffOrg, updateStaffRole, updateStaffAdmin, deactivateStaff,
		getRoles,
		type OrgDepartment, type OrgPosition, type StaffMember, type Role, type PeriodJson,
	} from '$lib/api';

	// ── State ───────────────────────────────────────────────────
	let departments = $state<OrgDepartment[]>([]);
	let allStaff    = $state<StaffMember[]>([]);
	let roles       = $state<Role[]>([]);
	let loading     = $state(true);
	let error       = $state('');
	let saving      = $state(false);
	let feedback    = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// Selected department
	let selectedDeptId = $state<string | null>(null);

	// Dept editing
	let editingDeptId   = $state<string | null>(null);
	let editingDeptName = $state('');
	let editingDeptColor = $state('#6366f1');
	let showNewDept     = $state(false);
	let newDeptName     = $state('');
	let newDeptColor    = $state('#6366f1');

	// Position editing (right panel)
	let editingPosId   = $state<string | null>(null);
	let editingPosName = $state('');
	let showNewPos     = $state(false);
	let newPosName     = $state('');

	// Confirm modal
	let confirmModal = $state<{ message: string; detail?: string; onConfirm: () => void } | null>(null);

	// Staff editing (right panel)
	let editingStaffId = $state<string | null>(null);
	let editingStaff   = $state<{ name: string; position_id: string; role_id: string; is_active: boolean; employment_type: string; start_period: PeriodJson | null; end_period: PeriodJson | null }>({
		name: '', position_id: '', role_id: '', is_active: true,
		employment_type: '', start_period: null, end_period: null,
	});
	let showNewStaff   = $state(false);
	let newStaff       = $state({ name: '', email: '', position_id: '' });
	let staffFilter    = $state<'active' | 'inactive' | 'all'>('active');

	// ── Derived ─────────────────────────────────────────────────
	const selectedDept = $derived(() => departments.find(d => d.id === selectedDeptId) ?? null);

	const deptStaff = $derived(() => {
		if (!selectedDeptId) return [];
		const inDept = allStaff.filter(s => s.department_id === selectedDeptId);
		if (staffFilter === 'active') return inDept.filter(s => s.is_active);
		if (staffFilter === 'inactive') return inDept.filter(s => !s.is_active);
		return inDept;
	});

	const deptStaffCounts = $derived(() => {
		if (!selectedDeptId) return { active: 0, inactive: 0, all: 0 };
		const inDept = allStaff.filter(s => s.department_id === selectedDeptId);
		return { active: inDept.filter(s => s.is_active).length, inactive: inDept.filter(s => !s.is_active).length, all: inDept.length };
	});

	const unassignedStaff = $derived(() => allStaff.filter(s => !s.department_id));

	const staffCountByDept = $derived(() => {
		const map: Record<string, number> = {};
		allStaff.forEach(s => {
			if (s.department_id) map[s.department_id] = (map[s.department_id] ?? 0) + 1;
		});
		return map;
	});

	// ── Load ────────────────────────────────────────────────────
	async function load() {
		loading = true; error = '';
		try {
			[departments, allStaff, roles] = await Promise.all([getDepartments(), getAllStaffs(), getRoles()]);
			// Auto-select first dept if none selected
			if (!selectedDeptId && departments.length > 0) selectedDeptId = departments[0].id;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load';
		} finally { loading = false; }
	}

	$effect(() => { load(); });

	// ── Helpers ─────────────────────────────────────────────────
	function showFeedback(type: 'success' | 'error', text: string) {
		feedback = { type, text };
		setTimeout(() => { feedback = null; }, 3000);
	}

	function getRoleName(id: string | null) {
		return roles.find(r => r.id === id)?.name ?? null;
	}

	// ── Dept actions ────────────────────────────────────────────
	async function saveDept() {
		if (!newDeptName.trim()) return;
		saving = true;
		try {
			const d = await createDepartment(newDeptName.trim(), newDeptColor);
			newDeptName = ''; newDeptColor = '#6366f1'; showNewDept = false;
			await load();
			selectedDeptId = d.id;
			showFeedback('success', '部署を追加しました');
		} catch (e) { showFeedback('error', e instanceof Error ? e.message : '失敗しました'); }
		finally { saving = false; }
	}

	async function saveEditDept(id: string) {
		saving = true;
		try {
			await updateDepartment(id, { name: editingDeptName.trim(), color: editingDeptColor });
			editingDeptId = null;
			await load();
			showFeedback('success', '部署を更新しました');
		} catch (e) { showFeedback('error', e instanceof Error ? e.message : '失敗しました'); }
		finally { saving = false; }
	}

	async function removeDept(id: string, name: string) {
		confirmModal = {
			message: `「${name}」を削除しますか？`,
			detail: 'この部署に所属するスタッフは部署未設定になります。',
			onConfirm: async () => {
				saving = true;
				try {
					await deleteDepartment(id);
					if (selectedDeptId === id) selectedDeptId = null;
					await load();
					showFeedback('success', '部署を削除しました');
				} catch (e) { showFeedback('error', e instanceof Error ? e.message : '失敗しました'); }
				finally { saving = false; }
			},
		};
	}

	// ── Position actions ─────────────────────────────────────────
	async function savePos() {
		if (!newPosName.trim() || !selectedDeptId) return;
		saving = true;
		try {
			await createPosition(selectedDeptId, newPosName.trim());
			newPosName = ''; showNewPos = false;
			await load();
			showFeedback('success', '役職を追加しました');
		} catch (e) { showFeedback('error', e instanceof Error ? e.message : '失敗しました'); }
		finally { saving = false; }
	}

	async function saveEditPos(id: string) {
		saving = true;
		try {
			await updatePosition(id, { name: editingPosName.trim() });
			editingPosId = null;
			await load();
			showFeedback('success', '役職を更新しました');
		} catch (e) { showFeedback('error', e instanceof Error ? e.message : '失敗しました'); }
		finally { saving = false; }
	}

	async function removePos(id: string, name: string) {
		confirmModal = {
			message: `「${name}」を削除しますか？`,
			onConfirm: async () => {
				saving = true;
				try {
					await deletePosition(id);
					await load();
					showFeedback('success', '役職を削除しました');
				} catch (e) { showFeedback('error', e instanceof Error ? e.message : '失敗しました'); }
				finally { saving = false; }
			},
		};
	}

	// ── Staff actions ────────────────────────────────────────────
	async function saveNewStaff() {
		if (!newStaff.name.trim() || !newStaff.email.trim() || !selectedDeptId) return;
		saving = true;
		try {
			await createStaff({
				name: newStaff.name.trim(),
				email: newStaff.email.trim(),
				department_id: selectedDeptId,
				position_id: newStaff.position_id || null,
			});
			newStaff = { name: '', email: '', position_id: '' }; showNewStaff = false;
			await load();
			showFeedback('success', 'スタッフを追加しました');
		} catch (e) { showFeedback('error', e instanceof Error ? e.message : '失敗しました'); }
		finally { saving = false; }
	}

	function startEditStaff(s: StaffMember) {
		editingStaffId = s.id;
		editingStaff = {
			name: s.name,
			position_id: s.position_id ?? '',
			role_id: s.role_id ?? '',
			is_active: s.is_active,
			employment_type: s.employment_type ?? '',
			start_period: s.start_period ?? null,
			end_period: s.end_period ?? null,
		};
	}

	async function saveEditStaff(s: StaffMember) {
		saving = true;
		try {
			await updateStaffOrg(s.id, {
				name: editingStaff.name.trim(),
				position_id: editingStaff.position_id || null,
				is_active: editingStaff.is_active,
				employment_type: editingStaff.employment_type || null,
				start_period: editingStaff.start_period,
				end_period: editingStaff.end_period,
			});
			if (editingStaff.role_id !== (s.role_id ?? '')) {
				await updateStaffRole(s.id, editingStaff.role_id || null);
			}
			editingStaffId = null;
			await load();
			showFeedback('success', 'スタッフを更新しました');
		} catch (e) { showFeedback('error', e instanceof Error ? e.message : '失敗しました'); }
		finally { saving = false; }
	}

	async function toggleAdmin(s: StaffMember) {
		saving = true;
		try {
			await updateStaffAdmin(s.id, !s.is_admin);
			await load();
			showFeedback('success', `管理者権限を${!s.is_admin ? '付与' : '削除'}しました`);
		} catch (e) { showFeedback('error', e instanceof Error ? e.message : '失敗しました'); }
		finally { saving = false; }
	}

	async function softDelete(s: StaffMember) {
		confirmModal = {
			message: `「${s.name}」を無効化しますか？`,
			detail: 'スタッフを無効化します。後から再有効化できます。',
			onConfirm: async () => {
				saving = true;
				try {
					await deactivateStaff(s.id);
					await load();
					showFeedback('success', 'スタッフを無効化しました');
				} catch (e) { showFeedback('error', e instanceof Error ? e.message : '失敗しました'); }
				finally { saving = false; }
			},
		};
	}

	const COLORS = [
		'#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316',
		'#eab308','#22c55e','#10b981','#06b6d4','#3b82f6',
		'#64748b','#78716c',
	];

	const EMPLOYMENT_TYPES = [
		{ value: '社員',  label: '社員' },
		{ value: '派遣',  label: '派遣' },
		{ value: 'パート', label: 'パート' },
	];

	const YEARS  = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);
	const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

	function daysInMonth(year: number, month: number) {
		return new Date(year, month, 0).getDate();
	}

	function getPeriodDays(p: PeriodJson | null) {
		if (!p) return Array.from({ length: 31 }, (_, i) => i + 1);
		return Array.from({ length: daysInMonth(p.year, p.month) }, (_, i) => i + 1);
	}

	function setPeriodField(which: 'start_period' | 'end_period', field: 'year' | 'month' | 'day', val: string) {
		const num = parseInt(val);
		if (!val || isNaN(num)) {
			// Clear entire period if year cleared
			if (field === 'year') editingStaff[which] = null;
			return;
		}
		const prev = editingStaff[which] ?? { year: new Date().getFullYear(), month: 1, day: 1 };
		const next = { ...prev, [field]: num };
		// Clamp day if month/year changed
		const maxDay = daysInMonth(next.year, next.month);
		if (next.day > maxDay) next.day = maxDay;
		editingStaff[which] = next;
	}
</script>

<div class="space-y-4">
	<!-- Feedback -->
	{#if feedback}
		<div class="rounded-lg px-4 py-3 text-sm font-medium
			{feedback.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}">
			{feedback.text}
		</div>
	{/if}
	{#if error}
		<div class="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">{error}</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-20 text-gray-400">
			<span class="material-symbols-rounded animate-spin mr-2">progress_activity</span>
			読み込み中...
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">

			<!-- ── LEFT: Department list ── -->
			<div class="space-y-2">
				<div class="flex items-center justify-between mb-3">
					<h3 class="font-semibold text-gray-800 text-sm uppercase tracking-wide">部署</h3>
					<button
						type="button"
						onclick={() => { showNewDept = !showNewDept; }}
						class="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
					>
						<span class="material-symbols-rounded text-sm">add</span>
						追加
					</button>
				</div>

				<!-- New dept form -->
				{#if showNewDept}
					<div class="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2.5 mb-2">
						<input
							type="text"
							bind:value={newDeptName}
							placeholder="部署名"
							class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-300 focus:outline-none"
						/>
						<div class="flex flex-wrap gap-1.5">
							{#each COLORS as c}
								<button
									type="button"
									onclick={() => newDeptColor = c}
									class="w-5 h-5 rounded-full transition-all {newDeptColor === c ? 'ring-2 ring-offset-1 ring-gray-700 scale-110' : 'hover:scale-105'}"
									style="background:{c}"
								></button>
							{/each}
						</div>
						<div class="flex gap-2">
							<button
								type="button"
								onclick={saveDept}
								disabled={saving || !newDeptName.trim()}
								class="flex-1 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
							>追加</button>
							<button
								type="button"
								onclick={() => { showNewDept = false; newDeptName = ''; }}
								class="px-3 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
							>×</button>
						</div>
					</div>
				{/if}

				<!-- Dept items -->
				{#if departments.length === 0 && !showNewDept}
					<div class="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
						<span class="material-symbols-rounded text-3xl text-gray-300 block mb-1">corporate_fare</span>
						<p class="text-xs text-gray-400">部署がありません</p>
					</div>
				{/if}

				{#each departments as dept}
					{#if editingDeptId === dept.id}
						<div class="rounded-xl border border-blue-300 bg-blue-50 p-3 space-y-2">
							<input
								type="text"
								bind:value={editingDeptName}
								class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
							/>
							<div class="flex flex-wrap gap-1.5">
								{#each COLORS as c}
									<button
										type="button"
										onclick={() => editingDeptColor = c}
										class="w-5 h-5 rounded-full {editingDeptColor === c ? 'ring-2 ring-offset-1 ring-gray-700 scale-110' : ''}"
										style="background:{c}"
									></button>
								{/each}
							</div>
							<div class="flex gap-2">
								<button
									type="button"
									onclick={() => saveEditDept(dept.id)}
									disabled={saving}
									class="flex-1 py-1 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
								>保存</button>
								<button
									type="button"
									onclick={() => editingDeptId = null}
									class="px-3 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
								>×</button>
							</div>
						</div>
					{:else}
						<div
							role="button"
							tabindex="0"
							onclick={() => { selectedDeptId = dept.id; showNewPos = false; showNewStaff = false; editingPosId = null; editingStaffId = null; staffFilter = 'active'; }}
							onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectedDeptId = dept.id; showNewPos = false; showNewStaff = false; editingPosId = null; editingStaffId = null; staffFilter = 'active'; } }}
							class="w-full text-left rounded-xl border px-3 py-3 transition-all cursor-pointer
								{selectedDeptId === dept.id
									? 'border-blue-400 bg-blue-50 shadow-sm'
									: 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}"
						>
							<div class="flex items-center gap-2.5">
								<div class="w-2.5 h-2.5 rounded-full shrink-0" style="background:{dept.color}"></div>
								<span class="flex-1 font-medium text-sm text-gray-900 truncate">{dept.name}</span>
								<!-- actions, stop propagation -->
								<span
									class="flex items-center gap-0.5 shrink-0"
									onclick={(e) => e.stopPropagation()}
									role="group"
								>
									<button
										type="button"
										onclick={() => { editingDeptId = dept.id; editingDeptName = dept.name; editingDeptColor = dept.color; }}
										class="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
										title="編集"
									><span class="material-symbols-rounded text-sm">edit</span></button>
									<button
										type="button"
										onclick={() => removeDept(dept.id, dept.name)}
										class="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
										title="削除"
									><span class="material-symbols-rounded text-sm">delete</span></button>
								</span>
							</div>
							<div class="mt-1 ml-5 text-xs text-gray-400">
								{dept.positions.length}役職 · {staffCountByDept()[dept.id] ?? 0}名
							</div>
						</div>
					{/if}
				{/each}

				<!-- Unassigned indicator -->
				{#if unassignedStaff().length > 0}
					<button
						type="button"
						onclick={() => { selectedDeptId = '__unassigned__'; }}
						class="w-full text-left rounded-xl border px-3 py-3 transition-all mt-2
							{selectedDeptId === '__unassigned__'
								? 'border-orange-300 bg-orange-50 shadow-sm'
								: 'border-dashed border-gray-200 bg-white hover:border-gray-300'}"
					>
						<div class="flex items-center gap-2.5">
							<span class="material-symbols-rounded text-sm text-gray-400">person_outline</span>
							<span class="flex-1 text-sm text-gray-500">部署未設定</span>
							<span class="text-xs text-orange-600 font-medium">{unassignedStaff().length}名</span>
						</div>
					</button>
				{/if}
			</div>

			<!-- ── RIGHT: Positions + Staff for selected dept ── -->
			{#if !selectedDeptId}
				<div class="flex items-center justify-center h-48 bg-gray-50 rounded-xl border border-dashed border-gray-200">
					<p class="text-sm text-gray-400">← 部署を選択してください</p>
				</div>

			{:else if selectedDeptId === '__unassigned__'}
				<!-- Unassigned staff list -->
				<div class="space-y-4">
					<div class="flex items-center gap-2">
						<span class="material-symbols-rounded text-base text-gray-400">person_outline</span>
						<h3 class="font-semibold text-gray-700">部署未設定のスタッフ</h3>
						<span class="text-xs text-gray-400">({unassignedStaff().length}名)</span>
					</div>
					<div class="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
						{#each unassignedStaff() as staff}
							{@render staffRow(staff, [])}
						{/each}
					</div>
				</div>

			{:else}
				{@const dept = selectedDept()}
				{#if dept}
				<div class="space-y-6">

					<!-- ── Positions section ── -->
					<div>
						<div class="flex items-center justify-between mb-3">
							<div class="flex items-center gap-2">
								<div class="w-2.5 h-2.5 rounded-full" style="background:{dept.color}"></div>
								<h3 class="font-semibold text-gray-800">役職</h3>
								<span class="text-xs text-gray-400">({dept.positions.length})</span>
							</div>
							<button
								type="button"
								onclick={() => { showNewPos = !showNewPos; newPosName = ''; }}
								class="flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
							>
								<span class="material-symbols-rounded text-sm">add</span>
								役職追加
							</button>
						</div>

						{#if showNewPos}
							<div class="flex gap-2 mb-2">
								<input
									type="text"
									bind:value={newPosName}
									placeholder="役職名"
									class="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
								/>
								<button
									type="button"
									onclick={savePos}
									disabled={saving || !newPosName.trim()}
									class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
								>追加</button>
								<button
									type="button"
									onclick={() => { showNewPos = false; newPosName = ''; }}
									class="px-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg"
								>×</button>
							</div>
						{/if}

						{#if dept.positions.length === 0 && !showNewPos}
							<p class="text-sm text-gray-400 py-2">役職がありません</p>
						{:else}
							<div class="flex flex-wrap gap-2">
								{#each dept.positions as pos}
									{#if editingPosId === pos.id}
										<div class="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
											<input
												type="text"
												bind:value={editingPosName}
												class="w-28 text-sm border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:border-blue-500"
											/>
											<button
												type="button"
												onclick={() => saveEditPos(pos.id)}
												disabled={saving}
												class="text-xs text-blue-600 font-medium hover:underline disabled:opacity-50"
											>保存</button>
											<button
												type="button"
												onclick={() => editingPosId = null}
												class="text-xs text-gray-400 hover:text-gray-600"
											>×</button>
										</div>
									{:else}
										<div class="group flex items-center gap-1.5 bg-gray-100 rounded-lg px-3 py-1.5 text-sm text-gray-700">
											<span class="material-symbols-rounded text-sm text-gray-400">work</span>
											{pos.name}
											<button
												type="button"
												onclick={() => { editingPosId = pos.id; editingPosName = pos.name; }}
												class="opacity-0 group-hover:opacity-100 ml-0.5 text-gray-400 hover:text-gray-700 transition-opacity"
											><span class="material-symbols-rounded text-xs">edit</span></button>
											<button
												type="button"
												onclick={() => removePos(pos.id, pos.name)}
												class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity"
											><span class="material-symbols-rounded text-xs">close</span></button>
										</div>
									{/if}
								{/each}
							</div>
						{/if}
					</div>

					<!-- ── Staff section ── -->
					<div>
						<div class="flex items-center justify-between mb-3">
							<div class="flex items-center gap-2">
								<span class="material-symbols-rounded text-base text-gray-500">group</span>
								<h3 class="font-semibold text-gray-800">スタッフ</h3>
								<span class="text-xs text-gray-400">({deptStaff().length}名)</span>
							</div>
							<button
								type="button"
								onclick={() => { showNewStaff = !showNewStaff; newStaff = { name: '', email: '', position_id: '' }; }}
								class="flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
							>
								<span class="material-symbols-rounded text-sm">person_add</span>
								スタッフ追加
							</button>
						</div>

						<!-- Filter tabs -->
						<div class="flex gap-1 p-1 bg-gray-100 rounded-lg mb-3 w-fit">
							{#each ([["active", "在籍中", deptStaffCounts().active], ["inactive", "無効", deptStaffCounts().inactive], ["all", "すべて", deptStaffCounts().all]] as const) as [val, label, count]}
								<button
									type="button"
									onclick={() => staffFilter = val}
									class="px-3 py-1 text-xs font-medium rounded-md transition-all
										{staffFilter === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
								>{label} <span class="ml-1 opacity-60">{count}</span></button>
							{/each}
						</div>

						<!-- New staff form -->
						{#if showNewStaff}
							<div class="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3 mb-3">
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<label class="block text-xs font-medium text-gray-600 mb-1">名前 <span class="text-red-500">*</span></label>
										<input
											type="text"
											bind:value={newStaff.name}
											placeholder="田中 太郎"
											class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
										/>
									</div>
									<div>
										<label class="block text-xs font-medium text-gray-600 mb-1">メール <span class="text-red-500">*</span></label>
										<input
											type="email"
											bind:value={newStaff.email}
											placeholder="tanaka@example.com"
											class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
										/>
									</div>
									<div class="sm:col-span-2">
										<label class="block text-xs font-medium text-gray-600 mb-1">役職</label>
										<select
											bind:value={newStaff.position_id}
											class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
										>
											<option value="">— 未設定 —</option>
											{#each dept.positions as p}
												<option value={p.id}>{p.name}</option>
											{/each}
										</select>
									</div>
								</div>
								<div class="flex gap-2">
									<button
										type="button"
										onclick={saveNewStaff}
										disabled={saving || !newStaff.name.trim() || !newStaff.email.trim()}
										class="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
									>追加</button>
									<button
										type="button"
										onclick={() => showNewStaff = false}
										class="px-4 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
									>キャンセル</button>
								</div>
							</div>
						{/if}

						<!-- Staff list -->
						{#if deptStaff().length === 0 && !showNewStaff}
							<div class="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
								<span class="material-symbols-rounded text-3xl text-gray-300 block mb-1">person_outline</span>
								<p class="text-sm text-gray-400">
									{staffFilter === 'inactive' ? '無効なスタッフはいません' : staffFilter === 'active' ? '在籍中のスタッフがいません' : 'スタッフがいません'}
								</p>
							</div>
						{:else}
							<div class="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
								{#each deptStaff() as staff}
									{@render staffRow(staff, dept.positions)}
								{/each}
							</div>
						{/if}
					</div>

				</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<!-- ── Confirm Modal ── -->
{#if confirmModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
	>
		<!-- Backdrop -->
		<div
			class="absolute inset-0 bg-black/40 backdrop-blur-sm"
			onclick={() => confirmModal = null}
		></div>

		<!-- Modal card -->
		<div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
			<!-- Icon -->
			<div class="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto">
				<span class="material-symbols-rounded text-2xl text-red-500">warning</span>
			</div>

			<!-- Text -->
			<div class="text-center space-y-1.5">
				<p class="font-semibold text-gray-900 text-base">{confirmModal.message}</p>
				{#if confirmModal.detail}
					<p class="text-sm text-gray-500">{confirmModal.detail}</p>
				{/if}
			</div>

			<!-- Divider -->
			<hr class="border-gray-100" />

			<!-- Buttons -->
			<div class="flex gap-3">
				<button
					type="button"
					onclick={() => confirmModal = null}
					class="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
				>キャンセル</button>
				<button
					type="button"
					onclick={() => { const fn = confirmModal!.onConfirm; confirmModal = null; fn(); }}
					class="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
				>確認</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Staff row snippet ── -->
{#snippet staffRow(staff: StaffMember, positions: OrgPosition[])}
	{#if editingStaffId === staff.id}
		<div class="p-4 bg-blue-50 space-y-3">
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div>
					<label class="block text-xs font-medium text-gray-600 mb-1">名前</label>
					<input
						type="text"
						bind:value={editingStaff.name}
						class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
					/>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-600 mb-1">役職</label>
					<select
						bind:value={editingStaff.position_id}
						class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
					>
						<option value="">— 未設定 —</option>
						{#each positions as p}
							<option value={p.id}>{p.name}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-600 mb-1">ロール</label>
					<select
						bind:value={editingStaff.role_id}
						class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
					>
						<option value="">— ロールなし —</option>
						{#each roles as r}
							<option value={r.id}>{r.name}</option>
						{/each}
					</select>
				</div>
				<div class="flex items-end pb-2">
					<label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
						<input type="checkbox" bind:checked={editingStaff.is_active} class="rounded" />
						在籍中（アクティブ）
					</label>
				</div>
			</div>

			<!-- Employment type + periods -->
			<div class="border-t border-gray-200 pt-3 space-y-3">
				<div>
					<label class="block text-xs font-medium text-gray-600 mb-1.5">雇用形態</label>
					<div class="flex gap-4">
						{#each EMPLOYMENT_TYPES as et}
							<label class="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
								<input
									type="radio"
									name="employment_type_{staff.id}"
									value={et.value}
									checked={editingStaff.employment_type === et.value}
									onchange={() => editingStaff.employment_type = et.value}
									class="accent-blue-600"
								/>
								{et.label}
							</label>
						{/each}
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-medium text-gray-600 mb-1">開始期間</label>
						<div class="flex gap-1.5">
							<select
								value={editingStaff.start_period?.year ?? ""}
								onchange={(e) => setPeriodField('start_period', 'year', (e.target as HTMLSelectElement).value)}
								class="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
							>
								<option value="">年</option>
								{#each YEARS as y}
									<option value={y}>{y}</option>
								{/each}
							</select>
							<select
								value={editingStaff.start_period?.month ?? 1}
								onchange={(e) => setPeriodField('start_period', 'month', (e.target as HTMLSelectElement).value)}
								class="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
								disabled={!editingStaff.start_period}
							>
								{#each MONTHS as m}
									<option value={m}>{m}</option>
								{/each}
							</select>
							<select
								value={editingStaff.start_period?.day ?? 1}
								onchange={(e) => setPeriodField('start_period', 'day', (e.target as HTMLSelectElement).value)}
								class="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
								disabled={!editingStaff.start_period}
							>
								{#each getPeriodDays(editingStaff.start_period) as d}
									<option value={d}>{d}</option>
								{/each}
							</select>
						</div>
					</div>

					<div>
						<label class="block text-xs font-medium text-gray-600 mb-1">終了期間</label>
						<div class="flex gap-1.5">
							<select
								value={editingStaff.end_period?.year ?? ""}
								onchange={(e) => setPeriodField('end_period', 'year', (e.target as HTMLSelectElement).value)}
								class="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
							>
								<option value="">年</option>
								{#each YEARS as y}
									<option value={y}>{y}</option>
								{/each}
							</select>
							<select
								value={editingStaff.end_period?.month ?? 1}
								onchange={(e) => setPeriodField('end_period', 'month', (e.target as HTMLSelectElement).value)}
								class="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
								disabled={!editingStaff.end_period}
							>
								{#each MONTHS as m}
									<option value={m}>{m}</option>
								{/each}
							</select>
							<select
								value={editingStaff.end_period?.day ?? 1}
								onchange={(e) => setPeriodField('end_period', 'day', (e.target as HTMLSelectElement).value)}
								class="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
								disabled={!editingStaff.end_period}
							>
								{#each getPeriodDays(editingStaff.end_period) as d}
									<option value={d}>{d}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>
			</div>

			<div class="flex gap-2">
				<button
					type="button"
					onclick={() => saveEditStaff(staff)}
					disabled={saving}
					class="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
				>保存</button>
				<button
					type="button"
					onclick={() => editingStaffId = null}
					class="px-4 py-1.5 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
				>キャンセル</button>
			</div>
		</div>
	{:else}
		<div class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
			<!-- Avatar -->
			<div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0
				{staff.is_admin ? 'bg-amber-500' : staff.is_active ? 'bg-blue-600' : 'bg-gray-300'}">
				{staff.name.charAt(0).toUpperCase()}
			</div>
			<!-- Info -->
			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-1.5 flex-wrap">
					<span class="text-sm font-medium text-gray-900">{staff.name}</span>
					{#if staff.is_admin}
						<span class="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">Admin</span>
					{/if}
					{#if !staff.is_active}
						<span class="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">無効</span>
					{/if}
					{#if staff.position_id}
						{@const posName = positions.find(p => p.id === staff.position_id)?.name}
						{#if posName}
							<span class="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">{posName}</span>
						{/if}
					{/if}
					{#if staff.employment_type}
						<span class="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">{staff.employment_type}</span>
					{/if}
				</div>
				<div class="flex items-center gap-3 mt-0.5">
					{#if staff.email}
						<span class="text-xs text-gray-400 truncate">{staff.email}</span>
					{/if}
					{#if staff.role_id}
						<span class="text-xs text-gray-500">
							<span class="material-symbols-rounded align-middle" style="font-size:11px">shield</span>
							{getRoleName(staff.role_id)}
						</span>
					{/if}
				</div>
			</div>
			<!-- Actions -->
			<div class="flex items-center gap-0.5 shrink-0">
				<button
					type="button"
					onclick={() => startEditStaff(staff)}
					class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
					title="編集"
				><span class="material-symbols-rounded text-base">edit</span></button>
				<button
					type="button"
					onclick={() => toggleAdmin(staff)}
					class="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
					title={staff.is_admin ? '管理者権限を削除' : '管理者権限を付与'}
				><span class="material-symbols-rounded text-base">{staff.is_admin ? 'shield' : 'shield_with_heart'}</span></button>
				{#if staff.is_active}
					<button
						type="button"
						onclick={() => softDelete(staff)}
						class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
						title="無効化"
					><span class="material-symbols-rounded text-base">person_off</span></button>
				{/if}
			</div>
		</div>
	{/if}
{/snippet}

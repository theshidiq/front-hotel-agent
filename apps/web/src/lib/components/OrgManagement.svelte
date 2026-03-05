<script lang="ts">
	import {
		getDepartments, createDepartment, updateDepartment, deleteDepartment,
		createPosition, updatePosition, deletePosition,
		getAllStaffs, createStaff, updateStaffOrg, updateStaffRole, updateStaffAdmin, deactivateStaff,
		getRoles,
		type OrgDepartment, type OrgPosition, type StaffMember, type Role,
	} from '$lib/api';

	// ── State ───────────────────────────────────────────────────
	let departments = $state<OrgDepartment[]>([]);
	let allStaff = $state<StaffMember[]>([]);
	let roles = $state<Role[]>([]);
	let loading = $state(true);
	let error = $state('');

	// Selected department for drill-down
	let selectedDept = $state<OrgDepartment | null>(null);

	// Which panel is active: 'dept' | 'staff'
	let panel = $state<'dept' | 'staff'>('dept');

	// Inline editing
	let editingDeptId = $state<string | null>(null);
	let editingDeptName = $state('');
	let editingDeptColor = $state('#6366f1');

	let newDeptName = $state('');
	let newDeptColor = $state('#6366f1');
	let showNewDept = $state(false);

	let editingPosId = $state<string | null>(null);
	let editingPosName = $state('');
	let newPosName = $state('');
	let showNewPos = $state(false);

	// Staff panel state
	let showNewStaff = $state(false);
	let newStaff = $state({ name: '', email: '', department_id: '', position_id: '' });
	let editingStaffId = $state<string | null>(null);
	let editingStaff = $state({ name: '', position_text: '', department_id: '', position_id: '', role_id: '', is_active: true });

	let saving = $state(false);
	let feedback = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// ── Derived ─────────────────────────────────────────────────
	const staffByDept = $derived(() => {
		const map: Record<string, StaffMember[]> = { '__none__': [] };
		departments.forEach(d => { map[d.id] = []; });
		allStaff.forEach(s => {
			if (s.department_id && map[s.department_id]) {
				map[s.department_id].push(s);
			} else {
				map['__none__'].push(s);
			}
		});
		return map;
	});

	const availablePositions = $derived(() => {
		if (!editingStaff.department_id) return [];
		const dept = departments.find(d => d.id === editingStaff.department_id);
		return dept?.positions ?? [];
	});

	const newStaffPositions = $derived(() => {
		if (!newStaff.department_id) return [];
		const dept = departments.find(d => d.id === newStaff.department_id);
		return dept?.positions ?? [];
	});

	// ── Load ────────────────────────────────────────────────────
	async function load() {
		loading = true;
		error = '';
		try {
			[departments, allStaff, roles] = await Promise.all([getDepartments(), getAllStaffs(), getRoles()]);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load data';
		} finally {
			loading = false;
		}
	}

	$effect(() => { load(); });

	// ── Helpers ─────────────────────────────────────────────────
	function showFeedback(type: 'success' | 'error', text: string) {
		feedback = { type, text };
		setTimeout(() => { feedback = null; }, 3000);
	}

	function getDeptName(id: string | null) {
		return departments.find(d => d.id === id)?.name ?? '—';
	}

	function getPosName(deptId: string | null, posId: string | null) {
		if (!deptId || !posId) return '—';
		return departments.find(d => d.id === deptId)?.positions.find(p => p.id === posId)?.name ?? '—';
	}

	function getRoleName(roleId: string | null) {
		return roles.find(r => r.id === roleId)?.name ?? '—';
	}

	// ── Department actions ───────────────────────────────────────
	async function saveDept() {
		if (!newDeptName.trim()) return;
		saving = true;
		try {
			await createDepartment(newDeptName.trim(), newDeptColor);
			newDeptName = ''; newDeptColor = '#6366f1'; showNewDept = false;
			await load();
			showFeedback('success', '部署を追加しました');
		} catch (e) {
			showFeedback('error', e instanceof Error ? e.message : '失敗しました');
		} finally { saving = false; }
	}

	async function saveEditDept(id: string) {
		saving = true;
		try {
			await updateDepartment(id, { name: editingDeptName.trim(), color: editingDeptColor });
			editingDeptId = null;
			await load();
			showFeedback('success', '部署を更新しました');
		} catch (e) {
			showFeedback('error', e instanceof Error ? e.message : '失敗しました');
		} finally { saving = false; }
	}

	async function removeDept(id: string, name: string) {
		if (!confirm(`「${name}」を削除しますか？（所属スタッフの部署は解除されます）`)) return;
		saving = true;
		try {
			await deleteDepartment(id);
			if (selectedDept?.id === id) selectedDept = null;
			await load();
			showFeedback('success', '部署を削除しました');
		} catch (e) {
			showFeedback('error', e instanceof Error ? e.message : '失敗しました');
		} finally { saving = false; }
	}

	// ── Position actions ─────────────────────────────────────────
	async function savePos(deptId: string) {
		if (!newPosName.trim()) return;
		saving = true;
		try {
			await createPosition(deptId, newPosName.trim());
			newPosName = ''; showNewPos = false;
			await load();
			showFeedback('success', '役職を追加しました');
		} catch (e) {
			showFeedback('error', e instanceof Error ? e.message : '失敗しました');
		} finally { saving = false; }
	}

	async function saveEditPos(id: string) {
		saving = true;
		try {
			await updatePosition(id, { name: editingPosName.trim() });
			editingPosId = null;
			await load();
			showFeedback('success', '役職を更新しました');
		} catch (e) {
			showFeedback('error', e instanceof Error ? e.message : '失敗しました');
		} finally { saving = false; }
	}

	async function removePos(id: string, name: string) {
		if (!confirm(`「${name}」を削除しますか？`)) return;
		saving = true;
		try {
			await deletePosition(id);
			await load();
			showFeedback('success', '役職を削除しました');
		} catch (e) {
			showFeedback('error', e instanceof Error ? e.message : '失敗しました');
		} finally { saving = false; }
	}

	// ── Staff actions ────────────────────────────────────────────
	async function saveNewStaff() {
		if (!newStaff.name.trim() || !newStaff.email.trim()) return;
		saving = true;
		try {
			await createStaff({
				name: newStaff.name.trim(),
				email: newStaff.email.trim(),
				department_id: newStaff.department_id || null,
				position_id: newStaff.position_id || null,
			});
			newStaff = { name: '', email: '', department_id: '', position_id: '' };
			showNewStaff = false;
			await load();
			showFeedback('success', 'スタッフを追加しました');
		} catch (e) {
			showFeedback('error', e instanceof Error ? e.message : '失敗しました');
		} finally { saving = false; }
	}

	function startEditStaff(s: StaffMember) {
		editingStaffId = s.id;
		editingStaff = {
			name: s.name,
			position_text: s.position ?? '',
			department_id: s.department_id ?? '',
			position_id: s.position_id ?? '',
			role_id: s.role_id ?? '',
			is_active: s.is_active,
		};
	}

	async function saveEditStaff(s: StaffMember) {
		saving = true;
		try {
			await updateStaffOrg(s.id, {
				name: editingStaff.name.trim(),
				department_id: editingStaff.department_id || null,
				position_id: editingStaff.position_id || null,
				is_active: editingStaff.is_active,
			});
			if (editingStaff.role_id !== (s.role_id ?? '')) {
				await updateStaffRole(s.id, editingStaff.role_id || null);
			}
			editingStaffId = null;
			await load();
			showFeedback('success', 'スタッフを更新しました');
		} catch (e) {
			showFeedback('error', e instanceof Error ? e.message : '失敗しました');
		} finally { saving = false; }
	}

	async function toggleAdmin(s: StaffMember) {
		saving = true;
		try {
			await updateStaffAdmin(s.id, !s.is_admin);
			await load();
			showFeedback('success', `管理者権限を${!s.is_admin ? '付与' : '削除'}しました`);
		} catch (e) {
			showFeedback('error', e instanceof Error ? e.message : '失敗しました');
		} finally { saving = false; }
	}

	async function deactivate(s: StaffMember) {
		if (!confirm(`「${s.name}」を無効化しますか？`)) return;
		saving = true;
		try {
			await deactivateStaff(s.id);
			await load();
			showFeedback('success', 'スタッフを無効化しました');
		} catch (e) {
			showFeedback('error', e instanceof Error ? e.message : '失敗しました');
		} finally { saving = false; }
	}

	// ── Color palette ────────────────────────────────────────────
	const COLORS = [
		'#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316',
		'#eab308','#22c55e','#10b981','#06b6d4','#3b82f6',
		'#64748b','#78716c',
	];
</script>

<div class="space-y-6">
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
		<div class="flex items-center justify-center py-16 text-gray-400">
			<span class="material-symbols-rounded animate-spin mr-2">progress_activity</span>
			読み込み中...
		</div>
	{:else}
		<!-- Tab toggles -->
		<div class="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
			<button
				type="button"
				onclick={() => panel = 'dept'}
				class="px-4 py-2 rounded-lg text-sm font-medium transition-colors
					{panel === 'dept' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
			>
				<span class="material-symbols-rounded text-base align-middle mr-1.5">corporate_fare</span>
				部署・役職
			</button>
			<button
				type="button"
				onclick={() => panel = 'staff'}
				class="px-4 py-2 rounded-lg text-sm font-medium transition-colors
					{panel === 'staff' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
			>
				<span class="material-symbols-rounded text-base align-middle mr-1.5">group</span>
				スタッフ
				<span class="ml-1.5 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
					{allStaff.filter(s => s.is_active).length}
				</span>
			</button>
		</div>

		<!-- ── DEPT PANEL ── -->
		{#if panel === 'dept'}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<!-- Left: Department list -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<h3 class="font-semibold text-gray-800">部署一覧</h3>
						<button
							type="button"
							onclick={() => { showNewDept = !showNewDept; }}
							class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
						>
							<span class="material-symbols-rounded text-base">add</span>
							部署追加
						</button>
					</div>

					<!-- Add department form -->
					{#if showNewDept}
						<div class="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
							<input
								type="text"
								bind:value={newDeptName}
								placeholder="部署名"
								class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
							/>
							<div>
								<p class="text-xs text-gray-500 mb-1.5">カラー</p>
								<div class="flex flex-wrap gap-2">
									{#each COLORS as c}
										<button
											type="button"
											onclick={() => newDeptColor = c}
											class="w-6 h-6 rounded-full transition-all {newDeptColor === c ? 'ring-2 ring-offset-1 ring-gray-700 scale-110' : 'hover:scale-105'}"
											style="background:{c}"
											title={c}
										></button>
									{/each}
								</div>
							</div>
							<div class="flex gap-2">
								<button
									type="button"
									onclick={saveDept}
									disabled={saving || !newDeptName.trim()}
									class="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
								>追加</button>
								<button
									type="button"
									onclick={() => { showNewDept = false; newDeptName = ''; }}
									class="px-4 py-2 text-gray-600 text-sm rounded-lg hover:bg-gray-100 transition-colors"
								>キャンセル</button>
							</div>
						</div>
					{/if}

					{#if departments.length === 0}
						<div class="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
							<span class="material-symbols-rounded text-4xl text-gray-300 block mb-2">corporate_fare</span>
							<p class="text-sm text-gray-500">部署がありません</p>
						</div>
					{:else}
						{#each departments as dept}
							<div
								class="rounded-xl border transition-all cursor-pointer
									{selectedDept?.id === dept.id ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}"
								onclick={() => { selectedDept = dept; }}
							>
								{#if editingDeptId === dept.id}
									<!-- Edit form -->
									<div class="p-4 space-y-3" onclick={(e) => e.stopPropagation()}>
										<input
											type="text"
											bind:value={editingDeptName}
											class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
												class="flex-1 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
											>保存</button>
											<button
												type="button"
												onclick={() => editingDeptId = null}
												class="px-3 py-1.5 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
											>キャンセル</button>
										</div>
									</div>
								{:else}
									<div class="p-4 flex items-center gap-3">
										<div class="w-3 h-3 rounded-full shrink-0" style="background:{dept.color}"></div>
										<div class="flex-1 min-w-0">
											<p class="font-medium text-gray-900 truncate">{dept.name}</p>
											<p class="text-xs text-gray-500">
												役職 {dept.positions.length}件 ·
												スタッフ {staffByDept()[dept.id]?.length ?? 0}名
											</p>
										</div>
										<div class="flex items-center gap-1 shrink-0" onclick={(e) => e.stopPropagation()}>
											<button
												type="button"
												onclick={() => { editingDeptId = dept.id; editingDeptName = dept.name; editingDeptColor = dept.color; }}
												class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
												title="編集"
											>
												<span class="material-symbols-rounded text-base">edit</span>
											</button>
											<button
												type="button"
												onclick={() => removeDept(dept.id, dept.name)}
												class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
												title="削除"
											>
												<span class="material-symbols-rounded text-base">delete</span>
											</button>
										</div>
									</div>
								{/if}
							</div>
						{/each}
					{/if}
				</div>

				<!-- Right: Positions for selected department -->
				<div class="space-y-3">
					{#if !selectedDept}
						<div class="flex items-center justify-center h-full min-h-48 bg-gray-50 rounded-xl border border-dashed border-gray-200">
							<p class="text-sm text-gray-400">← 部署を選択すると役職を管理できます</p>
						</div>
					{:else}
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<div class="w-3 h-3 rounded-full" style="background:{selectedDept.color}"></div>
								<h3 class="font-semibold text-gray-800">{selectedDept.name} の役職</h3>
							</div>
							<button
								type="button"
								onclick={() => { showNewPos = !showNewPos; newPosName = ''; }}
								class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
							>
								<span class="material-symbols-rounded text-base">add</span>
								役職追加
							</button>
						</div>

						{#if showNewPos}
							<div class="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
								<input
									type="text"
									bind:value={newPosName}
									placeholder="役職名"
									class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
								/>
								<div class="flex gap-2">
									<button
										type="button"
										onclick={() => savePos(selectedDept!.id)}
										disabled={saving || !newPosName.trim()}
										class="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
									>追加</button>
									<button
										type="button"
										onclick={() => { showNewPos = false; newPosName = ''; }}
										class="px-4 py-2 text-gray-600 text-sm rounded-lg hover:bg-gray-100"
									>キャンセル</button>
								</div>
							</div>
						{/if}

						{#if (departments.find(d => d.id === selectedDept?.id)?.positions ?? []).length === 0 && !showNewPos}
							<div class="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
								<span class="material-symbols-rounded text-3xl text-gray-300 block mb-1">work</span>
								<p class="text-sm text-gray-400">役職がありません</p>
							</div>
						{:else}
							<div class="space-y-2">
								{#each (departments.find(d => d.id === selectedDept?.id)?.positions ?? []) as pos}
									<div class="rounded-xl border border-gray-200 bg-white">
										{#if editingPosId === pos.id}
											<div class="p-3 space-y-2">
												<input
													type="text"
													bind:value={editingPosName}
													class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
												/>
												<div class="flex gap-2">
													<button
														type="button"
														onclick={() => saveEditPos(pos.id)}
														disabled={saving}
														class="flex-1 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
													>保存</button>
													<button
														type="button"
														onclick={() => editingPosId = null}
														class="px-3 py-1.5 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
													>キャンセル</button>
												</div>
											</div>
										{:else}
											<div class="p-3 flex items-center gap-3">
												<span class="material-symbols-rounded text-base text-gray-400">work</span>
												<span class="flex-1 text-sm font-medium text-gray-800">{pos.name}</span>
												<div class="flex gap-1">
													<button
														type="button"
														onclick={() => { editingPosId = pos.id; editingPosName = pos.name; }}
														class="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
													>
														<span class="material-symbols-rounded text-sm">edit</span>
													</button>
													<button
														type="button"
														onclick={() => removePos(pos.id, pos.name)}
														class="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
													>
														<span class="material-symbols-rounded text-sm">delete</span>
													</button>
												</div>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					{/if}
				</div>
			</div>

		<!-- ── STAFF PANEL ── -->
		{:else}
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold text-gray-800">スタッフ一覧</h3>
					<button
						type="button"
						onclick={() => { showNewStaff = !showNewStaff; }}
						class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
					>
						<span class="material-symbols-rounded text-base">person_add</span>
						スタッフ追加
					</button>
				</div>

				<!-- Add staff form -->
				{#if showNewStaff}
					<div class="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
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
							<div>
								<label class="block text-xs font-medium text-gray-600 mb-1">部署</label>
								<select
									bind:value={newStaff.department_id}
									onchange={() => { newStaff.position_id = ''; }}
									class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
								>
									<option value="">— 未設定 —</option>
									{#each departments as d}
										<option value={d.id}>{d.name}</option>
									{/each}
								</select>
							</div>
							<div>
								<label class="block text-xs font-medium text-gray-600 mb-1">役職</label>
								<select
									bind:value={newStaff.position_id}
									disabled={!newStaff.department_id}
									class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
								>
									<option value="">— 未設定 —</option>
									{#each newStaffPositions() as p}
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
								onclick={() => { showNewStaff = false; newStaff = { name: '', email: '', department_id: '', position_id: '' }; }}
								class="px-4 py-2 text-gray-600 text-sm rounded-lg hover:bg-gray-100"
							>キャンセル</button>
						</div>
					</div>
				{/if}

				<!-- Staff grouped by department -->
				{#each [{ id: '__all__', name: '全スタッフ', color: '#6366f1' }, ...departments.map(d => ({...d}))] as group}
					{@const groupStaff = group.id === '__all__'
						? allStaff
						: staffByDept()[group.id] ?? []}
					{#if group.id === '__all__' || groupStaff.length > 0}
						<div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
							<div class="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
								{#if group.id !== '__all__'}
									<div class="w-2.5 h-2.5 rounded-full" style="background:{(group as OrgDepartment).color}"></div>
								{:else}
									<span class="material-symbols-rounded text-base text-gray-400">group</span>
								{/if}
								<span class="font-medium text-sm text-gray-800">{group.name}</span>
								<span class="ml-auto text-xs text-gray-400">{groupStaff.length}名</span>
							</div>

							{#if groupStaff.length === 0}
								<div class="px-4 py-6 text-center text-sm text-gray-400">スタッフがいません</div>
							{:else}
								<div class="divide-y divide-gray-100">
									{#each groupStaff as staff}
										{#if editingStaffId === staff.id}
											<!-- Edit row -->
											<div class="p-4 space-y-3 bg-blue-50">
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
													<div>
														<label class="block text-xs font-medium text-gray-600 mb-1">部署</label>
														<select
															bind:value={editingStaff.department_id}
															onchange={() => { editingStaff.position_id = ''; }}
															class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
														>
															<option value="">— 未設定 —</option>
															{#each departments as d}
																<option value={d.id}>{d.name}</option>
															{/each}
														</select>
													</div>
													<div>
														<label class="block text-xs font-medium text-gray-600 mb-1">役職</label>
														<select
															bind:value={editingStaff.position_id}
															disabled={!editingStaff.department_id}
															class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
														>
															<option value="">— 未設定 —</option>
															{#each availablePositions() as p}
																<option value={p.id}>{p.name}</option>
															{/each}
														</select>
													</div>
												</div>
												<label class="flex items-center gap-2 text-sm text-gray-700">
													<input type="checkbox" bind:checked={editingStaff.is_active} class="rounded" />
													在籍中（アクティブ）
												</label>
												<div class="flex gap-2">
													<button
														type="button"
														onclick={() => saveEditStaff(staff)}
														disabled={saving}
														class="flex-1 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
													>保存</button>
													<button
														type="button"
														onclick={() => editingStaffId = null}
														class="px-4 py-1.5 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
													>キャンセル</button>
												</div>
											</div>
										{:else}
											<!-- Display row -->
											<div class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
												<!-- Avatar -->
												<div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0
													{staff.is_admin ? 'bg-amber-500' : 'bg-blue-600'}">
													{staff.name.charAt(0).toUpperCase()}
												</div>
												<!-- Info -->
												<div class="flex-1 min-w-0">
													<div class="flex items-center gap-2 flex-wrap">
														<span class="text-sm font-medium text-gray-900">{staff.name}</span>
														{#if staff.is_admin}
															<span class="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Admin</span>
														{/if}
														{#if !staff.is_active}
															<span class="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">無効</span>
														{/if}
													</div>
													<div class="flex items-center gap-3 mt-0.5 flex-wrap">
														{#if staff.email}
															<span class="text-xs text-gray-400">{staff.email}</span>
														{/if}
														{#if staff.department_id}
															<span class="text-xs text-gray-500">
																<span class="material-symbols-rounded text-xs align-middle" style="font-size:12px">corporate_fare</span>
																{getDeptName(staff.department_id)}
																{#if staff.position_id}
																	/ {getPosName(staff.department_id, staff.position_id)}
																{/if}
															</span>
														{/if}
														{#if staff.role_id}
															<span class="text-xs text-indigo-600">
																<span class="material-symbols-rounded text-xs align-middle" style="font-size:12px">shield</span>
																{getRoleName(staff.role_id)}
															</span>
														{/if}
													</div>
												</div>
												<!-- Actions -->
												<div class="flex items-center gap-1 shrink-0">
													<button
														type="button"
														onclick={() => startEditStaff(staff)}
														class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
														title="編集"
													>
														<span class="material-symbols-rounded text-base">edit</span>
													</button>
													<button
														type="button"
														onclick={() => toggleAdmin(staff)}
														class="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
														title={staff.is_admin ? '管理者権限を削除' : '管理者権限を付与'}
													>
														<span class="material-symbols-rounded text-base">{staff.is_admin ? 'shield' : 'shield_with_heart'}</span>
													</button>
													{#if staff.is_active}
														<button
															type="button"
															onclick={() => deactivate(staff)}
															class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
															title="無効化"
														>
															<span class="material-symbols-rounded text-base">person_off</span>
														</button>
													{/if}
												</div>
											</div>
										{/if}
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				{/each}

				<!-- Unassigned staff -->
				{#if (staffByDept()['__none__'] ?? []).length > 0}
					<div class="rounded-xl border border-dashed border-gray-200 bg-white overflow-hidden">
						<div class="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
							<span class="material-symbols-rounded text-base text-gray-400">person_outline</span>
							<span class="font-medium text-sm text-gray-500">部署未設定</span>
							<span class="ml-auto text-xs text-gray-400">{staffByDept()['__none__'].length}名</span>
						</div>
						<div class="divide-y divide-gray-100">
							{#each staffByDept()['__none__'] as staff}
								{#if editingStaffId === staff.id}
									<div class="p-4 space-y-3 bg-blue-50">
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
											<div>
												<label class="block text-xs font-medium text-gray-600 mb-1">部署</label>
												<select
													bind:value={editingStaff.department_id}
													onchange={() => { editingStaff.position_id = ''; }}
													class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
												>
													<option value="">— 未設定 —</option>
													{#each departments as d}
														<option value={d.id}>{d.name}</option>
													{/each}
												</select>
											</div>
											<div>
												<label class="block text-xs font-medium text-gray-600 mb-1">役職</label>
												<select
													bind:value={editingStaff.position_id}
													disabled={!editingStaff.department_id}
													class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
												>
													<option value="">— 未設定 —</option>
													{#each availablePositions() as p}
														<option value={p.id}>{p.name}</option>
													{/each}
												</select>
											</div>
										</div>
										<label class="flex items-center gap-2 text-sm text-gray-700">
											<input type="checkbox" bind:checked={editingStaff.is_active} class="rounded" />
											在籍中（アクティブ）
										</label>
										<div class="flex gap-2">
											<button type="button" onclick={() => saveEditStaff(staff)} disabled={saving}
												class="flex-1 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">保存</button>
											<button type="button" onclick={() => editingStaffId = null}
												class="px-4 py-1.5 text-sm text-gray-600 rounded-lg hover:bg-gray-100">キャンセル</button>
										</div>
									</div>
								{:else}
									<div class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
										<div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0
											{staff.is_admin ? 'bg-amber-500' : 'bg-gray-400'}">
											{staff.name.charAt(0).toUpperCase()}
										</div>
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2">
												<span class="text-sm font-medium text-gray-900">{staff.name}</span>
												{#if staff.is_admin}<span class="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">Admin</span>{/if}
												{#if !staff.is_active}<span class="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">無効</span>{/if}
											</div>
											{#if staff.email}<p class="text-xs text-gray-400">{staff.email}</p>{/if}
										</div>
										<div class="flex gap-1 shrink-0">
											<button type="button" onclick={() => startEditStaff(staff)}
												class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
												<span class="material-symbols-rounded text-base">edit</span>
											</button>
											<button type="button" onclick={() => toggleAdmin(staff)}
												class="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50">
												<span class="material-symbols-rounded text-base">{staff.is_admin ? 'shield' : 'shield_with_heart'}</span>
											</button>
											{#if staff.is_active}
												<button type="button" onclick={() => deactivate(staff)}
													class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
													<span class="material-symbols-rounded text-base">person_off</span>
												</button>
											{/if}
										</div>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

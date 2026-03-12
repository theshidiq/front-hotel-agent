<script lang="ts">
import type { BackupAssignment, ScheduleStaff, ScheduleStaffGroup } from '../types';
import {
  getBackupAssignments,
  createBackupAssignment,
  updateBackupAssignment,
  deleteBackupAssignment,
} from '../api';

interface Props {
  allStaff: ScheduleStaff[];
  staffGroups: ScheduleStaffGroup[];
  departmentId?: string;
}

let { allStaff, staffGroups, departmentId }: Props = $props();

let assignments = $state<BackupAssignment[]>([]);
let loading = $state(false);
let loadingId = $state<string | null>(null);
let error = $state<string | null>(null);
let successMessage = $state<string | null>(null);
let deletingId = $state<string | null>(null);

// Add form state
let showAddForm = $state(false);
let addStaffId = $state('');
let addGroupId = $state('');

function showSuccess(msg: string) {
  successMessage = msg;
  setTimeout(() => { successMessage = null; }, 3000);
}

async function load() {
  try {
    loading = true;
    error = null;
    assignments = await getBackupAssignments(departmentId);
  } catch (e) {
    error = e instanceof Error ? e.message : '読み込みに失敗しました';
  } finally {
    loading = false;
  }
}

// Load on mount and when departmentId changes
$effect(() => {
  void departmentId;
  load();
});

function getStaffName(staffId: string): string {
  return allStaff.find(s => String(s.id) === String(staffId))?.name ?? staffId;
}

function getGroupName(groupId: string): string {
  return staffGroups.find(g => g.id === groupId)?.name ?? groupId;
}

// Staff not already assigned as backup for a given group
function availableStaffForGroup(groupId: string): ScheduleStaff[] {
  const assignedIds = new Set(
    assignments.filter(a => a.groupId === groupId).map(a => a.staffId)
  );
  return allStaff.filter(s => s.is_active && !assignedIds.has(String(s.id)));
}

async function handleAdd() {
  if (!addStaffId || !addGroupId) return;
  try {
    loadingId = 'add';
    error = null;
    const created = await createBackupAssignment({ staffId: addStaffId, groupId: addGroupId });
    assignments = [...assignments, created];
    showAddForm = false;
    addStaffId = '';
    addGroupId = '';
    showSuccess('バックアップ担当を追加しました');
  } catch (e) {
    error = e instanceof Error ? e.message : '追加に失敗しました';
  } finally {
    loadingId = null;
  }
}

async function handleToggleActive(assignment: BackupAssignment) {
  try {
    loadingId = assignment.id;
    error = null;
    const updated = await updateBackupAssignment(assignment.id, { isActive: !assignment.isActive });
    assignments = assignments.map(a => a.id === updated.id ? updated : a);
    showSuccess(updated.isActive ? '有効にしました' : '無効にしました');
  } catch (e) {
    error = e instanceof Error ? e.message : '更新に失敗しました';
  } finally {
    loadingId = null;
  }
}

async function handleDelete(id: string) {
  try {
    loadingId = id;
    error = null;
    await deleteBackupAssignment(id);
    assignments = assignments.filter(a => a.id !== id);
    deletingId = null;
    showSuccess('削除しました');
  } catch (e) {
    error = e instanceof Error ? e.message : '削除に失敗しました';
  } finally {
    loadingId = null;
  }
}
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-lg font-medium text-gray-900">バックアップカバレッジ</h3>
      <p class="mt-1 text-sm text-gray-500">
        特定グループが不足したときに代わりに入るスタッフを設定します。OR-Toolsが優先的に割り当てます。
      </p>
    </div>
    <button
      onclick={() => { showAddForm = !showAddForm; addStaffId = ''; addGroupId = ''; }}
      disabled={loading}
      class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      <span class="material-symbols-rounded text-xl">{showAddForm ? 'close' : 'add'}</span>
      {showAddForm ? 'キャンセル' : '追加'}
    </button>
  </div>

  <!-- Info banner -->
  <div class="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
    <span class="material-symbols-rounded text-blue-600 mt-0.5 shrink-0">backup</span>
    <div>
      <span class="font-medium">OR-Tools連携：</span>
      バックアップスタッフは通常グループの休み制約から除外され、カバレッジルールに従って自動配置されます。
    </div>
  </div>

  <!-- Success toast -->
  {#if successMessage}
    <div class="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
      <span class="material-symbols-rounded text-green-600">check_circle</span>
      {successMessage}
    </div>
  {/if}

  <!-- Error -->
  {#if error}
    <div class="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
      <span class="material-symbols-rounded text-red-600">error</span>
      <p class="flex-1 text-sm text-red-700">{error}</p>
      <button onclick={() => error = null} class="text-red-600 hover:text-red-800">
        <span class="material-symbols-rounded">close</span>
      </button>
    </div>
  {/if}

  <!-- Add Form -->
  {#if showAddForm}
    <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
      <h4 class="text-sm font-medium text-gray-700">新しいバックアップ担当を追加</h4>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">バックアップスタッフ</label>
          <select
            bind:value={addStaffId}
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">スタッフを選択...</option>
            {#each allStaff.filter(s => s.is_active) as s (s.id)}
              <option value={s.id}>{s.name}（{s.status || s.staff_status || '-'}）</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">カバーするグループ</label>
          <select
            bind:value={addGroupId}
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">グループを選択...</option>
            {#each staffGroups as g (g.id)}
              <option value={g.id}>{g.name}</option>
            {/each}
          </select>
        </div>
      </div>
      <div class="flex justify-end">
        <button
          onclick={handleAdd}
          disabled={!addStaffId || !addGroupId || loadingId === 'add'}
          class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loadingId === 'add' ? '追加中...' : '追加'}
        </button>
      </div>
    </div>
  {/if}

  <!-- List -->
  {#if loading}
    <div class="py-10 text-center text-sm text-gray-400">読み込み中...</div>
  {:else if assignments.length === 0}
    <div class="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <span class="material-symbols-rounded text-5xl text-gray-400 mb-3">backup</span>
      <h3 class="text-base font-medium text-gray-700 mb-1">バックアップ担当がいません</h3>
      <p class="text-sm text-gray-400">「追加」ボタンからスタッフをグループに割り当ててください</p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each assignments as a (a.id)}
        <div class="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
          <!-- Active toggle -->
          <button
            onclick={() => handleToggleActive(a)}
            disabled={loadingId === a.id}
            title={a.isActive ? '無効にする' : '有効にする'}
            class="shrink-0 w-10 h-6 rounded-full transition-colors {a.isActive ? 'bg-blue-500' : 'bg-gray-300'} relative disabled:opacity-50"
          >
            <span
              class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform {a.isActive ? 'translate-x-4' : 'translate-x-0.5'}"
            ></span>
          </button>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-medium text-gray-900">{getStaffName(a.staffId)}</span>
              <span class="material-symbols-rounded text-gray-400 text-sm">arrow_forward</span>
              <span class="text-sm text-gray-600">{getGroupName(a.groupId)}</span>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-xs px-1.5 py-0.5 rounded {a.isActive ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}">
                {a.isActive ? '有効' : '無効'}
              </span>
              {#if a.assignmentType}
                <span class="text-xs text-gray-400">{a.assignmentType}</span>
              {/if}
            </div>
          </div>

          <!-- Delete -->
          <button
            onclick={() => deletingId = a.id}
            disabled={loadingId === a.id}
            class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
            title="削除"
          >
            <span class="material-symbols-rounded text-lg">delete</span>
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Delete Confirmation Modal -->
{#if deletingId !== null}
  {@const target = assignments.find(a => a.id === deletingId)}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
    <div class="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
      <div class="flex items-start gap-4 mb-4">
        <div class="p-3 bg-red-100 rounded-full shrink-0">
          <span class="material-symbols-rounded text-red-600 text-2xl">warning</span>
        </div>
        <div>
          <h3 class="text-base font-medium text-gray-900">バックアップ担当を削除</h3>
          {#if target}
            <p class="mt-1 text-sm text-gray-500">
              「{getStaffName(target.staffId)}」→「{getGroupName(target.groupId)}」の設定を削除しますか？
            </p>
          {/if}
        </div>
      </div>
      <div class="flex gap-3 justify-end">
        <button
          onclick={() => deletingId = null}
          disabled={loadingId === deletingId}
          class="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          キャンセル
        </button>
        <button
          onclick={() => deletingId && handleDelete(deletingId)}
          disabled={loadingId === deletingId}
          class="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {loadingId === deletingId ? '削除中...' : '削除'}
        </button>
      </div>
    </div>
  </div>
{/if}

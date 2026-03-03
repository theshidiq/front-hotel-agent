<script lang="ts">
import { untrack } from 'svelte';
import type { ScheduleStaffGroup, ScheduleStaff } from '../types';
import {
  createStaffGroup,
  updateStaffGroup,
  deleteStaffGroup,
  setStaffGroupMembers
} from '../api';

interface Props {
  staffGroups: ScheduleStaffGroup[];
  allStaff: ScheduleStaff[];
  onGroupsChange: () => Promise<void>;
}

let { staffGroups, allStaff, onGroupsChange }: Props = $props();

const COLOR_PRESETS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#78716C', '#71717A', '#64748B',
  '#0F766E', '#0369A1', '#4338CA', '#7C3AED', '#BE185D',
  '#B91C1C', '#C2410C', '#A16207', '#4D7C0F', '#15803D'
];

// Active staff only (is_active === true)
let activeStaff = $derived(allStaff.filter(s => s.is_active !== false));

// State
let loading = $state(false);
let error = $state<string | null>(null);
let successMessage = $state<string | null>(null);
let editingGroupId = $state<string | null>(null);
let deletingGroupId = $state<string | null>(null);
let groupMembers = $state<Map<string, string[]>>(new Map());
let editForm = $state<{ name: string; description: string; color: string }>({
  name: '',
  description: '',
  color: ''
});
let showColorPicker = $state<string | null>(null);
let addingMemberToGroup = $state<string | null>(null);
let selectedStaffId = $state<string | null>(null);

// Derived: available active staff not yet in the group being edited
let availableStaff = $derived.by(() => {
  if (addingMemberToGroup === null) return [];
  const currentIds = groupMembers.get(addingMemberToGroup) || [];
  return activeStaff.filter(s => !currentIds.includes(String(s.id)));
});

// Sync members from group_config.members when prop changes.
// Filter out any stored IDs that don't match an active staff member,
// and silently persist the cleanup to DB if stale IDs were found.
$effect(() => {
  const groups = staffGroups;
  const staff = activeStaff;
  untrack(async () => {
    const activeIds = new Set(staff.map(s => String(s.id)));
    const newMap = new Map<string, string[]>();
    const toClean: { groupId: string; cleanIds: string[] }[] = [];

    for (const group of groups) {
      const raw = (group.group_config?.members as string[]) || [];
      const cleanIds = raw.filter(id => activeIds.has(id));
      newMap.set(group.id, cleanIds);
      // If stale IDs were removed, queue a DB cleanup
      if (cleanIds.length !== raw.length) {
        toClean.push({ groupId: group.id, cleanIds });
      }
    }
    groupMembers = newMap;

    // Silently remove stale member IDs from DB
    for (const { groupId, cleanIds } of toClean) {
      try {
        await setStaffGroupMembers(groupId, cleanIds);
      } catch {
        // Best-effort cleanup, ignore errors
      }
    }
  });
});

function getGroupColor(group: ScheduleStaffGroup): string {
  return group.group_config?.color || '#3B82F6';
}

// Pick a color not already used by existing groups
function getUniqueColor(): string {
  const usedColors = new Set(staffGroups.map(g => getGroupColor(g)));
  const unused = COLOR_PRESETS.filter(c => !usedColors.has(c));
  const pool = unused.length > 0 ? unused : COLOR_PRESETS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function showSuccess(message: string) {
  successMessage = message;
  setTimeout(() => { successMessage = null; }, 3000);
}

async function handleAddGroup() {
  try {
    loading = true;
    error = null;
    await createStaffGroup({
      name: '新しいグループ',
      description: '',
      color: getUniqueColor()
    });
    await onGroupsChange();
    showSuccess('グループを作成しました');
  } catch (err) {
    error = err instanceof Error ? err.message : 'グループの作成に失敗しました';
  } finally {
    loading = false;
  }
}

function startEdit(group: ScheduleStaffGroup) {
  editingGroupId = group.id;
  editForm = {
    name: group.name,
    description: group.description || '',
    color: getGroupColor(group)
  };
  showColorPicker = null;
}

function cancelEdit() {
  editingGroupId = null;
  editForm = { name: '', description: '', color: '' };
  showColorPicker = null;
}

async function saveEdit(groupId: string) {
  try {
    loading = true;
    error = null;
    await updateStaffGroup(groupId, {
      name: editForm.name,
      description: editForm.description || undefined,
      color: editForm.color
    });
    await onGroupsChange();
    editingGroupId = null;
    showColorPicker = null;
    showSuccess('グループを更新しました');
  } catch (err) {
    error = err instanceof Error ? err.message : 'グループの更新に失敗しました';
  } finally {
    loading = false;
  }
}

async function handleDeleteGroup(groupId: string) {
  try {
    loading = true;
    error = null;
    await deleteStaffGroup(groupId);
    await onGroupsChange();
    deletingGroupId = null;
    showSuccess('グループを削除しました');
  } catch (err) {
    error = err instanceof Error ? err.message : 'グループの削除に失敗しました';
  } finally {
    loading = false;
  }
}

function selectColor(groupId: string, color: string) {
  if (editingGroupId === groupId) {
    editForm.color = color;
  }
  showColorPicker = null;
}

async function handleAddMember(groupId: string) {
  if (!selectedStaffId) return;
  try {
    loading = true;
    error = null;
    const current = groupMembers.get(groupId) || [];
    const newIds = [...current, selectedStaffId];
    await setStaffGroupMembers(groupId, newIds);
    groupMembers.set(groupId, newIds);
    groupMembers = new Map(groupMembers);
    addingMemberToGroup = null;
    selectedStaffId = null;
    await onGroupsChange();
    showSuccess('メンバーを追加しました');
  } catch (err) {
    error = err instanceof Error ? err.message : 'メンバーの追加に失敗しました';
  } finally {
    loading = false;
  }
}

async function handleRemoveMember(groupId: string, staffId: string) {
  try {
    loading = true;
    error = null;
    const current = groupMembers.get(groupId) || [];
    const newIds = current.filter(id => id !== staffId);
    await setStaffGroupMembers(groupId, newIds);
    groupMembers.set(groupId, newIds);
    groupMembers = new Map(groupMembers);
    await onGroupsChange();
    showSuccess('メンバーを削除しました');
  } catch (err) {
    error = err instanceof Error ? err.message : 'メンバーの削除に失敗しました';
  } finally {
    loading = false;
  }
}

// Only return active staff members
function getStaffById(staffId: string): ScheduleStaff | undefined {
  return activeStaff.find(s => String(s.id) === String(staffId));
}

// groupMembers is already filtered to active staff only (see $effect above)
function getActiveMemberIds(groupId: string): string[] {
  return groupMembers.get(groupId) || [];
}
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-lg font-medium text-gray-900">スタッフグループ</h3>
      <p class="mt-1 text-sm text-gray-500">
        グループ単位でシフト制約を設定します。同じグループから1日に複数人が休めないようにOR-Toolsが調整します。
      </p>
    </div>
    <button
      onclick={handleAddGroup}
      disabled={loading}
      class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      <span class="material-symbols-rounded text-xl">add</span>
      グループを追加
    </button>
  </div>

  <!-- OR-Tools info banner -->
  <div class="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
    <span class="material-symbols-rounded text-blue-600 mt-0.5 shrink-0">auto_fix_high</span>
    <div>
      <span class="font-medium">OR-Tools連携：</span>
      同じグループのスタッフが同じ日に休む（×）のを最小化します。ハード制約にすると必ず1人以下になります。
    </div>
  </div>

  <!-- Success toast -->
  {#if successMessage}
    <div class="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
      <span class="material-symbols-rounded text-green-600">check_circle</span>
      {successMessage}
    </div>
  {/if}

  <!-- Error Display -->
  {#if error}
    <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-start gap-3">
        <span class="material-symbols-rounded text-red-600">error</span>
        <div class="flex-1">
          <p class="text-sm text-red-700">{error}</p>
        </div>
        <button onclick={() => error = null} class="text-red-600 hover:text-red-800">
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
    </div>
  {/if}

  <!-- Groups Grid -->
  {#if staffGroups.length === 0}
    <div class="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <span class="material-symbols-rounded text-6xl text-gray-400 mb-4">group</span>
      <h3 class="text-lg font-medium text-gray-900 mb-2">グループがありません</h3>
      <p class="text-sm text-gray-500 mb-6">最初のグループを作成してスタッフを管理しましょう</p>
      <button
        onclick={handleAddGroup}
        disabled={loading}
        class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        <span class="material-symbols-rounded text-xl">add</span>
        グループを追加
      </button>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {#each staffGroups as group (group.id)}
        {@const groupColor = editingGroupId === group.id ? editForm.color : getGroupColor(group)}
        {@const activeMemberIds = getActiveMemberIds(group.id)}
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div class="p-4">
            <!-- Group Header -->
            <div class="flex items-start gap-3 mb-3">
              <!-- Color dot (clickable in edit mode) -->
              <div class="relative mt-0.5">
                <button
                  onclick={() => {
                    if (editingGroupId === group.id) {
                      showColorPicker = showColorPicker === group.id ? null : group.id;
                    }
                  }}
                  disabled={editingGroupId !== group.id}
                  class="w-7 h-7 rounded-full border-2 border-white shadow transition-transform {editingGroupId === group.id ? 'hover:scale-110 cursor-pointer ring-2 ring-gray-200' : 'cursor-default'}"
                  style="background-color: {groupColor}"
                  title={editingGroupId === group.id ? '色を変更' : ''}
                ></button>

                {#if showColorPicker === group.id}
                  <div class="absolute z-20 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-xl">
                    <div class="grid grid-cols-6 gap-1.5 w-44">
                      {#each COLOR_PRESETS as color}
                        <button
                          onclick={() => selectColor(group.id, color)}
                          class="w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform"
                          class:border-gray-800={editForm.color === color}
                          class:border-transparent={editForm.color !== color}
                          style="background-color: {color}"
                        ></button>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>

              <!-- Name & member count -->
              <div class="flex-1 min-w-0">
                {#if editingGroupId === group.id}
                  <input
                    type="text"
                    bind:value={editForm.name}
                    class="w-full px-2 py-1 text-sm font-medium border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="グループ名"
                  />
                {:else}
                  <h4 class="text-sm font-semibold text-gray-900 truncate">{group.name}</h4>
                {/if}
                <p class="text-xs text-gray-500 mt-0.5">
                  <span class="font-medium text-gray-700">{activeMemberIds.length}</span> 人のメンバー
                  {#if activeMemberIds.length > 0}
                    <span class="ml-1 text-gray-400">· OR-Tools有効</span>
                  {/if}
                </p>
              </div>

              <!-- Actions -->
              {#if editingGroupId === group.id}
                <div class="flex gap-1">
                  <button
                    onclick={() => saveEdit(group.id)}
                    disabled={loading || !editForm.name.trim()}
                    class="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                    title="保存"
                  >
                    <span class="material-symbols-rounded text-lg">check</span>
                  </button>
                  <button
                    onclick={cancelEdit}
                    disabled={loading}
                    class="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors disabled:opacity-50"
                    title="キャンセル"
                  >
                    <span class="material-symbols-rounded text-lg">close</span>
                  </button>
                </div>
              {:else}
                <div class="flex gap-1">
                  <button
                    onclick={() => startEdit(group)}
                    disabled={loading}
                    class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors disabled:opacity-50"
                    title="編集"
                  >
                    <span class="material-symbols-rounded text-lg">edit</span>
                  </button>
                  <button
                    onclick={() => deletingGroupId = group.id}
                    disabled={loading}
                    class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="削除"
                  >
                    <span class="material-symbols-rounded text-lg">delete</span>
                  </button>
                </div>
              {/if}
            </div>

            <!-- Description (edit mode) -->
            {#if editingGroupId === group.id}
              <textarea
                bind:value={editForm.description}
                class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-3"
                placeholder="説明（任意）"
                rows="2"
              ></textarea>
            {:else if group.description}
              <p class="text-xs text-gray-500 mb-3 line-clamp-2">{group.description}</p>
            {/if}

            <!-- Members Section -->
            <div class="border-t border-gray-100 pt-3">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-medium text-gray-500">メンバー</span>
                <button
                  onclick={() => { addingMemberToGroup = group.id; selectedStaffId = null; }}
                  disabled={loading || editingGroupId === group.id}
                  class="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                  title="メンバーを追加"
                >
                  <span class="material-symbols-rounded text-sm">person_add</span>
                </button>
              </div>

              <!-- Add Member Dropdown -->
              {#if addingMemberToGroup === group.id}
                <div class="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <select
                    bind:value={selectedStaffId}
                    class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2 bg-white"
                  >
                    <option value={null}>スタッフを選択...</option>
                    {#each availableStaff as s (s.id)}
                      <option value={s.id}>{s.name}（{s.status || s.staff_status || '-'}）</option>
                    {/each}
                  </select>
                  <div class="flex gap-1.5">
                    <button
                      onclick={() => handleAddMember(group.id)}
                      disabled={loading || !selectedStaffId}
                      class="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      追加
                    </button>
                    <button
                      onclick={() => { addingMemberToGroup = null; selectedStaffId = null; }}
                      class="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              {/if}

              <!-- Member list — only active staff shown -->
              <div class="space-y-1 max-h-36 overflow-y-auto">
                {#if activeMemberIds.length === 0}
                  <p class="text-xs text-gray-400 italic py-2 text-center">メンバーがいません</p>
                {:else}
                  {#each activeMemberIds as staffId (staffId)}
                    {@const s = getStaffById(staffId)}
                    {#if s}
                      <div class="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                        <div class="flex items-center gap-2 min-w-0">
                          <div class="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                               style="background-color: {groupColor}">
                            {s.name.charAt(0)}
                          </div>
                          <span class="text-xs font-medium truncate">{s.name}</span>
                          <span class="text-xs text-gray-400 shrink-0">({s.status || s.staff_status || '-'})</span>
                        </div>
                        <button
                          onclick={() => handleRemoveMember(group.id, s.id)}
                          disabled={loading || editingGroupId === group.id}
                          class="p-0.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50 shrink-0"
                          title="削除"
                        >
                          <span class="material-symbols-rounded text-sm">close</span>
                        </button>
                      </div>
                    {/if}
                  {/each}
                {/if}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Delete Confirmation Modal -->
  {#if deletingGroupId !== null}
    {@const deletingGroup = staffGroups.find(g => g.id === deletingGroupId)}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-start gap-4 mb-4">
          <div class="p-3 bg-red-100 rounded-full shrink-0">
            <span class="material-symbols-rounded text-red-600 text-2xl">warning</span>
          </div>
          <div>
            <h3 class="text-lg font-medium text-gray-900">グループを削除</h3>
            <p class="mt-2 text-sm text-gray-600">
              「{deletingGroup?.name}」を削除してもよろしいですか？<br/>
              この操作は取り消せません。メンバー設定も失われます。
            </p>
          </div>
        </div>
        <div class="flex gap-3 justify-end">
          <button
            onclick={() => deletingGroupId = null}
            disabled={loading}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onclick={() => deletingGroupId && handleDeleteGroup(deletingGroupId)}
            disabled={loading}
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '削除中...' : '削除'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>

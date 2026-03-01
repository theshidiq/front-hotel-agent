<script lang="ts">
import type { ScheduleStaffGroup, ScheduleStaff } from '../types';
import {
  getStaffGroups,
  createStaffGroup,
  updateStaffGroup,
  deleteStaffGroup,
  getStaffGroupMembers,
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

// State
let loading = $state(false);
let error = $state<string | null>(null);
let editingGroupId = $state<string | null>(null);
let deletingGroupId = $state<string | null>(null);
let groupMembers = $state<Map<string, { staff_id: string; group_id: string }[]>>(new Map());
let editForm = $state<{ name: string; description: string; color: string }>({
  name: '',
  description: '',
  color: ''
});
let showColorPicker = $state<string | null>(null);
let addingMemberToGroup = $state<string | null>(null);
let selectedStaffId = $state<string | null>(null);

// Derived state
let availableStaff = $derived.by(() => {
  if (addingMemberToGroup === null) return [];

  const groupMemberIds = groupMembers.get(addingMemberToGroup)?.map(m => String(m.staff_id)) || [];
  return allStaff.filter(staff => !groupMemberIds.includes(String(staff.id)));
});

// Load members for all groups
async function loadAllMembers() {
  for (const group of staffGroups) {
    const members = await getStaffGroupMembers(group.id);
    groupMembers.set(group.id, members);
  }
}

// Initial load
$effect(() => {
  loadAllMembers();
});

function getRandomColor(): string {
  return COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)];
}

async function handleAddGroup() {
  try {
    loading = true;
    error = null;

    await createStaffGroup({
      name: '新しいグループ',
      description: '',
      color: getRandomColor()
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
    color: group.color || '#3B82F6'
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

    const currentMembers = groupMembers.get(groupId) || [];
    const newMemberIds = [...currentMembers.map(m => String(m.staff_id)), selectedStaffId];

    await setStaffGroupMembers(groupId, newMemberIds);

    // Reload members
    const updatedMembers = await getStaffGroupMembers(groupId);
    groupMembers.set(groupId, updatedMembers);

    addingMemberToGroup = null;
    selectedStaffId = null;
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

    const currentMembers = groupMembers.get(groupId) || [];
    const newMemberIds = currentMembers
      .map(m => String(m.staff_id))
      .filter(id => id !== staffId);

    await setStaffGroupMembers(groupId, newMemberIds);

    // Reload members
    const updatedMembers = await getStaffGroupMembers(groupId);
    groupMembers.set(groupId, updatedMembers);

    showSuccess('メンバーを削除しました');
  } catch (err) {
    error = err instanceof Error ? err.message : 'メンバーの削除に失敗しました';
  } finally {
    loading = false;
  }
}

function getStaffById(staffId: string): ScheduleStaff | undefined {
  return allStaff.find(s => String(s.id) === String(staffId));
}

function getMemberCount(groupId: string): number {
  return groupMembers.get(groupId)?.length || 0;
}

function showSuccess(message: string) {
  // Toast notification - integrate with your toast system
  console.log('Success:', message);
}
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-lg font-medium text-gray-900">スタッフグループ</h3>
      <p class="mt-1 text-sm text-gray-500">
        スタッフをグループにまとめて管理できます
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

  <!-- Error Display -->
  {#if error}
    <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-start gap-3">
        <span class="material-symbols-rounded text-red-600">error</span>
        <div class="flex-1">
          <h4 class="text-sm font-medium text-red-800">エラー</h4>
          <p class="mt-1 text-sm text-red-700">{error}</p>
        </div>
        <button
          onclick={() => error = null}
          class="text-red-600 hover:text-red-800"
        >
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
      <p class="text-sm text-gray-500 mb-6">
        最初のグループを作成してスタッフを管理しましょう
      </p>
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
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {#each staffGroups as group (group.id)}
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <!-- Group Header -->
          <div class="flex items-start gap-3 mb-4">
            <!-- Color Indicator -->
            <div class="relative">
              <button
                onclick={() => {
                  if (editingGroupId === group.id) {
                    showColorPicker = showColorPicker === group.id ? null : group.id;
                  }
                }}
                disabled={editingGroupId !== group.id}
                class="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors disabled:cursor-default"
                style="background-color: {editingGroupId === group.id ? editForm.color : (group.color || '#3B82F6')}"
              ></button>

              {#if showColorPicker === group.id}
                <div class="absolute z-10 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
                  <div class="grid grid-cols-6 gap-2 w-48">
                    {#each COLOR_PRESETS as color}
                      <button
                        onclick={() => selectColor(group.id, color)}
                        class="w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform"
                        class:border-gray-800={editForm.color === color}
                        class:border-gray-300={editForm.color !== color}
                        style="background-color: {color}"
                      ></button>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>

            <!-- Group Name & Actions -->
            <div class="flex-1 min-w-0">
              {#if editingGroupId === group.id}
                <input
                  type="text"
                  bind:value={editForm.name}
                  class="w-full px-2 py-1 text-sm font-medium border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="グループ名"
                />
              {:else}
                <h4 class="text-sm font-medium text-gray-900 truncate">
                  {group.name}
                </h4>
              {/if}
              <p class="text-xs text-gray-500 mt-1">
                {getMemberCount(group.id)} 人のメンバー
              </p>
            </div>

            <!-- Action Buttons -->
            {#if editingGroupId === group.id}
              <div class="flex gap-1">
                <button
                  onclick={() => saveEdit(group.id)}
                  disabled={loading}
                  class="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                  title="保存"
                >
                  <span class="material-symbols-rounded text-lg">check</span>
                </button>
                <button
                  onclick={cancelEdit}
                  disabled={loading}
                  class="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors disabled:opacity-50"
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
                  class="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                  title="編集"
                >
                  <span class="material-symbols-rounded text-lg">edit</span>
                </button>
                <button
                  onclick={() => deletingGroupId = group.id}
                  disabled={loading}
                  class="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  title="削除"
                >
                  <span class="material-symbols-rounded text-lg">delete</span>
                </button>
              </div>
            {/if}
          </div>

          <!-- Description -->
          {#if editingGroupId === group.id}
            <textarea
              bind:value={editForm.description}
              class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="説明（任意）"
              rows="2"
            ></textarea>
          {:else if group.description}
            <p class="text-xs text-gray-600 mb-3 line-clamp-2">
              {group.description}
            </p>
          {/if}

          <!-- Members List -->
          <div class="mt-4 border-t border-gray-200 pt-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-gray-700">メンバー</span>
              <button
                onclick={() => {
                  addingMemberToGroup = group.id;
                  selectedStaffId = null;
                }}
                disabled={loading || editingGroupId === group.id}
                class="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                title="メンバーを追加"
              >
                <span class="material-symbols-rounded text-sm">person_add</span>
              </button>
            </div>

            <!-- Add Member Dropdown -->
            {#if addingMemberToGroup === group.id}
              <div class="mb-2 p-2 bg-blue-50 rounded border border-blue-200">
                <select
                  bind:value={selectedStaffId}
                  class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                >
                  <option value={null}>スタッフを選択...</option>
                  {#each availableStaff as staff (staff.id)}
                    <option value={staff.id}>
                      {staff.name} ({staff.staff_status})
                    </option>
                  {/each}
                </select>
                <div class="flex gap-1">
                  <button
                    onclick={() => handleAddMember(group.id)}
                    disabled={loading || !selectedStaffId}
                    class="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    追加
                  </button>
                  <button
                    onclick={() => {
                      addingMemberToGroup = null;
                      selectedStaffId = null;
                    }}
                    class="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            {/if}

            <!-- Member Badges -->
            <div class="max-h-32 overflow-y-auto space-y-1">
              {#if getMemberCount(group.id) === 0}
                <p class="text-xs text-gray-400 italic py-2">
                  メンバーがいません
                </p>
              {:else}
                {#each groupMembers.get(group.id) || [] as member (member.staff_id)}
                  {@const staff = getStaffById(member.staff_id)}
                  {#if staff}
                    <div class="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded text-xs hover:bg-gray-100 transition-colors">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="material-symbols-rounded text-sm text-gray-600">person</span>
                        <span class="truncate font-medium">{staff.name}</span>
                        <span class="text-gray-500 shrink-0">({staff.staff_status})</span>
                      </div>
                      <button
                        onclick={() => handleRemoveMember(group.id, staff.id)}
                        disabled={loading || editingGroupId === group.id}
                        class="p-0.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
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
      {/each}
    </div>
  {/if}

  <!-- Delete Confirmation Modal -->
  {#if deletingGroupId !== null}
    {@const deletingGroup = staffGroups.find(g => g.id === deletingGroupId)}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-start gap-4 mb-4">
          <div class="p-3 bg-red-100 rounded-full">
            <span class="material-symbols-rounded text-red-600 text-2xl">warning</span>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-medium text-gray-900">グループを削除</h3>
            <p class="mt-2 text-sm text-gray-600">
              「{deletingGroup?.name}」を削除してもよろしいですか？<br/>
              この操作は取り消せません。
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

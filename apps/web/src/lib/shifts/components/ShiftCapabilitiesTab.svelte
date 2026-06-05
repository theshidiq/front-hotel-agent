<script lang="ts">
import type { ScheduleStaff } from '../types';
import { updateShiftStaff } from '../api';
import { isStaffActiveInCurrentPeriod } from '../staffUtils';

interface Props {
  allStaff: ScheduleStaff[];
  onStaffChange: () => Promise<void>;
  departmentId?: string;
}

let { allStaff, onStaffChange, departmentId }: Props = $props();

const today = new Date().toISOString().slice(0, 10);
const STATUS_ORDER: Record<string, number> = { '社員': 0, '派遣': 1, 'パート': 2 };
let activeStaff = $derived(
  allStaff
    .filter(s => isStaffActiveInCurrentPeriod(s, [today]))
    .sort((a, b) => {
      const sa = a.status || a.staff_status || '社員';
      const sb = b.status || b.staff_status || '社員';
      return (STATUS_ORDER[sa] ?? 99) - (STATUS_ORDER[sb] ?? 99);
    })
);

// Status types that have default restrictions (派遣, パート)
const RESTRICTED_STATUSES = new Set(['派遣', 'パート']);

let loadingId = $state<string | null>(null);
let error = $state<string | null>(null);
let successMessage = $state<string | null>(null);

function showSuccess(msg: string) {
  successMessage = msg;
  setTimeout(() => { successMessage = null; }, 3000);
}

function getCapabilities(staff: ScheduleStaff): { canDoEarlyShifts: boolean | null; canDoLateShifts: boolean | null } {
  const caps = (staff.metadata as any)?.capabilities ?? {};
  return {
    canDoEarlyShifts: caps.canDoEarlyShifts ?? null,
    canDoLateShifts: caps.canDoLateShifts ?? null,
  };
}

// Effective value: null → inherit from status default
function effectiveCanDo(staff: ScheduleStaff, key: 'canDoEarlyShifts' | 'canDoLateShifts'): boolean {
  const caps = getCapabilities(staff);
  const override = caps[key];
  if (override !== null) return override;
  // Status default: restricted statuses can NOT do early/late
  const status = staff.status || staff.staff_status || '社員';
  return !RESTRICTED_STATUSES.has(status);
}

function isOverridden(staff: ScheduleStaff, key: 'canDoEarlyShifts' | 'canDoLateShifts'): boolean {
  return getCapabilities(staff)[key] !== null;
}

async function setCapability(staff: ScheduleStaff, key: 'canDoEarlyShifts' | 'canDoLateShifts', value: boolean | null) {
  try {
    loadingId = `${staff.id}-${key}`;
    error = null;

    const currentCaps = (staff.metadata as any)?.capabilities ?? {};
    const newCaps: Record<string, boolean | null> = { ...currentCaps };

    if (value === null) {
      delete newCaps[key]; // Remove override → revert to status default
    } else {
      newCaps[key] = value;
    }

    const newMetadata = {
      ...(staff.metadata as Record<string, unknown> ?? {}),
      capabilities: newCaps,
    };

    await updateShiftStaff(staff.id, { metadata: newMetadata });
    await onStaffChange();
    showSuccess(`${staff.name} のシフト能力を更新しました`);
  } catch (e) {
    error = e instanceof Error ? e.message : '更新に失敗しました';
  } finally {
    loadingId = null;
  }
}

// Status badge color
function statusColor(status: string | undefined): string {
  if (status === '派遣') return 'bg-orange-100 text-orange-700';
  if (status === 'パート') return 'bg-purple-100 text-purple-700';
  return 'bg-blue-100 text-slate-800';
}
</script>

<div class="space-y-6">
  <!-- Header -->
  <div>
    <h3 class="text-lg font-medium text-gray-900">シフト能力設定</h3>
    <p class="mt-1 text-sm text-gray-500">
      スタッフごとに早番・遅番の可否をオーバーライドします。未設定の場合は雇用区分のデフォルトに従います。
    </p>
  </div>

  <!-- Info banner -->
  <div class="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-slate-900">
    <span class="material-symbols-rounded text-slate-800 mt-0.5 shrink-0">info</span>
    <div>
      <span class="font-medium">デフォルト設定：</span>
      <span class="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">派遣</span>
      <span class="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium ml-1">パート</span>
      は早番・遅番不可。
      <span class="px-1.5 py-0.5 bg-blue-100 text-slate-800 rounded text-xs font-medium ml-1">社員</span>
      はすべて可。個別に変更した項目は「上書き」と表示されます。
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

  <!-- Table -->
  {#if activeStaff.length === 0}
    <div class="text-center py-10 text-sm text-gray-400">スタッフがいません</div>
  {:else}
    <div class="overflow-x-auto rounded-lg border border-gray-200">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-200">
            <th class="text-left px-4 py-3 font-medium text-gray-600 w-48">スタッフ</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600 w-24">区分</th>
            <th class="text-center px-4 py-3 font-medium text-gray-600">
              早番 △
            </th>
            <th class="text-center px-4 py-3 font-medium text-gray-600">
              遅番 ◇
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each activeStaff as s (s.id)}
            {@const caps = getCapabilities(s)}
            {@const canEarly = effectiveCanDo(s, 'canDoEarlyShifts')}
            {@const canLate = effectiveCanDo(s, 'canDoLateShifts')}
            {@const earlyOverridden = isOverridden(s, 'canDoEarlyShifts')}
            {@const lateOverridden = isOverridden(s, 'canDoLateShifts')}
            {@const status = s.status || s.staff_status || '社員'}
            <tr class="hover:bg-gray-50 transition-colors">
              <!-- Name -->
              <td class="px-4 py-3">
                <span class="font-medium text-gray-900">{s.name}</span>
              </td>
              <!-- Status badge -->
              <td class="px-4 py-3">
                <span class="text-xs px-2 py-0.5 rounded-full font-medium {statusColor(status)}">
                  {status}
                </span>
              </td>
              <!-- Early shift toggle -->
              <td class="px-4 py-3">
                <div class="flex flex-col items-center gap-1">
                  <button
                    onclick={() => setCapability(s, 'canDoEarlyShifts', !canEarly)}
                    disabled={loadingId === `${s.id}-canDoEarlyShifts`}
                    title={canEarly ? '早番可 → クリックで不可に' : '早番不可 → クリックで可に'}
                    class="w-10 h-6 rounded-full transition-colors relative disabled:opacity-50 {canEarly ? 'bg-green-500' : 'bg-gray-300'}"
                  >
                    <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform {canEarly ? 'translate-x-4' : 'translate-x-0.5'}"></span>
                  </button>
                  {#if earlyOverridden}
                    <button
                      onclick={() => setCapability(s, 'canDoEarlyShifts', null)}
                      disabled={loadingId === `${s.id}-canDoEarlyShifts`}
                      class="text-[10px] text-amber-600 hover:text-amber-800 underline leading-none"
                      title="デフォルトに戻す"
                    >
                      上書き中
                    </button>
                  {:else}
                    <span class="text-[10px] text-gray-400 leading-none">デフォルト</span>
                  {/if}
                </div>
              </td>
              <!-- Late shift toggle -->
              <td class="px-4 py-3">
                <div class="flex flex-col items-center gap-1">
                  <button
                    onclick={() => setCapability(s, 'canDoLateShifts', !canLate)}
                    disabled={loadingId === `${s.id}-canDoLateShifts`}
                    title={canLate ? '遅番可 → クリックで不可に' : '遅番不可 → クリックで可に'}
                    class="w-10 h-6 rounded-full transition-colors relative disabled:opacity-50 {canLate ? 'bg-green-500' : 'bg-gray-300'}"
                  >
                    <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform {canLate ? 'translate-x-4' : 'translate-x-0.5'}"></span>
                  </button>
                  {#if lateOverridden}
                    <button
                      onclick={() => setCapability(s, 'canDoLateShifts', null)}
                      disabled={loadingId === `${s.id}-canDoLateShifts`}
                      class="text-[10px] text-amber-600 hover:text-amber-800 underline leading-none"
                      title="デフォルトに戻す"
                    >
                      上書き中
                    </button>
                  {:else}
                    <span class="text-[10px] text-gray-400 leading-none">デフォルト</span>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

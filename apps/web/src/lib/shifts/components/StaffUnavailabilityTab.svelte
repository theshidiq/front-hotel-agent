<script lang="ts">
import { untrack } from 'svelte';
import type { ScheduleStaff, StaffUnavailability } from '../types';
import {
  getStaffUnavailability,
  createStaffUnavailability,
  deleteStaffUnavailability,
  bulkCreateStaffUnavailability,
} from '../api';
import { isStaffActiveInCurrentPeriod } from '../staffUtils';

interface Props {
  allStaff: ScheduleStaff[];
  departmentId?: string;
}

let { allStaff, departmentId }: Props = $props();

const today = new Date().toISOString().slice(0, 10);
const todayDate = new Date();

let activeStaff = $derived(allStaff.filter(s => isStaffActiveInCurrentPeriod(s, [today]) && s.is_active));

// ── State ──
let selectedStaffId = $state<string | null>(null);

// Reset selection when department changes and selected staff is no longer in list
$effect(() => {
  const ids = new Set(activeStaff.map(s => s.id));
  if (selectedStaffId && !ids.has(selectedStaffId)) {
    selectedStaffId = null;
    unavailability = [];
  }
});
let unavailability = $state<StaffUnavailability[]>([]);
let loading = $state(false);
let savingDate = $state<string | null>(null);
let error = $state<string | null>(null);
let successMessage = $state<string | null>(null);

// Calendar navigation
let viewYear = $state(todayDate.getFullYear());
let viewMonth = $state(todayDate.getMonth()); // 0-indexed

// Range add form
let showRangeForm = $state(false);
let rangeStart = $state('');
let rangeEnd = $state('');
let rangeReason = $state('');
let savingRange = $state(false);

function showSuccess(msg: string) {
  successMessage = msg;
  setTimeout(() => { successMessage = null; }, 3000);
}

// Unavailable dates for selected staff as a Set for O(1) lookup
let unavailableMap = $derived.by(() => {
  const map = new Map<string, string>(); // date → id
  for (const u of unavailability) {
    map.set(u.date, u.id);
  }
  return map;
});

// Load unavailability for selected staff
async function loadUnavailability(staffId: string) {
  try {
    loading = true;
    error = null;
    unavailability = await getStaffUnavailability({ staffId });
  } catch (e) {
    error = e instanceof Error ? e.message : '読み込みに失敗しました';
  } finally {
    loading = false;
  }
}

$effect(() => {
  const id = selectedStaffId;
  if (!id) return;
  untrack(() => loadUnavailability(id));
});

// Calendar grid for current view month
let calendarDays = $derived.by(() => {
  const year = viewYear;
  const month = viewMonth;
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: string | null; day: number | null }> = [];

  // Leading empty cells
  for (let i = 0; i < firstDay; i++) cells.push({ date: null, day: null });

  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    cells.push({ date: `${year}-${mm}-${dd}`, day: d });
  }
  return cells;
});

function prevMonth() {
  if (viewMonth === 0) { viewYear -= 1; viewMonth = 11; }
  else viewMonth -= 1;
}
function nextMonth() {
  if (viewMonth === 11) { viewYear += 1; viewMonth = 0; }
  else viewMonth += 1;
}

const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const DAY_NAMES = ['日','月','火','水','木','金','土'];

async function toggleDate(date: string) {
  if (!selectedStaffId || savingDate) return;
  const existingId = unavailableMap.get(date);
  savingDate = date;
  try {
    error = null;
    if (existingId) {
      await deleteStaffUnavailability(existingId);
      unavailability = unavailability.filter(u => u.id !== existingId);
    } else {
      const created = await createStaffUnavailability({ staffId: selectedStaffId, date });
      unavailability = [...unavailability, created];
    }
  } catch (e) {
    error = e instanceof Error ? e.message : '更新に失敗しました';
  } finally {
    savingDate = null;
  }
}

async function handleRangeAdd() {
  if (!selectedStaffId || !rangeStart || !rangeEnd) return;
  if (rangeStart > rangeEnd) { error = '開始日は終了日より前にしてください'; return; }

  // Generate all dates in range
  const dates: string[] = [];
  const cur = new Date(rangeStart);
  const end = new Date(rangeEnd);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  if (dates.length > 31) { error = '一度に設定できるのは31日以内です'; return; }

  try {
    savingRange = true;
    error = null;
    const created = await bulkCreateStaffUnavailability({
      staffId: selectedStaffId,
      dates,
      reason: rangeReason || undefined,
    });
    // Merge — replace any existing entries for same dates
    const newDates = new Set(created.map(u => u.date));
    unavailability = [
      ...unavailability.filter(u => !newDates.has(u.date)),
      ...created,
    ];
    showSuccess(`${created.length}日間の休暇を設定しました`);
    showRangeForm = false;
    rangeStart = '';
    rangeEnd = '';
    rangeReason = '';
  } catch (e) {
    error = e instanceof Error ? e.message : '設定に失敗しました';
  } finally {
    savingRange = false;
  }
}

async function clearAll() {
  if (!selectedStaffId || !unavailability.length) return;
  try {
    loading = true;
    error = null;
    await Promise.all(unavailability.map(u => deleteStaffUnavailability(u.id)));
    unavailability = [];
    showSuccess('すべての休暇設定をクリアしました');
  } catch (e) {
    error = e instanceof Error ? e.message : 'クリアに失敗しました';
  } finally {
    loading = false;
  }
}

function statusColor(status: string | undefined): string {
  if (status === '派遣') return 'bg-orange-100 text-orange-700';
  if (status === 'パート') return 'bg-purple-100 text-purple-700';
  return 'bg-blue-100 text-slate-800';
}

let selectedStaff = $derived(activeStaff.find(s => String(s.id) === String(selectedStaffId)));
</script>

<div class="space-y-5">
  <!-- Header -->
  <div>
    <h3 class="text-lg font-medium text-gray-900">休暇・不在日設定</h3>
    <p class="mt-1 text-sm text-gray-500">
      スタッフの休暇・有給・不在日を登録します。OR-Toolsがスケジュール作成時にこれらの日を必須OFFとして扱います。
    </p>
  </div>

  <!-- Info banner -->
  <div class="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
    <span class="material-symbols-rounded text-amber-600 mt-0.5 shrink-0">event_busy</span>
    <div>
      <span class="font-medium">HARD制約：</span>
      登録された日付はカレンダールール同様に最優先でOFFが適用されます。月間休日カウントには含まれません。
    </div>
  </div>

  <!-- Success / Error -->
  {#if successMessage}
    <div class="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
      <span class="material-symbols-rounded text-green-600">check_circle</span>
      {successMessage}
    </div>
  {/if}
  {#if error}
    <div class="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
      <span class="material-symbols-rounded text-red-600">error</span>
      <p class="flex-1 text-sm text-red-700">{error}</p>
      <button onclick={() => error = null}><span class="material-symbols-rounded text-red-400 text-sm">close</span></button>
    </div>
  {/if}

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <!-- Staff list -->
    <div class="lg:col-span-1">
      <div class="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        <div class="px-3 py-2 border-b border-gray-200 bg-white">
          <span class="text-xs font-medium text-gray-500">スタッフ選択</span>
        </div>
        <div class="overflow-y-auto max-h-96">
          {#each activeStaff as s (s.id)}
            {@const status = s.status || s.staff_status || '社員'}
            {@const count = unavailability.filter(u => u.staffId === String(s.id)).length}
            <button
              onclick={() => selectedStaffId = String(s.id)}
              class="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-l-2
                {selectedStaffId === String(s.id)
                  ? 'bg-blue-50 border-navy'
                  : 'border-transparent hover:bg-gray-100'}"
            >
              <div class="flex-1 min-w-0">
                <span class="text-sm font-medium text-gray-900 truncate block">{s.name}</span>
                <span class="text-xs px-1.5 py-0.5 rounded-full {statusColor(status)}">{status}</span>
              </div>
              {#if count > 0}
                <span class="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-medium shrink-0">
                  {count}日
                </span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <!-- Calendar + controls -->
    <div class="lg:col-span-2">
      {#if !selectedStaffId}
        <div class="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div class="text-center text-gray-400">
            <span class="material-symbols-rounded text-4xl mb-2 block">person</span>
            <p class="text-sm">左のリストからスタッフを選択してください</p>
          </div>
        </div>
      {:else}
        <div class="space-y-3">
          <!-- Staff header + actions -->
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <span class="font-medium text-gray-900">{selectedStaff?.name}</span>
              <span class="text-xs px-2 py-0.5 rounded-full {statusColor(selectedStaff?.status || selectedStaff?.staff_status)}">
                {selectedStaff?.status || selectedStaff?.staff_status || '社員'}
              </span>
              {#if unavailableMap.size > 0}
                <span class="text-xs text-red-600 font-medium">{unavailableMap.size}日間休暇設定済み</span>
              {/if}
            </div>
            <div class="flex gap-2">
              <button
                onclick={() => { showRangeForm = !showRangeForm; error = null; }}
                class="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-navy text-white rounded-lg hover:bg-navy-700 transition-colors"
              >
                <span class="material-symbols-rounded text-sm">date_range</span>
                期間設定
              </button>
              {#if unavailableMap.size > 0}
                <button
                  onclick={clearAll}
                  disabled={loading}
                  class="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <span class="material-symbols-rounded text-sm">delete_sweep</span>
                  すべてクリア
                </button>
              {/if}
            </div>
          </div>

          <!-- Range form -->
          {#if showRangeForm}
            <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <p class="text-xs font-medium text-slate-900">期間一括設定</p>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-xs text-gray-500 block mb-0.5">開始日</label>
                  <input type="date" bind:value={rangeStart} class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-navy" />
                </div>
                <div>
                  <label class="text-xs text-gray-500 block mb-0.5">終了日</label>
                  <input type="date" bind:value={rangeEnd} class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-navy" />
                </div>
              </div>
              <input
                type="text"
                bind:value={rangeReason}
                placeholder="理由（任意）：有給、休暇、研修など"
                class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-navy"
              />
              <div class="flex justify-end gap-2">
                <button onclick={() => showRangeForm = false} class="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">キャンセル</button>
                <button
                  onclick={handleRangeAdd}
                  disabled={!rangeStart || !rangeEnd || savingRange}
                  class="px-3 py-1 text-xs bg-navy text-white rounded hover:bg-navy-700 disabled:opacity-50"
                >
                  {savingRange ? '設定中...' : '設定'}
                </button>
              </div>
            </div>
          {/if}

          <!-- Calendar -->
          <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <!-- Month navigation -->
            <div class="flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <button onclick={prevMonth} class="p-1 rounded hover:bg-gray-100 text-gray-500">
                <span class="material-symbols-rounded text-lg">chevron_left</span>
              </button>
              <span class="text-sm font-medium text-gray-800">{viewYear}年 {MONTH_NAMES[viewMonth]}</span>
              <button onclick={nextMonth} class="p-1 rounded hover:bg-gray-100 text-gray-500">
                <span class="material-symbols-rounded text-lg">chevron_right</span>
              </button>
            </div>

            <!-- Day headers -->
            <div class="grid grid-cols-7 border-b border-gray-100">
              {#each DAY_NAMES as d, i}
                <div class="py-1.5 text-center text-xs font-medium {i === 0 ? 'text-red-500' : i === 6 ? 'text-slate-700' : 'text-gray-500'}">
                  {d}
                </div>
              {/each}
            </div>

            <!-- Day cells -->
            {#if loading}
              <div class="py-8 text-center text-sm text-gray-400">読み込み中...</div>
            {:else}
              <div class="grid grid-cols-7">
                {#each calendarDays as cell}
                  {#if cell.date === null}
                    <div class="h-10"></div>
                  {:else}
                    {@const isUnavailable = unavailableMap.has(cell.date)}
                    {@const isSaving = savingDate === cell.date}
                    {@const isToday = cell.date === today}
                    {@const dow = new Date(cell.date).getDay()}
                    <button
                      onclick={() => toggleDate(cell.date!)}
                      disabled={isSaving}
                      class="h-10 flex items-center justify-center text-sm relative transition-colors
                        {isUnavailable
                          ? 'bg-red-500 text-white font-semibold hover:bg-red-600'
                          : 'hover:bg-gray-50'}
                        {isToday && !isUnavailable ? 'ring-1 ring-inset ring-blue-400' : ''}
                        {dow === 0 && !isUnavailable ? 'text-red-400' : ''}
                        {dow === 6 && !isUnavailable ? 'text-blue-400' : ''}
                        {!isUnavailable ? 'text-gray-700' : ''}
                        disabled:opacity-60"
                      title={isUnavailable ? '休暇設定済み — クリックで解除' : 'クリックで休暇設定'}
                    >
                      {#if isSaving}
                        <span class="text-xs opacity-50">…</span>
                      {:else}
                        {cell.day}
                      {/if}
                    </button>
                  {/if}
                {/each}
              </div>
            {/if}
          </div>

          <!-- Legend -->
          <div class="flex items-center gap-4 text-xs text-gray-500">
            <div class="flex items-center gap-1.5">
              <div class="w-5 h-5 rounded bg-red-500"></div>
              <span>休暇・不在</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-5 h-5 rounded border border-gray-200 bg-white"></div>
              <span>通常勤務</span>
            </div>
            <span class="ml-auto text-gray-400">日付をクリックして切り替え</span>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

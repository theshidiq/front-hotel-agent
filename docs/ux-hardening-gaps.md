# Scheduler UX Hardening — Gaps & Fixes

**Audit date:** 2026-03-11
**Status:** Pending implementation

---

## Summary

| # | Title | Severity | File | Status |
|---|-------|----------|------|--------|
| 1 | No-staff empty state missing | Medium | `+page.svelte:1121` | ⬜ TODO |
| 2 | Optimize button enabled with no period | High | `+page.svelte:1047` | ⬜ TODO |
| 3 | Cell optimistic update not reverted on error | Medium | `+page.svelte:576` | ⬜ TODO |
| 4 | Settings page: no-dept guard missing | Low | `settings/+page.svelte:44` | ⬜ TODO |
| 5 | PeriodPicker: no empty state when 0 periods | Medium | `PeriodPicker.svelte:168` | ⬜ TODO |
| 6 | Offline optimizer button has no tooltip | Low | `+page.svelte:1050` | ⬜ TODO |

---

## Gap 1 — No-staff empty state missing

**Severity:** Medium
**File:** `apps/web/src/routes/shifts/+page.svelte` line 1121

### Problem
The empty schedule check is:
```svelte
{:else if !hasScheduleData && staff.length > 0}
  <!-- empty state with "Auto-generate" CTA -->
{/if}
<ScheduleTable {staff} ... />
```

When `staff.length === 0` (department has no staff assigned), **neither** the empty state **nor** the table body renders any rows — just a blank white box with no message. User has no idea why the table is empty.

### Fix
Add a separate `{:else if staff.length === 0}` branch before the schedule data check:

```svelte
{:else if staff.length === 0}
  <div class="p-8 text-center">
    <span class="material-symbols-rounded text-5xl text-gray-300 mb-4">group_off</span>
    <h3 class="text-lg font-medium text-gray-700 mb-2">
      このデパートメントにスタッフがいません
    </h3>
    <p class="text-sm text-gray-500 mb-4">
      スタッフ設定からこのデパートメントにスタッフを追加してください。
    </p>
    <a
      href="/shifts/settings"
      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
    >
      <span class="material-symbols-rounded text-sm">settings</span>
      設定を開く
    </a>
  </div>
{:else if !hasScheduleData}
  <!-- existing empty schedule CTA -->
```

---

## Gap 2 — Optimize button enabled with no period selected

**Severity:** High
**File:** `apps/web/src/routes/shifts/+page.svelte` line 1047–1058

### Problem
Optimize button disabled condition:
```svelte
disabled={optimizing || clearing || !optimizerHealthy}
```
`selectedPeriodId` being `null` is **not** a disable condition. The handler silently returns early:
```ts
async function handleOptimize() {
  if (!selectedPeriodId || !optimizerHealthy) return;  // silent no-op
```
User clicks the button, nothing happens — confusing.

Also, the empty schedule CTA button at line 1148:
```svelte
disabled={optimizing || !optimizerHealthy}
```
Same issue — no `!selectedPeriodId` guard.

### Fix
```svelte
<!-- Toolbar optimize button -->
disabled={optimizing || clearing || !optimizerHealthy || !selectedPeriodId}
title={!selectedPeriodId ? '期間を先に選択してください' : !optimizerHealthy ? 'OR-Toolsオフライン' : '自動最適化'}

<!-- Empty state CTA button -->
disabled={optimizing || !optimizerHealthy || !selectedPeriodId}
```

---

## Gap 3 — Cell optimistic update not reverted on save error

**Severity:** Medium
**File:** `apps/web/src/routes/shifts/+page.svelte` line 576–599

### Problem
```ts
async function handleCellUpdate(staffId, date, symbol) {
  // 1. Apply update immediately (optimistic)
  scheduleData[staffId][date] = symbol;
  scheduleData = { ...scheduleData };

  try {
    saving = true;
    await bulkUpdateCells(...);
  } catch (e) {
    // 2. Error shown BUT old value is never restored
    error = e instanceof Error ? e.message : "Failed to save";
    // scheduleData still shows the NEW symbol — incorrect!
  }
}
```

### Fix
Store the previous value before applying the optimistic update and restore it in catch:

```ts
async function handleCellUpdate(staffId, date, symbol) {
  const prevSymbol = scheduleData[staffId]?.[date] ?? '';  // save old

  if (!scheduleData[staffId]) scheduleData[staffId] = {};
  scheduleData[staffId][date] = symbol;
  scheduleData = { ...scheduleData };

  try {
    saving = true;
    await bulkUpdateCells(selectedPeriodId!, [{ staffId, date, symbol }], activeDepartmentId ?? undefined);
  } catch (e) {
    // Revert
    scheduleData[staffId][date] = prevSymbol;
    scheduleData = { ...scheduleData };
    error = e instanceof Error ? e.message : "Failed to save";
  } finally {
    saving = false;
  }
}
```

---

## Gap 4 — Settings page: no guard when departments array is empty

**Severity:** Low
**File:** `apps/web/src/routes/shifts/settings/+page.svelte` line 44–52

### Problem
If an org has no departments, `activeDepartmentId` stays `null`. Dept-specific tabs (limits, groups, priority, etc.) all fire API calls with `departmentId = undefined` — these may silently return empty or incorrect data without telling the user why.

No empty state or error is shown on the settings page when `departments.length === 0`.

### Fix
Add a guard block after the loading check in the settings page template:

```svelte
{:else if departments.length === 0}
  <div class="p-8 text-center text-gray-500">
    <span class="material-symbols-rounded text-4xl mb-2">domain_disabled</span>
    <p>デパートメントが設定されていません。管理者に連絡してください。</p>
  </div>
```

---

## Gap 5 — PeriodPicker shows no guidance when 0 periods exist

**Severity:** Medium
**File:** `apps/web/src/lib/shifts/components/PeriodPicker.svelte` line 160–175

### Problem
When `periods.length === 0`:
- Button shows "期間を選択" — implies there are periods to select
- Clicking opens dropdown showing year navigation arrows (non-functional) and "この年の期間はありません"
- No link/guidance to go create periods

### Fix
When `periods.length === 0`, replace the picker with a link to the settings periods tab:

```svelte
{#if periods.length === 0}
  <a
    href="/shifts/settings?tab=periods"
    class="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors text-sm"
  >
    <span class="material-symbols-rounded text-base">add_circle</span>
    期間を設定してください →
  </a>
{:else}
  <!-- existing picker buttons -->
{/if}
```

---

## Gap 6 — Optimizer offline: no tooltip on disabled button

**Severity:** Low
**File:** `apps/web/src/routes/shifts/+page.svelte` line 1047–1058

### Problem
When optimizer is offline, the button is greyed out but has no `title` attribute explaining why. User sees a disabled button with no context.

The status indicator in the header ("Optimizer Offline") is easy to miss.

### Fix
Add a dynamic `title` to the optimize button:

```svelte
<button
  ...
  disabled={optimizing || clearing || !optimizerHealthy || !selectedPeriodId}
  title={
    !optimizerHealthy
      ? 'OR-Toolsオフライン — 最適化サービスを起動してください'
      : !selectedPeriodId
        ? '期間を先に選択してください'
        : '自動最適化を実行'
  }
>
```

---

## Implementation Order

1. **Gap 2** (High) — Disabled button with no period
2. **Gap 3** (Medium) — Cell revert on error
3. **Gap 1** (Medium) — No-staff empty state
4. **Gap 5** (Medium) — PeriodPicker empty state
5. **Gap 6** (Low) — Tooltip on offline button
6. **Gap 4** (Low) — Settings dept guard

---

## What's Already Good (no action needed)

- Full skeleton on first load (`ScheduleSkeleton`, `TableSkeleton`)
- `OptimizeOverlay` with animated stages + cancel during optimization
- Reconnect banner when tab returns from >5min sleep
- `loadFailed` banner + auto-retry (10s) + manual retry for Supabase cold start
- Optimistic cell updates (partial — see Gap 3)
- Partial result dialog when solver times out (FEASIBLE result)
- Violations panel after optimization
- Empty schedule state with "Auto-generate" CTA (for when staff exist)
- Confirm modal before destructive clear
- Saving spinner indicator
- Session cache to prevent skeleton flash on tab return

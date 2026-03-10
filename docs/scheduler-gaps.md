# Scheduler Feature Gap Analysis

> Generated: 2026-03-10
> Based on: `/services/ortools/scheduler.py`, `/apps/api/src/shifts/`, `/apps/web/src/routes/shifts/`

---

## Overview

| # | Gap | Status | Priority | Est. Effort |
|---|-----|--------|----------|-------------|
| 1 | Vacation/PTO Blocking | Calendar rules exist (global only) | HIGH | ~11h |
| 2 | Violation Reporting UI | Solver returns violations, frontend ignores them | HIGH | ~6h |
| 3 | Backup Coverage CRUD | DB table + GET exists, no write API/UI | MEDIUM | ~7h |
| 4 | Dry-Run Preview | Not implemented | MEDIUM | ~8h |
| 5 | Staff Shift-Type Capabilities | Status-level + date prefs only, no per-staff override | MEDIUM | ~5h |
| 6 | Solver Timeout UX | Backend AbortController exists, frontend has none | MEDIUM | ~6h |

---

## Gap 1: Vacation/PTO Blocking

### What Exists

`calendar_rules` table with single-date `must_work` / `must_day_off` entries — global for the whole organization, not per-staff.

- **API:** `shifts.service.ts:735-784` — `getCalendarRules()`, `createCalendarRule()`, `deleteCalendarRule()`
- **API endpoints:** `shifts.controller.ts:208-235`
- **Solver:** `scheduler.py:291` — `_add_calendar_rules()` called in optimization chain
- **Solver:** `scheduler.py:95` — `self.calendar_off_dates = set()`
- **Solver:** `scheduler.py:837` — calendar dates skipped for backup coverage

### What's Missing

1. No `staff_unavailability` table — can't record that a specific staff member is on vacation
2. No date-range support — calendar rules are single-day only
3. No API endpoints for per-staff vacation requests
4. No UI modal to submit/manage personal unavailability
5. Solver has no per-staff unavailability check (only reads global calendar rules)

### What to Build

**DB migration:**
```sql
CREATE TABLE staff_unavailability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date >= start_date)
);
CREATE INDEX idx_unavailability_staff ON staff_unavailability(staff_id);
CREATE INDEX idx_unavailability_range ON staff_unavailability(organization_id, start_date, end_date);
```

**API (3 endpoints):**
- `GET /shifts/staff-unavailability?organizationId=`
- `POST /shifts/staff-unavailability` — `{ staffId, startDate, endDate, reason }`
- `DELETE /shifts/staff-unavailability/:id`

**Solver change (`scheduler.py`):** Add `_add_staff_unavailability_constraints()` method, called after `_add_calendar_rules()`. For each approved unavailability record, force all dates in range to OFF:
```python
def _add_staff_unavailability_constraints(self):
    for entry in self.staff_unavailability:
        staff_id = entry['staffId']
        for date in date_range(entry['startDate'], entry['endDate']):
            if (staff_id, date) in self.shifts:
                self.model.Add(self.shifts[(staff_id, date)] == self.OFF)
```

**Frontend:** Unavailability tab inside the existing settings/constraints panel. Date range picker + reason field.

---

## Gap 2: Violation Reporting UI

### What Exists

Violations are fully tracked by the solver and returned. Types and API client pass them through. But the frontend **never displays them**.

- **Solver:** `scheduler.py:105-106` — `self.violation_vars = []`
- **Solver:** `scheduler.py:3625-3646` — `_extract_solution()` builds violations list
- **Solver:** `scheduler.py:3664` — returns `'violations': violations[:20]`
- **Backend DTO:** `dto/schedule.dto.ts:114-119` — `OptimizeResponseDto.violations?`
- **Frontend types:** `types.ts:193-197` — `OptimizeResponse.violations` is typed
- **Frontend API:** `api.ts:525-538` — `optimizeSchedule()` passes violations through
- **Frontend page:** `+page.svelte:633-650` — `handleOptimize()` receives result but **ignores violations entirely** (line 646 only shows `solve_time`)

### What's Missing

1. No UI component to display violations after optimization
2. No severity sorting or filtering
3. No drill-down to affected staff/dates
4. No "accept violations and save" vs "re-run" workflow

### What to Build

**Svelte component: `ViolationsPanel.svelte`** (in `apps/web/src/lib/shifts/components/`)
- Collapsible panel shown below the optimize result
- Lists violations: description, count, penalty score
- Color coded: red = penalty > 100, yellow = 50–100, green = < 50

**Wire into `+page.svelte` `handleOptimize()`:**
```ts
// After optimizeSchedule() returns:
if (result.violations?.length) {
    optimizeViolations = result.violations;  // $state
    showViolationsPanel = true;
}
```

No DB changes required — violations already come back from the solver.

---

## Gap 3: Backup Coverage CRUD

### What Exists

`staff_backup_assignments` table exists in the DB. The `getBackupAssignments()` service method reads from it and passes data to the solver. The solver has full backup coverage implementation.

- **DB:** `staff_backup_assignments` table referenced in migrations 007, 008, 009
- **Service:** `shifts.service.ts:1784-1833` — `getBackupAssignments()` (GET only)
- **Solver:** `scheduler.py:187-193` — logs received backup assignments
- **Solver:** `scheduler.py:835-1000` — `_add_backup_staff_constraints()` full implementation
- **Penalty:** 500 (highest in solver — backup coverage is critical)

### What's Missing

1. No `POST /shifts/backup-assignments` — can't create backup assignments
2. No `PATCH /shifts/backup-assignments/:id` — can't toggle active/inactive
3. No `DELETE /shifts/backup-assignments/:id` — can't remove assignments
4. No UI to manage backup assignments (the table in DB is empty/unmanageable)

### What to Build

**Service methods (in `shifts.service.ts`):**
```ts
createBackupAssignment(orgId, dto: { staffId, groupId }): Promise<BackupAssignment>
updateBackupAssignment(orgId, id, dto: { isActive }): Promise<BackupAssignment>
deleteBackupAssignment(orgId, id): Promise<void>
```

**Controller endpoints (in `shifts.controller.ts`):**
```
POST   /shifts/backup-assignments
PATCH  /shifts/backup-assignments/:id
DELETE /shifts/backup-assignments/:id
```

**Frontend:** New tab in the settings modal (e.g. "Backup Coverage"). Show existing assignments, allow adding new staff→group pairs, toggle active, delete.

No solver changes needed — solver already handles the data correctly.

---

## Gap 4: Dry-Run Preview

### What Exists

Nothing. When optimization runs, schedule is saved immediately with no preview step.

- **Frontend:** `+page.svelte:618-657` — `handleOptimize()` calls `optimizeSchedule()` then immediately calls `bulkUpdateCells()` on success (line 645)
- **Service:** `shifts.service.ts:462-685` — `optimizeSchedule()` runs solver and saves result inline (line 676-681)
- **Solver:** `scheduler.py:3710+` — `/optimize` Flask endpoint, no `dryRun` param

### What's Missing

1. No `dryRun` parameter in the optimize request
2. No conditional save logic (backend always saves)
3. No preview modal before committing
4. No accept/reject step
5. No rollback for bad schedules

### What to Build

**Solver change (`scheduler.py`):**
```python
# In /optimize route:
dry_run = data.get('dryRun', False)
result = optimizer.optimize_schedule(...)
if not dry_run:
    # (saving to DB is handled by NestJS, solver just returns data)
result['dryRun'] = dry_run
```

**Service change (`shifts.service.ts`):**
```ts
// In optimizeSchedule():
const dryRun = dto.dryRun ?? false;
// ...
if (!dryRun) {
    await this.bulkUpdateCells(orgId, periodId, cellUpdates);
}
return { ...result, dryRun };
```

**Frontend preview flow:**
```
"Preview" button → optimizeSchedule({ dryRun: true })
→ open SchedulePreviewModal (shows proposed schedule + violations)
→ "Commit" → optimizeSchedule({ dryRun: false }) → saves
→ "Discard" → close modal, nothing saved
```

**Component: `SchedulePreviewModal.svelte`**
- Full schedule grid in read-only mode
- Embedded violations panel
- "Commit Schedule" and "Discard" buttons

---

## Gap 5: Staff Shift-Type Capabilities

### What Exists

Two levels of shift-type control:
1. **Status-level hardcoded restrictions** — `派遣` (dispatch) and `パート` (part-time) cannot do early/late shifts (solver `scheduler.py:978-1062`)
2. **Date-specific early shift preferences** — `staff_early_shift_preferences` table with full CRUD API

- **API:** `shifts.service.ts:1547-1662` — 6 functions for early shift preferences (get, create, bulk upsert, update, delete)
- **API endpoints:** `shifts.controller.ts:421-471` — full CRUD
- **Solver:** `scheduler.py:604-616` — builds `earlyShiftPrefsDict`
- **Solver:** `scheduler.py:640-660` — applies preferences as soft constraints (penalty 1000)
- **Solver:** `scheduler.py:1003-1006` — 派遣/パート forbidden from early/late (hardcoded)
- **Solver:** `scheduler.py:1012` — can be disabled via `disableStaffStatusShiftRestrictions`

### What's Missing

1. No per-staff **permanent** capability override — if one part-timer is authorized to do early shifts, there's no way to set that permanently
2. No `can_do_early_shifts` / `can_do_late_shifts` column on staff table
3. No per-staff UI to set permanent capabilities (only date-specific preferences exist)
4. Status restrictions are hardcoded, not configurable per-organization

### What to Build

**Option A (fastest — no migration):** Use existing `staff.metadata` JSONB field.

In staff edit form, add "Shift Capabilities" toggles:
```json
{
  "capabilities": {
    "canDoEarlyShifts": true,
    "canDoLateShifts": false
  }
}
```

Solver reads `staff.metadata.capabilities` and overrides the status-level defaults:
```python
# In _add_staff_status_shift_restrictions():
meta_caps = staff.get('metadata', {}).get('capabilities', {})
can_early = meta_caps.get('canDoEarlyShifts')
if can_early is None:
    can_early = STATUS_DEFAULTS[status]['canDoEarlyShifts']  # fall back to status rule
```

**Option B (cleaner — requires migration):**
```sql
ALTER TABLE staff ADD COLUMN can_do_early_shifts BOOLEAN DEFAULT NULL;
ALTER TABLE staff ADD COLUMN can_do_late_shifts BOOLEAN DEFAULT NULL;
-- NULL = inherit from status default
```

**Recommendation:** Option A ships faster and is reversible. Migrate to Option B in a later sprint.

---

## Gap 6: Solver Timeout UX

### What Exists

Timeout is well-handled on the **backend**, but the **frontend has no way to cancel a request** and provides minimal feedback.

- **Backend `ortools.client.ts:85-178`:**
  - Line 92: `this.timeout = config.get('ORTOOLS_TIMEOUT', 120000)` — 120s HTTP timeout
  - Line 107-108: AbortController for 5s health check
  - Line 137-138: AbortController for optimize request
  - Line 166-170: Returns timeout error on AbortError
- **Solver:** `scheduler.py:133` — `timeout_seconds: int = 30` default
- **Solver:** `scheduler.py:317` — `solver.parameters.max_time_in_seconds = timeout_seconds`
- **Solver:** `scheduler.py:3487-3500` — FEASIBLE returns non-optimal solution (not an error); UNKNOWN returns error
- **Frontend `OptimizeOverlay.svelte`:** Shows spinner + elapsed time
- **Frontend `+page.svelte:123-136`:** `optimizeElapsed` timer, updates every 1s

### What's Missing

1. No **Cancel button** in `OptimizeOverlay.svelte` — user is stuck waiting
2. No `AbortController` in frontend — `fetch()` request can't be cancelled
3. When solver returns FEASIBLE (timed out but found partial solution), frontend treats it the same as OPTIMAL — user doesn't know the schedule is not fully optimized
4. No "Use this partial schedule" vs "Re-run with longer timeout" dialog
5. No timeout configuration in the frontend UI

### What to Build

**Frontend: Add cancel button to `OptimizeOverlay.svelte`**
```svelte
<button onclick={handleCancel}>Cancel</button>
```

**Frontend `+page.svelte` — AbortController:**
```ts
let optimizeAbortController: AbortController | null = $state(null);

async function handleOptimize() {
    optimizeAbortController = new AbortController();
    try {
        const result = await optimizeSchedule(orgId, periodId, payload, {
            signal: optimizeAbortController.signal
        });
        if (!result.is_optimal) {
            // Show partial solution dialog
            showPartialResultDialog(result);
            return;
        }
        // ... save normally
    } catch (e) {
        if (e.name === 'AbortError') {
            // User cancelled — show toast
        }
    }
}

function handleCancel() {
    optimizeAbortController?.abort();
}
```

**Frontend: Partial solution dialog**
When `result.is_optimal === false`:
- Show: "Optimization timed out. A partial schedule was found — it may not be fully optimized."
- Show violations count
- Buttons: "Use this schedule", "Re-run with longer timeout (60s)", "Cancel"

---

## Implementation Order (Recommended)

Start with the two **frontend-only** gaps — no DB/solver changes, zero risk:

1. **Gap 2: Violation Reporting UI** (~6h) — pure frontend, violations already in the API response
2. **Gap 6: Timeout UX** (~6h) — frontend AbortController + partial solution dialog
3. **Gap 3: Backup Coverage CRUD** (~7h) — add write API + UI, solver already works
4. **Gap 5: Shift Capabilities** (~5h) — Option A via metadata JSONB, no migration
5. **Gap 1: Vacation/PTO** (~11h) — new DB table + API + solver change
6. **Gap 4: Dry-Run Preview** (~8h) — most complex UX, do last

# Handoff: Menu-Scan → DB Backend (sync / autosave / 401)

> **Your job:** own the **backend persistence** of the menu-scan feature — the
> sync/autosave write path into the DB and its auth (401) behavior. Make it
> correct and impossible to corrupt or wipe data. **Do NOT touch the editor
> layout / preview rendering** — a separate agent owns the frontend UI/layout.
> Your surface is `apps/api/src/menu-scan/**` and the API contract it exposes.

---

## 1. What this feature is (one paragraph)

A chef hand-writes a Japanese kaiseki menu, scans it (OCR), edits it in a
vertical-column preview, and it persists to relational rows. The **rows ARE the
source of truth**: a scanned menu = a `menu_groups` row whose **courses** are
`menus` rows, whose **dishes** are `menu_dishes` rows. Each dish can later be
linked to a `products` row (`menu_dishes.product_id`) to derive allergens. The
editor **auto-saves continuously** (debounced) by POSTing the full current menu
to `/menu-scan/sync`, which **diff-upserts** the rows.

This auto-save write path is where **repeated data-loss bugs** happened. Several
guard layers exist now; your job is to make this rock-solid and ideally simpler.

---

## 2. Data model (live, Supabase project `ymdyejrljmvajqjbejvh`)

```
menu_groups (id, name, display_title, seasonal_menu_id, kids_group_ids[], ...)
   └─ menus (id, name, reading, description, category, sort_order,
             menu_group_id, seasonal_menu_id, is_available, organization_id)   ← a COURSE
        └─ menu_dishes (id, menu_id, text, "column", sort_order,
                        product_id NULL→products, organization_id, timestamps)  ← a DISH
categories (type='menu', name, value)   ← courses resolve to one of these (JP name == value)
seasonal_menus (id, name 春/夏/秋/冬, ...)
scan_sessions (id, scan_type='menu', menu_group_id, menu_title, image_url,
               raw_response jsonb, draft_courses jsonb, status)   ← OCR provenance + BACKUP
```

- `menu_dishes.id` is a **client-minted UUID** = stable PK. The frontend sends it
  so the backend can diff (upsert by id) and **never disturb `product_id`** when
  other dishes change. This invariant is load-bearing — keep it.
- `menus.category` stores the **Japanese course value** (e.g. `前菜`), NOT the old
  English enum. Courses are matched/grouped by `(menu_group_id, category)`.
- `scan_sessions.draft_courses` holds the original OCR layout (cols of dish text)
  and is the **canonical recovery source** — see §6.

---

## 3. Key files (your surface)

| File | Role |
|---|---|
| `apps/api/src/menu-scan/menu-scan.service.ts` | **The core.** `writeMenuRows` (the one chokepoint all writes pass through), `diffDishes`, `syncMenu`, `extractCourses`, `getScannedMenu(s)`, `setDishProduct`, legacy `confirmAndCreate`. |
| `apps/api/src/menu-scan/menu-scan.controller.ts` | Routes (all `@UseGuards(StaffAuthGuard)` + `@RequirePermission('menus.create')`). |
| `apps/api/src/menu-scan/dto/menu-scan-sync.dto.ts` | `MenuSyncDto` (the autosave payload), `SyncCourseDto`, `SyncDishDto`. Note: global `ValidationPipe` runs `forbidNonWhitelisted` — **every field the FE sends must be declared or the request 400s**. |
| `apps/api/src/menu-scan/dto/menu-scan-confirm.dto.ts` | Legacy confirm DTO + `season_name`/`group_name` fields. |
| `apps/api/src/menu-scan/dto/menu-scan-response.dto.ts` | Extract/draft response shapes. |
| `apps/api/src/menu-scan/gemini-vision.service.ts` | OCR (don't need to change). |

`SupabaseService.getClient()` uses the **service key (bypasses RLS)**. Org scoping
is manual via `organization_id` on every query — keep it on all reads/writes.

---

## 4. API endpoints (the contract — frontend depends on these)

| Method | Path | Purpose |
|---|---|---|
| POST | `/menu-scan/extract` | OCR an image → writes initial rows → returns row-backed courses (`cols` of `{id,text}`). |
| POST | `/menu-scan/sync` | **The autosave.** Body = `MenuSyncDto` (full current menu). Diff-upserts. Returns `{ group_id, season_id, courses:[{id,name,category,...}], skipped? }`. |
| GET | `/menu-scan/menus` | List saved menus (one per group). 401 → see §5. |
| GET | `/menu-scan/menus/:groupId` | Load one full menu (courses + dishes w/ ids + product_id) for re-open. |
| PATCH | `/menu-scan/dishes/:id/product` | Link/unlink a dish to a product. Body `{ product_id|null }`. Returns dish + derived allergens. |
| POST | `/menu-scan/confirm` | **Legacy alias** → `writeMenuRows`. Kept for old clients; safe to keep. |
| GET/POST/DELETE | `/menu-scan/drafts*` | **Legacy** JSON-draft endpoints. Superseded by rows; can be deprecated/removed once you confirm nothing calls them. |

**Frontend sync caller** (for reference, do not edit): `MenuScanModal.svelte`
`runSync()` → `menuScanSync({ menu_group_id, group_name, season_name, menu_title,
session_id, courses, prune })`. `prune` is `true` ONLY on explicit user deletes.

---

## 5. The data-safety design (DO NOT regress these — this took many rounds)

The autosave fires at unpredictable times (mount, debounce, auth-refresh, group
switch). Five layers prevent corruption; understand each before refactoring.

1. **Non-destructive by default (`prune` flag).** `writeMenuRows(org, input, prune=false)`
   and `diffDishes(..., prune=false)` **only insert/update, never delete**. Course
   deletes (`menus.delete`) and dish deletes (`menu_dishes.delete`) happen **only when
   `prune===true`**. Autosync sends `prune=false`; explicit user removals send `true`.
   `syncMenu` passes `dto.prune === true`.

2. **Empty-payload = no-op.** `writeMenuRows` bails if `courseList` is empty;
   `diffDishes` skips deletes if `desired` is empty. An empty/partial payload must
   NEVER be read as "delete everything".

3. **ANTI-WIPE FLOOR.** On a non-prune sync, if any existing course would drop to
   `<50%` of its stored dish count → **skip the whole sync** (return `{...,skipped:true}`,
   NOT an error). Logged as `ANTI-WIPE:`.

4. **MISROUTE GUARD.** On a non-prune sync, if the incoming course set overlaps the
   group's existing courses by `<50%` → it's a **wrong-group payload** (group bleed) →
   skip. Logged as `MISROUTE:`. (This caught the worst bug: one menu's courses being
   written onto another group after a group switch.)

5. **Idempotent dish upsert.** `diffDishes` uses
   `.upsert(rows, { onConflict: 'id', defaultToNull: false })` — race-safe, and
   `product_id` is **omitted** from the payload so it's preserved on conflict.

**401 handling (frontend side, for context):** `apiFetch` throws a typed
`AuthExpiredError` when a 401 can't be refreshed (instead of returning a 401 body
that callers might parse as empty data). The backend side you own: just keep
endpoints properly `401`-ing when unauthenticated (the guard does this) and
org-scoped. Do not add behavior that returns 200-with-empty on auth failure.

---

## 6. Recovery / backup (if data gets wiped again while you work)

- **Snapshot tables** (DB): `_menu_dishes_backup_20260612` (has `_group_name`).
  Currently holds 一般 (53 dishes) + 滞在 (53). These are plain tables the app never
  touches.
- **`scan_sessions.draft_courses`** jsonb is the canonical source — both real menus
  (一般 session `580500ae-…`, 滞在 session `8cb1176a-…`) have correct, full
  `draft_courses` (53 dishes each in `cols`). To rebuild a group's `menus` +
  `menu_dishes` from its draft, see the restore SQL pattern in the git history /
  ask; it: deletes the group's menus, re-creates one `menus` row per course,
  inserts `menu_dishes` from each course's `cols[col][row]`.
- Current good state: **一般 = 11 courses / 53 dishes, 滞在 = 11 courses / 53 dishes**,
  each with its OWN distinct courses (一般: 前菜/椀変り/本日の肉料理…; 滞在:
  先付/八寸/台物/冷煮物/小鍋/留椀…). If 滞在 ever shows 一般's courses → group bleed regressed.

Org id: `71b9c015-ff44-4b6c-90a6-705b8835a53f`. Season 夏 id resolvable by name.

---

## 7. Your concrete goals

1. **Make the sync write path provably safe and ideally simpler.** The 5 guards
   above are defense-in-depth bolted on reactively. Consider whether a cleaner
   model (e.g. sync targets are always validated against the loaded menu's known
   group+course set; or sync is keyed by an explicit `expected_menu_revision`)
   would let you remove guard sprawl without losing safety. Don't remove a guard
   unless its protection is structurally guaranteed elsewhere.
2. **401 robustness:** ensure no endpoint can mutate on an unauthenticated/expired
   request; confirm `StaffAuthGuard` covers all of them (it does today). Make sure
   a failed-auth sync changes nothing in the DB.
3. **Verify, don't assume.** After any change: `pnpm --filter @front-hotel-agent/api build`
   must pass. Then prove the guards with SQL simulations against the live data
   (the prior agent did this — e.g. "a 0-dish sync to 前菜 must be rejected",
   "一般's courses → 滞在 group must be rejected, overlap 5/11"). The running dev
   API is `node dist/main` via `nest start --watch` — **confirm your build is
   actually live** (a recurring trap: the running process lagged behind source).

## 8. Hard rules

- Do **not** edit `MenuScanModal.svelte` or any preview/layout code — that's the
  other agent. If the FE contract must change, document the change and coordinate;
  don't silently break the payload shape.
- Every new `MenuSyncDto`/course/dish field the FE sends MUST be declared in the
  DTO (whitelist forbids unknowns → 400).
- Never make autosync (`prune=false`) able to delete rows.
- Keep `product_id` untouched by sync (only `setDishProduct` changes it).
- Test against the real menus; if you must mutate data, snapshot first.

## 9. Recent commits (context)

```
9274c73 stop group-bleed wipe (misroute guard + FE cancel-pending-sync)
c1d4f12 stop 401/session-expiry from triggering a data wipe
545d1a2 anti-wipe floor — reject syncs that mass-delete dishes
0389d07 rows-as-source-of-truth + non-destructive autosync + dish→product linking
```
Branch: `feature/menu-dish-dnd`. Data currently restored & intact.

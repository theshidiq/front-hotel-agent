# Handoff: Menu Export (Excel / Word / import) + menu-scan data fixes

> **Branch:** `feature/menu-dish-dnd` — all work committed, tree clean.
> **Read this whole file before touching anything.** The unfinished piece is
> the **Word (.docx) layout** (§6). Everything else works and is verified.

---

## 1. What happened in the previous session

Two separate threads of work:

**A. Data-loss bugs in menu-scan (DONE, verified).** The user reported menus
being "duplicated and wiped" on re-login. Three distinct root causes were found
and fixed — see §3. Their live data was backed up and cleaned up.

**B. Excel/Word export (mostly done).** The user's motivation is **succession**,
in their words: *"i cant maintain this app alone if i'm no longer here. im asking
for matured ecosystem which is by excel."* They want the menus to outlive the
application. This produced a new `menu-export` module — see §4–§6.

---

## 2. Project context you need

- Monorepo, pnpm. API = NestJS on :3002, web = SvelteKit on :5173.
- Supabase project `ymdyejrljmvajqjbejvh`, org id
  `71b9c015-ff44-4b6c-90a6-705b8835a53f`.
- The menu model: `menu_groups` → `menus` (courses) → `menu_dishes` (dishes).
  Dish ids are **client-minted UUIDs** — this is load-bearing for diff-upserts.
- Live menus: **一般** (`4af42d64-…`, 11 courses / 55 dishes) and **滞在**
  (`df268bbc-…`, 11 courses / 59 dishes). Kids menu `子供 A CT70`
  (`488b6922-…`, 4 items) is linked to 滞在 via `menu_groups.kids_group_ids[]`
  (note: that column is **`text[]`**, not `uuid[]` — cast when joining).
- Backups from this session: `_menu_groups_backup_20260613`,
  `_menus_backup_20260613`, `_menu_dishes_backup_20260613`.

### Environment notes (bit us during the session)

- pnpm had a **store v10 → v11 conflict**; fixed by a full `pnpm install` plus
  filling in `allowBuilds` in `pnpm-workspace.yaml` (telemetry-only
  `@scarf/scarf` denied, the rest allowed). Installs work now.
- **The agent sandbox has no outbound network to Supabase.** Node scripts run
  via Bash get `fetch failed`. The Supabase MCP tool works (it runs outside the
  sandbox), and the dev API server has normal network access. So: pull data with
  MCP SQL, and test export/import code against **mocked** Supabase clients.
- The user's app is behind a Google/Supabase login, so the browser preview tool
  cannot reach the UI. Components can be verified by mounting them on a
  temporary scratch route (delete it afterwards) — that was done for the import
  modal and worked well.

---

## 3. menu-scan data-loss fixes (DONE — do not regress)

Commit `fa6c9c7`. Three independent bugs:

1. **Duplicate-group-on-relogin — this was the wipe driver.**
   `writeMenuRows` resolved the group **by name** on every autosave. The editor's
   `groupTouched` flag (which suppresses sending `group_name`) resets on a fresh
   mount, so the first sync after re-login re-sent the name; any title/OCR
   spacing drift that failed to match then **INSERTed a new `menu_groups` row**,
   orphaning the real menu. The existing anti-wipe/misroute guards could not
   catch it because they run *per resolved group*, and the duplicate was created
   before them (empty, so nothing tripped).
   **Fix:** when `menu_group_id` names a real group it is authoritative — name
   resolution may only switch to an **existing** group, never create one.
   Find-or-create survives only for the extract / brand-new-menu path.

2. **Idle autosave loop.** `runSync` unconditionally reassigned `workCourses`
   via `.map()`, producing a new array reference every sync → serialize effect
   re-ran → `courses` rebuilt → autosave rescheduled → synced again, forever,
   with no user edit. **Fix:** only reassign when a `menuId` actually changed.

3. **Stale reads.** Menu GETs had no cache headers, so the browser served
   pre-edit responses from disk cache. **Fix:** `Cache-Control: no-store` on the
   menu-scan read endpoints.

Also: the `/menu` page's data-load effect now waits for
`authState.session?.access_token`, not just `authState.loading`. On a cached
optimistic render `loading` flips false *before* `getSession()` resolves, so
every request fired without an Authorization header — that was the "401 wall"
the user saw. It was always cosmetic (apiFetch retried after refreshing) but
noisy and wasteful.

**Kids menu persistence** was added: the editor's kids box now saves as its own
`menu_group` linked via `kids_group_ids[]`, keyed by **id** so a rename updates
the group instead of spawning duplicates. Items carry stable ids and go through
the same non-destructive `diffDishes` path.

> ⚠️ Several of these edits are in `apps/web/src/lib/components/MenuScanModal.svelte`,
> which the earlier handoff assigned to a **separate frontend agent**. Flag them
> so they are not reverted.

---

## 4. The `menu-export` module (NEW)

`apps/api/src/menu-export/` — additive; the only change to existing code is one
import line in `app.module.ts`. **Read-only except the import path.**

| File | Role |
|---|---|
| `menu-export.service.ts` | Loads menus; builds the `.xlsx` (layout sheet + data sheet) |
| `menu-docx.service.ts` | Builds the `.docx` — **this is the unfinished part** |
| `menu-import.service.ts` | Two-phase round-trip import |
| `menu-export.controller.ts` | All five routes, `StaffAuthGuard` + `menus.create` |

Routes (all verified to 401 unauthenticated):

```
GET  /menu-export/menus.xlsx             all menus, one workbook
GET  /menu-export/menus/:groupId.xlsx    one menu
GET  /menu-export/menus/:groupId.docx    one menu, Word
POST /menu-export/preview                diff an edited workbook (writes nothing)
POST /menu-export/apply                  apply exactly the previewed change set
```

Frontend: `downloadMenuExcel()` / `downloadMenuWord()` in `apps/web/src/lib/api.ts`
(they fetch with auth then save the blob — a plain link cannot send the header).
Buttons live in `MenuScanModal.svelte`: **Excel** and **読込** beside the
保存済みメニュー heading, **Word** next to PDF in the review toolbar.

### Excel round-trip import (DONE, well tested)

Import is the only path that can destroy data, so it is two-phase and never
writes on its own: `preview` returns the change set **plus a token
fingerprinting it**; `apply` re-parses, recomputes, and refuses unless the
fingerprint still matches. Deletions need a **separate** opt-in (`allow_deletes`)
on top of the token. A change set removing ≥20 % of stored dishes is flagged
`requires_attention`. Only `… data` sheets are authoritative; the diff is scoped
to the groups the sheet names; unknown `dish_id` becomes an insert, never a
silent overwrite; `product_id` is never written.

Six mock-DB tests passed, including the important one: **a truncated 2-of-4-row
sheet deleted nothing**, reported 2 deletions, and left the data intact.

The import UI (`apps/web/src/lib/components/MenuImportModal.svelte`) was
verified in a browser: file picker → diff review → confirm. Deletions render in
a red-bordered block with their own checkbox; unchecked, the button reads
「変更のみ保存」 and deletions are skipped.

---

## 5. Excel export — status

The **data sheet** is good and is the durable half: flat rows with stable
`dish_id` / `course_id` / `menu_group_id`, `column`, `sort_order`, and allergens
resolved to Japanese names. It carries guided-editing aids (course dropdown from
the courses actually in that menu, integer validation on column/sort_order,
blank-`dish_text` highlighting, locked id columns, autofilter) — all plain
spreadsheet features, **no macros** (deliberately; see §7).

The **layout sheet** approximates the お品書き but will never match it. Excel is
a grid; the menu is a typeset document. Several rounds of fixes (sub-column
order, name clipping, one-cell-per-column, RTL) got it close but not equal.
**Suggestion for the next agent:** consider dropping the layout sheet entirely
and letting Word own presentation — the user was heading that way.

---

## 6. ⚠️ UNFINISHED: the Word (.docx) layout

`apps/api/src/menu-export/menu-docx.service.ts`. The user's last words:
**"still not, create a context handoff"** — they stopped here, unsatisfied.

### What is already correct (verified in the OOXML — don't undo these)

- **Vertical Japanese** via `w:textDirection tbRl` **on the cells only**.
  Setting it *also* on the section page double-rotates and crushes every column
  into one overlapping line — that bug was hit and fixed.
- **Right-to-left order** produced by emitting courses (and the sub-columns
  within each course) **reversed**, since the page is left-to-right.
- **Alignment axes rotate under tbRl**: the start of a column is
  `AlignmentType.LEFT` (paragraph) and `VerticalAlign.BOTTOM` (cell).
  Using TOP/CENTER leaves everything floating mid-page.
- **Dishes joined into one run per sub-column** (`dishes.join('　')`). One
  paragraph per dish renders each dish as its own thin vertical strip.
- Explicit `trHeight` (`atLeast`) on the row — without it Word collapses the row
  to a single line.
- `TableLayoutType.FIXED` so the per-cell widths are honoured.

### What is still wrong (from the user's final screenshot)

The text now flows correctly — vertical, right-to-left, top-anchored, with
dividers. The remaining problems are **spacing and proportion**:

1. **Columns are too narrow and crammed together.** All eleven courses sit in
   the upper-left ~60 % of the page; the layout does not use the sheet.
2. **No consistent column rhythm.** In the editor every course column has the
   same width and the dishes hang from a common top line. In the Word output the
   widths vary with content and the columns bunch up.
3. **Ragged depth.** Long courses (本日の肉料理) run far down while short ones
   (食前酒) stop early, so the block reads unevenly. The editor balances this.
4. The kids box sits below the table at the left; in the editor it is a callout
   in the lower-right area under the opening courses.

### Suggested next steps

- Tune `width` on the cells (currently `460` DXA for dish columns, `900` for the
  title) and the row height (`8500`/`8400` twips) against real rendering. These
  are **estimates** — the previous agent could not see the rendered document.
- Consider giving every course the same total width regardless of sub-column
  count, so the rhythm is regular.
- **Ask the user for a screenshot after each change** — that was the only
  reliable feedback loop, and it is slow. Consider asking them to state the
  single most-wrong thing rather than iterating blindly.
- Honest option worth raising with them: the app's **existing PDF/print export
  already renders the layout exactly** (browser-rendered, real CSS
  `writing-mode: vertical-rl`). Word was chosen only because staff need to
  **edit** it. If the Word output is merely "good enough to edit wording in",
  that may satisfy the actual requirement — worth confirming before spending
  many more rounds on pixel fidelity.

---

## 7. Decisions already made — don't relitigate without cause

- **No VBA / macros.** The user asked about the Developer tab. Macros were
  declined *for their own stated goal*: Mac Excel VBA is crippled (they are on
  macOS), `.xlsm` gets quarantined by security policies, it is dead in Sheets /
  LibreOffice / Excel Online, and VBA in a binary file is **harder to hand over**
  than the TypeScript app it was meant to outlive. They accepted this.
- **Excel = data, Word = layout, PDF = exact rendering.** That division was
  agreed with them.
- Import must stay **preview-gated**; the preview *is* the safety mechanism.

---

## 8. Verification habits that worked

- `pnpm --filter @front-hotel-agent/api build` — must pass.
- `pnpm --filter @front-hotel-agent/web check` — **baseline is 18 pre-existing
  errors** (in `shifts/+page.svelte` etc.). Compare against 18, not 0.
- Confirm the running dev API actually picked up a build (`grep` the new symbol
  in `apps/api/dist/...`) — a recurring trap.
- For .docx, unzip and inspect `word/document.xml` directly:
  `grep -o '<w:textDirection w:val="[^"]*"'`, `w:jc`, `w:vAlign`, `w:trHeight`.
  This caught every Word bug so far.
- Generate real files into the scratchpad with a mocked Supabase client and send
  them to the user — they will screenshot the result.

---

## 9. Outstanding / not started

- **Word layout polish** (§6) — the live task.
- **Succession runbook** — the user's original ask was half documentation:
  a plain-language description of the data model, how to get the data out with
  no developer, and what to do if the app breaks. Never written. Arguably the
  highest-value remaining item for their actual goal.
- **`categories` table has OCR junk** — entries like `エアスつておりません。`,
  `くらし◎おかしいかの袋つらいくち`, `不詳`, `新規`, `冷凍食品`, auto-created by
  the scan flow when it could not read a course name. Harmless but clutters any
  course picker. The user was told; they have not asked for cleanup yet.
- **Import UI is untested against live data** — the logic is verified against a
  mock DB, but no real upload has been round-tripped through a logged-in session.
  Have the user try one low-stakes edit before relying on it.

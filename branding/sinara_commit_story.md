# shift-schedule-manager — Commit Story & Twitter Content
*494 commits · July 22 – December 12, 2025 · ~5 months*

---

## The Story Arc

```
Jul 22        Aug 3         Sep 15        Oct 28        Dec 12
  │             │             │             │             │
  ▼             ▼             ▼             ▼             ▼
Simple       TensorFlow    Go WebSocket  OR-Tools      Migration
React app    ML attempt    + Docker      CSP Solver    guide done
```

---

## Phase Breakdown

### Phase 1 — Jul 22–Aug 2 · "Just build it"
**What happened:** Built a working Japanese shift scheduling app in React.
Japanese shift symbols (○ × △ ◇), Supabase, UUIDs, OCR for Japanese staff names.
Hit data persistence issues by day 3. Race conditions by day 5.

Key commits:
- `Initial commit: Japanese restaurant shift scheduling app`
- `Fix OCR schedule parsing to correctly extract Japanese staff names`
- `Fix data persistence race condition in staff updates`
- `Add パート (part-time) staff support`

**Tweet angle:** The first build. The real problem. The Japanese context.

---

### Phase 2 — Aug 3–7 · "Let's add AI"
**What happened:** Added TensorFlow.js ML for schedule prediction. 5 phases in 5 days.
Then spent weeks fixing constraint violations, blocking UI threads, and infinite recursion.

Key commits:
- `Implement AI Prediction Foundation - Phase 1: Data Analysis & Constraints`
- `Implement hybrid TensorFlow ML scheduling system (Phases 1-2)`
- `Complete hybrid TensorFlow ML system integration (Phases 3-5)`
- `CRITICAL FIX: Resolve AI processing blocking web UI`
- `CRITICAL FIX: Resolve infinite recursion causing maximum call stack exceeded`
- `Fix AI assistant hanging at 70% progress`
- `MAJOR ARCHITECTURAL SIMPLIFICATION: Replace complex ML pipeline with reliable SimplifiedAIPredictor`
- `Revert "MAJOR ARCHITECTURAL SIMPLIFICATION..."` ← reverted the revert

**Tweet angle:** Added ML in week 2. Spent month 2 undoing the damage.

---

### Phase 3 — Aug 8–31 · "Database, settings, real UI"
**What happened:** Supabase tables, settings modal, staff groups, daily limits,
autosave, ShadCN/TweakCN redesign. The "make it usable" phase.

Key commits:
- `Create fully automated database setup - no manual SQL required`
- `Implement autosave system and remove save buttons from settings`
- `Complete ShadCN TweakCN UI Redesign Implementation`
- `Implement offline queue system to prevent data loss during connection failures`

**Tweet angle:** The invisible work. The stuff nobody sees but everyone needs.

---

### Phase 4 — Sep 1–20 · "Let's add Go + WebSocket + Docker"
**What happened:** Built a Go WebSocket server (6 phases) to solve race conditions.
Then Docker. Then NGINX reverse proxy. Then Redis. Then 3 AI server replicas with load balancing.
For a shift scheduler. For one restaurant.

Key commits:
- `PHASE1: Implement Go WebSocket Server Foundation`
- `PHASE2: Implement StateManager with version control`
- `Add comprehensive Docker implementation with production scaling`
- `Complete Docker TensorFlow.js Alpine Linux compatibility fix`
- `IMPLEMENT: Phase 4 Unified Prefetch Architecture - Netflix-Level Performance`

**Tweet angle:** The over-engineering moment. The honest lesson.

---

### Phase 5 — Sep 21–Oct 15 · "Make everything work together"
**What happened:** Connected all the pieces. WebSocket settings sync.
Multi-table backend. Print layout for A4 (Japanese standard).
Period configuration (21st–20th Japanese work month format).

Key commits:
- `FIX: Print schedule showing blank cells + A4 layout optimization + Japanese header`
- `FIX: Display Japanese weekday label next to day number in print view`
- `FEAT: Complete Phase 3 - React WebSocket Multi-Table Settings Integration`
- `FIX: Eliminate WebSocket disconnections during period navigation`

**Tweet angle:** The Japan-specific details nobody else thinks about.

---

### Phase 6 — Oct 16–Nov 14 · "The constraint engine grind"
**What happened:** Built the real constraint engine. Adjacent conflicts, staff groups,
calendar rules, daily/weekly limits, priority rules, backup staff system.
Dozens of CRITICAL FIX and REVERT commits.

Key commits:
- `CRITICAL FIX: Prevent ○ symbol assignment to regular staff (社員)`
- `FEAT: Prevent consecutive off days (×) and early shifts (△) for better rotation`
- `MAJOR FIX: Implement comprehensive daily limit enforcement (min 2, max 3 staff off/day)`
- `REVERT: Remove ViolationRepairEngine final validation` ← classic
- `CRITICAL FIX: Priority Rules Multiple Staff + Database Deletion Prevention`

**Tweet angle:** The constraint problem is harder than it looks. Real schedules are messy.

---

### Phase 7 — Nov 15–Dec 12 · "OR-Tools. Finally."
**What happened:** Migrated to Google OR-Tools CP-SAT solver.
Threw away the TensorFlow ML approach. Monthly limits enhancement.
Final documentation. Done.

Key commits:
- `docs: Add OR-Tools migration guide and skills documentation`
- `Phase 6.6: Monthly Limits Enhancement`
- `FEATURE: Add MIN constraints to Daily Limits for better schedule distribution`

**Tweet angle:** The right tool. Found it the hard way.

---

## Twitter Content

---

### Thread 01 — The origin story
*Tone: honest, no hype. Post as a thread.*

> I built a Japanese shift scheduling app from scratch while working as kitchen staff in Japan.
>
> 494 commits. 5 months. Here's what it actually took 🧵

> Day 1 — Simple React app.
> Japanese shift symbols: ○ × △ ◇
> Supabase database. Basic staff management.
>
> I was proud of it.

> Day 3 — Race conditions.
> Staff data not saving correctly.
> UUID format breaking.
> 30 commits in the first week just fixing data consistency.

> Week 2 — "Let me add AI."
> Added TensorFlow.js ML for schedule prediction.
> Built it in 5 phases over 5 days.
>
> Then spent the next 3 weeks fixing:
> — AI blocking the UI thread
> — Infinite recursion
> — The AI ignoring every constraint I set

> Month 2 — "Let me add a Go WebSocket server."
> Then Docker.
> Then NGINX reverse proxy.
> Then Redis caching.
> Then 3 AI server replicas with load balancing.
>
> For a shift scheduler.
> For one restaurant.
> I had built Netflix infrastructure for a spreadsheet.

> Month 4 — Found OR-Tools CP-SAT.
> Google's constraint programming solver.
> Mathematical. Precise. Actually respects the rules.
>
> I removed 3 months of TensorFlow code in a week.
> Sometimes the right tool takes time to find.

> Month 5 — Done. 494 commits.
> Still a kitchen staff. Still a student.
> Now rebuilding it properly as Sinara.
>
> Hospitality operations platform for Japan.
> Scheduling + allergen management + AI assistant.
>
> Built from the inside. Designed for the people in the kitchen.

---

### Thread 02 — The Japan-specific details
*Tone: educational, builder perspective.*

> Most scheduling software isn't built for Japan.
>
> I learned this the hard way while building one 🧵

> Japanese work schedules don't run January 1 – January 31.
>
> They run 21st to 20th.
> Oct 21 → Nov 20 is one "month."
>
> I had to build a custom period system just to match how every hotel in Japan actually counts work time.

> Japanese shift symbols aren't morning/afternoon/evening.
>
> They're:
> ○ — full day
> × — day off
> △ — early shift
> ◇ — late shift
> 社員 — full-time employee rules
> 派遣 — dispatch staff rules
> パート — part-time rules
>
> Each has different constraint logic. None of this exists in Western scheduling software.

> Print output matters more than you think.
>
> Hotel managers in Japan still print the schedule and post it on the wall.
> I spent a week getting the A4 layout right.
> Japanese weekday labels. Portrait orientation. Correct cell size.
>
> Software that doesn't print well doesn't get used.

> The work month, the symbols, the print layout.
>
> None of this is in Deputy. None of it is in 7shifts.
> Because nobody who built those tools ever worked a shift in a Japanese hotel.
>
> I have.

---

### Thread 03 — The over-engineering confession
*Tone: self-aware, funny, honest.*

> Confession: I built Netflix-level infrastructure for a shift scheduler.
>
> Let me explain what I mean 🧵

> The architecture at peak complexity:
>
> NGINX reverse proxy
> → Go WebSocket server (3 replicas)
> → Redis cache
> → 2 AI processing servers
> → TensorFlow.js ML model
> → Supabase PostgreSQL
> → React frontend
>
> For managing shift schedules.
> For 20 staff members.
> At one restaurant.

> I added the Go WebSocket server to fix a race condition.
> I added Docker to deploy the Go server.
> I added NGINX to load balance the Docker containers.
> I added Redis to cache the WebSocket sessions.
>
> Each decision made sense at the time.
> The sum of them was absurd.

> The most honest commit in the entire repo:
>
> "MAJOR ARCHITECTURAL SIMPLIFICATION:
> Replace complex ML pipeline with reliable SimplifiedAIPredictor"
>
> Immediately followed by:
>
> "Revert MAJOR ARCHITECTURAL SIMPLIFICATION"
>
> I simplified. Then un-simplified. Classic.

> What I learned:
>
> Complexity accumulates faster than it's removed.
> Every "this will fix it" adds a layer.
> The right answer was constraint programming from the start.
>
> OR-Tools CP-SAT. Mathematical. No ML required.
> Found it in month 5.

---

### Standalone Posts

**Post 1 — The number**
> 494 commits to learn that Google OR-Tools was the right tool all along.
>
> Worth it.

---

**Post 2 — The real competitor**
> The scheduling software my hotel uses costs ¥31,400/month.
> Runs on Windows only.
> Recommends wired LAN.
> Has no mobile app.
> Was built in the 1990s.
>
> 1,000 hotels pay for it.
> Not because it's good.
> Because it's trusted.
>
> That's the real product problem I'm solving.

---

**Post 3 — OR-Tools moment**
> Spent 3 months making TensorFlow.js generate schedules.
> It kept ignoring the constraints I gave it.
>
> Switched to Google OR-Tools CP-SAT.
> It treats the entire month as a single math problem.
> Every constraint satisfied simultaneously or it tells you why it's impossible.
>
> This is the difference between ML and constraint programming.
> Right tool. Right problem.

---

**Post 4 — The Japan detail**
> Japanese hotel managers still print the schedule and post it on the wall.
>
> I spent a week making sure mine prints correctly on A4 paper.
> Portrait orientation. Japanese weekday labels. Correct cell height.
>
> Software that doesn't fit the real workflow doesn't get used.
> That's not a feature. That's respect.

---

**Post 5 — The human is the star**
> I'm not building a robot that replaces the hotel manager.
>
> I'm building a tool that makes them 10x faster —
> and lets them spend the time they save on the actual job:
> taking care of guests.
>
> The human is still the star.
> The software just handles the schedule.

---

## Posting Calendar Suggestion

| Week | Post | Account |
|------|------|---------|
| Week 1 | Thread 01 — Origin story | @kamal |
| Week 1 | Post 1 — "494 commits" | @kamal |
| Week 2 | Thread 02 — Japan-specific details | @kamal |
| Week 2 | Post 4 — A4 print detail | @kamal |
| Week 3 | Thread 03 — Over-engineering confession | @kamal |
| Week 3 | Post 3 — OR-Tools moment | @kamal |
| Week 4 | Post 2 — Real competitor | @sinara_app |
| Week 4 | Post 5 — Human is the star | @sinara_app |

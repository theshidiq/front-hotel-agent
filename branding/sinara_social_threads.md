# Sinara — Social Media Threads & Posts
*presence, by design*

---

> **Two accounts. Two voices. One story.**
> **@kamal** (you) — the journey, the person, the builder behind Sinara
> **@sinara_app** — the product, the platform, what it does and why it exists

---

---

# 👤 PERSONAL ACCOUNT — @kamal
*Casual. Honest. Mix of Indonesian + English. "I'm figuring this out."*

---

## Thread 01 — The Founding Story

**Hook**
I'm a kitchen staff in Japan.

Every month, I watched my manager spend 2+ hours building the schedule — confirming shifts, checking days off, trying to be fair to everyone.

I thought: this should be a solved problem.

So I started building Sinara. 🧵

---

**2**
The schedule problem looks simple from outside.

You have staff. You have shifts. You fill in the boxes.

But in practice: availability conflicts, rest gap requirements, fairness concerns, regulatory rules — it's combinatorially explosive.

Computer scientists call it NP-hard.

---

**3**
NP-hard means: you can't solve it optimally by brute force.

There are more possible schedules than atoms in the observable universe.

Experienced managers develop intuition for it. But intuition takes hours. And it still makes mistakes.

---

**4**
I started researching.

Turns out hospitals have had this exact same problem for decades.

It's called the Nurse Scheduling Problem (NSP).

Same constraints. Same complexity. Same human cost when it goes wrong.

And researchers had already built solvers for it.

---

**5**
One paper stood out:

Elhalid & Işık (2024) used Google OR-Tools CP-SAT to solve shift scheduling instances.

Time taken: **0.009 seconds**.

My manager spends 2 hours. The algorithm needs less than a blink.

---

**6**
That's when I committed.

I'm building Sinara — a hospitality operations platform starting with the scheduling problem.

It uses the same constraint programming approach.
You define the rules. The solver finds the optimal schedule.

AI in the background. Humans in the light.

---

**7**
It's also my thesis.

I'm a last-year student at BINUS while working full-time in Japan.

"Presence, by design" is both the product philosophy and honestly how I'm living right now — trying to be fully present in the kitchen, in the classroom, in the build.

---

**8 — CTA**
Going to document this whole thing publicly.

The research. The builds. The failures. The name origin (it's from Indonesian and Sanskrit — will explain).

If you're in hospitality, tech, or just like watching someone build in public from a hotel kitchen in Japan — follow along.

---

---

## Thread 02 — The Name: Sinara

**Hook**
The app is called Sinara.

Not a random word. Not an acronym.

Here's where it comes from. 🧵

---

**2**
*sinar* — Indonesian/Sundanese for "ray of light"

The word we use for sunlight through a window, the glow of a screen in a dark room, that moment someone walks in and the energy shifts.

---

**3**
*nara* — Sanskrit for "human"

Same root as "narrate" — the human who tells the story.

In Japanese aesthetics, presence is everything.
The feeling someone gives a room just by being in it.

---

**4**
Sinara = sinar + nara.

Human radiance.

The premise: in an increasingly automated industry, what hotels actually sell is *presence*. The feeling of being genuinely seen, cared for, attended to.

That's what the product is supposed to protect.

---

**5**
The tagline is: *presence, by design.*

The name gives you the WHAT — human radiance.
The tagline gives you the HOW — it doesn't happen by accident.

A great guest experience is engineered. From scheduling, to allergen safety, to the first moment a guest is greeted.

---

**6 — Closer**
I'm West Javanese. Sundanese.

Building an app from inside a hotel kitchen in Japan.

The name is a small piece of home carried into something new.

---

---

## Thread 03 — The Math Behind Scheduling

**Hook**
Your manager is solving one of the hardest problems in computer science.

Every. Single. Month.

With a spreadsheet. 🧵

---

**2**
Shift scheduling is NP-hard.

Same category as the Travelling Salesman Problem.

As staff count and constraints grow, possible solutions grow exponentially. There's no shortcut algorithm that finds the optimal answer quickly.

---

**3**
For a small team of 10 staff across 3 shifts for 30 days, the search space has billions of valid arrangements.

Most are "fine." But "fine" isn't fair, and it isn't always compliant.

A good schedule balances rest gaps, availability, fairness, and regulations — simultaneously.

---

**4**
This is why it takes days.

Managers develop intuition that shortcuts the search. But intuition is slow. And it's invisible to the team — no one understands why the schedule is the way it is.

That opacity breeds resentment.

---

**5**
Constraint programming flips it.

You encode the rules once:
- No more than 5 consecutive days
- Required rest gap between closing and opening shift
- Fair distribution of weekend shifts
- Individual availability preferences

The solver finds a schedule that satisfies all of them.

---

**6**
Google OR-Tools CP-SAT is the solver Sinara uses.

In research: it solved nurse scheduling instances in **0.009 seconds** (Elhalid & Işık, 2024).

The same mathematical structure applies to hotel kitchens.

---

**7 — Closer**
I'm writing my thesis on this.

BINUS, applied to hotel kitchen staff scheduling.

If scheduling is a solved CS problem — why are managers still spending hours on it?

That's the question Sinara exists to answer.

---

---

## Thread 04 — The Student-Worker-Builder

**Hook**
I'm completing my degree online while working full-time as kitchen staff in Japan.

Honest version: it's hard.
Reframed version: it's the exact context that makes this worth building.

---

**2**
BINUS Online — easy to minimize. "It's just an online degree."

But I've been completing coursework from a staff dorm in Japan, studying scheduling optimization theory while living the scheduling problem every rotation cycle, writing a thesis about software I'm already building.

That's not a limitation. That's integration.

---

**3**
My thesis question:

*How effective is Constraint Programming via Google OR-Tools CP-SAT at automating hotel kitchen staff scheduling compared to manual approaches?*

It's not abstract. My manager is the baseline. The kitchen I work in is the case study.

---

**4**
I think about outsider/insider framing a lot.

Most hospitality tech is built by people who've never worked a closing shift. Who don't know what it feels like when the schedule conflicts with what you requested.

I'm not building Sinara from theory. I'm building it from memory.

---

**5 — Closer**
The app is called Sinara.

*sinar* (Indonesian: ray of light) + *nara* (Sanskrit: human) = human radiance.

*Presence, by design.*

Working on it publicly. Thesis ongoing. Kitchen shifts continue.

---

---

## Standalone Posts — Personal

**Post A — On being Sundanese, building globally**
The app is called Sinara.

From *sinar* — Sundanese/Indonesian for ray of light.

I grew up in West Java. I'm building from Japan. The product will run in hotels anywhere.

Sometimes the most global thing you can do is bring your whole self — including the specific place you come from.

---

**Post B — Thesis update template** *(use this repeatedly)*
Thesis update — [date]

Researching: [what you're on this week]
Found: [one interesting thing]
Testing: [what you're building/running]

Still working full-time. Still building Sinara.

Progress is slow and then it isn't.

---

**Post C — The 0.009 stat**
A trained scheduler takes 2+ hours to build a monthly staff schedule.

Google OR-Tools CP-SAT solved the equivalent problem in **0.009 seconds**.

(Elhalid & Işık, 2024)

That's the gap I'm closing.

---

---

---

# 🔷 SINARA ACCOUNT — @sinara_app
*Clean. Product-focused. Bilingual EN + JP. "This is what we built."*

---

## Thread 05 — The Allergen System

**Hook**
Menu allergen management in most hotels:

→ Receive product shipment
→ Manually read every Japanese label
→ Transcribe ingredients
→ Update the system
→ Hope you didn't miss anything

We automated this. 🧵

---

**2**
Japanese allergen labels are dense, small text — and in Japanese.

For kitchen staff who aren't native readers, reviewing 30 products per season takes 90+ minutes. One misread can have serious consequences for a guest.

---

**3**
Sinara's allergen scan:

1. Photograph the product label
2. OCR extracts all text from the image
3. System identifies and categorizes allergens automatically
4. Product is saved with allergens linked

Time per product: seconds.

---

**4**
The output is a clean product database.

Every item tagged with its allergens. When a chef builds a menu item from those products, the allergens are derived automatically.

No manual cross-referencing. No spreadsheet. No guessing.

---

**5**
Japan mandates labeling for 8 priority allergens:
wheat, buckwheat, egg, milk, peanut, shrimp, crab, walnut.

For international hospitality teams working in Japan — this system doesn't just save time. It removes a real compliance risk.

---

**6 — CTA**
Demo coming soon.

Full flow: photograph → scan → categorize → build a menu item → allergens auto-filled.

Follow @sinara_app for updates.

*presence, by design.*

---

---

## Standalone Posts — Sinara

**Post D — Brand Philosophy**
Most hospitality software optimizes for efficiency.

Sinara optimizes for presence.

AI handles the scheduling, the allergen tracking, the guest data.

The staff walks in knowing exactly where they need to be — and focuses on the people in front of them.

*presence, by design.*

---

**Post E — Launch Teaser**
Something is coming for hospitality teams.

Scheduling. Allergen management. Guest experience — connected.

One platform. Built from inside the kitchen.

*sinara · presence, by design*

---

**Post F — Scheduling stat (Sinara voice)**
Manual shift scheduling: 2+ hours per cycle.

Sinara with OR-Tools CP-SAT: seconds.

Same result. Rules defined once. Optimal schedule generated — fair, compliant, done.

*presence, by design.*

---

**Post G — Stella introduction** *(when ready)*
Meet Stella.

Sinara's AI connector — for the team running the platform, and for guests experiencing it.

Operators use Stella to manage. Guests use Stella to feel taken care of.

AI in the background. Humans in the light.

*sinara · presence, by design*

---

---

# 📅 4-Week Content Calendar

| Week | @kamal (Personal) | @sinara_app (Product) |
|------|-------------------|----------------------|
| **1** | Thread 01: The Founding Story | Post E: Launch Teaser |
| **2** | Thread 02: The Name | Post D: Brand Philosophy |
| **3** | Thread 03: The Math Behind Scheduling | Thread 05: The Allergen System |
| **4** | Thread 04: Student-Worker-Builder | Post F: Scheduling stat |
| **Ongoing** | Post B: Thesis updates (weekly/biweekly) | Post G: Stella intro (when ready) |

---

*sinara · 2026 · presence, by design*

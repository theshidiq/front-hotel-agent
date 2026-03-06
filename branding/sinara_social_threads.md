# Sinara — Social Media Threads & Posts
*presence, by design*

---

> **Two accounts. Two voices. One story.**
> **@kamal** — the journey, the person, the builder behind Sinara
> **@sinara_app** — the product, the platform, what it does and why it exists

---

> **Core narrative (read this first before writing or editing anything)**
>
> The founding story is simple and honest. Don't inflate it.
>
> Kamal is kitchen staff at a hotel in Japan.
> Every month he watched his manager make the shift schedule — by hand, on paper.
> It took hours. Same struggle every time.
> He wondered: what if this could be automated?
> That question became Sinara.
>
> He's not an expert. He's not a manager. He's not a scheduler.
> He's a staff who noticed something and cared enough to do something about it.
> That's the whole story. It doesn't need to be bigger.
>
> Lead every post from that honest place.
> Let the tech and research land as proof — never as the headline.

---

---

# 👤 PERSONAL ACCOUNT — @kamal
*Casual. Honest. Mix of Indonesian + English. "I'm figuring this out."*

---

## Thread 01 — The Founding Story

**Hook**
Every month, my manager made the shift schedule by hand.

Paper. Pen. Hours.

I'd watch the same struggle happen — cross out, rewrite, check again.

One day I thought: what if this could be automated?

That question became Sinara. 🧵

---

**2**
I'm kitchen staff at a hotel in Japan.

I don't make the schedule. That's the manager's job.

But I work the shifts. I see how the schedule lands — who's tired, whose request got missed, which week feels off.

When you're on the floor, you notice things.

---

**3**
The paper schedule was always a production.

Hours of work. Lots of erasing. Last-minute fixes.

And at the end of it — a schedule that was fine. Not great. Fine.

"Fine" means someone's rest gap got squeezed. "Fine" means a preference got lost. That stuff costs the team.

---

**4**
So I started asking: is this problem solved anywhere?

Turns out — hospitals have been solving it for decades.

Same problem. Nurses instead of kitchen staff. Same constraints: shift gaps, fairness, availability, regulations.

And researchers had already built algorithms for it.

---

**5**
One paper showed Google OR-Tools CP-SAT solving scheduling instances in 0.009 seconds.

My manager was spending hours on paper.

The gap isn't a technology problem — the tools exist. The problem is that nobody brought them to hospitality.

---

**6**
So I started building.

Encoded the constraints I understood from working the shifts:
rest gaps, consecutive day limits, fair weekend distribution, individual availability.

A system any manager could use — without needing to be a computer scientist. Without needing paper.

---

**7**
It's also my thesis.

I'm a last-year student at BINUS, finishing online while working here in Japan.

The research question: how much better does a schedule get when a computer does it vs. a manager doing it by hand?

The kitchen I work in is my case study.

---

**8 — CTA**
Going to build this in public.

The research. The decisions. The name origin (it's from Indonesian and Sanskrit — will explain). The failures. The moments it works.

If you're in hospitality, operations, or just like watching someone build from inside the problem — follow along.

---

---

## Thread 02 — The Name: Sinara

**Hook**
The app is called Sinara.

Not a random word. Not an acronym. It's from home. 🧵

---

**2**
*sinar* — Indonesian/Sundanese for "ray of light"

The word for sunlight through a window. The glow before sunrise. The shift in energy when someone walks into a room and you feel it before you see it.

---

**3**
*nara* — Sanskrit for "human"

Same root as "narrate." The human who holds the story.

In Japanese aesthetics, the idea that a person's presence in a room is something real — worth protecting, worth designing around.

---

**4**
Sinara = sinar + nara.

Human radiance.

What a hotel actually sells — when it's doing it right — is the feeling of being genuinely seen. Cared for. Attended to.

That's what the product exists to protect.

---

**5**
The tagline: *presence, by design.*

The name gives the WHAT — human radiance.
The tagline gives the HOW — it doesn't happen by accident.

A schedule that burns out your team can't produce presence. A system that creates allergen risk at the table can't produce presence. Sinara removes those things — quietly, in the background.

---

**6 — Closer**
I'm West Javanese. Sundanese.

Building from a staff dorm in Japan.

The name is a small piece of home inside something I hope travels far.

---

---

## Thread 03 — What the Research Says

**Hook**
I started building Sinara because I watched my manager struggle with a paper schedule.

Then I found out this problem has a name, a 40-year research history, and solvers that handle it in milliseconds.

Here's what I learned. 🧵

---

**2**
Shift scheduling is classified as NP-hard.

That means as the number of staff and constraints grows, the possible combinations grow faster than any brute-force approach can handle.

It's not that managers are doing it wrong. It's that they're manually solving one of the hardest problems in computer science.

---

**3**
Hospitals figured this out first.

The Nurse Scheduling Problem (NSP) — same structure as hotel and restaurant kitchen scheduling. Same constraints: rest gaps, availability, fairness, consecutive day limits, regulatory minimums.

Decades of research. Real solvers built for it.

---

**4**
One paper that changed how I thought about this:

Elhalid & Işık (2024) used Google OR-Tools CP-SAT to solve scheduling instances.

Time: **0.009 seconds**.

My manager was doing this on paper. For hours.

---

**5**
The key insight: the algorithm doesn't replace the manager's judgment.

It encodes the rules the manager already knows — rest gaps, fairness across weekends, individual availability — and applies them perfectly, every time, in seconds.

The manager defines what matters. The solver finds the answer.

---

**6 — Closer**
That's the foundation Sinara is built on.

My thesis question: how much better is a constraint-programmed schedule vs. a paper one, measured in fairness, compliance, and time?

The kitchen I work in is the case study. My manager is the baseline.

---

---

## Thread 04 — Student + Worker + Builder

**Hook**
I work full-time as kitchen staff in Japan.

I'm finishing my degree online.

And I'm building a hospitality operations platform from a staff dorm.

This is what that actually looks like. 🧵

---

**2**
Shifts first. Then coursework. Then code.

Sometimes two at once, sometimes all three in the same day.

There's no clean separation. The thesis is about the problem I see at work. The product is the answer to the thesis question.

---

**3**
Online university is easy to dismiss.

But I've been writing research papers about scheduling optimization while living the scheduling problem. Completing coursework while working the shifts I'm studying.

That's not a limitation. That's applied research.

---

**4**
The thing about building from inside an industry:

You stop asking "what should this feature do" and start asking "what would have helped here last Tuesday."

Every design decision has a memory attached to it. Every constraint in the solver comes from something I actually observed.

---

**5 — Closer**
The app is called Sinara.

*sinar* (ray of light) + *nara* (human) = human radiance.

*Presence, by design.*

Started from watching a paper schedule get made every month and wondering if there was a better way.

---

---

## Standalone Posts — Personal

**Post A — The paper schedule**
The shift schedule at my workplace is made on paper.

Every month. By hand. Hours of work.

That's what made me start building Sinara.

Not a business plan. Not a market opportunity. Just: there has to be a better way than this.

---

**Post B — On presence**
A guest doesn't remember the system behind the desk.

They remember the person who looked them in the eye.

The staff who are free to do that — not distracted by a schedule they don't trust, not anxious about an allergen they're not sure about — that's what Sinara is trying to create.

The operations disappear. The humans remain.

---

**Post C — Thesis update template** *(reuse weekly)*
Thesis update — [date]

Researching: [what you're on]
Found: [one interesting thing]
Testing: [what you're building or running]

Still on shift. Still building.

---

**Post D — On being Sundanese, building globally**
The app is called Sinara.

*Sinar* — a Sundanese word for ray of light.

I grew up in West Java. I'm building from Japan. I want this to run in hotels anywhere.

Sometimes the most universal thing you can make starts from something very specific — a word from home, a problem you noticed, a question you couldn't let go of.

---

**Post E — The 0.009 stat**
My manager makes the monthly schedule on paper. It takes hours.

Research shows the same problem can be solved algorithmically in 0.009 seconds.

That gap isn't about technology. The tools exist.

It's about whether someone bothers to bring them to the right place.

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
→ Update the records
→ Hope nothing was missed

We automated this. 🧵

---

**2**
Japanese allergen labels are dense, small text.

For kitchen staff who aren't native readers, reviewing 30 products per season takes 90+ minutes.

One misread isn't just a process failure — it's a safety risk for a guest.

---

**3**
Sinara's allergen scan:

1. Photograph the product label
2. OCR extracts all text from the image
3. System identifies and categorizes allergens
4. Product saved with allergens linked

Time per product: seconds.

---

**4**
The output is a clean product database.

Every item tagged. When a chef builds a menu from those products, allergens are derived automatically.

No manual cross-referencing. No spreadsheet lookup. No transcription errors.

---

**5**
Japan mandates labeling for 8 priority allergens:
wheat, buckwheat, egg, milk, peanut, shrimp, crab, walnut.

For international hospitality teams working in Japan — this system doesn't just save time. It removes a compliance risk that most operations currently manage with memory and hope.

---

**6 — CTA**
Demo coming soon.

Full flow: photograph → scan → categorize → build a menu → allergens auto-filled.

Follow @sinara_app for updates.

*presence, by design.*

---

---

## Standalone Posts — Sinara

**Post F — What Sinara does**
Two things. Done well.

**Scheduling** — auto-generated, constraint-based, fair. Define the rules once. Generate the schedule. Manager gets hours back.

**Allergen management** — photograph a Japanese product label, get a clean ingredient record in seconds. Build a menu, get the allergen matrix automatically.

Operations in the background. People in the light.

*presence, by design.*

---

**Post G — Brand philosophy**
Most hospitality software optimizes for efficiency.

Sinara optimizes for presence.

The most valuable thing a hotel can offer isn't a smooth process.

It's a person who is fully there.

*presence, by design.*

---

**Post H — Scheduling**
Manual shift scheduling on paper: hours per month, every month.

Sinara: define the rules once. Generate a fair, compliant schedule. Done in seconds.

The constraints are right because the person who built this works the shifts.

*presence, by design.*

---

**Post I — Stella introduction** *(when ready)*
Meet Stella.

Sinara's AI connector — for the team running the platform, and for the guests they serve.

Operators use Stella to manage. Guests use Stella to feel taken care of.

AI in the background. Humans in the light.

*sinara · presence, by design*

---

---

# 📅 4-Week Content Calendar

| Week | @kamal (Personal) | @sinara_app (Product) |
|------|-------------------|----------------------|
| **1** | Thread 01: The Founding Story | Post G: Brand Philosophy |
| **2** | Thread 02: The Name | Post F: What Sinara does |
| **3** | Thread 03: What the Research Says | Thread 05: The Allergen System |
| **4** | Thread 04: Student + Worker + Builder | Post H: Scheduling |
| **Ongoing** | Post C: Thesis updates (weekly) | Post I: Stella (when ready) |

---

*sinara · 2026 · presence, by design*

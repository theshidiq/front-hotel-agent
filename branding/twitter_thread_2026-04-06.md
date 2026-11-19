# 🧵 2026-04-06 Thread — Japan-Specific Details · @kamal

**Account:** @kamal
**Suggested posting time:** 11 PM JST
**☐ Posted**

---

## Thread

---

**1 of 8**

Building a shift scheduler for a Japanese hotel taught me that "scheduling" is the easy part.

The hard part is everything Japan-specific that nobody wrote down.

🧵

---

**2 of 8**

"Fix OCR schedule parsing to correctly extract Japanese staff names" — July 28, 2025. Day 6.

The scanner was reading schedule images but grabbing the wrong names. Not a character set issue.

Japanese names written together with no space looked identical to concatenated zone labels — 調理場, 厨房 — which the parser kept flagging as surnames.

I had to add name-splitting patterns and teach the OCR the difference between a person and a room.

---

**3 of 8**

"Add staff status filtering to daily and monthly limits — allows constraints based on employment status (社員, 派遣, パート)" — August 19, 2025.

A hotel doesn't have just "employees." It has three categories, each with separate limit rules.

社員 are regular full-time staff. 派遣 are agency workers. パート are part-time.

Monthly off-day caps differ across all three. I had to wire filter logic into every constraint engine so each limit counted only the people it was supposed to count.

---

**4 of 8**

"FIX: Replace Period Length with End Day configuration to eliminate date gaps" — October 13, 2025.

The original setup: pick a start day, enter a period length in days.

The problem: 30 days from the 21st doesn't land on the 20th every month. Some months have 31 days. That leftover day had no period assigned to it.

In a Japanese hotel, a day with no period means shifts that disappear from the system. I scrapped Period Length and switched to an explicit End Day.

---

**5 of 8**

Same day. New commit: "VALIDATION: Enforce end_day < start_day to ensure periods span to next month."

Once I had an End Day field, the validation had to match how Japanese work months actually work.

Period starts on the 21st, ends on the 20th. So end_day (20) must be LESS than start_day (21).

The smaller number comes second — because the 20th is in the following calendar month.

I wrote a rule that rejects any config where end_day ≥ start_day. It looks like a bug. It's the only logic that's correct.

---

**6 of 8**

"FEAT: Display Japanese weekday label next to day number in print view" — October 15, 2025.

Managers here read a date as "21日（月）" — the 21st, Monday in brackets. That's the format on every printed calendar in the building.

My first print output showed the date number. No weekday label.

Managers already know the 21st is a Monday. They still expect to see it printed. That's how they check quickly down the column.

One commit to add 月火水木金土日 next to each date in the header. Without it, nobody trusted the printout.

---

**7 of 8**

"FEAT: Restrict early shifts (△) to 社員 staff only + Weekly limit scope filtering" — November 18, 2025.

△ is the early shift symbol. For months I was assigning it to whoever was available.

My manager pointed it out: early shifts only go to 社員 — regular employees. Not パート. Not 派遣.

One conversation. One commit. Fixed.

But this kind of thing is everywhere in the system. Every symbol has rules like this. None of them are documented anywhere. You learn them by working the shift.

---

**8 of 8**

OCR that knows the difference between a name and a kitchen zone. Three staff types with separate constraint logic. Work months that start on the 21st. Print headers with 月火水木金土日 next to every date.

None of it shows up in a feature list.

The manager just sees a schedule that works the way it always has.

That's the whole job.

---

## Commits Used

| Date | Commit Message |
|------|---------------|
| 2025-07-28 | Fix OCR schedule parsing to correctly extract Japanese staff names |
| 2025-08-19 | Add staff status filtering to daily and monthly limits - Allows constraints based on employment status (社員, 派遣, パート) |
| 2025-10-13 | FIX: Replace Period Length with End Day configuration to eliminate date gaps |
| 2025-10-13 | VALIDATION: Enforce end_day < start_day to ensure periods span to next month |
| 2025-10-15 | FEAT: Display Japanese weekday label next to day number in print view |
| 2025-11-18 | FEAT: Restrict early shifts (△) to 社員 staff only + Weekly limit scope filtering |

---

🔁 Reminder: Like and retweet from @sinara_app if posting on @kamal, and vice versa.

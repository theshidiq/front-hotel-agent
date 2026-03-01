# Staff Mini Calendar - Design Document

## Overview

A read-only mobile calendar component for individual staff members to view their shift schedule. Data is fetched from the shift-schedule-manager database (Supabase project: `oacvlxqhudusddaywaer`).

---

## Design Decisions

| Question | Decision |
|----------|----------|
| Layout | **Grid calendar** - regular calendar layout with colored date cells |
| Period Navigation | **Yes** - prev/next month navigation required |
| Authentication | **Public** - any staff can view any calendar (for now) |
| Data Access | **API Route** - cleanest approach for SvelteKit |

---

## Data Source

### Database: Supabase Project `ymdyejrljmvajqjbejvh`


### Tables Involved

```
┌─────────────────────────────────────────────────────────────┐
│ staff                                                       │
├─────────────────────────────────────────────────────────────┤
│ id          : uuid (PK)                                     │
│ name        : varchar        -- "料理長", "井関", "カマル"    │
│ position    : varchar        -- "Head Chef", "Cook"         │
│ status      : text           -- "社員", "パート", "派遣"      │
│ type        : text           -- "regular", "part-time"      │
│ department  : text           -- "Kitchen", "調理"           │
│ is_active   : boolean                                       │
│ staff_order : integer        -- display order               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ schedules                                                   │
├─────────────────────────────────────────────────────────────┤
│ id            : uuid (PK)                                   │
│ schedule_data : jsonb        -- main shift data             │
│ metadata_id   : uuid (FK)                                   │
│ created_at    : timestamptz                                 │
│ updated_at    : timestamptz                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ schedule_staff_assignments                                  │
├─────────────────────────────────────────────────────────────┤
│ id           : uuid (PK)                                    │
│ schedule_id  : uuid (FK → schedules)                        │
│ staff_id     : uuid (FK → staff)                            │
│ period_index : integer       -- links to period             │
│ staff_order  : integer                                      │
│ is_active    : boolean                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ periods                                                     │
├─────────────────────────────────────────────────────────────┤
│ id         : uuid (PK)                                      │
│ start_date : date            -- "2026-02-21"                │
│ end_date   : date            -- "2026-03-20"                │
│ label      : text            -- "2月・3月"                   │
└─────────────────────────────────────────────────────────────┘
```

### Schedule Data Structure (JSONB)

```typescript
// schedules.schedule_data format
interface ScheduleData {
  // Each key is a staff UUID
  [staffId: string]: {
    // Each key is a date string (YYYY-MM-DD)
    [date: string]: string; // Shift symbol or text
  };
}

// Example:
{
  "ded6e0bc-b9f6-425b-94eb-a3126226a927": {
    "2026-02-21": "△",
    "2026-02-22": "×",
    "2026-02-23": "",
    "2026-02-24": "○",
    "2026-02-25": "★",
    "2026-02-26": "午前",
    "2026-02-27": "朝食\n自班"
  }
}
```

---

## Shift Symbols Reference

| Symbol | Japanese | English | Color Suggestion |
|--------|----------|---------|------------------|
| `×` | 休み | Day Off | Red |
| `△` | 早番 | Early Shift | Blue |
| `○` | 通常 | Normal Shift | Green |
| `◇` | 遅番 | Late Shift | Purple |
| `★` | 特別/管理者 | Manager/Special | Amber/Gold |
| `●` | 黒丸 | Filled circle | Gray |
| `◎` | 二重丸 | Double circle | Teal |
| `` (empty) | 勤務 | Regular Work | Gray (subtle) |
| Custom text | 備考 | Notes | Orange |

### Custom Text Examples
- `午前` - Morning only
- `朝食\n自班` - Breakfast + own shift (multiline)
- `弁屋\n午前` - Bento shop + morning

---

## Component Specifications

### Props Interface

```typescript
interface StaffMiniCalendarProps {
  // Required
  staffId: string;              // UUID of the staff member

  // Optional
  initialPeriodId?: string;     // UUID of initial period (defaults to current)
  showStats?: boolean;          // Show summary stats (default: true)
  showLegend?: boolean;         // Show symbol legend (default: true)
  compact?: boolean;            // Extra compact mode for small screens
  onDayTap?: (date: string, shift: string) => void;  // Tap callback for tooltip
}

interface PeriodNavigation {
  currentPeriod: Period;
  availablePeriods: Period[];   // For dropdown or swipe navigation
  canGoPrev: boolean;
  canGoNext: boolean;
  goToPrev: () => void;
  goToNext: () => void;
  goToPeriod: (periodId: string) => void;
}
```

### Data Response Interface

```typescript
interface StaffCalendarResponse {
  staff: {
    id: string;
    name: string;
    position: string;
    status: string;        // "社員" | "パート" | "派遣"
    department: string;
  };
  period: {
    id: string;
    start_date: string;    // "2026-02-21"
    end_date: string;      // "2026-03-20"
    label: string;         // "2月・3月"
  };
  shifts: {
    [date: string]: string;
  };
}
```

---

## UI Layout: Color-Coded Grid Calendar

### Visual Design

The calendar displays as a **regular month grid** where each date cell is **filled with the shift color** (not symbols). This provides an instant visual overview of the month.

```
┌─────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────┐ │
│ │  ←  2026年 2月・3月  →                  │ │  ← Period Nav
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │  料理長                                  │ │  ← Staff Info
│ │  Head Chef · 社員                        │ │
│ └─────────────────────────────────────────┘ │
│ ┌───┬───┬───┬───┬───┬───┬───┐             │
│ │ 日│ 月│ 火│ 水│ 木│ 金│ 土│             │  ← Day Headers
│ ├───┼───┼───┼───┼───┼───┼───┤             │
│ │   │   │   │   │   │░21│▓22│             │  ← Week 1
│ │   │   │   │   │   │早番│休み│             │     (gray=empty, colors=shifts)
│ ├───┼───┼───┼───┼───┼───┼───┤             │
│ │ 23│░24│░25│▓26│░27│▓28│░1 │             │  ← Week 2
│ │   │   │   │休み│   │休み│   │             │
│ ├───┼───┼───┼───┼───┼───┼───┤             │
│ │░2 │░3 │▓4 │░5 │░6 │░7 │▓8 │             │  ← Week 3
│ │早番│   │休み│   │   │早番│休み│             │
│ ├───┼───┼───┼───┼───┼───┼───┤             │
│ │...│...│...│...│...│...│...│             │
│ └───┴───┴───┴───┴───┴───┴───┘             │
│ ┌─────────────────────────────────────────┐ │
│ │ ■休み ■早番 ■通常 ■遅番 ■特別 □勤務    │ │  ← Legend
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 休み: 5日 │ 早番: 3日 │ 通常: 20日      │ │  ← Stats
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Cell Design (Color-Filled)

Each date cell shows:
- **Date number** (top, small)
- **Background color** based on shift type
- **Optional**: Small label on tap/hover

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│    21   │     │    22   │     │    23   │
│         │     │         │     │         │
│  ░░░░░  │     │  ▓▓▓▓▓  │     │  ░░░░░  │
│  (blue) │     │  (red)  │     │ (gray)  │
│  早番    │     │  休み    │     │  勤務   │
└─────────┘     └─────────┘     └─────────┘
   Early           Off           Work
```

### Mobile Touch Interaction

- **Tap date cell**: Show tooltip with shift details
- **Swipe left/right**: Navigate to prev/next period
- **Long press**: (Future) Copy shift to clipboard

---

## Color Scheme (Solid Background Colors)

The calendar uses **solid background colors** to fill each date cell, making it easy to scan at a glance.

### Shift → Color Mapping

| Symbol | Shift Type | Background | Text | Tailwind Classes |
|--------|------------|------------|------|------------------|
| `×` | 休み (Day Off) | `#FEE2E2` | `#991B1B` | `bg-red-100 text-red-800` |
| `△` | 早番 (Early) | `#DBEAFE` | `#1E40AF` | `bg-blue-100 text-blue-800` |
| `○` | 通常 (Normal) | `#DCFCE7` | `#166534` | `bg-green-100 text-green-800` |
| `◇` | 遅番 (Late) | `#F3E8FF` | `#6B21A8` | `bg-purple-100 text-purple-800` |
| `★` | 特別 (Special) | `#FEF3C7` | `#92400E` | `bg-amber-100 text-amber-800` |
| `●` | 黒丸 | `#E5E7EB` | `#374151` | `bg-gray-200 text-gray-700` |
| `◎` | 二重丸 | `#CCFBF1` | `#115E59` | `bg-teal-100 text-teal-800` |
| `` | 勤務 (Work) | `#F9FAFB` | `#6B7280` | `bg-gray-50 text-gray-500` |
| Custom | 備考 (Notes) | `#FFEDD5` | `#9A3412` | `bg-orange-100 text-orange-800` |

### TypeScript Color Config

```typescript
// lib/calendar/shift-colors.ts
export const SHIFT_COLORS = {
  '×': { bg: 'bg-red-100', text: 'text-red-800', label: '休み' },
  '△': { bg: 'bg-blue-100', text: 'text-blue-800', label: '早番' },
  '○': { bg: 'bg-green-100', text: 'text-green-800', label: '通常' },
  '◇': { bg: 'bg-purple-100', text: 'text-purple-800', label: '遅番' },
  '★': { bg: 'bg-amber-100', text: 'text-amber-800', label: '特別' },
  '●': { bg: 'bg-gray-200', text: 'text-gray-700', label: '黒丸' },
  '◎': { bg: 'bg-teal-100', text: 'text-teal-800', label: '二重丸' },
  '':  { bg: 'bg-gray-50', text: 'text-gray-500', label: '勤務' },
} as const;

// For custom text (午前, 朝食, etc.)
export const CUSTOM_SHIFT_COLOR = {
  bg: 'bg-orange-100',
  text: 'text-orange-800',
  label: '備考'
};

export function getShiftColor(shift: string) {
  return SHIFT_COLORS[shift as keyof typeof SHIFT_COLORS] ?? CUSTOM_SHIFT_COLOR;
}
```

### Weekend Header Colors

| Day | Color | Tailwind |
|-----|-------|----------|
| Sunday (日) | Red | `text-red-500` |
| Saturday (土) | Blue | `text-blue-500` |
| Weekdays | Gray | `text-gray-600` |

### Visual Example

```
          February 2026
┌────┬────┬────┬────┬────┬────┬────┐
│ 日 │ 月 │ 火 │ 水 │ 木 │ 金 │ 土 │
├────┼────┼────┼────┼────┼────┼────┤
│    │    │    │    │    │ 21 │ 22 │
│    │    │    │    │    │████│████│  ← Blue (早番), Red (休み)
├────┼────┼────┼────┼────┼────┼────┤
│ 23 │ 24 │ 25 │ 26 │ 27 │ 28 │  1 │
│░░░░│░░░░│████│░░░░│░░░░│████│████│  ← Gray (勤務), Red (休み)
├────┼────┼────┼────┼────┼────┼────┤
│  2 │  3 │  4 │  5 │  6 │  7 │  8 │
│████│░░░░│████│░░░░│░░░░│████│████│
└────┴────┴────┴────┴────┴────┴────┘

Legend: ████ = Colored (shift)  ░░░░ = Gray (regular work)
```

---

## API Design (SvelteKit API Route)

### Endpoints

```
GET /api/staff-calendar/periods
  → Returns all available periods for navigation

GET /api/staff-calendar/[staffId]
  → Returns current period calendar for staff

GET /api/staff-calendar/[staffId]?period=[periodId]
  → Returns specific period calendar for staff
```

### API Response Types

```typescript
// GET /api/staff-calendar/periods
interface PeriodsResponse {
  periods: {
    id: string;
    start_date: string;
    end_date: string;
    label: string;
  }[];
  currentPeriodId: string | null;  // Based on today's date
}

// GET /api/staff-calendar/[staffId]
interface StaffCalendarResponse {
  staff: {
    id: string;
    name: string;
    position: string;
    status: string;
    department: string;
  };
  period: {
    id: string;
    start_date: string;
    end_date: string;
    label: string;
  };
  shifts: {
    [date: string]: string;  // "2026-02-21": "×"
  };
  navigation: {
    prevPeriodId: string | null;
    nextPeriodId: string | null;
  };
  stats: {
    off: number;      // × count
    early: number;    // △ count
    normal: number;   // ○ count
    late: number;     // ◇ count
    special: number;  // ★ count
    work: number;     // empty count
    custom: number;   // custom text count
    total: number;    // total days
  };
}
```

### Error Responses

```typescript
// 404 - Staff or period not found
{ error: 'Staff not found', code: 'STAFF_NOT_FOUND' }
{ error: 'Period not found', code: 'PERIOD_NOT_FOUND' }

// 500 - Database error
{ error: 'Failed to fetch calendar', code: 'DB_ERROR' }
```

---

## Cross-Project Database Access

Since the shift data is in a different Supabase project, you have these options:

### Option A: Second Supabase Client

```typescript
// lib/supabase-shifts.ts
import { createClient } from '@supabase/supabase-js';

const shiftsSupabaseUrl = 'https://oacvlxqhudusddaywaer.supabase.co';
const shiftsSupabaseKey = import.meta.env.VITE_SHIFTS_SUPABASE_ANON_KEY;

export const shiftsSupabase = createClient(shiftsSupabaseUrl, shiftsSupabaseKey);
```

### Option B: API Proxy Through Backend

Query the shifts database from your NestJS backend and expose via API.

### Option C: Database Link (Advanced)

Use Postgres foreign data wrapper to link databases (requires Supabase Pro).

---

## File Structure

```
apps/web/src/
├── lib/
│   ├── components/
│   │   └── calendar/
│   │       ├── StaffMiniCalendar.svelte      # Main component
│   │       ├── CalendarGrid.svelte           # Grid subcomponent
│   │       ├── CalendarStats.svelte          # Stats bar
│   │       ├── CalendarLegend.svelte         # Legend
│   │       └── types.ts                      # TypeScript interfaces
│   ├── supabase-shifts.ts                    # Shifts DB client
│   └── api/
│       └── staff-calendar.ts                 # API helper functions
├── routes/
│   └── api/
│       └── staff-calendar/
│           └── [staffId]/
│               └── +server.ts                # API endpoint
```

---

## Implementation Checklist

### Phase 1: Setup
- [ ] Add environment variables for shifts Supabase project
  - `VITE_SHIFTS_SUPABASE_URL`
  - `VITE_SHIFTS_SUPABASE_ANON_KEY`
- [ ] Create `lib/supabase-shifts.ts` client
- [ ] Create `lib/calendar/types.ts` with TypeScript interfaces
- [ ] Create `lib/calendar/shift-colors.ts` with color mapping

### Phase 2: API Layer
- [ ] Create `/api/staff-calendar/periods/+server.ts`
- [ ] Create `/api/staff-calendar/[staffId]/+server.ts`
- [ ] Implement data fetching from shifts database
- [ ] Add prev/next period navigation logic
- [ ] Add stats calculation (server-side)
- [ ] Add error handling

### Phase 3: Components
- [ ] Create `StaffMiniCalendar.svelte` (main component)
- [ ] Create `CalendarHeader.svelte` (staff info + period nav)
- [ ] Create `CalendarGrid.svelte` (color-filled date grid)
- [ ] Create `CalendarLegend.svelte` (color legend)
- [ ] Create `CalendarStats.svelte` (shift counts)
- [ ] Add swipe gesture for period navigation
- [ ] Add tap tooltip for shift details

### Phase 4: Styling
- [ ] Mobile-first responsive design
- [ ] Touch-friendly cell sizes (min 44px)
- [ ] Smooth transitions for period changes
- [ ] Loading skeleton state

### Phase 5: Integration & Testing
- [ ] Create demo page `/staff/[staffId]/calendar`
- [ ] Test with real data from shifts database
- [ ] Test period navigation
- [ ] Mobile device testing
- [ ] Performance check (data fetching speed)

### Phase 6: Enhancements (Future)
- [ ] Pull-to-refresh
- [ ] Offline caching with service worker
- [ ] Dark mode support
- [ ] Export calendar (ical/image)

---

## Decisions Made

| Question | Answer |
|----------|--------|
| Layout preference? | **Grid** - Regular calendar with color-filled cells |
| Show which stats? | Off days, Early shifts, Normal, Late, Special |
| Period navigation? | **Yes** - Prev/Next arrows + period label |
| Authentication? | **Public** for now - any staff can view |
| Data access method? | **API Route** - cleanest for SvelteKit |
| Dark mode support? | Not in v1, maybe later |

---

## Component Wireframe (Mobile)

### Full Component Layout

```
┌─────────────────────────────────────────────────┐
│                                          375px  │
│  ┌───────────────────────────────────────────┐  │
│  │   ←    2026年 2月・3月    →              │  │  ← Period Nav (swipeable)
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  👤 料理長                                 │  │  ← Staff Avatar + Name
│  │     Head Chef · 社員                      │  │     Position + Status
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  日   月   火   水   木   金   土          │  │  ← Day Headers
│  │ ─────────────────────────────────────────  │  │
│  │                          ┌───┐ ┌───┐      │  │
│  │                          │21 │ │22 │      │  │  ← Week 1
│  │                          │░░░│ │███│      │  │     (partial week)
│  │                          └───┘ └───┘      │  │
│  │ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐│  │
│  │ │23 │ │24 │ │25 │ │26 │ │27 │ │28 │ │ 1 ││  │  ← Week 2
│  │ │   │ │░░░│ │███│ │   │ │   │ │███│ │░░░││  │
│  │ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘│  │
│  │ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐│  │
│  │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │ │ 7 │ │ 8 ││  │  ← Week 3
│  │ │░░░│ │   │ │███│ │   │ │   │ │░░░│ │███││  │
│  │ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘│  │
│  │  ...more weeks...                         │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ ■ 休み(5)  ■ 早番(3)  ■ 通常(18)          │  │  ← Legend + Counts
│  │ ■ 遅番(2)  ■ 特別(1)  □ 勤務(1)           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Cell States

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│   21    │   │   22    │   │   23    │   │   24    │
│         │   │         │   │         │   │         │
│ ░░░░░░░ │   │ ███████ │   │ ▒▒▒▒▒▒▒ │   │ ▓▓▓▓▓▓▓ │
│ (gray)  │   │ (red)   │   │ (blue)  │   │ (green) │
└─────────┘   └─────────┘   └─────────┘   └─────────┘
   勤務          休み          早番          通常
   Work         Off          Early        Normal


┌─────────┐   ┌─────────┐   ┌─────────┐
│   25    │   │   26    │   │   27    │
│         │   │         │   │  (tap)  │   ← Tooltip on tap
│ ▓▓▓▓▓▓▓ │   │ ▓▓▓▓▓▓▓ │   │ ▓▓▓▓▓▓▓ │
│(purple) │   │ (amber) │   │(orange) │
└─────────┘   └─────────┘   └────┬────┘
   遅番          特別         │ 午前 │   ← Custom tooltip
   Late        Special       └──────┘
```

### Period Navigation Interaction

```
          ← Swipe Right              Swipe Left →
┌─────────────────────────────────────────────────┐
│                                                 │
│        ←    2026年 2月・3月    →               │
│       tap      period label      tap            │
│    (prev)                       (next)          │
│                                                 │
└─────────────────────────────────────────────────┘

Or tap arrows:
  [<]  Goes to 2026年 1月・2月
  [>]  Goes to 2026年 3月・4月
```

---

## Sample Data for Testing

```typescript
// Mock data for development
const mockCalendarData: StaffCalendarResponse = {
  staff: {
    id: 'ded6e0bc-b9f6-425b-94eb-a3126226a927',
    name: '料理長',
    position: 'Head Chef',
    status: '社員',
    department: 'Kitchen',
  },
  period: {
    id: 'abc123',
    start_date: '2026-02-21',
    end_date: '2026-03-20',
    label: '2月・3月',
  },
  shifts: {
    '2026-02-21': '△',
    '2026-02-22': '×',
    '2026-02-23': '',
    '2026-02-24': '○',
    '2026-02-25': '★',
    '2026-02-26': '×',
    '2026-02-27': '△',
    '2026-02-28': '',
    '2026-03-01': '×',
    '2026-03-02': '',
    '2026-03-03': '△',
    '2026-03-04': '×',
    '2026-03-05': '',
    '2026-03-06': '○',
    '2026-03-07': '△',
    '2026-03-08': '×',
    '2026-03-09': '',
    '2026-03-10': '午前',      // Custom text
    '2026-03-11': '◇',
    '2026-03-12': '',
    '2026-03-13': '×',
    '2026-03-14': '△',
    '2026-03-15': '',
    '2026-03-16': '○',
    '2026-03-17': '×',
    '2026-03-18': '',
    '2026-03-19': '△',
    '2026-03-20': '×',
  },
  navigation: {
    prevPeriodId: 'period-jan-feb',
    nextPeriodId: 'period-mar-apr',
  },
  stats: {
    off: 7,
    early: 6,
    normal: 3,
    late: 1,
    special: 1,
    work: 10,
    custom: 1,
    total: 29,
  },
};

// Mock periods list
const mockPeriods: PeriodsResponse = {
  periods: [
    { id: 'period-jan-feb', start_date: '2026-01-21', end_date: '2026-02-20', label: '1月・2月' },
    { id: 'period-feb-mar', start_date: '2026-02-21', end_date: '2026-03-20', label: '2月・3月' },
    { id: 'period-mar-apr', start_date: '2026-03-21', end_date: '2026-04-20', label: '3月・4月' },
    { id: 'period-apr-may', start_date: '2026-04-21', end_date: '2026-05-20', label: '4月・5月' },
  ],
  currentPeriodId: 'period-feb-mar',
};
```

---

## Environment Variables

Add to `.env`:

```bash
# Shifts Database (separate Supabase project)
VITE_SHIFTS_SUPABASE_URL=https://oacvlxqhudusddaywaer.supabase.co
VITE_SHIFTS_SUPABASE_ANON_KEY=<anon-key-here>
```

> **Important:** You'll need to get the anon key from the shift-schedule-manager project settings in Supabase dashboard.

---

## Page Route Structure

```
apps/web/src/routes/
├── staff/
│   └── [staffId]/
│       └── calendar/
│           └── +page.svelte    # Main calendar page
├── api/
│   └── staff-calendar/
│       ├── periods/
│       │   └── +server.ts      # GET periods list
│       └── [staffId]/
│           └── +server.ts      # GET staff calendar
```

### URL Examples

```
/staff/ded6e0bc-b9f6-425b-94eb-a3126226a927/calendar
/staff/ded6e0bc-b9f6-425b-94eb-a3126226a927/calendar?period=abc123
```

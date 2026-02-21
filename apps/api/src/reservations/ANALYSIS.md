# Dummy Data & Date Filter Analysis

## Current State

### Date Filter System
**Location**: `apps/web/src/routes/front-desk/+page.svelte` (lines 131-204)

**Current Options**:
- `today` (本日) - Shows only today's check-in reservations
- `past3` (過去3日間) - Shows last 3 days (today + 2 previous)
- `past7` (過去7日間) - Shows last 7 days (today + 6 previous)
- `past30` (過去30日間) - Shows last 30 days (today + 29 previous)
- `all` (全期間) - Shows all reservations

**Filter Logic**:
```typescript
function getDateRange(filter: DateFilter): { startDate: string; endDate: string } | null {
  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  // Returns date range based on filter
  // Used to filter reservations by check_in_date
}
```

**Implementation**:
- Dropdown UI with 5 predefined options
- Filters are PAST-focused (looking backwards from today)
- Client-side filtering for multi-day ranges
- API filtering for single-day (today)

**Current Behavior**:
```javascript
// Line 366-390
const dateRange = getDateRange(dateFilter);
const dateParam = dateFilter === 'today' ? dateRange?.startDate : undefined;

const reservationsData = await getReservations(dateParam, statusParam);

if (dateRange && dateFilter !== 'today') {
  // Client-side filtering for past3, past7, past30
  reservations = reservationsData.filter(r => {
    const checkInDate = new Date(r.check_in_date);
    return checkInDate >= startDate && checkInDate <= endDate;
  });
}
```

### Current Dummy Data
**Location**: `apps/api/src/reservations/create-dummy-reservations.ts`

**Current Spec**:
- **Total**: 10 reservations
- **All check-in**: Today's date
- **Distribution**:
  - 6 guests: 1 night (check-out tomorrow)
  - 3 guests: 2 nights (check-out day after tomorrow)
  - 1 guest: 3 nights (check-out 3 days from now)

**Room Coverage**: 101, 102, 103, 104, 201, 202, 203, 301, 302, 303 (10 rooms)

**Guest Name Pool**: 田中, 佐藤, 鈴木, 高橋, 伊藤, 渡辺, 山本, 中村, 小林, 加藤

**Booking Sources**: rakuten, jalan, booking_com, direct, expedia, agoda

**Plans**: 和牛懐石プラン, 記念日スペシャル, ファミリープラン, カップルプラン, ビジネスプラン, etc.

**Problem**:
- Only creates data for TODAY
- Cannot test future date filtering
- Cannot visualize calendar view with multiple days

---

## Proposed Improvements

### 1. Enhanced Dummy Data Generation

**New Spec**:
- **Total**: 70 reservations (10 per day × 7 days)
- **Date Range**: Today + next 6 days (7 days total)
- **Per Day Distribution**:
  - 6 guests: 1 night
  - 3 guests: 2 nights
  - 1 guest: 3 nights

**Benefits**:
- Test future reservations
- Visualize multi-day calendar
- Test date filtering across different days
- More realistic data for UI testing

**Implementation Strategy**:
```typescript
// For each day in next 7 days:
for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
  const checkInDate = addDays(today, dayOffset);

  // Create 10 reservations for this check-in date
  // - 6 × 1 night
  // - 3 × 2 nights
  // - 1 × 3 nights
}
```

**Guest Name Generation**:
- Use numbered variations: 田中 太郎1, 田中 太郎2, etc.
- OR use date suffix: 田中 太郎(2/21), 田中 太郎(2/22)
- Ensures unique guest names across 70 entries

**Room Assignment**:
- Cycle through available rooms
- Avoid conflicts by tracking room occupancy dates
- OR use simple rotation (since we have 70 entries and ~10 rooms, each room gets ~7 bookings)

### 2. Calendar View UI

**Current**: Dropdown with 5 predefined filters (past-focused)

**Proposed**: Calendar date picker

**Options for Implementation**:

#### Option A: Simple Date Range Picker
- Start Date + End Date inputs
- Shows reservations with check_in_date between range
- Keep existing dropdown as "Quick Filters"

#### Option B: Calendar Grid View
- Monthly calendar grid showing days
- Click date to filter reservations for that day
- Visual indicators showing reservation count per day
- Similar to booking platforms (Airbnb, Booking.com)

#### Option C: Hybrid Approach (RECOMMENDED)
- Keep dropdown for quick filters (本日, 過去7日間, etc.)
- Add new options:
  - "次7日間" (Next 7 days) - FORWARD-looking
  - "カスタム" (Custom) - Opens date range picker
- Calendar icon button next to dropdown opens calendar view

**UI Mockup (Hybrid)**:
```
┌─ Date Filter ─────────────────┐
│ [📅 本日 ▼] [🗓️]             │
│                                │
│ Dropdown options:              │
│ ✓ 本日                         │
│   過去3日間                    │
│   過去7日間                    │
│   次7日間 (NEW)                │
│   カスタム (NEW)               │
└────────────────────────────────┘

When calendar icon clicked:
┌─ Calendar View ────────────────┐
│   2026年2月                    │
│ Su Mo Tu We Th Fr Sa           │
│                 21 22 23       │
│ 24 25 26 27 28                 │
│                                │
│ Each day shows: [10] (count)   │
│ Click day to filter            │
└────────────────────────────────┘
```

### 3. Data Visualization Enhancements

**Reservation Table Grouping**:
- Group by check-in date when viewing multi-day range
- Show date headers: "2026年2月21日（金）- 10件"

**Dashboard Stats**:
- Show stats per day in calendar view
- Hover shows breakdown: "6×1泊, 3×2泊, 1×3泊"

---

## Implementation Plan

### Phase 1: Enhanced Dummy Data
1. Update `create-dummy-reservations.ts`:
   - Loop through 7 days (today + 6)
   - Generate 10 reservations per day
   - Use unique guest names with numbering
   - Distribute stay durations (6/3/1)

2. Add configuration options:
   - `DAYS_TO_GENERATE` (default: 7)
   - `RESERVATIONS_PER_DAY` (default: 10)

### Phase 2: Date Filter Improvements
1. Add new filter options:
   - `next7` (次7日間)
   - `custom` (カスタム)

2. Update `getDateRange()` to support forward-looking ranges

### Phase 3: Calendar UI
1. Install date picker library (e.g., `@internationalized/date`, `date-fns`)
2. Create Calendar component
3. Add calendar toggle button
4. Implement date selection logic

### Phase 4: Visualization
1. Add date grouping in reservation table
2. Show counts in calendar cells
3. Add hover tooltips with breakdown

---

## Technical Considerations

### Database Impact
- 70 entries vs 10 entries
- Minimal impact (still test data)
- Deletion via "全削除" button remains available

### Performance
- Client-side filtering handles 70 entries easily
- Consider pagination if scaling beyond 100 entries
- API should use server-side filtering for production

### Timezone Handling
- Already fixed in `create-dummy-reservations.ts`
- Use local date components (not ISO conversion)
- Ensures dates match user's timezone

### Data Consistency
- Avoid room booking conflicts
- Track which rooms are occupied on which dates
- OR use simple rotation without conflict checking (acceptable for test data)

---

## Recommended Next Steps

1. **Immediate**: Update dummy data script for 7-day generation
2. **Quick Win**: Add "次7日間" filter to dropdown
3. **Medium Term**: Implement calendar picker UI
4. **Long Term**: Add visual calendar grid with counts

This approach provides incremental improvements while maintaining backward compatibility.

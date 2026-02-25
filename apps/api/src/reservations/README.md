# Dummy Reservations Script

## Overview

This script creates **75 dummy reservations** with decreasing volume across 7 days to simulate realistic booking patterns where today has the most reservations and future days have progressively fewer.

## Reservation Breakdown

- **Total**: 75 reservations across 7 days
- **Date Range**: Today + next 6 days (7 days total)
- **Distribution by Day**: Decreasing volume `[20, 15, 12, 10, 8, 6, 4]`
  - **Day 1 (today)**: 20 reservations (highest)
  - **Day 2**: 15 reservations
  - **Day 3**: 12 reservations
  - **Day 4**: 10 reservations
  - **Day 5**: 8 reservations
  - **Day 6**: 6 reservations
  - **Day 7**: 4 reservations (lowest)
- **Per Day Stay Duration**: Random distribution
  - **40-70%** are 1 night stays
  - **20-40%** are 2 night stays
  - **10-30%** are 3-5 night stays

This creates a realistic booking pattern where today is busiest (20 guests checking in), with gradually decreasing volume for future dates. Perfect for testing calendar views and date filtering.

## Usage

### From API directory

```bash
cd apps/api
pnpm dummy:reservations
```

### From project root

```bash
cd apps/api && pnpm dummy:reservations
```

### Manual execution

```bash
cd apps/api
source ../../.env
SUPABASE_URL="${SUPABASE_URL}" \
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY}" \
RESTAURANT_ID="${RESTAURANT_ID}" \
npx tsx src/reservations/create-dummy-reservations.ts
```

## Configuration

You can modify the generation parameters by editing the script constants:

```typescript
const DAYS_TO_GENERATE = 7;
// Decreasing reservation count per day: [20, 15, 12, 10, 8, 6, 4]
const RESERVATIONS_BY_DAY = [20, 15, 12, 10, 8, 6, 4];
```

To change the distribution pattern, modify the `RESERVATIONS_BY_DAY` array. For example:
- Equal distribution: `[10, 10, 10, 10, 10, 10, 10]`
- Front-loaded: `[30, 20, 10, 5, 5, 3, 2]`
- Back-loaded: `[5, 5, 10, 15, 15, 15, 10]`

## Requirements

The script requires the following environment variables to be set in the root `.env` file:

- `SUPABASE_URL` or `PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `RESTAURANT_ID`

## Features

- **Multi-day generation**: Creates reservations for next 7 days (today + 6 future days)
- **Random distributions**: Each day has different stay duration mix (40-70% 1-night, 20-40% 2-night, 10-30% 3-5 night)
- **Unique guest names**: Uses numbered suffixes (田中 太郎1, 田中 太郎2, etc.)
- **Random booking data**:
  - Booking sources: Rakuten, Jalan, Booking.com, Direct, Expedia, Agoda, Phone
  - Meal plans: 2meals, dinner_only, breakfast_only, room_only
  - Party sizes: 1-4 people (random)
  - Phone numbers: Random Japanese mobile numbers
- **Room rotation**: Uses 10 rooms (101-104, 201-203, 301-303)
- **Status**: All reservations set to 'confirmed' (ready for check-in)
- **Allergens**: 30% of reservations have pre-filled allergen data
  - Random 1-3 allergens per reservation
  - Individual person counts (1 to party_size)
  - Uses `allergen_details` format with backward-compatible `allergen_ids`

## Output Example

```
Creating 75 dummy reservations across 7 days...

📅 Day 1 (2026-02-22): 20 reservations - 13×1泊, 5×2泊, 2×3+泊
📅 Day 2 (2026-02-23): 15 reservations - 6×1泊, 5×2泊, 4×3+泊
📅 Day 3 (2026-02-24): 12 reservations - 4×1泊, 3×2泊, 5×3+泊
📅 Day 4 (2026-02-25): 10 reservations - 4×1泊, 3×2泊, 3×3+泊
📅 Day 5 (2026-02-26): 8 reservations - 4×1泊, 2×2泊, 2×3+泊
📅 Day 6 (2026-02-27): 6 reservations - 2×1泊, 1×2泊, 3×3+泊
📅 Day 7 (2026-02-28): 4 reservations - 2×1泊, 1×2泊, 1×3+泊

💾 Inserting reservations into database...

📊 Summary: 75 successful, 0 failed

Breakdown by stay duration:
  1 night: 35 reservations
  2 nights: 20 reservations
  3 nights: 6 reservations
  4 nights: 9 reservations
  5 nights: 5 reservations

Allergen data:
  23 reservations with allergens (30.7%)
  52 reservations without allergens

✨ Done!
```

## Cleanup

To remove all test reservations:

```bash
cd apps/api
source ../../.env
SUPABASE_URL="${SUPABASE_URL}" \
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY}" \
RESTAURANT_ID="${RESTAURANT_ID}" \
npx tsx src/reservations/cleanup-test-data.ts
```

Or use the "全削除" button in the front-desk page UI.

## Use Cases

This enhanced dummy data is perfect for:

- Testing calendar view implementations
- Testing date range filtering (past 3/7/30 days, next 7 days, custom ranges)
- Visualizing reservation density across multiple days
- Testing stay period tracking (1泊目, 2泊目, etc.)
- Testing menu group filtering based on current stay night
- Load testing with realistic data volumes (70 entries)

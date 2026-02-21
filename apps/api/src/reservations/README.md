# Dummy Reservations Script

## Overview

This script creates **70 dummy reservations** (10 per day × 7 days) with randomized stay durations for realistic testing of the reservation system and date filtering features.

## Reservation Breakdown

- **Total**: 70 reservations across 7 days
- **Date Range**: Today + next 6 days (7 days total)
- **Per Day**: 10 reservations with randomized distribution:
  - **40-70%** are 1 night stays
  - **20-40%** are 2 night stays
  - **10-30%** are 3-5 night stays

Each day gets a different random distribution, making the data more realistic and useful for testing calendar views and date filtering.

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
const DAYS_TO_GENERATE = 7;        // Number of days to generate
const RESERVATIONS_PER_DAY = 10;   // Reservations per day
```

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
- **Allergens**: Empty array `allergen_ids = []`

## Output Example

```
Creating 70 dummy reservations across 7 days...

📅 Day 1 (2026-02-22): 5×1泊, 2×2泊, 3×3+泊
📅 Day 2 (2026-02-23): 6×1泊, 3×2泊, 1×3+泊
📅 Day 3 (2026-02-24): 5×1泊, 2×2泊, 3×3+泊
📅 Day 4 (2026-02-25): 4×1泊, 2×2泊, 4×3+泊
📅 Day 5 (2026-02-26): 6×1泊, 2×2泊, 2×3+泊
📅 Day 6 (2026-02-27): 6×1泊, 2×2泊, 2×3+泊
📅 Day 7 (2026-02-28): 6×1泊, 4×2泊, 0×3+泊

💾 Inserting reservations into database...

📊 Summary: 70 successful, 0 failed

Breakdown by stay duration:
  1 night: 38 reservations
  2 nights: 17 reservations
  3 nights: 7 reservations
  4 nights: 5 reservations
  5 nights: 3 reservations

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

# Dummy Reservations Script

## Overview

This script creates 10 dummy reservations for testing the stay period integration feature.

## Reservation Breakdown

- **6 reservations**: 1 night (check_in = today, check_out = today + 1)
- **3 reservations**: 2 nights (check_in = today, check_out = today + 2)
- **1 reservation**: 3 nights (check_in = today, check_out = today + 3)

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

## Requirements

The script requires the following environment variables to be set in the root `.env` file:

- `SUPABASE_URL` or `PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `RESTAURANT_ID`

## Features

- All reservations have `check_in_date` = today
- All reservations are set to `status = 'confirmed'` (ready for check-in)
- All reservations have `allergen_ids = []` (empty array)
- Varied guest names with Japanese names and readings (kana)
- Different booking sources (Rakuten, Jalan, Booking.com, Direct, Expedia, Agoda)
- Different meal plans (mostly 2meals, one breakfast_only)
- Realistic phone numbers and email addresses
- Different room numbers and names

## Output

The script will display progress for each reservation:

```
Creating 10 dummy reservations...

✅ Created: 田中 太郎 (101) - 1泊
✅ Created: 佐藤 花子 (102) - 1泊
...

📊 Summary: 10 successful, 0 failed

Breakdown:
- 1 night: 6 reservations
- 2 nights: 3 reservations
- 3 nights: 1 reservation

✨ Done!
```

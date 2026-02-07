# Guest Information System - Feature Plans

## Overview

Implementation plans for the 湖南荘 (Konan-so) ryokan guest management system, split into independent features.

## Feature List

| # | Feature | Status | Dependencies |
|---|---------|--------|--------------|
| 01 | [Database Schema](./01-database-schema.md) | Not Started | None |
| 02 | [Rooms Module](./02-rooms-module.md) | Not Started | 01 |
| 03 | [Reservations Module](./03-reservations-module.md) | Not Started | 01, 02 |
| 04 | [Guest Alerts Module](./04-guest-alerts-module.md) | Not Started | 01, 03 |
| 05 | [Frontend API Client](./05-frontend-api-client.md) | Not Started | 02, 03, 04 |
| 06 | [Front Desk Dashboard](./06-front-desk-dashboard.md) | Not Started | 05 |
| 07 | [Staff Notifications](./07-staff-notifications.md) | Not Started | 05 |
| 08 | [Guest Mobile Page](./08-guest-mobile-page.md) | Not Started | 05 |

## Recommended Implementation Order

```
01 Database Schema
        ↓
   ┌────┴────┐
   ↓         ↓
02 Rooms   03 Reservations
   └────┬────┘
        ↓
   04 Guest Alerts
        ↓
   05 Frontend API Client
        ↓
   ┌────┼────┐
   ↓    ↓    ↓
  06   07   08
Front Staff Guest
Desk  Notif Mobile
```

## Design Reference

All UI mockups are in `pencil-welcome.pen`:

| Frame ID | Description |
|----------|-------------|
| `86s7c` | Staff Allergen Alerts Dashboard |
| `kjYNC` | Front Desk Dashboard |
| `mnfRh` | Step 1: Guest Lookup |
| `tRjv0` | Step 2: Confirm Identity |
| `3n6OC` | Step 3: Inquiry Form |
| `nl3oz` | Guest Welcome + AI Mic |
| `NvnWd` | Guest AI Chat |
| `R48TI` | Guest Allergen Form |

## Design System

- **Primary:** #2563EB (blue)
- **Success:** #10B981 (green)
- **Warning:** #F59E0B (amber)
- **Destructive:** #DC2626 (red)
- **Fonts:** Plus Jakarta Sans (Latin), Noto Sans JP (Japanese)

## Quick Start

1. Start with **Feature 01** - Run the SQL migrations
2. Proceed to **Features 02-04** - Create backend modules
3. Update **Feature 05** - Add API client functions
4. Build **Features 06-08** - Frontend pages

Each feature document has a checklist at the bottom to track progress.

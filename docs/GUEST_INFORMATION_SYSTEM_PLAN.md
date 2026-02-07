# Implementation Plan: Guest Information System

## Overview

A comprehensive guest management system for 湖南荘 (Konan-so) ryokan that handles the full guest journey from check-in to in-room assistance. The system assumes guests have **pre-booked via external booking sites** (Rakuten, Jalan, direct booking, etc.) and streamlines the check-in process by only collecting information not available from the booking.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GUEST CHECK-IN FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  BOOKING SITES (External)                                           │   │
│  │  Rakuten Travel, Jalan, Direct Booking, etc.                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                            ↓ (sync/import)                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  RESERVATIONS TABLE                                                 │   │
│  │  Pre-filled: name, room, dates, party size, contact                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                            ↓                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 1: Guest Lookup (Front Desk)                                  │   │
│  │  • Scan QR code from booking confirmation                           │   │
│  │  • OR Search by name + phone                                        │   │
│  │  • OR Select from today's arrivals list                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                            ↓                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 2: Confirm Identity (Quick View)                              │   │
│  │  • Display pre-filled booking info (read-only)                      │   │
│  │  • Staff confirms: "この予約で間違いないですか？"                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                            ↓                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 3: Inquiry Form (Additional Info)                             │   │
│  │  • Dinner time preference                                           │   │
│  │  • Breakfast time preference                                        │   │
│  │  • Allergies / Dietary restrictions                                 │   │
│  │  • Special requests                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                            ↓                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CHECK-IN COMPLETE                                                  │   │
│  │  • Reservation status → 'checked_in'                                │   │
│  │  • Room status → 'occupied'                                         │   │
│  │  • Alert sent to Kitchen/Room Attendant (if allergens)              │   │
│  │  • Guest receives room QR code for mobile access                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## System Users & Dashboards

| User | Dashboard | Primary Functions |
|------|-----------|-------------------|
| **Front Desk** | `/front-desk` | Check-in guests, view reservations, room status |
| **Kitchen** | `/` (existing + notifications tab) | View allergen alerts, acknowledge/dismiss |
| **Room Attendant** | `/` (same as kitchen) | View allergen alerts for room service |
| **Guest** | `/guest` (mobile) | AI assistant, update allergies, request services |

---

## Phase 1: Database Schema

### Table: `reservations`

Stores booking information synced from external booking sites. This is the **primary guest record**.

```sql
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,

  -- Booking Source
  booking_source VARCHAR(50) NOT NULL DEFAULT 'direct',
    -- 'rakuten', 'jalan', 'booking_com', 'direct', 'phone', 'walk_in'
  booking_reference VARCHAR(100),    -- External booking ID
  qr_code VARCHAR(255) UNIQUE,       -- Generated for check-in scan

  -- Guest Info (from booking)
  guest_name VARCHAR(255) NOT NULL,
  guest_name_kana VARCHAR(255),
  party_size INTEGER NOT NULL DEFAULT 1,
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Stay Details (from booking)
  room_number VARCHAR(20) NOT NULL,
  room_name VARCHAR(100),            -- e.g., "松の間"
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,

  -- Collected at Check-in (initially NULL)
  arrival_time TIME,
  dinner_time TIME,
  breakfast_time TIME,
  allergen_ids UUID[] NOT NULL DEFAULT '{}',
  dietary_notes TEXT,
  special_requests TEXT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  checked_in_at TIMESTAMPTZ,
  checked_in_by VARCHAR(100),
  checked_out_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_reservations_restaurant_date
  ON public.reservations(restaurant_id, check_in_date);
CREATE INDEX idx_reservations_restaurant_status
  ON public.reservations(restaurant_id, status);
CREATE INDEX idx_reservations_room_date
  ON public.reservations(restaurant_id, room_number, check_in_date);
CREATE INDEX idx_reservations_qr
  ON public.reservations(qr_code);
CREATE INDEX idx_reservations_phone
  ON public.reservations(phone);
```

### Table: `guest_alerts`

Notifications sent to kitchen/room attendants when guest checks in with allergens or updates info.

```sql
CREATE TABLE public.guest_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,

  -- Alert Info
  alert_type VARCHAR(30) NOT NULL DEFAULT 'check_in'
    CHECK (alert_type IN ('check_in', 'allergen_update', 'request', 'checkout')),
  room_number VARCHAR(20) NOT NULL,
  guest_name VARCHAR(255),
  party_size INTEGER,
  dinner_time TIME,
  allergen_ids UUID[] NOT NULL DEFAULT '{}',
  message TEXT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'acknowledged', 'dismissed')),
  acknowledged_by VARCHAR(100),
  acknowledged_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_guest_alerts_restaurant_status
  ON public.guest_alerts(restaurant_id, status);
CREATE INDEX idx_guest_alerts_reservation
  ON public.guest_alerts(reservation_id);
```

### Table: `rooms`

Room inventory with status tracking.

```sql
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,

  room_number VARCHAR(20) NOT NULL,
  room_name VARCHAR(100),            -- e.g., "松の間", "竹の間", "桜の間", "藤の間"
  room_type VARCHAR(50),             -- 'standard', 'deluxe', 'suite', 'accessible'
  capacity INTEGER NOT NULL DEFAULT 2,
  floor INTEGER,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'occupied', 'cleaning', 'maintenance')),
  current_reservation_id UUID REFERENCES public.reservations(id),

  -- Display
  image_url TEXT,
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(restaurant_id, room_number)
);

CREATE INDEX idx_rooms_restaurant_status
  ON public.rooms(restaurant_id, status);
```

### Seed Data: Sample Reservations

```sql
-- Sample reservations for today (dummy data from booking sites)
INSERT INTO public.reservations (
  restaurant_id, booking_source, booking_reference, qr_code,
  guest_name, guest_name_kana, party_size, phone, email,
  room_number, room_name, check_in_date, check_out_date, status
) VALUES
  -- Already checked in
  ('YOUR_RESTAURANT_ID', 'rakuten', 'RTN-2024-001234', 'CHK-305-20260206-001',
   '田中 太郎', 'タナカ タロウ', 2, '090-1234-5678', 'tanaka@example.com',
   '305', '松の間', '2026-02-06', '2026-02-08', 'checked_in'),

  -- Awaiting arrival
  ('YOUR_RESTAURANT_ID', 'jalan', 'JLN-2024-005678', 'CHK-412-20260206-002',
   'Smith John', NULL, 1, '+1-555-123-4567', 'john.smith@example.com',
   '412', '竹の間', '2026-02-06', '2026-02-07', 'confirmed'),

  -- Already checked in
  ('YOUR_RESTAURANT_ID', 'direct', 'DIR-2024-000123', 'CHK-201-20260206-003',
   '佐藤 花子', 'サトウ ハナコ', 3, '080-9876-5432', 'sato.hanako@example.com',
   '201', '桜の間', '2026-02-06', '2026-02-09', 'checked_in'),

  -- Awaiting arrival
  ('YOUR_RESTAURANT_ID', 'booking_com', 'BKG-2024-789012', 'CHK-518-20260206-004',
   'Brown David', NULL, 2, '+44-20-7946-0958', 'david.brown@example.co.uk',
   '518', '藤の間', '2026-02-06', '2026-02-08', 'confirmed'),

  -- More reservations...
  ('YOUR_RESTAURANT_ID', 'rakuten', 'RTN-2024-001235', 'CHK-103-20260206-005',
   '鈴木 一郎', 'スズキ イチロウ', 4, '070-1111-2222', 'suzuki@example.com',
   '103', '梅の間', '2026-02-06', '2026-02-07', 'confirmed'),

  ('YOUR_RESTAURANT_ID', 'jalan', 'JLN-2024-005679', 'CHK-207-20260206-006',
   'Lee Min-jun', NULL, 2, '+82-10-1234-5678', 'minjun.lee@example.kr',
   '207', '菊の間', '2026-02-06', '2026-02-08', 'confirmed'),

  ('YOUR_RESTAURANT_ID', 'direct', 'DIR-2024-000124', 'CHK-401-20260206-007',
   '高橋 美咲', 'タカハシ ミサキ', 2, '090-3333-4444', 'takahashi@example.com',
   '401', '蘭の間', '2026-02-06', '2026-02-09', 'confirmed'),

  ('YOUR_RESTAURANT_ID', 'phone', 'TEL-2024-000045', 'CHK-310-20260206-008',
   '渡辺 健太', 'ワタナベ ケンタ', 1, '080-5555-6666', NULL,
   '310', '椿の間', '2026-02-06', '2026-02-07', 'confirmed');
```

### Enable Supabase Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
```

---

## Phase 2: Backend API

### Module: `ReservationsModule`

```
apps/api/src/reservations/
├── reservations.module.ts
├── reservations.controller.ts
├── reservations.service.ts
└── dto/
    ├── create-reservation.dto.ts
    ├── check-in.dto.ts
    ├── search-reservation.dto.ts
    └── reservation-response.dto.ts
```

**Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reservations` | List reservations (filter: `?date=`, `?status=`) |
| GET | `/reservations/today` | Today's arrivals (shortcut) |
| GET | `/reservations/:id` | Get reservation details |
| GET | `/reservations/qr/:qrCode` | Lookup by QR code scan |
| GET | `/reservations/search` | Search by name + phone |
| POST | `/reservations` | Create reservation (manual/walk-in) |
| PUT | `/reservations/:id` | Update reservation |
| PATCH | `/reservations/:id/check-in` | Complete check-in (Step 3 data) |
| PATCH | `/reservations/:id/check-out` | Check out guest |

**DTOs:**

**`search-reservation.dto.ts`**:
```typescript
{
  name?: string;         // Partial match
  phone?: string;        // Exact or partial match
  date?: string;         // Check-in date (default: today)
}
```

**`check-in.dto.ts`** (Step 3 - Additional Info):
```typescript
{
  dinner_time?: string;       // HH:MM
  breakfast_time?: string;    // HH:MM
  allergen_ids?: string[];    // UUID array
  dietary_notes?: string;
  special_requests?: string;
  checked_in_by?: string;     // Staff name
}
```

**Service Logic:**
- `checkIn()`:
  1. Update reservation with inquiry data
  2. Set status = 'checked_in', checked_in_at = now()
  3. Update room status = 'occupied'
  4. If allergen_ids not empty → create `guest_alert` with type 'check_in'
  5. Return updated reservation with enriched allergens

### Module: `GuestAlertsModule`

```
apps/api/src/guest-alerts/
├── guest-alerts.module.ts
├── guest-alerts.controller.ts
├── guest-alerts.service.ts
└── dto/
    ├── create-guest-alert.dto.ts
    ├── acknowledge-alert.dto.ts
    └── guest-alert-response.dto.ts
```

**Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/guest-alerts` | List alerts (filter: `?status=`, `?type=`) |
| GET | `/guest-alerts/:id` | Get alert details |
| PATCH | `/guest-alerts/:id/acknowledge` | Acknowledge/dismiss alert |

### Module: `RoomsModule`

```
apps/api/src/rooms/
├── rooms.module.ts
├── rooms.controller.ts
├── rooms.service.ts
└── dto/
    ├── room-response.dto.ts
    └── update-room-status.dto.ts
```

**Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rooms` | List all rooms with status + current guest |
| GET | `/rooms/:id` | Get room details |
| PATCH | `/rooms/:id/status` | Update room status (cleaning, etc.) |

---

## Phase 3: Frontend API Client

### Add to `apps/web/src/lib/api.ts`

**New Types:**

```typescript
// Reservation (from booking)
interface Reservation {
  id: string;
  booking_source: 'rakuten' | 'jalan' | 'booking_com' | 'direct' | 'phone' | 'walk_in';
  booking_reference?: string;
  qr_code?: string;

  // From booking
  guest_name: string;
  guest_name_kana?: string;
  party_size: number;
  phone?: string;
  email?: string;
  room_number: string;
  room_name?: string;
  check_in_date: string;
  check_out_date: string;

  // Collected at check-in
  arrival_time?: string;
  dinner_time?: string;
  breakfast_time?: string;
  allergen_ids: string[];
  allergens?: Allergen[];  // enriched
  dietary_notes?: string;
  special_requests?: string;

  // Status
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  checked_in_at?: string;
  checked_in_by?: string;

  created_at: string;
  updated_at: string;
}

// Guest Alert
interface GuestAlert {
  id: string;
  reservation_id: string;
  alert_type: 'check_in' | 'allergen_update' | 'request' | 'checkout';
  room_number: string;
  guest_name?: string;
  party_size?: number;
  dinner_time?: string;
  allergen_ids: string[];
  allergens?: Allergen[];  // enriched
  message?: string;
  status: 'new' | 'acknowledged' | 'dismissed';
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
}

// Room
interface Room {
  id: string;
  room_number: string;
  room_name?: string;
  room_type?: string;
  capacity: number;
  floor?: number;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
  current_reservation_id?: string;
  current_reservation?: Reservation;  // populated
  image_url?: string;
}

// Check-in data (Step 3)
interface CheckInData {
  dinner_time?: string;
  breakfast_time?: string;
  allergen_ids?: string[];
  dietary_notes?: string;
  special_requests?: string;
  checked_in_by?: string;
}
```

**New Functions:**

```typescript
// Reservations
getReservations(params?: { date?: string; status?: string }): Promise<Reservation[]>
getTodayArrivals(): Promise<Reservation[]>
getReservation(id: string): Promise<Reservation>
searchReservation(params: { name?: string; phone?: string }): Promise<Reservation[]>
lookupByQR(qrCode: string): Promise<Reservation>
checkIn(id: string, data: CheckInData): Promise<Reservation>
checkOut(id: string): Promise<Reservation>

// Guest Alerts
getGuestAlerts(params?: { status?: string; type?: string }): Promise<GuestAlert[]>
acknowledgeGuestAlert(id: string, status: 'acknowledged' | 'dismissed', by?: string): Promise<GuestAlert>

// Rooms
getRooms(): Promise<Room[]>
getRoom(id: string): Promise<Room>
updateRoomStatus(id: string, status: string): Promise<Room>
```

---

## Phase 4: Front Desk Dashboard (`/front-desk`)

### New file: `apps/web/src/routes/front-desk/+page.svelte`

**Layout:**
- Sidebar: 湖南荘 branding, navigation (Check-in, Rooms, Guests, Alerts, Settings)
- Header: "チェックイン管理" with date and count badge
- Main content: Room grid + Today's reservations table

### Step 1: Guest Lookup Screen

**Trigger:** Click "チェックイン" button on a reservation row, or click floating "+" button

**UI Components:**
- **QR Scanner** (primary): Large scan button with camera preview
- **Manual Search**: Name input + Phone input + Search button
- **Today's Arrivals**: Quick-select list showing confirmed reservations

**State:**
```
lookupMode: 'qr' | 'search' | 'list'
searchName, searchPhone
searchResults: Reservation[]
```

### Step 2: Confirm Identity Screen

**Shows after successful lookup**

**UI Layout:**
```
┌─────────────────────────────────────────┐
│  ✓ 予約が見つかりました                   │
├─────────────────────────────────────────┤
│  Guest: 田中 太郎 様                      │
│  Room:  305 松の間                       │
│  Dates: 2026/02/06 - 2026/02/08 (2泊)   │
│  Party: 2名                              │
│  Phone: 090-1234-5678                   │
│  Source: Rakuten Travel                 │
├─────────────────────────────────────────┤
│  [キャンセル]     [この予約でチェックイン] │
└─────────────────────────────────────────┘
```

**Read-only display** of booking info. Staff confirms identity verbally.

### Step 3: Inquiry Form (Additional Info)

**Shows after identity confirmation**

**Fields to collect:**
- 夕食時間 (Dinner time): Dropdown [17:30, 18:00, 18:30, 19:00, 19:30, 20:00]
- 朝食時間 (Breakfast time): Dropdown [07:00, 07:30, 08:00, 08:30, 09:00]
- アレルギー (Allergies): Multi-select chips with search
- 特記事項 (Special requests): Textarea

**NOT shown** (already from booking): Name, room, dates, party size, contact

**On Submit:**
1. `PATCH /reservations/:id/check-in` with inquiry data
2. Triggers alert to kitchen if allergens selected
3. Show success screen with room key handoff instructions

### Check-in Table

**Columns:**
| 客室 | ゲスト名 | 人数 | 予約元 | 泊数 | ステータス | アクション |

**Status badges:**
- `confirmed` → 到着待ち (yellow)
- `checked_in` → チェックイン済 (green)

**Action buttons:**
- 到着待ち rows → "チェックイン" (blue primary button)
- チェックイン済 rows → "詳細" (gray button)

---

## Phase 5: Kitchen/Room Attendant Dashboard (Notifications Tab)

### Modify: `apps/web/src/routes/+page.svelte`

**Add "通知" (Notifications) tab** to existing dashboard.

**Alert content now includes:**
- Room number + Guest name
- Party size
- Dinner time
- Allergen chips (red, with Japanese names)
- Check-in timestamp

**Alert types:**
- `check_in`: New guest checked in (green left border if has allergens, blue if no allergens)
- `allergen_update`: Guest updated allergies via mobile (orange left border)

**Supabase Realtime Subscription:**
```javascript
supabase.channel('guest-alerts-realtime')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'guest_alerts'
  }, (payload) => {
    // Fetch enriched alert, prepend to list, play sound
  })
  .subscribe()
```

---

## Phase 6: Guest Mobile Page (`/guest`)

### Access Method

After check-in, guest receives:
- Physical room key card
- QR code printed slip OR
- URL: `https://app.konanso.jp/guest?room=305&token=xxx`

### New file: `apps/web/src/routes/guest/+page.svelte`

**Welcome Screen:**
- Header: "ようこそ、田中様" with room 305 松の間
- AI chat button: "なんでも聞いてください"
- Quick actions: お食事, 観光案内, ルームサービス
- Link: "アレルギー情報を更新する"

**Allergen Update Flow:**
- Guest can update their allergies anytime
- On submit → creates `guest_alert` with type 'allergen_update'
- Kitchen receives realtime notification

---

## Implementation Order

| Step | What | Files |
|------|------|-------|
| 1 | DB migration: create `reservations`, `guest_alerts`, `rooms` | Supabase SQL |
| 2 | Seed dummy reservation data | Supabase SQL |
| 3 | Enable Realtime publication | Supabase SQL |
| 4 | Create `RoomsModule` | `apps/api/src/rooms/**` |
| 5 | Create `ReservationsModule` | `apps/api/src/reservations/**` |
| 6 | Create `GuestAlertsModule` | `apps/api/src/guest-alerts/**` |
| 7 | Register modules in AppModule | `apps/api/src/app.module.ts` |
| 8 | Add API client types + functions | `apps/web/src/lib/api.ts` |
| 9 | Create Front Desk dashboard (main view) | `apps/web/src/routes/front-desk/+page.svelte` |
| 10 | Add Step 1: Guest Lookup UI | (in front-desk page) |
| 11 | Add Step 2: Confirm Identity UI | (in front-desk page) |
| 12 | Add Step 3: Inquiry Form UI | (in front-desk page) |
| 13 | Add Notifications tab to staff dashboard | `apps/web/src/routes/+page.svelte` |
| 14 | Add notification sound | `apps/web/static/notification.mp3` |
| 15 | Create Guest mobile page | `apps/web/src/routes/guest/+page.svelte` |
| 16 | Update CLAUDE.md | `CLAUDE.md` |

---

## Key Files to Create

**Backend (apps/api/src/):**
```
rooms/
├── rooms.module.ts
├── rooms.controller.ts
├── rooms.service.ts
└── dto/
    ├── room-response.dto.ts
    └── update-room-status.dto.ts

reservations/
├── reservations.module.ts
├── reservations.controller.ts
├── reservations.service.ts
└── dto/
    ├── create-reservation.dto.ts
    ├── check-in.dto.ts
    ├── search-reservation.dto.ts
    └── reservation-response.dto.ts

guest-alerts/
├── guest-alerts.module.ts
├── guest-alerts.controller.ts
├── guest-alerts.service.ts
└── dto/
    ├── create-guest-alert.dto.ts
    ├── acknowledge-alert.dto.ts
    └── guest-alert-response.dto.ts
```

**Frontend (apps/web/src/):**
```
routes/
├── front-desk/
│   └── +page.svelte          # Front desk dashboard + check-in flow
├── guest/
│   └── +page.svelte          # Guest mobile page
└── +page.svelte              # (modify) Add notifications tab

lib/
└── api.ts                    # (modify) Add new types + functions

static/
└── notification.mp3          # Alert sound
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| `reservations` table (not `guests`) | Reflects reality: guests book first, then check in |
| Pre-filled booking data | Reduces check-in friction; staff only collects what's missing |
| 3-step check-in flow | Clear separation: lookup → confirm → inquire |
| QR code as primary lookup | Fast, error-free identification |
| Allergens collected at check-in | Most critical info for kitchen; booking sites don't capture this |
| Alert on check-in (not just allergen) | Kitchen knows when guests arrive and their dinner time |
| Guest can update allergens via mobile | Flexibility if they forgot to mention something |
| `booking_source` tracking | Analytics + potential future booking site integrations |

---

## UI Design Reference

All UI mockups are in `pencil-welcome.pen`:

| Frame | Description |
|-------|-------------|
| `86s7c` | Staff Allergen Alerts Dashboard (Kitchen/Room Attendant) |
| `kjYNC` | Front Desk Dashboard (main view + check-in flow) |
| `nl3oz` | Guest Welcome + AI Mic Screen |
| `NvnWd` | Guest AI Chat Screen |
| `R48TI` | Guest Manual Allergen Form |

**Design System:**
- Primary: #2563EB (blue)
- Success/New: #10B981 (green)
- Warning/Pending: #F59E0B (yellow)
- Destructive/Allergen: #DC2626 (red)
- Fonts: Plus Jakarta Sans (Latin), Noto Sans JP (Japanese)
- Sharp corners (minimal border radius)
- Sidebar: 240px, light background

---

## Future Enhancements

1. **Booking Site API Integration**: Auto-sync reservations from Rakuten, Jalan APIs
2. **AI Voice Assistant**: Full speech-to-speech conversation for guests
3. **Multi-language Support**: English, Chinese, Korean for international guests
4. **Guest History**: Track repeat visitors and their preferences
5. **Kitchen Display System**: Dedicated screen for dinner prep timeline
6. **Mobile App**: Native iOS/Android for staff
7. **SMS/LINE Notifications**: Send check-in confirmation to guests
8. **Walk-in Support**: Simplified flow for guests without reservations

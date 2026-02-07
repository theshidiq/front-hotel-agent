# Feature 01: Database Schema

## Overview
Create the foundational database tables for the Guest Information System.

## Authentication Strategy

**Simple Token Authentication** for guest QR codes:
- Each reservation gets a unique 32-char token (e.g., `chk_a1b2c3d4e5f6...`)
- QR code contains URL: `https://app.konanso.jp/guest?token=chk_xxx`
- Backend validates token → returns reservation data
- Token is single-use per stay (expires at checkout)
- No login required, minimal friction for guests

## Tables to Create

### 1. `reservations`
Stores booking information from external booking sites or manual entry.

```sql
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,

  -- Booking Source
  booking_source VARCHAR(50) NOT NULL DEFAULT 'direct'
    CHECK (booking_source IN ('rakuten', 'jalan', 'booking_com', 'expedia', 'agoda', 'direct', 'phone', 'walk_in')),
  booking_reference VARCHAR(100),  -- External booking ID (e.g., RTN-2024-001234)

  -- QR Token for Guest Access (Simple Token Auth)
  guest_token VARCHAR(64) UNIQUE,  -- e.g., chk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
  token_expires_at TIMESTAMPTZ,    -- Set to checkout date + 1 day

  -- Guest Info (from booking)
  guest_name VARCHAR(255) NOT NULL,
  guest_name_kana VARCHAR(255),     -- Japanese reading (カタカナ)
  party_size INTEGER NOT NULL DEFAULT 1,
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Stay Details (from booking)
  room_number VARCHAR(20) NOT NULL,
  room_name VARCHAR(100),           -- e.g., "松の間"
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,

  -- Plan/Package Info (from booking)
  plan_name VARCHAR(255),           -- e.g., "【早割30】スタンダードプラン"
  meal_plan VARCHAR(50) DEFAULT '2meals'
    CHECK (meal_plan IN ('2meals', 'dinner_only', 'breakfast_only', 'no_meals', 'room_only')),
  total_price INTEGER,              -- Total in JPY

  -- Collected at Check-in (initially NULL)
  dinner_time TIME,
  breakfast_time TIME,
  allergen_ids UUID[] NOT NULL DEFAULT '{}',
  dietary_notes TEXT,
  special_requests TEXT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  checked_in_at TIMESTAMPTZ,
  checked_in_by VARCHAR(100),       -- Staff name
  checked_out_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_reservations_restaurant_date ON public.reservations(restaurant_id, check_in_date);
CREATE INDEX idx_reservations_restaurant_status ON public.reservations(restaurant_id, status);
CREATE INDEX idx_reservations_guest_token ON public.reservations(guest_token);
CREATE INDEX idx_reservations_phone ON public.reservations(phone);
CREATE INDEX idx_reservations_booking_ref ON public.reservations(booking_reference);

-- Function to generate guest token
CREATE OR REPLACE FUNCTION generate_guest_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'chk_' || encode(gen_random_bytes(24), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Auto-generate token on insert
CREATE OR REPLACE FUNCTION set_guest_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.guest_token IS NULL THEN
    NEW.guest_token := generate_guest_token();
    NEW.token_expires_at := (NEW.check_out_date + INTERVAL '1 day')::TIMESTAMPTZ;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservations_set_token
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION set_guest_token();
```

### 2. `guest_alerts`
Notifications sent to kitchen/room attendants when guests check in with allergens.

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

CREATE INDEX idx_guest_alerts_restaurant_status ON public.guest_alerts(restaurant_id, status);
CREATE INDEX idx_guest_alerts_reservation ON public.guest_alerts(reservation_id);
CREATE INDEX idx_guest_alerts_created ON public.guest_alerts(created_at DESC);
```

### 3. `rooms`
Room inventory with status tracking.

```sql
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,

  room_number VARCHAR(20) NOT NULL,
  room_name VARCHAR(100),           -- e.g., "松の間", "竹の間"
  room_type VARCHAR(50),            -- 'standard', 'deluxe', 'suite', 'accessible'
  capacity INTEGER NOT NULL DEFAULT 2,
  floor INTEGER,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'occupied', 'cleaning', 'maintenance', 'out_of_order')),
  current_reservation_id UUID REFERENCES public.reservations(id),

  -- Display
  image_url TEXT,
  description TEXT,
  amenities TEXT[],                 -- e.g., ['露天風呂', 'マッサージチェア']

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(restaurant_id, room_number)
);

CREATE INDEX idx_rooms_restaurant_status ON public.rooms(restaurant_id, status);
```

### 4. Enable Realtime

```sql
-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
```

---

## Seed Data

### Rooms (8 rooms for 湖南荘)

```sql
-- Insert rooms for the ryokan
-- Replace 'YOUR_RESTAURANT_ID' with actual UUID from your .env
INSERT INTO public.rooms (restaurant_id, room_number, room_name, room_type, capacity, floor, status, amenities) VALUES
  ('YOUR_RESTAURANT_ID', '101', '桜の間', 'standard', 2, 1, 'available', ARRAY['和室10畳', '檜風呂']),
  ('YOUR_RESTAURANT_ID', '102', '梅の間', 'standard', 3, 1, 'available', ARRAY['和室12畳', '檜風呂']),
  ('YOUR_RESTAURANT_ID', '201', '竹の間', 'standard', 2, 2, 'available', ARRAY['和室10畳', '檜風呂']),
  ('YOUR_RESTAURANT_ID', '202', '菊の間', 'deluxe', 4, 2, 'available', ARRAY['和室15畳', '露天風呂', 'マッサージチェア']),
  ('YOUR_RESTAURANT_ID', '301', '松の間', 'deluxe', 2, 3, 'available', ARRAY['和室12畳', '露天風呂']),
  ('YOUR_RESTAURANT_ID', '302', '藤の間', 'suite', 4, 3, 'available', ARRAY['和室20畳', '露天風呂', 'リビング', 'マッサージチェア']),
  ('YOUR_RESTAURANT_ID', '303', '蘭の間', 'suite', 6, 3, 'available', ARRAY['和室25畳', '露天風呂', 'リビング', 'ダイニング']),
  ('YOUR_RESTAURANT_ID', '401', '椿の間', 'accessible', 2, 4, 'available', ARRAY['バリアフリー', '和洋室', '檜風呂']);
```

### Reservations (Diverse dummy data)

```sql
-- Dummy reservations with various booking sources
-- Tokens are auto-generated by trigger, but we set them explicitly for testing
-- Replace 'YOUR_RESTAURANT_ID' with actual UUID

INSERT INTO public.reservations (
  restaurant_id, booking_source, booking_reference, guest_token,
  guest_name, guest_name_kana, party_size, phone, email,
  room_number, room_name, check_in_date, check_out_date,
  plan_name, meal_plan, total_price, status,
  dinner_time, breakfast_time, allergen_ids, checked_in_at
) VALUES

-- ===== CHECKED IN GUESTS (already here) =====

-- 1. Japanese couple from Rakuten (checked in, has allergens)
('YOUR_RESTAURANT_ID', 'rakuten', 'RTN-2026-001234',
 'chk_test_tanaka_301_松の間_20260206',
 '田中 太郎', 'タナカ タロウ', 2, '090-1234-5678', 'tanaka.taro@gmail.com',
 '301', '松の間', CURRENT_DATE, CURRENT_DATE + 2,
 '【カップル限定】記念日プラン', '2meals', 88000, 'checked_in',
 '18:30', '08:00', ARRAY[]::UUID[], now() - INTERVAL '3 hours'),

-- 2. Japanese family from Jalan (checked in, child has egg allergy)
('YOUR_RESTAURANT_ID', 'jalan', 'JLN-2026-005678',
 'chk_test_sato_202_菊の間_20260206',
 '佐藤 花子', 'サトウ ハナコ', 4, '080-9876-5432', 'sato.hanako@yahoo.co.jp',
 '202', '菊の間', CURRENT_DATE, CURRENT_DATE + 1,
 'ファミリープラン【お子様歓迎】', '2meals', 120000, 'checked_in',
 '18:00', '07:30', ARRAY[]::UUID[], now() - INTERVAL '2 hours'),

-- 3. Solo business traveler, direct booking (checked in, no meals)
('YOUR_RESTAURANT_ID', 'direct', 'DIR-2026-000089',
 'chk_test_yamamoto_101_桜の間_20260206',
 '山本 健一', 'ヤマモト ケンイチ', 1, '070-1111-2222', 'k.yamamoto@company.co.jp',
 '101', '桜の間', CURRENT_DATE, CURRENT_DATE + 1,
 'ビジネスプラン【素泊まり】', 'no_meals', 15000, 'checked_in',
 NULL, NULL, ARRAY[]::UUID[], now() - INTERVAL '5 hours'),


-- ===== CONFIRMED (arriving today, not yet checked in) =====

-- 4. American tourist from Booking.com
('YOUR_RESTAURANT_ID', 'booking_com', 'BKG-2026-789012',
 'chk_test_smith_302_藤の間_20260206',
 'John Smith', NULL, 2, '+1-415-555-0123', 'john.smith@gmail.com',
 '302', '藤の間', CURRENT_DATE, CURRENT_DATE + 3,
 'Premium Suite Plan', '2meals', 180000, 'confirmed',
 NULL, NULL, ARRAY[]::UUID[], NULL),

-- 5. Korean couple from Expedia
('YOUR_RESTAURANT_ID', 'expedia', 'EXP-2026-456789',
 'chk_test_kim_201_竹の間_20260206',
 'Kim Min-jun', NULL, 2, '+82-10-1234-5678', 'minjun.kim@naver.com',
 '201', '竹の間', CURRENT_DATE, CURRENT_DATE + 2,
 'Standard Plan with Meals', '2meals', 66000, 'confirmed',
 NULL, NULL, ARRAY[]::UUID[], NULL),

-- 6. Japanese group from Rakuten (large party)
('YOUR_RESTAURANT_ID', 'rakuten', 'RTN-2026-001567',
 'chk_test_suzuki_303_蘭の間_20260206',
 '鈴木 一郎', 'スズキ イチロウ', 6, '090-3333-4444', 'suzuki.ichiro@docomo.ne.jp',
 '303', '蘭の間', CURRENT_DATE, CURRENT_DATE + 2,
 '【グループ】宴会プラン', '2meals', 240000, 'confirmed',
 NULL, NULL, ARRAY[]::UUID[], NULL),

-- 7. Elderly couple, phone booking (accessibility needs)
('YOUR_RESTAURANT_ID', 'phone', 'TEL-2026-000045',
 'chk_test_watanabe_401_椿の間_20260206',
 '渡辺 正夫', 'ワタナベ マサオ', 2, '03-1234-5678', NULL,
 '401', '椿の間', CURRENT_DATE, CURRENT_DATE + 2,
 '【シニア割】ゆったりプラン', '2meals', 70000, 'confirmed',
 NULL, NULL, ARRAY[]::UUID[], NULL),

-- 8. Chinese tourist from Agoda
('YOUR_RESTAURANT_ID', 'agoda', 'AGD-2026-112233',
 'chk_test_wang_102_梅の間_20260206',
 'Wang Wei', NULL, 3, '+86-138-0000-1234', 'wangwei@qq.com',
 '102', '梅の間', CURRENT_DATE, CURRENT_DATE + 1,
 'Family Room Plan', '2meals', 75000, 'confirmed',
 NULL, NULL, ARRAY[]::UUID[], NULL),


-- ===== FUTURE RESERVATIONS (arriving tomorrow+) =====

-- 9. Tomorrow - Japanese couple anniversary
('YOUR_RESTAURANT_ID', 'jalan', 'JLN-2026-007890',
 'chk_test_takahashi_301_松の間_20260207',
 '高橋 美咲', 'タカハシ ミサキ', 2, '080-5555-6666', 'misaki.takahashi@icloud.com',
 '301', '松の間', CURRENT_DATE + 1, CURRENT_DATE + 3,
 '【記念日】アニバーサリープラン', '2meals', 95000, 'confirmed',
 NULL, NULL, ARRAY[]::UUID[], NULL),

-- 10. Day after tomorrow - British family
('YOUR_RESTAURANT_ID', 'booking_com', 'BKG-2026-334455',
 'chk_test_brown_303_蘭の間_20260208',
 'David Brown', NULL, 4, '+44-20-7946-0958', 'david.brown@outlook.co.uk',
 '303', '蘭の間', CURRENT_DATE + 2, CURRENT_DATE + 5,
 'Suite Room with Meals', '2meals', 320000, 'confirmed',
 NULL, NULL, ARRAY[]::UUID[], NULL),


-- ===== WALK-IN (manual entry example) =====

-- 11. Walk-in guest added by front desk
('YOUR_RESTAURANT_ID', 'walk_in', NULL,
 'chk_test_walkin_102_梅の間_20260207',
 '伊藤 直樹', 'イトウ ナオキ', 1, '090-7777-8888', NULL,
 '102', '梅の間', CURRENT_DATE + 1, CURRENT_DATE + 2,
 '当日プラン', 'dinner_only', 25000, 'confirmed',
 NULL, NULL, ARRAY[]::UUID[], NULL);


-- Update room status for checked-in guests
UPDATE public.rooms SET status = 'occupied', current_reservation_id = r.id
FROM public.reservations r
WHERE rooms.restaurant_id = r.restaurant_id
  AND rooms.room_number = r.room_number
  AND r.status = 'checked_in';
```

### Sample Guest Alert (for a checked-in guest with allergens)

```sql
-- This would normally be created by the check-in process
-- Example: Sato family checked in with egg allergy notification
INSERT INTO public.guest_alerts (
  restaurant_id, reservation_id, alert_type,
  room_number, guest_name, party_size, dinner_time,
  allergen_ids, message, status
)
SELECT
  r.restaurant_id,
  r.id,
  'check_in',
  r.room_number,
  r.guest_name,
  r.party_size,
  r.dinner_time,
  r.allergen_ids,
  'お子様に卵アレルギーあり',
  'new'
FROM public.reservations r
WHERE r.guest_token = 'chk_test_sato_202_菊の間_20260206';
```

---

## QR Code URLs for Testing

After inserting the seed data, these URLs can be used to test guest access:

| Guest | Room | QR URL |
|-------|------|--------|
| 田中 太郎 | 301 松の間 | `/guest?token=chk_test_tanaka_301_松の間_20260206` |
| 佐藤 花子 | 202 菊の間 | `/guest?token=chk_test_sato_202_菊の間_20260206` |
| John Smith | 302 藤の間 | `/guest?token=chk_test_smith_302_藤の間_20260206` |
| Kim Min-jun | 201 竹の間 | `/guest?token=chk_test_kim_201_竹の間_20260206` |

*Note: In production, tokens would be random 48-char hex strings like `chk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4`*

---

## Booking Source Reference

| Source | Code | Example Reference |
|--------|------|-------------------|
| 楽天トラベル | `rakuten` | RTN-2026-001234 |
| じゃらん | `jalan` | JLN-2026-005678 |
| Booking.com | `booking_com` | BKG-2026-789012 |
| Expedia | `expedia` | EXP-2026-456789 |
| Agoda | `agoda` | AGD-2026-112233 |
| 公式サイト | `direct` | DIR-2026-000089 |
| 電話予約 | `phone` | TEL-2026-000045 |
| 当日飛込 | `walk_in` | (none) |

---

## Checklist

- [ ] Run table creation SQL in Supabase SQL Editor
- [ ] Run trigger/function creation SQL
- [ ] Replace `YOUR_RESTAURANT_ID` with actual UUID from `.env`
- [ ] Insert rooms seed data
- [ ] Insert reservations seed data
- [ ] Enable Realtime publication
- [ ] Verify tables in Supabase dashboard
- [ ] Test a QR token URL in browser

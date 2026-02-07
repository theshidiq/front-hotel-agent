-- ============================================================
-- FULL MIGRATION: Guest Information System
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. CREATE RESERVATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,

  -- Booking Source
  booking_source VARCHAR(50) NOT NULL DEFAULT 'direct'
    CHECK (booking_source IN ('rakuten', 'jalan', 'booking_com', 'expedia', 'agoda', 'direct', 'phone', 'walk_in')),
  booking_reference VARCHAR(100),

  -- QR Token for Guest Access (Simple Token Auth)
  guest_token VARCHAR(64) UNIQUE,
  token_expires_at TIMESTAMPTZ,

  -- Guest Info (from booking)
  guest_name VARCHAR(255) NOT NULL,
  guest_name_kana VARCHAR(255),
  party_size INTEGER NOT NULL DEFAULT 1,
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Stay Details (from booking)
  room_number VARCHAR(20) NOT NULL,
  room_name VARCHAR(100),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,

  -- Plan/Package Info (from booking)
  plan_name VARCHAR(255),
  meal_plan VARCHAR(50) DEFAULT '2meals'
    CHECK (meal_plan IN ('2meals', 'dinner_only', 'breakfast_only', 'no_meals', 'room_only')),
  total_price INTEGER,

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
  checked_in_by VARCHAR(100),
  checked_out_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for reservations
CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_date ON public.reservations(restaurant_id, check_in_date);
CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_status ON public.reservations(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_guest_token ON public.reservations(guest_token);
CREATE INDEX IF NOT EXISTS idx_reservations_phone ON public.reservations(phone);
CREATE INDEX IF NOT EXISTS idx_reservations_booking_ref ON public.reservations(booking_reference);


-- ============================================================
-- 2. CREATE GUEST_ALERTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.guest_alerts (
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

-- Indexes for guest_alerts
CREATE INDEX IF NOT EXISTS idx_guest_alerts_restaurant_status ON public.guest_alerts(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_guest_alerts_reservation ON public.guest_alerts(reservation_id);
CREATE INDEX IF NOT EXISTS idx_guest_alerts_created ON public.guest_alerts(created_at DESC);


-- ============================================================
-- 3. CREATE ROOMS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,

  room_number VARCHAR(20) NOT NULL,
  room_name VARCHAR(100),
  room_type VARCHAR(50),
  capacity INTEGER NOT NULL DEFAULT 2,
  floor INTEGER,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'occupied', 'cleaning', 'maintenance', 'out_of_order')),
  current_reservation_id UUID REFERENCES public.reservations(id),

  -- Display
  image_url TEXT,
  description TEXT,
  amenities TEXT[],

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(restaurant_id, room_number)
);

-- Indexes for rooms
CREATE INDEX IF NOT EXISTS idx_rooms_restaurant_status ON public.rooms(restaurant_id, status);


-- ============================================================
-- 4. CREATE TRIGGER FUNCTIONS
-- ============================================================

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

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 5. CREATE TRIGGERS
-- ============================================================

-- Reservations triggers
DROP TRIGGER IF EXISTS reservations_set_token ON public.reservations;
CREATE TRIGGER reservations_set_token
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION set_guest_token();

DROP TRIGGER IF EXISTS reservations_updated_at ON public.reservations;
CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Guest alerts trigger
DROP TRIGGER IF EXISTS guest_alerts_updated_at ON public.guest_alerts;
CREATE TRIGGER guest_alerts_updated_at
  BEFORE UPDATE ON public.guest_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Rooms trigger
DROP TRIGGER IF EXISTS rooms_updated_at ON public.rooms;
CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 6. ENABLE REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;


-- ============================================================
-- 7. SEED DATA: ROOMS
-- ============================================================

INSERT INTO public.rooms (restaurant_id, room_number, room_name, room_type, capacity, floor, status, amenities) VALUES
  ('4a4e4447-3ddc-4790-b2f9-b892722503b3', '101', '桜の間', 'standard', 2, 1, 'available', ARRAY['和室10畳', '檜風呂']),
  ('4a4e4447-3ddc-4790-b2f9-b892722503b3', '102', '梅の間', 'standard', 3, 1, 'available', ARRAY['和室12畳', '檜風呂']),
  ('4a4e4447-3ddc-4790-b2f9-b892722503b3', '201', '竹の間', 'standard', 2, 2, 'available', ARRAY['和室10畳', '檜風呂']),
  ('4a4e4447-3ddc-4790-b2f9-b892722503b3', '202', '菊の間', 'deluxe', 4, 2, 'available', ARRAY['和室15畳', '露天風呂', 'マッサージチェア']),
  ('4a4e4447-3ddc-4790-b2f9-b892722503b3', '301', '松の間', 'deluxe', 2, 3, 'available', ARRAY['和室12畳', '露天風呂']),
  ('4a4e4447-3ddc-4790-b2f9-b892722503b3', '302', '藤の間', 'suite', 4, 3, 'available', ARRAY['和室20畳', '露天風呂', 'リビング', 'マッサージチェア']),
  ('4a4e4447-3ddc-4790-b2f9-b892722503b3', '303', '蘭の間', 'suite', 6, 3, 'available', ARRAY['和室25畳', '露天風呂', 'リビング', 'ダイニング']),
  ('4a4e4447-3ddc-4790-b2f9-b892722503b3', '401', '椿の間', 'accessible', 2, 4, 'available', ARRAY['バリアフリー', '和洋室', '檜風呂'])
ON CONFLICT (restaurant_id, room_number) DO UPDATE SET
  room_name = EXCLUDED.room_name,
  room_type = EXCLUDED.room_type,
  capacity = EXCLUDED.capacity,
  floor = EXCLUDED.floor,
  amenities = EXCLUDED.amenities;


-- ============================================================
-- 8. SEED DATA: RESERVATIONS
-- ============================================================

-- Clear existing test reservations (for re-seeding)
DELETE FROM public.reservations WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3';

INSERT INTO public.reservations (
  restaurant_id, booking_source, booking_reference, guest_token,
  guest_name, guest_name_kana, party_size, phone, email,
  room_number, room_name, check_in_date, check_out_date,
  plan_name, meal_plan, total_price, status,
  dinner_time, breakfast_time, allergen_ids, checked_in_at
) VALUES

-- CHECKED IN GUESTS
('4a4e4447-3ddc-4790-b2f9-b892722503b3', 'rakuten', 'RTN-2026-001234',
 'chk_test_tanaka_301',
 '田中 太郎', 'タナカ タロウ', 2, '090-1234-5678', 'tanaka.taro@gmail.com',
 '301', '松の間', CURRENT_DATE, CURRENT_DATE + 2,
 '【カップル限定】記念日プラン', '2meals', 88000, 'checked_in',
 '18:30', '08:00', ARRAY[]::UUID[], now() - INTERVAL '3 hours'),

('4a4e4447-3ddc-4790-b2f9-b892722503b3', 'jalan', 'JLN-2026-005678',
 'chk_test_sato_202',
 '佐藤 花子', 'サトウ ハナコ', 4, '080-9876-5432', 'sato.hanako@yahoo.co.jp',
 '202', '菊の間', CURRENT_DATE, CURRENT_DATE + 1,
 'ファミリープラン【お子様歓迎】', '2meals', 120000, 'checked_in',
 '18:00', '07:30', ARRAY[]::UUID[], now() - INTERVAL '2 hours'),

('4a4e4447-3ddc-4790-b2f9-b892722503b3', 'direct', 'DIR-2026-000089',
 'chk_test_yamamoto_101',
 '山本 健一', 'ヤマモト ケンイチ', 1, '070-1111-2222', 'k.yamamoto@company.co.jp',
 '101', '桜の間', CURRENT_DATE, CURRENT_DATE + 1,
 'ビジネスプラン【素泊まり】', 'no_meals', 15000, 'checked_in',
 NULL, NULL, ARRAY[]::UUID[], now() - INTERVAL '5 hours'),

-- CONFIRMED (arriving today)
('4a4e4447-3ddc-4790-b2f9-b892722503b3', 'booking_com', 'BKG-2026-789012',
 'chk_test_smith_302',
 'John Smith', NULL, 2, '+1-415-555-0123', 'john.smith@gmail.com',
 '302', '藤の間', CURRENT_DATE, CURRENT_DATE + 3,
 'Premium Suite Plan', '2meals', 180000, 'confirmed',
 NULL, NULL, ARRAY[]::UUID[], NULL),

('4a4e4447-3ddc-4790-b2f9-b892722503b3', 'expedia', 'EXP-2026-456789',
 'chk_test_kim_201',
 'Kim Min-jun', NULL, 2, '+82-10-1234-5678', 'minjun.kim@naver.com',
 '201', '竹の間', CURRENT_DATE, CURRENT_DATE + 2,
 'Standard Plan with Meals', '2meals', 66000, 'confirmed',
 NULL, NULL, ARRAY[]::UUID[], NULL),

('4a4e4447-3ddc-4790-b2f9-b892722503b3', 'rakuten', 'RTN-2026-001567',
 'chk_test_suzuki_303',
 '鈴木 一郎', 'スズキ イチロウ', 6, '090-3333-4444', 'suzuki.ichiro@docomo.ne.jp',
 '303', '蘭の間', CURRENT_DATE, CURRENT_DATE + 2,
 '【グループ】宴会プラン', '2meals', 240000, 'confirmed',
 NULL, NULL, ARRAY[]::UUID[], NULL),

('4a4e4447-3ddc-4790-b2f9-b892722503b3', 'phone', 'TEL-2026-000045',
 'chk_test_watanabe_401',
 '渡辺 正夫', 'ワタナベ マサオ', 2, '03-1234-5678', NULL,
 '401', '椿の間', CURRENT_DATE, CURRENT_DATE + 2,
 '【シニア割】ゆったりプラン', '2meals', 70000, 'confirmed',
 NULL, NULL, ARRAY[]::UUID[], NULL),

('4a4e4447-3ddc-4790-b2f9-b892722503b3', 'agoda', 'AGD-2026-112233',
 'chk_test_wang_102',
 'Wang Wei', NULL, 3, '+86-138-0000-1234', 'wangwei@qq.com',
 '102', '梅の間', CURRENT_DATE, CURRENT_DATE + 1,
 'Family Room Plan', '2meals', 75000, 'confirmed',
 NULL, NULL, ARRAY[]::UUID[], NULL);


-- ============================================================
-- 9. UPDATE ROOM STATUS FOR CHECKED-IN GUESTS
-- ============================================================

UPDATE public.rooms r
SET status = 'occupied',
    current_reservation_id = res.id
FROM public.reservations res
WHERE r.restaurant_id = res.restaurant_id
  AND r.room_number = res.room_number
  AND res.status = 'checked_in'
  AND r.restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3';


-- ============================================================
-- DONE! Verify with:
-- SELECT * FROM public.rooms;
-- SELECT * FROM public.reservations;
-- ============================================================

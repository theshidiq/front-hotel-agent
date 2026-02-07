-- Migration: Create reservations table
-- Description: Stores booking information from external booking sites or manual entry

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_date ON public.reservations(restaurant_id, check_in_date);
CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_status ON public.reservations(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_guest_token ON public.reservations(guest_token);
CREATE INDEX IF NOT EXISTS idx_reservations_phone ON public.reservations(phone);
CREATE INDEX IF NOT EXISTS idx_reservations_booking_ref ON public.reservations(booking_reference);

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

DROP TRIGGER IF EXISTS reservations_set_token ON public.reservations;
CREATE TRIGGER reservations_set_token
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION set_guest_token();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reservations_updated_at ON public.reservations;
CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

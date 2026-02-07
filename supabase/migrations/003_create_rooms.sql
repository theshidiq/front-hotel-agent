-- Migration: Create rooms table
-- Description: Room inventory with status tracking

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_restaurant_status ON public.rooms(restaurant_id, status);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS rooms_updated_at ON public.rooms;
CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

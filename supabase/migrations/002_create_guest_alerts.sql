-- Migration: Create guest_alerts table
-- Description: Notifications sent to kitchen/room attendants when guests check in with allergens

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guest_alerts_restaurant_status ON public.guest_alerts(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_guest_alerts_reservation ON public.guest_alerts(reservation_id);
CREATE INDEX IF NOT EXISTS idx_guest_alerts_created ON public.guest_alerts(created_at DESC);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS guest_alerts_updated_at ON public.guest_alerts;
CREATE TRIGGER guest_alerts_updated_at
  BEFORE UPDATE ON public.guest_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

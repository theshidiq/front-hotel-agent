-- Migration: Add RLS policies to allow realtime subscriptions for authenticated staff
-- Run this in Supabase SQL Editor to fix the "CLOSED" realtime status

-- Enable RLS on tables (safe to run even if already enabled)
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (staff with JWT) to SELECT reservations
-- (used by realtime subscriptions)
DROP POLICY IF EXISTS "Authenticated staff can read reservations" ON public.reservations;
CREATE POLICY "Authenticated staff can read reservations"
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to SELECT guest_alerts
DROP POLICY IF EXISTS "Authenticated staff can read guest_alerts" ON public.guest_alerts;
CREATE POLICY "Authenticated staff can read guest_alerts"
  ON public.guest_alerts
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to SELECT rooms
DROP POLICY IF EXISTS "Authenticated staff can read rooms" ON public.rooms;
CREATE POLICY "Authenticated staff can read rooms"
  ON public.rooms
  FOR SELECT
  TO authenticated
  USING (true);

-- Verify realtime is still enabled (run if needed)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_alerts;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;

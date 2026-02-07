-- Migration: Enable Realtime
-- Description: Enable realtime for live updates on reservations, guest_alerts, rooms

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;

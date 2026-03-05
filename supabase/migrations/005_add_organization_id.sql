-- ============================================================
-- Migration 005: Add organization_id to all operational tables
-- Strategy: Add nullable FK column → backfill → index
-- restaurant_id is kept intact — drop it in a later migration
-- ============================================================


-- ── Step 1: restaurants ─────────────────────────────────────
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_restaurants_org_id
  ON public.restaurants(organization_id);


-- ── Step 2: reservations ─────────────────────────────────────
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Backfill via restaurants
UPDATE public.reservations r
SET organization_id = rest.organization_id
FROM public.restaurants rest
WHERE r.restaurant_id = rest.id
  AND rest.organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_org_id
  ON public.reservations(organization_id);


-- ── Step 3: rooms ─────────────────────────────────────────────
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.rooms ro
SET organization_id = rest.organization_id
FROM public.restaurants rest
WHERE ro.restaurant_id = rest.id
  AND rest.organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rooms_org_id
  ON public.rooms(organization_id);


-- ── Step 4: guest_alerts ──────────────────────────────────────
ALTER TABLE public.guest_alerts
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.guest_alerts ga
SET organization_id = rest.organization_id
FROM public.restaurants rest
WHERE ga.restaurant_id = rest.id
  AND rest.organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guest_alerts_org_id
  ON public.guest_alerts(organization_id);


-- ── Step 5: period_configuration ─────────────────────────────
ALTER TABLE public.period_configuration
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.period_configuration pc
SET organization_id = rest.organization_id
FROM public.restaurants rest
WHERE pc.restaurant_id = rest.id
  AND rest.organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_period_config_org_id
  ON public.period_configuration(organization_id);


-- ── Verify ───────────────────────────────────────────────────
-- Run these to confirm columns and indexes exist:
-- \d public.restaurants
-- \d public.reservations
-- SELECT COUNT(*) FROM public.reservations WHERE organization_id IS NULL;

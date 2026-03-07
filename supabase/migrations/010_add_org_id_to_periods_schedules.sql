-- ============================================================
-- Migration 010: Add organization_id to periods, schedules,
--               and schedule_metadata tables
-- ============================================================

BEGIN;

-- ── periods ──────────────────────────────────────────────────
ALTER TABLE public.periods
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Backfill from kakomaya org (the only org with real data)
UPDATE public.periods
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE organization_id IS NULL;

ALTER TABLE public.periods
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_periods_org_id
  ON public.periods(organization_id);

-- ── schedule_metadata ─────────────────────────────────────────
ALTER TABLE public.schedule_metadata
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.schedule_metadata
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE organization_id IS NULL;

ALTER TABLE public.schedule_metadata
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_schedule_metadata_org_id
  ON public.schedule_metadata(organization_id);

-- ── schedules ─────────────────────────────────────────────────
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.schedules
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE organization_id IS NULL;

ALTER TABLE public.schedules
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_org_id
  ON public.schedules(organization_id);

COMMIT;

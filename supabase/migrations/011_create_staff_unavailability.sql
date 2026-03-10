-- Migration 011: Create staff_unavailability table
-- Per-staff date-specific unavailability (vacation, PTO, personal leave)

CREATE TABLE IF NOT EXISTS public.staff_unavailability (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  staff_id      UUID NOT NULL,
  date          DATE NOT NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT staff_unavailability_org_staff_date_key
    UNIQUE (organization_id, staff_id, date)
);

CREATE INDEX IF NOT EXISTS idx_staff_unavailability_org_staff
  ON public.staff_unavailability(organization_id, staff_id);

CREATE INDEX IF NOT EXISTS idx_staff_unavailability_org_date
  ON public.staff_unavailability(organization_id, date);

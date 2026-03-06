-- Migration: Change allergen tracking from UUID[] to JSONB with person counts
-- Description: Track how many people in a party have each specific allergen

-- Step 1: Add new JSONB column
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS allergen_details JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.reservations.allergen_details IS 'Array of objects tracking allergens with person counts. Format: [{"allergen_id": "uuid", "person_count": 2}, ...]';

-- Step 2: Migrate existing data from allergen_ids to allergen_details
-- For existing reservations, assume all party members have the allergen (worst case for safety)
UPDATE public.reservations
SET allergen_details = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'allergen_id', allergen_id::text,
      'person_count', party_size
    )
  )
  FROM unnest(allergen_ids) AS allergen_id
)
WHERE array_length(allergen_ids, 1) > 0;

-- Step 3: Keep allergen_ids for backward compatibility (mark as deprecated)
COMMENT ON COLUMN public.reservations.allergen_ids IS 'DEPRECATED: Use allergen_details instead. Kept for backward compatibility.';

-- Step 4: Update guest_alerts table
ALTER TABLE public.guest_alerts
ADD COLUMN IF NOT EXISTS allergen_details JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.guest_alerts.allergen_details IS 'Array of objects tracking allergens with person counts. Format: [{"allergen_id": "uuid", "person_count": 2}, ...]';

-- Migrate guest_alerts data
UPDATE public.guest_alerts
SET allergen_details = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'allergen_id', allergen_id::text,
      'person_count', party_size
    )
  )
  FROM unnest(allergen_ids) AS allergen_id
)
WHERE array_length(allergen_ids, 1) > 0;

COMMENT ON COLUMN public.guest_alerts.allergen_ids IS 'DEPRECATED: Use allergen_details instead. Kept for backward compatibility.';

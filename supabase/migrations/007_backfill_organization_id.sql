-- ============================================================
-- Migration 007: Backfill organization_id across all tables
-- Links all existing data to kakomaya organization
-- Safe, reversible, data-only (no schema changes)
-- ============================================================

-- Target org: kakomaya
-- Target restaurant: the single restaurant all data currently uses

-- ── Step 1: Link restaurant to organization ─────────────────
UPDATE public.restaurants
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

-- ── Step 2: Backfill all operational tables ──────────────────
-- (Only updates rows belonging to the known restaurant_id)

UPDATE public.reservations
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.rooms
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.guest_alerts
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.period_configuration
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.calendar_rules
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.categories
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.config_versions
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.conflict_rules
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.daily_limits
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.daily_limits_backup
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.departments
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.menu_groups
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.menus
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.ml_model_configs
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.monthly_limits
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.ortools_solver_config
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.positions
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.priority_rules
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.product_alternates
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.products
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.roles
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.scan_sessions
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.seasonal_menus
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.staff
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.staff_backup_assignments
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.staff_early_shift_preferences
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.staff_groups
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

UPDATE public.weekly_limits
SET organization_id = '94bab364-a3ee-4a67-be62-3c1a671a9963'
WHERE restaurant_id = '4a4e4447-3ddc-4790-b2f9-b892722503b3'
  AND organization_id IS NULL;

-- ============================================================
-- Migration 009: Drop restaurant_id columns and restaurants table
-- ⚠️  IRREVERSIBLE — only execute after all app code uses organization_id
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- PHASE 1: Drop RLS policies referencing restaurant_id
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view early shift preferences for their restaurant" ON public.staff_early_shift_preferences;
DROP POLICY IF EXISTS "Users can insert early shift preferences for their restaurant" ON public.staff_early_shift_preferences;
DROP POLICY IF EXISTS "Users can update early shift preferences for their restaurant" ON public.staff_early_shift_preferences;
DROP POLICY IF EXISTS "Users can delete early shift preferences for their restaurant" ON public.staff_early_shift_preferences;


-- ══════════════════════════════════════════════════════════════
-- PHASE 2: Drop FK constraints referencing restaurants(id)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.calendar_rules DROP CONSTRAINT IF EXISTS calendar_rules_restaurant_id_fkey;
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_restaurant_id_fkey;
ALTER TABLE public.config_versions DROP CONSTRAINT IF EXISTS config_versions_restaurant_id_fkey;
ALTER TABLE public.config_versions DROP CONSTRAINT IF EXISTS fk_version_restaurant;
ALTER TABLE public.daily_limits DROP CONSTRAINT IF EXISTS daily_limits_restaurant_id_fkey1;
ALTER TABLE public.menu_groups DROP CONSTRAINT IF EXISTS menu_groups_restaurant_id_fkey;
ALTER TABLE public.ml_model_configs DROP CONSTRAINT IF EXISTS ml_model_configs_restaurant_id_fkey;
ALTER TABLE public.monthly_limits DROP CONSTRAINT IF EXISTS monthly_limits_restaurant_id_fkey;
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_restaurant_id_fkey;
ALTER TABLE public.ortools_solver_config DROP CONSTRAINT IF EXISTS ortools_solver_config_restaurant_id_fkey;
ALTER TABLE public.period_configuration DROP CONSTRAINT IF EXISTS period_configuration_restaurant_id_fkey;
ALTER TABLE public.priority_rules DROP CONSTRAINT IF EXISTS priority_rules_restaurant_id_fkey;
ALTER TABLE public.product_alternates DROP CONSTRAINT IF EXISTS product_alternates_restaurant_id_fkey;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_restaurant_id_fkey;
ALTER TABLE public.scan_sessions DROP CONSTRAINT IF EXISTS scan_sessions_restaurant_id_fkey;
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_restaurant_id_fkey;
ALTER TABLE public.staff_backup_assignments DROP CONSTRAINT IF EXISTS fk_backup_restaurant;
ALTER TABLE public.staff_early_shift_preferences DROP CONSTRAINT IF EXISTS staff_early_shift_preferences_restaurant_id_fkey;
ALTER TABLE public.staff_groups DROP CONSTRAINT IF EXISTS staff_groups_restaurant_id_fkey;
ALTER TABLE public.weekly_limits DROP CONSTRAINT IF EXISTS daily_limits_restaurant_id_fkey;
-- Also drop the FK from restaurants → organizations
ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS restaurants_organization_id_fkey;


-- ══════════════════════════════════════════════════════════════
-- PHASE 3: Drop old UNIQUE constraints (restaurant_id-based)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.calendar_rules DROP CONSTRAINT IF EXISTS calendar_rules_restaurant_id_date_key;
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_restaurant_id_type_value_key;
ALTER TABLE public.config_versions DROP CONSTRAINT IF EXISTS config_versions_restaurant_id_version_number_key;
ALTER TABLE public.conflict_rules DROP CONSTRAINT IF EXISTS conflict_rules_restaurant_id_version_id_name_key;
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_restaurant_id_name_key;
ALTER TABLE public.menu_groups DROP CONSTRAINT IF EXISTS menu_groups_restaurant_id_name_key;
ALTER TABLE public.ml_model_configs DROP CONSTRAINT IF EXISTS ml_model_configs_restaurant_id_version_id_model_name_key;
ALTER TABLE public.monthly_limits DROP CONSTRAINT IF EXISTS monthly_limits_restaurant_id_version_id_name_key;
ALTER TABLE public.period_configuration DROP CONSTRAINT IF EXISTS period_configuration_restaurant_id_key;
ALTER TABLE public.positions DROP CONSTRAINT IF EXISTS positions_restaurant_id_department_id_name_key;
ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_restaurant_id_name_key;
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_restaurant_id_room_number_key;
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_restaurant_id_email_key;
ALTER TABLE public.staff_backup_assignments DROP CONSTRAINT IF EXISTS staff_backup_assignments_restaurant_id_version_id_staff_id__key;
ALTER TABLE public.staff_early_shift_preferences DROP CONSTRAINT IF EXISTS staff_early_shift_preferences_restaurant_staff_date_unique;
ALTER TABLE public.weekly_limits DROP CONSTRAINT IF EXISTS daily_limits_restaurant_id_version_id_name_key;
-- staff_groups (partial unique index, dropped as index below)


-- ══════════════════════════════════════════════════════════════
-- PHASE 4: Drop old indexes (restaurant_id-based)
-- ══════════════════════════════════════════════════════════════

-- calendar_rules
DROP INDEX IF EXISTS idx_calendar_rules_restaurant;
DROP INDEX IF EXISTS idx_calendar_rules_restaurant_date;

-- categories
DROP INDEX IF EXISTS idx_categories_restaurant_type;

-- config_versions
DROP INDEX IF EXISTS idx_config_versions_created;
DROP INDEX IF EXISTS idx_config_versions_restaurant_active;

-- conflict_rules
DROP INDEX IF EXISTS idx_conflict_rules_restaurant_version_active;

-- daily_limits
DROP INDEX IF EXISTS idx_daily_limits_restaurant_id;

-- departments
DROP INDEX IF EXISTS idx_departments_restaurant;

-- guest_alerts
DROP INDEX IF EXISTS idx_guest_alerts_restaurant_status;

-- menu_groups
DROP INDEX IF EXISTS idx_menu_groups_restaurant;

-- menus
DROP INDEX IF EXISTS idx_menus_restaurant_id;

-- ml_model_configs
DROP INDEX IF EXISTS idx_ml_model_configs_default;
DROP INDEX IF EXISTS idx_ml_model_configs_restaurant_version;

-- monthly_limits
DROP INDEX IF EXISTS idx_monthly_limits_restaurant_version_active;

-- organizations
DROP INDEX IF EXISTS idx_organizations_restaurant_id;

-- ortools_solver_config
DROP INDEX IF EXISTS idx_ortools_config_restaurant;

-- period_configuration
DROP INDEX IF EXISTS idx_period_configuration_restaurant;

-- positions
DROP INDEX IF EXISTS idx_positions_restaurant;

-- product_alternates
DROP INDEX IF EXISTS idx_product_alternates_restaurant;

-- products
DROP INDEX IF EXISTS idx_products_restaurant_id;

-- reservations
DROP INDEX IF EXISTS idx_reservations_restaurant_date;
DROP INDEX IF EXISTS idx_reservations_restaurant_status;

-- restaurants (table-specific indexes)
DROP INDEX IF EXISTS idx_restaurants_active;
DROP INDEX IF EXISTS idx_restaurants_org_id;
DROP INDEX IF EXISTS idx_restaurants_slug;

-- rooms
DROP INDEX IF EXISTS idx_rooms_restaurant_status;

-- scan_sessions
DROP INDEX IF EXISTS idx_scan_sessions_restaurant_id;

-- seasonal_menus
DROP INDEX IF EXISTS idx_seasonal_menus_restaurant;

-- staff
DROP INDEX IF EXISTS idx_staff_position;
DROP INDEX IF EXISTS idx_staff_restaurant_active;
DROP INDEX IF EXISTS idx_staff_restaurant_email_unique;

-- staff_backup_assignments
DROP INDEX IF EXISTS idx_staff_backup_assignments_active;
DROP INDEX IF EXISTS idx_staff_backup_assignments_restaurant_version;

-- staff_early_shift_preferences
DROP INDEX IF EXISTS idx_early_shift_prefs_restaurant;

-- staff_groups
DROP INDEX IF EXISTS idx_staff_groups_restaurant_version;
DROP INDEX IF EXISTS staff_groups_active_name_unique;

-- weekly_limits
DROP INDEX IF EXISTS idx_daily_limits_restaurant_version_active;
DROP INDEX IF EXISTS idx_weekly_limits_restaurant_id;


-- ══════════════════════════════════════════════════════════════
-- PHASE 5: Drop restaurant_id column from all 29 tables
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.calendar_rules DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.categories DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.config_versions DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.conflict_rules DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.daily_limits DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.daily_limits_backup DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.departments DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.guest_alerts DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.menu_groups DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.menus DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.ml_model_configs DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.monthly_limits DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.ortools_solver_config DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.period_configuration DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.positions DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.priority_rules DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.product_alternates DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.products DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.reservations DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.roles DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.rooms DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.scan_sessions DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.seasonal_menus DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.staff DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.staff_backup_assignments DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.staff_early_shift_preferences DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.staff_groups DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.weekly_limits DROP COLUMN IF EXISTS restaurant_id;


-- ══════════════════════════════════════════════════════════════
-- PHASE 6: Drop the restaurants table
-- ══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.restaurants CASCADE;


-- ══════════════════════════════════════════════════════════════
-- PHASE 7: Make organization_id NOT NULL on all tables
-- (ensures data integrity going forward)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.calendar_rules ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.categories ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.config_versions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.conflict_rules ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.daily_limits ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.departments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.guest_alerts ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.menu_groups ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.menus ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.ml_model_configs ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.monthly_limits ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.ortools_solver_config ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.period_configuration ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.positions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.priority_rules ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.product_alternates ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.roles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.rooms ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.scan_sessions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.seasonal_menus ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.staff ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.staff_backup_assignments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.staff_early_shift_preferences ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.staff_groups ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.weekly_limits ALTER COLUMN organization_id SET NOT NULL;

COMMIT;

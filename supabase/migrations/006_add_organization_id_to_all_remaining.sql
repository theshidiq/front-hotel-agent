-- ============================================================
-- Migration 006: Add organization_id to ALL remaining tables
-- Strategy: Add nullable FK column → backfill from restaurants
-- ============================================================

-- Function to handle adding the column, index, and backfilling for a table
CREATE OR REPLACE FUNCTION add_org_id_to_table(p_table_name text) RETURNS void AS $$
BEGIN
    -- 1. Add column
    EXECUTE format('
        ALTER TABLE public.%I 
        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ', p_table_name);

    -- 2. Backfill if restaurant_id exists
    EXECUTE format('
        UPDATE public.%I t
        SET organization_id = r.organization_id
        FROM public.restaurants r
        WHERE t.restaurant_id = r.id
          AND r.organization_id IS NOT NULL;
    ', p_table_name);

    -- 3. Create index
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_%I_org_id 
        ON public.%I(organization_id);
    ', p_table_name, p_table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply to all 24 remaining tables found in the schema:
SELECT add_org_id_to_table('calendar_rules');
SELECT add_org_id_to_table('categories');
SELECT add_org_id_to_table('config_versions');
SELECT add_org_id_to_table('conflict_rules');
SELECT add_org_id_to_table('daily_limits');
SELECT add_org_id_to_table('daily_limits_backup');
SELECT add_org_id_to_table('departments');
SELECT add_org_id_to_table('menu_groups');
SELECT add_org_id_to_table('menus');
SELECT add_org_id_to_table('ml_model_configs');
SELECT add_org_id_to_table('monthly_limits');
SELECT add_org_id_to_table('ortools_solver_config');
SELECT add_org_id_to_table('positions');
SELECT add_org_id_to_table('priority_rules');
SELECT add_org_id_to_table('product_alternates');
SELECT add_org_id_to_table('products');
SELECT add_org_id_to_table('roles');
SELECT add_org_id_to_table('scan_sessions');
SELECT add_org_id_to_table('seasonal_menus');
SELECT add_org_id_to_table('staff');
SELECT add_org_id_to_table('staff_backup_assignments');
SELECT add_org_id_to_table('staff_early_shift_preferences');
SELECT add_org_id_to_table('staff_groups');
SELECT add_org_id_to_table('weekly_limits');

-- Cleanup function
DROP FUNCTION add_org_id_to_table;

-- Note: The `organizations` table was in the result because it has a restaurant_id column,
-- but its primary key is id which IS the organization_id. No need to alter it.

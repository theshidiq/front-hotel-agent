-- ============================================================
-- Migration 008: Create replacement UNIQUE constraints + indexes
-- using organization_id instead of restaurant_id
-- Additive: new constraints coexist with old ones
-- ============================================================


-- ── UNIQUE Constraints ──────────────────────────────────────

ALTER TABLE public.calendar_rules
  ADD CONSTRAINT calendar_rules_org_id_date_key UNIQUE (organization_id, date);

ALTER TABLE public.categories
  ADD CONSTRAINT categories_org_id_type_value_key UNIQUE (organization_id, type, value);

ALTER TABLE public.config_versions
  ADD CONSTRAINT config_versions_org_id_version_number_key UNIQUE (organization_id, version_number);

ALTER TABLE public.conflict_rules
  ADD CONSTRAINT conflict_rules_org_id_version_id_name_key UNIQUE (organization_id, version_id, name);

ALTER TABLE public.departments
  ADD CONSTRAINT departments_org_id_name_key UNIQUE (organization_id, name);

ALTER TABLE public.menu_groups
  ADD CONSTRAINT menu_groups_org_id_name_key UNIQUE (organization_id, name);

ALTER TABLE public.ml_model_configs
  ADD CONSTRAINT ml_model_configs_org_id_version_id_model_name_key UNIQUE (organization_id, version_id, model_name);

ALTER TABLE public.monthly_limits
  ADD CONSTRAINT monthly_limits_org_id_version_id_name_key UNIQUE (organization_id, version_id, name);

ALTER TABLE public.period_configuration
  ADD CONSTRAINT period_configuration_org_id_key UNIQUE (organization_id);

ALTER TABLE public.positions
  ADD CONSTRAINT positions_org_id_department_id_name_key UNIQUE (organization_id, department_id, name);

ALTER TABLE public.roles
  ADD CONSTRAINT roles_org_id_name_key UNIQUE (organization_id, name);

ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_org_id_room_number_key UNIQUE (organization_id, room_number);

ALTER TABLE public.staff
  ADD CONSTRAINT staff_org_id_email_key UNIQUE (organization_id, email);

ALTER TABLE public.staff_backup_assignments
  ADD CONSTRAINT staff_backup_assignments_org_id_version_staff_group_key UNIQUE (organization_id, version_id, staff_id, group_id);

ALTER TABLE public.staff_early_shift_preferences
  ADD CONSTRAINT staff_early_shift_prefs_org_staff_date_unique UNIQUE (organization_id, staff_id, applies_to_date);

ALTER TABLE public.weekly_limits
  ADD CONSTRAINT weekly_limits_org_id_version_id_name_key UNIQUE (organization_id, version_id, name);


-- ── Composite Indexes (replacing restaurant_id-based indexes) ─

-- calendar_rules
CREATE INDEX IF NOT EXISTS idx_calendar_rules_org_date
  ON public.calendar_rules(organization_id, date);

-- categories
CREATE INDEX IF NOT EXISTS idx_categories_org_type
  ON public.categories(organization_id, type);

-- config_versions
CREATE INDEX IF NOT EXISTS idx_config_versions_org_active
  ON public.config_versions(organization_id, is_active) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_config_versions_org_created
  ON public.config_versions(organization_id, created_at DESC);

-- conflict_rules
CREATE INDEX IF NOT EXISTS idx_conflict_rules_org_version_active
  ON public.conflict_rules(organization_id, version_id, is_active) WHERE (is_active = true);

-- daily_limits
CREATE INDEX IF NOT EXISTS idx_daily_limits_org_id
  ON public.daily_limits(organization_id);

-- departments
CREATE INDEX IF NOT EXISTS idx_departments_org
  ON public.departments(organization_id);

-- guest_alerts
CREATE INDEX IF NOT EXISTS idx_guest_alerts_org_status
  ON public.guest_alerts(organization_id, status);

-- menu_groups
CREATE INDEX IF NOT EXISTS idx_menu_groups_org
  ON public.menu_groups(organization_id, sort_order);

-- menus
CREATE INDEX IF NOT EXISTS idx_menus_org_id
  ON public.menus(organization_id);

-- ml_model_configs
CREATE INDEX IF NOT EXISTS idx_ml_model_configs_org_version
  ON public.ml_model_configs(organization_id, version_id);
CREATE INDEX IF NOT EXISTS idx_ml_model_configs_org_default
  ON public.ml_model_configs(organization_id, is_default) WHERE (is_default = true);

-- monthly_limits
CREATE INDEX IF NOT EXISTS idx_monthly_limits_org_version_active
  ON public.monthly_limits(organization_id, version_id, is_active) WHERE (is_active = true);

-- ortools_solver_config
CREATE INDEX IF NOT EXISTS idx_ortools_config_org
  ON public.ortools_solver_config(organization_id);

-- period_configuration
CREATE INDEX IF NOT EXISTS idx_period_configuration_org
  ON public.period_configuration(organization_id);

-- positions
CREATE INDEX IF NOT EXISTS idx_positions_org
  ON public.positions(organization_id);

-- product_alternates
CREATE INDEX IF NOT EXISTS idx_product_alternates_org
  ON public.product_alternates(organization_id);

-- products
CREATE INDEX IF NOT EXISTS idx_products_org_id
  ON public.products(organization_id);

-- reservations
CREATE INDEX IF NOT EXISTS idx_reservations_org_date
  ON public.reservations(organization_id, check_in_date);
CREATE INDEX IF NOT EXISTS idx_reservations_org_status
  ON public.reservations(organization_id, status);

-- rooms
CREATE INDEX IF NOT EXISTS idx_rooms_org_status
  ON public.rooms(organization_id, status);

-- scan_sessions
CREATE INDEX IF NOT EXISTS idx_scan_sessions_org_id
  ON public.scan_sessions(organization_id);

-- seasonal_menus
CREATE INDEX IF NOT EXISTS idx_seasonal_menus_org
  ON public.seasonal_menus(organization_id);

-- staff
CREATE INDEX IF NOT EXISTS idx_staff_org_email_unique
  ON public.staff(organization_id, email) WHERE (email IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_staff_org_position
  ON public.staff(organization_id, "position");
CREATE INDEX IF NOT EXISTS idx_staff_org_active
  ON public.staff(organization_id, is_active);

-- staff_backup_assignments
CREATE INDEX IF NOT EXISTS idx_staff_backup_assignments_org_active
  ON public.staff_backup_assignments(organization_id, version_id, is_active) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_staff_backup_assignments_org_version
  ON public.staff_backup_assignments(organization_id, version_id);

-- staff_early_shift_preferences
CREATE INDEX IF NOT EXISTS idx_early_shift_prefs_org
  ON public.staff_early_shift_preferences(organization_id);

-- staff_groups
CREATE INDEX IF NOT EXISTS idx_staff_groups_org_version
  ON public.staff_groups(organization_id, version_id);
CREATE INDEX IF NOT EXISTS idx_staff_groups_org_active_name
  ON public.staff_groups(organization_id, version_id, name) WHERE (is_active = true);

-- weekly_limits
CREATE INDEX IF NOT EXISTS idx_weekly_limits_org_version_active
  ON public.weekly_limits(organization_id, version_id, is_active) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_weekly_limits_org_id
  ON public.weekly_limits(organization_id);

# Multi-Tenancy Architecture Migration: Deep Analysis

This document provides a comprehensive overview of our strategy to transition the Sinara platform from a single-restaurant model to a true multi-tenant organizational hierarchy.

## 1. The Core Problem

Initially, the application was designed where every operational action (scheduling, reservations, etc.) was scoped entirely by `restaurant_id`. 

- **Old Model (Flat):** User → [many] Restaurants
- **New Model (Hierarchical):** User → [many] Organizations → [many] Restaurants

The problem with the old model was that if a single hotel (Organization) operated three different restaurants, there was no centralized way to group billing, manage high-level permissions, or view aggregate reporting across all three entities.

By introducing the `organization_id` concept, we create a master tenant above the workspace level.

---

## 2. Why We Didn't Drop `restaurant_id`

When migrating a live database, the most destructive and risky action you can take is dropping a core foreign key column. 

If we had executing `DROP COLUMN restaurant_id` on tables like `reservations` or `rooms`:
1. **Immediate Breakage:** Every single frontend query `.eq("restaurant_id", id)` would crash instantly.
2. **Loss of Granularity:** We would lose the ability to tell *which specific restaurant* within an organization a reservation belonged to.

### The "Dual-Key" Strategy
Our chosen strategy was to **retain `restaurant_id` while adding `organization_id`**.

- `organization_id` acts as the **Tenant ID** (Who owns this data? Who pays for it?)
- `restaurant_id` acts as the **Workspace ID** (Which specific physical location did this occur at?)

By keeping both, we follow the principle of **Additive Migrations**. The database schema only grew, it didn't shrink. Existing application code remains 100% functional because `restaurant_id` still exists exactly where it is expected.

---

## 3. Migration Execution Review (Phase 1)

Phase 1 of our migration was purely additive at the database layer.

1. **Migration 005:** We addressed the 5 core operational tables (`restaurants`, `reservations`, `rooms`, `guest_alerts`, `period_configuration`). We added `organization_id` as a nullable column, backfilled the data by joining through the `restaurants` table, and added an index.
2. **Migration 006:** Since the app actually contains over 40 tables, we executed a dynamic SQL script (`006_add_organization_id_to_all_remaining.sql`) to automatically find every other table containing `restaurant_id` (24 additional tables, such as `schedules` and `menus`), add the `organization_id` column, backfill the data, and index it.

**Status:** Complete. **29 tables** now successfully hold both keys.

---

## 4. Path Forward: Application Migration (Phase 2)

With the database safely prepared, the next phase is entirely within the application layer (`apps/web/...`).

### Step 1: Write Operations (Dual Writes) & The Setup Wizard
Before updating any read queries, we must ensure all new data being created writes *both* IDs.

**The Initial Tenant Creation (The Setup Wizard):**
We have successfully implemented a dedicated onboarding flow (`apps/web/src/routes/setup/+page.svelte`). This Wizard is now the gateway for multi-tenancy. When a new user signs up:
1. It creates the master `organization` record.
2. It creates the default `restaurant` workspace linked to that organization.
3. It creates the `organization_members` record granting the user Ownership.
4. It initializes `period_configuration` using both IDs.

**Next Action for Developers:** When a user creates a *new* data point (e.g., a reservation or a shift), the server/client code must pass both `{ restaurant_id: X, organization_id: Y }`.

### Step 2: Read Operations
Currently, the UI filters data by checking `restaurant_id`. When building organization-level dashboards (e.g., viewing cross-restaurant statistics), you simply query using `.eq('organization_id', orgId)`.

### Step 3: Security & RLS (Row Level Security)
This is the most critical upcoming step.
Currently, Supabase RLS policies authorize access based on matching the `restaurant_id` with the user's allowed restaurants.
- **Next Action:** We must migrate our RLS policies to check the `organization_members` table instead. 
- **Example Security Model:** If `auth.uid()` exists in `organization_members` with a role of "owner" or "admin" for a specific `organization_id`, they have full access to all rows in all 29 tables that carry that `organization_id`.

---

## 5. Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Orphaned Data | Low | The `organization_id` column is an FK cascading up to `organizations(id)`. Deleting an org deletes its workspaces perfectly. |
| Query Performance | Low | We created BTREE indexes on every new `organization_id` column explicitly during the migration. |
| Broken UI | Zero | Because we retained `restaurant_id`, no existing Svelte queries will break. |
| Inconsistent Inserts | Medium | If a developer forgets to include `organization_id` in an `INSERT` statement, that row will have a NULL org_id. **Mitigation:** We should eventually issue a migration to alter the columns from `NULL` to `NOT NULL` once we are confident dual-writes are implemented everywhere. |

---

## Conclusion
The migration strategy prioritized zero downtime and zero broken code. We established the multi-tenant architecture at the database level by distributing the `organization_id` token across all 29 operational tables. The application is now primed to build true organization-wide features without breaking the existing single-restaurant views.

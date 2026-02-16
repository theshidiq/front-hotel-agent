# Role-Based Access Control (RBAC) Design

## Current System Analysis

### How It Works Today
```
┌─────────────────────────────────────────────────────┐
│                  CURRENT AUTH MODEL                  │
│                                                     │
│   is_active staff in DB  ──►  Can do EVERYTHING     │
│   not staff / not logged in ──►  View only (GET)    │
│                                                     │
│   Binary: you're staff or you're not                │
│   No granularity, no role distinction               │
└─────────────────────────────────────────────────────┘
```

### Current Permission Mapping
| Action | Staff | Non-Staff |
|--------|-------|-----------|
| View products | Yes | Yes |
| View allergen table | Yes | Yes |
| Add/Edit/Delete product | Yes | No |
| Scan product (OCR) | Yes | No |
| Add/Edit/Delete menu | Yes | No |
| Configure menu structure | Yes | No |
| Manage allergens | Yes | No |
| Manage staff | Yes | No |
| Print/Export reports | Yes | Yes |

### Files Involved
| Layer | File | What It Does |
|-------|------|-------------|
| Frontend auth state | `apps/web/src/lib/auth.svelte.ts` | Stores `isStaff` boolean |
| Frontend gate | `apps/web/src/routes/+page.svelte` | `{#if isStaff}` guards UI sections |
| Backend guard | `apps/api/src/auth/auth.guard.ts` | `StaffAuthGuard` validates JWT + staff table |
| Backend decorator | `apps/api/src/auth/staff.decorator.ts` | `@RequireStaff()` on POST/PUT/DELETE |
| Staff service | `apps/api/src/staffs/staffs.service.ts` | CRUD for staff table |
| DB table | `staff` | id, name, email, position, is_active, periods |

---

## Proposed System: Customizable Role Permissions

### Core Concept
Admin can **create roles** and **toggle permissions ON/OFF** for each role.
Permissions are stored in a `role_permissions` DB table, not hardcoded.

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEW AUTH MODEL                                │
│                                                                 │
│  Admin defines ROLES  ──►  Each role has PERMISSIONS (toggles)  │
│  Admin assigns ROLE to each staff member                        │
│                                                                 │
│  System checks: does this user's role have THIS permission?     │
│                                                                 │
│  Admin can change any role's permissions at any time             │
│  Changes take effect immediately (no re-login needed)           │
└─────────────────────────────────────────────────────────────────┘
```

### How It Works

```
                  ┌─────────────┐
                  │    ADMIN     │  Hardcoded: always has ALL permissions
                  │  (built-in)  │  Cannot be deleted or modified
                  └──────┬──────┘
                         │ manages
              ┌──────────┴──────────┐
              ▼                     ▼
     ┌────────────────┐    ┌───────────────┐
     │  Custom Roles   │    │  Staff Users   │
     │  (admin creates │    │  (assigned to  │
     │   & configures) │    │   a role)      │
     └────────────────┘    └───────────────┘

Example setup by admin:

  Role: "Chef"
  ├── products.view        ✅
  ├── products.create      ─
  ├── products.edit        ─
  ├── products.delete      ─
  ├── products.scan        ─
  ├── menus.view           ✅
  ├── menus.create         ✅
  ├── menus.edit           ✅
  ├── menus.delete         ✅
  ├── menus.structure      ✅
  ├── allergens.view       ✅
  ├── allergens.manage     ─
  ├── reports.print        ✅
  ├── reports.export       ✅
  ├── settings.categories  ─
  ├── settings.allergens   ─
  └── staff.manage         ─

  Role: "Inventory"
  ├── products.view        ✅
  ├── products.create      ✅
  ├── products.edit        ✅
  ├── products.delete      ✅
  ├── products.scan        ✅
  ├── menus.view           ✅
  ├── menus.create         ─
  ├── ...etc
```

---

## Permission Keys

These are the atomic permission keys the system checks. Admin toggles each ON/OFF per role.

### Permission List

| Key | Description | UI Section |
|-----|-------------|------------|
| `products.view` | View product list & details | Products tab |
| `products.create` | Add products manually | Add Product form |
| `products.edit` | Edit existing products | Edit button on product card |
| `products.delete` | Delete products | Delete button on product card |
| `products.scan` | Scan product labels (OCR) | Scan Image tab |
| `menus.view` | View menu tab & allergen table | Menu tab |
| `menus.create` | Create menu items | Menu Structure sidebar |
| `menus.edit` | Edit menu items | Menu Structure sidebar |
| `menus.delete` | Delete menu items | Menu Structure sidebar |
| `menus.structure` | Configure menu structure (seasons, groups, courses) | Configure Menu Structure |
| `allergens.view` | View allergen table | Allergen Report section |
| `allergens.manage` | Add/delete allergen definitions | Manage Allergens modal |
| `reports.print` | Print allergen PDF | Print PDF button |
| `reports.export` | Export allergen XLSX | Export .xlsx button |
| `categories.manage` | Manage product categories | Manage Categories modal |
| `staff.manage` | View/create/edit/deactivate staff & assign roles | Staff Management |

**Total: 16 permissions**

---

## Database Design

### New Tables

```sql
-- Roles table (admin creates custom roles)
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  name        VARCHAR(50) NOT NULL,          -- e.g. "Chef", "Inventory", "Viewer"
  description VARCHAR(200),                  -- optional description
  is_default  BOOLEAN DEFAULT false,         -- mark one role as default for new staff
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, name)
);

-- Role permissions (which permissions each role has)
CREATE TABLE role_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission  VARCHAR(50) NOT NULL,          -- e.g. 'products.create'
  UNIQUE(role_id, permission)
);

-- Add role_id to existing staff table
ALTER TABLE staff ADD COLUMN role_id UUID REFERENCES roles(id);
```

### Schema Diagram

```
staff                          roles                    role_permissions
├── id (PK)                    ├── id (PK)              ├── id (PK)
├── restaurant_id              ├── restaurant_id         ├── role_id (FK → roles)
├── name                       ├── name                  └── permission (varchar)
├── email                      ├── description
├── position                   ├── is_default
├── role_id (FK → roles) NEW   └── created_at
├── is_active
├── start_period
├── end_period
└── created_at

Relationships:
  staff.role_id ──► roles.id        (many staff → one role)
  role_permissions.role_id ──► roles.id  (many permissions → one role)
```

### Seed Data (Default Roles)

```sql
-- Create default roles for the restaurant
INSERT INTO roles (restaurant_id, name, description, is_default) VALUES
  ('<restaurant_id>', 'Chef',      'Menu management, view products',           false),
  ('<restaurant_id>', 'Inventory', 'Product management, scanning, categories', false),
  ('<restaurant_id>', 'Viewer',    'Read-only access to all data',             true);

-- Chef permissions
INSERT INTO role_permissions (role_id, permission) VALUES
  ('<chef_role_id>', 'products.view'),
  ('<chef_role_id>', 'menus.view'),
  ('<chef_role_id>', 'menus.create'),
  ('<chef_role_id>', 'menus.edit'),
  ('<chef_role_id>', 'menus.delete'),
  ('<chef_role_id>', 'menus.structure'),
  ('<chef_role_id>', 'allergens.view'),
  ('<chef_role_id>', 'reports.print'),
  ('<chef_role_id>', 'reports.export');

-- Inventory permissions
INSERT INTO role_permissions (role_id, permission) VALUES
  ('<inventory_role_id>', 'products.view'),
  ('<inventory_role_id>', 'products.create'),
  ('<inventory_role_id>', 'products.edit'),
  ('<inventory_role_id>', 'products.delete'),
  ('<inventory_role_id>', 'products.scan'),
  ('<inventory_role_id>', 'menus.view'),
  ('<inventory_role_id>', 'allergens.view'),
  ('<inventory_role_id>', 'reports.print'),
  ('<inventory_role_id>', 'reports.export'),
  ('<inventory_role_id>', 'categories.manage');

-- Viewer permissions
INSERT INTO role_permissions (role_id, permission) VALUES
  ('<viewer_role_id>', 'products.view'),
  ('<viewer_role_id>', 'menus.view'),
  ('<viewer_role_id>', 'allergens.view'),
  ('<viewer_role_id>', 'reports.print');
```

---

## Admin is Special

The `admin` role is **NOT** stored in the `roles` table.
Instead, it's a flag on the `staff` table:

```sql
ALTER TABLE staff ADD COLUMN is_admin BOOLEAN DEFAULT false;
```

**Why:**
- Admin always bypasses all permission checks (has everything)
- Admin cannot accidentally delete their own admin access
- Admin can still be assigned a role_id for display, but it doesn't matter
- Simpler than creating an "admin" role and syncing 16 permissions

### Who Sets the First Admin?

The **first admin is set automatically** when RBAC is deployed:

```sql
-- Migration: set existing app owner as first admin
UPDATE staff SET is_admin = true WHERE email = 'kamal@example.com';
```

After that, any admin can promote other staff to admin from the Admin Dashboard.

### Can There Be Multiple Admins?

**Yes.** Any admin can:
- **Promote** another staff member to admin (toggle `is_admin = true`)
- **Demote** an admin back to a regular role (toggle `is_admin = false`)
- **But**: an admin cannot demote themselves (safety rule — prevents lockout)
- **And**: there must always be at least 1 admin (backend enforces this)

```
Admin promotes staff to admin:
  Admin Dashboard → Staff section → click staff → toggle "Admin" switch ON
  → That staff now has full access regardless of their role

Admin demotes another admin:
  Admin Dashboard → Staff section → click admin staff → toggle "Admin" switch OFF
  → That staff falls back to their assigned role's permissions
  → Cannot do this to yourself (button disabled with tooltip)
```

### Permission Check Logic

```
Is user admin?  ──YES──► ALLOW (always)
      │
      NO
      │
      ▼
Does user's role have this permission?
      │
     YES ──► ALLOW
      │
      NO ──► DENY (403 Forbidden)
```

---

## Default Permission Matrix (What Admin Sets Up Initially)

```
Permission              Admin    Chef    Inventory    Viewer
                       (auto)  (custom)  (custom)   (custom)
────────────────────────────────────────────────────────────
products.view            ✅       ✅        ✅         ✅
products.create          ✅       ─         ✅         ─
products.edit            ✅       ─         ✅         ─
products.delete          ✅       ─         ✅         ─
products.scan            ✅       ─         ✅         ─

menus.view               ✅       ✅        ✅         ✅
menus.create             ✅       ✅        ─          ─
menus.edit               ✅       ✅        ─          ─
menus.delete             ✅       ✅        ─          ─
menus.structure          ✅       ✅        ─          ─

allergens.view           ✅       ✅        ✅         ✅
allergens.manage         ✅       ─         ─          ─

reports.print            ✅       ✅        ✅         ✅
reports.export           ✅       ✅        ✅         ─

categories.manage        ✅       ─         ✅         ─

staff.manage             ✅       ─         ─          ─
────────────────────────────────────────────────────────────
 Total                   16      9         11         4

 Admin can change ANY ✅/─ for Chef, Inventory, Viewer at any time!
 Admin can also CREATE NEW ROLES (e.g. "Sous Chef" with different permissions)
```

---

## Admin Dashboard (Accessed from Sidebar)

### How to Access

The admin dashboard is accessed from the **user profile area** at the bottom of the sidebar.
Currently the sidebar shows: `[Avatar] Name / Position [Logout]`

**New behavior:**
- The user name/avatar area becomes **clickable**
- For **admins**: clicking opens the **Admin Dashboard** page (`/admin`)
- For **non-admin staff**: clicking opens an **Account page** (view-only profile, see their role/permissions)
- A small **gear/settings icon** or **badge** appears next to the name for admins

```
┌─────────────────────────────────────┐
│  Sidebar (bottom)                   │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [カ] カマル          [→]    │    │
│  │      Admin ⚙️               │    │  ← Clickable → opens /admin
│  └─────────────────────────────┘    │
│                                     │
│  Non-admin staff sees:              │
│  ┌─────────────────────────────┐    │
│  │ [タ] Tanaka          [→]    │    │
│  │      Chef                   │    │  ← Clickable → opens /account
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Admin Dashboard Layout (`/admin` route)

Full-page admin dashboard with sections:

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back to App                                    Admin Dashboard│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  📋 STAFF MANAGEMENT                                     │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────────────────────────┐    │    │
│  │  │  カマル                                          │    │    │
│  │  │  kamal@email.com            ⭐ Admin    [...]   │    │    │
│  │  ├──────────────────────────────────────────────────┤    │    │
│  │  │  Tanaka                                          │    │    │
│  │  │  tanaka@email.com     Role: [Chef ▼]    [...]   │    │    │
│  │  ├──────────────────────────────────────────────────┤    │    │
│  │  │  Yamada                                          │    │    │
│  │  │  yamada@email.com     Role: [Inventory ▼] [...]  │    │    │
│  │  ├──────────────────────────────────────────────────┤    │    │
│  │  │  Suzuki                                          │    │    │
│  │  │  suzuki@email.com     Role: [Viewer ▼]  [...]   │    │    │
│  │  └──────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  │  [+ Add Staff]                                           │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  🔑 ROLE MANAGEMENT                              [+ New] │    │
│  │                                                          │    │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐              │    │
│  │  │  Chef    │  │ Inventory │  │  Viewer  │              │    │
│  │  │ 9 perms  │  │ 11 perms  │  │ 4 perms  │              │    │
│  │  └──────────┘  └───────────┘  └──────────┘              │    │
│  │                                                          │    │
│  │  ┌─────────────────────────────────────────────────┐     │    │
│  │  │  Editing: Chef                                  │     │    │
│  │  │                                                 │     │    │
│  │  │  Products                                       │     │    │
│  │  │    [✅] View   [ ] Create  [ ] Edit             │     │    │
│  │  │    [ ] Delete  [ ] Scan                         │     │    │
│  │  │                                                 │     │    │
│  │  │  Menus                                          │     │    │
│  │  │    [✅] View   [✅] Create  [✅] Edit           │     │    │
│  │  │    [✅] Delete [✅] Structure                    │     │    │
│  │  │                                                 │     │    │
│  │  │  Allergens                                      │     │    │
│  │  │    [✅] View   [ ] Manage                       │     │    │
│  │  │                                                 │     │    │
│  │  │  Reports                                        │     │    │
│  │  │    [✅] Print  [✅] Export                       │     │    │
│  │  │                                                 │     │    │
│  │  │  Settings                                       │     │    │
│  │  │    [ ] Categories  [ ] Staff                    │     │    │
│  │  │                                                 │     │    │
│  │  │  [Save Changes]                                 │     │    │
│  │  └─────────────────────────────────────────────────┘     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Staff Detail Modal (from [...] button)

```
┌─────────────────────────────────────┐
│  Staff: Tanaka                      │
│                                     │
│  Name:      Tanaka                  │
│  Email:     tanaka@email.com        │
│  Position:  Chef                    │
│  Role:      [Chef ▼]               │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  ⭐ Admin Access            │    │
│  │  [  OFF  /  ON  ]          │    │  ← Toggle to make admin
│  │  Grants full access to      │    │
│  │  all features               │    │
│  └─────────────────────────────┘    │
│                                     │
│  Active Period:                     │
│  Start: 2025-01-01                  │
│  End:   2025-12-31                  │
│                                     │
│  [Deactivate Staff]    [Save]       │
└─────────────────────────────────────┘
```

### Account Page (`/account` — for non-admin staff)

Simple read-only page showing their own profile:

```
┌──────────────────────────────────────────┐
│  ← Back to App                 My Account│
├──────────────────────────────────────────┤
│                                          │
│  [カ]  カマル                            │
│        kamal@email.com                   │
│                                          │
│  Role:        Chef                       │
│  Position:    シェフ                      │
│                                          │
│  My Permissions:                         │
│  ✅ View products                        │
│  ✅ View menus                           │
│  ✅ Create menus                         │
│  ✅ Edit menus                           │
│  ✅ Delete menus                         │
│  ✅ Configure menu structure             │
│  ✅ View allergens                       │
│  ✅ Print reports                        │
│  ✅ Export reports                        │
│                                          │
│  [Logout]                                │
└──────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Database + Backend

#### 1. Database migration
```sql
-- Create roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(200),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, name)
);

-- Create role_permissions table
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission VARCHAR(50) NOT NULL,
  UNIQUE(role_id, permission)
);

-- Add columns to staff table
ALTER TABLE staff ADD COLUMN role_id UUID REFERENCES roles(id);
ALTER TABLE staff ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- Seed default roles (run after migration)
-- (see seed data above)
```

#### 2. New backend module: `roles`
**New files:**
- `apps/api/src/roles/roles.module.ts`
- `apps/api/src/roles/roles.service.ts`
- `apps/api/src/roles/roles.controller.ts`
- `apps/api/src/roles/dto/`

**Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/roles` | List all roles with permissions | Any staff |
| POST | `/roles` | Create a new role | Admin only |
| PUT | `/roles/:id` | Update role name/description | Admin only |
| DELETE | `/roles/:id` | Delete role (fails if staff assigned) | Admin only |
| PUT | `/roles/:id/permissions` | Set permissions for a role (full replace) | Admin only |

#### 3. Update auth guard
**File:** `apps/api/src/auth/auth.guard.ts`
- Query staff with `is_admin` and `role_id`
- If staff has role_id, also fetch `role_permissions` for that role
- Attach to `request.user`: `{ ...existing, isAdmin, permissions: string[] }`

#### 4. New decorator: `@RequirePermission(...permissions)`
**File:** `apps/api/src/auth/permission.decorator.ts` (new)
```typescript
// Usage:
@Post()
@RequirePermission('products.create')
async createProduct(@Body() dto) { ... }

// Logic:
// 1. If user.isAdmin → always allow
// 2. Else check if user.permissions includes required permission
// 3. Deny with 403 if not
```

#### 5. Update all controllers
Replace `@RequireStaff()` with `@RequirePermission()`:

| Controller | Endpoint | Permission |
|-----------|----------|------------|
| Products | POST | `products.create` |
| Products | PUT | `products.edit` |
| Products | DELETE | `products.delete` |
| Scan | POST, POST /extract | `products.scan` |
| Menus | POST | `menus.create` |
| Menus | PUT | `menus.edit` |
| Menus | DELETE | `menus.delete` |
| Allergens | POST, DELETE | `allergens.manage` |
| Categories | POST, PUT, DELETE | `categories.manage` |
| Menu Groups | POST, PUT, DELETE | `menus.structure` |
| Seasonal Menus | POST, PUT, DELETE | `menus.structure` |
| Product Alternates | POST, DELETE | `products.edit` |
| Staffs | POST, PATCH | `staff.manage` |
| Roles | POST, PUT, DELETE | `staff.manage` |

#### 6. Update staffs module
- Add `role_id` and `is_admin` to all queries
- Return role info with staff data
- New endpoints:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| PATCH | `/staffs/:id/role` | Assign role to staff | Admin only |
| PATCH | `/staffs/:id/admin` | Toggle admin flag `{ is_admin: true/false }` | Admin only |

**Admin toggle safety rules (enforced in service):**
- Cannot toggle your own `is_admin` off
- Cannot set the last admin's `is_admin` to false
- Returns 400 with message if either rule violated

### Phase 2: Frontend

#### 7. Update auth state
**File:** `apps/web/src/lib/auth.svelte.ts`
```typescript
// Before:
isStaff: boolean

// After:
isAdmin: boolean
permissions: string[]    // e.g. ['products.view', 'products.create', ...]
role: { id: string, name: string } | null

// Helper function:
export function can(permission: string): boolean {
  return authState.isAdmin || authState.permissions.includes(permission);
}
```

#### 8. Update API client
**File:** `apps/web/src/lib/api.ts`
- Add role CRUD functions: `getRoles()`, `createRole()`, `updateRole()`, `deleteRole()`
- Add `updateRolePermissions(roleId, permissions[])`
- Add `updateStaffRole(staffId, roleId)`

#### 9. Update main page permissions
**File:** `apps/web/src/routes/+page.svelte`

Replace all `{#if isStaff}` with granular `can()` checks:
```svelte
<!-- Before -->
{#if isStaff}
  <AddProductSection />
{/if}

<!-- After -->
{#if can('products.create') || can('products.scan')}
  <AddProductSection />
{/if}

{#if can('products.edit')}
  <EditButton />
{/if}

{#if can('menus.structure')}
  <ConfigureMenuStructureButton />
{/if}

{#if can('staff.manage')}
  <StaffManagementSection />
{/if}
```

#### 10. Admin Dashboard page
**New file:** `apps/web/src/routes/admin/+page.svelte`
- Full-page admin dashboard (see wireframe in "Admin Dashboard" section above)
- Staff Management section: list staff, assign roles, toggle admin, add/deactivate staff
- Role Management section: CRUD roles, toggle permissions per role
- Protected: redirects non-admin users to `/`

#### 11. Account page
**New file:** `apps/web/src/routes/account/+page.svelte`
- Read-only profile page for any authenticated staff
- Shows name, email, role, position, and list of their permissions
- Accessible from sidebar profile click (non-admin staff)

#### 12. Update Sidebar component
**File:** `apps/web/src/lib/components/Sidebar.svelte`
- Make user profile area clickable
- Admin → navigates to `/admin`
- Non-admin staff → navigates to `/account`
- Show role name instead of position (fallback to position if no role)
- Show "Admin" badge for admin users

---

## User Flows

### Admin: Creating a New Role
```
Admin opens Role Management
  → Clicks "+ New Role"
  → Enters name: "Sous Chef"
  → Enters description: "Can view & create menus but not delete"
  → Toggles permissions:
      ✅ products.view
      ✅ menus.view
      ✅ menus.create
      ✅ menus.edit
      ✅ allergens.view
      ✅ reports.print
  → Clicks "Save"
  → New role appears in role list
```

### Admin: Changing a Role's Permissions
```
Admin opens Role Management
  → Clicks "Chef" role card
  → Permission toggles appear
  → Enables "products.scan" (chef can now scan too)
  → Clicks "Save Changes"
  → All staff with "Chef" role immediately gain scan access
```

### Admin: Assigning a Role to Staff
```
Admin opens Role Management → Staff Assignments section
  → Sees staff list with current roles
  → Changes "Suzuki-san" from "Viewer" to "Inventory"
  → Dropdown saves immediately
  → Suzuki-san now has product management access
```

### Admin: Promoting Another Staff to Admin
```
Admin opens Admin Dashboard (click profile in sidebar)
  → Staff Management section
  → Clicks [...] on "Tanaka" row
  → Staff detail modal opens
  → Toggles "Admin Access" switch ON
  → Clicks "Save"
  → Tanaka is now an admin with full access
  → Tanaka's sidebar will show "Admin" badge
```

### Admin: Demoting an Admin
```
Admin opens Admin Dashboard
  → Clicks [...] on another admin's row
  → Toggles "Admin Access" switch OFF
  → That person falls back to their role permissions
  → Cannot toggle OFF your own admin (button disabled)
  → Cannot demote if they're the last admin (error shown)
```

### Staff: Opening Account Page
```
Non-admin staff clicks their name in sidebar bottom
  → Navigates to /account
  → Sees their profile (name, email, role)
  → Sees list of their active permissions
  → Read-only (no editing)
```

### Staff: Logging In
```
Staff opens login page
  → Sees their name card (with role badge: "Chef")
  → Clicks card → enters Google email → OAuth
  → Redirected to main page
  → UI shows only features allowed by their role
  → Buttons/sections they can't access are hidden
```

---

## Files to Create/Modify

### New Files
| # | File | Purpose |
|---|------|---------|
| 1 | `apps/api/src/roles/roles.module.ts` | Roles NestJS module |
| 2 | `apps/api/src/roles/roles.service.ts` | Role CRUD + permission management |
| 3 | `apps/api/src/roles/roles.controller.ts` | Role API endpoints |
| 4 | `apps/api/src/roles/dto/create-role.dto.ts` | Validation DTOs |
| 5 | `apps/api/src/roles/dto/update-role-permissions.dto.ts` | Permission update DTO |
| 6 | `apps/api/src/auth/permission.decorator.ts` | `@RequirePermission()` decorator |
| 7 | `apps/api/src/auth/permission.guard.ts` | Permission checking guard |
| 8 | `apps/web/src/routes/admin/+page.svelte` | Admin Dashboard page (staff + role management) |
| 9 | `apps/web/src/routes/account/+page.svelte` | Account page (view own profile + permissions) |

### Modified Files
| # | File | Change |
|---|------|--------|
| 10 | SQL migration | Create `roles` + `role_permissions` tables, alter `staff` |
| 11 | `apps/api/src/auth/auth.guard.ts` | Load permissions from role into request.user |
| 12 | `apps/api/src/app.module.ts` | Register RolesModule |
| 13 | `apps/api/src/staffs/staffs.service.ts` | Add role_id, is_admin to queries + admin toggle |
| 14 | `apps/api/src/staffs/staffs.controller.ts` | Add role assignment + admin toggle endpoints |
| 15 | `apps/api/src/products/products.controller.ts` | `@RequirePermission('products.create')` etc. |
| 16 | `apps/api/src/menus/menus.controller.ts` | `@RequirePermission('menus.create')` etc. |
| 17 | `apps/api/src/allergens/allergens.controller.ts` | `@RequirePermission('allergens.manage')` |
| 18 | `apps/api/src/scan/scan.controller.ts` | `@RequirePermission('products.scan')` |
| 19 | `apps/api/src/categories/categories.controller.ts` | `@RequirePermission('categories.manage')` |
| 20 | `apps/api/src/menu-groups/menu-groups.controller.ts` | `@RequirePermission('menus.structure')` |
| 21 | `apps/api/src/seasonal-menus/seasonal-menus.controller.ts` | `@RequirePermission('menus.structure')` |
| 22 | `apps/api/src/product-alternates/product-alternates.controller.ts` | `@RequirePermission('products.edit')` |
| 23 | `apps/web/src/lib/auth.svelte.ts` | Store isAdmin, permissions[], role; add `can()` helper |
| 24 | `apps/web/src/lib/api.ts` | Add role CRUD + permission + admin toggle API functions |
| 25 | `apps/web/src/lib/components/Sidebar.svelte` | Clickable profile area → `/admin` or `/account` |
| 26 | `apps/web/src/routes/+page.svelte` | Replace `{#if isStaff}` with `can()` checks |
| 27 | `apps/web/src/routes/login/+page.svelte` | Show role badge on staff cards |

**Total: 9 new files, 18 modified files**

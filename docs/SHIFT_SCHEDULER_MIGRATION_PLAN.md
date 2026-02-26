# Clone & Build: Shift Scheduler → SvelteKit + NestJS Migration Plan

## Overview

**Goal:** Add shift scheduling functionality to the existing `front-hotel-agent` monorepo while keeping the original `shift-schedule-manager-ortools` React app intact.

**Approach:** Clone logic, build fresh SvelteKit/NestJS version (no code copy-paste rewrite)

**Database:** Both projects share the same Supabase project (`ymdyejrljmvajqjbejvh`) - **NO NEW TABLES NEEDED!**

---

## Existing Database Schema (ALREADY IN SUPABASE)

The shift scheduler tables already exist in the shared Supabase project:

| Table | Rows | Purpose |
|-------|------|---------|
| `staff` | 32 | Staff members with 社員/派遣/パート status |
| `staff_groups` | 8 | Staff grouping for constraints |
| `staff_backup_assignments` | 1 | Backup staff assignments |
| `staff_early_shift_preferences` | 32 | Early shift (△) preferences |
| `periods` | 19 | Schedule periods (date ranges) |
| `schedules` | 18 | Schedule data (JSONB) |
| `schedule_metadata` | 2 | Schedule names and settings |
| `schedule_staff_assignments` | 17 | Staff-to-schedule links |
| `calendar_rules` | 16 | must_work / must_day_off rules |
| `priority_rules` | 3 | Day-of-week preferences |
| `daily_limits` | 1 | Daily min/max constraints |
| `weekly_limits` | 1 | Weekly constraints |
| `monthly_limits` | 2 | Monthly min/max constraints |
| `ortools_solver_config` | 1 | OR-Tools penalty weights |
| `config_versions` | 1 | Configuration versioning |
| `config_changes` | 425 | Change history/audit log |
| `period_configuration` | 1 | Period generation settings |
| `restaurants` | 1 | Restaurant settings (shared) |

**Key insight:** The `restaurants` table is shared between hotel-agent (allergens/menus) and shift-scheduler. Both use the same `restaurant_id`.

---

## Source Analysis

### Original React App Structure
```
shift-schedule-manager-ortools/
├── src/components/
│   ├── ShiftScheduleEditorPhase3.jsx    # Main app (2000+ lines)
│   ├── schedule/
│   │   ├── ScheduleTable.jsx            # Interactive table
│   │   ├── NavigationToolbar.jsx        # Period navigation
│   │   ├── StaffEditModal.jsx           # Staff CRUD modal
│   │   └── StatisticsDashboard.jsx      # Analytics
│   ├── settings/
│   │   ├── SettingsModal.jsx            # Settings container
│   │   └── tabs/
│   │       ├── ConstraintConfiguratorTab.jsx
│   │       ├── LimitsTab.jsx
│   │       ├── PriorityRulesTab.jsx
│   │       ├── StaffGroupsTab.jsx
│   │       └── PeriodsTab.jsx
│   ├── calendar/
│   │   └── WorkingCalendarPage.jsx      # Calendar rules
│   └── ui/                              # shadcn/ui components
├── go-server/                           # WebSocket server
│   ├── main.go                          # Entry point
│   ├── state/                           # State management
│   ├── conflict/                        # Conflict resolution
│   └── supabase/                        # DB client
└── python-ortools-service/
    ├── scheduler.py                     # CP-SAT optimizer (1800+ lines)
    ├── Dockerfile
    └── requirements.txt
```

### Target Hotel-Agent Structure
```
front-hotel-agent/
├── apps/
│   ├── web/                             # SvelteKit
│   │   └── src/routes/shifts/           # NEW
│   └── api/                             # NestJS
│       └── src/shifts/                  # NEW
└── services/
    └── ortools/                         # NEW (copy from original)
```

---

## Phase 1: Database Schema (Day 1) - ✅ ALREADY DONE

### 1.1 Tables Already Exist

**NO NEW TABLES NEEDED!** All shift scheduler tables already exist in Supabase project `ymdyejrljmvajqjbejvh`.

The React app and SvelteKit app will share the same database tables:

```
┌─────────────────────────────────────────────────────────────┐
│                   SHARED SUPABASE PROJECT                   │
│                   (ymdyejrljmvajqjbejvh)                    │
├─────────────────────────────────────────────────────────────┤
│  Hotel Agent Tables (allergens, menus, reservations)        │
│  ├── allergens (43 rows)                                   │
│  ├── products (29 rows)                                    │
│  ├── menus (9 rows)                                        │
│  ├── reservations (153 rows)                               │
│  └── rooms (8 rows)                                        │
├─────────────────────────────────────────────────────────────┤
│  Shift Scheduler Tables (already exist!)                   │
│  ├── staff (32 rows)                                       │
│  ├── staff_groups (8 rows)                                 │
│  ├── periods (19 rows)                                     │
│  ├── schedules (18 rows) - JSONB schedule data             │
│  ├── calendar_rules (16 rows)                              │
│  ├── daily_limits, monthly_limits, weekly_limits           │
│  ├── priority_rules (3 rows)                               │
│  └── ortools_solver_config (1 row)                         │
├─────────────────────────────────────────────────────────────┤
│  Shared Tables                                              │
│  └── restaurants (1 row) - same restaurant_id for both     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Key Existing Table Structures

**`staff` table** (used for scheduling):
- `id`, `restaurant_id`, `name`, `position`, `department`
- `status` (社員/派遣/パート)
- `type` (regular/part-time/temporary)
- `staff_order` (display order)
- `start_period`, `end_period` (JSONB employment dates)
- `role_id` (linked to roles table for RBAC)

**`schedules` table**:
- `schedule_data` (JSONB) - contains `{ staffId: { date: symbol } }`
- `metadata_id` → links to `schedule_metadata`

**`ortools_solver_config` table**:
- `penalty_weights` (JSONB) - staffGroup, fiveDayRest, monthlyLimit, etc.
- `hard_constraints` (JSONB) - which constraints are HARD vs SOFT
- `solver_settings` (JSONB) - timeout, numWorkers

### 1.3 What to Verify

Before proceeding, verify NestJS can access these tables:

```typescript
// Test query in NestJS
const staff = await supabase
  .from('staff')
  .select('*')
  .eq('restaurant_id', restaurantId);
```

---

## Phase 2: OR-Tools Service (Day 1-2)

### 2.1 Copy OR-Tools Service

```bash
# From project root
mkdir -p services/ortools
cp -r ../shift-schedule-manager-ortools/python-ortools-service/* services/ortools/
```

### 2.2 Files to Copy
- `scheduler.py` - Main optimizer (keep as-is)
- `requirements.txt` - Dependencies
- `Dockerfile` - Container config

### 2.3 Create Docker Compose Entry

Add to `docker-compose.yml`:

```yaml
services:
  ortools:
    build: ./services/ortools
    ports:
      - "5050:5000"
    environment:
      - FLASK_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 2.4 Test OR-Tools Standalone

```bash
cd services/ortools
python scheduler.py  # Should start on port 5000
curl http://localhost:5000/health
```

---

## Phase 3: NestJS Backend Module (Day 2-4)

### 3.1 Module Structure

```
apps/api/src/shifts/
├── shifts.module.ts
├── shifts.controller.ts          # REST endpoints
├── shifts.service.ts             # Business logic
├── shifts.gateway.ts             # WebSocket Gateway
├── ortools.client.ts             # HTTP client to OR-Tools
├── dto/
│   ├── create-staff.dto.ts
│   ├── update-staff.dto.ts
│   ├── create-period.dto.ts
│   ├── update-schedule.dto.ts
│   ├── optimize-request.dto.ts
│   └── schedule-response.dto.ts
└── interfaces/
    ├── staff.interface.ts
    ├── schedule.interface.ts
    └── constraint.interface.ts
```

### 3.2 REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shifts/periods` | List all periods |
| POST | `/shifts/periods` | Create new period |
| GET | `/shifts/periods/:id` | Get period with schedule |
| DELETE | `/shifts/periods/:id` | Delete period |
| GET | `/shifts/staff` | List all staff |
| POST | `/shifts/staff` | Create staff member |
| PUT | `/shifts/staff/:id` | Update staff member |
| DELETE | `/shifts/staff/:id` | Delete staff member |
| GET | `/shifts/schedule/:periodId` | Get schedule for period |
| PUT | `/shifts/schedule/:periodId` | Update schedule entries |
| POST | `/shifts/optimize` | Trigger OR-Tools optimization |
| GET | `/shifts/settings` | Get constraint settings |
| PUT | `/shifts/settings` | Update constraint settings |
| GET | `/shifts/calendar-rules` | Get calendar rules |
| POST | `/shifts/calendar-rules` | Create calendar rule |
| DELETE | `/shifts/calendar-rules/:id` | Delete calendar rule |
| GET | `/shifts/staff-groups` | Get staff groups |
| POST | `/shifts/staff-groups` | Create staff group |

### 3.3 WebSocket Gateway Events

```typescript
// shifts.gateway.ts
@WebSocketGateway({ namespace: 'shifts' })
export class ShiftsGateway {
    // Client → Server
    @SubscribeMessage('subscribe_period')
    handleSubscribe(client, periodId: string)

    @SubscribeMessage('update_cell')
    handleCellUpdate(client, { periodId, staffId, date, symbol })

    @SubscribeMessage('lock_cell')
    handleLockCell(client, { periodId, staffId, date })

    // Server → Client (broadcasts)
    // 'schedule_updated' - When any cell changes
    // 'optimization_started' - When OR-Tools starts
    // 'optimization_complete' - When OR-Tools finishes
    // 'staff_updated' - When staff list changes
}
```

### 3.4 OR-Tools Client

```typescript
// ortools.client.ts
@Injectable()
export class ORToolsClient {
    private readonly baseUrl = process.env.ORTOOLS_URL || 'http://localhost:5050';

    async optimize(request: OptimizeRequest): Promise<OptimizeResponse> {
        const response = await this.httpService.post(
            `${this.baseUrl}/optimize`,
            request
        ).toPromise();
        return response.data;
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.httpService.get(`${this.baseUrl}/health`).toPromise();
            return true;
        } catch {
            return false;
        }
    }
}
```

### 3.5 Key Service Methods

```typescript
// shifts.service.ts
@Injectable()
export class ShiftsService {
    // Staff Management
    async getStaff(restaurantId: string): Promise<ScheduleStaff[]>
    async createStaff(data: CreateStaffDto): Promise<ScheduleStaff>
    async updateStaff(id: string, data: UpdateStaffDto): Promise<ScheduleStaff>
    async deleteStaff(id: string): Promise<void>
    async reorderStaff(staffIds: string[]): Promise<void>

    // Period Management
    async getPeriods(restaurantId: string): Promise<SchedulePeriod[]>
    async createPeriod(data: CreatePeriodDto): Promise<SchedulePeriod>
    async deletePeriod(id: string): Promise<void>

    // Schedule Operations
    async getSchedule(periodId: string): Promise<ScheduleData>
    async updateCell(periodId: string, staffId: string, date: string, symbol: string): Promise<void>
    async bulkUpdateCells(periodId: string, updates: CellUpdate[]): Promise<void>

    // OR-Tools Integration
    async optimizeSchedule(periodId: string): Promise<OptimizeResult>

    // Settings
    async getSettings(restaurantId: string): Promise<ScheduleSettings>
    async updateSettings(restaurantId: string, settings: Partial<ScheduleSettings>): Promise<void>
}
```

---

## Phase 4: SvelteKit Frontend (Day 4-8)

### 4.1 Route Structure

```
apps/web/src/routes/
└── shifts/
    ├── +page.svelte              # Main schedule editor
    ├── +page.ts                  # Load period list
    ├── +layout.svelte            # Shifts layout with navigation
    ├── settings/
    │   └── +page.svelte          # Settings page (constraints, limits)
    ├── staff/
    │   └── +page.svelte          # Staff management page
    ├── calendar/
    │   └── +page.svelte          # Calendar rules page
    └── statistics/
        └── +page.svelte          # Analytics dashboard
```

### 4.2 Component Mapping (React → Svelte)

| React Component | Svelte Component | Priority |
|-----------------|------------------|----------|
| `ShiftScheduleEditorPhase3.jsx` | `routes/shifts/+page.svelte` | P0 |
| `ScheduleTable.jsx` | `lib/components/shifts/ScheduleTable.svelte` | P0 |
| `NavigationToolbar.jsx` | `lib/components/shifts/NavigationToolbar.svelte` | P0 |
| `StaffEditModal.jsx` | `lib/components/shifts/StaffEditModal.svelte` | P0 |
| `StatisticsDashboard.jsx` | `routes/shifts/statistics/+page.svelte` | P1 |
| `SettingsModal.jsx` | `routes/shifts/settings/+page.svelte` | P1 |
| `ConstraintConfiguratorTab.jsx` | `lib/components/shifts/settings/ConstraintConfig.svelte` | P1 |
| `LimitsTab.jsx` | `lib/components/shifts/settings/LimitsConfig.svelte` | P1 |
| `PriorityRulesTab.jsx` | `lib/components/shifts/settings/PriorityRules.svelte` | P2 |
| `StaffGroupsTab.jsx` | `lib/components/shifts/settings/StaffGroups.svelte` | P2 |
| `WorkingCalendarPage.jsx` | `routes/shifts/calendar/+page.svelte` | P2 |

### 4.3 State Management (Svelte 5 Runes)

```typescript
// lib/stores/shifts.svelte.ts
export function createShiftsStore() {
    let staff = $state<ScheduleStaff[]>([]);
    let schedule = $state<Record<string, Record<string, string>>>({});
    let currentPeriod = $state<SchedulePeriod | null>(null);
    let isOptimizing = $state(false);
    let wsConnected = $state(false);

    const staffByDepartment = $derived(
        staff.reduce((acc, s) => {
            const dept = s.department || 'other';
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(s);
            return acc;
        }, {} as Record<string, ScheduleStaff[]>)
    );

    return {
        get staff() { return staff; },
        get schedule() { return schedule; },
        get currentPeriod() { return currentPeriod; },
        get isOptimizing() { return isOptimizing; },
        get staffByDepartment() { return staffByDepartment; },

        setStaff(data: ScheduleStaff[]) { staff = data; },
        setSchedule(data: Record<string, Record<string, string>>) { schedule = data; },
        // ... more methods
    };
}
```

### 4.4 WebSocket Client

```typescript
// lib/websocket/shifts-ws.ts
export function createShiftsWebSocket(periodId: string) {
    const socket = io(`${API_URL}/shifts`, {
        transports: ['websocket'],
        auth: { token: getAuthToken() }
    });

    socket.on('connect', () => {
        socket.emit('subscribe_period', periodId);
    });

    socket.on('schedule_updated', (data) => {
        // Update local state
    });

    socket.on('optimization_complete', (result) => {
        // Apply optimized schedule
    });

    return {
        updateCell(staffId: string, date: string, symbol: string) {
            socket.emit('update_cell', { periodId, staffId, date, symbol });
        },
        disconnect() {
            socket.disconnect();
        }
    };
}
```

### 4.5 API Client

```typescript
// lib/api/shifts.ts
const API = `${import.meta.env.VITE_API_URL}/shifts`;

export const shiftsApi = {
    // Staff
    getStaff: () => fetch(`${API}/staff`).then(r => r.json()),
    createStaff: (data) => fetch(`${API}/staff`, { method: 'POST', body: JSON.stringify(data) }),
    updateStaff: (id, data) => fetch(`${API}/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteStaff: (id) => fetch(`${API}/staff/${id}`, { method: 'DELETE' }),

    // Periods
    getPeriods: () => fetch(`${API}/periods`).then(r => r.json()),
    createPeriod: (data) => fetch(`${API}/periods`, { method: 'POST', body: JSON.stringify(data) }),

    // Schedule
    getSchedule: (periodId) => fetch(`${API}/schedule/${periodId}`).then(r => r.json()),
    updateCell: (periodId, staffId, date, symbol) =>
        fetch(`${API}/schedule/${periodId}`, {
            method: 'PUT',
            body: JSON.stringify({ staffId, date, symbol })
        }),

    // Optimization
    optimize: (periodId) => fetch(`${API}/optimize`, {
        method: 'POST',
        body: JSON.stringify({ periodId })
    }),

    // Settings
    getSettings: () => fetch(`${API}/settings`).then(r => r.json()),
    updateSettings: (data) => fetch(`${API}/settings`, { method: 'PUT', body: JSON.stringify(data) }),
};
```

---

## Phase 5: Core UI Components (Day 5-7)

### 5.1 ScheduleTable.svelte (P0 - Critical)

Key features to implement:
- [ ] Grid layout with dates as columns, staff as rows
- [ ] Clickable cells that cycle through shift symbols
- [ ] Keyboard navigation (arrow keys, Enter to edit)
- [ ] Color coding by shift type
- [ ] Locked cell indicators
- [ ] Department grouping with collapsible sections
- [ ] Sticky header row (dates) and first column (staff names)
- [ ] Mobile responsive (horizontal scroll)

### 5.2 NavigationToolbar.svelte (P0 - Critical)

Key features to implement:
- [ ] Period selector dropdown
- [ ] Previous/Next period navigation
- [ ] "Optimize" button with loading state
- [ ] Export buttons (CSV, TSV, Print)
- [ ] Save/Discard changes buttons
- [ ] Connection status indicator

### 5.3 StaffEditModal.svelte (P0 - Critical)

Key features to implement:
- [ ] Add/Edit staff form
- [ ] Staff type selector (社員/派遣/パート)
- [ ] Department assignment
- [ ] Staff group assignment
- [ ] Monthly limit overrides
- [ ] Employment period dates
- [ ] Drag-to-reorder staff list
- [ ] Delete with confirmation

### 5.4 Shift Symbol Input

```svelte
<!-- lib/components/shifts/ShiftCell.svelte -->
<script lang="ts">
    const SYMBOLS = ['', '○', '×', '△', '◇'];
    const SYMBOL_COLORS = {
        '': 'bg-white',
        '○': 'bg-green-100',
        '×': 'bg-red-100',
        '△': 'bg-yellow-100',
        '◇': 'bg-blue-100',
    };

    let { symbol = $bindable(), locked = false, onchange } = $props();

    function cycleSymbol() {
        if (locked) return;
        const currentIndex = SYMBOLS.indexOf(symbol);
        const nextIndex = (currentIndex + 1) % SYMBOLS.length;
        symbol = SYMBOLS[nextIndex];
        onchange?.(symbol);
    }
</script>

<button
    class="w-10 h-10 border text-center {SYMBOL_COLORS[symbol]} {locked ? 'opacity-50' : ''}"
    onclick={cycleSymbol}
    disabled={locked}
>
    {symbol || '-'}
</button>
```

---

## Phase 6: Settings & Configuration (Day 7-8)

### 6.1 Constraint Settings

Settings to implement:
- [ ] Daily limits (min/max staff off per day)
- [ ] Monthly limits (min/max days off per staff)
- [ ] Staff type limits (max 社員 off, max 派遣 off per day)
- [ ] 5-day rest constraint toggle
- [ ] Adjacent conflict prevention toggle
- [ ] Penalty weights configuration

### 6.2 Calendar Rules

- [ ] Mark dates as must_day_off (holidays)
- [ ] Mark dates as must_work (busy days)
- [ ] Visual calendar with rule indicators
- [ ] Bulk date selection

### 6.3 Staff Groups

- [ ] Create/edit groups
- [ ] Assign staff to groups
- [ ] Group constraint: only 1 member off per day

---

## Phase 7: Testing & Deployment (Day 8-10)

### 7.1 Test Checklist

- [ ] Unit tests for NestJS service methods
- [ ] Integration tests for OR-Tools API
- [ ] E2E tests for critical user flows:
  - [ ] Create period → Add staff → Manual schedule → Save
  - [ ] Load schedule → Optimize → Verify constraints
  - [ ] Multi-user WebSocket sync
- [ ] Performance test with 30+ staff, 60-day period

### 7.2 Deployment Configuration

```yaml
# fly.toml (NestJS + WebSocket)
[http_service]
  internal_port = 3002
  force_https = true

[[services]]
  protocol = "tcp"
  internal_port = 3002
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

# Separate fly.toml for OR-Tools service
```

### 7.3 Environment Variables

Add to `.env`:
```
# OR-Tools Service
ORTOOLS_URL=http://ortools:5000  # Docker internal
# or
ORTOOLS_URL=https://ortools-service.fly.dev  # Production

# WebSocket
WS_CORS_ORIGIN=https://your-app.pages.dev
```

---

## Timeline Summary (Updated - No DB Migration Needed)

| Phase | Description | Days | Status |
|-------|-------------|------|--------|
| 1 | Database Schema | 0 | ✅ Already exists! |
| 2 | OR-Tools Service Setup | 1 | Pending |
| 3 | NestJS Backend Module | 3 | Pending |
| 4 | SvelteKit Routes & State | 2 | Pending |
| 5 | Core UI Components | 3 | Pending |
| 6 | Settings & Configuration | 2 | Pending |
| 7 | Testing & Deployment | 2 | Pending |
| **Total** | | **~13 days** | |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| OR-Tools OOM on free tier | Test with real data early; budget for 512MB VM |
| WebSocket disconnects on Fly.io | Implement reconnection with exponential backoff |
| Supabase free tier limits | Monitor usage; schedule data is small |
| Complex constraint logic bugs | Port unit tests from original scheduler.py |

---

## Success Criteria

1. **Functional parity**: All 18+ constraints from original system work
2. **Performance**: Optimization completes in <30s for 30 staff × 60 days
3. **Real-time**: Cell updates propagate to other users in <500ms
4. **UX**: Single sign-on works; navigation between allergens↔shifts seamless
5. **Stability**: No data loss; graceful handling of OR-Tools timeout

---

## References

- Original React app: `shift-schedule-manager-ortools/`
- Original Go server: `shift-schedule-manager-ortools/go-server/`
- Original OR-Tools: `shift-schedule-manager-ortools/python-ortools-service/`
- Competitive analysis: `shift-schedule-manager-ortools/research/COMPETITIVE_ANALYSIS.md`

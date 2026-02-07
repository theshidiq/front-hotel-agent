# Feature 06: Front Desk Dashboard

## Overview
Create the Front Desk dashboard page with check-in workflow.

## File to Create

```
apps/web/src/routes/front-desk/+page.svelte
```

## Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar (240px)       │  Main Content                          │
│  ┌───────────────────┐ │  ┌─────────────────────────────────────┐│
│  │ 湖南荘             │ │  │ Header: チェックイン管理   2/6(木)  ││
│  │ Konan-so          │ │  │                          今日: 8組  ││
│  ├───────────────────┤ │  ├─────────────────────────────────────┤│
│  │ ☐ チェックイン     │ │  │                                     ││
│  │ ☐ 客室管理        │ │  │  Reservations Table                 ││
│  │ ☐ ゲスト一覧      │ │  │  - Room, Guest, Party, Source,      ││
│  │ ☐ 通知           │ │  │    Nights, Status, Actions          ││
│  │ ☐ 設定           │ │  │                                     ││
│  └───────────────────┘ │  └─────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Main View: Reservations Table

**Columns:**
| 客室 | ゲスト名 | 人数 | 予約元 | 泊数 | ステータス | アクション |

**Status Badges:**
- `confirmed` → 到着待ち (yellow/amber)
- `checked_in` → チェックイン済 (green)

**Actions:**
- 到着待ち → "チェックイン" button (blue)
- チェックイン済 → "詳細" button (gray)

## Check-in Flow (3 Steps)

### Step 1: Guest Lookup Modal

**Trigger:** Click "チェックイン" on a row, or floating "+" button

**UI:**
- QR Scanner area (primary method)
- OR Manual search: Name + Phone inputs
- Search button

**State:**
```typescript
let lookupMode = $state<'qr' | 'search'>('qr');
let searchName = $state('');
let searchPhone = $state('');
let searchResults = $state<Reservation[]>([]);
```

### Step 2: Confirm Identity Modal

**Shows after:** Successful QR scan or search selection

**UI:**
- Success banner: "予約が見つかりました"
- Read-only booking info display:
  - ゲスト名: 田中 太郎 様
  - 客室: 305 松の間
  - 宿泊期間: 2026/02/06 - 02/08 (2泊)
  - 人数: 2名
  - 電話番号: 090-1234-5678
  - 予約元: Rakuten Travel
- Buttons: [戻る] [この予約でチェックイン]

### Step 3: Inquiry Form Modal

**Shows after:** Confirm button clicked

**Fields to collect:**
- 夕食時間: Dropdown/select [17:30, 18:00, 18:30, 19:00, 19:30, 20:00]
- 朝食時間: Dropdown/select [07:00, 07:30, 08:00, 08:30, 09:00]
- アレルギー: Multi-select chips with allergen list
- 特別なご要望: Textarea

**Buttons:** [キャンセル] [チェックイン完了]

**On Submit:**
1. Call `checkIn(reservationId, checkInData)`
2. Show success message
3. Refresh table
4. Close modal

## State Management (Svelte 5)

```typescript
// Main state
let reservations = $state<Reservation[]>([]);
let loading = $state(true);

// Modal state
let showLookupModal = $state(false);
let showConfirmModal = $state(false);
let showInquiryModal = $state(false);

// Selected reservation for check-in flow
let selectedReservation = $state<Reservation | null>(null);

// Check-in form data
let checkInForm = $state<CheckInData>({
  dinner_time: '18:00',
  breakfast_time: '08:00',
  allergen_ids: [],
  dietary_notes: '',
  special_requests: '',
});

// Allergens for selection
let allergens = $state<Allergen[]>([]);
```

## Functions

```typescript
async function loadReservations() {
  loading = true;
  reservations = await getTodayArrivals();
  loading = false;
}

async function loadAllergens() {
  allergens = await getAllergens();
}

function startCheckIn(reservation: Reservation) {
  selectedReservation = reservation;
  showConfirmModal = true;
}

function confirmIdentity() {
  showConfirmModal = false;
  showInquiryModal = true;
}

async function completeCheckIn() {
  if (!selectedReservation) return;

  await checkIn(selectedReservation.id, checkInForm);

  showInquiryModal = false;
  selectedReservation = null;
  resetCheckInForm();
  await loadReservations();
}
```

## UI Reference

See `pencil-welcome.pen`:
- Frame `kjYNC` - Front Desk Dashboard
- Frame `mnfRh` - Step 1: Guest Lookup
- Frame `tRjv0` - Step 2: Confirm Identity
- Frame `3n6OC` - Step 3: Inquiry Form

## Checklist

- [ ] Create `apps/web/src/routes/front-desk/+page.svelte`
- [ ] Implement sidebar navigation
- [ ] Implement reservations table
- [ ] Implement Step 1: Guest Lookup modal
- [ ] Implement Step 2: Confirm Identity modal
- [ ] Implement Step 3: Inquiry Form modal
- [ ] Add loading states
- [ ] Test full check-in flow

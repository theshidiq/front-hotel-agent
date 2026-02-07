# Feature 07: Staff Notifications Tab

## Overview
Add a "通知" (Notifications) tab to the existing staff dashboard showing guest alerts in realtime.

## File to Modify

```
apps/web/src/routes/+page.svelte
```

## Changes

### Add New Tab

Add "通知" tab alongside existing "Products" and "Menu" tabs.

```typescript
// Tab state
let activeTab = $state<'products' | 'menu' | 'notifications'>('products');
```

### Notifications Tab Content

**Alert Card Layout:**
```
┌───────────────────────────────────────────────────────────┐
│ 🟢│  305 松の間  ·  田中 太郎 様  ·  2名                  │
│   │  夕食: 18:00                                         │
│   │  ┌─────┐ ┌─────┐                                     │
│   │  │ 卵  │ │ 乳  │  (allergen chips in red)            │
│   │  └─────┘ └─────┘                                     │
│   │  14:32 チェックイン                                  │
│   │                              [確認済み] [非表示]     │
└───────────────────────────────────────────────────────────┘
```

**Alert Type Indicators:**
- `check_in` with allergens → Green left border
- `check_in` without allergens → Blue left border
- `allergen_update` → Orange left border

### State

```typescript
// Alerts state
let guestAlerts = $state<GuestAlert[]>([]);
let alertsLoading = $state(true);

// Filter
let alertFilter = $state<'all' | 'new' | 'acknowledged'>('new');
```

### Supabase Realtime Subscription

```typescript
import { supabase } from '$lib/supabase';

onMount(() => {
  loadAlerts();

  // Subscribe to new alerts
  const channel = supabase
    .channel('guest-alerts-realtime')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'guest_alerts'
    }, async (payload) => {
      // Fetch full alert with allergens
      const newAlert = await getGuestAlert(payload.new.id);
      guestAlerts = [newAlert, ...guestAlerts];

      // Play notification sound
      playNotificationSound();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
});
```

### Notification Sound

Add audio file: `apps/web/static/notification.mp3`

```typescript
function playNotificationSound() {
  const audio = new Audio('/notification.mp3');
  audio.volume = 0.5;
  audio.play().catch(() => {
    // Ignore autoplay restrictions
  });
}
```

### Functions

```typescript
async function loadAlerts() {
  alertsLoading = true;
  const status = alertFilter === 'all' ? undefined : alertFilter;
  guestAlerts = await getGuestAlerts({ status });
  alertsLoading = false;
}

async function handleAcknowledge(alertId: string) {
  await acknowledgeGuestAlert(alertId, 'acknowledged', 'Kitchen Staff');
  await loadAlerts();
}

async function handleDismiss(alertId: string) {
  await acknowledgeGuestAlert(alertId, 'dismissed', 'Kitchen Staff');
  await loadAlerts();
}
```

### Alert Card Component

```svelte
{#each guestAlerts as alert}
  <div class="alert-card border-l-4 {getAlertBorderColor(alert)}">
    <div class="flex justify-between items-start">
      <div>
        <div class="font-semibold">
          {alert.room_number} {alert.room_name} · {alert.guest_name} · {alert.party_size}名
        </div>
        {#if alert.dinner_time}
          <div class="text-sm text-gray-600">夕食: {alert.dinner_time}</div>
        {/if}
        {#if alert.allergens && alert.allergens.length > 0}
          <div class="flex gap-2 mt-2">
            {#each alert.allergens as allergen}
              <span class="allergen-chip">{allergen.name}</span>
            {/each}
          </div>
        {/if}
        <div class="text-xs text-gray-400 mt-2">
          {formatTime(alert.created_at)} {getAlertTypeLabel(alert.alert_type)}
        </div>
      </div>

      {#if alert.status === 'new'}
        <div class="flex gap-2">
          <button onclick={() => handleAcknowledge(alert.id)}>確認済み</button>
          <button onclick={() => handleDismiss(alert.id)}>非表示</button>
        </div>
      {:else}
        <span class="text-gray-400">{alert.status === 'acknowledged' ? '確認済み' : '非表示'}</span>
      {/if}
    </div>
  </div>
{/each}
```

## UI Reference

See `pencil-welcome.pen`:
- Frame `86s7c` - Staff Allergen Alerts Dashboard

## Checklist

- [ ] Add "通知" tab to `+page.svelte`
- [ ] Create alert card UI
- [ ] Add Supabase realtime subscription
- [ ] Add notification sound file
- [ ] Implement acknowledge/dismiss actions
- [ ] Add filter (all/new/acknowledged)
- [ ] Test realtime updates

# Feature 08: Guest Mobile Page

## Overview
Create a mobile-friendly guest page with AI assistant and allergen update functionality.

## File to Create

```
apps/web/src/routes/guest/+page.svelte
```

## Access Method

Guest receives access after check-in via:
- QR code printed slip
- URL: `https://app.konanso.jp/guest?room=305&token=xxx`

## URL Parameters

```typescript
// Get from URL
const room = $page.url.searchParams.get('room');
const token = $page.url.searchParams.get('token');
```

## Page Layout

### Welcome Screen

```
┌─────────────────────────────────────────┐
│  湖南荘                                  │
│  ─────────────────────────────────────  │
│                                         │
│  ようこそ、田中様                         │
│  305 松の間                              │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  🎤                              │   │
│  │                                 │   │
│  │    なんでも聞いてください          │   │
│  │                                 │   │
│  │    タップして話す                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ────────── クイックアクション ──────── │
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ お食事  │ │ 観光案内 │ │ ルーム  │  │
│  │         │ │         │ │ サービス│  │
│  └─────────┘ └─────────┘ └─────────┘  │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  📋 アレルギー情報を更新する             │
│                                         │
└─────────────────────────────────────────┘
```

### AI Chat Screen

When guest taps the mic button or types:

```
┌─────────────────────────────────────────┐
│  ← 戻る            AI コンシェルジュ     │
│  ─────────────────────────────────────  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ AI: こんにちは、田中様。          │   │
│  │ 何かお手伝いできることは         │   │
│  │ ございますか？                   │   │
│  └─────────────────────────────────┘   │
│                                         │
│        ┌─────────────────────────────┐ │
│        │ User: 近くの観光スポット    │ │
│        │ を教えてください            │ │
│        └─────────────────────────────┘ │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ AI: はい、湖南荘周辺の           │   │
│  │ おすすめスポットをご紹介します... │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────────────────────────────────  │
│  ┌─────────────────────────────┐ 🎤   │
│  │ メッセージを入力...          │      │
│  └─────────────────────────────┘       │
└─────────────────────────────────────────┘
```

### Allergen Update Form

When guest taps "アレルギー情報を更新する":

```
┌─────────────────────────────────────────┐
│  ← 戻る          アレルギー情報          │
│  ─────────────────────────────────────  │
│                                         │
│  現在登録されているアレルギー:           │
│  ┌─────┐ ┌─────┐                       │
│  │ 卵 ✕│ │ 乳 ✕│                       │
│  └─────┘ └─────┘                       │
│                                         │
│  ────────── アレルギーを追加 ────────── │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔍 検索...                       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ○ 小麦   ○ そば   ○ 落花生            │
│  ○ えび   ○ かに   ○ くるみ            │
│  ○ 牛肉   ○ 豚肉   ○ 鶏肉             │
│  ...                                    │
│                                         │
│  ─────────────────────────────────────  │
│  その他の食事制限:                       │
│  ┌─────────────────────────────────┐   │
│  │ ベジタリアン、宗教上の制限など...  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │           更新する               │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## State

```typescript
// Guest info (loaded from token)
let reservation = $state<Reservation | null>(null);
let loading = $state(true);

// View state
let currentView = $state<'welcome' | 'chat' | 'allergens'>('welcome');

// Chat state
let chatMessages = $state<ChatMessage[]>([]);
let chatInput = $state('');
let isRecording = $state(false);

// Allergen form state
let selectedAllergenIds = $state<string[]>([]);
let dietaryNotes = $state('');
let allergens = $state<Allergen[]>([]);
```

## Functions

### Load Guest Data

```typescript
async function loadGuestData() {
  loading = true;
  // Validate token and get reservation
  reservation = await getReservationByToken(token);
  selectedAllergenIds = reservation.allergen_ids || [];
  dietaryNotes = reservation.dietary_notes || '';
  loading = false;
}
```

### Update Allergens

```typescript
async function updateAllergens() {
  if (!reservation) return;

  // Update reservation
  await updateReservationAllergens(reservation.id, {
    allergen_ids: selectedAllergenIds,
    dietary_notes: dietaryNotes,
  });

  // This will trigger a guest_alert with type 'allergen_update'
  // Kitchen receives realtime notification

  currentView = 'welcome';
}
```

### AI Chat (placeholder for future)

```typescript
async function sendMessage() {
  if (!chatInput.trim()) return;

  // Add user message
  chatMessages = [...chatMessages, {
    role: 'user',
    content: chatInput,
  }];

  const userMessage = chatInput;
  chatInput = '';

  // TODO: Call AI API
  // For now, show placeholder response
  chatMessages = [...chatMessages, {
    role: 'assistant',
    content: 'この機能は現在準備中です。フロントデスクにお問い合わせください。',
  }];
}
```

## Mobile Optimizations

- Full viewport height: `min-h-screen`
- Touch-friendly buttons: `min-h-12 px-6`
- Large tap targets for allergen selection
- Bottom-fixed input for chat
- Swipe gestures for navigation (optional)

## UI Reference

See `pencil-welcome.pen`:
- Frame `nl3oz` - Guest Welcome + AI Mic
- Frame `NvnWd` - Guest AI Chat
- Frame `R48TI` - Guest Allergen Form

## Checklist

- [ ] Create `apps/web/src/routes/guest/+page.svelte`
- [ ] Implement welcome screen
- [ ] Implement allergen update form
- [ ] Create guest_alert on allergen update
- [ ] Add chat UI (placeholder for AI)
- [ ] Mobile-responsive design
- [ ] Test on mobile device

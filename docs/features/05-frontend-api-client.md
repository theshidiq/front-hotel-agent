# Feature 05: Frontend API Client

## Overview
Add new types and functions to `apps/web/src/lib/api.ts` for the Guest Information System.

## New Types

```typescript
// Reservation (from booking)
export interface Reservation {
  id: string;
  booking_source: 'rakuten' | 'jalan' | 'booking_com' | 'direct' | 'phone' | 'walk_in';
  booking_reference?: string;
  qr_code?: string;

  // From booking
  guest_name: string;
  guest_name_kana?: string;
  party_size: number;
  phone?: string;
  email?: string;
  room_number: string;
  room_name?: string;
  check_in_date: string;
  check_out_date: string;

  // Collected at check-in
  arrival_time?: string;
  dinner_time?: string;
  breakfast_time?: string;
  allergen_ids: string[];
  allergens?: Allergen[];
  dietary_notes?: string;
  special_requests?: string;

  // Status
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  checked_in_at?: string;
  checked_in_by?: string;

  created_at: string;
  updated_at: string;
}

// Guest Alert
export interface GuestAlert {
  id: string;
  reservation_id: string;
  alert_type: 'check_in' | 'allergen_update' | 'request' | 'checkout';
  room_number: string;
  guest_name?: string;
  party_size?: number;
  dinner_time?: string;
  allergen_ids: string[];
  allergens?: Allergen[];
  message?: string;
  status: 'new' | 'acknowledged' | 'dismissed';
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
}

// Room
export interface Room {
  id: string;
  room_number: string;
  room_name?: string;
  room_type?: string;
  capacity: number;
  floor?: number;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
  current_reservation_id?: string;
  current_reservation?: Reservation;
  image_url?: string;
}

// Check-in data (Step 3)
export interface CheckInData {
  dinner_time?: string;
  breakfast_time?: string;
  allergen_ids?: string[];
  dietary_notes?: string;
  special_requests?: string;
  checked_in_by?: string;
}
```

## New Functions

### Reservations

```typescript
// List reservations with optional filters
export async function getReservations(params?: {
  date?: string;
  status?: string
}): Promise<Reservation[]> {
  const searchParams = new URLSearchParams();
  if (params?.date) searchParams.set('date', params.date);
  if (params?.status) searchParams.set('status', params.status);

  const url = `${API_BASE}/reservations?${searchParams}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch reservations');
  return res.json();
}

// Get today's arrivals (shortcut)
export async function getTodayArrivals(): Promise<Reservation[]> {
  const res = await fetch(`${API_BASE}/reservations/today`);
  if (!res.ok) throw new Error('Failed to fetch arrivals');
  return res.json();
}

// Get single reservation
export async function getReservation(id: string): Promise<Reservation> {
  const res = await fetch(`${API_BASE}/reservations/${id}`);
  if (!res.ok) throw new Error('Failed to fetch reservation');
  return res.json();
}

// Search by name/phone
export async function searchReservation(params: {
  name?: string;
  phone?: string
}): Promise<Reservation[]> {
  const searchParams = new URLSearchParams();
  if (params.name) searchParams.set('name', params.name);
  if (params.phone) searchParams.set('phone', params.phone);

  const res = await fetch(`${API_BASE}/reservations/search?${searchParams}`);
  if (!res.ok) throw new Error('Failed to search reservations');
  return res.json();
}

// Lookup by QR code
export async function lookupByQR(qrCode: string): Promise<Reservation> {
  const res = await fetch(`${API_BASE}/reservations/qr/${encodeURIComponent(qrCode)}`);
  if (!res.ok) throw new Error('Reservation not found');
  return res.json();
}

// Complete check-in (Step 3)
export async function checkIn(id: string, data: CheckInData): Promise<Reservation> {
  const res = await fetch(`${API_BASE}/reservations/${id}/check-in`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to check in');
  return res.json();
}

// Check out
export async function checkOut(id: string): Promise<Reservation> {
  const res = await fetch(`${API_BASE}/reservations/${id}/check-out`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Failed to check out');
  return res.json();
}
```

### Guest Alerts

```typescript
// List alerts
export async function getGuestAlerts(params?: {
  status?: string;
  type?: string
}): Promise<GuestAlert[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.type) searchParams.set('type', params.type);

  const res = await fetch(`${API_BASE}/guest-alerts?${searchParams}`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

// Acknowledge/dismiss alert
export async function acknowledgeGuestAlert(
  id: string,
  status: 'acknowledged' | 'dismissed',
  by?: string
): Promise<GuestAlert> {
  const res = await fetch(`${API_BASE}/guest-alerts/${id}/acknowledge`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, acknowledged_by: by }),
  });
  if (!res.ok) throw new Error('Failed to acknowledge alert');
  return res.json();
}
```

### Rooms

```typescript
// List rooms
export async function getRooms(): Promise<Room[]> {
  const res = await fetch(`${API_BASE}/rooms`);
  if (!res.ok) throw new Error('Failed to fetch rooms');
  return res.json();
}

// Get single room
export async function getRoom(id: string): Promise<Room> {
  const res = await fetch(`${API_BASE}/rooms/${id}`);
  if (!res.ok) throw new Error('Failed to fetch room');
  return res.json();
}

// Update room status
export async function updateRoomStatus(
  id: string,
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance'
): Promise<Room> {
  const res = await fetch(`${API_BASE}/rooms/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update room status');
  return res.json();
}
```

## Checklist

- [ ] Add `Reservation` interface
- [ ] Add `GuestAlert` interface
- [ ] Add `Room` interface
- [ ] Add `CheckInData` interface
- [ ] Add reservation functions
- [ ] Add guest alert functions
- [ ] Add room functions
- [ ] Test all API calls work correctly

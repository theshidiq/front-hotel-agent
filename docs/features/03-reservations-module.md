# Feature 03: Reservations Module (Backend)

## Overview
NestJS module for reservation management - list, search, check-in, and check-out.

## Files to Create

```
apps/api/src/reservations/
├── reservations.module.ts
├── reservations.controller.ts
├── reservations.service.ts
└── dto/
    ├── create-reservation.dto.ts
    ├── check-in.dto.ts
    ├── search-reservation.dto.ts
    └── reservation-response.dto.ts
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reservations` | List reservations (filter: `?date=`, `?status=`) |
| GET | `/reservations/today` | Today's arrivals (shortcut) |
| GET | `/reservations/:id` | Get reservation details |
| GET | `/reservations/qr/:qrCode` | Lookup by QR code scan |
| GET | `/reservations/search` | Search by name + phone |
| POST | `/reservations` | Create reservation (manual/walk-in) |
| PUT | `/reservations/:id` | Update reservation |
| PATCH | `/reservations/:id/check-in` | Complete check-in (Step 3 data) |
| PATCH | `/reservations/:id/check-out` | Check out guest |

## DTOs

### `check-in.dto.ts` (Most important - Step 3 data)
```typescript
import { IsOptional, IsString, IsArray, IsUUID } from 'class-validator';

export class CheckInDto {
  @IsOptional()
  @IsString()
  dinner_time?: string;  // HH:MM format

  @IsOptional()
  @IsString()
  breakfast_time?: string;  // HH:MM format

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  allergen_ids?: string[];

  @IsOptional()
  @IsString()
  dietary_notes?: string;

  @IsOptional()
  @IsString()
  special_requests?: string;

  @IsOptional()
  @IsString()
  checked_in_by?: string;
}
```

### `search-reservation.dto.ts`
```typescript
import { IsOptional, IsString } from 'class-validator';

export class SearchReservationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  date?: string;  // Default: today
}
```

### `reservation-response.dto.ts`
```typescript
export class ReservationResponse {
  id: string;
  booking_source: string;
  booking_reference?: string;
  qr_code?: string;
  guest_name: string;
  guest_name_kana?: string;
  party_size: number;
  phone?: string;
  email?: string;
  room_number: string;
  room_name?: string;
  check_in_date: string;
  check_out_date: string;
  arrival_time?: string;
  dinner_time?: string;
  breakfast_time?: string;
  allergen_ids: string[];
  allergens?: any[];  // Enriched allergen objects
  dietary_notes?: string;
  special_requests?: string;
  status: string;
  checked_in_at?: string;
  checked_in_by?: string;
  created_at: string;
  updated_at: string;
}
```

## Service Methods

### `checkIn()` - Key method
```typescript
async checkIn(id: string, dto: CheckInDto): Promise<ReservationResponse> {
  const supabase = this.supabase.getClient();

  // 1. Update reservation with check-in data
  const { data: reservation, error } = await supabase
    .from('reservations')
    .update({
      dinner_time: dto.dinner_time,
      breakfast_time: dto.breakfast_time,
      allergen_ids: dto.allergen_ids || [],
      dietary_notes: dto.dietary_notes,
      special_requests: dto.special_requests,
      status: 'checked_in',
      checked_in_at: new Date().toISOString(),
      checked_in_by: dto.checked_in_by,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new InternalServerErrorException(error.message);

  // 2. Update room status to 'occupied'
  await supabase
    .from('rooms')
    .update({ status: 'occupied', current_reservation_id: id })
    .eq('room_number', reservation.room_number)
    .eq('restaurant_id', this.supabase.getRestaurantId());

  // 3. Create guest alert if allergens present
  if (dto.allergen_ids && dto.allergen_ids.length > 0) {
    await supabase.from('guest_alerts').insert({
      restaurant_id: this.supabase.getRestaurantId(),
      reservation_id: id,
      alert_type: 'check_in',
      room_number: reservation.room_number,
      guest_name: reservation.guest_name,
      party_size: reservation.party_size,
      dinner_time: dto.dinner_time,
      allergen_ids: dto.allergen_ids,
    });
  }

  // 4. Return enriched reservation with allergens
  return this.findOne(id);
}
```

### `lookupByQR()`
```typescript
async lookupByQR(qrCode: string): Promise<ReservationResponse> {
  const { data, error } = await this.supabase.getClient()
    .from('reservations')
    .select('*')
    .eq('qr_code', qrCode)
    .single();

  if (error || !data) throw new NotFoundException('Reservation not found');
  return data;
}
```

### `search()`
```typescript
async search(dto: SearchReservationDto): Promise<ReservationResponse[]> {
  let query = this.supabase.getClient()
    .from('reservations')
    .select('*')
    .eq('restaurant_id', this.supabase.getRestaurantId());

  if (dto.name) {
    query = query.ilike('guest_name', `%${dto.name}%`);
  }
  if (dto.phone) {
    query = query.ilike('phone', `%${dto.phone}%`);
  }
  if (dto.date) {
    query = query.eq('check_in_date', dto.date);
  } else {
    // Default to today
    query = query.eq('check_in_date', new Date().toISOString().split('T')[0]);
  }

  const { data, error } = await query.order('guest_name');
  if (error) throw new InternalServerErrorException(error.message);
  return data;
}
```

## Checklist

- [ ] Create `reservations.module.ts`
- [ ] Create `reservations.controller.ts`
- [ ] Create `reservations.service.ts`
- [ ] Create DTOs
- [ ] Implement `checkIn()` with room update + alert creation
- [ ] Implement `lookupByQR()` and `search()`
- [ ] Register in `app.module.ts`
- [ ] Test endpoints with Swagger

# Feature 02: Rooms Module (Backend)

## Overview
NestJS module for room management - list rooms and update status.

## Files to Create

```
apps/api/src/rooms/
├── rooms.module.ts
├── rooms.controller.ts
├── rooms.service.ts
└── dto/
    ├── room-response.dto.ts
    └── update-room-status.dto.ts
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rooms` | List all rooms with status |
| GET | `/rooms/:id` | Get room details |
| PATCH | `/rooms/:id/status` | Update room status |

## DTOs

### `room-response.dto.ts`
```typescript
export class RoomResponse {
  id: string;
  room_number: string;
  room_name?: string;
  room_type?: string;
  capacity: number;
  floor?: number;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
  current_reservation_id?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}
```

### `update-room-status.dto.ts`
```typescript
import { IsIn, IsString } from 'class-validator';

export class UpdateRoomStatusDto {
  @IsString()
  @IsIn(['available', 'occupied', 'cleaning', 'maintenance'])
  status: string;
}
```

## Service Methods

```typescript
@Injectable()
export class RoomsService {
  constructor(private supabase: SupabaseService) {}

  async findAll(): Promise<RoomResponse[]> {
    const { data, error } = await this.supabase.getClient()
      .from('rooms')
      .select('*')
      .eq('restaurant_id', this.supabase.getRestaurantId())
      .order('room_number');

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async findOne(id: string): Promise<RoomResponse> {
    const { data, error } = await this.supabase.getClient()
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Room not found');
    return data;
  }

  async updateStatus(id: string, dto: UpdateRoomStatusDto): Promise<RoomResponse> {
    const { data, error } = await this.supabase.getClient()
      .from('rooms')
      .update({ status: dto.status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }
}
```

## Checklist

- [ ] Create `rooms.module.ts`
- [ ] Create `rooms.controller.ts`
- [ ] Create `rooms.service.ts`
- [ ] Create DTOs
- [ ] Register in `app.module.ts`
- [ ] Test endpoints with Swagger

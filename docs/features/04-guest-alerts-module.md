# Feature 04: Guest Alerts Module (Backend)

## Overview
NestJS module for managing allergen alerts sent to kitchen/room attendants.

## Files to Create

```
apps/api/src/guest-alerts/
├── guest-alerts.module.ts
├── guest-alerts.controller.ts
├── guest-alerts.service.ts
└── dto/
    ├── create-guest-alert.dto.ts
    ├── acknowledge-alert.dto.ts
    └── guest-alert-response.dto.ts
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/guest-alerts` | List alerts (filter: `?status=`, `?type=`) |
| GET | `/guest-alerts/:id` | Get alert details |
| PATCH | `/guest-alerts/:id/acknowledge` | Acknowledge/dismiss alert |

## DTOs

### `guest-alert-response.dto.ts`
```typescript
export class GuestAlertResponse {
  id: string;
  reservation_id: string;
  alert_type: 'check_in' | 'allergen_update' | 'request' | 'checkout';
  room_number: string;
  guest_name?: string;
  party_size?: number;
  dinner_time?: string;
  allergen_ids: string[];
  allergens?: any[];  // Enriched allergen objects
  message?: string;
  status: 'new' | 'acknowledged' | 'dismissed';
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
  updated_at: string;
}
```

### `acknowledge-alert.dto.ts`
```typescript
import { IsIn, IsOptional, IsString } from 'class-validator';

export class AcknowledgeAlertDto {
  @IsString()
  @IsIn(['acknowledged', 'dismissed'])
  status: 'acknowledged' | 'dismissed';

  @IsOptional()
  @IsString()
  acknowledged_by?: string;
}
```

### `create-guest-alert.dto.ts`
```typescript
import { IsArray, IsIn, IsOptional, IsString, IsUUID, IsInt } from 'class-validator';

export class CreateGuestAlertDto {
  @IsUUID()
  reservation_id: string;

  @IsString()
  @IsIn(['check_in', 'allergen_update', 'request', 'checkout'])
  alert_type: string;

  @IsString()
  room_number: string;

  @IsOptional()
  @IsString()
  guest_name?: string;

  @IsOptional()
  @IsInt()
  party_size?: number;

  @IsOptional()
  @IsString()
  dinner_time?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  allergen_ids?: string[];

  @IsOptional()
  @IsString()
  message?: string;
}
```

## Service Methods

```typescript
@Injectable()
export class GuestAlertsService {
  constructor(
    private supabase: SupabaseService,
    private allergensService: AllergensService,
  ) {}

  async findAll(status?: string, type?: string): Promise<GuestAlertResponse[]> {
    let query = this.supabase.getClient()
      .from('guest_alerts')
      .select('*')
      .eq('restaurant_id', this.supabase.getRestaurantId())
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('alert_type', type);

    const { data, error } = await query;
    if (error) throw new InternalServerErrorException(error.message);

    // Enrich with allergen details
    return Promise.all(data.map(alert => this.enrichWithAllergens(alert)));
  }

  async acknowledge(id: string, dto: AcknowledgeAlertDto): Promise<GuestAlertResponse> {
    const { data, error } = await this.supabase.getClient()
      .from('guest_alerts')
      .update({
        status: dto.status,
        acknowledged_by: dto.acknowledged_by,
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return this.enrichWithAllergens(data);
  }

  private async enrichWithAllergens(alert: any): Promise<GuestAlertResponse> {
    if (!alert.allergen_ids || alert.allergen_ids.length === 0) {
      return { ...alert, allergens: [] };
    }

    const allergens = await this.allergensService.findByIds(alert.allergen_ids);
    return { ...alert, allergens };
  }
}
```

## Alert Types

| Type | When Created | Color |
|------|--------------|-------|
| `check_in` | Guest checks in with allergens | Green border |
| `allergen_update` | Guest updates allergens via mobile | Orange border |
| `request` | Guest makes special request | Blue border |
| `checkout` | Guest checks out (info only) | Gray border |

## Checklist

- [ ] Create `guest-alerts.module.ts`
- [ ] Create `guest-alerts.controller.ts`
- [ ] Create `guest-alerts.service.ts`
- [ ] Create DTOs
- [ ] Add `findByIds()` method to `AllergensService`
- [ ] Register in `app.module.ts`
- [ ] Test endpoints with Swagger

import { ApiProperty } from '@nestjs/swagger';

export class GuestAlertResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  restaurant_id: string;

  @ApiProperty()
  reservation_id: string;

  @ApiProperty({ enum: ['check_in', 'allergy_update', 'special_request', 'other'] })
  alert_type: string;

  @ApiProperty()
  room_number: string;

  @ApiProperty()
  guest_name: string;

  @ApiProperty()
  party_size: number;

  @ApiProperty({ required: false })
  dinner_time?: string;

  @ApiProperty({ type: [String] })
  allergen_ids: string[];

  @ApiProperty({ required: false })
  message?: string;

  @ApiProperty({ enum: ['new', 'acknowledged', 'resolved'] })
  status: string;

  @ApiProperty({ required: false })
  acknowledged_by?: string;

  @ApiProperty({ required: false })
  acknowledged_at?: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;

  // Enriched data
  @ApiProperty({ required: false, type: [Object] })
  allergens?: any[];
}

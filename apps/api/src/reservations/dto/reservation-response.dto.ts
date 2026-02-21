import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReservationResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  restaurant_id: string;

  @ApiProperty({ enum: ['rakuten', 'jalan', 'booking_com', 'expedia', 'agoda', 'direct', 'phone', 'walk_in'] })
  booking_source: string;

  @ApiPropertyOptional()
  booking_reference?: string;

  @ApiPropertyOptional()
  guest_token?: string;

  @ApiProperty()
  guest_name: string;

  @ApiPropertyOptional()
  guest_name_kana?: string;

  @ApiProperty()
  party_size: number;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiProperty()
  room_number: string;

  @ApiPropertyOptional()
  room_name?: string;

  @ApiProperty()
  check_in_date: string;

  @ApiProperty()
  check_out_date: string;

  @ApiPropertyOptional()
  plan_name?: string;

  @ApiPropertyOptional({ enum: ['2meals', 'dinner_only', 'breakfast_only', 'no_meals', 'room_only'] })
  meal_plan?: string;

  @ApiPropertyOptional()
  total_price?: number;

  @ApiPropertyOptional()
  dinner_time?: string;

  @ApiPropertyOptional()
  breakfast_time?: string;

  @ApiProperty({ type: [String] })
  allergen_ids: string[];

  @ApiPropertyOptional({ type: Array })
  allergens?: any[];

  @ApiPropertyOptional()
  dietary_notes?: string;

  @ApiPropertyOptional()
  special_requests?: string;

  @ApiProperty({ enum: ['confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'] })
  status: string;

  @ApiPropertyOptional()
  checked_in_at?: string;

  @ApiPropertyOptional()
  checked_in_by?: string;

  @ApiPropertyOptional()
  checked_out_at?: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;

  @ApiProperty({ description: 'Total number of nights for this reservation' })
  total_nights: number;

  @ApiProperty({ description: 'Current night of stay (1-indexed, based on today)' })
  current_stay_night: number;
}

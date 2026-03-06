import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoomResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organization_id: string;

  @ApiProperty()
  room_number: string;

  @ApiPropertyOptional()
  room_name?: string;

  @ApiPropertyOptional()
  room_type?: string;

  @ApiProperty()
  capacity: number;

  @ApiPropertyOptional()
  floor?: number;

  @ApiProperty({ enum: ['available', 'occupied', 'cleaning', 'maintenance', 'out_of_order'] })
  status: string;

  @ApiPropertyOptional()
  current_reservation_id?: string;

  @ApiPropertyOptional()
  image_url?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  amenities?: string[];

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;
}

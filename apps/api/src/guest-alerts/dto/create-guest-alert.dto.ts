import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, IsIn } from 'class-validator';

export class CreateGuestAlertDto {
  @ApiProperty()
  @IsString()
  reservation_id: string;

  @ApiProperty({ enum: ['check_in', 'allergy_update', 'special_request', 'other'] })
  @IsIn(['check_in', 'allergy_update', 'special_request', 'other'])
  alert_type: string;

  @ApiProperty()
  @IsString()
  room_number: string;

  @ApiProperty()
  @IsString()
  guest_name: string;

  @ApiProperty()
  @IsNumber()
  party_size: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dinner_time?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergen_ids?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dietary_notes?: string;
}

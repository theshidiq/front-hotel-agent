import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsEmail, IsIn, Min, IsDateString } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ enum: ['rakuten', 'jalan', 'booking_com', 'expedia', 'agoda', 'direct', 'phone', 'walk_in'] })
  @IsString()
  @IsIn(['rakuten', 'jalan', 'booking_com', 'expedia', 'agoda', 'direct', 'phone', 'walk_in'])
  booking_source: string;

  @ApiPropertyOptional({ description: 'External booking reference ID' })
  @IsOptional()
  @IsString()
  booking_reference?: string;

  @ApiProperty({ description: 'Guest full name' })
  @IsString()
  guest_name: string;

  @ApiPropertyOptional({ description: 'Guest name in katakana' })
  @IsOptional()
  @IsString()
  guest_name_kana?: string;

  @ApiProperty({ description: 'Number of guests', minimum: 1 })
  @IsInt()
  @Min(1)
  party_size: number;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Room number' })
  @IsString()
  room_number: string;

  @ApiPropertyOptional({ description: 'Room name' })
  @IsOptional()
  @IsString()
  room_name?: string;

  @ApiProperty({ description: 'Check-in date', example: '2026-02-06' })
  @IsDateString()
  check_in_date: string;

  @ApiProperty({ description: 'Check-out date', example: '2026-02-08' })
  @IsDateString()
  check_out_date: string;

  @ApiPropertyOptional({ description: 'Plan name' })
  @IsOptional()
  @IsString()
  plan_name?: string;

  @ApiPropertyOptional({ enum: ['2meals', 'dinner_only', 'breakfast_only', 'no_meals', 'room_only'] })
  @IsOptional()
  @IsString()
  @IsIn(['2meals', 'dinner_only', 'breakfast_only', 'no_meals', 'room_only'])
  meal_plan?: string;

  @ApiPropertyOptional({ description: 'Total price in JPY' })
  @IsOptional()
  @IsInt()
  @Min(0)
  total_price?: number;
}

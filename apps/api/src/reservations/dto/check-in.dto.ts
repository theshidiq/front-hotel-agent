import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsUUID, Matches } from 'class-validator';

export class CheckInDto {
  @ApiPropertyOptional({ description: 'Dinner time in HH:MM format', example: '18:30' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'dinner_time must be in HH:MM format' })
  dinner_time?: string;

  @ApiPropertyOptional({ description: 'Breakfast time in HH:MM format', example: '08:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'breakfast_time must be in HH:MM format' })
  breakfast_time?: string;

  @ApiPropertyOptional({ description: 'Array of allergen UUIDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  allergen_ids?: string[];

  @ApiPropertyOptional({ description: 'Dietary notes or restrictions' })
  @IsOptional()
  @IsString()
  dietary_notes?: string;

  @ApiPropertyOptional({ description: 'Special requests from guest' })
  @IsOptional()
  @IsString()
  special_requests?: string;

  @ApiPropertyOptional({ description: 'Staff name who processed check-in' })
  @IsOptional()
  @IsString()
  checked_in_by?: string;
}

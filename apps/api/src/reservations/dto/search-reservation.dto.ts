import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class SearchReservationDto {
  @ApiPropertyOptional({ description: 'Guest name (partial match)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Phone number (partial match)' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Check-in date (defaults to today)', example: '2026-02-06' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

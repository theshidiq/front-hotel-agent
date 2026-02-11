import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSeasonalMenuDto {
  @ApiProperty({ description: 'Seasonal menu name', example: 'Summer 2025' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)', example: '2025-06-01' })
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)', example: '2025-08-31' })
  @IsDateString()
  @IsOptional()
  end_date?: string;
}

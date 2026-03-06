import { IsString, IsOptional, IsBoolean, IsNumber, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStaffDto {
  @ApiProperty({ description: 'Staff member name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Position/role' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ description: 'Department (kitchen, service, etc.)' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Employment type (regular, part-time, temporary)' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Employment status (社員, 派遣, パート)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Display order in list' })
  @IsOptional()
  @IsNumber()
  staff_order?: number;

  @ApiPropertyOptional({ description: 'Start period (JSONB: {year, month, day})' })
  @IsOptional()
  @IsObject()
  start_period?: { year: number; month: number; day: number };

  @ApiPropertyOptional({ description: 'End period (JSONB: {year, month, day})' })
  @IsOptional()
  @IsObject()
  end_period?: { year: number; month: number; day: number };
}

export class UpdateStaffDto {
  @ApiPropertyOptional({ description: 'Staff member name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Position/role' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ description: 'Department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Employment type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Employment status (社員, 派遣, パート)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  staff_order?: number;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Start period' })
  @IsOptional()
  @IsObject()
  start_period?: { year: number; month: number; day: number };

  @ApiPropertyOptional({ description: 'End period' })
  @IsOptional()
  @IsObject()
  end_period?: { year: number; month: number; day: number };
}

export class ReorderStaffDto {
  @ApiProperty({ description: 'Array of staff IDs in new order' })
  @IsString({ each: true })
  staffIds: string[];
}

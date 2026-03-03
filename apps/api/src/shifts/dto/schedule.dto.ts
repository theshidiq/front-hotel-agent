import { IsString, IsOptional, IsObject, IsNumber, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftSymbol } from '../interfaces/shift.interface';

export class CreatePeriodDto {
  @ApiProperty({ description: 'Period label (e.g., "January-February 2025")' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)' })
  @IsString()
  start_date: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)' })
  @IsString()
  end_date: string;
}

export class UpdateCellDto {
  @ApiProperty({ description: 'Period ID' })
  @IsString()
  periodId: string;

  @ApiProperty({ description: 'Staff member ID' })
  @IsString()
  staffId: string;

  @ApiProperty({ description: 'Date (YYYY-MM-DD)' })
  @IsString()
  date: string;

  @ApiProperty({ description: 'Shift symbol (×, △, ◇, ○, etc.)' })
  @IsString()
  symbol: ShiftSymbol;
}

export class BulkUpdateCellsDto {
  @ApiProperty({ description: 'Array of cell updates', type: [UpdateCellDto] })
  @IsArray()
  updates: UpdateCellDto[];
}

export class OptimizeRequestDto {
  @ApiProperty({ description: 'Period ID to optimize' })
  @IsString()
  periodId: string;

  @ApiPropertyOptional({ description: 'Solver timeout in seconds (default: 30)' })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({ description: 'Custom penalty weights override' })
  @IsOptional()
  @IsObject()
  penaltyWeights?: Record<string, number>;

  @ApiPropertyOptional({ description: 'Preserve pre-filled cells' })
  @IsOptional()
  @IsBoolean()
  preservePrefilled?: boolean;
}

export class ScheduleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  period: {
    id: string;
    label: string;
    start_date: string;
    end_date: string;
  };

  @ApiProperty({ description: 'Schedule data: { staffId: { date: symbol } }' })
  schedule_data: Record<string, Record<string, string>>;

  @ApiProperty()
  staff: Array<{
    id: string;
    name: string;
    position?: string;
    department?: string;
    status?: string;
    staff_order: number;
  }>;

  @ApiPropertyOptional()
  metadata?: {
    status: string;
    manager_name?: string;
  };
}

export class OptimizeResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ description: 'Optimized schedule data' })
  schedule: Record<string, Record<string, string>>;

  @ApiProperty({ description: 'Solve time in seconds' })
  solve_time: number;

  @ApiProperty({ description: 'Whether solution is optimal' })
  is_optimal: boolean;

  @ApiPropertyOptional({ description: 'Constraint violations (for soft constraints)' })
  violations?: Array<{
    type: string;
    description: string;
    penalty: number;
  }>;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;
}

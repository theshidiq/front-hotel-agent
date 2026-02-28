import { IsString, IsOptional, IsObject, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDailyLimitsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minOffPerDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxOffPerDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minEarlyPerDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxEarlyPerDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minWorkingStaffPerDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_hard_constraint?: boolean;
}

export class UpdateMonthlyLimitsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  min_count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  max_count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_hard_constraint?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  exclude_calendar_rules?: boolean;
}

export class UpdatePenaltyWeightsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  staffGroup?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fiveDayRest?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  monthlyLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  dailyLimitMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  dailyLimitMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  adjacentConflict?: number;
}

export class UpdateHardConstraintsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dailyLimits?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fiveDayRest?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  staffGroups?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  monthlyLimits?: boolean;
}

export class UpdateSolverConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  penalty_weights?: UpdatePenaltyWeightsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  hard_constraints?: UpdateHardConstraintsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  numWorkers?: number;
}

export class CreateCalendarRuleDto {
  @ApiProperty({ description: 'Date (YYYY-MM-DD)' })
  @IsString()
  date: string;

  @ApiProperty({ description: 'Rule type: must_work or must_day_off' })
  @IsString()
  rule_type: 'must_work' | 'must_day_off';

  @ApiPropertyOptional({ description: 'Reason for the rule' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateStaffGroupDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  group_config?: Record<string, any>;
}

export class UpdateStaffGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  group_config?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

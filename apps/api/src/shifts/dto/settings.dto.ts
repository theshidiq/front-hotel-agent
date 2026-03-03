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

  @ApiPropertyOptional({ description: 'Staff type limits stored in limit_config.staffTypeLimits' })
  @IsOptional()
  @IsObject()
  staffTypeLimits?: Record<string, { minOff?: number; maxOff?: number; maxEarly?: number; isHard?: boolean }>;
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

// ==================== PRIORITY RULES ====================

export class CreatePriorityRuleDto {
  @ApiProperty({ description: 'Rule name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Array of staff IDs this rule applies to' })
  @IsOptional()
  staff_ids?: string[];

  @ApiProperty({ description: 'Rule type: preferred_shift, avoid_shift, required_off, avoid_shift_with_exceptions' })
  @IsString()
  rule_type: 'preferred_shift' | 'avoid_shift' | 'required_off' | 'avoid_shift_with_exceptions';

  @ApiProperty({ description: 'Shift type: early, late, off, any' })
  @IsString()
  shift_type: 'early' | 'late' | 'off' | 'any';

  @ApiProperty({ description: 'Days of week (0=Sun to 6=Sat)' })
  days_of_week: number[];

  @ApiPropertyOptional({ description: 'Exception shifts allowed (for avoid_shift_with_exceptions)' })
  @IsOptional()
  allowed_shifts?: string[];

  @ApiPropertyOptional({ description: 'Priority level 1-5' })
  @IsOptional()
  @IsNumber()
  priority_level?: number;

  @ApiPropertyOptional({ description: 'Is this a hard constraint?' })
  @IsOptional()
  @IsBoolean()
  is_hard_constraint?: boolean;

  @ApiPropertyOptional({ description: 'Penalty weight for violations' })
  @IsOptional()
  @IsNumber()
  penalty_weight?: number;

  @ApiPropertyOptional({ description: 'Effective from date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  effective_from?: string;

  @ApiPropertyOptional({ description: 'Effective until date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  effective_until?: string;
}

export class UpdatePriorityRuleDto {
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
  staff_ids?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rule_type?: 'preferred_shift' | 'avoid_shift' | 'required_off' | 'avoid_shift_with_exceptions';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shift_type?: 'early' | 'late' | 'off' | 'any';

  @ApiPropertyOptional()
  @IsOptional()
  days_of_week?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  allowed_shifts?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priority_level?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_hard_constraint?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  penalty_weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  effective_from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  effective_until?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

// ==================== EARLY SHIFT PREFERENCES ====================

export class CreateEarlyShiftPreferenceDto {
  @ApiProperty({ description: 'Staff ID' })
  @IsString()
  staff_id: string;

  @ApiProperty({ description: 'Can do early shift' })
  @IsBoolean()
  can_do_early_shift: boolean;

  @ApiPropertyOptional({ description: 'Date this applies to (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  applies_to_date?: string;

  @ApiPropertyOptional({ description: 'Source: individual or bulk_assignment' })
  @IsOptional()
  @IsString()
  preference_source?: 'individual' | 'bulk_assignment';
}

export class UpdateEarlyShiftPreferenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_do_early_shift?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  applies_to_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preference_source?: 'individual' | 'bulk_assignment';
}

export class BulkEarlyShiftPreferenceDto {
  @ApiProperty({ description: 'Array of staff preferences' })
  preferences: Array<{
    staff_id: string;
    can_do_early_shift: boolean;
    applies_to_date?: string;
  }>;
}

// ==================== PERIOD CONFIGURATION ====================

export class UpdatePeriodConfigurationDto {
  @ApiPropertyOptional({ description: 'Start day of month (1-31)' })
  @IsOptional()
  @IsNumber()
  start_day?: number;

  @ApiPropertyOptional({ description: 'End day of month (1-31)' })
  @IsOptional()
  @IsNumber()
  end_day?: number;

  @ApiPropertyOptional({ description: 'Period length in days' })
  @IsOptional()
  @IsNumber()
  period_length_days?: number;
}

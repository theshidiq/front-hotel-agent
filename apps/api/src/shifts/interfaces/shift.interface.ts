export interface ScheduleStaff {
  id: string;
  organization_id: string;
  name: string;
  position?: string;
  department?: string;
  type?: string; // regular, part-time, temporary
  status?: string; // 社員, 派遣, パート
  staff_order?: number;
  start_period?: { year: number; month: number; day: number };
  end_period?: { year: number; month: number; day: number };
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ScheduleStaffGroup {
  id: string;
  organization_id: string;
  version_id: string;
  name: string;
  description?: string;
  color?: string;
  group_config?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchedulePeriod {
  id: string;
  start_date: string;
  end_date: string;
  label: string;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  schedule_data: Record<string, Record<string, string>>; // { staffId: { date: symbol } }
  metadata_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleMetadata {
  id: string;
  schedule_name: string;
  schedule_period_start: string;
  schedule_period_end: string;
  department?: string;
  manager_name?: string;
  status: 'draft' | 'published' | 'archived';
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CalendarRule {
  id: string;
  organization_id: string;
  date: string;
  rule_type: 'must_work' | 'must_day_off';
  reason?: string;
  created_at: string;
  updated_at: string;
}

export interface PriorityRule {
  id: string;
  organization_id: string;
  version_id: string;
  name: string;
  description?: string;
  priority_level: number;
  rule_definition: Record<string, any>;
  penalty_weight: number;
  is_hard_constraint: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyLimits {
  id: string;
  organization_id: string;
  version_id: string;
  name: string;
  limit_config: {
    minOffPerDay: number;
    maxOffPerDay: number;
    minEarlyPerDay: number;
    maxEarlyPerDay: number;
    minLatePerDay: number;
    maxLatePerDay: number;
    minWorkingStaffPerDay: number;
  };
  penalty_weight: number;
  is_hard_constraint: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthlyLimits {
  id: string;
  organization_id: string;
  version_id: string;
  name: string;
  limit_config: Record<string, any>;
  min_count?: number;
  max_count?: number;
  penalty_weight: number;
  is_hard_constraint: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ORToolsSolverConfig {
  id: string;
  organization_id: string;
  version_id?: string;
  name: string;
  preset: string;
  penalty_weights: {
    staffGroup: number;
    fiveDayRest: number;
    monthlyLimit: number;
    dailyLimitMax: number;
    dailyLimitMin: number;
    adjacentConflict: number;
  };
  solver_settings: {
    timeout: number;
    numWorkers: number;
  };
  hard_constraints: {
    dailyLimits: boolean;
    fiveDayRest: boolean;
    staffGroups: boolean;
    monthlyLimits: boolean;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Shift symbols
export type ShiftSymbol = '' | '○' | '×' | '△' | '◇' | '★' | '●' | '◎' | '▣' | '⊘';

export const SHIFT_SYMBOLS: Record<string, string> = {
  WORK: '',
  WORK_MARU: '○',
  OFF: '×',
  EARLY: '△',
  LATE: '◇',
  STAR: '★',
  FILLED_CIRCLE: '●',
  DOUBLE_CIRCLE: '◎',
  SQUARE: '▣',
  BACKUP: '⊘',
};

// Shift symbols used in Japanese restaurant scheduling
export type ShiftSymbol = '' | '○' | '×' | '△' | '◇' | '★' | '●' | '◎' | '▣' | '⊘';

export const SHIFT_SYMBOLS = {
	WORK: '' as ShiftSymbol,
	WORK_MARU: '○' as ShiftSymbol,
	OFF: '×' as ShiftSymbol,
	EARLY: '△' as ShiftSymbol,
	LATE: '◇' as ShiftSymbol,
	STAR: '★' as ShiftSymbol,
	FILLED_CIRCLE: '●' as ShiftSymbol,
	DOUBLE_CIRCLE: '◎' as ShiftSymbol,
	SQUARE: '▣' as ShiftSymbol,
	BACKUP: '⊘' as ShiftSymbol
} as const;

export const SHIFT_LABELS: Record<ShiftSymbol, string> = {
	'': '出勤',
	'○': '出勤',
	'×': '休み',
	'△': '早番',
	'◇': '遅番',
	'★': '管理',
	'●': '特別',
	'◎': '優先',
	'▣': '予備',
	'⊘': 'バックアップ'
};

export interface ScheduleStaff {
	id: string;
	restaurant_id: string;
	name: string;
	position?: string;
	department?: string;
	type?: string; // regular, part-time, temporary
	status?: string; // 社員, 派遣, パート
	staff_status?: string; // Alias for status (社員, 派遣, パート)
	staff_order?: number;
	start_period?: { year: number; month: number; day: number };
	end_period?: { year: number; month: number; day: number };
	is_active: boolean;
	metadata?: Record<string, unknown>;
	created_at: string;
	updated_at: string;
}

export interface ScheduleStaffGroup {
	id: string;
	restaurant_id: string;
	version_id: string;
	name: string;
	description?: string;
	group_config?: {
		color?: string;
		members?: string[];
		[key: string]: unknown;
	};
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
	settings?: Record<string, unknown>;
	created_at: string;
	updated_at: string;
}

export interface CalendarRule {
	id: string;
	restaurant_id: string;
	date: string;
	rule_type: 'must_work' | 'must_day_off';
	reason?: string;
	created_at: string;
	updated_at: string;
}

export interface DailyLimits {
	id: string;
	restaurant_id: string;
	version_id: string;
	name: string;
	limit_config: {
		minOffPerDay: number;
		maxOffPerDay: number;
		minEarlyPerDay: number;
		maxEarlyPerDay: number;
		minLatePerDay?: number;
		maxLatePerDay?: number;
		minWorkingStaffPerDay?: number;
	};
	penalty_weight: number;
	is_hard_constraint: boolean;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface MonthlyLimits {
	id: string;
	restaurant_id: string;
	version_id: string;
	name: string;
	limit_config: Record<string, unknown>;
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
	restaurant_id: string;
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

// Schedule response from API
export interface ScheduleResponse {
	period: SchedulePeriod;
	schedule: Schedule | null;
	staff: ScheduleStaff[];
}

// Optimization response
export interface OptimizeResponse {
	success: boolean;
	schedule?: Record<string, Record<string, string>>;
	solve_time?: number;
	is_optimal?: boolean;
	violations?: Array<{
		type: string;
		description: string;
		penalty: number;
	}>;
	error?: string;
}


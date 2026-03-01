import { getAuthHeaders } from '$lib/auth.svelte';
import type {
	ScheduleStaff,
	ScheduleStaffGroup,
	SchedulePeriod,
	CalendarRule,
	DailyLimits,
	MonthlyLimits,
	ORToolsSolverConfig,
	ScheduleResponse,
	OptimizeResponse
} from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
	return { ...extra, ...getAuthHeaders() };
}

async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Request failed' }));
		throw new Error(error.message || `HTTP ${response.status}`);
	}
	return response.json();
}

// ==================== STAFF ====================

export async function getShiftStaff(): Promise<ScheduleStaff[]> {
	const response = await fetch(`${API_URL}/shifts/staff`, {
		headers: authHeaders()
	});
	return handleResponse(response);
}

export interface CreateShiftStaffData {
	name: string;
	position?: string;
	department?: string;
	type?: string;
	status?: string;
	staff_order?: number;
	start_period?: { year: number; month: number; day: number };
	end_period?: { year: number; month: number; day: number };
}

export async function createShiftStaff(data: CreateShiftStaffData): Promise<ScheduleStaff> {
	const response = await fetch(`${API_URL}/shifts/staff`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export interface UpdateShiftStaffData {
	name?: string;
	position?: string;
	department?: string;
	type?: string;
	status?: string;
	staff_order?: number;
	is_active?: boolean;
	start_period?: { year: number; month: number; day: number };
	end_period?: { year: number; month: number; day: number };
}

export async function updateShiftStaff(id: string, data: UpdateShiftStaffData): Promise<ScheduleStaff> {
	const response = await fetch(`${API_URL}/shifts/staff/${id}`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export async function deleteShiftStaff(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/shifts/staff/${id}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Delete failed' }));
		throw new Error(error.message);
	}
}

export async function reorderShiftStaff(staffIds: string[]): Promise<void> {
	const response = await fetch(`${API_URL}/shifts/staff/reorder`, {
		method: 'PUT',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ staffIds })
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Reorder failed' }));
		throw new Error(error.message);
	}
}

// ==================== PERIODS ====================

export async function getShiftPeriods(): Promise<SchedulePeriod[]> {
	const response = await fetch(`${API_URL}/shifts/periods`, {
		headers: authHeaders()
	});
	return handleResponse(response);
}

export interface CreatePeriodData {
	label: string;
	start_date: string;
	end_date: string;
}

export async function createShiftPeriod(data: CreatePeriodData): Promise<SchedulePeriod> {
	const response = await fetch(`${API_URL}/shifts/periods`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export async function deleteShiftPeriod(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/shifts/periods/${id}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Delete failed' }));
		throw new Error(error.message);
	}
}

// ==================== SCHEDULE ====================

export async function getSchedule(periodId: string): Promise<ScheduleResponse> {
	const response = await fetch(`${API_URL}/shifts/schedule/${periodId}`, {
		headers: authHeaders()
	});
	return handleResponse(response);
}

export interface CellUpdate {
	staffId: string;
	date: string;
	symbol: string;
}

export async function bulkUpdateCells(periodId: string, updates: CellUpdate[]): Promise<void> {
	const response = await fetch(`${API_URL}/shifts/schedule/${periodId}/cells`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ updates })
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Update failed' }));
		throw new Error(error.message);
	}
}

// ==================== OPTIMIZATION ====================

export interface OptimizeOptions {
	periodId: string;
	timeout?: number;
	penaltyWeights?: Record<string, number>;
	preservePrefilled?: boolean;
}

export async function optimizeSchedule(options: OptimizeOptions): Promise<OptimizeResponse> {
	const response = await fetch(`${API_URL}/shifts/optimize`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(options)
	});
	return handleResponse(response);
}

export async function checkOptimizerHealth(): Promise<{ healthy: boolean; url: string }> {
	const response = await fetch(`${API_URL}/shifts/optimize/health`, {
		headers: authHeaders()
	});
	return handleResponse(response);
}

// ==================== CALENDAR RULES ====================

export async function getCalendarRules(startDate?: string, endDate?: string): Promise<CalendarRule[]> {
	const params = new URLSearchParams();
	if (startDate) params.append('startDate', startDate);
	if (endDate) params.append('endDate', endDate);

	const url = params.toString()
		? `${API_URL}/shifts/settings/calendar-rules?${params}`
		: `${API_URL}/shifts/settings/calendar-rules`;

	const response = await fetch(url, {
		headers: authHeaders()
	});
	return handleResponse(response);
}

export interface CreateCalendarRuleData {
	date: string;
	rule_type: 'must_work' | 'must_day_off';
	reason?: string;
}

export async function createCalendarRule(data: CreateCalendarRuleData): Promise<CalendarRule> {
	const response = await fetch(`${API_URL}/shifts/settings/calendar-rules`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export async function deleteCalendarRule(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/shifts/settings/calendar-rules/${id}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Delete failed' }));
		throw new Error(error.message);
	}
}

// ==================== DAILY LIMITS ====================

export async function getDailyLimits(): Promise<DailyLimits | null> {
	const response = await fetch(`${API_URL}/shifts/settings/daily-limits`, {
		headers: authHeaders()
	});
	if (response.status === 404) return null;
	return handleResponse(response);
}

export interface UpdateDailyLimitsData {
	minOffPerDay?: number;
	maxOffPerDay?: number;
	minEarlyPerDay?: number;
	maxEarlyPerDay?: number;
	minWorkingStaffPerDay?: number;
	is_hard_constraint?: boolean;
}

export async function updateDailyLimits(data: UpdateDailyLimitsData): Promise<DailyLimits> {
	const response = await fetch(`${API_URL}/shifts/settings/daily-limits`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

// ==================== MONTHLY LIMITS ====================

export async function getMonthlyLimits(): Promise<MonthlyLimits | null> {
	const response = await fetch(`${API_URL}/shifts/settings/monthly-limits`, {
		headers: authHeaders()
	});
	if (response.status === 404) return null;
	return handleResponse(response);
}

export interface UpdateMonthlyLimitsData {
	min_count?: number;
	max_count?: number;
	is_hard_constraint?: boolean;
	exclude_calendar_rules?: boolean;
}

export async function updateMonthlyLimits(data: UpdateMonthlyLimitsData): Promise<MonthlyLimits> {
	const response = await fetch(`${API_URL}/shifts/settings/monthly-limits`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

// ==================== SOLVER CONFIG ====================

export async function getSolverConfig(): Promise<ORToolsSolverConfig | null> {
	const response = await fetch(`${API_URL}/shifts/settings/solver-config`, {
		headers: authHeaders()
	});
	if (response.status === 404) return null;
	return handleResponse(response);
}

export interface UpdateSolverConfigData {
	penalty_weights?: {
		staffGroup?: number;
		fiveDayRest?: number;
		monthlyLimit?: number;
		dailyLimitMax?: number;
		dailyLimitMin?: number;
		adjacentConflict?: number;
	};
	hard_constraints?: {
		dailyLimits?: boolean;
		fiveDayRest?: boolean;
		staffGroups?: boolean;
		monthlyLimits?: boolean;
	};
	timeout?: number;
	numWorkers?: number;
}

export async function updateSolverConfig(data: UpdateSolverConfigData): Promise<ORToolsSolverConfig> {
	const response = await fetch(`${API_URL}/shifts/settings/solver-config`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

// ==================== STAFF GROUPS ====================

export async function getStaffGroups(): Promise<ScheduleStaffGroup[]> {
	const response = await fetch(`${API_URL}/shifts/settings/staff-groups`, {
		headers: authHeaders()
	});
	return handleResponse(response);
}

export interface CreateStaffGroupData {
	name: string;
	description?: string;
	color?: string;
	group_config?: Record<string, unknown>;
}

export async function createStaffGroup(data: CreateStaffGroupData): Promise<ScheduleStaffGroup> {
	const response = await fetch(`${API_URL}/shifts/settings/staff-groups`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export interface UpdateStaffGroupData {
	name?: string;
	description?: string;
	color?: string;
	group_config?: Record<string, unknown>;
	is_active?: boolean;
}

export async function updateStaffGroup(id: string, data: UpdateStaffGroupData): Promise<ScheduleStaffGroup> {
	const response = await fetch(`${API_URL}/shifts/settings/staff-groups/${id}`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export async function deleteStaffGroup(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/shifts/settings/staff-groups/${id}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Delete failed' }));
		throw new Error(error.message);
	}
}

export async function getStaffGroupMembers(groupId: string): Promise<Array<{ staff_id: string; group_id: string }>> {
	const response = await fetch(`${API_URL}/shifts/settings/staff-groups/${groupId}/members`, {
		headers: authHeaders()
	});
	return handleResponse(response);
}

export async function setStaffGroupMembers(groupId: string, staffIds: string[]): Promise<void> {
	const response = await fetch(`${API_URL}/shifts/settings/staff-groups/${groupId}/members`, {
		method: 'PUT',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ staffIds })
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Update failed' }));
		throw new Error(error.message);
	}
}

// ==================== PRIORITY RULES ====================

export interface PriorityRule {
	id: string;
	restaurant_id: string;
	name: string;
	description?: string;
	staff_ids?: string[];
	rule_type: 'preferred_shift' | 'avoid_shift' | 'required_off' | 'avoid_shift_with_exceptions';
	shift_type: 'early' | 'late' | 'off' | 'any';
	days_of_week: number[];
	allowed_shifts?: string[];
	priority_level?: number;
	is_hard_constraint: boolean;
	penalty_weight?: number;
	effective_from?: string;
	effective_until?: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export async function getPriorityRules(): Promise<PriorityRule[]> {
	const response = await fetch(`${API_URL}/shifts/settings/priority-rules`, {
		headers: authHeaders()
	});
	return handleResponse(response);
}

export interface CreatePriorityRuleData {
	name: string;
	description?: string;
	staff_ids?: string[];
	rule_type: 'preferred_shift' | 'avoid_shift' | 'required_off' | 'avoid_shift_with_exceptions';
	shift_type: 'early' | 'late' | 'off' | 'any';
	days_of_week: number[];
	allowed_shifts?: string[];
	priority_level?: number;
	is_hard_constraint?: boolean;
	penalty_weight?: number;
	effective_from?: string;
	effective_until?: string;
}

export async function createPriorityRule(data: CreatePriorityRuleData): Promise<PriorityRule> {
	const response = await fetch(`${API_URL}/shifts/settings/priority-rules`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export interface UpdatePriorityRuleData {
	name?: string;
	description?: string;
	staff_ids?: string[];
	rule_type?: 'preferred_shift' | 'avoid_shift' | 'required_off' | 'avoid_shift_with_exceptions';
	shift_type?: 'early' | 'late' | 'off' | 'any';
	days_of_week?: number[];
	allowed_shifts?: string[];
	priority_level?: number;
	is_hard_constraint?: boolean;
	penalty_weight?: number;
	effective_from?: string;
	effective_until?: string;
	is_active?: boolean;
}

export async function updatePriorityRule(id: string, data: UpdatePriorityRuleData): Promise<PriorityRule> {
	const response = await fetch(`${API_URL}/shifts/settings/priority-rules/${id}`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export async function deletePriorityRule(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/shifts/settings/priority-rules/${id}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Delete failed' }));
		throw new Error(error.message);
	}
}

// ==================== EARLY SHIFT PREFERENCES ====================

export interface EarlyShiftPreference {
	id: string;
	restaurant_id: string;
	staff_id: string;
	can_do_early_shift: boolean;
	applies_to_date?: string;
	preference_source: 'individual' | 'bulk_assignment';
	created_at: string;
	updated_at: string;
}

export async function getEarlyShiftPreferences(): Promise<EarlyShiftPreference[]> {
	const response = await fetch(`${API_URL}/shifts/settings/early-shift-preferences`, {
		headers: authHeaders()
	});
	return handleResponse(response);
}

export interface CreateEarlyShiftPreferenceData {
	staff_id: string;
	can_do_early_shift: boolean;
	applies_to_date?: string;
	preference_source?: 'individual' | 'bulk_assignment';
}

export async function createEarlyShiftPreference(data: CreateEarlyShiftPreferenceData): Promise<EarlyShiftPreference> {
	const response = await fetch(`${API_URL}/shifts/settings/early-shift-preferences`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export interface BulkEarlyShiftPreferenceData {
	preferences: Array<{
		staff_id: string;
		can_do_early_shift: boolean;
		applies_to_date?: string;
	}>;
}

export async function bulkUpsertEarlyShiftPreferences(data: BulkEarlyShiftPreferenceData): Promise<void> {
	const response = await fetch(`${API_URL}/shifts/settings/early-shift-preferences/bulk`, {
		method: 'PUT',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Bulk update failed' }));
		throw new Error(error.message);
	}
}

export interface UpdateEarlyShiftPreferenceData {
	can_do_early_shift?: boolean;
	applies_to_date?: string;
	preference_source?: 'individual' | 'bulk_assignment';
}

export async function updateEarlyShiftPreference(id: string, data: UpdateEarlyShiftPreferenceData): Promise<EarlyShiftPreference> {
	const response = await fetch(`${API_URL}/shifts/settings/early-shift-preferences/${id}`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export async function deleteEarlyShiftPreference(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/shifts/settings/early-shift-preferences/${id}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Delete failed' }));
		throw new Error(error.message);
	}
}

// ==================== PERIOD CONFIGURATION ====================

export interface PeriodConfiguration {
	id: string;
	restaurant_id: string;
	start_day: number;
	end_day: number;
	period_length_days?: number;
	created_at: string;
	updated_at: string;
}

export async function getPeriodConfiguration(): Promise<PeriodConfiguration | null> {
	const response = await fetch(`${API_URL}/shifts/settings/period-configuration`, {
		headers: authHeaders()
	});
	if (response.status === 404) return null;
	return handleResponse(response);
}

export interface UpdatePeriodConfigurationData {
	start_day?: number;
	end_day?: number;
	period_length_days?: number;
}

export async function updatePeriodConfiguration(data: UpdatePeriodConfigurationData): Promise<PeriodConfiguration> {
	const response = await fetch(`${API_URL}/shifts/settings/period-configuration`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export async function regeneratePeriods(): Promise<SchedulePeriod[]> {
	const response = await fetch(`${API_URL}/shifts/settings/periods/regenerate`, {
		method: 'POST',
		headers: authHeaders()
	});
	return handleResponse(response);
}

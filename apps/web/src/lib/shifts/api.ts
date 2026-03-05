import { getAuthHeaders, refreshAuthToken } from '$lib/auth.svelte';
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

// ==================== CACHE LAYER ====================

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	expiresAt: number;
}

interface CacheConfig {
	ttl: number; // Time to live in ms
	staleWhileRevalidate?: boolean;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const SCHEDULE_TTL = 2 * 60 * 1000; // 2 minutes for schedule data
const STATIC_TTL = 10 * 60 * 1000; // 10 minutes for static data like settings

class APICache {
	private cache = new Map<string, CacheEntry<unknown>>();
	private pendingRequests = new Map<string, Promise<unknown>>();
	private prefetchQueue: string[] = [];

	get<T>(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		const now = Date.now();
		if (now > entry.expiresAt) {
			this.cache.delete(key);
			return null;
		}

		return entry.data as T;
	}

	set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
		const now = Date.now();
		this.cache.set(key, {
			data,
			timestamp: now,
			expiresAt: now + ttl
		});
	}

	invalidate(pattern?: string): void {
		if (!pattern) {
			this.cache.clear();
			return;
		}

		for (const key of this.cache.keys()) {
			if (key.includes(pattern)) {
				this.cache.delete(key);
			}
		}
	}

	invalidateSchedule(periodId?: string): void {
		if (periodId) {
			this.cache.delete(`schedule:${periodId}`);
		} else {
			this.invalidate('schedule:');
		}
	}

	// Deduplicate concurrent requests
	async dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
		const pending = this.pendingRequests.get(key);
		if (pending) {
			return pending as Promise<T>;
		}

		const promise = fetcher().finally(() => {
			this.pendingRequests.delete(key);
		});

		this.pendingRequests.set(key, promise);
		return promise;
	}

	// Get cache stats for debugging
	getStats(): { size: number; keys: string[] } {
		return {
			size: this.cache.size,
			keys: Array.from(this.cache.keys())
		};
	}
}

export const apiCache = new APICache();

// ==================== PREFETCH MANAGER ====================

class PrefetchManager {
	private prefetchedPeriods = new Set<string>();
	private prefetching = false;

	async prefetchAllPeriodSchedules(periods: SchedulePeriod[]): Promise<void> {
		if (this.prefetching) return;
		this.prefetching = true;

		try {
			// Sort periods by start_date descending (most recent first)
			const sortedPeriods = [...periods].sort((a, b) =>
				b.start_date.localeCompare(a.start_date)
			);

			// Prefetch in batches of 3 for network efficiency
			const batchSize = 3;
			for (let i = 0; i < sortedPeriods.length; i += batchSize) {
				const batch = sortedPeriods.slice(i, i + batchSize);
				const promises = batch
					.filter((p) => !this.prefetchedPeriods.has(p.id))
					.map(async (period) => {
						try {
							// Only prefetch if not already cached
							if (!apiCache.get(`schedule:${period.id}`)) {
								await getSchedule(period.id);
								this.prefetchedPeriods.add(period.id);
							}
						} catch {
							// Silently fail prefetch - it's just optimization
						}
					});

				await Promise.all(promises);
			}
		} finally {
			this.prefetching = false;
		}
	}

	// Prefetch adjacent periods (prev/next) for quick navigation
	async prefetchAdjacentPeriods(
		currentPeriodId: string,
		periods: SchedulePeriod[]
	): Promise<void> {
		const sortedPeriods = [...periods].sort((a, b) =>
			a.start_date.localeCompare(b.start_date)
		);
		const currentIndex = sortedPeriods.findIndex((p) => p.id === currentPeriodId);

		if (currentIndex === -1) return;

		const adjacentIds: string[] = [];
		if (currentIndex > 0) adjacentIds.push(sortedPeriods[currentIndex - 1].id);
		if (currentIndex < sortedPeriods.length - 1)
			adjacentIds.push(sortedPeriods[currentIndex + 1].id);

		await Promise.all(
			adjacentIds.map(async (periodId) => {
				if (!apiCache.get(`schedule:${periodId}`)) {
					try {
						await getSchedule(periodId);
					} catch {
						// Silently fail
					}
				}
			})
		);
	}

	clear(): void {
		this.prefetchedPeriods.clear();
	}
}

export const prefetchManager = new PrefetchManager();

// ==================== HELPERS ====================

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
	return { ...extra, ...getAuthHeaders() };
}

async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Request failed' }));
		throw new Error(error.message || `HTTP ${response.status}`);
	}
	const text = await response.text();
	if (!text) return null as T;
	return JSON.parse(text);
}

/**
 * Drop-in replacement for `fetch` that automatically retries once on 401
 * by refreshing the Supabase access token. All mutation calls (POST/PATCH/DELETE)
 * should use this instead of raw `fetch` so they benefit from token refresh.
 */
async function apiFetch(url: string, options: RequestInit): Promise<Response> {
	const response = await fetch(url, options);
	if (response.status === 401) {
		const refreshed = await refreshAuthToken();
		if (refreshed) {
			return fetch(url, {
				...options,
				headers: { ...(options.headers as Record<string, string>), ...getAuthHeaders() }
			});
		}
	}
	return response;
}

/**
 * Fetch with automatic retry + exponential backoff.
 * Handles Supabase free-tier cold starts: the DB pauses after inactivity and
 * the first request after wake-up can fail or time out. Retrying transparently
 * means the user sees a brief delay instead of a broken skeleton forever.
 *
 * Retries on: network errors (TypeError), 502/503/504 gateway errors.
 * On 401: attempts one token refresh then retries the request with the new token.
 * Does NOT retry on other 4xx client errors.
 */
export async function fetchWithRetry(
	url: string,
	options: RequestInit,
	maxAttempts = 3,
	baseDelayMs = 1500
): Promise<Response> {
	let lastError: unknown;
	let tokenRefreshed = false;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const response = await fetch(url, options);

			// On 401: refresh token once and retry with fresh headers
			if (response.status === 401 && !tokenRefreshed) {
				tokenRefreshed = true;
				const refreshed = await refreshAuthToken();
				if (refreshed) {
					// Rebuild options with the new Authorization header
					options = {
						...options,
						headers: { ...(options.headers as Record<string, string>), ...getAuthHeaders() }
					};
					continue; // retry immediately, don't count as a gateway-error attempt
				}
				// Could not refresh — return the 401 so callers can handle it
				return response;
			}

			// Retry on gateway errors (Supabase/NestJS waking up)
			if (attempt < maxAttempts && (response.status === 502 || response.status === 503 || response.status === 504)) {
				await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
				continue;
			}

			return response;
		} catch (err) {
			lastError = err;
			if (attempt < maxAttempts) {
				await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
			}
		}
	}
	throw lastError;
}

// Cached fetch wrapper
async function cachedFetch<T>(
	cacheKey: string,
	fetcher: () => Promise<T>,
	ttl: number = DEFAULT_TTL
): Promise<T> {
	// Check cache first
	const cached = apiCache.get<T>(cacheKey);
	if (cached) {
		return cached;
	}

	// Deduplicate concurrent requests and fetch
	const data = await apiCache.dedupe(cacheKey, fetcher);
	apiCache.set(cacheKey, data, ttl);
	return data;
}

// ==================== STAFF ====================

export async function getShiftStaff(departmentId?: string): Promise<ScheduleStaff[]> {
	const cacheKey = departmentId ? `staff:dept:${departmentId}` : 'staff:all';
	const url = departmentId
		? `${API_URL}/shifts/staff?department_id=${departmentId}`
		: `${API_URL}/shifts/staff`;
	return cachedFetch(cacheKey, async () => {
		const response = await fetchWithRetry(url, {
			headers: authHeaders()
		});
		return handleResponse(response);
	}, STATIC_TTL);
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
	const response = await apiFetch(`${API_URL}/shifts/staff`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	const result = await handleResponse<ScheduleStaff>(response);
	// Invalidate staff cache on create
	apiCache.invalidate('staff:');
	return result;
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
	const response = await apiFetch(`${API_URL}/shifts/staff/${id}`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	const result = await handleResponse<ScheduleStaff>(response);
	// Invalidate staff cache on update
	apiCache.invalidate('staff:');
	return result;
}

export async function deleteShiftStaff(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/shifts/staff/${id}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Delete failed' }));
		throw new Error(error.message);
	}
	// Invalidate staff cache on delete
	apiCache.invalidate('staff:');
}

export async function reorderShiftStaff(staffIds: string[]): Promise<void> {
	const response = await apiFetch(`${API_URL}/shifts/staff/reorder`, {
		method: 'PUT',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ staffIds })
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Reorder failed' }));
		throw new Error(error.message);
	}
	// Invalidate staff cache on reorder
	apiCache.invalidate('staff:');
}

// ==================== PERIODS ====================

export async function getShiftPeriods(): Promise<SchedulePeriod[]> {
	return cachedFetch('periods:all', async () => {
		const response = await fetchWithRetry(`${API_URL}/shifts/periods`, {
			headers: authHeaders()
		});
		return handleResponse(response);
	}, STATIC_TTL);
}

export interface CreatePeriodData {
	label: string;
	start_date: string;
	end_date: string;
}

export async function createShiftPeriod(data: CreatePeriodData): Promise<SchedulePeriod> {
	const response = await apiFetch(`${API_URL}/shifts/periods`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	const result = await handleResponse<SchedulePeriod>(response);
	// Invalidate periods cache on create
	apiCache.invalidate('periods:');
	prefetchManager.clear();
	return result;
}

export async function deleteShiftPeriod(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/shifts/periods/${id}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Delete failed' }));
		throw new Error(error.message);
	}
	// Invalidate periods and schedule cache
	apiCache.invalidate('periods:');
	apiCache.invalidateSchedule(id);
	prefetchManager.clear();
}

// ==================== SCHEDULE ====================

export async function getSchedule(periodId: string, departmentId?: string): Promise<ScheduleResponse> {
	const cacheKey = departmentId ? `schedule:${periodId}:${departmentId}` : `schedule:${periodId}`;
	const url = departmentId
		? `${API_URL}/shifts/schedule/${periodId}?department_id=${departmentId}`
		: `${API_URL}/shifts/schedule/${periodId}`;
	return cachedFetch(cacheKey, async () => {
		const response = await fetchWithRetry(url, {
			headers: authHeaders()
		});
		return handleResponse(response);
	}, SCHEDULE_TTL);
}

// Force refresh schedule (bypass cache)
export async function getScheduleForce(periodId: string, departmentId?: string): Promise<ScheduleResponse> {
	const cacheKey = departmentId ? `schedule:${periodId}:${departmentId}` : `schedule:${periodId}`;
	apiCache.invalidate(cacheKey);
	return getSchedule(periodId, departmentId);
}

export interface CellUpdate {
	staffId: string;
	date: string;
	symbol: string;
}

export async function bulkUpdateCells(periodId: string, updates: CellUpdate[], departmentId?: string): Promise<void> {
	const cacheKey = departmentId ? `schedule:${periodId}:${departmentId}` : `schedule:${periodId}`;
	// Apply optimistic update to cache immediately
	const cachedSchedule = apiCache.get<ScheduleResponse>(cacheKey);
	if (cachedSchedule && cachedSchedule.schedule) {
		const optimisticData: ScheduleResponse = {
			...cachedSchedule,
			schedule: {
				...cachedSchedule.schedule,
				schedule_data: { ...cachedSchedule.schedule.schedule_data }
			}
		};
		for (const update of updates) {
			if (!optimisticData.schedule!.schedule_data[update.staffId]) {
				optimisticData.schedule!.schedule_data[update.staffId] = {};
			}
			optimisticData.schedule!.schedule_data[update.staffId][update.date] = update.symbol;
		}
		// Update cache with optimistic data
		apiCache.set(cacheKey, optimisticData, SCHEDULE_TTL);
	}

	const url = departmentId
		? `${API_URL}/shifts/schedule/${periodId}/cells?department_id=${departmentId}`
		: `${API_URL}/shifts/schedule/${periodId}/cells`;

	try {
		const response = await apiFetch(url, {
			method: 'PATCH',
			headers: authHeaders({ 'Content-Type': 'application/json' }),
			body: JSON.stringify({ updates })
		});
		if (!response.ok) {
			apiCache.invalidate(cacheKey);
			const error = await response.json().catch(() => ({ message: 'Update failed' }));
			throw new Error(error.message);
		}
	} catch (error) {
		apiCache.invalidate(cacheKey);
		throw error;
	}
}

export async function clearSchedule(periodId: string, departmentId?: string): Promise<void> {
	const cacheKey = departmentId ? `schedule:${periodId}:${departmentId}` : `schedule:${periodId}`;
	apiCache.invalidate(cacheKey);
	const url = departmentId
		? `${API_URL}/shifts/schedule/${periodId}/cells?department_id=${departmentId}`
		: `${API_URL}/shifts/schedule/${periodId}/cells`;
	const response = await apiFetch(url, {
		method: 'DELETE',
		headers: authHeaders()
	});
	if (!response.ok && response.status !== 204) {
		const error = await response.json().catch(() => ({ message: 'Clear failed' }));
		throw new Error(error.message);
	}
}

// ==================== OPTIMIZATION ====================

export interface OptimizeOptions {
	periodId: string;
	departmentId?: string;
	timeout?: number;
	penaltyWeights?: Record<string, number>;
	preservePrefilled?: boolean;
}

export async function optimizeSchedule(options: OptimizeOptions): Promise<OptimizeResponse> {
	const response = await apiFetch(`${API_URL}/shifts/optimize`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(options)
	});
	const result = await handleResponse<OptimizeResponse>(response);
	// Invalidate schedule cache after optimization
	const cacheKey = options.departmentId
		? `schedule:${options.periodId}:${options.departmentId}`
		: `schedule:${options.periodId}`;
	apiCache.invalidate(cacheKey);
	return result;
}

export async function checkOptimizerHealth(): Promise<{ healthy: boolean; url: string }> {
	const response = await apiFetch(`${API_URL}/shifts/optimize/health`, {
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
	const response = await apiFetch(`${API_URL}/shifts/settings/calendar-rules`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export async function deleteCalendarRule(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/shifts/settings/calendar-rules/${id}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Delete failed' }));
		throw new Error(error.message);
	}
}

// ==================== DAILY LIMITS ====================

export async function getDailyLimits(departmentId?: string): Promise<DailyLimits | null> {
	const url = departmentId
		? `${API_URL}/shifts/settings/daily-limits?department_id=${departmentId}`
		: `${API_URL}/shifts/settings/daily-limits`;
	const response = await apiFetch(url, { headers: authHeaders() });
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
	staffTypeLimits?: Record<string, { minOff?: number; maxOff?: number; maxEarly?: number; maxMonthlyEarlyShifts?: number; isHard?: boolean }>;
}

export async function updateDailyLimits(data: UpdateDailyLimitsData, departmentId?: string): Promise<DailyLimits> {
	const url = departmentId
		? `${API_URL}/shifts/settings/daily-limits?department_id=${departmentId}`
		: `${API_URL}/shifts/settings/daily-limits`;
	const response = await apiFetch(url, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

// ==================== MONTHLY LIMITS ====================

export async function getMonthlyLimits(departmentId?: string): Promise<MonthlyLimits | null> {
	const url = departmentId
		? `${API_URL}/shifts/settings/monthly-limits?department_id=${departmentId}`
		: `${API_URL}/shifts/settings/monthly-limits`;
	const response = await apiFetch(url, { headers: authHeaders() });
	if (response.status === 404) return null;
	return handleResponse(response);
}

export interface UpdateMonthlyLimitsData {
	min_count?: number;
	max_count?: number;
	is_hard_constraint?: boolean;
	exclude_calendar_rules?: boolean;
}

export async function updateMonthlyLimits(data: UpdateMonthlyLimitsData, departmentId?: string): Promise<MonthlyLimits> {
	const url = departmentId
		? `${API_URL}/shifts/settings/monthly-limits?department_id=${departmentId}`
		: `${API_URL}/shifts/settings/monthly-limits`;
	const response = await apiFetch(url, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export interface MonthlyLimitRecord {
	id: string;
	name: string;
	min_count: number | string | null;
	max_count: number | string | null;
	is_hard_constraint: boolean;
	limit_config: {
		scope?: 'all' | 'staff_status' | 'individual';
		targetIds?: string[];
		exclude_calendar_rules?: boolean;
		[key: string]: unknown;
	};
	is_active: boolean;
	created_at: string;
}

export interface CreateMonthlyLimitRecordData {
	name?: string;
	scope: 'all' | 'staff_status' | 'individual';
	targetIds?: string[];
	min_count: number;
	max_count: number;
	is_hard_constraint?: boolean;
	exclude_calendar_rules?: boolean;
}

export async function getAllMonthlyLimits(departmentId?: string): Promise<MonthlyLimitRecord[]> {
	const url = departmentId
		? `${API_URL}/shifts/settings/monthly-limits/all?department_id=${departmentId}`
		: `${API_URL}/shifts/settings/monthly-limits/all`;
	const response = await apiFetch(url, { headers: authHeaders() });
	return handleResponse(response);
}

export async function createMonthlyLimitRecord(data: CreateMonthlyLimitRecordData, departmentId?: string): Promise<MonthlyLimitRecord> {
	const url = departmentId
		? `${API_URL}/shifts/settings/monthly-limits?department_id=${departmentId}`
		: `${API_URL}/shifts/settings/monthly-limits`;
	const response = await apiFetch(url, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export async function updateMonthlyLimitRecord(id: string, data: Partial<CreateMonthlyLimitRecordData>): Promise<MonthlyLimitRecord> {
	const response = await apiFetch(`${API_URL}/shifts/settings/monthly-limits/${id}`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export async function deleteMonthlyLimitRecord(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/shifts/settings/monthly-limits/${id}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	if (!response.ok && response.status !== 204) {
		throw new Error('Failed to delete monthly limit record');
	}
}

// ==================== SOLVER CONFIG ====================

export async function getSolverConfig(): Promise<ORToolsSolverConfig | null> {
	const response = await apiFetch(`${API_URL}/shifts/settings/solver-config`, {
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
		staffStatusShift?: number;
	};
	hard_constraints?: {
		dailyLimits?: boolean;
		fiveDayRest?: boolean;
		staffGroups?: boolean;
		monthlyLimits?: boolean;
	};
	timeout?: number;
	numWorkers?: number;
	// Staff status shift restrictions
	disableStaffStatusShiftRestrictions?: boolean;
	// Post-period constraints
	postPeriodEnabled?: boolean;
	postPeriodDays?: number;
	postPeriodIsHard?: boolean;
	postPeriodMinLength?: number;
	// Adjacent conflict
	disableAdjacentConflict?: boolean;
}

export async function updateSolverConfig(data: UpdateSolverConfigData): Promise<ORToolsSolverConfig> {
	const response = await apiFetch(`${API_URL}/shifts/settings/solver-config`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

// ==================== STAFF GROUPS ====================

export async function getStaffGroups(departmentId?: string): Promise<ScheduleStaffGroup[]> {
	const url = departmentId
		? `${API_URL}/shifts/settings/staff-groups?department_id=${departmentId}`
		: `${API_URL}/shifts/settings/staff-groups`;
	const response = await apiFetch(url, { headers: authHeaders() });
	return handleResponse(response);
}

export interface CreateStaffGroupData {
	name: string;
	description?: string;
	color?: string;
	group_config?: Record<string, unknown>;
}

export async function createStaffGroup(data: CreateStaffGroupData, departmentId?: string): Promise<ScheduleStaffGroup> {
	const url = departmentId
		? `${API_URL}/shifts/settings/staff-groups?department_id=${departmentId}`
		: `${API_URL}/shifts/settings/staff-groups`;
	const response = await apiFetch(url, {
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
	const response = await apiFetch(`${API_URL}/shifts/settings/staff-groups/${id}`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export async function deleteStaffGroup(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/shifts/settings/staff-groups/${id}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Delete failed' }));
		throw new Error(error.message);
	}
}

export async function getStaffGroupMembers(groupId: string): Promise<Array<{ staff_id: string; group_id: string }>> {
	const response = await apiFetch(`${API_URL}/shifts/settings/staff-groups/${groupId}/members`, {
		headers: authHeaders()
	});
	return handleResponse(response);
}

export async function setStaffGroupMembers(groupId: string, staffIds: string[]): Promise<void> {
	const response = await apiFetch(`${API_URL}/shifts/settings/staff-groups/${groupId}/members`, {
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

export async function getPriorityRules(departmentId?: string): Promise<PriorityRule[]> {
	const url = departmentId
		? `${API_URL}/shifts/settings/priority-rules?department_id=${departmentId}`
		: `${API_URL}/shifts/settings/priority-rules`;
	const response = await apiFetch(url, { headers: authHeaders() });
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

export async function createPriorityRule(data: CreatePriorityRuleData, departmentId?: string): Promise<PriorityRule> {
	const url = departmentId
		? `${API_URL}/shifts/settings/priority-rules?department_id=${departmentId}`
		: `${API_URL}/shifts/settings/priority-rules`;
	const response = await apiFetch(url, {
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
	const response = await apiFetch(`${API_URL}/shifts/settings/priority-rules/${id}`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export async function deletePriorityRule(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/shifts/settings/priority-rules/${id}`, {
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

export async function getEarlyShiftPreferences(departmentId?: string): Promise<EarlyShiftPreference[]> {
	const url = departmentId
		? `${API_URL}/shifts/settings/early-shift-preferences?department_id=${departmentId}`
		: `${API_URL}/shifts/settings/early-shift-preferences`;
	const response = await apiFetch(url, { headers: authHeaders() });
	return handleResponse(response);
}

export interface CreateEarlyShiftPreferenceData {
	staff_id: string;
	can_do_early_shift: boolean;
	applies_to_date?: string;
	preference_source?: 'individual' | 'bulk_assignment';
}

export async function createEarlyShiftPreference(data: CreateEarlyShiftPreferenceData): Promise<EarlyShiftPreference> {
	const response = await apiFetch(`${API_URL}/shifts/settings/early-shift-preferences`, {
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

export async function bulkUpsertEarlyShiftPreferences(data: BulkEarlyShiftPreferenceData, departmentId?: string): Promise<void> {
	const url = departmentId
		? `${API_URL}/shifts/settings/early-shift-preferences/bulk?department_id=${departmentId}`
		: `${API_URL}/shifts/settings/early-shift-preferences/bulk`;
	const response = await apiFetch(url, {
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
	const response = await apiFetch(`${API_URL}/shifts/settings/early-shift-preferences/${id}`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export async function deleteEarlyShiftPreference(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/shifts/settings/early-shift-preferences/${id}`, {
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
	const response = await apiFetch(`${API_URL}/shifts/settings/period-configuration`, {
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
	const response = await apiFetch(`${API_URL}/shifts/settings/period-configuration`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data)
	});
	return handleResponse(response);
}

export async function regeneratePeriods(): Promise<SchedulePeriod[]> {
	const response = await apiFetch(`${API_URL}/shifts/settings/periods/regenerate`, {
		method: 'POST',
		headers: authHeaders()
	});
	return handleResponse(response);
}

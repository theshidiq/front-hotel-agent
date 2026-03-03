import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ORToolsOptimizeRequest {
  staffMembers: Array<{
    id: string;
    name: string;
    type?: string;
    status?: string;
    staff_order?: number;
  }>;
  dateRange: string[];
  existingSchedule?: Record<string, Record<string, string>>;
  constraints: {
    calendarRules?: Array<{
      date: string;
      rule_type: 'must_work' | 'must_day_off';
      staff_ids?: string[];
    }>;
    staffGroups?: Array<{
      id: string;
      name: string;
      members: string[];
      config?: Record<string, any>;
    }>;
    dailyLimits?: {
      minOffPerDay: number;
      maxOffPerDay: number;
      minEarlyPerDay: number;
      maxEarlyPerDay: number;
      minWorkingStaffPerDay?: number;
      is_hard_constraint?: boolean;
    };
    monthlyLimits?: {
      min_count?: number;
      max_count?: number;
      is_hard_constraint?: boolean;
      exclude_calendar_rules?: boolean;
      individual_overrides?: Record<string, { min_count?: number; max_count?: number }>;
      staff_status_overrides?: Record<string, { min_count?: number; max_count?: number }>;
    };
    fiveDayRest?: {
      enabled: boolean;
      is_hard_constraint?: boolean;
    };
  };
  penaltyWeights?: {
    staffGroup?: number;
    fiveDayRest?: number;
    monthlyLimit?: number;
    dailyLimitMax?: number;
    dailyLimitMin?: number;
    adjacentConflict?: number;
  };
  hardConstraints?: {
    dailyLimits?: boolean;
    fiveDayRest?: boolean;
    staffGroups?: boolean;
    monthlyLimits?: boolean;
  };
  timeout?: number;
  preservePrefilled?: boolean;
}

export interface ORToolsOptimizeResponse {
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

export interface ORToolsHealthResponse {
  status: string;
  service: string;
  version: string;
}

@Injectable()
export class ORToolsClient implements OnModuleInit {
  private readonly logger = new Logger(ORToolsClient.name);
  private baseUrl: string;
  private timeout: number;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('ORTOOLS_URL', 'http://localhost:5050');
    this.timeout = this.configService.get<number>('ORTOOLS_TIMEOUT', 120000);
  }

  async onModuleInit() {
    // Check OR-Tools health on startup
    const healthy = await this.healthCheck();
    if (healthy) {
      this.logger.log(`OR-Tools service connected at ${this.baseUrl}`);
    } else {
      this.logger.warn(`OR-Tools service not available at ${this.baseUrl}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: ORToolsHealthResponse = await response.json();
        return data.status === 'healthy';
      }
      return false;
    } catch (error) {
      this.logger.debug(`Health check failed: ${error.message}`);
      return false;
    }
  }

  async optimize(request: ORToolsOptimizeRequest): Promise<ORToolsOptimizeResponse> {
    const startTime = Date.now();

    try {
      // Convert request to OR-Tools format
      const ortoolsPayload = this.convertToORToolsFormat(request);

      this.logger.log(`Sending optimization request for ${request.staffMembers.length} staff, ${request.dateRange.length} days`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ortoolsPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OR-Tools service returned ${response.status}: ${errorText}`);
      }

      const result: ORToolsOptimizeResponse = await response.json();
      const elapsed = Date.now() - startTime;

      this.logger.log(`Optimization completed in ${elapsed}ms, optimal: ${result.is_optimal}`);

      return result;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger.error(`Optimization failed after ${elapsed}ms: ${error.message}`);

      if (error.name === 'AbortError') {
        return {
          success: false,
          error: `Optimization timed out after ${this.timeout}ms`,
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  private convertToORToolsFormat(request: ORToolsOptimizeRequest): any {
    // Convert staff members (Python reads these keys directly)
    const staffMembers = request.staffMembers.map((staff) => ({
      id: staff.id,
      name: staff.name,
      type: staff.type || 'regular',
      status: staff.status || '社員',
      staff_order: staff.staff_order || 0,
    }));

    // Build constraints object using camelCase keys that Python scheduler reads
    const constraints: any = {};

    // calendarRules: Python expects a DICT keyed by date
    // { "2026-03-01": { must_day_off: true, must_work: false } }
    if (request.constraints.calendarRules?.length) {
      const calendarRulesDict: Record<string, { must_day_off: boolean; must_work: boolean; staff_ids?: string[] }> = {};
      for (const rule of request.constraints.calendarRules) {
        calendarRulesDict[rule.date] = {
          must_day_off: rule.rule_type === 'must_day_off',
          must_work: rule.rule_type === 'must_work',
          ...(rule.staff_ids?.length ? { staff_ids: rule.staff_ids } : {}),
        };
      }
      constraints.calendarRules = calendarRulesDict;
    }

    // staffGroups: Python reads group.get('members', []) and group.get('config', {})
    if (request.constraints.staffGroups?.length) {
      constraints.staffGroups = request.constraints.staffGroups.map((group) => ({
        id: group.id,
        name: group.name,
        members: group.members,
        config: group.config || {},
      }));
    }

    // dailyLimitsRaw: camelCase keys that Python reads
    if (request.constraints.dailyLimits) {
      constraints.dailyLimitsRaw = {
        minOffPerDay: request.constraints.dailyLimits.minOffPerDay,
        maxOffPerDay: request.constraints.dailyLimits.maxOffPerDay,
        minEarlyPerDay: request.constraints.dailyLimits.minEarlyPerDay,
        maxEarlyPerDay: request.constraints.dailyLimits.maxEarlyPerDay,
        minWorkingStaffPerDay: request.constraints.dailyLimits.minWorkingStaffPerDay || 0,
        enabled: true,
      };
    }

    // monthlyLimit: legacy format Python reads (camelCase values)
    if (request.constraints.monthlyLimits) {
      constraints.monthlyLimit = {
        minCount: request.constraints.monthlyLimits.min_count,
        maxCount: request.constraints.monthlyLimits.max_count,
        isHardConstraint: request.constraints.monthlyLimits.is_hard_constraint || false,
        excludeCalendarRules: request.constraints.monthlyLimits.exclude_calendar_rules ?? true,
      };

      // Individual staff overrides as monthlyLimitsArray entries
      if (request.constraints.monthlyLimits.individual_overrides) {
        const overrideEntries = Object.entries(request.constraints.monthlyLimits.individual_overrides);
        if (overrideEntries.length) {
          constraints.monthlyLimitsArray = overrideEntries.map(([staffId, limits]) => ({
            scope: 'individual',
            targetIds: [staffId],
            minCount: (limits as any).min_count,
            maxCount: (limits as any).max_count,
            isHardConstraint: request.constraints.monthlyLimits?.is_hard_constraint || false,
            excludeCalendarRules: request.constraints.monthlyLimits?.exclude_calendar_rules ?? true,
          }));
        }
      }

      // Staff status overrides as monthlyLimitsArray entries
      if (request.constraints.monthlyLimits.staff_status_overrides) {
        const statusEntries = Object.entries(request.constraints.monthlyLimits.staff_status_overrides);
        if (statusEntries.length) {
          const statusArray = statusEntries.map(([status, limits]) => ({
            scope: 'staff_status',
            targetIds: [status],
            minCount: (limits as any).min_count,
            maxCount: (limits as any).max_count,
            isHardConstraint: request.constraints.monthlyLimits?.is_hard_constraint || false,
            excludeCalendarRules: request.constraints.monthlyLimits?.exclude_calendar_rules ?? true,
          }));
          constraints.monthlyLimitsArray = [
            ...(constraints.monthlyLimitsArray || []),
            ...statusArray,
          ];
        }
      }
    }

    // prefilledSchedule: existing schedule to lock as hard constraints
    if (request.preservePrefilled && request.existingSchedule && Object.keys(request.existingSchedule).length) {
      constraints.prefilledSchedule = request.existingSchedule;
    }

    // Penalty weights
    const penaltyWeights = request.penaltyWeights || {
      staffGroup: 100,
      fiveDayRest: 200,
      monthlyLimit: 80,
      dailyLimitMax: 50,
      dailyLimitMin: 50,
      adjacentConflict: 30,
    };

    // Hard constraints
    const hardConstraints = request.hardConstraints || {
      dailyLimits: false,
      fiveDayRest: false,
      staffGroups: false,
      monthlyLimits: false,
    };

    // ortoolsConfig: penalty weights + hard constraints + solver settings
    constraints.ortoolsConfig = {
      penaltyWeights: {
        staffGroup: penaltyWeights.staffGroup,
        fiveDayRest: penaltyWeights.fiveDayRest,
        monthlyLimit: penaltyWeights.monthlyLimit,
        dailyLimitMax: penaltyWeights.dailyLimitMax,
        dailyLimitMin: penaltyWeights.dailyLimitMin,
        adjacentConflict: penaltyWeights.adjacentConflict,
      },
      hardConstraints: {
        dailyLimits: hardConstraints.dailyLimits,
        fiveDayRest: hardConstraints.fiveDayRest,
        staffGroups: hardConstraints.staffGroups,
        monthlyLimits: hardConstraints.monthlyLimits,
      },
      solverSettings: {
        timeout: request.timeout || 30,
      },
    };

    return {
      staffMembers,
      dateRange: request.dateRange,
      constraints,
      timeout: request.timeout || 30,
      preservePrefilled: request.preservePrefilled ?? true,
    };
  }
}

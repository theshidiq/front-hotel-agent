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
      member_ids: string[];
      group_config?: Record<string, any>;
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
    // Convert staff members
    const staffMembers = request.staffMembers.map((staff) => ({
      id: staff.id,
      name: staff.name,
      type: staff.type || 'regular',
      status: staff.status || '社員',
      staff_order: staff.staff_order || 0,
    }));

    // Build constraints object
    const constraints: any = {};

    // Calendar rules
    if (request.constraints.calendarRules?.length) {
      constraints.calendar_rules = request.constraints.calendarRules.map((rule) => ({
        date: rule.date,
        rule_type: rule.rule_type,
        staff_ids: rule.staff_ids || [],
      }));
    }

    // Staff groups
    if (request.constraints.staffGroups?.length) {
      constraints.staff_groups = request.constraints.staffGroups.map((group) => ({
        id: group.id,
        name: group.name,
        member_ids: group.member_ids,
        config: group.group_config || {},
      }));
    }

    // Daily limits
    if (request.constraints.dailyLimits) {
      constraints.daily_limits = {
        min_off: request.constraints.dailyLimits.minOffPerDay,
        max_off: request.constraints.dailyLimits.maxOffPerDay,
        min_early: request.constraints.dailyLimits.minEarlyPerDay,
        max_early: request.constraints.dailyLimits.maxEarlyPerDay,
        min_working: request.constraints.dailyLimits.minWorkingStaffPerDay || 0,
        is_hard: request.constraints.dailyLimits.is_hard_constraint || false,
      };
    }

    // Monthly limits
    if (request.constraints.monthlyLimits) {
      constraints.monthly_limits = {
        min_count: request.constraints.monthlyLimits.min_count,
        max_count: request.constraints.monthlyLimits.max_count,
        is_hard: request.constraints.monthlyLimits.is_hard_constraint || false,
        exclude_calendar_rules: request.constraints.monthlyLimits.exclude_calendar_rules || false,
        individual_overrides: request.constraints.monthlyLimits.individual_overrides || {},
        staff_status_overrides: request.constraints.monthlyLimits.staff_status_overrides || {},
      };
    }

    // Five day rest
    if (request.constraints.fiveDayRest?.enabled) {
      constraints.five_day_rest = {
        enabled: true,
        is_hard: request.constraints.fiveDayRest.is_hard_constraint || false,
      };
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

    return {
      staff_members: staffMembers,
      date_range: request.dateRange,
      existing_schedule: request.existingSchedule || {},
      constraints,
      penalty_weights: {
        staff_group: penaltyWeights.staffGroup,
        five_day_rest: penaltyWeights.fiveDayRest,
        monthly_limit: penaltyWeights.monthlyLimit,
        daily_limit_max: penaltyWeights.dailyLimitMax,
        daily_limit_min: penaltyWeights.dailyLimitMin,
        adjacent_conflict: penaltyWeights.adjacentConflict,
      },
      hard_constraints: {
        daily_limits: hardConstraints.dailyLimits,
        five_day_rest: hardConstraints.fiveDayRest,
        staff_groups: hardConstraints.staffGroups,
        monthly_limits: hardConstraints.monthlyLimits,
      },
      timeout: request.timeout || 30,
      preserve_prefilled: request.preservePrefilled ?? true,
    };
  }
}

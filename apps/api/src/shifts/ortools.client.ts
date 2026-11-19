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
  private internalSecret: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('ORTOOLS_URL', 'http://localhost:5050');
    this.timeout = this.configService.get<number>('ORTOOLS_TIMEOUT', 120000);
    this.internalSecret = this.configService.get<string>('ORTOOLS_SECRET', '');
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
          ...(this.internalSecret && { 'X-Internal-Token': this.internalSecret }),
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

  private convertToORToolsFormat(request: any): any {
    // The service now builds the full constraints object directly.
    // This method just ensures staff members are correctly shaped.
    const staffMembers = request.staffMembers.map((staff: any) => ({
      id: staff.id,
      name: staff.name,
      type: staff.type || 'regular',
      status: staff.status || '社員',
      staff_order: staff.staff_order || 0,
      // scheduler.py uses these to leave cells empty before hire / after leaving
      ...(staff.start_period && { start_period: staff.start_period }),
      ...(staff.end_period && { end_period: staff.end_period }),
      ...(staff.metadata && { metadata: staff.metadata }),
    }));

    return {
      staffMembers,
      dateRange: request.dateRange,
      constraints: request.constraints,
      timeout: request.timeout || 30,
      preservePrefilled: request.preservePrefilled ?? true,
    };
  }
}

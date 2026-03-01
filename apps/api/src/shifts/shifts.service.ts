import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ORToolsClient } from './ortools.client';
import {
  ScheduleStaff,
  ScheduleStaffGroup,
  SchedulePeriod,
  Schedule,
  CalendarRule,
  DailyLimits,
  MonthlyLimits,
  ORToolsSolverConfig,
} from './interfaces/shift.interface';
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';
import { CreatePeriodDto, OptimizeRequestDto } from './dto/schedule.dto';
import {
  CreateCalendarRuleDto,
  CreateStaffGroupDto,
  UpdateStaffGroupDto,
  UpdateSolverConfigDto,
  UpdateDailyLimitsDto,
  UpdateMonthlyLimitsDto,
  CreatePriorityRuleDto,
  UpdatePriorityRuleDto,
  CreateEarlyShiftPreferenceDto,
  UpdateEarlyShiftPreferenceDto,
  BulkEarlyShiftPreferenceDto,
  UpdatePeriodConfigurationDto,
} from './dto/settings.dto';

@Injectable()
export class ShiftsService {
  private readonly logger = new Logger(ShiftsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly ortoolsClient: ORToolsClient,
  ) {}

  private get supabase() {
    return this.supabaseService.getClient();
  }

  // ==================== STAFF MANAGEMENT ====================

  async getStaff(restaurantId: string): Promise<ScheduleStaff[]> {
    const { data, error } = await this.supabase
      .from('staff')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('staff_order', { ascending: true });

    if (error) {
      this.logger.error('Failed to fetch staff', error);
      throw new BadRequestException('Failed to fetch staff');
    }

    return data || [];
  }

  async getStaffById(restaurantId: string, id: string): Promise<ScheduleStaff> {
    const { data, error } = await this.supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Staff member not found');
    }

    return data;
  }

  async createStaff(restaurantId: string, dto: CreateStaffDto): Promise<ScheduleStaff> {
    // Get max staff_order
    const { data: maxOrder } = await this.supabase
      .from('staff')
      .select('staff_order')
      .eq('restaurant_id', restaurantId)
      .order('staff_order', { ascending: false })
      .limit(1)
      .single();

    const newOrder = (maxOrder?.staff_order || 0) + 1;

    const { data, error } = await this.supabase
      .from('staff')
      .insert({
        ...dto,
        restaurant_id: restaurantId,
        staff_order: dto.staff_order ?? newOrder,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create staff', error);
      throw new BadRequestException('Failed to create staff');
    }

    return data;
  }

  async updateStaff(restaurantId: string, id: string, dto: UpdateStaffDto): Promise<ScheduleStaff> {
    const { data, error } = await this.supabase
      .from('staff')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update staff', error);
      throw new BadRequestException('Failed to update staff');
    }

    return data;
  }

  async deleteStaff(restaurantId: string, id: string): Promise<void> {
    // Soft delete - just mark as inactive
    const { error } = await this.supabase
      .from('staff')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('restaurant_id', restaurantId);

    if (error) {
      this.logger.error('Failed to delete staff', error);
      throw new BadRequestException('Failed to delete staff');
    }
  }

  async reorderStaff(restaurantId: string, staffIds: string[]): Promise<void> {
    const updates = staffIds.map((id, index) => ({
      id,
      staff_order: index,
      updated_at: new Date().toISOString(),
    }));

    for (const update of updates) {
      const { error } = await this.supabase
        .from('staff')
        .update({ staff_order: update.staff_order, updated_at: update.updated_at })
        .eq('id', update.id)
        .eq('restaurant_id', restaurantId);

      if (error) {
        this.logger.error('Failed to reorder staff', error);
        throw new BadRequestException('Failed to reorder staff');
      }
    }
  }

  // ==================== PERIODS ====================

  async getPeriods(restaurantId: string): Promise<SchedulePeriod[]> {
    const { data, error } = await this.supabase
      .from('periods')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch periods', error);
      throw new BadRequestException('Failed to fetch periods');
    }

    return data || [];
  }

  async getPeriodById(restaurantId: string, id: string): Promise<SchedulePeriod> {
    const { data, error } = await this.supabase
      .from('periods')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Period not found');
    }

    return data;
  }

  async createPeriod(restaurantId: string, dto: CreatePeriodDto): Promise<SchedulePeriod> {
    const { data, error } = await this.supabase
      .from('periods')
      .insert({
        label: dto.label,
        start_date: dto.start_date,
        end_date: dto.end_date,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create period', error);
      throw new BadRequestException('Failed to create period');
    }

    return data;
  }

  async deletePeriod(restaurantId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from('periods')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error('Failed to delete period', error);
      throw new BadRequestException('Failed to delete period');
    }
  }

  // ==================== SCHEDULE ====================

  async getSchedule(restaurantId: string, periodId: string): Promise<{
    period: SchedulePeriod;
    schedule: Schedule | null;
    staff: ScheduleStaff[];
  }> {
    const period = await this.getPeriodById(restaurantId, periodId);
    const staff = await this.getStaff(restaurantId);

    // Load schedule for the specific period by matching period dates
    // This ensures each period has its own schedule data
    const { data: scheduleForPeriod, error: periodError } = await this.supabase
      .from('schedules')
      .select('*, schedule_metadata!inner(*)')
      .eq('schedule_metadata.schedule_period_start', period.start_date)
      .eq('schedule_metadata.schedule_period_end', period.end_date)
      .single();

    let schedule = scheduleForPeriod;

    // If no period-specific schedule exists, return null
    // A new schedule will be created when user edits a cell (via getOrCreateSchedule)
    if (periodError) {
      this.logger.log(`No schedule found for period ${period.label} (${period.start_date} to ${period.end_date})`);
      schedule = null;
    }

    // Detailed debugging
    const scheduleDataKeys = schedule?.schedule_data
      ? Object.keys(schedule.schedule_data).filter(k => k !== '_staff_members')
      : [];
    const staffTableIds = staff.map(s => s.id);

    this.logger.log(`getSchedule: period=${period.label} (${period.start_date} to ${period.end_date})`);
    this.logger.log(`getSchedule: schedule_data has ${scheduleDataKeys.length} staff entries`);
    this.logger.log(`getSchedule: staff table has ${staff.length} staff`);

    // Check if IDs match
    const matchingIds = scheduleDataKeys.filter(id => staffTableIds.includes(id));
    const missingFromStaff = scheduleDataKeys.filter(id => !staffTableIds.includes(id));

    this.logger.log(`getSchedule: ${matchingIds.length} staff IDs match between schedule_data and staff table`);
    if (missingFromStaff.length > 0) {
      this.logger.warn(`getSchedule: ${missingFromStaff.length} staff IDs in schedule_data but NOT in staff table: ${missingFromStaff.slice(0, 3).join(', ')}...`);
    }

    // Sample date keys from first staff with data
    if (scheduleDataKeys.length > 0) {
      const firstStaffId = scheduleDataKeys[0];
      const firstStaffSchedule = schedule.schedule_data[firstStaffId];
      const dateKeys = Object.keys(firstStaffSchedule || {});
      this.logger.log(`getSchedule: sample staff ${firstStaffId} has ${dateKeys.length} date entries`);
      if (dateKeys.length > 0) {
        this.logger.log(`getSchedule: sample dates: ${dateKeys.slice(0, 5).join(', ')}...`);
      }
    }

    return { period, schedule, staff };
  }

  async updateCell(
    restaurantId: string,
    periodId: string,
    staffId: string,
    date: string,
    symbol: string,
  ): Promise<void> {
    // Get or create schedule for period
    let schedule = await this.getOrCreateSchedule(restaurantId, periodId);

    // Update the cell
    const scheduleData = schedule.schedule_data || {};
    if (!scheduleData[staffId]) {
      scheduleData[staffId] = {};
    }
    scheduleData[staffId][date] = symbol;

    const { error } = await this.supabase
      .from('schedules')
      .update({
        schedule_data: scheduleData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', schedule.id);

    if (error) {
      this.logger.error('Failed to update cell', error);
      throw new BadRequestException('Failed to update cell');
    }
  }

  async bulkUpdateCells(
    restaurantId: string,
    periodId: string,
    updates: Array<{ staffId: string; date: string; symbol: string }>,
  ): Promise<void> {
    let schedule = await this.getOrCreateSchedule(restaurantId, periodId);

    const scheduleData = schedule.schedule_data || {};
    for (const update of updates) {
      if (!scheduleData[update.staffId]) {
        scheduleData[update.staffId] = {};
      }
      scheduleData[update.staffId][update.date] = update.symbol;
    }

    const { error } = await this.supabase
      .from('schedules')
      .update({
        schedule_data: scheduleData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', schedule.id);

    if (error) {
      this.logger.error('Failed to bulk update cells', error);
      throw new BadRequestException('Failed to bulk update cells');
    }
  }

  private async getOrCreateSchedule(restaurantId: string, periodId: string): Promise<Schedule> {
    const period = await this.getPeriodById(restaurantId, periodId);

    // Try to find existing schedule
    const { data: existing } = await this.supabase
      .from('schedules')
      .select('*, schedule_metadata!inner(*)')
      .eq('schedule_metadata.schedule_period_start', period.start_date)
      .eq('schedule_metadata.schedule_period_end', period.end_date)
      .single();

    if (existing) {
      return existing;
    }

    // Create new schedule with metadata
    const { data: metadata, error: metaError } = await this.supabase
      .from('schedule_metadata')
      .insert({
        schedule_name: period.label,
        schedule_period_start: period.start_date,
        schedule_period_end: period.end_date,
        status: 'draft',
      })
      .select()
      .single();

    if (metaError) {
      throw new BadRequestException('Failed to create schedule metadata');
    }

    const { data: schedule, error } = await this.supabase
      .from('schedules')
      .insert({
        schedule_data: {},
        metadata_id: metadata.id,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create schedule');
    }

    return schedule;
  }

  // ==================== OPTIMIZATION ====================

  async optimizeSchedule(restaurantId: string, dto: OptimizeRequestDto): Promise<any> {
    const period = await this.getPeriodById(restaurantId, dto.periodId);
    const staff = await this.getStaff(restaurantId);
    const { schedule } = await this.getSchedule(restaurantId, dto.periodId);

    // Fetch all constraint configurations
    const [
      calendarRules,
      dailyLimits,
      monthlyLimits,
      solverConfig,
      staffGroups,
      priorityRules,
    ] = await Promise.all([
      this.getCalendarRules(restaurantId),
      this.getDailyLimits(restaurantId),
      this.getMonthlyLimits(restaurantId),
      this.getSolverConfig(restaurantId),
      this.getStaffGroups(restaurantId),
      this.getPriorityRules(restaurantId),
    ]);

    // Fetch staff group members
    const staffGroupsWithMembers = await Promise.all(
      staffGroups.map(async (group) => {
        const members = await this.getStaffGroupMembers(restaurantId, group.id);
        return {
          id: group.id,
          name: group.name,
          member_ids: members.map((m) => m.staff_id),
          group_config: group.group_config,
        };
      }),
    );

    // Generate date range
    const dateRange = this.generateDateRange(period.start_date, period.end_date);

    // Build OR-Tools request
    const ortoolsRequest = {
      staffMembers: staff.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status || '社員',
        type: s.type || 'regular',
        staff_order: s.staff_order,
      })),
      dateRange,
      existingSchedule: dto.preservePrefilled ? schedule?.schedule_data : {},
      constraints: {
        calendarRules: calendarRules.map((r) => ({
          date: r.date,
          rule_type: r.rule_type,
        })),
        staffGroups: staffGroupsWithMembers,
        dailyLimits: dailyLimits?.limit_config
          ? {
              minOffPerDay: dailyLimits.limit_config.minOffPerDay,
              maxOffPerDay: dailyLimits.limit_config.maxOffPerDay,
              minEarlyPerDay: dailyLimits.limit_config.minEarlyPerDay,
              maxEarlyPerDay: dailyLimits.limit_config.maxEarlyPerDay,
              minWorkingStaffPerDay: dailyLimits.limit_config.minWorkingStaffPerDay,
              is_hard_constraint: dailyLimits.is_hard_constraint,
            }
          : undefined,
        monthlyLimits: monthlyLimits
          ? {
              min_count: monthlyLimits.min_count,
              max_count: monthlyLimits.max_count,
              is_hard_constraint: monthlyLimits.is_hard_constraint,
              exclude_calendar_rules: monthlyLimits.limit_config?.exclude_calendar_rules,
              individual_overrides: monthlyLimits.limit_config?.individual_overrides,
              staff_status_overrides: monthlyLimits.limit_config?.staff_status_overrides,
            }
          : undefined,
        fiveDayRest: {
          enabled: solverConfig?.hard_constraints?.fiveDayRest ?? true,
          is_hard_constraint: solverConfig?.hard_constraints?.fiveDayRest ?? false,
        },
      },
      penaltyWeights: dto.penaltyWeights || solverConfig?.penalty_weights,
      hardConstraints: solverConfig?.hard_constraints,
      timeout: dto.timeout || solverConfig?.solver_settings?.timeout || 30,
      preservePrefilled: dto.preservePrefilled ?? true,
    };

    // Call OR-Tools service
    const result = await this.ortoolsClient.optimize(ortoolsRequest);

    if (result.success && result.schedule) {
      // Save optimized schedule
      await this.bulkUpdateCells(
        restaurantId,
        dto.periodId,
        this.scheduleToUpdates(result.schedule),
      );
    }

    return result;
  }

  async checkOptimizerHealth(): Promise<{ healthy: boolean; url: string }> {
    const healthy = await this.ortoolsClient.healthCheck();
    return {
      healthy,
      url: process.env.ORTOOLS_URL || 'http://localhost:5050',
    };
  }

  private generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  private scheduleToUpdates(
    schedule: Record<string, Record<string, string>>,
  ): Array<{ staffId: string; date: string; symbol: string }> {
    const updates: Array<{ staffId: string; date: string; symbol: string }> = [];
    for (const [staffId, dates] of Object.entries(schedule)) {
      for (const [date, symbol] of Object.entries(dates)) {
        updates.push({ staffId, date, symbol });
      }
    }
    return updates;
  }

  // ==================== SETTINGS: Calendar Rules ====================

  async getCalendarRules(
    restaurantId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<CalendarRule[]> {
    let query = this.supabase
      .from('calendar_rules')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('date', { ascending: true });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Failed to fetch calendar rules', error);
      throw new BadRequestException('Failed to fetch calendar rules');
    }

    return data || [];
  }

  async createCalendarRule(
    restaurantId: string,
    dto: CreateCalendarRuleDto,
  ): Promise<CalendarRule> {
    const { data, error } = await this.supabase
      .from('calendar_rules')
      .insert({
        restaurant_id: restaurantId,
        date: dto.date,
        rule_type: dto.rule_type,
        reason: dto.reason,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create calendar rule', error);
      throw new BadRequestException('Failed to create calendar rule');
    }

    return data;
  }

  async deleteCalendarRule(restaurantId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from('calendar_rules')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', restaurantId);

    if (error) {
      this.logger.error('Failed to delete calendar rule', error);
      throw new BadRequestException('Failed to delete calendar rule');
    }
  }

  // ==================== SETTINGS: Daily Limits ====================

  async getDailyLimits(restaurantId: string): Promise<DailyLimits | null> {
    const { data, error } = await this.supabase
      .from('daily_limits')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error('Failed to fetch daily limits', error);
    }

    return data;
  }

  async updateDailyLimits(
    restaurantId: string,
    dto: UpdateDailyLimitsDto,
  ): Promise<DailyLimits> {
    const existing = await this.getDailyLimits(restaurantId);

    const limitConfig = {
      ...(existing?.limit_config || {}),
      ...(dto.minOffPerDay !== undefined && { minOffPerDay: dto.minOffPerDay }),
      ...(dto.maxOffPerDay !== undefined && { maxOffPerDay: dto.maxOffPerDay }),
      ...(dto.minEarlyPerDay !== undefined && { minEarlyPerDay: dto.minEarlyPerDay }),
      ...(dto.maxEarlyPerDay !== undefined && { maxEarlyPerDay: dto.maxEarlyPerDay }),
      ...(dto.minWorkingStaffPerDay !== undefined && {
        minWorkingStaffPerDay: dto.minWorkingStaffPerDay,
      }),
    };

    if (existing) {
      const { data, error } = await this.supabase
        .from('daily_limits')
        .update({
          limit_config: limitConfig,
          is_hard_constraint: dto.is_hard_constraint ?? existing.is_hard_constraint,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new BadRequestException('Failed to update daily limits');
      }

      return data;
    } else {
      // Get or create config version
      const versionId = await this.getOrCreateConfigVersion(restaurantId);

      const { data, error } = await this.supabase
        .from('daily_limits')
        .insert({
          restaurant_id: restaurantId,
          version_id: versionId,
          name: 'default',
          limit_config: limitConfig,
          is_hard_constraint: dto.is_hard_constraint ?? false,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException('Failed to create daily limits');
      }

      return data;
    }
  }

  // ==================== SETTINGS: Monthly Limits ====================

  async getMonthlyLimits(restaurantId: string): Promise<MonthlyLimits | null> {
    const { data, error } = await this.supabase
      .from('monthly_limits')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error('Failed to fetch monthly limits', error);
    }

    return data;
  }

  async updateMonthlyLimits(
    restaurantId: string,
    dto: UpdateMonthlyLimitsDto,
  ): Promise<MonthlyLimits> {
    const existing = await this.getMonthlyLimits(restaurantId);

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (dto.min_count !== undefined) {
      updateData.min_count = dto.min_count;
    }
    if (dto.max_count !== undefined) {
      updateData.max_count = dto.max_count;
    }
    if (dto.is_hard_constraint !== undefined) {
      updateData.is_hard_constraint = dto.is_hard_constraint;
    }
    if (dto.exclude_calendar_rules !== undefined) {
      updateData.limit_config = {
        ...(existing?.limit_config || {}),
        exclude_calendar_rules: dto.exclude_calendar_rules,
      };
    }

    if (existing) {
      const { data, error } = await this.supabase
        .from('monthly_limits')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new BadRequestException('Failed to update monthly limits');
      }

      return data;
    } else {
      const versionId = await this.getOrCreateConfigVersion(restaurantId);

      const { data, error } = await this.supabase
        .from('monthly_limits')
        .insert({
          restaurant_id: restaurantId,
          version_id: versionId,
          name: 'default',
          min_count: dto.min_count,
          max_count: dto.max_count,
          is_hard_constraint: dto.is_hard_constraint ?? false,
          limit_config: dto.exclude_calendar_rules !== undefined
            ? { exclude_calendar_rules: dto.exclude_calendar_rules }
            : {},
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException('Failed to create monthly limits');
      }

      return data;
    }
  }

  // ==================== SETTINGS: Solver Config ====================

  async getSolverConfig(restaurantId: string): Promise<ORToolsSolverConfig | null> {
    const { data, error } = await this.supabase
      .from('ortools_solver_config')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error('Failed to fetch solver config', error);
    }

    return data;
  }

  async updateSolverConfig(
    restaurantId: string,
    dto: UpdateSolverConfigDto,
  ): Promise<ORToolsSolverConfig> {
    const existing = await this.getSolverConfig(restaurantId);

    const updateData: any = { updated_at: new Date().toISOString() };

    if (dto.penalty_weights) {
      updateData.penalty_weights = {
        ...(existing?.penalty_weights || {}),
        ...dto.penalty_weights,
      };
    }

    if (dto.hard_constraints) {
      updateData.hard_constraints = {
        ...(existing?.hard_constraints || {}),
        ...dto.hard_constraints,
      };
    }

    if (dto.timeout || dto.numWorkers) {
      updateData.solver_settings = {
        ...(existing?.solver_settings || {}),
        ...(dto.timeout && { timeout: dto.timeout }),
        ...(dto.numWorkers && { numWorkers: dto.numWorkers }),
      };
    }

    if (existing) {
      const { data, error } = await this.supabase
        .from('ortools_solver_config')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new BadRequestException('Failed to update solver config');
      }

      return data;
    } else {
      const versionId = await this.getOrCreateConfigVersion(restaurantId);

      const { data, error } = await this.supabase
        .from('ortools_solver_config')
        .insert({
          restaurant_id: restaurantId,
          version_id: versionId,
          name: 'default',
          preset: 'balanced',
          penalty_weights: updateData.penalty_weights || {
            staffGroup: 100,
            fiveDayRest: 200,
            monthlyLimit: 80,
            dailyLimitMax: 50,
            dailyLimitMin: 50,
            adjacentConflict: 30,
          },
          solver_settings: updateData.solver_settings || {
            timeout: 30,
            numWorkers: 4,
          },
          hard_constraints: updateData.hard_constraints || {
            dailyLimits: false,
            fiveDayRest: false,
            staffGroups: false,
            monthlyLimits: false,
          },
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException('Failed to create solver config');
      }

      return data;
    }
  }

  // ==================== SETTINGS: Staff Groups ====================

  async getStaffGroups(restaurantId: string): Promise<ScheduleStaffGroup[]> {
    const { data, error } = await this.supabase
      .from('staff_groups')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    if (error) {
      this.logger.error('Failed to fetch staff groups', error);
      throw new BadRequestException('Failed to fetch staff groups');
    }

    return data || [];
  }

  async createStaffGroup(
    restaurantId: string,
    dto: CreateStaffGroupDto,
  ): Promise<ScheduleStaffGroup> {
    const versionId = await this.getOrCreateConfigVersion(restaurantId);

    const { data, error } = await this.supabase
      .from('staff_groups')
      .insert({
        restaurant_id: restaurantId,
        version_id: versionId,
        name: dto.name,
        description: dto.description,
        color: dto.color,
        group_config: dto.group_config,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create staff group', error);
      throw new BadRequestException('Failed to create staff group');
    }

    return data;
  }

  async updateStaffGroup(
    restaurantId: string,
    id: string,
    dto: UpdateStaffGroupDto,
  ): Promise<ScheduleStaffGroup> {
    const { data, error } = await this.supabase
      .from('staff_groups')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update staff group', error);
      throw new BadRequestException('Failed to update staff group');
    }

    return data;
  }

  async deleteStaffGroup(restaurantId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from('staff_groups')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('restaurant_id', restaurantId);

    if (error) {
      this.logger.error('Failed to delete staff group', error);
      throw new BadRequestException('Failed to delete staff group');
    }
  }

  async getStaffGroupMembers(
    restaurantId: string,
    groupId: string,
  ): Promise<Array<{ staff_id: string; group_id: string }>> {
    const { data, error } = await this.supabase
      .from('staff_backup_assignments')
      .select('staff_id, group_id')
      .eq('group_id', groupId)
      .eq('is_active', true);

    if (error) {
      this.logger.error('Failed to fetch staff group members', error);
      throw new BadRequestException('Failed to fetch staff group members');
    }

    return data || [];
  }

  async setStaffGroupMembers(
    restaurantId: string,
    groupId: string,
    staffIds: string[],
  ): Promise<void> {
    // Soft delete existing members
    await this.supabase
      .from('staff_backup_assignments')
      .update({ is_active: false })
      .eq('group_id', groupId);

    // Insert new members
    if (staffIds.length > 0) {
      const versionId = await this.getOrCreateConfigVersion(restaurantId);
      const { error } = await this.supabase.from('staff_backup_assignments').insert(
        staffIds.map((staffId) => ({
          restaurant_id: restaurantId,
          version_id: versionId,
          group_id: groupId,
          staff_id: staffId,
          is_active: true,
        })),
      );

      if (error) {
        this.logger.error('Failed to set staff group members', error);
        throw new BadRequestException('Failed to set staff group members');
      }
    }
  }

  // ==================== SETTINGS: Priority Rules ====================

  async getPriorityRules(restaurantId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('priority_rules')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    if (error) {
      this.logger.error('Failed to fetch priority rules', error);
    }

    return data || [];
  }

  async createPriorityRule(
    restaurantId: string,
    dto: CreatePriorityRuleDto,
  ): Promise<any> {
    const versionId = await this.getOrCreateConfigVersion(restaurantId);

    const ruleDefinition = {
      staff_ids: dto.staff_ids || [],
      rule_type: dto.rule_type,
      shift_type: dto.shift_type,
      days_of_week: dto.days_of_week,
      allowed_shifts: dto.allowed_shifts || [],
    };

    const { data, error } = await this.supabase
      .from('priority_rules')
      .insert({
        restaurant_id: restaurantId,
        version_id: versionId,
        name: dto.name,
        description: dto.description,
        priority_level: dto.priority_level || 1,
        rule_definition: ruleDefinition,
        penalty_weight: dto.penalty_weight || 1.0,
        is_hard_constraint: dto.is_hard_constraint ?? false,
        effective_from: dto.effective_from,
        effective_until: dto.effective_until,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create priority rule', error);
      throw new BadRequestException('Failed to create priority rule');
    }

    return data;
  }

  async updatePriorityRule(
    restaurantId: string,
    id: string,
    dto: UpdatePriorityRuleDto,
  ): Promise<any> {
    const updateData: any = { updated_at: new Date().toISOString() };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.priority_level !== undefined) updateData.priority_level = dto.priority_level;
    if (dto.is_hard_constraint !== undefined) updateData.is_hard_constraint = dto.is_hard_constraint;
    if (dto.penalty_weight !== undefined) updateData.penalty_weight = dto.penalty_weight;
    if (dto.effective_from !== undefined) updateData.effective_from = dto.effective_from;
    if (dto.effective_until !== undefined) updateData.effective_until = dto.effective_until;
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;

    // Update rule_definition if any related fields changed
    if (dto.staff_ids || dto.rule_type || dto.shift_type || dto.days_of_week || dto.allowed_shifts) {
      const { data: existing } = await this.supabase
        .from('priority_rules')
        .select('rule_definition')
        .eq('id', id)
        .single();

      updateData.rule_definition = {
        ...(existing?.rule_definition || {}),
        ...(dto.staff_ids && { staff_ids: dto.staff_ids }),
        ...(dto.rule_type && { rule_type: dto.rule_type }),
        ...(dto.shift_type && { shift_type: dto.shift_type }),
        ...(dto.days_of_week && { days_of_week: dto.days_of_week }),
        ...(dto.allowed_shifts && { allowed_shifts: dto.allowed_shifts }),
      };
    }

    const { data, error } = await this.supabase
      .from('priority_rules')
      .update(updateData)
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update priority rule', error);
      throw new BadRequestException('Failed to update priority rule');
    }

    return data;
  }

  async deletePriorityRule(restaurantId: string, id: string): Promise<void> {
    // Soft delete
    const { error } = await this.supabase
      .from('priority_rules')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('restaurant_id', restaurantId);

    if (error) {
      this.logger.error('Failed to delete priority rule', error);
      throw new BadRequestException('Failed to delete priority rule');
    }
  }

  // ==================== SETTINGS: Early Shift Preferences ====================

  async getEarlyShiftPreferences(restaurantId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('staff_early_shift_preferences')
      .select('*')
      .eq('restaurant_id', restaurantId);

    if (error) {
      this.logger.error('Failed to fetch early shift preferences', error);
      throw new BadRequestException('Failed to fetch early shift preferences');
    }

    return data || [];
  }

  async createEarlyShiftPreference(
    restaurantId: string,
    dto: CreateEarlyShiftPreferenceDto,
  ): Promise<any> {
    const { data, error } = await this.supabase
      .from('staff_early_shift_preferences')
      .insert({
        restaurant_id: restaurantId,
        staff_id: dto.staff_id,
        can_do_early_shift: dto.can_do_early_shift,
        applies_to_date: dto.applies_to_date,
        preference_source: dto.preference_source || 'individual',
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create early shift preference', error);
      throw new BadRequestException('Failed to create early shift preference');
    }

    return data;
  }

  async updateEarlyShiftPreference(
    restaurantId: string,
    id: string,
    dto: UpdateEarlyShiftPreferenceDto,
  ): Promise<any> {
    const { data, error } = await this.supabase
      .from('staff_early_shift_preferences')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update early shift preference', error);
      throw new BadRequestException('Failed to update early shift preference');
    }

    return data;
  }

  async bulkUpsertEarlyShiftPreferences(
    restaurantId: string,
    dto: BulkEarlyShiftPreferenceDto,
  ): Promise<void> {
    // Delete existing preferences for these staff members
    const staffIds = dto.preferences.map((p) => p.staff_id);

    await this.supabase
      .from('staff_early_shift_preferences')
      .delete()
      .eq('restaurant_id', restaurantId)
      .in('staff_id', staffIds)
      .is('applies_to_date', null); // Only delete general preferences, not date-specific

    // Insert new preferences
    const inserts = dto.preferences.map((p) => ({
      restaurant_id: restaurantId,
      staff_id: p.staff_id,
      can_do_early_shift: p.can_do_early_shift,
      applies_to_date: p.applies_to_date || null,
      preference_source: 'bulk_assignment',
    }));

    const { error } = await this.supabase
      .from('staff_early_shift_preferences')
      .insert(inserts);

    if (error) {
      this.logger.error('Failed to bulk upsert early shift preferences', error);
      throw new BadRequestException('Failed to bulk upsert early shift preferences');
    }
  }

  async deleteEarlyShiftPreference(restaurantId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from('staff_early_shift_preferences')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', restaurantId);

    if (error) {
      this.logger.error('Failed to delete early shift preference', error);
      throw new BadRequestException('Failed to delete early shift preference');
    }
  }

  // ==================== SETTINGS: Period Configuration ====================

  async getPeriodConfiguration(restaurantId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('period_configuration')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error('Failed to fetch period configuration', error);
    }

    return data;
  }

  async updatePeriodConfiguration(
    restaurantId: string,
    dto: UpdatePeriodConfigurationDto,
  ): Promise<any> {
    const existing = await this.getPeriodConfiguration(restaurantId);

    if (existing) {
      const { data, error } = await this.supabase
        .from('period_configuration')
        .update({
          ...dto,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new BadRequestException('Failed to update period configuration');
      }

      return data;
    } else {
      const { data, error } = await this.supabase
        .from('period_configuration')
        .insert({
          restaurant_id: restaurantId,
          start_day: dto.start_day || 21,
          end_day: dto.end_day || 20,
          period_length_days: dto.period_length_days || 30,
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException('Failed to create period configuration');
      }

      return data;
    }
  }

  async regeneratePeriods(restaurantId: string): Promise<SchedulePeriod[]> {
    const config = await this.getPeriodConfiguration(restaurantId);
    if (!config) {
      throw new BadRequestException('Period configuration not found');
    }

    const startDay = config.start_day || 21;
    const endDay = config.end_day || 20;

    // Generate periods for 12 months
    const periods: { label: string; start_date: string; end_date: string }[] = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed

    for (let i = -2; i < 10; i++) {
      const startMonth = (currentMonth + i + 12) % 12;
      const startYear = currentYear + Math.floor((currentMonth + i) / 12);

      const endMonth = (startMonth + 1) % 12;
      const endYear = startYear + (startMonth === 11 ? 1 : 0);

      const startDate = new Date(startYear, startMonth, startDay);
      const endDate = new Date(endYear, endMonth, endDay);

      const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
      const label = `${monthNames[startMonth]}・${monthNames[endMonth]}`;

      periods.push({
        label,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
    }

    // Delete existing periods and insert new ones
    await this.supabase.from('periods').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { data, error } = await this.supabase
      .from('periods')
      .insert(periods)
      .select();

    if (error) {
      this.logger.error('Failed to regenerate periods', error);
      throw new BadRequestException('Failed to regenerate periods');
    }

    return data || [];
  }

  // ==================== HELPERS ====================

  private async getOrCreateConfigVersion(restaurantId: string): Promise<string> {
    // Try to find existing active version
    const { data: existing } = await this.supabase
      .from('config_versions')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single();

    if (existing) {
      return existing.id;
    }

    // Create new version
    const { data: version, error } = await this.supabase
      .from('config_versions')
      .insert({
        restaurant_id: restaurantId,
        version_number: 1,
        name: 'Default Configuration',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create config version', error);
      throw new BadRequestException('Failed to create configuration version');
    }

    return version.id;
  }
}

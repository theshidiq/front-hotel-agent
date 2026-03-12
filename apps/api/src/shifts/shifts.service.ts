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

  async getStaff(organizationId: string, departmentId?: string): Promise<ScheduleStaff[]> {
    let query = this.supabase
      .from('staff')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('staff_order', { ascending: true });

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Failed to fetch staff', error);
      throw new BadRequestException('Failed to fetch staff');
    }

    return data || [];
  }

  async getStaffById(organizationId: string, id: string): Promise<ScheduleStaff> {
    const { data, error } = await this.supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Staff member not found');
    }

    return data;
  }

  async createStaff(organizationId: string, dto: CreateStaffDto): Promise<ScheduleStaff> {
    // Get max staff_order
    const { data: maxOrder } = await this.supabase
      .from('staff')
      .select('staff_order')
      .eq('organization_id', organizationId)
      .order('staff_order', { ascending: false })
      .limit(1)
      .single();

    const newOrder = (maxOrder?.staff_order || 0) + 1;

    const { data, error } = await this.supabase
      .from('staff')
      .insert({
        ...dto,
        organization_id: organizationId,
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

  async updateStaff(organizationId: string, id: string, dto: UpdateStaffDto): Promise<ScheduleStaff> {
    const { data, error } = await this.supabase
      .from('staff')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update staff', error);
      throw new BadRequestException('Failed to update staff');
    }

    return data;
  }

  async deleteStaff(organizationId: string, id: string): Promise<void> {
    // Soft delete - just mark as inactive
    const { error } = await this.supabase
      .from('staff')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error('Failed to delete staff', error);
      throw new BadRequestException('Failed to delete staff');
    }
  }

  async reorderStaff(organizationId: string, staffIds: string[]): Promise<void> {
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
        .eq('organization_id', organizationId);

      if (error) {
        this.logger.error('Failed to reorder staff', error);
        throw new BadRequestException('Failed to reorder staff');
      }
    }
  }

  // ==================== PERIODS ====================

  async getPeriods(organizationId: string): Promise<SchedulePeriod[]> {
    const { data, error } = await this.supabase
      .from('periods')
      .select('*')
      .eq('organization_id', organizationId)
      .order('start_date', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch periods', error);
      throw new BadRequestException('Failed to fetch periods');
    }

    return data || [];
  }

  async getPeriodById(organizationId: string, id: string): Promise<SchedulePeriod> {
    const { data, error } = await this.supabase
      .from('periods')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Period not found');
    }

    return data;
  }

  async createPeriod(organizationId: string, dto: CreatePeriodDto): Promise<SchedulePeriod> {
    const { data, error } = await this.supabase
      .from('periods')
      .insert({
        organization_id: organizationId,
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

  async deletePeriod(organizationId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from('periods')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error('Failed to delete period', error);
      throw new BadRequestException('Failed to delete period');
    }
  }

  // ==================== SCHEDULE ====================

  async getSchedule(organizationId: string, periodId: string, departmentId?: string): Promise<{
    period: SchedulePeriod;
    schedule: Schedule | null;
    staff: ScheduleStaff[];
  }> {
    const period = await this.getPeriodById(organizationId, periodId);
    const staff = await this.getStaff(organizationId, departmentId);

    // Load schedule for the specific period+department combination
    let scheduleQuery = this.supabase
      .from('schedules')
      .select('*, schedule_metadata!inner(*)')
      .eq('schedule_metadata.schedule_period_start', period.start_date)
      .eq('schedule_metadata.schedule_period_end', period.end_date);

    if (departmentId) {
      scheduleQuery = scheduleQuery.eq('schedule_metadata.department_id', departmentId);
    } else {
      scheduleQuery = scheduleQuery.is('schedule_metadata.department_id', null);
    }

    const { data: scheduleForPeriod, error: periodError } = await scheduleQuery.single();

    let schedule = scheduleForPeriod;

    // If no metadata-linked schedule exists, try to find a legacy schedule (without metadata)
    // by checking if any schedule has data matching the period's date range
    if (periodError) {
      this.logger.log(`No metadata-linked schedule found for period ${period.label}, searching legacy schedules...`);

      // Query legacy schedules (those with metadata_id = null)
      const { data: legacySchedules, error: legacyError } = await this.supabase
        .from('schedules')
        .select('*')
        .is('metadata_id', null);

      if (!legacyError && legacySchedules && legacySchedules.length > 0) {
        // Find the schedule that has data matching this period's date range
        for (const legacySchedule of legacySchedules) {
          const scheduleData = legacySchedule.schedule_data || {};
          // Get all date keys from the first staff member's schedule
          const staffIds = Object.keys(scheduleData).filter(k => k !== '_staff_members');
          if (staffIds.length > 0) {
            const firstStaffSchedule = scheduleData[staffIds[0]];
            const dateKeys = Object.keys(firstStaffSchedule || {}).sort();
            if (dateKeys.length > 0) {
              const firstDate = dateKeys[0];
              const lastDate = dateKeys[dateKeys.length - 1];
              // Check if this schedule's date range matches the period
              if (firstDate >= period.start_date && firstDate <= period.end_date) {
                this.logger.log(`Found legacy schedule matching period ${period.label}: dates ${firstDate} to ${lastDate}`);
                schedule = legacySchedule;
                break;
              }
            }
          }
        }
      }

      if (!schedule) {
        this.logger.log(`No schedule found for period ${period.label} (${period.start_date} to ${period.end_date})`);
      }
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
    organizationId: string,
    periodId: string,
    staffId: string,
    date: string,
    symbol: string,
    departmentId?: string,
  ): Promise<void> {
    // Get or create schedule for period+department
    let schedule = await this.getOrCreateSchedule(organizationId, periodId, departmentId);

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
    organizationId: string,
    periodId: string,
    updates: Array<{ staffId: string; date: string; symbol: string }>,
    departmentId?: string,
  ): Promise<void> {
    let schedule = await this.getOrCreateSchedule(organizationId, periodId, departmentId);

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

  private async getOrCreateSchedule(organizationId: string, periodId: string, departmentId?: string): Promise<Schedule> {
    const period = await this.getPeriodById(organizationId, periodId);

    // Try to find existing schedule for this period+department
    let existingQuery = this.supabase
      .from('schedules')
      .select('*, schedule_metadata!inner(*)')
      .eq('schedule_metadata.schedule_period_start', period.start_date)
      .eq('schedule_metadata.schedule_period_end', period.end_date);

    if (departmentId) {
      existingQuery = existingQuery.eq('schedule_metadata.department_id', departmentId);
    } else {
      existingQuery = existingQuery.is('schedule_metadata.department_id', null);
    }

    const { data: existing } = await existingQuery.single();

    if (existing) {
      return existing;
    }

    // Determine schedule name
    let scheduleName = period.label;
    if (departmentId) {
      const { data: dept } = await this.supabase
        .from('departments')
        .select('name')
        .eq('id', departmentId)
        .single();
      if (dept) scheduleName = `${period.label} - ${dept.name}`;
    }

    // Create new schedule with metadata
    const { data: metadata, error: metaError } = await this.supabase
      .from('schedule_metadata')
      .insert({
        organization_id: organizationId,
        schedule_name: scheduleName,
        schedule_period_start: period.start_date,
        schedule_period_end: period.end_date,
        department_id: departmentId ?? null,
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
        organization_id: organizationId,
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

  async optimizeSchedule(organizationId: string, dto: OptimizeRequestDto): Promise<any> {
    const deptId = dto.departmentId;
    const period = await this.getPeriodById(organizationId, dto.periodId);
    const staff = await this.getStaff(organizationId, deptId);
    const { schedule } = await this.getSchedule(organizationId, dto.periodId, deptId);

    // Fetch all constraint configurations
    const [
      calendarRules,
      dailyLimits,
      allMonthlyLimits,
      solverConfig,
      staffGroups,
      priorityRules,
      earlyShiftPreferences,
      backupAssignments,
      staffUnavailability,
    ] = await Promise.all([
      this.getCalendarRules(organizationId),
      this.getDailyLimits(organizationId, deptId),
      this.getAllMonthlyLimits(organizationId, deptId),
      this.getSolverConfig(organizationId),
      this.getStaffGroups(organizationId, deptId),
      this.getPriorityRules(organizationId, deptId),
      this.getEarlyShiftPreferences(organizationId, deptId),
      this.getBackupAssignments(organizationId, deptId, true), // active-only for solver
      this.getStaffUnavailability(organizationId),
    ]);

    // Staff groups: members stored in group_config.members JSONB
    const staffGroupsWithMembers = staffGroups.map((group) => ({
      id: group.id,
      name: group.name,
      members: (group.group_config?.members as string[]) || [],
    }));

    // Daily limits: read from limit_config JSONB
    const lc = dailyLimits?.limit_config as any;
    const dailyLimitsRaw = lc ? {
      minOffPerDay: lc.minOffPerDay ?? 1,
      maxOffPerDay: lc.maxOffPerDay ?? 3,
      minEarlyPerDay: lc.minEarlyPerDay ?? 0,
      maxEarlyPerDay: lc.maxEarlyPerDay ?? 2,
      minWorkingStaffPerDay: lc.minWorkingStaffPerDay ?? 0,
      enabled: true,
    } : undefined;

    // Staff type limits: stored inside daily_limits.limit_config.staffTypeLimits
    const staffTypeLimits = lc?.staffTypeLimits as Record<string, any> | undefined;

    // Monthly limits: multiple rows, each has scope + targetIds + minCount/maxCount in limit_config
    const monthlyLimitsArray = allMonthlyLimits.map((ml: any) => {
      const mlc = ml.limit_config as any;
      return {
        id: ml.id,
        name: ml.name,
        scope: mlc?.scope || 'all',
        targetIds: mlc?.targetIds || [],
        minCount: mlc?.minCount ?? ml.min_count ?? 0,
        maxCount: mlc?.maxCount ?? ml.max_count ?? 10,
        excludeCalendarRules: ml.exclude_calendar_rules ?? mlc?.excludeCalendarRules ?? true,
        isHardConstraint: ml.is_hard_constraint ?? false,
      };
    });

    // Priority rules: normalize mixed snake/camelCase rule_definition
    const normalizedPriorityRules = priorityRules.map((rule: any) => {
      const rd = rule.rule_definition as any;
      return {
        id: rule.id,
        name: rule.name,
        ruleType: rd?.ruleType || rd?.rule_type || rd?.type || rule.rule_type || 'preferred_shift',
        staffIds: rd?.staffIds || (rd?.staff_id ? [rd.staff_id] : rd?.staff_ids || []),
        shiftType: rd?.shiftType || rd?.shift_type || 'off',
        daysOfWeek: rd?.daysOfWeek || rd?.days_of_week || [],
        allowedShifts: rd?.allowedShifts || rd?.allowed_shifts || [],
        priorityLevel: rule.priority_level ?? 2,
        isHardConstraint: rule.is_hard_constraint ?? false,
        isActive: rule.is_active ?? true,
      };
    });

    // Solver config: columns are penalty_weights, hard_constraints, solver_settings (separate JSONB)
    const penaltyWeights = dto.penaltyWeights || solverConfig?.penalty_weights || {
      staffGroup: 100,
      fiveDayRest: 200,
      monthlyLimit: 350,
      dailyLimitMax: 50,
      dailyLimitMin: 50,
      adjacentConflict: 30,
    };
    const hardConstraints = solverConfig?.hard_constraints || {
      dailyLimits: false,
      fiveDayRest: false,
      staffGroups: false,
      monthlyLimits: false,
    };
    const solverSettings = solverConfig?.solver_settings || { timeout: 30, numWorkers: 4 };
    const timeout = dto.timeout || solverSettings.timeout || 30;

    // Calendar rules: dict keyed by date
    const calendarRulesDict: Record<string, { must_day_off: boolean; must_work: boolean }> = {};
    for (const rule of calendarRules) {
      calendarRulesDict[rule.date] = {
        must_day_off: rule.rule_type === 'must_day_off',
        must_work: rule.rule_type === 'must_work',
      };
    }

    const dateRange = this.generateDateRange(period.start_date, period.end_date);

    // Build prefilledSchedule: start from existing schedule_data, then inject required_off as × (HARD OFF).
    // This mirrors how React's BusinessRuleValidator directly sets cells — bypasses CP-SAT constraint
    // ordering issues where prefilled WORK cells would win over required_off HARD constraints.
    const baseScheduleData: Record<string, Record<string, string>> =
      (dto.preservePrefilled && schedule?.schedule_data) ? { ...(schedule.schedule_data as any) } : {};

    // Inject required_off rules as × cells (override any existing value)
    // JS day-of-week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
    let requiredOffInjected = 0;
    for (const rule of normalizedPriorityRules) {
      if (rule.ruleType !== 'required_off') continue;
      if (rule.isActive === false) continue;

      const targetStaffIds: Set<string> = new Set(rule.staffIds || []);
      const daysOfWeek: Set<number> = new Set((rule.daysOfWeek || []).map(Number));
      if (targetStaffIds.size === 0 || daysOfWeek.size === 0) continue;

      for (const dateStr of dateRange) {
        const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay(); // 0=Sun, 6=Sat
        if (!daysOfWeek.has(dayOfWeek)) continue;
        for (const staffId of targetStaffIds) {
          if (!baseScheduleData[staffId]) baseScheduleData[staffId] = {};
          baseScheduleData[staffId][dateStr] = '×';
          requiredOffInjected++;
        }
      }
    }
    if (requiredOffInjected > 0) {
      this.logger.log(`[optimize] Injected ${requiredOffInjected} required_off cells as × into prefilledSchedule`);
    }

    // Early shift preferences: build dict { staffId: { dateString: boolean, 'default': boolean } }
    // Expected format by scheduler.py _add_calendar_rules()
    const earlyShiftPrefsDict: Record<string, Record<string, boolean>> = {};
    for (const pref of earlyShiftPreferences) {
      const staffId = pref.staff_id;
      if (!earlyShiftPrefsDict[staffId]) {
        earlyShiftPrefsDict[staffId] = {};
      }
      if (pref.applies_to_date) {
        earlyShiftPrefsDict[staffId][pref.applies_to_date] = pref.can_do_early_shift;
      } else {
        // No specific date → treat as default for all dates
        earlyShiftPrefsDict[staffId]['default'] = pref.can_do_early_shift;
      }
    }

    // Extract additional solver_settings fields for OR-Tools
    const ss = solverConfig?.solver_settings as any;
    const postPeriodConfig = ss?.postPeriodEnabled ? {
      enabled: true,
      isHardConstraint: ss.postPeriodIsHard ?? true,
      minPeriodLength: ss.postPeriodMinLength ?? 3,
      postPeriodDays: ss.postPeriodDays ?? 2,
      avoidDayOffForShain: true,
      avoidDayOffForHaken: true,
      allowEarlyForShain: true,
    } : { enabled: false };

    const ortoolsRequest: any = {
      staffMembers: staff.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status || '社員',
        type: s.type || 'regular',
        staff_order: s.staff_order,
        ...(s.start_period && { start_period: s.start_period }),
        ...(s.end_period && { end_period: s.end_period }),
        ...((s as any).metadata && { metadata: (s as any).metadata }),
      })),
      dateRange,
      constraints: {
        ...(Object.keys(calendarRulesDict).length && { calendarRules: calendarRulesDict }),
        ...(staffGroupsWithMembers.length && { staffGroups: staffGroupsWithMembers }),
        ...(dailyLimitsRaw && { dailyLimitsRaw }),
        ...(staffTypeLimits && { staffTypeLimits }),
        ...(monthlyLimitsArray.length && { monthlyLimitsArray }),
        ...(normalizedPriorityRules.length && { priorityRules: normalizedPriorityRules }),
        ...(Object.keys(earlyShiftPrefsDict).length && { earlyShiftPreferences: earlyShiftPrefsDict }),
        ...(backupAssignments.length && { backupAssignments }),
        ...(staffUnavailability.length && { staffUnavailability }),
        ...(Object.keys(baseScheduleData).length && {
          prefilledSchedule: baseScheduleData,
        }),
        // Staff status restrictions toggle (#4)
        ...(ss?.disableStaffStatusShiftRestrictions && {
          disableStaffStatusShiftRestrictions: true,
        }),
        // Adjacent conflict toggle (#8)
        ...(ss?.disableAdjacentConflict && {
          disableAdjacentConflict: true,
        }),
        // Post-period constraints (#6, #7)
        earlyShiftConfig: { postPeriodConstraint: postPeriodConfig },
        ortoolsConfig: {
          penaltyWeights,
          hardConstraints,
          solverSettings: { timeout, numWorkers: solverSettings.numWorkers || 4 },
        },
      },
      timeout,
      preservePrefilled: dto.preservePrefilled ?? true,
    };

    const result = await this.ortoolsClient.optimize(ortoolsRequest);

    if (result.success && result.schedule) {
      await this.bulkUpdateCells(
        organizationId,
        dto.periodId,
        this.scheduleToUpdates(result.schedule),
        deptId,
      );
    }

    return result;
  }

  async clearSchedule(organizationId: string, periodId: string, departmentId?: string): Promise<void> {
    const schedule = await this.getOrCreateSchedule(organizationId, periodId, departmentId);
    const { error } = await this.supabase
      .from('schedules')
      .update({ schedule_data: {}, updated_at: new Date().toISOString() })
      .eq('id', schedule.id);

    if (error) {
      this.logger.error('Failed to clear schedule', error);
      throw new BadRequestException('Failed to clear schedule');
    }
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
    organizationId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<CalendarRule[]> {
    let query = this.supabase
      .from('calendar_rules')
      .select('*')
      .eq('organization_id', organizationId)
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
    organizationId: string,
    dto: CreateCalendarRuleDto,
  ): Promise<CalendarRule> {
    const { data, error } = await this.supabase
      .from('calendar_rules')
      .insert({
        organization_id: organizationId,
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

  async deleteCalendarRule(organizationId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from('calendar_rules')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error('Failed to delete calendar rule', error);
      throw new BadRequestException('Failed to delete calendar rule');
    }
  }

  // ==================== SETTINGS: Daily Limits ====================

  async getDailyLimits(organizationId: string, departmentId?: string): Promise<DailyLimits | null> {
    let query = this.supabase
      .from('daily_limits')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    } else {
      query = query.is('department_id', null);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error('Failed to fetch daily limits', error);
    }

    return data;
  }

  async updateDailyLimits(
    organizationId: string,
    dto: UpdateDailyLimitsDto,
    departmentId?: string,
  ): Promise<DailyLimits> {
    const existing = await this.getDailyLimits(organizationId, departmentId);

    const limitConfig = {
      ...(existing?.limit_config || {}),
      ...(dto.minOffPerDay !== undefined && { minOffPerDay: dto.minOffPerDay }),
      ...(dto.maxOffPerDay !== undefined && { maxOffPerDay: dto.maxOffPerDay }),
      ...(dto.minEarlyPerDay !== undefined && { minEarlyPerDay: dto.minEarlyPerDay }),
      ...(dto.maxEarlyPerDay !== undefined && { maxEarlyPerDay: dto.maxEarlyPerDay }),
      ...(dto.minWorkingStaffPerDay !== undefined && {
        minWorkingStaffPerDay: dto.minWorkingStaffPerDay,
      }),
      ...(dto.staffTypeLimits !== undefined && { staffTypeLimits: dto.staffTypeLimits }),
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
      const versionId = await this.getOrCreateConfigVersion(organizationId);

      const { data, error } = await this.supabase
        .from('daily_limits')
        .insert({
          organization_id: organizationId,
          version_id: versionId,
          name: 'default',
          limit_config: limitConfig,
          is_hard_constraint: dto.is_hard_constraint ?? false,
          department_id: departmentId ?? null,
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

  async getMonthlyLimits(organizationId: string, departmentId?: string): Promise<MonthlyLimits | null> {
    let query = this.supabase
      .from('monthly_limits')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    } else {
      query = query.is('department_id', null);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error('Failed to fetch monthly limits', error);
    }

    return data;
  }

  async getAllMonthlyLimits(organizationId: string, departmentId?: string): Promise<any[]> {
    let query = this.supabase
      .from('monthly_limits')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    } else {
      query = query.is('department_id', null);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Failed to fetch all monthly limits', error);
      return [];
    }

    return data || [];
  }

  async updateMonthlyLimits(
    organizationId: string,
    dto: UpdateMonthlyLimitsDto,
    departmentId?: string,
  ): Promise<MonthlyLimits> {
    const existing = await this.getMonthlyLimits(organizationId, departmentId);

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
      const versionId = await this.getOrCreateConfigVersion(organizationId);

      const { data, error } = await this.supabase
        .from('monthly_limits')
        .insert({
          organization_id: organizationId,
          version_id: versionId,
          name: 'default',
          min_count: dto.min_count,
          max_count: dto.max_count,
          is_hard_constraint: dto.is_hard_constraint ?? false,
          limit_config: dto.exclude_calendar_rules !== undefined
            ? { exclude_calendar_rules: dto.exclude_calendar_rules }
            : {},
          department_id: departmentId ?? null,
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

  async createMonthlyLimitRecord(organizationId: string, dto: any, departmentId?: string): Promise<any> {
    const versionId = await this.getOrCreateConfigVersion(organizationId);
    const { data, error } = await this.supabase
      .from('monthly_limits')
      .insert({
        organization_id: organizationId,
        version_id: versionId,
        name: dto.name || (dto.scope === 'all' ? 'default' : dto.targetIds?.[0] || dto.scope),
        min_count: dto.min_count,
        max_count: dto.max_count,
        is_hard_constraint: dto.is_hard_constraint ?? false,
        limit_config: {
          scope: dto.scope || 'all',
          targetIds: dto.targetIds || [],
          minCount: dto.min_count,
          maxCount: dto.max_count,
          exclude_calendar_rules: dto.exclude_calendar_rules ?? true,
        },
        department_id: departmentId ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new BadRequestException('Failed to create monthly limit record');
    return data;
  }

  async updateMonthlyLimitRecord(organizationId: string, limitId: string, dto: any): Promise<any> {
    const { data: existing } = await this.supabase
      .from('monthly_limits')
      .select('limit_config')
      .eq('id', limitId)
      .eq('organization_id', organizationId)
      .single();

    const existingConfig = (existing?.limit_config as any) || {};
    const updateData: any = {
      updated_at: new Date().toISOString(),
      limit_config: {
        ...existingConfig,
        ...(dto.scope !== undefined && { scope: dto.scope }),
        ...(dto.targetIds !== undefined && { targetIds: dto.targetIds }),
        ...(dto.min_count !== undefined && { minCount: dto.min_count }),
        ...(dto.max_count !== undefined && { maxCount: dto.max_count }),
        ...(dto.exclude_calendar_rules !== undefined && {
          exclude_calendar_rules: dto.exclude_calendar_rules,
          excludeCalendarRules: dto.exclude_calendar_rules,
        }),
      },
    };

    if (dto.min_count !== undefined) updateData.min_count = dto.min_count;
    if (dto.max_count !== undefined) updateData.max_count = dto.max_count;
    if (dto.is_hard_constraint !== undefined) updateData.is_hard_constraint = dto.is_hard_constraint;
    if (dto.name !== undefined) updateData.name = dto.name;

    const { data, error } = await this.supabase
      .from('monthly_limits')
      .update(updateData)
      .eq('id', limitId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw new BadRequestException('Failed to update monthly limit record');
    return data;
  }

  async deleteMonthlyLimitRecord(organizationId: string, limitId: string): Promise<void> {
    const { error } = await this.supabase
      .from('monthly_limits')
      .delete()
      .eq('id', limitId)
      .eq('organization_id', organizationId);

    if (error) throw new BadRequestException('Failed to delete monthly limit record');
  }

  // ==================== SETTINGS: Solver Config ====================

  async getSolverConfig(organizationId: string): Promise<ORToolsSolverConfig | null> {
    const { data, error } = await this.supabase
      .from('ortools_solver_config')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error('Failed to fetch solver config', error);
    }

    return data;
  }

  async updateSolverConfig(
    organizationId: string,
    dto: UpdateSolverConfigDto,
  ): Promise<ORToolsSolverConfig> {
    const existing = await this.getSolverConfig(organizationId);

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

    const solverSettingsFields: Record<string, unknown> = {};
    if (dto.timeout) solverSettingsFields.timeout = dto.timeout;
    if (dto.numWorkers) solverSettingsFields.numWorkers = dto.numWorkers;
    if (dto.disableStaffStatusShiftRestrictions !== undefined) solverSettingsFields.disableStaffStatusShiftRestrictions = dto.disableStaffStatusShiftRestrictions;
    if (dto.postPeriodEnabled !== undefined) solverSettingsFields.postPeriodEnabled = dto.postPeriodEnabled;
    if (dto.postPeriodDays !== undefined) solverSettingsFields.postPeriodDays = dto.postPeriodDays;
    if (dto.postPeriodIsHard !== undefined) solverSettingsFields.postPeriodIsHard = dto.postPeriodIsHard;
    if (dto.postPeriodMinLength !== undefined) solverSettingsFields.postPeriodMinLength = dto.postPeriodMinLength;
    if (dto.disableAdjacentConflict !== undefined) solverSettingsFields.disableAdjacentConflict = dto.disableAdjacentConflict;

    if (Object.keys(solverSettingsFields).length > 0) {
      updateData.solver_settings = {
        ...(existing?.solver_settings || {}),
        ...solverSettingsFields,
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
      const versionId = await this.getOrCreateConfigVersion(organizationId);

      const { data, error } = await this.supabase
        .from('ortools_solver_config')
        .insert({
          organization_id: organizationId,
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

  async getStaffGroups(organizationId: string, departmentId?: string): Promise<ScheduleStaffGroup[]> {
    let query = this.supabase
      .from('staff_groups')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    } else {
      query = query.is('department_id', null);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Failed to fetch staff groups', error);
      throw new BadRequestException('Failed to fetch staff groups');
    }

    return data || [];
  }

  async createStaffGroup(
    organizationId: string,
    dto: CreateStaffGroupDto,
    departmentId?: string,
  ): Promise<ScheduleStaffGroup> {
    const versionId = await this.getOrCreateConfigVersion(organizationId);

    // Ensure members is always a clean string[]
    const rawMembers = dto.group_config?.members;
    const members = Array.isArray(rawMembers)
      ? rawMembers.filter((m) => typeof m === 'string')
      : [];

    const { data, error } = await this.supabase
      .from('staff_groups')
      .insert({
        organization_id: organizationId,
        version_id: versionId,
        name: dto.name,
        description: dto.description,
        group_config: {
          ...(dto.group_config || {}),
          color: dto.color || dto.group_config?.color || '#3B82F6',
          members,
        },
        department_id: departmentId ?? null,
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
    organizationId: string,
    id: string,
    dto: UpdateStaffGroupDto,
  ): Promise<ScheduleStaffGroup> {
    // Fetch existing to preserve group_config.members when updating name/color/description
    const { data: existing } = await this.supabase
      .from('staff_groups')
      .select('group_config')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (dto.name !== undefined) updatePayload.name = dto.name;
    if (dto.description !== undefined) updatePayload.description = dto.description;
    if (dto.is_active !== undefined) updatePayload.is_active = dto.is_active;
    // Merge color into group_config, preserving existing members
    if (dto.color !== undefined || dto.group_config !== undefined) {
      const incomingConfig = dto.group_config || {};
      // Coerce members to string[] if provided in the patch
      const patchedMembers =
        incomingConfig.members !== undefined
          ? Array.isArray(incomingConfig.members)
            ? incomingConfig.members.filter((m) => typeof m === 'string')
            : (existing?.group_config?.members ?? [])
          : undefined;

      updatePayload.group_config = {
        ...(existing?.group_config || {}),
        ...incomingConfig,
        ...(patchedMembers !== undefined ? { members: patchedMembers } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
      };
    }

    const { data, error } = await this.supabase
      .from('staff_groups')
      .update(updatePayload)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update staff group', error);
      throw new BadRequestException('Failed to update staff group');
    }

    return data;
  }

  async deleteStaffGroup(organizationId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from('staff_groups')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error('Failed to delete staff group', error);
      throw new BadRequestException('Failed to delete staff group');
    }
  }

  async getStaffGroupMembers(
    organizationId: string,
    groupId: string,
  ): Promise<Array<{ staff_id: string; group_id: string }>> {
    // Members are stored in group_config.members JSONB array on the staff_groups table
    const { data, error } = await this.supabase
      .from('staff_groups')
      .select('id, group_config')
      .eq('id', groupId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      this.logger.error('Failed to fetch staff group members', error);
      throw new BadRequestException('Failed to fetch staff group members');
    }

    const memberIds: string[] = data?.group_config?.members || [];
    return memberIds.map((staffId) => ({ staff_id: staffId, group_id: groupId }));
  }

  async setStaffGroupMembers(
    organizationId: string,
    groupId: string,
    staffIds: string[],
  ): Promise<void> {
    // Validate all provided IDs belong to active staff in this organization
    if (staffIds.length > 0) {
      const { data: validStaff, error: staffError } = await this.supabase
        .from('staff')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .in('id', staffIds);

      if (staffError) {
        this.logger.error('Failed to validate staff IDs', staffError);
        throw new BadRequestException('Failed to validate staff IDs');
      }

      const validIds = new Set((validStaff || []).map((s: any) => s.id));
      const invalidIds = staffIds.filter((id) => !validIds.has(id));
      if (invalidIds.length > 0) {
        throw new BadRequestException(
          `Invalid or inactive staff IDs: ${invalidIds.join(', ')}`,
        );
      }
    }

    // Store members in group_config.members JSONB on the staff_groups table
    const { data: existing, error: fetchError } = await this.supabase
      .from('staff_groups')
      .select('group_config')
      .eq('id', groupId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError) {
      this.logger.error('Failed to fetch staff group for member update', fetchError);
      throw new BadRequestException('Failed to fetch staff group');
    }

    const updatedConfig = {
      ...(existing?.group_config || {}),
      members: staffIds,
    };

    const { error } = await this.supabase
      .from('staff_groups')
      .update({ group_config: updatedConfig, updated_at: new Date().toISOString() })
      .eq('id', groupId)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error('Failed to set staff group members', error);
      throw new BadRequestException('Failed to set staff group members');
    }
  }

  // ==================== SETTINGS: Priority Rules ====================

  async getPriorityRules(organizationId: string, departmentId?: string): Promise<any[]> {
    // Fetch rules that match the department OR have no department (global rules).
    // Using `or` so that department-scoped rules are always included when a departmentId is provided,
    // and global rules (department_id IS NULL) are always included regardless.
    let query = this.supabase
      .from('priority_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (departmentId) {
      query = query.or(`department_id.eq.${departmentId},department_id.is.null`);
    } else {
      query = query.is('department_id', null);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Failed to fetch priority rules', error);
    }

    // Flatten rule_definition JSONB into top-level fields expected by the frontend
    return (data || []).map((row: any) => {
      const rd = row.rule_definition || {};
      return {
        ...row,
        // Normalise both camelCase (new) and snake_case (legacy) keys in rule_definition
        staff_ids: rd.staff_ids ?? rd.staffIds ?? [],
        rule_type: rd.rule_type ?? rd.ruleType ?? row.rule_type ?? 'preferred_shift',
        shift_type: rd.shift_type ?? rd.shiftType ?? row.shift_type ?? 'any',
        days_of_week: rd.days_of_week ?? rd.daysOfWeek ?? [],
        allowed_shifts: rd.allowed_shifts ?? rd.allowedShifts ?? [],
      };
    });
  }

  async createPriorityRule(
    organizationId: string,
    dto: CreatePriorityRuleDto,
    departmentId?: string,
  ): Promise<any> {
    const versionId = await this.getOrCreateConfigVersion(organizationId);

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
        organization_id: organizationId,
        version_id: versionId,
        name: dto.name,
        description: dto.description,
        priority_level: dto.priority_level || 1,
        rule_definition: ruleDefinition,
        penalty_weight: dto.penalty_weight || 1.0,
        is_hard_constraint: dto.is_hard_constraint ?? false,
        effective_from: dto.effective_from,
        effective_until: dto.effective_until,
        department_id: departmentId ?? null,
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
    organizationId: string,
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
        .eq('organization_id', organizationId)
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
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update priority rule', error);
      throw new BadRequestException('Failed to update priority rule');
    }

    return data;
  }

  async deletePriorityRule(organizationId: string, id: string): Promise<void> {
    // Soft delete
    const { error } = await this.supabase
      .from('priority_rules')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error('Failed to delete priority rule', error);
      throw new BadRequestException('Failed to delete priority rule');
    }
  }

  // ==================== SETTINGS: Early Shift Preferences ====================

  async getEarlyShiftPreferences(organizationId: string, departmentId?: string): Promise<any[]> {
    let query = this.supabase
      .from('staff_early_shift_preferences')
      .select('*')
      .eq('organization_id', organizationId);

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    } else {
      query = query.is('department_id', null);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Failed to fetch early shift preferences', error);
      throw new BadRequestException('Failed to fetch early shift preferences');
    }

    return data || [];
  }

  async createEarlyShiftPreference(
    organizationId: string,
    dto: CreateEarlyShiftPreferenceDto,
  ): Promise<any> {
    const { data, error } = await this.supabase
      .from('staff_early_shift_preferences')
      .insert({
        organization_id: organizationId,
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
    organizationId: string,
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
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update early shift preference', error);
      throw new BadRequestException('Failed to update early shift preference');
    }

    return data;
  }

  async bulkUpsertEarlyShiftPreferences(
    organizationId: string,
    dto: BulkEarlyShiftPreferenceDto,
    departmentId?: string,
  ): Promise<void> {
    // Delete existing preferences for these staff members
    const staffIds = dto.preferences.map((p) => p.staff_id);

    let deleteQuery = this.supabase
      .from('staff_early_shift_preferences')
      .delete()
      .eq('organization_id', organizationId)
      .in('staff_id', staffIds)
      .is('applies_to_date', null); // Only delete general preferences, not date-specific

    if (departmentId) {
      deleteQuery = deleteQuery.eq('department_id', departmentId);
    } else {
      deleteQuery = deleteQuery.is('department_id', null);
    }

    await deleteQuery;

    // Insert new preferences
    const inserts = dto.preferences.map((p) => ({
      organization_id: organizationId,
      staff_id: p.staff_id,
      can_do_early_shift: p.can_do_early_shift,
      applies_to_date: p.applies_to_date || null,
      preference_source: 'bulk_assignment',
      department_id: departmentId ?? null,
    }));

    const { error } = await this.supabase
      .from('staff_early_shift_preferences')
      .insert(inserts);

    if (error) {
      this.logger.error('Failed to bulk upsert early shift preferences', error);
      throw new BadRequestException('Failed to bulk upsert early shift preferences');
    }
  }

  async deleteEarlyShiftPreference(organizationId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from('staff_early_shift_preferences')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error('Failed to delete early shift preference', error);
      throw new BadRequestException('Failed to delete early shift preference');
    }
  }

  // ==================== SETTINGS: Period Configuration ====================

  async getPeriodConfiguration(organizationId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('period_configuration')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error('Failed to fetch period configuration', error);
    }

    return data;
  }

  async updatePeriodConfiguration(
    organizationId: string,
    dto: UpdatePeriodConfigurationDto,
  ): Promise<any> {
    const existing = await this.getPeriodConfiguration(organizationId);

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
          organization_id: organizationId,
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

  async regeneratePeriods(organizationId: string): Promise<SchedulePeriod[]> {
    const config = await this.getPeriodConfiguration(organizationId);
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

    // Delete existing periods for this org and insert new ones
    await this.supabase.from('periods').delete().eq('organization_id', organizationId);

    const { data, error } = await this.supabase
      .from('periods')
      .insert(periods.map(p => ({ ...p, organization_id: organizationId })))
      .select();

    if (error) {
      this.logger.error('Failed to regenerate periods', error);
      throw new BadRequestException('Failed to regenerate periods');
    }

    return data || [];
  }

  // ==================== BACKUP ASSIGNMENTS ====================

  async getBackupAssignments(organizationId: string, departmentId?: string, activeOnly = false): Promise<Array<{
    id: string;
    staffId: string;
    groupId: string;
    isActive: boolean;
    assignmentType?: string;
    priorityOrder?: number;
  }>> {
    let query = this.supabase
      .from('staff_backup_assignments')
      .select('id, staff_id, group_id, is_active, assignment_type, priority_order')
      .eq('organization_id', organizationId);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    // Filter by department if provided — join via staff table
    // For simplicity, fetch all active assignments and filter by staff in the department
    const { data, error } = await query;

    if (error) {
      this.logger.warn('Failed to fetch backup assignments', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    // If departmentId provided, filter to assignments where the backup staff is in that department
    if (departmentId) {
      const deptStaff = await this.getStaff(organizationId, departmentId);
      const deptStaffIds = new Set(deptStaff.map((s) => s.id));
      return data
        .filter((a: any) => deptStaffIds.has(a.staff_id))
        .map((a: any) => ({
          id: a.id,
          staffId: a.staff_id,
          groupId: a.group_id,
          isActive: a.is_active,
          assignmentType: a.assignment_type,
          priorityOrder: a.priority_order,
        }));
    }

    return data.map((a: any) => ({
      id: a.id,
      staffId: a.staff_id,
      groupId: a.group_id,
      isActive: a.is_active,
      assignmentType: a.assignment_type,
      priorityOrder: a.priority_order,
    }));
  }

  async createBackupAssignment(
    organizationId: string,
    dto: { staffId: string; groupId: string; assignmentType?: string; priorityOrder?: number },
  ) {
    const versionId = await this.getOrCreateConfigVersion(organizationId);
    const { data, error } = await this.supabase
      .from('staff_backup_assignments')
      .insert({
        organization_id: organizationId,
        version_id: versionId,
        staff_id: dto.staffId,
        group_id: dto.groupId,
        is_active: true,
        assignment_type: dto.assignmentType ?? 'coverage',
        priority_order: dto.priorityOrder ?? 0,
      })
      .select('id, staff_id, group_id, is_active, assignment_type, priority_order')
      .single();

    if (error) throw new Error(`Failed to create backup assignment: ${error.message}`);
    return {
      id: data.id,
      staffId: data.staff_id,
      groupId: data.group_id,
      isActive: data.is_active,
      assignmentType: data.assignment_type,
      priorityOrder: data.priority_order,
    };
  }

  async updateBackupAssignment(
    organizationId: string,
    id: string,
    dto: { isActive?: boolean; priorityOrder?: number },
  ) {
    const updates: Record<string, any> = {};
    if (dto.isActive !== undefined) updates.is_active = dto.isActive;
    if (dto.priorityOrder !== undefined) updates.priority_order = dto.priorityOrder;

    const { data, error } = await this.supabase
      .from('staff_backup_assignments')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('id, staff_id, group_id, is_active, assignment_type, priority_order')
      .single();

    if (error) throw new Error(`Failed to update backup assignment: ${error.message}`);
    return {
      id: data.id,
      staffId: data.staff_id,
      groupId: data.group_id,
      isActive: data.is_active,
      assignmentType: data.assignment_type,
      priorityOrder: data.priority_order,
    };
  }

  async deleteBackupAssignment(organizationId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from('staff_backup_assignments')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw new Error(`Failed to delete backup assignment: ${error.message}`);
  }

  // ==================== STAFF UNAVAILABILITY ====================

  async getStaffUnavailability(
    organizationId: string,
    staffId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Array<{ id: string; staffId: string; date: string; reason?: string; createdAt: string }>> {
    let query = this.supabase
      .from('staff_unavailability')
      .select('id, staff_id, date, reason, created_at')
      .eq('organization_id', organizationId)
      .order('date', { ascending: true });

    if (staffId) query = query.eq('staff_id', staffId);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query;
    if (error) {
      this.logger.warn('Failed to fetch staff unavailability', error);
      return [];
    }
    return (data ?? []).map((r: any) => ({
      id: r.id,
      staffId: r.staff_id,
      date: r.date,
      reason: r.reason,
      createdAt: r.created_at,
    }));
  }

  async createStaffUnavailability(
    organizationId: string,
    dto: { staffId: string; date: string; reason?: string },
  ) {
    const { data, error } = await this.supabase
      .from('staff_unavailability')
      .upsert(
        {
          organization_id: organizationId,
          staff_id: dto.staffId,
          date: dto.date,
          reason: dto.reason ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,staff_id,date' },
      )
      .select('id, staff_id, date, reason, created_at')
      .single();

    if (error) throw new Error(`Failed to create unavailability: ${error.message}`);
    return { id: data.id, staffId: data.staff_id, date: data.date, reason: data.reason, createdAt: data.created_at };
  }

  async bulkCreateStaffUnavailability(
    organizationId: string,
    dto: { staffId: string; dates: string[]; reason?: string },
  ) {
    if (!dto.dates.length) return [];
    const rows = dto.dates.map((date) => ({
      organization_id: organizationId,
      staff_id: dto.staffId,
      date,
      reason: dto.reason ?? null,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await this.supabase
      .from('staff_unavailability')
      .upsert(rows, { onConflict: 'organization_id,staff_id,date' })
      .select('id, staff_id, date, reason, created_at');

    if (error) throw new Error(`Failed to bulk create unavailability: ${error.message}`);
    return (data ?? []).map((r: any) => ({
      id: r.id, staffId: r.staff_id, date: r.date, reason: r.reason, createdAt: r.created_at,
    }));
  }

  async deleteStaffUnavailability(organizationId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from('staff_unavailability')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw new Error(`Failed to delete unavailability: ${error.message}`);
  }

  // ==================== HELPERS ====================

  private async getOrCreateConfigVersion(organizationId: string): Promise<string> {
    // Try to find existing active version
    const { data: existing } = await this.supabase
      .from('config_versions')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (existing) {
      return existing.id;
    }

    // Create new version
    const { data: version, error } = await this.supabase
      .from('config_versions')
      .insert({
        organization_id: organizationId,
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

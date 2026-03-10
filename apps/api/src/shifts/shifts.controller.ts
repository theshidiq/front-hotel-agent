import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

// Staff DTOs
import { CreateStaffDto, UpdateStaffDto, ReorderStaffDto } from './dto/staff.dto';

// Schedule DTOs
import {
  CreatePeriodDto,
  UpdateCellDto,
  BulkUpdateCellsDto,
  OptimizeRequestDto,
  ScheduleResponseDto,
  OptimizeResponseDto,
} from './dto/schedule.dto';

// Settings DTOs
import {
  UpdateDailyLimitsDto,
  UpdateMonthlyLimitsDto,
  CreateMonthlyLimitRecordDto,
  UpdateSolverConfigDto,
  CreateCalendarRuleDto,
  CreateStaffGroupDto,
  UpdateStaffGroupDto,
  CreatePriorityRuleDto,
  UpdatePriorityRuleDto,
  CreateEarlyShiftPreferenceDto,
  UpdateEarlyShiftPreferenceDto,
  BulkEarlyShiftPreferenceDto,
  UpdatePeriodConfigurationDto,
  CreateBackupAssignmentDto,
  UpdateBackupAssignmentDto,
  CreateStaffUnavailabilityDto,
  BulkCreateStaffUnavailabilityDto,
} from './dto/settings.dto';

@ApiTags('shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  // ==================== STAFF ENDPOINTS ====================

  @Get('staff')
  @ApiOperation({ summary: 'Get all staff members' })
  @ApiQuery({ name: 'department_id', required: false, description: 'Filter by department' })
  @ApiResponse({ status: 200, description: 'List of staff members' })
  async getStaff(@GetUser() user: any, @Query('department_id') departmentId?: string) {
    return this.shiftsService.getStaff(user.organization_id, departmentId);
  }

  @Post('staff')
  @ApiOperation({ summary: 'Create a new staff member' })
  @ApiResponse({ status: 201, description: 'Staff member created' })
  async createStaff(@GetUser() user: any, @Body() createStaffDto: CreateStaffDto) {
    return this.shiftsService.createStaff(user.organization_id, createStaffDto);
  }

  @Patch('staff/:id')
  @ApiOperation({ summary: 'Update a staff member' })
  @ApiParam({ name: 'id', description: 'Staff member ID' })
  @ApiResponse({ status: 200, description: 'Staff member updated' })
  async updateStaff(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() updateStaffDto: UpdateStaffDto,
  ) {
    return this.shiftsService.updateStaff(user.organization_id, id, updateStaffDto);
  }

  @Delete('staff/:id')
  @ApiOperation({ summary: 'Delete a staff member' })
  @ApiParam({ name: 'id', description: 'Staff member ID' })
  @ApiResponse({ status: 200, description: 'Staff member deleted' })
  async deleteStaff(@GetUser() user: any, @Param('id') id: string) {
    return this.shiftsService.deleteStaff(user.organization_id, id);
  }

  @Put('staff/reorder')
  @ApiOperation({ summary: 'Reorder staff members' })
  @ApiResponse({ status: 200, description: 'Staff members reordered' })
  async reorderStaff(@GetUser() user: any, @Body() reorderDto: ReorderStaffDto) {
    return this.shiftsService.reorderStaff(user.organization_id, reorderDto.staffIds);
  }

  // ==================== PERIOD ENDPOINTS ====================

  @Get('periods')
  @ApiOperation({ summary: 'Get all schedule periods' })
  @ApiResponse({ status: 200, description: 'List of periods' })
  async getPeriods(@GetUser() user: any) {
    return this.shiftsService.getPeriods(user.organization_id);
  }

  @Post('periods')
  @ApiOperation({ summary: 'Create a new period' })
  @ApiResponse({ status: 201, description: 'Period created' })
  async createPeriod(@GetUser() user: any, @Body() createPeriodDto: CreatePeriodDto) {
    return this.shiftsService.createPeriod(user.organization_id, createPeriodDto);
  }

  @Delete('periods/:id')
  @ApiOperation({ summary: 'Delete a period' })
  @ApiParam({ name: 'id', description: 'Period ID' })
  @ApiResponse({ status: 200, description: 'Period deleted' })
  async deletePeriod(@GetUser() user: any, @Param('id') id: string) {
    return this.shiftsService.deletePeriod(user.organization_id, id);
  }

  // ==================== SCHEDULE ENDPOINTS ====================

  @Get('schedule/:periodId')
  @ApiOperation({ summary: 'Get schedule for a period' })
  @ApiParam({ name: 'periodId', description: 'Period ID' })
  @ApiQuery({ name: 'department_id', required: false, description: 'Department ID for isolated schedule' })
  @ApiResponse({ status: 200, description: 'Schedule data', type: ScheduleResponseDto })
  async getSchedule(
    @GetUser() user: any,
    @Param('periodId') periodId: string,
    @Query('department_id') departmentId?: string,
  ) {
    return this.shiftsService.getSchedule(user.organization_id, periodId, departmentId);
  }

  @Patch('schedule/cell')
  @ApiOperation({ summary: 'Update a single schedule cell' })
  @ApiQuery({ name: 'department_id', required: false })
  @ApiResponse({ status: 200, description: 'Cell updated' })
  async updateCell(
    @GetUser() user: any,
    @Body() updateCellDto: UpdateCellDto,
    @Query('department_id') departmentId?: string,
  ) {
    const { periodId, staffId, date, symbol } = updateCellDto;
    await this.shiftsService.updateCell(user.organization_id, periodId, staffId, date, symbol, departmentId);
    return { success: true };
  }

  @Patch('schedule/:periodId/cells')
  @ApiOperation({ summary: 'Bulk update schedule cells' })
  @ApiParam({ name: 'periodId', description: 'Period ID' })
  @ApiQuery({ name: 'department_id', required: false, description: 'Department ID for isolated schedule' })
  @ApiResponse({ status: 200, description: 'Cells updated' })
  async bulkUpdateCells(
    @GetUser() user: any,
    @Param('periodId') periodId: string,
    @Body() bulkUpdateDto: BulkUpdateCellsDto,
    @Query('department_id') departmentId?: string,
  ) {
    return this.shiftsService.bulkUpdateCells(user.organization_id, periodId, bulkUpdateDto.updates, departmentId);
  }

  @Delete('schedule/:periodId/cells')
  @ApiOperation({ summary: 'Clear all schedule cells for a period' })
  @ApiParam({ name: 'periodId', description: 'Period ID' })
  @ApiQuery({ name: 'department_id', required: false })
  @ApiResponse({ status: 204, description: 'Schedule cleared' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearSchedule(
    @GetUser() user: any,
    @Param('periodId') periodId: string,
    @Query('department_id') departmentId?: string,
  ) {
    return this.shiftsService.clearSchedule(user.organization_id, periodId, departmentId);
  }

  // ==================== OPTIMIZATION ENDPOINTS ====================

  @Post('optimize')
  @ApiOperation({ summary: 'Optimize schedule using OR-Tools' })
  @ApiResponse({ status: 200, description: 'Optimization result', type: OptimizeResponseDto })
  async optimizeSchedule(@GetUser() user: any, @Body() optimizeDto: OptimizeRequestDto) {
    return this.shiftsService.optimizeSchedule(user.organization_id, optimizeDto);
  }

  @Get('optimize/health')
  @ApiOperation({ summary: 'Check OR-Tools service health' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async checkOptimizerHealth() {
    return this.shiftsService.checkOptimizerHealth();
  }

  // ==================== SETTINGS ENDPOINTS ====================

  // Calendar Rules
  @Get('settings/calendar-rules')
  @ApiOperation({ summary: 'Get calendar rules' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter start date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter end date' })
  @ApiResponse({ status: 200, description: 'List of calendar rules' })
  async getCalendarRules(
    @GetUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.shiftsService.getCalendarRules(user.organization_id, startDate, endDate);
  }

  @Post('settings/calendar-rules')
  @ApiOperation({ summary: 'Create a calendar rule' })
  @ApiResponse({ status: 201, description: 'Calendar rule created' })
  async createCalendarRule(@GetUser() user: any, @Body() createDto: CreateCalendarRuleDto) {
    return this.shiftsService.createCalendarRule(user.organization_id, createDto);
  }

  @Delete('settings/calendar-rules/:id')
  @ApiOperation({ summary: 'Delete a calendar rule' })
  @ApiParam({ name: 'id', description: 'Calendar rule ID' })
  @ApiResponse({ status: 200, description: 'Calendar rule deleted' })
  async deleteCalendarRule(@GetUser() user: any, @Param('id') id: string) {
    return this.shiftsService.deleteCalendarRule(user.organization_id, id);
  }

  // Daily Limits
  @Get('settings/daily-limits')
  @ApiOperation({ summary: 'Get daily limits configuration' })
  @ApiQuery({ name: 'department_id', required: false })
  @ApiResponse({ status: 200, description: 'Daily limits configuration' })
  async getDailyLimits(@GetUser() user: any, @Query('department_id') departmentId?: string) {
    const result = await this.shiftsService.getDailyLimits(user.organization_id, departmentId);
    if (result === null) throw new NotFoundException('Daily limits not configured');
    return result;
  }

  @Patch('settings/daily-limits')
  @ApiOperation({ summary: 'Update daily limits configuration' })
  @ApiQuery({ name: 'department_id', required: false })
  @ApiResponse({ status: 200, description: 'Daily limits updated' })
  async updateDailyLimits(@GetUser() user: any, @Body() updateDto: UpdateDailyLimitsDto, @Query('department_id') departmentId?: string) {
    return this.shiftsService.updateDailyLimits(user.organization_id, updateDto, departmentId);
  }

  // Monthly Limits
  @Get('settings/monthly-limits')
  @ApiOperation({ summary: 'Get monthly limits configuration' })
  @ApiQuery({ name: 'department_id', required: false })
  @ApiResponse({ status: 200, description: 'Monthly limits configuration' })
  async getMonthlyLimits(@GetUser() user: any, @Query('department_id') departmentId?: string) {
    const result = await this.shiftsService.getMonthlyLimits(user.organization_id, departmentId);
    if (result === null) throw new NotFoundException('Monthly limits not configured');
    return result;
  }

  @Patch('settings/monthly-limits')
  @ApiOperation({ summary: 'Update monthly limits configuration' })
  @ApiQuery({ name: 'department_id', required: false })
  @ApiResponse({ status: 200, description: 'Monthly limits updated' })
  async updateMonthlyLimits(@GetUser() user: any, @Body() updateDto: UpdateMonthlyLimitsDto, @Query('department_id') departmentId?: string) {
    return this.shiftsService.updateMonthlyLimits(user.organization_id, updateDto, departmentId);
  }

  @Get('settings/monthly-limits/all')
  @ApiOperation({ summary: 'Get all monthly limit records (global + per-staff)' })
  @ApiQuery({ name: 'department_id', required: false })
  @ApiResponse({ status: 200, description: 'All monthly limit records' })
  async getAllMonthlyLimits(@GetUser() user: any, @Query('department_id') departmentId?: string) {
    return this.shiftsService.getAllMonthlyLimits(user.organization_id, departmentId);
  }

  @Post('settings/monthly-limits')
  @ApiOperation({ summary: 'Create a new monthly limit record (per-staff or global)' })
  @ApiQuery({ name: 'department_id', required: false })
  @ApiResponse({ status: 201, description: 'Monthly limit record created' })
  async createMonthlyLimitRecord(@GetUser() user: any, @Body() dto: CreateMonthlyLimitRecordDto, @Query('department_id') departmentId?: string) {
    return this.shiftsService.createMonthlyLimitRecord(user.organization_id, dto, departmentId);
  }

  @Patch('settings/monthly-limits/:id')
  @ApiOperation({ summary: 'Update an individual monthly limit record' })
  @ApiResponse({ status: 200, description: 'Monthly limit record updated' })
  async updateMonthlyLimitRecord(@GetUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.shiftsService.updateMonthlyLimitRecord(user.organization_id, id, dto);
  }

  @Delete('settings/monthly-limits/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a monthly limit record' })
  @ApiResponse({ status: 204, description: 'Monthly limit record deleted' })
  async deleteMonthlyLimitRecord(@GetUser() user: any, @Param('id') id: string) {
    return this.shiftsService.deleteMonthlyLimitRecord(user.organization_id, id);
  }

  // Solver Config
  @Get('settings/solver-config')
  @ApiOperation({ summary: 'Get solver configuration' })
  @ApiResponse({ status: 200, description: 'Solver configuration' })
  async getSolverConfig(@GetUser() user: any) {
    const result = await this.shiftsService.getSolverConfig(user.organization_id);
    if (result === null) throw new NotFoundException('Solver config not configured');
    return result;
  }

  @Patch('settings/solver-config')
  @ApiOperation({ summary: 'Update solver configuration' })
  @ApiResponse({ status: 200, description: 'Solver configuration updated' })
  async updateSolverConfig(@GetUser() user: any, @Body() updateDto: UpdateSolverConfigDto) {
    return this.shiftsService.updateSolverConfig(user.organization_id, updateDto);
  }

  // Staff Groups
  @Get('settings/staff-groups')
  @ApiOperation({ summary: 'Get staff groups' })
  @ApiQuery({ name: 'department_id', required: false })
  @ApiResponse({ status: 200, description: 'List of staff groups' })
  async getStaffGroups(@GetUser() user: any, @Query('department_id') departmentId?: string) {
    return this.shiftsService.getStaffGroups(user.organization_id, departmentId);
  }

  @Post('settings/staff-groups')
  @ApiOperation({ summary: 'Create a staff group' })
  @ApiQuery({ name: 'department_id', required: false })
  @ApiResponse({ status: 201, description: 'Staff group created' })
  async createStaffGroup(@GetUser() user: any, @Body() createDto: CreateStaffGroupDto, @Query('department_id') departmentId?: string) {
    return this.shiftsService.createStaffGroup(user.organization_id, createDto, departmentId);
  }

  @Patch('settings/staff-groups/:id')
  @ApiOperation({ summary: 'Update a staff group' })
  @ApiParam({ name: 'id', description: 'Staff group ID' })
  @ApiResponse({ status: 200, description: 'Staff group updated' })
  async updateStaffGroup(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateStaffGroupDto,
  ) {
    return this.shiftsService.updateStaffGroup(user.organization_id, id, updateDto);
  }

  @Delete('settings/staff-groups/:id')
  @ApiOperation({ summary: 'Delete a staff group' })
  @ApiParam({ name: 'id', description: 'Staff group ID' })
  @ApiResponse({ status: 200, description: 'Staff group deleted' })
  async deleteStaffGroup(@GetUser() user: any, @Param('id') id: string) {
    return this.shiftsService.deleteStaffGroup(user.organization_id, id);
  }

  // Staff Group Members
  @Get('settings/staff-groups/:id/members')
  @ApiOperation({ summary: 'Get staff group members' })
  @ApiParam({ name: 'id', description: 'Staff group ID' })
  @ApiResponse({ status: 200, description: 'List of staff group members' })
  async getStaffGroupMembers(@GetUser() user: any, @Param('id') groupId: string) {
    return this.shiftsService.getStaffGroupMembers(user.organization_id, groupId);
  }

  @Put('settings/staff-groups/:id/members')
  @ApiOperation({ summary: 'Set staff group members' })
  @ApiParam({ name: 'id', description: 'Staff group ID' })
  @ApiResponse({ status: 200, description: 'Staff group members updated' })
  async setStaffGroupMembers(
    @GetUser() user: any,
    @Param('id') groupId: string,
    @Body() body: { staffIds: string[] },
  ) {
    return this.shiftsService.setStaffGroupMembers(user.organization_id, groupId, body.staffIds);
  }

  // ==================== PRIORITY RULES ====================

  @Get('settings/priority-rules')
  @ApiOperation({ summary: 'Get priority rules' })
  @ApiQuery({ name: 'department_id', required: false })
  @ApiResponse({ status: 200, description: 'List of priority rules' })
  async getPriorityRules(@GetUser() user: any, @Query('department_id') departmentId?: string) {
    return this.shiftsService.getPriorityRules(user.organization_id, departmentId);
  }

  @Post('settings/priority-rules')
  @ApiOperation({ summary: 'Create a priority rule' })
  @ApiQuery({ name: 'department_id', required: false })
  @ApiResponse({ status: 201, description: 'Priority rule created' })
  async createPriorityRule(@GetUser() user: any, @Body() createDto: CreatePriorityRuleDto, @Query('department_id') departmentId?: string) {
    return this.shiftsService.createPriorityRule(user.organization_id, createDto, departmentId);
  }

  @Patch('settings/priority-rules/:id')
  @ApiOperation({ summary: 'Update a priority rule' })
  @ApiParam({ name: 'id', description: 'Priority rule ID' })
  @ApiResponse({ status: 200, description: 'Priority rule updated' })
  async updatePriorityRule(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() updateDto: UpdatePriorityRuleDto,
  ) {
    return this.shiftsService.updatePriorityRule(user.organization_id, id, updateDto);
  }

  @Delete('settings/priority-rules/:id')
  @ApiOperation({ summary: 'Delete a priority rule' })
  @ApiParam({ name: 'id', description: 'Priority rule ID' })
  @ApiResponse({ status: 200, description: 'Priority rule deleted' })
  async deletePriorityRule(@GetUser() user: any, @Param('id') id: string) {
    return this.shiftsService.deletePriorityRule(user.organization_id, id);
  }

  // ==================== EARLY SHIFT PREFERENCES ====================

  @Get('settings/early-shift-preferences')
  @ApiOperation({ summary: 'Get early shift preferences' })
  @ApiQuery({ name: 'department_id', required: false })
  @ApiResponse({ status: 200, description: 'List of early shift preferences' })
  async getEarlyShiftPreferences(@GetUser() user: any, @Query('department_id') departmentId?: string) {
    return this.shiftsService.getEarlyShiftPreferences(user.organization_id, departmentId);
  }

  @Post('settings/early-shift-preferences')
  @ApiOperation({ summary: 'Create an early shift preference' })
  @ApiQuery({ name: 'department_id', required: false })
  @ApiResponse({ status: 201, description: 'Early shift preference created' })
  async createEarlyShiftPreference(
    @GetUser() user: any,
    @Body() createDto: CreateEarlyShiftPreferenceDto,
    @Query('department_id') departmentId?: string,
  ) {
    return this.shiftsService.createEarlyShiftPreference(user.organization_id, createDto);
  }

  @Put('settings/early-shift-preferences/bulk')
  @ApiOperation({ summary: 'Bulk upsert early shift preferences' })
  @ApiQuery({ name: 'department_id', required: false })
  @ApiResponse({ status: 200, description: 'Early shift preferences updated' })
  async bulkUpsertEarlyShiftPreferences(
    @GetUser() user: any,
    @Body() bulkDto: BulkEarlyShiftPreferenceDto,
    @Query('department_id') departmentId?: string,
  ) {
    return this.shiftsService.bulkUpsertEarlyShiftPreferences(user.organization_id, bulkDto, departmentId);
  }

  @Patch('settings/early-shift-preferences/:id')
  @ApiOperation({ summary: 'Update an early shift preference' })
  @ApiParam({ name: 'id', description: 'Early shift preference ID' })
  @ApiResponse({ status: 200, description: 'Early shift preference updated' })
  async updateEarlyShiftPreference(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateEarlyShiftPreferenceDto,
  ) {
    return this.shiftsService.updateEarlyShiftPreference(user.organization_id, id, updateDto);
  }

  @Delete('settings/early-shift-preferences/:id')
  @ApiOperation({ summary: 'Delete an early shift preference' })
  @ApiParam({ name: 'id', description: 'Early shift preference ID' })
  @ApiResponse({ status: 200, description: 'Early shift preference deleted' })
  async deleteEarlyShiftPreference(@GetUser() user: any, @Param('id') id: string) {
    return this.shiftsService.deleteEarlyShiftPreference(user.organization_id, id);
  }

  // ==================== PERIOD CONFIGURATION ====================

  @Get('settings/period-configuration')
  @ApiOperation({ summary: 'Get period configuration' })
  @ApiResponse({ status: 200, description: 'Period configuration' })
  async getPeriodConfiguration(@GetUser() user: any) {
    const result = await this.shiftsService.getPeriodConfiguration(user.organization_id);
    if (result === null) throw new NotFoundException('Period configuration not found');
    return result;
  }

  @Patch('settings/period-configuration')
  @ApiOperation({ summary: 'Update period configuration' })
  @ApiResponse({ status: 200, description: 'Period configuration updated' })
  async updatePeriodConfiguration(
    @GetUser() user: any,
    @Body() updateDto: UpdatePeriodConfigurationDto,
  ) {
    return this.shiftsService.updatePeriodConfiguration(user.organization_id, updateDto);
  }

  @Post('settings/periods/regenerate')
  @ApiOperation({ summary: 'Regenerate periods based on configuration' })
  @ApiResponse({ status: 200, description: 'Periods regenerated' })
  async regeneratePeriods(@GetUser() user: any) {
    return this.shiftsService.regeneratePeriods(user.organization_id);
  }

  // ==================== BACKUP ASSIGNMENTS ====================

  @Get('settings/backup-assignments')
  @ApiOperation({ summary: 'List backup assignments' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiResponse({ status: 200, description: 'List of backup assignments' })
  async getBackupAssignments(
    @GetUser() user: any,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.shiftsService.getBackupAssignments(user.organization_id, departmentId);
  }

  @Post('settings/backup-assignments')
  @ApiOperation({ summary: 'Create a backup assignment' })
  @ApiResponse({ status: 201, description: 'Backup assignment created' })
  async createBackupAssignment(
    @GetUser() user: any,
    @Body() dto: CreateBackupAssignmentDto,
  ) {
    return this.shiftsService.createBackupAssignment(user.organization_id, dto);
  }

  @Patch('settings/backup-assignments/:id')
  @ApiOperation({ summary: 'Update a backup assignment (toggle active, change priority)' })
  @ApiParam({ name: 'id', description: 'Backup assignment ID' })
  @ApiResponse({ status: 200, description: 'Backup assignment updated' })
  async updateBackupAssignment(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateBackupAssignmentDto,
  ) {
    return this.shiftsService.updateBackupAssignment(user.organization_id, id, dto);
  }

  @Delete('settings/backup-assignments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a backup assignment' })
  @ApiParam({ name: 'id', description: 'Backup assignment ID' })
  @ApiResponse({ status: 204, description: 'Backup assignment deleted' })
  async deleteBackupAssignment(@GetUser() user: any, @Param('id') id: string) {
    return this.shiftsService.deleteBackupAssignment(user.organization_id, id);
  }

  // ==================== STAFF UNAVAILABILITY ====================

  @Get('settings/staff-unavailability')
  @ApiOperation({ summary: 'List staff unavailability records' })
  @ApiQuery({ name: 'staffId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'List of staff unavailability entries' })
  async getStaffUnavailability(
    @GetUser() user: any,
    @Query('staffId') staffId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.shiftsService.getStaffUnavailability(user.organization_id, staffId, startDate, endDate);
  }

  @Post('settings/staff-unavailability')
  @ApiOperation({ summary: 'Create a staff unavailability entry' })
  @ApiResponse({ status: 201, description: 'Unavailability entry created' })
  async createStaffUnavailability(
    @GetUser() user: any,
    @Body() dto: CreateStaffUnavailabilityDto,
  ) {
    return this.shiftsService.createStaffUnavailability(user.organization_id, dto);
  }

  @Post('settings/staff-unavailability/bulk')
  @ApiOperation({ summary: 'Bulk create staff unavailability entries' })
  @ApiResponse({ status: 201, description: 'Unavailability entries created' })
  async bulkCreateStaffUnavailability(
    @GetUser() user: any,
    @Body() dto: BulkCreateStaffUnavailabilityDto,
  ) {
    return this.shiftsService.bulkCreateStaffUnavailability(user.organization_id, dto);
  }

  @Delete('settings/staff-unavailability/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a staff unavailability entry' })
  @ApiParam({ name: 'id', description: 'Unavailability entry ID' })
  @ApiResponse({ status: 204, description: 'Entry deleted' })
  async deleteStaffUnavailability(@GetUser() user: any, @Param('id') id: string) {
    return this.shiftsService.deleteStaffUnavailability(user.organization_id, id);
  }
}

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
  @ApiResponse({ status: 200, description: 'List of staff members' })
  async getStaff(@GetUser() user: any) {
    return this.shiftsService.getStaff(user.restaurant_id);
  }

  @Post('staff')
  @ApiOperation({ summary: 'Create a new staff member' })
  @ApiResponse({ status: 201, description: 'Staff member created' })
  async createStaff(@GetUser() user: any, @Body() createStaffDto: CreateStaffDto) {
    return this.shiftsService.createStaff(user.restaurant_id, createStaffDto);
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
    return this.shiftsService.updateStaff(user.restaurant_id, id, updateStaffDto);
  }

  @Delete('staff/:id')
  @ApiOperation({ summary: 'Delete a staff member' })
  @ApiParam({ name: 'id', description: 'Staff member ID' })
  @ApiResponse({ status: 200, description: 'Staff member deleted' })
  async deleteStaff(@GetUser() user: any, @Param('id') id: string) {
    return this.shiftsService.deleteStaff(user.restaurant_id, id);
  }

  @Put('staff/reorder')
  @ApiOperation({ summary: 'Reorder staff members' })
  @ApiResponse({ status: 200, description: 'Staff members reordered' })
  async reorderStaff(@GetUser() user: any, @Body() reorderDto: ReorderStaffDto) {
    return this.shiftsService.reorderStaff(user.restaurant_id, reorderDto.staffIds);
  }

  // ==================== PERIOD ENDPOINTS ====================

  @Get('periods')
  @ApiOperation({ summary: 'Get all schedule periods' })
  @ApiResponse({ status: 200, description: 'List of periods' })
  async getPeriods(@GetUser() user: any) {
    return this.shiftsService.getPeriods(user.restaurant_id);
  }

  @Post('periods')
  @ApiOperation({ summary: 'Create a new period' })
  @ApiResponse({ status: 201, description: 'Period created' })
  async createPeriod(@GetUser() user: any, @Body() createPeriodDto: CreatePeriodDto) {
    return this.shiftsService.createPeriod(user.restaurant_id, createPeriodDto);
  }

  @Delete('periods/:id')
  @ApiOperation({ summary: 'Delete a period' })
  @ApiParam({ name: 'id', description: 'Period ID' })
  @ApiResponse({ status: 200, description: 'Period deleted' })
  async deletePeriod(@GetUser() user: any, @Param('id') id: string) {
    return this.shiftsService.deletePeriod(user.restaurant_id, id);
  }

  // ==================== SCHEDULE ENDPOINTS ====================

  @Get('schedule/:periodId')
  @ApiOperation({ summary: 'Get schedule for a period' })
  @ApiParam({ name: 'periodId', description: 'Period ID' })
  @ApiResponse({ status: 200, description: 'Schedule data', type: ScheduleResponseDto })
  async getSchedule(@GetUser() user: any, @Param('periodId') periodId: string) {
    return this.shiftsService.getSchedule(user.restaurant_id, periodId);
  }

  @Patch('schedule/cell')
  @ApiOperation({ summary: 'Update a single schedule cell' })
  @ApiResponse({ status: 200, description: 'Cell updated' })
  async updateCell(@GetUser() user: any, @Body() updateCellDto: UpdateCellDto) {
    const { periodId, staffId, date, symbol } = updateCellDto;
    await this.shiftsService.updateCell(user.restaurant_id, periodId, staffId, date, symbol);
    return { success: true };
  }

  @Patch('schedule/:periodId/cells')
  @ApiOperation({ summary: 'Bulk update schedule cells' })
  @ApiParam({ name: 'periodId', description: 'Period ID' })
  @ApiResponse({ status: 200, description: 'Cells updated' })
  async bulkUpdateCells(
    @GetUser() user: any,
    @Param('periodId') periodId: string,
    @Body() bulkUpdateDto: BulkUpdateCellsDto,
  ) {
    return this.shiftsService.bulkUpdateCells(user.restaurant_id, periodId, bulkUpdateDto.updates);
  }

  @Delete('schedule/:periodId/cells')
  @ApiOperation({ summary: 'Clear all schedule cells for a period' })
  @ApiParam({ name: 'periodId', description: 'Period ID' })
  @ApiResponse({ status: 204, description: 'Schedule cleared' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearSchedule(
    @GetUser() user: any,
    @Param('periodId') periodId: string,
  ) {
    return this.shiftsService.clearSchedule(user.restaurant_id, periodId);
  }

  // ==================== OPTIMIZATION ENDPOINTS ====================

  @Post('optimize')
  @ApiOperation({ summary: 'Optimize schedule using OR-Tools' })
  @ApiResponse({ status: 200, description: 'Optimization result', type: OptimizeResponseDto })
  async optimizeSchedule(@GetUser() user: any, @Body() optimizeDto: OptimizeRequestDto) {
    return this.shiftsService.optimizeSchedule(user.restaurant_id, optimizeDto);
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
    return this.shiftsService.getCalendarRules(user.restaurant_id, startDate, endDate);
  }

  @Post('settings/calendar-rules')
  @ApiOperation({ summary: 'Create a calendar rule' })
  @ApiResponse({ status: 201, description: 'Calendar rule created' })
  async createCalendarRule(@GetUser() user: any, @Body() createDto: CreateCalendarRuleDto) {
    return this.shiftsService.createCalendarRule(user.restaurant_id, createDto);
  }

  @Delete('settings/calendar-rules/:id')
  @ApiOperation({ summary: 'Delete a calendar rule' })
  @ApiParam({ name: 'id', description: 'Calendar rule ID' })
  @ApiResponse({ status: 200, description: 'Calendar rule deleted' })
  async deleteCalendarRule(@GetUser() user: any, @Param('id') id: string) {
    return this.shiftsService.deleteCalendarRule(user.restaurant_id, id);
  }

  // Daily Limits
  @Get('settings/daily-limits')
  @ApiOperation({ summary: 'Get daily limits configuration' })
  @ApiResponse({ status: 200, description: 'Daily limits configuration' })
  async getDailyLimits(@GetUser() user: any) {
    const result = await this.shiftsService.getDailyLimits(user.restaurant_id);
    if (result === null) throw new NotFoundException('Daily limits not configured');
    return result;
  }

  @Patch('settings/daily-limits')
  @ApiOperation({ summary: 'Update daily limits configuration' })
  @ApiResponse({ status: 200, description: 'Daily limits updated' })
  async updateDailyLimits(@GetUser() user: any, @Body() updateDto: UpdateDailyLimitsDto) {
    return this.shiftsService.updateDailyLimits(user.restaurant_id, updateDto);
  }

  // Monthly Limits
  @Get('settings/monthly-limits')
  @ApiOperation({ summary: 'Get monthly limits configuration' })
  @ApiResponse({ status: 200, description: 'Monthly limits configuration' })
  async getMonthlyLimits(@GetUser() user: any) {
    const result = await this.shiftsService.getMonthlyLimits(user.restaurant_id);
    if (result === null) throw new NotFoundException('Monthly limits not configured');
    return result;
  }

  @Patch('settings/monthly-limits')
  @ApiOperation({ summary: 'Update monthly limits configuration' })
  @ApiResponse({ status: 200, description: 'Monthly limits updated' })
  async updateMonthlyLimits(@GetUser() user: any, @Body() updateDto: UpdateMonthlyLimitsDto) {
    return this.shiftsService.updateMonthlyLimits(user.restaurant_id, updateDto);
  }

  @Get('settings/monthly-limits/all')
  @ApiOperation({ summary: 'Get all monthly limit records (global + per-staff)' })
  @ApiResponse({ status: 200, description: 'All monthly limit records' })
  async getAllMonthlyLimits(@GetUser() user: any) {
    return this.shiftsService.getAllMonthlyLimits(user.restaurant_id);
  }

  @Post('settings/monthly-limits')
  @ApiOperation({ summary: 'Create a new monthly limit record (per-staff or global)' })
  @ApiResponse({ status: 201, description: 'Monthly limit record created' })
  async createMonthlyLimitRecord(@GetUser() user: any, @Body() dto: CreateMonthlyLimitRecordDto) {
    return this.shiftsService.createMonthlyLimitRecord(user.restaurant_id, dto);
  }

  @Patch('settings/monthly-limits/:id')
  @ApiOperation({ summary: 'Update an individual monthly limit record' })
  @ApiResponse({ status: 200, description: 'Monthly limit record updated' })
  async updateMonthlyLimitRecord(@GetUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.shiftsService.updateMonthlyLimitRecord(user.restaurant_id, id, dto);
  }

  @Delete('settings/monthly-limits/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a monthly limit record' })
  @ApiResponse({ status: 204, description: 'Monthly limit record deleted' })
  async deleteMonthlyLimitRecord(@GetUser() user: any, @Param('id') id: string) {
    return this.shiftsService.deleteMonthlyLimitRecord(user.restaurant_id, id);
  }

  // Solver Config
  @Get('settings/solver-config')
  @ApiOperation({ summary: 'Get solver configuration' })
  @ApiResponse({ status: 200, description: 'Solver configuration' })
  async getSolverConfig(@GetUser() user: any) {
    const result = await this.shiftsService.getSolverConfig(user.restaurant_id);
    if (result === null) throw new NotFoundException('Solver config not configured');
    return result;
  }

  @Patch('settings/solver-config')
  @ApiOperation({ summary: 'Update solver configuration' })
  @ApiResponse({ status: 200, description: 'Solver configuration updated' })
  async updateSolverConfig(@GetUser() user: any, @Body() updateDto: UpdateSolverConfigDto) {
    return this.shiftsService.updateSolverConfig(user.restaurant_id, updateDto);
  }

  // Staff Groups
  @Get('settings/staff-groups')
  @ApiOperation({ summary: 'Get staff groups' })
  @ApiResponse({ status: 200, description: 'List of staff groups' })
  async getStaffGroups(@GetUser() user: any) {
    return this.shiftsService.getStaffGroups(user.restaurant_id);
  }

  @Post('settings/staff-groups')
  @ApiOperation({ summary: 'Create a staff group' })
  @ApiResponse({ status: 201, description: 'Staff group created' })
  async createStaffGroup(@GetUser() user: any, @Body() createDto: CreateStaffGroupDto) {
    return this.shiftsService.createStaffGroup(user.restaurant_id, createDto);
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
    return this.shiftsService.updateStaffGroup(user.restaurant_id, id, updateDto);
  }

  @Delete('settings/staff-groups/:id')
  @ApiOperation({ summary: 'Delete a staff group' })
  @ApiParam({ name: 'id', description: 'Staff group ID' })
  @ApiResponse({ status: 200, description: 'Staff group deleted' })
  async deleteStaffGroup(@GetUser() user: any, @Param('id') id: string) {
    return this.shiftsService.deleteStaffGroup(user.restaurant_id, id);
  }

  // Staff Group Members
  @Get('settings/staff-groups/:id/members')
  @ApiOperation({ summary: 'Get staff group members' })
  @ApiParam({ name: 'id', description: 'Staff group ID' })
  @ApiResponse({ status: 200, description: 'List of staff group members' })
  async getStaffGroupMembers(@GetUser() user: any, @Param('id') groupId: string) {
    return this.shiftsService.getStaffGroupMembers(user.restaurant_id, groupId);
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
    return this.shiftsService.setStaffGroupMembers(user.restaurant_id, groupId, body.staffIds);
  }

  // ==================== PRIORITY RULES ====================

  @Get('settings/priority-rules')
  @ApiOperation({ summary: 'Get priority rules' })
  @ApiResponse({ status: 200, description: 'List of priority rules' })
  async getPriorityRules(@GetUser() user: any) {
    return this.shiftsService.getPriorityRules(user.restaurant_id);
  }

  @Post('settings/priority-rules')
  @ApiOperation({ summary: 'Create a priority rule' })
  @ApiResponse({ status: 201, description: 'Priority rule created' })
  async createPriorityRule(@GetUser() user: any, @Body() createDto: CreatePriorityRuleDto) {
    return this.shiftsService.createPriorityRule(user.restaurant_id, createDto);
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
    return this.shiftsService.updatePriorityRule(user.restaurant_id, id, updateDto);
  }

  @Delete('settings/priority-rules/:id')
  @ApiOperation({ summary: 'Delete a priority rule' })
  @ApiParam({ name: 'id', description: 'Priority rule ID' })
  @ApiResponse({ status: 200, description: 'Priority rule deleted' })
  async deletePriorityRule(@GetUser() user: any, @Param('id') id: string) {
    return this.shiftsService.deletePriorityRule(user.restaurant_id, id);
  }

  // ==================== EARLY SHIFT PREFERENCES ====================

  @Get('settings/early-shift-preferences')
  @ApiOperation({ summary: 'Get early shift preferences' })
  @ApiResponse({ status: 200, description: 'List of early shift preferences' })
  async getEarlyShiftPreferences(@GetUser() user: any) {
    return this.shiftsService.getEarlyShiftPreferences(user.restaurant_id);
  }

  @Post('settings/early-shift-preferences')
  @ApiOperation({ summary: 'Create an early shift preference' })
  @ApiResponse({ status: 201, description: 'Early shift preference created' })
  async createEarlyShiftPreference(
    @GetUser() user: any,
    @Body() createDto: CreateEarlyShiftPreferenceDto,
  ) {
    return this.shiftsService.createEarlyShiftPreference(user.restaurant_id, createDto);
  }

  @Put('settings/early-shift-preferences/bulk')
  @ApiOperation({ summary: 'Bulk upsert early shift preferences' })
  @ApiResponse({ status: 200, description: 'Early shift preferences updated' })
  async bulkUpsertEarlyShiftPreferences(
    @GetUser() user: any,
    @Body() bulkDto: BulkEarlyShiftPreferenceDto,
  ) {
    return this.shiftsService.bulkUpsertEarlyShiftPreferences(user.restaurant_id, bulkDto);
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
    return this.shiftsService.updateEarlyShiftPreference(user.restaurant_id, id, updateDto);
  }

  @Delete('settings/early-shift-preferences/:id')
  @ApiOperation({ summary: 'Delete an early shift preference' })
  @ApiParam({ name: 'id', description: 'Early shift preference ID' })
  @ApiResponse({ status: 200, description: 'Early shift preference deleted' })
  async deleteEarlyShiftPreference(@GetUser() user: any, @Param('id') id: string) {
    return this.shiftsService.deleteEarlyShiftPreference(user.restaurant_id, id);
  }

  // ==================== PERIOD CONFIGURATION ====================

  @Get('settings/period-configuration')
  @ApiOperation({ summary: 'Get period configuration' })
  @ApiResponse({ status: 200, description: 'Period configuration' })
  async getPeriodConfiguration(@GetUser() user: any) {
    const result = await this.shiftsService.getPeriodConfiguration(user.restaurant_id);
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
    return this.shiftsService.updatePeriodConfiguration(user.restaurant_id, updateDto);
  }

  @Post('settings/periods/regenerate')
  @ApiOperation({ summary: 'Regenerate periods based on configuration' })
  @ApiResponse({ status: 200, description: 'Periods regenerated' })
  async regeneratePeriods(@GetUser() user: any) {
    return this.shiftsService.regeneratePeriods(user.restaurant_id);
  }
}

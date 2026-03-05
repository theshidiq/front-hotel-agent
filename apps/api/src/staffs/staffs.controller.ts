import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StaffsService, Staff } from './staffs.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffEmailDto } from './dto/update-staff-email.dto';
import { RequirePermission } from '../auth/permission.decorator';

@ApiTags('staffs')
@Controller('staffs')
export class StaffsController {
  constructor(private readonly staffsService: StaffsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active staff members' })
  async findAll(): Promise<Staff[]> {
    return this.staffsService.findAll();
  }

  @Get('all')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Get all staff including inactive (admin use)' })
  async findAllIncludingInactive(): Promise<Staff[]> {
    return this.staffsService.findAllIncludingInactive();
  }

  @Patch(':id/email')
  @ApiOperation({ summary: 'Update staff email address' })
  async updateEmail(
    @Param('id') id: string,
    @Body() dto: UpdateStaffEmailDto,
  ): Promise<Staff> {
    return this.staffsService.updateEmail(id, dto.email);
  }

  @Post()
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Register a new staff member' })
  async create(@Body() dto: CreateStaffDto): Promise<Staff> {
    return this.staffsService.create(dto.name, dto.email, dto.position ?? '', (dto as any).department_id, (dto as any).position_id);
  }

  @Patch(':id/org')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Update staff org fields (name, position, department_id, position_id, is_active)' })
  async updateOrg(
    @Param('id') id: string,
    @Body() body: { name?: string; position?: string; department_id?: string | null; position_id?: string | null; is_active?: boolean; employment_type?: string | null; start_period?: { year: number; month: number; day: number } | null; end_period?: { year: number; month: number; day: number } | null },
  ): Promise<Staff> {
    return this.staffsService.updateOrg(id, body);
  }

  @Delete(':id/permanent')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Permanently delete an inactive staff member (hard delete)' })
  async hardDelete(@Param('id') id: string): Promise<void> {
    return this.staffsService.hardDeleteStaff(id);
  }

  @Delete(':id')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Deactivate a staff member (soft delete)' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.staffsService.deleteStaff(id);
  }

  @Patch(':id/role')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Assign a role to a staff member' })
  async updateRole(
    @Param('id') id: string,
    @Body() body: { role_id: string | null },
  ): Promise<Staff> {
    return this.staffsService.updateRole(id, body.role_id);
  }

  @Patch(':id/admin')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Toggle admin status for a staff member' })
  async updateAdmin(
    @Param('id') id: string,
    @Body() body: { is_admin: boolean },
    @Req() req: any,
  ): Promise<Staff> {
    return this.staffsService.updateAdmin(id, body.is_admin, req.user.staffId);
  }
}

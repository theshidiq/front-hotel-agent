import { Controller, Get, Post, Patch, Param, Body, Req } from '@nestjs/common';
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
    return this.staffsService.create(dto.name, dto.email, dto.position);
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

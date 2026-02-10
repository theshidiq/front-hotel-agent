import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StaffsService, Staff } from './staffs.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffEmailDto } from './dto/update-staff-email.dto';
import { RequireStaff } from '../auth/staff.decorator';

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
  @RequireStaff()
  @ApiOperation({ summary: 'Register a new staff member' })
  async create(@Body() dto: CreateStaffDto): Promise<Staff> {
    return this.staffsService.create(dto.name, dto.email, dto.position);
  }
}

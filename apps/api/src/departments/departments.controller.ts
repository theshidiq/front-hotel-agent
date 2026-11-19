import { Controller, Get, Post, Put, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { DepartmentsService, Department, Position } from './departments.service';
import { RequirePermission } from '../auth/permission.decorator';
import { StaffAuthGuard } from '../auth/auth.guard';

class CreateDepartmentDto {
  @IsNotEmpty() @IsString() name: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsNumber() sort_order?: number;
}

class UpdateDepartmentDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsNumber() sort_order?: number;
}

class CreatePositionDto {
  @IsNotEmpty() @IsString() name: string;
  @IsOptional() @IsNumber() sort_order?: number;
}

class UpdatePositionDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() sort_order?: number;
}

@ApiTags('departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  // ── Departments ────────────────────────────────────────────

  @Get()
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all departments with their positions' })
  findAll(@Req() req: any): Promise<Department[]> {
    return this.service.findAllDepartments(req.user.organization_id);
  }

  @Post()
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Create a department' })
  create(@Body() dto: CreateDepartmentDto, @Req() req: any): Promise<Department> {
    return this.service.createDepartment(dto.name, dto.color ?? '#6366f1', dto.sort_order ?? 0, req.user.organization_id);
  }

  @Put(':id')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Update a department' })
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto, @Req() req: any): Promise<Department> {
    return this.service.updateDepartment(id, dto, req.user.organization_id);
  }

  @Delete(':id')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Delete a department (cascades to positions)' })
  remove(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.service.deleteDepartment(id, req.user.organization_id);
  }

  // ── Positions (nested under department) ────────────────────

  @Get(':departmentId/positions')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List positions in a department' })
  findPositions(@Param('departmentId') departmentId: string, @Req() req: any): Promise<Position[]> {
    return this.service.findPositionsByDepartment(departmentId, req.user.organization_id);
  }

  @Post(':departmentId/positions')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Create a position in a department' })
  createPosition(@Param('departmentId') departmentId: string, @Body() dto: CreatePositionDto, @Req() req: any): Promise<Position> {
    return this.service.createPosition(departmentId, dto.name, dto.sort_order ?? 0, req.user.organization_id);
  }

  @Put('positions/:id')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Update a position' })
  updatePosition(@Param('id') id: string, @Body() dto: UpdatePositionDto, @Req() req: any): Promise<Position> {
    return this.service.updatePosition(id, dto, req.user.organization_id);
  }

  @Delete('positions/:id')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Delete a position' })
  removePosition(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.service.deletePosition(id, req.user.organization_id);
  }
}

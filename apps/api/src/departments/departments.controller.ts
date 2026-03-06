import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsHexColor, IsNotEmpty } from 'class-validator';
import { DepartmentsService, Department, Position } from './departments.service';
import { RequirePermission } from '../auth/permission.decorator';

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
  @ApiOperation({ summary: 'List all departments with their positions' })
  findAll(): Promise<Department[]> {
    return this.service.findAllDepartments();
  }

  @Post()
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Create a department' })
  create(@Body() dto: CreateDepartmentDto): Promise<Department> {
    return this.service.createDepartment(dto.name, dto.color ?? '#6366f1', dto.sort_order ?? 0);
  }

  @Put(':id')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Update a department' })
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto): Promise<Department> {
    return this.service.updateDepartment(id, dto);
  }

  @Delete(':id')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Delete a department (cascades to positions)' })
  remove(@Param('id') id: string): Promise<void> {
    return this.service.deleteDepartment(id);
  }

  // ── Positions (nested under department) ────────────────────

  @Get(':departmentId/positions')
  @ApiOperation({ summary: 'List positions in a department' })
  findPositions(@Param('departmentId') departmentId: string): Promise<Position[]> {
    return this.service.findPositionsByDepartment(departmentId);
  }

  @Post(':departmentId/positions')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Create a position in a department' })
  createPosition(@Param('departmentId') departmentId: string, @Body() dto: CreatePositionDto): Promise<Position> {
    return this.service.createPosition(departmentId, dto.name, dto.sort_order ?? 0);
  }

  @Put('positions/:id')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Update a position' })
  updatePosition(@Param('id') id: string, @Body() dto: UpdatePositionDto): Promise<Position> {
    return this.service.updatePosition(id, dto);
  }

  @Delete('positions/:id')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Delete a position' })
  removePosition(@Param('id') id: string): Promise<void> {
    return this.service.deletePosition(id);
  }
}

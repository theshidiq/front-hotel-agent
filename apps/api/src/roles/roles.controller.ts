import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesService, Role, ALL_PERMISSIONS } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto, UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { RequirePermission } from '../auth/permission.decorator';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission()
  @ApiOperation({ summary: 'List all roles with permissions' })
  async findAll(): Promise<Role[]> {
    return this.rolesService.findAll();
  }

  @Get('permissions')
  @RequirePermission()
  @ApiOperation({ summary: 'List all available permission keys' })
  async getPermissions(): Promise<string[]> {
    return [...ALL_PERMISSIONS];
  }

  @Post()
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Create a new role' })
  async create(@Body() dto: CreateRoleDto): Promise<Role> {
    return this.rolesService.create(dto.name, dto.description, dto.permissions);
  }

  @Put(':id')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Update role name/description' })
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto): Promise<Role> {
    return this.rolesService.update(id, dto.name, dto.description);
  }

  @Put(':id/permissions')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Set permissions for a role (full replace)' })
  async updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ): Promise<Role> {
    return this.rolesService.updatePermissions(id, dto.permissions);
  }

  @Delete(':id')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Delete a role (fails if staff assigned)' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.rolesService.remove(id);
  }
}

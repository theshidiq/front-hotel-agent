import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RolesService, Role, ALL_PERMISSIONS } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto, UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { RequirePermission, SkipAuth } from '../auth/permission.decorator';
import { StaffAuthGuard } from '../auth/auth.guard';
import { SupabaseService } from '../supabase/supabase.service';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // Public endpoint — no auth required; caller must supply organizationId
  @Get('default')
  @SkipAuth()
  @ApiOperation({ summary: 'Get the default guest role with permissions (public)' })
  @ApiQuery({ name: 'organizationId', required: true, description: 'Organization ID' })
  async getDefault(@Query('organizationId') organizationId: string): Promise<Role | null> {
    if (!organizationId) throw new BadRequestException('organizationId is required');
    return this.rolesService.findDefault(organizationId);
  }

  @Get()
  @RequirePermission()
  @ApiOperation({ summary: 'List all roles with permissions' })
  async findAll(@Req() req: any): Promise<Role[]> {
    return this.rolesService.findAll(req.user.organization_id);
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
  async create(@Req() req: any, @Body() dto: CreateRoleDto): Promise<Role> {
    return this.rolesService.create(req.user.organization_id, dto.name, dto.description, dto.permissions);
  }

  @Put(':id')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Update role name/description' })
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateRoleDto): Promise<Role> {
    return this.rolesService.update(req.user.organization_id, id, dto.name, dto.description);
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

  @Patch(':id/default')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Set a role as the default guest role' })
  async setDefault(@Req() req: any, @Param('id') id: string): Promise<Role> {
    return this.rolesService.setDefault(req.user.organization_id, id);
  }

  @Delete(':id/default')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Clear the default guest role' })
  async clearDefault(@Req() req: any, @Param('id') id: string): Promise<void> {
    return this.rolesService.clearDefault(req.user.organization_id);
  }

  @Delete(':id')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Delete a role (fails if staff assigned)' })
  async remove(@Req() req: any, @Param('id') id: string): Promise<void> {
    return this.rolesService.remove(req.user.organization_id, id);
  }
}

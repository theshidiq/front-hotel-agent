import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { MenuGroupsService, MenuGroup } from './menu-groups.service';
import { CreateMenuGroupDto } from './dto/create-menu-group.dto';
import { UpdateMenuGroupDto } from './dto/update-menu-group.dto';
import { RequirePermission } from '../auth/permission.decorator';
import { StaffAuthGuard } from '../auth/auth.guard';

@ApiTags('menu-groups')
@Controller('menu-groups')
export class MenuGroupsController {
  constructor(private readonly menuGroupsService: MenuGroupsService) {}

  @Get()
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all menu groups' })
  @ApiQuery({ name: 'seasonal_menu_id', required: false })
  @ApiQuery({ name: 'stay_period_nights', required: false, description: 'Filter by stay duration in nights' })
  async findAll(
    @Req() req: any,
    @Query('seasonal_menu_id') seasonalMenuId?: string,
    @Query('stay_period_nights') stayPeriodNights?: string,
  ): Promise<MenuGroup[]> {
    if (stayPeriodNights) {
      const nights = parseInt(stayPeriodNights, 10);
      if (!isNaN(nights)) {
        return this.menuGroupsService.findByStayPeriod(req.user.organization_id, nights, seasonalMenuId);
      }
    }
    return this.menuGroupsService.findAll(req.user.organization_id, seasonalMenuId);
  }

  @Post()
  @RequirePermission('menus.structure')
  @ApiOperation({ summary: 'Create a new menu group' })
  async create(@Req() req: any, @Body() dto: CreateMenuGroupDto): Promise<MenuGroup> {
    return this.menuGroupsService.create(req.user.organization_id, dto);
  }

  @Put(':id')
  @RequirePermission('menus.structure')
  @ApiOperation({ summary: 'Update a menu group' })
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateMenuGroupDto): Promise<MenuGroup> {
    return this.menuGroupsService.update(req.user.organization_id, id, dto);
  }

  @Delete(':id')
  @RequirePermission('menus.structure')
  @ApiOperation({ summary: 'Delete a menu group' })
  async delete(@Req() req: any, @Param('id') id: string): Promise<void> {
    return this.menuGroupsService.delete(req.user.organization_id, id);
  }
}

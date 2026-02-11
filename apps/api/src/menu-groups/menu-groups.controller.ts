import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MenuGroupsService, MenuGroup } from './menu-groups.service';
import { CreateMenuGroupDto } from './dto/create-menu-group.dto';
import { UpdateMenuGroupDto } from './dto/update-menu-group.dto';
import { RequireStaff } from '../auth/staff.decorator';

@ApiTags('menu-groups')
@Controller('menu-groups')
export class MenuGroupsController {
  constructor(private readonly menuGroupsService: MenuGroupsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all menu groups' })
  @ApiQuery({ name: 'seasonal_menu_id', required: false })
  async findAll(@Query('seasonal_menu_id') seasonalMenuId?: string): Promise<MenuGroup[]> {
    return this.menuGroupsService.findAll(seasonalMenuId);
  }

  @Post()
  @RequireStaff()
  @ApiOperation({ summary: 'Create a new menu group' })
  async create(@Body() dto: CreateMenuGroupDto): Promise<MenuGroup> {
    return this.menuGroupsService.create(dto);
  }

  @Put(':id')
  @RequireStaff()
  @ApiOperation({ summary: 'Update a menu group' })
  async update(@Param('id') id: string, @Body() dto: UpdateMenuGroupDto): Promise<MenuGroup> {
    return this.menuGroupsService.update(id, dto);
  }

  @Delete(':id')
  @RequireStaff()
  @ApiOperation({ summary: 'Delete a menu group' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.menuGroupsService.delete(id);
  }
}

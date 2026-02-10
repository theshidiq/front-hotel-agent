import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MenuGroupsService, MenuGroup } from './menu-groups.service';
import { RequireStaff } from '../auth/staff.decorator';

@ApiTags('menu-groups')
@Controller('menu-groups')
export class MenuGroupsController {
  constructor(private readonly menuGroupsService: MenuGroupsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all menu groups' })
  async findAll(): Promise<MenuGroup[]> {
    return this.menuGroupsService.findAll();
  }

  @Post()
  @RequireStaff()
  @ApiOperation({ summary: 'Create a new menu group' })
  async create(@Body() body: { name: string }): Promise<MenuGroup> {
    return this.menuGroupsService.create(body.name);
  }

  @Delete(':id')
  @RequireStaff()
  @ApiOperation({ summary: 'Delete a menu group' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.menuGroupsService.delete(id);
  }
}

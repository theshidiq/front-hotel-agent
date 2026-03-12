import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SeasonalMenusService, SeasonalMenu } from './seasonal-menus.service';
import { CreateSeasonalMenuDto } from './dto/create-seasonal-menu.dto';
import { UpdateSeasonalMenuDto } from './dto/update-seasonal-menu.dto';
import { RequirePermission } from '../auth/permission.decorator';
import { StaffAuthGuard } from '../auth/auth.guard';

@ApiTags('seasonal-menus')
@Controller('seasonal-menus')
export class SeasonalMenusController {
  constructor(private readonly seasonalMenusService: SeasonalMenusService) {}

  @Get()
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all seasonal menus' })
  async findAll(@Req() req: any): Promise<SeasonalMenu[]> {
    return this.seasonalMenusService.findAll(req.user.organization_id);
  }

  @Post()
  @RequirePermission('menus.structure')
  @ApiOperation({ summary: 'Create a new seasonal menu' })
  async create(@Req() req: any, @Body() dto: CreateSeasonalMenuDto): Promise<SeasonalMenu> {
    return this.seasonalMenusService.create(req.user.organization_id, dto);
  }

  @Put(':id')
  @RequirePermission('menus.structure')
  @ApiOperation({ summary: 'Update a seasonal menu' })
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateSeasonalMenuDto): Promise<SeasonalMenu> {
    return this.seasonalMenusService.update(req.user.organization_id, id, dto);
  }

  @Delete(':id')
  @RequirePermission('menus.structure')
  @ApiOperation({ summary: 'Delete a seasonal menu' })
  async delete(@Req() req: any, @Param('id') id: string): Promise<void> {
    return this.seasonalMenusService.delete(req.user.organization_id, id);
  }
}

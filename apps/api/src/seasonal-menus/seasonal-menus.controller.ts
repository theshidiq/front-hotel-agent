import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SeasonalMenusService, SeasonalMenu } from './seasonal-menus.service';
import { CreateSeasonalMenuDto } from './dto/create-seasonal-menu.dto';
import { UpdateSeasonalMenuDto } from './dto/update-seasonal-menu.dto';
import { RequireStaff } from '../auth/staff.decorator';

@ApiTags('seasonal-menus')
@Controller('seasonal-menus')
export class SeasonalMenusController {
  constructor(private readonly seasonalMenusService: SeasonalMenusService) {}

  @Get()
  @ApiOperation({ summary: 'Get all seasonal menus' })
  async findAll(): Promise<SeasonalMenu[]> {
    return this.seasonalMenusService.findAll();
  }

  @Post()
  @RequireStaff()
  @ApiOperation({ summary: 'Create a new seasonal menu' })
  async create(@Body() dto: CreateSeasonalMenuDto): Promise<SeasonalMenu> {
    return this.seasonalMenusService.create(dto);
  }

  @Put(':id')
  @RequireStaff()
  @ApiOperation({ summary: 'Update a seasonal menu' })
  async update(@Param('id') id: string, @Body() dto: UpdateSeasonalMenuDto): Promise<SeasonalMenu> {
    return this.seasonalMenusService.update(id, dto);
  }

  @Delete(':id')
  @RequireStaff()
  @ApiOperation({ summary: 'Delete a seasonal menu' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.seasonalMenusService.delete(id);
  }
}

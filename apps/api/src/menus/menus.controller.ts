import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MenusService } from './menus.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { MenuResponse } from './dto/menu-response.dto';
import { RequirePermission } from '../auth/permission.decorator';
import { StaffAuthGuard } from '../auth/auth.guard';

@ApiTags('menus')
@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Post()
  @RequirePermission('menus.create')
  @ApiOperation({ summary: 'Create a new menu item' })
  @ApiResponse({ status: 201, type: MenuResponse })
  async create(@Req() req: any, @Body() createMenuDto: CreateMenuDto): Promise<MenuResponse> {
    return this.menusService.create(req.user.organization_id, createMenuDto);
  }

  @Get()
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all menu items with products and derived allergens' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: [MenuResponse] })
  async findAll(@Req() req: any, @Query('limit') limit?: number): Promise<MenuResponse[]> {
    return this.menusService.findAll(req.user.organization_id, limit || 50);
  }

  @Get(':id')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get menu item by ID with products and allergens' })
  @ApiResponse({ status: 200, type: MenuResponse })
  async findOne(@Req() req: any, @Param('id') id: string): Promise<MenuResponse> {
    return this.menusService.findOne(req.user.organization_id, id);
  }

  @Put(':id')
  @RequirePermission('menus.edit')
  @ApiOperation({ summary: 'Update menu item' })
  @ApiResponse({ status: 200, type: MenuResponse })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateMenuDto: UpdateMenuDto,
  ): Promise<MenuResponse> {
    return this.menusService.update(req.user.organization_id, id, updateMenuDto);
  }

  @Delete(':id')
  @RequirePermission('menus.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete menu item' })
  @ApiResponse({ status: 204, description: 'Menu item deleted successfully' })
  async remove(@Req() req: any, @Param('id') id: string): Promise<void> {
    return this.menusService.remove(req.user.organization_id, id);
  }
}

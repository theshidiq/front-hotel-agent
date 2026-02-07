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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { MenusService } from './menus.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { MenuResponse } from './dto/menu-response.dto';

@ApiTags('menus')
@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new menu item' })
  @ApiResponse({ status: 201, type: MenuResponse })
  async create(@Body() createMenuDto: CreateMenuDto): Promise<MenuResponse> {
    return this.menusService.create(createMenuDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all menu items with products and derived allergens' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: [MenuResponse] })
  async findAll(@Query('limit') limit?: number): Promise<MenuResponse[]> {
    return this.menusService.findAll(limit || 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get menu item by ID with products and allergens' })
  @ApiResponse({ status: 200, type: MenuResponse })
  async findOne(@Param('id') id: string): Promise<MenuResponse> {
    return this.menusService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update menu item' })
  @ApiResponse({ status: 200, type: MenuResponse })
  async update(
    @Param('id') id: string,
    @Body() updateMenuDto: UpdateMenuDto,
  ): Promise<MenuResponse> {
    return this.menusService.update(id, updateMenuDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete menu item' })
  @ApiResponse({ status: 204, description: 'Menu item deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.menusService.remove(id);
  }
}

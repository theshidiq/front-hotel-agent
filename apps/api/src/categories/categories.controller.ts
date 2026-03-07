import { Controller, Get, Post, Put, Delete, Query, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService, Category, UpdateCategoryData } from './categories.service';
import { RequirePermission } from '../auth/permission.decorator';
import { StaffAuthGuard } from '../auth/auth.guard';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['product', 'menu'],
  })
  async findAll(@Req() req: any, @Query('type') type?: 'product' | 'menu'): Promise<Category[]> {
    return this.categoriesService.findAll(req.user.organization_id, type);
  }

  @Post()
  @RequirePermission('categories.manage')
  @ApiOperation({ summary: 'Create a new category' })
  async create(
    @Req() req: any,
    @Body() body: { name: string; type: 'product' | 'menu' },
  ): Promise<Category> {
    return this.categoriesService.create(req.user.organization_id, body.name, body.type);
  }

  @Put(':id')
  @RequirePermission('categories.manage')
  @ApiOperation({ summary: 'Update a category' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateCategoryData,
  ): Promise<Category> {
    return this.categoriesService.update(req.user.organization_id, id, body);
  }

  @Delete(':id')
  @RequirePermission('categories.manage')
  @ApiOperation({ summary: 'Delete a category' })
  async delete(@Req() req: any, @Param('id') id: string): Promise<void> {
    return this.categoriesService.delete(req.user.organization_id, id);
  }
}

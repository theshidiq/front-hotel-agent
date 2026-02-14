import { Controller, Get, Post, Put, Delete, Query, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CategoriesService, Category, UpdateCategoryData } from './categories.service';
import { RequireStaff } from '../auth/staff.decorator';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['product', 'menu'],
  })
  async findAll(@Query('type') type?: 'product' | 'menu'): Promise<Category[]> {
    return this.categoriesService.findAll(type);
  }

  @Post()
  @RequireStaff()
  @ApiOperation({ summary: 'Create a new category' })
  async create(
    @Body() body: { name: string; type: 'product' | 'menu' },
  ): Promise<Category> {
    return this.categoriesService.create(body.name, body.type);
  }

  @Put(':id')
  @RequireStaff()
  @ApiOperation({ summary: 'Update a category' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCategoryData,
  ): Promise<Category> {
    return this.categoriesService.update(id, body);
  }

  @Delete(':id')
  @RequireStaff()
  @ApiOperation({ summary: 'Delete a category' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.categoriesService.delete(id);
  }
}

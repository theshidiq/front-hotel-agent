import { Controller, Get, Post, Delete, Query, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CategoriesService, Category } from './categories.service';

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
  @ApiOperation({ summary: 'Create a new category' })
  async create(
    @Body() body: { name: string; type: 'product' | 'menu' },
  ): Promise<Category> {
    return this.categoriesService.create(body.name, body.type);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.categoriesService.delete(id);
  }
}

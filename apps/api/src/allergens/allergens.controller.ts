import { Controller, Get, Post, Delete, Query, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AllergensService, Allergen } from './allergens.service';
import { RequirePermission } from '../auth/permission.decorator';

@ApiTags('allergens')
@Controller('allergens')
export class AllergensController {
  constructor(private readonly allergensService: AllergensService) {}

  @Get()
  @ApiOperation({ summary: 'Get all allergens' })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: [
      'grain',
      'egg',
      'dairy',
      'meat',
      'fish',
      'shellfish',
      'nut',
      'legume',
      'other',
    ],
  })
  async findAll(@Query('category') category?: string): Promise<Allergen[]> {
    return this.allergensService.findAll(category);
  }

  @Post()
  @RequirePermission('allergens.manage')
  @ApiOperation({ summary: 'Create a new allergen' })
  async create(
    @Body() body: { name: string; category: string },
  ): Promise<Allergen> {
    return this.allergensService.create(body.name, body.category);
  }

  @Delete(':id')
  @RequirePermission('allergens.manage')
  @ApiOperation({ summary: 'Delete an allergen' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.allergensService.delete(id);
  }
}

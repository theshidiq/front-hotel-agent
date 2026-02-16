import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductAlternatesService, ProductAlternate } from './product-alternates.service';
import { RequirePermission } from '../auth/permission.decorator';

@ApiTags('product-alternates')
@Controller('product-alternates')
export class ProductAlternatesController {
  constructor(private readonly service: ProductAlternatesService) {}

  @Get()
  @ApiOperation({ summary: 'List all product alternates' })
  async findAll(): Promise<ProductAlternate[]> {
    return this.service.findAll();
  }

  @Post()
  @RequirePermission('products.edit')
  @ApiOperation({ summary: 'Add an alternate product' })
  async create(
    @Body() body: { product_id: string; alternate_product_id: string },
  ): Promise<ProductAlternate> {
    return this.service.create(body.product_id, body.alternate_product_id);
  }

  @Delete(':productId/:alternateProductId')
  @RequirePermission('products.edit')
  @ApiOperation({ summary: 'Remove an alternate product' })
  async delete(
    @Param('productId') productId: string,
    @Param('alternateProductId') alternateProductId: string,
  ): Promise<void> {
    return this.service.delete(productId, alternateProductId);
  }
}

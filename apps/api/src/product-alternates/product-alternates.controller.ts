import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductAlternatesService, ProductAlternate } from './product-alternates.service';
import { RequirePermission } from '../auth/permission.decorator';
import { StaffAuthGuard } from '../auth/auth.guard';

@ApiTags('product-alternates')
@Controller('product-alternates')
export class ProductAlternatesController {
  constructor(private readonly service: ProductAlternatesService) {}

  @Get()
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all product alternates' })
  async findAll(@Req() req: any): Promise<ProductAlternate[]> {
    return this.service.findAll(req.user.organization_id);
  }

  @Post()
  @RequirePermission('products.edit')
  @ApiOperation({ summary: 'Add an alternate product' })
  async create(
    @Req() req: any,
    @Body() body: { product_id: string; alternate_product_id: string },
  ): Promise<ProductAlternate> {
    return this.service.create(req.user.organization_id, body.product_id, body.alternate_product_id);
  }

  @Delete(':productId/:alternateProductId')
  @RequirePermission('products.edit')
  @ApiOperation({ summary: 'Remove an alternate product' })
  async delete(
    @Req() req: any,
    @Param('productId') productId: string,
    @Param('alternateProductId') alternateProductId: string,
  ): Promise<void> {
    return this.service.delete(req.user.organization_id, productId, alternateProductId);
  }
}

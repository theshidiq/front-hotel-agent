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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponse } from './dto/product-response.dto';
import { RequirePermission } from '../auth/permission.decorator';
import { StaffAuthGuard } from '../auth/auth.guard';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermission('products.create')
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, type: ProductResponse })
  async create(@Req() req: any, @Body() createProductDto: CreateProductDto): Promise<ProductResponse> {
    return this.productsService.create(req.user.organization_id, createProductDto);
  }

  @Get()
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: [ProductResponse] })
  async findAll(@Req() req: any, @Query('limit') limit?: number): Promise<ProductResponse[]> {
    return this.productsService.findAll(req.user.organization_id, limit || 50);
  }

  @Get(':id')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product by ID with allergens' })
  @ApiResponse({ status: 200, type: ProductResponse })
  async findOne(@Req() req: any, @Param('id') id: string): Promise<ProductResponse> {
    return this.productsService.findOne(req.user.organization_id, id);
  }

  @Put(':id')
  @RequirePermission('products.edit')
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ status: 200, type: ProductResponse })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductResponse> {
    return this.productsService.update(req.user.organization_id, id, updateProductDto);
  }

  @Delete(':id')
  @RequirePermission('products.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product' })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  async remove(@Req() req: any, @Param('id') id: string): Promise<void> {
    return this.productsService.remove(req.user.organization_id, id);
  }
}

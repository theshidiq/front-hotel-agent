import { Controller, Post, Get, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ScanService } from './scan.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { ScanExtractResponse, ScanResultResponse, ScanSessionResponse } from './dto/scan-response.dto';
import { RequirePermission } from '../auth/permission.decorator';
import { StaffAuthGuard } from '../auth/auth.guard';

@ApiTags('scan')
@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post()
  @Throttle({ scan: { ttl: 60000, limit: 10 } })
  @RequirePermission('products.scan')
  @ApiOperation({
    summary: 'Scan product image and auto-save',
    description:
      'Uploads an image URL to Qwen Vision OCR, extracts product data, and automatically saves to database',
  })
  async createScan(@Req() req: any, @Body() createScanDto: CreateScanDto): Promise<ScanResultResponse> {
    return this.scanService.createScan(req.user.organization_id, createScanDto);
  }

  @Post('extract')
  @Throttle({ scan: { ttl: 60000, limit: 10 } })
  @RequirePermission('products.scan')
  @ApiOperation({
    summary: 'Extract product data from image without saving',
    description:
      'Runs OCR on the image and returns extracted data for user review before saving',
  })
  async extractOnly(@Req() req: any, @Body() createScanDto: CreateScanDto): Promise<ScanExtractResponse> {
    return this.scanService.extractOnly(req.user.organization_id, createScanDto);
  }

  @Get()
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List recent scan sessions' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Req() req: any, @Query('limit') limit?: number): Promise<ScanSessionResponse[]> {
    return this.scanService.findAll(req.user.organization_id, limit || 20);
  }

  @Get(':id')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get scan session by ID with product details' })
  async findOne(@Param('id') id: string): Promise<ScanResultResponse> {
    return this.scanService.findOne(id);
  }
}

import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ScanService } from './scan.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { ScanResultResponse, ScanSessionResponse } from './dto/scan-response.dto';
import { RequireStaff } from '../auth/staff.decorator';

@ApiTags('scan')
@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post()
  @RequireStaff()
  @ApiOperation({
    summary: 'Scan product image and auto-save',
    description:
      'Uploads an image URL to Qwen Vision OCR, extracts product data, and automatically saves to database',
  })
  async createScan(@Body() createScanDto: CreateScanDto): Promise<ScanResultResponse> {
    return this.scanService.createScan(createScanDto);
  }

  @Get()
  @ApiOperation({ summary: 'List recent scan sessions' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Query('limit') limit?: number): Promise<ScanSessionResponse[]> {
    return this.scanService.findAll(limit || 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get scan session by ID with product details' })
  async findOne(@Param('id') id: string): Promise<ScanResultResponse> {
    return this.scanService.findOne(id);
  }
}

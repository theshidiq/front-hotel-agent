import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { ScanService } from './scan.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { ScanExtractResponse, ScanResultResponse, ScanSessionResponse } from './dto/scan-response.dto';
import { RequirePermission } from '../auth/permission.decorator';

@ApiTags('scan')
@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post()
  @RequirePermission('products.scan')
  @ApiOperation({
    summary: 'Scan product image and auto-save',
    description:
      'Uploads an image URL to Qwen Vision OCR, extracts product data, and automatically saves to database',
  })
  async createScan(@Body() createScanDto: CreateScanDto): Promise<ScanResultResponse> {
    return this.scanService.createScan(createScanDto);
  }

  @Post('extract')
  @RequirePermission('products.scan')
  @ApiOperation({
    summary: 'Extract product data from image without saving',
    description:
      'Runs OCR on the image and returns extracted data for user review before saving',
  })
  async extractOnly(@Body() createScanDto: CreateScanDto): Promise<ScanExtractResponse> {
    return this.scanService.extractOnly(createScanDto);
  }

  @Post('extract-upload')
  @RequirePermission('products.scan')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload image and extract product data without saving',
    description:
      'Accepts image file directly, uploads to storage, runs OCR, and returns extracted data for review',
  })
  async extractFromUpload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ScanExtractResponse> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    return this.scanService.extractFromFile(file);
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

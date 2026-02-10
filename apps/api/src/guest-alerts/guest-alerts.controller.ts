import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { GuestAlertsService } from './guest-alerts.service';
import { GuestAlertResponse } from './dto/guest-alert-response.dto';
import { CreateGuestAlertDto } from './dto/create-guest-alert.dto';
import { AcknowledgeAlertDto } from './dto/acknowledge-alert.dto';
import { RequireStaff } from '../auth/staff.decorator';

@ApiTags('guest-alerts')
@Controller('guest-alerts')
export class GuestAlertsController {
  constructor(private readonly guestAlertsService: GuestAlertsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all guest alerts' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (new, acknowledged, resolved)' })
  async findAll(@Query('status') status?: string): Promise<GuestAlertResponse[]> {
    return this.guestAlertsService.findAll(status);
  }

  @Get('new')
  @ApiOperation({ summary: 'Get new (unacknowledged) alerts' })
  async findNew(): Promise<GuestAlertResponse[]> {
    return this.guestAlertsService.findNew();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guest alert by ID' })
  @ApiParam({ name: 'id', description: 'Alert UUID' })
  async findOne(@Param('id') id: string): Promise<GuestAlertResponse> {
    return this.guestAlertsService.findOne(id);
  }

  @Post()
  @RequireStaff()
  @ApiOperation({ summary: 'Create a new guest alert' })
  async create(@Body() dto: CreateGuestAlertDto): Promise<GuestAlertResponse> {
    return this.guestAlertsService.create(dto);
  }

  @Patch(':id/acknowledge')
  @RequireStaff()
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiParam({ name: 'id', description: 'Alert UUID' })
  async acknowledge(
    @Param('id') id: string,
    @Body() dto: AcknowledgeAlertDto,
  ): Promise<GuestAlertResponse> {
    return this.guestAlertsService.acknowledge(id, dto);
  }

  @Patch(':id/resolve')
  @RequireStaff()
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiParam({ name: 'id', description: 'Alert UUID' })
  async resolve(@Param('id') id: string): Promise<GuestAlertResponse> {
    return this.guestAlertsService.resolve(id);
  }
}

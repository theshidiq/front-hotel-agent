import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { GuestAlertsService } from './guest-alerts.service';
import { GuestAlertResponse } from './dto/guest-alert-response.dto';
import { CreateGuestAlertDto } from './dto/create-guest-alert.dto';
import { AcknowledgeAlertDto } from './dto/acknowledge-alert.dto';
import { RequireStaff } from '../auth/staff.decorator';
import { StaffAuthGuard } from '../auth/auth.guard';

@ApiTags('guest-alerts')
@Controller('guest-alerts')
export class GuestAlertsController {
  constructor(private readonly guestAlertsService: GuestAlertsService) {}

  @Get()
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all guest alerts' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (new, acknowledged, resolved)' })
  async findAll(@Req() req: any, @Query('status') status?: string): Promise<GuestAlertResponse[]> {
    return this.guestAlertsService.findAll(req.user.organization_id, status);
  }

  @Get('new')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get new (unacknowledged) alerts' })
  async findNew(@Req() req: any): Promise<GuestAlertResponse[]> {
    return this.guestAlertsService.findNew(req.user.organization_id);
  }

  @Get(':id')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get guest alert by ID' })
  @ApiParam({ name: 'id', description: 'Alert UUID' })
  async findOne(@Req() req: any, @Param('id') id: string): Promise<GuestAlertResponse> {
    return this.guestAlertsService.findOne(req.user.organization_id, id);
  }

  @Post()
  @RequireStaff()
  @ApiOperation({ summary: 'Create a new guest alert' })
  async create(@Req() req: any, @Body() dto: CreateGuestAlertDto): Promise<GuestAlertResponse> {
    return this.guestAlertsService.create(req.user.organization_id, dto);
  }

  @Patch(':id/acknowledge')
  @RequireStaff()
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiParam({ name: 'id', description: 'Alert UUID' })
  async acknowledge(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AcknowledgeAlertDto,
  ): Promise<GuestAlertResponse> {
    return this.guestAlertsService.acknowledge(req.user.organization_id, id, dto);
  }

  @Patch(':id/resolve')
  @RequireStaff()
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiParam({ name: 'id', description: 'Alert UUID' })
  async resolve(@Req() req: any, @Param('id') id: string): Promise<GuestAlertResponse> {
    return this.guestAlertsService.resolve(req.user.organization_id, id);
  }
}

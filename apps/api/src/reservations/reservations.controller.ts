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
import { ReservationsService } from './reservations.service';
import { ReservationResponse } from './dto/reservation-response.dto';
import { CheckInDto } from './dto/check-in.dto';
import { SearchReservationDto } from './dto/search-reservation.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { GuestUpdateDto } from './dto/guest-update.dto';
import { RequireStaff } from '../auth/staff.decorator';
import { StaffAuthGuard } from '../auth/auth.guard';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all reservations' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by check-in date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  async findAll(
    @Req() req: any,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ): Promise<ReservationResponse[]> {
    return this.reservationsService.findAll(req.user.organization_id, date, status);
  }

  @Get('today')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get today\'s reservations' })
  async findToday(@Req() req: any): Promise<ReservationResponse[]> {
    return this.reservationsService.findToday(req.user.organization_id);
  }

  @Get('search')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search reservations by name or phone' })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'phone', required: false })
  @ApiQuery({ name: 'date', required: false })
  async search(
    @Req() req: any,
    @Query() dto: SearchReservationDto,
  ): Promise<ReservationResponse[]> {
    return this.reservationsService.search(req.user.organization_id, dto);
  }

  @Get('qr/:token')
  @ApiOperation({ summary: 'Lookup reservation by QR code / guest token' })
  @ApiParam({ name: 'token', description: 'Guest token from QR code' })
  async lookupByQR(@Param('token') token: string): Promise<ReservationResponse> {
    return this.reservationsService.lookupByQR(token);
  }

  @Patch('qr/:token')
  @ApiOperation({ summary: 'Update reservation by guest token (for guest self-service)' })
  @ApiParam({ name: 'token', description: 'Guest token from QR code' })
  async updateByToken(
    @Param('token') token: string,
    @Body() dto: GuestUpdateDto,
  ): Promise<ReservationResponse> {
    return this.reservationsService.updateByToken(token, dto);
  }

  @Get(':id')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reservation by ID' })
  @ApiParam({ name: 'id', description: 'Reservation UUID' })
  async findOne(@Req() req: any, @Param('id') id: string): Promise<ReservationResponse> {
    return this.reservationsService.findOne(req.user.organization_id, id);
  }

  @Post()
  @RequireStaff()
  @ApiOperation({ summary: 'Create a new reservation' })
  async create(@Req() req: any, @Body() dto: CreateReservationDto): Promise<ReservationResponse> {
    return this.reservationsService.create(req.user.organization_id, dto);
  }

  @Patch(':id/check-in')
  @RequireStaff()
  @ApiOperation({ summary: 'Check in a guest' })
  @ApiParam({ name: 'id', description: 'Reservation UUID' })
  async checkIn(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CheckInDto,
  ): Promise<ReservationResponse> {
    return this.reservationsService.checkIn(req.user.organization_id, id, dto);
  }

  @Patch(':id/check-out')
  @RequireStaff()
  @ApiOperation({ summary: 'Check out a guest' })
  @ApiParam({ name: 'id', description: 'Reservation UUID' })
  async checkOut(@Req() req: any, @Param('id') id: string): Promise<ReservationResponse> {
    return this.reservationsService.checkOut(req.user.organization_id, id);
  }

}

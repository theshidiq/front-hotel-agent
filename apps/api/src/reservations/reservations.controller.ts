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
import { ReservationsService } from './reservations.service';
import { ReservationResponse } from './dto/reservation-response.dto';
import { CheckInDto } from './dto/check-in.dto';
import { SearchReservationDto } from './dto/search-reservation.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { GuestUpdateDto } from './dto/guest-update.dto';
import { RequireStaff } from '../auth/staff.decorator';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all reservations' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by check-in date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  async findAll(
    @Query('date') date?: string,
    @Query('status') status?: string,
  ): Promise<ReservationResponse[]> {
    return this.reservationsService.findAll(date, status);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get today\'s reservations' })
  async findToday(): Promise<ReservationResponse[]> {
    return this.reservationsService.findToday();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search reservations by name or phone' })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'phone', required: false })
  @ApiQuery({ name: 'date', required: false })
  async search(
    @Query() dto: SearchReservationDto,
  ): Promise<ReservationResponse[]> {
    return this.reservationsService.search(dto);
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
  @ApiOperation({ summary: 'Get reservation by ID' })
  @ApiParam({ name: 'id', description: 'Reservation UUID' })
  async findOne(@Param('id') id: string): Promise<ReservationResponse> {
    return this.reservationsService.findOne(id);
  }

  @Post()
  @RequireStaff()
  @ApiOperation({ summary: 'Create a new reservation' })
  async create(@Body() dto: CreateReservationDto): Promise<ReservationResponse> {
    return this.reservationsService.create(dto);
  }

  @Patch(':id/check-in')
  @RequireStaff()
  @ApiOperation({ summary: 'Check in a guest' })
  @ApiParam({ name: 'id', description: 'Reservation UUID' })
  async checkIn(
    @Param('id') id: string,
    @Body() dto: CheckInDto,
  ): Promise<ReservationResponse> {
    return this.reservationsService.checkIn(id, dto);
  }

  @Patch(':id/check-out')
  @RequireStaff()
  @ApiOperation({ summary: 'Check out a guest' })
  @ApiParam({ name: 'id', description: 'Reservation UUID' })
  async checkOut(@Param('id') id: string): Promise<ReservationResponse> {
    return this.reservationsService.checkOut(id);
  }
}

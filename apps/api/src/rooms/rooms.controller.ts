import { Controller, Get, Param, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { RoomResponse } from './dto/room-response.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { RequireStaff } from '../auth/staff.decorator';
import { StaffAuthGuard } from '../auth/auth.guard';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all rooms' })
  @ApiResponse({ status: 200, type: [RoomResponse] })
  async findAll(@Req() req: any): Promise<RoomResponse[]> {
    return this.roomsService.findAll(req.user.organization_id);
  }

  @Get(':id')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get room by ID' })
  @ApiResponse({ status: 200, type: RoomResponse })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async findOne(@Req() req: any, @Param('id') id: string): Promise<RoomResponse> {
    return this.roomsService.findOne(req.user.organization_id, id);
  }

  @Patch(':id/status')
  @RequireStaff()
  @ApiOperation({ summary: 'Update room status' })
  @ApiResponse({ status: 200, type: RoomResponse })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRoomStatusDto,
  ): Promise<RoomResponse> {
    return this.roomsService.updateStatus(req.user.organization_id, id, dto);
  }
}

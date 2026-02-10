import { Controller, Get, Param, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { RoomResponse } from './dto/room-response.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { RequireStaff } from '../auth/staff.decorator';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all rooms' })
  @ApiResponse({ status: 200, type: [RoomResponse] })
  async findAll(): Promise<RoomResponse[]> {
    return this.roomsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room by ID' })
  @ApiResponse({ status: 200, type: RoomResponse })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async findOne(@Param('id') id: string): Promise<RoomResponse> {
    return this.roomsService.findOne(id);
  }

  @Patch(':id/status')
  @RequireStaff()
  @ApiOperation({ summary: 'Update room status' })
  @ApiResponse({ status: 200, type: RoomResponse })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRoomStatusDto,
  ): Promise<RoomResponse> {
    return this.roomsService.updateStatus(id, dto);
  }
}

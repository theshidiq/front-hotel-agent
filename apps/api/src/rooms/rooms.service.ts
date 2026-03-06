import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RoomResponse } from './dto/room-response.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(): Promise<RoomResponse[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('rooms')
      .select('*')
      .eq('organization_id', this.supabaseService.getOrganizationId())
      .order('room_number');

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data || [];
  }

  async findOne(id: string): Promise<RoomResponse> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('rooms')
      .select('*')
      .eq('id', id)
      .eq('organization_id', this.supabaseService.getOrganizationId())
      .single();

    if (error || !data) {
      throw new NotFoundException('Room not found');
    }

    return data;
  }

  async findByRoomNumber(roomNumber: string): Promise<RoomResponse> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('rooms')
      .select('*')
      .eq('room_number', roomNumber)
      .eq('organization_id', this.supabaseService.getOrganizationId())
      .single();

    if (error || !data) {
      throw new NotFoundException('Room not found');
    }

    return data;
  }

  async updateStatus(id: string, dto: UpdateRoomStatusDto): Promise<RoomResponse> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('rooms')
      .update({
        status: dto.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', this.supabaseService.getOrganizationId())
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Room not found');
    }

    return data;
  }

  async setOccupied(roomNumber: string, reservationId: string): Promise<RoomResponse> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('rooms')
      .update({
        status: 'occupied',
        current_reservation_id: reservationId,
        updated_at: new Date().toISOString(),
      })
      .eq('room_number', roomNumber)
      .eq('organization_id', this.supabaseService.getOrganizationId())
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async setAvailable(roomNumber: string): Promise<RoomResponse> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('rooms')
      .update({
        status: 'available',
        current_reservation_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('room_number', roomNumber)
      .eq('organization_id', this.supabaseService.getOrganizationId())
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }
}

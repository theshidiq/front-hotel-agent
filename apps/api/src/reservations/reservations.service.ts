import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RoomsService } from '../rooms/rooms.service';
import { AllergensService } from '../allergens/allergens.service';
import { ReservationResponse } from './dto/reservation-response.dto';
import { CheckInDto } from './dto/check-in.dto';
import { SearchReservationDto } from './dto/search-reservation.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { GuestUpdateDto } from './dto/guest-update.dto';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly roomsService: RoomsService,
    private readonly allergensService: AllergensService,
  ) {}

  async findAll(date?: string, status?: string): Promise<ReservationResponse[]> {
    let query = this.supabaseService
      .getClient()
      .from('reservations')
      .select('*')
      .eq('restaurant_id', this.supabaseService.getRestaurantId())
      .order('room_number');

    if (date) {
      query = query.eq('check_in_date', date);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data || [];
  }

  async findToday(): Promise<ReservationResponse[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.findAll(today);
  }

  async findOne(id: string): Promise<ReservationResponse> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('reservations')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', this.supabaseService.getRestaurantId())
      .single();

    if (error || !data) {
      throw new NotFoundException('Reservation not found');
    }

    return this.enrichWithAllergens(data);
  }

  async lookupByToken(token: string): Promise<ReservationResponse> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('reservations')
      .select('*')
      .eq('guest_token', token)
      .single();

    if (error || !data) {
      throw new NotFoundException('Reservation not found');
    }

    // Check if token is expired
    if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
      throw new BadRequestException('Token has expired');
    }

    return this.enrichWithAllergens(data);
  }

  async lookupByQR(qrCode: string): Promise<ReservationResponse> {
    return this.lookupByToken(qrCode);
  }

  async search(dto: SearchReservationDto): Promise<ReservationResponse[]> {
    const today = new Date().toISOString().split('T')[0];

    let query = this.supabaseService
      .getClient()
      .from('reservations')
      .select('*')
      .eq('restaurant_id', this.supabaseService.getRestaurantId())
      .eq('check_in_date', dto.date || today);

    if (dto.name) {
      query = query.ilike('guest_name', `%${dto.name}%`);
    }

    if (dto.phone) {
      query = query.ilike('phone', `%${dto.phone}%`);
    }

    const { data, error } = await query.order('guest_name');

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data || [];
  }

  async create(dto: CreateReservationDto): Promise<ReservationResponse> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('reservations')
      .insert({
        restaurant_id: this.supabaseService.getRestaurantId(),
        ...dto,
      })
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async checkIn(id: string, dto: CheckInDto): Promise<ReservationResponse> {
    // Light-weight status check (no allergen enrichment needed)
    const { data: reservation, error: fetchError } = await this.supabaseService
      .getClient()
      .from('reservations')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', this.supabaseService.getRestaurantId())
      .single();

    if (fetchError || !reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status === 'checked_in') {
      throw new BadRequestException('Guest is already checked in');
    }

    if (reservation.status !== 'confirmed') {
      throw new BadRequestException('Cannot check in a reservation with status: ' + reservation.status);
    }

    // Update reservation with check-in data
    const { data, error } = await this.supabaseService
      .getClient()
      .from('reservations')
      .update({
        dinner_time: dto.dinner_time || null,
        breakfast_time: dto.breakfast_time || null,
        allergen_ids: dto.allergen_ids || [],
        dietary_notes: dto.dietary_notes || null,
        special_requests: dto.special_requests || null,
        status: 'checked_in',
        checked_in_at: new Date().toISOString(),
        checked_in_by: dto.checked_in_by || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    // Update room status + create alert in parallel
    const tasks: Promise<any>[] = [
      this.roomsService.setOccupied(reservation.room_number, id),
    ];

    if (dto.allergen_ids && dto.allergen_ids.length > 0) {
      tasks.push(this.createCheckInAlert(data, dto.allergen_ids));
    }

    await Promise.all(tasks);

    return this.enrichWithAllergens(data);
  }

  async checkOut(id: string): Promise<ReservationResponse> {
    // Light-weight status check
    const { data: reservation, error: fetchError } = await this.supabaseService
      .getClient()
      .from('reservations')
      .select('id, status, room_number')
      .eq('id', id)
      .eq('restaurant_id', this.supabaseService.getRestaurantId())
      .single();

    if (fetchError || !reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status !== 'checked_in') {
      throw new BadRequestException('Cannot check out: guest is not checked in');
    }

    // Update reservation + room in parallel
    const [updateResult] = await Promise.all([
      this.supabaseService
        .getClient()
        .from('reservations')
        .update({
          status: 'checked_out',
          checked_out_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single(),
      this.supabaseService
        .getClient()
        .from('rooms')
        .update({
          status: 'cleaning',
          current_reservation_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('room_number', reservation.room_number)
        .eq('restaurant_id', this.supabaseService.getRestaurantId()),
    ]);

    if (updateResult.error) {
      throw new InternalServerErrorException(updateResult.error.message);
    }

    return updateResult.data;
  }

  async updateByToken(token: string, dto: GuestUpdateDto): Promise<ReservationResponse> {
    // First verify the token is valid
    const reservation = await this.lookupByToken(token);

    // Build update object
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.allergen_ids !== undefined) {
      updateData.allergen_ids = dto.allergen_ids;
    }

    if (dto.dietary_notes !== undefined) {
      updateData.dietary_notes = dto.dietary_notes;
    }

    if (dto.special_requests !== undefined) {
      updateData.special_requests = dto.special_requests;
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('reservations')
      .update(updateData)
      .eq('id', reservation.id)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    // Create alert for kitchen if allergens were updated (non-blocking)
    if (dto.allergen_ids && dto.allergen_ids.length > 0) {
      this.supabaseService
        .getClient()
        .from('guest_alerts')
        .insert({
          restaurant_id: this.supabaseService.getRestaurantId(),
          reservation_id: reservation.id,
          alert_type: 'allergy_update',
          room_number: reservation.room_number,
          guest_name: reservation.guest_name,
          party_size: reservation.party_size,
          dinner_time: reservation.dinner_time,
          allergen_ids: dto.allergen_ids,
          dietary_notes: dto.dietary_notes || null,
          message: 'ゲストがアレルギー情報を更新しました',
          status: 'new',
        })
        .then(() => {});
    }

    return this.enrichWithAllergens(data);
  }

  private async createCheckInAlert(reservation: any, allergenIds: string[]): Promise<void> {
    await this.supabaseService
      .getClient()
      .from('guest_alerts')
      .insert({
        restaurant_id: this.supabaseService.getRestaurantId(),
        reservation_id: reservation.id,
        alert_type: 'check_in',
        room_number: reservation.room_number,
        guest_name: reservation.guest_name,
        party_size: reservation.party_size,
        dinner_time: reservation.dinner_time,
        allergen_ids: allergenIds,
        dietary_notes: reservation.dietary_notes || null,
        message: null,
        status: 'new',
      });
  }

  private async enrichWithAllergens(reservation: any): Promise<ReservationResponse> {
    if (!reservation.allergen_ids || reservation.allergen_ids.length === 0) {
      return { ...reservation, allergens: [] };
    }

    try {
      const allergens = await this.allergensService.findByIds(reservation.allergen_ids);
      return { ...reservation, allergens };
    } catch {
      return { ...reservation, allergens: [] };
    }
  }
}

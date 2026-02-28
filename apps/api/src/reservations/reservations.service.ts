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

    if (!data || data.length === 0) {
      return [];
    }

    // Enrich all reservations with allergen details
    return Promise.all(data.map(reservation => this.enrichWithAllergens(reservation)));
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

    if (!data || data.length === 0) {
      return [];
    }

    // Enrich all reservations with allergen details
    return Promise.all(data.map(reservation => this.enrichWithAllergens(reservation)));
  }

  async create(dto: CreateReservationDto): Promise<ReservationResponse> {
    // Extract allergen_ids for backward compatibility
    const allergenIds = dto.allergen_details?.map(a => a.allergen_id) || [];

    const { data, error } = await this.supabaseService
      .getClient()
      .from('reservations')
      .insert({
        restaurant_id: this.supabaseService.getRestaurantId(),
        ...dto,
        allergen_ids: allergenIds,
        allergen_details: dto.allergen_details || [],
      })
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return this.enrichWithAllergens(data);
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

    // Prepare update data - support both old and new formats
    const updateData: any = {
      dinner_time: dto.dinner_time || null,
      breakfast_time: dto.breakfast_time || null,
      dietary_notes: dto.dietary_notes || null,
      special_requests: dto.special_requests || null,
      status: 'checked_in',
      checked_in_at: new Date().toISOString(),
      checked_in_by: dto.checked_in_by || null,
      updated_at: new Date().toISOString(),
    };

    // Handle allergen data - prefer new format, fallback to old
    if (dto.allergen_details && dto.allergen_details.length > 0) {
      updateData.allergen_details = dto.allergen_details;
      // Also update old format for backward compatibility
      updateData.allergen_ids = dto.allergen_details.map(a => a.allergen_id);
    } else if (dto.allergen_ids) {
      updateData.allergen_ids = dto.allergen_ids;
      // If using old format, convert to new format (assume all party members have the allergen)
      updateData.allergen_details = dto.allergen_ids.map(allergen_id => ({
        allergen_id,
        person_count: reservation.party_size
      }));
    } else {
      updateData.allergen_ids = [];
      updateData.allergen_details = [];
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('reservations')
      .update(updateData)
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

    const hasAllergens = (dto.allergen_details && dto.allergen_details.length > 0) ||
                        (dto.allergen_ids && dto.allergen_ids.length > 0);
    if (hasAllergens) {
      tasks.push(this.createCheckInAlert(data, updateData.allergen_details));
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

  async deleteAllReservations(): Promise<{ deleted: number }> {
    // First, clear any current_reservation_id references in rooms table
    await this.supabaseService
      .getClient()
      .from('rooms')
      .update({ current_reservation_id: null })
      .eq('restaurant_id', this.supabaseService.getRestaurantId())
      .not('current_reservation_id', 'is', null);

    // Now delete all reservations
    const { data, error } = await this.supabaseService
      .getClient()
      .from('reservations')
      .delete()
      .eq('restaurant_id', this.supabaseService.getRestaurantId())
      .select();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return { deleted: data?.length || 0 };
  }

  private async createCheckInAlert(reservation: any, allergenDetails: any[]): Promise<void> {
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
        allergen_details: allergenDetails,
        allergen_ids: allergenDetails.map((a: any) => a.allergen_id), // Backward compatibility
        dietary_notes: reservation.dietary_notes || null,
        message: null,
        status: 'new',
      });
  }

  private async enrichWithAllergens(reservation: any): Promise<ReservationResponse> {
    // Calculate stay period metrics
    const checkInDate = new Date(reservation.check_in_date);
    const checkOutDate = new Date(reservation.check_out_date);
    const today = new Date();

    // Set all dates to start of day for accurate day counting
    checkInDate.setHours(0, 0, 0, 0);
    checkOutDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    // Calculate total nights
    const total_nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate current stay night (1-indexed)
    // If today is before check-in, it's 0 (not yet arrived)
    // If today is check-in day, it's 1 (first night)
    // If today is after check-out, cap at total_nights
    let current_stay_night = 0;
    if (today >= checkInDate) {
      current_stay_night = Math.ceil((today.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      // Cap at total nights
      if (current_stay_night > total_nights) {
        current_stay_night = total_nights;
      }
    }

    // Enrich with allergens - support both old and new formats
    let allergens: any[] = [];
    let enrichedAllergenDetails: any[] = [];

    // Prefer new format
    if (reservation.allergen_details && Array.isArray(reservation.allergen_details) && reservation.allergen_details.length > 0) {
      try {
        const allergenIds = reservation.allergen_details.map((a: any) => a.allergen_id);
        const allergenObjects = await this.allergensService.findByIds(allergenIds);

        // Enrich allergen_details with full allergen objects
        enrichedAllergenDetails = reservation.allergen_details.map((detail: any) => ({
          ...detail,
          allergen: allergenObjects.find((a: any) => a.id === detail.allergen_id)
        }));

        // For backward compatibility, also populate allergens array
        allergens = allergenObjects;
      } catch {
        enrichedAllergenDetails = reservation.allergen_details;
      }
    }
    // Fallback to old format
    else if (reservation.allergen_ids && reservation.allergen_ids.length > 0) {
      try {
        allergens = await this.allergensService.findByIds(reservation.allergen_ids);
        // Convert to new format for consistency (assume all party members have it)
        enrichedAllergenDetails = reservation.allergen_ids.map((allergen_id: string) => ({
          allergen_id,
          person_count: reservation.party_size,
          allergen: allergens.find((a: any) => a.id === allergen_id)
        }));
      } catch {
        allergens = [];
      }
    }

    return {
      ...reservation,
      allergens,
      allergen_details: enrichedAllergenDetails.length > 0 ? enrichedAllergenDetails : undefined,
      total_nights,
      current_stay_night,
    };
  }
}

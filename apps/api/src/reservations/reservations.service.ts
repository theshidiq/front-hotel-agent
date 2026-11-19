import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RoomsService } from '../rooms/rooms.service';
import { AllergensService } from '../allergens/allergens.service';
import { ReservationResponse } from './dto/reservation-response.dto';
import { CheckInDto } from './dto/check-in.dto';
import { SearchReservationDto } from './dto/search-reservation.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { GuestUpdateDto } from './dto/guest-update.dto';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Today's calendar date (YYYY-MM-DD) at the hotel. The API runs in UTC, so
 * `new Date().toISOString()` would report yesterday between 00:00 and 09:00 JST.
 */
function hotelToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
}

/** Parse a YYYY-MM-DD (or ISO) date to a UTC-midnight timestamp for whole-day arithmetic. */
function dayStamp(date: string): number {
  const [y, m, d] = String(date).slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly roomsService: RoomsService,
    private readonly allergensService: AllergensService,
  ) { }

  async findAll(organizationId: string, date?: string, status?: string): Promise<ReservationResponse[]> {
    let query = this.supabaseService
      .getClient()
      .from('reservations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('room_number');

    if (date) {
      // Include any reservation that is active on this date:
      // check_in_date <= date AND check_out_date >= date
      query = query.lte('check_in_date', date).gte('check_out_date', date);
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

  async findToday(organizationId: string): Promise<ReservationResponse[]> {
    const today = hotelToday();
    return this.findAll(organizationId, today);
  }

  async findOne(organizationId: string, id: string): Promise<ReservationResponse> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('reservations')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
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

  async search(organizationId: string, dto: SearchReservationDto): Promise<ReservationResponse[]> {
    const targetDate = dto.date || hotelToday();
    let query = this.supabaseService
      .getClient()
      .from('reservations')
      .select('*')
      .eq('organization_id', organizationId)
      .lte('check_in_date', targetDate)
      .gte('check_out_date', targetDate);

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

  async create(organizationId: string, dto: CreateReservationDto): Promise<ReservationResponse> {
    if (dayStamp(dto.check_out_date) < dayStamp(dto.check_in_date)) {
      throw new BadRequestException('check_out_date must be on or after check_in_date');
    }

    // Extract allergen_ids for backward compatibility
    const allergenIds = dto.allergen_details?.map(a => a.allergen_id) || [];

    const { data, error } = await this.supabaseService
      .getClient()
      .from('reservations')
      .insert({
        ...dto,
        organization_id: organizationId,
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

  async checkIn(organizationId: string, id: string, dto: CheckInDto): Promise<ReservationResponse> {
    // Light-weight status check (no allergen enrichment needed)
    const { data: reservation, error: fetchError } = await this.supabaseService
      .getClient()
      .from('reservations')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
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
      .eq('organization_id', organizationId)
      .eq('status', 'confirmed') // guard against a concurrent double check-in
      .select()
      .single();

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        throw new BadRequestException('Reservation is no longer awaiting check-in');
      }
      throw new InternalServerErrorException(error?.message ?? 'Failed to check in');
    }

    // Update room status + create alert in parallel
    const tasks: Promise<any>[] = [
      this.roomsService.setOccupied(organizationId, reservation.room_number, id),
    ];

    const hasAllergens = (dto.allergen_details && dto.allergen_details.length > 0) ||
      (dto.allergen_ids && dto.allergen_ids.length > 0);
    if (hasAllergens) {
      tasks.push(this.createCheckInAlert(organizationId, data, updateData.allergen_details));
    }

    await Promise.all(tasks);

    return this.enrichWithAllergens(data);
  }

  async checkOut(organizationId: string, id: string): Promise<ReservationResponse> {
    // Light-weight status check
    const { data: reservation, error: fetchError } = await this.supabaseService
      .getClient()
      .from('reservations')
      .select('id, status, room_number')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status !== 'checked_in') {
      throw new BadRequestException('Cannot check out: guest is not checked in');
    }

    // Update reservation + room in parallel
    const [updateResult, roomResult] = await Promise.all([
      this.supabaseService
        .getClient()
        .from('reservations')
        .update({
          status: 'checked_out',
          checked_out_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
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
        .eq('organization_id', organizationId),
    ]);

    if (updateResult.error) {
      throw new InternalServerErrorException(updateResult.error.message);
    }
    if (roomResult.error) {
      this.logger.error(`Checked out reservation ${id} but failed to release room ${reservation.room_number}: ${roomResult.error.message}`);
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
      // allergen_details takes precedence when reading, so keep it in sync or the
      // guest's change is hidden behind the stale check-in data.
      updateData.allergen_details = dto.allergen_ids.map((allergen_id) => ({
        allergen_id,
        person_count: reservation.party_size,
      }));
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
          organization_id: reservation.organization_id,
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
        .then(({ error: alertError }) => {
          if (alertError) {
            this.logger.error(`Failed to create allergy_update alert for reservation ${reservation.id}: ${alertError.message}`);
          }
        });
    }

    return this.enrichWithAllergens(data);
  }

  private async createCheckInAlert(organizationId: string, reservation: any, allergenDetails: any[]): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from('guest_alerts')
      .insert({
        organization_id: organizationId,
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

    if (error) {
      // The check-in itself has already been committed; surface the missing kitchen alert loudly.
      this.logger.error(`Failed to create check_in alert for reservation ${reservation.id}: ${error.message}`);
    }
  }

  private async enrichWithAllergens(reservation: any): Promise<ReservationResponse> {
    // Calculate stay period metrics on calendar dates (UTC-midnight stamps, hotel-local "today")
    const checkInDate = dayStamp(reservation.check_in_date);
    const checkOutDate = dayStamp(reservation.check_out_date);
    const today = dayStamp(hotelToday());

    // Calculate total nights
    const total_nights = Math.round((checkOutDate - checkInDate) / MS_PER_DAY);

    // Calculate current stay night (1-indexed)
    // If today is before check-in, it's 0 (not yet arrived)
    // If today is check-in day, it's 1 (first night)
    // If today is after check-out, cap at total_nights
    let current_stay_night = 0;
    if (today >= checkInDate) {
      current_stay_night = Math.round((today - checkInDate) / MS_PER_DAY) + 1;
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

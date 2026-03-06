import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AllergensService } from '../allergens/allergens.service';
import { GuestAlertResponse } from './dto/guest-alert-response.dto';
import { CreateGuestAlertDto } from './dto/create-guest-alert.dto';
import { AcknowledgeAlertDto } from './dto/acknowledge-alert.dto';

@Injectable()
export class GuestAlertsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly allergensService: AllergensService,
  ) {}

  async findAll(status?: string): Promise<GuestAlertResponse[]> {
    let query = this.supabaseService
      .getClient()
      .from('guest_alerts')
      .select('*')
      .eq('organization_id', this.supabaseService.getOrganizationId())
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data || [];
  }

  async findNew(): Promise<GuestAlertResponse[]> {
    return this.findAll('new');
  }

  async findOne(id: string): Promise<GuestAlertResponse> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('guest_alerts')
      .select('*')
      .eq('id', id)
      .eq('organization_id', this.supabaseService.getOrganizationId())
      .single();

    if (error || !data) {
      throw new NotFoundException('Guest alert not found');
    }

    return this.enrichWithAllergens(data);
  }

  async create(dto: CreateGuestAlertDto): Promise<GuestAlertResponse> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('guest_alerts')
      .insert({
        organization_id: this.supabaseService.getOrganizationId(),
        ...dto,
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async acknowledge(id: string, dto: AcknowledgeAlertDto): Promise<GuestAlertResponse> {
    const alert = await this.findOne(id);

    if (alert.status !== 'new') {
      throw new BadRequestException('Alert is already acknowledged or resolved');
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('guest_alerts')
      .update({
        status: 'acknowledged',
        acknowledged_by: dto.acknowledged_by || null,
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return this.enrichWithAllergens(data);
  }

  async resolve(id: string): Promise<GuestAlertResponse> {
    const alert = await this.findOne(id);

    if (alert.status === 'resolved') {
      throw new BadRequestException('Alert is already resolved');
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('guest_alerts')
      .update({
        status: 'resolved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  private async enrichWithAllergens(alert: any): Promise<GuestAlertResponse> {
    if (!alert.allergen_ids || alert.allergen_ids.length === 0) {
      return { ...alert, allergens: [] };
    }

    try {
      const allergens = await this.allergensService.findByIds(alert.allergen_ids);
      return { ...alert, allergens };
    } catch {
      return { ...alert, allergens: [] };
    }
  }
}

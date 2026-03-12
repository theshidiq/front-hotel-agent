import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface SeasonalMenu {
  id: string;
  organization_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

@Injectable()
export class SeasonalMenusService {
  private readonly logger = new Logger(SeasonalMenusService.name);

  constructor(private supabaseService: SupabaseService) {}

  async findAll(organizationId: string): Promise<SeasonalMenu[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('seasonal_menus')
      .select('*')
      .eq('organization_id', organizationId)
      .order('sort_order')
      .order('name');

    if (error) {
      this.logger.error(`Failed to fetch seasonal menus: ${error.message}`);
      throw new InternalServerErrorException(`Failed to fetch seasonal menus: ${error.message}`);
    }

    return data || [];
  }

  async create(organizationId: string, data: { name: string; start_date?: string; end_date?: string }): Promise<SeasonalMenu> {
    const supabase = this.supabaseService.getClient();

    // Get max sort_order for auto-increment
    const { data: existing } = await supabase
      .from('seasonal_menus')
      .select('sort_order')
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;

    const { data: created, error } = await supabase
      .from('seasonal_menus')
      .insert({
        organization_id: organizationId,
        name: data.name.trim(),
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create seasonal menu: ${error.message}`);
      throw new InternalServerErrorException(`Failed to create seasonal menu: ${error.message}`);
    }

    return created;
  }

  async update(organizationId: string, id: string, data: { name?: string; start_date?: string; end_date?: string; is_active?: boolean }): Promise<SeasonalMenu> {
    const supabase = this.supabaseService.getClient();

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.start_date !== undefined) updateData.start_date = data.start_date || null;
    if (data.end_date !== undefined) updateData.end_date = data.end_date || null;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const { data: updated, error } = await supabase
      .from('seasonal_menus')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update seasonal menu: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update seasonal menu: ${error.message}`);
    }

    return updated;
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    // Nullify references on menu_groups and menus
    await supabase
      .from('menu_groups')
      .update({ seasonal_menu_id: null })
      .eq('seasonal_menu_id', id)
      .eq('organization_id', organizationId);

    await supabase
      .from('menus')
      .update({ seasonal_menu_id: null })
      .eq('seasonal_menu_id', id)
      .eq('organization_id', organizationId);

    const { error } = await supabase
      .from('seasonal_menus')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete seasonal menu: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete seasonal menu: ${error.message}`);
    }
  }
}

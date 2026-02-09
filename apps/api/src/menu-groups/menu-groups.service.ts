import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface MenuGroup {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

@Injectable()
export class MenuGroupsService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll(): Promise<MenuGroup[]> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    const { data, error } = await supabase
      .from('menu_groups')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('sort_order')
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch menu groups: ${error.message}`);
    }

    return data || [];
  }

  async create(name: string): Promise<MenuGroup> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    // Get max sort_order for auto-increment
    const { data: existing } = await supabase
      .from('menu_groups')
      .select('sort_order')
      .eq('restaurant_id', restaurantId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;

    const { data, error } = await supabase
      .from('menu_groups')
      .insert({ restaurant_id: restaurantId, name: name.trim(), sort_order: nextOrder })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create menu group: ${error.message}`);
    }

    return data;
  }

  async delete(id: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    // Clear menu_group_id on menus that reference this group
    await supabase
      .from('menus')
      .update({ menu_group_id: null })
      .eq('menu_group_id', id);

    const { error } = await supabase
      .from('menu_groups')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete menu group: ${error.message}`);
    }
  }
}

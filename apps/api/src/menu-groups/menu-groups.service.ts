import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface AllowedCourse {
  id: string;
  category_id: string;
  category_name: string;
  category_value: string;
}

export interface MenuGroup {
  id: string;
  restaurant_id: string;
  name: string;
  display_title: string | null;
  seasonal_menu_id: string | null;
  kids_group_ids: string[];
  stay_period_nights: number[] | null;
  sort_order: number;
  created_at: string;
  allowed_courses: AllowedCourse[];
}

@Injectable()
export class MenuGroupsService {
  private readonly logger = new Logger(MenuGroupsService.name);

  constructor(private supabaseService: SupabaseService) {}

  private async loadAllowedCourses(groupIds: string[]): Promise<Record<string, AllowedCourse[]>> {
    if (groupIds.length === 0) return {};

    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('menu_group_courses')
      .select('id, menu_group_id, category_id, sort_order, categories(name, value)')
      .in('menu_group_id', groupIds)
      .order('sort_order');

    if (error) {
      this.logger.error(`Failed to fetch menu group courses: ${error.message}`);
      return {};
    }

    const result: Record<string, AllowedCourse[]> = {};
    for (const row of data || []) {
      const cat = row.categories as unknown as { name: string; value: string } | null;
      if (!cat) continue;
      if (!result[row.menu_group_id]) result[row.menu_group_id] = [];
      result[row.menu_group_id].push({
        id: row.id,
        category_id: row.category_id,
        category_name: cat.name,
        category_value: cat.value,
      });
    }
    return result;
  }

  async findAll(seasonalMenuId?: string): Promise<MenuGroup[]> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    let query = supabase
      .from('menu_groups')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('sort_order')
      .order('name');

    if (seasonalMenuId) {
      query = query.eq('seasonal_menu_id', seasonalMenuId);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch menu groups: ${error.message}`);
      throw new InternalServerErrorException(`Failed to fetch menu groups: ${error.message}`);
    }

    const groups = data || [];
    const coursesMap = await this.loadAllowedCourses(groups.map(g => g.id));

    return groups.map(g => ({
      ...g,
      allowed_courses: coursesMap[g.id] || [],
    }));
  }

  async create(data: { name: string; seasonal_menu_id?: string; course_ids?: string[] }): Promise<MenuGroup> {
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

    const { data: created, error } = await supabase
      .from('menu_groups')
      .insert({
        restaurant_id: restaurantId,
        name: data.name.trim(),
        seasonal_menu_id: data.seasonal_menu_id || null,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create menu group: ${error.message}`);
      throw new InternalServerErrorException(`Failed to create menu group: ${error.message}`);
    }

    // Insert allowed courses with sort_order
    if (data.course_ids && data.course_ids.length > 0) {
      const rows = data.course_ids.map((cid, idx) => ({
        menu_group_id: created.id,
        category_id: cid,
        sort_order: idx,
      }));
      await supabase.from('menu_group_courses').insert(rows);
    }

    // Re-fetch with courses
    const coursesMap = await this.loadAllowedCourses([created.id]);
    return { ...created, allowed_courses: coursesMap[created.id] || [] };
  }

  async update(id: string, data: { name?: string; display_title?: string | null; seasonal_menu_id?: string | null; kids_group_ids?: string[]; stay_period_nights?: number[] | null; course_ids?: string[] }): Promise<MenuGroup> {
    const supabase = this.supabaseService.getClient();

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.display_title !== undefined) updateData.display_title = data.display_title || null;
    if (data.seasonal_menu_id !== undefined) updateData.seasonal_menu_id = data.seasonal_menu_id || null;
    if (data.kids_group_ids !== undefined) updateData.kids_group_ids = data.kids_group_ids;
    if (data.stay_period_nights !== undefined) updateData.stay_period_nights = data.stay_period_nights;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('menu_groups')
        .update(updateData)
        .eq('id', id);

      if (error) {
        this.logger.error(`Failed to update menu group: ${error.message}`);
        throw new InternalServerErrorException(`Failed to update menu group: ${error.message}`);
      }
    }

    // Replace allowed courses if provided
    if (data.course_ids !== undefined) {
      await supabase.from('menu_group_courses').delete().eq('menu_group_id', id);

      if (data.course_ids.length > 0) {
        const rows = data.course_ids.map((cid, idx) => ({
          menu_group_id: id,
          category_id: cid,
          sort_order: idx,
        }));
        await supabase.from('menu_group_courses').insert(rows);
      }
    }

    // Re-fetch the updated group
    const { data: updated, error: fetchError } = await supabase
      .from('menu_groups')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new InternalServerErrorException(`Failed to fetch updated menu group: ${fetchError.message}`);
    }

    const coursesMap = await this.loadAllowedCourses([id]);
    return { ...updated, allowed_courses: coursesMap[id] || [] };
  }

  async delete(id: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    // Clear menu_group_id on menus that reference this group
    await supabase
      .from('menus')
      .update({ menu_group_id: null })
      .eq('menu_group_id', id);

    // menu_group_courses cascade-deletes automatically

    const { error } = await supabase
      .from('menu_groups')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete menu group: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete menu group: ${error.message}`);
    }
  }

  async findByStayPeriod(nights: number, seasonalMenuId?: string): Promise<MenuGroup[]> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    let query = supabase
      .from('menu_groups')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('sort_order')
      .order('name');

    if (seasonalMenuId) {
      query = query.eq('seasonal_menu_id', seasonalMenuId);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch menu groups: ${error.message}`);
      throw new InternalServerErrorException(`Failed to fetch menu groups: ${error.message}`);
    }

    const groups = data || [];
    const coursesMap = await this.loadAllowedCourses(groups.map(g => g.id));

    // Filter groups by stay period
    const filtered = groups.filter(g => {
      // If stay_period_nights is null or empty, it applies to all durations
      if (!g.stay_period_nights || g.stay_period_nights.length === 0) {
        return true;
      }
      // Check if the nights count is in the stay_period_nights array
      return g.stay_period_nights.includes(nights);
    });

    return filtered.map(g => ({
      ...g,
      allowed_courses: coursesMap[g.id] || [],
    }));
  }
}

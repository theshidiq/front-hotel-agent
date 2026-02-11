import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface Category {
  id: string;
  restaurant_id: string;
  type: 'product' | 'menu';
  name: string;
  value: string;
  created_at: string;
}

@Injectable()
export class CategoriesService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll(type?: 'product' | 'menu'): Promise<Category[]> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    let query = supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('name');

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return data || [];
  }

  async create(name: string, type: 'product' | 'menu'): Promise<Category> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();
    const value = name.trim().toLowerCase().replace(/\s+/g, '-');

    const { data, error } = await supabase
      .from('categories')
      .insert({ restaurant_id: restaurantId, type, name: name.trim(), value })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }

    return data;
  }

  async update(id: string, name: string): Promise<Category> {
    const supabase = this.supabaseService.getClient();
    const value = name.trim().toLowerCase().replace(/\s+/g, '-');

    const { data, error } = await supabase
      .from('categories')
      .update({ name: name.trim(), value })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }

    return data;
  }

  async delete(id: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }
}

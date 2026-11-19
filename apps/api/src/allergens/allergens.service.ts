import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface Allergen {
  id: string;
  name: string;
  category: string;
  is_mandatory_japan: boolean;
  created_at: string;
}

@Injectable()
export class AllergensService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll(category?: string): Promise<Allergen[]> {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('allergens')
      .select('*')
      .order('is_mandatory_japan', { ascending: false })
      .order('name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch allergens: ${error.message}`);
    }

    return data || [];
  }

  async findByNames(names: string[]): Promise<Allergen[]> {
    if (!names || names.length === 0) {
      return [];
    }

    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('allergens')
      .select('*')
      .in('name', names);

    if (error) {
      throw new Error(`Failed to fetch allergens by names: ${error.message}`);
    }

    return data || [];
  }

  async findByIds(ids: string[]): Promise<Allergen[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('allergens')
      .select('*')
      .in('id', ids);

    if (error) {
      throw new Error(`Failed to fetch allergens by IDs: ${error.message}`);
    }

    return data || [];
  }

  async create(name: string, category: string): Promise<Allergen> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('allergens')
      .insert({ name, category, is_mandatory_japan: false })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create allergen: ${error.message}`);
    }

    return data;
  }

  async delete(id: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    // Delete related product_allergens first
    const { error: linkError } = await supabase.from('product_allergens').delete().eq('allergen_id', id);
    if (linkError) {
      throw new Error(`Failed to delete allergen links: ${linkError.message}`);
    }

    const { error } = await supabase
      .from('allergens')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete allergen: ${error.message}`);
    }
  }
}

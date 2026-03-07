import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface Category {
  id: string;
  organization_id: string;
  type: 'product' | 'menu';
  name: string;
  value: string;
  image_url: string | null;
  description: string | null;
  price: number | null;
  created_at: string;
}

export interface UpdateCategoryData {
  name?: string;
  image_url?: string | null;
  description?: string | null;
  price?: number | null;
}

@Injectable()
export class CategoriesService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll(organizationId: string, type?: 'product' | 'menu'): Promise<Category[]> {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('categories')
      .select('*')
      .eq('organization_id', organizationId)
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

  async create(organizationId: string, name: string, type: 'product' | 'menu'): Promise<Category> {
    const supabase = this.supabaseService.getClient();
    const value = name.trim().toLowerCase().replace(/\s+/g, '-');

    const { data, error } = await supabase
      .from('categories')
      .insert({ organization_id: organizationId, type, name: name.trim(), value })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }

    return data;
  }

  async update(organizationId: string, id: string, updateData: UpdateCategoryData): Promise<Category> {
    const supabase = this.supabaseService.getClient();

    const payload: Record<string, any> = {};
    if (updateData.name !== undefined) {
      payload.name = updateData.name.trim();
      payload.value = updateData.name.trim().toLowerCase().replace(/\s+/g, '-');
    }
    if (updateData.image_url !== undefined) payload.image_url = updateData.image_url;
    if (updateData.description !== undefined) payload.description = updateData.description;
    if (updateData.price !== undefined) payload.price = updateData.price;

    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }

    return data;
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }
}

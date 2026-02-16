import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface ProductAlternate {
  id: string;
  restaurant_id: string;
  product_id: string;
  alternate_product_id: string;
  created_at: string;
}

@Injectable()
export class ProductAlternatesService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll(): Promise<ProductAlternate[]> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    const { data, error } = await supabase
      .from('product_alternates')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch product alternates: ${error.message}`);
    }

    return data || [];
  }

  async findByProduct(productId: string): Promise<ProductAlternate[]> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    const { data, error } = await supabase
      .from('product_alternates')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('product_id', productId);

    if (error) {
      throw new Error(`Failed to fetch alternates: ${error.message}`);
    }

    return data || [];
  }

  async create(productId: string, alternateProductId: string): Promise<ProductAlternate> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    const { data, error } = await supabase
      .from('product_alternates')
      .insert({
        restaurant_id: restaurantId,
        product_id: productId,
        alternate_product_id: alternateProductId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create alternate: ${error.message}`);
    }

    return data;
  }

  async delete(productId: string, alternateProductId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    const { error } = await supabase
      .from('product_alternates')
      .delete()
      .eq('restaurant_id', restaurantId)
      .eq('product_id', productId)
      .eq('alternate_product_id', alternateProductId);

    if (error) {
      throw new Error(`Failed to delete alternate: ${error.message}`);
    }
  }
}

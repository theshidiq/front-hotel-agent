import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface ProductAlternate {
  id: string;
  organization_id: string;
  product_id: string;
  alternate_product_id: string;
  created_at: string;
}

@Injectable()
export class ProductAlternatesService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll(organizationId: string): Promise<ProductAlternate[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('product_alternates')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch product alternates: ${error.message}`);
    }

    return data || [];
  }

  async create(organizationId: string, productId: string, alternateProductId: string): Promise<ProductAlternate> {
    const supabase = this.supabaseService.getClient();

    // Both products must belong to this organization
    const ids = [...new Set([productId, alternateProductId])];
    const { data: owned, error: ownedError } = await supabase
      .from('products')
      .select('id')
      .in('id', ids)
      .eq('organization_id', organizationId);
    if (ownedError) {
      throw new Error(`Failed to verify products: ${ownedError.message}`);
    }
    if ((owned || []).length !== ids.length) {
      throw new BadRequestException('Product not found');
    }

    const { data, error } = await supabase
      .from('product_alternates')
      .insert({
        organization_id: organizationId,
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

  async delete(organizationId: string, productId: string, alternateProductId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('product_alternates')
      .delete()
      .eq('organization_id', organizationId)
      .eq('product_id', productId)
      .eq('alternate_product_id', alternateProductId);

    if (error) {
      throw new Error(`Failed to delete alternate: ${error.message}`);
    }
  }
}

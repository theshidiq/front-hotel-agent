import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponse, AllergenInfo } from './dto/product-response.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createProductDto: CreateProductDto): Promise<ProductResponse> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    const { allergen_ids, ...productData } = createProductDto;

    // Create product
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        restaurant_id: restaurantId,
        ...productData,
        is_vegetarian: productData.is_vegetarian ?? false,
        is_vegan: productData.is_vegan ?? false,
        is_halal: productData.is_halal ?? false,
        is_gluten_free: productData.is_gluten_free ?? false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }

    // Link allergens if provided
    const allergens: AllergenInfo[] = [];
    if (allergen_ids && allergen_ids.length > 0) {
      for (const allergenId of allergen_ids) {
        const { error: linkError } = await supabase
          .from('product_allergens')
          .insert({
            product_id: product.id,
            allergen_id: allergenId,
            source: 'label',
          });

        if (!linkError) {
          const { data: allergen } = await supabase
            .from('allergens')
            .select('id, name, category')
            .eq('id', allergenId)
            .single();

          if (allergen) {
            allergens.push({
              id: allergen.id,
              name: allergen.name,
              category: allergen.category,
              source: 'label',
            });
          }
        }
      }
    }

    return {
      ...product,
      allergens,
    };
  }

  async findAll(limit = 50): Promise<ProductResponse[]> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    // Fetch allergens for all products
    const productIds = products.map((p) => p.id);
    const { data: allergenLinks } = await supabase
      .from('product_allergens')
      .select('*, allergens(*)')
      .in('product_id', productIds);

    // Group allergens by product
    const allergensByProduct = new Map<string, AllergenInfo[]>();
    for (const link of allergenLinks || []) {
      const productId = link.product_id;
      if (!allergensByProduct.has(productId)) {
        allergensByProduct.set(productId, []);
      }
      allergensByProduct.get(productId)!.push({
        id: link.allergens.id,
        name: link.allergens.name,
        category: link.allergens.category,
        source: link.source,
      });
    }

    return products.map((product) => ({
      ...product,
      allergens: allergensByProduct.get(product.id) || [],
    }));
  }

  async findOne(id: string): Promise<ProductResponse> {
    const supabase = this.supabaseService.getClient();

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    // Fetch allergens
    const { data: allergenLinks } = await supabase
      .from('product_allergens')
      .select('*, allergens(*)')
      .eq('product_id', id);

    const allergens: AllergenInfo[] = (allergenLinks || []).map(
      (link: any) => ({
        id: link.allergens.id,
        name: link.allergens.name,
        category: link.allergens.category,
        source: link.source,
      }),
    );

    return {
      ...product,
      allergens,
    };
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponse> {
    const supabase = this.supabaseService.getClient();

    // Verify product exists
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    const { allergen_ids, ...productData } = updateProductDto;

    // Only update product if there's data to update (not just allergen_ids)
    if (Object.keys(productData).length > 0) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update product: ${error.message}`);
      }
    }

    // Update allergens if provided
    if (allergen_ids !== undefined) {
      // Remove existing allergens
      await supabase.from('product_allergens').delete().eq('product_id', id);

      // Add new allergens
      for (const allergenId of allergen_ids) {
        await supabase.from('product_allergens').insert({
          product_id: id,
          allergen_id: allergenId,
          source: 'label',
        });
      }
    }

    // Return updated product with allergens
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    // Verify product exists
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    // Delete allergen links first
    await supabase.from('product_allergens').delete().eq('product_id', id);

    // Delete product
    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }
}

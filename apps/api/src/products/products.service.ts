import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponse, AllergenInfo } from './dto/product-response.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(organizationId: string, createProductDto: CreateProductDto): Promise<ProductResponse> {
    const supabase = this.supabaseService.getClient();

    const { allergen_ids, ...productData } = createProductDto;

    // Create product
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        organization_id: organizationId,
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

    // Link allergens if provided — batch insert + batch fetch
    let allergens: AllergenInfo[] = [];
    if (allergen_ids && allergen_ids.length > 0) {
      const rows = allergen_ids.map((aid) => ({
        product_id: product.id,
        allergen_id: aid,
        source: 'label',
      }));

      const [, { data: allergenData }] = await Promise.all([
        supabase.from('product_allergens').insert(rows),
        supabase
          .from('allergens')
          .select('id, name, category')
          .in('id', allergen_ids),
      ]);

      allergens = (allergenData || []).map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        source: 'label',
      }));
    }

    return {
      ...product,
      allergens,
    };
  }

  async findAll(organizationId: string, limit = 50, search?: string, category?: string): Promise<ProductResponse[]> {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('products')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data: products, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    if (products.length === 0) {
      return [];
    }

    // Fetch allergens for all products in one query
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

  async findOne(organizationId: string, id: string): Promise<ProductResponse> {
    const supabase = this.supabaseService.getClient();

    // Parallel fetch: product + allergen links
    const [productResult, allergenResult] = await Promise.all([
      supabase.from('products').select('*').eq('id', id).eq('organization_id', organizationId).single(),
      supabase
        .from('product_allergens')
        .select('*, allergens(*)')
        .eq('product_id', id),
    ]);

    if (productResult.error || !productResult.data) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    const allergens: AllergenInfo[] = (allergenResult.data || []).map(
      (link: any) => ({
        id: link.allergens.id,
        name: link.allergens.name,
        category: link.allergens.category,
        source: link.source,
      }),
    );

    return {
      ...productResult.data,
      allergens,
    };
  }

  async update(
    organizationId: string,
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponse> {
    const supabase = this.supabaseService.getClient();

    const { allergen_ids, ...productData } = updateProductDto;

    // Update product fields if provided — also serves as existence check
    if (Object.keys(productData).length > 0) {
      const { data: updated, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select('id');

      if (error) {
        throw new Error(`Failed to update product: ${error.message}`);
      }
      if (!updated || updated.length === 0) {
        throw new NotFoundException(`Product ${id} not found`);
      }
    }

    // Update allergens if provided — batch delete + batch insert
    if (allergen_ids !== undefined) {
      await supabase.from('product_allergens').delete().eq('product_id', id);

      if (allergen_ids.length > 0) {
        const rows = allergen_ids.map((aid) => ({
          product_id: id,
          allergen_id: aid,
          source: 'label',
        }));
        await supabase.from('product_allergens').insert(rows);
      }
    }

    return this.findOne(organizationId, id);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    // Delete allergen links + product in parallel (links first, then product)
    await supabase.from('product_allergens').delete().eq('product_id', id);

    const { data: deleted, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('id');

    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }

    if (!deleted || deleted.length === 0) {
      throw new NotFoundException(`Product ${id} not found`);
    }
  }
}

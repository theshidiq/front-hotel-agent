import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { MenuResponse, MenuProductInfo } from './dto/menu-response.dto';
import { AllergenInfo } from '../products/dto/product-response.dto';

@Injectable()
export class MenusService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createMenuDto: CreateMenuDto): Promise<MenuResponse> {
    const supabase = this.supabaseService.getClient();
    const organizationId = this.supabaseService.getOrganizationId();

    const { product_ids, ...menuData } = createMenuDto;

    // Create menu
    const { data: menu, error } = await supabase
      .from('menus')
      .insert({
        organization_id: organizationId,
        ...menuData,
        is_available: menuData.is_available ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create menu: ${error.message}`);
    }

    // Link products if provided — batch insert
    if (product_ids && product_ids.length > 0) {
      const rows = product_ids.map((pid) => ({
        menu_id: menu.id,
        product_id: pid,
      }));
      await supabase.from('menu_products').insert(rows);
    }

    // Return complete menu with products and derived allergens
    return this.findOne(menu.id);
  }

  async findAll(limit = 50): Promise<MenuResponse[]> {
    const supabase = this.supabaseService.getClient();
    const organizationId = this.supabaseService.getOrganizationId();

    const { data: menus, error } = await supabase
      .from('menus')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch menus: ${error.message}`);
    }

    if (menus.length === 0) {
      return [];
    }

    const menuIds = menus.map((m) => m.id);

    // Get menu_products links
    const { data: menuProductLinks } = await supabase
      .from('menu_products')
      .select('menu_id, product_id')
      .in('menu_id', menuIds);

    const productIds = [
      ...new Set((menuProductLinks || []).map((mp) => mp.product_id)),
    ];

    if (productIds.length === 0) {
      return menus.map((menu) => ({
        ...menu,
        products: [],
        allergens: [],
      }));
    }

    // Parallel fetch: products + allergen links
    const [{ data: products }, { data: allergenLinks }] = await Promise.all([
      supabase.from('products').select('*').in('id', productIds),
      supabase
        .from('product_allergens')
        .select('*, allergens(*)')
        .in('product_id', productIds),
    ]);

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

    // Build products map
    const productsMap = new Map(
      (products || []).map((p) => [
        p.id,
        {
          ...p,
          allergens: allergensByProduct.get(p.id) || [],
        },
      ]),
    );

    // Group products by menu
    const productsByMenu = new Map<string, MenuProductInfo[]>();
    for (const link of menuProductLinks || []) {
      const menuId = link.menu_id;
      const product = productsMap.get(link.product_id);
      if (product) {
        if (!productsByMenu.has(menuId)) {
          productsByMenu.set(menuId, []);
        }
        productsByMenu.get(menuId)!.push({
          id: product.id,
          name: product.name,
          brand: product.brand,
          category: product.category,
          allergens: product.allergens,
        });
      }
    }

    // Build response with derived allergens
    return menus.map((menu) => {
      const menuProducts = productsByMenu.get(menu.id) || [];
      const derivedAllergens = this.deriveAllergens(menuProducts);

      return {
        ...menu,
        products: menuProducts,
        allergens: derivedAllergens,
      };
    });
  }

  async findOne(id: string): Promise<MenuResponse> {
    const supabase = this.supabaseService.getClient();
    const organizationId = this.supabaseService.getOrganizationId();

    // Parallel fetch: menu + product links
    const [menuResult, linksResult] = await Promise.all([
      supabase.from('menus').select('*').eq('id', id).eq('organization_id', organizationId).single(),
      supabase.from('menu_products').select('product_id').eq('menu_id', id),
    ]);

    if (menuResult.error || !menuResult.data) {
      throw new NotFoundException(`Menu ${id} not found`);
    }

    const menu = menuResult.data;
    const productIds = (linksResult.data || []).map((mp) => mp.product_id);

    let products: MenuProductInfo[] = [];

    if (productIds.length > 0) {
      // Parallel fetch: products + allergen links
      const [{ data: productData }, { data: allergenLinks }] =
        await Promise.all([
          supabase.from('products').select('*').in('id', productIds),
          supabase
            .from('product_allergens')
            .select('*, allergens(*)')
            .in('product_id', productIds),
        ]);

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

      products = (productData || []).map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        allergens: allergensByProduct.get(p.id) || [],
      }));
    }

    // Derive allergens from all linked products
    const derivedAllergens = this.deriveAllergens(products);

    return {
      ...menu,
      products,
      allergens: derivedAllergens,
    };
  }

  async update(id: string, updateMenuDto: UpdateMenuDto): Promise<MenuResponse> {
    const supabase = this.supabaseService.getClient();
    const organizationId = this.supabaseService.getOrganizationId();

    const { product_ids, ...menuData } = updateMenuDto;

    // Update menu — also serves as existence check
    const { error } = await supabase
      .from('menus')
      .update({
        ...menuData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to update menu: ${error.message}`);
    }

    // Update products if provided — batch delete + batch insert
    if (product_ids !== undefined) {
      await supabase.from('menu_products').delete().eq('menu_id', id);

      if (product_ids.length > 0) {
        const rows = product_ids.map((pid) => ({
          menu_id: id,
          product_id: pid,
        }));
        await supabase.from('menu_products').insert(rows);
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const organizationId = this.supabaseService.getOrganizationId();

    // Delete product links first
    await supabase.from('menu_products').delete().eq('menu_id', id);

    // Delete menu
    const { data: deleted, error } = await supabase
      .from('menus')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('id');

    if (error) {
      throw new Error(`Failed to delete menu: ${error.message}`);
    }

    if (!deleted || deleted.length === 0) {
      throw new NotFoundException(`Menu ${id} not found`);
    }
  }

  /**
   * Derive unique allergens from all linked products
   */
  private deriveAllergens(products: MenuProductInfo[]): AllergenInfo[] {
    const allergenMap = new Map<string, AllergenInfo>();

    for (const product of products) {
      for (const allergen of product.allergens) {
        if (!allergenMap.has(allergen.id)) {
          allergenMap.set(allergen.id, allergen);
        }
      }
    }

    return Array.from(allergenMap.values());
  }
}

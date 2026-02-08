import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { QwenVisionService } from '../qwen/qwen-vision.service';
import { AllergensService } from '../allergens/allergens.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { ScanResultResponse, ScanSessionResponse } from './dto/scan-response.dto';

@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly qwenVisionService: QwenVisionService,
    private readonly allergensService: AllergensService,
  ) {}

  async createScan(createScanDto: CreateScanDto): Promise<ScanResultResponse> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    // 1. Create scan session (pending)
    const { data: scanSession, error: scanError } = await supabase
      .from('scan_sessions')
      .insert({
        restaurant_id: restaurantId,
        image_url: createScanDto.imageUrl,
        status: 'pending',
      })
      .select()
      .single();

    if (scanError) {
      throw new Error(`Failed to create scan session: ${scanError.message}`);
    }

    this.logger.log(`Created scan session: ${scanSession.id}`);

    try {
      // 2. Update status to processing
      await supabase
        .from('scan_sessions')
        .update({ status: 'processing' })
        .eq('id', scanSession.id);

      // 3. Call Qwen Vision API
      const { extractedData, rawResponse } =
        await this.qwenVisionService.extractProductData(createScanDto.imageUrl);

      // 4. Save raw response
      await supabase
        .from('scan_sessions')
        .update({ raw_response: rawResponse })
        .eq('id', scanSession.id);

      // 5. Create product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          restaurant_id: restaurantId,
          name: extractedData.product_name || 'Unknown Product',
          brand: extractedData.brand,
          category: extractedData.category,
          ingredients_raw: extractedData.ingredients_raw,
          nutrition_per_100g: extractedData.nutrition_per_100g,
          storage_instructions: extractedData.storage_instructions,
          preparation_instructions: extractedData.preparation_instructions,
          is_vegetarian: extractedData.is_vegetarian,
          is_vegan: extractedData.is_vegan,
          is_halal: extractedData.is_halal,
          is_gluten_free: extractedData.is_gluten_free,
          image_url: createScanDto.imageUrl,
        })
        .select()
        .single();

      if (productError) {
        throw new Error(`Failed to create product: ${productError.message}`);
      }

      this.logger.log(`Created product: ${product.id}`);

      // 6. Check for existing product with same name (duplicate detection)
      let existingProduct = null;
      const productName = product.name?.trim();
      if (productName && productName !== 'Unknown Product') {
        const { data: duplicates } = await supabase
          .from('products')
          .select('id, name, brand, image_url')
          .eq('restaurant_id', restaurantId)
          .ilike('name', productName)
          .neq('id', product.id)
          .limit(1);

        if (duplicates && duplicates.length > 0) {
          existingProduct = duplicates[0];
          this.logger.log(`Duplicate product found: ${existingProduct.id} (${existingProduct.name})`);
        }
      }

      // 7. Link allergens (from Qwen labels + ingredient text scanning)
      const allergenLinks = await this.linkAllergens(
        product.id,
        extractedData.allergens,
        extractedData.ingredients_raw,
      );

      // 8. Update scan session with product_id and completed status
      const { data: updatedSession } = await supabase
        .from('scan_sessions')
        .update({
          product_id: product.id,
          status: 'completed',
        })
        .eq('id', scanSession.id)
        .select()
        .single();

      return {
        scan_session: updatedSession,
        product: {
          ...product,
          allergens: allergenLinks,
        },
        ...(existingProduct && { existing_product: existingProduct }),
      };
    } catch (error) {
      // Update scan session with failed status
      await supabase
        .from('scan_sessions')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', scanSession.id);

      this.logger.error(`Scan failed: ${error.message}`);
      throw error;
    }
  }

  private async linkAllergens(
    productId: string,
    allergenNames: string[],
    ingredientsRaw: string | null,
  ): Promise<{ id: string; name: string; category: string; source: string }[]> {
    const supabase = this.supabaseService.getClient();
    const links: { id: string; name: string; category: string; source: string }[] = [];
    const linkedIds = new Set<string>();

    // 1. Match by Qwen-extracted allergen names
    if (allergenNames && allergenNames.length > 0) {
      const matchedAllergens = await this.allergensService.findByNames(allergenNames);
      for (const allergen of matchedAllergens) {
        const { error } = await supabase.from('product_allergens').insert({
          product_id: productId,
          allergen_id: allergen.id,
          source: 'label',
        });
        if (!error) {
          linkedIds.add(allergen.id);
          links.push({
            id: allergen.id,
            name: allergen.name,
            category: allergen.category,
            source: 'label',
          });
        }
      }
    }

    // 2. Scan ingredients_raw text against all known allergens
    if (ingredientsRaw) {
      const allAllergens = await this.allergensService.findAll();
      for (const allergen of allAllergens) {
        if (linkedIds.has(allergen.id)) continue;
        if (ingredientsRaw.includes(allergen.name)) {
          const { error } = await supabase.from('product_allergens').insert({
            product_id: productId,
            allergen_id: allergen.id,
            source: 'inferred',
          });
          if (!error) {
            linkedIds.add(allergen.id);
            links.push({
              id: allergen.id,
              name: allergen.name,
              category: allergen.category,
              source: 'inferred',
            });
          }
        }
      }
      this.logger.log(`Inferred ${links.filter(l => l.source === 'inferred').length} allergens from ingredients text`);
    }

    return links;
  }

  async findOne(id: string): Promise<ScanResultResponse> {
    const supabase = this.supabaseService.getClient();

    const { data: scanSession, error } = await supabase
      .from('scan_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !scanSession) {
      throw new NotFoundException(`Scan session ${id} not found`);
    }

    let product = null;

    if (scanSession.product_id) {
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('id', scanSession.product_id)
        .single();

      if (productData) {
        // Get allergens for product
        const { data: allergenLinks } = await supabase
          .from('product_allergens')
          .select('*, allergens(*)')
          .eq('product_id', productData.id);

        product = {
          ...productData,
          allergens: (allergenLinks || []).map((link: any) => ({
            id: link.allergens.id,
            name: link.allergens.name,
            category: link.allergens.category,
            source: link.source,
          })),
        };
      }
    }

    return {
      scan_session: scanSession,
      product,
    };
  }

  async findAll(limit = 20): Promise<ScanSessionResponse[]> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    const { data, error } = await supabase
      .from('scan_sessions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch scan sessions: ${error.message}`);
    }

    return data || [];
  }
}

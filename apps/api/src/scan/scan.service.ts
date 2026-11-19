import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { QwenVisionService } from '../qwen/qwen-vision.service';
import { AllergensService } from '../allergens/allergens.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { ScanExtractResponse, ScanResultResponse, ScanSessionResponse } from './dto/scan-response.dto';

@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly qwenVisionService: QwenVisionService,
    private readonly allergensService: AllergensService,
  ) {}

  async createScan(organizationId: string, createScanDto: CreateScanDto): Promise<ScanResultResponse> {
    const supabase = this.supabaseService.getClient();

    // 1. Create scan session (pending)
    const { data: scanSession, error: scanError } = await supabase
      .from('scan_sessions')
      .insert({
        organization_id: organizationId,
        image_url: createScanDto.imageUrl,
        status: 'pending',
      })
      .select()
      .single();

    if (scanError) {
      throw new Error(`Failed to create scan session: ${scanError.message}`);
    }

    this.logger.log(`Created scan session: ${scanSession.id}`);

    let createdProductId: string | null = null;
    try {
      // 2. Update status to processing
      await supabase
        .from('scan_sessions')
        .update({ status: 'processing' })
        .eq('id', scanSession.id);

      // 3. Call Qwen Vision API
      const { extractedData, rawResponse } =
        await this.qwenVisionService.extractProductData(createScanDto.imageUrl);

      // 4. Save raw response + create product in parallel
      const [, productResult] = await Promise.all([
        supabase
          .from('scan_sessions')
          .update({ raw_response: rawResponse })
          .eq('id', scanSession.id),
        supabase
          .from('products')
          .insert({
            organization_id: organizationId,
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
          .single(),
      ]);

      if (productResult.error) {
        throw new Error(`Failed to create product: ${productResult.error.message}`);
      }

      const product = productResult.data;
      createdProductId = product.id;
      this.logger.log(`Created product: ${product.id}`);

      // 6. Check duplicate + link allergens in parallel
      const productName = product.name?.trim();
      const [duplicateResult, allergenLinks] = await Promise.all([
        productName && productName !== 'Unknown Product'
          ? supabase
              .from('products')
              .select('id, name, brand, image_url')
              .eq('organization_id', organizationId)
              .ilike('name', productName.replace(/[\\%_]/g, '\\$&'))
              .neq('id', product.id)
              .limit(1)
          : Promise.resolve({ data: null }),
        this.linkAllergens(
          product.id,
          extractedData.allergens,
          extractedData.ingredients_raw,
        ),
      ]);

      let existingProduct = null;
      if (duplicateResult.data && duplicateResult.data.length > 0) {
        existingProduct = duplicateResult.data[0];
        this.logger.log(`Duplicate product found: ${existingProduct.id} (${existingProduct.name})`);
      }

      // 7. Update scan session with product_id and completed status
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
      // Don't leave a half-built product behind (e.g. created but allergen links failed)
      if (createdProductId) {
        await supabase.from('product_allergens').delete().eq('product_id', createdProductId);
        await supabase.from('products').delete().eq('id', createdProductId);
      }

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

    // Fetch label-matched + all allergens in parallel
    const [matchedAllergens, allAllergens] = await Promise.all([
      allergenNames && allergenNames.length > 0
        ? this.allergensService.findByNames(allergenNames)
        : Promise.resolve([]),
      ingredientsRaw ? this.allergensService.findAll() : Promise.resolve([]),
    ]);

    // 1. Collect label-matched allergens
    for (const allergen of matchedAllergens) {
      linkedIds.add(allergen.id);
      links.push({
        id: allergen.id,
        name: allergen.name,
        category: allergen.category,
        source: 'label',
      });
    }

    // 2. Scan ingredients text for additional allergens
    if (ingredientsRaw) {
      for (const allergen of allAllergens) {
        if (linkedIds.has(allergen.id)) continue;
        if (ingredientsRaw.includes(allergen.name)) {
          linkedIds.add(allergen.id);
          links.push({
            id: allergen.id,
            name: allergen.name,
            category: allergen.category,
            source: 'inferred',
          });
        }
      }
      this.logger.log(`Inferred ${links.filter(l => l.source === 'inferred').length} allergens from ingredients text`);
    }

    // 3. Batch insert all allergen links at once
    if (links.length > 0) {
      const rows = links.map((l) => ({
        product_id: productId,
        allergen_id: l.id,
        source: l.source,
      }));
      const { error } = await supabase.from('product_allergens').insert(rows);
      if (error) {
        throw new Error(`Failed to link allergens: ${error.message}`);
      }
    }

    return links;
  }

  async extractOnly(organizationId: string, createScanDto: CreateScanDto): Promise<ScanExtractResponse> {
    const supabase = this.supabaseService.getClient();

    // 1. Create scan session
    const { data: scanSession, error: scanError } = await supabase
      .from('scan_sessions')
      .insert({
        organization_id: organizationId,
        image_url: createScanDto.imageUrl,
        status: 'pending',
      })
      .select()
      .single();

    if (scanError) {
      throw new Error(`Failed to create scan session: ${scanError.message}`);
    }

    try {
      await supabase
        .from('scan_sessions')
        .update({ status: 'processing' })
        .eq('id', scanSession.id);

      // 2. Call Qwen Vision API
      const { extractedData, rawResponse } =
        await this.qwenVisionService.extractProductData(createScanDto.imageUrl);

      // 3. Save raw response + match allergens in parallel
      const [, matchedAllergens] = await Promise.all([
        supabase
          .from('scan_sessions')
          .update({ raw_response: rawResponse })
          .eq('id', scanSession.id),
        this.matchAllergens(
          extractedData.allergens,
          extractedData.ingredients_raw,
        ),
      ]);

      // 4. Update scan session as completed
      const { data: updatedSession } = await supabase
        .from('scan_sessions')
        .update({ status: 'completed' })
        .eq('id', scanSession.id)
        .select()
        .single();

      return {
        scan_session: updatedSession,
        extracted_data: {
          product_name: extractedData.product_name,
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
        },
        matched_allergens: matchedAllergens,
        image_url: createScanDto.imageUrl,
      };
    } catch (error) {
      await supabase
        .from('scan_sessions')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', scanSession.id);

      this.logger.error(`Scan extract failed: ${error.message}`);
      throw error;
    }
  }

  async extractFromFile(organizationId: string, file: Express.Multer.File): Promise<ScanExtractResponse> {
    const supabase = this.supabaseService.getClient();

    // 1. Upload to Supabase Storage (backend → Supabase is fast, server-to-server)
    const ext = file.originalname.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = `scans/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file.buffer, { contentType: file.mimetype });

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);
    const imageUrl = urlData.publicUrl;

    // 2. Create scan session
    const { data: scanSession, error: scanError } = await supabase
      .from('scan_sessions')
      .insert({
        organization_id: organizationId,
        image_url: imageUrl,
        status: 'processing',
      })
      .select()
      .single();

    if (scanError) {
      throw new Error(`Failed to create scan session: ${scanError.message}`);
    }

    try {
      // 3. Call Qwen Vision API directly from buffer (no re-download needed)
      const { extractedData, rawResponse } =
        await this.qwenVisionService.extractProductDataFromBuffer(file.buffer, file.mimetype);

      // 4. Save raw response + match allergens in parallel
      const [, matchedAllergens] = await Promise.all([
        supabase
          .from('scan_sessions')
          .update({ raw_response: rawResponse })
          .eq('id', scanSession.id),
        this.matchAllergens(
          extractedData.allergens,
          extractedData.ingredients_raw,
        ),
      ]);

      // 5. Update scan session as completed
      const { data: updatedSession } = await supabase
        .from('scan_sessions')
        .update({ status: 'completed' })
        .eq('id', scanSession.id)
        .select()
        .single();

      return {
        scan_session: updatedSession,
        extracted_data: {
          product_name: extractedData.product_name,
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
        },
        matched_allergens: matchedAllergens,
        image_url: imageUrl,
      };
    } catch (error) {
      await supabase
        .from('scan_sessions')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', scanSession.id);

      this.logger.error(`Scan extract from file failed: ${error.message}`);
      throw error;
    }
  }

  private async matchAllergens(
    allergenNames: string[],
    ingredientsRaw: string | null,
  ): Promise<{ id: string; name: string; category: string; source: string }[]> {
    const matches: { id: string; name: string; category: string; source: string }[] = [];
    const matchedIds = new Set<string>();

    // Fetch label-matched + all allergens in parallel
    const [found, allAllergens] = await Promise.all([
      allergenNames && allergenNames.length > 0
        ? this.allergensService.findByNames(allergenNames)
        : Promise.resolve([]),
      ingredientsRaw ? this.allergensService.findAll() : Promise.resolve([]),
    ]);

    // 1. Label matches
    for (const allergen of found) {
      matchedIds.add(allergen.id);
      matches.push({
        id: allergen.id,
        name: allergen.name,
        category: allergen.category,
        source: 'label',
      });
    }

    // 2. Ingredient text matches
    if (ingredientsRaw) {
      for (const allergen of allAllergens) {
        if (matchedIds.has(allergen.id)) continue;
        if (ingredientsRaw.includes(allergen.name)) {
          matchedIds.add(allergen.id);
          matches.push({
            id: allergen.id,
            name: allergen.name,
            category: allergen.category,
            source: 'inferred',
          });
        }
      }
    }

    return matches;
  }

  async findOne(organizationId: string, id: string): Promise<ScanResultResponse> {
    const supabase = this.supabaseService.getClient();

    const { data: scanSession, error } = await supabase
      .from('scan_sessions')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !scanSession) {
      throw new NotFoundException(`Scan session ${id} not found`);
    }

    let product = null;

    if (scanSession.product_id) {
      // Parallel fetch: product + allergens
      const [productResult, allergenResult] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('id', scanSession.product_id)
          .eq('organization_id', organizationId)
          .single(),
        supabase
          .from('product_allergens')
          .select('*, allergens(*)')
          .eq('product_id', scanSession.product_id),
      ]);

      if (productResult.data) {
        product = {
          ...productResult.data,
          allergens: (allergenResult.data || []).map((link: any) => ({
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

  async findAll(organizationId: string, limit = 20): Promise<ScanSessionResponse[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('scan_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch scan sessions: ${error.message}`);
    }

    return data || [];
  }
}

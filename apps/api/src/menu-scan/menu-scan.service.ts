import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { MenusService } from '../menus/menus.service';
import { ClaudeVisionService } from './claude-vision.service';
import { GeminiVisionService } from './gemini-vision.service';
import { MenuScanConfirmDto, SaveDraftDto } from './dto/menu-scan-confirm.dto';
import { MenuScanExtractResponse, MenuScanDraft, VALID_CATEGORIES, MenuCourseCategory } from './dto/menu-scan-response.dto';

@Injectable()
export class MenuScanService {
  private readonly logger = new Logger(MenuScanService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly claudeVisionService: ClaudeVisionService,
    private readonly geminiVisionService: GeminiVisionService,
    private readonly menusService: MenusService,
  ) {}

  // ── Extract: OCR + auto-save draft ───────────────────────────────────────

  async extractCourses(
    organizationId: string,
    file: Express.Multer.File,
    menuGroupId?: string,
  ): Promise<MenuScanExtractResponse> {
    const supabase = this.supabaseService.getClient();

    // 1. Upload image to Supabase Storage
    const ext = file.originalname.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = `menu-scans/${fileName}`;

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

    this.logger.log(`Uploaded menu scan image: ${imageUrl}`);

    // 2. Create scan session (processing)
    const { data: scanSession } = await supabase
      .from('scan_sessions')
      .insert({
        organization_id: organizationId,
        image_url: imageUrl,
        status: 'processing',
        scan_type: 'menu',
        menu_group_id: menuGroupId ?? null,
      })
      .select()
      .single();

    try {
      // 3. Call Gemini Vision OCR (primary — best for handwritten Japanese)
      const { menu_title, courses, raw_response } =
        await this.geminiVisionService.extractMenuCourses(file.buffer, file.mimetype);

      this.logger.log(`Extracted ${courses.length} courses. Title: ${menu_title}`);

      // 4. Auto-save as draft
      if (scanSession) {
        await supabase
          .from('scan_sessions')
          .update({
            status: 'draft',
            raw_response,
            draft_courses: courses,
            menu_title,
          })
          .eq('id', scanSession.id);
      }

      return {
        courses,
        menu_title,
        image_url: imageUrl,
        session_id: scanSession?.id,
      };
    } catch (error) {
      if (scanSession) {
        await supabase
          .from('scan_sessions')
          .update({ status: 'failed', error_message: error.message })
          .eq('id', scanSession.id);
      }
      this.logger.error(`Menu scan extraction failed: ${error.message}`);
      throw error;
    }
  }

  // ── Save draft (update existing or create) ────────────────────────────────

  async saveDraft(
    organizationId: string,
    dto: SaveDraftDto,
  ): Promise<{ session_id: string }> {
    const supabase = this.supabaseService.getClient();

    if (dto.session_id) {
      // Update existing draft. Return the affected row so a failed/no-op update
      // (e.g. wrong id or org mismatch) surfaces instead of silently "succeeding".
      const { data, error } = await supabase
        .from('scan_sessions')
        .update({
          draft_courses: dto.courses,
          menu_title: dto.menu_title ?? null,
          menu_group_id: dto.menu_group_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dto.session_id)
        .eq('organization_id', organizationId)
        .select('id')
        .maybeSingle();

      if (error) throw new Error(`Failed to update draft: ${error.message}`);
      if (!data) {
        // No row matched — the session id is stale/foreign. Fall through to create
        // a fresh draft so the edit is never lost.
      } else {
        return { session_id: dto.session_id };
      }
    }

    // Create new draft session (no image, manual entry)
    const { data, error } = await supabase
      .from('scan_sessions')
      .insert({
        organization_id: organizationId,
        image_url: dto.image_url ?? '',
        status: 'draft',
        scan_type: 'menu',
        menu_group_id: dto.menu_group_id,
        menu_title: dto.menu_title ?? null,
        draft_courses: dto.courses,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to save draft: ${error.message}`);

    return { session_id: data.id };
  }

  // ── Load drafts for org ───────────────────────────────────────────────────

  async getDrafts(organizationId: string): Promise<MenuScanDraft[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('scan_sessions')
      .select('id, menu_group_id, menu_title, draft_courses, image_url, created_at, updated_at')
      .eq('organization_id', organizationId)
      .eq('scan_type', 'menu')
      .eq('status', 'draft')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch drafts: ${error.message}`);

    return (data || []).map((row) => ({
      session_id: row.id,
      menu_group_id: row.menu_group_id,
      menu_title: row.menu_title,
      courses: row.draft_courses || [],
      image_url: row.image_url,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  // ── Delete draft ──────────────────────────────────────────────────────────

  async deleteDraft(organizationId: string, sessionId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    await supabase
      .from('scan_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('organization_id', organizationId)
      .eq('scan_type', 'menu');
  }

  // ── Confirm: create menu items + mark draft completed ────────────────────

  async confirmAndCreate(
    organizationId: string,
    dto: MenuScanConfirmDto,
  ) {
    this.logger.log(
      `Creating ${dto.courses.length} menu items for group: ${dto.menu_group_id}`,
    );

    const results = await Promise.all(
      dto.courses.map((course) => {
        const category = this.resolveCategory(course.category);
        return this.menusService.create(organizationId, {
          name: course.name,
          description: course.description ?? undefined,
          category,
          menu_group_id: dto.menu_group_id,
          seasonal_menu_id: dto.seasonal_menu_id ?? undefined,
          is_available: true,
        });
      }),
    );

    // Mark draft as completed
    if (dto.draft_session_id) {
      const supabase = this.supabaseService.getClient();
      await supabase
        .from('scan_sessions')
        .update({ status: 'completed' })
        .eq('id', dto.draft_session_id)
        .eq('organization_id', organizationId);
    }

    this.logger.log(`Successfully created ${results.length} menu items`);
    return results;
  }

  private resolveCategory(raw: string | null | undefined): MenuCourseCategory {
    if (raw && VALID_CATEGORIES.includes(raw as MenuCourseCategory)) {
      return raw as MenuCourseCategory;
    }
    return 'other';
  }
}

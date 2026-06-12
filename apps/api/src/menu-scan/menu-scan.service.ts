import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { ClaudeVisionService } from './claude-vision.service';
import { GeminiVisionService } from './gemini-vision.service';
import { MenuScanConfirmDto, SaveDraftDto } from './dto/menu-scan-confirm.dto';
import { MenuSyncDto } from './dto/menu-scan-sync.dto';
import { MenuScanExtractResponse, MenuScanDraft } from './dto/menu-scan-response.dto';

@Injectable()
export class MenuScanService {
  private readonly logger = new Logger(MenuScanService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly claudeVisionService: ClaudeVisionService,
    private readonly geminiVisionService: GeminiVisionService,
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

      // 4. Build the id'd column layout from each course's description, so dishes
      // have stable ids from the moment of scan (cols[col][row] of {id,text}).
      const enriched = courses.map((c: any) => ({
        ...c,
        cols: this.defaultColsFromDescription(c.description),
      }));

      // 5. Persist as relational rows immediately (rows are the source of truth).
      // Season/group inferred from the title; group falls back to the picked id.
      const season_name = this.inferSeasonName(menu_title);
      const group_name = this.inferGroupName(menu_title);
      let written: Awaited<ReturnType<typeof this.writeMenuRows>> | null = null;
      if (menuGroupId) {
        try {
          written = await this.writeMenuRows(organizationId, {
            menu_group_id: menuGroupId,
            group_name,
            season_name,
            menu_title,
            courses: enriched,
          });
        } catch (e: any) {
          this.logger.warn(`Row write on extract failed (will retry on sync): ${e.message}`);
        }
      }

      // 6. Keep provenance on the scan session (image + raw OCR + resolved group).
      if (scanSession) {
        await supabase
          .from('scan_sessions')
          .update({
            status: 'completed',
            raw_response,
            draft_courses: enriched, // provenance snapshot of the initial layout
            menu_title,
            menu_group_id: written?.group_id ?? menuGroupId ?? null,
          })
          .eq('id', scanSession.id);
      }

      return {
        courses: enriched,
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

  // ── Core: write a scanned menu into relational rows (the source of truth) ──
  //
  //   menu_title  → menu_groups.display_title
  //   season      → menu_groups.seasonal_menu_id (find/create by inferred name)
  //   group       → find/create by inferred name (else the given menu_group_id)
  //   each course → one `menus` row (name, reading, category, sort_order)
  //   each dish   → one `menu_dishes` row, keyed by STABLE client id
  //
  // Idempotent by diff: re-calling with the same menu updates in place. Courses
  // are matched by (group, category); dishes by their client id. A dish's
  // product_id is NEVER written here — it's owned by the link feature, so edits
  // to text/column/sort_order leave an existing allergen link intact.
  private async writeMenuRows(
    organizationId: string,
    input: {
      menu_group_id: string;
      group_name?: string | null;
      season_name?: string | null;
      seasonal_menu_id?: string | null;
      menu_title?: string | null;
      courses: {
        name: string;
        reading?: string | null;
        sort_order?: number;
        cols: { id: string; text: string }[][];
      }[];
    },
    // prune=false (default): NON-DESTRUCTIVE — only inserts/updates rows, never
    // deletes. This is what continuous autosync uses, so a background/stale/auth-
    // refresh sync can NEVER wipe a menu. Deletions require an explicit user action
    // (prune=true), so removing a dish/course is always intentional.
    prune = false,
  ) {
    const supabase = this.supabaseService.getClient();

    // Drop the special __kids meta entry (deferred — main course flow only).
    const courseList = (input.courses ?? []).filter(
      (c: any) => c && !c.__kids && c.name,
    );

    // Safety: an empty course list carries no information. Never let it delete an
    // existing menu's courses — that would silently wipe the whole menu. Bail out.
    if (courseList.length === 0) {
      this.logger.warn('writeMenuRows called with no courses — skipping (no-op) to avoid data loss');
      return { group_id: input.menu_group_id, season_id: input.seasonal_menu_id ?? null, courses: [] };
    }

    // 1. Resolve season (find/create by inferred name).
    let seasonId: string | null = input.seasonal_menu_id ?? null;
    if (!seasonId && input.season_name) {
      const name = input.season_name.trim();
      const { data: existing } = await supabase
        .from('seasonal_menus')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', name)
        .maybeSingle();
      if (existing) {
        seasonId = existing.id;
      } else {
        const { data: created, error } = await supabase
          .from('seasonal_menus')
          .insert({ organization_id: organizationId, name })
          .select('id')
          .single();
        if (error) this.logger.warn(`Could not auto-create season '${name}': ${error.message}`);
        else seasonId = created.id;
      }
    }

    // 2. Resolve group (find/create by inferred name, else the given id).
    let groupId: string = input.menu_group_id;
    if (input.group_name) {
      const name = input.group_name.trim();
      const { data: existing } = await supabase
        .from('menu_groups')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', name)
        .maybeSingle();
      if (existing) {
        groupId = existing.id;
      } else {
        const { data: created, error } = await supabase
          .from('menu_groups')
          .insert({ organization_id: organizationId, name, seasonal_menu_id: seasonId })
          .select('id')
          .single();
        if (error) this.logger.warn(`Could not auto-create group '${name}': ${error.message}`);
        else groupId = created.id;
      }
    }

    // 3. Title + season on the group.
    const groupUpdate: Record<string, any> = {};
    if (input.menu_title != null) groupUpdate.display_title = input.menu_title;
    if (seasonId !== null) groupUpdate.seasonal_menu_id = seasonId;
    if (Object.keys(groupUpdate).length > 0) {
      await supabase
        .from('menu_groups')
        .update(groupUpdate)
        .eq('id', groupId)
        .eq('organization_id', organizationId);
    }

    // 4. Category resolver (find/create real JP category rows).
    const { data: cats } = await supabase
      .from('categories')
      .select('value, name')
      .eq('organization_id', organizationId)
      .eq('type', 'menu');
    const catByName = new Map<string, string>((cats ?? []).map((c) => [c.name, c.value]));
    const resolveCategory = async (name: string): Promise<string> => {
      const existing = catByName.get(name);
      if (existing) return existing;
      const value = name.trim().toLowerCase().replace(/\s+/g, '-');
      const { error } = await supabase
        .from('categories')
        .insert({ organization_id: organizationId, type: 'menu', name: name.trim(), value });
      if (error && !error.message.includes('duplicate')) {
        this.logger.warn(`Could not auto-create course '${name}': ${error.message}`);
      }
      catByName.set(name, value);
      return value;
    };

    // 5. Existing course menus for this group (to diff against).
    const { data: existingMenus } = await supabase
      .from('menus')
      .select('id, category')
      .eq('organization_id', organizationId)
      .eq('menu_group_id', groupId);
    const menuByCategory = new Map<string, string>(
      (existingMenus ?? []).map((m) => [m.category as string, m.id as string]),
    );
    const keptCategories = new Set<string>();

    // ─── ANTI-WIPE FLOOR ───────────────────────────────────────────────────
    // Defense in depth against data loss: a NON-prune sync must never shrink an
    // existing course's dish count to a small fraction of what's stored. A stale
    // / half-loaded / racing payload that suddenly reports far fewer dishes is a
    // bug, not an intentional edit — reject the WHOLE sync and keep the data.
    // (Explicit removals come through prune=true, which bypasses this floor.)
    if (!prune && (existingMenus?.length ?? 0) > 0) {
      const existingIds = (existingMenus ?? []).map((m) => m.id);
      const { data: counts } = await supabase
        .from('menu_dishes')
        .select('menu_id')
        .in('menu_id', existingIds);
      const haveByMenu = new Map<string, number>();
      for (const r of counts ?? []) {
        haveByMenu.set(r.menu_id, (haveByMenu.get(r.menu_id) ?? 0) + 1);
      }
      const incomingByCategory = new Map<string, number>();
      for (const c of courseList) {
        const cat = catByName.get(c.name) ?? c.name;
        const n = (c.cols ?? []).reduce(
          (s, col) => s + (col ?? []).filter((d) => (d?.text ?? '').trim()).length,
          0,
        );
        incomingByCategory.set(cat, (incomingByCategory.get(cat) ?? 0) + n);
      }
      for (const m of existingMenus ?? []) {
        const have = haveByMenu.get(m.id) ?? 0;
        if (have < 3) continue; // tiny courses: nothing meaningful to protect
        const incoming = incomingByCategory.get(m.category as string) ?? 0;
        // Block if the payload would drop this course to <50% of stored dishes.
        // Treat as a no-op (NOT an error): a stale/racing sync shouldn't show the
        // chef an error, and the next good sync will persist real edits. Existing
        // data is left untouched.
        if (incoming < have * 0.5) {
          this.logger.warn(
            `ANTI-WIPE: skipping sync for group ${groupId} — course '${m.category}' ` +
              `would drop ${have}→${incoming} dishes (non-prune). Existing data preserved.`,
          );
          return { group_id: groupId, season_id: seasonId, courses: [], skipped: true };
        }
      }
    }

    const results: any[] = [];
    let sortOrder = 0;
    for (const course of courseList) {
      sortOrder += 1;
      const category = await resolveCategory(course.name);
      keptCategories.add(category);

      // Upsert the course menu row (match by group+category).
      const existingId = menuByCategory.get(category);
      const courseRow = {
        organization_id: organizationId,
        name: course.name,
        reading: course.reading ?? null,
        description: this.joinDescription(course.cols),
        category,
        sort_order: course.sort_order ?? sortOrder,
        menu_group_id: groupId,
        seasonal_menu_id: seasonId,
        is_available: true,
      };
      let menuId: string;
      if (existingId) {
        await supabase.from('menus').update(courseRow).eq('id', existingId);
        menuId = existingId;
      } else {
        const { data: created, error } = await supabase
          .from('menus')
          .insert(courseRow)
          .select('id')
          .single();
        if (error || !created) throw new Error(`Failed to upsert course: ${error?.message}`);
        menuId = created.id;
        menuByCategory.set(category, menuId);
      }

      const dishCount = await this.diffDishes(organizationId, menuId, course.cols, prune);
      results.push({ id: menuId, category, name: course.name, dish_count: dishCount });
    }

    // 6. Delete course menus no longer present — ONLY on an explicit prune. Autosync
    // never prunes, so a stale/partial sync can't remove a course (and its dishes).
    if (prune) {
      const toDelete = (existingMenus ?? [])
        .filter((m) => !keptCategories.has(m.category as string))
        .map((m) => m.id as string);
      if (toDelete.length > 0) {
        await supabase.from('menus').delete().in('id', toDelete);
      }
    }

    return { group_id: groupId, season_id: seasonId, courses: results };
  }

  // Flat ・-joined description from the cols layout (keeps print/PDF unaffected).
  private joinDescription(cols: { id: string; text: string }[][]): string | null {
    const texts = (cols ?? [])
      .flat()
      .map((d) => (d?.text ?? '').trim())
      .filter(Boolean);
    return texts.length ? texts.join('・') : null;
  }

  // Diff menu_dishes for one course against the cols layout, keyed by client id.
  // Inserts new ids, updates changed text/column/sort_order, deletes absent ids.
  // product_id is deliberately untouched so allergen links survive edits.
  private async diffDishes(
    organizationId: string,
    menuId: string,
    cols: { id: string; text: string }[][],
    prune = false,
  ): Promise<number> {
    const supabase = this.supabaseService.getClient();

    // Desired state from the layout.
    const desired = new Map<string, { text: string; column: number; sort_order: number }>();
    (cols ?? []).forEach((col, colIdx) => {
      (col ?? []).forEach((dish, rowIdx) => {
        const text = (dish?.text ?? '').trim();
        if (dish?.id && text) {
          desired.set(dish.id, { text, column: colIdx, sort_order: rowIdx });
        }
      });
    });

    // Current rows (to know which to delete).
    const { data: current } = await supabase
      .from('menu_dishes')
      .select('id')
      .eq('menu_id', menuId);

    // Upsert all desired rows by PK in ONE statement. This is idempotent and
    // race-safe: overlapping debounced syncs no longer collide on insert.
    // product_id is intentionally OMITTED from the payload, so:
    //   • on insert  → column default (NULL)
    //   • on conflict → existing product_id is preserved (not in the SET clause)
    // which keeps a dish's allergen link intact across edits.
    if (desired.size > 0) {
      const rows = [...desired.entries()].map(([id, want]) => ({
        id,
        menu_id: menuId,
        organization_id: organizationId,
        text: want.text,
        column: want.column,
        sort_order: want.sort_order,
      }));
      const { error } = await supabase
        .from('menu_dishes')
        .upsert(rows, { onConflict: 'id', defaultToNull: false });
      if (error) throw new Error(`Failed to upsert dishes: ${error.message}`);
    }

    // Delete rows no longer present — ONLY on an explicit prune AND when this
    // payload actually carries dishes. Autosync (prune=false) never deletes, so no
    // background/stale/auth-refresh sync can wipe a dish. Removing a dish is an
    // explicit user save (prune=true).
    if (prune && desired.size > 0) {
      const toDelete = (current ?? [])
        .filter((r) => !desired.has(r.id))
        .map((r) => r.id);
      if (toDelete.length) {
        await supabase.from('menu_dishes').delete().in('id', toDelete);
      }
    }

    return desired.size;
  }

  // Split an OCR description into id'd sub-columns (3 dishes per column —
  // matches the frontend's DEFAULT_PER_COL so scan and editor agree on layout).
  private defaultColsFromDescription(
    description: string | null | undefined,
  ): { id: string; text: string }[][] {
    const items = (description ?? '')
      .trim()
      .split(/[・、,，\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length === 0) return [[]];
    const PER_COL = 3;
    const cols: { id: string; text: string }[][] = [];
    for (let i = 0; i < items.length; i += PER_COL) {
      cols.push(items.slice(i, i + PER_COL).map((text) => ({ id: randomUUID(), text })));
    }
    return cols;
  }

  private inferSeasonName(title: string | null | undefined): string | null {
    const t = title ?? '';
    return ['春', '夏', '秋', '冬'].find((s) => t.includes(s)) ?? null;
  }

  private inferGroupName(title: string | null | undefined): string | null {
    const t = (title ?? '').replace(/[　\s]+/g, ' ').trim();
    const m = t.match(/献立\s*(.+)$/);
    return m ? m[1].replace(/[　\s]+/g, ' ').trim() : null;
  }

  // ── List saved scanned menus (grouped by menu group) ──────────────────────
  async getScannedMenus(organizationId: string) {
    const supabase = this.supabaseService.getClient();

    // Course menus that belong to a group, newest groups first.
    const { data: menus, error } = await supabase
      .from('menus')
      .select('id, name, category, sort_order, menu_group_id, reading')
      .eq('organization_id', organizationId)
      .not('menu_group_id', 'is', null)
      .order('sort_order', { ascending: true });
    if (error) throw new Error(`Failed to fetch scanned menus: ${error.message}`);

    const groupIds = [...new Set((menus ?? []).map((m) => m.menu_group_id))];
    if (groupIds.length === 0) return [];

    const [{ data: groups }, { data: dishes }, { data: sessions }] = await Promise.all([
      supabase
        .from('menu_groups')
        .select('id, name, display_title, seasonal_menu_id')
        .in('id', groupIds),
      supabase
        .from('menu_dishes')
        .select('id, menu_id')
        .in('menu_id', (menus ?? []).map((m) => m.id)),
      supabase
        .from('scan_sessions')
        .select('menu_group_id, image_url, updated_at')
        .eq('organization_id', organizationId)
        .eq('scan_type', 'menu')
        .order('updated_at', { ascending: false }),
    ]);

    const groupById = new Map((groups ?? []).map((g) => [g.id, g]));
    const dishCountByMenu = new Map<string, number>();
    for (const d of dishes ?? []) {
      dishCountByMenu.set(d.menu_id, (dishCountByMenu.get(d.menu_id) ?? 0) + 1);
    }
    // Newest image per group (sessions already sorted newest-first).
    const imageByGroup = new Map<string, string>();
    for (const s of sessions ?? []) {
      if (s.menu_group_id && !imageByGroup.has(s.menu_group_id) && s.image_url) {
        imageByGroup.set(s.menu_group_id, s.image_url);
      }
    }

    // One entry per group.
    const byGroup = new Map<string, any>();
    for (const m of menus ?? []) {
      const g = groupById.get(m.menu_group_id);
      if (!byGroup.has(m.menu_group_id)) {
        byGroup.set(m.menu_group_id, {
          menu_group_id: m.menu_group_id,
          group_name: g?.name ?? '',
          menu_title: g?.display_title ?? g?.name ?? '',
          seasonal_menu_id: g?.seasonal_menu_id ?? null,
          image_url: imageByGroup.get(m.menu_group_id) ?? null,
          course_count: 0,
          dish_count: 0,
        });
      }
      const entry = byGroup.get(m.menu_group_id);
      entry.course_count += 1;
      entry.dish_count += dishCountByMenu.get(m.id) ?? 0;
    }
    return [...byGroup.values()];
  }

  // ── Load one saved menu (full courses + dishes) for re-opening in editor ──
  async getScannedMenu(organizationId: string, groupId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: group } = await supabase
      .from('menu_groups')
      .select('id, name, display_title, seasonal_menu_id')
      .eq('id', groupId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    const { data: menus } = await supabase
      .from('menus')
      .select('id, name, reading, category, sort_order')
      .eq('organization_id', organizationId)
      .eq('menu_group_id', groupId)
      .order('sort_order', { ascending: true });

    const menuIds = (menus ?? []).map((m) => m.id);
    const { data: dishes } = menuIds.length
      ? await supabase
          .from('menu_dishes')
          .select('id, menu_id, text, column, sort_order, product_id')
          .in('menu_id', menuIds)
          .order('column', { ascending: true })
          .order('sort_order', { ascending: true })
      : { data: [] as any[] };

    const dishesByMenu = new Map<string, any[]>();
    for (const d of dishes ?? []) {
      const arr = dishesByMenu.get(d.menu_id) ?? [];
      arr.push(d);
      dishesByMenu.set(d.menu_id, arr);
    }

    const courses = (menus ?? []).map((m) => {
      // Rebuild cols[col][row] from the flat dish rows.
      const ds = dishesByMenu.get(m.id) ?? [];
      const maxCol = ds.reduce((n, d) => Math.max(n, d.column), -1);
      const cols: { id: string; text: string; product_id: string | null }[][] = [];
      for (let i = 0; i <= maxCol; i++) cols.push([]);
      for (const d of ds) {
        (cols[d.column] ??= []).push({ id: d.id, text: d.text, product_id: d.product_id });
      }
      return {
        id: m.id,
        name: m.name,
        reading: m.reading,
        category: m.category,
        sort_order: m.sort_order,
        cols: cols.length ? cols : [[]],
      };
    });

    return {
      menu_group_id: groupId,
      group_name: group?.name ?? '',
      menu_title: group?.display_title ?? group?.name ?? '',
      seasonal_menu_id: group?.seasonal_menu_id ?? null,
      courses,
    };
  }

  // ── Link a dish to a product (sets menu_dishes.product_id) ────────────────
  // The dish's allergens are then derived from the linked product. Pass
  // product_id=null to unlink. Returns the dish + its derived allergens.
  async setDishProduct(
    organizationId: string,
    dishId: string,
    productId: string | null,
  ) {
    const supabase = this.supabaseService.getClient();

    // Validate the product belongs to this org (when linking).
    if (productId) {
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (!product) {
        throw new Error('Product not found in this organization');
      }
    }

    const { data: dish, error } = await supabase
      .from('menu_dishes')
      .update({ product_id: productId, updated_at: new Date().toISOString() })
      .eq('id', dishId)
      .eq('organization_id', organizationId)
      .select('id, text, product_id')
      .maybeSingle();
    if (error) throw new Error(`Failed to link dish: ${error.message}`);
    if (!dish) throw new Error('Dish not found');

    // Derive allergens from the linked product.
    let allergens: { id: string; name: string }[] = [];
    if (productId) {
      const { data: pa } = await supabase
        .from('product_allergens')
        .select('allergen:allergens(id, name)')
        .eq('product_id', productId);
      allergens = (pa ?? [])
        .map((r: any) => r.allergen)
        .filter(Boolean);
    }

    return { ...dish, allergens };
  }

  // ── Sync: continuous save of the editing menu into rows ───────────────────
  async syncMenu(organizationId: string, dto: MenuSyncDto) {
    const result = await this.writeMenuRows(
      organizationId,
      {
        menu_group_id: dto.menu_group_id,
        group_name: dto.group_name ?? null,
        season_name: dto.season_name ?? null,
        menu_title: dto.menu_title ?? null,
        courses: dto.courses,
      },
      dto.prune === true, // autosync sends false/omitted → never deletes
    );

    // Keep the scan session pointed at the resolved group (provenance/image).
    if (dto.session_id) {
      const supabase = this.supabaseService.getClient();
      await supabase
        .from('scan_sessions')
        .update({
          status: 'completed',
          menu_group_id: result.group_id,
          menu_title: dto.menu_title ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dto.session_id)
        .eq('organization_id', organizationId);
    }
    return result;
  }

  // ── Confirm (legacy alias) — kept so in-flight clients don't break ────────
  async confirmAndCreate(organizationId: string, dto: MenuScanConfirmDto) {
    // Legacy thin payload: source the rich cols from the draft if present.
    let courses: any[] = [];
    if (dto.draft_session_id) {
      const supabase = this.supabaseService.getClient();
      const { data: session } = await supabase
        .from('scan_sessions')
        .select('draft_courses')
        .eq('id', dto.draft_session_id)
        .eq('organization_id', organizationId)
        .maybeSingle();
      courses = (session?.draft_courses ?? []).filter((c: any) => c && !c.__kids && c.name);
    }
    // Coerce legacy draft cols (string[][]) into the {id,text}[][] shape.
    const coerced = courses.map((c: any) => ({
      name: c.name,
      reading: c.reading ?? null,
      sort_order: c.sort_order,
      cols: Array.isArray(c.cols)
        ? c.cols.map((col: string[]) =>
            (col ?? []).map((text: string) => ({ id: randomUUID(), text })),
          )
        : [],
    }));
    const result = await this.writeMenuRows(organizationId, {
      menu_group_id: dto.menu_group_id,
      group_name: dto.group_name ?? null,
      season_name: dto.season_name ?? null,
      seasonal_menu_id: dto.seasonal_menu_id ?? null,
      menu_title: dto.menu_title ?? null,
      courses: coerced,
    });
    if (dto.draft_session_id) {
      const supabase = this.supabaseService.getClient();
      await supabase
        .from('scan_sessions')
        .update({ status: 'completed' })
        .eq('id', dto.draft_session_id)
        .eq('organization_id', organizationId);
    }
    return result;
  }
}

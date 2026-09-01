import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { SupabaseService } from '../supabase/supabase.service';

// One course as loaded for export: the menus row plus its dishes arranged back
// into the chef's visual cols[col][row] layout.
interface ExportCourse {
  id: string;
  name: string;
  reading: string | null;
  category: string | null;
  sort_order: number;
  cols: { id: string; text: string; product_id: string | null }[][];
}

interface ExportMenu {
  group_id: string;
  group_name: string;
  menu_title: string;
  season_name: string | null;
  courses: ExportCourse[];
  kids: { group_id: string; name: string; items: { id: string; text: string }[] }[];
}

/**
 * Menu → Excel archive.
 *
 * PURPOSE: succession / portability. The app is the editor, but the menus must
 * outlive the app — anyone with Excel (or Sheets, or LibreOffice) should be able
 * to read, print, and rebuild a menu with no database and no developer.
 *
 * Each workbook carries two views of the same menu:
 *   • 献立 (layout)  — the visual お品書き: courses as right-to-left columns with
 *                      vertical Japanese text, mirroring the landscape editor.
 *   • data           — flat rows with stable ids + column/sort_order, so the
 *                      exact layout is recoverable programmatically.
 *
 * READ-ONLY: this module never writes to the database.
 */
@Injectable()
export class MenuExportService {
  private readonly logger = new Logger(MenuExportService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ── Loading ───────────────────────────────────────────────────────────────

  /** Load one menu group (courses + dishes + linked kids menus) for export. */
  private async loadMenu(organizationId: string, groupId: string): Promise<ExportMenu> {
    const supabase = this.supabaseService.getClient();

    const { data: group } = await supabase
      .from('menu_groups')
      .select('id, name, display_title, seasonal_menu_id, kids_group_ids')
      .eq('id', groupId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (!group) throw new NotFoundException('Menu group not found');

    let seasonName: string | null = null;
    if (group.seasonal_menu_id) {
      const { data: season } = await supabase
        .from('seasonal_menus')
        .select('name')
        .eq('id', group.seasonal_menu_id)
        .maybeSingle();
      seasonName = season?.name ?? null;
    }

    const courses = await this.loadCourses(organizationId, groupId);

    // Linked kids menus (each its own group; one flat item list).
    const kids: ExportMenu['kids'] = [];
    for (const kidsId of (group.kids_group_ids ?? []) as string[]) {
      const { data: kidsGroup } = await supabase
        .from('menu_groups')
        .select('id, name')
        .eq('id', kidsId)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (!kidsGroup) continue;
      const kidsCourses = await this.loadCourses(organizationId, kidsId);
      const items = kidsCourses.flatMap((c) =>
        c.cols.flat().map((d) => ({ id: d.id, text: d.text })),
      );
      kids.push({ group_id: kidsGroup.id, name: kidsGroup.name, items });
    }

    return {
      group_id: group.id,
      group_name: group.name ?? '',
      menu_title: group.display_title ?? group.name ?? '',
      season_name: seasonName,
      courses,
      kids,
    };
  }

  /** Courses of a group, with dishes rebuilt into cols[col][row]. */
  private async loadCourses(
    organizationId: string,
    groupId: string,
  ): Promise<ExportCourse[]> {
    const supabase = this.supabaseService.getClient();

    const { data: menus, error: menusError } = await supabase
      .from('menus')
      .select('id, name, reading, category, sort_order')
      .eq('organization_id', organizationId)
      .eq('menu_group_id', groupId)
      .order('sort_order', { ascending: true });
    if (menusError) {
      throw new InternalServerErrorException(
        `Failed to load courses for group ${groupId}: ${menusError.message}`,
      );
    }

    const menuIds = (menus ?? []).map((m) => m.id);
    if (menuIds.length === 0) return [];

    const { data: dishes, error: dishesError } = await supabase
      .from('menu_dishes')
      .select('id, menu_id, text, column, sort_order, product_id')
      .in('menu_id', menuIds)
      .order('column', { ascending: true })
      .order('sort_order', { ascending: true });
    if (dishesError) {
      throw new InternalServerErrorException(
        `Failed to load dishes for group ${groupId}: ${dishesError.message}`,
      );
    }

    const byMenu = new Map<string, any[]>();
    for (const d of dishes ?? []) {
      const arr = byMenu.get(d.menu_id) ?? [];
      arr.push(d);
      byMenu.set(d.menu_id, arr);
    }

    return (menus ?? []).map((m) => {
      const ds = byMenu.get(m.id) ?? [];
      const maxCol = ds.reduce((n, d) => Math.max(n, d.column ?? 0), -1);
      const cols: ExportCourse['cols'] = [];
      for (let i = 0; i <= maxCol; i++) cols.push([]);
      for (const d of ds) {
        (cols[d.column ?? 0] ??= []).push({
          id: d.id,
          text: d.text,
          product_id: d.product_id ?? null,
        });
      }
      return {
        id: m.id,
        name: m.name,
        reading: m.reading ?? null,
        category: m.category ?? null,
        sort_order: m.sort_order ?? 0,
        cols: cols.length ? cols : [[]],
      };
    });
  }

  /** Allergen names per dish, derived through the dish's linked product. */
  private async loadAllergensByDish(
    productIds: string[],
  ): Promise<Map<string, string[]>> {
    const byProduct = new Map<string, string[]>();
    if (productIds.length === 0) return byProduct;
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('product_allergens')
      .select('product_id, allergen:allergens(name)')
      .in('product_id', productIds);
    for (const row of (data ?? []) as any[]) {
      const name = row.allergen?.name;
      if (!name) continue;
      const arr = byProduct.get(row.product_id) ?? [];
      arr.push(name);
      byProduct.set(row.product_id, arr);
    }
    return byProduct;
  }

  // ── Workbook building ─────────────────────────────────────────────────────

  /** Build an .xlsx buffer for one menu group. */
  async exportMenu(organizationId: string, groupId: string): Promise<{ buffer: Buffer; filename: string }> {
    const menu = await this.loadMenu(organizationId, groupId);
    const workbook = this.newWorkbook();
    await this.addMenuSheets(workbook, menu);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return { buffer, filename: this.safeFilename(menu.menu_title || menu.group_name) };
  }

  /** Build one .xlsx containing every menu in the organization. */
  async exportAll(organizationId: string): Promise<{ buffer: Buffer; filename: string }> {
    const supabase = this.supabaseService.getClient();

    // Only groups that actually hold courses — skip empty shells, and skip groups
    // that are linked as someone's kids menu (they're rendered with their parent).
    const { data: groups, error } = await supabase
      .from('menu_groups')
      .select('id, name, kids_group_ids')
      .eq('organization_id', organizationId);

    // Fail LOUDLY. This is a backup/archive feature: silently returning an empty
    // workbook on a query error would hand someone a file they believe is a
    // backup but which contains nothing.
    if (error) {
      throw new InternalServerErrorException(
        `Failed to load menu groups for export: ${error.message}`,
      );
    }

    const kidsIds = new Set<string>();
    for (const g of groups ?? []) {
      for (const k of (g.kids_group_ids ?? []) as string[]) kidsIds.add(k);
    }

    const workbook = this.newWorkbook();
    let exported = 0;
    for (const g of groups ?? []) {
      if (kidsIds.has(g.id)) continue;
      const menu = await this.loadMenu(organizationId, g.id);
      if (menu.courses.length === 0) continue;
      await this.addMenuSheets(workbook, menu);
      exported += 1;
    }

    if (exported === 0) {
      // Never hand back a workbook that LOOKS like a backup but holds nothing.
      // A caller asking for "all menus" and receiving an empty file would believe
      // the archive succeeded, so make the emptiness explicit and unmissable.
      const sheet = workbook.addWorksheet('EMPTY - NO MENUS FOUND');
      sheet.getColumn(1).width = 80;
      sheet.getCell('A1').value =
        'WARNING: no menus with courses were found for this organization.';
      sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFB91C1C' } };
      sheet.getCell('A2').value =
        'This file is NOT a usable backup. Check that menus exist before relying on it.';
      sheet.getCell('A3').value = `Organization: ${organizationId}`;
      sheet.getCell('A4').value = `Generated: ${new Date().toISOString()}`;
      this.logger.warn(`Export produced NO menus for org ${organizationId}`);
    }

    this.logger.log(`Exported ${exported} menu(s) for org ${organizationId}`);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return { buffer, filename: 'all-menus' };
  }

  private newWorkbook(): ExcelJS.Workbook {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Hotel Front Agent';
    wb.created = new Date();
    return wb;
  }

  /** Add both the visual layout sheet and the data sheet for one menu. */
  private async addMenuSheets(workbook: ExcelJS.Workbook, menu: ExportMenu) {
    const base = this.sheetName(menu.group_name || menu.menu_title || 'menu');
    this.addLayoutSheet(workbook, menu, this.uniqueSheetName(workbook, base));
    await this.addDataSheet(workbook, menu, this.uniqueSheetName(workbook, `${base} data`));
  }

  /**
   * The visual sheet: a landscape お品書き.
   *
   * Mirrors the editor: each course occupies a block of Excel columns (one per
   * sub-column of dishes) and courses run RIGHT TO LEFT, which is achieved with
   * the sheet's native right-to-left view rather than by reversing the data —
   * so the underlying cells stay in natural order.
   *
   * Japanese text uses textRotation 'vertical' (Excel's stacked-text mode, which
   * keeps kanji upright) rather than a 90° rotation (which lays them on their
   * side). Note: vertical text renders best in Excel; Google Sheets and
   * LibreOffice may fall back to horizontal. The data sheet is the reliable
   * machine-readable copy.
   */
  private addLayoutSheet(workbook: ExcelJS.Workbook, menu: ExportMenu, name: string) {
    const sheet = workbook.addWorksheet(name, {
      views: [{ rightToLeft: true, showGridLines: false }],
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
      },
    });

    const vertical: Partial<ExcelJS.Alignment> = {
      textRotation: 'vertical',
      horizontal: 'center',
      vertical: 'top',
      wrapText: false,
    };

    // Row 1: the menu title, spanning the sheet.
    const totalCols = Math.max(
      1,
      menu.courses.reduce((n, c) => n + Math.max(1, c.cols.length), 0),
    );
    sheet.mergeCells(1, 1, 1, totalCols);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = menu.menu_title;
    titleCell.font = { name: 'Yu Mincho', size: 20, bold: false };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 42;

    // Row 2: course names. Row 3+: dishes stacked downward.
    let col = 1;
    let maxDishRows = 0;
    for (const course of menu.courses) {
      const span = Math.max(1, course.cols.length);

      // Course name across its sub-columns.
      if (span > 1) sheet.mergeCells(2, col, 2, col + span - 1);
      const nameCell = sheet.getCell(2, col);
      nameCell.value = course.name;
      nameCell.font = { name: 'Yu Mincho', size: 14, bold: true };
      nameCell.alignment = vertical;
      nameCell.border = { bottom: { style: 'thin', color: { argb: 'FFD6D3D1' } } };

      // Dishes: one Excel column per sub-column, preserving the chef's grouping.
      course.cols.forEach((sub, subIdx) => {
        sub.forEach((dish, rowIdx) => {
          const cell = sheet.getCell(3 + rowIdx, col + subIdx);
          cell.value = dish.text;
          cell.font = { name: 'Yu Mincho', size: 11 };
          cell.alignment = vertical;
        });
        maxDishRows = Math.max(maxDishRows, sub.length);
      });

      for (let i = 0; i < span; i++) sheet.getColumn(col + i).width = 4.5;
      col += span;
    }

    sheet.getRow(2).height = 90;
    for (let r = 3; r < 3 + maxDishRows; r++) sheet.getRow(r).height = 110;

    // Kids menus as a labelled block beneath the courses.
    let row = 3 + maxDishRows + 1;
    for (const kids of menu.kids) {
      if (kids.items.length === 0) continue;
      const label = sheet.getCell(row, 1);
      label.value = `【${kids.name}】`;
      label.font = { name: 'Yu Mincho', size: 11, bold: true };
      const textCell = sheet.getCell(row, 2);
      textCell.value = kids.items.map((i) => i.text).join('・');
      textCell.font = { name: 'Yu Mincho', size: 11 };
      sheet.getRow(row).height = 20;
      row += 1;
    }
  }

  /**
   * The data sheet: flat, machine-readable rows.
   *
   * This is the durable half of the archive — stable ids plus column/sort_order
   * mean the exact visual layout can be rebuilt from these rows alone, with no
   * dependence on how Excel chose to render the layout sheet.
   */
  private async addDataSheet(workbook: ExcelJS.Workbook, menu: ExportMenu, name: string) {
    const sheet = workbook.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = [
      { header: 'menu_title', key: 'menu_title', width: 28 },
      { header: 'group_name', key: 'group_name', width: 14 },
      { header: 'season', key: 'season', width: 8 },
      { header: 'course_sort', key: 'course_sort', width: 11 },
      { header: 'course_name', key: 'course_name', width: 16 },
      { header: 'course_reading', key: 'course_reading', width: 16 },
      { header: 'column', key: 'column', width: 8 },
      { header: 'sort_order', key: 'sort_order', width: 10 },
      { header: 'dish_text', key: 'dish_text', width: 30 },
      { header: 'allergens', key: 'allergens', width: 24 },
      { header: 'dish_id', key: 'dish_id', width: 38 },
      { header: 'course_id', key: 'course_id', width: 38 },
      { header: 'product_id', key: 'product_id', width: 38 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle' };

    // Resolve allergens for every linked dish in one pass.
    const productIds = [
      ...new Set(
        menu.courses
          .flatMap((c) => c.cols.flat())
          .map((d) => d.product_id)
          .filter((id): id is string => !!id),
      ),
    ];
    const allergensByProduct = await this.loadAllergensByDish(productIds);

    for (const course of menu.courses) {
      course.cols.forEach((sub, colIdx) => {
        sub.forEach((dish, rowIdx) => {
          sheet.addRow({
            menu_title: menu.menu_title,
            group_name: menu.group_name,
            season: menu.season_name ?? '',
            course_sort: course.sort_order,
            course_name: course.name,
            course_reading: course.reading ?? '',
            column: colIdx,
            sort_order: rowIdx,
            dish_text: dish.text,
            allergens: dish.product_id
              ? (allergensByProduct.get(dish.product_id) ?? []).join('、')
              : '',
            dish_id: dish.id,
            course_id: course.id,
            product_id: dish.product_id ?? '',
          });
        });
      });
    }

    // Kids menus share the sheet, tagged by their group name as the course.
    for (const kids of menu.kids) {
      kids.items.forEach((item, idx) => {
        sheet.addRow({
          menu_title: menu.menu_title,
          group_name: `${menu.group_name} / ${kids.name}`,
          season: menu.season_name ?? '',
          course_sort: '',
          course_name: kids.name,
          course_reading: '',
          column: 0,
          sort_order: idx,
          dish_text: item.text,
          allergens: '',
          dish_id: item.id,
          course_id: '',
          product_id: '',
        });
      });
    }
  }

  // ── Naming helpers ────────────────────────────────────────────────────────

  /** Excel forbids : \ / ? * [ ] in sheet names and caps them at 31 chars. */
  private sheetName(raw: string): string {
    const cleaned = (raw || 'menu').replace(/[:\\\/\?\*\[\]]/g, ' ').trim();
    return cleaned.slice(0, 26) || 'menu';
  }

  /** Sheet names must be unique within a workbook. */
  private uniqueSheetName(workbook: ExcelJS.Workbook, base: string): string {
    let candidate = base.slice(0, 31);
    let n = 2;
    while (workbook.worksheets.some((w) => w.name === candidate)) {
      const suffix = ` ${n}`;
      candidate = base.slice(0, 31 - suffix.length) + suffix;
      n += 1;
    }
    return candidate;
  }

  /** Filename component: keep it filesystem- and header-safe. */
  private safeFilename(raw: string): string {
    return (raw || 'menu').replace(/[^\p{L}\p{N}\-_ ]/gu, '').trim().slice(0, 60) || 'menu';
  }
}

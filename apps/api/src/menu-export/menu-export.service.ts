import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { SupabaseService } from '../supabase/supabase.service';
import { MenuDocxService, DocxMenu } from './menu-docx.service';

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

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly menuDocxService: MenuDocxService,
  ) {}

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
        .eq('organization_id', organizationId)
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

  /**
   * Build a .docx for one menu group — the editable presentation copy.
   * Word supports real vertical Japanese, so this reproduces the お品書き far
   * more closely than a spreadsheet can while remaining editable by staff.
   */
  async exportMenuDocx(
    organizationId: string,
    groupId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const menu = await this.loadMenu(organizationId, groupId);
    const buffer = await this.menuDocxService.build({
      menu_title: menu.menu_title,
      courses: menu.courses.map((c) => ({
        name: c.name,
        cols: c.cols.map((sub) => sub.map((d) => ({ text: d.text }))),
      })),
      kids: menu.kids.map((k) => ({
        name: k.name,
        items: k.items.map((i) => ({ text: i.text })),
      })),
    });
    return { buffer, filename: this.safeFilename(menu.menu_title || menu.group_name) };
  }

  /**
   * Build ONE .docx containing every menu in the organization, one per page.
   *
   * Mirrors exportAll()'s selection rules: groups with no courses are skipped,
   * and groups linked as someone's kids menu are skipped because they are
   * rendered inside their parent's page rather than as a menu of their own.
   */
  async exportAllDocx(
    organizationId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const supabase = this.supabaseService.getClient();

    const { data: groups, error } = await supabase
      .from('menu_groups')
      .select('id, name, kids_group_ids')
      .eq('organization_id', organizationId);

    // Fail LOUDLY, as exportAll does: quietly handing back a one-page document
    // when the query failed would look like a successful export of one menu.
    if (error) {
      throw new InternalServerErrorException(
        `Failed to load menu groups for export: ${error.message}`,
      );
    }

    const kidsIds = new Set<string>();
    for (const g of groups ?? []) {
      for (const k of (g.kids_group_ids ?? []) as string[]) kidsIds.add(k);
    }

    // Explicit running order for the printed set. Without this the pages come
    // out in whatever order Postgres returns the rows — in practice creation
    // date, which put 滞在 first purely because it was made four months before
    // 一般. Anything not named here keeps its natural order behind the ones
    // that are, so a new menu simply appears at the end rather than silently
    // jumping to the front.
    const MENU_ORDER = ['一般', '滞在'];
    const rank = (name: string) => {
      const i = MENU_ORDER.indexOf((name ?? '').trim());
      return i === -1 ? MENU_ORDER.length : i;
    };
    const ordered = [...(groups ?? [])].sort((a, b) => rank(a.name) - rank(b.name));

    const menus: DocxMenu[] = [];
    for (const g of ordered) {
      if (kidsIds.has(g.id)) continue;
      const menu = await this.loadMenu(organizationId, g.id);
      if (menu.courses.length === 0) continue;
      menus.push({
        menu_title: menu.menu_title,
        courses: menu.courses.map((c) => ({
          name: c.name,
          cols: c.cols.map((sub) => sub.map((d) => ({ text: d.text }))),
        })),
        kids: menu.kids.map((k) => ({
          name: k.name,
          items: k.items.map((i) => ({ text: i.text })),
        })),
      });
    }

    if (menus.length === 0) {
      throw new NotFoundException(
        'No menus with courses were found for this organization.',
      );
    }

    const buffer = await this.menuDocxService.buildMany(menus);
    return { buffer, filename: this.safeFilename('menus') };
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
   * The visual sheet: a landscape お品書き mirroring the editor.
   *
   * Structure, matching the on-screen preview exactly:
   *   • ONE Excel column per sub-column of dishes; courses run RIGHT TO LEFT via
   *     the sheet's native RTL view. Because RTL flips every column, the
   *     sub-columns within a course are emitted reversed so they flip back into
   *     the chef's reading order.
   *   • the course name, the 一 mark and the dishes live in the SAME cell as one
   *     vertical string ("食前酒　一　白桃霙酒"), so the text starts at the top of
   *     the column and flows down — exactly as on screen. Splitting them across
   *     separate rows (an earlier attempt) detached the names from their dishes
   *     and pushed everything down the page.
   *   • a left border on each course's outermost column draws the vertical rule
   *     the editor shows between courses.
   *
   * One row holds everything, its height derived from the longest column's
   * character count: vertical text clips rather than wraps, so the estimate
   * deliberately over-allocates.
   *
   * Japanese uses textRotation 'vertical' (Excel's stacked mode, which keeps
   * kanji upright) rather than a 90° rotation that lays them on their side.
   * Vertical text renders best in Excel; other suites may fall back to
   * horizontal, which is why the data sheet is the reliable machine copy.
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
        margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.3, footer: 0.3 },
      },
    });

    const vertical: Partial<ExcelJS.Alignment> = {
      textRotation: 'vertical',
      horizontal: 'center',
      vertical: 'top',
      wrapText: false,
    };

    const BODY_ROW = 2;      // everything below the title lives on this row
    const PT_PER_CHAR = 13.2;

    // Column 1 is the title (rightmost under RTL), then the courses.
    let col = 2;
    let maxChars = 0;
    const courseStarts: number[] = [];

    for (const course of menu.courses) {
      const subs = course.cols.filter((s) => s.some((d) => (d.text ?? '').trim()));
      const groups = subs.length > 0 ? subs : [[]];
      // Reversed so the RTL view flips them back into reading order.
      const ordered = [...groups].reverse();
      const firstCol = col;

      ordered.forEach((sub, idx) => {
        const dishes = sub.map((d) => (d.text ?? '').trim()).filter(Boolean);
        // The course's FIRST sub-column (last written, rightmost on screen)
        // carries the name and the 一 mark above its dishes.
        const isLead = idx === ordered.length - 1;
        const text = isLead
          ? [course.name, '一', ...dishes].join('　')
          : dishes.join('　');

        const cell = sheet.getCell(BODY_ROW, col);
        cell.value = text;
        cell.font = { name: 'Yu Mincho', size: 12 };
        cell.alignment = vertical;
        maxChars = Math.max(maxChars, text.length);

        sheet.getColumn(col).width = 4.2;
        col += 1;
      });

      courseStarts.push(firstCol);
    }

    const lastCol = col - 1;

    // Title in column 1 — rightmost on screen, as in the editor.
    const titleCell = sheet.getCell(BODY_ROW, 1);
    titleCell.value = menu.menu_title;
    titleCell.font = { name: 'Yu Mincho', size: 18 };
    titleCell.alignment = { ...vertical, vertical: 'top' };
    sheet.getColumn(1).width = 6.5;
    maxChars = Math.max(maxChars, menu.menu_title.length + 4);

    // Vertical rules between courses: a left border on each course's outermost
    // (lowest-numbered) column, which RTL renders on the course's left edge.
    for (const start of courseStarts) {
      const cell = sheet.getCell(BODY_ROW, start);
      cell.border = { left: { style: 'hair', color: { argb: 'FFD6D3D1' } } };
    }

    sheet.getRow(BODY_ROW).height = Math.max(300, maxChars * PT_PER_CHAR + 30);

    // Kids menus: a dashed callout under the opening courses (bottom-right on
    // screen), echoing the box the editor overlays on the paper.
    let row = BODY_ROW + 2;
    for (const kids of menu.kids) {
      const items = kids.items.map((i) => (i.text ?? '').trim()).filter(Boolean);
      if (items.length === 0) continue;

      const boxEnd = Math.min(lastCol, 5);
      const border: Partial<ExcelJS.Borders> = {
        top: { style: 'dashed', color: { argb: 'FF78716C' } },
        bottom: { style: 'dashed', color: { argb: 'FF78716C' } },
        left: { style: 'dashed', color: { argb: 'FF78716C' } },
        right: { style: 'dashed', color: { argb: 'FF78716C' } },
      };

      sheet.mergeCells(row, 1, row, boxEnd);
      const head = sheet.getCell(row, 1);
      head.value = kids.name;
      head.font = { name: 'Yu Mincho', size: 12, bold: true };
      head.alignment = { horizontal: 'center', vertical: 'middle' };
      for (let c = 1; c <= boxEnd; c++) sheet.getCell(row, c).border = border;
      sheet.getRow(row).height = 24;

      sheet.mergeCells(row + 1, 1, row + 1, boxEnd);
      const body = sheet.getCell(row + 1, 1);
      body.value = items.map((t) => `・${t}`).join('　');
      body.font = { name: 'Yu Mincho', size: 11 };
      body.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      for (let c = 1; c <= boxEnd; c++) sheet.getCell(row + 1, c).border = border;
      sheet.getRow(row + 1).height = 28;

      row += 3;
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
      { header: 'menu_group_id', key: 'menu_group_id', width: 38 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle' };

    // EDITABLE columns are the plain-text ones; the id columns are machine keys.
    // Sheet protection is advisory (Excel lets anyone unprotect it) but it stops
    // the common accident: dragging a fill handle across dish_id and silently
    // rewriting the keys that import matches on.
    const idCols = ['K', 'L', 'M', 'N']; // dish_id, course_id, product_id, menu_group_id
    for (const c of idCols) {
      sheet.getColumn(c).font = { color: { argb: 'FF9CA3AF' }, size: 9 };
    }

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
            menu_group_id: menu.group_id,
          });
        });
      });
    }

    // Kids menus share the sheet, tagged by their group name as the course and
    // carrying their OWN group id so import routes them to the right group.
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
          menu_group_id: kids.group_id,
        });
      });
    }

    await this.applyEditingAids(sheet, menu);
  }

  /**
   * Guided-editing aids for the data sheet — the safe half of "make it editable
   * in Excel". Deliberately NO macros: validation, protection and conditional
   * formatting are plain spreadsheet features, so they survive in Excel, Google
   * Sheets and LibreOffice, and leave the file a normal .xlsx that no security
   * policy blocks. (A macro-driven form would be the opposite: Windows-mostly,
   * frequently quarantined, and harder to hand on than the app it replaces.)
   */
  private async applyEditingAids(sheet: ExcelJS.Worksheet, menu: ExportMenu) {
    const lastRow = sheet.rowCount;
    if (lastRow < 2) return;

    // Course dropdown, drawn from the courses actually present in THIS menu, so
    // the list stays short and correct rather than offering every category the
    // OCR has ever invented.
    const courseNames = [
      ...new Set([
        ...menu.courses.map((c) => c.name).filter(Boolean),
        ...menu.kids.map((k) => k.name).filter(Boolean),
      ]),
    ];
    // Excel caps an inline list at 255 characters; fall back to no dropdown
    // rather than writing a formula Excel will reject as corrupt.
    const inlineList = `"${courseNames.join(',')}"`;
    // A comma splits a list item and a quote ends the formula string, so either
    // in a course name would also make Excel reject the file.
    const courseListFits =
      courseNames.length > 0 &&
      inlineList.length <= 255 &&
      !courseNames.some((n) => /[",]/.test(n));

    for (let r = 2; r <= lastRow; r++) {
      if (courseListFits) {
        sheet.getCell(`E${r}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [inlineList],
          showErrorMessage: true,
          errorTitle: 'コース名',
          error: 'このメニューに存在するコース名を選んでください。',
        };
      }
      // column / sort_order must stay non-negative integers: they ARE the layout.
      for (const col of ['G', 'H']) {
        sheet.getCell(`${col}${r}`).dataValidation = {
          type: 'whole',
          operator: 'greaterThanOrEqual',
          formulae: [0],
          allowBlank: false,
          showErrorMessage: true,
          errorTitle: '数値',
          error: '0以上の整数を入力してください。',
        };
      }
    }

    // Flag rows whose dish_text is blank — import ignores them, and a chef
    // clearing a cell to "delete" a dish is the likeliest mistake.
    sheet.addConditionalFormatting({
      ref: `I2:I${lastRow}`,
      rules: [
        {
          type: 'expression',
          priority: 1,
          formulae: [`TRIM(I2)=""`],
          style: {
            fill: {
              type: 'pattern',
              pattern: 'solid',
              bgColor: { argb: 'FFFEE2E2' },
            },
          },
        } as any,
      ],
    });

    // Lock the machine keys, leave the editable columns unlocked. Protection is
    // advisory (anyone can unprotect) but it blocks the common accident: a fill
    // handle dragged across dish_id, silently rewriting the keys import matches
    // on. No password — this is a guardrail, not a lock.
    for (let r = 1; r <= lastRow; r++) {
      for (const col of ['A', 'B', 'C', 'D', 'F', 'J', 'K', 'L', 'M', 'N']) {
        sheet.getCell(`${col}${r}`).protection = { locked: true };
      }
      for (const col of ['E', 'G', 'H', 'I']) {
        sheet.getCell(`${col}${r}`).protection = { locked: false };
      }
    }
    await sheet.protect('', {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatCells: false,
      insertRows: true,
      deleteRows: true,
      sort: false,
      autoFilter: false,
    });

    sheet.autoFilter = { from: 'A1', to: `N${lastRow}` };
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

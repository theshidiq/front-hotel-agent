import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import * as ExcelJS from 'exceljs';
import { SupabaseService } from '../supabase/supabase.service';

/** One parsed row of the exported `… data` sheet. */
interface ParsedRow {
  rowNumber: number;
  menu_group_id: string;
  course_name: string;
  course_id: string | null;
  course_sort: number | null;
  course_reading: string | null;
  column: number;
  sort_order: number;
  dish_text: string;
  dish_id: string;
}

export interface ImportChange {
  kind: 'update' | 'insert' | 'delete';
  group_id: string;
  course_name: string;
  dish_id: string;
  before?: string;
  after?: string;
}

export interface ImportPreview {
  /** Token the caller must echo back to apply these exact changes. */
  token: string;
  summary: { updates: number; inserts: number; deletes: number; unchanged: number };
  changes: ImportChange[];
  warnings: string[];
  /** True when the change set is destructive enough to demand extra care. */
  requires_attention: boolean;
}

/**
 * Excel → menu rows (round-trip import).
 *
 * SAFETY MODEL — this is the one code path that can destroy menu data, so it is
 * deliberately two-phase and never writes on its own:
 *
 *   1. preview(file)          → parse, diff against the DB, return the changes
 *                               plus a token that fingerprints THIS change set
 *   2. apply(file, token)     → re-parse, recompute, and refuse unless the
 *                               fingerprint still matches
 *
 * That means a caller cannot apply a change set it never saw, and cannot apply a
 * stale one if the menu moved underneath it. Deletions are only ever performed
 * for dishes whose ids were present in the DB and absent from the sheet, and the
 * preview reports them explicitly so a human decides.
 *
 * Dish ids are the join key. A row with an unknown/blank dish_id is treated as
 * an INSERT (new dish), never as a silent overwrite of something else.
 */
@Injectable()
export class MenuImportService {
  private readonly logger = new Logger(MenuImportService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ── Parsing ───────────────────────────────────────────────────────────────

  private async parse(buffer: Buffer): Promise<{ rows: ParsedRow[]; warnings: string[] }> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as any);
    } catch (e: any) {
      throw new BadRequestException(`Not a readable .xlsx file: ${e.message}`);
    }

    const rows: ParsedRow[] = [];
    const warnings: string[] = [];

    // Only `… data` sheets are authoritative; the layout sheets are for humans
    // and are deliberately ignored so cosmetic edits there can never write.
    const dataSheets = workbook.worksheets.filter((w) => /\bdata$/i.test(w.name));
    if (dataSheets.length === 0) {
      throw new BadRequestException(
        'No "… data" sheet found. Import reads the data sheet produced by the export, not the layout sheet.',
      );
    }

    for (const sheet of dataSheets) {
      const header = sheet.getRow(1);
      const index = new Map<string, number>();
      header.eachCell({ includeEmpty: false }, (cell, col) => {
        index.set(String(cell.value ?? '').trim(), col);
      });

      const required = ['menu_group_id', 'course_name', 'column', 'sort_order', 'dish_text', 'dish_id'];
      const missing = required.filter((c) => !index.has(c));
      if (missing.length) {
        throw new BadRequestException(
          `Sheet "${sheet.name}" is missing column(s): ${missing.join(', ')}. Use a file produced by the export.`,
        );
      }

      const text = (row: ExcelJS.Row, key: string): string => {
        const col = index.get(key);
        if (!col) return '';
        const v = row.getCell(col).value;
        if (v == null) return '';
        // Excel cells can hold rich text / formula results.
        if (typeof v === 'object') {
          const anyV = v as any;
          if (Array.isArray(anyV.richText)) {
            return anyV.richText.map((r: any) => r.text).join('').trim();
          }
          if (anyV.result != null) return String(anyV.result).trim();
          if (anyV.text != null) return String(anyV.text).trim();
        }
        return String(v).trim();
      };

      for (let r = 2; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const dishText = text(row, 'dish_text');
        const groupId = text(row, 'menu_group_id');
        const courseName = text(row, 'course_name');

        // Blank line — skip silently (Excel leaves trailing empty rows).
        if (!dishText && !groupId && !courseName) continue;

        if (!groupId) {
          warnings.push(`${sheet.name} row ${r}: no menu_group_id — row ignored.`);
          continue;
        }
        if (!dishText) {
          warnings.push(
            `${sheet.name} row ${r}: empty dish_text — row ignored. Delete the whole row to remove a dish.`,
          );
          continue;
        }

        const colNum = Number(text(row, 'column'));
        const sortNum = Number(text(row, 'sort_order'));

        rows.push({
          rowNumber: r,
          menu_group_id: groupId,
          course_name: courseName,
          course_id: text(row, 'course_id') || null,
          course_sort: Number.isFinite(Number(text(row, 'course_sort')))
            ? Number(text(row, 'course_sort'))
            : null,
          course_reading: text(row, 'course_reading') || null,
          column: Number.isFinite(colNum) ? colNum : 0,
          sort_order: Number.isFinite(sortNum) ? sortNum : 0,
          dish_text: dishText,
          dish_id: text(row, 'dish_id'),
        });
      }
    }

    if (rows.length === 0) {
      throw new BadRequestException('The data sheet contained no usable dish rows.');
    }
    return { rows, warnings };
  }

  // ── Diff ──────────────────────────────────────────────────────────────────

  /**
   * Compare the sheet against the DB for exactly the groups the sheet mentions.
   * Scoping to those groups is what stops a partial file from ever being read as
   * "delete every menu not in this spreadsheet".
   */
  private async diff(
    organizationId: string,
    rows: ParsedRow[],
    warnings: string[],
  ): Promise<ImportPreview> {
    const supabase = this.supabaseService.getClient();
    const groupIds = [...new Set(rows.map((r) => r.menu_group_id))];

    const { data: menus, error: menusError } = await supabase
      .from('menus')
      .select('id, name, category, menu_group_id')
      .eq('organization_id', organizationId)
      .in('menu_group_id', groupIds);
    if (menusError) {
      throw new InternalServerErrorException(`Failed to read menus: ${menusError.message}`);
    }

    // Every group named in the sheet must actually belong to this org.
    const knownGroups = new Set((menus ?? []).map((m) => m.menu_group_id as string));
    for (const gid of groupIds) {
      if (!knownGroups.has(gid)) {
        warnings.push(
          `menu_group_id ${gid} has no courses in your organization — its rows will be treated as new.`,
        );
      }
    }

    const menuIds = (menus ?? []).map((m) => m.id as string);
    const { data: dishes, error: dishesError } = menuIds.length
      ? await supabase
          .from('menu_dishes')
          .select('id, menu_id, text, column, sort_order')
          .in('menu_id', menuIds)
      : { data: [] as any[], error: null };
    if (dishesError) {
      throw new InternalServerErrorException(`Failed to read dishes: ${dishesError.message}`);
    }

    const menuById = new Map((menus ?? []).map((m) => [m.id as string, m]));
    const existingById = new Map((dishes ?? []).map((d) => [d.id as string, d]));
    const sheetDishIds = new Set(rows.map((r) => r.dish_id).filter(Boolean));

    const changes: ImportChange[] = [];
    let unchanged = 0;

    for (const row of rows) {
      const existing = row.dish_id ? existingById.get(row.dish_id) : undefined;
      if (!existing) {
        changes.push({
          kind: 'insert',
          group_id: row.menu_group_id,
          course_name: row.course_name,
          dish_id: row.dish_id || '(new)',
          after: row.dish_text,
        });
        continue;
      }
      const same =
        existing.text === row.dish_text &&
        (existing.column ?? 0) === row.column &&
        (existing.sort_order ?? 0) === row.sort_order;
      if (same) {
        unchanged += 1;
      } else {
        changes.push({
          kind: 'update',
          group_id: row.menu_group_id,
          course_name: row.course_name,
          dish_id: row.dish_id,
          before: `${existing.text} [col ${existing.column ?? 0}/${existing.sort_order ?? 0}]`,
          after: `${row.dish_text} [col ${row.column}/${row.sort_order}]`,
        });
      }
    }

    // Deletions: dishes that exist in the DB for these groups but are gone from
    // the sheet. Reported, never assumed — the caller must confirm.
    for (const d of dishes ?? []) {
      if (sheetDishIds.has(d.id)) continue;
      const menu = menuById.get(d.menu_id);
      changes.push({
        kind: 'delete',
        group_id: (menu?.menu_group_id as string) ?? '',
        course_name: (menu?.name as string) ?? '',
        dish_id: d.id,
        before: d.text,
      });
    }

    const summary = {
      updates: changes.filter((c) => c.kind === 'update').length,
      inserts: changes.filter((c) => c.kind === 'insert').length,
      deletes: changes.filter((c) => c.kind === 'delete').length,
      unchanged,
    };

    // Flag change sets that would remove a large share of what is stored — the
    // signature of an accidentally truncated or half-filled spreadsheet.
    const totalExisting = (dishes ?? []).length;
    const requires_attention =
      summary.deletes > 0 && totalExisting > 0 && summary.deletes >= totalExisting * 0.2;
    if (requires_attention) {
      warnings.push(
        `This import would DELETE ${summary.deletes} of ${totalExisting} existing dishes. ` +
          `Check the file is complete before applying.`,
      );
    }

    return {
      token: this.fingerprint(organizationId, changes),
      summary,
      changes,
      warnings,
      requires_attention,
    };
  }

  /** Stable fingerprint of a change set, so apply() can verify intent. */
  private fingerprint(organizationId: string, changes: ImportChange[]): string {
    const canonical = changes
      .map((c) => `${c.kind}:${c.dish_id}:${c.after ?? ''}:${c.before ?? ''}`)
      .sort()
      .join('|');
    return createHash('sha256').update(`${organizationId}::${canonical}`).digest('hex').slice(0, 32);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Phase 1: parse + diff. Never writes. */
  async preview(organizationId: string, buffer: Buffer): Promise<ImportPreview> {
    const { rows, warnings } = await this.parse(buffer);
    return this.diff(organizationId, rows, warnings);
  }

  /**
   * Phase 2: apply — but only the exact change set the caller previewed.
   *
   * `deletes` must additionally be opted into with allowDeletes, so removing
   * dishes is always a separate, conscious decision from editing text.
   */
  async apply(
    organizationId: string,
    buffer: Buffer,
    token: string,
    allowDeletes: boolean,
  ): Promise<{ applied: ImportPreview['summary']; skipped_deletes: number }> {
    const { rows, warnings } = await this.parse(buffer);
    const preview = await this.diff(organizationId, rows, warnings);

    if (preview.token !== token) {
      throw new BadRequestException(
        'The menu changed since this file was previewed (or the file was edited). Preview again and re-confirm.',
      );
    }

    const supabase = this.supabaseService.getClient();

    // Upserts: text/column/sort_order only. product_id is deliberately NOT
    // written, so an allergen link survives a spreadsheet round-trip exactly as
    // it survives an editor sync.
    const toWrite = rows.filter((r) =>
      preview.changes.some(
        (c) => (c.kind === 'update' || c.kind === 'insert') && c.dish_id === (r.dish_id || '(new)'),
      ),
    );

    // Dish ids come from the spreadsheet, so an upsert by id could otherwise
    // overwrite (and re-parent) another organization's dish row.
    const writeIds = [...new Set(toWrite.map((r) => r.dish_id).filter(Boolean))];
    if (writeIds.length > 0) {
      const { data: foreign, error: foreignError } = await supabase
        .from('menu_dishes')
        .select('id')
        .in('id', writeIds)
        .neq('organization_id', organizationId)
        .limit(1);
      if (foreignError) {
        throw new InternalServerErrorException(`Failed to verify dishes: ${foreignError.message}`);
      }
      if (foreign && foreign.length > 0) {
        throw new BadRequestException(`The file contains an invalid dish_id (${foreign[0].id}).`);
      }
    }

    for (const row of toWrite) {
      const menuId = await this.resolveMenuId(organizationId, row);
      if (!menuId) continue;
      const payload: Record<string, any> = {
        menu_id: menuId,
        organization_id: organizationId,
        text: row.dish_text,
        column: row.column,
        sort_order: row.sort_order,
      };
      if (row.dish_id) payload.id = row.dish_id;
      const { error } = await supabase
        .from('menu_dishes')
        .upsert([payload], { onConflict: 'id', defaultToNull: false });
      if (error) {
        throw new InternalServerErrorException(`Failed to write dish: ${error.message}`);
      }
    }

    let skipped = 0;
    const deletions = preview.changes.filter((c) => c.kind === 'delete');
    if (deletions.length > 0) {
      if (allowDeletes) {
        const ids = deletions.map((d) => d.dish_id);
        const { error } = await supabase.from('menu_dishes').delete().in('id', ids);
        if (error) {
          throw new InternalServerErrorException(`Failed to delete dishes: ${error.message}`);
        }
      } else {
        skipped = deletions.length;
      }
    }

    this.logger.log(
      `Excel import for org ${organizationId}: ` +
        `${preview.summary.updates} updated, ${preview.summary.inserts} inserted, ` +
        `${allowDeletes ? preview.summary.deletes : 0} deleted (${skipped} deletions skipped).`,
    );

    return {
      applied: { ...preview.summary, deletes: allowDeletes ? preview.summary.deletes : 0 },
      skipped_deletes: skipped,
    };
  }

  /** Find the menus row a sheet row belongs to (by id, else group+course name). */
  private async resolveMenuId(
    organizationId: string,
    row: ParsedRow,
  ): Promise<string | null> {
    const supabase = this.supabaseService.getClient();
    if (row.course_id) {
      const { data } = await supabase
        .from('menus')
        .select('id')
        .eq('id', row.course_id)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (data) return data.id;
    }
    const { data } = await supabase
      .from('menus')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('menu_group_id', row.menu_group_id)
      .eq('name', row.course_name)
      .maybeSingle();
    return data?.id ?? null;
  }
}

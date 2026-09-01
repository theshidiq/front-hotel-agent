import { Injectable, Logger } from '@nestjs/common';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextDirection,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';

/** Shape shared with MenuExportService (kept local to avoid coupling). */
interface DocxCourse {
  name: string;
  cols: { text: string }[][];
}
export interface DocxMenu {
  menu_title: string;
  courses: DocxCourse[];
  kids: { name: string; items: { text: string }[] }[];
}

/**
 * Menu → Word (.docx), the EDITABLE presentation copy.
 *
 * Why Word and not the spreadsheet: an お品書き is a typeset document, not a
 * grid. Word supports genuine vertical Japanese (w:textDirection tbRl — the
 * same model as the editor's CSS writing-mode: vertical-rl), proportional
 * column widths and real borders, so it can reproduce the layout far more
 * closely than Excel, while staying editable by staff (which the PDF is not).
 *
 * Division of labour across the exports:
 *   • .xlsx  — the data archive and the round-trip editing format
 *   • .docx  — the layout: readable, printable, and editable by hand
 *   • PDF    — the exact rendering, produced by the browser
 *
 * The whole section is set tbRl, so Word lays the columns out right-to-left by
 * itself and the table cells are written in natural order — no reversing.
 */
@Injectable()
export class MenuDocxService {
  private readonly logger = new Logger(MenuDocxService.name);

  private readonly FONT = 'Yu Mincho';

  /** One vertical line of text inside a cell. */
  private line(text: string, size: number, bold = false): Paragraph {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: 288 }, // ~1.2× for comfortable CJK spacing
      children: [
        new TextRun({
          text,
          font: { name: this.FONT, eastAsia: this.FONT },
          size: size * 2, // docx sizes are half-points
          bold,
        }),
      ],
    });
  }

  /**
   * One course = one table cell holding its sub-columns.
   *
   * Each sub-column becomes its own nested cell so the dishes sit side by side
   * exactly as in the editor, with the course name and the 一 mark leading the
   * course's first (rightmost, under tbRl) sub-column.
   */
  private courseCell(course: DocxCourse): TableCell {
    const subs = course.cols.filter((s) => s.some((d) => (d.text ?? '').trim()));
    const groups = subs.length > 0 ? subs : [[]];

    // Reversed for the same reason as the courses: the page is left-to-right, so
    // the chef's rightmost sub-column must be emitted last.
    const ordered = [...groups].reverse();

    const subCells = ordered.map((sub, idx) => {
      const dishes = sub.map((d) => (d.text ?? '').trim()).filter(Boolean);
      // The course's first sub-column is now the LAST cell (rightmost on page),
      // and it carries the name and the 一 mark.
      const isLead = idx === ordered.length - 1;
      const paragraphs: Paragraph[] = [];
      if (isLead) {
        paragraphs.push(this.line(course.name, 14, true));
        paragraphs.push(this.line('一', 11));
      }
      for (const dish of dishes) paragraphs.push(this.line(dish, 11));
      if (paragraphs.length === 0) paragraphs.push(this.line('', 11));

      return new TableCell({
        children: paragraphs,
        textDirection: TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
        verticalAlign: VerticalAlign.TOP,
        margins: { top: 60, bottom: 60, left: 40, right: 40 },
        borders: this.noBorders(),
      });
    });

    // Nest the sub-columns in a borderless table so they align at the top.
    const inner = new Table({
      rows: [
        new TableRow({
          children: subCells,
          // Match the outer row: without an explicit height the nested row
          // collapses and the vertical text overlaps.
          height: { value: 8400, rule: HeightRule.ATLEAST },
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: this.noBorders(),
      layout: TableLayoutType.AUTOFIT,
    });

    return new TableCell({
      children: [inner],
      verticalAlign: VerticalAlign.TOP,
      margins: { top: 0, bottom: 0, left: 60, right: 60 },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        // A hairline on the right edge separates this course from the one read
        // before it, matching the editor's vertical rules.
        right: { style: BorderStyle.SINGLE, size: 2, color: 'D6D3D1' },
      },
    });
  }

  private noBorders() {
    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    return { top: none, bottom: none, left: none, right: none };
  }

  /** Build a .docx for one menu. */
  async build(menu: DocxMenu): Promise<Buffer> {
    // Title cell: stands alone, rendered rightmost by tbRl — as on screen.
    const titleCell = new TableCell({
      children: [this.line(menu.menu_title, 20)],
      textDirection: TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
      verticalAlign: VerticalAlign.TOP,
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      borders: this.noBorders(),
    });

    // Right-to-left reading order, produced by reversing the cells (the page is
    // left-to-right; only the cells are vertical). The title ends up rightmost,
    // then the courses run leftwards, as in the editor.
    const cells = [...menu.courses.map((c) => this.courseCell(c)).reverse(), titleCell];

    // An explicit row height is what gives the vertical text somewhere to flow;
    // without it Word collapses the row to the height of one line and the
    // characters pile up on top of each other. ~15cm in twentieths of a point.
    const ROW_HEIGHT = 8500;

    const body: (Table | Paragraph)[] = [
      new Table({
        rows: [
          new TableRow({
            children: cells,
            height: { value: ROW_HEIGHT, rule: HeightRule.ATLEAST },
          }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: this.noBorders(),
        layout: TableLayoutType.AUTOFIT,
      }),
    ];

    // Kids menus as a dashed callout beneath the courses.
    for (const kids of menu.kids) {
      const items = kids.items.map((i) => (i.text ?? '').trim()).filter(Boolean);
      if (items.length === 0) continue;
      const dashed = {
        style: BorderStyle.DASHED,
        size: 4,
        color: '78716C',
      };
      body.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      body.push(
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    this.line(kids.name, 12, true),
                    this.line(items.map((t) => `・${t}`).join('　'), 10),
                  ],
                  margins: { top: 120, bottom: 120, left: 120, right: 120 },
                  borders: { top: dashed, bottom: dashed, left: dashed, right: dashed },
                }),
              ],
            }),
          ],
          width: { size: 40, type: WidthType.PERCENTAGE },
          borders: this.noBorders(),
        }),
      );
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: { orientation: PageOrientation.LANDSCAPE },
              margin: { top: 720, right: 720, bottom: 720, left: 720 },
              // NOTE: the page textDirection is deliberately NOT set to tbRl.
              // Setting it here AND on the cells rotates twice: Word turns the
              // page, then turns each cell again inside it, leaving the vertical
              // text no room to flow and crushing every column into one
              // overlapping line. The cells carry the vertical direction; the
              // right-to-left order is produced by emitting the columns
              // reversed (see build()).
            },
          },
          children: body,
        },
      ],
    });

    return Buffer.from(await Packer.toBuffer(doc));
  }
}

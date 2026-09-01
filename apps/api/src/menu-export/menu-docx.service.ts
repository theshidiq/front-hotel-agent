import { Injectable, Logger } from '@nestjs/common';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  PageOrientation,
  PageTextDirectionType,
  Paragraph,
  Table,
  TableCell,
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

    const subCells = groups.map((sub, idx) => {
      const dishes = sub.map((d) => (d.text ?? '').trim()).filter(Boolean);
      const isLead = idx === 0; // tbRl renders the first cell rightmost
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
      rows: [new TableRow({ children: subCells })],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: this.noBorders(),
    });

    return new TableCell({
      children: [inner],
      verticalAlign: VerticalAlign.TOP,
      margins: { top: 0, bottom: 0, left: 60, right: 60 },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        // A hairline between courses, matching the editor's vertical rules.
        left: { style: BorderStyle.SINGLE, size: 2, color: 'D6D3D1' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
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

    const cells = [titleCell, ...menu.courses.map((c) => this.courseCell(c))];

    const body: (Table | Paragraph)[] = [
      new Table({
        rows: [new TableRow({ children: cells })],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: this.noBorders(),
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
              // The whole page flows vertically right-to-left: Word then places
              // the columns in お品書き order without any manual reversing.
              textDirection: PageTextDirectionType.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
            },
          },
          children: body,
        },
      ],
    });

    return Buffer.from(await Packer.toBuffer(doc));
  }
}

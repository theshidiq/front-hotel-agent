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
      // LEFT, not CENTER: under tbRl the alignment axis rotates with the text,
      // so "left" is the top of the column. Centering is what left every course
      // floating in the middle of the page instead of starting at the top.
      alignment: AlignmentType.LEFT,
      spacing: { after: 0, line: 240 },
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
   * A course name plus its dishes as ONE paragraph.
   *
   * Under tbRl each paragraph becomes its own vertical line, so a paragraph per
   * dish renders the dishes as separate thin strips beside the course name
   * instead of flowing beneath it. Joining them into a single run makes the
   * column read as one continuous line, as it does on screen.
   */
  private columnParagraph(
    lead: string | null,
    dishes: string[],
    size: number,
  ): Paragraph {
    const runs: TextRun[] = [];
    if (lead) {
      runs.push(
        new TextRun({
          text: `${lead}　一　`,
          font: { name: this.FONT, eastAsia: this.FONT },
          size: (size + 2) * 2,
          bold: true,
        }),
      );
    }
    runs.push(
      new TextRun({
        text: dishes.join('　'),
        font: { name: this.FONT, eastAsia: this.FONT },
        size: size * 2,
      }),
    );
    return new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 0, line: 240 },
      children: runs,
    });
  }

  /**
   * One course = one table cell holding its sub-columns.
   *
   * Each sub-column becomes its own nested cell so the dishes sit side by side
   * exactly as in the editor, with the course name and the 一 mark leading the
   * course's first (rightmost, under tbRl) sub-column.
   */
  private courseCells(course: DocxCourse): TableCell[] {
    const subs = course.cols.filter((s) => s.some((d) => (d.text ?? '').trim()));
    const groups = subs.length > 0 ? subs : [[]];

    // Reversed for the same reason as the courses: the page is left-to-right, so
    // the chef's rightmost sub-column must be emitted last.
    const ordered = [...groups].reverse();

    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } as const;
    const rule = { style: BorderStyle.SINGLE, size: 2, color: 'D6D3D1' } as const;

    // Sub-columns become cells of the OUTER table directly. An earlier version
    // nested a table per course, which made Word size each course to a share of
    // the page width and spread eleven courses across it with large gaps.
    return ordered.map((sub, idx) => {
      const dishes = sub.map((d) => (d.text ?? '').trim()).filter(Boolean);
      const isLead = idx === ordered.length - 1;

      return new TableCell({
        children: [this.columnParagraph(isLead ? course.name : null, dishes, 11)],
        textDirection: TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
        // Under tbRl the vertical axis rotates: BOTTOM anchors the text to the
        // start (top) of the column. TOP pushed everything to the far side.
        verticalAlign: VerticalAlign.BOTTOM,
        margins: { top: 30, bottom: 30, left: 10, right: 10 },
        width: { size: 460, type: WidthType.DXA },
        borders: {
          top: none,
          bottom: none,
          left: none,
          // Hairline only on the course's leading (rightmost) column, so one
          // rule falls between courses rather than between every sub-column.
          right: isLead ? rule : none,
        },
      });
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
      children: [this.line(menu.menu_title, 18)],
      textDirection: TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
      verticalAlign: VerticalAlign.BOTTOM, // = top of the column under tbRl
      margins: { top: 60, bottom: 60, left: 40, right: 40 },
      width: { size: 900, type: WidthType.DXA },
      borders: this.noBorders(),
    });

    // Right-to-left reading order, produced by reversing the cells (the page is
    // left-to-right; only the cells are vertical). The title ends up rightmost,
    // then the courses run leftwards, as in the editor.
    const courseCells = menu.courses.flatMap((c) => this.courseCells(c));
    const cells = [...courseCells.reverse(), titleCell];

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
        // FIXED so the per-cell widths above are honoured. With AUTOFIT Word
        // divides the page between the columns instead, which is what spread
        // eleven courses across the sheet with large gaps between them.
        layout: TableLayoutType.FIXED,
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

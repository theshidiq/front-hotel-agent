import { Injectable, Logger } from '@nestjs/common';
import * as JSZip from 'jszip';
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
  Textbox,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';

/**
 * Real vertical Japanese (縦書き), which `TextDirection` cannot express.
 *
 * OOXML has two different top-to-bottom flows, and the difference is the whole
 * ballgame for Japanese:
 *
 *   tbRl   — the cell's content block is laid out horizontally and then the
 *            whole box is ROTATED 90°. Kanji end up on their side along with
 *            everything else; katakana, the long-vowel ー and punctuation are
 *            carried around by the rotation rather than re-set. This reads as
 *            "the font was rotated", not as vertical writing.
 *   tbRlV  — genuine vertical script: the line runs top-to-bottom while East
 *            Asian glyphs are rotated 270° back to UPRIGHT, so kanji and kana
 *            stand correctly, ー becomes the vertical bar, and punctuation
 *            moves to its vertical position. This is 縦書き, and it is the
 *            direct counterpart of the editor's `writing-mode: vertical-rl`.
 *
 * The `docx` package (9.7.1) only exports btLr / lrTb / tbRl — `tbRlV` is
 * missing from the enum, though the writer passes the string through to the
 * XML unvalidated. So the value is cast in rather than imported. Verified in
 * the output: <w:textDirection w:val="tbRlV"/>.
 *
 * @see https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oi29500/ad8ec7f9-73a3-41aa-b193-562caeda1103
 */
const TATEGAKI = 'tbRlV' as unknown as (typeof TextDirection)[keyof typeof TextDirection];

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
 * same model as the editor's CSS writing-mode: vertical-rl), fixed column
 * widths and real borders, so it can reproduce the layout closely while
 * staying editable by staff (which the PDF is not).
 *
 * Division of labour across the exports:
 *   • .xlsx  — the data archive and the round-trip editing format
 *   • .docx  — the layout: readable, printable, and editable by hand
 *   • PDF    — the exact rendering, produced by the browser
 *
 * ── Geometry is ported from the editor's CSS, not guessed ──────────────────
 * MenuScanModal.svelte is the reference rendering. Its measurements:
 *
 *   .scan-paper-columns          height: 794px          (the paper band)
 *   .course-col                  width: 130px (fixed)   every course, equal
 *   dish/name text               text-xl = 1.25rem = 20px
 *   .cap-course-name             height 3.2em, top-aligned, sits ABOVE the
 *                                column (position:absolute → no layout height)
 *   .dish-ichi-row               height: 2em, first sub-column only
 *   sub-columns                  flex-row-reverse, margin-top 1.5em per step
 *   column content               starts at pt-20 (80px) from the column top
 *
 * At 96dpi 1px = 0.75pt = 15 twips, so those px figures convert directly.
 * The previous revision used 460 DXA (~31px) per sub-column — roughly a
 * quarter of the editor's column — which is why all eleven courses crammed
 * into the upper-left of the sheet and the rhythm was irregular.
 */
@Injectable()
export class MenuDocxService {
  private readonly logger = new Logger(MenuDocxService.name);

  private readonly FONT = 'Yu Mincho';

  // ── Geometry, in twips (1/20 pt). 1 CSS px = 15 twips at 96dpi. ──────────

  /** .course-col width: 130px. Every course gets the SAME width — that is what
   *  produces the editor's regular column rhythm, and it must not vary with
   *  the number of sub-columns or the length of the dish text. */
  private readonly COURSE_W = 130 * 15; // 1950

  /** Title column. Wider than a course: it carries 令和八年 夏の献立 滞在 at
   *  text-4xl with loose tracking, and on screen it is its own flex-none column. */
  private readonly TITLE_W = 200 * 15; // 3000

  /**
   * Usable body height of ONE landscape A4, MEASURED — not computed.
   *
   * The obvious arithmetic (11906 page − 800 margins = 11106) is wrong: Word
   * also reserves the header and footer distances (708 twips each by default),
   * so a row of 11106 overflows and the table breaks onto a second page. That
   * miscalculation is what kept this export at two pages, and no amount of
   * tuning the row structure could fix it.
   *
   * Bisected by rendering the REAL menu through Word and counting PDF pages:
   *   10400 → 1 page      10800 → 2 pages     11106 → 2 pages
   * Now 10100: the top page margin was raised by 300 twips to lift the course
   * names off the paper edge, so the body gives back the same amount.
   * A synthetic table survived 10800, so the ceiling depends on the actual
   * cell contents — measure against a real menu, never a stripped-down case.
   * 10400 leaves headroom below the observed limit.
   */
  private readonly PAGE_H = 10100;

  /**
   * The course-name header band. Sized to the longest name a cell must hold:
   * under tbRlV a row's "height" is the length of the vertical LINE, so this is
   * really "how many characters of name fit". A split half-name is at most
   * ceil(len/2), so 5 characters plus the margin covers every real course name
   * (本日の肉料理 → 本日の / 肉料理).
   */
  private readonly NAME_H = 5 * 12 * 20 + 80; // 1280

  /** Dishes take whatever is left of the measured page height. */
  private readonly DISH_H = this.PAGE_H - this.NAME_H;

  /**
   * Characters per sub-column for the balancing pass.
   *
   * The editor uses 14, tuned to its 794px on-screen band. Here the available
   * run is DISH_H (8820 twips) at DISH_PT (15pt = 300 twips per character),
   * i.e. ~29 characters — but the staircase means later sub-columns start
   * lower, and the 一 prefix costs two more. 22 keeps the deepest column clear
   * of the page foot while avoiding a spray of thin columns.
   */
  private readonly TARGET_PER_COL = 28;

  /**
   * Hard ceiling on characters in one sub-column.
   *
   * The raw fit is DISH_H / (DISH_PT * 20) ~= 29 characters, but that is a
   * paper calculation: Japanese glyph advance is not exactly the point size,
   * the lead column carries a 一 prefix, and the staircase starts later
   * sub-columns lower down. At 26 the longest lines still overran and Word
   * rendered them ROTATED SIDEWAYS against the grain (seen in 台物 and 八寸).
   * 21 leaves real headroom. Derived from DISH_H so it tracks PAGE_H.
   */
  private readonly MAX_COL_CHARS =
    Math.floor(this.DISH_H / (12 * 20)) - 8; // 30

  /**
   * Minimum cell width one vertical sub-column needs.
   *
   * Word lays a cell's paragraphs out as vertical lines side by side, but only
   * while they fit the cell's width. The moment they do not, the overflowing
   * paragraph is rendered SIDEWAYS across the column instead — which is what
   * produced the rotated lines in 台物, 八寸, 小鍋 and 甘味, and why it looked
   * like a font or text-direction bug when it was really a width bug.
   *
   * Bisected on a 3-paragraph cell: rotates at 1279 twips, correct at 1400.
   */
  private readonly SUBCOL_W = 467;

  /**
   * Marker prefixed to Latin runs so the packed XML can find them and add
   * `<w:eastAsianLayout w:vert="0"/>`, which keeps them upright and
   * horizontal. U+FEFF (zero-width no-break space) is used because it is
   * invisible if a patch were ever missed, and never occurs in menu text.
   * It is stripped during the patch.
   */
  private readonly LATIN_MARK = '\uFEFF';

  /**
   * Dish + course-name size.
   *
   * The editor's text-xl is 20px = 15pt, but that does not survive the page.
   * Eleven courses leave ~1280 twips per column, which fits only TWO vertical
   * sub-columns (a third is rendered sideways — see SUBCOL_W). Two columns at
   * 15pt hold ~58 characters, and 八寸 needs 63, so the longest courses ran off
   * the foot of the page. At 12pt two columns hold ~72, which clears every
   * course in the live menus with room to spare.
   */
  private readonly DISH_PT = 12;

  /** Title size. text-4xl = 36px = 27pt. */
  private readonly TITLE_PT = 27;

  /**
   * Printable width of one landscape A4 at the section margins below:
   * 297mm = 16838 twips, less 400 twips of margin either side.
   *
   * The editor's paper is `width: max-content` and simply grows with the
   * course count — it then scales the whole thing down via fitToWidth. Word
   * has no such scaling, so the columns are scaled to fit instead, which is
   * the print-media equivalent of what the editor does on screen.
   */
  private readonly PAGE_W = 16838 - 800;

  /**
   * Leading blank run that reproduces the editor's `pt-20` (80px) top padding
   * plus the course-name header zone. Under tbRl this pushes the start of the
   * dish text down the column, which is what aligns the 一 marks across every
   * course into one shared line — the editor's `.dish-ichi-row`.
   */
  private topPad(size: number): TextRun {
    return new TextRun({
      text: '　',
      font: { name: this.FONT, eastAsia: this.FONT },
      size: size * 2,
    });
  }

  /** One vertical line of text inside a cell. */
  private line(text: string, size: number, bold = false): Paragraph {
    return new Paragraph({
      // LEFT, not CENTER: the inline axis runs down the column under a vertical
      // flow, so "left" is the START of the line, i.e. the top of the column.
      // Centering is what left every course floating mid-page.
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
   * The editor splits a course name longer than 3 characters into two tight
   * vertical half-lines that sit side by side over the first two sub-columns
   * (see splitCourseName() in MenuScanModal.svelte). Ported verbatim so the
   * Word output breaks 本日の肉料理 at the same place the screen does.
   */
  private splitCourseName(name: string): string[] {
    if (!name) return [''];
    if (name.length <= 3) return [name];
    const mid = Math.ceil(name.length / 2);
    return [name.slice(0, mid), name.slice(mid)];
  }

  /**
   * Group dishes into balanced sub-columns by total character length —
   * `balanceByLength()` from MenuScanModal.svelte, ported verbatim.
   *
   * This is what evens out the ragged depth. The editor rebalances at RENDER
   * time, so a long course (本日の肉料理, 台物) is spread across more, shorter
   * sub-columns instead of running far down the page while 食前酒 stops after
   * one line. The export previously used whatever `cols` the stored data
   * happened to hold, so it inherited none of that balancing.
   */
  private balanceByLength(
    items: string[],
    targetPerCol = 14,
    reserve = 0,
    maxCols = Infinity,
  ): string[][] {
    if (items.length === 0) return [];
    // The editor keeps a short list in one column regardless of length, since
    // its band scrolls. Print cannot overflow, so that shortcut is only taken
    // when the result actually fits the dish row — otherwise a course like
    // 造里 (3 items, 30 characters) would run off the foot of the page.
    const joined = items.reduce((s, i) => s + i.length + 1, 0);
    if (
      items.length <= 3 &&
      targetPerCol >= 10 &&
      joined + reserve <= this.MAX_COL_CHARS
    ) {
      return [items];
    }

    // Count the separator that joins dishes ('　') as well as the dish text:
    // the editor can ignore it because its band scrolls, but here the RENDERED
    // length is what must fit the row. Without the +1 per item, 造里 (8 dishes,
    // 21 characters of text but 29 rendered) came back as a single column and
    // ran off the foot of the page.
    const totalChars = items.reduce((s, i) => s + i.length + 1, 0);
    const numCols = Math.max(1, Math.ceil(totalChars / targetPerCol));
    const targetActual = totalChars / numCols;

    const groups: string[][] = [];
    let current: string[] = [];
    let currentLen = 0;

    for (const item of items) {
      // Hard ceiling, which the editor does not need: its band scrolls, but a
      // printed column that overruns is not merely long — Word rotates the
      // overflowing line sideways against the grain. The upstream loop stops
      // splitting once it has numCols-1 groups and dumps everything left into
      // the final one, so without this the last column overran however low
      // targetPerCol was set.
      if (
        current.length > 0 &&
        currentLen + item.length + 1 + reserve > this.MAX_COL_CHARS
      ) {
        groups.push(current);
        current = [];
        currentLen = 0;
      }
      current.push(item);
      currentLen += item.length + 1;
      if (currentLen >= targetActual && groups.length < numCols - 1) {
        groups.push(current);
        current = [];
        currentLen = 0;
      }
    }
    if (current.length > 0) groups.push(current);

    // Never exceed what the cell width can render vertically: a sub-column
    // past that limit is laid out sideways by Word. Excess groups are folded
    // back into the last allowed one — the column runs longer, which is
    // ordinary typography, rather than turning on its side, which is a defect.
    while (groups.length > maxCols) {
      const tail = groups.pop() as string[];
      groups[groups.length - 1] = [...groups[groups.length - 1], ...tail];
    }
    return groups;
  }

  /**
   * One sub-column of dishes, as a single paragraph.
   *
   * Under tbRl each paragraph becomes its own vertical line running down the
   * column, and successive paragraphs advance leftwards — the same axis as the
   * editor's `flex-row-reverse` sub-columns. So one paragraph per sub-column
   * reproduces the on-screen arrangement directly.
   *
   * `indent` is the editor's staircase: sub-column N starts 1.5em lower than
   * the first, expressed here as leading full-width spaces (the only reliable
   * way to offset the start of a vertical line in Word without a nested table).
   */
  /**
   * Split a line into Japanese and Latin runs, so the Latin ones can be left
   * UPRIGHT and horizontal inside the vertical column.
   *
   * Under tbRlV Word rotates Latin text 90° with the line, so "OIL" reads
   * sideways. The fix is `<w:eastAsianLayout w:vert="0"/>` on those runs only,
   * which the `docx` package does not expose — so the runs are marked here
   * with a zero-width marker character and the property is patched into the
   * packed XML afterwards (see uprightLatin()). Same tactic as TATEGAKI.
   *
   * Every ASCII run is treated this way, whatever its length: the requirement
   * is simply that romaji reads horizontally, as it would normally be set.
   *
   * This differs from the editor, which uses tate-chu-yoko (縦中横) to squeeze
   * runs of <= 4 characters into a single vertical slot. That slot renders
   * small in Word, so the plain horizontal treatment is used here instead.
   */

  private latinRuns(text: string): TextRun[] {
    // Runs of ASCII letters/digits (plus the separators inside them), which is
    // what should stay horizontal: OIL, CT70, A5 and so on. Kana and kanji are
    // untouched and keep their normal vertical orientation.
    const parts = text.split(/([A-Za-z0-9][A-Za-z0-9.\-/&' ]*)/g).filter(Boolean);

    return parts.map((part) => {
      // Trailing spaces are not part of the romaji word — combining them would
      // pad the slot and push the following kana off the line.
      const word = part.trimEnd();
      const isLatin = /^[A-Za-z0-9]/.test(part) && word.length > 0;
      return new TextRun({
        text: isLatin ? `${this.LATIN_MARK}${part}` : part,
        font: { name: this.FONT, eastAsia: this.FONT },
        size: this.DISH_PT * 2,
      });
    });
  }

  private subColumn(
    header: string | null,
    dishes: string[],
    stepDown: number,
    withIchi: boolean,
  ): Paragraph {
    const runs: TextRun[] = [];

    // The editor's staircase: sub-column N starts 1.5em lower than the first.
    // The course name is NOT part of this any more — it lives in its own header
    // row (see build()), which is what keeps the names from drifting down the
    // column and mixing into the dish text.
    if (stepDown > 0) {
      runs.push(
        new TextRun({
          text: '　'.repeat(stepDown),
          font: { name: this.FONT, eastAsia: this.FONT },
          size: this.DISH_PT * 2,
        }),
      );
    }

    // The lead sub-column carries the 一; the others are padded by the same
    // width so every column's dish text begins on one shared line rather than
    // the lead's starting two characters lower than its neighbours.
    runs.push(
      new TextRun({
        text: withIchi ? '一　' : '　　',
        font: { name: this.FONT, eastAsia: this.FONT },
        size: this.DISH_PT * 2,
      }),
    );

    // Joined into ONE line: a run (or paragraph) per dish renders each dish as
    // its own thin vertical strip instead of a continuous column. The line is
    // then split so Latin runs can be kept upright — see latinRuns().
    runs.push(...this.latinRuns(dishes.join('　')));

    return new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 0, line: 240 },
      children: runs,
    });
  }

  /**
   * The course-name cell of the header row — the editor's `.cap-course-name`.
   *
   * On screen this is a fixed zone that names hang from, top-aligned, so the
   * header reads as one even band while every course's dishes start from a
   * shared line below it. A separate table row is the Word equivalent, and it
   * is the only way to get that shared line: with the name inside the dish
   * cell, each course's dish text starts wherever its own name ends, which is
   * what made the columns look ragged and mixed together.
   */
  private nameCell(course: DocxCourse, isLast: boolean, width: number): TableCell {
    // A long name splits into two tight half-lines side by side, emitted
    // reversed so the first half lands rightmost (`row-reverse` on screen).
    const paragraphs = [...this.splitCourseName(course.name)]
      .reverse()
      .map(
        (half) =>
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 0, line: 240 },
            children: [
              new TextRun({
                text: half,
                font: { name: this.FONT, eastAsia: this.FONT },
                size: this.DISH_PT * 2,
              }),
            ],
          }),
      );

    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } as const;
    const rule = { style: BorderStyle.SINGLE, size: 2, color: 'D6D3D1' } as const;

    return new TableCell({
      children: paragraphs.length ? paragraphs : [new Paragraph({ text: '' })],
      textDirection: TATEGAKI,
      verticalAlign: VerticalAlign.TOP,
      margins: { top: 120, bottom: 0, left: 0, right: 0 },
      width: { size: width, type: WidthType.DXA },
      // The rule must run through BOTH rows or the divider breaks at the seam.
      borders: { top: none, bottom: none, left: none, right: isLast ? none : rule },
    });
  }

  private courseCell(
    course: DocxCourse,
    isLast: boolean,
    width: number,
    extra: (Table | Paragraph)[] = [],
  ): TableCell {
    const subs = course.cols.filter((s) => s.some((d) => (d.text ?? '').trim()));

    // Rebalance into even sub-columns, as the editor does at render time.
    // Working from the flat dish list (not the stored `cols`) is what fixes the
    // ragged depth: a course whose dishes were all dumped into one column now
    // spreads across several, so long and short courses reach similar depths.
    // A cell can only hold so many vertical lines side by side. Past that,
    // Word gives up on vertical layout for the overflowing paragraph and lays
    // it out SIDEWAYS across the column — the rotated lines seen in 台物, 八寸,
    // 小鍋 and 甘味. Measured by bisection: three sub-columns need >= 1400 twips
    // (they rotate at 1279, render correctly at 1400), i.e. ~467 twips each.
    const maxSubCols = Math.max(1, Math.floor(width / this.SUBCOL_W));

    const flat = subs.flat().map((d) => (d.text ?? '').trim()).filter(Boolean);
    // Budget for the 「一　」 the lead sub-column carries: it is prepended after
    // balancing, so without reserving it here the lead line ends up two
    // characters over the ceiling.
    const balanced = this.balanceByLength(flat, this.TARGET_PER_COL, 2, maxSubCols);
    const groups: string[][] = balanced.length > 0 ? balanced : [[]];

    // Reversed because the page is left-to-right while the text is vertical:
    // the chef's rightmost sub-column must be emitted last to land on the right.
    const ordered = [...groups].reverse();

    const paragraphs = ordered.map((dishes, idx) => {
      // The LAST emitted sub-column is the chef's FIRST (rightmost) one — it
      // carries the 一, as .dish-ichi-row does on screen. The course name is
      // no longer here; it sits in the header row above.
      const isLead = idx === ordered.length - 1;
      // Editor staircase: colIdx 0 sits highest, each later column steps down
      // 1.5em. In emitted (reversed) order the lead is last, so the step is
      // measured from the end of the array.
      // NO staircase indent. On screen the editor steps later sub-columns down
      // by 1.5em, but that offsets a dish stack hanging beneath a shared 一
      // line. Here the indent shifts the TEXT itself, so each sub-column began
      // at a different height and nothing lined up. Every sub-column now starts
      // on the same line, directly below the course name, as the reference
      // お品書き does.
      return this.subColumn(null, dishes, 0, isLead);
    });

    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } as const;
    const rule = { style: BorderStyle.SINGLE, size: 2, color: 'D6D3D1' } as const;

    return new TableCell({
      children: [...paragraphs, ...extra],
      textDirection: TATEGAKI,
      // Under a vertical flow the block axis runs right-to-left across the
      // cell, so TOP anchors the line to the top of the column — where the
      // editor hangs its dishes from a shared top line.
      verticalAlign: VerticalAlign.TOP,
      margins: { top: 40, bottom: 40, left: 0, right: 0 },
      width: { size: width, type: WidthType.DXA },
      borders: {
        top: none,
        bottom: none,
        left: none,
        // The editor draws `border-l` on each course column. Emitted reversed,
        // that reads as a rule on the right of every course but the last one.
        right: isLast ? none : rule,
      },
    });
  }

  private noBorders() {
    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    // insideHorizontal/Vertical must be set explicitly: omitting them leaves
    // Word's default single-line grid, which drew rules between every cell —
    // including a line across the header/dish boundary the menu should not have.
    return {
      top: none,
      bottom: none,
      left: none,
      right: none,
      insideHorizontal: none,
      insideVertical: none,
    };
  }

  /**
   * The kids callout as a floating TEXT BOX (VML shape), not a table.
   *
   * This is the true counterpart of the editor's `.scan-kids-wrap`, which is
   * `position: absolute; bottom: 1.5rem; right: 10px`: the shape sits on its
   * own layer above the menu grid, pinned to the page. It therefore claims no
   * column, and dragging a column boundary in Word does not drag it along.
   *
   * Why a shape rather than a floating table: a second top-level TABLE forces
   * Word to emit a separating paragraph, which a full-page menu has no room
   * for — every floating-table variant tried produced a second page (measured
   * at y=6000/7600/8600, before and after the menu, and with the dish row
   * shrunk). A shape adds no block-level content, so it costs no page.
   */
  private kidsTextbox(
    kids: { name: string; items: { text: string }[] },
    opts: { left: number; top: number; width: number; height: number },
  ): Textbox {
    const items = kids.items.map((i) => (i.text ?? '').trim()).filter(Boolean);

    return new Textbox({
      style: {
        position: 'absolute',
        // Anchored to the PAGE, so the box holds its spot however the table
        // beneath it is edited.
        positionHorizontal: 'absolute',
        positionHorizontalRelative: 'page',
        positionVertical: 'absolute',
        positionVerticalRelative: 'page',
        left: `${opts.left}pt`,
        top: `${opts.top}pt`,
        width: `${opts.width}pt`,
        height: `${opts.height}pt`,
        // Float over the grid rather than pushing it aside — on top, as the
        // editor's absolutely-positioned box is.
        wrapStyle: 'none',
        zIndex: 10,
      },
      children: [
        this.line(kids.name, 10, true),
        ...items.map((t) => this.line(`・${t}`, 9)),
      ],
    });
  }

  /** Build a .docx for one menu. */
  async build(menu: DocxMenu): Promise<Buffer> {
    const n = menu.courses.length;

    // Which kids menus actually have content — needed before the width scaling,
    // since the kids callout occupies a column of its own.
    const kidsList = menu.kids.filter((k) =>
      k.items.some((i) => (i.text ?? '').trim()),
    );
    const hasKids = kidsList.length > 0;

    // Scale the editor's natural widths down to one landscape A4 if the menu
    // has enough courses to overflow it — the same job fitToWidth does on
    // screen. Never scale UP: a three-course menu keeps the editor's rhythm and
    // simply leaves the rest of the sheet empty, rather than sprawling.
    // The kids box floats on its own layer, so it takes no grid width.
    const natural = this.TITLE_W + this.COURSE_W * n;
    const scale = natural > this.PAGE_W ? this.PAGE_W / natural : 1;
    const courseW = Math.floor(this.COURSE_W * scale);
    const titleW = Math.floor(this.TITLE_W * scale);

    // Title cell: stands alone, rightmost — as on screen. The editor indents it
    // pt-[8%] from the top of the band; one leading space approximates that.
    const titleCell = new TableCell({
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 0, line: 360 }, // leading-loose, as in the editor
          children: [
            this.topPad(this.TITLE_PT),
            new TextRun({
              text: menu.menu_title,
              font: { name: this.FONT, eastAsia: this.FONT },
              size: this.TITLE_PT * 2,
            }),
          ],
        }),
      ],
      textDirection: TATEGAKI,
      verticalAlign: VerticalAlign.TOP, // top of the column under tbRlV
      margins: { top: 60, bottom: 60, left: 40, right: 40 },
      width: { size: titleW, type: WidthType.DXA },
      borders: this.noBorders(),
      // One unbroken column across the name band and the dish band.
      rowSpan: 2,
    });

    // Right-to-left reading order, produced by reversing the cells (the page is
    // left-to-right; only the cells are vertical). The title ends up rightmost,
    // then the courses run leftwards, as in the editor.
    // `isLast` means "draws no right-hand rule". Cells are emitted REVERSED,
    // so the course that ends up adjacent to the title column is index 0
    // (食前酒), not n-1. Guarding n-1 put a stray divider between 食前酒 and the
    // title — the dash under the menu title — while dropping the real one at
    // the far left edge.
    const nameCells = menu.courses.map((c, i) =>
      this.nameCell(c, i === 0, courseW),
    );

    // The kids callout gets its OWN column, between the title and the first
    // course — exactly where `.scan-kids-wrap` sits on screen (absolute,
    // bottom: 1.5rem; right: 10px, i.e. tucked under the title and spilling
    // left over 食前酒), and BOTTOM-anchored within it.
    //
    // It cannot live inside a course's dish cell: a nested table does not flow
    // along the vertical axis under tbRlV, so it always rendered at the top of
    // the column and shoved that course's dishes (梅酒) down the page.
    const dishCells = menu.courses.map((c, i) =>
      this.courseCell(c, i === 0, courseW),
    );

    // Emitted order: courses right-to-left, then the kids column, then the
    // title. The grid must match that order exactly, or Word maps the widths
    // to the wrong columns.
    const columnWidths = [...Array(n).fill(courseW), titleW];

    // A single full-height row holding every course plus the title.
    const body: (Table | Paragraph | Textbox)[] = [
      new Table({
        rows: [
          // TWO rows: a course-name band above a dish band. This is what gives
          // every course a shared top line — with the name inside the dish
          // cell, each course's dishes start wherever its own name happens to
          // end, which is what made the columns read as ragged and mixed.
          //
          // An earlier attempt at this DID break onto two pages, but the cause
          // was the page-height arithmetic (see PAGE_H), not the two-row
          // structure. With the measured ceiling the two rows fit together.
          new TableRow({
            children: [...nameCells.reverse(), titleCell],
            height: { value: this.NAME_H, rule: HeightRule.EXACT },
            cantSplit: true,
          }),
          new TableRow({
            // No title cell — its rowSpan already covers this row.
            children: [...dishCells.reverse()],
            height: { value: this.DISH_H, rule: HeightRule.EXACT },
            cantSplit: true,
          }),
        ],
        // FIXED so the declared widths are honoured. With AUTOFIT Word divides
        // the page between the columns instead, which is what spread eleven
        // courses across the sheet with large gaps between them.
        layout: TableLayoutType.FIXED,
        // REQUIRED, and the subtle one: under a fixed layout Word sizes columns
        // from <w:tblGrid>, NOT from each cell's <w:tcW>. Without this the
        // library emits a default grid of 100-twip columns (~7px) and every
        // course renders as a hairline strip crammed against its neighbour —
        // the real cause of the cramped upper-left block, which setting the
        // cell widths alone does not fix.
        columnWidths,
        width: {
          size: columnWidths.reduce((a, b) => a + b, 0),
          type: WidthType.DXA,
        },
        borders: this.noBorders(),
      }),
    ];

    // NOTE: the kids callout is NOT appended here. Anything placed after the
    // menu table lands below a table that already fills the sheet, so Word
    // spills it onto a second (or third) page. In the editor the kids box is
    // The kids callout(s) as floating TEXT BOXES on their own layer, pinned to
    // the page — lower-right, under the title and over the opening courses,
    // matching `.scan-kids-wrap` (absolute; bottom: 1.5rem; right: 10px).
    //
    // A shape, not a table: any second top-level TABLE forces Word to emit a
    // separating paragraph, which a full-page menu cannot absorb — every
    // floating-table variant measured (y=6000/7600/8600, before and after the
    // menu, dish row shrunk to 8400/8000/7600) produced 2 pages, while the
    // same document without it produced 1. A shape anchors inside an existing
    // paragraph run, so it adds no block content and no extra page.
    //
    // Coordinates are POINTS (VML uses pt, not twips): landscape A4 is
    // 842 x 595 pt. The box is placed clear of the title column on the right
    // and just above the bottom margin.
    if (hasKids) {
      const boxW = 120;
      const boxH = 78;
      const left = 842 - 20 - this.TITLE_PT * 2 - boxW;
      let top = 595 - 30 - boxH;
      for (const k of kidsList) {
        // Pushed directly, NOT wrapped in a Paragraph: Textbox already emits
        // its own block-level <w:p><w:pict>, and nesting <w:p> inside <w:p> is
        // invalid OOXML — Word refuses to open the file outright.
        body.push(this.kidsTextbox(k, { left, top, width: boxW, height: boxH }));
        top -= boxH + 10; // stack upwards if a menu ever has several
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: { orientation: PageOrientation.LANDSCAPE },
              // The top margin is deliberately larger than the others: under a
              // vertical flow the course names begin at the very top of their
              // column, so a 20pt margin left them sitting on the page edge.
              // PAGE_H is reduced by the same amount so the sheet still fits.
              margin: { top: 700, right: 400, bottom: 400, left: 400 },
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

    const packed = Buffer.from(await Packer.toBuffer(doc));
    return await this.postProcess(packed);
  }

  /**
   * Post-process the packed XML for the two things the `docx` package cannot
   * express: the kids shape's stroke, and upright Latin runs.
   *
   * VML defaults to `stroked="t"` with a solid black outline, and the `docx`
   * package emits only id/type/style on `<v:shape>` — there is no option to
   * change the stroke. That default outline is a full rectangle around the
   * shape, and because the shape carries `mso-fit-shape-to-text` it grows well
   * past its declared height, drawing a tall line beside the title column.
   * That line was the stray "dash" under the menu title: not a table rule (all
   * cell and table borders are emitted as `none` — verified) but this stroke.
   *
   * So the attributes are patched into the packed XML: stroke off would lose
   * the callout's outline entirely, so instead it is set to the editor's
   * dashed stone-grey (`.kids-box` is `border-2 border-dashed border-stone-400`).
   */
  private async postProcess(buf: Buffer): Promise<Buffer> {
    const zip = await JSZip.loadAsync(buf);
    const path = 'word/document.xml';
    const entry = zip.file(path);
    if (!entry) return buf;

    const xml = await entry.async('string');
    let patched = xml.replace(
      /<v:shape (?![^>]*\bstroked=)/g,
      '<v:shape filled="f" stroked="t" strokecolor="#A8A29E" strokeweight=".75pt" ',
    );

    // Latin runs: keep romaji reading LEFT-TO-RIGHT and upright at full size
    // inside the vertical column, instead of lying on its side with it. Runs
    // were tagged with LATIN_MARK in latinRuns(); the marker is removed here
    // and <w:eastAsianLayout w:vert="1" w:vertCompress="1"/> added to the rPr.
    //
    // All five candidates were rendered side by side through Word before
    // choosing this one:
    //   (none)                     OIL rotated 90 degrees with the column
    //   combine="1"                stacked into one slot, shrunk small
    //   combine + combineBrackets  same, no improvement
    //   vert="0"                   no-op (it is the default) - still rotated
    //   vert="1" vertCompress="1"  horizontal, upright, full size  <- this
    let tcyId = 100;
    patched = patched.replace(
      /<w:r>(\s*<w:rPr>)([\s\S]*?)(<\/w:rPr>\s*<w:t[^>]*>)\uFEFF/g,
      (_m, a, b, c) =>
        `<w:r>${a}${b}<w:eastAsianLayout w:id="${tcyId++}" w:vert="1" w:vertCompress="1"/>${c}`,
    );
    // Any marker that somehow survived (e.g. a run without rPr) is dropped so
    // it can never show up in the document text.
    patched = patched.split('\uFEFF').join('');

    if (patched === xml) return buf;

    zip.file(path, patched);
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }
}

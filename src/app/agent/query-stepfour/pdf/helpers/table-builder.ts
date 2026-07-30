import { zebraLayout } from './layout';
import { COLORS } from '../theme/colors';

export interface TableColumn {
  header: string;
  width: string | number;
  alignment?: 'left' | 'center' | 'right';
}

/**
 * Builds a styled, zebra-striped data table. Rows may be plain cell values
 * or pre-built pdfMake cell objects (for rowSpan, custom styling, etc.) —
 * this function does not mutate what the caller passes in.
 *
 * `unbreakableRowGroups`, if given, is an array of row-counts: each group of
 * N consecutive body rows is wrapped so it can't be split across a page
 * break mid-group (e.g. a day's worth of transport lines stays together).
 * Omit it to let pdfMake paginate row-by-row freely (the default, and the
 * right choice for very large tables where forcing atomicity would create
 * huge unbreakable blocks and awkward whitespace).
 */
export function buildDataTable(
  columns: TableColumn[],
  rows: any[][],
  opts: { headerColor?: string } = {},
): any {
  const header = columns.map(c => ({ text: c.header, style: 'tableHead', alignment: c.alignment }));
  return {
    table: {
      headerRows: 1,
      widths: columns.map(c => c.width),
      body: [header, ...rows],
      dontBreakRows: false,
    },
    layout: zebraLayout(opts.headerColor ?? COLORS.primary),
    margin: [0, 0, 0, 16],
  };
}

/** Wraps a group of pdfMake content nodes so they can never be split across
 *  a page boundary — pdfMake honors `unbreakable: true` on stack/table nodes. */
export function keepTogether(content: any[]): any {
  return { stack: content, unbreakable: true };
}

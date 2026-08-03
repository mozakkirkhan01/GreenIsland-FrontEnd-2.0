import { cardLayout, elevatedCardLayout, inset } from '../helpers/layout';
import { SPACING } from '../theme/spacing';
import { COLORS } from '../theme/colors';

export interface CardOptions {
  elevated?: boolean;
  fillColor?: string;
  padding?: number;
  marginBottom?: number;
  /** 0-100. Shrinks the card and centers it with empty side gutters instead
   *  of letting it span the full content width. Omit to stay full width. */
  insetPercent?: number;
}

/**
 * Wraps arbitrary pdfMake content in a bordered, padded "card" — the visual
 * base every other component (hotel card, price card, info box...) builds
 * on. A single-cell table is the only pdfMake primitive that gives full
 * control over border + fill + padding together.
 */
export function buildCard(content: any[], opts: CardOptions = {}): any {
  const pad = opts.padding ?? SPACING.md;
  const card = {
    table: {
      widths: ['*'],
      body: [[{
        stack: content,
        fillColor: opts.fillColor,
        margin: [pad, pad, pad, pad],
      }]],
    },
    layout: opts.elevated ? elevatedCardLayout : cardLayout,
    margin: [0, 0, 0, opts.marginBottom ?? SPACING.sm],
  };
  return opts.insetPercent ? inset(card, opts.insetPercent) : card;
}

/** Card with a colored accent bar down the left edge (used for hotel cards, info highlights). */
export function buildAccentCard(content: any[], accentColor = COLORS.primary, opts: CardOptions = {}): any {
  const pad = opts.padding ?? SPACING.md;
  const card = {
    table: {
      widths: [4, '*'],
      body: [[
        { text: '', fillColor: accentColor, border: [false, false, false, false] },
        { stack: content, margin: [pad, pad, pad, pad], border: [false, true, true, true], borderColor: [COLORS.border, COLORS.border, COLORS.border, COLORS.border] },
      ]],
    },
    layout: {
      hLineWidth: () => 0.75,
      vLineWidth: () => 0,
      hLineColor: () => COLORS.border,
      paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
    },
    margin: [0, 0, 0, opts.marginBottom ?? SPACING.sm],
  };
  return opts.insetPercent ? inset(card, opts.insetPercent) : card;
}

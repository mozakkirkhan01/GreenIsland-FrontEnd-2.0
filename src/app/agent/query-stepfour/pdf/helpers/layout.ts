import { COLORS } from '../theme/colors';

/**
 * pdfMake tables are the only primitive with per-side border/fill control,
 * so every "card", "rounded corner" and "shadow" in this design system is a
 * single-cell table with a custom layout function. True rounded corners
 * aren't possible in pdfMake — the illusion is generous padding + a hairline
 * border + a light fill, which reads as "soft" at print resolution.
 */

/** Plain card: thin border, no header, comfortable padding via caller's margin on the inner stack. */
export const cardLayout = {
  hLineWidth: () => 0.75,
  vLineWidth: () => 0.75,
  hLineColor: () => COLORS.border,
  vLineColor: () => COLORS.border,
  paddingLeft: () => 0,
  paddingRight: () => 0,
  paddingTop: () => 0,
  paddingBottom: () => 0,
};

/** Card with a subtle "elevation" — a slightly darker hairline than cardLayout,
 *  used for cards that need to visually sit above the page (price cards, hero cards). */
export const elevatedCardLayout = {
  ...cardLayout,
  hLineWidth: () => 1,
  vLineWidth: () => 1,
  hLineColor: () => COLORS.borderStrong,
  vLineColor: () => COLORS.borderStrong,
};

/** No border at all — used when the fillColor alone should read as a surface (banners, chips). */
export const fillOnlyLayout = {
  hLineWidth: () => 0,
  vLineWidth: () => 0,
  paddingLeft: () => 0,
  paddingRight: () => 0,
  paddingTop: () => 0,
  paddingBottom: () => 0,
};

/** Horizontal hairlines only, alternating row fill — used for data tables (transport, terms, pricing). */
export function zebraLayout(headerColor = COLORS.primary) {
  return {
    hLineWidth: (i: number) => (i === 0 ? 0 : 0.5),
    vLineWidth: () => 0,
    hLineColor: () => COLORS.border,
    fillColor: (rowIndex: number) => (rowIndex === 0 ? headerColor : rowIndex % 2 === 0 ? COLORS.bgLight : null),
    paddingLeft: () => 10,
    paddingRight: () => 10,
    paddingTop: () => 7,
    paddingBottom: () => 7,
  };
}

/**
 * A single colored accent bar as the left edge of a card/banner. Implemented
 * as a table cell (not a fixed-height canvas rect) so its fillColor stretches
 * to match whatever height the row ends up being — a canvas shape can't do
 * that since pdfMake sizes canvases before it knows the row's final height.
 * Use as the first cell of a 2-column table row: [accentBarCell(color), contentCell].
 */
export function accentBarCell(color: string): any {
  return { text: '', fillColor: color, border: [false, false, false, false] };
}

/**
 * Shrinks a content node to `percent`% of the available width and centers
 * it with empty side-gutter columns, instead of letting it span the full
 * content width — used by card/day-card/hotel-card/price-card so those
 * "brochure card" blocks read as insets rather than edge-to-edge rows.
 *
 * Was imported (`import { inset } from '../helpers/layout'`) from four
 * component files but never defined/exported here, which broke the build
 * for all of them.
 */
export function inset(content: any, percent: number): any {
  const side = Math.max(0, (100 - percent) / 2);
  if (side === 0) return content;
  return {
    columns: [
      { width: `${side}%`, text: '' },
      { width: `${percent}%`, ...content },
      { width: `${side}%`, text: '' },
    ],
  };
}

export const accentBarLayout = {
  hLineWidth: () => 0,
  vLineWidth: () => 0,
  paddingLeft: (i: number) => (i === 0 ? 0 : 12),
  paddingRight: (i: number) => (i === 0 ? 0 : 12),
  paddingTop: () => 10,
  paddingBottom: () => 10,
};

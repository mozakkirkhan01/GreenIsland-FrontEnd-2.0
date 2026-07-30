/**
 * pdfMake ships no icon font out of the box, and embedding one just for a
 * handful of glyphs isn't worth the font-loading complexity. These Unicode
 * symbols render with the default fonts and cover everything this PDF needs.
 */
export const ICONS = {
  check: '\u2713',
  cross: '\u2715',
  star: '\u2605',
  starOutline: '\u2606',
  pin: '\u2726',
  calendar: '\u25A3',
  clock: '\u25F7',
  phone: '\u260E',
  mail: '\u2709',
  globe: '\u25CE',
  arrowRight: '\u2192',
  dot: '\u2022',
  diamond: '\u25C6',
};

export function starRating(count: number, max = 5): string {
  const n = Math.max(0, Math.min(max, Math.round(count || 0)));
  return ICONS.star.repeat(n) + ICONS.starOutline.repeat(max - n);
}

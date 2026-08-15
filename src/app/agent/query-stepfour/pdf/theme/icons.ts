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

/**
 * Emoji glyphs used across footer/day-card/hotel-card/price-card. These
 * render fine with pdfMake's default fonts (same reasoning as ICONS above)
 * without needing an icon-font embed. Was imported (`import { EMOJI }
 * from '../theme/icons'`) from four component files but never exported,
 * which broke the build for all of them.
 */
export const EMOJI = {
  phone: '\u{1F4DE}',
  mail: '\u{2709}\u{FE0F}',
  globe: '\u{1F310}',
  pin: '\u{1F4CD}',
  calendar: '\u{1F4C5}',
  ticket: '\u{1F3AB}',
  hotel: '\u{1F3E8}',
  meal: '\u{1F37D}\u{FE0F}',
  bed: '\u{1F6CF}\u{FE0F}',
  guests: '\u{1F465}',
  sparkle: '\u{2728}',
  check: '\u{2713}',
};

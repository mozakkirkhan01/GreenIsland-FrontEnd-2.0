/** Central typographic scale — font sizes only; pdfMake styles compose these with COLORS. */
export const TYPE = {
  display: 30,
  h1: 24,
  h2: 18,
  h3: 14,
  h4: 12,
  body: 9.5,
  caption: 8,
  label: 8,
  small: 7.5,
};

/** Simulated letter-spacing for uppercase labels (pdfMake has no real tracking,
 *  so we insert thin spaces between characters where the effect matters — used
 *  sparingly, only for short labels/badges, never body text). */
export function tracked(text: string): string {
  return text.toUpperCase().split('').join('\u200a');
}

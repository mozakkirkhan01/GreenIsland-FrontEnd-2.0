/**
 * Pure formatting helpers with no pdfMake or Angular dependency. The
 * PdfBuildContext already carries a caller-supplied formatCurrency /
 * formatDateLong / ordinal (the app's canonical, locale-aware versions) —
 * these exist as safe fallbacks for the rare internal spot that needs a
 * quick format without threading the full context through.
 */

export function formatINR(amount: number): string {
  if (amount == null || isNaN(amount)) return '';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
}

export function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function slugify(value: string): string {
  return (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function truncate(text: string, max: number): string {
  if (!text || text.length <= max) return text || '';
  return text.slice(0, max - 1).trimEnd() + '\u2026';
}

/** Joins non-empty parts with a separator, dropping falsy entries — avoids
 *  "undefined • • Havelock" artifacts scattered through string-building code. */
export function joinNonEmpty(parts: Array<string | null | undefined>, sep = ' \u2022 '): string {
  return parts.filter(Boolean).join(sep);
}

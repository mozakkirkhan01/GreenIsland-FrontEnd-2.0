import { COLORS } from '../theme/colors';
import { TYPE } from '../theme/typography';

/** Outlined tag chip — lighter-weight than a badge, used for lists of amenities,
 *  similar-hotel names, or tags where many appear together and a solid fill
 *  would feel heavy. */
export function buildChip(label: string): any {
  return {
    table: { widths: ['auto'], body: [[{ text: label, fontSize: TYPE.small, color: COLORS.primary }]] },
    layout: {
      hLineWidth: () => 0.75, vLineWidth: () => 0.75,
      hLineColor: () => COLORS.accent, vLineColor: () => COLORS.accent,
      paddingLeft: () => 7, paddingRight: () => 7, paddingTop: () => 3, paddingBottom: () => 3,
      fillColor: () => COLORS.accentLight,
    },
  };
}

/** Wraps chips into a flowing row. pdfMake `columns` don't wrap automatically,
 *  so for long lists callers should chunk into multiple rows themselves;
 *  this helper handles the common case of a handful of short tags. */
export function buildChipRow(labels: string[], gap = 5): any {
  if (!labels.length) return null;
  return { columns: labels.map(l => ({ width: 'auto', ...buildChip(l) })), columnGap: gap };
}

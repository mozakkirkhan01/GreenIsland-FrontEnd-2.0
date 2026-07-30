import { COLORS } from '../theme/colors';
import { TYPE } from '../theme/typography';

export type BadgeTone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_COLORS: Record<BadgeTone, { fill: string; text: string }> = {
  primary: { fill: COLORS.primary, text: COLORS.textOnDark },
  accent: { fill: COLORS.accent, text: COLORS.textOnDark },
  success: { fill: COLORS.successLight, text: COLORS.success },
  warning: { fill: COLORS.warningLight, text: COLORS.warning },
  danger: { fill: COLORS.dangerLight, text: COLORS.danger },
  neutral: { fill: COLORS.bgLight, text: COLORS.textSecondary },
};

/**
 * A small pill-shaped label. pdfMake has no border-radius, so the "pill" is
 * simulated with a filled table cell and generous horizontal padding —
 * visually close enough at the sizes badges appear (12-20pt tall).
 */
export function buildBadge(label: string, tone: BadgeTone = 'primary'): any {
  const c = TONE_COLORS[tone];
  return {
    table: { widths: ['auto'], body: [[{ text: label.toUpperCase(), fontSize: TYPE.small, bold: true, color: c.text }]] },
    layout: {
      hLineWidth: () => 0, vLineWidth: () => 0,
      paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 3, paddingBottom: () => 3,
      fillColor: () => c.fill,
    },
  };
}

/** Inline row of badges with spacing between them. */
export function buildBadgeRow(badges: Array<{ label: string; tone?: BadgeTone }>): any {
  return {
    columns: badges.map(b => ({ width: 'auto', ...buildBadge(b.label, b.tone) })),
    columnGap: 6,
  };
}

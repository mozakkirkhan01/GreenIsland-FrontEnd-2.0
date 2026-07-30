import { COLORS } from '../theme/colors';
import { TYPE } from '../theme/typography';
import { SPACING } from '../theme/spacing';

/** Large section banner: colored left bar + light tinted background + title text. */
export function buildSectionTitle(title: string, subtitle?: string): any {
  return {
    table: {
      widths: [4, '*'],
      body: [[
        { text: '', fillColor: COLORS.accent, border: [false, false, false, false] },
        {
          stack: [
            { text: title, fontSize: TYPE.h3, bold: true, color: COLORS.primary },
            ...(subtitle ? [{ text: subtitle, fontSize: TYPE.caption, color: COLORS.textSecondary, margin: [0, 2, 0, 0] }] : []),
          ],
          fillColor: COLORS.primaryLight,
          margin: [SPACING.md, SPACING.sm, SPACING.md, SPACING.sm],
          border: [false, false, false, false],
        },
      ]],
    },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
    margin: [0, SPACING.xl, 0, SPACING.md],
  };
}

/** Smaller sub-heading used inside a section (e.g. "Option: Deluxe Package"). */
export function buildSubTitle(title: string): any {
  return { text: title, fontSize: TYPE.h4, bold: true, color: COLORS.primary, margin: [0, 0, 0, SPACING.sm] };
}

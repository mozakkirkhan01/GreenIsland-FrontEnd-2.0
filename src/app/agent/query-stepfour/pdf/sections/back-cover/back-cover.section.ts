import type { PdfBuildContext } from '../../quotation-pdf-engine';
import { COLORS } from '../../theme/colors';
import { TYPE } from '../../theme/typography';
import { SPACING } from '../../theme/spacing';
import { mergeThemeConfig } from '../../theme/theme.config';
import { EMOJI } from '../../theme/icons';

/**
 * Closing page: logo, agency name, contact details, head office address and
 * a short thank-you line — the quiet "back cover" every brochure ends on,
 * matching the reference PDF's final contact page.
 *
 * This was referenced from quotation-pdf-engine.ts (import
 * buildBackCoverSection) but the file did not exist, so the whole PDF
 * engine failed to build. Filled in to match the section-builder pattern
 * every other section already follows.
 */
export function buildBackCoverSection(ctx: PdfBuildContext): any[] {
  // BUG FIX: this previously used THEME_CONFIG directly and never applied
  // ctx.themeOverride, so a dynamic Company name/branding correctly shown
  // in the header/footer would still fall back to the hardcoded defaults
  // here on the closing page.
  const theme = mergeThemeConfig(ctx.themeOverride);
  const agencyName = ctx.agencyName || ctx.tripInfo?.AgencyName || theme.agency.name;
  const phone = ctx.agencyPhone || theme.agency.phone;
  const email = ctx.agencyEmail || theme.agency.email;
  const website = ctx.agencyWebsite || theme.agency.website;
  const address = ctx.agencyAddress || theme.agency.headOffice;

  return [
    {
      pageBreak: 'before',
      margin: [0, 220, 0, 0],
      stack: [
        ...(ctx.logoImage ? [{ image: ctx.logoImage, width: 90, alignment: 'center', margin: [0, 0, 0, 14] } as any] : []),
        { text: agencyName, fontSize: TYPE.h2, bold: true, color: COLORS.primaryDark, alignment: 'center' },
        {
          text: `${EMOJI.phone}  ${phone}`,
          alignment: 'center',
          color: COLORS.textSecondary,
          margin: [0, 14, 0, 3],
        },
        { text: `${EMOJI.mail}  ${email}`, alignment: 'center', color: COLORS.textSecondary, margin: [0, 0, 0, 3] },
        { text: `${EMOJI.globe}  ${website}`, alignment: 'center', color: COLORS.textSecondary, margin: [0, 0, 0, 16] },
        {
          canvas: [{ type: 'line', x1: 150, y1: 0, x2: 365, y2: 0, lineWidth: 0.75, lineColor: COLORS.border }],
          margin: [0, 0, 0, 16],
        },
        { text: address, alignment: 'center', fontSize: TYPE.small, color: COLORS.textMuted },
        {
          text: 'Thank you for choosing us — we look forward to hosting your journey.',
          alignment: 'center',
          italics: true,
          fontSize: TYPE.caption,
          color: COLORS.textSecondary,
          margin: [0, SPACING.xxl, 0, 0],
        },
      ],
    },
  ];
}

import type { PdfBuildContext } from '../../quotation-pdf-engine';
import { buildSectionTitle } from '../../components/section-title.component';
import { COLORS } from '../../theme/colors';
import { ICONS } from '../../theme/icons';
import { SPACING } from '../../theme/spacing';
import { forcePageBreakBefore } from '../../helpers/page-break';

export function buildInclusionSection(ctx: PdfBuildContext): any[] {
  if (ctx.removeTerms || (!ctx.inclusions.length && !ctx.exclusions.length)) return [];

  return [
    // Fresh page: previously ran on from wherever Day-Wise Itinerary ended.
    forcePageBreakBefore(buildSectionTitle('Inclusions & Exclusions')),
    {
      columns: [
        { width: '50%', stack: checklist(ctx.inclusions.map((i: any) => ctx.inclusionText(i)), ICONS.check, COLORS.success) },
        { width: '50%', stack: checklist(ctx.exclusions.map((e: any) => ctx.exclusionText(e)), ICONS.cross, COLORS.danger) },
      ],
      columnGap: SPACING.lg,
      margin: [0, 0, 0, SPACING.lg],
    },
  ];
}

function checklist(items: string[], glyph: string, color: string): any[] {
  return items.map(text => ({
    columns: [
      { width: 14, text: glyph, color, bold: true },
      { width: '*', text, style: 'body' },
    ],
    margin: [0, 0, 0, 4],
  }));
}

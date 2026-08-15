import type { PdfBuildContext } from '../../quotation-pdf-engine';
import { buildSectionTitle } from '../../components/section-title.component';
import { buildDataTable } from '../../helpers/table-builder';
import { COLORS } from '../../theme/colors';
import { TYPE } from '../../theme/typography';

/**
 * "Quote Price (N Package Categories/Options)" table — page 2 of the
 * reference brochure. One row per package: #, Option name, Total (INR).
 *
 * Previously this rendered marketing-style price cards ("GST Included ✓",
 * "Instant Confirmation ✓" — invented copy not backed by any data field)
 * and computed its own numbers two different, inconsistent ways:
 *   - totalLabel: preferred a raw PackageSummaries lookup over the
 *     already-correct packageQuotePrice() snapshot-first helper
 *   - perPersonLabel: total / totalGuestCount, a naive re-derivation that
 *     ignores the Overall-vs-Per-Person pricing strategy entirely and
 *     would show a "per person" figure even for Overall-priced packages
 *   - gstNote: hardcoded to "including {n}% GST" regardless of whether GST
 *     was actually enabled for this quote/package
 *
 * Fixed to do no pricing math at all: packageGrandTotal() is the single
 * saved snapshot total (already resolved to Overall vs Per-Person on the
 * component side), and isGstIncluded() is the single dynamic source for
 * whether the "(including GST)" / "(excluding GST)" caption applies.
 */
export function buildPackageSummarySection(ctx: PdfBuildContext): any[] {
  if (ctx.hideTotalPrice || !ctx.packageTypes.length) return [];

  const rows = ctx.packageTypes.map((pkg: any, idx: number) => {
    const total = ctx.packageGrandTotal(pkg.QuotePackageTypeId);
    const gstOn = ctx.isGstIncluded ? ctx.isGstIncluded(pkg.QuotePackageTypeId) : false;
    // Snapshot-first: packageGrandTotal() is already resolved to the correct
    // Overall vs Per-Person figure — this only decides whether to *also*
    // print the saved per-person category breakdown underneath it, never
    // recomputes the total itself.
    const isOverall = ctx.isOverallPricing ? ctx.isOverallPricing(pkg.QuotePackageTypeId) : true;
    const breakdown = !isOverall && ctx.guestCategoryTotals
      ? ctx.guestCategoryTotals(pkg.QuotePackageTypeId)
      : [];

    const priceStack: any[] = [
      { text: `${ctx.formatCurrency(total)} /-`, bold: true, fontSize: TYPE.h4, color: COLORS.textPrimary },
      {
        text: gstOn ? '(including GST)' : '(excluding GST)',
        italics: true,
        fontSize: TYPE.caption,
        color: COLORS.textMuted,
        margin: [0, 1, 0, 0],
      },
    ];

    if (!isOverall) {
      priceStack.push({
        text: 'PER PERSON PRICING',
        bold: true,
        fontSize: 6.5,
        color: COLORS.accent,
        margin: [0, 4, 0, 2],
      });
    }
    for (const b of breakdown) {
      priceStack.push({
        text: `${b.label} (${b.paxLabel}): ${ctx.formatCurrency(b.amount)}`,
        fontSize: TYPE.small,
        color: COLORS.textSecondary,
        margin: [0, 0, 0, 1],
      });
    }

    return [
      { text: String(idx + 1), fontSize: TYPE.body, color: COLORS.textPrimary, margin: [0, 6, 0, 6] },
      {
        text: pkg.PackageTypeName || `Option-${idx + 1}`,
        bold: true,
        fontSize: TYPE.body,
        color: COLORS.textPrimary,
        margin: [0, 6, 0, 6],
      },
      { stack: priceStack, margin: [0, 6, 0, 6] },
    ];
  });

  const count = rows.length;

  return [
    buildSectionTitle(
      'Quote Price',
      `${count} Package Categor${count > 1 ? 'ies' : 'y'}/Option${count > 1 ? 's' : ''}`,
    ),
    buildDataTable(
      [
        { header: '#', width: 28, alignment: 'left' },
        { header: 'Option', width: '*', alignment: 'left' },
        { header: 'Total (INR)', width: 170, alignment: 'left' },
      ],
      rows,
    ),
  ];
}

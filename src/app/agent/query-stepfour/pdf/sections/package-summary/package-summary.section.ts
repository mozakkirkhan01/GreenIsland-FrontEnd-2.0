import type { PdfBuildContext } from '../../quotation-pdf-engine';
import { buildSectionTitle } from '../../components/section-title.component';
import { buildPriceCardRow, PriceCardData } from '../../components/price-card.component';

/** One price card per package option, laid out in a single row (wraps to a
 *  new "row" of columns per 3 options to avoid cramming when there are many). */
export function buildPackageSummarySection(ctx: PdfBuildContext): any[] {
  if (ctx.hideTotalPrice || !ctx.packageTypes.length) return [];

  const cards: PriceCardData[] = ctx.packageTypes.map((pkg: any, idx: number) => {
    const snapshot = ctx.packageSummaries.find((s: any) => s.QuotePackageTypeId === pkg.QuotePackageTypeId);
    const total = snapshot ? snapshot.GrandTotal : ctx.packageQuotePrice(pkg.QuotePackageTypeId);
    return {
      optionLabel: `Option ${idx + 1}`,
      packageName: pkg.PackageTypeName,
      totalLabel: ctx.formatCurrency(total),
      gstNote: `including ${ctx.quoteHeader?.GstPercent || 5}% GST`,
      perPersonLabel: ctx.totalGuestCount ? `${ctx.formatCurrency(total / ctx.totalGuestCount)} per person` : undefined,
      isRecommended: idx === 0,
    };
  });

  const out: any[] = [buildSectionTitle(`Quote Price`, `${cards.length} package option${cards.length > 1 ? 's' : ''} available`)];

  for (let i = 0; i < cards.length; i += 3) {
    out.push(buildPriceCardRow(cards.slice(i, i + 3)));
  }
  return out;
}

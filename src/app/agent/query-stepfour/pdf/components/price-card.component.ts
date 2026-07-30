import { COLORS } from '../theme/colors';
import { TYPE } from '../theme/typography';
import { SPACING } from '../theme/spacing';
import { elevatedCardLayout } from '../helpers/layout';
import { buildBadge } from './badge.component';

export interface PriceCardData {
  optionLabel: string;     // "Option 1"
  packageName: string;     // "Deluxe Package"
  totalLabel: string;      // already-formatted "4,16,955"
  gstNote: string;         // "including 5% GST"
  perPersonLabel?: string;
  highlights?: string[];
  isRecommended?: boolean;
}

/** A single package price card — used in a row, one per package option. */
export function buildPriceCard(data: PriceCardData): any {
  const content: any[] = [
    {
      columns: [
        { width: '*', text: data.optionLabel, style: 'label' },
        ...(data.isRecommended ? [{ width: 'auto', ...buildBadge('Recommended', 'accent') }] : []),
      ],
    },
    { text: data.packageName, fontSize: TYPE.h4, bold: true, color: COLORS.primary, margin: [0, 3, 0, SPACING.sm] },
    { text: `\u20B9${data.totalLabel}`, style: 'priceLarge' },
    { text: data.gstNote, style: 'priceLabel', margin: [0, 1, 0, 0] },
    ...(data.perPersonLabel ? [{ text: data.perPersonLabel, style: 'small', margin: [0, 2, 0, 0] }] : []),
  ];

  if (data.highlights?.length) {
    content.push({
      ul: data.highlights,
      fontSize: TYPE.small,
      color: COLORS.textSecondary,
      margin: [0, SPACING.sm, 0, 0],
    });
  }

  return {
    table: { widths: ['*'], body: [[{ stack: content, margin: [SPACING.md, SPACING.md, SPACING.md, SPACING.md] }]] },
    layout: elevatedCardLayout,
    unbreakable: true,
  };
}

/** Row of price cards, one per package option, evenly split. */
export function buildPriceCardRow(cards: PriceCardData[]): any {
  const width = `${Math.floor(100 / cards.length)}%`;
  return {
    columns: cards.map(c => ({ width, ...buildPriceCard(c) })),
    columnGap: SPACING.md,
    margin: [0, 0, 0, SPACING.lg],
  };
}

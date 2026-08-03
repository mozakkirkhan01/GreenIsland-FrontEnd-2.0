import { COLORS } from '../theme/colors';
import { TYPE } from '../theme/typography';
import { SPACING } from '../theme/spacing';
import { EMOJI } from '../theme/icons';
import { elevatedCardLayout, inset } from '../helpers/layout';
import { buildBadge } from './badge.component';

export interface PriceCardData {
  optionLabel: string;     // "Option 1"
  packageName: string;     // "Deluxe Package"
  totalLabel: string;      // already-formatted "4,16,955"
  gstNote: string;         // "including 5% GST"
  perPersonLabel?: string;
  highlights?: string[];
  isRecommended?: boolean;
  starRating?: number;
}

/**
 * A single package price card: stars + RECOMMENDED badge up top, the
 * package name, a large per-person headline price with the full total as
 * a secondary line, and a short confidence checklist (GST included,
 * instant confirmation) — replacing the old plain white price rectangle.
 */
export function buildPriceCard(data: PriceCardData): any {
  const content: any[] = [];

  if (data.starRating) {
    content.push({ text: '\u2605'.repeat(data.starRating), fontSize: 10, color: COLORS.starColor, margin: [0, 0, 0, 4] });
  }

  content.push({
    columns: [
      { width: '*', text: data.optionLabel.toUpperCase(), style: 'label' },
      ...(data.isRecommended ? [{ width: 'auto', ...buildBadge('Recommended', 'accent') }] : []),
    ],
  });

  content.push({ text: data.packageName, fontSize: TYPE.h4, bold: true, color: COLORS.primary, margin: [0, 3, 0, SPACING.sm] });

  if (data.perPersonLabel) {
    content.push({ text: data.perPersonLabel, fontSize: 20, bold: true, color: COLORS.primaryDark, margin: [0, 0, 0, 1] });
    content.push({ text: 'PER PERSON', fontSize: 7, bold: true, color: COLORS.textMuted, margin: [0, 0, 0, 6] });
  }

  content.push({ text: `\u20B9${data.totalLabel} total`, fontSize: 11, bold: true, color: COLORS.textPrimary });
  content.push({ text: data.gstNote, style: 'priceLabel', margin: [0, 1, 0, SPACING.sm] });

  content.push({
    stack: [
      { text: [{ text: `${EMOJI.check}  `, color: COLORS.success, bold: true }, { text: 'GST Included', fontSize: TYPE.small, color: COLORS.textSecondary }], margin: [0, 1, 0, 1] },
      { text: [{ text: `${EMOJI.check}  `, color: COLORS.success, bold: true }, { text: 'Instant Confirmation', fontSize: TYPE.small, color: COLORS.textSecondary }], margin: [0, 1, 0, 1] },
    ],
  });

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

/** Row of price cards, one per package option, evenly split, inset with a
 *  side gutter so the row of cards doesn't touch the page's text margins. */
export function buildPriceCardRow(cards: PriceCardData[]): any {
  const width = `${Math.floor(100 / cards.length)}%`;
  return inset({
    columns: cards.map(c => ({ width, ...buildPriceCard(c) })),
    columnGap: SPACING.md,
    margin: [0, 0, 0, SPACING.lg],
  }, 96);
}

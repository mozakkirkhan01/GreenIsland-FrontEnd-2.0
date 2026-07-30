import { COLORS } from '../theme/colors';
import { PAGE_MARGINS } from '../theme/spacing';

export interface HeaderData {
  agencyName: string;
  logoImage: string | null;
  quotationLabel: string; // "Trip# 4001393"
  destinationName?: string;
}

/** Slim branded header: logo + agency name on the left, quote/destination on the right, hairline rule beneath. */
export function buildHeader(data: HeaderData, currentPage: number): any {
  if (currentPage === 1) return null;
  const [left, top, right] = PAGE_MARGINS;
  return {
    stack: [
      {
        columns: [
          data.logoImage
            ? { image: data.logoImage, width: 22, margin: [left, 10, 0, 0] }
            : { text: '', width: 22, margin: [left, 10, 0, 0] },
          { text: data.agencyName, bold: true, color: COLORS.primary, fontSize: 10, margin: [8, 12, 0, 0] },
          {
            text: [data.destinationName, data.quotationLabel].filter(Boolean).join('  \u2022  '),
            alignment: 'right', style: 'label', margin: [0, 13, right, 0],
          },
        ],
      },
      {
        canvas: [{ type: 'line', x1: left, y1: 4, x2: 555 - right, y2: 4, lineWidth: 0.75, lineColor: COLORS.border }],
      },
    ],
  };
}

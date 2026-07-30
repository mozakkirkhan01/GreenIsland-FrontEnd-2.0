import { COLORS } from '../theme/colors';
import { PAGE_MARGINS } from '../theme/spacing';

export interface FooterData {
  agencyName: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
}

/** Branded footer band: contact strip + right-aligned page count + copyright line. */
export function buildFooter(data: FooterData, currentPage: number, pageCount: number): any {
  const [left, , right] = PAGE_MARGINS;
  const contactParts = [data.phone, data.email, data.website].filter(Boolean);
  return {
    stack: [
      { canvas: [{ type: 'line', x1: left, y1: 0, x2: 555 - right, y2: 0, lineWidth: 0.75, lineColor: COLORS.border }] },
      {
        columns: [
          { text: contactParts.join('   \u2022   '), style: 'small', margin: [left, 6, 0, 0] },
          { text: `${currentPage} / ${pageCount}`, alignment: 'center', style: 'small', margin: [0, 6, 0, 0] },
          { text: `\u00A9 ${new Date().getFullYear()} ${data.agencyName}`, alignment: 'right', style: 'small', margin: [0, 6, right, 0] },
        ],
      },
    ],
  };
}

import { COLORS } from '../theme/colors';
import { PAGE_MARGINS } from '../theme/spacing';
import { THEME_CONFIG } from '../theme/theme.config';

export interface HeaderData {
  agencyName: string;
  logoImage: string | null;
  quotationLabel: string; // "Trip# 4001393"
  destinationName?: string;
  website?: string;
}

/**
 * Renders the top header bar matching Pages 2-11 of the reference brochure:
 * - Logo + Agency Title on the left
 * - Sky blue web badge pill on the top right
 * - Angled top green banner styling & crisp divider line
 */
export function buildHeader(data: HeaderData, currentPage: number): any {
  if (currentPage === 1) return null; // Cover page has custom hero layout
  const [left, , right] = PAGE_MARGINS;
  const webUrl = data.website || THEME_CONFIG.agency.website;

  return {
    stack: [
      {
        columns: [
          // Logo & Agency Name
          {
            width: '*',
            columns: [
              data.logoImage
                ? { image: data.logoImage, width: 26, margin: [left, 8, 6, 0] }
                : { text: '', width: 0 },
              {
                text: THEME_CONFIG.agency.shortName,
                fontSize: 16,
                bold: true,
                color: COLORS.primaryDark,
                margin: [data.logoImage ? 0 : left, 10, 0, 0],
              },
            ],
          },
          // Website Pill Badge Top Right
          {
            width: 'auto',
            table: {
              body: [
                [
                  {
                    text: `🌐  ${webUrl}`,
                    fontSize: 8.5,
                    bold: true,
                    color: COLORS.textOnDark,
                    fillColor: '#0284C7',
                    alignment: 'center',
                  },
                ],
              ],
            },
            layout: {
              defaultBorder: false,
              paddingLeft: () => 10,
              paddingRight: () => 10,
              paddingTop: () => 3,
              paddingBottom: () => 3,
            },
            margin: [0, 8, right, 0],
          },
        ],
      },
      // Green angled accent line below top header
      {
        canvas: [
          { type: 'line', x1: left, y1: 6, x2: 555 - right, y2: 6, lineWidth: 1.5, lineColor: COLORS.primary },
        ],
      },
    ],
  };
}

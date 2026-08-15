import { COLORS } from '../theme/colors';
import { PAGE_MARGINS } from '../theme/spacing';
import { THEME_CONFIG, ThemeConfig } from '../theme/theme.config';
import { truncate } from '../helpers/formatter';

export interface HeaderData {
  agencyName: string;
  logoImage: string | null;
  quotationLabel: string; // "Trip# 4001393"
  destinationName?: string;
  website?: string;
  /** Optional per-render theme (agency branding). Falls back to THEME_CONFIG. */
  theme?: ThemeConfig;
}

/**
 * Full-width green branded top strip on content pages (2+), matching the
 * reference brochure's solid teal/green header band: logo + agency name on
 * the left, website pill on the right, all on a filled color bar rather
 * than plain white with a thin rule underneath.
 */
export function buildHeader(data: HeaderData, currentPage: number): any {
  if (currentPage === 1) return null; // Cover page has its own full-bleed hero layout
  const theme = data.theme || THEME_CONFIG;
  const [left, , right] = PAGE_MARGINS;
  const webUrl = data.website || theme.agency.website;

  return {
    margin: [0, 0, 0, 0],
    table: {
      widths: ['*', 'auto'],
      body: [
        [
          {
            columns: [
              data.logoImage
                ? { image: data.logoImage, width: 22, margin: [left, 7, 6, 7] }
                : { text: '', width: 0 },
              {
                // BUG FIX: this previously ignored `data.agencyName` entirely
                // and always printed the THEME_CONFIG default ("GREEN
                // ISLAND"), even for a quote belonging to a different agency.
                // Full legal names ("DREAM LEISURE DESTINATIONS (INDIA) Pvt.
                // Ltd. (DREAM LEISURE)") are too long for this compact bar,
                // so truncate — the full name still appears on the cover and
                // summary sections.
                text: truncate((data.agencyName || theme.agency.shortName || theme.agency.name).toUpperCase(), 34),
                fontSize: 14,
                bold: true,
                color: COLORS.textOnDark,
                margin: [data.logoImage ? 0 : left, 9, 0, 0],
              },
            ],
            fillColor: COLORS.primary,
            border: [false, false, false, false],
          },
          {
            text: webUrl ? `${webUrl}` : '',
            fontSize: 8.5,
            bold: true,
            color: COLORS.textOnDark,
            alignment: 'right',
            margin: [0, 10, right, 0],
            fillColor: COLORS.primary,
            border: [false, false, false, false],
          },
        ],
      ],
    },
    layout: { defaultBorder: false, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
  };
}

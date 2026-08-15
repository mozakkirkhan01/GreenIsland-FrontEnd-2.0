import { COLORS } from '../theme/colors';
import { EMOJI } from '../theme/icons';
import { PAGE_MARGINS } from '../theme/spacing';
import { THEME_CONFIG, ThemeConfig } from '../theme/theme.config';
import { truncate } from '../helpers/formatter';

export interface FooterData {
  agencyName: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  /** Optional per-render theme (agency branding). Falls back to THEME_CONFIG. */
  theme?: ThemeConfig;
}

/**
 * Renders a compact branded footer: a hairline divider, an agency-name +
 * contact-icon row on the left, a "Page X of Y" counter on the right, and
 * a solid branch-office bar underneath — replacing the previous plain
 * centered contact line with a clearer, less noisy hierarchy.
 */
export function buildFooter(data: FooterData, currentPage: number, pageCount: number): any {
  const theme = data.theme || THEME_CONFIG;
  const [left, , right] = PAGE_MARGINS;
  const phone = data.phone || theme.agency.phone;
  const email = data.email || theme.agency.email;
  const website = data.website || theme.agency.website;
  const address = data.address || theme.agency.headOffice;

  const branches = theme.agency.branchOffices
    .map(b => `${b.label}: ${b.city}`)
    .join('  |  ');

  return {
    stack: [
      { canvas: [{ type: 'line', x1: left, y1: 0, x2: 555 - right, y2: 0, lineWidth: 0.5, lineColor: COLORS.border }] },

      {
        columns: [
          {
            width: '*',
            text: [
              {
                // BUG FIX: same as header.component.ts — this always printed
                // the THEME_CONFIG default agency name and ignored `data.agencyName`.
                text: `${truncate(data.agencyName || theme.agency.shortName, 40)}   `,
                fontSize: 8, bold: true, color: COLORS.primaryDark,
              },
              { text: `${EMOJI.phone} ${phone}   `, fontSize: 7.5, color: COLORS.textSecondary },
              { text: `${EMOJI.globe} ${website}   `, fontSize: 7.5, color: COLORS.textSecondary },
              { text: `${EMOJI.mail} ${email}   `, fontSize: 7.5, color: COLORS.textSecondary },
              { text: address ? `${EMOJI.pin} ${address}` : '', fontSize: 7.5, color: COLORS.textSecondary },
            ],
            margin: [left, 4, 0, 4],
          },
          {
            width: 'auto',
            text: `Page ${currentPage} of ${pageCount}`,
            fontSize: 7.5,
            color: COLORS.textMuted,
            margin: [0, 4, right, 4],
          },
        ],
      },

      {
        table: {
          widths: ['*'],
          body: [[
            {
              text: branches,
              fontSize: 8,
              bold: true,
              color: COLORS.textOnDark,
              fillColor: COLORS.primary,
              alignment: 'center',
            },
          ]],
        },
        layout: {
          defaultBorder: false,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
        margin: [0, 0, 0, 0],
      },
    ],
  };
}

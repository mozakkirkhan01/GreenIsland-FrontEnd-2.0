import { COLORS } from '../theme/colors';
import { EMOJI } from '../theme/icons';
import { PAGE_MARGINS } from '../theme/spacing';
import { THEME_CONFIG } from '../theme/theme.config';

export interface FooterData {
  agencyName: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
}

/**
 * Renders a compact branded footer: a hairline divider, an agency-name +
 * contact-icon row on the left, a "Page X of Y" counter on the right, and
 * a solid branch-office bar underneath — replacing the previous plain
 * centered contact line with a clearer, less noisy hierarchy.
 */
export function buildFooter(data: FooterData, currentPage: number, pageCount: number): any {
  const [left, , right] = PAGE_MARGINS;
  const phone = data.phone || THEME_CONFIG.agency.phone;
  const email = data.email || THEME_CONFIG.agency.email;
  const website = data.website || THEME_CONFIG.agency.website;

  const branches = THEME_CONFIG.agency.branchOffices
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
              { text: `${THEME_CONFIG.agency.shortName}   `, fontSize: 8, bold: true, color: COLORS.primaryDark },
              { text: `${EMOJI.phone} ${phone}   `, fontSize: 7.5, color: COLORS.textSecondary },
              { text: `${EMOJI.globe} ${website}   `, fontSize: 7.5, color: COLORS.textSecondary },
              { text: `${EMOJI.mail} ${email}`, fontSize: 7.5, color: COLORS.textSecondary },
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

import { COLORS } from '../theme/colors';

export interface SectionTitleData {
  title: string;
  subtitle?: string;
}

/**
 * Renders a luxury rounded section banner pill with a solid accent bar on the left edge,
 * matching the design in the Green Island luxury brochure.
 * Supports both object signature `{ title, subtitle }` and string signature `(title, subtitle)`.
 */
export function buildSectionBanner(titleOrData: string | SectionTitleData, subtitle?: string): any {
  const data: SectionTitleData = typeof titleOrData === 'string'
    ? { title: titleOrData, subtitle }
    : titleOrData;

  const contentStack: any[] = [
    {
      table: {
        widths: [4, '*'],
        body: [
          [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 4,
                  h: 24,
                  color: COLORS.bannerAccentBar,
                  r: 2,
                },
              ],
            },
            {
              text: data.title,
              fontSize: 13,
              bold: true,
              color: COLORS.bannerAccentBar,
              margin: [8, 4, 8, 4],
            },
          ],
        ],
      },
      layout: {
        defaultBorder: false,
        fillColor: () => COLORS.bannerFill,
        paddingLeft: () => 0,
        paddingRight: () => 12,
        paddingTop: () => 4,
        paddingBottom: () => 4,
      },
      margin: [0, 10, 0, data.subtitle ? 4 : 12],
    },
  ];

  if (data.subtitle) {
    contentStack.push({
      text: data.subtitle,
      fontSize: 10.5,
      bold: true,
      color: COLORS.primary,
      margin: [6, 0, 0, 12],
    });
  }

  return { stack: contentStack };
}

/** Alias for section builder backward compatibility */
export { buildSectionBanner as buildSectionTitle };

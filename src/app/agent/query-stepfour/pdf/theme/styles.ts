import { COLORS } from './colors';
import { TYPE } from './typography';

/** Named styles referenced by string from any section/component via `style: 'x'`. */
export const PDF_STYLES: Record<string, any> = {
  display: { fontSize: TYPE.display, bold: true, color: COLORS.textOnDark },
  h1: { fontSize: TYPE.h1, bold: true, color: COLORS.textPrimary },
  h2: { fontSize: TYPE.h2, bold: true, color: COLORS.textPrimary },
  h3: { fontSize: TYPE.h3, bold: true, color: COLORS.primary },
  h4: { fontSize: TYPE.h4, bold: true, color: COLORS.primary },
  body: { fontSize: TYPE.body, color: COLORS.textPrimary },
  caption: { fontSize: TYPE.caption, color: COLORS.textSecondary },
  label: { fontSize: TYPE.label, color: COLORS.textSecondary, characterSpacing: 0.5 },
  small: { fontSize: TYPE.small, color: COLORS.textMuted },
  value: { fontSize: 11, bold: true, color: COLORS.textPrimary },

  sectionBanner: {
    fontSize: TYPE.h3, bold: true, color: COLORS.primary,
    fillColor: COLORS.primaryLight, margin: [0, 14, 0, 10],
  },
  tableHead: { fontSize: TYPE.body, bold: true, color: COLORS.textOnDark, fillColor: COLORS.primary },
  tableHeadLight: { fontSize: TYPE.body, bold: true, color: COLORS.primary, fillColor: COLORS.primaryLight },

  badge: { fontSize: TYPE.small, bold: true, color: COLORS.textOnDark },
  chip: { fontSize: TYPE.small, color: COLORS.primary },

  priceLarge: { fontSize: 20, bold: true, color: COLORS.primary },
  priceLabel: { fontSize: TYPE.caption, color: COLORS.textSecondary },
};

export const PDF_DEFAULT_STYLE = { font: 'Roboto', fontSize: TYPE.body, color: COLORS.textPrimary };

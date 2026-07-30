import { COLORS } from '../theme/colors';
import { TYPE } from '../theme/typography';
import { cardLayout } from '../helpers/layout';
import { SPACING } from '../theme/spacing';

export interface InfoBoxField {
  label: string;
  value: string;
  helper?: string; // secondary line under the value, e.g. child ages
}

/** A single label/value info card (e.g. "DESTINATION — Andaman and Nicobar Islands"). */
export function buildInfoBox(field: InfoBoxField): any {
  return {
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: field.label.toUpperCase(), style: 'label' },
          { text: field.value, fontSize: 11, bold: true, color: COLORS.textPrimary, margin: [0, 2, 0, 0] },
          ...(field.helper ? [{ text: field.helper, style: 'small', margin: [0, 1, 0, 0] }] : []),
        ],
        margin: [SPACING.sm, SPACING.sm, SPACING.sm, SPACING.sm],
      }]],
    },
    layout: cardLayout,
  };
}

/** A responsive-ish row of info boxes, evenly split by column count. */
export function buildInfoGrid(fields: InfoBoxField[], columnCount = fields.length): any {
  const width = `${Math.floor(100 / columnCount)}%`;
  return {
    columns: fields.map(f => ({ width, ...buildInfoBox(f) })),
    columnGap: SPACING.sm,
    margin: [0, 0, 0, SPACING.md],
  };
}

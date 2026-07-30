import { COLORS } from '../theme/colors';
import { TYPE } from '../theme/typography';
import { SPACING } from '../theme/spacing';
import { cardLayout } from '../helpers/layout';
import { buildChipRow } from './chip.component';
import { starRating } from '../theme/icons';

export interface HotelCardData {
  nightLabel: string;         // e.g. "1st Night"
  locationName: string;
  checkInLabel: string;       // e.g. "Check-in on 11th July"
  hotelName: string;
  category?: string;          // e.g. "3* Deluxe"
  starCount?: number;
  roomType: string;
  roomCount: number;
  paxCount: number;
  mealPlan: string;
  similarHotelNames?: string[];
}

/**
 * A single accommodation card: colored header strip (night + location),
 * hotel name with star rating, and a two-column room/meal grid — this is
 * the visual unit repeated once per stay across the whole trip.
 */
export function buildHotelCard(data: HotelCardData): any {
  const header = {
    columns: [
      { width: '*', text: `${data.nightLabel} at ${data.locationName}`, fontSize: TYPE.h4, bold: true, color: COLORS.textOnDark },
      { width: 'auto', text: data.checkInLabel, style: 'small', color: COLORS.textOnDark, alignment: 'right' },
    ],
    fillColor: COLORS.primary,
    margin: [SPACING.md, SPACING.sm, SPACING.md, SPACING.sm],
  };

  const body: any[] = [
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: data.hotelName, fontSize: 12.5, bold: true, color: COLORS.textPrimary },
            ...(data.category || data.starCount
              ? [{ text: [data.starCount ? starRating(data.starCount) + '  ' : '', data.category || ''].join(''), style: 'small', color: COLORS.accent, margin: [0, 2, 0, 0] }]
              : []),
          ],
        },
      ],
      margin: [0, SPACING.sm, 0, SPACING.sm],
    },
    {
      columns: [
        { width: '50%', stack: [{ text: 'ROOMS', style: 'label' }, { text: `${data.roomCount} ${data.roomType || ''}`, bold: true, margin: [0, 2, 0, 0] }, { text: `${data.paxCount} Pax`, style: 'small' }] },
        { width: '50%', stack: [{ text: 'MEAL PLAN', style: 'label' }, { text: data.mealPlan || '-', bold: true, margin: [0, 2, 0, 0] }] },
      ],
    },
  ];

  if (data.similarHotelNames?.length) {
    const chips = buildChipRow(data.similarHotelNames);
    body.push({ text: 'Similar Alternatives', style: 'label', margin: [0, SPACING.sm, 0, 4] });
    if (chips) body.push(chips);
  }

  return {
    stack: [
      { table: { widths: ['*'], body: [[header]] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 } },
      { table: { widths: ['*'], body: [[{ stack: body, margin: [SPACING.md, SPACING.sm, SPACING.md, SPACING.md] }]] }, layout: { ...cardLayout, hLineWidth: (i: number) => (i === 0 ? 0 : 0.75) } },
    ],
    unbreakable: true,
    margin: [0, 0, 0, SPACING.md],
  };
}

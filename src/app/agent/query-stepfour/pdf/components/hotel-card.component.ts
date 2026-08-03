import { COLORS } from '../theme/colors';
import { EMOJI } from '../theme/icons';
import { SPACING } from '../theme/spacing';
import { elevatedCardLayout, inset } from '../helpers/layout';
import { buildChipRow } from './chip.component';

export interface HotelCardData {
  nightLabel: string;        // e.g. "1st Night at Port Blair" or "2nd 3rd Nights at Havelock"
  checkInDate: string;       // e.g. "Check-in on 11th July"
  checkOutDate?: string;     // e.g. "Check-out on 12th July"
  hotelName: string;
  locationName?: string;
  categoryName?: string;
  starRating?: number;
  roomsText: string;         // e.g. "20 Deluxe Room"
  paxText: string;           // e.g. "40 Pax"
  mealPlanText: string;      // e.g. "Dinner + Breakfast + Lunch"
  specialInclusion?: string;
  similarHotels?: string[];
}

/** A single labeled field in the hotel card's detail grid (Check In / Check
 *  Out / Meal / Room / Guests) — icon + label stacked over the value. */
function detailField(icon: string, label: string, value: string): any {
  return {
    stack: [
      { text: `${icon}  ${label.toUpperCase()}`, fontSize: 7.5, bold: true, color: COLORS.textMuted, margin: [0, 0, 0, 2] },
      { text: value || '\u2014', fontSize: 9.5, bold: true, color: COLORS.textPrimary },
    ],
  };
}

function hairline(): any {
  return {
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5, lineColor: COLORS.border }],
    margin: [0, 8, 0, 8],
  };
}

/**
 * Renders a hotel as a self-contained "brochure" card rather than a table
 * row: a tinted header strip (icon, night badge, name, stars, location),
 * a divider, a detail grid, and optional special-inclusion / similar-hotel
 * callouts — matching the card mock-up in the design review rather than
 * the previous plain stacked-rows layout.
 */
export function buildHotelCard(data: HotelCardData): any {
  const starsStr = data.starRating
    ? '\u2605'.repeat(data.starRating) + '\u2606'.repeat(Math.max(0, 5 - data.starRating))
    : (data.categoryName || '');

  const headerStack: any[] = [
    {
      columns: [
        {
          width: '*',
          text: [
            { text: `${EMOJI.hotel}  `, fontSize: 13 },
            { text: data.hotelName.toUpperCase(), fontSize: 13, bold: true, color: COLORS.primaryDark },
          ],
        },
        {
          width: 'auto',
          table: { widths: ['auto'], body: [[{ text: data.nightLabel, fontSize: 8, bold: true, color: COLORS.badgeText, fillColor: COLORS.badgeBg }]] },
          layout: { defaultBorder: false, paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 3, paddingBottom: () => 3 },
        },
      ],
    },
  ];

  if (starsStr) headerStack.push({ text: starsStr, fontSize: 9, color: COLORS.starColor, margin: [0, 3, 0, 0] });
  if (data.locationName) {
    headerStack.push({ text: `${EMOJI.pin}  ${data.locationName}`, fontSize: 8.5, color: COLORS.textSecondary, margin: [0, 3, 0, 0] });
  }

  const detailGrid = {
    columns: [
      detailField(EMOJI.calendar, 'Check In', data.checkInDate),
      ...(data.checkOutDate ? [detailField(EMOJI.calendar, 'Check Out', data.checkOutDate)] : []),
      detailField(EMOJI.meal, 'Meal', data.mealPlanText),
      detailField(EMOJI.bed, 'Room', data.roomsText),
      detailField(EMOJI.guests, 'Guests', data.paxText),
    ],
    columnGap: SPACING.sm,
  };

  const body: any[] = [...headerStack, hairline(), detailGrid];

  if (data.specialInclusion) {
    body.push(hairline(), {
      text: [
        { text: `${EMOJI.sparkle}  `, fontSize: 9 },
        { text: 'SPECIAL INCLUSION  ', fontSize: 7.5, bold: true, color: COLORS.accent },
        { text: data.specialInclusion, fontSize: 9, color: COLORS.textPrimary },
      ],
    });
  }

  if (data.similarHotels?.length) {
    body.push(hairline(), { text: 'SIMILAR HOTELS', fontSize: 7.5, bold: true, color: COLORS.textMuted, margin: [0, 0, 0, 4] }, buildChipRow(data.similarHotels));
  }

  const card = {
    table: { widths: ['*'], body: [[{ stack: body, margin: [SPACING.lg, SPACING.md, SPACING.lg, SPACING.md] }]] },
    layout: elevatedCardLayout,
    unbreakable: true,
    margin: [0, 0, 0, SPACING.lg],
  };

  return inset(card, 96);
}

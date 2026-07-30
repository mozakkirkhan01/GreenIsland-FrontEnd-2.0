import { COLORS } from '../theme/colors';

/**
 * Day-number badge for the itinerary timeline (large ordinal + "Day" label,
 * in the brand color) — sits in the left column next to each day's content.
 * The connecting vertical line between days is intentionally omitted: a
 * canvas line's height can't track the variable height of each day's text
 * block in pdfMake, and a fixed-height line either overshoots short days or
 * falls short of long ones. The numbered badges alone read clearly as a
 * sequence without it.
 */
export function buildDayBadge(dayNumber: number, ordinalSuffix: string, width = 56): any {
  return {
    width,
    stack: [
      { text: String(dayNumber), fontSize: 22, bold: true, color: COLORS.primary },
      { text: `${ordinalSuffix} Day`.toUpperCase(), style: 'small' },
    ],
  };
}

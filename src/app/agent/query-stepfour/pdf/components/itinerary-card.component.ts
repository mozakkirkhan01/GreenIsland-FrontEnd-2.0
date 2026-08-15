import { COLORS } from '../theme/colors';
import { TYPE } from '../theme/typography';
import { SPACING } from '../theme/spacing';
import { buildDayBadge } from './timeline.component';

export interface ItineraryDaySection {
  heading: string;
  bodyContent: any[]; // already-converted pdfMake content (plain text node or htmlToPdfMake output)
}

export interface ItineraryCardData {
  dayNumber: number;
  ordinalSuffix: string;
  dateLabel: string;
  title: string;
  introContent: any[];
  sections: ItineraryDaySection[];
  /** Activity/transport line items included on this day (e.g. "Cellular Jail Entry Ticket"),
   *  from ctx.activityGroupsForDay() — shown as small "+" tagged rows under the description,
   *  mirroring the reference brochure's day-wise included-service list. */
  includedItems?: string[];
}

/** One full day of the itinerary: badge + date/title + intro + labeled sub-sections + included services. */
export function buildItineraryCard(data: ItineraryCardData): any {
  return {
    columns: [
      buildDayBadge(data.dayNumber, data.ordinalSuffix),
      {
        width: '*',
        stack: [
          { text: data.dateLabel, style: 'label' },
          { text: data.title, fontSize: TYPE.h4, bold: true, color: COLORS.primary, margin: [0, 2, 0, SPACING.xs] },
          ...data.introContent,
          ...data.sections.flatMap(s => ([
            { text: s.heading, bold: true, fontSize: TYPE.body, color: COLORS.textPrimary, margin: [0, SPACING.sm, 0, 2] },
            ...s.bodyContent,
          ])),
          ...(data.includedItems?.length ? [{
            stack: data.includedItems.map(item => ({
              text: [
                { text: '+  ', bold: true, color: COLORS.accent },
                { text: item, color: COLORS.primaryDark, bold: true, fontSize: TYPE.small },
              ],
              margin: [0, 3, 0, 0] as [number, number, number, number],
            })),
            margin: [0, SPACING.sm, 0, 0],
          }] : []),
        ],
      },
    ],
    columnGap: SPACING.md,
    margin: [0, 0, 0, SPACING.lg],
  };
}

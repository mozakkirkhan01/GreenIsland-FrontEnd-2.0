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
}

/** One full day of the itinerary: badge + date/title + intro + labeled sub-sections. */
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
        ],
      },
    ],
    columnGap: SPACING.md,
    margin: [0, 0, 0, SPACING.lg],
    unbreakable: true,
  };
}

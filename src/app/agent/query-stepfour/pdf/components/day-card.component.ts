import { COLORS } from '../theme/colors';
import { EMOJI } from '../theme/icons';
import { SPACING } from '../theme/spacing';
import { elevatedCardLayout, inset } from '../helpers/layout';

export interface DayCardData {
  dayNumber: number;
  ordinalStr: string;        // e.g. "1st"
  dateHeaderStr: string;     // e.g. "Saturday 11th July, 2026"
  title: string;             // e.g. "Port Blair Arrival - Airport Pick Up..."
  introText?: string;
  introContent?: any[];
  sections?: { heading: string; bodyContent: any[] | string }[];
  subActivityCards?: { dateStr: string; text: string }[];
  /** Small icon+label chips summarizing the day at a glance, e.g.
   *  "📍 Havelock", "🚌 Transfer", "🍽 Meals Included". */
  metaChips?: string[];
}

/**
 * Renders one itinerary day as a self-contained card: a green day badge,
 * a meta chip row (location / transfer / meals at a glance), the story
 * intro, bulleted points of interest, and activity sub-cards — replacing
 * the previous borderless table row so each day reads as a distinct block
 * rather than a continuous wall of text.
 */
export function buildDayCard(data: DayCardData): any {
  const contentStack: any[] = [];

  contentStack.push(
    { text: data.dateHeaderStr, fontSize: 8.5, bold: true, color: COLORS.textSecondary, margin: [0, 0, 0, 2] },
    { text: data.title, fontSize: 12.5, bold: true, color: COLORS.primaryDark, margin: [0, 0, 0, 6] },
  );

  if (data.metaChips?.length) {
    contentStack.push({
      columns: data.metaChips.map(c => ({
        width: 'auto',
        table: { widths: ['auto'], body: [[{ text: c, fontSize: 8, bold: true, color: COLORS.primaryDark }]] },
        layout: {
          defaultBorder: false,
          fillColor: () => COLORS.primaryLight,
          paddingLeft: () => 7, paddingRight: () => 7, paddingTop: () => 3, paddingBottom: () => 3,
        },
      })),
      columnGap: 6,
      margin: [0, 0, 0, 8],
    });
  }

  if (data.introText) {
    contentStack.push({
      text: data.introText,
      fontSize: 9.5,
      color: COLORS.textPrimary,
      lineHeight: 1.3,
      margin: [0, 0, 0, 8],
    });
  }

  if (data.introContent && data.introContent.length > 0) {
    contentStack.push(...data.introContent);
  }

  if (data.sections && data.sections.length > 0) {
    data.sections.forEach(sec => {
      if (sec.heading) {
        contentStack.push({
          text: [{ text: `${EMOJI.pin}  `, fontSize: 9 }, { text: sec.heading, fontSize: 10, bold: true, color: COLORS.textPrimary }],
          margin: [0, 4, 0, 2],
        });
      }
      if (sec.bodyContent) {
        if (Array.isArray(sec.bodyContent)) {
          contentStack.push(...sec.bodyContent);
        } else {
          contentStack.push({
            text: sec.bodyContent,
            fontSize: 9,
            color: COLORS.textSecondary,
            lineHeight: 1.25,
            margin: [0, 0, 0, 6],
          });
        }
      }
    });
  }

  if (data.subActivityCards && data.subActivityCards.length > 0) {
    data.subActivityCards.forEach(sub => {
      contentStack.push({
        table: {
          widths: [20, '*'],
          body: [[
            { text: EMOJI.ticket, fontSize: 11, alignment: 'center' },
            {
              stack: [
                { text: sub.dateStr, fontSize: 7.5, color: COLORS.textMuted },
                { text: sub.text, fontSize: 9.5, bold: true, color: COLORS.primaryDark },
              ],
            },
          ]],
        },
        layout: {
          defaultBorder: false,
          fillColor: () => COLORS.badgeBg,
          paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 5, paddingBottom: () => 5,
        },
        margin: [0, 4, 0, 4],
      });
    });
  }

  const dayBadge = {
    width: 48,
    table: {
      widths: [44],
      body: [[{
        stack: [
          { text: data.ordinalStr, fontSize: 15, bold: true, color: COLORS.textOnDark, alignment: 'center' },
          { text: 'DAY', fontSize: 7.5, bold: true, color: COLORS.textOnDark, alignment: 'center' },
        ],
        fillColor: COLORS.primary,
      }]],
    },
    layout: { defaultBorder: false, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 10, paddingBottom: () => 10 },
  };

  const card = {
    table: {
      widths: [56, '*'],
      body: [[dayBadge, { stack: contentStack, margin: [SPACING.md, SPACING.sm, 0, SPACING.sm] }]],
    },
    layout: elevatedCardLayout,
    unbreakable: true,
    margin: [0, 0, 0, SPACING.lg],
  };

  return inset(card, 96);
}

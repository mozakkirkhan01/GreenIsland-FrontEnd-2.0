import type { PdfBuildContext } from '../../quotation-pdf-engine';
import { buildSectionTitle } from '../../components/section-title.component';
import { buildItineraryCard } from '../../components/itinerary-card.component';
import { htmlToPdfMake } from '../../helpers/html-to-pdfmake';

const looksLikeHtml = (value: string | null | undefined): boolean =>
  !!value && /<\/?[a-z][\s\S]*>/i.test(value);

export function buildItinerarySection(ctx: PdfBuildContext): any[] {
  if (ctx.removeItinerary) return [];

  const days = ctx.daySlots.filter((d: any) => ctx.daySchedule(d.dayNumber));
  if (!days.length) return [];

  const out: any[] = [buildSectionTitle('Day-Wise Itinerary', 'What to expect, day by day')];

  for (const day of days) {
    const sched = ctx.daySchedule(day.dayNumber)!;
    out.push(buildItineraryCard({
      dayNumber: day.dayNumber,
      ordinalSuffix: ctx.ordinal(day.dayNumber),
      dateLabel: ctx.formatDateLong(day.date),
      title: sched.title,
      introContent: toContent(ctx, sched.intro),
      sections: sched.sections.map((s: any) => ({ heading: s.heading, bodyContent: toContent(ctx, s.body) })),
    }));
  }
  return out;
}

function toContent(ctx: PdfBuildContext, value: string): any[] {
  if (!value) return [];
  return looksLikeHtml(value)
    ? htmlToPdfMake(ctx.sanitizeHtml(value))
    : [{ text: value, margin: [0, 2, 0, 4] }];
}

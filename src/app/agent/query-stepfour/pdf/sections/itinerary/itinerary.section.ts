import type { PdfBuildContext } from '../../quotation-pdf-engine';
import { buildSectionTitle } from '../../components/section-title.component';
import { buildItineraryCard } from '../../components/itinerary-card.component';
import { htmlToPdfMake, markdownFallbackToPdfMake, looksLikeHtml } from '../../helpers/html-to-pdfmake';
import { forcePageBreakBefore } from '../../helpers/page-break';

/**
 * Day-wise itinerary, sourced from the rich-text (Quill) editor content the
 * user types in on the quote-builder step, one block per day.
 *
 * Previously this ran `ctx.daySchedule()` — a hand-rolled parser that split
 * the schedule text on blank lines and lines starting with "•" — through
 * `toContent()`, which only treated the string as HTML if it *also* matched
 * an HTML-tag regex. Quill always emits real HTML (`<p>…</p>`, `<ul><li>…`,
 * etc.), never blank-line/bullet-prefixed plain text, so that parser split
 * each day's schedule into one giant unparsed blob containing literal
 * `<p>`/`<strong>` tags instead of rendering it. The regex fallback rarely
 * even triggered because a full Quill document reliably contains a `<`,
 * so in practice this produced walls of raw tag soup in the PDF.
 *
 * Fix: render the actual Quill HTML directly — sanitize it via
 * `ctx.sanitizeHtml` (Angular's DomSanitizer, wired in from
 * query-stepfour.ts) and convert it with the existing `htmlToPdfMake`
 * helper, the same helper already used for Terms & Conditions.
 */
export function buildItinerarySection(ctx: PdfBuildContext): any[] {
  if (ctx.removeItinerary) return [];

  const days = ctx.daySlots.filter((d: any) => {
    const raw = ctx.rawDaySchedule(d.dayNumber);
    return !!raw && raw.trim().length > 0;
  });
  if (!days.length) return [];

  // Fresh page: Day-Wise Itinerary previously ran straight on from wherever
  // Transportation/Activities happened to end, instead of starting clean
  // like every other major section in the reference brochure.
  const out: any[] = [forcePageBreakBefore(buildSectionTitle('Day-Wise Itinerary', 'What to expect, day by day'))];

  for (const day of days) {
    const sched = ctx.daySchedule(day.dayNumber);
    const rawHtml = ctx.rawDaySchedule(day.dayNumber) || '';
    const sanitized = ctx.sanitizeHtml(rawHtml);

    // Some DaySchedule content is real Quill HTML; some is plain text with
    // literal Markdown-style `**bold**` / `- bullet` markers (e.g. copied
    // in directly rather than typed in the rich editor). Route each to the
    // converter that actually understands its syntax instead of always
    // assuming HTML and leaking raw `**`/`-` characters into the PDF.
    const introContent = looksLikeHtml(sanitized)
      ? htmlToPdfMake(sanitized)
      : markdownFallbackToPdfMake(sanitized);

    const includedItems = ctx.removeTransportActivities
      ? []
      : ctx.activityGroupsForDay(day.dayNumber).map((g: any) => ctx.activityGroupTitle(g)).filter(Boolean);

    out.push(buildItineraryCard({
      dayNumber: day.dayNumber,
      ordinalSuffix: ctx.ordinal(day.dayNumber),
      dateLabel: ctx.formatDateLong(day.date),
      title: sched?.title || '',
      introContent,
      sections: [],
      includedItems,
    }));
  }
  return out;
}

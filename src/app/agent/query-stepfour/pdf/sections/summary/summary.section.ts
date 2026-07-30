import type { PdfBuildContext } from '../../quotation-pdf-engine';
import { buildInfoGrid } from '../../components/info-box.component';
import { SPACING } from '../../theme/spacing';

/** Executive summary: personal greeting + a 4-up info grid (destination, dates, duration, pax). */
export function buildSummarySection(ctx: PdfBuildContext): any[] {
  const trip = ctx.tripInfo;
  const childCount = Math.max((ctx.totalGuestCount || 0) - (trip?.NoOfAdults || 0), 0);
  const childAges = safeParseAges(trip?.ChildrenAges);

  return [
    { text: `Dear ${trip?.ContactName || 'Guest'},`, style: 'h2' },
    { text: `Greetings from ${trip?.AgencyName || 'us'}.`, margin: [0, 4, 0, 4] },
    {
      text: 'Our team has curated this quotation for your upcoming journey. Please review the details below, and let us know if you would like any adjustments to the services included.',
      style: 'body', color: undefined, margin: [0, 0, 0, SPACING.md],
    },
    buildInfoGrid([
      { label: 'Destination', value: trip?.DestinationName || '' },
      { label: 'Start Date', value: ctx.formatDateLong(trip?.StartDate) },
      { label: 'Duration', value: ctx.durationLabel },
      {
        label: 'Pax',
        value: `${trip?.NoOfAdults || 0} Adults${childCount ? `, ${childCount} Children` : ''}`,
        helper: childAges.length ? `Ages: ${childAges.join(', ')}` : undefined,
      },
    ], 4),
  ];
}

function safeParseAges(raw: any): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

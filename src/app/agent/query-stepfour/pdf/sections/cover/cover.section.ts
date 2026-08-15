import type { PdfBuildContext } from '../../quotation-pdf-engine';
import { COLORS } from '../../theme/colors';
import { TYPE } from '../../theme/typography';
import { buildInfoBox } from '../../components/info-box.component';
import { pageBreakMarker } from '../../helpers/page-break';

/**
 * Cover page: hero image, then a dark headline band, then a Trip ID /
 * Consultant info-card row — all in normal document flow, one below the
 * other.
 *
 * PREVIOUSLY this absolutely-positioned the headline text and info-box row
 * over the image at hardcoded y-offsets (e.g. `margin: [0, 210, ...]`),
 * assuming the image would render at a specific height. pdfMake sizes an
 * `image` node from its own aspect ratio when only `width` is given — a
 * destination cover photo can be any shape, so that assumed height was
 * frequently wrong. When it was, the agency-name/headline text landed
 * partway down the photo instead of below it, overlapping whatever the
 * photo itself contained at that point (visible as garbled, illegible
 * text stacked on top of the image in real renders).
 *
 * FIX: give the image a fixed box via `fit` (scales down, preserves aspect
 * ratio, never distorts or overflows) and place every other cover element
 * as normal in-flow content directly after it. Nothing is absolutely
 * positioned, so nothing can ever overlap regardless of the source photo's
 * actual dimensions — this holds for any destination image.
 */
const HERO_WIDTH = 515;
const HERO_HEIGHT = 300;

export function buildCoverSection(ctx: PdfBuildContext): any[] {
  const trip = ctx.tripInfo;
  const endDate = computeEndDate(trip);
  const items: any[] = [];

  if (ctx.coverImage) {
    items.push({
      image: ctx.coverImage,
      fit: [HERO_WIDTH, HERO_HEIGHT],
      alignment: 'center',
      margin: [0, 0, 0, 0],
    });
  }

  items.push(buildHeadlineBand(ctx, trip));
  items.push(buildInfoRow(ctx, trip, endDate));
  items.push(pageBreakMarker());

  return items;
}

/**
 * Solid dark band (not overlaid on the photo) carrying the agency name,
 * tagline and destination — guaranteed legible white-on-dark regardless of
 * what the photo above it looks like, and guaranteed not to collide with
 * anything since it's a normal block that follows the image in flow.
 */
function buildHeadlineBand(ctx: PdfBuildContext, trip: any): any {
  const content: any[] = [];
  const name = trip?.AgencyName || ctx.agencyName;
  if (name) {
    content.push({ text: name, fontSize: TYPE.h2, bold: true, color: COLORS.textOnDark, alignment: 'center', margin: [0, 0, 0, 8] });
  }
  content.push({ text: "It's Time to Explore", fontSize: 15, alignment: 'center', color: COLORS.accentLight, margin: [0, 0, 0, 2] });
  content.push({ text: (trip?.DestinationName || '').toUpperCase(), style: 'display', alignment: 'center' });

  return {
    table: { widths: ['*'], body: [[{ stack: content, margin: [24, 30, 24, 30] }]] },
    layout: {
      hLineWidth: () => 0, vLineWidth: () => 0,
      paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
      fillColor: () => COLORS.bgDark,
    },
    margin: [0, 0, 0, 0],
  };
}

function buildInfoRow(ctx: PdfBuildContext, trip: any, endDate: Date | null): any {
  return {
    columns: [
      { width: '55%', ...buildInfoBox(tripInfoField(ctx, endDate)) },
      { width: '45%', ...buildInfoBox({ label: 'Your Holiday Consultant', value: trip?.SalesPersonName || '-' }) },
    ],
    columnGap: 12,
    margin: [0, 24, 0, 0],
  };
}

function tripInfoField(ctx: PdfBuildContext, endDate: Date | null) {
  const trip = ctx.tripInfo;
  return {
    label: 'Trip ID',
    value: `#${ctx.formatQuotationNo(trip?.QuotationNo)}`,
    helper: `${trip?.ContactName || 'Guest'}  \u2022  ${ctx.formatDateShort(trip?.StartDate)} \u2013 ${ctx.formatDateShort(endDate)} (${ctx.durationLabel})`,
  };
}

function computeEndDate(trip: any): Date | null {
  if (!trip?.StartDate) return null;
  const d = new Date(trip.StartDate);
  d.setDate(d.getDate() + Number(trip?.NoOfNights || 0));
  return d;
}

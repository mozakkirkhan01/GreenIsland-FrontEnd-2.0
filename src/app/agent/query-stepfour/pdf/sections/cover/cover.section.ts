import type { PdfBuildContext } from '../../quotation-pdf-engine';
import { COLORS } from '../../theme/colors';
import { TYPE } from '../../theme/typography';
import { buildInfoBox } from '../../components/info-box.component';
import { pageBreakMarker } from '../../helpers/page-break';

/**
 * Cover page: hero image with a dark gradient wash at the bottom (simulated
 * with three stacked semi-transparent rects, since pdfMake canvases support
 * flat fills, not real CSS gradients) so light-on-dark title text stays
 * legible over any photo. Below the fold, a two-card meta strip mirrors the
 * "Trip ID / dates" + "Consultant" band from the reference brochure.
 */
export function buildCoverSection(ctx: PdfBuildContext): any[] {
  const trip = ctx.tripInfo;
  const endDate = computeEndDate(trip);
  const items: any[] = [];

  if (ctx.coverImage) {
    items.push({ image: ctx.coverImage, width: 515, absolutePosition: { x: 40, y: 0 } });
    items.push(buildGradientWash());
  }

  items.push(
    {
      text: trip?.AgencyName || '',
      fontSize: TYPE.h2, bold: true, color: COLORS.textOnDark, alignment: 'center',
      margin: [0, ctx.coverImage ? 210 : 60, 0, 6],
    },
    { text: "It's Time to Explore", fontSize: 15, alignment: 'center', color: COLORS.accentLight, margin: [0, 0, 0, 2] },
    { text: (trip?.DestinationName || '').toUpperCase(), style: 'display', alignment: 'center' },
    {
      columns: [
        { width: '55%', ...buildInfoBox(tripInfoField(ctx, endDate)) },
        { width: '45%', ...buildInfoBox({ label: 'Your Holiday Consultant', value: trip?.SalesPersonName || '-' }) },
      ],
      columnGap: 12,
      margin: [0, ctx.coverImage ? 70 : 220, 0, 0],
    },
    pageBreakMarker(),
  );

  return items;
}

function tripInfoField(ctx: PdfBuildContext, endDate: Date | null) {
  const trip = ctx.tripInfo;
  return {
    label: 'Trip ID',
    value: `#${ctx.formatQuotationNo(trip?.QuotationNo)}`,
    helper: `${trip?.ContactName || 'Guest'}  \u2022  ${ctx.formatDateShort(trip?.StartDate)} \u2013 ${ctx.formatDateShort(endDate)} (${ctx.durationLabel})`,
  };
}

/** Three stacked, increasingly opaque dark rects at the bottom of the cover
 *  image — the closest pdfMake gets to a real linear gradient overlay. */
function buildGradientWash(): any {
  const bandHeight = 90;
  const baseY = 300; // roughly where the hero image's lower third begins
  return {
    stack: [0.15, 0.3, 0.5].map((opacity, i) => ({
      canvas: [{ type: 'rect', x: 0, y: baseY + i * bandHeight, w: 515, h: bandHeight, color: COLORS.bgDark }],
      opacity,
    })),
    absolutePosition: { x: 40, y: 0 },
  };
}

function computeEndDate(trip: any): Date | null {
  if (!trip?.StartDate) return null;
  const d = new Date(trip.StartDate);
  d.setDate(d.getDate() + Number(trip?.NoOfNights || 0));
  return d;
}

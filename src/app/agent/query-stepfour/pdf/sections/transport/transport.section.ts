import type { PdfBuildContext } from '../../quotation-pdf-engine';
import { buildSectionTitle } from '../../components/section-title.component';
import { buildDataTable } from '../../helpers/table-builder';
import { forcePageBreakBefore } from '../../helpers/page-break';

/** Day-wise transport/transfer services (vehicles) — deliberately unaware of
 *  the activities section; both read from the same daySlots but render
 *  independently per the architecture's "no section knows about another" rule. */
export function buildTransportSection(ctx: PdfBuildContext): any[] {
  if (ctx.removeTransportActivities) return [];

  const days = ctx.daySlots.filter((d: any) => ctx.servicesForDay(d.dayNumber).length);
  if (!days.length) return [];

  const rows: any[][] = [];
  for (const day of days) {
    const services = ctx.servicesForDay(day.dayNumber);
    services.forEach((svc: any, idx: number) => {
      rows.push([
        idx === 0 ? { text: [`${day.dayNumber}${ctx.ordinal(day.dayNumber)} Day\n`, { text: day.shortDate, style: 'small' }], rowSpan: services.length } : {},
        `${ctx.serviceTitle(svc)}\n${ctx.serviceSubtitle(svc)}`,
        [svc.VehicleTypeName, ctx.serviceBreakdown(svc)].filter(Boolean).join('\n'),
      ]);
    });
  }

  return [
    // Fresh page: this always followed straight on from Hotels &
    // Accommodation with no break, which could land mid-table on whatever
    // page the last hotel card happened to end on.
    forcePageBreakBefore(buildSectionTitle('Transportation', 'Vehicles and transfers arranged for each day')),
    buildDataTable(
      [{ header: 'Day', width: 70 }, { header: 'Service', width: '*' }, { header: 'Details', width: 130 }],
      rows,
    ),
  ];
}

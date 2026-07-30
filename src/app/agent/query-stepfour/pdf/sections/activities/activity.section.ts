import type { PdfBuildContext } from '../../quotation-pdf-engine';
import { buildSectionTitle } from '../../components/section-title.component';
import { buildDataTable } from '../../helpers/table-builder';

export function buildActivitySection(ctx: PdfBuildContext): any[] {
  if (ctx.removeTransportActivities) return [];

  const days = ctx.daySlots.filter((d: any) => ctx.activityGroupsForDay(d.dayNumber).length);
  if (!days.length) return [];

  const rows: any[][] = [];
  for (const day of days) {
    const groups = ctx.activityGroupsForDay(day.dayNumber);
    groups.forEach((group: any, idx: number) => {
      rows.push([
        idx === 0 ? { text: [`${day.dayNumber}${ctx.ordinal(day.dayNumber)} Day\n`, { text: day.shortDate, style: 'small' }], rowSpan: groups.length } : {},
        ctx.activityGroupTitle(group),
        group.entries.map((e: any) => `${e.Qty} ${e.PaxTypeLabel || e.PaxType}`).join(', '),
      ]);
    });
  }

  return [
    buildSectionTitle('Activities & Experiences', 'Excursions and entry tickets included in this trip'),
    buildDataTable(
      [{ header: 'Day', width: 70 }, { header: 'Activity', width: '*' }, { header: 'Pax', width: 130 }],
      rows,
    ),
  ];
}

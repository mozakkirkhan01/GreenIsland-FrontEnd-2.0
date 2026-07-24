import { htmlToPdfMake } from './html-to-pdfmake';

export const PDF_THEME = {
  primary: '#3d4fd6',
  primaryLight: '#e7eaff',
  ink: '#1e293b',
  label: '#64748b',
  border: '#e2e8f0',
  headFill: '#f1f5f9',
  watermark: '#94a3b8',
  pageMargins: [40, 50, 40, 40] as [number, number, number, number],
  fonts: {
    base: 9,
    h1: 26,
    h2: 14,
    h3: 12,
    h4: 11,
    label: 8,
  },
};

/**
 * Everything this builder needs, handed in by the component as plain data /
 * bound function references — no Angular DI, no signals read here. Keeps
 * this file testable and framework-agnostic.
 */
export interface PdfBuildContext {
  tripInfo: any;
  quoteHeader: any;
  packageTypes: any[];
  hotelsByPackage: (pkgId: number) => any[];
  similarHotels: any[];
  specialInclusions: any[];
  hasSimilarHotels: (quoteHotelId: number) => boolean;
  daySlots: any[];
  servicesForDay: (dayNumber: number) => any[];
  activityGroupsForDay: (dayNumber: number) => any[];
  activityGroupTitle: (group: any) => string;
  serviceTitle: (svc: any) => string;
  serviceSubtitle: (svc: any) => string;
  serviceBreakdown: (svc: any) => string;
  daySchedule: (dayNumber: number) => { title: string; intro: string; sections: { heading: string; body: string }[] } | null;
  inclusions: any[];
  exclusions: any[];
  inclusionText: (i: any) => string;
  exclusionText: (e: any) => string;
  terms: any[];
  hasTerms: boolean;
  termHtml: (t: any) => string;
  packageQuotePrice: (pkgId: number) => number;
  packageCostPrice: (pkgId: number) => number;
  pricingSnapshots: any[];
  packageSummaries: any[];
  durationLabel: string;
  totalGuestCount: number;
  formatCurrency: (n: number) => string;
  formatQuotationNo: (n: any) => string;
  ordinal: (n: number) => string;
  formatDateShort: (v: any) => string;
  formatDateLong: (v: any) => string;
  removeTransportActivities: boolean;
  removeItinerary: boolean;
  removeTerms: boolean;
  hideTotalPrice: boolean;
  coverImage: string | null;
  logoImage: string | null;
  sanitizeHtml: (html: string) => string;
}

const looksLikeHtml = (value: string | null | undefined): boolean =>
  !!value && /<\/?[a-z][\s\S]*>/i.test(value);

export class QuotationPdfBuilder {
  build(ctx: PdfBuildContext): any {
    const content: any[] = [
      ...this.buildCoverPage(ctx),
      ...this.buildQuoteSummary(ctx),
      ...this.buildPackageSummary(ctx),
      ...this.buildHotelSections(ctx),
      ...this.buildTransportAndActivities(ctx),
      ...this.buildItinerary(ctx),
      ...this.buildTermsSection(ctx),
    ];

    return {
      pageSize: 'A4',
      pageMargins: PDF_THEME.pageMargins,
      background: (currentPage: number, pageSize: any) =>
        currentPage === 1 ? null : { stack: this.buildWatermark(ctx, pageSize) },
      header: (currentPage: number) => this.buildHeader(ctx, currentPage),
      footer: (currentPage: number, pageCount: number) => this.buildFooter(ctx, currentPage, pageCount),
      content,
      styles: {
        sectionBanner: { fontSize: PDF_THEME.fonts.h3, bold: true, color: PDF_THEME.primary, fillColor: PDF_THEME.primaryLight, margin: [0, 12, 0, 8] },
        h2: { fontSize: PDF_THEME.fonts.h2, bold: true },
        h3: { fontSize: PDF_THEME.fonts.h3, bold: true, color: PDF_THEME.primary },
        h4: { fontSize: PDF_THEME.fonts.h4, bold: true, color: PDF_THEME.primary },
        label: { fontSize: PDF_THEME.fonts.label, color: PDF_THEME.label },
        value: { fontSize: 11, bold: true },
        tableHead: { bold: true, fillColor: PDF_THEME.headFill },
      },
      defaultStyle: { fontSize: PDF_THEME.fonts.base },
    };
  }

  // ── Cover Page Builder ─────────────────────────────────────────
  private buildCoverPage(ctx: PdfBuildContext): any[] {
    const trip = ctx.tripInfo;
    const endDate = this.computeEndDate(trip);
    const items: any[] = [];

    if (ctx.coverImage) {
      items.push({ image: ctx.coverImage, width: 515, absolutePosition: { x: 40, y: 0 } });
    }

    items.push(
      { text: trip?.AgencyName || '', style: 'h2', color: PDF_THEME.primary, alignment: 'center', margin: [0, ctx.coverImage ? 200 : 40, 0, 4] },
      { text: "It's Time to Explore", fontSize: 18, alignment: 'center', color: '#ffffff', margin: [0, 20, 0, 0] },
      { text: (trip?.DestinationName || '').toUpperCase(), fontSize: PDF_THEME.fonts.h1, bold: true, alignment: 'center', color: '#ffffff' },
      {
        columns: [
          {
            width: '50%',
            table: { widths: ['*'], body: [[this.tripSummaryStack(ctx, endDate)]] },
            layout: 'lightHorizontalLines',
          },
          {
            width: '50%',
            table: { widths: ['*'], body: [[{
              stack: [
                { text: 'Your Holiday Consultant', style: 'label' },
                { text: trip?.SalesPersonName || '', style: 'value' },
              ],
              margin: [8, 8, 8, 8],
            }]] },
            layout: 'lightHorizontalLines',
          },
        ],
        columnGap: 12,
        margin: [0, ctx.coverImage ? 60 : 200, 0, 0],
      },
      { text: '', pageBreak: 'after' },
    );
    return items;
  }

  private tripSummaryStack(ctx: PdfBuildContext, endDate: Date | null): any {
    const trip = ctx.tripInfo;
    return {
      stack: [
        { text: 'Trip ID', style: 'label' },
        { text: `#${ctx.formatQuotationNo(trip?.QuotationNo)}`, style: 'value' },
        { text: trip?.ContactName || 'Guest', margin: [0, 6, 0, 0] },
        { text: `${ctx.totalGuestCount} Guests`, style: 'label' },
        { text: 'Starts / Ends', style: 'label', margin: [0, 6, 0, 0] },
        { text: `${ctx.formatDateShort(trip?.StartDate)}  —  ${ctx.formatDateShort(endDate)} (${ctx.durationLabel})`, style: 'value' },
      ],
      margin: [8, 8, 8, 8],
    };
  }

  // ── Quote Summary Builder ────────────────────────────────────────
  private buildQuoteSummary(ctx: PdfBuildContext): any[] {
    const trip = ctx.tripInfo;
    const childCount = Math.max((ctx.totalGuestCount || 0) - (trip?.NoOfAdults || 0), 0);
    const childAges = this.safeParseAges(trip?.ChildrenAges);

    return [
      { text: `Dear ${trip?.ContactName || 'Guest'},`, style: 'h2' },
      { text: `Greetings from ${trip?.AgencyName || 'us'}.`, margin: [0, 4, 0, 4] },
      { text: 'Our sales team has put up this Quote regarding your upcoming trip. Please go through it and let us know if you would like any changes in any of the provided services.', margin: [0, 0, 0, 12] },
      {
        columns: [
          { width: '25%', stack: [{ text: 'DESTINATION', style: 'label' }, { text: trip?.DestinationName || '', style: 'value' }] },
          { width: '25%', stack: [{ text: 'START DATE', style: 'label' }, { text: ctx.formatDateLong(trip?.StartDate), style: 'value' }] },
          { width: '25%', stack: [{ text: 'DURATION', style: 'label' }, { text: ctx.durationLabel, style: 'value' }] },
          {
            width: '25%',
            stack: [
              { text: 'PAX', style: 'label' },
              { text: `${trip?.NoOfAdults || 0} Adults${childCount ? `, ${childCount} Children` : ''}`, style: 'value' },
              ...(childAges.length ? [{ text: `Ages: ${childAges.join(', ')}`, style: 'label' }] : []),
            ],
          },
        ],
        margin: [0, 0, 0, 12],
      },
    ];
  }

  private safeParseAges(raw: any): number[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  // ── Package Summary Builder (snapshot-first, falls back to live calc) ──
  private buildPackageSummary(ctx: PdfBuildContext): any[] {
    if (ctx.hideTotalPrice || !ctx.packageTypes.length) return [];

    return [
      { text: `Quote Price (${ctx.packageTypes.length} Package Option${ctx.packageTypes.length > 1 ? 's' : ''})`, style: 'sectionBanner' },
      this.commonTable(
        ['#', 'Option', 'Total (INR)'],
        ['auto', '*', 'auto'],
        ctx.packageTypes.map((pkg: any, idx: number) => {
          const snapshot = ctx.packageSummaries.find((s: any) => s.QuotePackageTypeId === pkg.QuotePackageTypeId);
          const total = snapshot ? snapshot.GrandTotal : ctx.packageQuotePrice(pkg.QuotePackageTypeId);
          return [
            String(idx + 1),
            pkg.PackageTypeName,
            { text: `${ctx.formatCurrency(total)} /-\n(including ${ctx.quoteHeader?.GstPercent || 5}% GST)`, bold: true, color: PDF_THEME.primary },
          ];
        }),
      ),
    ];
  }

  // ── Hotel Section + Hotel Inclusion Builder ──────────────────────
  private buildHotelSections(ctx: PdfBuildContext): any[] {
    const out: any[] = [];
    for (const pkg of ctx.packageTypes) {
      const hotels = ctx.hotelsByPackage(pkg.QuotePackageTypeId);
      if (!hotels.length) continue;

      out.push({ text: 'Hotels / Accommodations', style: 'sectionBanner' });
      out.push({ text: `Option: ${pkg.PackageTypeName}`, style: 'h3', margin: [0, 0, 0, 8] });

      for (const hotel of hotels) {
        out.push(this.buildHotelCard(ctx, hotel));
        out.push(...this.buildHotelInclusions(ctx, hotel));
      }
    }
    return out;
  }

  private buildHotelCard(ctx: PdfBuildContext, hotel: any): any {
    const similarNames = ctx.hasSimilarHotels(hotel.QuoteHotelId)
      ? ctx.similarHotels.filter((s: any) => s.ParentQuoteHotelId === hotel.QuoteHotelId).map((s: any) => s.HotelName)
      : [];

    return {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: `${hotel.NightNumber}${ctx.ordinal(hotel.NightNumber)} Night at ${hotel.LocationName || ''}`, style: 'h4' },
            { text: `Check-in on ${ctx.formatDateLong(hotel.StayDate)}`, style: 'label', margin: [0, 0, 0, 6] },
            { text: hotel.HotelName, fontSize: 12, bold: true, color: PDF_THEME.ink, margin: [0, 2, 0, 4] },
            {
              columns: [
                { width: '50%', stack: [{ text: 'ROOMS', style: 'label' }, { text: `${hotel.NoOfRooms} ${hotel.RoomTypeName || ''}`, bold: true }, { text: `${hotel.PaxPerRoom} Pax`, style: 'label' }] },
                { width: '50%', stack: [{ text: 'MEAL PLAN', style: 'label' }, { text: hotel.MealPlan || '', bold: true }] },
              ],
              margin: [0, 4, 0, 0],
            },
            ...(similarNames.length ? [{ text: `Similar alternatives: ${similarNames.join(', ')}`, style: 'label', margin: [0, 6, 0, 0] }] : []),
          ],
          margin: [10, 10, 10, 10],
        }]],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 8],
    };
  }

  private buildHotelInclusions(ctx: PdfBuildContext, hotel: any): any[] {
    const rows = ctx.specialInclusions.filter((si: any) => si.QuoteHotelId === hotel.QuoteHotelId);
    if (!rows.length) return [];
    const out: any[] = [{ text: 'Hotel Special Inclusions', style: 'h4', margin: [0, 4, 0, 4] }];
    for (const si of rows) {
      out.push({
        table: { widths: ['*'], body: [[{
          stack: [
            { text: si.SpecialInclusionName, bold: true },
            { text: `${si.NightNumber ? ctx.ordinal(si.NightNumber) + ' Night' : ''} at ${si.HotelName || ''}` },
          ],
          margin: [8, 8, 8, 8],
        }]] },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 8],
      });
    }
    return out;
  }

  // ── Transport Builder / Activity Builder ──────────────────────────
  // Transport (QuoteServices) and Activities (QuoteActivityEntries) are
  // separate saved tables in this schema (see prior backend work) — kept as
  // one visual table here to match the reference PDF's single
  // "Transportation and Activities" section, sourced from both.
  private buildTransportAndActivities(ctx: PdfBuildContext): any[] {
    if (ctx.removeTransportActivities) return [];
    const days = ctx.daySlots.filter((d: any) => ctx.servicesForDay(d.dayNumber).length || ctx.activityGroupsForDay(d.dayNumber).length);
    if (!days.length) return [];

    const rows: any[] = [[{ text: 'Day', style: 'tableHead' }, { text: 'Service', style: 'tableHead' }, { text: '', style: 'tableHead' }]];
    for (const day of days) {
      const lines: { desc: string; detail: string }[] = [];
      for (const svc of ctx.servicesForDay(day.dayNumber)) {
        lines.push({ desc: `${ctx.serviceTitle(svc)} - ${ctx.serviceSubtitle(svc)}`, detail: [svc.VehicleTypeName, ctx.serviceBreakdown(svc)].filter(Boolean).join('\n') });
      }
      for (const group of ctx.activityGroupsForDay(day.dayNumber)) {
        lines.push({ desc: ctx.activityGroupTitle(group), detail: group.entries.map((e: any) => `${e.Qty} ${e.PaxTypeLabel || e.PaxType}`).join(', ') });
      }
      lines.forEach((line, idx) => {
        rows.push([
          idx === 0 ? { text: [`${day.dayNumber}${ctx.ordinal(day.dayNumber)} Day\n`, { text: day.shortDate, style: 'label' }], rowSpan: lines.length } : {},
          line.desc,
          line.detail,
        ]);
      });
    }

    return [
      { text: 'Transportation and Activities', style: 'sectionBanner' },
      this.commonTable(null, ['auto', '*', 'auto'], rows.slice(1), rows[0]),
    ];
  }

  // ── Day Wise Itinerary Builder ─────────────────────────────────
  private buildItinerary(ctx: PdfBuildContext): any[] {
    if (ctx.removeItinerary) return [];
    const days = ctx.daySlots.filter((d: any) => ctx.daySchedule(d.dayNumber));
    if (!days.length) return [];

    const out: any[] = [{ text: 'Day Wise Itinerary', style: 'sectionBanner' }];
    for (const day of days) {
      const sched = ctx.daySchedule(day.dayNumber)!;
      out.push({
        columns: [
          { width: 60, text: [`${day.dayNumber}${ctx.ordinal(day.dayNumber)}\n`, { text: 'Day', style: 'label' }], fontSize: 16, bold: true, color: PDF_THEME.primary },
          {
            width: '*',
            stack: [
              { text: ctx.formatDateLong(day.date), style: 'label' },
              { text: sched.title, style: 'h4' },
              // sched.title/intro/sections come from IteneraryService.DaySchedule,
              // which is plain text (confirmed from the DB), not Quill HTML — but
              // detect HTML defensively in case that ever changes upstream.
              ...(looksLikeHtml(sched.intro) ? htmlToPdfMake(ctx.sanitizeHtml(sched.intro)) : (sched.intro ? [{ text: sched.intro, margin: [0, 4, 0, 4] }] : [])),
              ...sched.sections.flatMap((s: any) => (
                looksLikeHtml(s.body)
                  ? [{ text: s.heading, bold: true, margin: [0, 4, 0, 2] }, ...htmlToPdfMake(ctx.sanitizeHtml(s.body))]
                  : [{ text: s.heading, bold: true, margin: [0, 4, 0, 2] }, { text: s.body, margin: [0, 0, 0, 4] }]
              )),
            ],
          },
        ],
        margin: [0, 0, 0, 12],
      });
    }
    return out;
  }

  // ── Terms Builder (Terms and Conditions + Inclusions/Exclusions) ──
  private buildTermsSection(ctx: PdfBuildContext): any[] {
    if (ctx.removeTerms) return [];
    const out: any[] = [];

    if (ctx.inclusions.length || ctx.exclusions.length) {
      out.push(
        { text: 'Inclusions / Exclusions', style: 'sectionBanner' },
        {
          columns: [
            { width: '50%', ul: ctx.inclusions.map(i => ctx.inclusionText(i)) },
            { width: '50%', ul: ctx.exclusions.map(e => ctx.exclusionText(e)) },
          ],
          margin: [0, 0, 0, 16],
        },
      );
    }

    if (ctx.hasTerms) {
      out.push({ text: 'Terms and Conditions', style: 'sectionBanner' });
      for (const term of ctx.terms) {
        const html = ctx.termHtml(term);
        out.push(...(looksLikeHtml(html) ? htmlToPdfMake(ctx.sanitizeHtml(html)) : [{ text: html, margin: [0, 0, 0, 8] }]));
      }
    }
    return out;
  }

  // ── Common Table Builder ────────────────────────────────────────
  private commonTable(headers: string[] | null, widths: string[], body: any[][], headerRow?: any[]): any {
    const finalBody = headers
      ? [headers.map(h => ({ text: h, style: 'tableHead' })), ...body]
      : headerRow ? [headerRow, ...body] : body;
    return {
      table: { widths, body: finalBody, headerRows: 1 },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 16],
    };
  }

  // ── Header / Footer / Watermark ─────────────────────────────────
  private buildHeader(ctx: PdfBuildContext, currentPage: number): any {
    if (currentPage === 1) return null;
    return {
      columns: [
        ctx.logoImage ? { image: ctx.logoImage, width: 24, margin: [40, 10, 0, 0] } : { text: '', width: 24 },
        { text: ctx.tripInfo?.AgencyName || '', color: PDF_THEME.primary, bold: true, margin: [8, 14, 0, 0] },
        { text: `www.${(ctx.tripInfo?.AgencyName || '').toLowerCase().replace(/\s+/g, '')}.in`, alignment: 'right', style: 'label', margin: [0, 16, 40, 0] },
      ],
    };
  }

  private buildFooter(ctx: PdfBuildContext, currentPage: number, pageCount: number): any {
    return {
      columns: [
        { text: ctx.tripInfo?.AgencyName || '', style: 'label', margin: [40, 0, 0, 0] },
        { text: `${currentPage} / ${pageCount}`, alignment: 'center', style: 'label' },
        { text: '', width: 40 },
      ],
      margin: [0, 8, 0, 0],
    };
  }

  private buildWatermark(ctx: PdfBuildContext, pageSize: { width: number; height: number }): any[] {
    const label = [ctx.tripInfo?.AgencyName, `Trip# ${ctx.formatQuotationNo(ctx.tripInfo?.QuotationNo)}`].filter(Boolean).join(' • ');
    if (!label) return [];
    const elements: any[] = [];
    const stepX = 220, stepY = 90;
    for (let y = -60; y < pageSize.height + 60; y += stepY) {
      for (let x = -80; x < pageSize.width + 80; x += stepX) {
        elements.push({ text: label, fontSize: 9, color: PDF_THEME.watermark, opacity: 0.18, angle: -30, absolutePosition: { x, y } });
      }
    }
    return elements;
  }

  private computeEndDate(trip: any): Date | null {
    if (!trip?.StartDate) return null;
    const d = new Date(trip.StartDate);
    d.setDate(d.getDate() + Number(trip?.NoOfNights || 0));
    return d;
  }
}
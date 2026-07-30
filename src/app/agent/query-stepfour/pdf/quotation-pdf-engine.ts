import { PDF_STYLES, PDF_DEFAULT_STYLE } from './theme/styles';
import { PAGE_MARGINS } from './theme/spacing';
import { COLORS } from './theme/colors';
import { buildHeader } from './components/header.component';
import { buildFooter } from './components/footer.component';

import { buildCoverSection } from './sections/cover/cover.section';
import { buildSummarySection } from './sections/summary/summary.section';
import { buildPackageSummarySection } from './sections/package-summary/package-summary.section';
import { buildAccommodationSection } from './sections/accommodation/accommodation.section';
import { buildTransportSection } from './sections/transport/transport.section';
import { buildActivitySection } from './sections/activities/activity.section';
import { buildItinerarySection } from './sections/itinerary/itinerary.section';
import { buildInclusionSection } from './sections/inclusion/inclusion.section';
import { buildTermsSection } from './sections/terms/terms.section';

/**
 * Everything the engine needs, handed in by the component as plain data /
 * bound function references — no Angular DI, no signals read here. Keeps
 * this file (and every section) testable and framework-agnostic.
 *
 * Shape is intentionally unchanged from the previous single-file builder so
 * this drops in with a one-line import swap in the component.
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
  /** Optional contact details for the footer — falls back to blank strings if absent. */
  agencyPhone?: string;
  agencyEmail?: string;
  agencyWebsite?: string;
}

const SECTION_BUILDERS: Array<(ctx: PdfBuildContext) => any[]> = [
  buildCoverSection,
  buildSummarySection,
  buildPackageSummarySection,
  buildAccommodationSection,
  buildTransportSection,
  buildActivitySection,
  buildItinerarySection,
  buildInclusionSection,
  buildTermsSection,
];

export class QuotationPdfEngine {
  /** Builds the full pdfMake document definition. Each section only ever
   *  sees the context — never another section's output — per the
   *  "sections don't know about each other" architecture rule. */
  build(ctx: PdfBuildContext): any {
    const content = SECTION_BUILDERS.flatMap(build => build(ctx));

    return {
      pageSize: 'A4',
      pageMargins: PAGE_MARGINS,
      background: (currentPage: number, pageSize: any) =>
        currentPage === 1 ? null : buildWatermark(ctx, pageSize),
      header: (currentPage: number) => buildHeader({
        agencyName: ctx.tripInfo?.AgencyName || '',
        logoImage: ctx.logoImage,
        quotationLabel: `Trip# ${ctx.formatQuotationNo(ctx.tripInfo?.QuotationNo)}`,
        destinationName: ctx.tripInfo?.DestinationName,
      }, currentPage),
      footer: (currentPage: number, pageCount: number) => buildFooter({
        agencyName: ctx.tripInfo?.AgencyName || '',
        phone: ctx.agencyPhone,
        email: ctx.agencyEmail,
        website: ctx.agencyWebsite,
      }, currentPage, pageCount),
      content,
      styles: PDF_STYLES,
      defaultStyle: PDF_DEFAULT_STYLE,
    };
  }
}

function buildWatermark(ctx: PdfBuildContext, pageSize: { width: number; height: number }): any {
  const label = [ctx.tripInfo?.AgencyName, `Trip# ${ctx.formatQuotationNo(ctx.tripInfo?.QuotationNo)}`].filter(Boolean).join(' \u2022 ');
  if (!label) return null;
  const elements: any[] = [];
  const stepX = 220, stepY = 90;
  for (let y = -60; y < pageSize.height + 60; y += stepY) {
    for (let x = -80; x < pageSize.width + 80; x += stepX) {
      elements.push({ text: label, fontSize: 9, color: COLORS.watermark, opacity: 0.14, angle: -30, absolutePosition: { x, y } });
    }
  }
  return { stack: elements };
}

/** Backwards-compatible alias — old call sites using `new QuotationPdfBuilder()` keep working. */
export { QuotationPdfEngine as QuotationPdfBuilder };

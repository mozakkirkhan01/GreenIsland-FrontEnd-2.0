import { PDF_STYLES, PDF_DEFAULT_STYLE } from './theme/styles';
import { PAGE_MARGINS } from './theme/spacing';
import { COLORS } from './theme/colors';
import { THEME_CONFIG } from './theme/theme.config';

import { buildHeader } from './components/header.component';
import { buildFooter } from './components/footer.component';

import { buildCoverSection } from './sections/cover/cover.section';
import { buildSummarySection } from './sections/summary/summary.section';
import { buildAccommodationSection } from './sections/accommodation/accommodation.section';
import { buildTransportSection } from './sections/transport/transport.section';
import { buildItinerarySection } from './sections/itinerary/itinerary.section';
import { buildInclusionSection } from './sections/inclusion/inclusion.section';
import { buildTermsSection } from './sections/terms/terms.section';
import { buildBackCoverSection } from './sections/back-cover/back-cover.section';

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
  rawDaySchedule: (dayNumber: number) => string;
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
  agencyPhone?: string;
  agencyEmail?: string;
  agencyWebsite?: string;
}

const SECTION_BUILDERS: Array<(ctx: PdfBuildContext) => any[]> = [
  buildCoverSection,
  buildSummarySection,
  buildAccommodationSection,
  buildTransportSection,
  buildItinerarySection,
  buildInclusionSection,
  buildTermsSection,
  buildBackCoverSection,
];

export class QuotationPdfEngine {
  build(ctx: PdfBuildContext): any {
    const content = SECTION_BUILDERS.flatMap(build => build(ctx));

    return {
      pageSize: 'A4',
      pageMargins: PAGE_MARGINS,
      background: (currentPage: number, pageSize: any) =>
        currentPage === 1 ? null : buildWatermark(ctx, pageSize),
      header: (currentPage: number) => buildHeader({
        agencyName: ctx.tripInfo?.AgencyName || THEME_CONFIG.agency.name,
        logoImage: ctx.logoImage,
        quotationLabel: `Trip# ${ctx.formatQuotationNo(ctx.tripInfo?.QuotationNo)}`,
        destinationName: ctx.tripInfo?.DestinationName,
        website: ctx.agencyWebsite || THEME_CONFIG.agency.website,
      }, currentPage),
      footer: (currentPage: number, pageCount: number) => buildFooter({
        agencyName: ctx.tripInfo?.AgencyName || THEME_CONFIG.agency.name,
        phone: ctx.agencyPhone || THEME_CONFIG.agency.phone,
        email: ctx.agencyEmail || THEME_CONFIG.agency.email,
        website: ctx.agencyWebsite || THEME_CONFIG.agency.website,
        address: THEME_CONFIG.agency.headOffice,
      }, currentPage, pageCount),
      content,
      styles: PDF_STYLES,
      defaultStyle: PDF_DEFAULT_STYLE,
    };
  }
}

function buildWatermark(ctx: PdfBuildContext, pageSize: { width: number; height: number }): any {
  if (!THEME_CONFIG.watermark.enabled) return null;
  const label = THEME_CONFIG.agency.shortName || THEME_CONFIG.agency.name;
  if (!label) return null;

  // One large, very faint diagonal mark centered on the page, instead of a
  // repeating small-text grid that competed with the page content.
  return {
    text: label,
    fontSize: THEME_CONFIG.watermark.fontSize,
    color: COLORS.watermark,
    opacity: THEME_CONFIG.watermark.opacity,
    angle: THEME_CONFIG.watermark.angle,
    alignment: 'center',
    absolutePosition: { x: 0, y: pageSize.height / 2 - 30 },
    // Full page width so the centered text alignment centers on the page.
    width: pageSize.width,
  };
}

export { QuotationPdfEngine as QuotationPdfBuilder };

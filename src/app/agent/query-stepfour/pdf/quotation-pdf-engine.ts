import { PDF_STYLES, PDF_DEFAULT_STYLE } from './theme/styles';
import { PAGE_MARGINS } from './theme/spacing';
import { COLORS } from './theme/colors';
import { ThemeConfig, ThemeConfigOverride, mergeThemeConfig } from './theme/theme.config';

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
import { buildBackCoverSection } from './sections/back-cover/back-cover.section';

export interface PdfBuildContext {
  tripInfo: any;
  quoteHeader: any;
  // Optional pricing object passed from the caller (keeps GST settings, totals, etc.)
  pricing?: any;
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
  packageGrandTotal: (pkgId: number) => number;
  packageCostPrice: (pkgId: number) => number;
  guestCategoryTotals: (pkgId: number) => { label: string; count: number; paxLabel: string; amount: number }[];
  isOverallPricing: (pkgId: number) => boolean;
  pricingSnapshots: any[];
  packageSummaries: any[];
  // Optional helper: returns true when GST is included for a given package id
  isGstIncluded?: (pkgId: number) => boolean;
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
  agencyName?: string;
  agencyPhone?: string;
  agencyEmail?: string;
  agencyWebsite?: string;
  agencyAddress?: string;
  /**
   * Optional partial theme override (agency name/branding/watermark), merged
   * on top of the THEME_CONFIG defaults for this render only — lets callers
   * white-label the PDF for a different agency without touching this file.
   * Built by the caller (query-stepfour.ts) from the dynamic Company record,
   * so nothing in this engine is hardcoded to any one agency.
   */
  themeOverride?: ThemeConfigOverride | null;
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
  buildBackCoverSection,
];

export class QuotationPdfEngine {
  build(ctx: PdfBuildContext): any {
    const content = SECTION_BUILDERS.flatMap(build => build(ctx));
    const theme = mergeThemeConfig(ctx.themeOverride);

    // Single source of truth for "whose name goes on this PDF" — prefers an
    // explicit ctx.agencyName (set by the caller from Company/Agency data),
    // then the trip's own AgencyName, then finally the theme default. Every
    // section (header, footer, watermark, back-cover) reads through this
    // instead of each picking its own fallback order.
    const resolvedAgencyName = ctx.agencyName || ctx.tripInfo?.AgencyName || theme.agency.name;

    return {
      pageSize: 'A4',
      pageMargins: PAGE_MARGINS,
      background: (currentPage: number, pageSize: any) =>
        currentPage === 1 ? null : buildWatermark(ctx, theme, pageSize, resolvedAgencyName),
      header: (currentPage: number) => buildHeader({
        agencyName: resolvedAgencyName,
        logoImage: ctx.logoImage,
        quotationLabel: `Trip# ${ctx.formatQuotationNo(ctx.tripInfo?.QuotationNo)}`,
        destinationName: ctx.tripInfo?.DestinationName,
        website: ctx.agencyWebsite || theme.agency.website,
        theme,
      }, currentPage),
      footer: (currentPage: number, pageCount: number) => buildFooter({
        agencyName: resolvedAgencyName,
        phone: ctx.agencyPhone || theme.agency.phone,
        email: ctx.agencyEmail || theme.agency.email,
        website: ctx.agencyWebsite || theme.agency.website,
        address: ctx.agencyAddress || theme.agency.headOffice,
        theme,
      }, currentPage, pageCount),
      content,
      styles: PDF_STYLES,
      defaultStyle: PDF_DEFAULT_STYLE,
    };
  }
}

/**
 * Repeating diagonal watermark — "{Agency Name} • Trip# {id} •" tiled
 * densely across the whole page, matching the reference brochure's texture
 * (every content page carries the same faint repeated company/trip strip).
 *
 * pdfMake has no native tile/pattern fill, so this is done with one large
 * rotated text block: a single string built by repeating the watermark
 * phrase, given a fixed line-height so it wraps into many short lines, then
 * rotated and absolutely positioned oversized/off-page so the page clip
 * boundary crops it into a full-bleed diagonal tile. All content (agency
 * name, Trip ID) is read from ctx/theme — nothing here is hardcoded to any
 * one agency.
 */
function buildWatermark(ctx: PdfBuildContext, theme: ThemeConfig, pageSize: { width: number; height: number }, agencyName?: string): any {
  if (!theme.watermark.enabled) return null;
  // BUG FIX: this previously read theme.agency.name directly, so the
  // watermark always tiled the THEME_CONFIG default agency name even when
  // the header/footer above it correctly showed the dynamic Company name.
  const agencyLabel = agencyName || theme.agency.name || theme.agency.shortName;
  if (!agencyLabel) return null;

  const tripNo = ctx.tripInfo?.QuotationNo != null ? ctx.formatQuotationNo(ctx.tripInfo.QuotationNo) : '';
  const phrase = tripNo ? `${agencyLabel}  \u2022  Trip# ${tripNo}  \u2022  ` : `${agencyLabel}  \u2022  `;

  // Repeat the phrase enough times that, once wrapped at the oversized
  // block width below, it comfortably fills a rotated page-sized area.
  const tile = phrase.repeat(60);

  return {
    text: tile,
    fontSize: 9,
    bold: true,
    color: COLORS.watermark,
    opacity: theme.watermark.opacity,
    angle: theme.watermark.angle,
    lineHeight: 2.4,
    // Oversized and shifted off the top/left edge so the rotated block's
    // corners always clear the page — the PDF's own page clip does the
    // "trim to page" work instead of us computing the rotated bounds.
    absolutePosition: { x: -150, y: -180 },
    width: pageSize.width + 500,
  };
}

export { QuotationPdfEngine as QuotationPdfBuilder };

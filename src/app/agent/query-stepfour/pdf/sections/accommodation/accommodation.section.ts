import type { PdfBuildContext } from '../../quotation-pdf-engine';
import { buildSectionTitle, buildSubTitle } from '../../components/section-title.component';
import { buildHotelCard, HotelCardData } from '../../components/hotel-card.component';
import { buildCard } from '../../components/card.component';

export function buildAccommodationSection(ctx: PdfBuildContext): any[] {
  const out: any[] = [];
  let printedBanner = false;

  for (const pkg of ctx.packageTypes) {
    const hotels = ctx.hotelsByPackage(pkg.QuotePackageTypeId);
    if (!hotels.length) continue;

    if (!printedBanner) {
      out.push(buildSectionTitle('Hotels & Accommodation', 'Stay details for each night of your trip'));
      printedBanner = true;
    }
    out.push(buildSubTitle(`Option: ${pkg.PackageTypeName}`));

    for (const hotel of hotels) {
      out.push(buildHotelCard(toHotelCardData(ctx, hotel)));
      out.push(...buildHotelInclusions(ctx, hotel));
    }
  }
  return out;
}

function toHotelCardData(ctx: PdfBuildContext, hotel: any): HotelCardData {
  const similarNames = ctx.hasSimilarHotels(hotel.QuoteHotelId)
    ? ctx.similarHotels.filter((s: any) => s.ParentQuoteHotelId === hotel.QuoteHotelId).map((s: any) => s.HotelName)
    : [];
  return {
    nightLabel: `${hotel.NightNumber}${ctx.ordinal(hotel.NightNumber)} Night`,
    locationName: hotel.LocationName || '',
    checkInLabel: `Check-in ${ctx.formatDateShort(hotel.StayDate)}`,
    hotelName: hotel.HotelName,
    category: hotel.HotelCategory,
    starCount: hotel.StarRating,
    roomType: hotel.RoomTypeName,
    roomCount: hotel.NoOfRooms,
    paxCount: hotel.PaxPerRoom,
    mealPlan: hotel.MealPlan,
    similarHotelNames: similarNames,
  };
}

function buildHotelInclusions(ctx: PdfBuildContext, hotel: any): any[] {
  const rows = ctx.specialInclusions.filter((si: any) => si.QuoteHotelId === hotel.QuoteHotelId);
  if (!rows.length) return [];
  const out: any[] = [];
  for (const si of rows) {
    out.push(buildCard([
      { text: si.SpecialInclusionName, bold: true },
      { text: `${si.NightNumber ? ctx.ordinal(si.NightNumber) + ' Night' : ''} at ${si.HotelName || ''}`, style: 'small', margin: [0, 2, 0, 0] },
    ]));
  }
  return out;
}

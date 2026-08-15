import type { PdfBuildContext } from '../../quotation-pdf-engine';
import { buildSectionTitle, buildSubTitle } from '../../components/section-title.component';
import { buildHotelCard, HotelCardData } from '../../components/hotel-card.component';
import { buildCard } from '../../components/card.component';
import { forcePageBreakBefore } from '../../helpers/page-break';

export function buildAccommodationSection(ctx: PdfBuildContext): any[] {
  const out: any[] = [];
  let printedBanner = false;

  for (const pkg of ctx.packageTypes) {
    const hotels = ctx.hotelsByPackage(pkg.QuotePackageTypeId);
    if (!hotels.length) continue;

    if (!printedBanner) {
      // Reference brochure always starts "Hotels / Accommodation" on its own
      // fresh page rather than continuing on whatever page the price table
      // ended on — force it explicitly, since natural pagination alone was
      // crowding this section onto page 2 with the summary + price table.
      out.push(forcePageBreakBefore(buildSectionTitle('Hotels & Accommodation', 'Stay details for each night of your trip')));
      printedBanner = true;
    }
    out.push(buildSubTitle(`Option: ${pkg.PackageTypeName}`));

    // hotelsByPackage() returns one row per night (business logic untouched
    // here — this is a pure presentation grouping). The reference brochure
    // combines consecutive nights at the same hotel into a single card
    // ("2nd 3rd Nights at Havelock") instead of repeating an identical card
    // per night, so group before rendering.
    for (const group of groupConsecutiveSameHotelNights(hotels)) {
      out.push(buildHotelCard(toHotelCardData(ctx, group)));
      for (const hotel of group) out.push(...buildHotelInclusions(ctx, hotel));
    }
  }
  return out;
}

/** Groups consecutive rows (already night-ordered by hotelsByPackage) that
 *  share the same hotel + location into one array, so e.g. nights 2 and 3
 *  both at "Hotel Havelock Gateway" become a single card. Never reorders
 *  or drops rows — a hotel change always starts a new group. */
function groupConsecutiveSameHotelNights(hotels: any[]): any[][] {
  const groups: any[][] = [];
  for (const hotel of hotels) {
    const currentGroup = groups[groups.length - 1];
    const prev = currentGroup?.[currentGroup.length - 1];
    const isConsecutiveNight = prev && Number(hotel.NightNumber) === Number(prev.NightNumber) + 1;
    const isSameHotel = prev && hotel.HotelName === prev.HotelName && (hotel.LocationName || '') === (prev.LocationName || '');
    if (currentGroup && isConsecutiveNight && isSameHotel) {
      currentGroup.push(hotel);
    } else {
      groups.push([hotel]);
    }
  }
  return groups;
}

function toHotelCardData(ctx: PdfBuildContext, group: any[]): HotelCardData {
  const first = group[0];
  const similarNames = ctx.hasSimilarHotels(first.QuoteHotelId)
    ? ctx.similarHotels.filter((s: any) => s.ParentQuoteHotelId === first.QuoteHotelId).map((s: any) => s.HotelName)
    : [];
  const nightLabel = group.length === 1
    ? `${first.NightNumber}${ctx.ordinal(first.NightNumber)} Night`
    : `${group.map(h => `${h.NightNumber}${ctx.ordinal(h.NightNumber)}`).join(' ')} Nights`;
  return {
    nightLabel,
    checkInDate: `Check-in ${ctx.formatDateShort(first.StayDate)}`,
    hotelName: first.HotelName,
    locationName: first.LocationName || '',
    categoryName: first.HotelCategory,
    starRating: first.StarRating,
    roomsText: [first.NoOfRooms, first.RoomTypeName].filter(Boolean).join(' '),
    paxText: first.PaxPerRoom ? `${first.PaxPerRoom} Pax` : '',
    mealPlanText: first.MealPlan,
    similarHotels: similarNames,
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

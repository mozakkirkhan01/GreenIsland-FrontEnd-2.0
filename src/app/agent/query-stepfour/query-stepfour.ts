import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { PdfImageLoader } from './pdf/helpers/image-loader';
import { QuotationPdfEngine } from './pdf/quotation-pdf-engine';

import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { RequestModel } from '../../utils/interface';
import { LocalService } from '../../utils/local.service';
import { CanComponentDeactivate } from '../../guards/can-deactivate-guard';

(pdfMake as any).vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any).vfs;

type MoneySource = { TotalPrice?: number; FinalPrice?: number; SellingPrice?: number; CostPrice?: number };

@Component({
  selector: 'app-query-stepfour',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './query-stepfour.html',
  styleUrl: './query-stepfour.css',
})
export class QueryStepfour implements OnInit, CanComponentDeactivate {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(AppService);
  private local = inject(LocalService);
  private toastr = inject(ToastrService);
  private sanitizer = inject(DomSanitizer);

  QueryStepOneId = 0;
  QuoteId = 0;

  loading = signal(false);
  pdfLoading = signal(false);
  quoteDetail = signal<any | null>(null);
  inclusions = signal<any[]>([]);
  exclusions = signal<any[]>([]);
  terms = signal<any[]>([]);

  activePackageTypeId = signal<number>(0);

  // ── Share dialog state ──────────────────────────────────────────
  shareOpen = signal(false);
  shareChannel = signal<'whatsapp' | 'email'>('whatsapp');
  hideTotalPrice = signal(false);
  removeItinerary = signal(false);
  removeTerms = signal(false);
  removeTransportActivities = signal(false);

  // ── Derived data from the single GetQuoteDetail payload ─────────
  tripInfo = computed<any>(() => this.quoteDetail()?.TripInfo ?? null);
  quoteHeader = computed<any>(() => this.quoteDetail()?.Quote ?? null);
  packageTypes = computed<any[]>(() => {
    const list = this.quoteDetail()?.PackageTypes ?? [];
    return list.length ? list : [{ QuotePackageTypeId: 0, PackageTypeName: 'Package' }];
  });
  hotels = computed<any[]>(() => this.quoteDetail()?.Hotels ?? []);
  services = computed<any[]>(() => this.quoteDetail()?.Services ?? []);
  specialInclusions = computed<any[]>(() => this.quoteDetail()?.SpecialInclusions ?? []);
  activities = computed<any[]>(() => this.quoteDetail()?.Activities ?? []);
  similarHotels = computed<any[]>(() => this.quoteDetail()?.SimilarHotels ?? []);
  pricing = computed<any>(() => this.quoteDetail()?.Pricing ?? null);
  packageMarkups = computed<any[]>(() => this.quoteDetail()?.PackageMarkups ?? []);
  pricingSnapshots = computed<any[]>(() => this.quoteDetail()?.PricingSnapshots ?? []);
  packageSummaries = computed<any[]>(() => this.quoteDetail()?.PackageSummaries ?? []);

  // ── Activities grouped by Location + ActivityService + Day ──────
  activityGroups = computed(() => {
    const groups = new Map<string, any>();
    for (const row of this.activities()) {
      const key = `${row.DayNumber}-${row.LocationId}-${row.ActivityServiceId}`;
      if (!groups.has(key)) {
        groups.set(key, {
          DayNumber: row.DayNumber,
          QuotePackageTypeId: row.QuotePackageTypeId,
          LocationId: row.LocationId,
          LocationName: row.LocationName,
          ActivityServiceId: row.ActivityServiceId,
          ActivityServiceName: row.ActivityServiceName,
          entries: [] as any[],
          total: 0,
        });
      }
      const g = groups.get(key);
      g.entries.push(row);
      g.total += Number(row.SellingPrice) || Number(row.GivenPrice) || 0;
    }
    return Array.from(groups.values());
  });

  activityGroupsForDay(dayNumber: number): any[] {
    return this.activityGroups().filter(g => Number(g.DayNumber) === dayNumber);
  }

  activityGroupTitle(group: any): string {
    return [group.LocationName, group.ActivityServiceName].filter(Boolean).join(' - ');
  }

  daySlots = computed(() => {
    const trip = this.tripInfo();
    if (!trip?.StartDate) return [];
    const start = new Date(trip.StartDate);
    const noOfNights = Number(trip.NoOfNights) || 0;
    return Array.from({ length: noOfNights + 1 }, (_, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      return {
        dayNumber: index + 1,
        date,
        dayLabel: date.toLocaleDateString('en-IN', { weekday: 'long' }),
        shortDate: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        fullDate: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      };
    });
  });

  ngOnInit(): void {
    this.QueryStepOneId = Number(this.route.snapshot.paramMap.get('id')) || 0;
    this.QuoteId = Number(this.route.snapshot.queryParamMap.get('quoteId')) || 0;
    this.loadPreview();
  }

  canDeactivate(): boolean {
    return true;
  }

  private enc(data: object): RequestModel {
    return { request: this.local.encrypt(JSON.stringify(data)).toString() };
  }

  private loadPreview(): void {
    this.loading.set(true);
    const payload = this.enc({ QueryStepOneId: this.QueryStepOneId, QuoteId: this.QuoteId });
    console.debug('getQuoteDetail request payload:', payload);
    this.service.getQuoteDetail(payload).subscribe({
      next: (quote: any) => {
        console.debug('getQuoteDetail response:', quote);
        if (quote.Message === ConstantData.SuccessMessage) {
          this.quoteDetail.set(quote);
          if (!this.QuoteId && quote.Quote?.QuoteId) this.QuoteId = quote.Quote.QuoteId;
          const firstPackage = this.packageTypes()[0];
          if (firstPackage) this.activePackageTypeId.set(firstPackage.QuotePackageTypeId);
          this.loadDestinationContent();
        } else {
          this.toastr.error(quote.Message || 'Unable to load quote detail');
        }
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('getQuoteDetail error:', err);
        this.loading.set(false);
        this.toastr.error('Error loading quotation preview');
      },
    });
  }

  private loadDestinationContent(): void {
    const destinationId = this.tripInfo()?.DestinationId || 0;
    if (!destinationId) return;

    this.service.getInclusionList(this.enc({ DestinationId: destinationId })).subscribe({
      next: (res: any) => this.inclusions.set(res?.Message === ConstantData.SuccessMessage ? res.InclusionList ?? [] : []),
      error: () => this.inclusions.set([]),
    });
    this.service.getExclusionList(this.enc({ DestinationId: destinationId })).subscribe({
      next: (res: any) => this.exclusions.set(res?.Message === ConstantData.SuccessMessage ? res.ExclusionList ?? [] : []),
      error: () => this.exclusions.set([]),
    });
    this.service.getTermAndConditionList(this.enc({ DestinationId: destinationId })).subscribe({
      next: (res: any) => this.terms.set(res?.Message === ConstantData.SuccessMessage ? res.TermAndConditionList ?? [] : []),
      error: () => this.terms.set([]),
    });
  }

  // ── Navigation ────────────────────────────────────────────────
  editDetail(): void {
    this.router.navigate(['/agent/query-stepthree', this.QueryStepOneId], {
      queryParams: this.QuoteId ? { quoteId: this.QuoteId } : {},
    });
  }

  backToQuotes(): void {
    this.router.navigate(['/agent/query-steptwo', this.QueryStepOneId]);
  }

  goToDashboard(): void {
    this.router.navigate(['/agent/dashboard']);
  }

  // ── Formatting helpers ──────────────────────────────────────────
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN').format(Math.round(Number(amount) || 0));
  }

  formatQuotationNo(no: number): string {
    return no ? no.toString().padStart(7, '0') : '-';
  }

  totalGuestCount(): number {
    const trip = this.tripInfo();
    return (Number(trip?.NoOfAdults) || 0) + this.childrenCount();
  }

  childrenCount(): number {
    const raw = this.tripInfo()?.ChildrenAges;
    if (!raw) return 0;
    try {
      return Array.isArray(raw) ? raw.length : JSON.parse(raw).length;
    } catch {
      return 0;
    }
  }

  childrenAgesList(): number[] {
    const raw = this.tripInfo()?.ChildrenAges;
    if (!raw) return [];
    try {
      return Array.isArray(raw) ? raw : JSON.parse(raw);
    } catch {
      return [];
    }
  }

  durationLabel(): string {
    const nights = Number(this.tripInfo()?.NoOfNights) || 0;
    return `${nights + 1}D, ${nights}N`;
  }

  // ── Package / accommodation grouping ─────────────────────────────
  setActivePackage(packageTypeId: number): void {
    this.activePackageTypeId.set(packageTypeId);
  }

  hotelsByPackage(packageTypeId: number): any[] {
    return this.hotels()
      .filter(row => this.samePackage(row, packageTypeId) && row.HotelId > 0 && row.IsMainHotel !== false)
      .sort((a, b) => (Number(a.NightNumber) || 0) - (Number(b.NightNumber) || 0));
  }

  specialInclusionsByPackage(packageTypeId: number): any[] {
    return this.specialInclusions().filter(row => this.samePackage(row, packageTypeId));
  }

  hasSimilarHotels(quoteHotelId: number): boolean {
    return this.similarHotels().some(row => Number(row.ParentQuoteHotelId) === Number(quoteHotelId));
  }

  private nightsOf(row: any): number[] {
    return Array.isArray(row.NightNumbers) && row.NightNumbers.length ? row.NightNumbers : [Number(row.NightNumber) || 1];
  }

  private nightPriceEntry(row: any, nightNumber: number): any | null {
    return (row.NightPrices || []).find((n: any) => Number(n.NightNumber) === nightNumber) || null;
  }

  private priceForNight(row: any, nightNumber: number): number {
    const np = this.nightPriceEntry(row, nightNumber);
    if (np) return Number(np.Total) || 0;
    return this.money(row) / (this.nightsOf(row).length || 1);
  }

  nightDate(nightNumber: number): Date | null {
    const start = this.tripInfo()?.StartDate;
    if (!start) return null;
    const d = new Date(start);
    d.setDate(d.getDate() + (nightNumber - 1));
    return d;
  }

  hotelLocationCategory(hotelId: number): string {
    const h = this.hotels().find(row => Number(row.HotelId) === Number(hotelId));
    return h ? `${h.LocationName || '-'}, ${h.HotelCategoryName || '-'}` : '';
  }

  private similarRowsFor(mainId: number, packageTypeId: number): any[] {
    const hotelRowsById = new Map<number, any>();
    for (const row of this.hotels()) if (row.QuoteHotelId) hotelRowsById.set(Number(row.QuoteHotelId), row);

    const linkedIds = new Set<number>(
      this.similarHotels().filter(l => Number(l.ParentQuoteHotelId) === mainId).map(l => Number(l.QuoteHotelId))
    );
    for (const row of this.hotels()) {
      if (this.samePackage(row, packageTypeId) && Number(row.SimilarHotelParentId) === mainId) linkedIds.add(Number(row.QuoteHotelId));
    }
    linkedIds.delete(mainId);

    return Array.from(linkedIds)
      .map(id => hotelRowsById.get(id))
      .filter((r): r is any => !!r)
      .sort((a, b) => (Number(a.SortOrder) || 0) - (Number(b.SortOrder) || 0));
  }

  private winningRowForNight(main: any, similar: any[], nightNumber: number): any {
    let winner = main;
    let winnerPrice = this.priceForNight(main, nightNumber);
    for (const row of similar) {
      const price = this.priceForNight(row, nightNumber);
      if (price > winnerPrice) { winner = row; winnerPrice = price; }
    }
    return winner;
  }

  hotelGroupsByPackage(packageTypeId: number): { nightNumber: number; stayDate: Date | null; main: any; similar: any[]; maxPrice: number }[] {
    const groups: { nightNumber: number; stayDate: Date | null; main: any; similar: any[]; maxPrice: number }[] = [];

    for (const main of this.hotelsByPackage(packageTypeId)) {
      const similar = this.similarRowsFor(Number(main.QuoteHotelId), packageTypeId);

      for (const nightNumber of this.nightsOf(main)) {
        const winner = this.winningRowForNight(main, similar, nightNumber);
        const maxPrice = this.priceForNight(winner, nightNumber);
        groups.push({ nightNumber, stayDate: this.nightDate(nightNumber), main, similar, maxPrice });
      }
    }

    return groups.sort((a, b) => a.nightNumber - b.nightNumber);
  }

  stayBlocksByPackage(packageTypeId: number): { main: any; similar: any[]; nights: number[]; checkIn: Date | null; checkOut: Date | null }[] {
    return this.hotelsByPackage(packageTypeId).map(main => {
      const nights = this.nightsOf(main).slice().sort((a, b) => a - b);
      const similar = this.similarRowsFor(Number(main.QuoteHotelId), packageTypeId);
      return {
        main,
        similar,
        nights,
        checkIn: this.nightDate(nights[0]),
        checkOut: this.nightDate(nights[nights.length - 1] + 1),
      };
    });
  }

  // ── Snapshot-first pricing helpers ───────────────────────────────
  private packagePricingSnapshotsFor(packageTypeId: number): any[] {
    return this.pricingSnapshots()
      .filter(s => Number(s.QuotePackageTypeId) === Number(packageTypeId))
      .sort((a, b) => (Number(a.SortOrder) || 0) - (Number(b.SortOrder) || 0));
  }

  private packageSummaryFor(packageTypeId: number): any | null {
    return this.packageSummaries().find(s => Number(s.QuotePackageTypeId) === Number(packageTypeId)) || null;
  }

  private childLabel(n: number, ages: number[]): string {
    return ages.length
      ? `${n} Child${n > 1 ? 'ren' : ''} (${ages.map(a => a + 'y').join(', ')})`
      : `${n} Child${n > 1 ? 'ren' : ''}`;
  }

  private rowKindDisplay(kind: string, count: number, cwebAges: number[], cnbAges: number[]): { label: string; paxLabel: string } {
    switch (kind) {
      case 'adult-double': return { label: 'Per Person (Double Sharing)', paxLabel: 'Pax' };
      case 'adult-single': return { label: 'Per Adult with Extra Bed/Mattress', paxLabel: 'Pax' };
      case 'child-cweb': return { label: 'Per Child with Extra Bed/Mattress', paxLabel: this.childLabel(count, cwebAges) };
      case 'child-cnb': return { label: 'Per Child without Extra Bed/Mattress', paxLabel: this.childLabel(count, cnbAges) };
      case 'infant': return { label: 'Per Infant', paxLabel: this.childLabel(count, []) };
      default: return { label: kind, paxLabel: 'Pax' };
    }
  }

  private guestCategoryTotalsFromSnapshot(packageTypeId: number, rows: any[]): { label: string; count: number; paxLabel: string; amount: number }[] {
    const roundingMode = this.pricing()?.RoundingMode ?? this.quoteHeader()?.RoundingMode ?? 'none';
    const ages = this.childrenAgesList();
    const cwebCount = Number(rows.find(r => r.RowKind === 'child-cweb')?.Qty) || 0;
    const cnbCount = Number(rows.find(r => r.RowKind === 'child-cnb')?.Qty) || 0;
    const cwebAges = ages.slice(0, cwebCount);
    const cnbAges = ages.slice(cwebCount, cwebCount + cnbCount);

    return rows
      .filter(r => (Number(r.Qty) || 0) > 0)
      .map(r => {
        const count = Number(r.Qty) || 0;
        const { label, paxLabel } = this.rowKindDisplay(r.RowKind, count, cwebAges, cnbAges);
        const amount = roundingMode !== 'none' ? Number(r.RoundedAmount) || 0 : Number(r.FinalPrice) || 0;
        return { label, count, paxLabel, amount };
      });
  }

  guestCategoryTotals(packageTypeId: number): { label: string; count: number; paxLabel: string; amount: number }[] {
    const snapshotRows = this.packagePricingSnapshotsFor(packageTypeId);
    if (snapshotRows.length) {
      return this.guestCategoryTotalsFromSnapshot(packageTypeId, snapshotRows);
    }
    // ── Fallback for quotes saved before the snapshot feature existed ──
    const totals = { double: 0, aweb: 0, cweb: 0, cnb: 0 };
    let counts = { double: 0, aweb: 0, cweb: 0, cnb: 0 };
    let countsSet = false;

    for (const main of this.hotelsByPackage(packageTypeId)) {
      const similar = this.similarRowsFor(Number(main.QuoteHotelId), packageTypeId);
      for (const nightNumber of this.nightsOf(main)) {
        const winner = this.winningRowForNight(main, similar, nightNumber);
        const base = (Number(winner.NoOfRooms) || 1) * (Number(winner.PaxPerRoom) || 2);
        const aweb = Number(winner.AWEB) || 0;
        const cweb = Number(winner.CWEB) || 0;
        const cnb = Number(winner.CNB) || 0;
        const np = this.nightPriceEntry(winner, nightNumber);

        if (np) {
          totals.double += Number(np.RoomTotal) || 0;
          totals.aweb += Number(np.AwebTotal) || 0;
          totals.cweb += Number(np.CwebTotal) || 0;
          totals.cnb += Number(np.CnbTotal) || 0;
        } else {
          const nightTotal = this.priceForNight(winner, nightNumber);
          const heads = base + aweb + cweb + cnb;
          const perHead = heads ? nightTotal / heads : 0;
          totals.double += perHead * base;
          totals.aweb += perHead * aweb;
          totals.cweb += perHead * cweb;
          totals.cnb += perHead * cnb;
        }

        if (!countsSet) {
          counts = { double: base, aweb, cweb, cnb };
          countsSet = true;
        }
      }
    }

    const ages = this.childrenAgesList();
    const cwebAges = ages.slice(0, counts.cweb);
    const cnbAges = ages.slice(counts.cweb, counts.cweb + counts.cnb);
    const childLabel = (n: number, group: number[]): string =>
      group.length ? `${n} Child${n > 1 ? 'ren' : ''} (${group.map(a => a + 'y').join(', ')})` : `${n} Child${n > 1 ? 'ren' : ''}`;

    const markup = this.packageMarkups().find(m => Number(m.QuotePackageTypeId) === Number(packageTypeId)) || null;
    const totalGuests = counts.double + counts.aweb + counts.cweb + counts.cnb;
    const sharedPool = this.packageSpecialInclusionTotal(packageTypeId) + this.transportTotal() + this.activityTotal() + (Number(markup?.TotalMarkup) || 0);
    const sharedPerHead = totalGuests ? sharedPool / totalGuests : 0;
    const perPersonMarkup = Number(markup?.PerPersonMarkup) || 0;
    const gstPercent = Number(this.pricing()?.GstPercent ?? this.quoteHeader()?.GstPercent ?? 0);
    const gstFactor = 1 + gstPercent / 100;

    const rows = [
      { key: 'double', label: 'Per Person (Double Sharing)', count: counts.double, base: totals.double, paxLabel: 'Pax' },
      { key: 'aweb', label: 'Per Adult with Extra Bed/Mattress', count: counts.aweb, base: totals.aweb, paxLabel: 'Pax' },
      { key: 'cweb', label: 'Per Child with Extra Bed/Mattress', count: counts.cweb, base: totals.cweb, paxLabel: childLabel(counts.cweb, cwebAges) },
      { key: 'cnb', label: 'Per Child without Extra Bed/Mattress', count: counts.cnb, base: totals.cnb, paxLabel: childLabel(counts.cnb, cnbAges) },
    ];

    return rows
      .filter(r => r.count > 0)
      .map(r => ({
        label: r.label,
        count: r.count,
        paxLabel: r.paxLabel,
        amount: Math.round(((r.base / r.count) + sharedPerHead + perPersonMarkup) * gstFactor),
      }));
  }

  packageGrandTotal(packageTypeId: number): number {
    const summary = this.packageSummaryFor(packageTypeId);
    if (summary) return Number(summary.GrandTotal) || 0;
    return this.guestCategoryTotals(packageTypeId).reduce((sum, r) => sum + r.amount * r.count, 0);
  }

  private nightRangeLabel(nights: number[]): string {
    const label = nights.map(n => `${n}${this.ordinal(n)}`).join(', ');
    return `${label} Night${nights.length > 1 ? 's' : ''}`;
  }

  paxSummary(row: any): string {
    const parts: string[] = [];
    const base = (Number(row.NoOfRooms) || 1) * (Number(row.PaxPerRoom) || 2);
    if (base) parts.push(`${base} Pax`);
    if (row.AWEB) parts.push(`${row.AWEB} Adult with Extra Bed/Mattress`);
    if (row.CWEB) parts.push(`${row.CWEB} Child with Extra Bed/Mattress`);
    if (row.CNB) parts.push(`${row.CNB} Child without Extra Bed/Mattress`);
    return parts.join(' + ');
  }

  private shortDate(value: any): string {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  private dayHeaderDate(date: Date): string {
    const weekday = date.toLocaleDateString('en-IN', { weekday: 'short' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-IN', { month: 'short' });
    const yr = date.getFullYear().toString().slice(-2);
    return `${weekday}, ${day}${this.ordinal(day)} ${month}'${yr}`;
  }

  private serviceQualifier(row: any): string {
    if (row.VehicleTypeId) return row.VehicleTypeName || 'Vehicle';
    const adults = Number(this.tripInfo()?.NoOfAdults) || 0;
    const ages = this.childrenAgesList();
    return `${adults}Ad.${ages.length ? ` + ${ages.length}Ch.` : ''}`;
  }

  groupPrice(quoteHotelId: number): number {
    for (const pkg of this.packageTypes()) {
      const group = this.hotelGroupsByPackage(pkg.QuotePackageTypeId).find(g => Number(g.main.QuoteHotelId) === Number(quoteHotelId));
      if (group) return group.maxPrice;
    }
    return 0;
  }

  packageHotelTotal(packageTypeId: number): number {
    return this.hotelGroupsByPackage(packageTypeId).reduce((sum, group) => sum + group.maxPrice, 0);
  }

  packageSpecialInclusionTotal(packageTypeId: number): number {
    return this.specialInclusionsByPackage(packageTypeId)
      .reduce((sum, row) => sum + (Number(row.TotalPrice) || 0), 0);
  }

  packageQuotePrice(packageTypeId: number): number {
    const summary = this.packageSummaryFor(packageTypeId);
    if (summary) return Number(summary.GrandTotal) || 0;
    return this.packageHotelTotal(packageTypeId)
      + this.packageSpecialInclusionTotal(packageTypeId)
      + this.transportTotal()
      + this.activityTotal();
  }

  packageCostPrice(packageTypeId: number): number {
    const summary = this.packageSummaryFor(packageTypeId);
    if (summary) return Number(summary.CostPrice) || 0;
    return this.hotelsByPackage(packageTypeId).reduce((sum, row) => sum + (Number(row.CostPrice) || 0), 0)
      + this.transportTotal()
      + this.activityTotal();
  }

  // ── Services / transport / activities ────────────────────────────
  transportServices(): any[] {
    return this.services().filter(row => Number(row.ServiceType) === 1);
  }

  activityServices(): any[] {
    return this.services().filter(row => Number(row.ServiceType) === 2);
  }

  transportTotal(): number {
    return this.transportServices().reduce((sum, row) => sum + this.money(row), 0);
  }

  activityTotal(): number {
    const serviceTotal = this.activityServices().reduce((sum, row) => sum + this.money(row), 0);
    const activityTotal = this.activities().reduce((sum, row) =>
      sum + (Number(row.SellingPrice) || Number(row.GivenPrice) || 0), 0);
    return serviceTotal + activityTotal;
  }

  transportActivityTotal(): number {
    return this.transportTotal() + this.activityTotal();
  }

  servicesForDay(dayNumber: number): any[] {
    return this.services()
      .filter(row => Number(row.DayNumber) === dayNumber)
      .sort((a, b) => Number(a.ServiceType) - Number(b.ServiceType));
  }

  dayHasServices(dayNumber: number): boolean {
    return this.servicesForDay(dayNumber).length > 0 || this.activityGroupsForDay(dayNumber).length > 0;
  }

  scheduleServiceForDay(dayNumber: number): any | null {
    return this.transportServices().find(row => Number(row.DayNumber) === dayNumber) || null;
  }

  daySchedule(dayNumber: number): { title: string; intro: string; sections: { heading: string; body: string }[] } | null {
    const svc = this.scheduleServiceForDay(dayNumber);
    if (!svc || !svc.DaySchedule) return null;
    return { title: svc.IteneraryServiceName || '', ...this.parseDaySchedule(svc.DaySchedule) };
  }

  rawDaySchedule(dayNumber: number): SafeHtml | null {
    const svc = this.scheduleServiceForDay(dayNumber);
    return svc?.DaySchedule ? this.sanitizeHtml(svc.DaySchedule) : null;
  }

  rawDayScheduleHtml(dayNumber: number): string {
    const svc = this.scheduleServiceForDay(dayNumber);
    return svc?.DaySchedule ? svc.DaySchedule : '';
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private parseDaySchedule(raw: string): { intro: string; sections: { heading: string; body: string }[] } {
    const blocks = (raw || '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    const sections: { heading: string; body: string }[] = [];
    let intro = '';
    let current: { heading: string; body: string } | null = null;
    for (const block of blocks) {
      if (block.startsWith('•')) {
        if (current) sections.push(current);
        current = { heading: block.replace(/^•\s*/, ''), body: '' };
      } else if (current) {
        current.body = current.body ? `${current.body} ${block}` : block;
      } else {
        intro = intro ? `${intro} ${block}` : block;
      }
    }
    if (current) sections.push(current);
    return { intro, sections };
  }

  serviceTitle(row: any): string {
    return row.LocationName || row.IteneraryServiceName || row.ActivityServiceName || 'Service';
  }

  serviceSubtitle(row: any): string {
    return row.IteneraryServiceName || row.ActivityServiceName || row.VehicleTypeName || '';
  }

  serviceDetail(row: any): string {
    if (Number(row.ServiceType) === 1) return row.VehicleTypeName || 'Transport';
    const qty = Number(row.Qty) || 1;
    return `${qty} ${row.PaxTypeLabel || row.PaxType || 'Adult'}`;
  }

  serviceBreakdown(row: any): string {
    const qty = Number(row.Qty) || 1;
    const price = Number(row.SellingPrice || row.TotalPrice || 0);
    if (qty <= 1 || !price) return this.formatCurrency(price);
    return `${this.formatCurrency(price / qty)} × ${qty}`;
  }

  ordinal(n: number): string {
    return n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  }

  inclusionText(row: any): string {
    return row.InclusionDetails || row.InclusionName || row.Name || row.Description || row.Inclusion || '';
  }

  exclusionText(row: any): string {
    return row.ExclusionDetails || row.ExclusionName || row.Name || row.Description || row.Exclusion || '';
  }

  termHtml(row: any): string {
    return row.TermAndConditionName || row.TermConditionName || row.Description || '';
  }

  hasTerms(): boolean {
    return this.terms().some(row => !!this.termHtml(row));
  }

  private samePackage(row: any, packageTypeId: number): boolean {
    const rowPackageId = Number(row?.QuotePackageTypeId) || 0;
    return rowPackageId === Number(packageTypeId);
  }

  private money(row: MoneySource): number {
    return Number(row.FinalPrice) || Number(row.TotalPrice) || Number(row.SellingPrice) || Number(row.CostPrice) || 0;
  }

  // ══════════════════════════════════════════════════════════════
  // SHARE DIALOG
  // ══════════════════════════════════════════════════════════════

  openShare(channel: 'whatsapp' | 'email' = 'whatsapp'): void {
    this.shareChannel.set(channel);
    this.shareOpen.set(true);
  }

  closeShare(): void {
    this.shareOpen.set(false);
  }

  setShareChannel(channel: 'whatsapp' | 'email'): void {
    this.shareChannel.set(channel);
  }

  toggleHideTotalPrice(): void { this.hideTotalPrice.update(v => !v); }
  toggleRemoveItinerary(): void { this.removeItinerary.update(v => !v); }
  toggleRemoveTerms(): void { this.removeTerms.update(v => !v); }
  toggleRemoveTransportActivities(): void { this.removeTransportActivities.update(v => !v); }

  buildWhatsAppText(): string {
    // ... keep existing WhatsApp text generation ...
    const trip = this.tripInfo();
    const nights = Number(trip?.NoOfNights) || 0;
    const days = nights + 1;
    const adults = Number(trip?.NoOfAdults) || 0;
    const ages = this.childrenAgesList();
    const lines: string[] = [];

    lines.push(`Hi ${trip?.ContactName || 'there'},`);
    lines.push('Greetings from Green Island Tours and Travels Private Limited.');
    lines.push('Thank you for your query with us. As per your requirements, following are the package details.');
    lines.push(`*Trip ID ${trip?.QuotationNo ? this.formatQuotationNo(trip.QuotationNo) : this.QueryStepOneId}* _(${this.packageTypes().length} Package Category/Options)_`);
    lines.push('----------');
    lines.push(`*${trip?.DestinationName || ''} Trip*`);
    lines.push(`• *${this.shortDate(trip?.StartDate)}* _for_ *${nights} Nights, ${days} Days*`);
    const childrenLabel = ages.length ? `, ${ages.length} Child${ages.length > 1 ? 'ren' : ''} (${ages.map(a => a + 'y').join(', ')})` : '';
    lines.push(`• *${adults} Adults${childrenLabel}*`);

    this.packageTypes().forEach((pkg, idx) => {
      lines.push(`⏬ *OPTION ${idx + 1}: ${pkg.PackageTypeName}*`);

      if (!this.hideTotalPrice()) {
        lines.push('*Price (INR):*');
        for (const c of this.guestCategoryTotals(pkg.QuotePackageTypeId)) {
          lines.push(`• *${this.formatCurrency(c.amount)} /- ${c.label}* x ${c.count} ${c.paxLabel}`);
        }
        lines.push(`*Total: ${this.formatCurrency(this.packageGrandTotal(pkg.QuotePackageTypeId))} /-* _(inc. GST)_`);
      }

      if (!this.removeItinerary()) {
        lines.push('🏨  *_Hotels_*');
        lines.push('-----------');
        for (const stay of this.stayBlocksByPackage(pkg.QuotePackageTypeId)) {
          lines.push(`*${this.nightRangeLabel(stay.nights)}* _at_ *${stay.main.LocationName || ''}*`);
          lines.push(`_Check-in: ${this.shortDate(stay.checkIn)}_ & _Check-out: ${this.shortDate(stay.checkOut)}_`);
          lines.push(`*${stay.main.HotelName}* (${stay.main.HotelCategoryName || ''})`);
          lines.push(`${stay.main.MealPlan || '-'} • ${stay.main.NoOfRooms || 1} ${stay.main.RoomTypeName || 'Room'} (${this.paxSummary(stay.main)})`);
          if (stay.similar.length) {
            lines.push('*Similar Options:*');
            for (const sim of stay.similar) {
              lines.push(`\`\`\`-\`\`\` *${sim.HotelName}* (${sim.HotelCategoryName || ''})`);
              lines.push(`\`\`\`•\`\`\` ${sim.NoOfRooms || 1} ${sim.RoomTypeName || 'Room'} (${this.paxSummary(sim)})`);
            }
          }
        }

        const inclusions = this.specialInclusionsByPackage(pkg.QuotePackageTypeId);
        if (inclusions.length) {
          lines.push('*Hotel Special Inclusions*');
          lines.push('-------');
          for (const si of inclusions) {
            lines.push(`*${si.NightNumber}${this.ordinal(si.NightNumber)} Night* - *${si.SpecialInclusionName}* (${si.HotelName})`);
          }
        }
      }
    });

    if (!this.removeTransportActivities() && !this.removeItinerary()) {
      lines.push('-------');
      lines.push('⏩ *For All Options*');
      lines.push('Details below are applicable for all the options.');
      lines.push('-------');
      lines.push('🚖  *Transportation and Activities*');
      lines.push('-----------');
      for (const day of this.daySlots()) {
        if (!this.dayHasServices(day.dayNumber)) continue;
        lines.push(`*${day.dayNumber}${this.ordinal(day.dayNumber)} Day - ${this.dayHeaderDate(day.date)}*`);
        for (const svc of this.servicesForDay(day.dayNumber)) {
          if (Number(svc.ServiceType) === 1) {
            lines.push(`• ${svc.LocationName || svc.IteneraryServiceName || 'Transport'} _(${this.serviceQualifier(svc)})_`);
          } else {
            lines.push(`• ${svc.LocationName || svc.ActivityServiceName || 'Activity'} _(${this.serviceDetail(svc)})_`);
          }
        }
        for (const group of this.activityGroupsForDay(day.dayNumber)) {
          const paxLabel = group.entries.map((e: any) => `${e.Qty}${(e.PaxTypeLabel || e.PaxType || 'Pax').charAt(0)}.`).join(' + ');
          lines.push(`• ${this.activityGroupTitle(group)} _(${paxLabel})_`);
        }
      }
    }

    return lines.join('\n');
  }

  sendWhatsApp(): void {
    const phone = (this.tripInfo()?.Phone || '').replace(/\D/g, '');
    const text = encodeURIComponent(this.buildWhatsAppText());
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  }

  copyWhatsAppText(): void {
    navigator.clipboard.writeText(this.buildWhatsAppText())
      .then(() => this.toastr.success('Copied to clipboard'))
      .catch(() => this.toastr.error('Could not copy'));
  }

  // ══════════════════════════════════════════════════════════════
  // EMAIL HTML GENERATION
  // Table-based markup, every style attribute INLINE (no <style>
  // block, no CSS classes) so a copy/paste into Gmail / Outlook /
  // Apple Mail / Yahoo Mail keeps the exact same look. No borders,
  // <hr>, or divider lines are used around the outer wrapper or
  // under section headings, because Gmail's compose editor renders
  // any such rule as a stray horizontal bar above the pasted
  // content — everything below is spacing-only, matching the plain,
  // border-free page layout of the reference quotation PDF.
  // ══════════════════════════════════════════════════════════════

  /** Design tokens reused across every inline style so the palette stays consistent with the reference PDF. */
  private readonly emailTheme = {
    brand: '#1155cc',      // reference "Package Overview" / heading blue
    brandDark: '#0b3d91',
    text: '#202124',
    muted: '#5f6368',
    border: '#c9ccd1',     // reference table grid-line grey
    panelBg: '#ffffff',
    zebraBg: '#f7f8fa',
    headerBg: '#eef3fb',   // reference table header tint
    green: '#188038',
    red: '#c5221f',
    gold: '#b98a00',
    goldBorder: '#e7b400',
    white: '#ffffff',
    font: "Arial, Helvetica, sans-serif",
  };

  /**
   * Builds a complete HTML email with inline styles for Gmail/Outlook compatibility.
   * Used to render the on-screen preview via [innerHTML].
   */
  buildEmailHtml(): SafeHtml {
    const html = this.generateEmailHTML();
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /**
   * Generates the complete, standalone HTML email document.
   * Table-based layout, all styling inline -> safe to paste into any
   * email client compose window. The outer wrapper has NO border,
   * radius or shadow (matches the plain page look of the reference
   * PDF and avoids Gmail rendering a stray top/bottom rule on paste).
   */
  private generateEmailHTML(): string {
    const trip = this.tripInfo();
    const t = this.emailTheme;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Quotation - ${this.formatQuotationNo(trip?.QuotationNo)}</title>
</head>
<body style="margin:0;padding:0;background-color:${t.white};font-family:${t.font};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${t.white};">
  <tr>
    <td align="center" style="padding:16px 0;">
      <table role="presentation" width="700" cellpadding="0" cellspacing="0" border="0" style="width:700px;max-width:700px;background-color:${t.white};font-family:${t.font};color:${t.text};">
        ${this.buildEmailBody()}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
  }

  /**
   * Builds the email body as a sequence of <tr> rows to be placed inside
   * the outer 700px wrapper table.
   */
  private buildEmailBody(): string {
    const trip = this.tripInfo();
    const t = this.emailTheme;
    let html = '';

    // ── Company name + greeting (plain text block, no colored band, matches the reference) ──
    html += `
      <tr>
        <td style="padding:6px 12px 14px 12px;font-family:${t.font};font-size:13px;color:${t.text};line-height:1.6;">
          <p style="margin:0 0 14px 0;font-size:15px;font-weight:bold;">Greetings from ${this.companyName()}!</p>
          <p style="margin:0 0 10px 0;">Dear ${trip?.ContactName || 'Sir / Madam'},</p>
          <p style="margin:0;">
            Thank you for reaching out to us with your travel requirements. As your trusted
            Destination Management Company (DMC)${this.companyRegion() ? ` for <strong>${this.companyRegion()}</strong>` : ''},
            we are pleased to share with you the proposed quotation for your upcoming travel plans.
          </p>
        </td>
      </tr>
    `;

    // ── Package Overview ──
    html += `
      <tr>
        <td style="padding:6px 12px 0 12px;">
          ${this.sectionTitle('Package Overview')}
          ${this.buildOverviewTable()}
        </td>
      </tr>
    `;

    // ── Price line (small bordered "Prices (INR)" tag + plain bold lines, exactly like the reference) ──
    if (!this.hideTotalPrice() && this.packageTypes().length) {
      html += `
        <tr>
          <td style="padding:0 12px 10px 12px;">
            ${this.buildPriceHighlightBox()}
          </td>
        </tr>
      `;
    }

    // ── Day Wise Itinerary ──
    if (!this.removeItinerary()) {
      html += `
        <tr>
          <td style="padding:6px 12px 0 12px;">
            ${this.sectionTitle('Day Wise Itinerary')}
            ${this.buildItineraryBlocks()}
          </td>
        </tr>
      `;
    }

    // ── Package / Hotel options ──
    if (!this.removeItinerary()) {
      this.packageTypes().forEach((pkg, idx) => {
        html += `
          <tr>
            <td style="padding:6px 12px 0 12px;">
              ${this.sectionTitle(this.packageTypes().length > 1 ? `Option ${idx + 1}: ${pkg.PackageTypeName || 'Package'}` : (pkg.PackageTypeName || 'Hotels'))}
              ${this.buildPackageHTML(pkg.QuotePackageTypeId)}
            </td>
          </tr>
        `;
      });
    }

    // ── Transportation & Activities ──
    if (!this.removeTransportActivities() && !this.removeItinerary() && this.hasAnyTransportOrActivity()) {
      html += `
        <tr>
          <td style="padding:6px 12px 0 12px;">
            ${this.sectionTitle('Transportation and Activities')}
            ${this.buildTransportActivitiesHTML()}
          </td>
        </tr>
      `;
    }

    // ── Inclusions / Exclusions ──
    if (this.inclusions().length || this.exclusions().length) {
      html += `
        <tr>
          <td style="padding:6px 12px 0 12px;">
            ${this.buildInclusionExclusionTable()}
          </td>
        </tr>
      `;
    }

    // ── Optional / paid activities (e.g. water sports) — plain bullet list, as in the reference ──
    if (this.activities().length) {
      html += `
        <tr>
          <td style="padding:6px 12px 0 12px;">
            ${this.sectionTitle('Optional Activities')}
            ${this.buildOptionalActivitiesList()}
          </td>
        </tr>
      `;
    }

    // ── Terms & Conditions ──
    if (!this.removeTerms() && this.hasTerms()) {
      html += `
        <tr>
          <td style="padding:6px 12px 0 12px;">
            ${this.sectionTitle('Terms and Conditions')}
            ${this.buildTermsList()}
          </td>
        </tr>
      `;
    }

    // ── Footer (spacing only — no top border/rule) ──
    html += `
      <tr>
        <td style="padding:22px 12px 10px 12px;text-align:center;font-family:${t.font};font-size:11px;color:${t.muted};line-height:1.7;">
          <strong style="color:${t.text};font-size:12px;">${this.companyName()}</strong><br>
          ${this.footerContactLine()}
          <em>This is a system-generated quotation. Please verify all details before confirmation.</em><br>
          <span>&copy; ${new Date().getFullYear()} ${this.companyName()}. All rights reserved.</span>
        </td>
      </tr>
    `;

    return html;
  }

  // ── Small reusable inline-styled building blocks ──────────────────

  private companyName(): string {
    return this.tripInfo()?.CompanyName || this.quoteHeader()?.CompanyName || 'Green Island Tours and Travels Private Limited';
  }

  private companyRegion(): string {
    return this.tripInfo()?.CompanyRegion || this.quoteHeader()?.CompanyRegion || this.tripInfo()?.DestinationName || '';
  }

  private footerContactLine(): string {
    const parts = [this.tripInfo()?.CompanyEmail, this.tripInfo()?.CompanyPhone, this.tripInfo()?.CompanyWebsite].filter(Boolean);
    return parts.length ? `${parts.join(' &nbsp;|&nbsp; ')}<br>` : '';
  }

  /**
   * Centered, bold, blue section heading — no border/underline of any
   * kind, so nothing renders as a horizontal rule once pasted into Gmail.
   * Matches the reference PDF's "Package Overview" / "Day Wise Itinerary"
   * / "Transportation and Activities" style exactly.
   */
  private sectionTitle(label: string): string {
    const t = this.emailTheme;
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="font-family:${t.font};font-size:15px;font-weight:bold;color:${t.brand};padding:10px 0 10px 0;">
            ${label}
          </td>
        </tr>
      </table>
    `;
  }

  private hasAnyTransportOrActivity(): boolean {
    return this.daySlots().some(d => this.dayHasServices(d.dayNumber));
  }

  /** Bordered key/value table for Trip ID / Destination / Dates / Pax, styled after the PDF's "Package Overview" box. */
  private buildOverviewTable(): string {
    const t = this.emailTheme;
    const trip = this.tripInfo();
    const rows: [string, string][] = ([
      ['Trip ID', this.formatQuotationNo(trip?.QuotationNo)],
      ['Destination', trip?.DestinationName || '-'],
      ['Start Date', this.formatDateLong(trip?.StartDate) || '-'],
      ['Trip Duration', this.durationLabel()],
      ['Pax', this.paxOverviewLabel()],
    ] as [string, string][]).filter(([, v]) => !!v);

    const rowsHtml = rows.map(([label, value]) => `
      <tr>
        <td style="font-family:${t.font};font-size:13px;color:${t.text};padding:8px 12px;border:1px solid ${t.border};width:160px;">${label}</td>
        <td style="font-family:${t.font};font-size:13px;font-weight:bold;color:${t.text};padding:8px 12px;border:1px solid ${t.border};">${value}</td>
      </tr>
    `).join('');

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:10px;">
        ${rowsHtml}
      </table>
    `;
  }

  /**
   * Small bordered "Prices (INR)" tag followed by plain bold price lines
   * and a bold Total — matches the reference exactly (only the label is
   * boxed, the price lines themselves sit on a plain white background).
   */
  private buildPriceHighlightBox(): string {
    const t = this.emailTheme;
    const pkg = this.packageTypes()[0];
    if (!pkg) return '';
    const categories = this.guestCategoryTotals(pkg.QuotePackageTypeId);
    if (!categories.length) return '';

    const linesHtml = categories.map(c => `
      <tr>
        <td style="font-family:${t.font};font-size:13px;font-weight:bold;color:${t.text};padding:2px 0;">
          ${this.formatCurrency(c.amount)} /- ${c.label} x ${c.count} ${c.paxLabel}
        </td>
      </tr>
    `).join('');

    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:6px;">
        <tr>
          <td style="display:inline-block;border:1px solid ${t.goldBorder};color:${t.gold};font-family:${t.font};font-size:12px;font-weight:bold;padding:3px 10px;">Prices (INR)</td>
        </tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">${linesHtml}</table>
      <div style="font-family:${t.font};font-size:14px;font-weight:bold;color:${t.text};margin-top:6px;">
        Total: ${this.formatCurrency(this.packageGrandTotal(pkg.QuotePackageTypeId))} /-
        <span style="font-weight:normal;font-style:italic;font-size:11px;color:${t.muted};">(excluding GST unless stated)</span>
      </div>
    `;
  }

  /**
   * Day-wise itinerary, one block per day — matches the reference's
   * "1st Day (Thu 10th December) : Title" style. When the day's
   * schedule was authored in the Quill editor, its sanitized HTML is
   * embedded directly so headings, bold/italic text, lists and links
   * from the editor are preserved natively (Gmail renders plain
   * semantic tags like <strong>/<ul>/<a> correctly with no inline
   * styles required).
   */
  private buildItineraryBlocks(): string {
    const t = this.emailTheme;
    let html = '';

    for (const day of this.daySlots()) {
      const svc = this.scheduleServiceForDay(day.dayNumber);
      const dayTitle = svc?.LocationName || svc?.IteneraryServiceName || '';
      const rawHtml = svc?.DaySchedule ? this.rawDayScheduleHtml(day.dayNumber) : '';
      if (!rawHtml && !this.dayHasServices(day.dayNumber) && !dayTitle) continue;

      html += `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
          <tr>
            <td style="font-family:${t.font};font-size:13.5px;font-weight:bold;color:${t.brand};padding-bottom:4px;">
              ${day.dayNumber}${this.ordinal(day.dayNumber)} Day (${this.dayHeaderDate(day.date)})${dayTitle ? ` : ${dayTitle}` : ''}
            </td>
          </tr>
          ${rawHtml ? `
          <tr>
            <td style="font-family:${t.font};font-size:13px;color:${t.text};line-height:1.6;">${rawHtml}</td>
          </tr>` : ''}
          ${this.buildDayHighlightsList(day.dayNumber)}
        </table>
      `;
    }

    return html || `<p style="font-family:${t.font};font-size:13px;color:${t.muted};">Itinerary details will be shared shortly.</p>`;
  }

  /** Compact bullet list of that day's services/activities/entry tickets, for the itinerary block. */
  private buildDayHighlightsList(dayNumber: number): string {
    const t = this.emailTheme;
    const items: string[] = [];

    for (const svc of this.servicesForDay(dayNumber)) {
      if (Number(svc.ServiceType) === 1) {
        items.push(`${this.serviceTitle(svc)}${svc.VehicleTypeName ? ` (${svc.VehicleTypeName})` : ''}`);
      } else {
        items.push(`${this.serviceTitle(svc)}${svc.ActivityServiceName ? ` - ${svc.ActivityServiceName}` : ''}`);
      }
    }
    for (const group of this.activityGroupsForDay(dayNumber)) {
      items.push(this.activityGroupTitle(group));
    }

    if (!items.length) return '';

    return `
      <tr>
        <td style="padding-top:2px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            ${items.map(i => `
              <tr>
                <td style="font-family:${t.font};font-size:12.5px;color:${t.text};padding:1px 0;">: ${i}</td>
              </tr>
            `).join('')}
          </table>
        </td>
      </tr>
    `;
  }

  /**
   * Builds HTML for a single package option: hotel table, special
   * inclusions and the guest-category price breakdown.
   */
  private buildPackageHTML(packageTypeId: number): string {
    const t = this.emailTheme;
    let html = '';

    const stays = this.stayBlocksByPackage(packageTypeId);
    if (stays.length) {
      html += `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:10px;">
          <tr>
            <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:12px;font-weight:bold;padding:7px 10px;width:90px;">Nights</td>
            <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:12px;font-weight:bold;padding:7px 10px;">Hotel</td>
            <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:12px;font-weight:bold;padding:7px 10px;width:70px;">Meal</td>
            <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:12px;font-weight:bold;padding:7px 10px;width:110px;">Rooms</td>
          </tr>
          ${stays.map((stay, i) => this.buildHotelRow(stay, i)).join('')}
        </table>
      `;
    }

    const inclusions = this.specialInclusionsByPackage(packageTypeId);
    if (inclusions.length) {
      html += `
        <div style="font-family:${t.font};font-size:13px;font-weight:bold;color:${t.brand};margin:6px 0 6px 0;">Hotel Special Inclusions</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:10px;">
          <tr>
            <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:12px;font-weight:bold;padding:6px 10px;width:70px;">Night</td>
            <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:12px;font-weight:bold;padding:6px 10px;width:170px;">Hotel</td>
            <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:12px;font-weight:bold;padding:6px 10px;">Special Inclusion</td>
          </tr>
          ${inclusions.map((si, i) => `
            <tr>
              <td style="border:1px solid ${t.border};font-family:${t.font};font-size:12px;padding:6px 10px;${i % 2 ? `background-color:${t.zebraBg};` : ''}">${si.NightNumber}${this.ordinal(si.NightNumber)}<br><span style="font-size:11px;color:${t.muted};">${this.shortDate(this.nightDate(si.NightNumber))}</span></td>
              <td style="border:1px solid ${t.border};font-family:${t.font};font-size:12px;padding:6px 10px;font-weight:bold;${i % 2 ? `background-color:${t.zebraBg};` : ''}">${si.HotelName || ''}</td>
              <td style="border:1px solid ${t.border};font-family:${t.font};font-size:12px;padding:6px 10px;${i % 2 ? `background-color:${t.zebraBg};` : ''}"><strong>${si.SpecialInclusionName || ''}</strong>${si.Comments ? `<br><span style="font-size:11px;color:${t.muted};">${si.Comments}</span>` : ''}</td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    if (!this.hideTotalPrice()) {
      const categories = this.guestCategoryTotals(packageTypeId);
      if (categories.length) {
        html += `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${categories.map(c => `
              <tr>
                <td style="font-family:${t.font};font-size:12.5px;color:${t.text};padding:2px 0;">${this.formatCurrency(c.amount)} /- ${c.label} x ${c.count} ${c.paxLabel}</td>
              </tr>
            `).join('')}
            <tr>
              <td style="font-family:${t.font};font-size:13.5px;font-weight:bold;color:${t.text};padding-top:6px;">
                Total: ${this.formatCurrency(this.packageGrandTotal(packageTypeId))} /-
              </td>
            </tr>
          </table>
        `;
      }
    }

    return html;
  }

  private buildHotelRow(stay: any, index: number): string {
    const t = this.emailTheme;
    const zebra = index % 2 ? `background-color:${t.zebraBg};` : '';

    const nightsLabel = stay.nights
      .map((n: number) => `${n}${this.ordinal(n)}<br><span style="font-size:11px;color:${t.muted};">${this.shortDate(this.nightDate(n))}</span>`)
      .join('<br>');

    let hotelCell = `<span style="font-weight:bold;color:${t.text};">${stay.main.HotelName || ''}</span>`;
    if (stay.main.LocationName) hotelCell += `<br><span style="font-size:11px;color:${t.muted};">${stay.main.LocationName}</span>`;
    if (stay.main.HotelCategoryName) hotelCell += `<br><span style="font-size:11px;color:${t.muted};">${stay.main.HotelCategoryName}</span>`;

    for (const sim of stay.similar) {
      hotelCell += `<br><span style="color:${t.brand};">/ <strong>${sim.HotelName || ''}</strong>${sim.HotelCategoryName ? ` <span style="font-size:11px;color:${t.muted};">(${sim.HotelCategoryName})</span>` : ''}</span>`;
    }

    const roomsCell = `${stay.main.NoOfRooms || 1} ${stay.main.RoomTypeName || 'Room'}<br><span style="font-size:11px;color:${t.muted};">${this.paxSummary(stay.main)}</span>`;

    let totalPrice = 0;
    for (const night of stay.nights) {
      const winner = this.winningRowForNight(stay.main, stay.similar, night);
      totalPrice += this.priceForNight(winner, night);
    }

    return `
      <tr>
        <td style="border:1px solid ${t.border};font-family:${t.font};font-size:12px;padding:7px 10px;vertical-align:top;${zebra}">${nightsLabel}</td>
        <td style="border:1px solid ${t.border};font-family:${t.font};font-size:12px;padding:7px 10px;vertical-align:top;${zebra}">${hotelCell}</td>
        <td style="border:1px solid ${t.border};font-family:${t.font};font-size:12px;padding:7px 10px;vertical-align:top;${zebra}">${stay.main.MealPlan || '-'}</td>
        <td style="border:1px solid ${t.border};font-family:${t.font};font-size:12px;padding:7px 10px;vertical-align:top;${zebra}">${roomsCell}</td>
      </tr>
    `;
  }

  /**
   * Builds HTML for transportation and activities, grouped day-by-day
   * with a running total, mirroring the PDF's "Transportation and
   * Activities" table.
   */
  private buildTransportActivitiesHTML(): string {
    const t = this.emailTheme;
    let html = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:12px;font-weight:bold;padding:7px 10px;width:130px;">Day</td>
          <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:12px;font-weight:bold;padding:7px 10px;">Service</td>
        </tr>
    `;

    let rowIndex = 0;
    for (const day of this.daySlots()) {
      if (!this.dayHasServices(day.dayNumber)) continue;
      const zebra = rowIndex % 2 ? `background-color:${t.zebraBg};` : '';
      rowIndex++;

      const items: string[] = [];
      for (const svc of this.servicesForDay(day.dayNumber)) {
        if (Number(svc.ServiceType) === 1) {
          items.push(`<div style="margin:2px 0;"><strong>${this.serviceTitle(svc)}</strong> <span style="color:${t.muted};font-size:11px;">(${this.serviceQualifier(svc)})</span>${svc.VehicleTypeName ? `<br><span style="font-size:11px;color:${t.muted};">${svc.VehicleTypeName}</span>` : ''}</div>`);
        }
      }
      for (const group of this.activityGroupsForDay(day.dayNumber)) {
        const paxLabel = group.entries.map((e: any) => `${e.Qty} ${e.PaxTypeLabel || e.PaxType || 'Pax'}`).join(' + ');
        items.push(`<div style="margin:2px 0;"><strong>${this.activityGroupTitle(group)}</strong> <span style="color:${t.muted};font-size:11px;">(${paxLabel})</span></div>`);
      }

      html += `
        <tr>
          <td style="border:1px solid ${t.border};font-family:${t.font};font-size:12px;padding:7px 10px;vertical-align:top;${zebra}">
            <strong>${day.dayNumber}${this.ordinal(day.dayNumber)} Day</strong><br>
            <span style="font-size:11px;color:${t.muted};">${this.dayHeaderDate(day.date)}</span>
          </td>
          <td style="border:1px solid ${t.border};font-family:${t.font};font-size:12px;padding:7px 10px;vertical-align:top;${zebra}">${items.join('')}</td>
        </tr>
      `;
    }

    html += `</table>`;

    html += `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
        <tr>
          <td style="font-family:${t.font};font-size:13.5px;font-weight:bold;color:${t.text};padding-top:4px;">
            Total: ${this.formatCurrency(this.transportActivityTotal())} /-
          </td>
        </tr>
        <tr>
          <td style="font-family:${t.font};font-size:11px;color:${t.muted};">
            Transports: ${this.formatCurrency(this.transportTotal())} &nbsp;|&nbsp; Activities/Tickets: ${this.formatCurrency(this.activityTotal())}
          </td>
        </tr>
      </table>
    `;

    return html;
  }

  /**
   * Inclusions / Exclusions as a single two-column table with plain
   * bold black centered headers (same grid style as the other tables
   * in the reference — no colored underline bar).
   */
  private buildInclusionExclusionTable(): string {
    const t = this.emailTheme;
    const incItems = this.inclusions().map(i => this.inclusionText(i)).filter(Boolean);
    const excItems = this.exclusions().map(e => this.exclusionText(e)).filter(Boolean);

    const list = (items: string[], mark: string, color: string): string =>
      items.length
        ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${items.map(i => `
            <tr><td style="font-family:${t.font};font-size:12px;color:${t.text};padding:2px 0;vertical-align:top;">
              <span style="color:${color};font-weight:bold;">${mark}&nbsp;</span>${i}
            </td></tr>`).join('')}</table>`
        : `<span style="font-family:${t.font};font-size:12px;color:${t.muted};font-style:italic;">None added.</span>`;

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:13px;font-weight:bold;color:${t.text};padding:8px 12px;width:50%;text-align:center;">Inclusions</td>
          <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:13px;font-weight:bold;color:${t.text};padding:8px 12px;width:50%;text-align:center;">Exclusions</td>
        </tr>
        <tr>
          <td style="border:1px solid ${t.border};padding:10px 12px;vertical-align:top;">${list(incItems, '&#10003;', t.green)}</td>
          <td style="border:1px solid ${t.border};padding:10px 12px;vertical-align:top;">
            ${list(excItems, '&#10007;', t.red)}
            <div style="font-family:${t.font};font-size:11px;color:${t.muted};font-style:italic;margin-top:8px;">Anything not listed under inclusions is excluded.</div>
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Optional / paid activities (e.g. water sports) rendered as a plain
   * "Name : Rs.X /- per head" bullet list, matching the reference's
   * "Water Sports Activities" note style — no table/box.
   */
  private buildOptionalActivitiesList(): string {
    const t = this.emailTheme;
    const rows = this.activities();
    if (!rows.length) return '';

    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        ${rows.map(row => `
          <tr>
            <td style="font-family:${t.font};font-size:12.5px;color:${t.text};padding:2px 0;">
              ${row.ActivityServiceName || row.ActivityName || '-'}${row.LocationName ? ` @ ${row.LocationName}` : ''} :
              <strong>${this.formatCurrency(Number(row.SellingPrice) || Number(row.GivenPrice) || 0)} /- per head</strong>
            </td>
          </tr>
        `).join('')}
      </table>
    `;
  }

  /**
   * Boxed Terms & Conditions list, matching the PDF's shaded "Terms and
   * Conditions" panel. Term text may itself contain sanitized Quill
   * HTML (bold/italic/links) — it is embedded as-is.
   */
  private buildTermsList(): string {
    const t = this.emailTheme;
    const items = this.terms().map(term => this.termHtml(term)).filter(Boolean);
    if (!items.length) return '';

    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        ${items.map(term => `
          <tr>
            <td style="font-family:${t.font};font-size:12.5px;color:${t.text};padding:3px 0;vertical-align:top;">&#8226;&nbsp; ${term}</td>
          </tr>
        `).join('')}
      </table>
    `;
  }

  /**
   * Copies the fully-inlined HTML email to the clipboard using the modern
   * Clipboard API (text/html + text/plain), so pasting into Gmail (or any
   * rich-text compose window) reproduces the preview almost pixel-for-pixel.
   */
  async copyEmailHtml(): Promise<void> {
    const htmlContent = this.generateEmailHTML();
    const plainText = this.buildWhatsAppText(); // Readable plain-text fallback

    try {
      if (navigator.clipboard && typeof (window as any).ClipboardItem !== 'undefined') {
        const clipboardItem = new ClipboardItem({
          'text/html': new Blob([htmlContent], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
        });
        await navigator.clipboard.write([clipboardItem]);
        this.toastr.success('Email copied! Paste it directly into Gmail (Ctrl+V / Cmd+V).');
        return;
      }
    } catch (error) {
      console.error('Rich clipboard copy failed, falling back:', error);
    }

    // Fallback path for browsers without full Clipboard API / ClipboardItem support.
    try {
      await navigator.clipboard.writeText(plainText);
      this.toastr.success('Copied as plain text (this browser does not support rich HTML copy).');
    } catch (err) {
      console.error('Plain-text clipboard copy failed:', err);
      this.toastr.error('Could not copy to clipboard. Please try again.');
    }
  }


  private paxOverviewLabel(): string {
    const adults = Number(this.tripInfo()?.NoOfAdults) || 0;
    const ages = this.childrenAgesList();
    const childLabel = ages.length ? `, ${ages.length} Child${ages.length > 1 ? 'ren' : ''} (${ages.map(a => a + 'y').join(', ')})` : '';
    return `${adults} Adults${childLabel}`;
  }


  private formatDateShort(value: any): string {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private formatDateLong(value: any): string {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  // ══════════════════════════════════════════════════════════════
  // PDF GENERATION
  // ══════════════════════════════════════════════════════════════

  private readonly pdfImages = new PdfImageLoader();
  private readonly pdfBuilder = new QuotationPdfEngine();

  async downloadPdf(): Promise<void> {
    this.pdfLoading.set(true);
    try {
      const coverImage = await this.pdfImages.loadCoverImage(this.tripInfo()?.DestinationName);
      const logoImage = await this.pdfImages.loadLogo();
      const docDefinition = this.pdfBuilder.build({
        tripInfo: this.tripInfo(),
        quoteHeader: this.quoteHeader(),
        packageTypes: this.packageTypes(),
        hotelsByPackage: (pkgId: number) => this.hotelsByPackage(pkgId),
        similarHotels: this.similarHotels(),
        specialInclusions: this.specialInclusions(),
        hasSimilarHotels: (id: number) => this.hasSimilarHotels(id),
        daySlots: this.daySlots(),
        servicesForDay: (d: number) => this.servicesForDay(d),
        activityGroupsForDay: (d: number) => this.activityGroupsForDay(d),
        activityGroupTitle: (g: any) => this.activityGroupTitle(g),
        serviceTitle: (s: any) => this.serviceTitle(s),
        serviceSubtitle: (s: any) => this.serviceSubtitle(s),
        serviceBreakdown: (s: any) => this.serviceBreakdown(s),
        daySchedule: (d: number) => this.daySchedule(d),
        rawDaySchedule: (d: number) => this.rawDayScheduleHtml(d),
        inclusions: this.inclusions(),
        exclusions: this.exclusions(),
        inclusionText: (i: any) => this.inclusionText(i),
        exclusionText: (e: any) => this.exclusionText(e),
        terms: this.terms(),
        hasTerms: this.hasTerms(),
        termHtml: (t: any) => this.termHtml(t),
        packageQuotePrice: (id: number) => this.packageQuotePrice(id),
        packageCostPrice: (id: number) => this.packageCostPrice(id),
        pricingSnapshots: this.pricingSnapshots(),
        packageSummaries: this.packageSummaries(),
        durationLabel: this.durationLabel(),
        totalGuestCount: this.totalGuestCount(),
        formatCurrency: (n: number) => this.formatCurrency(n),
        formatQuotationNo: (n: any) => this.formatQuotationNo(n),
        ordinal: (n: number) => this.ordinal(n),
        formatDateShort: (v: any) => this.formatDateShort(v),
        formatDateLong: (v: any) => this.formatDateLong(v),
        removeTransportActivities: this.removeTransportActivities(),
        removeItinerary: this.removeItinerary(),
        removeTerms: this.removeTerms(),
        hideTotalPrice: this.hideTotalPrice(),
        coverImage,
        logoImage,
        sanitizeHtml: (html: string) => this.sanitizer.sanitize(SecurityContext.HTML, html) || '',
      });
      pdfMake.createPdf(docDefinition).download(
        `Quotation-${this.formatQuotationNo(this.tripInfo()?.QuotationNo)}.pdf`
      );
    } catch (e) {
      console.error('PDF generation error', e);
      this.toastr.error('Error generating PDF');
    } finally {
      this.pdfLoading.set(false);
    }
  }
}
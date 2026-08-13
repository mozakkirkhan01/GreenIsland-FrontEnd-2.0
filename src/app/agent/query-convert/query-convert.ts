import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';

import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { RequestModel } from '../../utils/interface';
import { LocalService } from '../../utils/local.service';

type MoneySource = { TotalPrice?: number; FinalPrice?: number; SellingPrice?: number; CostPrice?: number };

export interface Instalment {
  id: number;
  amount: number;
  percent: number;
  dueDate: string; // yyyy-MM-dd, bound to <input type="date">
}

@Component({
  selector: 'app-query-convert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './query-convert.html',
  styleUrl: './query-convert.css',
})
export class QueryConvert implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(AppService);
  private local = inject(LocalService);
  private toastr = inject(ToastrService);
  private sanitizer = inject(DomSanitizer);

  QueryStepOneId = 0;
  QuoteId = 0;

  loading = signal(false);
  quoteDetail = signal<any | null>(null);
  inclusions = signal<any[]>([]);
  exclusions = signal<any[]>([]);
  terms = signal<any[]>([]);

  selectedPackageTypeId = signal<number>(0);
  comments = signal<string>('');
  verified = signal<boolean>(false);
  instalments = signal<Instalment[]>([]);
  instalmentsDirty = signal<boolean>(false);
  private nextInstalmentId = 1;

  // ── Derived data — same shape as GetQuoteDetail everywhere else in the app ──
  tripInfo = computed<any>(() => this.quoteDetail()?.TripInfo ?? null);
  quoteHeader = computed<any>(() => this.quoteDetail()?.Quote ?? null);
  packageTypes = computed<any[]>(() => this.quoteDetail()?.PackageTypes ?? []);
  hotels = computed<any[]>(() => this.quoteDetail()?.Hotels ?? []);
  services = computed<any[]>(() => this.quoteDetail()?.Services ?? []);
  specialInclusions = computed<any[]>(() => this.quoteDetail()?.SpecialInclusions ?? []);
  activities = computed<any[]>(() => this.quoteDetail()?.Activities ?? []);
  similarHotels = computed<any[]>(() => this.quoteDetail()?.SimilarHotels ?? []);
  pricing = computed<any>(() => this.quoteDetail()?.Pricing ?? null);
  packageMarkups = computed<any[]>(() => this.quoteDetail()?.PackageMarkups ?? []);
  pricingSnapshots = computed<any[]>(() => this.quoteDetail()?.PricingSnapshots ?? []);
  packageSummaries = computed<any[]>(() => this.quoteDetail()?.PackageSummaries ?? []);

  selectedPackage = computed<any>(() =>
    this.packageTypes().find(p => Number(p.QuotePackageTypeId) === Number(this.selectedPackageTypeId())) || null
  );

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
    this.loadQuote();
  }

  private enc(data: object): RequestModel {
    return { request: this.local.encrypt(JSON.stringify(data)).toString() };
  }

  private loadQuote(): void {
    this.loading.set(true);
    this.service.getQuoteDetail(this.enc({ QueryStepOneId: this.QueryStepOneId, QuoteId: this.QuoteId })).subscribe({
      next: (quote: any) => {
        if (quote.Message === ConstantData.SuccessMessage) {
          this.quoteDetail.set(quote);
          if (!this.QuoteId && quote.Quote?.QuoteId) this.QuoteId = quote.Quote.QuoteId;
          const first = this.packageTypes()[0];
          if (first) this.selectPackage(first.QuotePackageTypeId);
          this.loadDestinationContent();
        } else {
          this.toastr.error(quote.Message || 'Unable to load quote detail');
        }
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('getQuoteDetail error:', err);
        this.loading.set(false);
        this.toastr.error('Error loading quote detail');
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

  // ── Quote Used selector ───────────────────────────────────────────
  selectPackage(packageTypeId: number): void {
    this.selectedPackageTypeId.set(packageTypeId);
    this.resetInstalments();
  }

  // ── Formatting helpers (ported from Step Four) ────────────────────
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
    return `${nights} Nights, ${nights + 1} Days`;
  }

  // ── Package / accommodation grouping (ported from Step Four) ──────
  hotelsByPackage(packageTypeId: number): any[] {
    return this.hotels()
      .filter(row => this.samePackage(row, packageTypeId) && row.HotelId > 0 && row.IsMainHotel !== false)
      .sort((a, b) => (Number(a.NightNumber) || 0) - (Number(b.NightNumber) || 0));
  }

  specialInclusionsByPackage(packageTypeId: number): any[] {
    return this.specialInclusions().filter(row => this.samePackage(row, packageTypeId));
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

  private packagePricingSnapshotsFor(packageTypeId: number): any[] {
    return this.pricingSnapshots()
      .filter(s => Number(s.QuotePackageTypeId) === Number(packageTypeId))
      .sort((a, b) => (Number(a.SortOrder) || 0) - (Number(b.SortOrder) || 0));
  }

  private packageSummaryFor(packageTypeId: number): any | null {
    return this.packageSummaries().find(s => Number(s.QuotePackageTypeId) === Number(packageTypeId)) || null;
  }

  isGstIncluded(packageTypeId?: number): boolean {
    const enabled = this.pricing()?.GstEnabled;
    if (enabled !== undefined && enabled !== null) return !!enabled;
    if (packageTypeId !== undefined) {
      const summary = this.packageSummaryFor(packageTypeId);
      if (summary) return (Number(summary.GSTAmount) || 0) > 0;
    }
    return Number(this.pricing()?.GstPercent ?? this.quoteHeader()?.GstPercent ?? 0) > 0;
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

  isOverallPricing(packageTypeId?: number): boolean {
    const raw =
      (packageTypeId !== undefined ? this.packageSummaryFor(packageTypeId)?.PricingStrategy : undefined) ??
      this.pricing()?.PricingStrategy ??
      this.quoteHeader()?.PricingStrategy;
    if (raw === undefined || raw === null || raw === '') return false;
    const normalized = String(raw).trim().toLowerCase().replace(/[\s_-]/g, '');
    return normalized === 'overall' || normalized === 'total' || normalized === 'package' || normalized === 'lumpsum';
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
    if (this.isOverallPricing(packageTypeId)) return [];

    const snapshotRows = this.packagePricingSnapshotsFor(packageTypeId);
    if (snapshotRows.length) {
      return this.guestCategoryTotalsFromSnapshot(packageTypeId, snapshotRows);
    }

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
    const gstFactor = this.isGstIncluded(packageTypeId) ? 1 + gstPercent / 100 : 1;

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

  private samePackage(row: any, packageTypeId: number): boolean {
    return (Number(row?.QuotePackageTypeId) || 0) === Number(packageTypeId);
  }

  private money(row: MoneySource): number {
    return Number(row.FinalPrice) || Number(row.TotalPrice) || Number(row.SellingPrice) || Number(row.CostPrice) || 0;
  }

  // ── Services / transport / activities (ported from Step Four) ─────
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

  activityGroupsForDay(dayNumber: number): any[] {
    return this.activityGroups().filter(g => Number(g.DayNumber) === dayNumber);
  }

  activityGroupTitle(group: any): string {
    return [group.LocationName, group.ActivityServiceName].filter(Boolean).join(' - ');
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

  hasAnyDaySchedule(): boolean {
    return this.daySlots().some(day => !!this.daySchedule(day.dayNumber));
  }

  rawDaySchedule(dayNumber: number): SafeHtml | null {
    const svc = this.scheduleServiceForDay(dayNumber);
    return svc?.DaySchedule ? this.sanitizeHtml(svc.DaySchedule) : null;
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

  // ══════════════════════════════════════════════════════════════
  // INSTALMENTS — fully derived from the selected package's total,
  // no hardcoded amounts. Amount and Percent stay in sync both ways;
  // adding a row defaults to whatever's left unallocated.
  // ══════════════════════════════════════════════════════════════

  private round2(n: number): number {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  private selectedTotal(): number {
    const pkg = this.selectedPackage();
    return pkg ? this.packageQuotePrice(pkg.QuotePackageTypeId) : 0;
  }

  private defaultDueDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private resetInstalments(): void {
    this.nextInstalmentId = 1;
    const total = this.selectedTotal();
    this.instalments.set([
      { id: this.nextInstalmentId++, amount: this.round2(total), percent: 100, dueDate: this.defaultDueDate() },
    ]);
    this.instalmentsDirty.set(false);
  }

  remainingAmount(): number {
    const total = this.selectedTotal();
    const used = this.instalments().reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    return this.round2(total - used);
  }

  remainingPercent(): number {
    const total = this.selectedTotal();
    if (!total) return 0;
    return Math.round((this.remainingAmount() / total) * 1000) / 10;
  }

  isFirstInstalment(inst: Instalment): boolean {
    const list = this.instalments();
    return list.length > 1 && list[0]?.id === inst.id;
  }

  isLastInstalment(inst: Instalment): boolean {
    const list = this.instalments();
    return list.length > 1 && list[list.length - 1]?.id === inst.id;
  }

  updateInstalmentAmount(inst: Instalment, value: string): void {
    const total = this.selectedTotal();
    const amount = this.round2(Number(value));
    const percent = total ? Math.round((amount / total) * 1000) / 10 : 0;
    this.patchInstalment(inst.id, { amount, percent });
  }

  updateInstalmentPercent(inst: Instalment, value: string): void {
    const total = this.selectedTotal();
    const percent = Number(value) || 0;
    const amount = this.round2((total * percent) / 100);
    this.patchInstalment(inst.id, { amount, percent });
  }

  updateInstalmentDueDate(inst: Instalment, value: string): void {
    this.patchInstalment(inst.id, { dueDate: value });
  }

  private patchInstalment(id: number, patch: Partial<Instalment>): void {
    this.instalments.update(list => list.map(i => (i.id === id ? { ...i, ...patch } : i)));
    this.instalmentsDirty.set(true);
  }

  addInstalment(): void {
    const total = this.selectedTotal();
    const remaining = Math.max(this.remainingAmount(), 0);
    const percent = total ? Math.round((remaining / total) * 1000) / 10 : 0;
    const lastDueDate = this.instalments()[this.instalments().length - 1]?.dueDate || this.defaultDueDate();
    this.instalments.update(list => [
      ...list,
      { id: this.nextInstalmentId++, amount: remaining, percent, dueDate: lastDueDate },
    ]);
    this.instalmentsDirty.set(true);
  }

  removeInstalment(inst: Instalment): void {
    if (this.instalments().length <= 1) return;
    this.instalments.update(list => list.filter(i => i.id !== inst.id));
    this.instalmentsDirty.set(true);
  }

  updateComments(value: string): void {
    this.comments.set(value);
  }

  toggleVerified(): void {
    this.verified.update(v => !v);
  }

  canSubmit(): boolean {
    return this.verified() && Math.abs(this.remainingAmount()) < 1 && this.instalments().length > 0;
  }

  // TODO: wire these up to the real convert/on-hold endpoints once the
  // backend contract for this flow is defined — currently just guards on
  // the verification checkbox and gives feedback.
  sendForHolding(): void {
    if (!this.canSubmit()) {
      this.toastr.warning('Please verify the details before proceeding.');
      return;
    }
    this.toastr.info('Send for Holding — backend not wired up yet.');
  }

  convertTrip(): void {
    if (!this.canSubmit()) {
      this.toastr.warning('Please verify the details before proceeding.');
      return;
    }
    this.toastr.info('Convert Trip — backend not wired up yet.');
  }

  cancel(): void {
    this.router.navigate(['/agent/query-stepfour', this.QueryStepOneId], {
      queryParams: this.QuoteId ? { quoteId: this.QuoteId } : {},
    });
  }
}
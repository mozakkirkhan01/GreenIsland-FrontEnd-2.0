import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { RequestModel } from '../../utils/interface';
import { LocalService } from '../../utils/local.service';
import { CanComponentDeactivate } from '../../guards/can-deactivate-guard';

// npm install pdfmake  (and, if using TS strict mode, npm install -D @types/pdfmake)
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
    this.service.getQuoteDetail(this.enc({ QueryStepOneId: this.QueryStepOneId, QuoteId: this.QuoteId })).subscribe({
      next: (quote: any) => {
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
      error: () => {
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

  guestCategoryTotals(packageTypeId: number): { label: string; count: number; paxLabel: string; amount: number }[] {
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
    return this.packageHotelTotal(packageTypeId)
      + this.packageSpecialInclusionTotal(packageTypeId)
      + this.transportTotal()
      + this.activityTotal();
  }

  packageCostPrice(packageTypeId: number): number {
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

  buildEmailHtml(): SafeHtml {
    const trip = this.tripInfo();
    let html = `
      <p>Greetings from Green Island Tours and Travels Private Limited!</p>
      <p>Dear Sir / Madam,</p>
      <p>Thank you for reaching out to us with your travel requirements. As your trusted
      Destination Management Company (DMC) for ${trip?.DestinationName || 'your destination'},
      we are pleased to share with you the proposed quotation for your upcoming travel plans.</p>
      <h4>Package Overview</h4>
      <table class="table table-bordered table-sm">
        <tr><td>Trip ID</td><td>${this.formatQuotationNo(trip?.QuotationNo)}</td></tr>
        <tr><td>Destination</td><td>${trip?.DestinationName || ''}</td></tr>
        <tr><td>Start Date</td><td>${this.formatDate(trip?.StartDate)}</td></tr>
        <tr><td>Trip Duration</td><td>${this.durationLabel()}</td></tr>
        <tr><td>Pax</td><td>${this.paxOverviewLabel()}</td></tr>
      </table>`;

    if (!this.removeItinerary()) {
      html += `<h4>Hotels</h4>`;
      this.packageTypes().forEach((pkg, idx) => {
        html += `<h5>Option ${idx + 1}: ${pkg.PackageTypeName}</h5>`;
        html += `<table class="table table-bordered table-sm">
          <thead><tr><th>Nights</th><th>City</th><th>Hotel Name</th><th>Meal Plan</th><th>Accommodation</th></tr></thead><tbody>`;
        for (const stay of this.stayBlocksByPackage(pkg.QuotePackageTypeId)) {
          const nightsCell = stay.nights.map(n => `${n}${this.ordinal(n)} (${this.shortDate(this.nightDate(n))})`).join('<br>');
          let hotelCell = `<strong>${stay.main.HotelName}</strong> (${stay.main.HotelCategoryName || ''})`;
          for (const sim of stay.similar) {
            hotelCell += `<br>/ ${sim.HotelName} (${sim.RoomTypeName || 'Room'})`;
          }
          html += `<tr>
            <td>${nightsCell}</td>
            <td>${stay.main.LocationName || ''}</td>
            <td>${hotelCell}</td>
            <td>${stay.main.MealPlan || '-'}</td>
            <td>${stay.main.NoOfRooms || 1} ${stay.main.RoomTypeName || 'Room'}<br>${this.paxSummary(stay.main)}</td>
          </tr>`;
        }
        html += `</tbody></table>`;

        const inclusions = this.specialInclusionsByPackage(pkg.QuotePackageTypeId);
        if (inclusions.length) {
          html += `<p><strong>Hotel Special Inclusions</strong></p><table class="table table-bordered table-sm"><tbody>`;
          for (const si of inclusions) {
            html += `<tr>
              <td>${si.NightNumber}${this.ordinal(si.NightNumber)} (${this.shortDate(this.nightDate(si.NightNumber))})</td>
              <td>${this.hotelLocationCategory(si.HotelId).split(',')[0]}</td>
              <td>${si.HotelName}</td>
              <td>${si.SpecialInclusionName}</td>
            </tr>`;
          }
          html += `</tbody></table>`;
        }

        if (!this.hideTotalPrice()) {
          html += `<p><strong>Prices (INR)</strong></p><ul>`;
          for (const c of this.guestCategoryTotals(pkg.QuotePackageTypeId)) {
            html += `<li>${this.formatCurrency(c.amount)} /- ${c.label} x ${c.count} ${c.paxLabel}</li>`;
          }
          html += `</ul><p><strong>Total: ${this.formatCurrency(this.packageGrandTotal(pkg.QuotePackageTypeId))} /-</strong> (including GST)</p>`;
        }
      });
    }

    if (!this.removeItinerary()) {
      html += `<h4>Day Wise Itinerary</h4>`;
      for (const day of this.daySlots()) {
        const sched = this.daySchedule(day.dayNumber);
        if (!sched) continue;
        html += `<p><strong>${day.dayNumber}${this.ordinal(day.dayNumber)} Day (${this.dayHeaderDate(day.date).replace(`'${day.date.getFullYear().toString().slice(-2)}`, '')}) : ${sched.title}</strong></p>`;
        if (sched.intro) html += `<p>${sched.intro}</p>`;
        for (const section of sched.sections) {
          html += `<p><em>${section.heading}</em><br>${section.body}</p>`;
        }
      }
    }

    if (!this.removeTransportActivities() && !this.removeItinerary()) {
      html += `<h4>Transportation and Activities (for all options)</h4>
        <table class="table table-bordered table-sm">
        <thead><tr><th>Day</th><th>Service</th></tr></thead><tbody>`;
      for (const day of this.daySlots()) {
        if (!this.dayHasServices(day.dayNumber)) continue;
        html += `<tr><td>${day.dayNumber}${this.ordinal(day.dayNumber)} Day<br>(${this.dayHeaderDate(day.date)})</td><td>`;
        for (const svc of this.servicesForDay(day.dayNumber)) {
          const qualifier = Number(svc.ServiceType) === 1 ? this.serviceQualifier(svc) : this.serviceDetail(svc);
          html += `${svc.LocationName || svc.IteneraryServiceName || svc.ActivityServiceName || 'Service'}<br><small>${qualifier}</small><br>`;
        }
        for (const group of this.activityGroupsForDay(day.dayNumber)) {
          const paxLabel = group.entries.map((e: any) => `${e.Qty}${(e.PaxTypeLabel || e.PaxType || 'Pax').charAt(0)}.`).join(' + ');
          html += `${this.activityGroupTitle(group)}<br><small>${paxLabel}</small><br>`;
        }
        html += `</td></tr>`;
      }
      html += `</tbody></table>`;
    }

    if (!this.removeTerms() && this.hasTerms()) {
      html += `<h4>Terms and Conditions</h4><ul>`;
      for (const term of this.terms()) html += `<li>${this.termHtml(term)}</li>`;
      html += `</ul>`;
    }

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private paxOverviewLabel(): string {
    const adults = Number(this.tripInfo()?.NoOfAdults) || 0;
    const ages = this.childrenAgesList();
    const childLabel = ages.length ? `, ${ages.length} Child${ages.length > 1 ? 'ren' : ''} (${ages.map(a => a + 'y').join(', ')})` : '';
    return `${adults} Adults${childLabel}`;
  }

  copyEmailHtml(): void {
    const container = document.createElement('div');
    container.innerHTML = this.buildEmailHtml() as any;
    navigator.clipboard.writeText(container.innerText)
      .then(() => this.toastr.success('Copied to clipboard'))
      .catch(() => this.toastr.error('Could not copy'));
  }

  private formatDate(value: any): string {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  // ══════════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════
  // CLIENT-SIDE PDF GENERATION — pdfmake
  //
  // Rewritten from the previous jsPDF implementation, which had the
  // exact hardcoded-data problem this whole module has been built to
  // avoid: it baked in "GREEN ISLAND", "ANDAMAN", a fixed phone number,
  // email, and office-locations string for every quote regardless of
  // which agency or destination the quote actually belongs to. On a
  // multi-agency platform (TripInfoModel.AgencyName varies per trip)
  // that means every other agency's customer was seeing Green Island's
  // own contact details on their PDF. None of that is carried forward.
  //
  // What's real vs. what's a known gap:
  // - Destination, agency name, contact name, pax, dates, consultant,
  //   package prices, hotels, transport/activities, day schedule,
  //   inclusions/exclusions/terms — all bound to actual API fields.
  // - Company phone/email/office-address: TripInfoModel has no such
  //   fields (only AgencyName). I'm not hardcoding Green Island's own
  //   contact info here — if you want a real per-agency contact block,
  //   GetQuoteDetail's TripInfoModel needs Agency phone/email/address
  //   fields added first.
  // - Cover photo collage: no image assets available; using a clean
  //   text-only branded cover instead of fabricated stock photography.
  //
  // npm install pdfmake  (and -D @types/pdfmake if you want types)
  // ══════════════════════════════════════════════════════════════

  async downloadPdf(): Promise<void> {
    this.pdfLoading.set(true);
    try {
      const docDefinition = this.buildPdfDocDefinition();
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

  // ── Diagonal tiled watermark, drawn fresh on every page via pdfmake's
  // background callback — this is the exact thing jsPDF made painful. ──
  private pdfWatermark(pageSize: { width: number; height: number }): any[] {
    const trip = this.tripInfo();
    const label = [trip?.AgencyName, `Trip# ${this.formatQuotationNo(trip?.QuotationNo)}`]
      .filter(Boolean).join(' • ');
    if (!label) return [];

    const elements: any[] = [];
    const stepX = 220, stepY = 90;
    for (let y = -60; y < pageSize.height + 60; y += stepY) {
      for (let x = -80; x < pageSize.width + 80; x += stepX) {
        elements.push({
          text: label,
          fontSize: 9,
          color: '#94a3b8',
          opacity: 0.18,
          angle: -30,
          absolutePosition: { x, y },
        });
      }
    }
    return elements;
  }

  private stripHtml(value: string | null | undefined): string {
    return (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private buildPdfDocDefinition(): any {
    const trip = this.tripInfo();
    const pkgTypes = this.packageTypes();
    const primary = '#0d6efd';

    const endDate = trip?.StartDate ? new Date(trip.StartDate) : null;
    if (endDate) endDate.setDate(endDate.getDate() + Number(trip?.NoOfNights || 0));

    const content: any[] = [];

    // ─── Cover ───────────────────────────────────────────────────
    content.push(
      { text: trip?.AgencyName || '', style: 'agencyName', alignment: 'center', margin: [0, 20, 0, 4] },
      { text: "It's Time to Explore", style: 'coverTagline', alignment: 'center' },
      { text: (trip?.DestinationName || '').toUpperCase(), style: 'coverDestination', alignment: 'center' },
      {
        columns: [
          {
            width: '50%',
            table: {
              widths: ['*'],
              body: [[{
                stack: [
                  { text: 'Trip ID', style: 'label' },
                  { text: `#${this.formatQuotationNo(trip?.QuotationNo)}`, style: 'value' },
                  { text: trip?.ContactName || 'Guest', margin: [0, 6, 0, 0] },
                  { text: `${this.totalGuestCount()} Guests`, style: 'label' },
                  { text: 'Starts / Ends', style: 'label', margin: [0, 6, 0, 0] },
                  { text: `${this.formatDateShort(trip?.StartDate)}  —  ${this.formatDateShort(endDate)} (${this.durationLabel()})`, style: 'value' },
                ],
                margin: [8, 8, 8, 8],
              }]],
            },
            layout: 'lightHorizontalLines',
          },
          {
            width: '50%',
            table: {
              widths: ['*'],
              body: [[{
                stack: [
                  { text: 'Your Holiday Consultant', style: 'label' },
                  { text: trip?.SalesPersonName || '', style: 'value' },
                ],
                margin: [8, 8, 8, 8],
              }]],
            },
            layout: 'lightHorizontalLines',
          },
        ],
        columnGap: 12,
        margin: [0, 30, 0, 0],
      },
      { text: '', pageBreak: 'after' },
    );

    // ─── Greeting + Quote Price ──────────────────────────────────
    content.push(
      { text: `Dear ${trip?.ContactName || 'Guest'},`, style: 'h2' },
      { text: `Greetings from ${trip?.AgencyName || 'us'}.`, margin: [0, 4, 0, 4] },
      {
        text: "Our sales team has put up this Quote regarding your upcoming trip. Please go through it and let us know if you would like any changes in any of the provided services.",
        margin: [0, 0, 0, 12],
      },
      {
        columns: [
          { width: '33%', stack: [{ text: 'DESTINATION', style: 'label' }, { text: trip?.DestinationName || '', style: 'value' }] },
          { width: '33%', stack: [{ text: 'START DATE', style: 'label' }, { text: this.formatDateLong(trip?.StartDate), style: 'value' }] },
          { width: '34%', stack: [{ text: 'DURATION', style: 'label' }, { text: this.durationLabel(), style: 'value' }] },
        ],
        margin: [0, 0, 0, 12],
      },
    );

    if (!this.hideTotalPrice() && pkgTypes.length) {
      content.push(
        { text: `Quote Price (${pkgTypes.length} Package Option${pkgTypes.length > 1 ? 's' : ''})`, style: 'sectionBanner' },
        {
          table: {
            widths: ['auto', '*', 'auto'],
            body: [
              [{ text: '#', style: 'tableHead' }, { text: 'Option', style: 'tableHead' }, { text: 'Total (INR)', style: 'tableHead' }],
              ...pkgTypes.map((pkg: any, idx: number) => [
                String(idx + 1),
                pkg.PackageTypeName,
                { text: `${this.formatCurrency(this.packageQuotePrice(pkg.QuotePackageTypeId))} /-
(including ${this.quoteHeader()?.GstPercent || 5}% GST)`, style: 'priceCell' },
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 16],
        },
      );
    }

    // ─── Hotels / Accommodations, per package ───────────────────
    for (const pkg of pkgTypes) {
      const hotels = this.hotelsByPackage(pkg.QuotePackageTypeId);
      if (!hotels.length) continue;

      content.push({ text: `Hotels / Accommodations`, style: 'sectionBanner' });
      content.push({ text: `Option: ${pkg.PackageTypeName}`, style: 'h3', margin: [0, 0, 0, 8] });

      for (const hotel of hotels) {
        content.push({
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                { text: `${hotel.NightNumber}${this.ordinal(hotel.NightNumber)} Night at ${hotel.LocationName || ''}`, style: 'h4' },
                { text: `Check-in on ${this.formatDateLong(hotel.StayDate)}`, style: 'label', margin: [0, 0, 0, 6] },
                { text: hotel.HotelName, style: 'hotelName' },
                {
                  columns: [
                    { width: '50%', stack: [{ text: 'ROOMS', style: 'label' }, { text: `${hotel.NoOfRooms} ${hotel.RoomTypeName || ''}`, bold: true }, { text: `${hotel.PaxPerRoom} Pax`, style: 'label' }] },
                    { width: '50%', stack: [{ text: 'MEAL PLAN', style: 'label' }, { text: hotel.MealPlan || '', bold: true }] },
                  ],
                  margin: [0, 4, 0, 0],
                },
                ...(this.hasSimilarHotels(hotel.QuoteHotelId) ? [{
                  text: 'Similar alternatives: ' + this.similarHotels()
                    .filter((s: any) => s.ParentQuoteHotelId === hotel.QuoteHotelId)
                    .map((s: any) => s.HotelName).join(', '),
                  style: 'label',
                  margin: [0, 6, 0, 0],
                }] : []),
              ],
              margin: [10, 10, 10, 10],
            }]],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 8],
        });

        const inclusionsForHotel = this.specialInclusions().filter((si: any) => si.QuoteHotelId === hotel.QuoteHotelId);
        if (inclusionsForHotel.length) {
          content.push({ text: 'Hotel Special Inclusions', style: 'h4', margin: [0, 4, 0, 4] });
          for (const si of inclusionsForHotel) {
            content.push({
              table: {
                widths: ['*'],
                body: [[{
                  stack: [
                    { text: si.SpecialInclusionName, bold: true },
                    { text: `${si.NightNumber ? this.ordinal(si.NightNumber) + ' Night' : ''} at ${si.HotelName || ''}` },
                  ],
                  margin: [8, 8, 8, 8],
                }]],
              },
              layout: 'lightHorizontalLines',
              margin: [0, 0, 0, 8],
            });
          }
        }
      }
    }

    // ─── Transportation and Activities ───────────────────────────
    if (!this.removeTransportActivities()) {
      const days = this.daySlots().filter((d: any) => this.servicesForDay(d.dayNumber).length || this.activityGroupsForDay(d.dayNumber).length);
      if (days.length) {
        content.push({ text: 'Transportation and Activities', style: 'sectionBanner' });
        const rows: any[] = [[{ text: 'Day', style: 'tableHead' }, { text: 'Service', style: 'tableHead' }, { text: '', style: 'tableHead' }]];
        for (const day of days) {
          const serviceLines: any[] = [];
          for (const svc of this.servicesForDay(day.dayNumber)) {
            serviceLines.push({
              cols: [`${this.serviceTitle(svc)} - ${this.serviceSubtitle(svc)}`, svc.VehicleTypeName || '', this.serviceBreakdown(svc)],
            });
          }
          for (const group of this.activityGroupsForDay(day.dayNumber)) {
            serviceLines.push({
              cols: [this.activityGroupTitle(group), group.entries.map((e: any) => `${e.Qty} ${e.PaxTypeLabel || e.PaxType}`).join(', '), ''],
            });
          }
          serviceLines.forEach((line, idx) => {
            rows.push([
              idx === 0 ? { text: [`${day.dayNumber}${this.ordinal(day.dayNumber)} Day
`, { text: day.shortDate, style: 'label' }], rowSpan: serviceLines.length } : {},
              line.cols[0],
              [line.cols[1], line.cols[2]].filter(Boolean).join(''),
            ]);
          });
        }
        content.push({
          table: { widths: ['auto', '*', 'auto'], body: rows },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 16],
        });
      }
    }

    // ─── Day Wise Itinerary ──────────────────────────────────────
    if (!this.removeItinerary()) {
      const days = this.daySlots().filter((d: any) => this.daySchedule(d.dayNumber));
      if (days.length) {
        content.push({ text: 'Day Wise Itinerary', style: 'sectionBanner' });
        for (const day of days) {
          const sched = this.daySchedule(day.dayNumber)!;
          content.push({
            columns: [
              { width: 60, text: [`${day.dayNumber}${this.ordinal(day.dayNumber)}
`, { text: 'Day', style: 'label' }], style: 'dayBadge' },
              {
                width: '*',
                stack: [
                  { text: this.formatDateLong(day.date), style: 'label' },
                  { text: sched.title, style: 'h4' },
                  ...(sched.intro ? [{ text: sched.intro, margin: [0, 4, 0, 4] }] : []),
                  ...sched.sections.flatMap((s: any) => ([
                    { text: s.heading, bold: true, margin: [0, 4, 0, 2] },
                    { text: s.body, margin: [0, 0, 0, 4] },
                  ])),
                ],
              },
            ],
            margin: [0, 0, 0, 12],
          });
        }
      }
    }

    // ─── Terms and Conditions / Inclusions / Exclusions ──────────
    if (!this.removeTerms()) {
      if (this.inclusions().length || this.exclusions().length) {
        content.push({ text: 'Inclusions / Exclusions', style: 'sectionBanner' });
        content.push({
          columns: [
            { width: '50%', ul: this.inclusions().map((i: any) => this.inclusionText(i)) },
            { width: '50%', ul: this.exclusions().map((e: any) => this.exclusionText(e)) },
          ],
          margin: [0, 0, 0, 16],
        });
      }
      if (this.hasTerms()) {
        content.push({ text: 'Terms and Conditions', style: 'sectionBanner' });
        for (const term of this.terms()) {
          content.push({ text: this.stripHtml(this.termHtml(term)), margin: [0, 0, 0, 8] });
        }
      }
    }

    return {
      pageSize: 'A4',
      pageMargins: [40, 50, 40, 40],
      background: (currentPage: number, pageSize: any) => ({
        stack: this.pdfWatermark(pageSize),
      }),
      header: (currentPage: number) => currentPage === 1 ? null : {
        text: trip?.AgencyName || '',
        alignment: 'center',
        color: primary,
        bold: true,
        margin: [0, 16, 0, 0],
      },
      footer: (currentPage: number, pageCount: number) => ({
        text: `${currentPage} / ${pageCount}`,
        alignment: 'center',
        style: 'label',
      }),
      content,
      styles: {
        agencyName: { fontSize: 20, bold: true, color: primary },
        coverTagline: { fontSize: 16, margin: [0, 30, 0, 0] },
        coverDestination: { fontSize: 30, bold: true, color: primary, margin: [0, 4, 0, 0] },
        sectionBanner: { fontSize: 13, bold: true, color: primary, fillColor: '#e7edff', margin: [0, 12, 0, 8] },
        h2: { fontSize: 14, bold: true },
        h3: { fontSize: 12, bold: true, color: primary },
        h4: { fontSize: 11, bold: true, color: primary },
        hotelName: { fontSize: 12, bold: true, color: '#1e293b', margin: [0, 2, 0, 4] },
        label: { fontSize: 8, color: '#64748b' },
        value: { fontSize: 11, bold: true },
        priceCell: { fontSize: 12, bold: true, color: primary },
        tableHead: { bold: true, fillColor: '#f1f5f9' },
        dayBadge: { fontSize: 16, bold: true, color: primary },
      },
      defaultStyle: { fontSize: 9 },
    };
  }


  private formatDateShort(value: any): string {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private formatDateLong(value: any): string {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
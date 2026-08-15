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
  emailGreetingHtml = signal<string>('');

  activePackageTypeId = signal<number>(0);

  // ── Tabs: Basic Details / All Quotes / Activities ─────────────────
  activeTab = signal<'basic' | 'quotes' | 'activities'>('quotes');

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
    this.loadEmailGreetingTemplate();
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

  /**
   * Fetches the "Greetings" rich-text block from Master Entry > Template
   * (Repository > Template in the nav — see the Update Template admin
   * screen with the Status dropdown + Greetings editor) and stores it raw.
   * On failure or an empty result, emailGreetingHtml() stays '' and
   * buildEmailBody() falls back to the previous hardcoded paragraphs, so a
   * template API outage can't blank out the greeting entirely.
   *
   * ASSUMPTIONS I could not verify against a live API/DTO — check these
   * against your actual Template/TemplateList response before trusting this:
   *   - Response shape follows the same convention as InclusionList/
   *     ExclusionList/TermAndConditionList: { Message, TemplateList: [...] }
   *   - Each row has a `Status` field where the active row is literally the
   *     string 'Active' (matching the dropdown in your screenshot), and a
   *     `Greetings` field holding the editor's HTML.
   *   - The endpoint doesn't require a filter payload — sent as {} here.
   * If any of those field names are wrong, only this method needs updating;
   * nothing else in the file depends on the Template API shape.
   */
  private loadEmailGreetingTemplate(): void {
    this.service.getTemplateList(this.enc({})).subscribe({
      next: (res: any) => {
        if (res?.Message !== ConstantData.SuccessMessage) return;
        const list: any[] = res.TemplateList ?? [];
        const active = list.find(row => row?.Status === 'Active') ?? list[0];
        this.emailGreetingHtml.set(active?.Greetings || '');
      },
      error: (err: any) => {
        console.error('getTemplateList error:', err);
        // Leave emailGreetingHtml() as '' — buildEmailBody() has a fallback.
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
  setActiveTab(tab: 'basic' | 'quotes' | 'activities'): void {
    this.activeTab.set(tab);
  }

  convertOrHoldUsingQuote(): void {
    this.router.navigate(['/agent/query-convert', this.QueryStepOneId], {
      queryParams: this.QuoteId ? { quoteId: this.QuoteId } : {},
    });
  }

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
    return `${nights}Nights / ${nights + 1}Days`;
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

  // ── Dynamic GST inclusion flag ───────────────────────────────────
  // Single source of truth for "was GST actually applied to this quote",
  // used everywhere the UI/WhatsApp text/PDF previously hardcoded
  // "(inc. GST)" (or, in the PDF builder, the contradictory hardcoded
  // "(excluding GST)") regardless of what was actually saved in step three.
  //
  // Preference order:
  //  1. The explicit toggle saved on QuotePricing.GstEnabled (pricing().GstEnabled)
  //     — this is the real flag the user set via the GST checkbox in step three.
  //  2. Fallback for quotes saved before GstEnabled existed on the pricing
  //     row: check whether the saved package summary actually carries a
  //     non-zero GST amount.
  //  3. Last-resort fallback: whether a GST percent is even configured.
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

  // ── Pricing strategy (Overall vs Per Person) ─────────────────────
  // Single source of truth for "was this package priced as one lump
  // Overall total, or split Per Person by guest category". Read
  // directly from the persisted data saved in Step Three — never
  // re-derived from hotel/guest math — checked in order of
  // specificity:
  //   1. PackageSummary.PricingStrategy for this package (per-package
  //      override, if the summary row carries one)
  //   2. QuotePricing.PricingStrategy (the value saved from Step
  //      Three's pricing-strategy toggle)
  //   3. Quote header PricingStrategy (older/alternate save location)
  // An unrecognised or missing value falls back to Per Person — the
  // only behavior that existed before this toggle — so quotes saved
  // before the Overall/Per Person option existed are unaffected.
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
    // Overall pricing strategy: the saved GrandTotal (see packageGrandTotal())
    // IS the whole package price — there is no per-guest-category split to
    // show. Returning no rows here means every caller (Step Four UI,
    // WhatsApp, Email, PDF) automatically stops printing "X /- Per Person
    // ... x N Pax" bullet lines and falls through to just the Total line.
    if (this.isOverallPricing(packageTypeId)) return [];

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

  packageGrandTotal(packageTypeId: number): number {
    const summary = this.packageSummaryFor(packageTypeId);
    if (summary) return Number(summary.GrandTotal) || 0;

    if (this.isOverallPricing(packageTypeId)) {
      // No saved PackageSummary for this package (older/edge-case quote).
      // Sum the pricing snapshot rows directly instead of falling through
      // to the guest-category reducer below, since that reducer divides by
      // guest count and would reintroduce the exact "Per Person" bug this
      // fix removes. Snapshot rows -> full component totals -> the
      // strategy-agnostic component sum, in that preference order.
      const snapshotRows = this.packagePricingSnapshotsFor(packageTypeId);
      if (snapshotRows.length) {
        const roundingMode = this.pricing()?.RoundingMode ?? this.quoteHeader()?.RoundingMode ?? 'none';
        return snapshotRows.reduce((sum, r) => sum + (roundingMode !== 'none' ? Number(r.RoundedAmount) || 0 : Number(r.FinalPrice) || 0), 0);
      }
      return this.packageQuotePrice(packageTypeId);
    }

    return this.guestCategoryTotals(packageTypeId).reduce((sum, r) => sum + r.amount * r.count, 0);
  }

  /**
   * A "stay" from stayBlocksByPackage() can hold non-contiguous nights
   * (e.g. Port Blair nights [1, 5] when the guest returns to the same
   * hotel just before departure after touring other islands in between).
   * The email hotel table must not merge those into one row — each
   * contiguous run of nights gets its own row so night 1 and night 5
   * land in their correct chronological position relative to the other
   * cities' rows, instead of both showing under a single Port Blair row.
   */
  private splitStayByContiguousNights(stay: any): any[] {
    const nights: number[] = stay.nights;
    if (nights.length <= 1) return [stay];

    const runs: number[][] = [];
    let current: number[] = [nights[0]];
    for (let i = 1; i < nights.length; i++) {
      if (nights[i] === nights[i - 1] + 1) {
        current.push(nights[i]);
      } else {
        runs.push(current);
        current = [nights[i]];
      }
    }
    runs.push(current);

    if (runs.length === 1) return [stay];

    return runs.map(run => ({
      ...stay,
      nights: run,
      checkIn: this.nightDate(run[0]),
      checkOut: this.nightDate(run[run.length - 1] + 1),
    }));
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

  /**
   * Normalizes a raw meal plan string into a fixed canonical label based on
   * its plan code, so word order never drifts between records — e.g. a
   * saved value of "Dinner + Breakfast + Lunch (AP)" and one saved as
   * "Lunch + Breakfast + Dinner (AP)" both display identically as
   * "Lunch + Dinner + Breakfast (AP)". The code (whatever sits in the
   * trailing parentheses) is what's authoritative, not the meal words
   * preceding it. Unrecognized codes fall through to the raw stored value
   * unchanged, so this never hides a plan type nobody's mapped yet.
   *
   * Returns HTML with a <br> between the meal list and the "(CODE)" so the
   * two always sit on separate lines in the narrow Meal Plan column,
   * instead of wrapping mid-word wherever the column happens to break.
   */
  private formatMealPlan(raw: string | null | undefined): string {
    if (!raw) return '';
    const match = raw.match(/\(([^)]+)\)\s*$/);
    const code = match ? match[1].trim().toUpperCase() : raw.trim().toUpperCase();

    const canonical: Record<string, string> = {
      CP: 'Breakfast',
      MAP: 'Dinner + Breakfast',
      AP: 'Lunch + Dinner + Breakfast',
    };

    const mealsLabel = canonical[code];
    if (mealsLabel) return `${mealsLabel}<div style="text-align:center;">(${code})</div>`;

    // Unrecognized code: keep the raw meal words as-is, just still break
    // the "(CODE)" onto its own centered line if one is present.
    const codeMatch = raw.match(/\s*\(([^)]+)\)\s*$/);
    if (codeMatch) {
      return raw.slice(0, codeMatch.index) + `<div style="text-align:center;">(${codeMatch[1]})</div>`;
    }
    return raw;
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

  hasAnyDaySchedule(): boolean {
    return this.daySlots().some(day => !!this.daySchedule(day.dayNumber));
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
        const gstNote = this.isGstIncluded(pkg.QuotePackageTypeId) ? '_(inc. GST)_' : '_(excl. GST)_';
        lines.push(`*Total: ${this.formatCurrency(this.packageGrandTotal(pkg.QuotePackageTypeId))} /-* ${gstNote}`);
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
  // EMAIL HTML GENERATION - WITH STYLED HEADERS
  // ══════════════════════════════════════════════════════════════

  private readonly emailTheme = {
    brand: '#1155cc',
    text: '#202124',
    muted: '#5f6368',
    border: '#c9ccd1',
    headerBg: '#fbeefa',
    zebraBg: '#f7f8fa',
    green: '#188038',
    red: '#c5221f',
    gold: '#b98a00',
    goldBorder: '#e7b400',
    font: "'Bookman Old Style', 'URW Bookman', 'Georgia', serif",
  };

  buildEmailHtml(): SafeHtml {
    const html = this.generateEmailHTML();
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private generateEmailHTML(): string {
    const trip = this.tripInfo();

    const W = this.EMAIL_W;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title></title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:${this.emailTheme.font};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
  <tr>
    <td align="center" style="padding:16px 8px;">
      <table role="presentation" width="${W}" cellpadding="0" cellspacing="0" border="0" style="width:${W}px;max-width:${W}px;background-color:#ffffff;font-family:${this.emailTheme.font};color:#202124;">
        ${this.buildEmailBody()}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
  }

  // Overall email width in px. Kept as a fixed value (not fluid 100%) because
  // the overview/hotel tables below deliberately avoid percentage widths and
  // <colgroup> — Gmail's paste sanitizer strips colgroup and re-measures
  // columns from cell content, so every column width is pinned via a
  // width="" attribute + matching inline style on every cell instead. A
  // truly fluid container would defeat that workaround. 1000px is ~40% wider
  // than the previous 700px and matches the reference screenshot's proportions.
  private readonly EMAIL_W = 1000;
  // Usable content width inside each section (EMAIL_W minus 15px padding each side).
  private readonly CONTENT_W = 970;

  private buildEmailBody(): string {
    const t = this.emailTheme;
    const trip = this.tripInfo();
    let html = '';

    // ── Header ──


    // ── Greeting ──
    // Sourced from Master Entry > Template (see loadEmailGreetingTemplate()).
    // Falls back to the original hardcoded copy if the template is empty or
    // failed to load, so the email is never missing a greeting outright.
    const greetingHtml = this.emailGreetingHtml();
    html += `
      <tr>
        <td style="padding:0 15px 12px 15px;font-family:${t.font};font-size:16px;color:${t.text};line-height:1.7;">
          ${greetingHtml || `
            <p style="margin:0 0 14px 0;font-size:17px;font-weight:bold;">Greetings from Green Island Tours and Travels Private Limited!!!!!</p>
            <p style="margin:0 0 10px 0;">Dear ${trip?.ContactName || 'Sir / Madam'},</p>
            <p style="margin:0;">Thank you for reaching out to us with your travel requirements. As your trusted Destination Management Company (DMC) for <strong>${trip?.DestinationName || 'your destination'}</strong>, we are pleased to share with you the proposed quotation for your upcoming travel plans.</p>
          `}
        </td>
      </tr>
    `;

    // ── Package Overview ──
    html += `
      <tr>
        <td style="padding:6px 15px 0 15px;">
          ${this.buildStyledHeader('Package Overview', '620')}
          ${this.buildOverviewTable()}
        </td>
      </tr>
    `;

    // ── Package / Hotel options (Hotel table -> Prices) ──
    // NOTE: previously gated on !removeItinerary(), which incorrectly hid the
    // hotel table and pricing whenever the itinerary was removed. Hotels and
    // Prices have no removal flag of their own in this app, so they always render.
    this.packageTypes().forEach((pkg, idx) => {
      html += `
        <tr>
          <td style="padding:6px 15px 0 15px;">
            ${this.buildStyledHeader(this.packageTypes().length > 1 ? `Option ${idx + 1}: ${pkg.PackageTypeName || 'Package'}` : (pkg.PackageTypeName || 'Hotels'))}
            ${this.buildPackageHTML(pkg.QuotePackageTypeId)}
          </td>
        </tr>
      `;
    });

    // ── Day Wise Itinerary ──
    if (!this.removeItinerary()) {
      html += `
        <tr>
          <td style="padding:6px 15px 0 15px;">
            ${this.buildStyledHeader('Day Wise Itinerary')}
            ${this.buildItineraryBlocks()}
          </td>
        </tr>
      `;
    }

    // ── Transportation & Activities ──
    // NOTE: previously also gated on !removeItinerary(), coupling this
    // section to an unrelated toggle. It now depends only on its own flag,
    // matching removeTransportActivities()'s documented behavior.
    if (!this.removeTransportActivities() && this.hasAnyTransportOrActivity()) {
      html += `
        <tr>
          <td style="padding:6px 15px 0 15px;">
            ${this.buildStyledHeader('Transportation and Activities')}
            ${this.buildTransportActivitiesHTML()}
          </td>
        </tr>
      `;
    }

    // ── Inclusions / Exclusions ──
    if (this.inclusions().length || this.exclusions().length) {
      html += `
        <tr>
          <td style="padding:6px 15px 0 15px;">
            ${this.buildInclusionExclusionTable()}
          </td>
        </tr>
      `;
    }

    // ── Terms & Conditions ──
    if (!this.removeTerms() && this.hasTerms()) {
      html += `
        <tr>
          <td style="padding:6px 15px 0 15px;">
            ${this.buildStyledHeader('Terms and Conditions')}
            ${this.buildTermsList()}
          </td>
        </tr>
      `;
    }

    // ── Water Sports Activities ──
    if (this.hasWaterSportsTerms()) {
      html += `
        <tr>
          <td style="padding:6px 15px 0 15px;">
            ${this.buildStyledHeader('Water Sports Activities (if pre-booked)')}
            ${this.buildWaterSportsBox()}
          </td>
        </tr>
      `;
    }

      return html;
  }

  // ── HEADER BUILDERS ──

  /**
   * Builds a styled section header - full width light lavender/blue background
   * with centered bold dark blue text, matching the reference
   */
  private buildStyledHeader(label: string, width: string = '100%'): string {
    const t = this.emailTheme;
    return `
      <table role="presentation" width="${width}" cellpadding="0" cellspacing="0" border="0" style="background-color:#decef5;border-radius:4px;margin-bottom:10px;">
        <tr>
          <td align="left" style="font-family:${t.font};font-size:18px;font-weight:bold;color:${t.brand};padding:12px 16px;">
            ${label}
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Builds a styled subheader - light gray background with bold day title
   * and normal date text, matching the reference
   */
  private buildSubHeader(dayNumber: number, dateStr: string, title: string): string {
    const t = this.emailTheme;
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e6dff0;border-radius:4px;margin:6px 0 8px 0;">
        <tr>
          <td style="font-family:${t.font};font-size:16px;font-weight:bold;color:${t.brand};padding:8px 14px;">
            ${dayNumber}${this.ordinal(dayNumber)} Day (${dateStr}) : ${title}
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Builds a styled header for Inclusions (green accent)
   */
  private buildInclusionHeader(label: string): string {
    const t = this.emailTheme;
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e8f5e9;border-radius:4px;margin-bottom:6px;">
        <tr>
          <td align="center" style="font-family:${t.font};font-size:18px;font-weight:bold;color:${t.green};padding:12px 16px;">
            ${label}
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Builds a styled header for Exclusions (red accent)
   */
  private buildExclusionHeader(label: string): string {
    const t = this.emailTheme;
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffebee;border-radius:4px;margin-bottom:6px;">
        <tr>
          <td align="center" style="font-family:${t.font};font-size:18px;font-weight:bold;color:${t.red};padding:12px 16px;">
            ${label}
          </td>
        </tr>
      </table>
    `;
  }

  // ── OVERVIEW TABLE ──

  private buildOverviewTable(): string {
    const t = this.emailTheme;
    const trip = this.tripInfo();

    const destinationValue = trip?.DestinationName || '-';
    const locationBreakdown = this.locationNightsSummary();

    const rows: [string, string][] = [
      ['Trip ID', this.formatQuotationNo(trip?.QuotationNo)],
      ['Destination', locationBreakdown
        ? `${destinationValue}<div style="display:inline-block;background-color:#fdf3b0;border:1px solid #e8d97a;border-radius:3px;padding:4px 10px;margin-top:6px;font-weight:bold;">${locationBreakdown}</div>`
        : destinationValue],
      ['Start Date', this.formatDateLong(trip?.StartDate) || '-'],
      ['Trip Duration', this.durationLabel()],
      ['Pax', this.paxOverviewLabel()],
    ];

    const overviewWidth = 620;
    // Widths are set as a plain HTML `width` attribute (in px) AND matching
    // inline style on EVERY row's cells (not via <colgroup>, which Gmail's
    // compose-box paste sanitizer strips and then re-measures columns from
    // cell content, shrinking the table). Sums to overviewWidth.
    const labelW = 140;
    const valueW = overviewWidth - labelW;

    const rowsHtml = rows.map(([label, value]) => `
      <tr>
        <td width="${labelW}" style="width:${labelW}px;border:1px solid ${t.border};font-family:${t.font};font-size:15px;color:${t.text};padding:8px 12px;font-weight:bold;vertical-align:top;">${label}</td>
        <td width="${valueW}" style="width:${valueW}px;border:1px solid ${t.border};font-family:${t.font};font-size:15px;color:${t.text};padding:8px 12px;font-weight:bold;">${value}</td>
      </tr>
    `).join('');

    return `
      <table role="presentation" width="${overviewWidth}" cellpadding="0" cellspacing="0" border="0" style="width:${overviewWidth}px;border-collapse:collapse;margin-bottom:10px;">
        ${rowsHtml}
      </table>
    `;
  }

  /**
   * Builds the "Port Blair 1 Night / Havelock 2 Nights / Neil Island 1 Night
   * / Port Blair 1 Night" breakdown shown under Destination in the overview
   * table. Reuses stayBlocksByPackage() — the same source the Hotels table
   * renders from — so this can never drift from the actual booked hotel
   * data. Sourced from the first package option; if packages have different
   * routings the breakdown reflects only that one.
   *
   * Each hotel's nights are split into contiguous runs (via
   * splitStayByContiguousNights, shared with the email hotel table) and
   * sorted chronologically before labeling, so a hotel visited twice — e.g.
   * Port Blair on night 1 and again on night 5 after touring other islands
   * in between — produces two separate entries in correct night order
   * instead of one merged "Port Blair 2 Nights" that hides the gap. Nothing
   * here is hardcoded to a specific route; it falls directly out of however
   * many stay segments the saved itinerary actually has.
   *
   * Only shown when there's more than one stay segment (i.e. a multi-city
   * or multi-segment trip) — for a single, uninterrupted stay it would just
   * repeat Trip Duration.
   */
  private locationNightsSummary(): string {
    const firstPackage = this.packageTypes()[0];
    if (!firstPackage) return '';

    const stays = this.stayBlocksByPackage(firstPackage.QuotePackageTypeId)
      .flatMap(stay => this.splitStayByContiguousNights(stay))
      .sort((a, b) => a.nights[0] - b.nights[0]);
    if (stays.length <= 1) return '';

    return stays
      .map(stay => {
        const n = stay.nights.length;
        const location = stay.main?.LocationName;
        if (!location || !n) return null;
        return `${location} ${n} Night${n > 1 ? 's' : ''}`;
      })
      .filter((s): s is string => !!s)
      .join(' / ');
  }

  // ── ITINERARY BLOCKS ──

  private buildItineraryBlocks(): string {
    const t = this.emailTheme;
    let html = '';

    for (const day of this.daySlots()) {
      const sched = this.daySchedule(day.dayNumber);
      if (!sched) continue;

      const dateStr = day.date.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      // ── Subheader ──
      html += this.buildSubHeader(day.dayNumber, dateStr, sched.title);

      // ── Content ──
      html += `
        <div style="padding:0 4px 14px 4px;">
      `;

      if (sched.intro) {
        html += `
          <div style="font-family:${t.font};font-size:15px;color:#444;margin:8px 0 6px 0;line-height:1.7;">${sched.intro}</div>
        `;
      }

      for (const section of sched.sections) {
        html += `
          <div style="margin:8px 0 6px 0;padding-left:12px;border-left:3px solid ${t.brand};">
            <div style="font-family:${t.font};font-size:15px;font-weight:bold;color:${t.brand};">${section.heading}</div>
            <p style="font-family:${t.font};font-size:15px;color:#444;margin:2px 0 0 0;line-height:1.6;">${section.body}</p>
          </div>
        `;
      }

      for (const group of this.activityGroupsForDay(day.dayNumber)) {
        html += `
          <div style="margin:4px 0 4px 12px;font-family:${t.font};font-size:15px;color:#333;">
            <span style="color:${t.brand};font-weight:bold;margin-right:6px;">&#10004;</span><strong>${this.activityGroupTitle(group)}</strong>
          </div>
        `;
      }

      html += `</div>`;
    }

    return html || `<p style="font-family:${t.font};font-size:15px;color:${t.muted};">Itinerary details will be shared shortly.</p>`;
  }

  // ── PACKAGE HTML ──

  private buildPackageHTML(packageTypeId: number): string {
    const t = this.emailTheme;
    let html = '';

    // Split any hotel whose nights aren't contiguous (e.g. a return stay
    // on the last night) into separate rows, then reorder chronologically
    // so those rows sit in their correct place relative to other cities —
    // see splitStayByContiguousNights() for why this can't stay merged.
    const stays = this.stayBlocksByPackage(packageTypeId)
      .flatMap(stay => this.splitStayByContiguousNights(stay))
      .sort((a, b) => a.nights[0] - b.nights[0]);
    if (stays.length) {
      // Same fixed-px-per-cell approach as the Overview table — Gmail's
      // paste sanitizer strips <colgroup>, so widths are set directly as
      // width="" attributes + inline px on every cell in every row.
      // 5 columns per reference: Nights | City | Hotel Name | Meal Plan | Accommodation
      const colW = { nights: 110, city: 130, hotel: 320, meal: 160, accommodation: 250 }; // sums to CONTENT_W (970)
      html += `
        <table role="presentation" width="${this.CONTENT_W}" cellpadding="0" cellspacing="0" border="0" style="width:${this.CONTENT_W}px;border-collapse:collapse;margin-bottom:10px;">
          <tr>
            <td width="${colW.nights}" style="width:${colW.nights}px;background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">Nights</td>
            <td width="${colW.city}" style="width:${colW.city}px;background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">City</td>
            <td width="${colW.hotel}" style="width:${colW.hotel}px;background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">Hotel Name</td>
            <td width="${colW.meal}" style="width:${colW.meal}px;background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">Meal Plan</td>
            <td width="${colW.accommodation}" style="width:${colW.accommodation}px;background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">Accommodation</td>
          </tr>
          ${stays.map((stay, i) => this.buildHotelRow(stay, i, colW)).join('')}
        </table>
      `;
    }

    // Prices sits directly below Hotels, per spec (moved ahead of Special
    // Inclusions, which previously sat between Hotels and Prices).
    if (!this.hideTotalPrice()) {
      // Overall pricing strategy -> categories is [] (see guestCategoryTotals()),
      // so only the Total row renders below; Per Person keeps its existing
      // per-category breakdown exactly as before. The Total row itself is no
      // longer gated behind categories.length, so it can never disappear.
      html += this.buildPriceBox(packageTypeId);
    }

    const inclusions = this.specialInclusionsByPackage(packageTypeId);
    if (inclusions.length) {
      html += `
        <div style="font-family:${t.font};font-size:15px;font-weight:bold;color:${t.brand};margin:6px 0 6px 0;">Hotel Special Inclusions</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:10px;">
          <tr>
            <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:6px 10px;width:70px;">Night</td>
            <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:6px 10px;width:170px;">Hotel</td>
            <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:6px 10px;">Special Inclusion</td>
          </tr>
          ${inclusions.map((si, i) => `
            <tr>
              <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:6px 10px;${i % 2 ? `background-color:${t.zebraBg};` : ''}">${si.NightNumber}${this.ordinal(si.NightNumber)}<br><span style="font-size:13px;color:${t.muted};">${this.shortDate(this.nightDate(si.NightNumber))}</span></td>
              <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:6px 10px;font-weight:bold;${i % 2 ? `background-color:${t.zebraBg};` : ''}">${si.HotelName || ''}</td>
              <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:6px 10px;${i % 2 ? `background-color:${t.zebraBg};` : ''}"><strong>${si.SpecialInclusionName || ''}</strong>${si.Comments ? `<br><span style="font-size:13px;color:${t.muted};">${si.Comments}</span>` : ''}</td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    return html;
  }

  /**
   * Builds the gold-bordered "Prices (INR)" box for a given package,
   * shown directly under that package's hotel table.
   */
  private buildPriceBox(packageTypeId: number): string {
    const t = this.emailTheme;
    const categories = this.guestCategoryTotals(packageTypeId);
    const total = this.packageGrandTotal(packageTypeId);
    if (!categories.length && !total) return '';

    const categoryRows = categories.map(c => `
      <tr>
        <td style="font-family:${t.font};font-size:15px;color:${t.text};padding:4px 10px 4px 0;line-height:1.5;vertical-align:top;">
          <strong>${this.formatCurrency(c.amount)} /-</strong> ${c.label} x ${c.count} ${c.paxLabel}
        </td>
      </tr>
    `).join('');

    const gstLabel = this.isGstIncluded(packageTypeId) ? '(including GST)' : '(excluding GST)';
    const hasPerPax = categories.length > 0;
    const totalCellStyle = hasPerPax
      ? `width:25%;border-right:1px solid ${t.goldBorder};padding:12px;vertical-align:top;`
      : `padding:12px;vertical-align:top;`;

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${t.goldBorder};border-collapse:collapse;margin:4px 0 14px 0;font-family:${t.font};">
        <tr>
          <td style="background-color:${t.headerBg};border-bottom:1px solid ${t.goldBorder};padding:8px 12px;font-size:16px;font-weight:bold;color:${t.text};">Prices (INR)</td>
          ${hasPerPax ? `<td style="background-color:${t.headerBg};border-bottom:1px solid ${t.goldBorder};padding:8px 12px;"></td>` : ''}
        </tr>
        <tr>
          <td style="${totalCellStyle}">
            <div style="font-family:${t.font};font-size:18px;font-weight:bold;color:${t.text};line-height:1;">${this.formatCurrency(total)} /-</div>
            <div style="font-family:${t.font};font-size:13px;color:${t.muted};margin-top:4px;">${gstLabel}</div>
          </td>
          ${hasPerPax ? `
          <td style="width:75%;padding:12px;vertical-align:top;">
            <div style="font-family:${t.font};font-size:16px;font-weight:bold;color:${t.text};margin-bottom:6px;">Per Pax (INR)</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              ${categoryRows}
            </table>
          </td>
          ` : ''}
        </tr>
      </table>
    `;
  }

  private buildHotelRow(stay: any, index: number, colW: { nights: number; city: number; hotel: number; meal: number; accommodation: number }): string {
    const t = this.emailTheme;
    const zebra = index % 2 ? `background-color:${t.zebraBg};` : '';

    const nightsLabel = stay.nights
      .map((n: number) => `${n}${this.ordinal(n)} (${this.shortDate(this.nightDate(n))})`)
      .join('<br>');

    const cityCell = stay.main.LocationName
      ? `<span style="font-weight:bold;color:${t.text};">${stay.main.LocationName}</span>`
      : '-';

    let hotelCell = `<span style="font-weight:bold;color:${t.text};">${stay.main.HotelName || ''}</span>`;
    for (const sim of stay.similar) {
      hotelCell += ` <span style="color:${t.brand};">/ <strong>${sim.HotelName || ''}</strong></span>`;
    }
    if (stay.main.HotelCategoryName) hotelCell += `<br><span style="font-size:13px;color:${t.muted};">${stay.main.HotelCategoryName}</span>`;

    const mealCell = stay.main.MealPlan
      ? `<span style="font-weight:bold;color:${t.text};">${this.formatMealPlan(stay.main.MealPlan)}</span>`
      : '-';

    const accommodationCell = `<span style="font-weight:bold;color:${t.text};">${stay.main.NoOfRooms || 1} ${stay.main.RoomTypeName || 'Room'}</span><br><span style="font-size:13px;color:${t.muted};">${this.paxSummary(stay.main)}</span>`;

    return `
      <tr>
        <td width="${colW.nights}" style="width:${colW.nights}px;border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:7px 10px;vertical-align:top;${zebra}">${nightsLabel}</td>
        <td width="${colW.city}" style="width:${colW.city}px;border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:7px 10px;vertical-align:top;${zebra}">${cityCell}</td>
        <td width="${colW.hotel}" style="width:${colW.hotel}px;border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:7px 10px;vertical-align:top;${zebra}">${hotelCell}</td>
        <td width="${colW.meal}" style="width:${colW.meal}px;border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:7px 10px;vertical-align:top;${zebra}">${mealCell}</td>
        <td width="${colW.accommodation}" style="width:${colW.accommodation}px;border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:7px 10px;vertical-align:top;${zebra}">${accommodationCell}</td>
      </tr>
    `;
  }

  // ── TRANSPORT & ACTIVITIES ──

  private buildTransportActivitiesHTML(): string {
    const t = this.emailTheme;
    let html = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:${t.font};">
        <tr>
          <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-size:14px;font-weight:bold;padding:7px 10px;width:30%;">Day</td>
          <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-size:14px;font-weight:bold;padding:7px 10px;width:70%;">Service</td>
        </tr>
    `;

    let rowIndex = 0;
    for (const day of this.daySlots()) {
      if (!this.dayHasServices(day.dayNumber)) continue;
      const zebra = rowIndex % 2 ? `background-color:${t.zebraBg};` : '';
      rowIndex++;

      const services = this.servicesForDay(day.dayNumber);
      const groups = this.activityGroupsForDay(day.dayNumber);

      if (!services.length && !groups.length) continue;

      const dateStr = day.date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });

      let serviceHtml = '';
      for (const svc of services) {
        if (Number(svc.ServiceType) === 1) {
          serviceHtml += `
            <div style="margin:2px 0;">
              <strong>${this.serviceTitle(svc)}</strong>
              ${svc.VehicleTypeName ? `<br><span style="font-size:13px;color:${t.muted};">${svc.VehicleTypeName}</span>` : ''}
            </div>
          `;
        } else {
          serviceHtml += `
            <div style="margin:2px 0;">
              <strong>${this.serviceTitle(svc)}</strong>
              <span style="font-size:13px;color:${t.muted};">(${this.serviceDetail(svc)})</span>
            </div>
          `;
        }
      }

      for (const group of groups) {
        const paxLabel = group.entries.map((e: any) => `${e.Qty} ${e.PaxTypeLabel || e.PaxType || 'Pax'}`).join(' + ');
        serviceHtml += `
          <div style="margin:2px 0;font-size:15px;">
            <strong>${this.activityGroupTitle(group)}</strong>
            <span style="font-size:13px;color:${t.muted};">(${paxLabel})</span>
          </div>
        `;
      }

      html += `
        <tr>
          <td style="border:1px solid ${t.border};padding:7px 10px;vertical-align:top;${zebra}">
            <strong>${day.dayNumber}${this.ordinal(day.dayNumber)} Day</strong><br>
            <span style="font-size:13px;color:${t.muted};">${dateStr}</span>
          </td>
          <td style="border:1px solid ${t.border};padding:7px 10px;vertical-align:top;${zebra}">${serviceHtml}</td>
        </tr>
      `;
    }

    html += `</table>`;



    return html;
  }

  // ── INCLUSIONS / EXCLUSIONS ──

  private buildInclusionExclusionTable(): string {
    const t = this.emailTheme;
    const incItems = this.inclusions().map(i => this.inclusionText(i)).filter(Boolean);
    const excItems = this.exclusions().map(e => this.exclusionText(e)).filter(Boolean);

    const list = (items: string[], color: string): string =>
      items.length
        ? items.map(i => `
            <div style="font-family:${t.font};font-size:15px;color:${t.text};padding:3px 0 3px 22px;position:relative;">
              <span style="position:absolute;left:0;color:${color};font-weight:bold;">${color === t.green ? '✓' : '✗'}</span>
              ${i}
            </div>
          `).join('')
        : `<div style="font-family:${t.font};font-size:15px;color:${t.muted};font-style:italic;">No ${color === t.green ? 'inclusions' : 'exclusions'} added.</div>`;

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td style="width:50%;padding:0 6px 0 0;vertical-align:top;">
            ${this.buildInclusionHeader('Inclusions')}
            <div style="border:1px solid ${t.border};border-top:none;padding:10px 12px;border-radius:0 0 4px 4px;">
              ${list(incItems, t.green)}
            </div>
          </td>
          <td style="width:50%;padding:0 0 0 6px;vertical-align:top;">
            ${this.buildExclusionHeader('Exclusions')}
            <div style="border:1px solid ${t.border};border-top:none;padding:10px 12px;border-radius:0 0 4px 4px;">
              ${list(excItems, t.red)}
              <div style="font-family:${t.font};font-size:13px;color:${t.muted};font-style:italic;margin-top:8px;">Anything not listed under inclusions is excluded.</div>
            </div>
          </td>
        </tr>
      </table>
    `;
  }

  // ── TERMS ──

  private buildTermsList(): string {
    const t = this.emailTheme;
    const items = this.terms().map(term => this.termHtml(term)).filter(Boolean);
    if (!items.length) return '';

    return `
      <div style="background-color:#f8f9fa;border:1px solid #e8edf5;padding:14px 18px;margin:4px 0 14px 0;">
        ${items.map(term => `
          <div style="font-family:${t.font};font-size:15px;color:${t.text};padding:3px 0;line-height:1.5;">${term}</div>
        `).join('')}
      </div>
    `;
  }

  // ── WATER SPORTS ──

  private buildWaterSportsBox(): string {
    const t = this.emailTheme;
    const waterSportsTerms = this.terms().filter(t =>
      this.termHtml(t).includes('Scuba') ||
      this.termHtml(t).includes('Diving') ||
      this.termHtml(t).includes('Snorkeling')
    );

    if (!waterSportsTerms.length) return '';

    return `
      <div style="background-color:#f8faff;border:1px solid #e8edf5;padding:14px 18px;margin:4px 0 14px 0;">
        <div style="font-family:${t.font};font-size:16px;font-weight:bold;color:${t.brand};margin:0 0 8px 0;">Water Sports Activities (if pre-booked)</div>
        ${waterSportsTerms.map(term => `
          <div style="font-family:${t.font};font-size:14px;color:${t.text};padding:2px 0;line-height:1.5;">${this.termHtml(term)}</div>
        `).join('')}
        <div style="font-family:${t.font};font-size:14px;color:${t.muted};margin-top:8px;padding-top:8px;border-top:1px solid #e0e7f0;">
          <strong>Note:</strong> Above is just a quote, no rooms have been blocked. Rooms are subject to availability at the time of confirmation.
        </div>
      </div>
    `;
  }

  // ── NOTES ──

  // ── HELPERS ──

  private hasWaterSportsTerms(): boolean {
    return this.terms().some(t =>
      this.termHtml(t).includes('Scuba') ||
      this.termHtml(t).includes('Diving') ||
      this.termHtml(t).includes('Snorkeling')
    );
  }

  private hasAnyTransportOrActivity(): boolean {
    return this.daySlots().some(d => this.dayHasServices(d.dayNumber));
  }

  private paxOverviewLabel(): string {
    const adults = Number(this.tripInfo()?.NoOfAdults) || 0;
    const ages = this.childrenAgesList();
    const childLabel = ages.length ? `, ${ages.length} Child${ages.length > 1 ? 'ren' : ''} (${ages.map(a => a + 'y').join(', ')})` : '';
    return `${adults} Adults${childLabel}`;
  }

  /**
   * Copies HTML email to clipboard with full formatting
   */
  async copyEmailHtml(): Promise<void> {
    try {
      const htmlContent = this.generateEmailHTML();
      const plainText = this.buildWhatsAppText();

      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      const plainBlob = new Blob([plainText], { type: 'text/plain' });

      if (navigator.clipboard && typeof (window as any).ClipboardItem !== 'undefined') {
        const clipboardItem = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': plainBlob,
        });
        await navigator.clipboard.write([clipboardItem]);
        this.toastr.success('Email copied! Paste directly into Gmail (Ctrl+V / Cmd+V).');
        return;
      }
    } catch (error) {
      console.error('Rich clipboard copy failed, falling back:', error);
    }

    try {
      await navigator.clipboard.writeText(this.buildWhatsAppText());
      this.toastr.success('Copied as plain text (rich HTML copy not supported in this browser).');
    } catch (err) {
      console.error('Plain-text clipboard copy failed:', err);
      this.toastr.error('Could not copy to clipboard. Please try again.');
    }
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

  /**
   * Reads the agency's own contact details off TripInfo defensively — the
   * backend DTO shape (`tripInfo()` is typed `any`) may expose these under
   * any of a few likely key names depending on the API version. Returns
   * `undefined` (never a hardcoded fallback) when nothing is present, so
   * the PDF engine's own theme default is the only fallback in play.
   */
  private firstNonEmpty(source: any, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = source?.[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return undefined;
  }

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
        packageGrandTotal: (id: number) => this.packageGrandTotal(id),
        packageCostPrice: (id: number) => this.packageCostPrice(id),
        guestCategoryTotals: (id: number) => this.guestCategoryTotals(id),
        isOverallPricing: (id: number) => this.isOverallPricing(id),
        pricingSnapshots: this.pricingSnapshots(),
        packageSummaries: this.packageSummaries(),
        pricing: this.pricing(),
        isGstIncluded: (id: number) => this.isGstIncluded(id),
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
        // Dynamic agency branding for the footer/back-cover — read from
        // whatever TripInfo actually exposes, with no agency hardcoded here.
        // Falls through to QuotationPdfEngine's theme default only when the
        // API genuinely has nothing for that field.
        agencyPhone: this.firstNonEmpty(this.tripInfo(), ['AgencyPhone', 'AgencyContactNumber', 'CompanyPhone']),
        agencyEmail: this.firstNonEmpty(this.tripInfo(), ['AgencyEmail', 'CompanyEmail']),
        agencyWebsite: this.firstNonEmpty(this.tripInfo(), ['AgencyWebsite', 'CompanyWebsite']),
        agencyAddress: this.firstNonEmpty(this.tripInfo(), ['AgencyAddress', 'CompanyAddress', 'HeadOfficeAddress']),
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
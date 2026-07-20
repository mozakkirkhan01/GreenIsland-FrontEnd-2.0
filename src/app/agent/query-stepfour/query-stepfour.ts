import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';

import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { RequestModel } from '../../utils/interface';
import { LocalService } from '../../utils/local.service';
import { CanComponentDeactivate } from '../../guards/can-deactivate-guard';

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

  // ── Activities grouped by Location + ActivityService + Day ──────
  // Source: quoteDetail().Activities (QuoteActivityEntries table). Each
  // entry is one pax-type row (Adult / Child) with its own Rate/Qty/
  // SellingPrice; grouped here so a ferry or ticket with an Adult line
  // and a Child line renders as ONE row with two pax sub-lines, matching
  // how Step Three actually saves them (one QuoteActivityEntry per
  // pax-type group). Insertion order follows the API's own
  // `orderby a.DayNumber, a.SortOrder` — never re-sorted here.
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
    return this.similarHotels().some(row => row.ParentQuoteHotelId === quoteHotelId);
  }

  packageHotelTotal(packageTypeId: number): number {
    return this.hotelsByPackage(packageTypeId).reduce((sum, row) => sum + this.money(row), 0);
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

  /**
   * The day's narrative itinerary comes from IteneraryService.DaySchedule
   * (via the transport QuoteService row for that day) — real DB text, not
   * assembled from location/service names. Returns null when no transport
   * row exists for the day; the template must not fall back to placeholder
   * prose in that case.
   */
  scheduleServiceForDay(dayNumber: number): any | null {
    return this.transportServices().find(row => Number(row.DayNumber) === dayNumber) || null;
  }

  daySchedule(dayNumber: number): { title: string; intro: string; sections: { heading: string; body: string }[] } | null {
    const svc = this.scheduleServiceForDay(dayNumber);
    if (!svc || !svc.DaySchedule) return null;
    return { title: svc.IteneraryServiceName || '', ...this.parseDaySchedule(svc.DaySchedule) };
  }

  /**
   * DaySchedule is stored as plain text: an intro paragraph, then
   * blank-line-separated blocks where a "• Heading" line introduces a
   * sub-section body paragraph (per the Master Entry "Activity Schedule"
   * field). Parsed here for display only — no text is invented.
   */
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
  // SHARE DIALOG — WhatsApp (wa.me deep link) + Email (preview/copy)
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

  /** Plain-text message for the wa.me deep link. Respects the toggle state. */
  buildWhatsAppText(): string {
    const trip = this.tripInfo();
    const lines: string[] = [];
    lines.push(`Hi ${trip?.ContactName || 'there'},`);
    lines.push('');
    lines.push('Greetings from Green Island Tours and Travels Private Limited.');
    lines.push('');
    lines.push(`Trip ID ${trip?.QuotationNo ? this.formatQuotationNo(trip.QuotationNo) : this.QueryStepOneId}`);
    lines.push(`${trip?.DestinationName || ''} Trip`);
    lines.push(`• ${this.formatDate(trip?.StartDate)} for ${this.durationLabel()}`);
    lines.push(`• ${this.totalGuestCount()} Adults`);
    lines.push('');

    for (const pkg of this.packageTypes()) {
      lines.push(`OPTION: ${pkg.PackageTypeName}`);
      if (!this.hideTotalPrice()) {
        lines.push(`Total Price (INR): ${this.formatCurrency(this.packageQuotePrice(pkg.QuotePackageTypeId))}/- (inc. GST)`);
      }
      lines.push('');
      lines.push('Hotels');
      for (const hotel of this.hotelsByPackage(pkg.QuotePackageTypeId)) {
        lines.push(`${hotel.NightNumber}${this.ordinal(hotel.NightNumber)} Night at ${hotel.LocationName || ''}`);
        lines.push(`${hotel.HotelName} (${hotel.HotelCategoryName || ''})`);
        lines.push(`${hotel.MealPlan || ''} • ${hotel.NoOfRooms || 1} ${hotel.RoomTypeName || 'Room'}`);
        lines.push('');
      }
    }

    if (!this.removeTransportActivities() && !this.removeItinerary()) {
      lines.push('Transportation and Activities');
      for (const day of this.daySlots()) {
        if (!this.dayHasServices(day.dayNumber)) continue;
        lines.push(`Day ${day.dayNumber} - ${day.shortDate}`);
        for (const svc of this.servicesForDay(day.dayNumber)) {
          lines.push(`• ${this.serviceTitle(svc)} (${this.serviceDetail(svc)})`);
        }
        for (const group of this.activityGroupsForDay(day.dayNumber)) {
          lines.push(`• ${this.activityGroupTitle(group)} (${this.formatCurrency(group.total)})`);
        }
      }
      lines.push('');
    }

    if (!this.removeTerms() && this.hasTerms()) {
      lines.push('Terms and Conditions apply. Full details in the attached quotation.');
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

  /** HTML email preview — sanitized once via DomSanitizer for [innerHTML] binding. */
  buildEmailHtml(): SafeHtml {
    const trip = this.tripInfo();
    let html = `
      <p>Dear Sir / Madam,</p>
      <p>Thank you for reaching out to us with your travel requirements. As your trusted
      Destination Management Company (DMC) for ${trip?.DestinationName || 'your destination'},
      we are pleased to share the proposed quotation for your upcoming travel plans.</p>
      <h4>Package Overview</h4>
      <table class="table table-bordered table-sm">
        <tr><td>Trip ID</td><td>${this.formatQuotationNo(trip?.QuotationNo)}</td></tr>
        <tr><td>Destination</td><td>${trip?.DestinationName || ''}</td></tr>
        <tr><td>Start Date</td><td>${this.formatDate(trip?.StartDate)}</td></tr>
        <tr><td>Duration</td><td>${this.durationLabel()}</td></tr>
        <tr><td>Pax</td><td>${this.totalGuestCount()} Adults</td></tr>
      </table>`;

    for (const pkg of this.packageTypes()) {
      html += `<h5>${pkg.PackageTypeName}</h5>`;
      if (!this.hideTotalPrice()) {
        html += `<p><strong>Total Price (INR): ${this.formatCurrency(this.packageQuotePrice(pkg.QuotePackageTypeId))}/- (inc. GST)</strong></p>`;
      }
      html += `<table class="table table-bordered table-sm">
        <thead><tr><th>Night</th><th>Hotel</th><th>Meal</th><th>Rooms</th></tr></thead><tbody>`;
      for (const hotel of this.hotelsByPackage(pkg.QuotePackageTypeId)) {
        html += `<tr>
          <td>${hotel.NightNumber}${this.ordinal(hotel.NightNumber)}</td>
          <td>${hotel.HotelName} (${hotel.HotelCategoryName || ''})</td>
          <td>${hotel.MealPlan || '-'}</td>
          <td>${hotel.NoOfRooms || 1} ${hotel.RoomTypeName || 'Room'}</td>
        </tr>`;
      }
      html += `</tbody></table>`;
    }

    if (!this.removeTerms() && this.hasTerms()) {
      html += `<h5>Terms and Conditions</h5><ul>`;
      for (const term of this.terms()) html += `<li>${this.termHtml(term)}</li>`;
      html += `</ul>`;
    }

    return this.sanitizer.bypassSecurityTrustHtml(html);
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
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /**
   * Server-side PDF download. Depends on the GeneratePdf endpoint —
   * Stage 3, not yet built. Wired here so the button works the moment
   * that endpoint exists; calling it now will 404 until then.
   */
  downloadPdf(): void {
    this.service.generateQuotePdf(this.enc({ QueryStepOneId: this.QueryStepOneId, QuoteId: this.QuoteId })).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Quotation-${this.formatQuotationNo(this.tripInfo()?.QuotationNo)}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.toastr.error('Error generating PDF'),
    });
  }
}
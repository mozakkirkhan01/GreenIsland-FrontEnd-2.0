import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
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

  QueryStepOneId = 0;
  QuoteId = 0;

  loading = signal(false);
  trip = signal<any | null>(null);
  quoteDetail = signal<any | null>(null);
  packageTypes = signal<any[]>([]);
  inclusions = signal<any[]>([]);
  exclusions = signal<any[]>([]);
  terms = signal<any[]>([]);

  hotels = computed<any[]>(() => this.quoteDetail()?.Hotels ?? []);
  services = computed<any[]>(() => this.quoteDetail()?.Services ?? []);
  specialInclusions = computed<any[]>(() => this.quoteDetail()?.SpecialInclusions ?? []);
  activities = computed<any[]>(() => this.quoteDetail()?.Activities ?? []);

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
    forkJoin({
      quote: this.service.getQuoteDetail(this.enc({ QueryStepOneId: this.QueryStepOneId, QuoteId: this.QuoteId })),
      trip: this.service.getQueryStepOneList(this.enc({ QueryStepOneId: this.QueryStepOneId })),
      packages: this.service.getPackageTypesByQuery(this.enc({ QueryStepOneId: this.QueryStepOneId })),
    }).subscribe({
      next: ({ quote, trip, packages }: any) => {
        if (quote.Message === ConstantData.SuccessMessage) {
          this.quoteDetail.set(quote);
          if (!this.QuoteId && quote.Quote?.QuoteId) this.QuoteId = quote.Quote.QuoteId;
        } else {
          this.toastr.error(quote.Message || 'Unable to load quote detail');
        }

        if (trip.Message === ConstantData.SuccessMessage) {
          this.trip.set((trip.QueryStepOneList ?? [])[0] ?? null);
        }

        const packageTypes = packages.Message === ConstantData.SuccessMessage
          ? packages.PackageTypes ?? []
          : quote.PackageTypes ?? [];
        this.packageTypes.set(packageTypes.length ? packageTypes : [{ QuotePackageTypeId: 0, PackageTypeName: 'Package' }]);

        this.loading.set(false);
        this.loadDestinationContent();
      },
      error: () => {
        this.loading.set(false);
        this.toastr.error('Error loading quotation preview');
      },
    });
  }

  private loadDestinationContent(): void {
    const destinationId = this.tripInfo()?.DestinationId || this.trip()?.DestinationId || 0;
    if (!destinationId) return;

    forkJoin({
      inclusions: this.service.getInclusionList(this.enc({ DestinationId: destinationId })),
      exclusions: this.service.getExclusionList(this.enc({ DestinationId: destinationId })),
      terms: this.service.getTermAndConditionList(this.enc({ DestinationId: destinationId })),
    }).subscribe({
      next: ({ inclusions, exclusions, terms }: any) => {
        if (inclusions.Message === ConstantData.SuccessMessage) this.inclusions.set(inclusions.InclusionList ?? []);
        if (exclusions.Message === ConstantData.SuccessMessage) this.exclusions.set(exclusions.ExclusionList ?? []);
        if (terms.Message === ConstantData.SuccessMessage) this.terms.set(terms.TermAndConditionList ?? []);
      },
      error: () => {
        this.inclusions.set([]);
        this.exclusions.set([]);
        this.terms.set([]);
      },
    });
  }

  tripInfo(): any {
    return this.quoteDetail()?.TripInfo ?? this.trip();
  }

  editDetail(): void {
    this.router.navigate(['/agent/query-stepthree', this.QueryStepOneId], {
      queryParams: this.QuoteId ? { quoteId: this.QuoteId } : {},
    });
  }

  backToQuotes(): void {
    this.router.navigate(['/agent/query-steptwo', this.QueryStepOneId]);
  }

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

  hotelsByPackage(packageTypeId: number): any[] {
    return this.hotels()
      .filter(row => this.samePackage(row, packageTypeId) && row.HotelId > 0 && row.IsMainHotel !== false)
      .sort((a, b) => (Number(a.NightNumber) || 0) - (Number(b.NightNumber) || 0));
  }

  packageHotelTotal(packageTypeId: number): number {
    return this.hotelsByPackage(packageTypeId).reduce((sum, row) => sum + this.money(row), 0);
  }

  packageSpecialInclusionTotal(packageTypeId: number): number {
    return this.specialInclusions()
      .filter(row => this.samePackage(row, packageTypeId))
      .reduce((sum, row) => sum + (Number(row.TotalPrice) || 0), 0);
  }

  packageQuotePrice(packageTypeId: number): number {
    return this.packageHotelTotal(packageTypeId)
      + this.packageSpecialInclusionTotal(packageTypeId)
      + this.transportTotal()
      + this.activityTotal();
  }

  packageCostPrice(packageTypeId: number): number {
    return this.packageQuotePrice(packageTypeId);
  }

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
    return this.servicesForDay(dayNumber).length > 0;
  }

  scheduleTitle(dayNumber: number): string {
    const services = this.servicesForDay(dayNumber);
    if (!services.length) return `${this.tripInfo()?.DestinationName || 'Trip'} Day ${dayNumber}`;
    return services.map(row => this.serviceTitle(row)).filter(Boolean).join(' - ');
  }

  scheduleDescription(dayNumber: number): string {
    const names = this.servicesForDay(dayNumber)
      .map(row => this.serviceSubtitle(row))
      .filter(Boolean);
    if (!names.length) return 'Day at leisure as per the finalized itinerary.';
    return `${names.join('. ')}. Overnight stay as per selected package.`;
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

  serviceIcon(row: any): string {
    return Number(row.ServiceType) === 1 ? 'bx-car' : 'bx-ticket';
  }

  inclusionText(row: any): string {
    return row.InclusionName || row.Name || row.Description || row.Inclusion || '';
  }

  exclusionText(row: any): string {
    return row.ExclusionName || row.Name || row.Description || row.Exclusion || '';
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
}

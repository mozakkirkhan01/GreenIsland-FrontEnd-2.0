import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { PdfImageLoader } from './pdf/helpers/image-loader';
import { QuotationPdfEngine } from './pdf/quotation-pdf-engine';

import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { RequestModel } from '../../utils/interface';
import { LocalService } from '../../utils/local.service';
import { CanComponentDeactivate } from '../../guards/can-deactivate-guard';
import { TripStatus } from '../../utils/enum';
import { forkJoin } from 'rxjs';

(pdfMake as any).vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any).vfs;

type MoneySource = { TotalPrice?: number; FinalPrice?: number; SellingPrice?: number; CostPrice?: number };

// ── Tourist/Guest row shape for the Edit Guest modal ─────────────
// Mirrors TouristRow from query-steptwo.ts so the same GetGuestByTrip /
// SaveGuestList endpoints and row shape work identically here.
export interface TouristRow {
  GuestId: number;
  AgencyId: number;
  Salutation: string;
  ContactName: string;
  CountryCode: string;
  Phone: string;
  Email: string;
  IsPrimary: boolean;
  Status: number;
  CreatedBy: number;
  UpdatedBy: number;
  // UI only
  IsExpanded: boolean;
  IsNew: boolean;
}

@Component({
  selector: 'app-query-stepfour',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule],
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
  inclusions = signal<any[]>([]);        // destination-level defaults (InclusionExclusion/InclusionList)
  exclusions = signal<any[]>([]);        // destination-level defaults (InclusionExclusion/ExclusionList)
  terms = signal<any[]>([]);
  emailGreetingHtml = signal<string>('');

  // ── Quote-specific Inclusions/Exclusions ─────────────────────────
  // Backed by the real QuoteInclusion/QuoteExclusion tables + the
  // InclusionExclusion controller's GetQuoteInclusions/GetQuoteExclusions/
  // SaveQuoteInclusions/SaveQuoteExclusions endpoints — confirmed against
  // the DB script and controller, not guessed. These override the
  // destination-level defaults above for THIS quote only, once set.
  quoteInclusions = signal<any[]>([]);
  quoteExclusions = signal<any[]>([]);

  // What actually gets displayed / sent: this quote's own list if it has
  // one, otherwise the destination default — so untouched quotes keep
  // working exactly as before.
  effectiveInclusions = computed<any[]>(() => this.quoteInclusions().length ? this.quoteInclusions() : this.inclusions());
  effectiveExclusions = computed<any[]>(() => this.quoteExclusions().length ? this.quoteExclusions() : this.exclusions());

  activePackageTypeId = signal<number>(0);

  // ── Tabs: Basic Details / All Quotes / Docs (converted only) / Activities ──
  activeTab = signal<'basic' | 'quotes' | 'docs' | 'activities'>('quotes');

  // ── Arrival / Departure edit modal state ─────────────────────────
  scheduleModalOpen = signal(false);
  scheduleModalType = signal<'Arrival' | 'Departure'>('Arrival');
  scheduleEntries = signal<{ DateTime: string; Details: string }[]>([{ DateTime: '', Details: '' }]);
  savingSchedule = signal(false);

  // ── Inclusions/Exclusions edit modal state (per-quote) ────────────
  incExcModalOpen = signal(false);
  incExcInclusionLines = signal<{ QuoteInclusionId: number; InclusionText: string }[]>([{ QuoteInclusionId: 0, InclusionText: '' }]);
  incExcExclusionLines = signal<{ QuoteExclusionId: number; ExclusionText: string }[]>([{ QuoteExclusionId: 0, ExclusionText: '' }]);
  savingIncExc = signal(false);

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

  // ── Conversion status ─────────────────────────────────────────
  // Confirmed against QueryStepOne.TripStatus / TripStatus enum (enum.ts)
  // and QuoteController.TripInfoModel.TripStatus, which GetQuoteDetail
  // already returns as part of tripInfo() — no extra call needed for
  // isConverted() itself.
  isConverted = computed<boolean>(() => Number(this.tripInfo()?.TripStatus) === TripStatus.Converted);

  // ASSUMPTION: the enum member is named `OnHold` (mirroring the
  // `TripStatus.Converted` naming already confirmed above). If the
  // actual member in enum.ts is named differently (e.g. `Hold`,
  // `HoldStatus`), this is the one line to fix.
  isOnHold = computed<boolean>(() => Number(this.tripInfo()?.TripStatus) === TripStatus.OnHold);

  // Which package was converted is NOT on GetQuoteDetail — it lives on
  // QuoteConversion.QuotePackageTypeId, fetched via the existing
  // QueryConvert/GetQueryConversion endpoint (already in app_service.ts).
  // Only fetched once isConverted() is true.
  //
  // ASSUMPTION: the same QueryConversion record/endpoint also carries
  // the selected package when the trip is put On Hold (i.e. Convert and
  // Hold write to the same table, just with a different TripStatus) —
  // this mirrors how "Convert/On-Hold using Quote" is already a single
  // combined action/button below. If Hold actually has its own record
  // or endpoint, swap the call in loadConversionStatus() accordingly;
  // everything downstream (convertedPackageTypeId signal, the
  // highlight classes, the pills) stays the same either way.
  convertedPackageTypeId = signal<number>(0);

  private loadConversionStatus(): void {
    if (!this.isConverted() && !this.isOnHold()) {
      this.convertedPackageTypeId.set(0);
      return;
    }
    this.service.getQueryConversion(this.enc({ QueryStepOneId: this.QueryStepOneId })).subscribe({
      next: (res: any) => {
        if (res?.Message === ConstantData.SuccessMessage) {
          this.convertedPackageTypeId.set(Number(res?.Conversion?.QuotePackageTypeId) || 0);
        }
      },
      error: (err: any) => console.error('getQueryConversion error:', err),
    });
  }

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

  // ── Arrival / Departure (Basic Details side panel) ──────────────
  // Backed by the new TripScheduleController (GetTripScheduleDetail /
  // saveTripScheduleDetail) — this data was never part of GetQuoteDetail,
  // so these are plain signals populated by loadScheduleDetails() below,
  // not computed off quoteDetail() like everything else on this page.
  arrivalDetail = signal<any[]>([]);
  departureDetail = signal<any[]>([]);

  private loadScheduleDetails(): void {
    if (!this.QueryStepOneId || !this.QuoteId) {
      this.arrivalDetail.set([]);
      this.departureDetail.set([]);
      return;
    }
    this.service.getTripScheduleDetail(this.enc({ QueryStepOneId: this.QueryStepOneId, QuoteId: this.QuoteId })).subscribe({
      next: (res: any) => {
        if (res?.Message === ConstantData.SuccessMessage) {
          this.arrivalDetail.set(res.ArrivalDetail ?? []);
          this.departureDetail.set(res.DepartureDetail ?? []);
        }
      },
      error: (err: any) => console.error('getTripScheduleDetail error:', err),
    });
  }

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
          this.loadConversionStatus();
          this.loadQuoteInclusionsExclusions();
          this.loadScheduleDetails();
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
  setActiveTab(tab: 'basic' | 'quotes' | 'activities' | 'docs'): void {
    this.activeTab.set(tab);
    // The voucher (Docs tab) needs the named guest list, which — unlike
    // everything else on this page — isn't part of GetQuoteDetail and is
    // otherwise only fetched when the Edit Guest modal opens. Load it once,
    // lazily, the first time someone actually looks at the voucher.
    if (tab === 'docs') this.loadVoucherGuestsIfNeeded();
  }

  convertOrHoldUsingQuote(): void {
     this.router.navigate(['/agent/query-convert', this.QueryStepOneId], {
       queryParams: this.QuoteId ? { quoteId: this.QuoteId } : {},
     });
   }
  // convertOrHoldUsingQuote(): void {
  //   this.toastr.info('Convert/On-Hold flow is coming soon');
  // }

  // ── Arrival / Departure edit modal ───────────────────────────────
  openScheduleModal(type: 'Arrival' | 'Departure'): void {
    const existing = type === 'Arrival' ? this.arrivalDetail() : this.departureDetail();
    this.scheduleModalType.set(type);
    this.scheduleEntries.set(
      existing.length
        ? existing.map((e: any) => ({ DateTime: e.DateTime || '', Details: e.Details || '' }))
        : [{ DateTime: '', Details: '' }]
    );
    this.scheduleModalOpen.set(true);
  }

  closeScheduleModal(): void {
    this.scheduleModalOpen.set(false);
  }

  addScheduleEntry(): void {
    this.scheduleEntries.update(entries => [...entries, { DateTime: '', Details: '' }]);
  }

  removeScheduleEntry(index: number): void {
    this.scheduleEntries.update(entries => entries.filter((_, i) => i !== index));
  }

  onScheduleDateTimeChange(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.scheduleEntries.update(entries => entries.map((e, i) => (i === index ? { ...e, DateTime: value } : e)));
  }

  onScheduleDetailsChange(index: number, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.scheduleEntries.update(entries => entries.map((e, i) => (i === index ? { ...e, Details: value } : e)));
  }

  saveScheduleDetail(): void {
    const entries = this.scheduleEntries().filter(e => e.DateTime || e.Details);
    this.savingSchedule.set(true);
    const payload = this.enc({
      QueryStepOneId: this.QueryStepOneId,
      QuoteId: this.QuoteId,
      Type: this.scheduleModalType(),
      Entries: entries,
      CreatedBy: this.local.getEmployeeDetail()?.StaffLoginId || 0,
    });
    this.service.saveTripScheduleDetail(payload).subscribe({
      next: (res: any) => {
        this.savingSchedule.set(false);
        if (res?.Message === ConstantData.SuccessMessage) {
          this.toastr.success(`${this.scheduleModalType()} details saved`);
          this.scheduleModalOpen.set(false);
          this.loadScheduleDetails(); // re-fetch rather than assume the local edit matches what the server saved
        } else {
          this.toastr.error(res?.Message || 'Unable to save details');
        }
      },
      error: (err: any) => {
        this.savingSchedule.set(false);
        console.error('saveTripScheduleDetail error:', err);
        this.toastr.error('Error saving details');
      },
    });
  }

  formatScheduleDateTime(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // ── Quote-specific Inclusions/Exclusions ─────────────────────────
  private loadQuoteInclusionsExclusions(): void {
    if (!this.QuoteId) {
      this.quoteInclusions.set([]);
      this.quoteExclusions.set([]);
      return;
    }
    this.service.getQuoteInclusions(this.enc({ QuoteId: this.QuoteId })).subscribe({
      next: (res: any) => this.quoteInclusions.set(res?.Message === ConstantData.SuccessMessage ? (res.QuoteInclusions ?? []) : []),
      error: (err: any) => { console.error('getQuoteInclusions error:', err); this.quoteInclusions.set([]); },
    });
    this.service.getQuoteExclusions(this.enc({ QuoteId: this.QuoteId })).subscribe({
      next: (res: any) => this.quoteExclusions.set(res?.Message === ConstantData.SuccessMessage ? (res.QuoteExclusions ?? []) : []),
      error: (err: any) => { console.error('getQuoteExclusions error:', err); this.quoteExclusions.set([]); },
    });
  }

  openIncExcModal(): void {
    // Seed from this quote's own saved list if it has one; otherwise start
    // from the destination defaults as a convenient starting point (text
    // only — these become new quote-specific rows on save, the
    // destination master rows are never touched).
    const incSeed = this.quoteInclusions().length ? this.quoteInclusions() : this.inclusions();
    const excSeed = this.quoteExclusions().length ? this.quoteExclusions() : this.exclusions();

    this.incExcInclusionLines.set(
      incSeed.length
        ? incSeed.map((r: any) => ({ QuoteInclusionId: r.QuoteInclusionId || 0, InclusionText: this.inclusionText(r) }))
        : [{ QuoteInclusionId: 0, InclusionText: '' }]
    );
    this.incExcExclusionLines.set(
      excSeed.length
        ? excSeed.map((r: any) => ({ QuoteExclusionId: r.QuoteExclusionId || 0, ExclusionText: this.exclusionText(r) }))
        : [{ QuoteExclusionId: 0, ExclusionText: '' }]
    );
    this.incExcModalOpen.set(true);
  }

  closeIncExcModal(): void {
    this.incExcModalOpen.set(false);
  }

  addIncLine(): void {
    this.incExcInclusionLines.update(lines => [...lines, { QuoteInclusionId: 0, InclusionText: '' }]);
  }
  removeIncLine(index: number): void {
    this.incExcInclusionLines.update(lines => lines.filter((_, i) => i !== index));
  }
  onIncLineChange(index: number, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.incExcInclusionLines.update(lines => lines.map((l, i) => (i === index ? { ...l, InclusionText: value } : l)));
  }

  addExcLine(): void {
    this.incExcExclusionLines.update(lines => [...lines, { QuoteExclusionId: 0, ExclusionText: '' }]);
  }
  removeExcLine(index: number): void {
    this.incExcExclusionLines.update(lines => lines.filter((_, i) => i !== index));
  }
  onExcLineChange(index: number, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.incExcExclusionLines.update(lines => lines.map((l, i) => (i === index ? { ...l, ExclusionText: value } : l)));
  }

  saveIncExc(): void {
    if (!this.QuoteId) {
      this.toastr.error('Save the quote before adding inclusions/exclusions.');
      return;
    }

    const staffLoginId = this.local.getEmployeeDetail()?.StaffLoginId || 0;

    // NOTE: QuoteInclusion/QuoteExclusion are keyed by (QuoteId,
    // QuotePackageTypeId) in the DB, but this editor is quote-wide (matches
    // how the Inclusions/Exclusions panel displays — one list, not split
    // per package option). Attaching every row to the quote's first
    // package type is a deliberate simplification, not an oversight: if
    // you actually need different inclusions per package option, the
    // schema already supports it but this UI doesn't expose it yet — say
    // so and I'll add per-package tabs here instead.
    const packageTypeId = this.packageTypes()[0]?.QuotePackageTypeId || 0;
    if (!packageTypeId) {
      this.toastr.error('Add a package option before adding inclusions/exclusions.');
      return;
    }

    const inclusionPayload = this.incExcInclusionLines()
      .filter(l => l.InclusionText.trim())
      .map((l, i) => ({
        QuoteInclusionId: l.QuoteInclusionId,
        QuoteId: this.QuoteId,
        QuotePackageTypeId: packageTypeId,
        InclusionText: l.InclusionText.trim(),
        Status: 1,
        SortOrder: i + 1,
        UpdatedBy: staffLoginId,
      }));
    const exclusionPayload = this.incExcExclusionLines()
      .filter(l => l.ExclusionText.trim())
      .map((l, i) => ({
        QuoteExclusionId: l.QuoteExclusionId,
        QuoteId: this.QuoteId,
        QuotePackageTypeId: packageTypeId,
        ExclusionText: l.ExclusionText.trim(),
        Status: 1,
        SortOrder: i + 1,
        UpdatedBy: staffLoginId,
      }));

    this.savingIncExc.set(true);
    forkJoin({
      inc: this.service.saveQuoteInclusions(this.enc(inclusionPayload)),
      exc: this.service.saveQuoteExclusions(this.enc(exclusionPayload)),
    }).subscribe({
      next: ({ inc, exc }: any) => {
        this.savingIncExc.set(false);
        if (inc?.Message === ConstantData.SuccessMessage && exc?.Message === ConstantData.SuccessMessage) {
          this.toastr.success('Inclusions/Exclusions saved for this quotation');
          this.incExcModalOpen.set(false);
          this.loadQuoteInclusionsExclusions();
        } else {
          this.toastr.error(inc?.Message !== ConstantData.SuccessMessage ? inc?.Message : exc?.Message || 'Unable to save');
        }
      },
      error: (err: any) => {
        this.savingIncExc.set(false);
        console.error('saveQuoteInclusions/saveQuoteExclusions error:', err);
        this.toastr.error('Error saving inclusions/exclusions');
      },
    });
  }

  editDetail(): void {
    this.router.navigate(['/agent/query-stepthree', this.QueryStepOneId], {
      queryParams: this.QuoteId ? { quoteId: this.QuoteId } : {},
    });
  }

  // ══════════════════════════════════════════════════════════════
  // EDIT GUEST (Tourist Management) — mirrors query-steptwo.ts's
  // editGuest()/openTouristModal() flow, backed by the same
  // GetGuestByTrip / SaveGuestList endpoints, so guest edits made
  // from Step Four stay in sync with Step Two.
  // ══════════════════════════════════════════════════════════════
  showTouristModal = signal(false);
  touristRows = signal<TouristRow[]>([]);
  deletedTouristRows = signal<TouristRow[]>([]);
  savingTourists = signal(false);

  readonly countryCodes = [
    { code: '91-IN', label: '91-IN' },
    { code: '1-US', label: '1-US' },
    { code: '44-GB', label: '44-GB' },
    { code: '971-AE', label: '971-AE' },
    { code: '65-SG', label: '65-SG' },
  ];

  editGuest(): void {
    this.openTouristModal();
  }

  openTouristModal(): void {
    this.loadTouristsForTrip();
    this.showTouristModal.set(true);
  }

  closeTouristModal(): void {
    this.showTouristModal.set(false);
    this.touristRows.set([]);
    this.deletedTouristRows.set([]);
  }

  loadTouristsForTrip(): void {
    // ASSUMPTION: tripInfo() carries AgencyId the same way it already
    // carries AgencyName (used elsewhere on this page) — matching
    // TripDetail.AgencyId in query-steptwo.ts. If your GetQuoteDetail
    // payload doesn't include it, update this one line.
    const agencyId = Number(this.tripInfo()?.AgencyId) || 0;
    const staffLoginId = this.local.getEmployeeDetail()?.StaffLoginId || 0;

    const obj: RequestModel = this.enc({
      AgencyId: agencyId,
      QueryStepOneId: this.QueryStepOneId,
    });

    this.service.getGuestByTrip(obj).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          const rows: TouristRow[] = (r.GuestList ?? [])
            .filter((g: any) => (g.Status ?? 1) !== 0)
            .map((g: any) => ({
              GuestId: g.GuestId,
              AgencyId: g.AgencyId,
              Salutation: g.Salutation ?? 'Mr.',
              ContactName: g.ContactName ?? '',
              CountryCode: g.CountryCode ?? '91-IN',
              Phone: g.Phone ?? '',
              Email: g.Email ?? '',
              IsPrimary: g.IsPrimary ?? false,
              Status: g.Status ?? 1,
              CreatedBy: staffLoginId,
              UpdatedBy: staffLoginId,
              IsExpanded: false,
              IsNew: false,
            }));
          this.touristRows.set(rows);
          this.deletedTouristRows.set([]);
        } else {
          this.toastr.error(r.Message || 'Unable to load tourists');
        }
      },
      error: (err: any) => {
        console.error('getGuestByTrip error:', err);
        this.toastr.error('Error loading tourists');
      },
    });
  }

  addTouristRow(): void {
    const agencyId = Number(this.tripInfo()?.AgencyId) || 0;
    const staffLoginId = this.local.getEmployeeDetail()?.StaffLoginId || 0;
    this.touristRows.update(rows => [
      ...rows,
      {
        GuestId: 0,
        AgencyId: agencyId,
        Salutation: 'Mr.',
        ContactName: '',
        CountryCode: '91-IN',
        Phone: '',
        Email: '',
        IsPrimary: false,
        Status: 1,
        CreatedBy: staffLoginId,
        UpdatedBy: staffLoginId,
        IsExpanded: true,
        IsNew: true,
      },
    ]);
  }

  removeTouristRow(index: number): void {
    const staffLoginId = this.local.getEmployeeDetail()?.StaffLoginId || 0;
    const rows = this.touristRows();
    const row = rows[index];
    if (!row) return;

    if (row.GuestId > 0) {
      this.deletedTouristRows.update(list => [
        ...list,
        { ...row, Status: 0, UpdatedBy: staffLoginId, IsExpanded: false, IsNew: false },
      ]);
    }

    this.touristRows.update(r => r.filter((_, i) => i !== index));
  }

  toggleExpand(index: number): void {
    this.touristRows.update(rows =>
      rows.map((r, i) => (i === index ? { ...r, IsExpanded: !r.IsExpanded } : r))
    );
  }

  saveTourists(): void {
    const rows = this.touristRows();
    const deletedRows = this.deletedTouristRows();

    const invalid = rows.find(r => r.Status !== 0 && (!r.ContactName?.trim()));
    if (invalid) {
      this.toastr.error('Please fill Name for all tourists');
      return;
    }

    this.savingTourists.set(true);

    const obj: RequestModel = this.enc({
      QueryStepOneId: this.QueryStepOneId,
      Guests: [...rows, ...deletedRows].map(r => ({
        GuestId: r.GuestId,
        AgencyId: r.AgencyId,
        Salutation: r.Salutation,
        ContactName: r.ContactName,
        CountryCode: r.CountryCode,
        Phone: r.Phone,
        Email: r.Email,
        IsPrimary: r.IsPrimary,
        Status: r.Status ?? 1,
        CreatedBy: r.CreatedBy,
        UpdatedBy: r.UpdatedBy,
      })),
    });

    this.service.saveGuestList(obj).subscribe({
      next: (r: any) => {
        this.savingTourists.set(false);
        if (r.Message === ConstantData.SuccessMessage) {
          this.toastr.success('Tourists saved successfully');
          this.deletedTouristRows.set([]);
          this.closeTouristModal();
          this.loadPreview(); // re-fetch so totalGuestCount()/tripInfo() reflect the saved guest list
        } else {
          this.toastr.error(r.Message);
        }
      },
      error: (err: any) => {
        this.savingTourists.set(false);
        console.error('saveGuestList error:', err);
        this.toastr.error('Error saving tourists');
      },
    });
  }

  get touristCount(): number {
    return this.touristRows().length;
  }

  backToQuotes(): void {
    this.router.navigate(['/agent/trips']);
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
    return `${nights} Nights / ${nights + 1} Days`;
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
    if (mealsLabel) return `<div style="text-align:center;">${mealsLabel}<br>(${code})</div>`;

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
    return row.InclusionText || row.InclusionDetails || row.InclusionName || row.Name || row.Description || row.Inclusion || '';
  }

  exclusionText(row: any): string {
    return row.ExclusionText || row.ExclusionDetails || row.ExclusionName || row.Name || row.Description || row.Exclusion || '';
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

    if (this.effectiveInclusions().length || this.effectiveExclusions().length) {
      lines.push('-------');
      lines.push('✅  *Inclusions*');
      for (const item of this.effectiveInclusions()) {
        const text = this.inclusionText(item);
        if (text) lines.push(`• ${text}`);
      }
      lines.push('❌  *Exclusions*');
      for (const item of this.effectiveExclusions()) {
        const text = this.exclusionText(item);
        if (text) lines.push(`• ${text}`);
      }
      lines.push('_Anything not listed under inclusions is excluded._');
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
            ${this.buildStyledHeader(this.packageTypes().length > 1 ? `Option ${idx + 1} : ${pkg.PackageTypeName || 'Package'}` : (pkg.PackageTypeName || 'Hotels'))}
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
    if (this.effectiveInclusions().length || this.effectiveExclusions().length) {
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
      // paste sanitizer strips <colgroup>, so column widths were previously
      // pinned per-cell via width="" + inline px. Switched to content-based
      // (auto) sizing per request — columns now size to their longest word
      // instead of a fixed px allotment, avoiding forced overflow when
      // content (e.g. long hotel names) exceeds the old fixed width.
      // 5 columns per reference: Nights | City | Hotel Name | Meal Plan | Accommodation
      html += `
        <table role="presentation" width="${this.CONTENT_W}" cellpadding="0" cellspacing="0" border="0" style="width:${this.CONTENT_W}px;border-collapse:collapse;margin-bottom:10px;">
          <tr>
            <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">Nights</td>
            <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">City</td>
            <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">Hotel Name</td>
            <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">Meal Plan</td>
            <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">Accommodation</td>
          </tr>
          ${stays.map((stay, i) => this.buildHotelRow(stay, i)).join('')}
        </table>
      `;
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

    // Prices goes directly below Hotel Special Inclusions, per spec.
    if (!this.hideTotalPrice()) {
      // Overall pricing strategy -> categories is [] (see guestCategoryTotals()),
      // so only the Total row renders below; Per Person keeps its existing
      // per-category breakdown exactly as before. The Total row itself is no
      // longer gated behind categories.length, so it can never disappear.
      html += this.buildPriceBox(packageTypeId);
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

  private buildHotelRow(stay: any, index: number): string {
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
        <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:7px 10px;vertical-align:top;${zebra}">${nightsLabel}</td>
        <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:7px 10px;vertical-align:top;${zebra}">${cityCell}</td>
        <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:7px 10px;vertical-align:top;${zebra}">${hotelCell}</td>
        <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:7px 10px;vertical-align:top;${zebra}">${mealCell}</td>
        <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:7px 10px;vertical-align:top;${zebra}">${accommodationCell}</td>
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
    const incItems = this.effectiveInclusions().map(i => this.inclusionText(i)).filter(Boolean);
    const excItems = this.effectiveExclusions().map(e => this.exclusionText(e)).filter(Boolean);

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

  /**
   * Downloads the same HTML produced by generateEmailHTML() (the exact
   * content Copy uses) as a Word-compatible .doc file. Uses the
   * "HTML-as-.doc" technique — a full HTML document wrapped with the
   * Office/Word XML namespaces and served with a Word MIME type — rather
   * than a real OOXML (.docx) build, so no extra document-generation
   * library is required; Word opens this natively via its long-standing
   * HTML import path. Filename mirrors the PDF download's convention.
   *
   * The email tables are pinned to fixed pixel widths (EMAIL_W=1000,
   * CONTENT_W=970, and a nested 620 for the overview table) — necessary in
   * email clients (see the EMAIL_W comment re: Gmail stripping colgroup),
   * but fixed pixels don't yield to any page size in Word, and border/
   * padding box-model stacking can push the rendered width past even a
   * generously sized custom page. So rather than guessing a paper size
   * large enough, toWordSafeHtml() below neutralizes exactly those three
   * known container widths to 100%/fluid for this export only — the email
   * and PDF paths are untouched — while leaving the inner column widths
   * (110/130/320/160/250 etc.) in place so the table still lays out with
   * roughly the same proportions, just scaled to fit whatever page Word
   * actually renders.
   */
  /**
   * Strips every fixed pixel width/max-width in the exported HTML — both
   * container-level (EMAIL_W/CONTENT_W/620) and, critically, the per-column
   * cell widths (nights:110, city:130, hotel:320, meal:160,
   * accommodation:250, etc.) that the earlier container-only fluid
   * override missed. A width:100% on a parent table is a floor, not a
   * ceiling — if child cells' explicit widths sum to more than the parent's
   * rendered width, standard table layout renders the table at the larger
   * size regardless, which is why constraining only the outer containers
   * still overflowed. Removing every inline width declaration (plus the
   * matching HTML width="123" attribute, since some legacy renderers
   * prioritize it over CSS) leaves nothing that can force the table wider
   * than the page; columns fall back to content-based auto sizing and wrap
   * instead. Trade-off: exact column proportions from the email/PDF layout
   * are no longer guaranteed in the Word export — this prioritizes "fits
   * on the page" over "identical proportions," since two attempts at the
   * latter both still clipped.
   */
  private toWordSafeHtml(html: string): string {
    return html
      .replace(/width:\s*\d+px;?/g, '')
      .replace(/max-width:\s*\d+px;?/g, '')
      .replace(/min-width:\s*\d+px;?/g, '')
      .replace(/white-space:\s*nowrap;?/g, '')
      .replace(/\swidth="\d+"/g, '');
  }

  /** Shared CSS for every voucher export surface (on-screen preview, printed
   *  PDF, Word doc): pins the voucher to an A4 page, forces every table/
   *  image/paragraph to stay inside that page instead of overflowing it,
   *  and keeps each section from splitting across a page break. Scoped
   *  entirely under `.voucher-export-root` so it can never leak out and
   *  restyle unrelated tables elsewhere in the app or in Word itself. */
  private readonly VOUCHER_A4_STYLES = `
    .voucher-export-root {
      width: 794px;
      min-height: 1123px;
      background: #ffffff;
      margin: 0 auto;
      padding: 24px;
      box-sizing: border-box;
      overflow: hidden;
    }
    @media print {
      .voucher-export-root {
        width: 210mm;
        min-height: 297mm;
        padding: 12mm;
        margin: 0;
        page-break-after: always;
      }
      body { margin: 0 !important; padding: 0 !important; }
      * { box-sizing: border-box; }
    }
    .voucher-export-root table {
      width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse;
    }
    .voucher-export-root td,
    .voucher-export-root th {
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
    }
    .voucher-export-root img {
      max-width: 100% !important;
      height: auto !important;
      display: block;
    }
    .voucher-export-root p,
    .voucher-export-root div,
    .voucher-export-root li {
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
      line-height: 1.5;
    }
    .voucher-export-root .trip-voucher-section,
    .voucher-export-root .hotel-section,
    .voucher-export-root .guest-section,
    .voucher-export-root .daywise-section,
    .voucher-export-root .transport-section,
    .voucher-export-root .inclusion-section,
    .voucher-export-root .terms-section,
    .voucher-export-root .day-card {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .voucher-export-root table { page-break-inside: auto; }
    .voucher-export-root tr { page-break-inside: avoid; }
  `;

  /** Turns the raw voucher document (fixed-px, email-oriented layout) into
   *  a self-contained A4 document: strips every fixed pixel width so
   *  nothing can force the page wider than 210mm, wraps the body in
   *  `.voucher-export-root`, and injects VOUCHER_A4_STYLES. Used by the
   *  preview, PDF print, and Word export so all three stay visually
   *  identical (req: "preview must match export"). */
  private toVoucherExportHtml(rawHtml: string): string {
    return this.toWordSafeHtml(rawHtml)
      .replace('<title>Booking Confirmation Voucher</title>',
        `<title>Booking Confirmation Voucher</title><style>${this.VOUCHER_A4_STYLES}</style>`)
      .replace(/(<body[^>]*>)/, '$1<div class="voucher-export-root">')
      .replace('</body>', '</div></body>');
  }

  downloadWordDoc(): void {
    try {
      const htmlContent = this.toWordSafeHtml(this.generateEmailHTML());
      const wordDoc = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office'
              xmlns:w='urn:schemas-microsoft-com:office:word'
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>90</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            /* Landscape gives noticeably more usable width than portrait
               for these wide comparison tables; combined with the fluid
               containers above, nothing is hard-pinned wider than the page
               anymore, so this is just for comfortable proportions, not
               a load-bearing fix. */
            @page WordSection1 {
              size: 792.0pt 612.0pt;
              margin: 36.0pt 36.0pt 36.0pt 36.0pt;
              mso-page-orientation: landscape;
            }
            div.WordSection1 { page: WordSection1; }
            table { width: 100% !important; }
            table, td, th { word-wrap: break-word !important; overflow-wrap: break-word !important; }
          </style>
        </head>
        <body>
          <div class="WordSection1">
            ${htmlContent}
          </div>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', wordDoc], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Quotation-${this.formatQuotationNo(this.tripInfo()?.QuotationNo)}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.toastr.success('Word document downloaded.');
    } catch (error) {
      console.error('Word download failed:', error);
      this.toastr.error('Could not generate the Word document. Please try again.');
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
        inclusions: this.effectiveInclusions(),
        exclusions: this.effectiveExclusions(),
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

  // ══════════════════════════════════════════════════════════════
  // BOOKING CONFIRMATION VOUCHER (Docs tab, converted trips only)
  // ══════════════════════════════════════════════════════════════
  //
  // Reuses the same builder methods as the email/PDF quotation (theme,
  // buildStyledHeader, buildItineraryBlocks, buildTransportActivitiesHTML,
  // buildInclusionExclusionTable, buildTermsList, stayBlocksByPackage, etc.)
  // so this can never visually drift from the quotation output. What's new
  // here is the voucher-specific framing: Trip Voucher summary, Guest List,
  // and a 4-column Hotel/Check-In/Check-Out/Accommodation table, all scoped
  // to whichever package was actually converted — not every package option
  // on the quote.
  //
  // Two real data gaps worth calling out rather than papering over:
  //   1. Guest has no Age or Nationality column in the schema. Age is shown
  //      as "(A)" for every named guest (adults are all this page can tell
  //      apart); Nationality falls back to QueryStepOne.Nationality, which
  //      is a single trip-level value, not per-guest.
  //   2. There is no Bank Account table/columns anywhere in the schema. The
  //      "Bank Account" toggle renders an honest "not configured" line
  //      instead of inventing account details — wire this up for real once
  //      that data exists somewhere.

  voucherShowPrices = signal(false);
  voucherRemoveBranding = signal(false);
  voucherRemoveHotels = signal(false);
  voucherRemoveFullItinerary = signal(false);
  voucherShowSupplierContact = signal(false);
  voucherShowBankAccount = signal(false);
  voucherShowGuestList = signal(true);
  voucherShowTnC = signal(true);

  toggleVoucherShowPrices(): void { this.voucherShowPrices.update(v => !v); }
  toggleVoucherRemoveBranding(): void { this.voucherRemoveBranding.update(v => !v); }
  toggleVoucherRemoveHotels(): void { this.voucherRemoveHotels.update(v => !v); }
  toggleVoucherRemoveFullItinerary(): void { this.voucherRemoveFullItinerary.update(v => !v); }
  toggleVoucherShowSupplierContact(): void { this.voucherShowSupplierContact.update(v => !v); }
  toggleVoucherShowBankAccount(): void { this.voucherShowBankAccount.update(v => !v); }
  toggleVoucherShowGuestList(): void { this.voucherShowGuestList.update(v => !v); }
  toggleVoucherShowTnC(): void { this.voucherShowTnC.update(v => !v); }

  private voucherGuestsLoaded = signal(false);
  public loadVoucherGuestsIfNeeded(): void {
    if (this.voucherGuestsLoaded() || !this.isConverted()) return;
    this.voucherGuestsLoaded.set(true);
    this.loadTouristsForTrip(); // populates the shared touristRows() signal
  }

  /** Package actually confirmed/converted — falls back to the first option
   *  only so the voucher never renders fully blank before conversion data
   *  has loaded. */
  voucherPackageTypeId = computed<number>(() =>
    this.convertedPackageTypeId() || this.packageTypes()[0]?.QuotePackageTypeId || 0
  );

  voucherHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.generateVoucherHtml());
  }

  /** On-screen preview, built from the exact same A4-wrapped document as
   *  the PDF/Word exports (toVoucherExportHtml), so what you see in the
   *  panel is what downloads. */
  voucherPreviewHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.toVoucherExportHtml(this.generateVoucherHtml()));
  }

  private generateVoucherHtml(): string {
    const t = this.emailTheme;
    const trip = this.tripInfo();
    let body = '';


    body += `
      <h1 style="font-family:${t.font};font-size:28px;font-weight:bold;color:${t.text};margin:0 0 14px 0;text-align:center;">Booking Confirmation Voucher</h1>
      <p style="font-family:${t.font};font-size:15px;color:${t.text};margin:0 0 14px 0;">We are pleased to confirm the below booking. Please find confirmation details</p>
    `;

    body += `<div class="trip-voucher-section">${this.buildStyledHeader('Trip Voucher')}${this.buildVoucherTripTable()}</div>`;

    if (this.voucherShowGuestList()) {
      body += `<div class="guest-section">${this.buildStyledHeader('Guest List')}${this.buildVoucherGuestListHtml()}</div>`;
    }

    if (!this.voucherRemoveHotels()) {
      body += `<div class="hotel-section">${this.buildStyledHeader('Hotels')}${this.buildVoucherHotelsHtml()}</div>`;
    }

    if (!this.voucherRemoveFullItinerary()) {
      body += `<div class="daywise-section">${this.buildStyledHeader('Day Wise Itinerary')}${this.buildItineraryBlocks()}</div>`;
      if (this.hasAnyTransportOrActivity()) {
        body += `<div class="transport-section">${this.buildStyledHeader('Transportation and Activities')}${this.buildTransportActivitiesHTML()}</div>`;
      }
    }

    if (this.effectiveInclusions().length || this.effectiveExclusions().length) {
      body += `<div class="inclusion-section">${this.buildInclusionExclusionTable()}</div>`;
    }

    if (this.voucherShowPrices()) {
      body += `${this.buildStyledHeader('Prices (INR)')}${this.buildPriceBox(this.voucherPackageTypeId())}`;
    }

    if (this.voucherShowTnC() && this.hasTerms()) {
      body += `<div class="terms-section">${this.buildStyledHeader('Terms and Conditions')}${this.buildTermsList()}</div>`;
    }

    if (this.voucherShowBankAccount()) {
      body += `
        ${this.buildStyledHeader('Bank Account')}
        <div style="font-family:${t.font};font-size:14px;color:${t.muted};font-style:italic;margin-bottom:14px;">No bank account details are configured for this agency yet.</div>
      `;
    }

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Booking Confirmation Voucher</title></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:${t.font};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
  <tr>
    <td align="center" style="padding:16px 8px;">
      <table role="presentation" width="${this.EMAIL_W}" cellpadding="0" cellspacing="0" border="0" style="width:${this.EMAIL_W}px;max-width:${this.EMAIL_W}px;background-color:#ffffff;font-family:${t.font};color:${t.text};">
        <tr><td style="padding:0 15px;">${body}</td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
  }

  // ── Trip Voucher summary table ──
  private buildVoucherTripTable(): string {
    const t = this.emailTheme;
    const trip = this.tripInfo();
    const labelW = 170;

const pairRow = (l1: string, v1: string, l2: string, v2: string): string => `
  <tr>
    <td width="${labelW}" style="width:${labelW}px;border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:normal;padding:8px 12px;vertical-align:top;">${l1}</td>
    <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:8px 12px;vertical-align:top;">${v1}</td>
    <td width="${labelW}" style="width:${labelW}px;border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:normal;padding:8px 12px;vertical-align:top;">${l2}</td>
    <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:8px 12px;vertical-align:top;">${v2}</td>
  </tr>
`;
const fullRow = (label: string, value: string): string => `
  <tr>
    <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:normal;padding:8px 12px;vertical-align:top;">${label}</td>
    <td colspan="3" style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:8px 12px;vertical-align:top;">${value}</td>
  </tr>
`;

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:14px;">
        ${pairRow('Trip ID', this.formatQuotationNo(trip?.QuotationNo), 'Start Date', this.formatDateComma(trip?.StartDate))}
        ${pairRow('Destination', trip?.DestinationName || '-', 'Trip Duration', this.durationLabel())}
        ${pairRow('Guest Name', trip?.ContactName || '-', 'Guest Ph.', trip?.Phone || '-')}
        ${fullRow('Pax', this.paxOverviewLabel())}
        ${fullRow('Arrival Details', this.scheduleLinesHtml(this.arrivalDetail()))}
        ${fullRow('Departure Details', this.scheduleLinesHtml(this.departureDetail()))}
      </table>
    `;
  }

  /** Formats Arrival/Departure schedule rows as "18 Oct, 2026 at 07:07 hrs : details",
   *  one per line — matches TripScheduleDetail's DateTime + Details fields. */
  private scheduleLinesHtml(rows: any[]): string {
    const t = this.emailTheme;
    if (!rows?.length) {
      return `<span style="color:${t.muted};font-style:italic;">Not added</span>`;
    }
    return rows
      .map(r => {
        const dt = r.DateTime ? new Date(r.DateTime) : null;
        const dateStr = dt ? this.formatDateComma(dt) : '-';
        const timeStr = dt
          ? `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`
          : '00:00';
        return `${dateStr} at ${timeStr} hrs : ${r.Details || ''}`;
      })
      .join('<br>');
  }

  /** "18 Oct, 2026" — same info as formatDateLong() but abbreviated month
   *  and a comma, to match the voucher reference layout exactly. */
  private formatDateComma(value: any): string {
    if (!value) return '-';
    const d = new Date(value);
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleDateString('en-IN', { month: 'short' });
    return `${day} ${month}, ${d.getFullYear()}`;
  }

  // ── Guest List table ──
  private buildVoucherGuestListHtml(): string {
    const t = this.emailTheme;
    const trip = this.tripInfo();
    const rows = this.touristRows();
    // Guest carries no per-row Age/Type split, so every loaded row is
    // assumed adult; NoOfAdults/ChildrenAges (trip-level) fill the gap for
    // guests that were never itemized individually, exactly as the
    // reference "+N more adults, M more child (Details Pending)" line does.
    const nationality = trip?.Nationality || '';
    const totalAdults = Number(trip?.NoOfAdults) || 0;
    const ages = this.childrenAgesList();
    const extraAdults = Math.max(0, totalAdults - rows.length);
    const extraChildren = ages.length;

    if (!rows.length && !extraAdults && !extraChildren) {
      return `<div style="font-family:${t.font};font-size:14px;color:${t.muted};font-style:italic;margin-bottom:14px;">No guests added yet.</div>`;
    }

    const rowsHtml = rows.map((g, i) => `
      <tr>
        <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:7px 10px;">${i + 1}.${g.IsPrimary ? ' \u2605' : ''}</td>
        <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:7px 10px;font-weight:bold;">${g.Salutation || ''} ${g.ContactName || ''}</td>
        <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:7px 10px;">(A)</td>
        <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:7px 10px;">${g.Phone ? `+${(g.CountryCode || '91-IN').split('-')[0]}-${g.Phone}` : ''}</td>
        <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:7px 10px;">${nationality}</td>
      </tr>
    `).join('');

    const extraParts: string[] = [];
    if (extraAdults) extraParts.push(`${extraAdults} more adult${extraAdults > 1 ? 's' : ''}`);
    if (extraChildren) extraParts.push(`${extraChildren} more child${extraChildren > 1 ? 'ren' : ''}`);
    const extraRow = extraParts.length ? `
      <tr>
        <td colspan="5" style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-style:italic;color:${t.muted};padding:7px 10px;">+ ${extraParts.join(', ')} (Details Pending)</td>
      </tr>
    ` : '';

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:14px;">
        <tr>
          <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">S.No.</td>
          <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">Guest Name</td>
          <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">Age</td>
          <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">Phone</td>
          <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">Nationality</td>
        </tr>
        ${rowsHtml}
        ${extraRow}
      </table>
    `;
  }

  // ── Hotels table (Hotel | Check-In | Check-Out | Accommodation) ──
  private buildVoucherHotelsHtml(): string {
    const t = this.emailTheme;
    const stays = this.stayBlocksByPackage(this.voucherPackageTypeId())
      .flatMap(stay => this.splitStayByContiguousNights(stay))
      .sort((a, b) => a.nights[0] - b.nights[0]);

    if (!stays.length) {
      return `<div style="font-family:${t.font};font-size:14px;color:${t.muted};font-style:italic;margin-bottom:14px;">No hotels added.</div>`;
    }

    const rowsHtml = stays.map((stay, i) => {
      const zebra = i % 2 ? `background-color:${t.zebraBg};` : '';
      const nightsLabel = stay.nights.map((n: number) => `${n}${this.ordinal(n)}`).join(', ') + ` Night${stay.nights.length > 1 ? 's' : ''}`;
      const contact = this.voucherShowSupplierContact() && stay.main.HotelContactNumber
        ? `<br><span style="font-size:12px;color:${t.muted};">Contact: ${stay.main.HotelContactNumber}</span>`
        : '';

      return `
        <tr>
          <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:8px 10px;vertical-align:top;${zebra}">
            <strong>${stay.main.HotelName || ''}</strong><br>
            <span style="font-size:13px;color:${t.muted};">${stay.main.LocationName || ''}</span>${contact}
          </td>
          <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:8px 10px;vertical-align:top;${zebra}">${this.shortDate(stay.checkIn)}<br><strong>${nightsLabel}</strong></td>
          <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:8px 10px;vertical-align:top;${zebra}">${this.shortDate(stay.checkOut)}</td>
          <td style="border:1px solid ${t.border};font-family:${t.font};font-size:14px;padding:8px 10px;vertical-align:top;${zebra}">
            ${stay.main.NoOfRooms || 1} ${stay.main.RoomTypeName || 'Room'}<br>
            <span style="font-size:13px;color:${t.muted};">(${this.paxSummary(stay.main)})</span><br>
            <span style="font-size:13px;color:${t.gold};font-weight:bold;">${this.formatMealPlan(stay.main.MealPlan)}</span>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:14px;">
        <tr>
          <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">Hotel</td>
          <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">Check-In</td>
          <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">Check-Out</td>
          <td style="background-color:${t.headerBg};border:1px solid ${t.border};font-family:${t.font};font-size:14px;font-weight:bold;padding:7px 10px;">Accommodation</td>
        </tr>
        ${rowsHtml}
      </table>
    `;
  }

  private stripHtmlToText(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(tr|p|div|h1|table)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /** Copies the voucher as rich HTML (pastes formatted into Word/Gmail/
   *  WhatsApp Web), falling back to plain text where the rich Clipboard
   *  API isn't available — same pattern as copyEmailHtml(). */
  async copyVoucherHtml(): Promise<void> {
    const html = this.generateVoucherHtml();
    try {
      if (navigator.clipboard && typeof (window as any).ClipboardItem !== 'undefined') {
        const clipboardItem = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([this.stripHtmlToText(html)], { type: 'text/plain' }),
        });
        await navigator.clipboard.write([clipboardItem]);
        this.toastr.success('Voucher copied! Paste directly into Word, Gmail, or WhatsApp Web.');
        return;
      }
    } catch (error) {
      console.error('Rich clipboard copy failed, falling back:', error);
    }
    try {
      await navigator.clipboard.writeText(this.stripHtmlToText(html));
      this.toastr.success('Copied as plain text (rich HTML copy not supported in this browser).');
    } catch (err) {
      console.error('Plain-text clipboard copy failed:', err);
      this.toastr.error('Could not copy to clipboard. Please try again.');
    }
  }

  /** Same "HTML-as-.doc" technique as downloadWordDoc() — reused directly
   *  rather than reinvented, just pointed at the voucher HTML/filename. */
  downloadVoucherWordDoc(): void {
    try {
      // Word ignores @media print and mostly ignores flex/box-sizing, so it
      // gets its own simpler style block rather than reusing
      // VOUCHER_A4_STYLES: @page WordSection1 in points is what Word's own
      // engine actually paginates against, sized to A4 (595.3pt x 841.9pt)
      // instead of the previous 612.0pt x 792.0pt, which was US Letter —
      // that mismatch, not just wide tables, is why content was cropping
      // on the right and not fitting the page.
      const htmlContent = this.toWordSafeHtml(this.generateVoucherHtml())
        .replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, '')
        .replace(/<\/body>\s*<\/html>\s*$/i, '');
      const wordDoc = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office'
              xmlns:w='urn:schemas-microsoft-com:office:word'
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml>
          <![endif]-->
          <style>
            @page WordSection1 { size: 595.3pt 841.9pt; margin: 36.0pt; }
            @page { size: A4 portrait; margin: 12mm; }
            div.WordSection1 { page: WordSection1; }
            body { width: 210mm; margin: 0 auto; font-family: Calibri, Arial, sans-serif; }
            table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse; }
            td, th { word-break: break-word !important; overflow-wrap: break-word !important; white-space: normal !important; }
            img { max-width: 100% !important; height: auto !important; }
          </style>
        </head>
        <body><div class="WordSection1">${htmlContent}</div></body>
        </html>
      `;
      const blob = new Blob(['\ufeff', wordDoc], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Voucher-${this.formatQuotationNo(this.tripInfo()?.QuotationNo)}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.toastr.success('Word document downloaded.');
    } catch (error) {
      console.error('Voucher Word download failed:', error);
      this.toastr.error('Could not generate the Word document. Please try again.');
    }
  }

  /** Print-to-PDF via the browser's own print dialog, targeted at the same
   *  HTML the Copy/Word buttons use. NOT wired into QuotationPdfEngine —
   *  that engine's docDefinition builder is shaped around the quotation's
   *  own layout (cover/back-cover, pdfMake content trees keyed off
   *  daySlots/packageTypes callbacks) and would need real extension work to
   *  support this voucher's different sections; faking that integration
   *  here would just produce a PDF that silently doesn't match what Copy/
   *  Word actually export. This gets a working PDF today without that risk. */
  downloadVoucherPdf(): void {
    const win = window.open('', '_blank');
    if (!win) {
      this.toastr.error('Please allow pop-ups to download the voucher as PDF.');
      return;
    }
    // Print the A4-wrapped document (voucher-export-root + VOUCHER_A4_STYLES),
    // not the raw fixed-1000px email layout — otherwise "Save as PDF" prints
    // an email-width page that clips on the right instead of a fitted A4 page.
    win.document.write(this.toVoucherExportHtml(this.generateVoucherHtml()));
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }
}
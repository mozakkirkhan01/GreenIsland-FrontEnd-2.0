import {
  Component, OnInit, signal, inject, computed, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Observable } from 'rxjs';

import { UnsavedChangesDialogComponent } from '../../component/unsaved-changes-dialog/unsaved-changes-dialog';
import { UnsavedChangesDialogService } from '../../component/unsaved-changes-dialog/unsaved-changes-dialog.service';
import { CanComponentDeactivate } from '../../guards/can-deactivate-guard';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { LoadDataService } from '../../utils/load-data.service';

import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ConstantData } from '../../utils/constant-data';
import { RequestModel, StaffLoginModel } from '../../utils/interface';
import { Progress } from '../../component/progress/progress';
import { QuillModule } from 'ngx-quill';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PricingStrategy } from '../../utils/enum';

// ── Interfaces ────────────────────────────────────────────────
export interface QuoteSpecialInclusionRow {
  QuoteSpecialInclusionId: number;
  QuoteId: number;
  QuoteHotelId: number;
  QuotePackageTypeId: number; // ← ADD THIS
  HotelId: number;
  NightNumbers: number[];
  SpecialInclusionId: number;
  SpecialInclusionName: string;
  HotelName: string;
  TotalPrice: number;
  Comments: string;
  ServiceSearch: string;
  FilteredServices: any[];
  ShowServiceDropdown: boolean;
  HotelSearch: string;
  FilteredHotels: any[];
  ShowHotelDropdown: boolean;
  //manual location toogle support
  ManualLocationName: string;
  UseManualLocation: boolean;
  //night selection support
  ShowNightDropdown: boolean;
  SelectedNightsDisplay: string;
  // UI
  AvailableServices: any[];
  IsSaving: boolean;
}

export interface TripInfo {
  QueryStepOneId: number;
  QuotationNo: number;
  DestinationId: number;
  DestinationName: string;
  StartDate: string;
  NoOfNights: number;
  NoOfAdults: number;
  ChildrenAges: string;
}
export interface DayGroup {
  GroupId: number;
  QuotePackageTypeId: number;
  DayNumbers: number[];
  ShowDayDropdown: boolean;
  SelectedDaysDisplay: string;
  TransportRows: QuoteTransportRow[];
  ActivityRows: ActivityTicketRow[];
}

export interface PackageTypeRow {
  QuotePackageTypeId: number;
  PackageTypeName: string;
}

export interface NightSlot {
  NightNumber: number;
  StayDate: Date;
  DateLabel: string;
  DayLabel: string;
}

export interface DaySlot {
  DayNumber: number;
  ServiceDate: Date;
  DateLabel: string;
  DayLabel: string;
}

export interface QuoteHotelRow {
  QuoteHotelId: number;
  QuoteId: number;
  QuotePackageTypeId: number;
  NightNumber: number;
  NightNumbers: number[];
  StayDate: Date;
  HotelId: number;
  HotelName: string;
  SpecialInclusions: any[];
  LocationName: string;
  HotelCategoryName: string;
  RoomTypeId: number;
  RoomTypeName: string;
  MealPlan: string;
  NoOfRooms: number;
  PaxPerRoom: number;
  AWEB: number;
  CWEB: number;
  CNB: number;
  CostPrice: number;
  SellingPrice: number;
  BaseRate: number;
  AwebRate: number;
  CwebRate: number;
  CnbRate: number;
  TotalPrice: number;
  RoomTypes: any[];
  IsSaving: boolean;
  HotelSearch: string;
  FilteredHotels: any[];
  ShowDropdown: boolean;
  ShowNightDropdown: boolean;
  SelectedNightsDisplay: string;
}
export type ActivityPaxType = 'Adult' | 'Child' | 'ChildBelowTwoYear';

export interface ActivityDateRate {
  DayNumber: number;
  ServiceDate: Date;
  AdultRate: number;
  ChildAboveTwoYear: number;
  ChildBelowTwoYear: number;
}

export interface ActivityTicketEntry {
  QuoteServiceId: number;
  DayNumber: number;
  ServiceDate: Date;
  Rate: number;        // resolved per pax type — read-only
  GivenPrice: number;  // editable selling price
  IsSaving: boolean;
}

export interface ActivityTypeGroup {
  GroupId: number;
  PaxType: ActivityPaxType | '';
  PaxTypeLabel: string;
  TypeSearch: string;
  ShowTypeDropdown: boolean;
  Qty: number;                     // one Qty per group, applies across all its dates
  Entries: ActivityTicketEntry[];
}

export interface ActivityTicketRow {
  RowId: number;
  QuotePackageTypeId: number;

  LocationId: number;
  LocationName: string;
  LocationSearch: string;
  FilteredLocations: any[];
  ShowLocationDropdown: boolean;

  ActivityServiceId: number;
  ActivityServiceName: string;
  TicketTypeSearch: string;
  FilteredActivityServices: any[];
  ShowTicketTypeDropdown: boolean;

  DateRates: ActivityDateRate[];   // master rate per day, fetched once per ActivityService
  TypeGroups: ActivityTypeGroup[];
  Entries: ActivityTicketEntry[];  // flat list of entries for backward compatibility
}

export interface QuoteServiceRow {
  QuoteServiceId: number;
  QuoteId: number;
  QuotePackageTypeId: number;
  DayNumber: number;
  ServiceDate: Date;
  ServiceType: number;
  IteneraryServiceId: number;
  IteneraryServiceName: string;
  VehicleTypeId: number;
  VehicleTypeName: string;
  SameCabForAll: boolean;
  ActivityServiceId: number;
  ActivityServiceName: string;
  Qty: number;
  CostPrice: number;
  SellingPrice: number;
  Notes: string;
  IsSaving: boolean;
  // ADD THESE
  LocationId: number;
  LocationName: string;
  FilteredVehicles?: any[]; // Replace 'any' with your Vehicle type
  VehicleTypeSearch?: string;
  ShowVehicleDropdown?: boolean;
  TotalPrice: number;
}


export interface QuoteTransportRow {
  QuoteServiceId: number;
  QuoteId: number;
  QuotePackageTypeId: number;
  DayNumbers: number[];           // Multi-select days (like hotel nights)
  DayNumber: number;              // Primary day
  ServiceDate: Date;
  LocationId: number;
  LocationName: string;
  IteneraryServiceId: number;
  IteneraryServiceName: string;
  VehicleTypeId: number;
  VehicleTypeName: string;
  SameCabForAll: boolean;
  Qty: number;
  CostPrice: number;
  SellingPrice: number;
  TotalPrice: number;
  Notes: string;
  IsSaving: boolean;

  // UI search fields (per row - like hotel row pattern)
  LocationSearch: string;
  FilteredLocations: any[];
  ShowLocationDropdown: boolean;
  ServiceSearch: string;
  FilteredServices: any[];
  ShowServiceDropdown: boolean;
  VehicleSearch: string;
  FilteredVehicles: any[];
  ShowVehicleDropdown: boolean;
  ShowDayDropdown: boolean;        // Like hotel ShowNightDropdown
  SelectedDaysDisplay: string;     // Like hotel SelectedNightsDisplay
}
export interface ActivityTicketEntry {
  QuoteServiceId: number;
  DayNumber: number;
  ServiceDate: Date;
  Qty: number;
  Rate: number;        // system rate, read-only
  GivenPrice: number;  // selling price, editable
  IsSaving: boolean;
}

@Component({
  selector: 'app-query-stepthree',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatButtonModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatInputModule,
    MatTooltipModule, MatDividerModule,
    Progress,
    UnsavedChangesDialogComponent, QuillModule,
  ],
  templateUrl: './query-stepthree.html',
  styleUrl: './query-stepthree.css',
})
export class QueryStepthree implements OnInit, CanComponentDeactivate {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(AppService);
  private toastr = inject(ToastrService);
  private local = inject(LocalService);
  private sanitizer = inject(DomSanitizer);
  private dialogService = inject(UnsavedChangesDialogService); // ← ADD

  // ── IDs ───────────────────────────────────────────────────
  QueryStepOneId = 0;
  QuoteId = 0;

  staffLogin: StaffLoginModel = {} as StaffLoginModel;

  // ── Unsaved changes ───────────────────────────────────────
  hasUnsavedChanges = false;

  markDirty(): void { this.hasUnsavedChanges = true; }
  markClean(): void { this.hasUnsavedChanges = false; }

  canDeactivate(): boolean | Observable<boolean> {
    if (!this.hasUnsavedChanges) return true;
    return this.dialogService.confirm();
  }

  // ── Page Refresh Popup ────────────────────────────────────
  @HostListener('window:beforeunload', ['$event'])
  unloadNotification(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  // ── Signals ───────────────────────────────────────────────
  loading = signal(false);
  tripInfo = signal<TripInfo | null>(null);
  packageTypes = signal<PackageTypeRow[]>([]);

  dayGroups = signal<DayGroup[]>([]);
  private dayGroupCounter = 0;

  specialInclusionRows = signal<QuoteSpecialInclusionRow[]>([]);
  specialInclusionMasterList = signal<any[]>([]);
  transportRows = signal<QuoteTransportRow[]>([]);
  loadData = inject(LoadDataService);

  hotelList = signal<any[]>([]);
  specialInclusionsByHotel: Record<number, any[]> = {};
  itineraryList = signal<any[]>([]);
  activityList = signal<any[]>([]);
  vehicleTypeList = signal<any[]>([]);

  hotelRows = signal<QuoteHotelRow[]>([]);
  serviceRows = signal<QuoteServiceRow[]>([]);

  // New hotel model
  newHotel = {
    HotelName: '',
    LocationId: 0,
    HotelCategoryId: 0,
  };
  newRoomTypes: { RoomTypeName: string }[] = [];
  showNewHotelModal = false;
  newHotelSaving = false;
  pendingHotelRow: QuoteHotelRow | null = null; // which row triggered add

  // Master lists for modal dropdowns
  locationList = signal<any[]>([]);
  hotelCategoryList = signal<any[]>([]);

  pricingstrategylist = this.loadData.GetEnumList(PricingStrategy);

  // UI state
  showPkgModal = false;
  pkgModalRows: PackageTypeRow[] = [];
  activePackageTypeId = signal(0);
  internalNotes = '';
  gstPercent = 5;
  sameCabForAll = false;
  globalVehicleTypeId = 0;


  //transport


  // ── Night & Day slots ─────────────────────────────────────
  nightSlots = computed<NightSlot[]>(() => {
    const trip = this.tripInfo();
    if (!trip) return [];
    const slots: NightSlot[] = [];
    const start = new Date(trip.StartDate);
    for (let i = 0; i < trip.NoOfNights; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      slots.push({
        NightNumber: i + 1,
        StayDate: d,
        DateLabel: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        DayLabel: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      });
    }
    return slots;
  });

  daySlots = computed<DaySlot[]>(() => {
    const trip = this.tripInfo();
    if (!trip) return [];
    const slots: DaySlot[] = [];
    const start = new Date(trip.StartDate);
    for (let i = 0; i <= trip.NoOfNights; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      slots.push({
        DayNumber: i + 1,
        ServiceDate: d,
        DateLabel: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        DayLabel: d.toLocaleDateString('en-IN', { weekday: 'long' }),
      });
    }
    return slots;
  });

  // Add this computed property with your other totals
  specialInclusionTotal = computed(() =>
    this.specialInclusionRows()
      .filter(r => r.QuotePackageTypeId === this.activePackageTypeId())
      .reduce((sum, row) => sum + (row.TotalPrice || 0), 0)
  );

  // Update hotelTotal to include special inclusions
  hotelTotal = computed(() => {
    const hotelTotal = this.hotelRows()
      .filter(r => r.QuotePackageTypeId === this.activePackageTypeId())
      .reduce((s, r) => s + (r.SellingPrice || 0), 0);

    const specialTotal = this.specialInclusionRows()
      .filter(r => r.QuotePackageTypeId === this.activePackageTypeId())
      .reduce((s, r) => s + (r.TotalPrice || 0), 0);

    return hotelTotal + specialTotal;
  });
  // Add this method to handle price changes
  onSpecialInclusionPriceChange(row: QuoteSpecialInclusionRow): void {
    this.markDirty();
    // Force the signal to update
    this.specialInclusionRows.update(rows => [...rows]);
  }


transportTotal = computed(() => {
  let total = 0;
  const dayGroups = this.getActiveDayGroups();
  dayGroups.forEach(group => {
    group.TransportRows.forEach(row => {
      total += (row.SellingPrice || row.TotalPrice || 0);
    });
  });
  // Also include main transportRows signal - REMOVE package type filter
  total += this.transportRows()
    .reduce((s, r) => s + (r.SellingPrice || 0) * (r.DayNumbers.length || 1), 0);
  return total;
});

activityTotal = computed(() => {
  let total = 0;
  const dayGroups = this.getActiveDayGroups();
  dayGroups.forEach(group => {
    group.ActivityRows.forEach(row => {
      total += this.getActivityRowTotal(row);
    });
  });
  // Also include main activityTicketRows signal - REMOVE package type filter
  total += this.activityTicketRows()
    .reduce((s, r) => s + this.getActivityRowTotal(r), 0);
  return total;
});


  totalCost = computed(() =>
    this.hotelTotal() + this.transportTotal() + this.activityTotal()
  );

  gstAmount = computed(() =>
    Math.round(this.totalCost() * this.gstPercent / 100)
  );

  finalPrice = computed(() =>
    this.totalCost() + this.gstAmount()
  );

  // ── Lifecycle ─────────────────────────────────────────────
  ngOnInit(): void {
    this.staffLogin = this.local.getEmployeeDetail();
    this.QueryStepOneId = Number(this.route.snapshot.paramMap.get('id')) || 0;
    this.QuoteId = Number(this.route.snapshot.queryParamMap.get('quoteId')) || 0;
    this.loadAll();
  }

  formatQuotationNo(no: number): string {
    if (!no) return '—';
    return no.toString().padStart(7, '0');
  }
  packageTypesLoaded = false;
  fetchPackageTypesSeparately(): void {
    // Don't do anything if we already have package types
    if (this.packageTypes().length > 0) {
      console.log('Package types already exist, skipping fetch');
      return;
    }

    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    console.log('Fetching package types directly for QueryStepOneId:', this.QueryStepOneId);

    // Use the new getPackageTypesByQuery endpoint
    this.service.getPackageTypesByQuery(enc({ QueryStepOneId: this.QueryStepOneId })).subscribe({
      next: (r: any) => {
        console.log('Direct package types response:', r);
        if (r.Message === ConstantData.SuccessMessage && r.PackageTypes && r.PackageTypes.length > 0) {
          // Found package types - use them
          const packageTypes = r.PackageTypes.map((p: any) => ({
            ...p,
            QuotePackageTypeId: this.toNumberId(p.QuotePackageTypeId),
          }));
          this.packageTypes.set(packageTypes);
          this.activePackageTypeId.set(packageTypes[0].QuotePackageTypeId);
          this.packageTypesLoaded = true;
          console.log('Package types loaded successfully:', this.packageTypes());
        } else {
          // No package types found
          console.log('No package types found for QueryStepOneId:', this.QueryStepOneId);
          this.packageTypesLoaded = true;

          // Only create default for brand new quotes (QuoteId === 0)
          if (this.QuoteId === 0) {
            console.log('New quote - creating default package type');
            this.autoCreateDefaultPackageType();
          } else {
            console.log('Existing quote has no package types - waiting for user to add');
          }
        }
      },
      error: (err) => {
        console.error('Error fetching package types:', err);
        this.packageTypesLoaded = true;
      }
    });
  }

  // ── Load all data ─────────────────────────────────────────
  loadAll(): void {
    this.loading.set(true);
    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    this.service.getQuoteDetail(
      enc({ QueryStepOneId: this.QueryStepOneId, QuoteId: this.QuoteId })
    ).subscribe({
      next: (r: any) => {
        if (r.Message !== ConstantData.SuccessMessage) {
          this.toastr.error(r.Message);
          this.loading.set(false);
          return;
        }

        const destId = r.TripInfo?.DestinationId ?? 0;

        if (r.TripInfo) {
          this.tripInfo.set({
            QueryStepOneId: r.TripInfo.QueryStepOneId,
            QuotationNo: r.TripInfo.QuotationNo,
            DestinationId: r.TripInfo.DestinationId,
            DestinationName: r.TripInfo.DestinationName,
            StartDate: r.TripInfo.StartDate,
            NoOfNights: r.TripInfo.NoOfNights,
            NoOfAdults: r.TripInfo.NoOfAdults,
            ChildrenAges: r.TripInfo.ChildrenAges ?? '[]',
          });
        }

        if (r.Quote) {
          this.QuoteId = r.Quote.QuoteId;
          this.internalNotes = r.Quote.InternalNotes ?? '';
          this.gstPercent = r.Quote.GstPercent ?? 5;
        }


        // ========== FIXED PACKAGE TYPES HANDLING ==========
        // Always fetch package types directly using the dedicated endpoint
        // This ensures we get the correct data regardless of what QuoteDetail returns
        this.fetchPackageTypesSeparately();
        // ========== END PACKAGE TYPES HANDLING ==========

        // First hotel is main, rest are similar
        if (r.Hotels?.length > 0) {
          const allHotels = r.Hotels.map((h: any) => this.mapHotelRow(h));

          if (allHotels.length > 0) {
            // Set first hotel as main
            this.hotelRows.set([allHotels[0]]);

            // Set remaining hotels as similar
            if (allHotels.length > 1) {
              this.similarHotels.set(allHotels.slice(1));
            }
          }
        }

        if (r.Services?.length > 0) {
          this.serviceRows.set(r.Services.map((s: any) => this.mapServiceRow(s)));
          // ✅ Sync selected days from loaded services
          this.syncSelectedDaysFromTransportRows();
        }

        if (destId === 0) {
          this.toastr.warning('Destination not found for this trip');
          this.loading.set(false);
          return;
        }
        forkJoin({
          hotels: this.service.getHotelList(enc({ DestinationId: destId, LocationId: 0, HotelId: 0 })),
          itinerary: this.service.getIteneraryServiceList(enc({ DestinationId: destId, LocationId: 0, IteneraryServiceId: 0 })),
          activities: this.service.getActivityServiceList(enc({ DestinationId: destId, LocationId: 0 })),
          vehicles: this.service.getVehicleTypeList(enc({ DestinationId: destId })),
          locations: this.service.getLocationList(enc({ DestinationId: destId, LocationId: 0 })),
          hotelCategories: this.service.getHotelCategoryList(enc({ HotelCategoryId: 0 })),
          specialInclusionTypes: this.service.getSpecialInclusionTypeList(enc({ SpecialInclusionTypeId: 0 })),
        }).subscribe({
          next: ({ hotels, itinerary, activities, vehicles, locations, hotelCategories, specialInclusionTypes }) => {
            const h = hotels as any;
            const i = itinerary as any;
            const a = activities as any;
            const v = vehicles as any;
            const l = locations as any;
            const hc = hotelCategories as any;
            const sit = specialInclusionTypes as any;
            if (sit.Message === ConstantData.SuccessMessage)
              this.specialInclusionMasterList.set(sit.SpecialInclusionTypeList ?? []);

            if (h.Message === ConstantData.SuccessMessage)
              this.hotelList.set(h.HotelList ?? []);
            else
              this.toastr.warning('No hotels found: ' + h.Message);

            if (i.Message === ConstantData.SuccessMessage)
              this.itineraryList.set(i.IteneraryServiceList ?? []);
            if (a.Message === ConstantData.SuccessMessage)
              this.activityList.set(a.ActivityServiceList ?? []);
            if (v.Message === ConstantData.SuccessMessage)
              this.vehicleTypeList.set(v.VehicleTypeList ?? []);
            if (l.Message === ConstantData.SuccessMessage)
              this.locationList.set(l.LocationList ?? []);
            if (hc.Message === ConstantData.SuccessMessage)
              this.hotelCategoryList.set(hc.HotelCategoryList ?? []);

            this.loading.set(false);
          },
          error: () => {
            this.toastr.error('Error loading master data');
            this.loading.set(false);
          }
        });
      },
      error: (err: any) => {
        this.toastr.error('Error loading quote: ' + err.status);
        this.loading.set(false);
      }
    });
  }
  autoCreateDefaultPackageType(): void {
    // Don't create if we already have package types
    if (this.packageTypes().length > 0) {
      console.log('Package types already exist, skipping auto-create');
      return;
    }

    // Don't create for existing quotes
    if (this.QuoteId > 0) {
      console.log('Existing quote (QuoteId > 0), skipping auto-create');
      return;
    }

    console.log('Creating default package type for new quote');

    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    const payload = {
      QueryStepOneId: this.QueryStepOneId,
      CreatedBy: this.staffLogin.StaffLoginId,
      PackageTypes: [{ QuotePackageTypeId: 0, PackageTypeName: 'Deluxe Package' }],
    };

    this.service.savePackageTypes(enc(payload)).subscribe({
      next: (r: any) => {
        console.log('Save package types response:', r);
        if (r.Message === ConstantData.SuccessMessage) {
          const saved: PackageTypeRow[] = (r.PackageTypes ?? []).map((p: any) => ({
            QuotePackageTypeId: this.toNumberId(p.QuotePackageTypeId),
            PackageTypeName: p.PackageTypeName,
          }));
          this.packageTypes.set(saved);
          if (saved.length > 0) {
            this.activePackageTypeId.set(saved[0].QuotePackageTypeId);
          }
          this.packageTypesLoaded = true;
          this.toastr.success('Default package type created');
        } else {
          this.toastr.error(r.Message);
        }
      },
      error: (err) => {
        console.error('Error creating default package type:', err);
        this.toastr.error('Error creating default package type');
      }
    });
  }
  // ── Map rows ──────────────────────────────────────────────
  private mapHotelRow(h: any): QuoteHotelRow {
    return {
      QuoteHotelId: h.QuoteHotelId, QuoteId: h.QuoteId,
      QuotePackageTypeId: this.toNumberId(h.QuotePackageTypeId),
      NightNumber: h.NightNumber, StayDate: new Date(h.StayDate),
      NightNumbers: [h.NightNumber],
      HotelId: h.HotelId, HotelName: h.HotelName ?? '',
      LocationName: h.LocationName ?? '',
      HotelCategoryName: h.HotelCategoryName ?? '',
      RoomTypeId: h.RoomTypeId, RoomTypeName: h.RoomTypeName ?? '',
      MealPlan: h.MealPlan ?? 'MAP',
      NoOfRooms: h.NoOfRooms ?? 1, PaxPerRoom: h.PaxPerRoom ?? 2,
      AWEB: h.AWEB ?? 0, CWEB: h.CWEB ?? 0, CNB: h.CNB ?? 0,
      CostPrice: h.CostPrice ?? 0, SellingPrice: h.SellingPrice ?? 0,
      BaseRate: 0, AwebRate: 0, CwebRate: 0, CnbRate: 0,
      TotalPrice: h.SellingPrice ?? 0,
      RoomTypes: [], IsSaving: false, SpecialInclusions: [], HotelSearch: h.HotelName ?? '',
      FilteredHotels: [],
      ShowDropdown: false,
      ShowNightDropdown: false,
      SelectedNightsDisplay: `Night ${h.NightNumber}`,
    };
  }

  private mapServiceRow(s: any): QuoteServiceRow {
    return {
      QuoteServiceId: s.QuoteServiceId,
      QuoteId: s.QuoteId,
      QuotePackageTypeId: this.toNumberId(s.QuotePackageTypeId),
      DayNumber: s.DayNumber,
      ServiceDate: new Date(s.ServiceDate),
      ServiceType: s.ServiceType,
      IteneraryServiceId: s.IteneraryServiceId ?? 0,
      IteneraryServiceName: s.IteneraryServiceName ?? '',
      VehicleTypeId: s.VehicleTypeId ?? 0,
      VehicleTypeName: s.VehicleTypeName ?? '',
      SameCabForAll: s.SameCabForAll ?? false,
      ActivityServiceId: s.ActivityServiceId ?? 0,
      ActivityServiceName: s.ActivityServiceName ?? '',
      Qty: s.Qty ?? 1,
      CostPrice: s.CostPrice ?? 0,
      SellingPrice: s.SellingPrice ?? 0,
      Notes: s.Notes ?? '',
      IsSaving: false,
      LocationId: s.LocationId ?? 0,
      LocationName: s.LocationName ?? '',
      VehicleTypeSearch: s.VehicleTypeName ?? '',
      FilteredVehicles: [],
      ShowVehicleDropdown: false,
      TotalPrice: 0,  // ← ADD THIS
    };
  }


  private mapServiceToTransportRow(s: QuoteServiceRow): QuoteTransportRow {
    const slot = this.daySlots().find(d => d.DayNumber === s.DayNumber);
    return {
      QuoteServiceId: s.QuoteServiceId,
      QuoteId: s.QuoteId,
      QuotePackageTypeId: s.QuotePackageTypeId,
      DayNumbers: [s.DayNumber],
      DayNumber: s.DayNumber,
      ServiceDate: s.ServiceDate,
      LocationId: s.LocationId,
      LocationName: s.LocationName,
      IteneraryServiceId: s.IteneraryServiceId,
      IteneraryServiceName: s.IteneraryServiceName,
      VehicleTypeId: s.VehicleTypeId,
      VehicleTypeName: s.VehicleTypeName,
      SameCabForAll: s.SameCabForAll,
      Qty: s.Qty,
      CostPrice: s.CostPrice,
      SellingPrice: s.SellingPrice,
      TotalPrice: s.TotalPrice,
      Notes: s.Notes,
      IsSaving: false,
      LocationSearch: s.LocationName,
      FilteredLocations: [],
      ShowLocationDropdown: false,
      ServiceSearch: s.IteneraryServiceName,
      FilteredServices: [],
      ShowServiceDropdown: false,
      VehicleSearch: s.VehicleTypeName,
      FilteredVehicles: [],
      ShowVehicleDropdown: false,
      ShowDayDropdown: false,
      SelectedDaysDisplay: `Day ${s.DayNumber}`,
    };
  }

  // ── Package Types Modal ───────────────────────────────────
  openPkgModal(): void {
    this.pkgModalRows = this.packageTypes().length > 0
      ? this.packageTypes().map(p => ({ ...p }))
      : [{ QuotePackageTypeId: 0, PackageTypeName: '' }];
    this.showPkgModal = true;
  }

  closePkgModal(): void { this.showPkgModal = false; }
  addPkgRow(): void { this.pkgModalRows.push({ QuotePackageTypeId: 0, PackageTypeName: '' }); }
  removePkgRow(i: number): void { this.pkgModalRows.splice(i, 1); }

  savePkgTypes(): void {
    const invalid = this.pkgModalRows.find(p => !p.PackageTypeName?.trim());
    if (invalid) { this.toastr.error('Package name cannot be empty'); return; }

    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    const payload = {
      QueryStepOneId: this.QueryStepOneId,
      CreatedBy: this.staffLogin.StaffLoginId,
      PackageTypes: this.pkgModalRows.map(p => ({
        QuotePackageTypeId: p.QuotePackageTypeId,
        PackageTypeName: p.PackageTypeName,
      })),
    };

    this.loading.set(true);
    this.service.savePackageTypes(enc(payload)).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          const savedPkgTypes: PackageTypeRow[] = (r.PackageTypes ?? []).map((p: any) => ({
            QuotePackageTypeId: this.toNumberId(p.QuotePackageTypeId),
            PackageTypeName: p.PackageTypeName,
          }));

          this.packageTypes.set(savedPkgTypes);

          if (savedPkgTypes.length > 0) {
            if (this.activePackageTypeId() === 0) {
              this.activePackageTypeId.set(savedPkgTypes[0].QuotePackageTypeId);
            } else {
              const stillExists = savedPkgTypes.find(
                p => p.QuotePackageTypeId === this.activePackageTypeId()
              );
              if (!stillExists)
                this.activePackageTypeId.set(savedPkgTypes[0].QuotePackageTypeId);
            }
          }

          this.closePkgModal();
          this.toastr.success('Package types saved');
        } else {
          this.toastr.error(r.Message);
        }
        this.loading.set(false);
      },
      error: () => {
        this.toastr.error('Error saving package types');
        this.loading.set(false);
      }
    });
  }

  // ── Hotel rows ────────────────────────────────────────────
  getHotelRowsForNight(nightNumber: number): QuoteHotelRow[] {
    return this.hotelRows().filter(
      r => (r.NightNumbers?.includes(nightNumber) ?? r.NightNumber === nightNumber)
        && r.QuotePackageTypeId === this.activePackageTypeId()
    );
  }

  getActiveHotelRows(): QuoteHotelRow[] {
    // Return ONLY main hotels (not similar hotels)
    return this.hotelRows().filter(
      r => r.QuotePackageTypeId === this.activePackageTypeId()
    );
  }

  getActiveSpecialInclusionRows(): QuoteSpecialInclusionRow[] {
    return this.specialInclusionRows().filter(
      r => r.QuotePackageTypeId === this.activePackageTypeId()
    );
  }

  addHotelRow(slot?: NightSlot): void {
    const selectedSlot = slot ?? this.nightSlots()[0];
    if (!selectedSlot) {
      this.toastr.error('No nights available for this trip');
      return;
    }

    this.markDirty();
    this.hotelRows.update(rows => [...rows, {
      QuoteHotelId: 0, QuoteId: this.QuoteId,
      QuotePackageTypeId: this.activePackageTypeId(),
      NightNumber: selectedSlot.NightNumber, StayDate: selectedSlot.StayDate,
      NightNumbers: [selectedSlot.NightNumber],
      HotelId: 0, HotelName: '', LocationName: '', HotelCategoryName: '',
      RoomTypeId: 0, RoomTypeName: '', MealPlan: 'MAP',
      NoOfRooms: 1, PaxPerRoom: 2, AWEB: 0, CWEB: 0, CNB: 0,
      CostPrice: 0, SellingPrice: 0, BaseRate: 0, AwebRate: 0, CwebRate: 0, CnbRate: 0,
      TotalPrice: 0, RoomTypes: [], IsSaving: false, SpecialInclusions: [], HotelSearch: '',
      FilteredHotels: [],
      ShowDropdown: false,
      ShowNightDropdown: false,
      SelectedNightsDisplay: `Night ${selectedSlot.NightNumber}`,
    }]);
  }

  onHotelNightToggle(row: QuoteHotelRow, nightNumber: number): void {
    const index = row.NightNumbers.indexOf(nightNumber);
    if (index > -1) {
      row.NightNumbers.splice(index, 1);
    } else {
      row.NightNumbers.push(nightNumber);
      row.NightNumbers.sort((a, b) => a - b);
    }

    if (row.NightNumbers.length > 0) {
      const firstNight = row.NightNumbers[0];
      const slot = this.nightSlots().find(n => n.NightNumber === firstNight);
      row.NightNumber = firstNight;
      if (slot) row.StayDate = slot.StayDate;
    }

    this.updateHotelNightsDisplay(row);
    this.hotelRows.update(rows => [...rows]);
    if (row.HotelId > 0 && row.RoomTypeId > 0) {
      this.lookupHotelRate(row);
    }
    this.markDirty();
  }

  updateHotelNightsDisplay(row: QuoteHotelRow): void {
    if (row.NightNumbers.length === 0) {
      row.SelectedNightsDisplay = '';
    } else if (row.NightNumbers.length === 1) {
      row.SelectedNightsDisplay = `Night ${row.NightNumbers[0]}`;
    } else {
      row.SelectedNightsDisplay = `${row.NightNumbers.length} nights selected`;
    }
  }

  toggleHotelNightDropdown(row: QuoteHotelRow): void {
    row.ShowNightDropdown = !row.ShowNightDropdown;
    this.hotelRows.update(rows => [...rows]);
  }

  closeHotelNightDropdown(row: QuoteHotelRow): void {
    row.ShowNightDropdown = false;
    this.hotelRows.update(rows => [...rows]);
  }

  onHotelSearch(row: QuoteHotelRow): void {
    const query = (row.HotelSearch ?? '').toLowerCase().trim();

    // If empty → show first 4 hotels
    if (!query) {
      row.FilteredHotels = this.hotelList().slice(0, 4);
      row.ShowDropdown = true;
      this.hotelRows.update(rows => [...rows]);
      return;
    }

    // Search results
    row.FilteredHotels = this.hotelList()
      .filter(h =>
        h.HotelName.toLowerCase().includes(query) ||
        h.LocationName?.toLowerCase().includes(query)
      )
      .slice(0, 4);

    row.ShowDropdown = true;
    this.hotelRows.update(rows => [...rows]);
  }

  selectHotel(row: QuoteHotelRow, hotel: any): void {
    this.clearHotel(row);
    row.HotelId = hotel.HotelId;
    row.HotelName = hotel.HotelName;
    row.HotelSearch = hotel.HotelName;
    row.LocationName = hotel.LocationName;
    row.HotelCategoryName = hotel.HotelCategoryName;
    row.ShowDropdown = false;
    row.FilteredHotels = [];
    this.hotelRows.update(rows => [...rows]);
    this.markDirty();
    this.onHotelSelected(row);
  }

  onHotelBlur(row: QuoteHotelRow): void {
    // Delay to allow mousedown on dropdown item to fire first
    setTimeout(() => {
      row.ShowDropdown = false;
      // If user typed something but didn't select, reset to last valid hotel
      if (row.HotelId > 0) {
        row.HotelSearch = row.HotelName;
      } else {
        row.HotelSearch = '';
      }
      this.hotelRows.update(rows => [...rows]);
    }, 200);
  }
  onHotelSelected(row: QuoteHotelRow): void {
    this.markDirty();
    let hotel = this.hotelList().find(h => h.HotelId === row.HotelId);

    if (hotel) {
      row.HotelName = hotel.HotelName;
      row.LocationName = hotel.LocationName;
      row.HotelCategoryName = hotel.HotelCategoryName;
    }

    if (row.HotelId > 0) {
      const enc = (d: object): RequestModel => ({
        request: this.local.encrypt(JSON.stringify(d)).toString()
      });
      this.service.getRoomTypeList(enc({ HotelId: row.HotelId })).subscribe({
        next: (r: any) => {
          if (r.Message === ConstantData.SuccessMessage) {

            row.RoomTypes = r.RoomTypeList ?? [];

            // No room type found
            if (row.RoomTypes.length === 0) {
              this.toastr.warning(
                `No room types configured for ${row.HotelName}`
              );
            }

            row.RoomTypeId =
              row.RoomTypes.length > 0
                ? row.RoomTypes[0].RoomTypeId
                : 0;

            this.hotelRows.update(rows => [...rows]);

            // Only lookup price if room type exists
            if (row.RoomTypeId > 0) {
              this.lookupHotelRate(row);
            }
          } else {
            this.toastr.error('Failed to load room types: ' + r.Message);
          }
        },
        error: () => this.toastr.error('Error loading room types')
      });
      // Add to onHotelSelected after getRoomTypeList success
      this.service.getSpecialInclusionList(enc({ HotelId: row.HotelId }))
        .subscribe({
          next: (r: any) => {
            if (r.Message === ConstantData.SuccessMessage) {
              row.SpecialInclusions = r.SpecialInclusionList ?? [];  // ← correct key
              this.hotelRows.update(rows => [...rows]);
            }
          }
        });
    }
  }
  getSpecialInclusionRowsForNight(nightNumber: number): QuoteSpecialInclusionRow[] {
    return this.specialInclusionRows().filter(
      r => r.QuotePackageTypeId === this.activePackageTypeId()
        && r.NightNumbers.includes(nightNumber)
    );
  }

  // Get all hotels for a night to populate hotel dropdown in special inclusions
  getHotelsForNight(nightNumber: number): QuoteHotelRow[] {
    return this.hotelRows().filter(
      r => r.NightNumber === nightNumber
        && r.QuotePackageTypeId === this.activePackageTypeId()
        && r.HotelId > 0
    );
  }

  clearHotel(row: QuoteHotelRow): void {
    row.HotelSearch = '';
    row.HotelId = 0;
    row.HotelName = '';
    row.LocationName = '';
    row.HotelCategoryName = '';
    row.RoomTypeId = 0;
    row.RoomTypes = [];
    row.FilteredHotels = [];
    row.AWEB = 0;
    row.NoOfRooms = 1;
    row.ShowDropdown = false;

    // RESET ALL PRICE FIELDS when clearing
    row.BaseRate = 0;
    row.AwebRate = 0;
    row.CwebRate = 0;
    row.CnbRate = 0;
    row.CostPrice = 0;
    row.SellingPrice = 0;
    row.TotalPrice = 0;


    this.hotelRows.update(rows => [...rows]);
    this.markDirty();
  }
  addNewHotel(row: QuoteHotelRow): void {
    this.pendingHotelRow = row;
    this.newHotel = { HotelName: row.HotelSearch, LocationId: 0, HotelCategoryId: 0 };
    this.newRoomTypes = [{ RoomTypeName: '' }];
    this.showNewHotelModal = true;
  }

  closeNewHotelModal(): void {
    this.showNewHotelModal = false;
    this.pendingHotelRow = null;
    this.newHotel = { HotelName: '', LocationId: 0, HotelCategoryId: 0 };
    this.newRoomTypes = [{ RoomTypeName: '' }];

    // Reset search fields
    this.locationSearchText = '';
    this.categorySearchText = '';
    this.filteredLocations = [];
    this.filteredCategories = [];
    this.showLocationDropdown = false;
    this.showCategoryDropdown = false;
  }

  addNewRoomTypeRow(): void {
    this.newRoomTypes.push({ RoomTypeName: '' });
  }

  removeNewRoomTypeRow(i: number): void {
    this.newRoomTypes.splice(i, 1);
  }

  onNewHotelLocationChange(): void {
    // optional: filter anything by location if needed
  }

  saveNewHotel(): void {
    if (!this.newHotel.HotelName?.trim()) {
      this.toastr.error('Hotel name is required'); return;
    }
    if (!this.newHotel.LocationId) {
      this.toastr.error('Location is required'); return;
    }
    if (!this.newHotel.HotelCategoryId) {
      this.toastr.error('Hotel category is required'); return;
    }
    if (this.newRoomTypes.length === 0) {
      this.toastr.error('Add at least one room type'); return;
    }
    const invalidRt = this.newRoomTypes.find(rt => !rt.RoomTypeName?.trim());
    if (invalidRt) {
      this.toastr.error('Room type name cannot be empty'); return;
    }

    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    this.newHotelSaving = true;

    const trip = this.tripInfo();
    this.service.saveNewHotel(enc({
      HotelId: 0,
      HotelName: this.newHotel.HotelName.trim(),
      DestinationId: trip?.DestinationId ?? 0,
      LocationId: this.newHotel.LocationId,
      HotelCategoryId: this.newHotel.HotelCategoryId,
      Status: 1,
      CreatedBy: this.staffLogin.StaffLoginId,
      RoomTypes: this.newRoomTypes.map(rt => ({ RoomTypeName: rt.RoomTypeName.trim() })),
    })).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          const newHotelId = r.HotelId;

          // Add to hotelList signal so it appears in search
          const location = this.locationList().find(l => l.LocationId === this.newHotel.LocationId);
          const category = this.hotelCategoryList().find(c => c.HotelCategoryId === this.newHotel.HotelCategoryId);

          const newHotelEntry = {
            HotelId: newHotelId,
            HotelName: this.newHotel.HotelName.trim(),
            LocationId: this.newHotel.LocationId,
            LocationName: location?.LocationName ?? '',
            HotelCategoryId: this.newHotel.HotelCategoryId,
            HotelCategoryName: category?.HotelCategoryName ?? '',
          };

          this.hotelList.update(list => [...list, newHotelEntry]);

          // Auto-select in the row that triggered add
          if (this.pendingHotelRow) {
            this.selectHotel(this.pendingHotelRow, newHotelEntry);
          }

          this.toastr.success('Hotel saved successfully');
          this.closeNewHotelModal();
        } else {
          this.toastr.error(r.Message);
        }
        this.newHotelSaving = false;
      },
      error: () => {
        this.toastr.error('Error saving hotel');
        this.newHotelSaving = false;
      }
    });
  }



  // Similar Hotels Modal
  showSimilarHotelsModal = false;
  similarHotelSourceRow: QuoteHotelRow | null = null;
  similarHotelRows: QuoteHotelRow[] = [];
  // Add this with your other signals
  similarHotels = signal<QuoteHotelRow[]>([]);


  getNextUnselectedNight(): number | null {
    const allNights = this.nightSlots().map(n => n.NightNumber);
    const usedNights = new Set(
      this.getActiveHotelRows().flatMap(r => r.NightNumbers)
    );
    return allNights.find(n => !usedNights.has(n)) ?? null;
  }

  addHotelRowForNextNight(): void {
    const nextNight = this.getNextUnselectedNight();
    if (nextNight === null) return;
    const slot = this.nightSlots().find(n => n.NightNumber === nextNight);
    if (slot) this.addHotelRow(slot);
  }

  openSimilarHotelsModal(): void {
    const mainHotels = this.getActiveHotelRows();
    if (mainHotels.length === 0) {
      this.toastr.warning('No main hotels found. Please add a hotel first.');
      return;
    }

    // First hotel is the source/reference
    this.similarHotelSourceRow = mainHotels[0];

    // Load existing similar hotels
    const existingSimilar = this.similarHotels();

    if (existingSimilar.length === 0) {
      // Create one empty row as template
      this.similarHotelRows = [{
        ...this.createEmptyHotelRow(),
        MealPlan: mainHotels[0].MealPlan,
        NightNumbers: [...mainHotels[0].NightNumbers],
        SelectedNightsDisplay: mainHotels[0].SelectedNightsDisplay,
        NoOfRooms: mainHotels[0].NoOfRooms,
        PaxPerRoom: mainHotels[0].PaxPerRoom,
        AWEB: mainHotels[0].AWEB,
        CWEB: mainHotels[0].CWEB,
        CNB: mainHotels[0].CNB,
      }];
    } else {
      // Load existing similar hotels
      this.similarHotelRows = existingSimilar.map(row => ({
        ...this.createEmptyHotelRow(),
        QuoteHotelId: row.QuoteHotelId,
        HotelId: row.HotelId,
        HotelName: row.HotelName,
        HotelSearch: row.HotelName,
        LocationName: row.LocationName,
        HotelCategoryName: row.HotelCategoryName,
        RoomTypeId: row.RoomTypeId,
        RoomTypeName: row.RoomTypeName,
        MealPlan: row.MealPlan,
        NightNumbers: [...row.NightNumbers],
        NightNumber: row.NightNumber,
        StayDate: row.StayDate,
        SelectedNightsDisplay: row.SelectedNightsDisplay,
        NoOfRooms: row.NoOfRooms,
        PaxPerRoom: row.PaxPerRoom,
        AWEB: row.AWEB,
        CWEB: row.CWEB,
        CNB: row.CNB,
        BaseRate: row.BaseRate,
        AwebRate: row.AwebRate,
        CwebRate: row.CwebRate,
        CnbRate: row.CnbRate,
        CostPrice: row.CostPrice,
        SellingPrice: row.SellingPrice,
        TotalPrice: row.TotalPrice,
        RoomTypes: [...row.RoomTypes],
        IsSaving: false,
        SpecialInclusions: [],
        FilteredHotels: [],
        ShowDropdown: false,
        ShowNightDropdown: false,
      }));
    }

    this.showSimilarHotelsModal = true;
  }

  closeSimilarHotelsModal(): void {
    this.showSimilarHotelsModal = false;
    this.similarHotelSourceRow = null;
    this.similarHotelRows = [];
  }

  private createEmptyHotelRow(): QuoteHotelRow {
    const slot = this.nightSlots()[0];
    return {
      QuoteHotelId: 0, QuoteId: this.QuoteId,
      QuotePackageTypeId: this.activePackageTypeId(),
      NightNumber: slot?.NightNumber ?? 1,
      NightNumbers: [slot?.NightNumber ?? 1],
      StayDate: slot?.StayDate ?? new Date(),
      HotelId: 0, HotelName: '', LocationName: '', HotelCategoryName: '',
      RoomTypeId: 0, RoomTypeName: '', MealPlan: 'MAP',
      NoOfRooms: 1, PaxPerRoom: 2, AWEB: 0, CWEB: 0, CNB: 0,
      CostPrice: 0, SellingPrice: 0, BaseRate: 0, AwebRate: 0, CwebRate: 0, CnbRate: 0,
      TotalPrice: 0, RoomTypes: [], IsSaving: false, SpecialInclusions: [],
      HotelSearch: '', FilteredHotels: [], ShowDropdown: false,
      ShowNightDropdown: false, SelectedNightsDisplay: '',
    };
  }

  addSimilarHotelRow(): void {
    const src = this.similarHotelSourceRow!;
    this.similarHotelRows.push({
      ...this.createEmptyHotelRow(),
      MealPlan: src.MealPlan,
      NightNumbers: [...src.NightNumbers],
      NightNumber: src.NightNumber,
      StayDate: src.StayDate,
      SelectedNightsDisplay: src.SelectedNightsDisplay,
      NoOfRooms: src.NoOfRooms,
      PaxPerRoom: src.PaxPerRoom,
      AWEB: src.AWEB, CWEB: src.CWEB, CNB: src.CNB,
    });
  }

  // Remove from modal by index
  removeSimilarHotelRow(i: number): void {
    this.similarHotelRows.splice(i, 1);
    this.similarHotelRows = [...this.similarHotelRows];
    this.markDirty();
  }

  // Remove from summary list by row object
  removeSimilarHotel(row: QuoteHotelRow): void {
    if (confirm(`Remove ${row.HotelName} from similar hotels?`)) {
      if (row.QuoteHotelId > 0) {
        const enc = (d: object): RequestModel => ({
          request: this.local.encrypt(JSON.stringify(d)).toString()
        });
        this.service.deleteQuoteHotel(enc({ QuoteHotelId: row.QuoteHotelId }))
          .subscribe({
            next: () => {
              this.similarHotels.update(hotels => hotels.filter(h => h.QuoteHotelId !== row.QuoteHotelId));
              this.toastr.success('Similar hotel removed');
              this.markDirty();
            },
            error: () => this.toastr.error('Error removing hotel')
          });
      } else {
        this.similarHotels.update(hotels => hotels.filter(h => h !== row));
        this.markDirty();
      }
    }
  }

  onSimilarHotelSearch(row: QuoteHotelRow): void {
    const query = (row.HotelSearch ?? '').toLowerCase().trim();
    row.FilteredHotels = !query
      ? this.hotelList().slice(0, 4)
      : this.hotelList()
        .filter(h => h.HotelName.toLowerCase().includes(query) ||
          h.LocationName?.toLowerCase().includes(query))
        .slice(0, 4);
    row.ShowDropdown = true;
    this.similarHotelRows = [...this.similarHotelRows];
  }

  selectSimilarHotel(row: QuoteHotelRow, hotel: any): void {

    row.HotelId = hotel.HotelId;
    row.HotelName = hotel.HotelName;
    row.HotelSearch = hotel.HotelName;
    row.LocationName = hotel.LocationName;
    row.HotelCategoryName = hotel.HotelCategoryName;

    row.ShowDropdown = false;
    row.FilteredHotels = [];

    // Force UI refresh
    this.similarHotelRows = [...this.similarHotelRows];

    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    this.service.getRoomTypeList(enc({ HotelId: hotel.HotelId }))
      .subscribe({
        next: (r: any) => {
          if (r.Message === ConstantData.SuccessMessage) {

            row.RoomTypes = r.RoomTypeList ?? [];
            row.RoomTypeId = row.RoomTypes[0]?.RoomTypeId ?? 0;

            // Force refresh again
            this.similarHotelRows = [...this.similarHotelRows];

            if (row.RoomTypeId > 0) {
              this.lookupHotelRate(row);
            }
          }
        }
      });
  }

  onSimilarHotelBlur(row: QuoteHotelRow): void {
    setTimeout(() => {
      row.ShowDropdown = false;
      if (!row.HotelId) row.HotelSearch = '';
    }, 200);
  }

  clearSimilarHotel(row: QuoteHotelRow): void {
    row.HotelSearch = ''; row.HotelId = 0; row.HotelName = '';
    row.RoomTypes = []; row.RoomTypeId = 0;
    row.BaseRate = 0; row.FilteredHotels = []; row.ShowDropdown = false;
    this.similarHotelRows = [...this.similarHotelRows];
  }

  saveSimilarHotels(): void {
    // Filter out rows that have valid hotel and room type selected
    const valid = this.similarHotelRows.filter(r => r.HotelId > 0 && r.RoomTypeId > 0);

    if (valid.length === 0) {
      this.toastr.error('Please add at least one valid hotel with room type selected');
      return;
    }

    // Save each similar hotel to database and collect them
    const savedSimilarHotels: QuoteHotelRow[] = [];

    valid.forEach((modalRow) => {
      if (modalRow.QuoteHotelId > 0) {
        // Update existing similar hotel
        this.saveHotelRow(modalRow);
        savedSimilarHotels.push(modalRow);
      } else {
        // Create new similar hotel
        const newRow: QuoteHotelRow = {
          ...this.createEmptyHotelRow(),
          QuoteHotelId: 0,
          QuoteId: this.QuoteId,
          QuotePackageTypeId: this.activePackageTypeId(),
          HotelId: modalRow.HotelId,
          HotelName: modalRow.HotelName,
          LocationName: modalRow.LocationName,
          HotelCategoryName: modalRow.HotelCategoryName,
          RoomTypeId: modalRow.RoomTypeId,
          RoomTypeName: modalRow.RoomTypeName,
          MealPlan: modalRow.MealPlan,
          NightNumbers: [...modalRow.NightNumbers],
          NightNumber: modalRow.NightNumbers[0],
          StayDate: this.nightSlots()[modalRow.NightNumbers[0] - 1]?.StayDate || new Date(),
          SelectedNightsDisplay: modalRow.SelectedNightsDisplay,
          NoOfRooms: modalRow.NoOfRooms,
          PaxPerRoom: modalRow.PaxPerRoom,
          AWEB: modalRow.AWEB,
          CWEB: modalRow.CWEB,
          CNB: modalRow.CNB,
          BaseRate: modalRow.BaseRate,
          AwebRate: modalRow.AwebRate,
          CwebRate: modalRow.CwebRate,
          CnbRate: modalRow.CnbRate,
          CostPrice: modalRow.CostPrice,
          SellingPrice: modalRow.SellingPrice,
          TotalPrice: modalRow.TotalPrice,
          RoomTypes: [...modalRow.RoomTypes],
          IsSaving: false,
          SpecialInclusions: [],
          FilteredHotels: [],
          ShowDropdown: false,
          ShowNightDropdown: false,
          HotelSearch: modalRow.HotelName,
        };
        this.saveHotelRow(newRow);
        savedSimilarHotels.push(newRow);
      }
    });

    // Update the similar hotels signal
    this.similarHotels.set(savedSimilarHotels);

    this.markDirty();
    this.closeSimilarHotelsModal();
    this.toastr.success(`${savedSimilarHotels.length} similar hotel(s) saved successfully`);
  }

  hasSelectedNight(): boolean {
    return this.getActiveHotelRows()
      .some(r => r.NightNumbers && r.NightNumbers.length > 0);
  }
  getSimilarHotelRows(): QuoteHotelRow[] {
    // Simply return the similar hotels signal
    return this.similarHotels();
  }



  // Add these with your other properties

  // Location autocomplete
  locationSearchText = '';
  filteredLocations: any[] = [];
  showLocationDropdown = false;

  // Category autocomplete
  categorySearchText = '';
  filteredCategories: any[] = [];
  showCategoryDropdown = false;
  // ── Location Search Methods ─────────────────────────────────
  onLocationSearch(): void {
    const query = (this.locationSearchText ?? '').toLowerCase().trim();

    if (!query) {
      // Show first 5 locations when empty
      this.filteredLocations = this.locationList().slice(0, 5);
    } else {
      // Filter locations
      this.filteredLocations = this.locationList()
        .filter(l => l.LocationName.toLowerCase().includes(query))
        .slice(0, 5);
    }

    this.showLocationDropdown = true;
  }



  onLocationBlur(): void {
    this.showLocationDropdown = false;
    if (this.newHotel.LocationId === 0) {
      this.locationSearchText = '';
    }
  }

  clearLocation(): void {
    this.locationSearchText = '';
    this.newHotel.LocationId = 0;
    this.filteredLocations = [];
    this.showLocationDropdown = false;
  }

  // ── Category Search Methods ─────────────────────────────────
  onCategorySearch(): void {
    const query = (this.categorySearchText ?? '').toLowerCase().trim();

    if (!query) {
      // Show first 5 categories when empty
      this.filteredCategories = this.hotelCategoryList().slice(0, 5);
    } else {
      // Filter categories
      this.filteredCategories = this.hotelCategoryList()
        .filter(c => c.HotelCategoryName.toLowerCase().includes(query))
        .slice(0, 5);
    }

    this.showCategoryDropdown = true;
  }

  selectCategory(category: any): void {
    this.newHotel.HotelCategoryId = category.HotelCategoryId;
    this.categorySearchText = category.HotelCategoryName;
    this.showCategoryDropdown = false;
    this.filteredCategories = [];
  }

  onCategoryBlur(): void {
    setTimeout(() => {
      this.showCategoryDropdown = false;
      // If no category selected but text exists, clear it
      if (this.newHotel.HotelCategoryId === 0 && this.categorySearchText) {
        this.categorySearchText = '';
      }
    }, 200);
  }



  addSpecialInclusionRow(): void {
    this.markDirty();
    this.specialInclusionRows.update(rows => [...rows, {
      QuoteSpecialInclusionId: 0,
      QuoteId: this.QuoteId,
      QuoteHotelId: 0,
      HotelId: 0,
      NightNumbers: [],
      SpecialInclusionId: 0,
      SpecialInclusionName: '',
      HotelName: '',
      TotalPrice: 0,
      Comments: '',
      AvailableServices: this.specialInclusionMasterList(),
      IsSaving: false,
      ServiceSearch: '',
      FilteredServices: [],
      ShowServiceDropdown: false,
      HotelSearch: '',  // Empty so user sees placeholder
      FilteredHotels: this.getDestinationHotels().slice(0, 6), // Show some hotels in dropdown
      ShowHotelDropdown: false,  // Keep dropdown closed initially
      ManualLocationName: '',
      UseManualLocation: false,
      ShowNightDropdown: false,
      SelectedNightsDisplay: '',
      QuotePackageTypeId: this.activePackageTypeId(), // ← ADD THIS
    }]);
  }



  onSpecialInclusionHotelChange(row: QuoteSpecialInclusionRow, hotel: any): void {
    if (!hotel) return;
    row.HotelId = hotel.HotelId;
    row.QuoteHotelId = 0;
    row.HotelName = hotel.HotelName;
    // Keep master list — don't restrict to hotel's inclusions
    row.AvailableServices = this.specialInclusionMasterList();
    row.SpecialInclusionId = 0;
    row.ServiceSearch = '';
    row.TotalPrice = 0;
    this.loadSpecialInclusionsForHotel(row.HotelId);
    this.specialInclusionRows.update(rows => [...rows]);
    this.markDirty();
  }

  onSpecialInclusionServiceChange(row: QuoteSpecialInclusionRow): void {
    const svc = row.AvailableServices.find(
      s => Number(s.SpecialInclusionId) === Number(row.SpecialInclusionId)
    );

    if (svc) {
      row.SpecialInclusionName = svc.SpecialInclusionTypeName ?? svc.SpecialInclusionName ?? '';
      row.TotalPrice = Number(svc.Rate ?? svc.ApRate ?? 0);
    } else {
      row.TotalPrice = 0;
    }
    this.specialInclusionRows.update(rows => [...rows]);
    this.markDirty();
  }

  //special inclusion serach
  onServiceSearch(row: QuoteSpecialInclusionRow): void {
    const query = (row.ServiceSearch ?? '').toLowerCase().trim();
    const source = this.specialInclusionMasterList(); // ← always master list

    if (!query) {
      row.FilteredServices = source.slice(0, 6);
      row.ShowServiceDropdown = true;
      this.specialInclusionRows.update(rows => [...rows]);
      return;
    }

    row.FilteredServices = source
      .filter(s => s.SpecialInclusionTypeName.toLowerCase().includes(query))
      .slice(0, 6);

    row.ShowServiceDropdown = true;
    this.specialInclusionRows.update(rows => [...rows]);
  }
  selectService(row: QuoteSpecialInclusionRow, svc: any): void {
    row.SpecialInclusionId = svc.SpecialInclusionTypeId; // ← type ID now
    row.SpecialInclusionName = svc.SpecialInclusionTypeName;
    row.ServiceSearch = svc.SpecialInclusionTypeName;
    row.ShowServiceDropdown = false;
    row.FilteredServices = [];

    row.TotalPrice = this.getHotelRateForService(row, svc);

    this.specialInclusionRows.update(rows => [...rows]);
    this.markDirty();
  }
  onServiceBlur(row: QuoteSpecialInclusionRow): void {
    setTimeout(() => {
      row.ShowServiceDropdown = false;
      if (row.SpecialInclusionId > 0) {
        row.ServiceSearch = row.SpecialInclusionName;
      } else {
        row.ServiceSearch = '';
      }
      this.specialInclusionRows.update(rows => [...rows]);
    }, 200);
  }
  clearService(row: QuoteSpecialInclusionRow): void {
    row.ServiceSearch = '';
    row.SpecialInclusionId = 0;
    row.SpecialInclusionName = '';
    row.TotalPrice = 0;
    row.FilteredServices = [];
    row.ShowServiceDropdown = false;

    this.specialInclusionRows.update(rows => [...rows]);
    this.markDirty();
  }

  // Hotel search methods for Special Inclusions
  onSpecialInclusionHotelSearch(row: QuoteSpecialInclusionRow): void {
    const query = (row.HotelSearch ?? '').toLowerCase().trim();
    const hotels = this.getDestinationHotels();

    if (!query) {
      row.FilteredHotels = hotels.slice(0, 6);
      row.ShowHotelDropdown = true;
      this.specialInclusionRows.update(rows => [...rows]);
      return;
    }

    row.FilteredHotels = hotels
      .filter(h => h.HotelName.toLowerCase().includes(query))
      .slice(0, 6);

    row.ShowHotelDropdown = true;
    this.specialInclusionRows.update(rows => [...rows]);
  }

  selectSpecialInclusionHotel(row: QuoteSpecialInclusionRow, hotel: any): void {
    row.HotelId = hotel.HotelId;
    row.HotelName = hotel.HotelName;
    row.HotelSearch = hotel.HotelName;
    row.ShowHotelDropdown = false;
    row.FilteredHotels = [];
    row.QuoteHotelId = 0;
    row.AvailableServices = this.specialInclusionMasterList();
    row.SpecialInclusionId = 0;
    row.ServiceSearch = '';

    this.loadSpecialInclusionsForHotel(row.HotelId);
    this.specialInclusionRows.update(rows => [...rows]);
    this.markDirty();
  }

  onSpecialInclusionHotelBlur(row: QuoteSpecialInclusionRow): void {
    setTimeout(() => {
      row.ShowHotelDropdown = false;
      if (row.HotelId > 0) {
        row.HotelSearch = row.HotelName;
      } else {
        row.HotelSearch = '';
      }
      this.specialInclusionRows.update(rows => [...rows]);
    }, 200);
  }

  clearSpecialInclusionHotel(row: QuoteSpecialInclusionRow): void {
    row.HotelSearch = '';
    row.HotelId = 0;
    row.HotelName = '';
    row.FilteredHotels = [];
    row.ShowHotelDropdown = false;
    row.SpecialInclusionId = 0;
    row.ServiceSearch = '';
    row.TotalPrice = 0;

    this.specialInclusionRows.update(rows => [...rows]);
    this.markDirty();
  }

  // Toggle between hotel selection and manual location entry
  toggleManualLocation(row: QuoteSpecialInclusionRow): void {
    if (row.UseManualLocation) {
      // Switching back to hotel selection
      row.UseManualLocation = false;
      row.ManualLocationName = '';
      row.HotelSearch = row.HotelName;
    } else {
      // Switching to manual location
      row.UseManualLocation = true;
      row.HotelSearch = '';
      row.FilteredHotels = [];
      row.ShowHotelDropdown = false;
      row.ManualLocationName = row.HotelName;
      row.HotelId = 0;
    }
    this.specialInclusionRows.update(rows => [...rows]);
    this.markDirty();
  }

  // Save manual location entry
  onManualLocationChange(row: QuoteSpecialInclusionRow): void {
    this.markDirty();
    this.specialInclusionRows.update(rows => [...rows]);
  }

  // Night selection methods
  onNightToggle(row: QuoteSpecialInclusionRow, nightNumber: number): void {
    const index = row.NightNumbers.indexOf(nightNumber);
    if (index > -1) {
      row.NightNumbers = [];
    } else {
      row.NightNumbers = [nightNumber];
    }
    this.updateNightsDisplay(row);
    this.specialInclusionRows.update(rows => [...rows]);
    this.markDirty();
  }

  updateNightsDisplay(row: QuoteSpecialInclusionRow): void {
    if (row.NightNumbers.length === 0) {
      row.SelectedNightsDisplay = '';
    } else if (row.NightNumbers.length === 1) {
      row.SelectedNightsDisplay = `Night ${row.NightNumbers[0]}`;
    } else {
      row.SelectedNightsDisplay = `${row.NightNumbers.length} nights selected`;
    }
  }

  toggleNightDropdown(row: QuoteSpecialInclusionRow): void {
    row.ShowNightDropdown = !row.ShowNightDropdown;
    this.specialInclusionRows.update(rows => [...rows]);
  }

  onNightDropdownBlur(row: QuoteSpecialInclusionRow): void {
    setTimeout(() => {
      row.ShowNightDropdown = false;
      this.specialInclusionRows.update(rows => [...rows]);
    }, 150);
  }

  removeSpecialInclusionRow(row: QuoteSpecialInclusionRow): void {
    this.markDirty();
    if (row.QuoteSpecialInclusionId > 0) {
      const enc = (d: object): RequestModel => ({
        request: this.local.encrypt(JSON.stringify(d)).toString()
      });
      this.service.deleteQuoteSpecialInclusion(
        enc({ QuoteSpecialInclusionId: row.QuoteSpecialInclusionId })
      ).subscribe({ next: () => { } });
    }
    // Find and remove the row by comparing the object reference
    this.specialInclusionRows.update(rows => rows.filter(r => r !== row));
  }
  lookupHotelRate(row: QuoteHotelRow): void {
    if (!row.HotelId || !row.RoomTypeId) return;
    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });
    // Fetch base rate and extra charges in parallel
    forkJoin({
      rate: this.service.getHotelRateByDate(enc({
        HotelId: row.HotelId,
        RoomTypeId: row.RoomTypeId,
        StayDate: this.loadData.loadDateTime(row.StayDate),
      })),
      charges: this.service.getHotelExtraCharges(enc({
        HotelId: row.HotelId,
        StayDate: row.StayDate,
      }))
    }).subscribe({
      next: ({ rate, charges }: any) => {
        if (rate.Message === ConstantData.SuccessMessage && rate.Rate) {

          const r = rate.Rate;

          row.BaseRate = row.MealPlan === 'CP'
            ? (r.CpRate ?? 0)
            : row.MealPlan === 'MAP'
              ? (r.MapRate ?? 0)
              : (r.ApRate ?? 0);

        } else {

          this.toastr.warning(
            `No price configured for ${row.HotelName}`
          );

          row.BaseRate = 0;
        }

        if (charges.Message === ConstantData.SuccessMessage) {
          const ch = charges.Charges ?? [];
          // ChargeType 1=AWEB, 2=CWEB, 3=CNB
          const aweb = ch.find((c: any) => c.ChargeType === 1);
          const cweb = ch.find((c: any) => c.ChargeType === 2);
          const cnb = ch.find((c: any) => c.ChargeType === 3);

          row.AwebRate = aweb ? (row.MealPlan === 'CP' ? aweb.CpRate
            : row.MealPlan === 'MAP' ? aweb.MapRate : aweb.ApRate) ?? 0 : 0;
          row.CwebRate = cweb ? (row.MealPlan === 'CP' ? cweb.CpRate
            : row.MealPlan === 'MAP' ? cweb.MapRate : cweb.ApRate) ?? 0 : 0;
          row.CnbRate = cnb ? (row.MealPlan === 'CP' ? cnb.CpRate
            : row.MealPlan === 'MAP' ? cnb.MapRate : cnb.ApRate) ?? 0 : 0;
        }

        this.recalculatePrice(row);
        this.hotelRows.update(rows => [...rows]);
      }
    });
  }

  recalculatePrice(row: QuoteHotelRow): void {
    const nights = row.NightNumbers.length || 1;
    const roomCost = (row.BaseRate || 0) * (row.NoOfRooms || 1) * nights;
    const awebCost = (row.AwebRate || 0) * (row.AWEB || 0) * nights;
    const cwebCost = (row.CwebRate || 0) * (row.CWEB || 0) * nights;
    const cnbCost = (row.CnbRate || 0) * (row.CNB || 0) * nights;
    row.CostPrice = roomCost + awebCost + cwebCost + cnbCost;
    row.SellingPrice = row.CostPrice;
    row.TotalPrice = row.CostPrice;
  }

  saveHotelRow(row: QuoteHotelRow): void {
    if (!row.HotelId || !row.RoomTypeId) return;
    if (row.NightNumbers.length === 0) {
      this.toastr.error('Please select at least one night');
      return;
    }

    const firstNight = row.NightNumbers[0];
    const slot = this.nightSlots().find(n => n.NightNumber === firstNight);
    row.NightNumber = firstNight;
    if (slot) row.StayDate = slot.StayDate;

    row.IsSaving = true;
    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    const stayDate = this.formatDate(row.StayDate);
    this.service.saveQuoteHotel(enc({
      QuoteHotelId: row.QuoteHotelId, QuoteId: this.QuoteId,
      QuotePackageTypeId: row.QuotePackageTypeId,
      NightNumber: row.NightNumber, StayDate: stayDate,
      HotelId: row.HotelId, RoomTypeId: row.RoomTypeId,
      MealPlan: row.MealPlan, NoOfRooms: row.NoOfRooms,
      PaxPerRoom: row.PaxPerRoom, AWEB: row.AWEB, CWEB: row.CWEB, CNB: row.CNB,
      CostPrice: row.CostPrice, SellingPrice: row.SellingPrice,
    })).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          row.QuoteHotelId = r.QuoteHotelId;
          this.markClean(); // ← mark clean after successful save
        } else {
          this.toastr.error(r.Message);
        }
        row.IsSaving = false;
      },
      error: () => { row.IsSaving = false; }
    });
  }

  removeHotelRow(row: QuoteHotelRow): void {
    this.markDirty();
    if (row.QuoteHotelId > 0) {
      const enc = (d: object): RequestModel => ({
        request: this.local.encrypt(JSON.stringify(d)).toString()
      });
      this.service.deleteQuoteHotel(enc({ QuoteHotelId: row.QuoteHotelId }))
        .subscribe({ next: () => { } });
    }
    // Find and remove the row by comparing the object reference
    this.hotelRows.update(rows => rows.filter(r => r !== row));
  }

  // State
  showEditPricesModal = false;
  editingHotelRow: QuoteHotelRow | null = null;
  editPrices = {
    RoomRate: 0,
    AwebRate: 0,
    CwebRate: 0,
    CnbRate: 0,
    SellingPrice: 0,
    ComputedTotal: 0,
  };

  // Open modal
  EditPrices(row: QuoteHotelRow): void {
    this.editingHotelRow = row;
    this.editPrices = {
      RoomRate: row.BaseRate,
      AwebRate: row.AwebRate,
      CwebRate: row.CwebRate,
      CnbRate: row.CnbRate,
      SellingPrice: row.SellingPrice,
      ComputedTotal: row.CostPrice,
    };
    this.showEditPricesModal = true;
  }

  closeEditPricesModal(): void {
    this.showEditPricesModal = false;
    this.editingHotelRow = null;
  }

  recalculateEditPrice(): void {
    if (!this.editingHotelRow) return;
    const row = this.editingHotelRow;
    this.editPrices.ComputedTotal =
      (this.editPrices.RoomRate * (row.NoOfRooms || 0)) +
      (this.editPrices.AwebRate * (row.AWEB || 0)) +
      (this.editPrices.CwebRate * (row.CWEB || 0)) +
      (this.editPrices.CnbRate * (row.CNB || 0));
  }

  applyEditPrices(): void {
    if (!this.editingHotelRow) return;
    const row = this.editingHotelRow;

    // Apply back to row
    row.BaseRate = this.editPrices.RoomRate;
    row.AwebRate = this.editPrices.AwebRate;
    row.CwebRate = this.editPrices.CwebRate;
    row.CnbRate = this.editPrices.CnbRate;
    row.CostPrice = this.editPrices.ComputedTotal;
    row.TotalPrice = this.editPrices.ComputedTotal;
    row.SellingPrice = this.editPrices.SellingPrice;

    this.hotelRows.update(rows => [...rows]);
    this.markDirty();
    this.saveHotelRow(row);
    this.recalculatePrice(row);
    this.closeEditPricesModal();
  }



  // Cab types & days
  showCabTypesModal = false;
  selectedCabTypes: any[] = [];
  cabTypesList: any[] = [];
  selectedDays = signal<number[]>([]);
  selectedDayForForm = 0;
  currentTransportRow: QuoteServiceRow = {} as QuoteServiceRow;
  // Transport form state — separate from hotel modal


  onSameCabChange(): void {
    if (!this.sameCabForAll) {
      this.selectedCabTypes = [];
      const activeRows = this.getActiveTransportRows();
      activeRows.forEach(row => {
        row.VehicleTypeId = 0;
        row.VehicleTypeName = '';
        row.VehicleSearch = '';
        row.CostPrice = 0;
        row.SellingPrice = 0;
        row.TotalPrice = 0;
        row.Qty = 1;
      });
      this.transportRows.update(rows => [...rows]);
      this.transportVehicleSearch = '';
      this.currentTransportVehicle = null;
    } else if (this.selectedCabTypes.length > 0) {
      // Re-checked with a cab type already set earlier — push it back to every row
      const firstCab = this.selectedCabTypes[0];
      const activeRows = this.getActiveTransportRows();
      activeRows.forEach(row => {
        row.VehicleTypeId = firstCab.VehicleTypeId;
        row.VehicleTypeName = firstCab.VehicleTypeName;
        row.VehicleSearch = firstCab.VehicleTypeName;
        row.Qty = firstCab.Quantity || 1;
        if (row.IteneraryServiceId > 0) {
          this.lookupTransportRate(row);
        }
      });
      this.transportRows.update(rows => [...rows]);
    }
  }

  openCabTypesModal(): void {
    this.cabTypesList = this.selectedCabTypes.length > 0
      ? this.selectedCabTypes.map(c => ({ ...c }))
      : [{ VehicleTypeId: 0, VehicleTypeName: '', Quantity: 1 }];
    this.showCabTypesModal = true;
  }

  closeCabTypesModal(): void {
    this.showCabTypesModal = false;
  }

  onCabTypeSelected(cabType: any): void {
    const vt = this.vehicleTypeList().find(
      v => Number(v.VehicleTypeId) === Number(cabType.VehicleTypeId)
    );

    if (vt) {
      cabType.VehicleTypeName = vt.VehicleTypeName;
    }
  }
  addCabType(): void {
    this.cabTypesList.push({ VehicleTypeId: 0, VehicleTypeName: '', Quantity: 1 });
  }

  removeCabType(i: number): void {
    this.cabTypesList.splice(i, 1);
  }

  saveCabTypes(): void {
    const invalid = this.cabTypesList.find(c => !c.VehicleTypeId || c.Quantity < 1);
    if (invalid) {
      this.toastr.error('Select vehicle type and quantity for all');
      return;
    }
    this.selectedCabTypes = this.cabTypesList.map(c => ({ ...c }));

    // ✅ UPDATE ALL EXISTING TRANSPORT ROWS WITH THE FIRST CAB TYPE
    if (this.selectedCabTypes.length > 0) {
      const firstCab = this.selectedCabTypes[0];

      // Update the global transport state
      this.transportVehicleSearch = firstCab.VehicleTypeName;
      this.currentTransportVehicle = firstCab;
      this.transportQty = firstCab.Quantity;

      // ✅ UPDATE ALL EXISTING TRANSPORT ROWS (including day groups)
      const activeRows = this.getActiveTransportRows();
      activeRows.forEach(row => {
        // Update vehicle in the row
        row.VehicleTypeId = firstCab.VehicleTypeId;
        row.VehicleTypeName = firstCab.VehicleTypeName;
        row.VehicleSearch = firstCab.VehicleTypeName;
        row.Qty = firstCab.Quantity;

        // Lookup rate if service is selected
        if (row.IteneraryServiceId > 0) {
          this.lookupTransportRate(row);
        }
      });

      // ✅ Also update rows inside day groups
      const dayGroups = this.getActiveDayGroups();
      dayGroups.forEach(group => {
        group.TransportRows.forEach(row => {
          row.VehicleTypeId = firstCab.VehicleTypeId;
          row.VehicleTypeName = firstCab.VehicleTypeName;
          row.VehicleSearch = firstCab.VehicleTypeName;
          row.Qty = firstCab.Quantity;
          if (row.IteneraryServiceId > 0) {
            this.lookupTransportRate(row);
          }
        });
      });

      // Force UI refresh for both
      this.transportRows.update(rows => [...rows]);
      this.dayGroups.update(groups => [...groups]);

      // ✅ Create rows for all selected days if service is selected
      if (this.selectedDays().length > 0 && this.currentTransportRow.IteneraryServiceId > 0) {
        this.selectTransportVehicleGlobal(firstCab);
      }
    }

    this.closeCabTypesModal();
    this.markDirty();
    this.toastr.success('Cab types updated for all transport rows');
  }



  getSelectedCabTypesDisplay(): string {
    return this.selectedCabTypes
      .map(c => `${c.VehicleTypeName}`)
      .join(' + ');

  }


  // getActiveTransportRows(): QuoteServiceRow[] {
  //   if (this.selectedDays.length === 0) {
  //     return this.serviceRows().filter(
  //       r => r.ServiceType === 1 && r.QuotePackageTypeId === this.activePackageTypeId()
  //     );
  //   }
  //   return this.serviceRows().filter(
  //     r => r.ServiceType === 1
  //       && r.QuotePackageTypeId === this.activePackageTypeId()
  //       && this.selectedDays.includes(r.DayNumber)
  //   );
  // }

  toggleDay(dayNumber: number): void {
    const current = this.selectedDays();
    const idx = current.indexOf(dayNumber);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(dayNumber);
      current.sort((a, b) => a - b);
    }
    this.selectedDays.set([...current]);
  }

  toggleAllDays(): void {
    if (this.selectedDays().length === this.daySlots().length) {
      this.selectedDays.set([]);
    } else {
      this.selectedDays.set(this.daySlots().map(d => d.DayNumber));
    }
  }

  allDaysSelected(): boolean {
    const slots = this.daySlots();
    return slots.length > 0 && this.selectedDays().length === slots.length;
  }

  addTransportRow(slot?: DaySlot): void {
    const selectedSlot = slot ?? this.daySlots()[0];
    if (!selectedSlot) {
      this.toastr.error('No days available for this trip');
      return;
    }

    this.markDirty();

    const prefillVehicle = this.sameCabForAll && this.selectedCabTypes.length > 0
      ? this.selectedCabTypes[0]
      : null;

    this.transportRows.update(rows => [...rows, {
      QuoteServiceId: 0,
      QuoteId: this.QuoteId,
      QuotePackageTypeId: this.activePackageTypeId(),
      DayNumbers: [selectedSlot.DayNumber],
      DayNumber: selectedSlot.DayNumber,
      ServiceDate: selectedSlot.ServiceDate,
      LocationId: 0,
      LocationName: '',
      IteneraryServiceId: 0,
      IteneraryServiceName: '',
      VehicleTypeId: prefillVehicle?.VehicleTypeId ?? 0,
      VehicleTypeName: prefillVehicle?.VehicleTypeName ?? '',
      SameCabForAll: this.sameCabForAll,
      Qty: prefillVehicle?.Quantity ?? 1,
      CostPrice: 0,
      SellingPrice: 0,
      TotalPrice: 0,
      Notes: '',
      IsSaving: false,
      LocationSearch: '',
      FilteredLocations: [],
      ShowLocationDropdown: false,
      ServiceSearch: '',
      FilteredServices: [],
      ShowServiceDropdown: false,
      VehicleSearch: prefillVehicle?.VehicleTypeName ?? '',
      FilteredVehicles: [],
      ShowVehicleDropdown: false,
      ShowDayDropdown: false,
      SelectedDaysDisplay: `Day ${selectedSlot.DayNumber}`,
    }]);

    this.syncSelectedDaysFromTransportRows();
  }

  // ── Service rows ──────────────────────────────────────────
  getServiceRowsForDay(dayNumber: number): QuoteServiceRow[] {
    return this.serviceRows().filter(
      r => r.DayNumber === dayNumber
        && r.QuotePackageTypeId === this.activePackageTypeId()
    );
  }
  //   addTransportRowQuick(): void {
  //   if (this.selectedDays.length === 0) {
  //     this.toastr.error('Select at least one day');
  //     return;
  //   }
  //   const daySlot = this.daySlots().find(d => d.DayNumber === this.selectedDays[0]);
  //   if (daySlot) {
  //     this.addTransportRow();
  //   }
  // }

  // addActivityRowQuick(): void {
  //   if (this.selectedDays.length === 0) {
  //     this.toastr.error('Select at least one day');
  //     return;
  //   }
  //   const daySlot = this.daySlots().find(d => d.DayNumber === this.selectedDays[0]);
  //   if (daySlot) {
  //     this.addActivityRow(daySlot);
  //   }
  // }
  // For the col-sm-7 day summary (keeps day filter)


getActiveTransportRows(): QuoteTransportRow[] {
  return this.transportRows();
}

  // For the col-sm-7 day summary table only
  getTransportRowsForDay(dayNumber: number): QuoteServiceRow[] {
    return this.serviceRows().filter(
      r => r.ServiceType === 1
        && r.DayNumber === dayNumber
        && r.QuotePackageTypeId === this.activePackageTypeId()
    );
  }

  isVehicleSelectionRow(row: QuoteServiceRow, index: number): boolean {
    const rows = this.getActiveTransportRows();
    return rows.findIndex(r =>
      r.QuotePackageTypeId === row.QuotePackageTypeId
      && r.IteneraryServiceId === row.IteneraryServiceId
      && r.LocationId === row.LocationId
    ) === index;
  }

  removeTransportRowsForDay(dayNumber: number): void {
    this.serviceRows.update(rows => rows.filter(
      r => !(r.ServiceType === 1
        && r.QuotePackageTypeId === this.activePackageTypeId()
        && r.DayNumber === dayNumber)
    ));
  }

  showDaysDropdown = false;
  selectedDaysDisplay = '';

  onDayToggle(dayNumber: number): void {
    const current = [...this.selectedDays()];
    const index = current.indexOf(dayNumber);
    if (index > -1) {
      current.splice(index, 1);
      this.removeTransportRowsForDay(dayNumber);
    } else {
      current.push(dayNumber);
      current.sort((a, b) => a - b);

      if (this.currentTransportRow.LocationId > 0 && this.currentTransportRow.IteneraryServiceId > 0) {
        const daySlot = this.daySlots().find(d => d.DayNumber === dayNumber);
        if (daySlot) {
          const exists = this.serviceRows().some(
            r => r.ServiceType === 1
              && r.DayNumber === dayNumber
              && r.QuotePackageTypeId === this.activePackageTypeId()
              && r.LocationId === this.currentTransportRow.LocationId
              && r.IteneraryServiceId === this.currentTransportRow.IteneraryServiceId
          );
          if (!exists) {
            this.addTransportRowForSlot(daySlot);
          }
        }
      }
    }

    this.selectedDays.set(current);
    this.updateDaysDisplay();
    this.serviceRows.update(rows => [...rows]); // ← trigger UI refresh
  }

  updateDaysDisplay(): void {
    const days = this.selectedDays();
    if (days.length === 0) {
      this.selectedDaysDisplay = '';
    } else if (days.length === 1) {
      this.selectedDaysDisplay = `Day ${days[0]}`;
    } else {
      this.selectedDaysDisplay = `${days.length} days selected`;
    }
  }

  toggleDaysDropdown(): void {
    this.showDaysDropdown = !this.showDaysDropdown;
  }

  onDaysDropdownBlur(): void {
    setTimeout(() => {
      this.showDaysDropdown = false;
    }, 150);
  }

  onLocationSearchChange(): void {
    const query = (this.locationSearchText ?? '').toLowerCase().trim();

    if (!query) {
      this.filteredLocations = this.itineraryList().slice(0, 6);
      this.showLocationDropdown = true;
      return;
    }

    this.filteredLocations = this.itineraryList()
      .filter(it => it.IteneraryServiceName.toLowerCase().includes(query))
      .slice(0, 6);

    this.showLocationDropdown = true;
  }

  selectLocation(location: any): void {
    this.currentTransportRow.IteneraryServiceId = location.IteneraryServiceId;
    this.currentTransportRow.IteneraryServiceName = location.IteneraryServiceName;
    this.locationSearchText = location.ItineraryServiceName;
    this.showLocationDropdown = false;
    this.filteredLocations = [];
  }

  onLocationSearchBlur(): void {
    setTimeout(() => {
      this.showLocationDropdown = false;
      if (this.currentTransportRow.IteneraryServiceId > 0) {
        this.locationSearchText = this.currentTransportRow.IteneraryServiceName;
      } else {
        this.locationSearchText = '';
      }
    }, 200);
  }

  clearLocationSearch(): void {
    this.locationSearchText = '';
    // this.currentTransportRow.ItineraryServiceId = 0;
    // this.currentTransportRow.ItineraryServiceName = '';
    this.filteredLocations = [];
    this.showLocationDropdown = false;
  }

  // Service Type search
  serviceTypeSearchText = '';
  filteredServiceTypes: any[] = [];
  showServiceTypeDropdown = false;

  onServiceTypeSearchChange(): void {
    const query = (this.serviceTypeSearchText ?? '').toLowerCase().trim();
    const vehicles = this.sameCabForAll && this.selectedCabTypes.length > 0
      ? this.selectedCabTypes
      : this.vehicleTypeList();

    if (!query) {
      this.filteredServiceTypes = vehicles.slice(0, 6);
      this.showServiceTypeDropdown = true;
      return;
    }

    this.filteredServiceTypes = vehicles
      .filter(v => v.VehicleTypeName.toLowerCase().includes(query))
      .slice(0, 6);

    this.showServiceTypeDropdown = true;
  }

  selectServiceType(serviceType: any): void {
    this.currentTransportRow.VehicleTypeId = serviceType.VehicleTypeId;
    this.currentTransportRow.VehicleTypeName = serviceType.VehicleTypeName;
    this.serviceTypeSearchText = serviceType.VehicleTypeName;
    this.showServiceTypeDropdown = false;
    this.filteredServiceTypes = [];
    this.onVehicleSelected(this.currentTransportRow);
  }

  onServiceTypeSearchBlur(): void {
    setTimeout(() => {
      this.showServiceTypeDropdown = false;
      if (this.currentTransportRow.VehicleTypeId > 0) {
        this.serviceTypeSearchText = this.currentTransportRow.VehicleTypeName;
      } else {
        this.serviceTypeSearchText = '';
      }
    }, 200);
  }

  clearServiceTypeSearch(): void {
    this.serviceTypeSearchText = '';
    this.currentTransportRow.VehicleTypeId = 0;
    this.currentTransportRow.VehicleTypeName = '';
    this.filteredServiceTypes = [];
    this.showServiceTypeDropdown = false;
  }

  // Transport Service search properties


  serviceSearchText = '';
  filteredServices: any[] = [];
  showServiceDropdown = false;

  // Available data for transport
  availableLocations: any[] = [];
  availableServices: any[] = [];



  // Transport Service - Location & Service search (following Special Inclusions pattern)


  selectTransportLocation(loc: any): void {
    this.currentTransportRow.LocationId = loc.LocationId;
    this.currentTransportRow.LocationName = loc.LocationName;
    this.locationSearchText = loc.LocationName;
    this.showLocationDropdown = false;

    // ✅ IMPORTANT: Load services for THIS location from backend
    this.loadServicesByLocation(loc.LocationId);
    this.serviceRows.update(rows => [...rows]); // ← refresh table
  }


  //clear transport
  clearTransportLocation(): void {

    this.locationSearchText = '';

    this.currentTransportRow.LocationId = 0;
    this.currentTransportRow.LocationName = '';

    this.serviceSearchText = '';
    this.filteredServices = [];

    this.showLocationDropdown = false;
  }

  selectTransportService(service: any): void {
    this.currentTransportRow.IteneraryServiceId = service.IteneraryServiceId;
    this.currentTransportRow.IteneraryServiceName = service.IteneraryServiceName;
    this.serviceSearchText = service.IteneraryServiceName;
    this.showServiceDropdown = false;
    this.loadVehiclesForService(service.IteneraryServiceId);

    // ✅ Auto-create transport rows for all selected days
    if (this.selectedDays().length > 0) {
      const selectedDaySlots = this.selectedDays()
        .map((dayNum: number) => this.daySlots().find(d => d.DayNumber === dayNum))
        .filter((slot: DaySlot | undefined) => slot !== undefined) as DaySlot[];

      selectedDaySlots.forEach(daySlot => {
        const existingRow = this.serviceRows().find(
          r => r.ServiceType === 1
            && r.DayNumber === daySlot.DayNumber
            && r.QuotePackageTypeId === this.activePackageTypeId()
            && r.LocationId === this.currentTransportRow.LocationId
        );

        if (!existingRow) {
          this.addTransportRowForSlot(daySlot);
        }
      });
    }

    this.serviceRows.update(rows => [...rows]); // ← refresh table
  }
  // DELETE THIS ENTIRE METHOD
  loadVehiclesForService(iteneraryServiceId: number): void {
    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    this.service.getVehicleServiceRateList(enc({
      IteneraryServiceId: iteneraryServiceId
    })).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          this.availableVehiclesForService = r.VehicleRateList ?? [];
        }
      }
    });
  }

  availableVehiclesForService: any[] = [];
  clearTransportService(): void {

    this.serviceSearchText = '';

    this.currentTransportRow.IteneraryServiceId = 0;
    this.currentTransportRow.IteneraryServiceName = '';

    this.showServiceDropdown = false;
  }




  loadLocationsByDestination(): void {
    const trip = this.tripInfo();
    if (!trip || !trip.DestinationId) {
      return;
    }

    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    this.service.getLocationsByDestination(enc({ DestinationId: trip.DestinationId }))
      .subscribe({
        next: (r: any) => {
          if (r.Message === ConstantData.SuccessMessage) {
            this.availableLocations = r.LocationList ?? [];
          }
        },
        error: (err) => {
          console.error('Error loading locations:', err);
          this.toastr.error('Failed to load locations');
        }
      });
  }



  loadServicesByLocation(locationId: number): void {
    if (!locationId) {
      this.filteredServices = [];
      return;
    }

    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    this.service.getItineraryServicesByLocation(enc({ LocationId: locationId }))
      .subscribe({
        next: (r: any) => {
          if (r.Message === ConstantData.SuccessMessage) {
            // Filter to this location's services only
            this.filteredServices = r.ItineraryServiceList ?? [];
            this.showServiceDropdown = false;
          } else {
            this.toastr.warning('No services available for this location');
            this.filteredServices = [];
          }
        },
        error: () => {
          this.toastr.error('Failed to load services for this location');
          this.filteredServices = [];
        }
      });
  }


  addTransportRowForSlot(slot: DaySlot): void {
    this.markDirty();

    // ✅ If "Same Cab For All" is enabled, pre-select the first cab
    let prefilledVehicleId = 0;
    let prefilledVehicleName = '';

    if (this.sameCabForAll && this.selectedCabTypes.length > 0) {
      prefilledVehicleId = this.selectedCabTypes[0].VehicleTypeId;
      prefilledVehicleName = this.selectedCabTypes[0].VehicleTypeName;
    }

    const newRow: QuoteServiceRow = {
      QuoteServiceId: 0,
      QuoteId: this.QuoteId,
      QuotePackageTypeId: 0,
      DayNumber: slot.DayNumber,
      ServiceDate: slot.ServiceDate,
      ServiceType: 1,
      IteneraryServiceId: this.currentTransportRow.IteneraryServiceId ?? 0,
      IteneraryServiceName: this.currentTransportRow.IteneraryServiceName ?? '',
      VehicleTypeId: prefilledVehicleId,  // ✅ Pre-filled if sameCabForAll
      VehicleTypeName: prefilledVehicleName,
      SameCabForAll: this.sameCabForAll,
      ActivityServiceId: 0,
      ActivityServiceName: '',
      Qty: 1,
      CostPrice: 0,
      SellingPrice: 0,
      Notes: '',
      IsSaving: false,
      LocationId: this.currentTransportRow.LocationId ?? 0,
      LocationName: this.currentTransportRow.LocationName ?? '',
      VehicleTypeSearch: prefilledVehicleName,  // ✅ Show in input
      FilteredVehicles: [],
      ShowVehicleDropdown: false,
      TotalPrice: 0,
    };

    this.serviceRows.update(rows => [...rows, newRow]);
    this.syncSelectedDaysFromTransportRows();

    // ✅ If vehicle was auto-selected, lookup rate immediately
    if (prefilledVehicleId > 0 && newRow.IteneraryServiceId > 0) {
      setTimeout(() => this.lookupVehicleRate(newRow), 100);
    }
  }

  // ── Transport state ──
  currentTransportVehicle: any = null;
  transportVehicleSearch = '';
  transportFilteredVehicles: any[] = [];
  transportShowVehicleDropdown = false;
  transportQty = 1; // ✅ Single shared qty

  selectTransportVehicleGlobal(vt: any): void {
    this.currentTransportVehicle = vt;
    this.transportVehicleSearch = vt.VehicleTypeName;
    this.transportShowVehicleDropdown = false;
    this.transportFilteredVehicles = [];

    // ✅ UPDATE ALL EXISTING ROWS WITH THIS VEHICLE
    const activeRows = this.getActiveTransportRows();
    activeRows.forEach(row => {
      row.VehicleTypeId = vt.VehicleTypeId;
      row.VehicleTypeName = vt.VehicleTypeName;
      row.VehicleSearch = vt.VehicleTypeName;
      row.Qty = this.transportQty;

      if (row.IteneraryServiceId > 0) {
        this.lookupTransportRate(row);
      }
    });

    // Force UI refresh
    this.transportRows.update(rows => [...rows]);

    // ✅ Also create rows for selected days if service is selected
    if (this.selectedDays.length > 0 && this.currentTransportRow.IteneraryServiceId > 0) {
      this.selectedDays().forEach((dayNum: number) => {
        const daySlot = this.daySlots().find(d => d.DayNumber === dayNum);
        if (!daySlot) return;

        const existingRow = this.serviceRows().find(
          r => r.ServiceType === 1
            && r.DayNumber === dayNum
            && r.QuotePackageTypeId === this.activePackageTypeId()
            && r.LocationId === this.currentTransportRow.LocationId
            && r.IteneraryServiceId === this.currentTransportRow.IteneraryServiceId
        );

        if (existingRow) {
          existingRow.VehicleTypeId = vt.VehicleTypeId;
          existingRow.VehicleTypeName = vt.VehicleTypeName;
          existingRow.Qty = this.transportQty;
          this.lookupVehicleRate(existingRow);
        } else {
          const newRow: QuoteServiceRow = {
            QuoteServiceId: 0,
            QuoteId: this.QuoteId,
            QuotePackageTypeId: this.activePackageTypeId(),
            DayNumber: dayNum,
            ServiceDate: daySlot.ServiceDate,
            ServiceType: 1,
            IteneraryServiceId: this.currentTransportRow.IteneraryServiceId,
            IteneraryServiceName: this.currentTransportRow.IteneraryServiceName,
            VehicleTypeId: vt.VehicleTypeId,
            VehicleTypeName: vt.VehicleTypeName,
            SameCabForAll: this.sameCabForAll,
            ActivityServiceId: 0,
            ActivityServiceName: '',
            Qty: this.transportQty,
            CostPrice: 0,
            SellingPrice: 0,
            Notes: '',
            IsSaving: false,
            LocationId: this.currentTransportRow.LocationId,
            LocationName: this.currentTransportRow.LocationName,
            VehicleTypeSearch: vt.VehicleTypeName,
            FilteredVehicles: [],
            ShowVehicleDropdown: false,
            TotalPrice: 0,
          };
          this.serviceRows.update(rows => [...rows, newRow]);
          this.lookupVehicleRate(newRow);
        }
      });

      this.serviceRows.update(rows => [...rows]);
    }

    this.markDirty();
  }
  clearTransportVehicleGlobal(): void {
    this.transportVehicleSearch = '';
    this.currentTransportVehicle = null;
    this.transportFilteredVehicles = [];
    this.transportShowVehicleDropdown = false;
    this.transportQty = 1;

    this.serviceRows.update(rows =>
      rows.filter(r => !(r.ServiceType === 1 && r.VehicleTypeId > 0 && r.QuotePackageTypeId === this.activePackageTypeId()))
    );
  }
  onTransportQtyChange(): void {
    // Update qty for ALL rows with current vehicle
    this.serviceRows().forEach(row => {
      if (row.ServiceType === 1
        && row.VehicleTypeId === this.currentTransportVehicle?.VehicleTypeId
        && row.QuotePackageTypeId === this.activePackageTypeId()) {
        row.Qty = this.transportQty;
        // Calculate Given column: CostPrice × Qty
        row.SellingPrice = (row.CostPrice || 0) * this.transportQty;
        this.calculateServiceTotal(row);
      }
    });
    this.serviceRows.update(rows => [...rows]);
    this.markDirty();
  }


  onTransportSellingChange(row: QuoteServiceRow): void {
    const days = this.selectedDays.length > 0
      ? this.selectedDays.length
      : this.daySlots().length;
    row.TotalPrice = (row.SellingPrice ?? 0) * (row.Qty ?? 1) * days;
    this.serviceRows.update(rows => [...rows]);
    this.markDirty();
  }


  // Update this method to recalculate based on ALL selected days
  calculateServiceTotal(row: QuoteServiceRow): void {
    const totalDays = this.selectedDays.length > 0 ? this.selectedDays.length : 1;
    const sellingTotal = (row.SellingPrice || 0) * (row.Qty || 1) * totalDays;
    row.TotalPrice = sellingTotal;
    this.serviceRows.update(rows => [...rows]);
  }



  clearTransportVehicle(row: QuoteServiceRow): void {
    row.VehicleTypeSearch = '';
    row.VehicleTypeId = 0;
    row.VehicleTypeName = '';
    row.FilteredVehicles = [];
    row.ShowVehicleDropdown = false;
    row.CostPrice = 0;
    row.SellingPrice = 0;
    this.serviceRows.update(rows => [...rows]);
    this.markDirty();
  }


  addActivityRow(slot: DaySlot): void {
    this.markDirty();
    this.serviceRows.update(rows => [...rows, {
      QuoteServiceId: 0,
      QuoteId: this.QuoteId,
      QuotePackageTypeId: 0,
      DayNumber: slot.DayNumber,
      ServiceDate: slot.ServiceDate,
      ServiceType: 2,
      IteneraryServiceId: 0,
      IteneraryServiceName: '',
      VehicleTypeId: 0,
      VehicleTypeName: '',
      SameCabForAll: false,
      ActivityServiceId: 0,
      ActivityServiceName: '',
      Qty: 1,
      CostPrice: 0,
      SellingPrice: 0,
      Notes: '',
      IsSaving: false,
      LocationId: 0,
      LocationName: '',
      FilteredVehicles: [],
      VehicleTypeSearch: '',
      ShowVehicleDropdown: false,
      TotalPrice: 0,  // ← ADD THIS
    }]);
  }

  onItinerarySelected(row: QuoteServiceRow): void {
    this.markDirty();
    const svc = this.itineraryList().find(
      i => i.IteneraryServiceId === row.IteneraryServiceId
    );
    if (svc) {
      row.IteneraryServiceName = svc.IteneraryServiceName;
      if (row.VehicleTypeId > 0) this.lookupVehicleRate(row);
    }
  }

  onVehicleSelected(row: QuoteServiceRow): void {
    this.markDirty();
    this.lookupVehicleRate(row);
  }




  lookupVehicleRate(row: QuoteServiceRow): void {
    if (!row.IteneraryServiceId || !row.VehicleTypeId) {
      if (row.VehicleTypeId > 0 && !row.IteneraryServiceId) {
        this.toastr.warning('Select service location and service first');
      }
      return;
    }

    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    this.service.getVehicleRateByDate(enc({
      IteneraryServiceId: row.IteneraryServiceId,
      VehicleTypeId: row.VehicleTypeId,
      ServiceDate: row.ServiceDate,
    })).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage && r.Rate) {
          // ✅ Get base rate per unit
          const baseRate = r.Rate.RateAmount ?? 0;
          row.CostPrice = baseRate;
          row.SellingPrice = baseRate;

          // ✅ Calculate total with day multiplier
          this.calculateServiceTotal(row);

          this.serviceRows.update(rows => [...rows]);
          this.markDirty();
        } else {
          row.CostPrice = 0;
          row.SellingPrice = 0;
          this.toastr.warning(
            `No rate found for ${row.VehicleTypeName} on this service`
          );
        }
      },
      error: () => {
        this.toastr.error('Error loading vehicle rate');
      }
    });
  }

  onActivitySelected(row: QuoteServiceRow): void {
    this.markDirty();
    const act = this.activityList().find(
      a => a.ActivityServiceId === row.ActivityServiceId
    );
    if (act) {
      row.ActivityServiceName = act.ActivityServiceName;
      const enc = (d: object): RequestModel => ({
        request: this.local.encrypt(JSON.stringify(d)).toString()
      });
      this.service.getActivityRateByDate(enc({
        ActivityServiceId: row.ActivityServiceId,
        ServiceDate: row.ServiceDate,
      })).subscribe({
        next: (r: any) => {
          if (r.Message === ConstantData.SuccessMessage && r.Rate) {
            row.CostPrice = (r.Rate.AdultRate ?? 0) * row.Qty;
            row.SellingPrice = row.CostPrice;
          }
        }
      });
    }
  }

  saveServiceRow(row: QuoteServiceRow): void {
    row.IsSaving = true;
    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });
    this.service.saveQuoteService(enc({
      QuoteServiceId: row.QuoteServiceId, QuoteId: this.QuoteId,
      QuotePackageTypeId: row.QuotePackageTypeId,
      DayNumber: row.DayNumber, ServiceDate: row.ServiceDate,
      ServiceType: row.ServiceType,
      IteneraryServiceId: row.IteneraryServiceId || null,
      VehicleTypeId: row.VehicleTypeId || null,
      SameCabForAll: row.SameCabForAll,
      ActivityServiceId: row.ActivityServiceId || null,
      Qty: row.Qty, CostPrice: row.CostPrice,
      SellingPrice: row.SellingPrice, Notes: row.Notes,
    })).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          row.QuoteServiceId = r.QuoteServiceId;
          this.markClean();
        } else {
          this.toastr.error(r.Message);
        }
        row.IsSaving = false;
      },
      error: () => { row.IsSaving = false; }
    });
  }

  removeServiceRow(row: QuoteServiceRow): void {
    this.markDirty();
    if (row.QuoteServiceId > 0) {
      const enc = (d: object): RequestModel => ({
        request: this.local.encrypt(JSON.stringify(d)).toString()
      });
      this.service.deleteQuoteService(enc({ QuoteServiceId: row.QuoteServiceId }))
        .subscribe({ next: () => { } });
    }

    const dayNumber = row.DayNumber;
    this.serviceRows.update(rows => rows.filter(r => r !== row));

    const stillHasDay = this.serviceRows()
      .some(r => r.ServiceType === 1
        && r.QuotePackageTypeId === this.activePackageTypeId()
        && r.DayNumber === dayNumber);

    if (!stillHasDay) {
      const index = this.selectedDays().indexOf(dayNumber);
      if (index > -1) {
        const current = [...this.selectedDays()];
        current.splice(index, 1);
        this.selectedDays.set(current);
        this.updateDaysDisplay();
      }
    }
  }

  // ── function  helpers ───────────────────────────────────────
  formatDate(date: any): string {
    const formatted = this.loadData.loadDateTime(date);
    return formatted ? formatted : '';
  }

  getDestinationHotels(): any[] {
    return this.hotelList();
  }

  private loadSpecialInclusionsForHotel(hotelId: number): void {
    if (!hotelId || this.specialInclusionsByHotel[hotelId]) return;

    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    this.service.getSpecialInclusionList(enc({ HotelId: hotelId })).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          this.specialInclusionsByHotel[hotelId] = r.SpecialInclusionList ?? [];
          this.specialInclusionRows.update(rows => [...rows]);
        }
      }
    });
  }

  getHotelRateForService(row: QuoteSpecialInclusionRow, svc: any): number {
    const match = this.specialInclusionsByHotel[row.HotelId]?.find(
      (si: any) => si.SpecialInclusionTypeId === svc.SpecialInclusionTypeId
    );
    return match?.Rate ?? 0;
  }

  // ── Summary helpers ───────────────────────────────────────
  get summaryHotels(): QuoteHotelRow[] {
    return this.hotelRows().filter(
      r => r.QuotePackageTypeId === this.activePackageTypeId() && r.HotelId > 0
    );
  }

  get summaryServices(): QuoteServiceRow[] {
    return this.serviceRows().filter(
      r => r.QuotePackageTypeId === this.activePackageTypeId()
    );
  }

  getSummaryServicesByDay(dayNumber: number): QuoteServiceRow[] {
    return this.summaryServices.filter(r => r.DayNumber === dayNumber);
  }

  getDayLabel(dayNumber: number): string {
    const slot = this.daySlots().find(d => d.DayNumber === dayNumber);
    return slot ? `${slot.DateLabel} (${slot.DayLabel.slice(0, 3)})` : '';
  }

  get childrenCount(): number {
    const trip = this.tripInfo();
    if (!trip?.ChildrenAges) return 0;
    try { return JSON.parse(trip.ChildrenAges).length; } catch { return 0; }
  }

  get paxLabel(): string {
    const trip = this.tripInfo();
    if (!trip) return '';
    let label = `${trip.NoOfAdults} Adult${trip.NoOfAdults > 1 ? 's' : ''}`;
    if (this.childrenCount > 0)
      label += `, ${this.childrenCount} Child${this.childrenCount > 1 ? 'ren' : ''}`;
    return label;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN').format(amount);
  }

  // ── Save Quote ────────────────────────────────────────────
  saveQuote(): void {
    if (!this.QuoteId) { this.toastr.error('Please set package types first'); return; }

    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    this.loading.set(true);
    this.service.saveQuote(enc({
      QuoteId: this.QuoteId,
      TotalCostPrice: this.totalCost(),
      TotalSellingPrice: this.finalPrice(),
      HotelTotal: this.hotelTotal(),
      TransportTotal: this.transportTotal(),
      ActivityTotal: this.activityTotal(),
      GstPercent: this.gstPercent,
      InternalNotes: this.internalNotes,
      UpdatedBy: this.staffLogin.StaffLoginId,
    })).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          this.markClean();
          this.toastr.success('Quote saved successfully');
          this.router.navigate(['/agent/query-steptwo', this.QueryStepOneId]);
        } else { this.toastr.error(r.Message); }
        this.loading.set(false);
      },
      error: () => { this.toastr.error('Error saving quote'); this.loading.set(false); }
    });
  }

  cancel(): void {
    this.router.navigate(['/agent/query-steptwo', this.QueryStepOneId]);
  }

  private toNumberId(id: unknown): number {
    return Number(id) || 0;
  }

  setActivePackage(id: number | string): void {
    this.activePackageTypeId.set(this.toNumberId(id));
  }

  editBasicDetail(obj: any): void {
    const queryId = Number(obj) || this.QueryStepOneId;
    if (!queryId) { this.toastr.error('Query ID not found'); return; }
    this.router.navigate(['/agent/query-stepone', queryId]);
  }
  // Add with your other properties
  showTransportForm = false;
  showActivityForm = false;
  selectedDayForActivity = 0;
  selectedActivityId = 0;
  activityQty = 1;

  // Add these methods to your component (put them with your other methods, e.g., near addActivityRow)

  // Get activity rows
  getActivityRows(): QuoteServiceRow[] {
    return this.serviceRows().filter(
      r => r.ServiceType === 2 && r.QuotePackageTypeId === this.activePackageTypeId()
    );
  }

  // Add transport rows for selected days
  addTransportRowsForSelectedDays(): void {
    if (this.selectedDays.length === 0) {
      this.toastr.error('Please select at least one day');
      return;
    }

    if (!this.currentTransportRow.LocationId) {
      this.toastr.error('Please select a service location');
      return;
    }

    if (!this.currentTransportRow.IteneraryServiceId) {
      this.toastr.error('Please select a service type');
      return;
    }

    if (!this.currentTransportVehicle?.VehicleTypeId) {
      this.toastr.error('Please select a vehicle type');
      return;
    }

    this.selectedDays().forEach((dayNum: number) => {
      const daySlot = this.daySlots().find(d => d.DayNumber === dayNum);
      if (!daySlot) return;

      // Check if transport already exists for this day
      const exists = this.serviceRows().some(
        r => r.ServiceType === 1
          && r.DayNumber === dayNum
          && r.QuotePackageTypeId === this.activePackageTypeId()
          && r.LocationId === this.currentTransportRow.LocationId
          && r.IteneraryServiceId === this.currentTransportRow.IteneraryServiceId
      );

      if (!exists) {
        this.addTransportRowForSlot(daySlot);
      }
    });

    this.showTransportForm = false;
    this.resetTransportForm();
    this.toastr.success(`Transport added for ${this.selectedDays().length} day(s)`);
  }

  // Reset transport form
  resetTransportForm(): void {
    this.locationSearchText = '';
    this.serviceSearchText = '';
    this.transportVehicleSearch = '';
    this.currentTransportRow = {
      LocationId: 0,
      LocationName: '',
      IteneraryServiceId: 0,
      IteneraryServiceName: '',
    } as QuoteServiceRow;
    this.currentTransportVehicle = null;
    this.transportQty = 1;
    this.selectedDays.set([]);
    this.updateDaysDisplay();
  }

  // Add activity row for selected day
  addActivityRowForDay(): void {
    if (!this.selectedDayForActivity || this.selectedDayForActivity === 0) {
      this.toastr.error('Please select a day');
      return;
    }

    if (!this.selectedActivityId || this.selectedActivityId === 0) {
      this.toastr.error('Please select an activity');
      return;
    }

    const slot = this.daySlots().find(d => d.DayNumber === this.selectedDayForActivity);
    if (slot) {
      const newRow = {
        QuoteServiceId: 0,
        QuoteId: this.QuoteId,
        QuotePackageTypeId: this.activePackageTypeId(),
        DayNumber: slot.DayNumber,
        ServiceDate: slot.ServiceDate,
        ServiceType: 2,
        IteneraryServiceId: 0,
        IteneraryServiceName: '',
        VehicleTypeId: 0,
        VehicleTypeName: '',
        SameCabForAll: false,
        ActivityServiceId: this.selectedActivityId,
        ActivityServiceName: this.activityList().find(a => a.ActivityServiceId === this.selectedActivityId)?.ActivityServiceName || '',
        Qty: this.activityQty,
        CostPrice: 0,
        SellingPrice: 0,
        Notes: '',
        IsSaving: false,
        LocationId: 0,
        LocationName: '',
        FilteredVehicles: [],
        VehicleTypeSearch: '',
        ShowVehicleDropdown: false,
        TotalPrice: 0,
      };

      this.serviceRows.update(rows => [...rows, newRow]);
      this.onActivitySelected(newRow);
      this.markDirty();

      this.showActivityForm = false;
      this.selectedDayForActivity = 0;
      this.selectedActivityId = 0;
      this.activityQty = 1;

      this.toastr.success('Activity added');
    }
  }


  closeDaysDropdown(): void {
    this.showDaysDropdown = false;
  }




  onTransportDayToggle(row: QuoteTransportRow, dayNumber: number): void {
    const index = row.DayNumbers.indexOf(dayNumber);
    if (index > -1) {
      row.DayNumbers.splice(index, 1);
    } else {
      row.DayNumbers.push(dayNumber);
      row.DayNumbers.sort((a, b) => a - b);
    }

    if (row.DayNumbers.length > 0) {
      const firstDay = row.DayNumbers[0];
      const slot = this.daySlots().find(d => d.DayNumber === firstDay);
      row.DayNumber = firstDay;
      if (slot) row.ServiceDate = slot.ServiceDate;
    }

    this.updateTransportDaysDisplay(row);
    this.transportRows.update(rows => [...rows]);

    if (row.LocationId > 0 && row.IteneraryServiceId > 0 && row.VehicleTypeId > 0) {
      this.lookupTransportRate(row);
    }

    // ✅ Sync selected days after toggling
    this.syncSelectedDaysFromTransportRows();
    this.markDirty();
  }

  updateTransportDaysDisplay(row: QuoteTransportRow): void {
    if (row.DayNumbers.length === 0) {
      row.SelectedDaysDisplay = '';
    } else if (row.DayNumbers.length === 1) {
      row.SelectedDaysDisplay = `Day ${row.DayNumbers[0]}`;
    } else {
      row.SelectedDaysDisplay = `${row.DayNumbers.length} days selected`;
    }
  }

  toggleTransportDayDropdown(row: QuoteTransportRow): void {
    row.ShowDayDropdown = !row.ShowDayDropdown;
    this.transportRows.update(rows => [...rows]);
  }

  closeTransportDayDropdown(row: QuoteTransportRow): void {
    row.ShowDayDropdown = false;
    this.transportRows.update(rows => [...rows]);
  }

  // ── Location Search (Per Row) ─────────────────────────────
  onTransportLocationSearch(row: QuoteTransportRow): void {
    const query = (row.LocationSearch ?? '').toLowerCase().trim();
    const locations = this.locationList();

    if (!query) {
      row.FilteredLocations = locations.slice(0, 4);
    } else {
      row.FilteredLocations = locations
        .filter(l => l.LocationName.toLowerCase().includes(query))
        .slice(0, 4);
    }
    row.ShowLocationDropdown = true;
    this.transportRows.update(rows => [...rows]);
  }

  selectTransportLocationRow(row: QuoteTransportRow, loc: any): void {
    row.LocationId = loc.LocationId;
    row.LocationName = loc.LocationName;
    row.LocationSearch = loc.LocationName;
    row.ShowLocationDropdown = false;
    row.FilteredLocations = [];

    // Load services for this location
    this.loadServicesForTransportRow(row, loc.LocationId);
    this.transportRows.update(rows => [...rows]);
    this.markDirty();
  }

  onTransportLocationBlur(row: QuoteTransportRow): void {
    setTimeout(() => {
      row.ShowLocationDropdown = false;
      if (row.LocationId > 0) {
        row.LocationSearch = row.LocationName;
      } else {
        row.LocationSearch = '';
      }
      this.transportRows.update(rows => [...rows]);
    }, 200);
  }

  clearTransportLocationRow(row: QuoteTransportRow): void {
    row.LocationSearch = '';
    row.LocationId = 0;
    row.LocationName = '';
    row.FilteredLocations = [];
    row.ShowLocationDropdown = false;
    this.transportRows.update(rows => [...rows]);
    this.markDirty();
  }

  // ── Service Search (Per Row) ──────────────────────────────
  onTransportServiceSearch(row: QuoteTransportRow): void {

    // No location selected
    if (!row.LocationId) {
      this.toastr.warning('Please select a location first.');
      return;
    }

    const query = (row.ServiceSearch ?? '').toLowerCase().trim();

    // Filter services by selected location
    const services = this.itineraryList()
      .filter(s => s.LocationId === row.LocationId);

    if (!query) {
      row.FilteredServices = services.slice(0, 4);
    } else {
      row.FilteredServices = services
        .filter(s => s.IteneraryServiceName.toLowerCase().includes(query))
        .slice(0, 4);
    }

    // Show warning if no services are available
    if (row.FilteredServices.length === 0) {
      row.ShowServiceDropdown = false;
      this.toastr.warning('No transport service available for this location.');
      return;
    }

    row.ShowServiceDropdown = true;
    this.transportRows.update(rows => [...rows]);
  }

  selectTransportServiceRow(row: QuoteTransportRow, svc: any): void {
    row.IteneraryServiceId = svc.IteneraryServiceId;
    row.IteneraryServiceName = svc.IteneraryServiceName;
    row.ServiceSearch = svc.IteneraryServiceName;
    row.ShowServiceDropdown = false;
    row.FilteredServices = [];

    this.transportRows.update(rows => [...rows]);
    this.markDirty();

    if (row.VehicleTypeId > 0) {
      this.lookupTransportRate(row);
    }
  }

  onTransportServiceBlur(row: QuoteTransportRow): void {
    setTimeout(() => {
      row.ShowServiceDropdown = false;
      if (row.IteneraryServiceId > 0) {
        row.ServiceSearch = row.IteneraryServiceName;
      } else {
        row.ServiceSearch = '';
      }
      this.transportRows.update(rows => [...rows]);
    }, 200);
  }

  clearTransportServiceRow(row: QuoteTransportRow): void {
    row.ServiceSearch = '';
    row.IteneraryServiceId = 0;
    row.IteneraryServiceName = '';
    row.FilteredServices = [];
    row.ShowServiceDropdown = false;
    this.transportRows.update(rows => [...rows]);
    this.markDirty();
  }

  // ── Vehicle Search (Per Row) ──────────────────────────────
  onTransportVehicleSearch(row: QuoteTransportRow): void {
    const query = (row.VehicleSearch ?? '').toLowerCase().trim();

    // Use vehicleTypeList as source
    const vehicles = this.vehicleTypeList();

    if (!query) {
      row.FilteredVehicles = vehicles.slice(0, 6);
    } else {
      row.FilteredVehicles = vehicles
        .filter(v => v.VehicleTypeName.toLowerCase().includes(query))
        .slice(0, 6);
    }

    row.ShowVehicleDropdown = true;
    this.transportRows.update(rows => [...rows]);
  }

  selectTransportVehicleRow(row: QuoteTransportRow, vt: any): void {
    row.VehicleTypeId = vt.VehicleTypeId;
    row.VehicleTypeName = vt.VehicleTypeName;
    row.VehicleSearch = vt.VehicleTypeName;
    row.ShowVehicleDropdown = false;
    row.FilteredVehicles = [];

    this.transportRows.update(rows => [...rows]);
    this.markDirty();

    // Lookup rate if service is selected
    if (row.IteneraryServiceId > 0) {
      this.lookupTransportRate(row);
    }
  }

  onTransportVehicleBlur(row: QuoteTransportRow): void {
    setTimeout(() => {
      row.ShowVehicleDropdown = false;
      if (row.VehicleTypeId > 0) {
        row.VehicleSearch = row.VehicleTypeName;
      } else {
        row.VehicleSearch = '';
      }
      this.transportRows.update(rows => [...rows]);
    }, 200);
  }

  clearTransportVehicleRow(row: QuoteTransportRow): void {
    row.VehicleSearch = '';
    row.VehicleTypeId = 0;
    row.VehicleTypeName = '';
    row.FilteredVehicles = [];
    row.ShowVehicleDropdown = false;
    row.CostPrice = 0;
    row.SellingPrice = 0;
    row.TotalPrice = 0;
    this.transportRows.update(rows => [...rows]);
    this.markDirty();
  }

  // ── Load Services for Transport Row ─────────────────────────
  loadServicesForTransportRow(row: QuoteTransportRow, locationId: number): void {
    if (!locationId) {
      row.FilteredServices = [];
      return;
    }

    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    this.service.getItineraryServicesByLocation(enc({ LocationId: locationId }))
      .subscribe({
        next: (r: any) => {
          if (r.Message === ConstantData.SuccessMessage) {
            row.FilteredServices = r.ItineraryServiceList ?? [];
          } else {
            row.FilteredServices = [];
          }
          this.transportRows.update(rows => [...rows]);
        },
        error: () => {
          row.FilteredServices = [];
          this.transportRows.update(rows => [...rows]);
        }
      });
  }

  // ── Rate Lookup & Price Calculation ───────────────────────
  lookupTransportRate(row: QuoteTransportRow): void {
    if (!row.IteneraryServiceId || !row.VehicleTypeId) return;

    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    const firstDay = row.DayNumbers[0] ?? row.DayNumber;
    const daySlot = this.daySlots().find(d => d.DayNumber === firstDay);

    this.service.getVehicleRateByDate(enc({
      IteneraryServiceId: row.IteneraryServiceId,
      VehicleTypeId: row.VehicleTypeId,
      ServiceDate: daySlot?.ServiceDate || row.ServiceDate,
    })).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage && r.Rate) {
          row.CostPrice = r.Rate.RateAmount ?? 0;
          row.SellingPrice = row.CostPrice;
        } else {
          row.CostPrice = 0;
          row.SellingPrice = 0;
          this.toastr.warning(`No rate found for ${row.VehicleTypeName}`);
        }
        this.recalculateTransportPrice(row);
        this.transportRows.update(rows => [...rows]);
      },
      error: () => {
        this.toastr.error('Error loading vehicle rate');
      }
    });
  }
  recalculateTransportPrice(row: QuoteTransportRow): void {
    const days = row.DayNumbers.length || 1;
    const total = (row.CostPrice || 0) * (row.Qty || 1) * days;
    row.TotalPrice = total;

    // If SellingPrice is not set or less than cost, set to cost
    if (!row.SellingPrice || row.SellingPrice < total) {
      row.SellingPrice = total;
    }

    this.transportRows.update(rows => [...rows]);
  }

  saveTransportRow(row: QuoteTransportRow): void {
    if (!row.LocationId || !row.IteneraryServiceId || !row.VehicleTypeId) return;
    if (row.DayNumbers.length === 0) {
      this.toastr.error('Please select at least one day');
      return;
    }

    row.IsSaving = true;
    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    const firstDay = row.DayNumbers[0];
    const slot = this.daySlots().find(d => d.DayNumber === firstDay);

    this.service.saveQuoteService(enc({
      QuoteServiceId: row.QuoteServiceId,
      QuoteId: this.QuoteId,
      QuotePackageTypeId: row.QuotePackageTypeId,
      DayNumber: firstDay,
      ServiceDate: slot?.ServiceDate || row.ServiceDate,
      ServiceType: 1, // Transport
      IteneraryServiceId: row.IteneraryServiceId,
      VehicleTypeId: row.VehicleTypeId,
      SameCabForAll: row.SameCabForAll,
      Qty: row.Qty,
      CostPrice: row.CostPrice,
      SellingPrice: row.SellingPrice,
      Notes: row.Notes,
    })).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          row.QuoteServiceId = r.QuoteServiceId;
          this.markClean();
        } else {
          this.toastr.error(r.Message);
        }
        row.IsSaving = false;
      },
      error: () => { row.IsSaving = false; }
    });
  }

  removeTransportRow(row: QuoteTransportRow): void {
    this.markDirty();

    if (row.QuoteServiceId > 0) {
      const enc = (d: object): RequestModel => ({
        request: this.local.encrypt(JSON.stringify(d)).toString()
      });
      this.service.deleteQuoteService(enc({ QuoteServiceId: row.QuoteServiceId }))
        .subscribe({
          next: () => {
            this.toastr.success('Transport removed');
            // ✅ Sync after deletion
            this.syncSelectedDaysFromTransportRows();
          },
          error: () => {
            this.toastr.error('Error removing transport');
          }
        });
    }

    this.transportRows.update(rows => rows.filter(r => r !== row));
    // ✅ Sync after removal
    this.syncSelectedDaysFromTransportRows();
  }
  // ── Helper Methods (Like Hotels) ───────────────────────────
  hasSelectedTransportDay(): boolean {
    return this.getActiveTransportRows()
      .some(r => r.DayNumbers && r.DayNumbers.length > 0);
  }

  getNextUnselectedTransportDay(): number | null {
    const allDays = this.daySlots().map(d => d.DayNumber);
    const usedDays = new Set(
      this.getActiveTransportRows().flatMap(r => r.DayNumbers)
    );
    return allDays.find(d => !usedDays.has(d)) ?? null;
  }

  addTransportRowForNextDay(): void {
    const nextDay = this.getNextUnselectedTransportDay();
    if (nextDay === null) return;
    const slot = this.daySlots().find(d => d.DayNumber === nextDay);
    if (slot) this.addTransportRow(slot);
  }

  // ── Similar Transports Modal (Optional) ───────────────────
  showSimilarTransportsModal = false;
  similarTransportSourceRow: QuoteTransportRow | null = null;
  similarTransportRows: QuoteTransportRow[] = [];

  openSimilarTransportsModal(): void {
    const mainTransports = this.getActiveTransportRows();
    if (mainTransports.length === 0) {
      this.toastr.warning('No main transports found. Please add a transport first.');
      return;
    }

    this.similarTransportSourceRow = mainTransports[0];
    this.similarTransportRows = [{
      ...this.createEmptyTransportRow(),
      DayNumbers: [...mainTransports[0].DayNumbers],
      SelectedDaysDisplay: mainTransports[0].SelectedDaysDisplay,
      Qty: mainTransports[0].Qty,
    }];

    this.showSimilarTransportsModal = true;
  }

  createEmptyTransportRow(): QuoteTransportRow {
    const slot = this.daySlots()[0];
    return {
      QuoteServiceId: 0,
      QuoteId: this.QuoteId,
      QuotePackageTypeId: this.activePackageTypeId(),
      DayNumbers: [slot?.DayNumber ?? 1],
      DayNumber: slot?.DayNumber ?? 1,
      ServiceDate: slot?.ServiceDate ?? new Date(),
      LocationId: 0,
      LocationName: '',
      IteneraryServiceId: 0,
      IteneraryServiceName: '',
      VehicleTypeId: 0,
      VehicleTypeName: '',
      SameCabForAll: false,
      Qty: 1,
      CostPrice: 0,
      SellingPrice: 0,
      TotalPrice: 0,
      Notes: '',
      IsSaving: false,
      LocationSearch: '',
      FilteredLocations: [],
      ShowLocationDropdown: false,
      ServiceSearch: '',
      FilteredServices: [],
      ShowServiceDropdown: false,
      VehicleSearch: '',
      FilteredVehicles: [],
      ShowVehicleDropdown: false,
      ShowDayDropdown: false,
      SelectedDaysDisplay: '',
    };
  }

  // ── Edit Transport Prices Modal ───────────────────────────
  showEditTransportPricesModal = false;
  editingTransportRow: QuoteTransportRow | null = null;
  PAX_TYPE_OPTIONS: { value: ActivityPaxType; label: string }[] = [
    { value: 'Adult', label: 'Adult' },
    { value: 'Child', label: 'Child (Above 2 Yrs)' },
    { value: 'ChildBelowTwoYear', label: 'Child (Below 2 Yrs)' },
  ];
  editTransportPrices = {
    VehicleRate: 0,
    SellingPrice: 0,
    ComputedTotal: 0,
  };

  EditTransportPrices(row: QuoteTransportRow): void {
    this.editingTransportRow = row;
    this.editTransportPrices = {
      VehicleRate: row.CostPrice,
      SellingPrice: row.SellingPrice,
      ComputedTotal: row.TotalPrice,
    };
    this.showEditTransportPricesModal = true;
  }

  closeEditTransportPricesModal(): void {
    this.showEditTransportPricesModal = false;
    this.editingTransportRow = null;
  }

  applyEditTransportPrices(): void {
    if (!this.editingTransportRow) return;
    const row = this.editingTransportRow;

    row.CostPrice = this.editTransportPrices.VehicleRate;
    row.SellingPrice = this.editTransportPrices.SellingPrice;
    this.recalculateTransportPrice(row);

    this.transportRows.update(rows => [...rows]);
    this.markDirty();
    this.saveTransportRow(row);
    this.closeEditTransportPricesModal();
  }
  recalculateEditTransportPrice(): void {
    if (!this.editingTransportRow) return;
    const row = this.editingTransportRow;

    // Calculate total: Rate × Qty × Number of days
    const days = row.DayNumbers.length || 1;
    this.editTransportPrices.ComputedTotal =
      (this.editTransportPrices.VehicleRate || 0) * (row.Qty || 1) * days;
  }

  // Get the next available day number (not already selected)
  getNextDayNumber(): number {
    const allDays = this.daySlots().map(d => d.DayNumber);
    const usedDays = new Set(this.selectedDays());

    // Find the next day after the last selected day
    const sortedSelected = [...this.selectedDays()].sort((a, b) => a - b);
    const lastSelected = sortedSelected[sortedSelected.length - 1] || 0;

    // Find the next day number that is not already selected
    for (let day = lastSelected + 1; day <= allDays.length; day++) {
      if (!usedDays.has(day)) {
        return day;
      }
    }

    // If no next day found, return the first unselected day
    for (let day = 1; day <= allDays.length; day++) {
      if (!usedDays.has(day)) {
        return day;
      }
    }

    return 0; // All days are selected
  }

  // Add next day and create transport row for it
  // Add next day and create transport row for it
  addNextDay(): void {
    const nextDay = this.getNextDayNumber();
    if (nextDay === 0) {
      this.toastr.info('All days are already selected');
      return;
    }

    // Add the day to selected days
    const current = [...this.selectedDays()];
    current.push(nextDay);
    current.sort((a, b) => a - b);
    this.selectedDays.set(current);
    this.updateDaysDisplay();

    // Get the day slot
    const daySlot = this.daySlots().find(d => d.DayNumber === nextDay);
    if (!daySlot) return;

    // Check if transport already exists for this day (any transport row)
    const exists = this.transportRows().some(
      r => r.DayNumbers.includes(nextDay)
        && r.QuotePackageTypeId === this.activePackageTypeId()
    );

    if (!exists) {
      // Create a new empty transport row for this day
      this.addTransportRow(daySlot);

      // If Same Cab For All is enabled, apply the selected vehicle to the new row
      if (this.sameCabForAll && this.selectedCabTypes.length > 0) {
        const firstCab = this.selectedCabTypes[0];
        // Find the newly created row
        const newRow = this.transportRows().find(
          r => r.DayNumbers.includes(nextDay)
            && r.QuotePackageTypeId === this.activePackageTypeId()
        );
        if (newRow) {
          newRow.VehicleTypeId = firstCab.VehicleTypeId;
          newRow.VehicleTypeName = firstCab.VehicleTypeName;
          newRow.VehicleSearch = firstCab.VehicleTypeName;
          newRow.Qty = firstCab.Quantity || 1;
          // Lookup rate if service is selected (it won't be yet)
          if (newRow.IteneraryServiceId > 0) {
            this.lookupTransportRate(newRow);
          }
          this.transportRows.update(rows => [...rows]);
        }
      }

      this.toastr.success(`Transport row created for Day ${nextDay}`);
    } else {
      this.toastr.info(`Transport already exists for Day ${nextDay}`);
    }

    // Trigger UI refresh
    this.transportRows.update(rows => [...rows]);
    this.markDirty();
  }
  // Add this method to sync selected days from all transport rows
  syncSelectedDaysFromTransportRows(): void {
    const allDayNumbers = new Set<number>();

    // Collect all DayNumbers from active transport rows
    this.getActiveTransportRows().forEach(row => {
      row.DayNumbers.forEach(day => allDayNumbers.add(day));
    });

    // Convert to sorted array
    const days = Array.from(allDayNumbers).sort((a, b) => a - b);
    this.selectedDays.set(days);
    this.updateDaysDisplay();
  }
  activityTicketRows = signal<ActivityTicketRow[]>([]);
  private activityRowCounter = 0;
  getActiveActivityRows(): ActivityTicketRow[] {
  return this.activityTicketRows();
}

  addActivityTicketRow(): void {
    this.markDirty();
    const newRow: ActivityTicketRow = {
      RowId: ++this.activityRowCounter,
      QuotePackageTypeId: this.activePackageTypeId(),
      LocationId: 0, LocationName: '', LocationSearch: '',
      FilteredLocations: [], ShowLocationDropdown: false,
      ActivityServiceId: 0, ActivityServiceName: '', TicketTypeSearch: '',
      FilteredActivityServices: [], ShowTicketTypeDropdown: false,
      DateRates: [],
      TypeGroups: [],
      Entries: [],
    };
    this.activityTicketRows.update(rows => [...rows, newRow]);
  }

  removeActivityTicketRow(row: ActivityTicketRow): void {
    this.markDirty();
    const enc = (d: object): RequestModel => ({ request: this.local.encrypt(JSON.stringify(d)).toString() });
    row.Entries.forEach(e => {
      if (e.QuoteServiceId > 0) {
        this.service.deleteQuoteService(enc({ QuoteServiceId: e.QuoteServiceId })).subscribe({ next: () => { } });
      }
    });
    this.activityTicketRows.update(rows => rows.filter(r => r !== row));
  }

  // ── Name (Location) search ──────────────────────────────
  onActivityLocationSearch(row: ActivityTicketRow): void {
    const query = (row.LocationSearch ?? '').toLowerCase().trim();
    const locations = this.locationList();
    row.FilteredLocations = !query
      ? locations.slice(0, 6)
      : locations.filter(l => l.LocationName.toLowerCase().includes(query)).slice(0, 6);
    row.ShowLocationDropdown = true;
    this.activityTicketRows.update(rows => [...rows]);
  }

  selectActivityLocation(row: ActivityTicketRow, loc: any): void {
    row.LocationId = loc.LocationId;
    row.LocationName = loc.LocationName;
    row.LocationSearch = loc.LocationName;
    row.ShowLocationDropdown = false;
    row.FilteredLocations = [];
    row.ActivityServiceId = 0;
    row.ActivityServiceName = '';
    row.TicketTypeSearch = '';
    row.Entries = [];
    this.activityTicketRows.update(rows => [...rows]);
    this.markDirty();
  }

  onActivityLocationBlur(row: ActivityTicketRow): void {
    setTimeout(() => {
      row.ShowLocationDropdown = false;
      row.LocationSearch = row.LocationId > 0 ? row.LocationName : '';
      this.activityTicketRows.update(rows => [...rows]);
    }, 200);
  }

  clearActivityLocation(row: ActivityTicketRow): void {
    row.LocationId = 0; row.LocationName = ''; row.LocationSearch = '';
    row.FilteredLocations = []; row.ShowLocationDropdown = false;
    row.ActivityServiceId = 0; row.ActivityServiceName = ''; row.TicketTypeSearch = '';
    row.Entries = [];
    this.activityTicketRows.update(rows => [...rows]);
    this.markDirty();
  }

  // ── Ticket/Package Type (ActivityService, filtered by LocationId) ──
  onActivityTypeSearch(row: ActivityTicketRow): void {

    // User hasn't selected a location yet
    if (!row.LocationId) {
      this.toastr.warning('Please select a location first.');
      return;
    }

    const search = (row.TicketTypeSearch ?? '').toLowerCase().trim();

    // Filter services for selected location
    row.FilteredActivityServices = this.activityList()
      .filter(x =>
        x.LocationId === row.LocationId &&
        x.ActivityServiceName.toLowerCase().includes(search)
      );

    // 👇 ADD THIS HERE
    if (row.FilteredActivityServices.length === 0) {
      row.ShowTicketTypeDropdown = false;
      this.toastr.warning('No Ticket/Package Type available for this location.');
      return;
    }

    row.ShowTicketTypeDropdown = true;
  }

  selectActivityType(row: ActivityTicketRow, svc: any, group?: DayGroup): void {
    row.ActivityServiceId = svc.ActivityServiceId;
    row.ActivityServiceName = svc.ActivityServiceName;
    row.TicketTypeSearch = svc.ActivityServiceName;
    row.ShowTicketTypeDropdown = false;
    row.FilteredActivityServices = [];

    row.DateRates = [];
    row.TypeGroups = [];
    row.Entries = [];

    this.markDirty();

    if (group) {
      this.loadDateRatesForGroupDays(row, group.DayNumbers);
    } else {
      this.loadDateRates(row); // fallback, unused once template is updated
    }
  }

  onActivityTypeBlur(row: ActivityTicketRow): void {
    setTimeout(() => {
      row.ShowTicketTypeDropdown = false;
      row.TicketTypeSearch = row.ActivityServiceId > 0 ? row.ActivityServiceName : '';
      this.activityTicketRows.update(rows => [...rows]);
    }, 200);
  }

  clearActivityType(row: ActivityTicketRow): void {
    row.ActivityServiceId = 0; row.ActivityServiceName = ''; row.TicketTypeSearch = '';
    row.FilteredActivityServices = []; row.ShowTicketTypeDropdown = false;
    row.Entries = [];
    this.activityTicketRows.update(rows => [...rows]);
    this.markDirty();
  }

  // ── Per-day ticket entries ──────────────────────────────
  populateActivityEntries(row: ActivityTicketRow): void {
    if (row.Entries.length > 0) {
      row.Entries.forEach(e => this.lookupActivityRate(row, e));
      return;
    }
    row.Entries = this.daySlots().map(s => ({
      QuoteServiceId: 0,
      DayNumber: s.DayNumber,
      ServiceDate: s.ServiceDate,
      Qty: 1,
      Rate: 0,
      GivenPrice: 0,
      IsSaving: false,
    }));
    row.Entries.forEach(e => this.lookupActivityRate(row, e));
    this.activityTicketRows.update(rows => [...rows]);
  }

  lookupActivityRate(row: ActivityTicketRow, entry: ActivityTicketEntry): void {
    if (!row.ActivityServiceId) return;
    const enc = (d: object): RequestModel => ({ request: this.local.encrypt(JSON.stringify(d)).toString() });
    this.service.getActivityRateByDate(enc({
      ActivityServiceId: row.ActivityServiceId,
      ServiceDate: this.formatDate(entry.ServiceDate),
    })).subscribe({
      next: (r: any) => {
        entry.Rate = (r.Message === ConstantData.SuccessMessage && r.Rate) ? (r.Rate.AdultRate ?? 0) : 0;
        if (!entry.GivenPrice) entry.GivenPrice = entry.Rate;
        this.activityTicketRows.update(rows => [...rows]);
      }
    });
  }

  addActivityEntryRow(row: ActivityTicketRow): void {
    if (!row.ActivityServiceId) {
      this.toastr.error('Select a ticket/package type first');
      return;
    }
    const usedDays = new Set(row.Entries.map(e => e.DayNumber));
    const nextSlot = this.daySlots().find(s => !usedDays.has(s.DayNumber)) ?? this.daySlots()[this.daySlots().length - 1];
    const newEntry: ActivityTicketEntry = {
      QuoteServiceId: 0,
      DayNumber: nextSlot?.DayNumber ?? row.Entries.length + 1,
      ServiceDate: nextSlot?.ServiceDate ?? new Date(),
      Qty: 1, Rate: 0, GivenPrice: 0, IsSaving: false,
    };
    row.Entries.push(newEntry);
    this.lookupActivityRate(row, newEntry);
    this.activityTicketRows.update(rows => [...rows]);
    this.markDirty();
  }

  removeActivityEntryRow(row: ActivityTicketRow, entry: ActivityTicketEntry): void {
    this.markDirty();
    if (entry.QuoteServiceId > 0) {
      const enc = (d: object): RequestModel => ({ request: this.local.encrypt(JSON.stringify(d)).toString() });
      this.service.deleteQuoteService(enc({ QuoteServiceId: entry.QuoteServiceId })).subscribe({ next: () => { } });
    }
    row.Entries = row.Entries.filter(e => e !== entry);
    this.activityTicketRows.update(rows => [...rows]);
  }





  formatDayDate(d: Date): string {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }
  // ── Master rate, fetched once per day for the whole row (covers all pax types) ──
  loadDateRates(row: ActivityTicketRow): void {
    if (!row.ActivityServiceId) return;

    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    const slots = this.daySlots();

    // Initialize DateRates array with ALL days
    row.DateRates = slots.map(s => ({
      DayNumber: s.DayNumber,
      ServiceDate: s.ServiceDate,
      AdultRate: 0,
      ChildAboveTwoYear: 0,
      ChildBelowTwoYear: 0,
    }));

    let completedRequests = 0;
    const totalRequests = slots.length;

    // Fetch rates for ALL days
    slots.forEach((s, idx) => {
      this.service.getActivityRateByDate(enc({
        ActivityServiceId: row.ActivityServiceId,
        ServiceDate: this.formatDate(s.ServiceDate),
      })).subscribe({
        next: (r: any) => {
          const dr = row.DateRates[idx];

          if (r.Message === ConstantData.SuccessMessage && r.Rate) {
            // Populate ALL THREE rates from the response
            dr.AdultRate = r.Rate.AdultRate ?? 0;
            dr.ChildAboveTwoYear = r.Rate.ChildAboveTwoYear ?? 0;
            dr.ChildBelowTwoYear = r.Rate.ChildBelowTwoYear ?? 0;

            console.log(`Rates for Day ${dr.DayNumber}:`, {
              Adult: dr.AdultRate,
              ChildAbove2: dr.ChildAboveTwoYear,
              ChildBelow2: dr.ChildBelowTwoYear
            });
          } else {
            console.warn(`No rate found for day ${s.DayNumber}:`, r.Message);
          }

          completedRequests++;

          // When ALL requests complete, update the UI
          if (completedRequests === totalRequests) {
            // Update any existing TypeGroups with the new rates
            row.TypeGroups.forEach(group => {
              if (group.PaxType) {
                group.Entries.forEach(entry => {
                  const dateRate = row.DateRates.find(d => d.DayNumber === entry.DayNumber);
                  if (dateRate) {
                    entry.Rate = this.resolveRateForType(dateRate, group.PaxType);
                    // Don't override if user has manually set a price
                    if (!entry.GivenPrice || entry.GivenPrice === 0) {
                      entry.GivenPrice = entry.Rate;
                    }
                  }
                });
              }
            });

            // If no TypeGroups exist AND we have rates, create default groups
            if (row.TypeGroups.length === 0 && row.DateRates.length > 0) {
              this.addDefaultTypeGroups(row);
            }

            this.activityTicketRows.update(rows => [...rows]);
            this.markDirty();
          }
        },
        error: (err) => {
          console.error(`Error loading rate for day ${s.DayNumber}:`, err);
          completedRequests++;

          if (completedRequests === totalRequests) {
            this.activityTicketRows.update(rows => [...rows]);
          }
        }
      });
    });
  }

  resolveRateForType(dr: ActivityDateRate, type: ActivityPaxType | ''): number {
    if (!dr) return 0;

    // Match the exact field names from your database
    switch (type) {
      case 'Adult':
        return dr.AdultRate ?? 0;
      case 'Child':
        // This maps to ChildAboveTwoYear from your database
        return dr.ChildAboveTwoYear ?? 0;
      case 'ChildBelowTwoYear':
        return dr.ChildBelowTwoYear ?? 0;
      default:
        return 0;
    }
  }

  // ── Type groups ───────────────────────────────────────────
  addTypeGroup(row: ActivityTicketRow): void {
    if (!row.ActivityServiceId) {
      this.toastr.error('Select a ticket/package type first');
      return;
    }
    const group: ActivityTypeGroup = {
      GroupId: ++this.activityRowCounter,
      PaxType: '', PaxTypeLabel: '', TypeSearch: '', ShowTypeDropdown: false,
      Qty: 1,
      Entries: row.DateRates.map(dr => ({
        QuoteServiceId: 0, DayNumber: dr.DayNumber, ServiceDate: dr.ServiceDate,
        Qty: 1, Rate: 0, GivenPrice: 0, IsSaving: false,
      })),
    };
    row.TypeGroups.push(group);
    this.activityTicketRows.update(rows => [...rows]);
    this.markDirty();
  }

  removeTypeGroup(row: ActivityTicketRow, group: ActivityTypeGroup): void {
    this.markDirty();
    const enc = (d: object): RequestModel => ({ request: this.local.encrypt(JSON.stringify(d)).toString() });
    group.Entries.forEach(e => {
      if (e.QuoteServiceId > 0) {
        this.service.deleteQuoteService(enc({ QuoteServiceId: e.QuoteServiceId })).subscribe({ next: () => { } });
      }
    });
    row.TypeGroups = row.TypeGroups.filter(g => g !== group);
    this.activityTicketRows.update(rows => [...rows]);
  }

  onTypeSearch(group: ActivityTypeGroup): void {
    group.ShowTypeDropdown = true;
    this.activityTicketRows.update(rows => [...rows]);
  }

  selectPaxType(row: ActivityTicketRow, group: ActivityTypeGroup, type: ActivityPaxType, label: string): void {
    group.PaxType = type;
    group.PaxTypeLabel = label;
    group.TypeSearch = label;
    group.ShowTypeDropdown = false;

    // Update rates for ALL entries in this group
    group.Entries.forEach(e => {
      const dr = row.DateRates.find(d => d.DayNumber === e.DayNumber);
      if (dr) {
        const resolvedRate = this.resolveRateForType(dr, type);
        e.Rate = resolvedRate;
        // Only set GivenPrice if not manually set or zero
        if (!e.GivenPrice || e.GivenPrice === 0) {
          e.GivenPrice = resolvedRate;
        }
      }
    });

    this.activityTicketRows.update(rows => [...rows]);
    this.markDirty();
  }

  onTypeBlur(group: ActivityTypeGroup): void {
    setTimeout(() => {
      group.ShowTypeDropdown = false;
      group.TypeSearch = group.PaxTypeLabel;
      this.activityTicketRows.update(rows => [...rows]);
    }, 200);
  }

  onGroupQtyChange(row: ActivityTicketRow, group: ActivityTypeGroup): void {
    // Sync Qty to all entries in this group
    group.Entries.forEach(entry => {
      entry.Qty = group.Qty;
    });
    this.markDirty();
    this.activityTicketRows.update(rows => [...rows]);
  }

  onActivityEntryChange(row: ActivityTicketRow): void {
    this.markDirty();
    this.activityTicketRows.update(rows => [...rows]);
  }

  saveActivityEntry(row: ActivityTicketRow, group: ActivityTypeGroup, entry: ActivityTicketEntry): void {
    if (!row.ActivityServiceId || !group.PaxType) return;
    entry.IsSaving = true;
    const enc = (d: object): RequestModel => ({ request: this.local.encrypt(JSON.stringify(d)).toString() });
    this.service.saveQuoteService(enc({
      QuoteServiceId: entry.QuoteServiceId,
      QuoteId: this.QuoteId,
      QuotePackageTypeId: row.QuotePackageTypeId,
      DayNumber: entry.DayNumber,
      ServiceDate: this.formatDate(entry.ServiceDate),
      ServiceType: 2,
      ActivityServiceId: row.ActivityServiceId,
      Qty: group.Qty,
      Notes: group.PaxTypeLabel,
      CostPrice: (entry.Rate || 0) * (group.Qty || 1),
      SellingPrice: (entry.GivenPrice || 0) * (group.Qty || 1),
    })).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          entry.QuoteServiceId = r.QuoteServiceId;
          this.markClean();
        } else {
          this.toastr.error(r.Message);
        }
        entry.IsSaving = false;
      },
      error: () => { entry.IsSaving = false; }
    });
  }

  getActivityRowTotal(row: ActivityTicketRow): number {
    // Calculate total from TypeGroups
    return row.TypeGroups.reduce((sum, g) =>
      sum + g.Entries.reduce((s, e) => s + (e.GivenPrice || 0) * (g.Qty || 1), 0), 0);
  }
  addDefaultTypeGroups(row: ActivityTicketRow): void {
    if (!row.ActivityServiceId || row.DateRates.length === 0) {
      console.warn('Cannot create default groups: No activity or date rates');
      return;
    }

    console.log('Creating default groups with rates:', row.DateRates);

    // Group 1: Adult
    const adultGroup: ActivityTypeGroup = {
      GroupId: ++this.activityRowCounter,
      PaxType: 'Adult',
      PaxTypeLabel: 'Adult',
      TypeSearch: 'Adult',
      ShowTypeDropdown: false,
      Qty: 1,
      Entries: row.DateRates.map(dr => ({
        QuoteServiceId: 0,
        DayNumber: dr.DayNumber,
        ServiceDate: dr.ServiceDate,
        Qty: 1,
        Rate: dr.AdultRate || 0,
        GivenPrice: dr.AdultRate || 0,
        IsSaving: false,
      })),
    };

    // Group 2: Child (Above 2 Yrs) - maps to ChildAboveTwoYear
    const childAboveGroup: ActivityTypeGroup = {
      GroupId: ++this.activityRowCounter,
      PaxType: 'Child',
      PaxTypeLabel: 'Child (Above 2 Yrs)',
      TypeSearch: 'Child (Above 2 Yrs)',
      ShowTypeDropdown: false,
      Qty: 1,
      Entries: row.DateRates.map(dr => ({
        QuoteServiceId: 0,
        DayNumber: dr.DayNumber,
        ServiceDate: dr.ServiceDate,
        Qty: 1,
        Rate: dr.ChildAboveTwoYear || 0,
        GivenPrice: dr.ChildAboveTwoYear || 0,
        IsSaving: false,
      })),
    };

    // Group 3: Child (Below 2 Yrs) - maps to ChildBelowTwoYear
    const childBelowGroup: ActivityTypeGroup = {
      GroupId: ++this.activityRowCounter,
      PaxType: 'ChildBelowTwoYear',
      PaxTypeLabel: 'Child (Below 2 Yrs)',
      TypeSearch: 'Child (Below 2 Yrs)',
      ShowTypeDropdown: false,
      Qty: 1,
      Entries: row.DateRates.map(dr => ({
        QuoteServiceId: 0,
        DayNumber: dr.DayNumber,
        ServiceDate: dr.ServiceDate,
        Qty: 1,
        Rate: dr.ChildBelowTwoYear || 0,
        GivenPrice: dr.ChildBelowTwoYear || 0,
        IsSaving: false,
      })),
    };

    // Set all three groups
    row.TypeGroups = [adultGroup, childAboveGroup, childBelowGroup];
    this.activityTicketRows.update(rows => [...rows]);
    this.markDirty();

    console.log('Default groups created successfully');
  }


  // ── Day Groups (parent entity) ─────────────────────────────
getActiveDayGroups(): DayGroup[] {
  return this.dayGroups();
}

  getNextUnusedDay(): number | null {
    const allDays = this.daySlots().map(d => d.DayNumber);
    const usedDays = new Set(this.getActiveDayGroups().flatMap(g => g.DayNumbers));
    return allDays.find(d => !usedDays.has(d)) ?? null;
  }

  updateDayGroupDisplay(group: DayGroup): void {
    group.SelectedDaysDisplay = group.DayNumbers.length === 0 ? ''
      : group.DayNumbers.length === 1 ? `Day ${group.DayNumbers[0]}`
        : `${group.DayNumbers.length} days selected`;
  }

  // Creates a brand-new, fully independent group. Used both for "Add Day" (empty trip)
  // and "Next Day" (finalizes current group, starts a new one with the next free day).
  addDayGroup(): void {
  const nextDay = this.getNextUnusedDay();
  const group: DayGroup = {
    GroupId: ++this.dayGroupCounter,
    QuotePackageTypeId: 0, // Set to 0 or remove this field
    DayNumbers: nextDay !== null ? [nextDay] : [],
    ShowDayDropdown: false,
    SelectedDaysDisplay: '',
    TransportRows: [],
    ActivityRows: [],
  };
  this.updateDayGroupDisplay(group);
  this.dayGroups.update(groups => [...groups, group]);

  this.addTransportRowToGroup(group);
  this.addActivityRowToGroup(group);

  this.markDirty();
}

  removeDayGroup(group: DayGroup): void {
    this.markDirty();
    group.TransportRows.forEach(row => this.removeTransportRowFromGroup(group, row, false));
    group.ActivityRows.forEach(row => this.removeActivityRowFromGroup(group, row, false));
    this.dayGroups.update(groups => groups.filter(g => g !== group));
  }

  toggleDayGroupDayDropdown(group: DayGroup): void {
    group.ShowDayDropdown = !group.ShowDayDropdown;
    this.dayGroups.update(groups => [...groups]);
  }

  closeDayGroupDayDropdown(group: DayGroup): void {
    group.ShowDayDropdown = false;
    this.dayGroups.update(groups => [...groups]);
  }

  // Toggling a day here propagates to EVERY Transport/Activity row already inside this group
  onDayGroupDayToggle(group: DayGroup, dayNumber: number): void {
    const idx = group.DayNumbers.indexOf(dayNumber);
    if (idx > -1) {
      group.DayNumbers.splice(idx, 1);
    } else {
      group.DayNumbers.push(dayNumber);
      group.DayNumbers.sort((a, b) => a - b);
    }
    this.updateDayGroupDisplay(group);
    this.syncGroupDaysToRows(group);
    this.dayGroups.update(groups => [...groups]);
    this.markDirty();
  }

  // Push the group's current DayNumbers onto every row it owns
  syncGroupDaysToRows(group: DayGroup): void {
    group.TransportRows.forEach(row => {
      row.DayNumbers = [...group.DayNumbers];
      row.DayNumber = group.DayNumbers[0] ?? row.DayNumber;
      const slot = this.daySlots().find(d => d.DayNumber === row.DayNumber);
      if (slot) row.ServiceDate = slot.ServiceDate;
      this.updateTransportDaysDisplay(row);
      if (row.LocationId > 0 && row.IteneraryServiceId > 0 && row.VehicleTypeId > 0) {
        this.lookupTransportRate(row);
      }
    });

    group.ActivityRows.forEach(row => {
      if (row.ActivityServiceId) {
        this.loadDateRatesForGroupDays(row, group.DayNumbers);
      }
    });

    this.dayGroups.update(groups => [...groups]);
  }

  // ── Transport rows scoped to ONE group ─────────────────────
  addTransportRowToGroup(group: DayGroup): void {
  this.markDirty();
  const firstDay = group.DayNumbers[0] ?? this.daySlots()[0]?.DayNumber ?? 1;
  const slot = this.daySlots().find(d => d.DayNumber === firstDay) ?? this.daySlots()[0];
  const prefillVehicle = this.sameCabForAll && this.selectedCabTypes.length > 0 ? this.selectedCabTypes[0] : null;

  const newRow: QuoteTransportRow = {
    QuoteServiceId: 0,
    QuoteId: this.QuoteId,
    QuotePackageTypeId: 0, // Set to 0
    DayNumbers: [...group.DayNumbers],
    DayNumber: firstDay,
    ServiceDate: slot?.ServiceDate ?? new Date(),
    LocationId: 0, LocationName: '',
    IteneraryServiceId: 0, IteneraryServiceName: '',
    VehicleTypeId: prefillVehicle?.VehicleTypeId ?? 0,
    VehicleTypeName: prefillVehicle?.VehicleTypeName ?? '',
    SameCabForAll: this.sameCabForAll,
    Qty: prefillVehicle?.Quantity ?? 1,
    CostPrice: 0, SellingPrice: 0, TotalPrice: 0, Notes: '', IsSaving: false,
    LocationSearch: '', FilteredLocations: [], ShowLocationDropdown: false,
    ServiceSearch: '', FilteredServices: [], ShowServiceDropdown: false,
    VehicleSearch: prefillVehicle?.VehicleTypeName ?? '', FilteredVehicles: [], ShowVehicleDropdown: false,
    ShowDayDropdown: false, SelectedDaysDisplay: group.SelectedDaysDisplay,
  };

  group.TransportRows = [...group.TransportRows, newRow];
  this.dayGroups.update(groups => [...groups]);
}

  removeTransportRowFromGroup(group: DayGroup, row: QuoteTransportRow, refresh: boolean = true): void {
    this.markDirty();
    if (row.QuoteServiceId > 0) {
      const enc = (d: object): RequestModel => ({ request: this.local.encrypt(JSON.stringify(d)).toString() });
      this.service.deleteQuoteService(enc({ QuoteServiceId: row.QuoteServiceId })).subscribe({ next: () => { } });
    }
    group.TransportRows = group.TransportRows.filter(r => r !== row);
    if (refresh) this.dayGroups.update(groups => [...groups]);
  }

  // ── Activity rows scoped to ONE group ──────────────────────
  addActivityRowToGroup(group: DayGroup): void {
    this.markDirty();
    const newRow: ActivityTicketRow = {
      RowId: ++this.activityRowCounter,
      QuotePackageTypeId: group.QuotePackageTypeId,
      LocationId: 0, LocationName: '', LocationSearch: '',
      FilteredLocations: [], ShowLocationDropdown: false,
      ActivityServiceId: 0, ActivityServiceName: '', TicketTypeSearch: '',
      FilteredActivityServices: [], ShowTicketTypeDropdown: false,
      DateRates: [], TypeGroups: [], Entries: [],
    };
    group.ActivityRows = [...group.ActivityRows, newRow];
    this.dayGroups.update(groups => [...groups]);
  }

  removeActivityRowFromGroup(group: DayGroup, row: ActivityTicketRow, refresh: boolean = true): void {
    this.markDirty();
    const enc = (d: object): RequestModel => ({ request: this.local.encrypt(JSON.stringify(d)).toString() });
    row.Entries.forEach(e => {
      if (e.QuoteServiceId > 0) {
        this.service.deleteQuoteService(enc({ QuoteServiceId: e.QuoteServiceId })).subscribe({ next: () => { } });
      }
    });
    group.ActivityRows = group.ActivityRows.filter(r => r !== row);
    if (refresh) this.dayGroups.update(groups => [...groups]);
  }

  // Variant of loadDateRates restricted to a group's current days
  loadDateRatesForGroupDays(row: ActivityTicketRow, dayNumbers: number[]): void {
    if (!row.ActivityServiceId) return;
    const enc = (d: object): RequestModel => ({ request: this.local.encrypt(JSON.stringify(d)).toString() });
    const slots = this.daySlots().filter(s => dayNumbers.includes(s.DayNumber));

    row.DateRates = slots.map(s => ({
      DayNumber: s.DayNumber, ServiceDate: s.ServiceDate,
      AdultRate: 0, ChildAboveTwoYear: 0, ChildBelowTwoYear: 0,
    }));

    if (slots.length === 0) {
      row.TypeGroups = [];
      this.dayGroups.update(groups => [...groups]);
      return;
    }

    let completed = 0;
    const total = slots.length;

    slots.forEach((s, idx) => {
      this.service.getActivityRateByDate(enc({
        ActivityServiceId: row.ActivityServiceId,
        ServiceDate: this.formatDate(s.ServiceDate),
      })).subscribe({
        next: (r: any) => {
          const dr = row.DateRates[idx];
          if (r.Message === ConstantData.SuccessMessage && r.Rate) {
            dr.AdultRate = r.Rate.AdultRate ?? 0;
            dr.ChildAboveTwoYear = r.Rate.ChildAboveTwoYear ?? 0;
            dr.ChildBelowTwoYear = r.Rate.ChildBelowTwoYear ?? 0;
          }
          completed++;
          if (completed === total) {
            row.TypeGroups.forEach(tg => {
              tg.Entries = row.DateRates.map(d => {
                const existing = tg.Entries.find(e => e.DayNumber === d.DayNumber);
                return existing ?? {
                  QuoteServiceId: 0, DayNumber: d.DayNumber, ServiceDate: d.ServiceDate,
                  Qty: 0, Rate: 0, GivenPrice: 0, IsSaving: false,
                };
              });
              tg.Entries.forEach(e => {
                const dr2 = row.DateRates.find(d => d.DayNumber === e.DayNumber);
                if (dr2 && tg.PaxType) {
                  e.Rate = this.resolveRateForType(dr2, tg.PaxType);
                  if (!e.GivenPrice) e.GivenPrice = e.Rate;
                }
              });
            });
            if (row.TypeGroups.length === 0) this.addDefaultTypeGroups(row);
            this.dayGroups.update(groups => [...groups]);
            this.markDirty();
          }
        },
        error: () => {
          completed++;
          if (completed === total) this.dayGroups.update(groups => [...groups]);
        }
      });
    });
  }
  // Add this method to get active activity rows (you already have this)


  // Add this method to check if an activity row has entries for a specific day
  hasActivityForDay(row: ActivityTicketRow, dayNumber: number): boolean {
    return row.TypeGroups.some(g =>
      g.Entries.some(e => e.DayNumber === dayNumber && e.GivenPrice > 0)
    );
  }

  // Add this method to get activity entries for a specific day
  getActivityEntriesForDay(
    row: ActivityTicketRow,
    dayNumber: number
  ): { group: ActivityTypeGroup; entry: ActivityTicketEntry }[] {
    const result: { group: ActivityTypeGroup; entry: ActivityTicketEntry }[] = [];
    row.TypeGroups.forEach(group => {
      group.Entries.forEach(entry => {
        if (entry.DayNumber === dayNumber && entry.GivenPrice > 0) {
          result.push({ group, entry });
        }
      });
    });
    return result;
  }

  // Add this method to get transport rows for a specific day
  getTransportRowsForDayGroup(dayNumber: number): QuoteTransportRow[] {
  const rows: QuoteTransportRow[] = [];

  // Check standalone transportRows signal - REMOVE package type filter
  this.transportRows()
    .filter(r => r.DayNumbers.includes(dayNumber) && (r.LocationId > 0 || r.IteneraryServiceId > 0))
    .forEach(r => rows.push(r));

  // Also check inside dayGroups - REMOVE package type filter
  this.getActiveDayGroups().forEach(group => {
    if (group.DayNumbers.includes(dayNumber)) {
      group.TransportRows
        .filter(r => r.LocationId > 0 || r.IteneraryServiceId > 0)
        .forEach(r => rows.push(r));
    }
  });

  return rows;
}

  // Enhanced method to get all services for a day (including day groups)
  getAllServicesForDay(dayNumber: number): (QuoteServiceRow | QuoteTransportRow | { type: 'activity', row: ActivityTicketRow, group: ActivityTypeGroup, entry: ActivityTicketEntry })[] {
    const result: any[] = [];

    // Get transport rows from day groups
    const transportRows = this.getTransportRowsForDayGroup(dayNumber);
    transportRows.forEach(row => {
      result.push({ type: 'transport', data: row });
    });

    // Get activity rows from day groups
    const activityRows = this.getActiveActivityRows();
    activityRows.forEach(row => {
      const entries = this.getActivityEntriesForDay(row, dayNumber);
      entries.forEach(({ group, entry }) => {
        result.push({ type: 'activity', row, group, entry });
      });
    });

    // Get legacy service rows
    const services = this.getSummaryServicesByDay(dayNumber);
    services.forEach(svc => {
      result.push({ type: 'service', data: svc });
    });

    return result;
  }

  // Get the day label for display (e.g., "1st Day")
  getDayOrdinalLabel(dayNumber: number): string {
    const suffix = dayNumber === 1 ? 'st' : dayNumber === 2 ? 'nd' : dayNumber === 3 ? 'rd' : 'th';
    return `${dayNumber}${suffix} Day`;
  }
  getDayActivityTotal(dayNumber: number): number {
    let total = 0;
    const activityRows = this.getActiveActivityRows();
    activityRows.forEach(row => {
      row.TypeGroups.forEach(group => {
        group.Entries.forEach(entry => {
          if (entry.DayNumber === dayNumber && entry.GivenPrice > 0) {
            total += entry.GivenPrice * group.Qty;
          }
        });
      });
    });
    return total;
  }

  getDayTransportTotal(dayNumber: number): number {
    let total = 0;
    const transportRows = this.getTransportRowsForDayGroup(dayNumber);
    transportRows.forEach(row => {
      total += row.SellingPrice || row.TotalPrice || 0;
    });
    // Also include legacy services
    const services = this.getSummaryServicesByDay(dayNumber);
    services.forEach(svc => {
      if (svc.ServiceType === 1) {
        total += svc.SellingPrice || 0;
      }
    });
    return total;
  }

  // ── Quill editor config ───────────────────────────────────────────────
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ['clean'],
    ],
  };
  getSanitizedRemarks(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.customerRemarks || '');
  }

  // Add these properties
  excludeTransportCharges = false;
  excludeTransportCount = 1;
  taxAppliedOn = 'gst';
  roundingValue = 0;
  // ── Pricing Strategy ──────────────────────────────────────
  // Replace existing loose properties with these:
  pricingStrategy: 'per-person' | 'overall' = 'per-person';
  sellingCurrency = 'INR';
  markupType: 'percentage' | 'fixed' = 'fixed';
  markupAmount = 0;
  gstEnabled = true;
  roundingMode: 'none' | '1' | '10' | '100' = 'none';
  remarksTab: 'write' | 'preview' = 'write';
  customerRemarks = '';
  totalFOC = 0;

  // ── Guest counts ──────────────────────────────────────────
  totalGuestCount(): number {
    return (this.tripInfo()?.NoOfAdults || 0) + this.childrenCount;
  }

  payingGuestCount(): number {
    return Math.max(0, this.totalGuestCount() - (this.totalFOC || 0));
  }

  // ── Pricing calculations ──────────────────────────────────
  markupValue(): number {
    const cost = this.totalCost();
    if (this.markupType === 'percentage') {
      return Math.round(cost * (this.markupAmount || 0) / 100);
    }
    return this.markupAmount || 0;
  }

  taxableAmount(): number {
    return this.totalCost() + this.markupValue();
  }

  computedGstAmount(): number {
    if (!this.gstEnabled) return 0;
    return Math.round(this.taxableAmount() * (this.gstPercent || 0) / 100);
  }

  rawFinalPrice(): number {
    return this.taxableAmount() + this.computedGstAmount();
  }

  finalSellingPrice(): number {
    const raw = this.rawFinalPrice();
    switch (this.roundingMode) {
      case '1': return Math.round(raw);
      case '10': return Math.round(raw / 10) * 10;
      case '100': return Math.round(raw / 100) * 100;
      default: return raw;
    }
  }

  perPayingGuestPrice(): number {
    const paying = this.payingGuestCount();
    if (paying <= 0) return 0;
    return Math.round(this.finalSellingPrice() / paying);
  }

  onFOCChange(): void {
    const maxFOC = this.totalGuestCount();
    if ((this.totalFOC || 0) > maxFOC) {
      this.totalFOC = maxFOC;
      this.toastr.error(`FOC cannot exceed total guests (${maxFOC})`);
      return;
    }
    if (this.payingGuestCount() <= 0) {
      this.totalFOC = maxFOC - 1;
      this.toastr.error('At least one paying guest is required.');
    }
    this.markDirty();
  }

  perPersonHotel(): number {
    const p = this.payingGuestCount();
    return p > 0 ? Math.round(this.hotelTotal() / p) : 0;
  }

  perPersonTransport(): number {
    const p = this.payingGuestCount();
    return p > 0 ? Math.round(this.transportTotal() / p) : 0;
  }

  perPersonActivity(): number {
    const p = this.payingGuestCount();
    return p > 0 ? Math.round(this.activityTotal() / p) : 0;
  }

  perPersonTotal(): number {
    const p = this.payingGuestCount();
    return p > 0 ? Math.round(this.totalCost() / p) : 0;
  }


  // Add these methods
  getPaxCount(): number {
    const trip = this.tripInfo();
    if (!trip) return 2; // Default
    return trip.NoOfAdults || 2;
  }

  totalAdults(): number {
    const trip = this.tripInfo();
    return trip?.NoOfAdults || 2;
  }

  getPackageName(): string {
    const pkg = this.packageTypes().find(p => p.QuotePackageTypeId === this.activePackageTypeId());
    return pkg?.PackageTypeName || 'Standard Package';
  }

 hasAnyTransportOrActivity(): boolean {
  return this.getActiveTransportRows().length > 0 ||
    this.getActiveActivityRows().length > 0 ||
    this.getActiveDayGroups().some(group => group.TransportRows.length > 0 || group.ActivityRows.length > 0);
}

  getDayItems(dayNumber: number): any[] {
  const items: any[] = [];

  // Transport from standalone rows - REMOVE package type filter
  const transportRows = this.getTransportRowsForDayGroup(dayNumber);
  transportRows.forEach(row => {
    items.push({
      id: `t-${row.QuoteServiceId}-${row.DayNumber}`,
      location: row.LocationName || '—',
      serviceName: row.IteneraryServiceName || 'Transport Service',
      detail: row.VehicleTypeName || 'Vehicle',
      quantity: row.Qty || 1,
      price: row.SellingPrice || row.TotalPrice || 0,
      breakdown: row.CostPrice > 0
        ? `${this.formatCurrency(row.CostPrice)} × ${row.Qty}`
        : undefined,
    });
  });

  // Activities from standalone activityTicketRows - REMOVE package type filter
  this.getActiveActivityRows().forEach(row => {
    this.getActivityEntriesForDay(row, dayNumber).forEach(({ group, entry }) => {
      items.push({
        id: `at-${row.RowId}-${group.GroupId}-${entry.DayNumber}`,
        location: row.LocationName || '—',
        serviceName: row.ActivityServiceName || 'Activity Ticket',
        detail: group.PaxTypeLabel || 'Adult',
        quantity: group.Qty || 1,
        price: entry.GivenPrice * (group.Qty || 1),
        breakdown: entry.Rate > 0
          ? `${this.formatCurrency(entry.Rate)} × ${group.Qty}`
          : undefined,
      });
    });
  });

  // Activities from dayGroups - REMOVE package type filter
  this.getActiveDayGroups().forEach(group => {
    if (group.DayNumbers.includes(dayNumber)) {
      group.ActivityRows.forEach(row => {
        this.getActivityEntriesForDay(row, dayNumber).forEach(({ group: tg, entry }) => {
          items.push({
            id: `dag-${row.RowId}-${tg.GroupId}-${entry.DayNumber}`,
            location: row.LocationName || '—',
            serviceName: row.ActivityServiceName || 'Activity Ticket',
            detail: tg.PaxTypeLabel || 'Adult',
            quantity: tg.Qty || 1,
            price: entry.GivenPrice * (tg.Qty || 1),
            breakdown: entry.Rate > 0
              ? `${this.formatCurrency(entry.Rate)} × ${tg.Qty}`
              : undefined,
          });
        });
      });
    }
  });

  // Legacy serviceRows - KEEP package type filter (these are hotel-related)
  this.getSummaryServicesByDay(dayNumber).forEach(svc => {
    if (svc.ServiceType === 1) {
      items.push({
        id: `s-${svc.QuoteServiceId}`,
        location: svc.LocationName || '—',
        serviceName: svc.IteneraryServiceName || 'Transport',
        detail: svc.VehicleTypeName || '',
        quantity: svc.Qty || 1,
        price: svc.SellingPrice || 0,
        breakdown: svc.CostPrice > 0
          ? `${this.formatCurrency(svc.CostPrice / (svc.Qty || 1))} × ${svc.Qty}`
          : undefined,
      });
    } else if (svc.ServiceType === 2) {
      items.push({
        id: `a-${svc.QuoteServiceId}`,
        location: svc.LocationName || '—',
        serviceName: svc.ActivityServiceName || 'Activity',
        detail: `Adult`,
        quantity: svc.Qty || 1,
        price: svc.SellingPrice || 0,
        breakdown: svc.CostPrice > 0
          ? `${this.formatCurrency(svc.CostPrice / (svc.Qty || 1))} × ${svc.Qty}`
          : undefined,
      });
    }
  });

  return items;
}


  getDayTotal(dayNumber: number): number {
    const items = this.getDayItems(dayNumber);
    return items.reduce((sum, item) => sum + (item.price || 0), 0);
  }



  applyRounding(amount: number): number {
    if (this.roundingValue > 0) {
      return Math.round(amount / this.roundingValue) * this.roundingValue;
    }
    return amount;
  }
  // Returns special inclusions for the active package type
  getSummarySpecialInclusions(): QuoteSpecialInclusionRow[] {
  return this.specialInclusionRows().filter(
    r => (r.SpecialInclusionId > 0 || r.SpecialInclusionName)
      && r.TotalPrice > 0
  );
}

  // Looks up hotel info (location, category) for a special inclusion row
  getHotelInfoForInclusion(row: QuoteSpecialInclusionRow): any {
    if (!row.HotelName) return null;
    return this.hotelList().find(h => h.HotelName === row.HotelName) ?? null;
  }
}

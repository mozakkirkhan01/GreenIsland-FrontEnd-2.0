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

// ── Interfaces ────────────────────────────────────────────────
export interface QuoteSpecialInclusionRow {
  QuoteSpecialInclusionId: number;
  QuoteId: number;
  QuoteHotelId: number;
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
    UnsavedChangesDialogComponent,
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

  specialInclusionRows = signal<QuoteSpecialInclusionRow[]>([]);
specialInclusionMasterList = signal<any[]>([]);

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

  // UI state
  showPkgModal = false;
  pkgModalRows: PackageTypeRow[] = [];
  activePackageTypeId = signal(0);
  internalNotes = '';
  gstPercent = 5;
  sameCabForAll = false;
  globalVehicleTypeId = 0;

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
        DayLabel: d.toLocaleDateString('en-IN', { weekday: 'long' }),
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

  // ── Totals ────────────────────────────────────────────────
  hotelTotal = computed(() =>
    this.hotelRows()
      .filter(r => r.QuotePackageTypeId === this.activePackageTypeId())
      .reduce((s, r) => s + (r.SellingPrice || 0), 0)
  );

  transportTotal = computed(() =>
    this.serviceRows()
      .filter(r => r.ServiceType === 1 && r.QuotePackageTypeId === this.activePackageTypeId())
      .reduce((s, r) => s + (r.SellingPrice || 0), 0)
  );

  activityTotal = computed(() =>
    this.serviceRows()
      .filter(r => r.ServiceType === 2 && r.QuotePackageTypeId === this.activePackageTypeId())
      .reduce((s, r) => s + (r.SellingPrice || 0), 0)
  );

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
        this.packageTypes.set(r.PackageTypes);
        this.activePackageTypeId.set(r.PackageTypes[0].QuotePackageTypeId);
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
        if (r.Hotels?.length > 0) {
          this.hotelRows.set(r.Hotels.map((h: any) => this.mapHotelRow(h)));
        }
        if (r.Services?.length > 0) {
          this.serviceRows.set(r.Services.map((s: any) => this.mapServiceRow(s)));
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
  next: ({ hotels, itinerary, activities, vehicles, locations, hotelCategories, specialInclusionTypes  }) => {
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
          QuotePackageTypeId: p.QuotePackageTypeId,
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
      QuotePackageTypeId: h.QuotePackageTypeId,
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
      QuoteServiceId: s.QuoteServiceId, QuoteId: s.QuoteId,
      QuotePackageTypeId: s.QuotePackageTypeId,
      DayNumber: s.DayNumber, ServiceDate: new Date(s.ServiceDate),
      ServiceType: s.ServiceType,
      IteneraryServiceId: s.IteneraryServiceId ?? 0,
      IteneraryServiceName: s.IteneraryServiceName ?? '',
      VehicleTypeId: s.VehicleTypeId ?? 0,
      VehicleTypeName: s.VehicleTypeName ?? '',
      SameCabForAll: s.SameCabForAll ?? false,
      ActivityServiceId: s.ActivityServiceId ?? 0,
      ActivityServiceName: s.ActivityServiceName ?? '',
      Qty: s.Qty ?? 1, CostPrice: s.CostPrice ?? 0,
      SellingPrice: s.SellingPrice ?? 0, Notes: s.Notes ?? '',
      IsSaving: false,    LocationId: s.LocationId ?? 0,
    LocationName: s.LocationName ?? '',VehicleTypeSearch: s.VehicleTypeName ?? '',
    FilteredVehicles: [],
    ShowVehicleDropdown: false,
    
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
            QuotePackageTypeId: p.QuotePackageTypeId,
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
    return this.hotelRows().filter(
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
      TotalPrice: 0, RoomTypes: [], IsSaving: false, SpecialInclusions: [],HotelSearch: '',
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
  return this.specialInclusionRows().filter(r => r.NightNumbers.includes(nightNumber));
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
  const firstHotel = this.getDestinationHotels()[0];
  this.markDirty();
  this.specialInclusionRows.update(rows => [...rows, {
    QuoteSpecialInclusionId: 0,
    QuoteId: this.QuoteId,
    QuoteHotelId: 0,
    HotelId: firstHotel?.HotelId ?? 0,
    NightNumbers: [],
    SpecialInclusionId: 0,
    SpecialInclusionName: '',
    HotelName: firstHotel?.HotelName ?? '',
    TotalPrice: 0,
    Comments: '',
    AvailableServices: this.specialInclusionMasterList(),
    IsSaving: false, 
    ServiceSearch: '', 
    FilteredServices: [],
    ShowServiceDropdown: false,
    HotelSearch: firstHotel?.HotelName ?? '',
    FilteredHotels: [],
    ShowHotelDropdown: false,
    ManualLocationName: '',
    UseManualLocation: false,
    ShowNightDropdown: false,
    SelectedNightsDisplay: '',
  }]);
  if (firstHotel?.HotelId) {
    this.loadSpecialInclusionsForHotel(firstHotel.HotelId);
  }
}

saveSpecialInclusionRow(row: QuoteSpecialInclusionRow): void {
  // Validate required fields
  if (!row.SpecialInclusionId || row.SpecialInclusionId === 0) {
    this.toastr.error('Please select a service');
    return;
  }
  
  if (row.TotalPrice <= 0) {
    this.toastr.error('Please enter a valid price');
    return;
  }
  
  if (row.UseManualLocation) {
    if (!row.ManualLocationName?.trim()) {
      this.toastr.error('Please enter a location name');
      return;
    }
  } else {
    if (row.QuoteHotelId <= 0) {
      this.toastr.error('Please select a hotel');
      return;
    }
  }

  row.IsSaving = true;
  const enc = (d: object): RequestModel => ({
    request: this.local.encrypt(JSON.stringify(d)).toString()
  });

  const payload = {
    QuoteSpecialInclusionId: row.QuoteSpecialInclusionId,
    QuoteId: this.QuoteId,
    QuoteHotelId: row.UseManualLocation ? 0 : row.QuoteHotelId,
    NightNumbers: row.NightNumbers,
    SpecialInclusionId: row.SpecialInclusionId,
    TotalPrice: row.TotalPrice,
    Comments: row.Comments,
    UseManualLocation: row.UseManualLocation,
    ManualLocationName: row.ManualLocationName || null,
  };

  this.service.saveQuoteSpecialInclusion(enc(payload)).subscribe({
    next: (r: any) => {
      if (r.Message === ConstantData.SuccessMessage) {
        row.QuoteSpecialInclusionId = r.QuoteSpecialInclusionId;
        this.toastr.success('Service added successfully');
        this.markClean();
      } else {
        this.toastr.error(r.Message);
      }
      row.IsSaving = false;
    },
    error: () => {
      this.toastr.error('Error saving service');
      row.IsSaving = false;
    }
  });
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
    row.TotalPrice            = Number(svc.Rate ?? svc.ApRate ?? 0);
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
    row.NightNumbers.splice(index, 1);
  } else {
    row.NightNumbers.push(nightNumber);
    row.NightNumbers.sort((a, b) => a - b);
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
    ).subscribe({ next: () => {} });
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
    (this.editPrices.CnbRate  * (row.CNB  || 0));
}

applyEditPrices(): void {
  if (!this.editingHotelRow) return;
  const row = this.editingHotelRow;

  // Apply back to row
  row.BaseRate     = this.editPrices.RoomRate;
  row.AwebRate     = this.editPrices.AwebRate;
  row.CwebRate     = this.editPrices.CwebRate;
  row.CnbRate      = this.editPrices.CnbRate;
  row.CostPrice    = this.editPrices.ComputedTotal;
  row.TotalPrice   = this.editPrices.ComputedTotal;
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
selectedDays: number[] = [];
selectedDayForForm = 0;
currentTransportRow: QuoteServiceRow = {} as QuoteServiceRow;
// Transport form state — separate from hotel modal
transportLocationSearchText = '';
transportFilteredLocations: any[] = [];
transportShowLocationDropdown = false;

transportServiceSearchText = '';
transportFilteredServices: any[] = [];
transportShowServiceDropdown = false;

onSameCabChange(): void {
  if (!this.sameCabForAll) {
    this.selectedCabTypes = [];
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
  const vt = this.vehicleTypeList().find(v => v.VehicleTypeId === cabType.VehicleTypeId);
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
  this.closeCabTypesModal();
  this.markDirty();
}

getSelectedCabTypesDisplay(): string {
  return this.selectedCabTypes
    .map(c => `${c.Quantity}-${c.VehicleTypeName}`)
    .join(' + ');
}


getActiveTransportRows(): QuoteServiceRow[] {
  if (this.selectedDays.length === 0) {
    return this.serviceRows().filter(
      r => r.ServiceType === 1 && r.QuotePackageTypeId === this.activePackageTypeId()
    );
  }
  return this.serviceRows().filter(
    r => r.ServiceType === 1
      && r.QuotePackageTypeId === this.activePackageTypeId()
      && this.selectedDays.includes(r.DayNumber)
  );
}

toggleDay(dayNumber: number): void {
  const idx = this.selectedDays.indexOf(dayNumber);
  if (idx > -1) {
    this.selectedDays.splice(idx, 1);
  } else {
    this.selectedDays.push(dayNumber);
    this.selectedDays.sort((a, b) => a - b);
  }
}

toggleAllDays(): void {
  if (this.selectedDays.length === this.daySlots().length) {
    this.selectedDays = [];
  } else {
    this.selectedDays = this.daySlots().map(d => d.DayNumber);
  }
}

allDaysSelected(): boolean {
  const slots = this.daySlots();
  return slots.length > 0 && this.selectedDays.length === slots.length;
}

addTransportRow(): void {
  if (this.selectedDays.length === 0) {
    this.toastr.error('Select at least one day');
    return;
  }
  const daySlot = this.daySlots().find(d => d.DayNumber === this.selectedDays[0]);
  this.addTransportRowForSlot(daySlot!);
}

  // ── Service rows ──────────────────────────────────────────
  getServiceRowsForDay(dayNumber: number): QuoteServiceRow[] {
    return this.serviceRows().filter(
      r => r.DayNumber === dayNumber
        && r.QuotePackageTypeId === this.activePackageTypeId()
    );
  }
  addTransportRowQuick(): void {
  if (this.selectedDays.length === 0) {
    this.toastr.error('Select at least one day');
    return;
  }
  const daySlot = this.daySlots().find(d => d.DayNumber === this.selectedDays[0]);
  if (daySlot) {
    this.addTransportRow();
  }
}

addActivityRowQuick(): void {
  if (this.selectedDays.length === 0) {
    this.toastr.error('Select at least one day');
    return;
  }
  const daySlot = this.daySlots().find(d => d.DayNumber === this.selectedDays[0]);
  if (daySlot) {
    this.addActivityRow(daySlot);
  }
}


showDaysDropdown = false;
selectedDaysDisplay = '';

onDayToggle(dayNumber: number): void {
  const index = this.selectedDays.indexOf(dayNumber);
  if (index > -1) {
    this.selectedDays.splice(index, 1);
  } else {
    this.selectedDays.push(dayNumber);
    this.selectedDays.sort((a, b) => a - b);
  }
  this.updateDaysDisplay();
}

updateDaysDisplay(): void {
  if (this.selectedDays.length === 0) {
    this.selectedDaysDisplay = '';
  } else if (this.selectedDays.length === 1) {
    this.selectedDaysDisplay = `Day ${this.selectedDays[0]}`;
  } else {
    this.selectedDaysDisplay = `${this.selectedDays.length} days selected`;
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

// Location search
// locationSearchText = '';
// filteredLocations: any[] = [];
// showLocationDropdown = false;

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

// Location search
onTransportLocationSearch(): void {
  const query = (this.locationSearchText ?? '').toLowerCase().trim();

  if (!query) {
    this.filteredLocations = this.locationList().slice(0, 4);
  } else {
    this.filteredLocations = this.locationList()
      .filter(x =>
        x.LocationName.toLowerCase().includes(query)
      )
      .slice(0, 4);
  }

  this.showLocationDropdown = true;
}

selectTransportLocation(loc: any): void {

  this.currentTransportRow.LocationId = loc.LocationId;
  this.currentTransportRow.LocationName = loc.LocationName;

  this.locationSearchText = loc.LocationName;

  this.showLocationDropdown = false;

  this.filteredServices = this.itineraryList()
    .filter(x => x.LocationId === loc.LocationId);
}

onTransportLocationBlur(): void {
  setTimeout(() => {
    this.showLocationDropdown = false;
  }, 150);
}

// Service search
onTransportServiceSearch(): void {

  const query = (this.serviceSearchText ?? '')
    .toLowerCase()
    .trim();

  const services = this.itineraryList()
    .filter(x =>
      x.LocationId === this.currentTransportRow.LocationId
    );

  if (!query) {
    this.filteredServices = services.slice(0, 4);
  } else {
    this.filteredServices = services
      .filter(x =>
        x.IteneraryServiceName
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 4);
  }

  this.showServiceDropdown = true;
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

  // Load vehicles that have rates configured for this service
  this.loadVehiclesForService(service.IteneraryServiceId);
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

onTransportServiceBlur(): void {
  setTimeout(() => {
    this.showServiceDropdown = false;
  }, 150);
}

loadLocationsByDestination(): void {
  const trip = this.tripInfo();
  if (!trip || !trip.DestinationId) {
    return;
  }
  
  const destinationId = trip.DestinationId;
  
  this.service.getLocationsByDestination(destinationId).subscribe({
    next: (response: any) => {
      this.availableLocations = response || [];
      this.onTransportLocationSearch();
    },
    error: (err) => {
      console.error('Error loading locations:', err);
      this.toastr.error('Failed to load locations');
    }
  });
}

loadServicesByLocation(locationId: number): void {
  this.service.getItineraryServicesByLocation(locationId).subscribe({
    next: (response: any) => {
      this.availableServices = response || [];
      this.onTransportServiceSearch();
    },
    error: (err) => {
      console.error('Error loading services:', err);
      this.toastr.error('Failed to load services');
    }
  });
}

addTransportRowForSlot(slot: DaySlot): void {
  this.markDirty();
  const newRow: QuoteServiceRow = {
    QuoteServiceId: 0,
    QuoteId: this.QuoteId,
    QuotePackageTypeId: this.activePackageTypeId(),
    DayNumber: slot.DayNumber,
    ServiceDate: slot.ServiceDate,
    ServiceType: 1,
    IteneraryServiceId: this.currentTransportRow.IteneraryServiceId ?? 0,
    IteneraryServiceName: this.currentTransportRow.IteneraryServiceName ?? '',
    VehicleTypeId: 0,
    VehicleTypeName: '',
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
    VehicleTypeSearch: '',
    FilteredVehicles: [],
    ShowVehicleDropdown: false,
  };
  this.serviceRows.update(rows => [...rows, newRow]);
}

  // vehicle row
  VehicleTypeSearch?: string;
FilteredVehicles?: any[];
ShowVehicleDropdown?: boolean;
onTransportVehicleSearch(row: QuoteServiceRow): void {
  const query = (row.VehicleTypeSearch ?? '').toLowerCase().trim();
  const source = this.sameCabForAll && this.selectedCabTypes.length > 0
    ? this.selectedCabTypes
    : this.vehicleTypeList();  // ← this is all you need

  row.FilteredVehicles = !query
    ? source.slice(0, 6)
    : source.filter(v => v.VehicleTypeName.toLowerCase().includes(query)).slice(0, 6);

  row.ShowVehicleDropdown = true;
  this.serviceRows.update(rows => [...rows]);
}

selectTransportVehicle(row: QuoteServiceRow, vt: any): void {
  row.VehicleTypeId = vt.VehicleTypeId;
  row.VehicleTypeName = vt.VehicleTypeName;
  row.VehicleTypeSearch = vt.VehicleTypeName;
  row.ShowVehicleDropdown = false;
  row.FilteredVehicles = [];

  // If rate is already on the vehicle object from the service lookup, use it directly
  if (vt.RateAmount) {
    row.CostPrice = vt.RateAmount;
    row.SellingPrice = vt.RateAmount;
    this.serviceRows.update(rows => [...rows]);
  } else {
    // Otherwise fetch it
    this.lookupVehicleRate(row);
  }

  this.serviceRows.update(rows => [...rows]);
  this.markDirty();
}

onTransportVehicleBlur(row: QuoteServiceRow): void {
  setTimeout(() => {
    row.ShowVehicleDropdown = false;
    row.VehicleTypeSearch = row.VehicleTypeId > 0 ? row.VehicleTypeName : '';
    this.serviceRows.update(rows => [...rows]);
  }, 200);
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
      QuoteServiceId: 0, QuoteId: this.QuoteId,
      QuotePackageTypeId: this.activePackageTypeId(),
      DayNumber: slot.DayNumber, ServiceDate: slot.ServiceDate,
      ServiceType: 2,
      IteneraryServiceId: 0, IteneraryServiceName: '',
      VehicleTypeId: 0, VehicleTypeName: '', SameCabForAll: false,
      ActivityServiceId: 0, ActivityServiceName: '',
      Qty: 1, CostPrice: 0, SellingPrice: 0, Notes: '', IsSaving: false,
    LocationId: 0,
    LocationName: '',

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
    // Don't silently fail — user needs to know
    if (row.VehicleTypeId > 0 && !row.IteneraryServiceId) {
      this.toastr.warning('Select a service location and service type first');
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
          row.CostPrice = r.Rate.RateAmount ?? 0;
          row.SellingPrice = row.CostPrice;
        }
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
    // Find and remove the row by comparing the object reference
    this.serviceRows.update(rows => rows.filter(r => r !== row));
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

  setActivePackage(id: number): void {
    this.activePackageTypeId.set(id);
  }

  editBasicDetail(obj: any): void {
    const queryId = Number(obj) || this.QueryStepOneId;
    if (!queryId) { this.toastr.error('Query ID not found'); return; }
    this.router.navigate(['/agent/query-stepone', queryId]);
  }
}

import {
  Component, OnInit, signal, inject, computed
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
  NightNumber: number;
  SpecialInclusionId: number;
  SpecialInclusionName: string;
  HotelName: string;
  TotalPrice: number;
  Comments: string;
  ServiceSearch: string;
  FilteredServices: any[];
  ShowServiceDropdown: boolean;
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

  // ── Signals ───────────────────────────────────────────────
  loading = signal(false);
  tripInfo = signal<TripInfo | null>(null);
  packageTypes = signal<PackageTypeRow[]>([]);

  specialInclusionRows = signal<QuoteSpecialInclusionRow[]>([]);
specialInclusionMasterList = signal<any[]>([]);

  loadData = inject(LoadDataService);

  hotelList = signal<any[]>([]);
  itineraryList = signal<any[]>([]);
  activityList = signal<any[]>([]);
  vehicleTypeList = signal<any[]>([]);

  hotelRows = signal<QuoteHotelRow[]>([]);
  serviceRows = signal<QuoteServiceRow[]>([]);

  // UI state
  showPkgModal = false;
  pkgModalRows: PackageTypeRow[] = [];
  activePackageTypeId = 0;
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
    this.hotelRows().reduce((s, r) => s + (r.SellingPrice || 0), 0)
  );

  transportTotal = computed(() =>
    this.serviceRows()
      .filter(r => r.ServiceType === 1)
      .reduce((s, r) => s + (r.SellingPrice || 0), 0)
  );

  activityTotal = computed(() =>
    this.serviceRows()
      .filter(r => r.ServiceType === 2)
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

        this.packageTypes.set(r.PackageTypes ?? []);
        if (this.packageTypes().length > 0) {
          this.activePackageTypeId = this.packageTypes()[0].QuotePackageTypeId;
        }

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
          hotels: this.service.getHotelList(
            enc({ DestinationId: destId, LocationId: 0, HotelId: 0 })
          ),
          itinerary: this.service.getIteneraryServiceList(
            enc({ DestinationId: destId, LocationId: 0, IteneraryServiceId: 0 })
          ),
          activities: this.service.getActivityServiceList(
            enc({ DestinationId: destId, LocationId: 0 })
          ),
          vehicles: this.service.getVehicleTypeList(
            enc({ DestinationId: destId })
          ),
        }).subscribe({
          next: ({ hotels, itinerary, activities, vehicles }) => {
            const h = hotels as any;
            const i = itinerary as any;
            const a = activities as any;
            const v = vehicles as any;

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

  // ── Map rows ──────────────────────────────────────────────
  private mapHotelRow(h: any): QuoteHotelRow {
    return {
      QuoteHotelId: h.QuoteHotelId, QuoteId: h.QuoteId,
      QuotePackageTypeId: h.QuotePackageTypeId,
      NightNumber: h.NightNumber, StayDate: new Date(h.StayDate),
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
      IsSaving: false,
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
            if (this.activePackageTypeId === 0) {
              this.activePackageTypeId = savedPkgTypes[0].QuotePackageTypeId;
            } else {
              const stillExists = savedPkgTypes.find(
                p => p.QuotePackageTypeId === this.activePackageTypeId
              );
              if (!stillExists)
                this.activePackageTypeId = savedPkgTypes[0].QuotePackageTypeId;
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
      r => r.NightNumber === nightNumber
        && r.QuotePackageTypeId === this.activePackageTypeId
    );
  }

  addHotelRow(slot: NightSlot): void {
    this.markDirty();
    this.hotelRows.update(rows => [...rows, {
      QuoteHotelId: 0, QuoteId: this.QuoteId,
      QuotePackageTypeId: this.activePackageTypeId,
      NightNumber: slot.NightNumber, StayDate: slot.StayDate,
      HotelId: 0, HotelName: '', LocationName: '', HotelCategoryName: '',
      RoomTypeId: 0, RoomTypeName: '', MealPlan: 'MAP',
      NoOfRooms: 1, PaxPerRoom: 2, AWEB: 0, CWEB: 0, CNB: 0,
      CostPrice: 0, SellingPrice: 0, BaseRate: 0, AwebRate: 0, CwebRate: 0, CnbRate: 0,
      TotalPrice: 0, RoomTypes: [], IsSaving: false, SpecialInclusions: [],HotelSearch: '',
    FilteredHotels: [],
    ShowDropdown: false,
    }]);
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
  return this.specialInclusionRows().filter(r => r.NightNumber === nightNumber);
}

// Get all hotels for a night to populate hotel dropdown in special inclusions
getHotelsForNight(nightNumber: number): QuoteHotelRow[] {
  return this.hotelRows().filter(
    r => r.NightNumber === nightNumber
      && r.QuotePackageTypeId === this.activePackageTypeId
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
  row.ShowDropdown = false;

  this.hotelRows.update(rows => [...rows]);
  this.markDirty();
}

addSpecialInclusionRow(nightNumber: number): void {
  const hotelsForNight = this.getHotelsForNight(nightNumber);
  const firstHotel = hotelsForNight[0];
  this.markDirty();
  this.specialInclusionRows.update(rows => [...rows, {
    QuoteSpecialInclusionId: 0,
    QuoteId: this.QuoteId,
    QuoteHotelId: firstHotel?.QuoteHotelId ?? 0,
    NightNumber: nightNumber,
    SpecialInclusionId: 0,
    SpecialInclusionName: '',
    HotelName: firstHotel?.HotelName ?? '',
    TotalPrice: 0,
    Comments: '',
    AvailableServices: firstHotel?.SpecialInclusions ?? [],
    IsSaving: false, ServiceSearch: '', FilteredServices: [],
    ShowServiceDropdown: false,
  }]);
}

onSpecialInclusionHotelChange(row: QuoteSpecialInclusionRow, hotelRow: QuoteHotelRow): void {
  row.QuoteHotelId = hotelRow.QuoteHotelId;
  row.HotelName = hotelRow.HotelName;
  row.AvailableServices = hotelRow.SpecialInclusions ?? [];
  row.SpecialInclusionId = 0;
  row.TotalPrice = 0;
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

  // Show default 4 services on focus
  if (!query) {
    row.FilteredServices = (row.AvailableServices ?? []).slice(0, 4);
    row.ShowServiceDropdown = true;
    this.specialInclusionRows.update(rows => [...rows]);
    return;
  }

  // Filter services while typing
  row.FilteredServices = (row.AvailableServices ?? [])
    .filter(s =>
      s.SpecialInclusionTypeName.toLowerCase().includes(query)
    )
    .slice(0, 4);

  row.ShowServiceDropdown = true;
  this.specialInclusionRows.update(rows => [...rows]);
}
selectService(row: QuoteSpecialInclusionRow, svc: any): void {
  row.SpecialInclusionId = svc.SpecialInclusionId;
  row.SpecialInclusionName = svc.SpecialInclusionTypeName;
  row.ServiceSearch = svc.SpecialInclusionTypeName;
  row.TotalPrice = svc.Rate ?? 0;
  row.ShowServiceDropdown = false;
  row.FilteredServices = [];
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
    const roomCost = (row.BaseRate || 0) * (row.NoOfRooms || 1);
    const awebCost = (row.AwebRate || 0) * (row.AWEB || 0);
    const cwebCost = (row.CwebRate || 0) * (row.CWEB || 0);
    const cnbCost = (row.CnbRate || 0) * (row.CNB || 0);
    row.CostPrice = roomCost + awebCost + cwebCost + cnbCost;
    row.SellingPrice = row.CostPrice;
    row.TotalPrice = row.CostPrice;
  }

  saveHotelRow(row: QuoteHotelRow): void {
    if (!row.HotelId || !row.RoomTypeId) return;
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

  // ── Service rows ──────────────────────────────────────────
  getServiceRowsForDay(dayNumber: number): QuoteServiceRow[] {
    return this.serviceRows().filter(
      r => r.DayNumber === dayNumber
        && r.QuotePackageTypeId === this.activePackageTypeId
    );
  }

  addTransportRow(slot: DaySlot): void {
    this.markDirty();
    this.serviceRows.update(rows => [...rows, {
      QuoteServiceId: 0, QuoteId: this.QuoteId,
      QuotePackageTypeId: this.activePackageTypeId,
      DayNumber: slot.DayNumber, ServiceDate: slot.ServiceDate,
      ServiceType: 1,
      IteneraryServiceId: 0, IteneraryServiceName: '',
      VehicleTypeId: 0, VehicleTypeName: '', SameCabForAll: false,
      ActivityServiceId: 0, ActivityServiceName: '',
      Qty: 1, CostPrice: 0, SellingPrice: 0, Notes: '', IsSaving: false,
    }]);
  }

  addActivityRow(slot: DaySlot): void {
    this.markDirty();
    this.serviceRows.update(rows => [...rows, {
      QuoteServiceId: 0, QuoteId: this.QuoteId,
      QuotePackageTypeId: this.activePackageTypeId,
      DayNumber: slot.DayNumber, ServiceDate: slot.ServiceDate,
      ServiceType: 2,
      IteneraryServiceId: 0, IteneraryServiceName: '',
      VehicleTypeId: 0, VehicleTypeName: '', SameCabForAll: false,
      ActivityServiceId: 0, ActivityServiceName: '',
      Qty: 1, CostPrice: 0, SellingPrice: 0, Notes: '', IsSaving: false,
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
    if (!row.IteneraryServiceId || !row.VehicleTypeId) return;
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

  // ── Summary helpers ───────────────────────────────────────
  get summaryHotels(): QuoteHotelRow[] {
    return this.hotelRows().filter(
      r => r.QuotePackageTypeId === this.activePackageTypeId && r.HotelId > 0
    );
  }

  get summaryServices(): QuoteServiceRow[] {
    return this.serviceRows().filter(
      r => r.QuotePackageTypeId === this.activePackageTypeId
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
    this.activePackageTypeId = id;
  }

  editBasicDetail(obj: any): void {
    const queryId = Number(obj) || this.QueryStepOneId;
    if (!queryId) { this.toastr.error('Query ID not found'); return; }
    this.router.navigate(['/agent/query-stepone', queryId]);
  }
}
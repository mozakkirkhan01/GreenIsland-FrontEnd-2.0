import {
  Component, OnInit, signal, inject, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ConstantData } from '../../utils/constant-data';
import { RequestModel, StaffLoginModel } from '../../utils/interface';
import { Progress } from '../../component/progress/progress';

// ── Interfaces ────────────────────────────────────────────────

export interface TripInfo {
  QueryStepOneId: number;
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
  // UI
  RoomTypes: any[];
  IsSaving: boolean;
}

export interface QuoteServiceRow {
  QuoteServiceId: number;
  QuoteId: number;
  QuotePackageTypeId: number;
  DayNumber: number;
  ServiceDate: Date;
  ServiceType: number;   // 1=Transport, 2=Activity
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
  ],
  templateUrl: './query-stepthree.html',
  styleUrl: './query-stepthree.css',
})
export class QueryStepthree implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(AppService);
  private toastr = inject(ToastrService);
  private local = inject(LocalService);

  // ── IDs ───────────────────────────────────────────────────
  QueryStepOneId = 0;
  QuoteId = 0;

  staffLogin: StaffLoginModel = {} as StaffLoginModel;

  // ── Signals ───────────────────────────────────────────────
  loading = signal(false);
  tripInfo = signal<TripInfo | null>(null);
  packageTypes = signal<PackageTypeRow[]>([]);

  // Master data
  hotelList = signal<any[]>([]);
  itineraryList = signal<any[]>([]);
  activityList = signal<any[]>([]);
  vehicleTypeList = signal<any[]>([]);

  // Quote data
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

  // ── Night & Day slots (derived from tripInfo) ─────────────
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

        // ✅ Read DestinationId DIRECTLY from raw response
        const destId = r.TripInfo?.DestinationId ?? 0;

        // Set trip info
        if (r.TripInfo) {
          this.tripInfo.set({
            QueryStepOneId: r.TripInfo.QueryStepOneId,
            DestinationId: r.TripInfo.DestinationId,
            DestinationName: r.TripInfo.DestinationName,
            StartDate: r.TripInfo.StartDate,
            NoOfNights: r.TripInfo.NoOfNights,
            NoOfAdults: r.TripInfo.NoOfAdults,
            ChildrenAges: r.TripInfo.ChildrenAges ?? '[]',
          });
        }

        // Set quote
        if (r.Quote) {
          this.QuoteId = r.Quote.QuoteId;
          this.internalNotes = r.Quote.InternalNotes ?? '';
          this.gstPercent = r.Quote.GstPercent ?? 5;
        }

        // Set package types
        this.packageTypes.set(r.PackageTypes ?? []);
        if (this.packageTypes().length > 0) {
          this.activePackageTypeId =
            this.packageTypes()[0].QuotePackageTypeId;
        }

        // Set hotel + service rows
        if (r.Hotels?.length > 0) {
          this.hotelRows.set(r.Hotels.map((h: any) => this.mapHotelRow(h)));
        }
        if (r.Services?.length > 0) {
          this.serviceRows.set(r.Services.map((s: any) => this.mapServiceRow(s)));
        }

        // ✅ Now load master dropdowns using correct destId
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

            if (h.Message === ConstantData.SuccessMessage) {
              this.hotelList.set(h.HotelList ?? []);
              console.log('Hotels loaded:', h.HotelList?.length, 'for destId:', destId);
              console.log('Hotel IDs:', h.HotelList?.map((x: any) => x.HotelId));
              console.log('Full hotel list:', h.HotelList);
            } else {
              this.toastr.warning('No hotels found: ' + h.Message);
            }

            if (i.Message === ConstantData.SuccessMessage) {
              this.itineraryList.set(i.IteneraryServiceList ?? []);
            }
            if (a.Message === ConstantData.SuccessMessage) {
              this.activityList.set(a.ActivityServiceList ?? []);
            }
            if (v.Message === ConstantData.SuccessMessage) {
              this.vehicleTypeList.set(v.VehicleTypeList ?? []);
            }

            this.loading.set(false);
          },
          error: () => {
            this.toastr.error('Error loading master data');
            this.loading.set(false);
          }
        });
      },
      // AFTER
      error: (err: any) => {
        console.error('getQuoteDetail HTTP error:', err);
        console.error('Status:', err.status);
        this.toastr.error('Error loading quote: ' + err.status);
        this.loading.set(false);
      }
    });
  }

  // ── Helpers: map raw API rows ─────────────────────────────
  private mapHotelRow(h: any): QuoteHotelRow {
    return {
      QuoteHotelId: h.QuoteHotelId,
      QuoteId: h.QuoteId,
      QuotePackageTypeId: h.QuotePackageTypeId,
      NightNumber: h.NightNumber,
      StayDate: new Date(h.StayDate),
      HotelId: h.HotelId,
      HotelName: h.HotelName ?? '',
      LocationName: h.LocationName ?? '',
      HotelCategoryName: h.HotelCategoryName ?? '',
      RoomTypeId: h.RoomTypeId,
      RoomTypeName: h.RoomTypeName ?? '',
      MealPlan: h.MealPlan ?? 'MAP',
      NoOfRooms: h.NoOfRooms ?? 1,
      PaxPerRoom: h.PaxPerRoom ?? 2,
      AWEB: h.AWEB ?? 0,
      CWEB: h.CWEB ?? 0,
      CNB: h.CNB ?? 0,
      CostPrice: h.CostPrice ?? 0,
      SellingPrice: h.SellingPrice ?? 0,
      RoomTypes: [],
      IsSaving: false,
    };
  }

  private mapServiceRow(s: any): QuoteServiceRow {
    return {
      QuoteServiceId: s.QuoteServiceId,
      QuoteId: s.QuoteId,
      QuotePackageTypeId: s.QuotePackageTypeId,
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
    };
  }

  // ── Package Types Modal ───────────────────────────────────
  openPkgModal(): void {
    this.pkgModalRows = this.packageTypes().length > 0
      ? this.packageTypes().map(p => ({ ...p }))
      : [{ QuotePackageTypeId: 0, PackageTypeName: '' }];
    this.showPkgModal = true;
  }

  closePkgModal(): void {
    this.showPkgModal = false;
  }

  addPkgRow(): void {
    this.pkgModalRows.push({ QuotePackageTypeId: 0, PackageTypeName: '' });
  }

  removePkgRow(i: number): void {
    this.pkgModalRows.splice(i, 1);
  }

  savePkgTypes(): void {
    const invalid = this.pkgModalRows.find(p => !p.PackageTypeName?.trim());
    if (invalid) { this.toastr.error('Package name cannot be empty'); return; }

    const trip = this.tripInfo();
    if (!trip) return;

    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    const payload = {
      QuoteId: this.QuoteId,
      QueryStepOneId: this.QueryStepOneId,
      StartDate: trip.StartDate,
      NoOfNights: trip.NoOfNights,
      NoOfAdults: trip.NoOfAdults,
      ChildrenAges: trip.ChildrenAges,
      CreatedBy: this.staffLogin.StaffLoginId,
      PackageTypes: this.pkgModalRows,
    };

    this.loading.set(true);
    this.service.savePackageTypes(enc(payload)).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          this.QuoteId = r.QuoteId;
          this.packageTypes.set([...this.pkgModalRows]);
          if (this.activePackageTypeId === 0 && this.pkgModalRows.length > 0) {
            this.activePackageTypeId = this.pkgModalRows[0].QuotePackageTypeId;
          }
          this.closePkgModal();
          this.toastr.success('Package types saved');
        } else { this.toastr.error(r.Message); }
        this.loading.set(false);
      },
      error: () => { this.toastr.error('Error saving package types'); this.loading.set(false); }
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
    const newRow: QuoteHotelRow = {
      QuoteHotelId: 0, QuoteId: this.QuoteId,
      QuotePackageTypeId: this.activePackageTypeId,
      NightNumber: slot.NightNumber,
      StayDate: slot.StayDate,
      HotelId: 0, HotelName: '', LocationName: '', HotelCategoryName: '',
      RoomTypeId: 0, RoomTypeName: '', MealPlan: 'MAP',
      NoOfRooms: 1, PaxPerRoom: 2, AWEB: 0, CWEB: 0, CNB: 0,
      CostPrice: 0, SellingPrice: 0, RoomTypes: [], IsSaving: false,
    };
    this.hotelRows.update(rows => [...rows, newRow]);
  }

  onHotelSelected(row: QuoteHotelRow): void {
    console.log('=== onHotelSelected START ===');
    console.log('Selected HotelId:', row.HotelId);
    console.log('HotelList count:', this.hotelList().length);

    // Try to find in current hotelList
    let hotel = this.hotelList().find(h => h.HotelId === row.HotelId);
    console.log('Hotel found in hotelList:', hotel);

    if (!hotel) {
      // If not found, the row might already have the hotel info from previous load
      console.log('Hotel not in fresh list. Using existing row data.');
      console.log('Row HotelName:', row.HotelName, 'LocationName:', row.LocationName);

      // If row already has hotel info, just load room types
      if (row.HotelId > 0) {
        const enc = (d: object): RequestModel => ({
          request: this.local.encrypt(JSON.stringify(d)).toString()
        });

        console.log('Calling getRoomTypeList for HotelId:', row.HotelId);

        this.service.getRoomTypeList(enc({ HotelId: row.HotelId })).subscribe({
          next: (r: any) => {
            console.log('getRoomTypeList response:', r);

            if (r.Message === ConstantData.SuccessMessage) {
              row.RoomTypes = r.RoomTypeList ?? [];
              console.log('RoomTypes assigned. Count:', row.RoomTypes.length);
              console.log('RoomTypes data:', row.RoomTypes);

              row.RoomTypeId = row.RoomTypes.length > 0 ? row.RoomTypes[0].RoomTypeId : 0;
              console.log('RoomTypeId set to:', row.RoomTypeId);

              // ✅ Force signal update so Angular re-renders the dropdown
              this.hotelRows.update(rows => [...rows]);
              console.log('Signal updated');

              this.lookupHotelRate(row);
            } else {
              console.error('API error:', r.Message);
              this.toastr.error('Failed to load room types: ' + r.Message);
            }
          },
          error: (err) => {
            console.error('HTTP error in getRoomTypeList:', err);
            this.toastr.error('Error loading room types');
          }
        });
      }
      return;
    }

    // Hotel found in list - populate its details
    row.HotelName = hotel.HotelName;
    row.LocationName = hotel.LocationName;
    row.HotelCategoryName = hotel.HotelCategoryName;

    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });

    console.log('Calling getRoomTypeList for HotelId:', row.HotelId);

    this.service.getRoomTypeList(enc({ HotelId: row.HotelId })).subscribe({
      next: (r: any) => {
        console.log('getRoomTypeList response:', r);

        if (r.Message === ConstantData.SuccessMessage) {
          row.RoomTypes = r.RoomTypeList ?? [];
          console.log('RoomTypes assigned. Count:', row.RoomTypes.length);
          console.log('RoomTypes data:', row.RoomTypes);

          row.RoomTypeId = row.RoomTypes.length > 0 ? row.RoomTypes[0].RoomTypeId : 0;
          console.log('RoomTypeId set to:', row.RoomTypeId);

          // ✅ Force signal update so Angular re-renders the dropdown
          this.hotelRows.update(rows => [...rows]);
          console.log('Signal updated');

          this.lookupHotelRate(row);
        } else {
          console.error('API error:', r.Message);
          this.toastr.error('Failed to load room types: ' + r.Message);
        }
      },
      error: (err) => {
        console.error('HTTP error in getRoomTypeList:', err);
        this.toastr.error('Error loading room types');
      }
    });
    console.log('=== onHotelSelected END ===');
  }

  lookupHotelRate(row: QuoteHotelRow): void {
    if (!row.HotelId || !row.RoomTypeId) return;
    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });
    this.service.getHotelRateByDate(enc({
      HotelId: row.HotelId,
      RoomTypeId: row.RoomTypeId,
      StayDate: row.StayDate,
    })).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage && r.Rate) {
          const rate = r.Rate;
          row.CostPrice = row.MealPlan === 'CP' ? (rate.CpRate ?? 0)
            : row.MealPlan === 'MAP' ? (rate.MapRate ?? 0)
              : (rate.ApRate ?? 0);
          row.SellingPrice = row.CostPrice;
        }
      }
    });
  }

  saveHotelRow(row: QuoteHotelRow): void {
    if (!row.HotelId || !row.RoomTypeId) return;
    row.IsSaving = true;
    const enc = (d: object): RequestModel => ({
      request: this.local.encrypt(JSON.stringify(d)).toString()
    });
    this.service.saveQuoteHotel(enc({
      QuoteHotelId: row.QuoteHotelId, QuoteId: this.QuoteId,
      QuotePackageTypeId: row.QuotePackageTypeId,
      NightNumber: row.NightNumber,
      StayDate: row.StayDate,
      HotelId: row.HotelId, RoomTypeId: row.RoomTypeId,
      MealPlan: row.MealPlan, NoOfRooms: row.NoOfRooms,
      PaxPerRoom: row.PaxPerRoom, AWEB: row.AWEB, CWEB: row.CWEB, CNB: row.CNB,
      CostPrice: row.CostPrice, SellingPrice: row.SellingPrice,
    })).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          row.QuoteHotelId = r.QuoteHotelId;
        } else { this.toastr.error(r.Message); }
        row.IsSaving = false;
      },
      error: () => { row.IsSaving = false; }
    });
  }

  removeHotelRow(row: QuoteHotelRow, index: number): void {
    if (row.QuoteHotelId > 0) {
      const enc = (d: object): RequestModel => ({
        request: this.local.encrypt(JSON.stringify(d)).toString()
      });
      this.service.deleteQuoteHotel(enc({ QuoteHotelId: row.QuoteHotelId }))
        .subscribe({ next: () => { } });
    }
    this.hotelRows.update(rows => rows.filter((_, i) => i !== index));
  }

  // ── Service rows ──────────────────────────────────────────
  getServiceRowsForDay(dayNumber: number): QuoteServiceRow[] {
    return this.serviceRows().filter(
      r => r.DayNumber === dayNumber
        && r.QuotePackageTypeId === this.activePackageTypeId
    );
  }

  addTransportRow(slot: DaySlot): void {
    this.serviceRows.update(rows => [...rows, {
      QuoteServiceId: 0, QuoteId: this.QuoteId,
      QuotePackageTypeId: this.activePackageTypeId,
      DayNumber: slot.DayNumber, ServiceDate: slot.ServiceDate,
      ServiceType: 1,
      IteneraryServiceId: 0, IteneraryServiceName: '',
      VehicleTypeId: 0, VehicleTypeName: '',
      SameCabForAll: false,
      ActivityServiceId: 0, ActivityServiceName: '',
      Qty: 1, CostPrice: 0, SellingPrice: 0, Notes: '',
      IsSaving: false,
    }]);
  }

  addActivityRow(slot: DaySlot): void {
    this.serviceRows.update(rows => [...rows, {
      QuoteServiceId: 0, QuoteId: this.QuoteId,
      QuotePackageTypeId: this.activePackageTypeId,
      DayNumber: slot.DayNumber, ServiceDate: slot.ServiceDate,
      ServiceType: 2,
      IteneraryServiceId: 0, IteneraryServiceName: '',
      VehicleTypeId: 0, VehicleTypeName: '',
      SameCabForAll: false,
      ActivityServiceId: 0, ActivityServiceName: '',
      Qty: 1, CostPrice: 0, SellingPrice: 0, Notes: '',
      IsSaving: false,
    }]);
  }

  onItinerarySelected(row: QuoteServiceRow): void {
    const svc = this.itineraryList().find(
      i => i.IteneraryServiceId === row.IteneraryServiceId
    );
    if (svc) {
      row.IteneraryServiceName = svc.IteneraryServiceName;
      if (row.VehicleTypeId > 0) this.lookupVehicleRate(row);
    }
  }

  onVehicleSelected(row: QuoteServiceRow): void {
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
    const act = this.activityList().find(
      a => a.ActivityServiceId === row.ActivityServiceId
    );
    if (act) {
      row.ActivityServiceName = act.ActivityServiceName;
      // Look up activity rate
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
      QuoteServiceId: row.QuoteServiceId,
      QuoteId: this.QuoteId,
      QuotePackageTypeId: row.QuotePackageTypeId,
      DayNumber: row.DayNumber,
      ServiceDate: row.ServiceDate,
      ServiceType: row.ServiceType,
      IteneraryServiceId: row.IteneraryServiceId || null,
      VehicleTypeId: row.VehicleTypeId || null,
      SameCabForAll: row.SameCabForAll,
      ActivityServiceId: row.ActivityServiceId || null,
      Qty: row.Qty,
      CostPrice: row.CostPrice,
      SellingPrice: row.SellingPrice,
      Notes: row.Notes,
    })).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          row.QuoteServiceId = r.QuoteServiceId;
        } else { this.toastr.error(r.Message); }
        row.IsSaving = false;
      },
      error: () => { row.IsSaving = false; }
    });
  }

  removeServiceRow(row: QuoteServiceRow, idx: number): void {
    if (row.QuoteServiceId > 0) {
      const enc = (d: object): RequestModel => ({
        request: this.local.encrypt(JSON.stringify(d)).toString()
      });
      this.service.deleteQuoteService(enc({ QuoteServiceId: row.QuoteServiceId }))
        .subscribe({ next: () => { } });
    }
    this.serviceRows.update(rows => rows.filter((_, i) => i !== idx));
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
    if (this.childrenCount > 0) label += `, ${this.childrenCount} Child${this.childrenCount > 1 ? 'ren' : ''}`;
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

  editBasicDetail(obj: any) {
    const queryId = Number(obj) || this.QueryStepOneId;
    if (!queryId) {
      this.toastr.error('Query ID not found');
      return;
    }
    this.router.navigate(['/agent/query-stepone', queryId]);
  }
}

import { Component, ViewChild, inject, signal } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { NgxPaginationModule } from 'ngx-pagination';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { Status } from '../../utils/enum';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { LoadDataService } from '../../utils/load-data.service';
import { FilterPipe } from '../../utils/filter-pipe';
import { OrderByPipe } from '../../utils/orderby-pipe';
import { Progress } from '../../component/progress/progress';
import { forkJoin } from 'rxjs'; // ── Added for parallel loading ──

@Component({
  selector: 'app-itenerary-service',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    NgxPaginationModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FilterPipe,
    OrderByPipe,
    Progress,
    DatePipe,
  ],
  templateUrl: './itenerary-service.html',
  styleUrl: './itenerary-service.css',
})
export class IteneraryService {
  // ── Signals ───────────────────────────────────────────────────────────
  dataLoading = signal(false);
  DestinationList = signal<any[]>([]);
  LocationList = signal<any[]>([]);
  VehicleTypeList = signal<any[]>([]);
  IteneraryServiceList = signal<any[]>([]);
  FilterLocationList = signal<any[]>([]);

  action = signal<ActionModel>({
    CanCreate: false, CanEdit: false, CanDelete: false,
    MenuTitle: '', ParentMenuTitle: ''
  } as ActionModel);

  // ── Form model ────────────────────────────────────────────────────────
  IteneraryServiceModel: any = {};
  isSubmitted = false;

  // ── Form cascade selects ──────────────────────────────────────────────
  SelectedDestinationId: any = 0;
  SelectedLocationId: any = 0;

  // ── Filter cascade ────────────────────────────────────────────────────
  FilterDestinationId: any = 0;
  FilterLocationId: any = 0;

  // ── Vehicle rate rows ─────────────────────────────────────────────────
  VehicleRateRows: any[] = [];

  // ── Shared dates ──────────────────────────────────────────────────────
  SharedFromDate: any = null;
  SharedToDate: any = null;

  // ── List / pagination ─────────────────────────────────────────────────
  Search = '';
  reverse = false;
  sortKey = '';
  p = 1;
  itemPerPage: number;

  loadData = inject(LoadDataService);
  StatusList = this.loadData.GetEnumList(Status);
  AllStatusList = Status;
  PageSize = ConstantData.PageSizes;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private localService: LocalService,
    private router: Router,
  ) {
    this.itemPerPage = this.PageSize[0];
  }

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.getDestinationList();
    this.resetForm();
    this.loadIteneraryServiceList();
  }

  @ViewChild('formIteneraryService') formIteneraryService!: NgForm;

  validiateMenu() {
    const cleanUrl = this.router.url.split('?')[0];
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ Url: cleanUrl, StaffLoginId: this.staffLogin.StaffLoginId })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.validiateMenu(obj).subscribe({
      next: (response: any) => {
        this.action.set({ ...this.loadData.validiateMenu(response, this.toastr, this.router) });
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while fetching records');
        this.dataLoading.set(false);
      }
    });
  }

  resetForm() {
    this.IteneraryServiceModel = { Status: 1 };
    this.SelectedDestinationId = 0;
    this.SelectedLocationId = 0;
    this.LocationList.set([]);
    this.VehicleTypeList.set([]);
    this.VehicleRateRows = [];
    this.SharedFromDate = null;
    this.SharedToDate = null;
    this.isSubmitted = false;
    if (this.formIteneraryService) {
      this.formIteneraryService.control.markAsPristine();
      this.formIteneraryService.control.markAsUntouched();
    }
  }

  clearDatesOnly() {
    this.SharedFromDate = null;
    this.SharedToDate = null;
    this.VehicleRateRows = this.VehicleRateRows.map(row => ({
      ...row,
      VehicleServiceRateId: 0,
      FromDate:   null,
      ToDate:     null,
      RateAmount: null,
    }));
  }

  getDestinationList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.service.getDestinationList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.DestinationList.set(r1.DestinationList);
        } else {
          this.toastr.error(r1.Message);
        }
      },
      error: () => this.toastr.error('Error while fetching destinations')
    });
  }

  onFormDestinationChange() {
    this.SelectedLocationId = 0;
    this.IteneraryServiceModel.LocationId = null;
    this.LocationList.set([]);
    this.VehicleTypeList.set([]);
    this.VehicleRateRows = [];

    if (!this.SelectedDestinationId || this.SelectedDestinationId == 0) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: Number(this.SelectedDestinationId) })
      ).toString()
    };
    this.service.getLocationList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.LocationList.set(r1.LocationList);
        }
      }
    });

    this.loadVehicleTypes(this.SelectedDestinationId);
  }

  onFormLocationChange() {
    this.IteneraryServiceModel.LocationId = this.SelectedLocationId;
  }

  loadVehicleTypes(destinationId: number) {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: Number(destinationId) })
      ).toString()
    };
    this.service.getVehicleTypeList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.VehicleTypeList.set(r1.VehicleTypeList);
          this.VehicleRateRows = r1.VehicleTypeList.map((v: any) => ({
            VehicleServiceRateId: 0,
            VehicleTypeId:        v.VehicleTypeId,
            VehicleTypeName:      v.VehicleTypeName,
            FromDate:             null,
            ToDate:               null,
            RateAmount:           null,
            Status:               1,
            CreatedBy:            this.staffLogin.StaffLoginId,
            UpdatedBy:            this.staffLogin.StaffLoginId,
          }));
        }
      }
    });
  }

  onSharedDateChange() {
    this.VehicleRateRows = this.VehicleRateRows.map(row => ({
      ...row,
      FromDate: this.SharedFromDate,
      ToDate:   this.SharedToDate,
    }));
  }

  saveIteneraryService() {
    this.isSubmitted = true;
    if (
      !this.IteneraryServiceModel.LocationId ||
      !this.IteneraryServiceModel.IteneraryServiceName ||
      !this.IteneraryServiceModel.DaySchedule ||
      !this.SharedFromDate ||
      !this.SharedToDate
    ) {
      this.toastr.error('Please fill all required fields');
      return;
    }

    const convertedRates = this.VehicleRateRows.map(row => ({
      ...row,
      FromDate:  this.loadData.loadDateTime(this.SharedFromDate),
      ToDate:    this.loadData.loadDateTime(this.SharedToDate),
      UpdatedBy: this.staffLogin.StaffLoginId,
      CreatedBy: this.staffLogin.StaffLoginId,
    }));

    const payload = {
      IteneraryService: {
        ...this.IteneraryServiceModel,
        CreatedBy: this.staffLogin.StaffLoginId,
        UpdatedBy: this.staffLogin.StaffLoginId,
      },
      VehicleRates: convertedRates,
    };

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.dataLoading.set(true);
    this.service.saveIteneraryService(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success('Record saved successfully');
          this.clearFormFieldsAfterSave();
          this.loadIteneraryServiceList();
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error occurred');
        this.dataLoading.set(false);
      }
    });
  }

  // ── REFACTORED EDIT METHOD ─────────────────────────────────────────────
  editIteneraryService(item: any) {
    this.dataLoading.set(true);

    // Prepare requests
    const locReq = { request: this.localService.encrypt(JSON.stringify({ DestinationId: Number(item.DestinationId) })).toString() };
    const vehReq = { request: this.localService.encrypt(JSON.stringify({ DestinationId: Number(item.DestinationId) })).toString() };
    const rateReq = { request: this.localService.encrypt(JSON.stringify({ IteneraryServiceId: item.IteneraryServiceId })).toString() };

    // Use forkJoin to load all dependencies at once
    forkJoin({
      locations: this.service.getLocationList(locReq),
      vehicleTypes: this.service.getVehicleTypeList(vehReq),
      rates: this.service.getVehicleServiceRateList(rateReq)
    }).subscribe({
      next: (res: any) => {
        // 1. Populate Lists first
        if (res.locations.Message === ConstantData.SuccessMessage) {
          this.LocationList.set(res.locations.LocationList);
        }
        if (res.vehicleTypes.Message === ConstantData.SuccessMessage) {
          this.VehicleTypeList.set(res.vehicleTypes.VehicleTypeList);
        }

        // 2. Set IDs and main model
        this.SelectedDestinationId = item.DestinationId;
        this.SelectedLocationId = item.LocationId;
        this.IteneraryServiceModel = {
          IteneraryServiceId: item.IteneraryServiceId,
          LocationId: item.LocationId,
          IteneraryServiceName: item.IteneraryServiceName,
          DaySchedule: item.DaySchedule,
          Status: item.Status,
        };

        // 3. Merge Vehicle Rates
        const existingRates = res.rates.VehicleServiceRateList || [];
        this.VehicleRateRows = res.vehicleTypes.VehicleTypeList.map((v: any) => {
          const match = existingRates.find((r: any) => r.VehicleTypeId === v.VehicleTypeId);
          return {
            VehicleServiceRateId: match?.VehicleServiceRateId ?? 0,
            VehicleTypeId: v.VehicleTypeId,
            VehicleTypeName: v.VehicleTypeName,
            FromDate: match?.FromDate ? new Date(match.FromDate) : null,
            ToDate: match?.ToDate ? new Date(match.ToDate) : null,
            RateAmount: match?.RateAmount ?? null,
            Status: match?.Status ?? 1,
            CreatedBy: this.staffLogin.StaffLoginId,
            UpdatedBy: this.staffLogin.StaffLoginId,
          };
        });

        // 4. Set Shared Dates
        if (existingRates.length > 0) {
          this.SharedFromDate = existingRates[0].FromDate ? new Date(existingRates[0].FromDate) : null;
          this.SharedToDate = existingRates[0].ToDate ? new Date(existingRates[0].ToDate) : null;
        }

        this.dataLoading.set(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: () => {
        this.toastr.error('Error loading edit data');
        this.dataLoading.set(false);
      }
    });
  }

  deleteIteneraryService(item: any) {
    if (!confirm('Are you sure?')) return;
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ IteneraryServiceId: item.IteneraryServiceId })).toString()
    };
    this.dataLoading.set(true);
    this.service.deleteIteneraryService(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success('Deleted');
          this.loadIteneraryServiceList();
        }
        this.dataLoading.set(false);
      }
    });
  }

  onFilterDestinationChange() {
    this.FilterLocationId = 0;
    this.FilterLocationList.set([]);
    this.loadIteneraryServiceList();
    if (!this.FilterDestinationId || this.FilterDestinationId == 0) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ DestinationId: Number(this.FilterDestinationId) })).toString()
    };
    this.service.getLocationList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.FilterLocationList.set(r1.LocationList);
        }
      }
    });
  }

  onFilterLocationChange() {
    this.loadIteneraryServiceList();
  }

  loadIteneraryServiceList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ LocationId: Number(this.FilterLocationId) })).toString()
    };
    this.dataLoading.set(true);
    this.service.getIteneraryServiceList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.IteneraryServiceList.set(r1.IteneraryServiceList);
        }
        this.dataLoading.set(false);
      },
      error: () => this.dataLoading.set(false)
    });
  }

  sort(key: any) { this.sortKey = key; this.reverse = !this.reverse; }
  onTableDataChange(p: any) { this.p = p; }

  // ── View modal ────────────────────────────────────────────────────────
viewItem = signal<any>(null);
viewRates: any[] = [];
showViewModal = false;

viewIteneraryService(item: any) {
  this.dataLoading.set(true);
  const rateReq = {
    request: this.localService.encrypt(
      JSON.stringify({ IteneraryServiceId: item.IteneraryServiceId })
    ).toString()
  };
  this.service.getVehicleServiceRateList(rateReq).subscribe({
    next: (r1: any) => {
      this.viewRates = r1.VehicleServiceRateList || [];
      this.viewItem.set(item);
      this.showViewModal = true;
      this.dataLoading.set(false);
    },
    error: () => {
      this.toastr.error('Error loading details');
      this.dataLoading.set(false);
    }
  });
}

closeViewModal() {
  this.showViewModal = false;
  this.viewItem.set(null);
  this.viewRates = [];
}
  // Clear only itinerary service name, day schedule, and vehicle rate rows after save
  clearFormFieldsAfterSave() {
    if (this.IteneraryServiceModel) {
      this.IteneraryServiceModel.IteneraryServiceName = '';
      this.IteneraryServiceModel.DaySchedule = '';
    }
    this.VehicleRateRows = this.VehicleRateRows.map(row => ({
      ...row,
      VehicleServiceRateId: 0,
      // Keep FromDate and ToDate unchanged
      RateAmount: null,
    }));
    // Do NOT clear SharedFromDate and SharedToDate
    this.isSubmitted = false;
    if (this.formIteneraryService) {
      this.formIteneraryService.control.markAsPristine();
      this.formIteneraryService.control.markAsUntouched();
    }
  }
}
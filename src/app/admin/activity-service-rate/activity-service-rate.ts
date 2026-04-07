import { Component, ViewChild, inject, signal } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { NgxPaginationModule } from 'ngx-pagination';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { Status } from '../../utils/enum';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { LoadDataService } from '../../utils/load-data.service';
import { Progress } from '../../component/progress/progress';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FilterPipe } from '../../utils/filter-pipe';
import { OrderByPipe } from '../../utils/orderby-pipe';

@Component({
  selector: 'app-activity-service-rate',
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
    Progress,
    MatDatepickerModule,
    MatNativeDateModule,
    FilterPipe,
    OrderByPipe
  ],
  templateUrl: './activity-service-rate.html',
  styleUrl: './activity-service-rate.css',
})
export class ActivityServiceRate {

  // ── Signals ───────────────────────────────────────────────────────────
  dataLoading = signal(false);
  DestinationList = signal<any[]>([]);
  LocationList = signal<any[]>([]);
  ActivityServiceList = signal<any[]>([]);
  ActivityServiceRateList = signal<any[]>([]);

  action = signal<ActionModel>({
    CanCreate: false, CanEdit: false, CanDelete: false,
    MenuTitle: '', ParentMenuTitle: ''
  } as ActionModel);

  // ── Form model ────────────────────────────────────────────────────────
  ActivityServiceRateModel: any = {};
  isSubmitted = false;

  // ── Form cascade selects ──────────────────────────────────────────────
  SelectedDestinationId: any = 0;
  SelectedLocationId: any = 0;
  SelectedActivityServiceId: any = 0;

  // ── Filter cascade (list section) ─────────────────────────────────────
  FilterDestinationId: any = 0;
  FilterLocationId: any = 0;
  FilterActivityServiceId: any = 0;
  FilterLocationList = signal<any[]>([]);
  FilterActivityServiceList = signal<any[]>([]);

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
  }

  @ViewChild('formActivityServiceRate') formActivityServiceRate!: NgForm;

  // ── Menu validation ───────────────────────────────────────────────────
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

  // ── Reset form ────────────────────────────────────────────────────────
  resetForm() {
    this.ActivityServiceRateModel = { Status: 1 };
    this.SelectedDestinationId = 0;
    this.SelectedLocationId = 0;
    this.SelectedActivityServiceId = 0;
    this.LocationList.set([]);
    this.ActivityServiceList.set([]);
    this.isSubmitted = false;
    if (this.formActivityServiceRate) {
      this.formActivityServiceRate.control.markAsPristine();
      this.formActivityServiceRate.control.markAsUntouched();
    }
  }

  // ── Destination list ──────────────────────────────────────────────────
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

  // ═══════════════════════════════════════════════════════════════════════
  // FORM CASCADE
  // ═══════════════════════════════════════════════════════════════════════

  onFormDestinationChange() {
    this.SelectedLocationId = 0;
    this.SelectedActivityServiceId = 0;
    this.ActivityServiceRateModel.ActivityServiceId = null;
    this.LocationList.set([]);
    this.ActivityServiceList.set([]);

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
        } else {
          this.toastr.error(r1.Message);
        }
      },
      error: () => this.toastr.error('Error while fetching locations')
    });
  }

  onFormLocationChange() {
    this.SelectedActivityServiceId = 0;
    this.ActivityServiceRateModel.ActivityServiceId = null;
    this.ActivityServiceList.set([]);

    if (!this.SelectedLocationId || this.SelectedLocationId == 0) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ LocationId: Number(this.SelectedLocationId) })
      ).toString()
    };
    this.service.getActivityServiceList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.ActivityServiceList.set(r1.ActivityServiceList);
        } else {
          this.toastr.error(r1.Message);
        }
      },
      error: () => this.toastr.error('Error while fetching activity services')
    });
  }

  onFormActivityServiceChange() {
    this.ActivityServiceRateModel.ActivityServiceId = this.SelectedActivityServiceId;
  }

  // ── Save ──────────────────────────────────────────────────────────────
  saveActivityServiceRate() {
    this.isSubmitted = true;
    if (
      !this.ActivityServiceRateModel.ActivityServiceId ||
      !this.ActivityServiceRateModel.FromDate ||
      !this.ActivityServiceRateModel.ToDate ||
      this.ActivityServiceRateModel.AdultRate === null ||
      this.ActivityServiceRateModel.AdultRate === undefined ||
      // this.ActivityServiceRateModel.ChildAboveTwoYear === null ||
      // this.ActivityServiceRateModel.ChildAboveTwoYear === undefined ||
      // this.ActivityServiceRateModel.ChildBelowTwoYear === null ||
      // this.ActivityServiceRateModel.ChildBelowTwoYear === undefined ||
      this.ActivityServiceRateModel.Status === null ||
      this.ActivityServiceRateModel.Status === undefined
    ) {
      this.toastr.error('Please fill all required fields');
      return;
    }

    this.ActivityServiceRateModel.CreatedBy = this.staffLogin.StaffLoginId;
    this.ActivityServiceRateModel.UpdatedBy = this.staffLogin.StaffLoginId;

    // ── Convert dates same as HotelRate ──────────────────────────────
    const payload = [{
      ...this.ActivityServiceRateModel,
      FromDate: this.loadData.loadDateTime(this.ActivityServiceRateModel.FromDate),
      ToDate: this.loadData.loadDateTime(this.ActivityServiceRateModel.ToDate),
    }];

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.dataLoading.set(true);
    this.service.saveActivityServiceRate(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success(
            this.ActivityServiceRateModel.ActivityServiceRateId > 0
              ? 'Record updated successfully'
              : 'Record saved successfully'
          );
          // this.resetForm();
          this.resetRatesOnly();

          // Refresh the list after successful save to show changes immediately
          // Note: This will reload all visible records based on current filter
          this.loadActivityServiceRateList();
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error occurred while saving data');
        this.dataLoading.set(false);
      }
    });
  }

  // ── Edit — prefill form ───────────────────────────────────────────────
  editActivityServiceRate(item: any) {
    this.SelectedDestinationId = item.DestinationId ?? 0;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: Number(this.SelectedDestinationId) })
      ).toString()
    };
    this.service.getLocationList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.LocationList.set(r1.LocationList);
          this.SelectedLocationId = item.LocationId;

          // load activity services for that location
          const obj2: RequestModel = {
            request: this.localService.encrypt(
              JSON.stringify({ LocationId: Number(item.LocationId) })
            ).toString()
          };
          this.service.getActivityServiceList(obj2).subscribe({
            next: (r2: any) => {
              if (r2.Message == ConstantData.SuccessMessage) {
                this.ActivityServiceList.set(r2.ActivityServiceList);
                this.SelectedActivityServiceId = item.ActivityServiceId;
                this.ActivityServiceRateModel = {
                  ActivityServiceRateId: item.ActivityServiceRateId,
                  ActivityServiceId: item.ActivityServiceId,
                  FromDate: item.FromDate ? new Date(item.FromDate) : null,   // ← parse to Date
                  ToDate: item.ToDate ? new Date(item.ToDate) : null,   // ← parse to Date
                  AdultRate: item.AdultRate,
                  ChildAboveTwoYear: item.ChildAboveTwoYear,
                  ChildBelowTwoYear: item.ChildBelowTwoYear,
                  Status: item.Status,
                };
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }
          });
        }
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────
  deleteActivityServiceRate(item: any) {
    if (!confirm('Are you sure you want to delete this record?')) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ ActivityServiceRateId: item.ActivityServiceRateId })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.deleteActivityServiceRate(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success('Record deleted successfully');
          this.ActivityServiceRateList.update(rows =>
            rows.filter(x => x.ActivityServiceRateId !== item.ActivityServiceRateId)
          );
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error occurred while deleting the record');
        this.dataLoading.set(false);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FILTER CASCADE (list section)
  // ═══════════════════════════════════════════════════════════════════════

  onFilterDestinationChange() {
    this.FilterLocationId = 0;
    this.FilterActivityServiceId = 0;
    this.FilterLocationList.set([]);
    this.FilterActivityServiceList.set([]);
    this.ActivityServiceRateList.set([]);

    if (!this.FilterDestinationId || this.FilterDestinationId == 0) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: Number(this.FilterDestinationId) })
      ).toString()
    };
    this.service.getLocationList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.FilterLocationList.set(r1.LocationList);
        } else {
          this.toastr.error(r1.Message);
        }
      },
      error: () => this.toastr.error('Error while fetching locations')
    });
  }

  onFilterLocationChange() {
    this.FilterActivityServiceId = 0;
    this.FilterActivityServiceList.set([]);
    this.ActivityServiceRateList.set([]);

    if (!this.FilterLocationId || this.FilterLocationId == 0) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ LocationId: Number(this.FilterLocationId) })
      ).toString()
    };
    this.service.getActivityServiceList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.FilterActivityServiceList.set(r1.ActivityServiceList);
        } else {
          this.toastr.error(r1.Message);
        }
      },
      error: () => this.toastr.error('Error while fetching activity services')
    });
      // ✅ load all rates for this location immediately
  this.loadActivityServiceRateList();
  }

// ✅ fixed — always load when location is selected
onFilterActivityServiceChange() {
  this.ActivityServiceRateList.set([]);
  if (!this.FilterLocationId || this.FilterLocationId == 0) return;
  this.loadActivityServiceRateList();
}

 loadActivityServiceRateList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ ActivityServiceId: Number(this.FilterActivityServiceId) || 0,
        LocationId: Number(this.FilterLocationId) || 0  // ✅ add this
        })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.getActivityServiceRateList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.ActivityServiceRateList.set(r1.ActivityServiceRateList);
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while fetching activity service rates');
        this.dataLoading.set(false);
      }
    });
  }

  sort(key: any) { this.sortKey = key; this.reverse = !this.reverse; }
  onTableDataChange(p: any) { this.p = p; }
  resetRatesOnly() {
  // 1. Reset specific model properties
  this.ActivityServiceRateModel.ActivityServiceRateId = 0;
  this.SelectedActivityServiceId = 0;
  this.ActivityServiceRateModel.AdultRate = null;
  this.ActivityServiceRateModel.ChildAboveTwoYear = null;
  this.ActivityServiceRateModel.ChildBelowTwoYear = null;

  // 2. Clear submission state
  this.isSubmitted = false;

  // 3. Manually clear the validation state of those specific fields in the UI
  if (this.formActivityServiceRate) {
    const controlsToReset = ['AdultRate', 'ChildAboveTwoYear', 'ChildBelowTwoYear'];
    
    controlsToReset.forEach(controlName => {
      const control = this.formActivityServiceRate.form.get(controlName);
      if (control) {
        control.markAsPristine();
        control.markAsUntouched();
      }
    });
  }
}
}
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
import { Status, Servicetype } from '../../utils/enum';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { LoadDataService } from '../../utils/load-data.service';
import { FilterPipe } from '../../utils/filter-pipe';
import { OrderByPipe } from '../../utils/orderby-pipe';
import { Progress } from '../../component/progress/progress';

@Component({
  selector: 'app-activity-service',
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
    FilterPipe,
    OrderByPipe,
    Progress,
  ],
  templateUrl: './activity-service.html',
  styleUrl: './activity-service.css',
})
export class ActivityService {

  dataLoading = signal(false);
  DestinationList = signal<any[]>([]);
  LocationList = signal<any[]>([]);
  ActivityServiceList = signal<any[]>([]);

  action = signal<ActionModel>({
    CanCreate: false, CanEdit: false, CanDelete: false,
    MenuTitle: '', ParentMenuTitle: ''
  } as ActionModel);

  ActivityServiceModel: any = {};
  isSubmitted = false;

  SelectedDestinationId: any = 0;
  SelectedLocationId: any = 0;

  FilterDestinationId: any = 0;
  FilterLocationId: any = 0;
  FilterLocationList = signal<any[]>([]);

  Search = '';
  reverse = false;
  sortKey = '';
  p = 1;
  itemPerPage: number;

  loadData = inject(LoadDataService);
  StatusList = this.loadData.GetEnumList(Status);
  ServiceTypeList = this.loadData.GetEnumList(Servicetype);
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

  @ViewChild('formActivityService') formActivityService!: NgForm;

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
    this.ActivityServiceModel = { Status: 1, ServiceType: null };
    this.SelectedDestinationId = 0;
    this.SelectedLocationId = 0;
    this.LocationList.set([]);
    this.isSubmitted = false;
    if (this.formActivityService) {
      this.formActivityService.control.markAsPristine();
      this.formActivityService.control.markAsUntouched();
    }
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

  // ── Form cascade ──────────────────────────────────────────────────────
  onFormDestinationChange() {
    this.SelectedLocationId = 0;
    this.ActivityServiceModel.LocationId = null;
    this.LocationList.set([]);
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
                    // ── Message if no locations ──
          console.log(this.FilterLocationList);
          
          if (this.FilterLocationList.length === 0) {
            this.filterLocationMsg = 'No location found for this destination.';
          } else {
            this.filterLocationMsg = '';
          }
        } else {
          this.toastr.error(r1.Message);
        }
      },
      error: () => this.toastr.error('Error while fetching locations')
    });
  }

  onFormLocationChange() {
    this.ActivityServiceModel.LocationId = this.SelectedLocationId;
  }

  // ── Save ──────────────────────────────────────────────────────────────
  saveActivityService() {
    this.isSubmitted = true;
    if (
      !this.ActivityServiceModel.LocationId ||
      !this.ActivityServiceModel.ActivityServiceName ||
      this.ActivityServiceModel.Status === null ||
      this.ActivityServiceModel.Status === undefined
    ) {
      this.toastr.error('Please fill all required fields');
      return;
    }

    this.ActivityServiceModel.CreatedBy = this.staffLogin.StaffLoginId;
    this.ActivityServiceModel.UpdatedBy = this.staffLogin.StaffLoginId;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify(this.ActivityServiceModel)
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.saveActivityService(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success(
            this.ActivityServiceModel.ActivityServiceId > 0
              ? 'Record updated successfully'
              : 'Record saved successfully'
          );
          // CHANGE THIS LINE:
          this.resetAfterSave();
          if (this.FilterLocationId && this.FilterLocationId != 0) {
            this.loadActivityServiceList();
          }
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

  // ── Edit ──────────────────────────────────────────────────────────────
  editActivityService(item: any) {
    // ── Step 1: set destination ───────────────────────────────────────
    this.SelectedDestinationId = item.DestinationId;

    // ── Step 2: load locations for that destination ───────────────────
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: Number(item.DestinationId) })
      ).toString()
    };

    this.dataLoading.set(true);
    this.service.getLocationList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          // ── Step 3: populate location dropdown ────────────────────
          this.LocationList.set(r1.LocationList);

          // ── Step 4: set selected location ────────────────────────
          this.SelectedLocationId = item.LocationId;

          // ── Step 5: fill form model ───────────────────────────────
          this.ActivityServiceModel = {
            ActivityServiceId: item.ActivityServiceId,
            LocationId: item.LocationId,
            ActivityServiceName: item.ActivityServiceName,
            ServiceType: Number(item.ServiceType),
            Status: item.Status,
          };

          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while fetching locations');
        this.dataLoading.set(false);
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────
  deleteActivityService(item: any) {
    if (!confirm('Are you sure you want to delete this record?')) return;
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ ActivityServiceId: item.ActivityServiceId })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.deleteActivityService(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success('Record deleted successfully');
          this.ActivityServiceList.update(rows =>
            rows.filter(x => x.ActivityServiceId !== item.ActivityServiceId)
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
  // ── Empty state messages ──────────────────────────────────────────────
  formLocationMsg = '';
  formHotelMsg = '';
  filterLocationMsg = '';
  filterHotelMsg = '';


  // ── Filter cascade ────────────────────────────────────────────────────
  onFilterDestinationChange() {
    this.FilterLocationId = 0;
    this.FilterLocationList.set([]);
    this.ActivityServiceList.set([]);
    this.filterLocationMsg = '';
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
    this.ActivityServiceList.set([]);
    if (!this.FilterLocationId || this.FilterLocationId == 0) return;
    this.loadActivityServiceList();
  }

  loadActivityServiceList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ LocationId: Number(this.FilterLocationId) })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.getActivityServiceList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.ActivityServiceList.set(r1.ActivityServiceList);
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while fetching activity services');
        this.dataLoading.set(false);
      }
    });
  }

  sort(key: any) { this.sortKey = key; this.reverse = !this.reverse; }
  onTableDataChange(p: any) { this.p = p; }


  // Add this method to your class
  resetAfterSave() {
    // Only clear the name and the ID (so the next save is an 'Add' not an 'Update')
    this.ActivityServiceModel.ActivityServiceName = '';
    this.ActivityServiceModel.ActivityServiceId = 0;

    // Keep LocationId and Status as they are (or reset Status to 1 if preferred)
    this.isSubmitted = false;

    // Reset the form validation state so the red error border disappears
    if (this.formActivityService) {
      this.formActivityService.form.controls['ActivityServiceName']?.markAsPristine();
      this.formActivityService.form.controls['ActivityServiceName']?.markAsUntouched();
    }
  }
}
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
import { FilterPipe } from '../../utils/filter-pipe';
import { OrderByPipe } from '../../utils/orderby-pipe';
import { Progress } from '../../component/progress/progress';
// import { error } from 'jquery';

@Component({
  selector: 'app-vehicle-type',
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
  templateUrl: './vehicle-type.html',
  styleUrl: './vehicle-type.css',
})
export class VehicleType {

  // ── Signals ───────────────────────────────────────────────────────────
  dataLoading = signal(false);
  DestinationList = signal<any[]>([]);
  VehicleTypeList = signal<any[]>([]);

  action = signal<ActionModel>({
    CanCreate: false, CanEdit: false, CanDelete: false,
    MenuTitle: '', ParentMenuTitle: ''
  } as ActionModel);

  // ── Form model ────────────────────────────────────────────────────────
  VehicleTypeModel: any = {};
  isSubmitted = false;

  // ── Form cascade ──────────────────────────────────────────────────────
  SelectedDestinationId: any = 0;

  // ── Filter cascade (list section) ─────────────────────────────────────
  FilterDestinationId: any = 0;

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
      this.loadVehicleTypeList(); // ← add this
  }

  @ViewChild('formVehicleType') formVehicleType!: NgForm;

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
    this.VehicleTypeModel = { Status: 1 };
    this.SelectedDestinationId = 0;
    this.isSubmitted = false;
    if (this.formVehicleType) {
      this.formVehicleType.control.markAsPristine();
      this.formVehicleType.control.markAsUntouched();
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

  // ── Form cascade ──────────────────────────────────────────────────────
  onFormDestinationChange() {
    this.VehicleTypeModel.DestinationId = this.SelectedDestinationId;
  }

  // ── Save ──────────────────────────────────────────────────────────────
  saveVehicleType() {
    this.isSubmitted = true;
    if (
      !this.VehicleTypeModel.DestinationId ||
      !this.VehicleTypeModel.VehicleTypeName ||
      this.VehicleTypeModel.Status === null ||
      this.VehicleTypeModel.Status === undefined
    ) {
      this.toastr.error('Please fill all required fields');
      return;
    }

    this.VehicleTypeModel.CreatedBy = this.staffLogin.StaffLoginId;
    this.VehicleTypeModel.UpdatedBy = this.staffLogin.StaffLoginId;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify(this.VehicleTypeModel)
      ).toString()
    };

    this.dataLoading.set(true);
    this.service.saveVehicleType(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success(
            this.VehicleTypeModel.VehicleTypeId > 0
              ? 'Record updated successfully'
              : 'Record saved successfully'
          );
          this.resetAfterSave();
          // if (this.FilterDestinationId && this.FilterDestinationId != 0) {
          //   this.loadVehicleTypeList();
          // }
          this.loadVehicleTypeList(); // Always reload the table after save
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
  editVehicleType(item: any) {
    this.SelectedDestinationId = item.DestinationId;
    this.VehicleTypeModel = {
      VehicleTypeId:   item.VehicleTypeId,
      DestinationId:   item.DestinationId,
      VehicleTypeName: item.VehicleTypeName,
      Status:          item.Status,
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Delete ────────────────────────────────────────────────────────────
  deleteVehicleType(item: any) {
    if (!confirm('Are you sure you want to delete this record?')) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ VehicleTypeId: item.VehicleTypeId })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.deleteVehicleType(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success('Record deleted successfully');
          this.VehicleTypeList.update(rows =>
            rows.filter(x => x.VehicleTypeId !== item.VehicleTypeId)
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

  // ── Filter cascade ────────────────────────────────────────────────────
  onFilterDestinationChange() {
    this.p = 1; //reset pagination to first page
    this.loadVehicleTypeList();
  }

  loadVehicleTypeList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: Number(this.FilterDestinationId) })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.getVehicleTypeList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.VehicleTypeList.set(r1.VehicleTypeList);
        } else {
          this.toastr.error(r1.Message);
          this.VehicleTypeList.set([]); 
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while fetching vehicle types');
        this.dataLoading.set(false);
      }
    });
  }

  sort(key: any) { this.sortKey = key; this.reverse = !this.reverse; }
  onTableDataChange(p: any) { this.p = p; }

  resetAfterSave(){
     // Clear the anme and Id ( so the next save is a 'new' record)
     this.VehicleTypeModel.VehicleTypeName = '';
     this.VehicleTypeModel.VehicleTypeId = 0;

     //keep destinationId and Status ad they are
     this.isSubmitted = false;

     //reset the vcalidation state of the specific field
     if(this.formVehicleType){
      this.formVehicleType.form.controls['VehicleTypeName']?.markAsPristine();
      this.formVehicleType.form.controls['VehicleTypeName']?.markAsUntouched();
     }
  }
}
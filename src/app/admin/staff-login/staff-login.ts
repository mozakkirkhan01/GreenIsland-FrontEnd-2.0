import { Component, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { NgxPaginationModule } from 'ngx-pagination';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { Status } from '../../utils/enum';
import { LoadDataService } from '../../utils/load-data.service';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { FilterPipe } from '../../utils/filter-pipe';
import { OrderByPipe } from '../../utils/orderby-pipe';

@Component({
  selector: 'app-staff-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatIconModule,
    NgxPaginationModule,
    FilterPipe,
    OrderByPipe,
  ],
  templateUrl: './staff-login.html',
  styleUrls: ['./staff-login.css']
})
export class StaffLogin {
  @ViewChild('formStaffLogin') formStaffLogin!: NgForm;

  // State
  dataLoading = false;
  showModal = false;
  hide = true;
  isSubmitted = false;

  // Pagination & Table
  PageSize = ConstantData.PageSizes;
  p = 1;
  Search = '';
  sortKey = '';
  reverse = false;
  itemPerPage: number = this.PageSize[0];

  // Data
  StaffLoginList: any[] = [];
  StaffLogin: any = {};
  StaffList: any[] = [];
  filterStaff: any[] = [];
  StaffLoginRoleList: any[] = [];

  // Auth & Actions
  action: ActionModel = {} as ActionModel;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;

  // Lookup
  private loadData = inject(LoadDataService);
  StatusList = this.loadData.GetEnumList(Status);
  AllStatusList = Status;

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private localService: LocalService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validateMenu();
    this.getStaffLoginList();
    this.getStaffList();
    this.getRoleList();
  }

  // ─── Table Helpers ───────────────────────────────────────────────

  sort(key: string): void {
    this.sortKey = key;
    this.reverse = !this.reverse;
  }

  onTableDataChange(page: number): void {
    this.p = page;
  }

  // ─── Modal ───────────────────────────────────────────────────────

  private resetForm(): void {
    this.StaffLogin = { Status: 1 };
    this.isSubmitted = false;
    if (this.formStaffLogin) {
      this.formStaffLogin.control.markAsPristine();
      this.formStaffLogin.control.markAsUntouched();
    }
  }

  newStaffLogin(): void {
    this.resetForm();
    this.StaffLoginRoleList.forEach(role => {
      role.IsSelected = false;
      role.StaffLoginRoleId = null;
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.resetForm();
    this.showModal = false;
  }

  editStaffLogin(obj: any): void {
    this.resetForm();
    this.StaffLogin = { ...obj };
    this.StaffLoginRoleList.forEach(role => {
      const match = obj.StaffLoginRoleList.find((x: any) => x.RoleId === role.RoleId);
      role.IsSelected = !!match;
      role.StaffLoginRoleId = match?.StaffLoginRoleId ?? 0;
    });
    this.showModal = true;
  }

  // ─── Autocomplete ─────────────────────────────────────────────────

  filterStaffList(value: string): void {
    const lower = value?.toLowerCase() ?? '';
    this.filterStaff = lower
      ? this.StaffList.filter(s => s.StaffName.toLowerCase().includes(lower))
      : [...this.StaffList];
  }

  // ─── API Calls ────────────────────────────────────────────────────

  private encrypt(data: object): RequestModel {
    return { request: this.localService.encrypt(JSON.stringify(data)).toString() };
  }

  private validateMenu(): void {
    this.dataLoading = true;
    this.service.validiateMenu(this.encrypt({
      Url: this.router.url,
      StaffLoginId: this.staffLogin.StaffLoginId
    })).subscribe({
      next: (response: any) => {
        this.action = this.loadData.validiateMenu(response, this.toastr, this.router);
        this.dataLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error("Error while fetching records");
        this.dataLoading = false;
      }
    });
  }

  getRoleList(): void {
    this.dataLoading = true;
    this.service.getRoleList(this.encrypt({})).subscribe({
      next: (r1: any) => {
        if (r1.Message === ConstantData.SuccessMessage) {
          this.StaffLoginRoleList = r1.RoleList;
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading = false;
      },
      error: () => {
        this.toastr.error("Error while fetching records");
        this.dataLoading = false;
      }
    });
  }

  getStaffList(): void {
    this.dataLoading = true;
    this.service.getStaffList(this.encrypt({})).subscribe({
      next: (r1: any) => {
        if (r1.Message === ConstantData.SuccessMessage) {
          this.StaffList = r1.StaffList;
          this.filterStaff = [...r1.StaffList];
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading = false;
      },
      error: () => {
        this.toastr.error("Error while fetching records");
        this.dataLoading = false;
      }
    });
  }

  getStaffLoginList(): void {
    this.dataLoading = true;
    this.service.getStaffLoginList(this.encrypt({})).subscribe({
      next: (r1: any) => {
        if (r1.Message === ConstantData.SuccessMessage) {
          this.StaffLoginList = r1.StaffLoginList;
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading = false;
      },
      error: () => {
        this.toastr.error("Error while fetching records");
        this.dataLoading = false;
      }
    });
  }

  saveStaffLogin(): void {
    this.isSubmitted = true;
    this.formStaffLogin.control.markAllAsTouched();
    if (this.formStaffLogin.invalid) {
      this.toastr.error("Fill all the required fields !!");
      return;
    }

    this.StaffLoginRoleList.forEach(role => {
      if (role.IsSelected && role.StaffLoginRoleId == null) {
        role.StaffLoginRoleId = 0;
      }
    });

    this.dataLoading = true;
    this.service.saveStaffLogin(this.encrypt({
      StaffLogin: this.StaffLogin,
      StaffLoginRoleList: this.StaffLoginRoleList.filter(r => r.IsSelected),
      StaffClassList: [],
      StaffLoginId: this.staffLogin.StaffLoginId
    })).subscribe({
      next: (r1: any) => {
        if (r1.Message === ConstantData.SuccessMessage) {
          this.toastr.success(this.StaffLogin.StaffLoginId > 0
            ? "Staff Login updated successfully"
            : "Staff Login added successfully");
          this.closeModal();
          this.getStaffLoginList();
        } else {
          this.toastr.error(r1.Message);
          this.dataLoading = false;
        }
      },
      error: () => {
        this.toastr.error("Error occurred while submitting data");
        this.dataLoading = false;
      }
    });
  }

  deleteStaffLogin(obj: any): void {
    if (!confirm("Are you sure you want to delete this record?")) return;

    this.dataLoading = true;
    this.service.deleteStaffLogin(this.encrypt(obj)).subscribe({
      next: (r1: any) => {
        if (r1.Message === ConstantData.SuccessMessage) {
          this.toastr.success("Record deleted successfully");
          this.getStaffLoginList();
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading = false;
      },
      error: () => {
        this.toastr.error("Error occurred while deleting the record");
        this.dataLoading = false;
      }
    });
  }
}
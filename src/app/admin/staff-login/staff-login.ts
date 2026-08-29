import { Component, ViewChild, inject, signal } from '@angular/core';
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
import { Progress } from '../../component/progress/progress';

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
    Progress,
  ],
  templateUrl: './staff-login.html',
  styleUrls: ['./staff-login.css']
})
export class StaffLogin {
  @ViewChild('formStaffLogin') formStaffLogin!: NgForm;

  // ── Signals ──────────────────────────────────────────────────────────
  dataLoading         = signal(false);
  showModal           = signal(false);
  StaffLoginList       = signal<any[]>([]);
  StaffList             = signal<any[]>([]);
  filterStaff           = signal<any[]>([]);
  StaffLoginRoleList    = signal<any[]>([]);
  visiblePasswords = signal(new Set<number>());
  action               = signal<ActionModel>({
    CanCreate: false,
    CanEdit: false,
    CanDelete: false,
    MenuTitle: '',
    ParentMenuTitle: ''
  } as ActionModel);

  // ── Plain properties ────────────────────────────────────────────────
  hide         = true;
  isSubmitted  = false;
  StaffLogin: any = {};
  Search       = '';
  sortKey      = '';
  reverse      = false;
  p            = 1;
  itemPerPage: number;

  PageSize      = ConstantData.PageSizes;
  loadData      = inject(LoadDataService);
  StatusList    = this.loadData.GetEnumList(Status);
  AllStatusList = Status;
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

  private encrypt(data: object): RequestModel {
    return { request: this.localService.encrypt(JSON.stringify(data)).toString() };
  }

  // ─── Menu validation ────────────────────────────────────────────────

  validateMenu(): void {
    this.dataLoading.set(true);
    this.service.validiateMenu(this.encrypt({
      Url: this.router.url,
      StaffLoginId: this.staffLogin.StaffLoginId
    })).subscribe({
      next: (response: any) => {
        this.action.set({ ...this.loadData.validiateMenu(response, this.toastr, this.router) });
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error("Error while fetching records");
        this.dataLoading.set(false);
      }
    });
  }

togglePassword(staffLoginId: number): void {
  this.visiblePasswords.update(set => {
    const next = new Set(set);
    if (next.has(staffLoginId)) {
      next.delete(staffLoginId);
    } else {
      next.add(staffLoginId);
    }
    return next;
  });
}

isPasswordVisible(staffLoginId: number): boolean {
  return this.visiblePasswords().has(staffLoginId);
}

  // ─── Modal ───────────────────────────────────────────────────────────

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
    this.StaffLoginRoleList.update(list =>
      list.map(role => ({ ...role, IsSelected: false, StaffLoginRoleId: null }))
    );
    this.showModal.set(true);
  }

  closeModal(): void {
    this.resetForm();
    this.showModal.set(false);
  }

  editStaffLogin(obj: any): void {
    this.resetForm();
    this.StaffLogin = { ...obj };
    this.StaffLoginRoleList.update(list =>
      list.map(role => {
        const match = obj.StaffLoginRoleList.find((x: any) => x.RoleId === role.RoleId);
        return { ...role, IsSelected: !!match, StaffLoginRoleId: match?.StaffLoginRoleId ?? 0 };
      })
    );
    this.showModal.set(true);
  }

  // ─── Autocomplete ─────────────────────────────────────────────────

  filterStaffList(value: string): void {
    const lower = value?.toLowerCase() ?? '';
    const source = this.StaffList();
    this.filterStaff.set(
      lower ? source.filter(s => s.StaffName.toLowerCase().includes(lower)) : [...source]
    );
  }

  // ─── API Calls ────────────────────────────────────────────────────

  getRoleList(): void {
    this.dataLoading.set(true);
    this.service.getRoleList(this.encrypt({})).subscribe({
      next: (r1: any) => {
        if (r1.Message === ConstantData.SuccessMessage) {
          this.StaffLoginRoleList.set(r1.RoleList);
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error("Error while fetching records");
        this.dataLoading.set(false);
      }
    });
  }

  getStaffList(): void {
    this.dataLoading.set(true);
    this.service.getStaffList(this.encrypt({})).subscribe({
      next: (r1: any) => {
        if (r1.Message === ConstantData.SuccessMessage) {
          this.StaffList.set(r1.StaffList);
          this.filterStaff.set([...r1.StaffList]);
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error("Error while fetching records");
        this.dataLoading.set(false);
      }
    });
  }

  getStaffLoginList(): void {
    this.dataLoading.set(true);
    this.service.getStaffLoginList(this.encrypt({})).subscribe({
      next: (r1: any) => {
        if (r1.Message === ConstantData.SuccessMessage) {
          this.StaffLoginList.set(r1.StaffLoginList);
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error("Error while fetching records");
        this.dataLoading.set(false);
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

    const roles = this.StaffLoginRoleList().map(role =>
      role.IsSelected && role.StaffLoginRoleId == null
        ? { ...role, StaffLoginRoleId: 0 }
        : role
    );
    this.StaffLoginRoleList.set(roles);

    this.dataLoading.set(true);
    this.service.saveStaffLogin(this.encrypt({
      StaffLogin: this.StaffLogin,
      StaffLoginRoleList: roles.filter(r => r.IsSelected),
      StaffClassList: [],
      StaffLoginId: this.staffLogin.StaffLoginId
    })).subscribe({
      next: (r1: any) => {
        if (r1.Message === ConstantData.SuccessMessage) {
          this.toastr.success(this.StaffLogin.StaffLoginId > 0
            ? "Staff Login updated successfully"
            : "Staff Login added successfully");
          this.dataLoading.set(false);
          this.closeModal();
          this.getStaffLoginList();
        } else {
          this.toastr.error(r1.Message);
          this.dataLoading.set(false);
        }
      },
      error: () => {
        this.toastr.error("Error occurred while submitting data");
        this.dataLoading.set(false);
      }
    });
  }

  deleteStaffLogin(obj: any): void {
    if (!confirm("Are you sure you want to delete this record?")) return;

    this.dataLoading.set(true);
    this.service.deleteStaffLogin(this.encrypt(obj)).subscribe({
      next: (r1: any) => {
        if (r1.Message === ConstantData.SuccessMessage) {
          this.toastr.success("Record deleted successfully");
          this.StaffLoginList.update(list =>
            list.filter(x => x.StaffLoginId !== obj.StaffLoginId)
          );
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error("Error occurred while deleting the record");
        this.dataLoading.set(false);
      }
    });
  }
}
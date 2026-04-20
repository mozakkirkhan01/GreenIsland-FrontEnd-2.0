import { Component, ViewChild, inject, signal, computed, OnInit, AfterViewInit } from '@angular/core';
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
import { LoadDataService } from '../../utils/load-data.service';
import { LocalService } from '../../utils/local.service';
import { Gender, StaffType, Status } from '../../utils/enum';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';

@Component({
  selector: 'app-staff',
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
  ],
  templateUrl: './staff.html',
  styleUrls: ['./staff.css']
})
export class Staff implements OnInit {
  // ─── Signals for reactive state ─────────────────────────────────────────
  dataLoading = signal(false);
  StaffList = signal<any[]>([]);
  DepartmentList = signal<any[]>([]);
  DesignationList = signal<any[]>([]);
  showModal = signal(false);
  isSubmitted = signal(false);

  // Search and pagination signals
  Search = signal('');
  p = signal(1);
  itemPerPage = signal(ConstantData.PageSizes[0]);
  sortKey = signal('');
  reverse = signal(false);

  // Form model as signal
  Staff = signal<any>({});

  // Computed values - automatically update when dependencies change
  filteredStaff = computed(() => {
    let list = this.StaffList();
    const searchTerm = this.Search().toLowerCase();

    if (searchTerm) {
      list = list.filter(item =>
        item.StaffName?.toLowerCase().includes(searchTerm) ||
        item.CompanyName?.toLowerCase().includes(searchTerm) ||
        item.MobileNo?.includes(searchTerm) ||
        item.Email?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    if (this.sortKey()) {
      const key = this.sortKey();
      const isReverse = this.reverse();
      list = [...list].sort((a, b) => {
        const valA = a[key] || '';
        const valB = b[key] || '';
        const comparison = valA.toString().localeCompare(valB.toString());
        return isReverse ? -comparison : comparison;
      });
    }

    return list;
  });

  paginatedStaff = computed(() => {
    const start = (this.p() - 1) * this.itemPerPage();
    const end = start + this.itemPerPage();
    return this.filteredStaff().slice(start, end);
  });

  // Regular properties (not needing reactivity)
  PageSize = ConstantData.PageSizes;
  action = signal<ActionModel>({} as ActionModel);
  staffLogin: StaffLoginModel = {} as StaffLoginModel;
  StatusList: any[] = [];
  GenderList: any[] = [];

  loadDataService = inject(LoadDataService);
  StaffTypeList = this.loadDataService.GetEnumList(StaffType);
  AllStatusList = Status;
  AllGenderList = Gender;
  AllStaffTypeList = StaffType;

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private localService: LocalService,
    private router: Router,
  ) { }

  @ViewChild('formStaff') formStaff!: NgForm;

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.StatusList = this.loadDataService.GetEnumList(Status);
    this.GenderList = this.loadDataService.GetEnumList(Gender);

    this.validiateMenu();
    this.getStaffList();
    this.getDepartmentList();
    this.getDesignationList();
  }

  // ─── Sorting ─────────────────────────────────────────────────────────
  sort(key: string) {this.onItemsPerPageChange
    if (this.sortKey() === key) {
      this.reverse.set(!this.reverse());
    } else {
      this.sortKey.set(key);
      this.reverse.set(false);
    }
  }

  onTableDataChange(page: number) {
    this.p.set(page);
  }

  onItemsPerPageChange(size: number) {
    this.itemPerPage.set(size);
    this.p.set(1); // Reset to first page
  }

  // ─── Menu Validation ─────────────────────────────────────────────────
  validiateMenu() {
    var obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ Url: this.router.url, StaffLoginId: this.staffLogin.StaffLoginId })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.validiateMenu(obj).subscribe((response: any) => {
      this.action.set(this.loadDataService.validiateMenu(response, this.toastr, this.router));
      this.dataLoading.set(false);
    }, err => {
      this.toastr.error("Error while fetching records");
      this.dataLoading.set(false);
    });
  }

  // ─── Form Methods ────────────────────────────────────────────────────
  resetForm() {
    this.Staff.set({ Status: 1 });
    this.isSubmitted.set(false);
    if (this.formStaff) {
      this.formStaff.control.markAsPristine();
      this.formStaff.control.markAsUntouched();
    }
  }

  openModal() {
    this.resetForm();
    this.showModal.set(true);
  }

  closeModal() {
    this.resetForm();
    this.showModal.set(false);
  }

  // ─── API Calls ───────────────────────────────────────────────────────
  getDesignationList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading.set(true);
    this.service.getDesignationList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.DesignationList.set(response.DesignationList);
      } else {
        this.toastr.error(response.Message);
      }
      this.dataLoading.set(false);
    }, err => {
      this.toastr.error("Error while fetching records");
      this.dataLoading.set(false);
    });
  }

  getDepartmentList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading.set(true);
    this.service.getDepartmentList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.DepartmentList.set(response.DepartmentList);
      } else {
        this.toastr.error(response.Message);
      }
      this.dataLoading.set(false);
    }, err => {
      this.toastr.error("Error while fetching records");
      this.dataLoading.set(false);
    });
  }

  getStaffList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading.set(true);
    this.service.getStaffList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.StaffList.set(response.StaffList);
        console.log("staff list",this.StaffList());
        
      } else {
        this.toastr.error(response.Message);
      }
      this.dataLoading.set(false);
    }, err => {
      this.toastr.error("Error while fetching records");
      this.dataLoading.set(false);
    });
  }

  saveStaff() {
    this.isSubmitted.set(true);
    this.formStaff.control.markAllAsTouched();

    if (this.formStaff.invalid) {
      this.toastr.error("Fill all the required fields !!");
      return;
    }

    const currentStaff = this.Staff();
    currentStaff.UpdatedBy = this.staffLogin.StaffLoginId;
    currentStaff.CreatedBy = this.staffLogin.StaffLoginId;

    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(currentStaff)).toString()
    };

    this.dataLoading.set(true);
    this.service.saveStaff(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.toastr.success(currentStaff.StaffId > 0
          ? "Staff updated successfully"
          : "Staff added successfully");

        this.closeModal();
        this.getStaffList(); // Signal will automatically update UI
      } else {
        this.toastr.error(response.Message);
        this.dataLoading.set(false);
      }
    }, err => {
      this.toastr.error("Error occured while submitting data");
      this.dataLoading.set(false);
    });
  }

  deleteStaff(obj: any) {
    if (confirm("Are you sure you want to delete this record?")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      };
      this.dataLoading.set(true);
      this.service.deleteStaff(request).subscribe(r1 => {
        let response = r1 as any;
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Record deleted successfully");
          this.getStaffList(); // Signal will automatically update UI
        } else {
          this.toastr.error(response.Message);
        }
        this.dataLoading.set(false);
      }, err => {
        this.toastr.error("Error occured while deleting the record");
        this.dataLoading.set(false);
      });
    }
  }

  editStaff(obj: any) {
    this.Staff.set({ ...obj });
    this.showModal.set(true);
  }
  // Add this for template usage
  Math = Math;
}
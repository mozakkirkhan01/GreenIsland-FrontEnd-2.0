import { Component, ViewChild, ChangeDetectorRef, inject } from '@angular/core';
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
import { FilterPipe } from '../../utils/filter-pipe';
import { OrderByPipe } from '../../utils/orderby-pipe';
import { LoadDataService } from '../../utils/load-data.service';

@Component({
  selector: 'app-department',
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
  ],
  templateUrl: './department.html',
  styleUrls: ['./department.css']
})
export class Department {
  dataLoading: boolean = false;
  DepartmentList: any = [];
  Department: any = {};
  isSubmitted = false;
  loadData = inject(LoadDataService);
  StatusList = this.loadData.GetEnumList(Status);
  AllStatusList = Status;
  PageSize = ConstantData.PageSizes;
  p: number = 1;
  Search: string = '';
  reverse: boolean = false;
  sortKey: string = '';
  itemPerPage: number = this.PageSize[0];
  action: ActionModel = {} as ActionModel;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;
  showModal: boolean = false;

  sort(key: any) {
    this.sortKey = key;
    this.reverse = !this.reverse;
  }

  onTableDataChange(p: any) {
    this.p = p;
  }

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private localService: LocalService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.getDepartmentList();
    this.resetForm();
  }

  validiateMenu() {
    var obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ Url: this.router.url, StaffLoginId: this.staffLogin.StaffLoginId })
      ).toString()
    };
    this.dataLoading = true;
    this.service.validiateMenu(obj).subscribe((response: any) => {
      this.action = { ...this.loadData.validiateMenu(response, this.toastr, this.router) };
      this.dataLoading = false;
      this.cdr.detectChanges();
    }, err => {
      this.toastr.error("Error while fetching records");
      this.dataLoading = false;
    });
  }

  @ViewChild('formDepartment') formDepartment!: NgForm;

  resetForm() {
    this.Department = { Status: 1 };
    if (this.formDepartment) {
      this.formDepartment.control.markAsPristine();
      this.formDepartment.control.markAsUntouched();
    }
    this.isSubmitted = false;
  }

  openModal() {
    this.resetForm();
    this.showModal = true;
  }

  closeModal() {
    this.resetForm();
    this.showModal = false;
  }

  getDepartmentList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading = true;
    this.service.getDepartmentList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.DepartmentList = response.DepartmentList;
      } else {
        this.toastr.error(response.Message);
      }
      this.dataLoading = false;
    }, err => {
      this.toastr.error("Error while fetching records");
      this.dataLoading = false;
    });
  }

  saveDepartment() {
    this.isSubmitted = true;
    this.formDepartment.control.markAllAsTouched();
    if (this.formDepartment.invalid) {
      this.toastr.error("Fill all the required fields !!");
      return;
    }
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.Department)).toString()
    };
    this.dataLoading = true;
    this.service.saveDepartment(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.toastr.success(this.Department.DepartmentId > 0
          ? "Department updated successfully"
          : "Department added successfully");
        this.closeModal();
        this.getDepartmentList();
      } else {
        this.toastr.error(response.Message);
        this.dataLoading = false;
      }
    }, err => {
      this.toastr.error("Error occured while submitting data");
      this.dataLoading = false;
    });
  }

  deleteDepartment(obj: any) {
    if (confirm("Are you sure you want to delete this record?")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      };
      this.dataLoading = true;
      this.service.deleteDepartment(request).subscribe(r1 => {
        let response = r1 as any;
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Record deleted successfully");
          this.getDepartmentList();
        } else {
          this.toastr.error(response.Message);
          this.dataLoading = false;
        }
      }, err => {
        this.toastr.error("Error occured while deleting the record");
        this.dataLoading = false;
      });
    }
  }

  editDepartment(obj: any) {
    this.Department = { ...obj };
    this.showModal = true;
  }
}
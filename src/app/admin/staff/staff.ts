import { Component, ViewChild, inject } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NgxPaginationModule } from 'ngx-pagination';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LoadDataService } from '../../utils/load-data.service';
import { LocalService } from '../../utils/local.service';
import { Gender, StaffType, Status } from '../../utils/enum';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { FilterPipe } from '../../utils/filter-pipe';
import { OrderByPipe } from '../../utils/orderby-pipe';

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
    MatDatepickerModule,
    MatNativeDateModule,
    NgxPaginationModule,
    FilterPipe,
    OrderByPipe,
  ],
  templateUrl: './staff.html',
  styleUrls: ['./staff.css']
})
export class Staff {
  dataLoading: boolean = false;
  StaffList: any = [];
  Staff: any = {};
  isSubmitted = false;
  DepartmentList: any = [];
  DesignationList: any = [];
  PageSize = ConstantData.PageSizes;
  p: number = 1;
  Search: string = '';
  reverse: boolean = false;
  sortKey: string = '';
  itemPerPage: number = this.PageSize[0];
  action: ActionModel = {} as ActionModel;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;
  StatusList : any[] = []
  GenderList : any[] = []
  loadDataService = inject(LoadDataService);
  StaffTypeList = this.loadDataService.GetEnumList(StaffType);
  AllStatusList = Status;
  AllGenderList = Gender;
  AllStaffTypeList = StaffType;
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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.StatusList = this.loadDataService.GetEnumList(Status);
    this.GenderList = this.loadDataService.GetEnumList(Gender);

    this.validiateMenu();
    this.getStaffList();
    this.getDepartmentList();
    this.getDesignationList();
  }

  validiateMenu() {
    var obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ Url: this.router.url, StaffLoginId: this.staffLogin.StaffLoginId })
      ).toString()
    };
    this.dataLoading = true;
    this.service.validiateMenu(obj).subscribe((response: any) => {
      this.action = this.loadDataService.validiateMenu(response, this.toastr, this.router);
      this.dataLoading = false;
    }, err => {
      this.toastr.error("Error while fetching records");
      this.dataLoading = false;
    });
  }

  @ViewChild('formStaff') formStaff!: NgForm;

  resetForm() {
    this.Staff = {};
    this.Staff.JoinDate = new Date();
    this.Staff.Status = 1;
    if (this.formStaff) {
      this.formStaff.control.markAsPristine();
      this.formStaff.control.markAsUntouched();
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

  getDesignationList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading = true;
    this.service.getDesignationList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.DesignationList = response.DesignationList;
      } else {
        this.toastr.error(response.Message);
      }
      this.dataLoading = false;
    }, err => {
      this.toastr.error("Error while fetching records");
      this.dataLoading = false;
    });
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

  getStaffList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading = true;
    this.service.getStaffList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.StaffList = response.StaffList;
      } else {
        this.toastr.error(response.Message);
      }
      this.dataLoading = false;
    }, err => {
      this.toastr.error("Error while fetching records");
      this.dataLoading = false;
    });
  }

  saveStaff() {
    this.isSubmitted = true;
    this.formStaff.control.markAllAsTouched();
    if (this.formStaff.invalid) {
      this.toastr.error("Fill all the required fields !!");
      return;
    }
    this.Staff.JoinDate = this.loadDataService.loadDateTime(this.Staff.JoinDate);
    this.Staff.DOB = this.loadDataService.loadDateTime(this.Staff.DOB);
    this.Staff.UpdatedBy = this.staffLogin.StaffLoginId;
    this.Staff.CreatedBy = this.staffLogin.StaffLoginId;
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.Staff)).toString()
    };
    this.dataLoading = true;
    this.service.saveStaff(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.toastr.success(this.Staff.StaffId > 0
          ? "Staff updated successfully"
          : "Staff added successfully");
        this.closeModal();
        this.getStaffList();
      } else {
        this.toastr.error(response.Message);
        this.dataLoading = false;
        this.Staff.JoinDate = new Date(this.Staff.JoinDate);
        if (this.Staff.DOB)
          this.Staff.DOB = new Date(this.Staff.DOB);
      }
    }, err => {
      this.toastr.error("Error occured while submitting data");
      this.dataLoading = false;
    });
  }

  deleteStaff(obj: any) {
    if (confirm("Are you sure you want to delete this record?")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      };
      this.dataLoading = true;
      this.service.deleteStaff(request).subscribe(r1 => {
        let response = r1 as any;
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Record deleted successfully");
          this.getStaffList();
        } else {
          this.toastr.error(response.Message);
        }
        this.dataLoading = false;
      }, err => {
        this.toastr.error("Error occured while deleting the record");
        this.dataLoading = false;
      });
    }
  }

  editStaff(obj: any) {
    this.Staff = { ...obj };
    this.Staff.JoinDate = new Date(obj.JoinDate);
    if (this.Staff.DOB)
      this.Staff.DOB = new Date(obj.DOB);
    this.showModal = true;
  }
}
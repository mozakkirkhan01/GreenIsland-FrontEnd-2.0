import { Component, ViewChild } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router,RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { Status } from '../../utils/enum';
import { LoadDataService } from '../../utils/load-data.service';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { FilterPipe } from '../../utils/filter-pipe';
import { NgxPaginationModule } from 'ngx-pagination';

@Component({
  selector: 'app-page-group',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    RouterModule,
    MatButtonModule,
    NgxPaginationModule
  ],
  templateUrl: './page-group.html',
  styleUrls: ['./page-group.css']
})
export class PageGroup {
  dataLoading: boolean = false;
  PageGroupList: any = [];
  PageGroup: any = {};
  StatusList: any[] = [];
  isSubmitted = false;
  PageSize = ConstantData.PageSizes;
  p: number = 1;
  Search: string = '';
  reverse: boolean = false;
  sortKey: string = '';
  itemPerPage: number = this.PageSize[0];
  action: ActionModel = {} as ActionModel;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;
  AllStatusList = Status;

  // Modal state
  showModal: boolean = false;

sortColumn: string = '';
sortDirection: boolean = true;

sort(column: string) {

  if (this.sortColumn === column) {
    this.sortDirection = !this.sortDirection;
  } else {
    this.sortColumn = column;
    this.sortDirection = true;
  }

  this.PageGroupList.sort((a: any, b: any) => {

    const valueA = a[column];
    const valueB = b[column];

    if (valueA < valueB) return this.sortDirection ? -1 : 1;
    if (valueA > valueB) return this.sortDirection ? 1 : -1;

    return 0;
  });

}

  onTableDataChange(p: any) {
    this.p = p;
  }

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private localService: LocalService,
    private loadData: LoadDataService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.StatusList = this.loadData.GetEnumList(Status);
    this.validiateMenu();
    this.getPageGroupList();
  }

  validiateMenu() {
    var obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ Url: this.router.url, StaffLoginId: this.staffLogin.StaffLoginId })
      ).toString()
    };
    this.dataLoading = true;
    this.service.validiateMenu(obj).subscribe((response: any) => {
      this.action = this.loadData.validiateMenu(response, this.toastr, this.router);
      this.dataLoading = false;
    }, err => {
      this.toastr.error("Error while fetching records");
      this.dataLoading = false;
    });
  }

  @ViewChild('formPageGroup') formPageGroup!: NgForm;

  resetForm() {
    this.PageGroup = { Status: 1 };
    if (this.formPageGroup) {
      this.formPageGroup.control.markAsPristine();
      this.formPageGroup.control.markAsUntouched();
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

  getPageGroupList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading = true;
    this.service.getPageGroupList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.PageGroupList = response.PageGroupList;
      } else {
        this.toastr.error(response.Message);
      }
      this.dataLoading = false;
    }, err => {
      this.toastr.error("Error while fetching records");
    });
  }

  savePageGroup() {
    this.formPageGroup.control.markAllAsTouched();
    this.isSubmitted = true;
    if (this.formPageGroup.invalid) {
      this.toastr.error("Fill all the required fields !!");
      return;
    }
    this.PageGroup.UpdatedBy = this.staffLogin.StaffLoginId;
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.PageGroup)).toString()
    };
    this.dataLoading = true;
    this.service.savePageGroup(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.toastr.success(this.PageGroup.PageGroupId > 0
          ? "PageGroup updated successfully"
          : "PageGroup added successfully");
        this.closeModal();
        this.getPageGroupList();
      } else {
        this.toastr.error(response.Message);
        this.dataLoading = false;
      }
    }, err => {
      this.toastr.error("Error occured while submitting data");
      this.dataLoading = false;
    });
  }

  deletePageGroup(obj: any) {
    if (confirm("Are you sure you want to delete this record?")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      };
      this.dataLoading = true;
      this.service.deletePageGroup(request).subscribe(r1 => {
        let response = r1 as any;
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Record deleted successfully");
          this.getPageGroupList();
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

  editPageGroup(obj: any) {
    this.PageGroup = { ...obj };
    this.showModal = true;
  }









  
}
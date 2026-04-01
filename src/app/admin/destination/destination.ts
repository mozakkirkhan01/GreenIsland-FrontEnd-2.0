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
import { Progress } from '../../component/progress/progress';

@Component({
  selector: 'app-destination',
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
  templateUrl: './destination.html',
  styleUrl: './destination.css',
})
export class Destination {
  dataLoading: boolean = false;
  DestinationList: any = [];
  Destination: any = {};
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
  action: ActionModel = {
    CanCreate: false,
    CanEdit: false,
    CanDelete: false,
    MenuTitle: '',
    ParentMenuTitle: ''
  } as ActionModel;
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
    this.getDestinationList();
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
      this.cdr.detectChanges();
    });
  }

  @ViewChild('formDestination') formDestination!: NgForm;

  resetForm() {
    this.Destination = { Status: 1 };
    if (this.formDestination) {
      this.formDestination.control.markAsPristine();
      this.formDestination.control.markAsUntouched();
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

  getDestinationList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading = true;
    this.service.getDestinationList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.DestinationList = response.DestinationList;
      } else {
        this.toastr.error(response.Message);
      }
      this.dataLoading = false;
      this.cdr.detectChanges();
    }, err => {
      this.toastr.error("Error while fetching records");
      this.dataLoading = false;
      this.cdr.detectChanges();
    });
  }

  saveDestination() {
    this.isSubmitted = true;
    this.formDestination.control.markAllAsTouched();
    if (this.formDestination.invalid) {
      this.toastr.error("Fill all the required fields !!");
      return;
    }
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.Destination)).toString()
    };
    this.dataLoading = true;
    this.service.saveDestination(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.toastr.success(this.Destination.DestinationId > 0
          ? "Destination updated successfully"
          : "Destination added successfully");
        this.closeModal();
        this.getDestinationList();
      } else {
        this.toastr.error(response.Message);
        this.dataLoading = false;
        this.cdr.detectChanges();
      }
    }, err => {
      this.toastr.error("Error occured while submitting data");
      this.dataLoading = false;
      this.cdr.detectChanges();
    });
  }

  deleteDestination(obj: any) {
    if (confirm("Are you sure you want to delete this record?")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      };
      this.dataLoading = true;
      this.service.deleteDestination(request).subscribe(r1 => {
        let response = r1 as any;
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Record deleted successfully");
          this.getDestinationList();
        } else {
          this.toastr.error(response.Message);
          this.dataLoading = false;
          this.cdr.detectChanges();
        }
      }, err => {
        this.toastr.error("Error occured while deleting the record");
        this.dataLoading = false;
        this.cdr.detectChanges();
      });
    }
  }

  editDestination(obj: any) {
    this.Destination = { ...obj };
    this.showModal = true;
  }
}
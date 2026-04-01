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
  selector: 'app-location',
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
  templateUrl: './location.html',
  styleUrl: './location.css',
})
export class Location {
  dataLoading: boolean = false;
  LocationList: any[] = [];
  Location: any = {};
  DestinationList: any[] = [];
  SelectedDestinationId: number | null = null;
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
  ) { }

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

  @ViewChild('formLocation') formLocation!: NgForm;

  resetForm() {
    this.Location = { Status: 1, DestinationId: 0 }; // 👈 change null to 0
    if (this.formLocation) {
      this.formLocation.control.markAsPristine();
      this.formLocation.control.markAsUntouched();
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
    this.service.getDestinationList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.DestinationList = response.DestinationList;
      } else {
        this.toastr.error(response.Message);
      }
      this.cdr.detectChanges();
    }, err => {
      this.toastr.error("Error while fetching destination list");
      this.cdr.detectChanges();
    });
  }

  searchByDestination() {
    if (this.SelectedDestinationId == null) {
      this.toastr.error("Please select a destination");
      return;
    }
    this.p = 1;
    this.getLocationList(this.SelectedDestinationId);
  }
  onDestinationChange() {

    if (!this.SelectedDestinationId) {
      this.LocationList = [];
      return;
    }

    this.getLocationList(this.SelectedDestinationId);

  }

  getLocationList(destinationId: any = null) {
    var obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: destinationId })
      ).toString()
    };
    this.dataLoading = true;
    this.service.getLocationList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.LocationList = response.LocationList;
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

  saveLocation() {
    this.isSubmitted = true;
    this.formLocation.control.markAllAsTouched();
    if (this.formLocation.invalid) {
      this.toastr.error("Fill all the required fields !!");
      return;
    }
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.Location)).toString()
    };
    this.dataLoading = true;
    this.service.saveLocation(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.toastr.success(this.Location.LocationId > 0
          ? "Location updated successfully"
          : "Location added successfully");
        this.closeModal();
        // this.getLocationList(Number(this.SelectedDestinationId) || 0); // 👈
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

  deleteLocation(obj: any) {
    if (confirm("Are you sure you want to delete this record?")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      };
      this.dataLoading = true;
      this.service.deleteLocation(request).subscribe(r1 => {
        let response = r1 as any;
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Record deleted successfully");
          this.getLocationList(this.SelectedDestinationId);
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

  editLocation(obj: any) {
    this.Location = { ...obj };
    this.showModal = true;
  }
}
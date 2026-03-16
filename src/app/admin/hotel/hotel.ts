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
  selector: 'app-hotel',
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
    OrderByPipe
  ],
  templateUrl: './hotel.html',
  styleUrl: './hotel.css',
})
export class Hotel {
  dataLoading: boolean = false;
  HotelList: any = [];
  Hotel: any = {};
  DestinationList: any[] = [];
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
    // this.getHotelList();
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
      // this.cdr.detectChanges();
    });
  }

  @ViewChild('formHotel') formHotel!: NgForm;

  resetForm() {
    this.Hotel = { Status: 1 };
    if (this.formHotel) {
      this.formHotel.control.markAsPristine();
      this.formHotel.control.markAsUntouched();
    }
    this.isSubmitted = false;
  }

  openModal() {
    this.resetForm();
    this.getHotelCategoryList();
    this.getDestinationList();
    this.showModal = true;
  }

  closeModal() {
    this.resetForm();
    this.showModal = false;
  }

  getHotelList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading = true;
    this.service.getHotelList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.HotelList = response.HotelList;
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

  saveHotel() {
    this.isSubmitted = true;
    this.formHotel.control.markAllAsTouched();
    if (this.formHotel.invalid) {
      this.toastr.error("Fill all the required fields !!");
      return;
    }
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.Hotel)).toString()
    };
    this.dataLoading = true;
    this.service.saveHotel(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.toastr.success(this.Hotel.HotelId > 0
          ? "Hotel updated successfully"
          : "Hotel added successfully");
        this.closeModal();
        this.getHotelList();
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

  deleteHotel(obj: any) {
    if (confirm("Are you sure you want to delete this record?")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      };
      this.dataLoading = true;
      this.service.deleteHotel(request).subscribe(r1 => {
        let response = r1 as any;
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Record deleted successfully");
          this.getHotelList();
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

  editHotel(obj: any) {
    this.Hotel = { ...obj };
    this.showModal = true;
  }

  getDestinationList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.service.getDestinationList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.DestinationList = response.DestinationList;
        console.log("des list", this.DestinationList);

      } else {
        this.toastr.error(response.Message);
      }
      this.cdr.detectChanges();
    }, err => {
      this.toastr.error("Error while fetching destination list");
      this.cdr.detectChanges();
    });
  }
  LocationList: any[] = [];
  onDestinationChange() {

    if (!this.Hotel.DestinationId) {
      this.LocationList = [];
      return;
    }

    this.getLocationList(this.Hotel.DestinationId);

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

        // 👇 Add this
        if (this.LocationList.length === 0) {
          setTimeout(() => {
            this.Hotel.DestinationId = null;  // resets destination so message disappears
            this.LocationList = [];
            this.cdr.detectChanges();
          }, 4000);
        }

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


  HotelCategoryList: any[] = [];
  getHotelCategoryList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading = true;
    this.service.getHotelCategoryList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.HotelCategoryList = response.HotelCategoryList;
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

}

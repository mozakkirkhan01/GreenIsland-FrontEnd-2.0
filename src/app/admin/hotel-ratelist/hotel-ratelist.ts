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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

@Component({
  selector: 'app-hotel-ratelist',
  imports: [CommonModule,
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
  templateUrl: './hotel-ratelist.html',
  styleUrl: './hotel-ratelist.css',
})
export class HotelRatelist {
  dataLoading: boolean = false;
  RateHotelList: any[] = [];
  RateHotel: any = {};
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
    this.getHotelList();        // 👈 load hotels for dropdown
    this.getHotelRateList();    // 👈 load all rates on start
    // this.getRateHotelList();
    // this.getRoomTypeList();
    // this.resetForm();
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
  @ViewChild('formRateHotel') formHotelRate!: NgForm;

  // resetForm() {
  //   this.RateHotel = { Status: 1, DestinationId: null };
  //   if (this.formRateHotel) {
  //     this.formRateHotel.control.markAsPristine();
  //     this.formRateHotel.control.markAsUntouched();
  //   }
  //   this.isSubmitted = false;
  // }



  // getHotelRateList() {
  //   var obj: RequestModel = {
  //     request: this.localService.encrypt(
  //       JSON.stringify({ HotelId: this.RateHotel.HotelId })
  //     ).toString()
  //   };
  //   this.dataLoading = true;
  //   this.service.getHotelRateList(obj).subscribe(r1 => {
  //     let response = r1 as any;
  //     if (response.Message == ConstantData.SuccessMessage) {
  //       this.RateHotelList = response.HotelRateList;
  //       console.log("list", this.RateHotelList);

  //     } else {
  //       this.toastr.error(response.Message);
  //     }
  //     this.dataLoading = false;
  //     this.cdr.detectChanges();
  //   }, err => {
  //     this.toastr.error("Error while fetching hotel rates");
  //     this.dataLoading = false;
  //     this.cdr.detectChanges();
  //   });
  // }
  deleteHotelRate(obj: any) {
    if (confirm("Are you sure you want to delete this record?")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      };
      this.dataLoading = true;
      this.service.deleteHotelRate(request).subscribe(r1 => {
        let response = r1 as any;
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Record deleted successfully");
          this.getHotelRateList();
        } else {
          this.toastr.error(response.Message);
          this.dataLoading = false;
          this.cdr.detectChanges();
        }
      }, err => {
        this.toastr.error("Error occurred while deleting the record");
        this.dataLoading = false;
        this.cdr.detectChanges();
      });
    }
  }
  HotelList: any[] = [];
  SelectedHotelId: number = 0;
  getHotelList() {
    var obj: RequestModel = {
        request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.service.getHotelList(obj).subscribe(r1 => {
        let response = r1 as any;
        if (response.Message == ConstantData.SuccessMessage) {
            this.HotelList = response.HotelList;
        } else {
            this.toastr.error(response.Message);
        }
        this.cdr.detectChanges();
    }, err => {
        this.toastr.error("Error while fetching hotel list");
        this.cdr.detectChanges();
    });
}

onHotelChange() {
    this.getHotelRateList(); // reload list with selected hotel filter
}

getHotelRateList() {
    var obj: RequestModel = {
        request: this.localService.encrypt(
            JSON.stringify({ HotelId: Number(this.SelectedHotelId) || 0 }) // 👈 send selected hotel
        ).toString()
    };
    this.dataLoading = true;
    this.service.getHotelRateList(obj).subscribe(r1 => {
        let response = r1 as any;
        if (response.Message == ConstantData.SuccessMessage) {
            this.RateHotelList = response.HotelRateList;
        } else {
            this.toastr.error(response.Message);
        }
        this.dataLoading = false;
        this.cdr.detectChanges();
    }, err => {
        this.toastr.error("Error while fetching hotel rates");
        this.dataLoading = false;
        this.cdr.detectChanges();
    });
}

editHotelRate(obj: any) {
    this.router.navigate(['/admin/hotel-rate'], { 
        queryParams: { HotelRateId: obj.HotelRateId } 
    });
}
}
import { Component, ViewChild, inject, signal } from '@angular/core';
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
  selector: 'app-hotel-ratelist',
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
    OrderByPipe
  ],
  templateUrl: './hotel-ratelist.html',
  styleUrl: './hotel-ratelist.css',
})
export class HotelRatelist {

  // ── Signals ───────────────────────────────────────────────────────────
  dataLoading = signal(false);
  HotelList = signal<any[]>([]);
  RateHotelList = signal<any[]>([]);
  action = signal<ActionModel>({
    CanCreate: false,
    CanEdit: false,
    CanDelete: false,
    MenuTitle: '',
    ParentMenuTitle: ''
  } as ActionModel);

  // ── Plain properties ──────────────────────────────────────────────────
  SelectedHotelId: number = 0;
  isSubmitted = false;
  Search = '';
  reverse = false;
  sortKey = '';
  p = 1;
  itemPerPage: number;

  loadData = inject(LoadDataService);
  StatusList = this.loadData.GetEnumList(Status);
  AllStatusList = Status;
  PageSize = ConstantData.PageSizes;
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
    this.validiateMenu();
    this.getHotelList();
    // this.getHotelRateList();
    this.getDestinationList();

  }

  sort(key: any) {
    this.sortKey = key;
    this.reverse = !this.reverse;
  }

  onTableDataChange(p: any) {
    this.p = p;
  }

  // ── Menu validation ───────────────────────────────────────────────────
  validiateMenu() {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ Url: this.router.url, StaffLoginId: this.staffLogin.StaffLoginId })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.validiateMenu(obj).subscribe({
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

  // ── Hotel list ────────────────────────────────────────────────────────
  getHotelList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.service.getHotelList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.HotelList.set(r1.HotelList);
        } else {
          this.toastr.error(r1.Message);
        }
      },
      error: () => {
        this.toastr.error("Error while fetching hotel list");
      }
    });
  }

  // ── On hotel dropdown change ──────────────────────────────────────────
  onHotelChange() {
    this.p = 1;
    this.getHotelRateList();
  }

  // ── Hotel rate list ───────────────────────────────────────────────────
  getHotelRateList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ HotelId: Number(this.FilterHotelId) || 0 })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.getHotelRateList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.RateHotelList.set(r1.HotelRateList);
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error("Error while fetching hotel rates");
        this.dataLoading.set(false);
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────
  deleteHotelRate(obj: any) {
    if (confirm("Are you sure you want to delete this record?")) {
      const request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      };
      this.dataLoading.set(true);
      this.service.deleteHotelRate(request).subscribe({
        next: (r1: any) => {
          if (r1.Message == ConstantData.SuccessMessage) {
            this.toastr.success("Record deleted successfully");
            // remove from signal directly — no API call needed
            this.RateHotelList.update(rows =>
              rows.filter(x => x.HotelRateId !== obj.HotelRateId)
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

  // ── Edit — navigate to hotel-rate page ───────────────────────────────
  editHotelRate(obj: any) {
    this.router.navigate(['/admin/hotel-rate'], {
      queryParams: { HotelRateId: obj.HotelRateId }
    });
  }

  FilterDestinationId: any = 0;
  FilterLocationId: any = 0;
  FilterHotelId: any = 0;
  DestinationList   = signal<any[]>([]);
  FilterLocationList = signal<any[]>([]);
  FilteredHotelList = signal<any[]>([]);
  FilterHotelList   = signal<any[]>([]);
  RoomTypeList      = signal<any[]>([]);



    onFilterDestinationChange() {
    this.FilterLocationId = 0;
    this.FilterHotelId    = 0;
    this.FilterLocationList.set([]);
    this.FilterHotelList.set([]);
    this.RoomTypeList.set([]);

    if (!this.FilterDestinationId || this.FilterDestinationId == 0) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: Number(this.FilterDestinationId) })
      ).toString()
    };
    this.service.getLocationList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.FilterLocationList.set(r1.LocationList);
        }
      }
    });
  }
    // ── Destination list ──────────────────────────────────────────────────
  getDestinationList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.service.getDestinationList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.DestinationList.set(r1.DestinationList);
        } else {
          this.toastr.error(r1.Message);
        }
      },
      error: () => {
        this.toastr.error("Error while fetching destination list");
      }
    });
  }
  onFilterLocationChange() {
    this.FilterHotelId = 0;
    this.FilterHotelList.set([]);
    this.RoomTypeList.set([]);

    if (!this.FilterLocationId || this.FilterLocationId == 0) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ LocationId: Number(this.FilterLocationId) })
      ).toString()
    };
    this.service.getHotelList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.FilterHotelList.set(r1.HotelList);
        }
      }
    });
  }
    onFilterHotelChange() {
    this.RateHotelList.set([]);
    if (!this.FilterHotelId || this.FilterHotelId == 0) return;
    this.getHotelRateList();
  }
    // ── Room type list ────────────────────────────────────────────────────
  // getRoomTypeList() {
  //   const obj: RequestModel = {
  //     request: this.localService.encrypt(
  //       JSON.stringify({ HotelId: Number(this.FilterHotelId) || 0 })
  //     ).toString()
  //   };
  //   this.dataLoading.set(true);
  //   this.service.getRoomTypeList(obj).subscribe({
  //     next: (r1: any) => {
  //       if (r1.Message == ConstantData.SuccessMessage) {
  //         this.RoomTypeList.set(r1.RoomTypeList);
  //       } else {
  //         this.toastr.error(r1.Message);
  //       }
  //       this.dataLoading.set(false);
  //     },
  //     error: () => {
  //       this.toastr.error("Error while fetching records");
  //       this.dataLoading.set(false);
  //     }
  //   });
  // }

}
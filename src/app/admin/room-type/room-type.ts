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
  selector: 'app-room-type',
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
  templateUrl: './room-type.html',
  styleUrl: './room-type.css',
})
export class RoomType {

  // ── Signals ───────────────────────────────────────────────────────────
  dataLoading       = signal(false);
  RoomTypeList      = signal<any[]>([]);
  HotelList         = signal<any[]>([]);
  DestinationList   = signal<any[]>([]);
  LocationList      = signal<any[]>([]);
  FilteredHotelList = signal<any[]>([]);
  FilterLocationList = signal<any[]>([]);
  FilterHotelList   = signal<any[]>([]);
  noLocationFound   = signal(false);
  showModal         = signal(false);
  action            = signal<ActionModel>({
    CanCreate: false,
    CanEdit: false,
    CanDelete: false,
    MenuTitle: '',
    ParentMenuTitle: ''
  } as ActionModel);

  // ── Plain properties ──────────────────────────────────────────────────
  RoomType: any     = {};
  Hotel: any        = {};
  isSubmitted       = false;
  Search            = '';
  reverse           = false;
  sortKey           = '';
  p                 = 1;
  itemPerPage:      number;
  FilterDestinationId: any = 0;
  FilterLocationId: any    = 0;
  FilterHotelId: any       = 0;

  loadData      = inject(LoadDataService);
  StatusList    = this.loadData.GetEnumList(Status);
  AllStatusList = Status;
  PageSize      = ConstantData.PageSizes;
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
    this.getDestinationList();
    this.resetForm();
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

  @ViewChild('formRoomType') formRoomType!: NgForm;

  // ── Reset form ────────────────────────────────────────────────────────
  resetForm() {
    this.RoomType = { Status: 1, HotelId: 0 };
    this.Hotel    = { DestinationId: 0, LocationId: 0 };
    this.LocationList.set([]);
    this.FilteredHotelList.set([]);
    this.noLocationFound.set(false);
    if (this.formRoomType) {
      this.formRoomType.control.markAsPristine();
      this.formRoomType.control.markAsUntouched();
    }
    this.isSubmitted = false;
  }

  openModal() {
    this.resetForm();
    this.getDestinationList();
    this.getHotelList();
    this.showModal.set(true);
  }

  closeModal() {
    this.resetForm();
    this.showModal.set(false);
  }

  // ── Room type list ────────────────────────────────────────────────────
  getRoomTypeList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ HotelId: Number(this.FilterHotelId) || 0 })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.getRoomTypeList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.RoomTypeList.set(r1.RoomTypeList);
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

  // ── Save ──────────────────────────────────────────────────────────────
  saveRoomType() {
    this.isSubmitted = true;
    this.formRoomType.control.markAllAsTouched();
    if (this.formRoomType.invalid) {
      this.toastr.error("Fill all the required fields !!");
      return;
    }
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.RoomType)).toString()
    };
    this.dataLoading.set(true);
    this.service.saveRoomType(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success(this.RoomType.RoomTypeId > 0
            ? "Room Type updated successfully"
            : "Room Type added successfully");
          // reset only name field, keep hotel selected
          this.RoomType.RoomTypeName = '';
          this.RoomType.RoomTypeId   = 0;
          const control = this.formRoomType.controls['RoomTypeName'];
          control?.reset();
          this.isSubmitted = false;
          this.dataLoading.set(false);
          // refresh list if hotel filter is active
          if (this.FilterHotelId && this.FilterHotelId != 0) {
            this.getRoomTypeList();
          }
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

  // ── Delete ────────────────────────────────────────────────────────────
  deleteRoomType(obj: any) {
    if (confirm("Are you sure you want to delete this record?")) {
      const request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      };
      this.dataLoading.set(true);
      this.service.deleteRoomType(request).subscribe({
        next: (r1: any) => {
          if (r1.Message == ConstantData.SuccessMessage) {
            this.toastr.success("Record deleted successfully");
            this.RoomTypeList.update(list =>
              list.filter(x => x.RoomTypeId !== obj.RoomTypeId)
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

  // ── Edit ──────────────────────────────────────────────────────────────
  editRoomType(obj: any) {
    this.RoomType = { ...obj };
    this.getDestinationList();
    const selectedHotel = this.HotelList().find(h => h.HotelId === obj.HotelId);
    if (selectedHotel) {
      this.Hotel.DestinationId = selectedHotel.DestinationId;
      this.Hotel.LocationId    = selectedHotel.LocationId;
      this.getLocationList(selectedHotel.DestinationId);
      this.FilteredHotelList.set(
        this.HotelList().filter(h => h.LocationId === selectedHotel.LocationId)
      );
    }
    this.showModal.set(true);
  }

  // ── Hotel list ────────────────────────────────────────────────────────
  getHotelList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading.set(true);
    this.service.getHotelList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.HotelList.set(r1.HotelList);
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error("Error while fetching hotel list");
        this.dataLoading.set(false);
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

  // ── Location list ─────────────────────────────────────────────────────
  getLocationList(destinationId: any = null) {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: destinationId })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.getLocationList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.LocationList.set(r1.LocationList);
          this.noLocationFound.set(r1.LocationList.length === 0);
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error("Error while fetching location list");
        this.dataLoading.set(false);
      }
    });
  }

  // ── Modal destination/location/hotel change ───────────────────────────
  onDestinationChange() {
    if (!this.Hotel.DestinationId) {
      this.LocationList.set([]);
      this.FilteredHotelList.set([]);
      this.RoomType.HotelId = 0;
      return;
    }
    this.Hotel.LocationId = null;
    this.RoomType.HotelId = 0;
    this.FilteredHotelList.set([]);
    this.getLocationList(this.Hotel.DestinationId);
  }

  onLocationChange() {
    if (!this.Hotel.LocationId) {
      this.FilteredHotelList.set([]);
      this.RoomType.HotelId = 0;
      return;
    }
    this.FilteredHotelList.set(
      this.HotelList().filter(h => h.LocationId === this.Hotel.LocationId)
    );
    this.RoomType.HotelId = 0;
  }

  // ── Filter bar changes ────────────────────────────────────────────────
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
    this.RoomTypeList.set([]);
    if (!this.FilterHotelId || this.FilterHotelId == 0) return;
    this.getRoomTypeList();
  }
}
import { Component, ViewChild, ChangeDetectorRef, inject, signal } from '@angular/core';
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
  templateUrl: './hotel.html',
  styleUrl: './hotel.css',
})
export class Hotel {

  // ── Signals ───────────────────────────────────────────────────────────
  dataLoading        = signal(false);
  HotelList          = signal<any[]>([]);
  DestinationList    = signal<any[]>([]);
  LocationList       = signal<any[]>([]);
  HotelCategoryList  = signal<any[]>([]);
  FilterLocationList = signal<any[]>([]);
  FilterHotelList    = signal<any[]>([]);
  noLocationFound    = signal(false);
  showModal          = signal(false);
  action             = signal<ActionModel>({
    CanCreate: false,
    CanEdit: false,
    CanDelete: false,
    MenuTitle: '',
    ParentMenuTitle: ''
  } as ActionModel);

  // ── Plain properties ──────────────────────────────────────────────────
  Hotel: any         = {};
  isSubmitted        = false;
  Search             = '';
  reverse            = false;
  sortKey            = '';
  p                  = 1;
  itemPerPage:       number;
  LogoPhoto: string | null = null;
  imageUrl           = ConstantData.getBaseUrl();
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

  @ViewChild('formHotel') formHotel!: NgForm;

  // ── Reset form ────────────────────────────────────────────────────────
  resetForm() {
    this.Hotel     = { Status: 1, DestinationId: null };
    this.LogoPhoto = null;
    this.LocationList.set([]);
    this.noLocationFound.set(false);
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
    this.showModal.set(true);
  }

  closeModal() {
    this.resetForm();
    this.showModal.set(false);
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
        this.toastr.error("Error while fetching records");
        this.dataLoading.set(false);
      }
    });
  }

  // ── Save ──────────────────────────────────────────────────────────────
  saveHotel() {
    this.isSubmitted = true;
    this.formHotel.control.markAllAsTouched();
    if (this.formHotel.invalid) {
      this.toastr.error("Fill all the required fields !!");
      return;
    }
    this.Hotel.CreatedBy = this.staffLogin.StaffLoginId;
    this.Hotel.UpdatedBy = this.staffLogin.StaffLoginId;
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.Hotel)).toString()
    };
    this.dataLoading.set(true);
    this.service.saveHotel(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success(this.Hotel.HotelId > 0
            ? "Hotel updated successfully"
            : "Hotel added successfully");

            this.Hotel.HotelName = '';
            this.Hotel.HotelId = 0;

          this. onFilterLocationChange() ;
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
  // deleteHotel(obj: any) {
  //   if (confirm("Are you sure you want to delete this record?")) {
  //     const request: RequestModel = {
  //       request: this.localService.encrypt(JSON.stringify(obj)).toString()
  //     };
  //     this.dataLoading.set(true);
  //     this.service.deleteHotel(request).subscribe({
  //       next: (r1: any) => {
  //         if (r1.Message == ConstantData.SuccessMessage) {
  //           this.toastr.success("Record deleted successfully");
  //           this.HotelList.update(list =>
  //             list.filter(x => x.HotelId !== obj.HotelId)
  //           );
  //         } else {
  //           this.toastr.error(r1.Message);
  //         }
  //         this.dataLoading.set(false);
  //       },
  //       error: () => {
  //         this.toastr.error("Error occurred while deleting the record");
  //         this.dataLoading.set(false);
  //       }
  //     });
  //   }
  // }
  deleteHotel(obj: any) {
  if (confirm("Are you sure you want to delete this record?")) {
    const request: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(obj)).toString()
    };

    this.dataLoading.set(true);

    this.service.deleteHotel(request).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {

          this.toastr.success("Record deleted successfully");

          // ✅ Remove from main list
          this.HotelList.update(list =>
            list.filter(x => x.HotelId !== obj.HotelId)
          );

          // 🔥 IMPORTANT: Remove from filtered list (UI uses this)
          this.FilterHotelList.update(list =>
            list.filter(x => x.HotelId !== obj.HotelId)
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
  editHotel(obj: any) {
    this.Hotel     = { ...obj };
    this.LogoPhoto = obj.HotelImage ? this.imageUrl + obj.HotelImage : null;
    this.getDestinationList();
    this.getLocationList(this.Hotel.DestinationId);
    this.getHotelCategoryList();
    this.showModal.set(true);
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

  // ── On destination change (modal) ─────────────────────────────────────
  onDestinationChange() {
    if (!this.Hotel.DestinationId) {
      this.LocationList.set([]);
      this.noLocationFound.set(false);
      return;
    }
    this.getLocationList(this.Hotel.DestinationId);
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

  // ── Hotel category list ───────────────────────────────────────────────
  getHotelCategoryList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading.set(true);
    this.service.getHotelCategoryList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.HotelCategoryList.set(r1.HotelCategoryList);
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error("Error while fetching hotel categories");
        this.dataLoading.set(false);
      }
    });
  }

  // ── Logo file ─────────────────────────────────────────────────────────
  setLogoFile(event: any): void {
    const file: File = event?.target?.files?.[0];
    if (!file) { this.toastr.error("No file selected"); return; }
    if (file.size === 0) { this.toastr.error("File is empty"); this.resetLogo(); return; }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 500 * 1024;

    if (!allowedTypes.includes(file.type)) {
      this.toastr.error("Only JPG, JPEG, PNG files are allowed");
      this.resetLogo(); return;
    }
    if (file.size > maxSize) {
      this.toastr.error("File size should be less than 500 KB");
      this.resetLogo(); return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (!result) { this.toastr.error("Error reading file"); this.resetLogo(); return; }
      this.Hotel.HotelImage = result.split(',')[1];
      this.LogoPhoto = result;
    };
    reader.onerror = () => {
      this.toastr.error("Error processing file");
      this.resetLogo();
    };
    reader.readAsDataURL(file);
  }

  resetLogo(): void {
    this.Hotel.HotelImage = '';
    this.LogoPhoto = null;
  }

  // ── Filter bar ────────────────────────────────────────────────────────
  onFilterDestinationChange() {
    this.FilterLocationId = 0;
    this.FilterHotelId    = 0;
    this.FilterLocationList.set([]);
    this.FilterHotelList.set([]);

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
}
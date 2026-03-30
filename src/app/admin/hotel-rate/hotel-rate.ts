import { Component, ViewChild, ChangeDetectorRef, inject, signal, computed } from '@angular/core';
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
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-hotel-rate',
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
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './hotel-rate.html',
  styleUrl: './hotel-rate.css'
})
export class HotelRate {

  // ── Signals ──────────────────────────────────────────────────────────
  dataLoading = signal(false);
  HotelList = signal<any[]>([]);
  RoomTypeList = signal<any[]>([]);
  HotelRateRows = signal<any[]>([]);
  action = signal<ActionModel>({
    CanCreate: false,
    CanEdit: false,
    CanDelete: false,
    MenuTitle: '',
    ParentMenuTitle: ''
  } as ActionModel);

  // ── Plain properties (form binding, primitives) ───────────────────────
  HotelRate: any = {};
  isSubmitted = false;
  editingRowIndex: number | null = null;
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
    private route: ActivatedRoute,
  ) {
    this.itemPerPage = this.PageSize[0];
  }

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.getDestinationList();  // 👈 add
    this.getHotelList();
    // this.getRoomTypeList();
    this.resetForm();

    this.route.queryParams.subscribe(params => {
      if (params['HotelRateId']) {
        this.loadHotelRateById(params['HotelRateId']);
      }
    });
  }

  @ViewChild('formHotelRate') formHotelRate!: NgForm;

  // ── Menu validation ───────────────────────────────────────────────────
  validiateMenu() {
    const cleanUrl = this.router.url.split('?')[0];
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ Url: cleanUrl, StaffLoginId: this.staffLogin.StaffLoginId })
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

  // ── Reset form ────────────────────────────────────────────────────────
  resetForm() {
    this.HotelRate = { Status: 1, DestinationId: null };
    this.SelectedDestinationId = 0;
    this.SelectedLocationId = 0;
    this.LocationList.set([]);
    this.FilteredHotelList.set([]);
    if (this.formHotelRate) {
      this.formHotelRate.control.markAsPristine();
      this.formHotelRate.control.markAsUntouched();
    }
    this.isSubmitted = false;
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


  // ── Room type list ────────────────────────────────────────────────────
  getRoomTypeList(hotelId: any = 0) {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ HotelId: Number(hotelId) })
      ).toString()
    };

    this.dataLoading.set(true);
    this.service.getRoomTypeList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.RoomTypeList.set(r1.RoomTypeList);
          // ✅ 🔥 MOVE LOGIC HERE
          if (r1.RoomTypeList.length === 0) {
            this.showRoomTypeError.set(true);
          } else {
            this.showRoomTypeError.set(false);
          }

          // ✅ 🔥 room type available  LOGIC HERE
          if (r1.RoomTypeList.length > 0) {
            this.showRoomTypeErrorList.set(true);
          } else {
            this.showRoomTypeErrorList.set(false);
          }

        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error("Error while fetching room types");
        this.dataLoading.set(false);
      }
    });
  }


  showRoomTypeError = signal(false);
  showRoomTypeErrorList = signal(false);


  // ── On hotel change ───────────────────────────────────────────────────
  onHotelChange() {
    // 🔥 RESET ERROR FIRST (VERY IMPORTANT)
    this.showRoomTypeError.set(false);
    this.showRoomTypeErrorList.set(false);


    if (!this.HotelRate.HotelId) {
      this.HotelRate.HotelCategoryId = null;
      this.HotelRate.HotelCategoryName = '';
      this.HotelRateRows.set([]);
      this.RoomTypeList.set([]); // 🔥 clear dropdown
      return;
    }

    const selectedHotel = this.HotelList().find(
      (h: any) => h.HotelId === this.HotelRate.HotelId
    );

    if (selectedHotel) {
      this.HotelRate.HotelCategoryId = selectedHotel.HotelCategoryId;
      this.HotelRate.HotelCategoryName = selectedHotel.HotelCategoryName;
    }

    // 🔥 IMPORTANT: load room types for this hotel only
    this.getRoomTypeList(this.HotelRate.HotelId);

    this.getHotelRatesByHotel(this.HotelRate.HotelId);


  }







  // ── Load rates by hotel ───────────────────────────────────────────────
  getHotelRatesByHotel(hotelId: any) {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ HotelId: Number(hotelId) })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.getHotelRateList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.HotelRateRows.set(
            r1.HotelRateList.map((record: any) => ({
              HotelRateId: record.HotelRateId,
              HotelId: record.HotelId,
              HotelName: record.HotelName,
              HotelCategoryId: record.HotelCategoryId,
              HotelCategoryName: record.HotelCategoryName,
              RoomTypeId: record.RoomTypeId,
              RoomTypeName: record.RoomTypeName,
              FromDate: new Date(record.FromDate),
              ToDate: new Date(record.ToDate),
              CpRate: record.CpRate,
              MapRate: record.MapRate,
              ApRate: record.ApRate,
              Status: record.this.Status
            }))
          );
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

  // ── Load single rate by ID (edit from another page) ───────────────────
  // loadHotelRateById(hotelRateId: any) {
  //   const obj: RequestModel = {
  //     request: this.localService.encrypt(
  //       JSON.stringify({ HotelRateId: Number(hotelRateId) })
  //     ).toString()
  //   };
  //   this.dataLoading.set(true);
  //   this.service.getHotelRateList(obj).subscribe({
  //     next: (r1: any) => {
  //       if (r1.Message == ConstantData.SuccessMessage) {
  //         const record = r1.HotelRateList[0];
  //         if (record) {
  //           this.HotelRate = {
  //             HotelRateId: record.HotelRateId,
  //             HotelId: record.HotelId,
  //             HotelCategoryId: record.HotelCategoryId,
  //             HotelCategoryName: record.HotelCategoryName,
  //             RoomTypeId: record.RoomTypeId,
  //             FromDate: new Date(record.FromDate),
  //             ToDate: new Date(record.ToDate),
  //             CpRate: record.CpRate,
  //             MapRate: record.MapRate,
  //             ApRate: record.ApRate
  //           };
  //           this.onHotelChange();
  //           this.HotelRateRows.set([{
  //             ...this.HotelRate,
  //             HotelName: record.HotelName,
  //             RoomTypeName: record.RoomTypeName,
  //           }]);
  //         }
  //       } else {
  //         this.toastr.error(r1.Message);
  //       }
  //       this.dataLoading.set(false);
  //     },
  //     error: () => {
  //       this.toastr.error("Error while fetching record");
  //       this.dataLoading.set(false);
  //     }
  //   });
  // }


  loadHotelRateById(hotelRateId: any) {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ HotelRateId: Number(hotelRateId) })
      ).toString()
    };

    this.dataLoading.set(true);

    this.service.getHotelRateList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {

          const record = r1.HotelRateList[0];

          if (record) {

            // 🔍 Step 1: Find selected hotel
            const selectedHotel = this.HotelList().find(
              (h: any) => h.HotelId === record.HotelId
            );

            if (selectedHotel) {

              // ✅ Step 2: Set Destination
              this.SelectedDestinationId = selectedHotel.DestinationId;

              // Load locations for this destination
              this.onFormDestinationChange();

              setTimeout(() => {

                // ✅ Step 3: Set Location
                this.SelectedLocationId = selectedHotel.LocationId;

                // Load hotels for this location
                this.onFormLocationChange();

                setTimeout(() => {

                  // ✅ Step 4: Set main form data
                  this.HotelRate = {
                    HotelRateId: record.HotelRateId,
                    HotelId: record.HotelId,
                    HotelCategoryId: record.HotelCategoryId,
                    HotelCategoryName: record.HotelCategoryName,
                    RoomTypeId: record.RoomTypeId,
                    FromDate: new Date(record.FromDate),
                    ToDate: new Date(record.ToDate),
                    CpRate: record.CpRate,
                    MapRate: record.MapRate,
                    ApRate: record.ApRate
                  };

                  // ✅ Step 5: Load room types for selected hotel
                  this.getRoomTypeList(record.HotelId);

                  // ✅ Step 6: Show in table (optional preview)
                  this.HotelRateRows.set([{
                    ...this.HotelRate,
                    HotelName: record.HotelName,
                    RoomTypeName: record.RoomTypeName
                  }]);

                }, 200);

              }, 200);
            }
          }

        } else {
          this.toastr.error(r1.Message);
        }

        this.dataLoading.set(false);
      },

      error: () => {
        this.toastr.error("Error while fetching record");
        this.dataLoading.set(false);
      }
    });
  }
  // ── Add / update row in preview table ────────────────────────────────
  addToTable() {
    if (!this.HotelRate.HotelId || !this.HotelRate.RoomTypeId ||
      !this.HotelRate.FromDate || !this.HotelRate.ToDate ||
      !this.HotelRate.CpRate || !this.HotelRate.MapRate || !this.HotelRate.ApRate) {
      this.toastr.error("Please fill all required fields");
      return;
    }

    const selectedHotel = this.HotelList().find(
      (h: any) => h.HotelId === this.HotelRate.HotelId
    );
    const selectedRoom = this.RoomTypeList().find(
      (r: any) => r.RoomTypeId === this.HotelRate.RoomTypeId
    );

    const rowData = {
      HotelRateId: this.HotelRate.HotelRateId || 0,
      HotelId: this.HotelRate.HotelId,
      HotelName: selectedHotel?.HotelName,
      HotelCategoryId: this.HotelRate.HotelCategoryId,
      HotelCategoryName: this.HotelRate.HotelCategoryName,
      RoomTypeId: this.HotelRate.RoomTypeId,
      RoomTypeName: selectedRoom?.RoomTypeName,
      FromDate: this.HotelRate.FromDate,
      ToDate: this.HotelRate.ToDate,
      CpRate: this.HotelRate.CpRate,
      MapRate: this.HotelRate.MapRate,
      ApRate: this.HotelRate.ApRate,
      Status: this.HotelRate.Status
    };

    if (this.editingRowIndex !== null) {
      // update existing row immutably
      const updated = [...this.HotelRateRows()];
      updated[this.editingRowIndex] = rowData;
      this.HotelRateRows.set(updated);
      this.editingRowIndex = null;
      this.toastr.success("Row updated");
    } else {
      this.HotelRateRows.update(rows => [...rows, rowData]);
    }

    // reset rate fields only
    this.HotelRate.HotelRateId = 0;
    // this.HotelRate.RoomTypeId = 0;
    this.HotelRate.CpRate = '';
    this.HotelRate.MapRate = '';
    this.HotelRate.ApRate = '';
    this.HotelRate.FromDate = null;
    this.HotelRate.ToDate = null;
  }

  // ── Edit row ──────────────────────────────────────────────────────────
  editRow(index: number) {
    this.editingRowIndex = index;
    const row = this.HotelRateRows()[index];
    this.HotelRate = { ...row };
  }

  // ── Cancel edit ───────────────────────────────────────────────────────
  cancelEdit() {
    this.editingRowIndex = null;
    this.HotelRate.HotelRateId = 0;
    this.HotelRate.RoomTypeId = 0;
    this.HotelRate.CpRate = '';
    this.HotelRate.MapRate = '';
    this.HotelRate.ApRate = '';
  }

  // ── Remove row ────────────────────────────────────────────────────────
  removeRow(index: number) {
    const row = this.HotelRateRows()[index];

    if (row.HotelRateId && row.HotelRateId > 0) {
      if (confirm("Are you sure you want to delete this record?")) {
        const obj: RequestModel = {
          request: this.localService.encrypt(
            JSON.stringify({ HotelRateId: row.HotelRateId })
          ).toString()
        };
        this.dataLoading.set(true);
        this.service.deleteHotelRate(obj).subscribe({
          next: (r1: any) => {
            if (r1.Message == ConstantData.SuccessMessage) {
              this.toastr.success("Record deleted successfully");
              this.HotelRateRows.update(rows => rows.filter((_, i) => i !== index));
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
    } else {
      this.HotelRateRows.update(rows => rows.filter((_, i) => i !== index));
    }
  }

  // ── Save all rows ─────────────────────────────────────────────────────
  saveHotelRates() {
    if (this.HotelRateRows().length === 0) {
      this.toastr.error("Please add at least one row");
      return;
    }
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify(this.HotelRateRows())
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.saveHotelRate(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Hotel rates saved successfully");
          this.HotelRateRows.set([]);
          this.resetForm();
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error("Error occurred while saving data");
        this.dataLoading.set(false);
      }
    });
  }

  sort(key: any) {
    this.sortKey = key;
    this.reverse = !this.reverse;
  }

  onTableDataChange(p: any) {
    this.p = p;
  }

  // Filter cascade for form
  DestinationList = signal<any[]>([]);
  LocationList = signal<any[]>([]);
  SelectedDestinationId: any = 0;
  SelectedLocationId: any = 0;
  FilteredHotelList = signal<any[]>([]);

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
      error: () => this.toastr.error("Error while fetching destinations")
    });
  }
  onFormDestinationChange() {
    this.SelectedLocationId = 0;
    this.HotelRate.HotelId = null;
    this.HotelRate.HotelCategoryId = null;
    this.HotelRate.HotelCategoryName = '';
    this.LocationList.set([]);
    this.FilteredHotelList.set([]);
    this.RoomTypeList.set([]);
    this.HotelRateRows.set([]);

    if (!this.SelectedDestinationId || this.SelectedDestinationId == 0) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: Number(this.SelectedDestinationId) })
      ).toString()
    };
    this.service.getLocationList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.LocationList.set(r1.LocationList);
        } else {
          this.toastr.error(r1.Message);
        }
      },
      error: () => this.toastr.error("Error while fetching locations")
    });
  }

  onFormLocationChange() {
    this.HotelRate.HotelId = null;
    this.HotelRate.HotelCategoryId = null;
    this.HotelRate.HotelCategoryName = '';
    this.FilteredHotelList.set([]);
    this.RoomTypeList.set([]);
    this.HotelRateRows.set([]);

    if (!this.SelectedLocationId || this.SelectedLocationId == 0) return;

    // Filter hotels by selected location
    const filtered = this.HotelList().filter(
      (h: any) => h.LocationId === this.SelectedLocationId
    );
    this.FilteredHotelList.set(filtered);
  }




}
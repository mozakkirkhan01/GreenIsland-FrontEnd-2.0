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
import { Status, ChargeType } from '../../utils/enum';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { FilterPipe } from '../../utils/filter-pipe';
import { OrderByPipe } from '../../utils/orderby-pipe';
import { LoadDataService } from '../../utils/load-data.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ActivatedRoute } from '@angular/router';
@Component({
  selector: 'app-extra-charge',
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
  templateUrl: './extra-charge.html',
  styleUrl: './extra-charge.css',
})
export class ExtraCharge {

  // ── Signals ──────────────────────────────────────────────────────────
  dataLoading = signal(false);
  HotelList = signal<any[]>([]);
  RoomTypeList = signal<any[]>([]);
  ExtraChargeRows = signal<any[]>([]);
  action = signal<ActionModel>({
    CanCreate: false,
    CanEdit: false,
    CanDelete: false,
    MenuTitle: '',
    ParentMenuTitle: ''
  } as ActionModel);

  // ── Plain properties (form binding, primitives) ───────────────────────
  ExtraCharge: any = {};
  isSubmitted = false;
  editingRowIndex: number | null = null;
  Search = '';
  reverse = false;
  sortKey = '';
  p = 1;
  itemPerPage: number;

  loadData = inject(LoadDataService);
  StatusList = this.loadData.GetEnumList(Status);
  ChargeTypeList = this.loadData.GetEnumList(ChargeType);
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
      if (params['ExtraChargeId']) {
        this.loadExtraChargeById(params['ExtraChargeId']);
      }
    });
  }

  @ViewChild('formExtraCharge') formExtraCharge!: NgForm;

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
    this.ExtraCharge = { Status: 1, DestinationId: null };
    this.SelectedDestinationId = 0;
    this.SelectedLocationId = 0;
    this.LocationList.set([]);
    this.FilteredHotelList.set([]);
    if (this.formExtraCharge) {
      this.formExtraCharge.control.markAsPristine();
      this.formExtraCharge.control.markAsUntouched();
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
    this.showRoomTypeError.set(false);
    this.showRoomTypeErrorList.set(false);

    if (!this.ExtraCharge.HotelId) {
        this.ExtraCharge.HotelCategoryId = null;
        this.ExtraCharge.HotelCategoryName = '';
        this.ExtraChargeRows.set([]);
        return;
    }

    const selectedHotel = this.HotelList().find(
        (h: any) => h.HotelId === this.ExtraCharge.HotelId
    );
    if (selectedHotel) {
        this.ExtraCharge.HotelCategoryId = selectedHotel.HotelCategoryId;
        this.ExtraCharge.HotelCategoryName = selectedHotel.HotelCategoryName;
    }

    this.getExtraChargesByHotel(this.ExtraCharge.HotelId);
}







  // ── Load rates by hotel ───────────────────────────────────────────────
  getExtraChargesByHotel(hotelId: any) {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ HotelId: Number(hotelId) })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.getExtraChargeList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.ExtraChargeRows.set(
            r1.ExtraChargeList.map((record: any) => ({
              ExtraChargeId: record.ExtraChargeId,
              HotelId: record.HotelId,
              HotelName: record.HotelName,
              ChargeType: record.ChargeType,          // 👈 no RoomType
              ChargeTypeName: this.ChargeTypeList.find(
                (c: any) => c.Key === record.ChargeType
              )?.Value || '',
              FromDate: new Date(record.FromDate),
              ToDate: new Date(record.ToDate),
              CpRate: record.CpRate,
              MapRate: record.MapRate,
              ApRate: record.ApRate,
              Status: record.Status
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
  // loadExtraChargeById(ExtraChargeId: any) {
  //   const obj: RequestModel = {
  //     request: this.localService.encrypt(
  //       JSON.stringify({ ExtraChargeId: Number(ExtraChargeId) })
  //     ).toString()
  //   };
  //   this.dataLoading.set(true);
  //   this.service.getExtraChargeList(obj).subscribe({
  //     next: (r1: any) => {
  //       if (r1.Message == ConstantData.SuccessMessage) {
  //         const record = r1.ExtraChargeList[0];
  //         if (record) {
  //           this.ExtraCharge = {
  //             ExtraChargeId: record.ExtraChargeId,
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
  //           this.ExtraChargeRows.set([{
  //             ...this.ExtraCharge,
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


  loadExtraChargeById(ExtraChargeId: any) {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ ExtraChargeId: Number(ExtraChargeId) })
      ).toString()
    };

    this.dataLoading.set(true);

    this.service.getExtraChargeList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {

          const record = r1.ExtraChargeList[0];

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
                  this.ExtraCharge = {
                    ExtraChargeId: record.ExtraChargeId,
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
                  this.ExtraChargeRows.set([{
                    ...this.ExtraCharge,
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
// addToTable() {
//     if (!this.ExtraCharge.HotelId || !this.ExtraCharge.ChargeType ||
//         !this.ExtraCharge.FromDate || !this.ExtraCharge.ToDate ||
//         !this.ExtraCharge.CpRate || !this.ExtraCharge.MapRate || !this.ExtraCharge.ApRate) {
//         this.toastr.error("Please fill all required fields");
//         return;
//     }

//     const selectedHotel = this.HotelList().find(
//         (h: any) => h.HotelId === this.ExtraCharge.HotelId
//     );

//     const rowData = {
//         ExtraChargeId: this.ExtraCharge.ExtraChargeId || 0,
//         HotelId: this.ExtraCharge.HotelId,
//         HotelName: selectedHotel?.HotelName,
//         HotelCategoryId: this.ExtraCharge.HotelCategoryId,
//         HotelCategoryName: this.ExtraCharge.HotelCategoryName,
//         ChargeType: this.ExtraCharge.ChargeType,
//         ChargeTypeName: this.ChargeTypeList.find(
//             (c: any) => c.Key === this.ExtraCharge.ChargeType
//         )?.Value || '',
//         FromDate: this.ExtraCharge.FromDate,
//         ToDate: this.ExtraCharge.ToDate,
//         CpRate: this.ExtraCharge.CpRate,
//         MapRate: this.ExtraCharge.MapRate,
//         ApRate: this.ExtraCharge.ApRate,
//         Status: this.ExtraCharge.Status
//     };

//     if (this.editingRowIndex !== null) {
//         const updated = [...this.ExtraChargeRows()];
//         updated[this.editingRowIndex] = rowData;
//         this.ExtraChargeRows.set(updated);
//         this.editingRowIndex = null;
//         this.toastr.success("Row updated");
//     } else {
//         this.ExtraChargeRows.update(rows => [...rows, rowData]);
//     }

//     // reset fields
//     this.ExtraCharge.ExtraChargeId = 0;
//     this.ExtraCharge.ChargeType +1;
//     this.ExtraCharge.CpRate = '';
//     this.ExtraCharge.MapRate = '';
//     this.ExtraCharge.ApRate = '';
//     this.ExtraCharge.FromDate = null;
//     this.ExtraCharge.ToDate = null;
// }

addToTable() {
    if (!this.ExtraCharge.HotelId || !this.ExtraCharge.ChargeType ||
        !this.ExtraCharge.FromDate || !this.ExtraCharge.ToDate ||
        !this.ExtraCharge.CpRate || !this.ExtraCharge.MapRate || !this.ExtraCharge.ApRate) {
        this.toastr.error("Please fill all required fields");
        return;
    }

    const selectedHotel = this.HotelList().find(
        (h: any) => h.HotelId === this.ExtraCharge.HotelId
    );

    const rowData = {
        ExtraChargeId: this.ExtraCharge.ExtraChargeId || 0,
        HotelId: this.ExtraCharge.HotelId,
        HotelName: selectedHotel?.HotelName,
        HotelCategoryId: this.ExtraCharge.HotelCategoryId,
        HotelCategoryName: this.ExtraCharge.HotelCategoryName,
        ChargeType: this.ExtraCharge.ChargeType,
        ChargeTypeName: this.ChargeTypeList.find(
            (c: any) => c.Key === this.ExtraCharge.ChargeType
        )?.Value || '',
        FromDate: this.ExtraCharge.FromDate,
        ToDate: this.ExtraCharge.ToDate,
        CpRate: this.ExtraCharge.CpRate,
        MapRate: this.ExtraCharge.MapRate,
        ApRate: this.ExtraCharge.ApRate,
        Status: this.ExtraCharge.Status
    };

    if (this.editingRowIndex !== null) {
        const updated = [...this.ExtraChargeRows()];
        updated[this.editingRowIndex] = rowData;
        this.ExtraChargeRows.set(updated);
        this.editingRowIndex = null;
        this.toastr.success("Row updated");
    } else {
        this.ExtraChargeRows.update(rows => [...rows, rowData]);
    }

    // reset fields
    this.ExtraCharge.ExtraChargeId = 0;
    this.ExtraCharge.CpRate = '';
    this.ExtraCharge.MapRate = '';
    this.ExtraCharge.ApRate = '';
    this.ExtraCharge.FromDate = null;
    this.ExtraCharge.ToDate = null;

    // 👈 Auto advance ChargeType
    const currentType = Number(this.ExtraCharge.ChargeType);
    const maxType = Math.max(...this.ChargeTypeList.map((c: any) => c.Key));

    if (currentType < maxType) {
        this.ExtraCharge.ChargeType = currentType + 1;
    } else {
        this.ExtraCharge.ChargeType = null; // all 3 done
    }
}

  // ── Edit row ──────────────────────────────────────────────────────────
  editRow(index: number) {
    this.editingRowIndex = index;
    const row = this.ExtraChargeRows()[index];
    this.ExtraCharge = { ...row };
  }

  // ── Cancel edit ───────────────────────────────────────────────────────
  cancelEdit() {
    this.editingRowIndex = null;
    this.ExtraCharge.ExtraChargeId = 0;
    this.ExtraCharge.RoomTypeId = 0;
    this.ExtraCharge.CpRate = '';
    this.ExtraCharge.MapRate = '';
    this.ExtraCharge.ApRate = '';
  }

  // ── Remove row ────────────────────────────────────────────────────────
  removeRow(index: number) {
    const row = this.ExtraChargeRows()[index];

    if (row.ExtraChargeId && row.ExtraChargeId > 0) {
      if (confirm("Are you sure you want to delete this record?")) {
        const obj: RequestModel = {
          request: this.localService.encrypt(
            JSON.stringify({ ExtraChargeId: row.ExtraChargeId })
          ).toString()
        };
        this.dataLoading.set(true);
        this.service.deleteExtraCharge(obj).subscribe({
          next: (r1: any) => {
            if (r1.Message == ConstantData.SuccessMessage) {
              this.toastr.success("Record deleted successfully");
              this.ExtraChargeRows.update(rows => rows.filter((_, i) => i !== index));
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
      this.ExtraChargeRows.update(rows => rows.filter((_, i) => i !== index));
    }
  }

  // ── Save all rows ─────────────────────────────────────────────────────
saveExtraCharges() {
    if (this.ExtraChargeRows().length === 0) {
        this.toastr.error("Please add at least one row");
        return;
    }

    // 👈 Map to only DB fields before sending
    const dataToSave = this.ExtraChargeRows().map((row: any) => ({
        ExtraChargeId: row.ExtraChargeId || 0,
        HotelId: row.HotelId,
        ChargeType: row.ChargeType,
        CpRate: row.CpRate,
        MapRate: row.MapRate,
        ApRate: row.ApRate,
        FromDate: row.FromDate,
        ToDate: row.ToDate,
        Status: row.Status
    }));

    const obj: RequestModel = {
        request: this.localService.encrypt(
            JSON.stringify(dataToSave)  // 👈 send clean data
        ).toString()
    };

    this.dataLoading.set(true);
    this.service.saveExtraCharge(obj).subscribe({
        next: (r1: any) => {
            if (r1.Message == ConstantData.SuccessMessage) {
                this.toastr.success("Extra charges saved successfully");
                this.getExtraChargesByHotel(this.ExtraCharge.HotelId); // 👈 reload table
                this.ExtraCharge.ChargeType = null;
                this.ExtraCharge.CpRate = '';
                this.ExtraCharge.MapRate = '';
                this.ExtraCharge.ApRate = '';
                this.ExtraCharge.FromDate = null;
                this.ExtraCharge.ToDate = null;
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
    this.ExtraCharge.HotelId = null;
    this.ExtraCharge.HotelCategoryId = null;
    this.ExtraCharge.HotelCategoryName = '';
    this.LocationList.set([]);
    this.FilteredHotelList.set([]);
    this.RoomTypeList.set([]);
    this.ExtraChargeRows.set([]);

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
    this.ExtraCharge.HotelId = null;
    this.ExtraCharge.HotelCategoryId = null;
    this.ExtraCharge.HotelCategoryName = '';
    this.FilteredHotelList.set([]);
    this.RoomTypeList.set([]);
    this.ExtraChargeRows.set([]);

    if (!this.SelectedLocationId || this.SelectedLocationId == 0) return;

    // Filter hotels by selected location
    const filtered = this.HotelList().filter(
      (h: any) => h.LocationId === this.SelectedLocationId
    );
    this.FilteredHotelList.set(filtered);
  }







}

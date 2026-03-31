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

  // 9 rate fields: CWeb, AWeb, CNB — each has CpRate, MapRate, ApRate
  CWebRates: any = { CpRate: '', MapRate: '', ApRate: '' };
  AWebRates: any = { CpRate: '', MapRate: '', ApRate: '' };
  CNBRates: any = { CpRate: '', MapRate: '', ApRate: '' };

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
    this.getDestinationList();
    this.getHotelList();
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
    this.ExtraCharge = { Status: 1, FromDate: null, ToDate: null };
    this.CWebRates = { CpRate: '', MapRate: '', ApRate: '' };
    this.AWebRates = { CpRate: '', MapRate: '', ApRate: '' };
    this.CNBRates = { CpRate: '', MapRate: '', ApRate: '' };
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

  // ── Reset only the rate fields (keep hotel/dates) ─────────────────────
  resetRateFields() {
    this.CWebRates = { CpRate: '', MapRate: '', ApRate: '' };
    this.AWebRates = { CpRate: '', MapRate: '', ApRate: '' };
    this.CNBRates = { CpRate: '', MapRate: '', ApRate: '' };
    this.ExtraCharge.FromDate = null;
    this.ExtraCharge.ToDate = null;
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
          this.showRoomTypeError.set(r1.RoomTypeList.length === 0);
          this.showRoomTypeErrorList.set(r1.RoomTypeList.length > 0);
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
            r1.ExtraChargeList.map((record: any) => {

              // ── Look up hotel from already-loaded HotelList signal ──
              // This is needed because ExtraCharge table has no HotelCategoryName column
              // so the API may not return it — we fall back to HotelList as source of truth
              const hotel = this.HotelList().find(
                (h: any) => h.HotelId === record.HotelId
              );

              return {
                ExtraChargeId: record.ExtraChargeId,
                HotelId: record.HotelId,
                HotelName: record.HotelName || hotel?.HotelName || '',
                HotelCategoryId: record.HotelCategoryId || hotel?.HotelCategoryId || null,
                HotelCategoryName: record.HotelCategoryName || hotel?.HotelCategoryName || '', // 👈 fallback to HotelList
                ChargeType: record.ChargeType,
                ChargeTypeName: this.ChargeTypeList.find(
                  (c: any) => c.Key === record.ChargeType
                )?.Value || '',
                FromDate: new Date(record.FromDate),
                ToDate: new Date(record.ToDate),
                CpRate: record.CpRate,
                MapRate: record.MapRate,
                ApRate: record.ApRate,
                Status: record.Status
              };
            })
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
            const selectedHotel = this.HotelList().find(
              (h: any) => h.HotelId === record.HotelId
            );

            if (selectedHotel) {
              this.SelectedDestinationId = selectedHotel.DestinationId;
              this.onFormDestinationChange();

              setTimeout(() => {
                this.SelectedLocationId = selectedHotel.LocationId;
                this.onFormLocationChange();

                setTimeout(() => {
                  this.ExtraCharge = {
                    ExtraChargeId: record.ExtraChargeId,
                    HotelId: record.HotelId,
                    HotelCategoryId: record.HotelCategoryId,
                    HotelCategoryName: record.HotelCategoryName,
                    FromDate: new Date(record.FromDate),
                    ToDate: new Date(record.ToDate),
                    Status: record.Status
                  };

                  this.getRoomTypeList(record.HotelId);
                  this.getExtraChargesByHotel(record.HotelId);
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

  // ── Add all 3 charge-type rows to the table at once ───────────────────
  // addToTable() {
  //   if (!this.ExtraCharge.HotelId || !this.ExtraCharge.FromDate || !this.ExtraCharge.ToDate) {
  //     this.toastr.error("Please select a hotel and fill in From / To dates");
  //     return;
  //   }

  //   const ratesValid =
  //     (this.CWebRates.CpRate !== '' && this.CWebRates.MapRate !== '' && this.CWebRates.ApRate !== '') ||
  //     (this.AWebRates.CpRate !== '' && this.AWebRates.MapRate !== '' && this.AWebRates.ApRate !== '') ||
  //     (this.CNBRates.CpRate  !== '' && this.CNBRates.MapRate  !== '' && this.CNBRates.ApRate  !== '');

  //   if (!ratesValid) {
  //     this.toastr.error("Please fill in at least one complete charge type (CWeb, AWeb or CNB)");
  //     return;
  //   }

  //   const selectedHotel = this.HotelList().find(
  //     (h: any) => h.HotelId === this.ExtraCharge.HotelId
  //   );

  //   // Map: enum key → label.  Adjust Key values to match your ChargeType enum.
  //   const chargeGroups = [
  //     { chargeTypeKey: this.ChargeTypeList.find((c: any) => c.Value === 'CWeb')?.Key, label: 'CWeb', rates: this.CWebRates },
  //     { chargeTypeKey: this.ChargeTypeList.find((c: any) => c.Value === 'AWeb')?.Key, label: 'AWeb', rates: this.AWebRates },
  //     { chargeTypeKey: this.ChargeTypeList.find((c: any) => c.Value === 'CNB')?.Key,  label: 'CNB',  rates: this.CNBRates  },
  //   ];

  //   chargeGroups.forEach(group => {
  //     // Skip if any rate field is empty for this group
  //     if (group.rates.CpRate === '' || group.rates.MapRate === '' || group.rates.ApRate === '') return;

  //     const rowData = {
  //       ExtraChargeId: 0,
  //       HotelId: this.ExtraCharge.HotelId,
  //       HotelName: selectedHotel?.HotelName,
  //       HotelCategoryId: this.ExtraCharge.HotelCategoryId,
  //       HotelCategoryName: this.ExtraCharge.HotelCategoryName,
  //       ChargeType: group.chargeTypeKey,
  //       ChargeTypeName: group.label,
  //       FromDate: this.ExtraCharge.FromDate,
  //       ToDate: this.ExtraCharge.ToDate,
  //       CpRate: group.rates.CpRate,
  //       MapRate: group.rates.MapRate,
  //       ApRate: group.rates.ApRate,
  //       Status: this.ExtraCharge.Status ?? 1
  //     };

  //     if (this.editingRowIndex !== null) {
  //       // When editing a single row, update only that row
  //       const updated = [...this.ExtraChargeRows()];
  //       updated[this.editingRowIndex] = rowData;
  //       this.ExtraChargeRows.set(updated);
  //       this.editingRowIndex = null;
  //       this.toastr.success("Row updated");
  //     } else {
  //       this.ExtraChargeRows.update(rows => [...rows, rowData]);
  //     }
  //   });

  //   if (this.editingRowIndex === null) {
  //     this.toastr.success("Rows added to table");
  //   }

  //   this.resetRateFields();
  // }

  addToTable() {
    if (!this.ExtraCharge.HotelId || !this.ExtraCharge.FromDate || !this.ExtraCharge.ToDate) {
      this.toastr.error("Please select a hotel and fill in From / To dates");
      return;
    }

    const cwebFilled = this.CWebRates.CpRate !== '' && this.CWebRates.MapRate !== '' && this.CWebRates.ApRate !== '';
    const awebFilled = this.AWebRates.CpRate !== '' && this.AWebRates.MapRate !== '' && this.AWebRates.ApRate !== '';
    const cnbFilled = this.CNBRates.CpRate !== '' && this.CNBRates.MapRate !== '' && this.CNBRates.ApRate !== '';

    if (!cwebFilled && !awebFilled && !cnbFilled) {
      this.toastr.error("Please fill in at least one complete charge type (CWeb, AWeb or CNB)");
      return;
    }

    const selectedHotel = this.HotelList().find(
      (h: any) => h.HotelId === this.ExtraCharge.HotelId
    );

    const chargeGroups = [
      { chargeTypeKey: ChargeType.CWEB, label: 'CWEB', rates: this.CWebRates },
      { chargeTypeKey: ChargeType.AWEB, label: 'AWEB', rates: this.AWebRates },
      { chargeTypeKey: ChargeType.CNB, label: 'CNB', rates: this.CNBRates },
    ];

    // ── EDIT MODE: only update the single row being edited ──
    if (this.editingRowIndex !== null) {

      // Find which group has rates filled (only one should be filled in edit mode)
      const activeGroup = chargeGroups.find(
        group => group.rates.CpRate !== '' && group.rates.MapRate !== '' && group.rates.ApRate !== ''
      );

      if (!activeGroup) {
        this.toastr.error("Please fill in the rate fields");
        return;
      }

      const updatedRow = {
        ...this.ExtraChargeRows()[this.editingRowIndex], // keep ExtraChargeId & other fields
        ChargeType: activeGroup.chargeTypeKey,          // updated enum value
        ChargeTypeName: activeGroup.label,              // updated display label
        FromDate: this.ExtraCharge.FromDate,
        ToDate: this.ExtraCharge.ToDate,
        CpRate: activeGroup.rates.CpRate,
        MapRate: activeGroup.rates.MapRate,
        ApRate: activeGroup.rates.ApRate,
        Status: this.ExtraCharge.Status ?? 1
      };

      const updated = [...this.ExtraChargeRows()];
      updated[this.editingRowIndex] = updatedRow;
      this.ExtraChargeRows.set(updated);
      this.editingRowIndex = null;
      this.toastr.success("Row updated");

    } else {
      // ── ADD MODE: loop all groups and add a row for each filled group ──
      chargeGroups.forEach(group => {
        if (group.rates.CpRate === '' || group.rates.MapRate === '' || group.rates.ApRate === '') return;

        const rowData = {
          ExtraChargeId: 0,
          HotelId: this.ExtraCharge.HotelId,
          HotelName: selectedHotel?.HotelName,
          HotelCategoryId: this.ExtraCharge.HotelCategoryId,
          HotelCategoryName: this.ExtraCharge.HotelCategoryName,
          ChargeType: group.chargeTypeKey,
          ChargeTypeName: group.label,
          FromDate: this.ExtraCharge.FromDate,
          ToDate: this.ExtraCharge.ToDate,
          CpRate: group.rates.CpRate,
          MapRate: group.rates.MapRate,
          ApRate: group.rates.ApRate,
          Status: this.ExtraCharge.Status ?? 1
        };

        this.ExtraChargeRows.update(rows => [...rows, rowData]);
      });

      this.toastr.success("Rows added to table");
    }

    // ── Clear rate fields and dates after add/update ──
    this.resetRateFields();
  }

  // ── Edit row ──────────────────────────────────────────────────────────
  editRow(index: number) {
    this.editingRowIndex = index;
    const row = this.ExtraChargeRows()[index];

    // ── Pre-fill shared fields (dates & status) ──
    this.ExtraCharge.FromDate = row.FromDate;
    this.ExtraCharge.ToDate = row.ToDate;
    this.ExtraCharge.Status = row.Status;

    // ── Clear all 9 rate fields first ──
    this.CWebRates = { CpRate: '', MapRate: '', ApRate: '' };
    this.AWebRates = { CpRate: '', MapRate: '', ApRate: '' };
    this.CNBRates = { CpRate: '', MapRate: '', ApRate: '' };

    const rates = { CpRate: row.CpRate, MapRate: row.MapRate, ApRate: row.ApRate };

    // ── Match by ChargeType enum value (number), not label string ──
    if (row.ChargeType === ChargeType.CWEB) { this.CWebRates = { ...rates }; }
    else if (row.ChargeType === ChargeType.AWEB) { this.AWebRates = { ...rates }; }
    else if (row.ChargeType === ChargeType.CNB) { this.CNBRates = { ...rates }; }
  }

  // ── Cancel edit ───────────────────────────────────────────────────────
  cancelEdit() {
    this.editingRowIndex = null;
    this.resetRateFields();
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
        JSON.stringify(dataToSave)
      ).toString()
    };

    this.dataLoading.set(true);
    this.service.saveExtraCharge(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Extra charges saved successfully");
          this.getExtraChargesByHotel(this.ExtraCharge.HotelId);
          this.resetRateFields();
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

  // ── Filter cascade for form ───────────────────────────────────────────
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

    const filtered = this.HotelList().filter(
      (h: any) => h.LocationId === this.SelectedLocationId
    );
    this.FilteredHotelList.set(filtered);
  }
}
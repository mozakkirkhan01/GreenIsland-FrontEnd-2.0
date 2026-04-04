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
import { LoadDataService } from '../../utils/load-data.service';
import { Progress } from '../../component/progress/progress';

@Component({
  selector: 'app-special-inclusion',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    NgxPaginationModule,
    Progress,
  ],
  templateUrl: './special-inclusion.html',
  styleUrl: './special-inclusion.css',
})
export class SpecialInclusion {

  // ── Signals ───────────────────────────────────────────────────────────
  dataLoading = signal(false);
  HotelList = signal<any[]>([]);
  SpecialInclusionTypeList = signal<any[]>([]);
  DestinationList = signal<any[]>([]);

  // ── Form (top) cascade signals ────────────────────────────────────────
  FormLocationList = signal<any[]>([]);
  FormFilteredHotelList = signal<any[]>([]);

  // ── Filter (bottom) cascade signals ───────────────────────────────────
  FilterLocationList = signal<any[]>([]);
  FilterHotelList = signal<any[]>([]);

  // ── Table listing ─────────────────────────────────────────────────────
  SpecialInclusionListData = signal<any[]>([]);  // loaded for filter/table
  filterDataLoading = signal(false);

  action = signal<ActionModel>({
    CanCreate: false, CanEdit: false, CanDelete: false,
    MenuTitle: '', ParentMenuTitle: ''
  } as ActionModel);

  // ── Form model (top section) ──────────────────────────────────────────
  SpecialInclusion: any = {};
  RateInputs: { [key: number]: { Rate: any, Status: number, SpecialInclusionId: number } } = {};

  // ── Top form cascade ──────────────────────────────────────────────────
  SelectedDestinationId: any = 0;
  SelectedLocationId: any = 0;

  // ── Filter section cascade ────────────────────────────────────────────
  FilterDestinationId: any = 0;
  FilterLocationId: any = 0;
  FilterHotelId: any = 0;

  // ── Empty state messages ──────────────────────────────────────────────
  formLocationMsg = '';
  formHotelMsg = '';
  filterLocationMsg = '';
  filterHotelMsg = '';

  isSubmitted = false;
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
    this.getDestinationList();
    this.getHotelList();
    this.getSpecialInclusionTypeList();
    this.resetForm();
  }

  @ViewChild('formSpecialInclusion') formSpecialInclusion!: NgForm;

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
    this.SpecialInclusion = { Status: 1 };
    this.RateInputs = {};
    this.SelectedDestinationId = 0;
    this.SelectedLocationId = 0;
    this.FormLocationList.set([]);
    this.FormFilteredHotelList.set([]);
    this.formLocationMsg = '';
    this.formHotelMsg = '';
    if (this.formSpecialInclusion) {
      this.formSpecialInclusion.control.markAsPristine();
      this.formSpecialInclusion.control.markAsUntouched();
    }
    this.isSubmitted = false;
  }

  // ── Safe getter for RateInputs ────────────────────────────────────────
  getRateInput(typeId: number): { Rate: any, Status: number, SpecialInclusionId: number } {
    if (!this.RateInputs[typeId]) {
      this.RateInputs[typeId] = { Rate: '', Status: 1, SpecialInclusionId: 0 };
    }
    return this.RateInputs[typeId];
  }

  // ── Initialize RateInputs for all types ───────────────────────────────
  initRateInputs() {
    this.RateInputs = {};
    this.SpecialInclusionTypeList().forEach((type: any) => {
      this.RateInputs[type.SpecialInclusionTypeId] = {
        Rate: '',
        Status: 1,
        SpecialInclusionId: 0
      };
    });
  }

  // ── Load Special Inclusion Types ──────────────────────────────────────
  getSpecialInclusionTypeList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.service.getSpecialInclusionTypeList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.SpecialInclusionTypeList.set(r1.SpecialInclusionTypeList);
        } else {
          this.toastr.error(r1.Message);
        }
      },
      error: () => this.toastr.error("Error while fetching special inclusion types")
    });
  }

  // ── Hotel list (all) ──────────────────────────────────────────────────
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
      error: () => this.toastr.error("Error while fetching destinations")
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  TOP FORM cascade (for entry)
  // ════════════════════════════════════════════════════════════════════

  onFormDestinationChange() {
    this.SelectedLocationId = 0;
    this.SpecialInclusion.HotelId = null;
    this.SpecialInclusion.HotelCategoryId = null;
    this.SpecialInclusion.HotelCategoryName = '';
    this.FormLocationList.set([]);
    this.FormFilteredHotelList.set([]);
    this.RateInputs = {};
    this.formLocationMsg = '';
    this.formHotelMsg = '';

    if (!this.SelectedDestinationId || this.SelectedDestinationId == 0) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: Number(this.SelectedDestinationId) })
      ).toString()
    };
    this.service.getLocationList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          const locations = r1.LocationList || [];
          this.FormLocationList.set(locations);
          // ── Show message if no locations found ──
          if (locations.length === 0) {
            this.formLocationMsg = 'No location found for this destination.';
          } else {
            this.formLocationMsg = '';
          }
        } else {
          this.toastr.error(r1.Message);
        }
      },
      error: () => this.toastr.error("Error while fetching locations")
    });
  }

  onFormLocationChange() {
    this.SpecialInclusion.HotelId = null;
    this.SpecialInclusion.HotelCategoryId = null;
    this.SpecialInclusion.HotelCategoryName = '';
    this.FormFilteredHotelList.set([]);
    this.RateInputs = {};
    this.formHotelMsg = '';

    if (!this.SelectedLocationId || this.SelectedLocationId == 0) return;

    const filtered = this.HotelList().filter(
      (h: any) => h.LocationId === this.SelectedLocationId
    );
    this.FormFilteredHotelList.set(filtered);

    // ── Show message if no hotels in this location ──
    if (filtered.length === 0) {
      this.formHotelMsg = 'No hotel found in this location.';
    } else {
      this.formHotelMsg = '';
    }
  }

  onHotelChange() {
    this.RateInputs = {};

    if (!this.SpecialInclusion.HotelId) {
      this.SpecialInclusion.HotelCategoryId = null;
      this.SpecialInclusion.HotelCategoryName = '';
      return;
    }

    const selectedHotel = this.HotelList().find(
      (h: any) => h.HotelId === this.SpecialInclusion.HotelId
    );
    if (selectedHotel) {
      this.SpecialInclusion.HotelCategoryId = selectedHotel.HotelCategoryId;
      this.SpecialInclusion.HotelCategoryName = selectedHotel.HotelCategoryName;
    }

    this.getSpecialInclusionsByHotel(this.SpecialInclusion.HotelId);
  }

  // ── Load existing records for hotel & pre-fill inputs ─────────────────
  getSpecialInclusionsByHotel(hotelId: any) {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ HotelId: Number(hotelId) })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.getSpecialInclusionList(obj).subscribe({
      next: (r1: any) => {
        this.initRateInputs();
        if (r1.Message == ConstantData.SuccessMessage) {
          r1.SpecialInclusionList.forEach((record: any) => {
            if (this.RateInputs[record.SpecialInclusionTypeId] !== undefined) {
              this.RateInputs[record.SpecialInclusionTypeId] = {
                Rate: record.Rate,
                Status: record.Status,
                SpecialInclusionId: record.SpecialInclusionId
              };
            }
          });
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.initRateInputs();
        this.toastr.error("Error while fetching special inclusions");
        this.dataLoading.set(false);
      }
    });
  }

  // ── Save all filled rows ──────────────────────────────────────────────
  saveSpecialInclusions() {
    if (!this.SpecialInclusion.HotelId) {
      this.toastr.error("Please select a hotel first");
      return;
    }

    const dataToSave = this.SpecialInclusionTypeList()
      .filter((type: any) => {
        const input = this.RateInputs[type.SpecialInclusionTypeId];
        return input && input.Rate !== '' && input.Rate !== null && input.Rate !== undefined;
      })
      .map((type: any) => {
        const input = this.RateInputs[type.SpecialInclusionTypeId];
        return {
          SpecialInclusionId: input.SpecialInclusionId || 0,
          HotelId: this.SpecialInclusion.HotelId,
          SpecialInclusionTypeId: type.SpecialInclusionTypeId,
          Rate: input.Rate,
          Status: input.Status ?? 1
        };
      });

    if (dataToSave.length === 0) {
      this.toastr.error("Please fill in at least one rate");
      return;
    }

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(dataToSave)).toString()
    };

    this.dataLoading.set(true);
    this.service.saveSpecialInclusion(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Special inclusions saved successfully");
          this.getSpecialInclusionsByHotel(this.SpecialInclusion.HotelId);
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

  // ════════════════════════════════════════════════════════════════════
  //  FILTER SECTION cascade (for table listing below)
  // ════════════════════════════════════════════════════════════════════

  onFilterDestinationChange() {
    this.FilterLocationId = 0;
    this.FilterHotelId = 0;
    this.FilterLocationList.set([]);
    this.FilterHotelList.set([]);
    this.SpecialInclusionListData.set([]);
    this.filterLocationMsg = '';
    this.filterHotelMsg = '';

    if (!this.FilterDestinationId || this.FilterDestinationId == 0) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: Number(this.FilterDestinationId) })
      ).toString()
    };
    this.service.getLocationList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          const locations = r1.LocationList || [];
          this.FilterLocationList.set(locations);
          // ── Message if no locations ──
          if (locations.length === 0) {
            this.filterLocationMsg = 'No location found for this destination.';
          } else {
            this.filterLocationMsg = '';
          }
        } else {
          this.toastr.error(r1.Message);
        }
      },
      error: () => this.toastr.error("Error while fetching locations")
    });
  }

  onFilterLocationChange() {
    this.FilterHotelId = 0;
    this.FilterHotelList.set([]);
    this.SpecialInclusionListData.set([]);
    this.filterHotelMsg = '';

    if (!this.FilterLocationId || this.FilterLocationId == 0) return;

    const filtered = this.HotelList().filter(
      (h: any) => h.LocationId === this.FilterLocationId
    );
    this.FilterHotelList.set(filtered);

    // ── Message if no hotels ──
    if (filtered.length === 0) {
      this.filterHotelMsg = 'No hotel found in this location.';
    } else {
      this.filterHotelMsg = '';
    }
  }

  onFilterHotelChange() {
    this.SpecialInclusionListData.set([]);
    if (!this.FilterHotelId || this.FilterHotelId == 0) return;
    this.loadFilteredData();
  }

  // ── Load table data for selected filter hotel ─────────────────────────
  loadFilteredData() {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ HotelId: Number(this.FilterHotelId) })
      ).toString()
    };
    this.filterDataLoading.set(true);
    this.service.getSpecialInclusionList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.SpecialInclusionListData.set(r1.SpecialInclusionList || []);
        } else {
          this.toastr.error(r1.Message);
          this.SpecialInclusionListData.set([]);
        }
        this.filterDataLoading.set(false);
      },
      error: () => {
        this.toastr.error("Error while fetching data");
        this.SpecialInclusionListData.set([]);
        this.filterDataLoading.set(false);
      }
    });
  }

  getStatusLabel(status: number): string {
    return status === 1 ? 'Active' : 'Inactive';
  }

  onTableDataChange(p: any) { this.p = p; }

  editRecord(row:any) {
    //set destination and load locations
    this.SelectedDestinationId = row.DestinationId; //
    this.onFormDestinationChange();

    setTimeout(() =>{
      this.SelectedDestinationId = row.LocationId;
      this.onFormLocationChange();

      setTimeout(() => {
        this.SpecialInclusion.HotelId = row.HotelId;
        this.onHotelChange();
      }, 300);
    }, 300);
  };
}
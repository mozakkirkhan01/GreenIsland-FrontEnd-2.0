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
  selector: 'app-hotel-rate',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    NgxPaginationModule,
    MatDatepickerModule,  // 👈 add
    MatNativeDateModule,  // 👈 add
    FilterPipe,
    OrderByPipe],
  templateUrl: './hotel-rate.html',
  styleUrl: './hotel-rate.css',
})
export class HotelRate {
  dataLoading: boolean = false;
  HotelRateList: any = [];
  HotelRate: any = {};
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
    // this.getHotelRateList();
    this.getHotelList();
    this.getRoomTypeList();
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

  @ViewChild('formHotelRate') formHotelRate!: NgForm;

  resetForm() {
    this.HotelRate = { Status: 1, DestinationId: null };
    if (this.formHotelRate) {
      this.formHotelRate.control.markAsPristine();
      this.formHotelRate.control.markAsUntouched();
    }
    this.isSubmitted = false;
  }
  HotelList: any[] = [];
  getHotelList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading = true;
    this.service.getHotelList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.HotelList = response.HotelList;
        console.log("hotelList", this.HotelList);

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

  onHotelChange() {
    if (!this.HotelRate.HotelId) {
      this.HotelRate.HotelCategoryId = null;
      this.HotelRate.HotelCategoryName = '';
      return;
    }

    // Find the selected hotel from HotelList
    const selectedHotel = this.HotelList.find(h => h.HotelId === this.HotelRate.HotelId);

    if (selectedHotel) {
      this.HotelRate.HotelCategoryId = selectedHotel.HotelCategoryId;
      this.HotelRate.HotelCategoryName = selectedHotel.HotelCategoryName; // 👈 for display
    }

    this.cdr.detectChanges();
  }
  RoomTypeList: any[] = [];
  getRoomTypeList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading = true;
    this.service.getRoomTypeList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.RoomTypeList = response.RoomTypeList;
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

  HotelRateRows: any[] = [];

  // addToTable() {
  //   // Validate required fields
  //   if (!this.HotelRate.HotelId || !this.HotelRate.RoomTypeId ||
  //     !this.HotelRate.FromDate || !this.HotelRate.ToDate ||
  //     !this.HotelRate.CpRate || !this.HotelRate.MapRate || !this.HotelRate.ApRate) {
  //     this.toastr.error("Please fill all required fields");
  //     return;
  //   }

  //   // Get display names
  //   const selectedHotel = this.HotelList.find(h => h.HotelId === this.HotelRate.HotelId);
  //   const selectedRoom = this.RoomTypeList.find(r => r.RoomTypeId === this.HotelRate.RoomTypeId);

  //   // Push a copy into the table
  //   this.HotelRateRows.push({
  //     HotelId: this.HotelRate.HotelId,
  //     HotelName: selectedHotel?.HotelName,
  //     HotelCategoryId: this.HotelRate.HotelCategoryId,
  //     HotelCategoryName: this.HotelRate.HotelCategoryName,
  //     RoomTypeId: this.HotelRate.RoomTypeId,
  //     RoomTypeName: selectedRoom?.RoomTypeName,
  //     FromDate: this.HotelRate.FromDate,
  //     ToDate: this.HotelRate.ToDate,
  //     CpRate: this.HotelRate.CpRate,
  //     MapRate: this.HotelRate.MapRate,
  //     ApRate: this.HotelRate.ApRate
  //   });

  //   // Reset only rate fields, keep hotel/dates for convenience
  //   this.HotelRate.RoomTypeId = 0;
  //   this.HotelRate.CpRate = '';
  //   this.HotelRate.MapRate = '';
  //   this.HotelRate.ApRate = '';

  //   this.cdr.detectChanges();
  // }

  removeRow(index: number) {
    this.HotelRateRows.splice(index, 1);
    this.cdr.detectChanges();
  }
  editingRowIndex: number | null = null;

  editRow(index: number) {
    this.editingRowIndex = index;
    const row = this.HotelRateRows[index];

    // Load data back into form fields
    this.HotelRate.HotelId = row.HotelId;
    this.HotelRate.HotelCategoryId = row.HotelCategoryId;
    this.HotelRate.HotelCategoryName = row.HotelCategoryName;
    this.HotelRate.RoomTypeId = row.RoomTypeId;
    this.HotelRate.FromDate = row.FromDate;
    this.HotelRate.ToDate = row.ToDate;
    this.HotelRate.CpRate = row.CpRate;
    this.HotelRate.MapRate = row.MapRate;
    this.HotelRate.ApRate = row.ApRate;

    this.cdr.detectChanges();
  }

  cancelEdit() {
    this.editingRowIndex = null;
    this.HotelRate.RoomTypeId = 0;
    this.HotelRate.CpRate = '';
    this.HotelRate.MapRate = '';
    this.HotelRate.ApRate = '';
    this.cdr.detectChanges();
  }

  // Update addToTable() to handle both add and update
  addToTable() {
    if (!this.HotelRate.HotelId || !this.HotelRate.RoomTypeId ||
      !this.HotelRate.FromDate || !this.HotelRate.ToDate ||
      !this.HotelRate.CpRate || !this.HotelRate.MapRate || !this.HotelRate.ApRate) {
      this.toastr.error("Please fill all required fields");
      return;
    }

    const selectedHotel = this.HotelList.find(h => h.HotelId === this.HotelRate.HotelId);
    const selectedRoom = this.RoomTypeList.find(r => r.RoomTypeId === this.HotelRate.RoomTypeId);

    const rowData = {
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
      ApRate: this.HotelRate.ApRate
    };

    if (this.editingRowIndex !== null) {
      // 👈 Update existing row
      this.HotelRateRows[this.editingRowIndex] = rowData;
      this.editingRowIndex = null;
      this.toastr.success("Row updated");
    } else {
      // 👈 Add new row
      this.HotelRateRows.push(rowData);
    }

    // Reset rate fields
    this.HotelRate.RoomTypeId = 0;
    this.HotelRate.CpRate = '';
    this.HotelRate.MapRate = '';
    this.HotelRate.ApRate = '';

    this.cdr.detectChanges();
  }

}

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
  selector: 'app-hotel-category',
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
  templateUrl: './hotel-category.html',
  styleUrl: './hotel-category.css',
})
export class HotelCategory {

  // ── Signals ───────────────────────────────────────────────────────────
  dataLoading = signal(false);
  HotelCategoryList = signal<any[]>([]);
  showModal = signal(false);
  action = signal<ActionModel>({
    CanCreate: false,
    CanEdit: false,
    CanDelete: false,
    MenuTitle: '',
    ParentMenuTitle: ''
  } as ActionModel);

  // ── Plain properties ──────────────────────────────────────────────────
  HotelCategory: any = {};
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
    this.getHotelCategoryList();
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

  @ViewChild('formHotelCategory') formHotelCategory!: NgForm;

  // ── Reset form ────────────────────────────────────────────────────────
  resetForm() {
    this.HotelCategory = { Status: 1 };
    if (this.formHotelCategory) {
      this.formHotelCategory.control.markAsPristine();
      this.formHotelCategory.control.markAsUntouched();
    }
    this.isSubmitted = false;
  }

  openModal() {
    this.resetForm();
    this.showModal.set(true);
  }

  closeModal() {
    this.resetForm();
    this.showModal.set(false);
  }

  // ── Get list ──────────────────────────────────────────────────────────
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
        this.toastr.error("Error while fetching records");
        this.dataLoading.set(false);
      }
    });
  }

  // ── Save ──────────────────────────────────────────────────────────────
  saveHotelCategory() {
    this.isSubmitted = true;
    this.formHotelCategory.control.markAllAsTouched();
    if (this.formHotelCategory.invalid) {
      this.toastr.error("Fill all the required fields !!");
      return;
    }
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.HotelCategory)).toString()
    };
    this.dataLoading.set(true);
    this.service.saveHotelCategory(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success(this.HotelCategory.HotelCategoryId > 0
            ? "Hotel Category updated successfully"
            : "Hotel Category added successfully");
          this.closeModal();
          this.getHotelCategoryList();
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
  deleteHotelCategory(obj: any) {
    if (confirm("Are you sure you want to delete this record?")) {
      const request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      };
      this.dataLoading.set(true);
      this.service.deleteHotelCategory(request).subscribe({
        next: (r1: any) => {
          if (r1.Message == ConstantData.SuccessMessage) {
            this.toastr.success("Record deleted successfully");
            this.HotelCategoryList.update(list =>
              list.filter(x => x.HotelCategoryId !== obj.HotelCategoryId)
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
  editHotelCategory(obj: any) {
    this.HotelCategory = { ...obj };
    this.showModal.set(true);
  }
}
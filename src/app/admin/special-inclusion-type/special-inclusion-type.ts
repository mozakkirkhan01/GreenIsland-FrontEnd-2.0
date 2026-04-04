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
import { Progress } from '../../component/progress/progress';

@Component({
  selector: 'app-special-inclusion-type',
  imports: [CommonModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    NgxPaginationModule,
    MatDatepickerModule,
    MatNativeDateModule,
    Progress,
    OrderByPipe,
    FilterPipe,
  ],
  templateUrl: './special-inclusion-type.html',
  styleUrl: './special-inclusion-type.css',
})
export class SpecialInclusionType {
  // ── Signals ───────────────────────────────────────────────────────────
  dataLoading = signal(false);
  SpecialInclusionTypeList = signal<any[]>([]);
  showModal = signal(false);
  action = signal<ActionModel>({
    CanCreate: false,
    CanEdit: false,
    CanDelete: false,
    MenuTitle: '',
    ParentMenuTitle: ''
  } as ActionModel);

  // ── Plain properties ──────────────────────────────────────────────────
  SpecialInclusionType: any = {};
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
    this.getSpecialInclusionTypeList();
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

  @ViewChild('formSpecialInclusionType') formSpecialInclusionType!: NgForm;

  // ── Reset form ────────────────────────────────────────────────────────
  resetForm() {
    this.SpecialInclusionType = { Status: 1 };
    if (this.formSpecialInclusionType) {
      this.formSpecialInclusionType.control.markAsPristine();
      this.formSpecialInclusionType.control.markAsUntouched();
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
  getSpecialInclusionTypeList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading.set(true);
    this.service.getSpecialInclusionTypeList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.SpecialInclusionTypeList.set(r1.SpecialInclusionTypeList);
          console.log(this.SpecialInclusionTypeList);
          
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
  saveSpecialInclusionType() {
    this.isSubmitted = true;
    this.formSpecialInclusionType.control.markAllAsTouched();
    if (this.formSpecialInclusionType.invalid) {
      this.toastr.error("Fill all the required fields !!");
      return;
    }
    this.SpecialInclusionType.CreatedBy = this.staffLogin.StaffLoginId;
    this.SpecialInclusionType.UpdatedBy = this.staffLogin.StaffLoginId;
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.SpecialInclusionType)).toString()
    };
    this.dataLoading.set(true);
    this.service.saveSpecialInclusionType(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success(this.SpecialInclusionType.SpecialInclusionTypeId > 0
            ? "Hotel Category updated successfully"
            : "Hotel Category added successfully");
          this.closeModal();
          this.getSpecialInclusionTypeList();
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
  deleteSpecialInclusionType(obj: any) {
    if (confirm("Are you sure you want to delete this record?")) {
      const request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      };
      this.dataLoading.set(true);
      this.service.deleteSpecialInclusionType(request).subscribe({
        next: (r1: any) => {
          if (r1.Message == ConstantData.SuccessMessage) {
            this.toastr.success("Record deleted successfully");
            this.SpecialInclusionTypeList.update(list =>
              list.filter(x => x.SpecialInclusionTypeId !== obj.SpecialInclusionTypeId)
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
  editSpecialInclusionType(obj: any) {
    this.SpecialInclusionType = { ...obj };
    this.showModal.set(true);
  }
}

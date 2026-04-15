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
import { QuillModule } from 'ngx-quill';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { Status } from '../../utils/enum';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { LoadDataService } from '../../utils/load-data.service';
import { Progress } from '../../component/progress/progress';

@Component({
  selector: 'app-term-condition',
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
    QuillModule,
    Progress,
  ],
  templateUrl: './term-condition.html',
  styleUrl: './term-condition.css',
})
export class TermCondition {

  // ── Signals ───────────────────────────────────────────────────────────
  dataLoading = signal(false);
  DestinationList = signal<any[]>([]);
  TermAndConditionList = signal<any[]>([]);

  action = signal<ActionModel>({
    CanCreate: false, CanEdit: false, CanDelete: false,
    MenuTitle: '', ParentMenuTitle: ''
  } as ActionModel);

  // ── Form model ────────────────────────────────────────────────────────
  TermAndConditionModel: any = {};
  isSubmitted = false;

  // ── Form cascade ──────────────────────────────────────────────────────
  SelectedDestinationId: any = 0;

  // ── Filter cascade (list section) ─────────────────────────────────────
  FilterDestinationId: any = 0;

  // ── Quill editor config ───────────────────────────────────────────────
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ['clean'],
    ],
  };

  // ── List / pagination ─────────────────────────────────────────────────
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
    this.getDestinationList();
    this.resetForm();
    this.loadTermAndConditionList();
  }

  @ViewChild('formTermCondition') formTermCondition!: NgForm;

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
        this.toastr.error('Error while fetching records');
        this.dataLoading.set(false);
      }
    });
  }

  // ── Reset form ────────────────────────────────────────────────────────
  resetForm() {
    this.TermAndConditionModel = { Status: 1, TermAndConditionName: '' };
    this.SelectedDestinationId = 0;
    this.isSubmitted = false;
    if (this.formTermCondition) {
      this.formTermCondition.control.markAsPristine();
      this.formTermCondition.control.markAsUntouched();
    }
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
      error: () => this.toastr.error('Error while fetching destinations')
    });
  }

  // ── Form cascade ──────────────────────────────────────────────────────
  onFormDestinationChange() {
    this.TermAndConditionModel.DestinationId = this.SelectedDestinationId;

    if (!this.SelectedDestinationId || this.SelectedDestinationId == 0) {
      this.resetForm();
      return;
    }

    // Fetch existing record for this destination
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: this.SelectedDestinationId })
      ).toString()
    };

    this.dataLoading.set(true);
    this.service.getTermAndConditionList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage && r1.TermAndConditionList?.length > 0) {
          const existing = r1.TermAndConditionList[0]; // pick first record of that destination

          // Auto-populate form in EDIT mode
          this.TermAndConditionModel = {
            TermAndConditionId: existing.TermAndConditionId,
            DestinationId: existing.DestinationId,
            TermAndConditionName: existing.TermAndConditionName,
            Status: existing.Status,
          };
          this.toastr.info('Existing record loaded for editing');
        } else {
          // No record found — keep destination, clear content
          this.TermAndConditionModel = {
            TermAndConditionId: 0,
            DestinationId: this.SelectedDestinationId,
            TermAndConditionName: '',
            Status: 1,
          };
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while checking existing records');
        this.dataLoading.set(false);
      }
    });
  }

  // ── Save ──────────────────────────────────────────────────────────────
  saveTermAndCondition() {
    this.isSubmitted = true;
    if (
      !this.TermAndConditionModel.DestinationId ||
      !this.TermAndConditionModel.TermAndConditionName ||
      this.TermAndConditionModel.Status === null ||
      this.TermAndConditionModel.Status === undefined
    ) {
      this.toastr.error('Please fill all required fields');
      return;
    }

    this.TermAndConditionModel.CreatedBy = this.staffLogin.StaffLoginId;
    this.TermAndConditionModel.UpdatedBy = this.staffLogin.StaffLoginId;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify(this.TermAndConditionModel)
      ).toString()
    };

    this.dataLoading.set(true);
    this.service.saveTermAndCondition(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success(
            this.TermAndConditionModel.TermAndConditionId > 0
              ? 'Record updated successfully'
              : 'Record saved successfully'
          );
          this.resetAfterSave();
          this.loadTermAndConditionList();
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error occurred while saving data');
        this.dataLoading.set(false);
      }
    });
  }

  // ── Edit ──────────────────────────────────────────────────────────────
  editTermAndCondition(item: any) {
    this.SelectedDestinationId = item.DestinationId;
    this.TermAndConditionModel = {
      TermAndConditionId: item.TermAndConditionId,
      DestinationId: item.DestinationId,
      TermAndConditionName: item.TermAndConditionName,
      Status: item.Status,
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Delete ────────────────────────────────────────────────────────────
  deleteTermAndCondition(item: any) {
    if (!confirm('Are you sure you want to delete this record?')) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ TermAndConditionId: item.TermAndConditionId })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.deleteTermAndCondition(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success('Record deleted successfully');
          this.TermAndConditionList.update(rows =>
            rows.filter(x => x.TermAndConditionId !== item.TermAndConditionId)
          );
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error occurred while deleting the record');
        this.dataLoading.set(false);
      }
    });
  }

  // ── Filter cascade ────────────────────────────────────────────────────
  onFilterDestinationChange() {
    this.p = 1;
    this.loadTermAndConditionList();
  }

  loadTermAndConditionList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: Number(this.FilterDestinationId) })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.getTermAndConditionList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.TermAndConditionList.set(r1.TermAndConditionList);
        } else {
          this.toastr.error(r1.Message);
          this.TermAndConditionList.set([]);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while fetching term and conditions');
        this.dataLoading.set(false);
      }
    });
  }

  sort(key: any) { this.sortKey = key; this.reverse = !this.reverse; }
  onTableDataChange(p: any) { this.p = p; }

  resetAfterSave() {
    this.TermAndConditionModel.TermAndConditionName = '';
    this.TermAndConditionModel.TermAndConditionId = 0;
    this.SelectedDestinationId = 0;            // ← clear destination too
    this.TermAndConditionModel.DestinationId = 0;
    this.isSubmitted = false;

    if (this.formTermCondition) {
      this.formTermCondition.form.controls['TermAndConditionName']?.markAsPristine();
      this.formTermCondition.form.controls['TermAndConditionName']?.markAsUntouched();
    }
  }
}
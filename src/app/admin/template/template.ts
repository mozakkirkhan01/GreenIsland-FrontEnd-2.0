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
  selector: 'app-template',
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
  templateUrl: './template.html',
  styleUrl: './template.css',
})
export class Template {

  // ── Signals ───────────────────────────────────────────────────────────
  dataLoading = signal(false);
  TemplateList = signal<any[]>([]);

  action = signal<ActionModel>({
    CanCreate: false, CanEdit: false, CanDelete: false,
    MenuTitle: '', ParentMenuTitle: ''
  } as ActionModel);

  // ── Form model ────────────────────────────────────────────────────────
  TemplateModel: any = {};
  isSubmitted = false;

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
    // this.resetForm();
    this.loadTemplateList();
  }

  @ViewChild('formTemplate') formTemplate!: NgForm;

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
    this.TemplateModel = { Status: 1, Greetings: '' };
    this.isSubmitted = false;
    if (this.formTemplate) {
      this.formTemplate.control.markAsPristine();
      this.formTemplate.control.markAsUntouched();
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────
  saveTemplate() {
    this.isSubmitted = true;
    if (
      !this.TemplateModel.Greetings ||
      this.TemplateModel.Status === null ||
      this.TemplateModel.Status === undefined
    ) {
      this.toastr.error('Please fill all required fields');
      return;
    }

    this.TemplateModel.CreatedBy = this.staffLogin.StaffLoginId;
    this.TemplateModel.UpdatedBy = this.staffLogin.StaffLoginId;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify(this.TemplateModel)
      ).toString()
    };

    this.dataLoading.set(true);
    this.service.saveTemplate(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          const savedTemplateId =
            r1.TemplateId ??
            r1.templateId ??
            r1.Data?.TemplateId ??
            this.TemplateModel.TemplateId;
          this.toastr.success(
            this.TemplateModel.TemplateId > 0
              ? 'Record updated successfully'
              : 'Record saved successfully'
          );
          // Keep values visible immediately after save/update.
          this.TemplateModel = {
            ...this.TemplateModel,
            TemplateId: savedTemplateId ?? this.TemplateModel.TemplateId ?? 0,
          };
          this.isSubmitted = false;
          if (this.formTemplate) {
            this.formTemplate.control.markAsPristine();
            this.formTemplate.control.markAsUntouched();
          }
          this.loadTemplateList(savedTemplateId);
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
  private setTemplateModelFromItem(item: any) {
    this.TemplateModel = {
      TemplateId: item?.TemplateId ?? 0,
      Greetings: item?.Greetings ?? '',
      Status: item?.Status ?? 1,
    };
  }

  editTemplate(item: any) {
    this.setTemplateModelFromItem(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Delete ────────────────────────────────────────────────────────────
  deleteTemplate(item: any) {
    if (!confirm('Are you sure you want to delete this record?')) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ TemplateId: item.TemplateId })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.deleteTemplate(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success('Record deleted successfully');
          this.TemplateList.update(rows =>
            rows.filter(x => x.TemplateId !== item.TemplateId)
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

  // ── Load List ─────────────────────────────────────────────────────────
  loadTemplateList(preferredTemplateId?: number) {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({})
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.getTemplateList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          const list = r1.TemplateList || [];
          this.TemplateList.set(list);

          if (list.length > 0) {
            const selected =
              list.find((x: any) => Number(x.TemplateId) === Number(preferredTemplateId)) || list[0];
            this.setTemplateModelFromItem(selected);
          }
        } else {
          this.toastr.error(r1.Message);
          this.TemplateList.set([]);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while fetching templates');
        this.dataLoading.set(false);
      }
    });
  }

  sort(key: any) { this.sortKey = key; this.reverse = !this.reverse; }
  onTableDataChange(p: any) { this.p = p; }
}

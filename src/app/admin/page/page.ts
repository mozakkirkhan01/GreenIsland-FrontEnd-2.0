import { Component, ViewChild, inject, signal, computed } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { NgxPaginationModule } from 'ngx-pagination';
import { forkJoin, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { Status } from '../../utils/enum';
import { LoadDataService } from '../../utils/load-data.service';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { OrderByPipe } from '../../utils/orderby-pipe';
import { Progress } from '../../component/progress/progress';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatAutocompleteModule,
    NgxPaginationModule,
    OrderByPipe,
    Progress,
  ],
  templateUrl: './page.html',
  styleUrls: ['./page.css']
})
export class Page {

  // ── Signals ───────────────────────────────────────────────────────────
  dataLoading = signal(false);
  PageList = signal<any[]>([]);
  showModal = signal(false);

  action = signal<ActionModel>({
    CanCreate: false, CanEdit: false, CanDelete: false,
    MenuTitle: '', ParentMenuTitle: ''
  } as ActionModel);

  // ── Debounced search ──────────────────────────────────────────────────
  private searchInput$ = new Subject<string>();
  debouncedSearch = toSignal(
    this.searchInput$.pipe(debounceTime(300)),
    { initialValue: '' }
  );

  // ── Computed filtered + sorted list ──────────────────────────────────
  filteredPageList = computed(() => {
    const search = this.debouncedSearch().toLowerCase();
    const list = this.PageList();
    if (!search) return list;
    return list.filter(item =>
      item.PageName?.toLowerCase().includes(search) ||
      item.PageUrl?.toLowerCase().includes(search) ||
      item.PageGroupName?.toLowerCase().includes(search)
    );
  });

  // ── Form model ────────────────────────────────────────────────────────
  Page: any = {};
  isSubmitted = false;

  // ── Autocomplete ──────────────────────────────────────────────────────
  PageGroupList: any[] = [];
  filterPageGroup: any[] = [];

  // ── List / pagination ─────────────────────────────────────────────────
  reverse = false;
  sortKey = '';
  p = 1;
  itemPerPage: number;

  // ── Services ──────────────────────────────────────────────────────────
  private service = inject(AppService);
  private toastr = inject(ToastrService);
  private localService = inject(LocalService);
  private router = inject(Router);
  private loadData = inject(LoadDataService);

  StatusList = this.loadData.GetEnumList(Status);
  AllStatusList = Status;
  PageSize = ConstantData.PageSizes;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;

  @ViewChild('formPage') formPage!: NgForm;

  constructor() {
    this.itemPerPage = this.PageSize[0];
  }

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.loadInitialData();
  }

  // ── Menu validation ───────────────────────────────────────────────────
  validiateMenu() {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ Url: this.router.url.split('?')[0], StaffLoginId: this.staffLogin.StaffLoginId })
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

  // ── forkJoin — parallel API calls ─────────────────────────────────────
  loadInitialData() {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading.set(true);
    forkJoin({
      pages: this.service.getPageList(obj),
      groups: this.service.getPageGroupList(obj),
    }).subscribe({
      next: (r: any) => {
        if (r.pages.Message == ConstantData.SuccessMessage)
          this.PageList.set(r.pages.PageList);
        else
          this.toastr.error(r.pages.Message);

        if (r.groups.Message == ConstantData.SuccessMessage) {
          this.PageGroupList = r.groups.PageGroupList;
          this.filterPageGroup = [...r.groups.PageGroupList];
        } else {
          this.toastr.error(r.groups.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while loading data');
        this.dataLoading.set(false);
      }
    });
  }

  // ── Reload only page list (after save/delete) ─────────────────────────
  reloadPageList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading.set(true);
    this.service.getPageList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage)
          this.PageList.set(r1.PageList);
        else
          this.toastr.error(r1.Message);
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while fetching records');
        this.dataLoading.set(false);
      }
    });
  }

  // ── Reset / Modal ─────────────────────────────────────────────────────
  resetForm() {
    this.Page = { Status: 1 };
    this.isSubmitted = false;
    if (this.formPage) {
      this.formPage.control.markAsPristine();
      this.formPage.control.markAsUntouched();
    }
  }

  openModal() {
    this.resetForm();
    this.showModal.set(true);
  }

  closeModal() {
    this.resetForm();
    this.showModal.set(false);
  }

  // ── Search ────────────────────────────────────────────────────────────
  onSearchChange(value: string) {
    this.p = 1; // reset to first page on search
    this.searchInput$.next(value);
  }

  // ── Autocomplete ──────────────────────────────────────────────────────
  filterPageGroupList(value: any) {
    if (value) {
      const filterValue = value.toLowerCase();
      this.filterPageGroup = this.PageGroupList.filter((o: any) =>
        o.PageGroupName.toLowerCase().includes(filterValue)
      );
    } else {
      this.filterPageGroup = [...this.PageGroupList];
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────
  savePage() {
    this.formPage.control.markAllAsTouched();
    this.isSubmitted = true;
    if (this.formPage.invalid) {
      this.toastr.error('Fill all the required fields!!');
      return;
    }
    this.Page.UpdatedBy = this.staffLogin.StaffLoginId;
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.Page)).toString()
    };
    this.dataLoading.set(true);
    this.service.savePage(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success(this.Page.PageId > 0 ? 'Page updated successfully' : 'Page added successfully');
          this.closeModal();
          this.reloadPageList();
        } else {
          this.toastr.error(r1.Message);
          this.dataLoading.set(false);
        }
      },
      error: () => {
        this.toastr.error('Error occurred while submitting data');
        this.dataLoading.set(false);
      }
    });
  }

  // ── Edit ──────────────────────────────────────────────────────────────
  editPage(item: any) {
    this.Page = { ...item };
    this.showModal.set(true);
  }

  // ── Delete (instant UI update — no refetch) ───────────────────────────
  deletePage(item: any) {
    if (!confirm('Are you sure you want to delete this record?')) return;
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(item)).toString()
    };
    this.dataLoading.set(true);
    this.service.deletePage(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success('Record deleted successfully');
          this.PageList.update(rows => rows.filter(x => x.PageId !== item.PageId));
          // this.reloadPageList();
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

  sort(key: any) { this.sortKey = key; this.reverse = !this.reverse; }
  onTableDataChange(p: any) { this.p = p; }
}
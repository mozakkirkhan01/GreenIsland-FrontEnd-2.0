import { Component, ViewChild, inject, signal } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgxPaginationModule } from 'ngx-pagination';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { Status } from '../../utils/enum';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { LoadDataService } from '../../utils/load-data.service';
import { FilterPipe } from '../../utils/filter-pipe';
// import { OrderByPipe } from '../../utils/orderby-pipe';
import { Progress } from '../../component/progress/progress';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-inclusion-exclusion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    NgxPaginationModule,
    FilterPipe,
    // OrderByPipe,
    Progress,
  ],
  templateUrl: './inclusion-exclusion.html',
  styleUrl: './inclusion-exclusion.css',
})
export class InclusionExclusion {

  // ── Signals ───────────────────────────────────────────────────────────
  dataLoading = signal(false);
  DestinationList = signal<any[]>([]);
  InclusionList = signal<any[]>([]);
  ExclusionList = signal<any[]>([]);

  action = signal<ActionModel>({
    CanCreate: false, CanEdit: false, CanDelete: false,
    MenuTitle: '', ParentMenuTitle: ''
  } as ActionModel);

  // ── Filter ────────────────────────────────────────────────────────────
  FilterDestinationId: any = -1;

  // ── Modal state ───────────────────────────────────────────────────────
  showModal = false;
  ModalDestinationId: any = 0;
  InclusionRows: any[] = [];
  ExclusionRows: any[] = [];

  // ── Table pagination ──────────────────────────────────────────────────
  SearchInclusion = '';
  SearchExclusion = '';
  pInclusion = 1;
  pExclusion = 1;
  itemPerPage = 10;

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
  ) {}

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.getDestinationList();
  }

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

  // ── Filter destination change ─────────────────────────────────────────
  onFilterDestinationChange() {
    this.loadBothLists();
  }

  loadBothLists() {
    this.loadInclusionList();
    this.loadExclusionList();
  }

  // ══════════════════════════════════════════════════════════════════════
  // LOAD LISTS
  // ══════════════════════════════════════════════════════════════════════

  loadInclusionList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: Number(this.FilterDestinationId) })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.getInclusionList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.InclusionList.set(r1.InclusionList);
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while fetching inclusions');
        this.dataLoading.set(false);
      }
    });
  }

  loadExclusionList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: Number(this.FilterDestinationId) })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.getExclusionList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.ExclusionList.set(r1.ExclusionList);
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while fetching exclusions');
        this.dataLoading.set(false);
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // MODAL
  // ══════════════════════════════════════════════════════════════════════

  openModal() {
    this.ModalDestinationId = this.FilterDestinationId > 0
      ? this.FilterDestinationId : 0;
    this.InclusionRows = [];
    this.ExclusionRows = [];
    this.showModal = true;

    // ── If destination already selected, load existing rows ──
    if (this.ModalDestinationId > 0) {
      this.loadModalData(this.ModalDestinationId);
    }
  }

  onModalDestinationChange() {
    this.InclusionRows = [];
    this.ExclusionRows = [];
    if (!this.ModalDestinationId || this.ModalDestinationId == 0) return;
    this.loadModalData(this.ModalDestinationId);
  }

  loadModalData(destinationId: number) {
    const incObj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: Number(destinationId) })
      ).toString()
    };
    const excObj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: Number(destinationId) })
      ).toString()
    };

    this.dataLoading.set(true);
    forkJoin({
      inclusions: this.service.getInclusionList(incObj),
      exclusions: this.service.getExclusionList(excObj),
    }).subscribe({
      next: (res: any) => {
        if (res.inclusions.Message == ConstantData.SuccessMessage) {
          this.InclusionRows = res.inclusions.InclusionList.map((item: any) => ({ ...item }));
        }
        if (res.exclusions.Message == ConstantData.SuccessMessage) {
          this.ExclusionRows = res.exclusions.ExclusionList.map((item: any) => ({ ...item }));
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error loading data');
        this.dataLoading.set(false);
      }
    });
  }

  closeModal() {
    this.showModal = false;
    this.InclusionRows = [];
    this.ExclusionRows = [];
    this.ModalDestinationId = 0;
  }

  // ── Inclusion row actions ─────────────────────────────────────────────
  addInclusionRow() {
    this.InclusionRows.push({
      InclusionId:      0,
      DestinationId:    Number(this.ModalDestinationId),
      InclusionDetails: '',
      Status:           1,
      CreatedBy:        this.staffLogin.StaffLoginId,
      UpdatedBy:        this.staffLogin.StaffLoginId,
    });
  }

  removeInclusionRow(index: number) {
    const row = this.InclusionRows[index];
    if (row.InclusionId > 0) {
      this.deleteInclusion(row, index);
    } else {
      this.InclusionRows.splice(index, 1);
    }
  }

  deleteInclusion(row: any, index: number) {
    if (!confirm('Delete this inclusion?')) return;
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ InclusionId: row.InclusionId })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.deleteInclusion(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success('Inclusion deleted');
          this.InclusionRows.splice(index, 1);
          this.loadInclusionList();
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error deleting inclusion');
        this.dataLoading.set(false);
      }
    });
  }

  // ── Exclusion row actions ─────────────────────────────────────────────
  addExclusionRow() {
    this.ExclusionRows.push({
      ExclusionId:      0,
      DestinationId:    Number(this.ModalDestinationId),
      ExclusionDetails: '',
      Status:           1,
      CreatedBy:        this.staffLogin.StaffLoginId,
      UpdatedBy:        this.staffLogin.StaffLoginId,
    });
  }

  removeExclusionRow(index: number) {
    const row = this.ExclusionRows[index];
    if (row.ExclusionId > 0) {
      this.deleteExclusion(row, index);
    } else {
      this.ExclusionRows.splice(index, 1);
    }
  }

  deleteExclusion(row: any, index: number) {
    if (!confirm('Delete this exclusion?')) return;
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ ExclusionId: row.ExclusionId })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.deleteExclusion(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success('Exclusion deleted');
          this.ExclusionRows.splice(index, 1);
          this.loadExclusionList();
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error deleting exclusion');
        this.dataLoading.set(false);
      }
    });
  }

  // ── Save both ─────────────────────────────────────────────────────────
  saveAll() {
    if (!this.ModalDestinationId || this.ModalDestinationId == 0) {
      this.toastr.error('Please select a destination');
      return;
    }

    const invalidInc = this.InclusionRows.find(
      r => !r.InclusionDetails || r.InclusionDetails.trim() === ''
    );
    if (invalidInc) {
      this.toastr.error('Please fill all inclusion details');
      return;
    }

    const invalidExc = this.ExclusionRows.find(
      r => !r.ExclusionDetails || r.ExclusionDetails.trim() === ''
    );
    if (invalidExc) {
      this.toastr.error('Please fill all exclusion details');
      return;
    }

    const incPayload = this.InclusionRows.map(row => ({
      InclusionId:      row.InclusionId,
      DestinationId:    Number(this.ModalDestinationId),
      InclusionDetails: row.InclusionDetails,
      Status:           row.Status,
      CreatedBy:        this.staffLogin.StaffLoginId,
      UpdatedBy:        this.staffLogin.StaffLoginId,
    }));  

    const excPayload = this.ExclusionRows.map(row => ({
      ExclusionId:      row.ExclusionId,
      DestinationId:    Number(this.ModalDestinationId),
      ExclusionDetails: row.ExclusionDetails,
      Status:           row.Status,
      CreatedBy:        this.staffLogin.StaffLoginId,
      UpdatedBy:        this.staffLogin.StaffLoginId,
    }));

    const incObj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(incPayload)).toString()
    };
    const excObj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(excPayload)).toString()
    };

    this.dataLoading.set(true);

    const saves: any[] = [];
    if (incPayload.length > 0) saves.push(this.service.saveInclusionList(incObj));
    if (excPayload.length > 0) saves.push(this.service.saveExclusionList(excObj));

    if (saves.length === 0) {
      this.toastr.warning('Nothing to save');
      this.dataLoading.set(false);
      return;
    }

    forkJoin(saves).subscribe({
      next: (results: any[]) => {
        const allSuccess = results.every(r => r.Message == ConstantData.SuccessMessage);
        if (allSuccess) {
          this.toastr.success('Saved successfully');
          this.closeModal();
          this.FilterDestinationId = this.ModalDestinationId || this.FilterDestinationId;
          this.loadBothLists();
        } else {
          results.forEach(r => {
            if (r.Message != ConstantData.SuccessMessage) this.toastr.error(r.Message);
          });
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error occurred while saving');
        this.dataLoading.set(false);
      }
    });
  }

  // ── Table delete shortcuts ────────────────────────────────────────────
  deleteInclusionFromTable(item: any) {
    if (!confirm('Delete this inclusion?')) return;
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ InclusionId: item.InclusionId })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.deleteInclusion(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success('Deleted successfully');
          this.InclusionList.update(rows =>
            rows.filter(x => x.InclusionId !== item.InclusionId)
          );
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error occurred');
        this.dataLoading.set(false);
      }
    });
  }

  deleteExclusionFromTable(item: any) {
    if (!confirm('Delete this exclusion?')) return;
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ ExclusionId: item.ExclusionId })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.deleteExclusion(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success('Deleted successfully');
          this.ExclusionList.update(rows =>
            rows.filter(x => x.ExclusionId !== item.ExclusionId)
          );
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error occurred');
        this.dataLoading.set(false);
      }
    });
  }
}
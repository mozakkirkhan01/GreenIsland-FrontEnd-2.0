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
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { Status } from '../../utils/enum';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { LoadDataService } from '../../utils/load-data.service';
import { Progress } from '../../component/progress/progress';

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
    Progress,
  ],
  templateUrl: './inclusion-exclusion.html',
  styleUrl: './inclusion-exclusion.css',
})
export class InclusionExclusion {

  // ── Signals ───────────────────────────────────────────────────────────
  dataLoading = signal(false);
  DestinationList = signal<any[]>([]);

  action = signal<ActionModel>({
    CanCreate: false, CanEdit: false, CanDelete: false,
    MenuTitle: '', ParentMenuTitle: ''
  } as ActionModel);

  // ── Selected Destination ──────────────────────────────────────────────
  SelectedDestinationId: any = 0;

  // ── Inclusion rows ────────────────────────────────────────────────────
  InclusionRows: any[] = [];

  // ── Exclusion rows ────────────────────────────────────────────────────
  ExclusionRows: any[] = [];

  loadData = inject(LoadDataService);
  StatusList = this.loadData.GetEnumList(Status);
  AllStatusList = Status;
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

  // ── On destination change — load both lists ───────────────────────────
  onDestinationChange() {
    this.InclusionRows = [];
    this.ExclusionRows = [];

    if (!this.SelectedDestinationId || this.SelectedDestinationId == 0) return;

    this.loadInclusionList();
    this.loadExclusionList();
  }

  // ══════════════════════════════════════════════════════════════════════
  // INCLUSION
  // ══════════════════════════════════════════════════════════════════════

  loadInclusionList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: Number(this.SelectedDestinationId) })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.getInclusionList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          // ── Map to editable rows ──
          this.InclusionRows = r1.InclusionList.map((item: any) => ({
            ...item,
            isEditing: false,
          }));
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

  addInclusionRow() {
    this.InclusionRows.push({
      InclusionId:      0,
      DestinationId:    Number(this.SelectedDestinationId),
      InclusionDetails: '',
      Status:           1,
      isEditing:        true,
      CreatedBy:        this.staffLogin.StaffLoginId,
      UpdatedBy:        this.staffLogin.StaffLoginId,
    });
  }

  removeInclusionRow(index: number) {
    const row = this.InclusionRows[index];
    if (row.InclusionId > 0) {
      // ── Already saved — delete from DB ──
      this.deleteInclusion(row, index);
    } else {
      // ── Not saved yet — just remove from array ──
      this.InclusionRows.splice(index, 1);
    }
  }

  deleteInclusion(row: any, index: number) {
    if (!confirm('Are you sure you want to delete this inclusion?')) return;
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ InclusionId: row.InclusionId })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.deleteInclusion(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success('Inclusion deleted successfully');
          this.InclusionRows.splice(index, 1);
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error occurred while deleting');
        this.dataLoading.set(false);
      }
    });
  }

  saveInclusionList() {
    const invalid = this.InclusionRows.find(r => !r.InclusionDetails || r.InclusionDetails.trim() === '');
    if (invalid) {
      this.toastr.error('Please fill all inclusion details');
      return;
    }

    const payload = this.InclusionRows.map(row => ({
      InclusionId:      row.InclusionId,
      DestinationId:    Number(this.SelectedDestinationId),
      InclusionDetails: row.InclusionDetails,
      Status:           row.Status,
      CreatedBy:        this.staffLogin.StaffLoginId,
      UpdatedBy:        this.staffLogin.StaffLoginId,
    }));

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.dataLoading.set(true);
    this.service.saveInclusionList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success('Inclusions saved successfully');
          this.loadInclusionList();
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error occurred while saving inclusions');
        this.dataLoading.set(false);
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // EXCLUSION
  // ══════════════════════════════════════════════════════════════════════

  loadExclusionList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ DestinationId: Number(this.SelectedDestinationId) })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.getExclusionList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.ExclusionRows = r1.ExclusionList.map((item: any) => ({
            ...item,
            isEditing: false,
          }));
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

  addExclusionRow() {
    this.ExclusionRows.push({
      ExclusionId:      0,
      DestinationId:    Number(this.SelectedDestinationId),
      ExclusionDetails: '',
      Status:           1,
      isEditing:        true,
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
    if (!confirm('Are you sure you want to delete this exclusion?')) return;
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ ExclusionId: row.ExclusionId })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.deleteExclusion(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success('Exclusion deleted successfully');
          this.ExclusionRows.splice(index, 1);
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error occurred while deleting');
        this.dataLoading.set(false);
      }
    });
  }

  saveExclusionList() {
    const invalid = this.ExclusionRows.find(r => !r.ExclusionDetails || r.ExclusionDetails.trim() === '');
    if (invalid) {
      this.toastr.error('Please fill all exclusion details');
      return;
    }

    const payload = this.ExclusionRows.map(row => ({
      ExclusionId:      row.ExclusionId,
      DestinationId:    Number(this.SelectedDestinationId),
      ExclusionDetails: row.ExclusionDetails,
      Status:           row.Status,
      CreatedBy:        this.staffLogin.StaffLoginId,
      UpdatedBy:        this.staffLogin.StaffLoginId,
    }));

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.dataLoading.set(true);
    this.service.saveExclusionList(obj).subscribe({
      next: (r1: any) => {
        if (r1.Message == ConstantData.SuccessMessage) {
          this.toastr.success('Exclusions saved successfully');
          this.loadExclusionList();
        } else {
          this.toastr.error(r1.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error occurred while saving exclusions');
        this.dataLoading.set(false);
      }
    });
  }
}
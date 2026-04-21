import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { Progress } from '../../component/progress/progress';

export interface AgencyModel {
  AgencyId:    number;
  AgencyName:  string;
  CityName:    string;
  StateName:   string;
  GstinNumber: string;
  Status:      number;
  CreatedBy:   number;
  UpdatedBy:   number;
}

@Component({
  selector: 'app-agency',
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
    Progress,
  ],
  templateUrl: './agency.html',
  styleUrl: './agency.css',
})
export class Agency implements OnInit {

  // ── Signals ───────────────────────────────────────────
  dataLoading   = signal(false);
  AgencyList    = signal<any[]>([]);
  action        = signal<ActionModel>({
    CanCreate: false, CanEdit: false, CanDelete: false,
    MenuTitle: '', ParentMenuTitle: ''
  } as ActionModel);

  // ── Pagination ────────────────────────────────────────
  Search     = '';
  p          = 1;
  itemPerPage = 10;

  // ── Modal ─────────────────────────────────────────────
  showModal  = false;
  isSubmitted = false;

  AgencyModel: AgencyModel = this.getEmptyModel();

  loadData   = inject(LoadDataService);
  StatusList = this.loadData.GetEnumList(Status);
  AllStatusList = Status;

  staffLogin: StaffLoginModel = {} as StaffLoginModel;

  constructor(
    private service:      AppService,
    private toastr:       ToastrService,
    private localService: LocalService,
    private router:       Router,
  ) {}

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validateMenu();
    this.loadAgencyList();
  }

  // ── Helpers ───────────────────────────────────────────
  getEmptyModel(): AgencyModel {
    return {
      AgencyId:    0,
      AgencyName:  '',
      CityName:    '',
      StateName:   '',
      GstinNumber: '',
      Status:      1,
      CreatedBy:   0,
      UpdatedBy:   0,
    };
  }

  // ── Menu validation ───────────────────────────────────
  validateMenu(): void {
    const cleanUrl = this.router.url.split('?')[0];
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ Url: cleanUrl, StaffLoginId: this.staffLogin.StaffLoginId })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.validiateMenu(obj).subscribe({
      next: (response: any) => {
        this.action.set({
          ...this.loadData.validiateMenu(response, this.toastr, this.router)
        });
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while validating menu');
        this.dataLoading.set(false);
      }
    });
  }

  // ── Load List ─────────────────────────────────────────
  loadAgencyList(): void {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ AgencyId: 0, Status: 0 })
      ).toString()
    };
    this.dataLoading.set(true);
    this.service.getAdminAgencyList(obj).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          const list = (r.AgencyList ?? []).map((item: any) => ({
            ...item,
            Status: Number(item.Status) || 2,
          }));
          this.AgencyList.set(list);
        } else {
          this.toastr.error(r.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while fetching agencies');
        this.dataLoading.set(false);
      }
    });
  }

  // ── Modal ─────────────────────────────────────────────
  openModal(item?: any): void {
    this.isSubmitted = false;
    if (item) {
      this.AgencyModel = {
        AgencyId:    item.AgencyId,
        AgencyName:  item.AgencyName,
        CityName:    item.CityName   ?? '',
        StateName:   item.StateName  ?? '',
        GstinNumber: item.GstinNumber ?? '',
        Status:      Number(item.Status),
        CreatedBy:   this.staffLogin.StaffLoginId,
        UpdatedBy:   this.staffLogin.StaffLoginId,
      };
    } else {
      this.AgencyModel = this.getEmptyModel();
      this.AgencyModel.CreatedBy = this.staffLogin.StaffLoginId;
      this.AgencyModel.UpdatedBy = this.staffLogin.StaffLoginId;
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal    = false;
    this.isSubmitted  = false;
    this.AgencyModel  = this.getEmptyModel();
  }

  // ── Save ──────────────────────────────────────────────
  saveAgency(): void {
    this.isSubmitted = true;

    if (!this.AgencyModel.AgencyName?.trim()) {
      this.toastr.error('Agency Name is required');
      return;
    }

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify(this.AgencyModel)
      ).toString()
    };

    this.dataLoading.set(true);
    this.service.saveAgency(obj).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          this.toastr.success(
            this.AgencyModel.AgencyId > 0
              ? 'Agency updated successfully'
              : 'Agency added successfully'
          );
          this.closeModal();
          this.loadAgencyList();
        } else {
          this.toastr.error(r.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while saving agency');
        this.dataLoading.set(false);
      }
    });
  }

  // ── Delete ────────────────────────────────────────────
  deleteAgency(item: any): void {
    if (!confirm('Are you sure you want to delete this agency?')) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ AgencyId: item.AgencyId })
      ).toString()
    };

    this.dataLoading.set(true);
    this.service.deleteAgency(obj).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          this.toastr.success('Agency deleted successfully');
          this.AgencyList.update(list =>
            list.filter(a => a.AgencyId !== item.AgencyId)
          );
        } else {
          this.toastr.error(r.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while deleting agency');
        this.dataLoading.set(false);
      }
    });
  }

  onTableDataChange(p: any): void { this.p = p; }
}

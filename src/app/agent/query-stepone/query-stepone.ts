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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';

import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { LoadDataService } from '../../utils/load-data.service';
import { ConstantData } from '../../utils/constant-data';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { Progress } from '../../component/progress/progress';

export interface QueryStepOneModel {
  QueryStepOneId: number;
  AgencyId: number;
  AgencyName: string;
  AgencyCity: string;
  GuestId: number;
  Salutation: string;
  ContactName: string;
  CountryCode: string;
  Phone: string;
  Email: string;
  QuerySource: string;
  ReferenceId: string;
  AssignedToLoginId: number;
  DestinationId: number;
  StartDate: Date | null;
  NoOfNights: number;
  NoOfAdults: number;
  ChildrenAges: number[];   // managed as array, sent as JSON
  OriginCity: string;
  Nationality: string;
  Comments: string;
  TagIds: number[];
  TripStatus: number;
}

@Component({
  selector: 'app-query-stepone',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatAutocompleteModule,
    MatDatepickerModule, MatNativeDateModule, MatChipsModule,
    Progress,
  ],
  templateUrl: './query-stepone.html',
  styleUrl: './query-stepone.css',
})
export class QueryStepone implements OnInit {

  dataLoading = signal(false);
  action = signal<ActionModel>({
    CanCreate: false, CanEdit: false, CanDelete: false,
    MenuTitle: 'Trips',        // ← set actual default
    ParentMenuTitle: 'Trips'   // ← set actual default
  } as ActionModel);

  staffLogin: StaffLoginModel = {} as StaffLoginModel;
  isSubmitted = false;

  // ── Dropdowns ─────────────────────────────────────────
  AgencyList = signal<any[]>([]);
  GuestList = signal<any[]>([]);
  DestinationList = signal<any[]>([]);
  StaffList = signal<any[]>([]);
  TagList = signal<any[]>([]);

  // Autocomplete filtered lists
  filteredAgencies: any[] = [];
  filteredGuests: any[] = [];

  // Child age options
  ageOptions = ['<1y', '1y', '2y', '3y', '4y', '5y', '6y', '7y', '8y', '9y', '10y', '11y', '12y'];
  childAgeSelections: string[] = [];  // each entry = one child's age

  // Country codes
  countryCodes = [
    { code: '91-IN', label: '🇮🇳 +91' },
    { code: '1-US', label: '🇺🇸 +1' },
    { code: '44-GB', label: '🇬🇧 +44' },
    { code: '971-AE', label: '🇦🇪 +971' },
    { code: '65-SG', label: '🇸🇬 +65' },
  ];

  // ── Model ─────────────────────────────────────────────
  Model: QueryStepOneModel = {
    QueryStepOneId: 0,
    AgencyId: 0,
    AgencyName: '',
    AgencyCity: '',
    GuestId: 0,
    Salutation: 'Mr.',
    ContactName: '',
    CountryCode: '91-IN',
    Phone: '',
    Email: '',
    QuerySource: '',
    ReferenceId: '',
    AssignedToLoginId: 0,
    DestinationId: 0,
    StartDate: null,
    NoOfNights: 1,
    NoOfAdults: 1,
    ChildrenAges: [],
    OriginCity: '',
    Nationality: '',
    Comments: '',
    TagIds: [],
    TripStatus: 1,
  };

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private localService: LocalService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.Model.AssignedToLoginId = Number(this.staffLogin?.StaffLoginId) || 0;
    this.validateMenu();
    this.loadDropdowns();
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
      next: (res: any) => {
        this.action.set({ ...res });
        this.dataLoading.set(false);
      },
      error: () => { this.toastr.error('Menu validation failed'); this.dataLoading.set(false); }
    });
  }

  // ── Load all dropdowns ────────────────────────────────
  loadDropdowns(): void {
    this.getAgencyList();
    this.getDestinationList();
    this.getStaffList();
    this.getTagList();
  }

  getAgencyList(): void {
    const obj: RequestModel = { request: this.localService.encrypt(JSON.stringify({})).toString() };
    this.service.getAgencyList(obj).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          this.AgencyList.set(r.AgencyList);
          this.filteredAgencies = r.AgencyList;
        }
      }
    });
  }

  getDestinationList(): void {
    const obj: RequestModel = { request: this.localService.encrypt(JSON.stringify({})).toString() };
    this.service.getDestinationList(obj).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage)
          this.DestinationList.set(r.DestinationList);
      }
    });
  }

  getStaffList(): void {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };

    this.dataLoading.set(true);

    this.service.getStaffList(obj).subscribe({
      next: (response: any) => {
        console.log('FULL RESPONSE:', response);

        if (response.Message === ConstantData.SuccessMessage) {

          // ✅ FIXED PROPERTY NAME
          // Normalize id type so mat-select can match selected value consistently.
          const staffList = (response.StaffList ?? []).map((staff: any) => ({
            ...staff,
            StaffLoginId: Number(staff.StaffLoginId),
          }));
          this.StaffList.set(staffList);

          console.log('StaffList:', this.StaffList());

        } else {
          this.toastr.error(response.Message);
        }

        this.dataLoading.set(false);
      },

      error: (err) => {
        console.error(err);
        this.toastr.error("Error while fetching records");
        this.dataLoading.set(false);
      }
    });
  }

  getTagList(): void {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.service.getTagList(obj).subscribe({
      next: (r: any) => {
        console.log('TagList response:', r);   // ← add this to debug
        if (r.Message === ConstantData.SuccessMessage) {
          this.TagList.set(r.TagList);
        }
      },
      error: (e) => console.error('TagList error', e)
    });
  }

  // ── Agency autocomplete ───────────────────────────────
  onAgencySelected(agency: any): void {
    // No need to set AgencyName here — mat-option value already sets it
    this.Model.AgencyId = agency.AgencyId;
    this.Model.AgencyCity = agency.CityName ?? '';

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ AgencyId: agency.AgencyId })
      ).toString()
    };
    this.service.getGuestByAgency(obj).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          this.GuestList.set(r.GuestList);
          this.filteredGuests = r.GuestList;
        }
      }
    });
  }

  onAgencySearch(value: string): void {
    this.Model.AgencyId = 0;
    this.Model.AgencyCity = '';
    const q = value?.toLowerCase() ?? '';
    this.filteredAgencies = this.AgencyList().filter(a =>
      a.AgencyName.toLowerCase().includes(q)
    );
  }
  // ── Guest autocomplete ────────────────────────────────
  onGuestSearch(value: string): void {
    const q = value?.toLowerCase() ?? '';
    this.filteredGuests = this.GuestList().filter(g =>
      g.ContactName.toLowerCase().includes(q) || g.Phone.includes(q)
    );
  }

  onGuestSelected(guest: any): void {
    this.Model.GuestId = guest.GuestId;
    this.Model.ContactName = guest.ContactName;
    this.Model.Salutation = guest.Salutation ?? 'Mr.';
    this.Model.CountryCode = guest.CountryCode ?? '91-IN';
    this.Model.Phone = guest.Phone;
    this.Model.Email = guest.Email ?? '';
  }

  // ── Children ──────────────────────────────────────────
  addChild(): void {
    this.childAgeSelections.push('2y');
  }

  removeChild(index: number): void {
    this.childAgeSelections.splice(index, 1);
  }

  get nightsLabel(): string {
    const n = this.Model.NoOfNights || 0;
    return `${n} Night${n !== 1 ? 's' : ''}, ${n + 1} Day${n !== 1 ? 's' : ''}`;
  }

  // ── Tags ──────────────────────────────────────────────
  isTagSelected(tagId: number): boolean {
    return this.Model.TagIds.includes(tagId);
  }

  toggleTag(tagId: number): void {
    const idx = this.Model.TagIds.indexOf(tagId);
    if (idx === -1) this.Model.TagIds.push(tagId);
    else this.Model.TagIds.splice(idx, 1);
  }
  getDestinationName(id: number): string {
    return this.DestinationList().find(d => d.DestinationId === id)?.DestinationName ?? '';
  }
  displayAgency(agency: any): string {
    return agency?.AgencyName ?? '';
  }

  displayGuest(guest: any): string {
    return guest?.ContactName ?? '';
  }

  compareStaffId = (a: any, b: any): boolean => {
    return Number(a) === Number(b);
  };
  // ── Save ──────────────────────────────────────────────
  saveDetails(): void {
    this.isSubmitted = true;

    // ← change this: check AgencyName not AgencyId
    if (!this.Model.AgencyName?.trim()) {
      this.toastr.error('Please enter a Query Source (Agency)');
      return;
    }

    if (!this.Model.ContactName?.trim()) {
      this.toastr.error('Contact / Enquiry Person is required');
      return;
    }

    if (!this.Model.Phone?.trim()) {
      this.toastr.error('Phone number is required');
      return;
    }

    if (!this.Model.DestinationId || this.Model.DestinationId === 0) {
      this.toastr.error('Please select a Destination');
      return;
    }

    if (!this.Model.StartDate) {
      this.toastr.error('Start Date is required');
      return;
    }

    // Convert children ages array → JSON string
    const childrenAgesJson = JSON.stringify(
      this.childAgeSelections.map(a => a.replace('y', '').replace('<1', '0'))
    );

    const payload = {
      QueryStepOneId: this.Model.QueryStepOneId,
      AgencyId: this.Model.AgencyId,
      AgencyName: this.Model.AgencyName,
      AgencyCity: this.Model.AgencyCity,
      GuestId: this.Model.GuestId,
      Salutation: this.Model.Salutation,
      ContactName: this.Model.ContactName,
      CountryCode: this.Model.CountryCode,
      Phone: this.Model.Phone,
      Email: this.Model.Email,
      QuerySource: this.Model.QuerySource,
      ReferenceId: this.Model.ReferenceId,
      AssignedToLoginId: Number(this.Model.AssignedToLoginId) || 0,
      DestinationId: this.Model.DestinationId,
      StartDate: this.Model.StartDate,
      NoOfNights: this.Model.NoOfNights,
      NoOfAdults: this.Model.NoOfAdults,
      ChildrenAges: childrenAgesJson,
      OriginCity: this.Model.OriginCity,
      Nationality: this.Model.Nationality,
      Comments: this.Model.Comments,
      TagIds: this.Model.TagIds.join(','),
      TripStatus: 1,
      CreatedBy: this.staffLogin.StaffLoginId,
      UpdatedBy: this.staffLogin.StaffLoginId,
    };

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.dataLoading.set(true);
    this.service.saveQueryStepOne(obj).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          this.toastr.success('Query saved successfully');
          this.router.navigate(['/agent/trips']);
        } else {
          this.toastr.error(r.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while saving query');
        this.dataLoading.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/trips']);
  }
}

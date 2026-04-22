import {
  Component, OnInit, signal, inject, DestroyRef, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Subject, BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
import { ConstantData } from '../../utils/constant-data';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { Progress } from '../../component/progress/progress';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Agency {
  AgencyId: number;
  AgencyName: string;
  CityName: string;
}

export interface Guest {
  GuestId: number;
  ContactName: string;
  Phone: string;
  Salutation?: string;
  CountryCode?: string;
  Email?: string;
}

export interface Staff {
  StaffLoginId: number;
  StaffName: string;
}

export interface Destination {
  DestinationId: number;
  DestinationName: string;
}

export interface Tag {
  TagId: number;
  TagName: string;
}

export interface CountryCode {
  code: string;
  label: string;
}

interface AgencyListResponse  { Message: string; AgencyList: Agency[]; }
interface GuestListResponse   { Message: string; GuestList: Guest[]; }
interface StaffListResponse   { Message: string; StaffList: Staff[]; }
interface DestinationResponse { Message: string; DestinationList: Destination[]; }
interface TagListResponse     { Message: string; TagList: Tag[]; }
interface SaveResponse        { Message: string; QueryStepOneId?: number; }

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-query-stepone',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatAutocompleteModule,
    MatDatepickerModule, MatNativeDateModule, MatChipsModule,
    Progress,
  ],
  templateUrl: './query-stepone.html',
  styleUrl: './query-stepone.css',
})
export class QueryStepone implements OnInit {

  // ── DI ──────────────────────────────────────────────────────────────────────
  private readonly fb          = inject(FormBuilder);
  private readonly service     = inject(AppService);
  private readonly toastr      = inject(ToastrService);
  private readonly localService = inject(LocalService);
  private readonly router      = inject(Router);
  private readonly destroyRef  = inject(DestroyRef);

  // ── State signals ────────────────────────────────────────────────────────────
  dataLoading = signal(false);
  dropdownsLoading = signal(false);
  action = signal<ActionModel>({
    CanCreate: false, CanEdit: false, CanDelete: false,
    MenuTitle: 'Trips', ParentMenuTitle: 'Trips',
  } as ActionModel);

  staffLogin: StaffLoginModel = {} as StaffLoginModel;

  // ── Dropdown data ────────────────────────────────────────────────────────────
  agencyList    = signal<Agency[]>([]);
  guestList     = signal<Guest[]>([]);
  destinationList = signal<Destination[]>([]);
  staffList     = signal<Staff[]>([]);
  tagList       = signal<Tag[]>([]);
  selectedTagIds = signal<number[]>([]);

  // Autocomplete
  visibleAgencies: Agency[] = [];
  filteredGuests: Guest[] = [];

  private readonly agencySearch$ = new BehaviorSubject<string>('');

  // ── Static data ──────────────────────────────────────────────────────────────
  readonly ageOptions: string[] = [
    '<1y', '1y', '2y', '3y', '4y', '5y', '6y',
    '7y', '8y', '9y', '10y', '11y', '12y',
  ];

  readonly countryCodes: CountryCode[] = [
    { code: '91-IN',  label: '🇮🇳 +91'  },
    { code: '1-US',   label: '🇺🇸 +1'   },
    { code: '44-GB',  label: '🇬🇧 +44'  },
    { code: '971-AE', label: '🇦🇪 +971' },
    { code: '65-SG',  label: '🇸🇬 +65'  },
  ];

  // ── Reactive form ────────────────────────────────────────────────────────────
  form!: FormGroup;

  get childrenFormArray(): FormArray {
    return this.form.get('childAgeSelections') as FormArray;
  }

  get nightsLabel(): string {
    const n = Number(this.form.get('NoOfNights')?.value) || 0;
    return `${n} Night${n !== 1 ? 's' : ''}, ${n + 1} Day${n !== 1 ? 's' : ''}`;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.buildForm();
    this.setupAgencySearch();
    this.validateMenu();
    this.loadAllDropdowns();
  }

  // ─── Form setup ──────────────────────────────────────────────────────────────
  private buildForm(): void {
    this.form = this.fb.group({
      QueryStepOneId:    [0],
      AgencyId:          [0],
      AgencyName:        ['', Validators.required],
      AgencyCity:        [''],
      GuestId:           [0],
      Salutation:        ['Mr.'],
      ContactName:       ['', Validators.required],
      CountryCode:       ['91-IN'],
      Phone:             ['', Validators.required],
      Email:             ['', Validators.email],
      QuerySource:       [''],
      ReferenceId:       [''],
      AssignedToLoginId: [Number(this.staffLogin?.StaffLoginId) || 0],
      DestinationId:     [0, [Validators.required, Validators.min(1)]],
      StartDate:         [null, Validators.required],
      NoOfNights:        [1,  [Validators.required, Validators.min(1)]],
      NoOfAdults:        [1,  [Validators.required, Validators.min(1)]],
      childAgeSelections: this.fb.array([]),
      OriginCity:        [''],
      Nationality:       [''],
      Comments:          [''],
      TripStatus:        [1],
    });
  }

  // ── Agency search with debounce ───────────────────────────────────────────────
  private setupAgencySearch(): void {
    this.agencySearch$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(query => this.filterAgencies(query));
  }

  private filterAgencies(query: string): void {
    const q = query?.toLowerCase().trim() ?? '';
    const filtered = this.agencyList().filter(a =>
      a.AgencyName?.toLowerCase().includes(q)
    );
    this.visibleAgencies = filtered.slice(0, 6);
  }

  // ── Menu validation ───────────────────────────────────────────────────────────
  private validateMenu(): void {
    const cleanUrl = this.router.url.split('?')[0];
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ Url: cleanUrl, StaffLoginId: this.staffLogin.StaffLoginId })
      ).toString(),
    };
    this.dataLoading.set(true);
    this.service.validiateMenu(obj).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (res: any) => {
        this.action.set({ ...(res as ActionModel) });
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Menu validation failed');
        this.dataLoading.set(false);
      },
    });
  }

  // ── Load all dropdowns at once ────────────────────────────────────────────────
  private loadAllDropdowns(): void {
    const enc = (data: object) => ({
      request: this.localService.encrypt(JSON.stringify(data)).toString(),
    } as RequestModel);

    this.dropdownsLoading.set(true);

    forkJoin({
      agencies:     this.service.getAdminAgencyList(enc({ AgencyId: 0, Status: 0 })),
      destinations: this.service.getDestinationList(enc({})),
      staff:        this.service.getStaffList(enc({})),
      tags:         this.service.getTagList(enc({})),
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: ({ agencies, destinations, staff, tags }) => {
        const agencyRes      = agencies      as AgencyListResponse;
        const destinationRes = destinations  as DestinationResponse;
        const staffRes       = staff         as StaffListResponse;
        const tagRes         = tags          as TagListResponse;

        if (agencyRes.Message === ConstantData.SuccessMessage) {
          this.agencyList.set(agencyRes.AgencyList ?? []);
          this.filterAgencies('');
        }
        if (destinationRes.Message === ConstantData.SuccessMessage) {
          this.destinationList.set(destinationRes.DestinationList ?? []);
        }
        if (staffRes.Message === ConstantData.SuccessMessage) {
          const normalised = (staffRes.StaffList ?? []).map(s => ({
            ...s,
            StaffLoginId: Number(s.StaffLoginId),
          }));
          this.staffList.set(normalised);
        }
        if (tagRes.Message === ConstantData.SuccessMessage) {
          this.tagList.set(tagRes.TagList ?? []);
        }
      },
      error: () => {
        this.toastr.error('Failed to load form data. Please refresh.');
        this.dropdownsLoading.set(false);
      },
      complete: () => this.dropdownsLoading.set(false),
    });
  }

  // ── Agency autocomplete ───────────────────────────────────────────────────────
  onAgencyInputChange(value: string): void {
    this.form.patchValue({ AgencyId: 0, AgencyCity: '' });
    this.agencySearch$.next(value);
  }

  onAgencySelected(agency: Agency): void {
    this.form.patchValue({
      AgencyId:   agency.AgencyId,
      AgencyName: agency.AgencyName,
      AgencyCity: agency.CityName ?? '',
    });

    const enc = (data: object): RequestModel => ({
      request: this.localService.encrypt(JSON.stringify(data)).toString(),
    });

    this.service.getGuestByAgency(enc({ AgencyId: agency.AgencyId })).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (r: any) => {
        const res = r as GuestListResponse;
        if (res.Message === ConstantData.SuccessMessage) {
          this.guestList.set(res.GuestList ?? []);
          this.filteredGuests = res.GuestList ?? [];
        }
      },
      error: () => this.toastr.error('Failed to load guests for this agency'),
    });
  }

  clearAgency(): void {
    this.form.patchValue({ AgencyName: '', AgencyId: 0, AgencyCity: '' });
    this.guestList.set([]);
    this.filteredGuests = [];
    this.agencySearch$.next('');
  }

  displayAgencyFn = (value: string): string => value ?? '';

  // ── Guest autocomplete ────────────────────────────────────────────────────────
  onGuestInputChange(value: string): void {
    const q = value?.toLowerCase() ?? '';
    this.filteredGuests = this.guestList().filter(g =>
      g.ContactName.toLowerCase().includes(q) || g.Phone.includes(q)
    );
  }

  onGuestSelected(guest: Guest): void {
    this.form.patchValue({
      GuestId:     guest.GuestId,
      ContactName: guest.ContactName,
      Salutation:  guest.Salutation  ?? 'Mr.',
      CountryCode: guest.CountryCode ?? '91-IN',
      Phone:       guest.Phone,
      Email:       guest.Email ?? '',
    });
  }

  // ── Children FormArray ────────────────────────────────────────────────────────
  addChild(): void {
    this.childrenFormArray.push(this.fb.control('2y'));
  }

  removeChild(index: number): void {
    this.childrenFormArray.removeAt(index);
  }

  removeLastChild(): void {
    if (this.childrenFormArray.length > 0) {
      this.childrenFormArray.removeAt(this.childrenFormArray.length - 1);
    }
  }

  // ── Tags ──────────────────────────────────────────────────────────────────────
  isTagSelected(tagId: number): boolean {
    return this.selectedTagIds().includes(tagId);
  }

  toggleTag(tagId: number): void {
    const current = this.selectedTagIds();
    const idx = current.indexOf(tagId);
    this.selectedTagIds.set(
      idx === -1 ? [...current, tagId] : current.filter(id => id !== tagId)
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  getDestinationName(id: number): string {
    return this.destinationList().find(d => d.DestinationId === id)?.DestinationName ?? '';
  }

  compareById = (a: number, b: number): boolean => Number(a) === Number(b);

  // ── Save ──────────────────────────────────────────────────────────────────────
  saveDetails(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.toastr.error('Please fill in all required fields');
      return;
    }

    const v = this.form.getRawValue();

    const childrenAgesJson = JSON.stringify(
      (v.childAgeSelections as string[]).map(a => a.replace('y', '').replace('<1', '0'))
    );

    const payload = {
      QueryStepOneId:    v.QueryStepOneId,
      AgencyId:          v.AgencyId,
      AgencyName:        v.AgencyName,
      AgencyCity:        v.AgencyCity,
      GuestId:           v.GuestId,
      Salutation:        v.Salutation,
      ContactName:       v.ContactName,
      CountryCode:       v.CountryCode,
      Phone:             v.Phone,
      Email:             v.Email,
      QuerySource:       v.QuerySource,
      ReferenceId:       v.ReferenceId,
      AssignedToLoginId: Number(v.AssignedToLoginId) || 0,
      DestinationId:     v.DestinationId,
      StartDate:         v.StartDate,
      NoOfNights:        v.NoOfNights,
      NoOfAdults:        v.NoOfAdults,
      ChildrenAges:      childrenAgesJson,
      OriginCity:        v.OriginCity,
      Nationality:       v.Nationality,
      Comments:          v.Comments,
      TagIds:            this.selectedTagIds().join(','),
      TripStatus:        1,
      CreatedBy:         this.staffLogin.StaffLoginId,
      UpdatedBy:         this.staffLogin.StaffLoginId,
    };

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString(),
    };

    this.dataLoading.set(true);
    this.service.saveQueryStepOne(obj).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (r: any) => {
        const res = r as SaveResponse;
        if (res.Message === ConstantData.SuccessMessage) {
          this.toastr.success('Query saved successfully');
          this.router.navigate(['/agent/trips']);
        } else {
          this.toastr.error(res.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error while saving query. Please try again.');
        this.dataLoading.set(false);
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/agent/trips']);
  }

  get showAddNewOption(): boolean {
    const value = this.form.get('AgencyName')?.value?.toLowerCase()?.trim();
    if(!value) return false;

    return !this.agencyList().some(a =>
      a.AgencyName.toLowerCase() === value
    );
  }
  showModal = false;
AgencyModel: any = {
  AgencyId: 0,
  AgencyName: '',
  CityName: '',
  GstinNumber: '',
  Status: 1
};

openAddAgencyModal(): void {
  const name = this.form.get('AgencyName')?.value;

  this.AgencyModel = {
    AgencyId: 0,
    AgencyName: name,   // ✅ prefill
    CityName: '',
    GstinNumber: '',
    Status: 1
  };

  this.showModal = true;
}
}
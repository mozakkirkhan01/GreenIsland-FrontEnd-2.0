import {
  Component, OnInit, signal, inject, DestroyRef,
  ChangeDetectionStrategy, ChangeDetectorRef, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocomplete, MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

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

/**
 * Sentinel object placed as [value] on the "Add new" mat-option.
 * Using an object (not a string) ensures it never accidentally matches
 * a real agency name.
 */
const ADD_NEW_SENTINEL = { __addNew: true } as const;

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
    CommonModule, FormsModule, ReactiveFormsModule, RouterModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatAutocompleteModule,
    MatDatepickerModule, MatNativeDateModule, MatChipsModule, MatTooltipModule,
    Progress,
  ],
  templateUrl: './query-stepone.html',
  styleUrl: './query-stepone.css',
})
export class QueryStepone implements OnInit {

  // ── DI ───────────────────────────────────────────────────────────────────────
  private readonly fb           = inject(FormBuilder);
  private readonly service      = inject(AppService);
  private readonly toastr       = inject(ToastrService);
  private readonly localService = inject(LocalService);
  private readonly router       = inject(Router);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);
  private readonly route        = inject(ActivatedRoute);

  // ── State signals ─────────────────────────────────────────────────────────────
  dataLoading      = signal(false);
  dropdownsLoading = signal(false);
  showModal        = signal(false);  // ✅ signal so OnPush detects it

  action = signal<ActionModel>({
    CanCreate: false, CanEdit: false, CanDelete: false,
    MenuTitle: 'Trips', ParentMenuTitle: 'Trips',
  } as ActionModel);

  staffLogin: StaffLoginModel = {} as StaffLoginModel;

  // ── Dropdown signals ──────────────────────────────────────────────────────────
  agencyList      = signal<Agency[]>([]);
  guestList       = signal<Guest[]>([]);
  destinationList = signal<Destination[]>([]);
  staffList       = signal<Staff[]>([]);
  tagList         = signal<Tag[]>([]);
  selectedTagIds  = signal<number[]>([]);

  // Autocomplete visible lists (plain arrays, updated by filter methods)
  visibleAgencies: Agency[] = [];
  filteredGuests:  Guest[]  = [];

  private readonly agencySearch$ = new BehaviorSubject<string>('');

  // ── Sentinel exposed to template ──────────────────────────────────────────────
  readonly ADD_NEW = ADD_NEW_SENTINEL;

  // ── Static data ───────────────────────────────────────────────────────────────
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

  readonly StatusList = ConstantData.StatusList;

  // ── Modal model ───────────────────────────────────────────────────────────────
  isModalSubmitted = false;
  AgencyModel      = this.emptyAgencyModel();

  // ── Reactive form ─────────────────────────────────────────────────────────────
  form!: FormGroup;

  get childrenFormArray(): FormArray {
    return this.form.get('childAgeSelections') as FormArray;
  }

  get nightsLabel(): string {
    const n = Number(this.form.get('NoOfNights')?.value) || 0;
    return `${n} Night${n !== 1 ? 's' : ''}, ${n + 1} Day${n !== 1 ? 's' : ''}`;
  }

  /** Show "Add new" row only when typed text doesn't exactly match any existing agency */
  get showAddNewOption(): boolean {
    const value = this.form.get('AgencyName')?.value?.toLowerCase()?.trim();
    if (!value) return false;
    return !this.agencyList().some(a => a.AgencyName.toLowerCase() === value);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.QueryStepOneId = Number(this.route.snapshot.paramMap.get('id')) || 0;
    this.buildForm();
    this.setupAgencySearch();
    this.validateMenu();
    this.loadAllDropdowns();

    //Load existing data if editing 
    if(this.QueryStepOneId > 0) {
      this.loadExistingQuery();
    }
  }
  get pageTitle(): string {
  return this.QueryStepOneId > 0 ? 'Edit Query' : 'Add New Query';
}
  QueryStepOneId = 0;   // 0 = new, >0 = edit mode
  private loadExistingQuery(): void {
    this.dataLoading.set(true);
    const enc = (data: object): RequestModel => ({
      request: this.localService.encrypt(JSON.stringify(data)).toString(),
    });

    this.service.getQueryStepOneList(enc({ QueryStepOneId: this.QueryStepOneId}))
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (r: any) => {
        if(r.Message === ConstantData.SuccessMessage) {
          const list = r.QueryStepOneList ?? [];
          if(list.length > 0) {
            this.patchFormWithExistingData(list[0]);
            }
        } else{
          this.toastr.error(r.Message);
        }
        error: () => {
          this.toastr.error('Error loading query for edit');
          this.dataLoading.set(false);
        }
      }
    });
  }
private patchFormWithExistingData(item: any): void {
  this.form.patchValue({
    QueryStepOneId:    item.QueryStepOneId,
    AgencyId:          item.AgencyId          ?? 0,
    AgencyName:        item.AgencyName         ?? '',
    AgencyCity:        item.CityName           ?? '',
    GuestId:           item.GuestId            ?? 0,
    Salutation:        item.Salutation         ?? 'Mr.',
    ContactName:       item.ContactName        ?? '',
    CountryCode:       item.CountryCode        ?? '91-IN',
    Phone:             item.Phone              ?? '',
    Email:             item.Email              ?? '',
    QuerySource:       item.QuerySource        ?? '',
    ReferenceId:       item.ReferenceId        ?? '',
    AssignedToLoginId: Number(item.AssignedToLoginId) || 0,
    DestinationId:     item.DestinationId      ?? 0,
    StartDate:         item.StartDate ? new Date(item.StartDate) : null,
    NoOfNights:        item.NoOfNights         ?? 1,
    NoOfAdults:        item.NoOfAdults         ?? 1,
    OriginCity:        item.OriginCity         ?? '',
    Nationality:       item.Nationality        ?? '',
    Comments:          item.Comments           ?? '',
    TripStatus:        item.TripStatus         ?? 1,
  });

  // Patch children ages
  const childrenArray = this.childrenFormArray;
  childrenArray.clear();
  if (item.ChildrenAges) {
    try {
      const ages: number[] = JSON.parse(item.ChildrenAges);
      ages.forEach(age => {
        const label = age === 0 ? '<1y' : `${age}y`;
        childrenArray.push(this.fb.control(label));
      });
    } catch { }
  }

  // Patch tags
  this.selectedTagIds.set(item.TagIds ?? []);

  // ── Load trip-linked guests (not all agency guests) ──
  if (item.AgencyId > 0) {
    const enc = (data: object): RequestModel => ({
      request: this.localService.encrypt(JSON.stringify(data)).toString(),
    });

    this.service.getGuestByAgency(enc({
      AgencyId:       item.AgencyId,
      QueryStepOneId: item.QueryStepOneId,  // ← key change
    }))
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          this.guestList.set(r.GuestList ?? []);
          this.filteredGuests = r.GuestList ?? [];
          this.cdr.markForCheck();
        }
      }
    });
  }

  this.agencySearch$.next(item.AgencyName ?? '');
  this.cdr.markForCheck();
}

  // ── Form ──────────────────────────────────────────────────────────────────────
  private buildForm(): void {
    this.form = this.fb.group({
      QueryStepOneId:     [0],
      AgencyId:           [0],
      AgencyName:         ['', Validators.required],
      AgencyCity:         [''],
      GuestId:            [0],
      Salutation:         ['Mr.'],
      ContactName:        ['', Validators.required],
      CountryCode:        ['91-IN'],
      Phone:              ['', Validators.required],
      Email:              ['', Validators.email],
      QuerySource:        [''],
      ReferenceId:        [''],
      AssignedToLoginId:  [Number(this.staffLogin?.StaffLoginId) || 0],
      DestinationId:      [0, [Validators.required, Validators.min(1)]],
      StartDate:          [null, Validators.required],
      NoOfNights:         [1,  [Validators.required, Validators.min(1)]],
      NoOfAdults:         [1,  [Validators.required, Validators.min(1)]],
      childAgeSelections: this.fb.array([]),
      OriginCity:         [''],
      Nationality:        [''],
      Comments:           [''],
      TripStatus:         [1],
    });
  }

  // ── Agency search debounce ────────────────────────────────────────────────────
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
    this.cdr.markForCheck();
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

  // ── Load all dropdowns ────────────────────────────────────────────────────────
  private loadAllDropdowns(): void {
    const enc = (data: object): RequestModel => ({
      request: this.localService.encrypt(JSON.stringify(data)).toString(),
    });

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
            ...s, StaffLoginId: Number(s.StaffLoginId),
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
    this.agencySearch$.next(value ?? '');
  }

  /**
   * ✅ CORE FIX — single (optionSelected) on <mat-autocomplete>.
   *
   * Problem with the old approach:
   *   - Using (click) on mat-option is unreliable: the panel closes on mousedown,
   *     which fires before (click), so the handler sometimes never runs.
   *   - Using (onSelectionChange) inside mat-option fires per-option but
   *     Angular still writes the [value] to the input first.
   *   - With ChangeDetectionStrategy.OnPush, a plain boolean `showModal`
   *     toggled inside a click handler won't trigger re-render.
   *
   * Solution:
   *   - One (optionSelected) on the <mat-autocomplete> element catches ALL
   *     selections after Angular has processed them.
   *   - The "Add new" option carries the ADD_NEW sentinel object as its value.
   *   - We detect it here, restore the typed text, and call openAddAgencyModal().
   *   - showModal is a signal() so OnPush sees the change immediately.
   */
  onAgencyOptionSelected(event: MatAutocompleteSelectedEvent): void {
    if (event.option.value === ADD_NEW_SENTINEL) {
      // Angular already wrote the sentinel to the input — restore typed text
      const typedName = this.agencySearch$.getValue();
      this.form.patchValue({ AgencyName: typedName, AgencyId: 0, AgencyCity: '' });
      this.openAddAgencyModal(typedName);
    } else {
      // Normal agency selected
      const agency = event.option.value as Agency;
      this.selectAgency(agency);
    }
  }

  private selectAgency(agency: Agency): void {
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
          this.cdr.markForCheck();
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
// Replace the success navigate line:
if (res.Message === ConstantData.SuccessMessage) {
  this.toastr.success(
    this.QueryStepOneId > 0
      ? 'Query updated successfully'
      : 'Query saved successfully'
  );
  const savedId = res.QueryStepOneId ?? this.QueryStepOneId;
  this.router.navigate(['/agent/query-steptwo', savedId]);
}else {
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

  // ── Add Agency Modal ──────────────────────────────────────────────────────────
  private emptyAgencyModel() {
    return {
      AgencyId:    0,
      AgencyName:  '',
      CityName:    '',
      StateName:   '',
      GstinNumber: '',
      Status:      1,
      CreatedBy:   Number(this.staffLogin?.StaffLoginId) || 0,
      UpdatedBy:   Number(this.staffLogin?.StaffLoginId) || 0,
    };
  }

  openAddAgencyModal(prefillName = ''): void {
    this.AgencyModel = { ...this.emptyAgencyModel(), AgencyName: prefillName };
    this.isModalSubmitted = false;
    this.showModal.set(true);   // signal → OnPush picks it up
    this.cdr.markForCheck();
  }

  closeModal(): void {
    this.showModal.set(false);
    this.isModalSubmitted = false;
    this.AgencyModel = this.emptyAgencyModel();
  }

  saveAgency(): void {
    this.isModalSubmitted = true;

    if (!this.AgencyModel.AgencyName.trim()) {
      this.toastr.error('Source name is required');
      return;
    }

    const enc = (data: object): RequestModel => ({
      request: this.localService.encrypt(JSON.stringify(data)).toString(),
    });

    this.dataLoading.set(true);

    this.service.saveAgency(enc({
      ...this.AgencyModel,
      CreatedBy: Number(this.staffLogin?.StaffLoginId) || 0,
      UpdatedBy: Number(this.staffLogin?.StaffLoginId) || 0,
    })).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (r: any) => {
        if (r.Message !== ConstantData.SuccessMessage) {
          this.toastr.error(r.Message);
          this.dataLoading.set(false);
          return;
        }

        // Refresh agency list then auto-select the newly created entry
        this.service.getAdminAgencyList(enc({ AgencyId: 0, Status: 0 })).pipe(
          takeUntilDestroyed(this.destroyRef),
        ).subscribe({
          next: (agencyResponse: any) => {
            const agencies: Agency[] = agencyResponse?.AgencyList ?? [];
            this.agencyList.set(agencies);

            const savedName = this.AgencyModel.AgencyName.trim().toLowerCase();
            const created   = agencies.find(a =>
              a.AgencyName?.trim().toLowerCase() === savedName
            );

            if (created) {
              this.selectAgency(created);
            } else {
              this.form.patchValue({
                AgencyName: this.AgencyModel.AgencyName,
                AgencyCity: this.AgencyModel.CityName,
              });
            }

            this.toastr.success('Source added successfully');
            this.closeModal();
            this.dataLoading.set(false);
          },
          error: () => {
            this.form.patchValue({
              AgencyName: this.AgencyModel.AgencyName,
              AgencyCity: this.AgencyModel.CityName,
            });
            this.toastr.success('Source added. Could not refresh list.');
            this.closeModal();
            this.dataLoading.set(false);
          },
        });
      },
      error: () => {
        this.toastr.error('Error while saving source');
        this.dataLoading.set(false);
      },
    });
  }
allowOnlyNumbers(event: KeyboardEvent): void {
  const charCode = event.which ? event.which : event.keyCode;

  // Allow only numbers (0–9)
  if (charCode < 48 || charCode > 57) {
    event.preventDefault();
  }
}

}
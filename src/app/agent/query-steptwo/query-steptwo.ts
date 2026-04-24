import {
  Component, OnInit, signal, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ConstantData } from '../../utils/constant-data';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { LoadDataService } from '../../utils/load-data.service';
import { Progress } from '../../component/progress/progress';
// ── Add these interfaces at the top ──────────────────────────
export interface TouristRow {
  GuestId: number;
  AgencyId: number;
  Salutation: string;
  ContactName: string;
  CountryCode: string;
  Phone: string;
  Email: string;
  IsPrimary: boolean;
  Status: number;
  CreatedBy: number;
  UpdatedBy: number;
  // UI only
  IsExpanded: boolean;
  IsNew: boolean;
}

export interface TripDetail {
  QueryStepOneId: number;
  AgencyId: number;   // ← add this line
  AgencyName: string;
  CityName: string;
  ContactName: string;
  Salutation: string;
  Phone: string;
  CountryCode: string;
  Email: string;
  DestinationName: string;
  StartDate: string;
  NoOfNights: number;
  NoOfAdults: number;
  ChildrenAges: string;
  OriginCity: string;
  Nationality: string;
  Comments: string;
  ReferenceId: string;
  AssigneeName: string;
  TripStatus: number;
  Tags: string[];
  CreatedOn: string;
}

export interface ItineraryDay {
  DayNumber: number;
  LocationName: string;
  Services: ItineraryService[];
}

export interface ItineraryService {
  IteneraryServiceId: number;
  IteneraryServiceName: string;
  ServiceType: number;  // 1=Transport/Vehicle, 2=Activity
  LocationName: string;
}

export interface ItinerarySuggestion {
  IteneraryServiceId: number;
  IteneraryServiceName: string;
  LocationName: string;
  DaySchedule: string;   // HTML from quill
  Days: ItineraryDay[];
  Locations: LocationNight[];  // Port Blair 1N, Havelock 2N etc.
}

export interface LocationNight {
  LocationName: string;
  Nights: number;
}

export interface TripComment {
  TripCommentId: number;
  Comment: string;
  CreatedByName: string;
  CreatedOn: string;
}

@Component({
  selector: 'app-query-steponetwo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    Progress,
  ],
  templateUrl: './query-steptwo.html',
  styleUrl: './query-steptwo.css',
})
export class QuerySteptwo implements OnInit {

  // ── Signals ───────────────────────────────────────────
  dataLoading = signal(false);
  action = signal<ActionModel>({
    CanCreate: false, CanEdit: false, CanDelete: false,
    MenuTitle: 'Trip Details', ParentMenuTitle: 'Trips'
  } as ActionModel);

  tripDetail = signal<TripDetail | null>(null);
  suggestions = signal<ItinerarySuggestion[]>([]);
  comments = signal<TripComment[]>([]);

  // ── State ─────────────────────────────────────────────
  QueryStepOneId = 0;
  newComment = '';
  activeTabIndex = 0;   // 0=Itinerary, 1=Hotels, 2=Details
  searchQuery = '';
  staffLogin: StaffLoginModel = {} as StaffLoginModel;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(AppService);
  private toastr = inject(ToastrService);
  private local = inject(LocalService);
  private loadData = inject(LoadDataService);

  // ── Lifecycle ─────────────────────────────────────────
  ngOnInit(): void {
    this.staffLogin = this.local.getEmployeeDetail();
    this.QueryStepOneId = Number(this.route.snapshot.paramMap.get('id')) || 0;
    this.validateMenu();
    this.loadTripDetail();
    this.loadComments();
    this.loadSuggestions();
  }

  // ── Menu validation ───────────────────────────────────
  validateMenu(): void {
    const cleanUrl = '/admin/query-steponetwo';
    const obj: RequestModel = {
      request: this.local.encrypt(
        JSON.stringify({ Url: cleanUrl, StaffLoginId: this.staffLogin.StaffLoginId })
      ).toString()
    };
    this.service.validiateMenu(obj).subscribe({
      next: (res: any) => this.action.set({ ...res }),
      error: () => { }
    });
  }

  // ── Load Trip Detail ──────────────────────────────────
  loadTripDetail(): void {
    this.dataLoading.set(true);
    const obj: RequestModel = {
      request: this.local.encrypt(
        JSON.stringify({ QueryStepOneId: this.QueryStepOneId })
      ).toString()
    };
    this.service.getQueryStepOneList(obj).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          const list = r.QueryStepOneList ?? [];
          if (list.length > 0) {
            const item = list[0];
            this.tripDetail.set({
              QueryStepOneId: item.QueryStepOneId,
              AgencyId: item.AgencyId ?? 0,   // ← add this line
              AgencyName: item.AgencyName ?? '',
              CityName: item.CityName ?? '',
              ContactName: item.ContactName ?? '',
              Salutation: item.Salutation ?? '',
              Phone: item.Phone ?? '',
              CountryCode: item.CountryCode ?? '',
              Email: item.Email ?? '',
              DestinationName: item.DestinationName ?? '',
              StartDate: item.StartDate
                ? new Date(item.StartDate).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric'
                })
                : '',
              NoOfNights: item.NoOfNights ?? 0,
              NoOfAdults: item.NoOfAdults ?? 0,
              ChildrenAges: item.ChildrenAges ?? '[]',
              OriginCity: item.OriginCity ?? '',
              Nationality: item.Nationality ?? '',
              Comments: item.Comments ?? '',
              ReferenceId: item.ReferenceId ?? '',
              AssigneeName: item.AssigneeName ?? '',
              TripStatus: item.TripStatus ?? 1,
              Tags: item.Tags ?? [],
              CreatedOn: item.CreatedOn ?? '',
            });
          }
        } else {
          this.toastr.error(r.Message);
        }
        this.dataLoading.set(false);
      },
      error: () => {
        this.toastr.error('Error loading trip details');
        this.dataLoading.set(false);
      }
    });
  }

  // ── Load Itinerary Suggestions ────────────────────────
  loadSuggestions(): void {
    const trip = this.tripDetail();
    const obj: RequestModel = {
      request: this.local.encrypt(
        JSON.stringify({
          DestinationId: 0,
          LocationId: 0,
        })
      ).toString()
    };
    this.service.getIteneraryServiceList(obj).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          this.suggestions.set(r.IteneraryServiceList ?? []);
        }
      },
      error: () => { }
    });
  }

  // ── Comments ──────────────────────────────────────────
  loadComments(): void {
    const obj: RequestModel = {
      request: this.local.encrypt(
        JSON.stringify({ QueryStepOneId: this.QueryStepOneId })
      ).toString()
    };
    this.service.getTripCommentList(obj).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          this.comments.set(r.TripCommentList ?? []);
        }
      },
      error: () => { }
    });
  }
  // Add inside the class
  getLocationNights(suggestion: ItinerarySuggestion): LocationNight[] {
    if (!suggestion.Days || suggestion.Days.length === 0) return [];
    const map = new Map<string, number>();
    suggestion.Days.forEach(day => {
      const loc = day.LocationName;
      map.set(loc, (map.get(loc) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([LocationName, Nights]) => ({
      LocationName, Nights
    }));
  }
  addComment(): void {
    if (!this.newComment.trim()) return;
    const obj: RequestModel = {
      request: this.local.encrypt(
        JSON.stringify({
          QueryStepOneId: this.QueryStepOneId,
          Comment: this.newComment.trim(),
          CreatedBy: this.staffLogin.StaffLoginId,
        })
      ).toString()
    };
    this.service.saveTripComment(obj).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          this.newComment = '';
          this.loadComments();
        } else {
          this.toastr.error(r.Message);
        }
      },
      error: () => this.toastr.error('Error saving comment')
    });
  }

  // ── Helpers ───────────────────────────────────────────
  get childrenCount(): number {
    const trip = this.tripDetail();
    if (!trip?.ChildrenAges) return 0;
    try {
      return JSON.parse(trip.ChildrenAges).length;
    } catch { return 0; }
  }

  get childrenLabel(): string {
    const count = this.childrenCount;
    if (count === 0) return '';
    try {
      const ages: number[] = JSON.parse(this.tripDetail()?.ChildrenAges ?? '[]');
      return `, ${count} Child${count > 1 ? 'ren' : ''} (${ages.map(a => a + 'y').join(', ')})`;
    } catch { return ''; }
  }

  get nightsDaysLabel(): string {
    const n = this.tripDetail()?.NoOfNights ?? 0;
    return `${n}N, ${n + 1}D`;
  }

  getStatusLabel(status: number): string {
    const map: Record<number, string> = {
      1: 'Initiated', 2: 'In Progress', 3: 'On Hold',
      4: 'Converted', 5: 'On Trip', 6: 'Past', 7: 'Canceled', 8: 'Dropped'
    };
    return map[status] ?? 'Unknown';
  }

  // ── Navigation ────────────────────────────────────────
  goBack(): void {
    this.router.navigate(['/admin/trips']);
  }

  // editTrip(): void {
  //   this.router.navigate(['/admin/query-stepone/edit', this.QueryStepOneId]);
  // }

  useThisQuote(suggestion: ItinerarySuggestion): void {
    this.router.navigate(['/admin/query-stepthree', this.QueryStepOneId], {
      queryParams: { itineraryId: suggestion.IteneraryServiceId }
    });
  }

  createCustomQuotation(): void {
    this.router.navigate(['/admin/query-stepthree', this.QueryStepOneId]);
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  // ── Add these properties inside the class ────────────────────

  showTouristModal = signal(false);
  touristRows = signal<TouristRow[]>([]);
  touristTab = 0;   // 0=Tourists, 1=Tourist Groups
  savingTourists = signal(false);

  readonly countryCodes = [
    { code: '91-IN', label: '91-IN' },
    { code: '1-US', label: '1-US' },
    { code: '44-GB', label: '44-GB' },
    { code: '971-AE', label: '971-AE' },
    { code: '65-SG', label: '65-SG' },
  ];
  editQuery(obj: any)
  {
    const queryId = Number(obj) || this.QueryStepOneId;
    if (!queryId) {
      this.toastr.error('Query ID not found');
      return;
    }
    this.router.navigate(['/agent/query-stepone', queryId]);
  }

  // ── Replace editTrip() with this ─────────────────────────────
  editGuest(): void {
    this.openTouristModal();
  }

  openTouristModal(): void {
    this.loadTouristsForTrip();
    this.showTouristModal.set(true);
  }

  closeTouristModal(): void {
    this.showTouristModal.set(false);
    this.touristRows.set([]);
  }

  loadTouristsForTrip(): void {
    const trip = this.tripDetail();
    if (!trip) return;

    const obj: RequestModel = {
      request: this.local.encrypt(
        JSON.stringify({ AgencyId: trip.AgencyId ?? 0 })
      ).toString()
    };
    this.service.getGuestByAgency(obj).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          const rows: TouristRow[] = (r.GuestList ?? []).map((g: any) => ({
            GuestId: g.GuestId,
            AgencyId: g.AgencyId,
            Salutation: g.Salutation ?? 'Mr.',
            ContactName: g.ContactName ?? '',
            CountryCode: g.CountryCode ?? '91-IN',
            Phone: g.Phone ?? '',
            Email: g.Email ?? '',
            IsPrimary: g.IsPrimary ?? false,
            Status: g.Status ?? 1,
            CreatedBy: this.staffLogin.StaffLoginId,
            UpdatedBy: this.staffLogin.StaffLoginId,
            IsExpanded: false,
            IsNew: false,
          }));
          // Expand first row by default
          if (rows.length > 0) rows[0].IsExpanded = false;
          this.touristRows.set(rows);
        }
      },
      error: () => this.toastr.error('Error loading tourists')
    });
  }

  addTouristRow(): void {
    const trip = this.tripDetail();
    this.touristRows.update(rows => [
      ...rows,
      {
        GuestId: 0,
        AgencyId: trip?.AgencyId ?? 0,
        Salutation: 'Mr.',
        ContactName: '',
        CountryCode: '91-IN',
        Phone: '',
        Email: '',
        IsPrimary: false,
        Status: 1,
        CreatedBy: this.staffLogin.StaffLoginId,
        UpdatedBy: this.staffLogin.StaffLoginId,
        IsExpanded: true,
        IsNew: true,
      }
    ]);
  }

  removeTouristRow(index: number): void {
    const rows = this.touristRows();
    const row = rows[index];
    if (row.GuestId > 0) {
      // soft delete — just remove from UI for now
      // wire to deleteGuest API if needed
    }
    this.touristRows.update(r => r.filter((_, i) => i !== index));
  }

  toggleExpand(index: number): void {
    this.touristRows.update(rows =>
      rows.map((r, i) => i === index ? { ...r, IsExpanded: !r.IsExpanded } : r)
    );
  }

  saveTourists(): void {
    const rows = this.touristRows();

    const invalid = rows.find(r => !r.ContactName?.trim() || !r.Phone?.trim());
    if (invalid) {
      this.toastr.error('Please fill Name and Phone for all tourists');
      return;
    }

    this.savingTourists.set(true);

    const obj: RequestModel = {
      request: this.local.encrypt(
        JSON.stringify(rows.map(r => ({
          GuestId: r.GuestId,
          AgencyId: r.AgencyId,
          Salutation: r.Salutation,
          ContactName: r.ContactName,
          CountryCode: r.CountryCode,
          Phone: r.Phone,
          Email: r.Email,
          IsPrimary: r.IsPrimary,
          Status: 1,
          CreatedBy: r.CreatedBy,
          UpdatedBy: r.UpdatedBy,
        })))
      ).toString()
    };

    this.service.saveGuestList(obj).subscribe({
      next: (r: any) => {
        if (r.Message === ConstantData.SuccessMessage) {
          this.toastr.success('Tourists saved successfully');
          this.closeTouristModal();
          this.loadTripDetail();
        } else {
          this.toastr.error(r.Message);
        }
        this.savingTourists.set(false);
      },
      error: () => {
        this.toastr.error('Error saving tourists');
        this.savingTourists.set(false);
      }
    });
  }

  get touristCount(): number {
    return this.touristRows().length;
  }

}

// trips.component.ts - Updated with proper TripStatus enum support

import {
  Component, OnInit, ViewChild, AfterViewInit, inject, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Angular Material
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { LoadDataService } from '../../utils/load-data.service';
import { ConstantData } from '../../utils/constant-data';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { Progress } from '../../component/progress/progress';
import { TripStatus, TripStatusMap } from '../../utils/enum';

// ── Interfaces ────────────────────────────────────────────
export interface Trip {
  id: number;
  agencyName: string;
  contactName: string;
  phone: string;
  email: string;
  destination: string;
  date: string;
  nights: number;
  rooms: string;
  assignee: string;
  lastActivity: string;
  tags: string[];
  status: string;        // Status key: 'new', 'progress', 'hold', etc.
  statusDisplay: string; // Display name: 'New Query', 'In Progress', etc.
  statusClass: string;   // CSS class: 'bg-primary', 'bg-info', etc.
  statusId: number;      // Numeric status ID from database
  unread?: boolean;
  rawData?: any;
}

// ── Status Mapping ──────────────────────────────────────
const TRIP_STATUS_TO_KEY: Record<number, string> = {
  [TripStatus.NewQuery]: 'new',
  [TripStatus.InProgress]: 'progress',
  [TripStatus.OnHold]: 'hold',
  [TripStatus.Converted]: 'converted',
  [TripStatus.OnTrip]: 'ontrip',
  [TripStatus.PastTrip]: 'past',
  [TripStatus.Canceled]: 'canceled',
  [TripStatus.Dropped]: 'dropped',
};

// ── Component ─────────────────────────────────────────────
@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatTableModule, MatSortModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatMenuModule,
    MatChipsModule, MatProgressBarModule,
    MatTooltipModule, MatDividerModule,
    MatSnackBarModule,
    Progress,
  ],
  templateUrl: './trips.html',
  styleUrl: './trips.css',
})
export class Trips implements OnInit, AfterViewInit {

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private snackBar = inject(MatSnackBar);
  private loadData = inject(LoadDataService);

  // ── Signals ────────────────────────────────────────────
  loading = signal(false);
  allTrips = signal<Trip[]>([]);
  action = signal<ActionModel>({
    CanCreate: false,
    CanEdit: false,
    CanDelete: false,
    MenuTitle: 'Trips',
    ParentMenuTitle: 'Trips'
  } as ActionModel);

  staffLogin: StaffLoginModel = {} as StaffLoginModel;

  // ── Filters ───────────────────────────────────────────
  searchQuery = '';
  filterDestination = '';
  activeTab = 'all';

  // ── Table ─────────────────────────────────────────────
  displayedColumns = ['id', 'contact', 'details', 'team', 'tags', 'status', 'actions'];
  dataSource = new MatTableDataSource<Trip>([]);

  // ── Tabs ──────────────────────────────────────────────
  tabs = [
    { key: 'all', label: 'All', statusValue: 0 },
    { key: 'new', label: 'New Query', statusValue: TripStatus.NewQuery },
    { key: 'progress', label: 'In Progress', statusValue: TripStatus.InProgress },
    { key: 'hold', label: 'On Hold', statusValue: TripStatus.OnHold },
    { key: 'converted', label: 'Converted', statusValue: TripStatus.Converted },
    { key: 'ontrip', label: 'On Trip', statusValue: TripStatus.OnTrip },
    { key: 'past', label: 'Past Trips', statusValue: TripStatus.PastTrip },
    { key: 'canceled', label: 'Canceled', statusValue: TripStatus.Canceled },
    { key: 'dropped', label: 'Dropped', statusValue: TripStatus.Dropped },
  ];

  // ── Derived ───────────────────────────────────────────
  destinations = computed(() =>
    [...new Set(this.allTrips().map(t => t.destination))].sort()
  );

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private localService: LocalService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validateMenu();
    this.loadTrips();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;

    // Custom filter: tab + destination + text search
    this.dataSource.filterPredicate = (row: Trip, filter: string) => {
      const f = JSON.parse(filter);
      const matchTab = f.tab === 'all' || row.status === f.tab;
      const matchDest = !f.dest || row.destination === f.dest;
      const q = f.q.toLowerCase();
      const matchQ = !q
        || row.id.toString().includes(q)
        || row.agencyName.toLowerCase().includes(q)
        || row.contactName.toLowerCase().includes(q)
        || row.destination.toLowerCase().includes(q)
        || row.phone.includes(q);
      return matchTab && matchDest && matchQ;
    };
  }

  validateMenu(): void {
    const cleanUrl = this.router.url.split('?')[0];
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ Url: cleanUrl, StaffLoginId: this.staffLogin.StaffLoginId })
      ).toString()
    };
    this.loading.set(true);
    this.service.validiateMenu(obj).subscribe({
      next: (response: any) => {
        this.action.set({
          ...this.loadData.validiateMenu(response, this.toastr, this.router)
        });
        if (this.action().CanDelete && !this.displayedColumns.includes('delete')) {
          this.displayedColumns = ['id', 'contact', 'details', 'team', 'tags', 'status', 'delete', 'actions'];
        }
        this.loading.set(false);
      },
      error: () => {
        this.toastr.error('Error while fetching menu');
        this.loading.set(false);
      }
    });
  }

  // ── MAIN: Load QueryStepOne Data ───────────────────────
  loadTrips(): void {
    this.loading.set(true);

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };

    this.service.getQueryStepOneList(obj).subscribe({
      next: (response: any) => {
        if (response.Message === ConstantData.SuccessMessage) {
          const trips: Trip[] = response.QueryStepOneList.map((item: any) =>
            this.transformQueryToTrip(item)
          );

          this.allTrips.set(trips);
          this.dataSource.data = trips;
          this.applyFilter();
        } else {
          this.toastr.error(response.Message);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading trips:', error);
        this.toastr.error('Error while fetching trips');
        this.loading.set(false);
      }
    });
  }

  // ── Transform QueryStepOne to Trip Interface ───────────
  transformQueryToTrip(query: any): Trip {
    // Parse children ages from JSON string
    let childrenCount = 0;
    let childrenAges: string[] = [];
    try {
      if (query.ChildrenAges) {
        childrenAges = JSON.parse(query.ChildrenAges);
        childrenCount = childrenAges.length;
      }
    } catch (e) {
      console.warn('Failed to parse ChildrenAges:', query.ChildrenAges);
    }

    // Format rooms/occupancy string
    const rooms = `${query.NoOfAdults} Adult${query.NoOfAdults !== 1 ? 's' : ''}${childrenCount > 0 ? `, ${childrenCount} Child${childrenCount !== 1 ? 'ren' : ''}` : ''}`;

    // Format date
    const date = query.StartDate ? new Date(query.StartDate).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) : 'TBD';

    // Calculate last activity (time ago)
    const lastActivity = this.getTimeAgo(query.CreatedOn);

    // Get status info from map or use defaults
    const tripStatus = query.TripStatus as TripStatus;
    const statusKey = TRIP_STATUS_TO_KEY[tripStatus] || 'new';
    const statusInfo = TripStatusMap[tripStatus] || { label: 'Unknown', class: 'bg-secondary' };

    return {
      id: query.QueryStepOneId,
      agencyName: query.AgencyName,
      contactName: query.ContactName,
      phone: query.Phone || '',
      email: query.Email || '',
      destination: query.DestinationName,
      date: date,
      nights: query.NoOfNights,
      rooms: rooms,
      assignee: query.AssigneeName || 'Unassigned',
      lastActivity: lastActivity,
      tags: query.Tags || [],
      status: statusKey,
      statusDisplay: query.StatusDisplayName || statusInfo.label,
      statusClass: query.StatusClass || statusInfo.class,
      statusId: query.TripStatus,
      unread: false,
      rawData: query
    };
  }

  // ── Helper: Get time ago string ────────────────────────
  getTimeAgo(dateString: string): string {
    if (!dateString) return 'Recently';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }

  // ── Filters ───────────────────────────────────────────
  applyFilter(): void {
    this.dataSource.filter = JSON.stringify({
      tab: this.activeTab,
      dest: this.filterDestination,
      q: this.searchQuery.trim(),
    });
    if (this.paginator) this.paginator.firstPage();
  }

  setTab(key: string): void {
    this.activeTab = key;
    this.applyFilter();
  }

  getTabCount(key: string): number {
    if (key === 'all') return this.allTrips().length;
    return this.allTrips().filter(t => t.status === key).length;
  }

  onSortChange(_e: Sort): void { /* handled by MatSort */ }

  // ── Status helpers ────────────────────────────────────
  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'new': 'New Query',
      'progress': 'In Progress',
      'hold': 'On Hold',
      'converted': 'Converted',
      'ontrip': 'On Trip',
      'past': 'Past Trip',
      'canceled': 'Canceled',
      'dropped': 'Dropped',
    };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'new': 'bg-primary',
      'progress': 'bg-info text-dark',
      'hold': 'bg-warning text-dark',
      'converted': 'bg-success',
      'ontrip': 'bg-success',
      'past': 'bg-secondary',
      'canceled': 'bg-danger',
      'dropped': 'bg-dark',
    };
    return map[status] ?? 'bg-secondary';
  }

  // ── Row actions ───────────────────────────────────────
  openTripDetail(row: Trip): void {
    // Trips that have advanced beyond the main quote editing flow should open the finalized query view.
    if (row.status === 'progress' || row.status === 'hold' || row.status === 'converted') {
      this.router.navigate(['/agent/query-stepfour', row.id]);
      return;
    }
    this.router.navigate(['/agent/query-steptwo', row.id]);
  }

  editTrip(row: Trip): void {
    this.router.navigate(['/agent/query-stepone', row.id]);
  }

  createQuote(row: Trip): void {
    this.router.navigate(['/agent/query-steptwo', row.id]);
  }

  deleteTrip(row: Trip): void {
    if (!confirm(`Are you sure you want to delete trip #${row.id}?`)) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ QueryStepOneId: row.id })
      ).toString()
    };

    this.loading.set(true);
    this.service.deleteQueryStepOne(obj).subscribe({
      next: (response: any) => {
        if (response.Message === ConstantData.SuccessMessage) {
          this.toastr.success('Trip deleted successfully');
          this.allTrips.update(list => list.filter(t => t.id !== row.id));
          this.dataSource.data = this.allTrips();
          this.applyFilter();
        } else {
          this.toastr.error(response.Message);
        }
        this.loading.set(false);
      },
      error: () => {
        this.toastr.error('Error occurred while deleting');
        this.loading.set(false);
      }
    });
  }

  // ── Update trip status ──────────────────────────────────
  updateTripStatus(tripId: number, newStatus: number): void {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({
          QueryStepOneId: tripId,
          TripStatus: newStatus
        })
      ).toString()
    };

    this.service.updateTripStatus(obj).subscribe({
      next: (response: any) => {
        if (response.Message === ConstantData.SuccessMessage) {
          this.toastr.success('Status updated successfully');
          this.loadTrips(); // Reload to refresh
        } else {
          this.toastr.error(response.Message);
        }
      },
      error: () => {
        this.toastr.error('Error updating status');
      }
    });
  }

  // ── Update status from context menu ─────────────────────
  updateStatus(row: Trip, statusKey: string): void {
    const statusKeyToValue: Record<string, number> = {
      'new': TripStatus.NewQuery,
      'progress': TripStatus.InProgress,
      'hold': TripStatus.OnHold,
      'converted': TripStatus.Converted,
      'ontrip': TripStatus.OnTrip,
      'past': TripStatus.PastTrip,
      'canceled': TripStatus.Canceled,
      'dropped': TripStatus.Dropped,
    };
    const numericStatus = statusKeyToValue[statusKey] ?? TripStatus.NewQuery;
    this.updateTripStatus(row.id, numericStatus);
  }
}
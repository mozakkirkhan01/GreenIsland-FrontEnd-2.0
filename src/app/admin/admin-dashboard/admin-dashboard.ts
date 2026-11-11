import { Component, OnInit, ChangeDetectorRef, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Angular Material
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ConstantData } from '../../utils/constant-data';
import { RequestModel, StaffLoginModel } from '../../utils/interface';
import { TripStatus, TripStatusMap } from '../../utils/enum';
import { Progress } from '../../component/progress/progress';

export interface DashboardQueryItem {
  id: number;
  quotationNo?: string;
  agencyName: string;
  contactName: string;
  phone: string;
  email: string;
  destination: string;
  startDate: string;
  nights: number;
  adults: number;
  kidsCount: number;
  assignee: string;
  tripStatus: number;
  statusLabel: string;
  statusClass: string;
  createdOn: string;
  timeAgo: string;
}

export interface DestinationStat {
  name: string;
  count: number;
  percentage: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    Progress
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {

  private service = inject(AppService);
  private localService = inject(LocalService);
  private toastr = inject(ToastrService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // ── State Signals ─────────────────────────────────────────────
  loading = signal<boolean>(false);
  staffLogin = signal<StaffLoginModel>({} as StaffLoginModel);

  // Queries
  rawQueries = signal<any[]>([]);
  queryItems = signal<DashboardQueryItem[]>([]);
  filteredQueries = signal<DashboardQueryItem[]>([]);

  // Filters
  searchQuery = '';
  activeStatusFilter = 'all';

  // System Counts
  totalHotels = signal<number>(0);
  totalAgencies = signal<number>(0);
  totalStaff = signal<number>(0);
  totalDestinations = signal<number>(0);

  // ── Derived Statistics ─────────────────────────────────────────
  totalQueriesCount = computed(() => this.queryItems().length);

  newQueriesCount = computed(() =>
    this.queryItems().filter(q => q.tripStatus === TripStatus.NewQuery).length
  );

  inProgressCount = computed(() =>
    this.queryItems().filter(q => q.tripStatus === TripStatus.InProgress).length
  );

  onHoldCount = computed(() =>
    this.queryItems().filter(q => q.tripStatus === TripStatus.OnHold).length
  );

  convertedCount = computed(() =>
    this.queryItems().filter(q => q.tripStatus === TripStatus.Converted).length
  );

  onTripCount = computed(() =>
    this.queryItems().filter(q => q.tripStatus === TripStatus.OnTrip).length
  );

  pastTripsCount = computed(() =>
    this.queryItems().filter(q => q.tripStatus === TripStatus.PastTrip).length
  );

  canceledDroppedCount = computed(() =>
    this.queryItems().filter(
      q => q.tripStatus === TripStatus.Canceled || q.tripStatus === TripStatus.Dropped
    ).length
  );

  activePipelineCount = computed(() =>
    this.newQueriesCount() + this.inProgressCount() + this.onHoldCount()
  );

  conversionRate = computed(() => {
    const total = this.totalQueriesCount();
    if (total === 0) return '0.0';
    return ((this.convertedCount() / total) * 100).toFixed(1);
  });

  // Top Destinations
  topDestinations = computed<DestinationStat[]>(() => {
    const counts: Record<string, number> = {};
    const items = this.queryItems();
    const total = items.length || 1;

    items.forEach(q => {
      const dest = q.destination || 'Andaman';
      counts[dest] = (counts[dest] || 0) + 1;
    });

    return Object.keys(counts)
      .map(name => ({
        name,
        count: counts[name],
        percentage: Math.round((counts[name] / total) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });

  // Greeting & Date
  get greetingMessage(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  get currentDateFormatted(): string {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  ngOnInit(): void {
    const emp = this.localService.getEmployeeDetail();
    if (emp && emp.StaffLoginId) {
      this.staffLogin.set(emp);
    }
    this.loadAllData();
  }

  loadAllData(): void {
    this.loading.set(true);
    const encPayload: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };

    // 1. Fetch Queries
    this.service.getQueryStepOneList(encPayload).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage && res.QueryStepOneList) {
          this.rawQueries.set(res.QueryStepOneList);
          const mapped = res.QueryStepOneList.map((item: any) => this.transformQuery(item));
          this.queryItems.set(mapped);
          this.applyFilter();
        }
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Failed to load queries');
        this.loading.set(false);
        this.cdr.detectChanges();
      }
    });

    // 2. Fetch Master Counts
    this.service.getHotelList(encPayload).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage && res.HotelList) {
          this.totalHotels.set(res.HotelList.length);
        }
      }
    });

    this.service.getAdminAgencyList(encPayload).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage && res.AgencyList) {
          this.totalAgencies.set(res.AgencyList.length);
        }
      }
    });

    this.service.getStaffList(encPayload).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage && res.StaffList) {
          this.totalStaff.set(res.StaffList.length);
        }
      }
    });

    this.service.getDestinationList(encPayload).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage && res.DestinationList) {
          this.totalDestinations.set(res.DestinationList.length);
        }
      }
    });
  }

  refreshDashboard(): void {
    this.loadAllData();
    this.toastr.info('Dashboard data refreshed');
  }

  setFilterTab(tab: string): void {
    this.activeStatusFilter = tab;
    this.applyFilter();
  }

  applyFilter(): void {
    let list = this.queryItems();

    // Status filter
    if (this.activeStatusFilter === 'new') {
      list = list.filter(q => q.tripStatus === TripStatus.NewQuery);
    } else if (this.activeStatusFilter === 'progress') {
      list = list.filter(q => q.tripStatus === TripStatus.InProgress);
    } else if (this.activeStatusFilter === 'hold') {
      list = list.filter(q => q.tripStatus === TripStatus.OnHold);
    } else if (this.activeStatusFilter === 'converted') {
      list = list.filter(q => q.tripStatus === TripStatus.Converted);
    }

    // Text search
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(item =>
        item.id.toString().includes(q) ||
        (item.quotationNo && item.quotationNo.toLowerCase().includes(q)) ||
        (item.contactName && item.contactName.toLowerCase().includes(q)) ||
        (item.agencyName && item.agencyName.toLowerCase().includes(q)) ||
        (item.destination && item.destination.toLowerCase().includes(q)) ||
        (item.phone && item.phone.includes(q))
      );
    }

    this.filteredQueries.set(list);
  }

  navigateToTripsWithFilter(statusFilter: string): void {
    this.router.navigate(['/agent/trips'], { queryParams: { status: statusFilter } });
  }

  // ── Helpers ───────────────────────────────────────────────────
  private transformQuery(item: any): DashboardQueryItem {
    let kidsCount = 0;
    try {
      if (item.ChildrenAges) {
        const parsed = JSON.parse(item.ChildrenAges);
        kidsCount = Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch {
      kidsCount = 0;
    }

    const tripStatus = item.TripStatus as TripStatus;
    const statusMeta = TripStatusMap[tripStatus] || { label: 'New Query', class: 'bg-primary' };

    let formattedDate = 'TBD';
    if (item.StartDate) {
      formattedDate = new Date(item.StartDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }

    return {
      id: item.QueryStepOneId,
      quotationNo: item.QuotationNo || `Q-${item.QueryStepOneId}`,
      agencyName: item.AgencyName || 'Direct Customer',
      contactName: item.ContactName || 'Guest',
      phone: item.Phone || '',
      email: item.Email || '',
      destination: item.DestinationName || 'Andaman',
      startDate: formattedDate,
      nights: item.NoOfNights || 0,
      adults: item.NoOfAdults || 2,
      kidsCount: kidsCount,
      assignee: item.AssigneeName || 'Unassigned',
      tripStatus: tripStatus,
      statusLabel: statusMeta.label,
      statusClass: statusMeta.class,
      createdOn: item.CreatedOn,
      timeAgo: this.calculateTimeAgo(item.CreatedOn)
    };
  }

  private calculateTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const now = new Date().getTime();
    const date = new Date(dateStr).getTime();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 0) return `${diffDay}d ago`;
    if (diffHour > 0) return `${diffHour}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    return 'Just now';
  }
}

import {
  Component, OnInit, ViewChild, AfterViewInit, inject, signal, computed
} from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Angular Material
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort, Sort }        from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator }    from '@angular/material/paginator';
import { MatFormFieldModule }                  from '@angular/material/form-field';
import { MatInputModule }                      from '@angular/material/input';
import { MatSelectModule }                     from '@angular/material/select';
import { MatButtonModule }                     from '@angular/material/button';
import { MatIconModule }                       from '@angular/material/icon';
import { MatMenuModule }                       from '@angular/material/menu';
import { MatChipsModule }                      from '@angular/material/chips';
import { MatProgressBarModule }                from '@angular/material/progress-bar';
import { MatTooltipModule }                    from '@angular/material/tooltip';
import { MatDividerModule }                    from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule }      from '@angular/material/snack-bar';

import { ToastrService }   from 'ngx-toastr';
import { AppService }      from '../../utils/app.service';
import { LocalService }    from '../../utils/local.service';
import { LoadDataService } from '../../utils/load-data.service';
import { ConstantData }    from '../../utils/constant-data';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { Progress } from '../../component/progress/progress';

// ── Interfaces ────────────────────────────────────────────
export interface Trip {
  id:           number;
  agencyName:   string;
  contactName:  string;
  phone:        string;
  email:        string;
  destination:  string;
  date:         string;
  nights:       number;
  rooms:        string;
  assignee:     string;
  lastActivity: string;
  tags:         string[];
  status:       string;
  unread?:      boolean;
}

export interface Tab { key: string; label: string; }

// ── Status map ────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  all:       { label: 'All',         cls: 'bg-secondary' },
  new:       { label: 'New Query',   cls: 'bg-primary'   },
  progress:  { label: 'In Progress', cls: 'bg-info text-dark' },
  hold:      { label: 'On Hold',     cls: 'bg-warning text-dark' },
  converted: { label: 'Converted',   cls: 'bg-success'   },
  ontrip:    { label: 'On Trip',     cls: 'bg-success'   },
  past:      { label: 'Past Trip',   cls: 'bg-secondary' },
  canceled:  { label: 'Canceled',    cls: 'bg-danger'    },
  dropped:   { label: 'Dropped',     cls: 'bg-dark'      },
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
  styleUrl:    './trips.css',
})
export class Trips implements OnInit, AfterViewInit {

  @ViewChild(MatSort)      sort!:      MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private snackBar  = inject(MatSnackBar);
  private loadData  = inject(LoadDataService);

  // ── Signals (match pattern of other pages) ────────────
  loading    = signal(false);
  allTrips   = signal<Trip[]>([]);
  action     = signal<ActionModel>({
    CanCreate: false, CanEdit: false, CanDelete: false,
    MenuTitle: 'Trips', ParentMenuTitle: 'Management'
  } as ActionModel);

  staffLogin: StaffLoginModel = {} as StaffLoginModel;

  // ── Filters ───────────────────────────────────────────
  searchQuery       = '';
  filterDestination = '';
  activeTab         = 'all';

  // ── Table ─────────────────────────────────────────────
  displayedColumns = ['id', 'contact', 'details', 'team', 'tags', 'status', 'actions'];
  dataSource       = new MatTableDataSource<Trip>([]);

  // ── Tabs ──────────────────────────────────────────────
  tabs: Tab[] = [
    { key: 'all',       label: 'All'         },
    { key: 'new',       label: 'New Query'   },
    { key: 'progress',  label: 'In Progress' },
    { key: 'hold',      label: 'On Hold'     },
    { key: 'converted', label: 'Converted'   },
    { key: 'ontrip',    label: 'On Trip'     },
    { key: 'past',      label: 'Past Trips'  },
    { key: 'canceled',  label: 'Canceled'    },
    { key: 'dropped',   label: 'Dropped'     },
  ];

  // ── Derived ───────────────────────────────────────────
  destinations = computed(() =>
    [...new Set(this.allTrips().map(t => t.destination))].sort()
  );

  constructor(
    private service:      AppService,
    private toastr:       ToastrService,
    private localService: LocalService,
    private router:       Router,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────
  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validateMenu();
    this.loadTrips();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort      = this.sort;
    this.dataSource.paginator = this.paginator;

    // Custom filter: tab + destination + text search
    this.dataSource.filterPredicate = (row: Trip, filter: string) => {
      const f        = JSON.parse(filter);
      const matchTab = f.tab === 'all' || row.status === f.tab;
      const matchDest = !f.dest || row.destination === f.dest;
      const q        = f.q.toLowerCase();
      const matchQ   = !q
        || row.id.toString().includes(q)
        || row.agencyName.toLowerCase().includes(q)
        || row.contactName.toLowerCase().includes(q)
        || row.destination.toLowerCase().includes(q)
        || row.phone.includes(q);
      return matchTab && matchDest && matchQ;
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
    this.loading.set(true);
    this.service.validiateMenu(obj).subscribe({
      next: (response: any) => {
        this.action.set({
          ...this.loadData.validiateMenu(response, this.toastr, this.router)
        });
        // Add delete column if permitted
        if (this.action().CanDelete &&
            !this.displayedColumns.includes('delete')) {
          this.displayedColumns = [
            'id', 'contact', 'details', 'team',
            'tags', 'status', 'delete', 'actions'
          ];
        }
        this.loading.set(false);
      },
      error: () => {
        this.toastr.error('Error while fetching menu');
        this.loading.set(false);
      }
    });
  }

  // ── Load trips (replace with real API) ───────────────
  loadTrips(): void {
    // this.loading.set(true);
    // const obj: RequestModel = {
    //   request: this.localService.encrypt(JSON.stringify({})).toString()
    // };
    // this.service.getTripList(obj).subscribe({
    //   next: (r1: any) => {
    //     if (r1.Message === ConstantData.SuccessMessage) {
    //       this.allTrips.set(r1.TripList);
    //       this.dataSource.data = this.allTrips();
    //       this.applyFilter();
    //     } else {
    //       this.toastr.error(r1.Message);
    //     }
    //     this.loading.set(false);
    //   },
    //   error: () => {
    //     this.toastr.error('Error while fetching trips');
    //     this.loading.set(false);
    //   }
    // });
  }

  // ── Filters ───────────────────────────────────────────
applyFilter(): void {
  this.dataSource.filter = JSON.stringify({
    tab:  this.activeTab,
    dest: this.filterDestination,
    q:    this.searchQuery.trim(),
  });
  if (this.paginator) this.paginator.firstPage();
}

  onSortChange(_e: Sort): void { /* handled by MatSort */ }

  // ── Status helpers ────────────────────────────────────
  getStatusLabel(status: string): string {
    return STATUS_MAP[status]?.label ?? status;
  }

  getStatusClass(status: string): string {
    return STATUS_MAP[status]?.cls ?? 'bg-secondary';
  }

  // ── Row actions ───────────────────────────────────────
  openTripDetail(row: Trip): void {
    this.router.navigate(['/admin/trips', row.id]);
  }

  editTrip(row: Trip): void {
    this.router.navigate(['/admin/trips/edit', row.id]);
  }

  deleteTrip(row: Trip): void {
    if (!confirm(`Are you sure you want to delete trip #${row.id}?`)) return;
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ TripId: row.id })
      ).toString()
    };
    this.loading.set(true);
  //   this.service.deleteTrip(obj).subscribe({
  //     next: (r1: any) => {
  //       if (r1.Message === ConstantData.SuccessMessage) {
  //         this.toastr.success('Deleted successfully');
  //         this.allTrips.update(list => list.filter(t => t.id !== row.id));
  //         this.dataSource.data = this.allTrips();
  //         this.applyFilter();
  //       } else {
  //         this.toastr.error(r1.Message);
  //       }
  //       this.loading.set(false);
  //     },
  //     error: () => {
  //       this.toastr.error('Error occurred while deleting');
  //       this.loading.set(false);
  //     }
  //   });
  // }

  // openAddDialog(): void {
  //   this.router.navigate(['/admin/trips/add']);
  }
  // ── Add this method + update applyFilter ──────────────────

setTab(key: string): void {
  this.activeTab = key;
  this.applyFilter();
}

getTabCount(key: string): number {
  if (key === 'all') return this.allTrips().length;
  return this.allTrips().filter(t => t.status === key).length;
}


}
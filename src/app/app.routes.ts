import { Routes } from '@angular/router';
import { AdminDashboard } from './admin/admin-dashboard/admin-dashboard';
import { AdminMaster } from './admin/admin-master/admin-master';
import { AdminLogin } from './admin/admin-login/admin-login';
import { Company } from './admin/company/company';
import { PageGroup } from './admin/page-group/page-group';
import { Page } from './admin/page/page';
import { Role } from './admin/role/role';
import { Menu } from './admin/menu/menu';
import { RoleMenu } from './admin/role-menu/role-menu';
import { Staff } from './admin/staff/staff';
import { StaffLogin } from './admin/staff-login/staff-login';
import { Designation } from './admin/designation/designation';
import { Department } from './admin/department/department';
import { State } from './admin/state/state';
import { ChangePassword } from './admin/change-password/change-password';
import { Destination } from './admin/destination/destination';
import { Location } from './admin/location/location';
import { RoomType } from './admin/room-type/room-type';
import { HotelCategory } from './admin/hotel-category/hotel-category';
import { Hotel } from './admin/hotel/hotel';
import { HotelRate } from './admin/hotel-rate/hotel-rate';
import { HotelRatelist } from './admin/hotel-ratelist/hotel-ratelist';
import { ExtraCharge } from './admin/extra-charge/extra-charge';
import { Progress } from './component/progress/progress';
import { SpecialInclusionType } from './admin/special-inclusion-type/special-inclusion-type';
import { SpecialInclusion } from './admin/special-inclusion/special-inclusion';
import { ActivityService } from './admin/activity-service/activity-service';
import { ActivityServiceRate } from './admin/activity-service-rate/activity-service-rate';
import { VehicleType } from './admin/vehicle-type/vehicle-type';
import { IteneraryService } from './admin/itenerary-service/itenerary-service';
import { InclusionExclusion } from './admin/inclusion-exclusion/inclusion-exclusion';
import { TermCondition } from './admin/term-condition/term-condition';
export const routes: Routes = [
// 👉 First Page = Login
  { path: '', redirectTo: 'admin-login', pathMatch: 'full' },

  { path: 'admin-login', component: AdminLogin },

  // 👉 Protected Area
  {
    path: 'admin',
    component: AdminMaster,
    children: [
      { path: '', redirectTo: 'admin-dashboard', pathMatch: 'full' },
      { path: 'admin-dashboard', component: AdminDashboard },
      { path: 'company', component: Company},
      { path: 'page-group', component: PageGroup},
      { path: 'page', component: Page},
      { path: 'role', component: Role},
      { path: 'menu', component: Menu},
      { path: 'role-menu', component: RoleMenu},
      { path: 'staff', component: Staff},
      { path: 'staff-login', component: StaffLogin},
      { path: 'designation', component: Designation},
      { path: 'department', component: Department },
      { path: 'state', component: State},
      { path: 'change-password', component: ChangePassword},
      { path: 'destination', component: Destination},
      { path: 'location', component: Location},
      { path: 'room-type', component: RoomType},
      { path: 'hotel-category', component: HotelCategory},
      { path: 'hotel', component: Hotel},
      { path: 'hotel-rate', component: HotelRate},
      { path: 'hotel-ratelist', component: HotelRatelist},
      { path: 'extra-charge', component: ExtraCharge},
      { path: 'progress', component: Progress},
      { path: 'special-inclusion-type', component: SpecialInclusionType},
      { path: 'special-inclusion', component: SpecialInclusion},
      { path: 'activity-service', component: ActivityService},
      { path: 'activity-service-rate', component: ActivityServiceRate},
      { path: 'vehicle-type', component: VehicleType},
      { path: 'itenerary-service', component: IteneraryService},
      { path: 'inclusion-exclusion', component: InclusionExclusion},
      { path: 'term-condition', component: TermCondition},
    ]
  },

  { path: '**', redirectTo: 'admin-login' }
];
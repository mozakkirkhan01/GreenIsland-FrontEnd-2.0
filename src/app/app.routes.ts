import { Routes } from '@angular/router';
import { AdminDashboard } from './admin/admin-dashboard/admin-dashboard';
import { AdminMaster } from './admin/admin-master/admin-master';
import { AdminLogin } from './admin/admin-login/admin-login';
import { Company } from './admin/company/company';
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
    //   { path: 'designation', component: DesignationComponent },
    //   { path: 'department', component: DepartmentComponent },
    //   { path: 'staff', component: StaffComponent },
    //   { path: 'company', component: CompanyComponent }
    ]
  },

  { path: '**', redirectTo: 'admin-login' }
];
// admin-login.ts

import { Component, inject, signal } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { Status } from '../../utils/enum';
import { RequestModel } from '../../utils/interface';
import { Progress } from '../../component/progress/progress';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    Progress,
  ],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.css',
})
export class AdminLogin {

  // ── DI via inject() (matches Location component style) ───
  private service      = inject(AppService);
  private toastr       = inject(ToastrService);
  private localService = inject(LocalService);
  private router       = inject(Router);

  // ── State ─────────────────────────────────────────────────
  dataLoading = signal(false);
  submitted   = signal(false);
  hidePassword = signal(true);
  Staff: any  = {};
  Company: any = {};

  readonly currentYear = new Date().getFullYear();

  // ── Lifecycle ─────────────────────────────────────────────
  ngOnInit(): void {
    this.getCompanyList();
  }

  // ── Helpers ───────────────────────────────────────────────
  togglePassword(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  resetForm(form?: NgForm): void {
    if (form) form.reset();
    this.Staff     = {};
    this.submitted.set(false);
  }

  // ── API calls ─────────────────────────────────────────────
  getCompanyList() {
    var request: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ Status: Status.Active })).toString()
    }
    this.dataLoading.set(true);
    this.service.getCompanyList(request).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.Company = response.CompanyList[0];
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading.set(false);
    }, (err => {
      this.toastr.error("Error while fetching records")
    }))
  }

  staffLogin(form: NgForm): void {
    this.submitted.set(true);

    if (form.invalid) {
      this.toastr.error('Fill all the Required Fields.', 'Invalid Form');
      return;
    }

    const request: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify(this.Staff)
      ).toString()
    };

    this.dataLoading.set(true);
    this.service.StaffLogin(request).subscribe({
      next: (r1: any) => {
        if (r1.Message === ConstantData.SuccessMessage) {
          this.toastr.success('Login Successful.');
          this.localService.setEmployeeDetail(r1.UserDetail);
          this.router.navigate(['/admin/admin-dashboard']);
        } else {
          this.toastr.error(r1.Message);
          this.dataLoading.set(false);
        }
      },
      error: () => {
        this.toastr.error('Error occurred while fetching data.');
        this.dataLoading.set(false);
      }
    });
  }
}
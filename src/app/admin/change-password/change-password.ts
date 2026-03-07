import { Component, ViewChild } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { RequestModel, StaffLoginModel } from '../../utils/interface';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './change-password.html',
  styleUrls: ['./change-password.css']
})
export class ChangePassword {
  dataLoading: boolean = false;
  hideCurrentPassword: boolean = true;
  hideNewPassword: boolean = true;
  hideNewConfirmPassword: boolean = true;
  StaffLogin: any = {};
  staffLogin: StaffLoginModel = {} as StaffLoginModel;

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private localService: LocalService,
  ) {}

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.resetForm();
  }

  @ViewChild('formStaffLogin') formStaffLogin!: NgForm;

  resetForm() {
    this.StaffLogin = {};
    if (this.formStaffLogin) {
      this.formStaffLogin.control.markAsPristine();
      this.formStaffLogin.control.markAsUntouched();
    }
  }

  changePassword() {
    this.formStaffLogin.control.markAllAsTouched();
    if (this.formStaffLogin.invalid) {
      this.toastr.error("Fill all the required fields !!");
      return;
    }
    if (this.StaffLogin.NewPassword != this.StaffLogin.NewConfirmPassword) {
      this.toastr.error("Password Mismatched !!");
      return;
    }
    this.StaffLogin.Id = this.staffLogin.StaffLoginId;
    var request: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.StaffLogin)).toString()
    };
    this.dataLoading = true;
    this.service.changePassword(request).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.toastr.success("Login Password changed successfully");
        this.resetForm();
      } else {
        this.toastr.error(response.Message);
      }
      this.dataLoading = false;
    }, err => {
      this.toastr.error("Error occured while submitting data");
      this.dataLoading = false;
    });
  }
}
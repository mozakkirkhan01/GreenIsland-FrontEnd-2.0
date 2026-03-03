import { Component, viewChild } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { Status } from '../../utils/enum';
import { appConfig } from '../../app.config';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RequestModel, ActionModel } from '../../utils/interface';
import { LoadDataService } from '../../utils/load-data.service';
import { ViewChild } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
declare var $: any;

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, FormsModule, MatInputModule, MatIconModule,
    CommonModule, MatButtonModule, MatSelectModule,],
  templateUrl: './company.html',
  styleUrl: './company.css',
})
export class Company {
  dataLoading: boolean = false
  Company: any = {}
  StatusList : any[] = [];
  isSubmitted = false
  AllStatusList = Status;
  PageSize = ConstantData.PageSizes;
  p: number = 1;
  Search: string = '';
  reverse: boolean = false;
  sortKey: string = '';
  itemPerPage: number = this.PageSize[0];
  userDetail: any = {};
  action: ActionModel = {} as ActionModel;
  imageUrl = ConstantData.getBaseUrl();

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private localService: LocalService,
    private loadData: LoadDataService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.userDetail = this.localService.getEmployeeDetail();
    this.StatusList = this.loadData.GetEnumList(Status);
    this.validiateMenu();
    this.getCompanyList();
    this.resetForm();
  }

  validiateMenu() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ Url: this.router.url, StaffLoginId: this.userDetail.StaffLoginId })).toString()
    }
    this.dataLoading = true
    this.service.validiateMenu(obj).subscribe((response: any) => {
      this.action = this.loadData.validiateMenu(response, this.toastr, this.router)
      this.dataLoading = false;
    }, (err => {
      this.toastr.error("Error while fetching records")
      this.dataLoading = false;
    }))
  }


  sort(key: any) {
    this.sortKey = key;
    this.reverse = !this.reverse;
  }

  @ViewChild('formCompany') formCompany!: NgForm;
  resetForm() {
    // this.Company = { };
    if (this.formCompany) {
      this.formCompany.control.markAsPristine();
      this.formCompany.control.markAsUntouched();
    }
    this.isSubmitted = false
  }

  LogoPNGPhoto: string | null = null;
  LogoPhoto: string | null = null;

  getCompanyList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    }
    this.dataLoading = true
    this.service.getCompanyList(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        if (response.CompanyList.length > 0) {
          this.Company = response.CompanyList[0];
          this.LogoPNGPhoto = this.imageUrl + this.Company.LogoPNG;
          this.LogoPhoto = this.imageUrl + this.Company.Logo;
        }
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false
    }, (err => {
      this.toastr.error("Error while fetching records")
    }))
  }

  setLogoPNGFile(event: any) {
    var file: File = event.target.files[0];
    if (file.type != 'image/jpeg' && file.type != 'image/jpg' && file.type != 'image/png') {
      this.toastr.error("Invalid file format !!");
      this.Company.LogoPNGFile = null;
      this.Company.LogoPNG = '';
      this.LogoPNGPhoto = this.imageUrl + this.Company.LogoPNG;
      return;
    }
    if (file.size < 512000) {
      var reader = new FileReader();
      reader.readAsDataURL(file);
      reader.addEventListener('load', (e1: any) => {
        var dataUrl = e1.target.result;
        var base64Data: string = dataUrl.substr(dataUrl.indexOf('base64,') + 'base64,'.length);
        this.Company.LogoPNG = base64Data;
        this.LogoPNGPhoto = `data:image/png;base64,${base64Data}`;
      });

    } else {
      this.Company.LogoPNG = '';
      this.Company.LogoPNGFile = null;
      this.LogoPNGPhoto = this.imageUrl + this.Company.LogoPNG;
      this.toastr.error("File size should be less than 500 KB.");
    }

  }

  setLogoFile(event: any) {
    var file: File = event.target.files[0];
    if (file.type != 'image/jpeg' && file.type != 'image/jpg' && file.type != 'image/png') {
      this.toastr.error("Invalid file format !!");
      this.Company.LogoFile = null;
      this.Company.Logo = '';
      this.LogoPhoto = this.imageUrl + this.Company.Logo;
      return;
    }
    if (file.size < 512000) {
      var reader = new FileReader();
      reader.readAsDataURL(file);
      reader.addEventListener('load', (e1: any) => {
        var dataUrl = e1.target.result;
        var base64Data: string = dataUrl.substr(dataUrl.indexOf('base64,') + 'base64,'.length);
        this.Company.Logo = base64Data;
        this.LogoPhoto = `data:image/jpeg;base64,${base64Data}`;
      });

    } else {
      this.Company.Logo = '';
      this.Company.LogoFile = null;
      this.LogoPhoto = this.imageUrl + this.Company.Logo;
      this.toastr.error("File size should be less than 500 KB.");
    }

  }

  saveCompany() {
    this.formCompany.control.markAllAsTouched();
    this.isSubmitted = true
    if (this.formCompany.invalid) {
      this.toastr.error("Fill all the required fields !!")
      return
    }
    this.Company.UpdatedBy = this.userDetail.StaffLoginId;
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.Company)).toString()
    }
    this.dataLoading = true;
    this.service.saveCompany(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        if (this.Company.CompanyId > 0) {
          this.toastr.success("Company Updated successfully")
          $('#modal_popup').modal('hide')
        } else {
          this.toastr.success("Company added successfully")
        }
        this.resetForm()
        this.getCompanyList()
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false;
    }, (err => {
      this.toastr.error("Error occured while submitting data")
      this.dataLoading = false;
    }))
  }

  deleteCompany(obj: any) {
    if (confirm("Are your sure you want to delete this recored")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      }
      this.dataLoading = true;
      this.service.deleteCompany(request).subscribe(r1 => {
        let response = r1 as any
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Record Deleted successfully")
          this.getCompanyList()
        } else {
          this.toastr.error(response.Message)
        }
        this.dataLoading = false;
      }, (err => {
        this.toastr.error("Error occured while deleteing the recored")
        this.dataLoading = false;
      }))
    }
  }

  editCompany(obj: any) {
    this.resetForm()
    this.Company = obj;
    $('#modal_popup').modal('show');
  }
}

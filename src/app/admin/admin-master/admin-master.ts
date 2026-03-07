import { Component, HostListener, Inject, OnInit,  } from '@angular/core';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { RequestModel, StaffLoginModel } from '../../utils/interface';
import { ConstantData } from "../../utils/constant-data";
import { Status } from '../../utils/enum';
import { ToastrService } from 'ngx-toastr';
declare var bootstrap: any;
import { ChangeDetectorRef } from '@angular/core';
@Component({
  selector: 'app-admin-master',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './admin-master.html',
  styleUrls: ['./admin-master.css']
})
export class AdminMaster implements OnInit {

  IsMenuShow = true;
  dataLoading: boolean = false;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;
  imageUrl: string = '';

  screenWidth: any;
  docElm: any;

  constructor(
    @Inject(DOCUMENT) private document: any,
    private localService: LocalService,
    private router: Router,
    private service: AppService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    console.log("AdminMaster Initialized");
    this.staffLogin = this.localService.getEmployeeDetail();
    if (!this.staffLogin || !this.staffLogin.StaffLoginId) {
      this.router.navigate(['/admin-login']);
      return; // STOP execution
    }
    this.screenWidth = window.innerWidth;
    this.docElm = this.document.documentElement;
    this.imageUrl = this.service.getImageUrl();

    this.getUserMenuList();   // call AFTER validation
    this.getCompanyList();
  }
  
  Company: any = {};
  getCompanyList() {
    var request: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ Status: Status.Active })).toString()
    }
    this.dataLoading = true
    this.service.getCompanyList(request).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        if (response.CompanyList.length != 0)
          this.Company = response.CompanyList[0];
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false;
      this.cdr.detectChanges();  // ← ADD THIS LINE
    }, (err => {
      this.toastr.error("Error while fetching records")
    }))
  }

  isFullScreen: boolean = false;
  fullScreen() {
    if (!this.isFullScreen) {
      if (this.docElm.requestFullscreen) {
        this.docElm.requestFullscreen();
      } else if (this.docElm.mozRequestFullScreen) {
        this.docElm.mozRequestFullScreen();
      } else if (this.docElm.webkitRequestFullScreen) {
        this.docElm.webkitRequestFullScreen();
      } else if (this.docElm.msRequestFullscreen) {
        this.docElm.msRequestFullscreen();
      }
      this.isFullScreen = true;
    } else {
      if (this.document.exitFullscreen) {
        this.document.exitFullscreen();
      } else if (this.document.webkitExitFullscreen) {
        this.document.webkitExitFullscreen();
      } else if (this.document.mozCancelFullScreen) {
        this.document.mozCancelFullScreen();
      } else if (this.document.msExitFullscreen) {
        this.document.msExitFullscreen();
      }
      this.isFullScreen = false;
    }
  }
  activeMenu: any = null;

  toggleMenu(menuId: any) {
    this.activeMenu = this.activeMenu === menuId ? null : menuId;
  }

  closeMenu() {
    this.activeMenu = null;
  }
  MenuList: any[] = [];
  getUserMenuList() {
    var request: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ StaffLoginId: this.staffLogin.StaffLoginId })
      ).toString()
    }

    this.dataLoading = true

    this.service.getUserMenuList(request).subscribe(r1 => {

      let response = r1 as any

      if (response.Message == ConstantData.SuccessMessage) {
        this.MenuList = response.MenuList;
        this.cdr.detectChanges();
      } else {
        this.toastr.error(response.Message)
      }

      this.dataLoading = false

    }, (err => {
      this.toastr.error("Error while fetching records")
    }))
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.screenWidth = window.innerWidth;
  }

  logOut() {
    this.localService.removeEmployeeDetail();
    this.router.navigate(['/admin-login']);
  }


  initializeDropdowns() {
    const dropdownElementList = [].slice.call(
      document.querySelectorAll('.dropdown-toggle')
    );

    dropdownElementList.map(function (dropdownToggleEl: any) {
      return new bootstrap.Dropdown(dropdownToggleEl);
    });
  }
}
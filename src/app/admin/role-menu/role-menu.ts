import { Component, ViewChild, ChangeDetectorRef } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { Status } from '../../utils/enum';
import { LoadDataService } from '../../utils/load-data.service';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { FilterPipe } from '../../utils/filter-pipe';
import { Progress } from '../../component/progress/progress';

@Component({
  selector: 'app-role-menu',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatIconModule,
    MatDividerModule,
    FilterPipe,
    Progress,
  ],
  templateUrl: './role-menu.html',
  styleUrls: ['./role-menu.css']
})
export class RoleMenu {
  dataLoading: boolean = false;
  RoleMenu: any = {};
  isSubmitted = false;
  PageSizes = ConstantData.PageSizes;
  RoleList: any[] = [];
  AllRoleMenuList: any[] = [];
  filterRole: any[] = [];
  action: ActionModel = {} as ActionModel;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;
  Search: any = null;
  StatusList : any[] = [];

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private localService: LocalService,
    private loadData: LoadDataService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.StatusList = this.loadData.GetEnumList(Status);
    this.validiateMenu();
    this.getRoleList();
    this.route.paramMap.subscribe((params1: any) => {
      var id = params1.get('id');
      if (id) {
        this.RoleMenu.RoleId = id;
        this.getRoleMenuList({ id: id });
      }
    });
  }

  validiateMenu() {
    var urls = this.router.url.split("/");
    var obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({
          Url: `/${urls[1]}` + `/${urls[2]}`,
          StaffLoginId: this.staffLogin.StaffLoginId
        })
      ).toString()
    };
    this.dataLoading = true;
    this.service.validiateMenu(obj).subscribe((response: any) => {
      this.action = this.loadData.validiateMenu(response, this.toastr, this.router);
      this.dataLoading = false;
      this.cdr.detectChanges();
    }, err => {
      this.toastr.error("Error while fetching records");
      this.dataLoading = false;
    });
  }

  @ViewChild('formRoleMenu') formRoleMenu!: NgForm;

  resetForm() {
    this.RoleMenu = {};
    this.AllRoleMenuList = [];
    if (this.formRoleMenu) {
      this.formRoleMenu.control.markAsPristine();
      this.formRoleMenu.control.markAsUntouched();
    }
    this.isSubmitted = false;
    this.filterRoleList(null);
  }

  filterRoleList(value: any) {
    if (value) {
      const filterValue = value.toLowerCase();
      this.filterRole = this.RoleList.filter((option: any) =>
        option.RoleTitle.toLowerCase().includes(filterValue)
      );
    } else {
      this.filterRole = this.RoleList;
    }
  }

  getRoleList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading = true;
    this.service.getRoleList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.RoleList = response.RoleList;
        this.filterRoleList(null);
        if (this.RoleMenu.RoleId)
          this.RoleMenu.RoleTitle = this.RoleList.filter(
            x => x.RoleId == this.RoleMenu.RoleId
          )[0].RoleTitle;
      } else {
        this.toastr.error(response.Message);
      }
      this.dataLoading = false;
    }, err => {
      this.toastr.error("Error while fetching Role list");
      this.dataLoading = false;
    });
  }

  selectAllMenu(pageGroup: any) {
    pageGroup.RoleMenuList.forEach((e1: any) => {
      if (pageGroup.IsSelectAll) {
        e1.IsSelected = true;
        e1.CanEdit = true;
        e1.CanDelete = true;
        e1.CanCreate = true;
      } else {
        e1.IsSelected = false;
        e1.CanEdit = false;
        e1.CanDelete = false;
        e1.CanCreate = false;
      }
    });
  }

  selectMenu(e1: any) {
    if (e1.IsSelected) {
      e1.CanEdit = true;
      e1.CanDelete = true;
      e1.CanCreate = true;
    } else {
      e1.CanEdit = false;
      e1.CanDelete = false;
      e1.CanCreate = false;

    }
  }

  getRoleMenuList(option: any) {
    this.RoleMenu.RoleId = option.id;
    var obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ RoleId: this.RoleMenu.RoleId, Status: 1 })
      ).toString()
    };
    this.dataLoading = true;
    this.service.getRoleMenuList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.AllRoleMenuList = response.AllRoleMenuList;
        this.cdr.detectChanges();
      } else {
        this.toastr.error(response.Message);
      }
      this.dataLoading = false;
    }, err => {
      this.toastr.error("Error while fetching records");
      this.dataLoading = false;
    });
  }

  saveRoleMenu() {
    var RoleMenuList: any[] = [];
    this.AllRoleMenuList.forEach((e1: any) => {
      e1.RoleMenuList.forEach((e2: any) => {
        RoleMenuList.push(e2);
      });
    });
    var obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({
          RoleId: this.RoleMenu.RoleId,
          StaffLoginId: this.staffLogin.StaffLoginId,
          RoleMenuList: RoleMenuList
        })
      ).toString()
    };
    this.dataLoading = true;
    this.service.saveRoleMenu(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.toastr.success(this.RoleMenu.RoleMenuId > 0
          ? "Role Menu updated successfully"
          : "Role Menu added successfully");
        this.resetForm();
      this.cdr.detectChanges();

      } else {
        this.toastr.error(response.Message);
      }
      this.dataLoading = false;
    }, err => {
      this.toastr.error("Error occured while submitting data");
      this.dataLoading = false;
      this.cdr.detectChanges();

    });
  }
}
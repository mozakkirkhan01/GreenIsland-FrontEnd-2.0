import { Component, ViewChild, ChangeDetectorRef, inject } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { Status } from '../../utils/enum';
import { LoadDataService } from '../../utils/load-data.service';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { FilterPipe } from '../../utils/filter-pipe';

@Component({
  selector: 'app-menu',
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
    FilterPipe,
  ],
  templateUrl: './menu.html',
  styleUrls: ['./menu.css']
})
export class Menu {
  dataLoading: boolean = false;
  MenuList: any = [];
  Menu: any = {};
  isSubmitted = false;
  loadData = inject(LoadDataService);
  StatusList = this.loadData.GetEnumList(Status);
  filterPage: any[] = [];
  PageList: any[] = [];
  ParentMenuId: any = null;
  action: ActionModel = {} as ActionModel;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;
  Search: any = null;
  showModal: boolean = false;

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private localService: LocalService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.getMenuList();
    this.getPageList();
  }

  validiateMenu() {
    var obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({ Url: this.router.url, StaffLoginId: this.staffLogin.StaffLoginId })
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

  @ViewChild('formMenu') formMenu!: NgForm;

  resetForm() {
    this.Menu = { Status: 1 };
    if (this.formMenu) {
      this.formMenu.control.markAsPristine();
      this.formMenu.control.markAsUntouched();
    }
    this.isSubmitted = false;
  }

  openModal() {
    this.resetForm();
    this.showModal = true;
  }

  closeModal() {
    this.resetForm();
    this.showModal = false;
  }

  filterPageList(value: any) {
    if (value) {
      const filterValue = value.toLowerCase();
      this.filterPage = this.PageList.filter((option: any) =>
        option.PageName.toLowerCase().includes(filterValue)
      );
    } else {
      this.filterPage = this.PageList;
    }
  }

  getPageList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading = true;
    this.service.getPageList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.PageList = response.PageList;
        this.filterPage = this.PageList;
      } else {
        this.toastr.error(response.Message);
      }
      this.dataLoading = false;
    }, err => {
      this.toastr.error("Error while fetching records");
      this.dataLoading = false;
    });
  }
  openMenus = new Set<number>();

  toggleOpen(menuId: number) {
    if (this.openMenus.has(menuId)) {
      this.openMenus.delete(menuId);
    } else {
      this.openMenus.add(menuId);
    }
  }

  getMenuList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading = true;
    this.service.getMenuList(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.MenuList = response.MenuList;
        // open all by default
        this.MenuList.forEach((m: any) => this.openMenus.add(m.MenuId));
        setTimeout(() => this.cdr.detectChanges(), 0);
      } else {
        this.toastr.error(response.Message);
      }
      this.dataLoading = false;
    }, err => {
      this.toastr.error("Error while fetching records");
      this.dataLoading = false;
    });
  }

  saveMenu() {
    this.formMenu.control.markAllAsTouched();
    this.isSubmitted = true;
    if (this.formMenu.invalid) {
      this.toastr.error("Fill all the required fields !!");
      return;
    }
    this.Menu.UpdatedBy = this.staffLogin.StaffLoginId;
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.Menu)).toString()
    };
    this.dataLoading = true;
    this.service.saveMenu(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        if (this.Menu.MenuId > 0) {
          this.toastr.success("Menu updated successfully");
          this.closeModal();
        } else {
          this.toastr.success("Menu added successfully");
          this.Menu.PageName = null;
          this.Menu.MenuTitle = null;
          this.formMenu.control.markAsPristine();
          this.formMenu.control.markAsUntouched();
        }
        this.cdr.detectChanges();
        this.getMenuList();
      } else {
        this.toastr.error(response.Message);
        this.dataLoading = false;
      }
    }, err => {
      this.toastr.error("Error occured while submitting data");
      this.dataLoading = false;
      this.cdr.detectChanges();

    });
  }

  deleteMenu(obj: any) {
    if (confirm("Are you sure you want to delete this record?")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      };
      this.dataLoading = true;
      this.service.deleteMenu(request).subscribe(r1 => {
        let response = r1 as any;
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Record deleted successfully");
          this.getMenuList();
        } else {
          this.toastr.error(response.Message);
          this.dataLoading = false;
        }
      }, err => {
        this.toastr.error("Error occured while deleting the record");
        this.dataLoading = false;
      });
    }
  }

  menuDown(obj: any) {
    var data: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(obj)).toString()
    };
    this.dataLoading = true;
    this.service.menuDown(data).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.toastr.success("Success");
        this.getMenuList();
      } else {
        this.toastr.error(response.Message);
        this.dataLoading = false;
      }
    }, err => {
      this.toastr.error("Error occured while updating the record");
      this.dataLoading = false;
    });
  }

  menuUp(obj: any) {
    var data: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(obj)).toString()
    };
    this.dataLoading = true;
    this.service.menuUp(data).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        this.toastr.success("Success");
        this.getMenuList();
      } else {
        this.toastr.error(response.Message);
        this.dataLoading = false;
      }
    }, err => {
      this.toastr.error("Error occured while updating the record");
      this.dataLoading = false;
    });
  }

  editMenu(obj: any) {
    this.Menu = { ...obj };
    this.showModal = true;
  }
}
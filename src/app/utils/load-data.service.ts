import { Injectable, ElementRef } from '@angular/core';
import * as XLSX from 'xlsx';
import { ActionModel, KeyValueModel } from './interface';
import { ConstantData } from './constant-data';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class LoadDataService {

  constructor() { }

  
  replaceSpecialCharacter(value: string): string {
    value = value.replaceAll("+", "74512541");
    value = value.replaceAll("/", "01245124");
    value = value.replaceAll("&", "74512025");
    return value;
  }

  restoreSpecialCharacter(value: string): string {
    value = value.replaceAll("74512541", "+");
    value = value.replaceAll("01245124", "/");
    value = value.replaceAll("74512025", "&");
    return value;
  }

  validiateMenu(response: any, toastr: any, router: Router): ActionModel {
    var action: ActionModel = {} as ActionModel;
    if (response.Message == ConstantData.SuccessMessage) {
      action = response.Action;
      action.ResponseReceived = true;
    } else if (response.Message == ConstantData.AccessDenied) {
      toastr.error(response.Message);
      router.navigate(["page-not-found"]);
    } else {
      toastr.error(response.Message)
      router.navigate(["page-not-found"]);
    }
    return action;
  }

  GetEnumList(obj: any) {
    let list: KeyValueModel[] = [];
    for (var n in obj) {
      if (typeof obj[n] === 'number') {
        list.push({ Key: <any>obj[n], Value: n.replace(/([A-Z])/g, ' $1').trim() });
      }
    }
    return list;
  }


  exportToExcel(table_1: ElementRef, excelName: string) {
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(
      table_1.nativeElement
    );

    // /* new format */
    // var fmt = "0.00";
    // /* change cell format of range B2:D4 */
    // var range = { s: { r: 1, c: 1 }, e: { r: 2, c: 100000 } };
    // for (var R = range.s.r; R <= range.e.r; ++R) {
    //   for (var C = range.s.c; C <= range.e.c; ++C) {
    //     var cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
    //     if (!cell || cell.t != "n") continue; // only format numeric cells
    //     cell.z = fmt;
    //   }
    // }
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    var fmt = "@";
    wb.Sheets["Sheet1"]["F"] = fmt;

    /* save to file */
    XLSX.writeFile(wb, excelName + ".xlsx");
  }

  round(value: number, NoOfDecimals?: number) {
    var multiflyFactor: number = 1;
    if (NoOfDecimals != null) {
      for (let i = 0; i < NoOfDecimals; i++) {
        multiflyFactor *= 10;
      }
      value = value * multiflyFactor;
    }
    if (value - Math.floor(value) >= 0.5) {
      return Math.ceil(value) / multiflyFactor;
    } else {
      return Math.floor(value) / multiflyFactor;
    }
  }

  loadDate(date: any) {
    if (date == null || date == undefined)
      return null;
    else
      return new Date(date);
  }

  loadDateYMD(date: any) {
    if (date == null || date == undefined)
      return null;
    var d = new Date(date);
    var dformat = [
      d.getFullYear(),
      ("0" + (d.getMonth() + 1)).slice(-2),
      ("0" + d.getDate()).slice(-2)
    ].join('-');
    return dformat;
  }

  loadDateTime(date: any) {
    if (date == null || date == undefined)
      return null;
    var d = new Date(date);
    var dformat = [
      d.getFullYear(),
      ("0" + (d.getMonth() + 1)).slice(-2),
      ("0" + d.getDate()).slice(-2)
    ].join('-')
      + ' ' +
      [d.getHours(),
      d.getMinutes(),
      d.getSeconds()].join(':');
    return dformat;
  }
  addDays(oldDate: any, days: number) {
    var date = new Date(oldDate);
    date.setDate(date.getDate() + days);
    return date;
  }
}

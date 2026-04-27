import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { ConstantData } from './constant-data';

@Injectable({
  providedIn: 'root'
})
export class AppService {
  private readonly apiUrl: string = ConstantData.getApiUrl();
  private readonly baseUrl: string = ConstantData.getBaseUrl();
  private readonly headers: HttpHeaders = new HttpHeaders({ 'AppKey': ConstantData.getAdminKey() });

  constructor(private http: HttpClient) {
  }

  getImageUrl(): string {
    return ConstantData.getBaseUrl();
  }

  // District
  getDistrictList(obj: any) {
    return this.http.post(this.apiUrl + "District/DistrictList", obj, { headers: this.headers })
  }

  saveDistrict(obj: any) {
    return this.http.post(this.apiUrl + "District/saveDistrict", obj, { headers: this.headers })
  }

  deleteDistrict(obj: any) {
    return this.http.post(this.apiUrl + "District/deleteDistrict", obj, { headers: this.headers })
  }

  // Company
  getCompanyList(obj: any) {
    return this.http.post(this.apiUrl + "Company/CompanyList", obj, { headers: this.headers })
  }

  saveCompany(obj: any) {
    return this.http.post(this.apiUrl + "Company/saveCompany", obj, { headers: this.headers })
  }

  deleteCompany(obj: any) {
    return this.http.post(this.apiUrl + "Company/deleteCompany", obj, { headers: this.headers })
  }

  // Designation 
  getDesignationList(obj: any) {
    return this.http.post(this.apiUrl + "Designation/DesignationList", obj, { headers: this.headers })
  }

  saveDesignation(obj: any) {
    return this.http.post(this.apiUrl + "Designation/saveDesignation", obj, { headers: this.headers })
  }

  deleteDesignation(obj: any) {
    return this.http.post(this.apiUrl + "Designation/deleteDesignation", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  //HotelCategory
  getHotelCategoryList(obj: any) {
    return this.http.post(this.apiUrl + "HotelCategory/HotelCategoryList", obj, { headers: this.headers })
  }

  saveHotelCategory(obj: any) {
    return this.http.post(this.apiUrl + "HotelCategory/saveHotelCategory", obj, { headers: this.headers })
  }

  deleteHotelCategory(obj: any) {
    return this.http.post(this.apiUrl + "HotelCategory/deleteHotelCategory", obj, { headers: this.headers })
  }
  /* ---------------------------------------------------------------------- */

  //SpecialInclusionType
  getSpecialInclusionTypeList(obj: any) {
    return this.http.post(this.apiUrl + "SpecialInclusion/SpecialInclusionTypeList", obj, { headers: this.headers })
  }

  saveSpecialInclusionType(obj: any) {
    return this.http.post(this.apiUrl + "SpecialInclusion/saveSpecialInclusionType", obj, { headers: this.headers })
  }

  deleteSpecialInclusionType(obj: any) {
    return this.http.post(this.apiUrl + "SpecialInclusion/deleteSpecialInclusionType", obj, { headers: this.headers })
  }

  //SpecialInclusion
  getSpecialInclusionList(obj: any) {
    return this.http.post(this.apiUrl + "SpecialInclusion/SpecialInclusionList", obj, { headers: this.headers })
  }

  saveSpecialInclusion(obj: any) {
    return this.http.post(this.apiUrl + "SpecialInclusion/saveSpecialInclusion", obj, { headers: this.headers })
  }

  deleteSpecialInclusion(obj: any) {
    return this.http.post(this.apiUrl + "SpecialInclusion/deleteSpecialInclusion", obj, { headers: this.headers })
  }

  getActivityServiceList(obj: any) {
    return this.http.post(this.apiUrl + "ActivityService/ActivityServiceList", obj, { headers: this.headers });
  }
  saveActivityService(obj: any) {
    return this.http.post(this.apiUrl + "ActivityService/saveActivityService", obj, { headers: this.headers });
  }
  deleteActivityService(obj: any) {
    return this.http.post(this.apiUrl + "ActivityService/deleteActivityService", obj, { headers: this.headers });
  }

  // ActivityServiceRate
  getActivityServiceRateList(obj: any) {
    return this.http.post(this.apiUrl + "ActivityService/ActivityServiceRateList", obj, { headers: this.headers });
  }
  saveActivityServiceRate(obj: any) {
    return this.http.post(this.apiUrl + "ActivityService/saveActivityServiceRate", obj, { headers: this.headers });
  }
  deleteActivityServiceRate(obj: any) {
    return this.http.post(this.apiUrl + "ActivityService/deleteActivityServiceRate", obj, { headers: this.headers });
  }
  // VehicleType
  getVehicleTypeList(obj: any) {
    return this.http.post(this.apiUrl + "VehicleType/VehicleTypeList", obj, { headers: this.headers });
  }
  saveVehicleType(obj: any) {
    return this.http.post(this.apiUrl + "VehicleType/saveVehicleType", obj, { headers: this.headers });
  }
  deleteVehicleType(obj: any) {
    return this.http.post(this.apiUrl + "VehicleType/deleteVehicleType", obj, { headers: this.headers });
  }

  // IteneraryService
  getIteneraryServiceList(obj: any) {
    return this.http.post(this.apiUrl + "IteneraryService/IteneraryServiceList", obj, { headers: this.headers });
  }
  saveIteneraryService(obj: any) {
    return this.http.post(this.apiUrl + "IteneraryService/saveIteneraryService", obj, { headers: this.headers });
  }
  deleteIteneraryService(obj: any) {
    return this.http.post(this.apiUrl + "IteneraryService/deleteIteneraryService", obj, { headers: this.headers });
  }
  getVehicleServiceRateList(obj: any) {
    return this.http.post(this.apiUrl + "IteneraryService/VehicleServiceRateList", obj, { headers: this.headers });
  }
  // ── Inclusion ─────────────────────────────────────────────────────────
  getInclusionList(obj: any) {
    return this.http.post(this.apiUrl + "InclusionExclusion/InclusionList", obj, { headers: this.headers });
  }
  saveInclusionList(obj: any) {
    return this.http.post(this.apiUrl + "InclusionExclusion/saveInclusionList", obj, { headers: this.headers });
  }
  deleteInclusion(obj: any) {
    return this.http.post(this.apiUrl + "InclusionExclusion/deleteInclusion", obj, { headers: this.headers });
  }

  // ─ Exclusion ─────────────────────────────────────────────────────────
  getExclusionList(obj: any) {
    return this.http.post(this.apiUrl + "InclusionExclusion/ExclusionList", obj, { headers: this.headers });
  }
  saveExclusionList(obj: any) {
    return this.http.post(this.apiUrl + "InclusionExclusion/saveExclusionList", obj, { headers: this.headers });
  }
  deleteExclusion(obj: any) {
    return this.http.post(this.apiUrl + "InclusionExclusion/deleteExclusion", obj, { headers: this.headers });
  }

  //────────term-condition
  getTermAndConditionList(obj: any) {
    return this.http.post(this.apiUrl + "TermAndCondition/TermAndConditionList", obj, { headers: this.headers });
  }
  saveTermAndCondition(obj: any) {
    return this.http.post(this.apiUrl + "TermAndCondition/saveTermAndCondition", obj, { headers: this.headers });
  }
  deleteTermAndCondition(obj: any) {
    return this.http.post(this.apiUrl + "TermAndCondition/deleteTermAndCondition", obj, { headers: this.headers });
  }
  //────────term-condition
  getTemplateList(obj: any) {
    return this.http.post(this.apiUrl + "Template/TemplateList", obj, { headers: this.headers });
  }
  saveTemplate(obj: any) {
    return this.http.post(this.apiUrl + "Template/saveTemplate", obj, { headers: this.headers });
  }
  deleteTemplate(obj: any) {
    return this.http.post(this.apiUrl + "Template/deleteTemplate", obj, { headers: this.headers });
  }
  

  //Hotel
  getHotelList(obj: any) {
    return this.http.post(this.apiUrl + "Hotel/HotelList", obj, { headers: this.headers })
  }

  saveHotel(obj: any) {
    return this.http.post(this.apiUrl + "Hotel/saveHotel", obj, { headers: this.headers })
  }

  deleteHotel(obj: any) {
    return this.http.post(this.apiUrl + "Hotel/deleteHotel", obj, { headers: this.headers })
  }
  /* ---------------------------------------------------------------------- */


  //HotelRate
  getHotelRateList(obj: any) {
    return this.http.post(this.apiUrl + "HotelRate/HotelRateList", obj, { headers: this.headers })
  }

  saveHotelRate(obj: any) {
    return this.http.post(this.apiUrl + "HotelRate/saveHotelRate", obj, { headers: this.headers })
  }

  deleteHotelRate(obj: any) {
    return this.http.post(this.apiUrl + "HotelRate/deleteHotelRate", obj, { headers: this.headers })
  }
  /* ---------------------------------------------------------------------- */

  //Extra Charge
  getExtraChargeList(obj: any) {
    return this.http.post(this.apiUrl + "ExtraCharge/ExtraChargeList", obj, { headers: this.headers })
  }

  saveExtraCharge(obj: any) {
    return this.http.post(this.apiUrl + "ExtraCharge/saveExtraCharge", obj, { headers: this.headers })
  }

  deleteExtraCharge(obj: any) {
    return this.http.post(this.apiUrl + "ExtraCharge/deleteExtraCharge", obj, { headers: this.headers })
  }
  /* ---------------------------------------------------------------------- */

  //Department
  getDepartmentList(obj: any) {
    return this.http.post(this.apiUrl + "Department/DepartmentList", obj, { headers: this.headers })
  }

  saveDepartment(obj: any) {
    return this.http.post(this.apiUrl + "Department/saveDepartment", obj, { headers: this.headers })
  }

  deleteDepartment(obj: any) {
    return this.http.post(this.apiUrl + "Department/deleteDepartment", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */
  //RoomType
  getRoomTypeList(obj: any) {
    return this.http.post(this.apiUrl + "RoomType/RoomTypeList", obj, { headers: this.headers })
  }

  saveRoomType(obj: any) {
    return this.http.post(this.apiUrl + "RoomType/saveRoomType", obj, { headers: this.headers })
  }

  deleteRoomType(obj: any) {
    return this.http.post(this.apiUrl + "RoomType/deleteRoomType", obj, { headers: this.headers })
  }
  /* ---------------------------------------------------------------------- */
  //Destination
  getDestinationList(obj: any) {
    return this.http.post(this.apiUrl + "Destination/DestinationList", obj, { headers: this.headers })
  }

  saveDestination(obj: any) {
    return this.http.post(this.apiUrl + "Destination/saveDestination", obj, { headers: this.headers })
  }

  deleteDestination(obj: any) {
    return this.http.post(this.apiUrl + "Destination/deleteDestination", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  /* ---------------------------------------------------------------------- */
  //Location
  getLocationList(obj: any) {
    return this.http.post(this.apiUrl + "Location/LocationList", obj, { headers: this.headers })
  }

  saveLocation(obj: any) {
    return this.http.post(this.apiUrl + "Location/saveLocation", obj, { headers: this.headers })
  }

  deleteLocation(obj: any) {
    return this.http.post(this.apiUrl + "Location/deleteLocation", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  // Staff
  getStaffList(obj: any) {
    return this.http.post(this.apiUrl + "Staff/StaffList", obj, { headers: this.headers })
  }

  saveStaff(obj: any) {
    return this.http.post(this.apiUrl + "Staff/saveStaff", obj, { headers: this.headers })
  }

  deleteStaff(obj: any) {
    return this.http.post(this.apiUrl + "Staff/deleteStaff", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  // Staff Login
  StaffLogin(obj: any) {
    return this.http.post(this.apiUrl + "StaffLogin/StaffLogin", obj, { headers: this.headers })
  }

  getStaffLoginList(obj: any) {
    return this.http.post(this.apiUrl + "StaffLogin/StaffLoginList", obj, { headers: this.headers })
  }

  saveStaffLogin(obj: any) {
    return this.http.post(this.apiUrl + "StaffLogin/saveStaffLogin", obj, { headers: this.headers })
  }

  deleteStaffLogin(obj: any) {
    return this.http.post(this.apiUrl + "StaffLogin/deleteStaffLogin", obj, { headers: this.headers })
  }

  changePassword(obj: any) {
    return this.http.post(this.apiUrl + "StaffLogin/changePassword", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  //Agency (Admin module)
  getAdminAgencyList(obj: any) {
    return this.http.post(this.apiUrl + "Agency/AgencyList", obj, { headers: this.headers })
  }

  saveAgency(obj: any) {
    return this.http.post(this.apiUrl + "Agency/saveAgency", obj, { headers: this.headers })
  }

  deleteAgency(obj: any) {
    return this.http.post(this.apiUrl + "Agency/deleteAgency", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */
  
  /* ---------------------------------------------------------------------- */

// TripComment
getTripCommentList(obj: any) {
  return this.http.post(this.apiUrl + "TripComment/TripCommentList", obj, { headers: this.headers })
}

saveTripComment(obj: any) {
  return this.http.post(this.apiUrl + "TripComment/saveTripComment", obj, { headers: this.headers })
}
  /* ---------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------- */

  /* ---------------------------------------------------------------------- */

// Quote Step Three
getQuoteDetail(obj: any) {
  return this.http.post(this.apiUrl + "Quote/QuoteDetail", obj, { headers: this.headers })
}

savePackageTypes(obj: any) {
  return this.http.post(this.apiUrl + "Quote/savePackageTypes", obj, { headers: this.headers })
}

saveQuoteHotel(obj: any) {
  return this.http.post(this.apiUrl + "Quote/saveQuoteHotel", obj, { headers: this.headers })
}

deleteQuoteHotel(obj: any) {
  return this.http.post(this.apiUrl + "Quote/deleteQuoteHotel", obj, { headers: this.headers })
}

saveQuoteService(obj: any) {
  return this.http.post(this.apiUrl + "Quote/saveQuoteService", obj, { headers: this.headers })
}

deleteQuoteService(obj: any) {
  return this.http.post(this.apiUrl + "Quote/deleteQuoteService", obj, { headers: this.headers })
}

saveQuote(obj: any) {
  return this.http.post(this.apiUrl + "Quote/saveQuote", obj, { headers: this.headers })
}

getHotelRateByDate(obj: any) {
  return this.http.post(this.apiUrl + "Quote/HotelRateByDate", obj, { headers: this.headers })
}

getVehicleRateByDate(obj: any) {
  return this.http.post(this.apiUrl + "Quote/VehicleRateByDate", obj, { headers: this.headers })
}

getActivityRateByDate(obj: any) {
  return this.http.post(this.apiUrl + "Quote/ActivityRateByDate", obj, { headers: this.headers })
}






  /* ---------------------------------------------------------------------- */

// Guest
// getGuestByAgency(obj: any) {
//   return this.http.post(this.apiUrl + "Guest/GuestByAgency", obj, { headers: this.headers })
// }
getGuestByTrip(obj: any){
  return this.http.post(this.apiUrl + "Guest/GuestByTrip",obj, { headers: this.headers})
}

saveGuestList(obj: any) {
  return this.http.post(this.apiUrl + "Guest/saveGuestList", obj, { headers: this.headers })
}
  /* ---------------------------------------------------------------------- */

  //Agency (QueryStepOne module)
  getQueryAgencyList(obj: any) {
    return this.http.post(this.apiUrl + "QueryStepOne/AgencyList", obj, { headers: this.headers })
  }

/* ---------------------------------------------------------------------- */

//Guest
getGuestByAgency(obj: any) {
  return this.http.post(this.apiUrl + "QueryStepOne/GuestByAgency", obj, { headers: this.headers })
}

/* ---------------------------------------------------------------------- */

//Tag
getTagList(obj: any) {
  return this.http.post(this.apiUrl + "QueryStepOne/TagList", obj, { headers: this.headers })
}

/* ---------------------------------------------------------------------- */

//QueryStepOne
getQueryStepOneList(obj: any) {
  return this.http.post(this.apiUrl + "QueryStepOne/QueryStepOneList", obj, { headers: this.headers })
}

saveQueryStepOne(obj: any) {
  return this.http.post(this.apiUrl + "QueryStepOne/saveQueryStepOne", obj, { headers: this.headers })
}

deleteQueryStepOne(obj: any) {
  return this.http.post(this.apiUrl + "QueryStepOne/deleteQueryStepOne", obj, { headers: this.headers })
}

updateTripStatus(obj: any) {
  return this.http.post(this.apiUrl + "QueryStepOne/updateTripStatus", obj, { headers: this.headers })
}









  
  //PageGroup
  getPageGroupList(obj: any) {
    return this.http.post(this.apiUrl + "PageGroup/PageGroupList", obj, { headers: this.headers })
  }

  savePageGroup(obj: any) {
    return this.http.post(this.apiUrl + "PageGroup/savePageGroup", obj, { headers: this.headers })
  }

  deletePageGroup(obj: any) {
    return this.http.post(this.apiUrl + "PageGroup/deletePageGroup", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  //Page
  getPageList(obj: any) {
    return this.http.post(this.apiUrl + "Page/PageList", obj, { headers: this.headers })
  }

  savePage(obj: any) {
    return this.http.post(this.apiUrl + "Page/savePage", obj, { headers: this.headers })
  }

  deletePage(obj: any) {
    return this.http.post(this.apiUrl + "Page/deletePage", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  //Menu
  getUserMenuList(obj: any) {
    return this.http.post(this.apiUrl + "Menu/UserMenuList", obj, { headers: this.headers })
  }

  validiateMenu(obj: any) {
    return this.http.post(this.apiUrl + "Menu/ValidiateMenu", obj, { headers: this.headers })
  }

  getMenuList(obj: any) {
    return this.http.post(this.apiUrl + "Menu/MenuList", obj, { headers: this.headers })
  }

  saveMenu(obj: any) {
    return this.http.post(this.apiUrl + "Menu/saveMenu", obj, { headers: this.headers })
  }

  deleteMenu(obj: any) {
    return this.http.post(this.apiUrl + "Menu/deleteMenu", obj, { headers: this.headers })
  }

  menuUp(obj: any) {
    return this.http.post(this.apiUrl + "Menu/MenuUp", obj, { headers: this.headers })
  }

  menuDown(obj: any) {
    return this.http.post(this.apiUrl + "Menu/MenuDown", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  //Role
  getRoleList(obj: any) {
    return this.http.post(this.apiUrl + "Role/RoleList", obj, { headers: this.headers })
  }

  saveRole(obj: any) {
    return this.http.post(this.apiUrl + "Role/saveRole", obj, { headers: this.headers })
  }

  deleteRole(obj: any) {
    return this.http.post(this.apiUrl + "Role/deleteRole", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  //RoleMenu
  getRoleMenuList(obj: any) {
    return this.http.post(this.apiUrl + "RoleMenu/AllRoleMenuList", obj, { headers: this.headers })
  }

  saveRoleMenu(obj: any) {
    return this.http.post(this.apiUrl + "RoleMenu/saveRoleMenu", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  //StaffLoginRole
  getStaffLoginRoleList(obj: any) {
    return this.http.post(this.apiUrl + "StaffLoginRole/StaffLoginRoleList", obj, { headers: this.headers })
  }

  saveStaffLoginRole(obj: any) {
    return this.http.post(this.apiUrl + "StaffLoginRole/saveStaffLoginRole", obj, { headers: this.headers })
  }

  deleteStaffLoginRole(obj: any) {
    return this.http.post(this.apiUrl + "StaffLoginRole/deleteStaffLoginRole", obj, { headers: this.headers })
  }

  //State
  getStateList(obj: any) {
    return this.http.post(this.apiUrl + "State/StateList", obj, { headers: this.headers })
  }

  saveState(obj: any) {
    return this.http.post(this.apiUrl + "State/saveState", obj, { headers: this.headers })
  }

  deleteState(obj: any) {
    return this.http.post(this.apiUrl + "State/deleteState", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  //City
  getCityList(obj: any) {
    return this.http.post(this.apiUrl + "City/CityList", obj, { headers: this.headers })
  }

  saveCity(obj: any) {
    return this.http.post(this.apiUrl + "City/saveCity", obj, { headers: this.headers })
  }

  deleteCity(obj: any) {
    return this.http.post(this.apiUrl + "City/deleteCity", obj, { headers: this.headers })
  }
}

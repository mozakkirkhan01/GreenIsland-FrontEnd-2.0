export interface KeyValueModel {
    Key: number,
    Value: string
}

export interface MyDocumentDefinition {
    content: any[];
    styles?: { [key: string]: { fontSize?: number; bold?: boolean; alignment?: 'left' | 'right' | 'center' | 'justify' } };
  }
  

export interface ActionModel {
    CanEdit: boolean,
    CanCreate: boolean,
    CanDelete: boolean,
    ResponseReceived: boolean,
    MenuTitle: string,
    ParentMenuTitle: string
}
export interface StaffLoginModel {
    StaffLoginId: number,
    StaffId: number,
    StaffName: string,
    UserName: string,
    DesignationName: string
}

export interface Filter {
    FromMonth: number;
    FromYear: number;
    AgentId: number;
    ExecutiveId: number;
    DestinationId: number;
}

export interface LandEnquiry {
    EnquiryDate: string;
    EnquiryCode: string;
    GuestName: string;
    ContactNo: string;
    DestinationName: string;
    PlanDescription: string;
    NoOfPerson: number;
    Remarks: string;
    Status: number;
}

export interface FlightBill {
    BookingDate: string;
    BillNo: string;
    CustomerName: string;
    Address: string;
    MobileNo: string;
    CheckInDate: string;
    CheckOutDate: string;
    TotalFinalAmount: number;
    Status: number;
}

export interface BookingBill {
    BookingDate: string;
    BillNo: string;
    CustomerName: string;
    Address: string;
    MobileNo: string;
    DestinationName: string;
    CheckInDate: string;
    CheckOutDate: string;
    PaidAmount: number;
    Status: number;
}


export interface RequestModel {
    request: string
}

export interface ResponseModel {
    responseData: string,
    Message: string
}
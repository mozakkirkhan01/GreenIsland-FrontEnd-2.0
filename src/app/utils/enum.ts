export enum Category {

    General = 1,
    OBC = 2,
    SC = 3,
    ST = 4,
    Other = 5
}
export enum PaymentStatus {
    Paid = 1,
    Due = 2
}
export enum CouponStatus {
    NotGenerated = 5,
    Generated = 1,
    Issued = 2,
    PartialyReedeem = 3,
    Reedeem = 4
}
export enum BloodGroup {
    OPositive = 1,
    ONegative = 2,
    APositive = 3,
    ANegative = 4,
    BPositive = 5,
    BNegative = 6,
    ABPositive = 7,
    ABNegative = 8,
}
export enum Gender {
    Male = 2,
    Female = 1,
    Other = 3
}
export enum StaffType {
    SuperAdmin = 1,
    Admin = 2,
    TeachingStaff = 3,
    NonTeachingStaff = 4
}
export enum BookBy {
    Agent = 1,
    Guest = 2
}
export enum BookingType {
    Direct = 1,
    Enquiry = 2
}
export enum PaymentMode {
    CASH = 1,
    ONLINE = 2,
    CHEQUE = 3,
    DD = 5,
    OTHERS = 4
}
export enum BillStatus {
    Paid = 1,
    Cancel = 2
}
export enum BookingStatus {
    "Tour Pending" = 1,
    "Tour Completed" = 2,
    "Tour Cancelled" = 3
}
export enum Status {
    Active = 1,
    Inactive = 2
}
export enum BookletStatus {
    NotSale = 1,
    Sold = 2
}
export enum EnquiryBy {
    Agent = 1,
    Guest = 2
}
export enum EnquiryStatus {
    Active = 1,
    Confirm = 2,
    InActive = 3
}
export enum DestinationType {
    Domestic = 1,
    International = 2
}
export enum DocType {
    Pdf = 1,
    Word = 2,
    Excel = 3,
    Print = 4,
}
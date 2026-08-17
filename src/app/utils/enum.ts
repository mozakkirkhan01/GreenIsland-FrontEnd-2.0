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
    Agent = 3,
    OfficeStaff = 2,
    Admin = 1,

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
export enum Servicetype {
    Ferry = 1,
    Activities = 2
}
export enum ChargeType {
    AWEB = 1,
    CWEB = 2,
    CNB = 3
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
// Add this new enum
export enum PassengerType {
    Adult = 1,
    Child = 2,
    Infant = 3
}

export enum PricingStrategy {
    Overall = 1,
    "Per-Person" = 2
}
// utils/enum.ts
export enum TripStatus {
    NewQuery = 1,
    InProgress = 2,
    OnHold = 3,
    Converted = 4,
    OnTrip = 5,
    PastTrip = 6,
    Canceled = 7,
    Dropped = 8
}

// Optional: Helper for display
export const TripStatusMap = {
    [TripStatus.NewQuery]: { label: 'New Query', class: 'bg-primary' },
    [TripStatus.InProgress]: { label: 'In Progress', class: 'bg-info text-dark' },
    [TripStatus.OnHold]: { label: 'On Hold', class: 'bg-warning text-dark' },
    [TripStatus.Converted]: { label: 'Converted', class: 'bg-success' },
    [TripStatus.OnTrip]: { label: 'On Trip', class: 'bg-success' },
    [TripStatus.PastTrip]: { label: 'Past Trip', class: 'bg-secondary' },
    [TripStatus.Canceled]: { label: 'Canceled', class: 'bg-danger' },
    [TripStatus.Dropped]: { label: 'Dropped', class: 'bg-dark' }
} as const;

// ── QueryConvert screen (query-convert.ts) ─────────────────────────
// Backs QuoteConversion.ActionType — distinguishes sendForHolding() from
// convertTrip() on the same header row. The resulting TripStatus change
// itself still goes through the existing TripStatus enum above
// (OnHold / Converted) — this enum only tags *which action produced*
// that QuoteConversion row, since both actions save the same shape of
// data (package, instalments, comments, verified).
export enum QuoteConversionActionType {
    SendForHolding = 1,
    ConvertTrip = 2
}

// Backs QuoteConversion.Status. Lets a conversion be re-done (e.g. agent
// picks a different package or corrects instalments) without losing the
// audit trail of the earlier attempt — old rows get marked Superseded
// instead of being overwritten or deleted.
export enum QuoteConversionStatus {
    Active = 1,
    Superseded = 2,
    Cancelled = 3
}

// Backs QuoteConversionInstalment.Status — tracks each instalment's
// payment state independently of the parent QuoteConversion's own status.
export enum InstalmentStatus {
    Pending = 1,
    Paid = 2,
    Overdue = 3
}
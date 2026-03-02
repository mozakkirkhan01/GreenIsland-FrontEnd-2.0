
export class ConstantData {
  public static SuccessMessage = "Success";
    public static AccessDenied = "Access Denied";
    private static readonly noImageUrl =  "assets/img/no-image.avif";
    public static RowChangesMessage = "Allow to changes all row while changing first row";
    public static PageSizes = [10, 20, 100, 200, 500, 1000, 2000, 5000];
    public static StatusList = [{ Key: 1, Value: "Active" }, { Key: 2, Value: "Inactive" }];
    public static DestinationTypeList = [{ Key: 1, Value: "Domestic" }, { Key: 2, Value: "International" }];
    public static BoolList = [{ Key: true, Value: "Yes" }, { Key: false, Value: "No" }];
    private static readonly adminKey = "52F4785C-7EE7-426E-A1AE-C2300972E70A";
    private static readonly baseUrl: string = "https://localhost:44302/";
    //private static readonly baseUrl: string = "http://192.168.192.39:7777/";
    
    public static getBaseUrl(): string {
        return this.baseUrl;
    }
    public static getApiUrl(): string {
        return this.baseUrl + "api/";
    }
    public static getExamApiUrl(): string {
        return this.baseUrl + "examination/";
    }
    public static getAdminKey(): string {
        return this.adminKey;
    }
    public static getNoImage():string{
        return this.baseUrl + this.noImageUrl;
    }
}

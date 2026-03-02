import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { Router } from "@angular/router";

import JsBarcode from 'jsbarcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// import pdfMake from 'pdfmake/build/pdfmake';
// import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// ✅ Fix pdfMake vfs assignment
//(pdfMake as any).vfs = pdfFonts.pdfMake.vfs;

//import { MyDocumentDefinition } from './interface';


@Injectable({
  providedIn: 'root'
})
export class LocalService {

  
  key = CryptoJS.enc.Utf8.parse('4124745874587458'); //16 word
  iv = CryptoJS.enc.Utf8.parse('4124745874587458');

  // generateBarcode(data: string): Promise<string> {
  //   return new Promise(resolve => {
  //     const canvas = document.createElement('canvas');
  //     JsBarcode(canvas, data, { format: 'CODE128', displayValue: true });
  //     resolve(canvas.toDataURL('image/png')); // Convert to Base64
  //   });
  // }

  /**
   * Generate and download a barcode image
   * @param barcodeData - The barcode number
   */
  // generateAndDownloadBarcode(barcodeData: string) {
  //   const canvas = document.createElement('canvas');
  //   JsBarcode(canvas, barcodeData, {
  //     format: 'CODE128',
  //     displayValue: true,
  //     width: 2,
  //     height: 60
  //   });

  //   const image = canvas.toDataURL('image/png');

  //   const link = document.createElement('a');
  //   link.href = image;
  //   link.download = `${barcodeData}.png`; // Change to `.jpg` for JPG format
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  // }

  // New Barcode
  NewgenerateAndDownloadBarcode(data: string) {
    const canvas = document.createElement('canvas');
  
    JsBarcode(canvas, data, { 
      format: 'CODE128', 
      displayValue: false // Hide barcode number
    });
  
    const image = canvas.toDataURL('image/png'); // Convert canvas to image (PNG)
    
    const link = document.createElement('a');
    link.href = image;
    link.download = `barcode_${data}.png`; // Set file name
    link.click(); // Trigger download
  }

  NewgenerateAndDownloadBarcodes(data: string) {
    const canvas = document.createElement('canvas');

    // ✅ Fix: Ensure "/" is correctly handled in the barcode
    const formattedBarcode = data.replace(/\//g, "/");

    JsBarcode(canvas, formattedBarcode, { 
        format: 'CODE128', 
        width: 2,   // ✅ Ensures readability
        height: 60, // ✅ Better scanning
        displayValue: true // ✅ Show text below barcode
    });

    // ✅ Convert to PNG image
    const image = canvas.toDataURL('image/png');

    // ✅ Create a download link
    const link = document.createElement('a');
    link.href = image;
    link.download = `${formattedBarcode}.png`; // ✅ Save file with correct name
    link.click(); // ✅ Trigger download
}


  //ZIP
  async NewgenerateBarcode(data: string): Promise<Blob> {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, data, { 
        format: 'CODE128', 
        displayValue: false // Hide barcode number
      });

      // Convert canvas to Blob (PNG)
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
      }, 'image/png');
    });
  }

  // async NewgenerateBarcode(data: string): Promise<Blob> {
  //   return new Promise((resolve, reject) => {
  //     const canvas = document.createElement('canvas');
  //     JsBarcode(canvas, data, { 
  //       format: 'CODE128', 
  //       displayValue: false // Hide barcode number
  //     });
  
  //     // Convert canvas to Blob (PNG)
  //     canvas.toBlob(blob => {
  //       if (blob) {
  //         resolve(blob);
  //       } else {
  //         reject(new Error(`Failed to generate barcode for: ${data}`)); // Proper error handling
  //       }
  //     }, 'image/png');
  //   });
  // }
  
  async NewgenerateAndDownloadZip(barcodeList: { CouponBarCodeNo: string }[]) {
    const zip = new JSZip();
  
    for (const item of barcodeList) {
      try {
        const barcodeImage = await this.NewgenerateBarcode(item.CouponBarCodeNo);
        zip.file(`${item.CouponBarCodeNo}.png`, barcodeImage); // Add barcode image to ZIP
      } catch (error) {
        console.error(error); // Log error if barcode generation fails
      }
    }
  
    // Generate ZIP and trigger download
    zip.generateAsync({ type: 'blob' }).then(content => {
      saveAs(content, 'barcodes.zip'); // Use 'saveAs' correctly
    }).catch(error => {
      console.error('Error generating ZIP file:', error); // Handle ZIP generation errors
    });
  }




  generateAndDownloadBarcode(data: string) {
    const canvas = document.createElement('canvas');
  
    JsBarcode(canvas, data, { 
      format: 'CODE128', 
      displayValue: false // Hide barcode number
    });
  
    const image = canvas.toDataURL('image/png'); // Convert canvas to image (PNG)
    
    const link = document.createElement('a');
    link.href = image;
    link.download = `barcode_${data}.png`; // Set file name
    link.click(); // Trigger download
  }

  //ZIP
  async generateBarcode(data: string): Promise<Blob> {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, data, { 
        format: 'CODE128', 
        displayValue: false // Hide barcode number
      });

      // Convert canvas to Blob (PNG)
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
      }, 'image/png');
    });
  }

  async generateAndDownloadZip(barcodeList: { BarCodeNo: string }[]) {
    const zip = new JSZip();
    
    for (const item of barcodeList) {
      const barcodeImage = await this.generateBarcode(item.BarCodeNo);
      zip.file(`${item.BarCodeNo}.png`, barcodeImage); // Add barcode image to ZIP
    }

    // Generate ZIP and trigger download
    zip.generateAsync({ type: 'blob' }).then(content => {
      saveAs(content, 'barcodes.zip'); // Use 'saveAs' correctly
    });
  }

  constructor(private route: Router) { }

  public saveData(key: string, value: string) {
    localStorage.setItem(key, this.encrypt(value));
  }

  public getData(key: string) {
    let data = localStorage.getItem(key) || "";
    return this.decrypt(data);
  }
  public removeData(key: string) {
    localStorage.removeItem(key);
  }

  public clearData() {
    localStorage.clear();
  }

  public encrypt(txt: string): string {
    return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(txt), this.key,
    {
      keySize: 128 / 8,
      iv: this.iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
  }

  public decrypt(txtToDecrypt: string):string {
    return CryptoJS.AES.decrypt(txtToDecrypt, this.key, {
      keySize: 128 / 8,
      iv: this.iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString(CryptoJS.enc.Utf8);
  }

  //Employee
  public employeeDetail = "455115dfsdfs";
  setEmployeeDetail(obj: any) {
    this.saveData(this.employeeDetail, JSON.stringify(obj));
  }

  getEmployeeDetail() {
    var obj = this.getData(this.employeeDetail);
    if (obj == null || obj == "" || obj == undefined)
      this.route.navigate(['/admin-login']);
    return JSON.parse(obj);
    //return {};
  }

  removeEmployeeDetail(){
    this.removeData(this.employeeDetail);
  }

  

  // public async generatePdf(data: any) {
  //   const pdfContent: any[] = [
  //     { text: 'Coupon Stock List', style: 'header' },
  //     { text: '\n' }
  //   ];

  //   for (const item of data) {
  //     const barcodeImage = await this.generateBarcode(item.BarCodeNo);
  //     pdfContent.push({
  //       columns: [
  //         { image: barcodeImage, width: 150 }, // Barcode
  //         {
  //           text: `MRP: ₹${item.MRP}\nFrom: ${item.FromDate}\nTo: ${item.ToDate}`,
  //           margin: [10, 0, 0, 0]
  //         }
  //       ],
  //       margin: [0, 10, 0, 10]
  //     });
  //   }

  //   const docDefinition: MyDocumentDefinition = {
  //     content: pdfContent,
  //     styles: {
  //       header: { fontSize: 16, bold: true, alignment: "center" } // ✅ Fix applied
  //     }
  //   };

  //   pdfMake.createPdf(docDefinition).open();
  // }

}

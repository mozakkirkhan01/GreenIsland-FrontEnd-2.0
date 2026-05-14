import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UnsavedChangesDialogService } from './unsaved-changes-dialog.service';

@Component({
  selector: 'app-unsaved-changes-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (dialogService.visible()) {
      <div class="modal-backdrop fade show"
           style="z-index:1060; backdrop-filter:blur(3px);"></div>
      <div class="modal fade show d-block" style="z-index:1070;" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered" style="max-width:420px;">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header border-bottom px-4 py-3">
              <h5 class="modal-title fw-bold" style="font-size:15px;">
                Unsaved Changes
              </h5>
            </div>
            <div class="modal-body px-4 py-3 text-muted" style="font-size:14px;">
              You have unsaved changes in the quote. Are you sure you want to leave?
              All changes will be lost.
            </div>
            <div class="modal-footer border-top px-4 py-3 gap-2">
              <button class="btn btn-outline-secondary btn-sm px-4"
                      (click)="dialogService.respond(false)">
                Stay on Page
              </button>
              <button class="btn btn-danger btn-sm px-4"
                      (click)="dialogService.respond(true)">
                Leave Page
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class UnsavedChangesDialogComponent {
  dialogService = inject(UnsavedChangesDialogService);
}
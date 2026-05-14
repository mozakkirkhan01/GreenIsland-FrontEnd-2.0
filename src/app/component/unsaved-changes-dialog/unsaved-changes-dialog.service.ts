import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UnsavedChangesDialogService {
  visible = signal(false);
  private subject!: Subject<boolean>;

  confirm(): Observable<boolean> {
    this.visible.set(true);
    this.subject = new Subject<boolean>();
    return this.subject.asObservable();
  }

  respond(leave: boolean): void {
    this.visible.set(false);
    this.subject.next(leave);
    this.subject.complete();
  }
}
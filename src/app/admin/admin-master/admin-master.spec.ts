import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminMaster } from './admin-master';

describe('AdminMaster', () => {
  let component: AdminMaster;
  let fixture: ComponentFixture<AdminMaster>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminMaster],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminMaster);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

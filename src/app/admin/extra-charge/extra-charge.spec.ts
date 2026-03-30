import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtraCharge } from './extra-charge';

describe('ExtraCharge', () => {
  let component: ExtraCharge;
  let fixture: ComponentFixture<ExtraCharge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExtraCharge],
    }).compileComponents();

    fixture = TestBed.createComponent(ExtraCharge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

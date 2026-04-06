import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityServiceRate } from './activity-service-rate';

describe('ActivityServiceRate', () => {
  let component: ActivityServiceRate;
  let fixture: ComponentFixture<ActivityServiceRate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityServiceRate],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityServiceRate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

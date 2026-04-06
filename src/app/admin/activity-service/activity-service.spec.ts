import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityService } from './activity-service';

describe('ActivityService', () => {
  let component: ActivityService;
  let fixture: ComponentFixture<ActivityService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityService],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityService);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

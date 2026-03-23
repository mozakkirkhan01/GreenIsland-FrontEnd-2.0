import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelRatelist } from './hotel-ratelist';

describe('HotelRatelist', () => {
  let component: HotelRatelist;
  let fixture: ComponentFixture<HotelRatelist>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HotelRatelist],
    }).compileComponents();

    fixture = TestBed.createComponent(HotelRatelist);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

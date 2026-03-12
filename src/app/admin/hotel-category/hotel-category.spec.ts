import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelCategory } from './hotel-category';

describe('HotelCategory', () => {
  let component: HotelCategory;
  let fixture: ComponentFixture<HotelCategory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HotelCategory],
    }).compileComponents();

    fixture = TestBed.createComponent(HotelCategory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpecialInclusion } from './special-inclusion';

describe('SpecialInclusion', () => {
  let component: SpecialInclusion;
  let fixture: ComponentFixture<SpecialInclusion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpecialInclusion],
    }).compileComponents();

    fixture = TestBed.createComponent(SpecialInclusion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

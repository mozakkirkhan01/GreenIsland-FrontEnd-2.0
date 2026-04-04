import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpecialInclusionType } from './special-inclusion-type';

describe('SpecialInclusionType', () => {
  let component: SpecialInclusionType;
  let fixture: ComponentFixture<SpecialInclusionType>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpecialInclusionType],
    }).compileComponents();

    fixture = TestBed.createComponent(SpecialInclusionType);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

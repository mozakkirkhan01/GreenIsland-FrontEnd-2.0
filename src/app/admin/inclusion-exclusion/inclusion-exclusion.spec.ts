import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InclusionExclusion } from './inclusion-exclusion';

describe('InclusionExclusion', () => {
  let component: InclusionExclusion;
  let fixture: ComponentFixture<InclusionExclusion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InclusionExclusion],
    }).compileComponents();

    fixture = TestBed.createComponent(InclusionExclusion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

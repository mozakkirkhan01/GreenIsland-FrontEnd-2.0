import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TermCondition } from './term-condition';

describe('TermCondition', () => {
  let component: TermCondition;
  let fixture: ComponentFixture<TermCondition>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TermCondition],
    }).compileComponents();

    fixture = TestBed.createComponent(TermCondition);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

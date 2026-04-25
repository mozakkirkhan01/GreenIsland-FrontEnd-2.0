import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QueryStepthree } from './query-stepthree';

describe('QueryStepthree', () => {
  let component: QueryStepthree;
  let fixture: ComponentFixture<QueryStepthree>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueryStepthree],
    }).compileComponents();

    fixture = TestBed.createComponent(QueryStepthree);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QueryStepfour } from './query-stepfour';

describe('QueryStepfour', () => {
  let component: QueryStepfour;
  let fixture: ComponentFixture<QueryStepfour>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueryStepfour],
    }).compileComponents();

    fixture = TestBed.createComponent(QueryStepfour);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

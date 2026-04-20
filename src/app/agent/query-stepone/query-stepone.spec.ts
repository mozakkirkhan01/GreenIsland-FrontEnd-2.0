import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QueryStepone } from './query-stepone';

describe('QueryStepone', () => {
  let component: QueryStepone;
  let fixture: ComponentFixture<QueryStepone>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueryStepone],
    }).compileComponents();

    fixture = TestBed.createComponent(QueryStepone);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

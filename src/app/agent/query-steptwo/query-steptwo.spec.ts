import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuerySteptwo } from './query-steptwo';

describe('QuerySteptwo', () => {
  let component: QuerySteptwo;
  let fixture: ComponentFixture<QuerySteptwo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuerySteptwo],
    }).compileComponents();

    fixture = TestBed.createComponent(QuerySteptwo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

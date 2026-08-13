import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QueryConvert } from './query-convert';

describe('QueryConvert', () => {
  let component: QueryConvert;
  let fixture: ComponentFixture<QueryConvert>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueryConvert],
    }).compileComponents();

    fixture = TestBed.createComponent(QueryConvert);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

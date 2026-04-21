import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuerySteponetwo } from './query-steponetwo';

describe('QuerySteponetwo', () => {
  let component: QuerySteponetwo;
  let fixture: ComponentFixture<QuerySteponetwo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuerySteponetwo],
    }).compileComponents();

    fixture = TestBed.createComponent(QuerySteponetwo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

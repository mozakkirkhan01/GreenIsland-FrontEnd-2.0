import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Designation } from './designation';

describe('Designation', () => {
  let component: Designation;
  let fixture: ComponentFixture<Designation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Designation],
    }).compileComponents();

    fixture = TestBed.createComponent(Designation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

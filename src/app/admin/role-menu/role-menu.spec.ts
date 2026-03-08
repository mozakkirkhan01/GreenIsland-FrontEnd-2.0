import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoleMenu } from './role-menu';

describe('RoleMenu', () => {
  let component: RoleMenu;
  let fixture: ComponentFixture<RoleMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleMenu],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleMenu);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

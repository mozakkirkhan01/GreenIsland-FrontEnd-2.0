import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageGroup } from './page-group';

describe('PageGroup', () => {
  let component: PageGroup;
  let fixture: ComponentFixture<PageGroup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageGroup],
    }).compileComponents();

    fixture = TestBed.createComponent(PageGroup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

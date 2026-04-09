import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IteneraryService } from './itenerary-service';

describe('IteneraryService', () => {
  let component: IteneraryService;
  let fixture: ComponentFixture<IteneraryService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IteneraryService],
    }).compileComponents();

    fixture = TestBed.createComponent(IteneraryService);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

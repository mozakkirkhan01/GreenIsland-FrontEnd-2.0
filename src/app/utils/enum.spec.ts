import { TestBed } from '@angular/core/testing';

import { Enum } from './enum';

describe('Enum', () => {
  let service: Enum;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Enum);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

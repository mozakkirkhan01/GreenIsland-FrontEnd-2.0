import { TestBed } from '@angular/core/testing';

import { ConstantData } from './constant-data';

describe('ConstantData', () => {
  let service: ConstantData;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConstantData);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

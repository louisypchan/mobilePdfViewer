import { TestBed } from '@angular/core/testing';

import { StampService } from './stamp.service';

describe('StampService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: StampService = TestBed.get(StampService);
    expect(service).toBeTruthy();
  });
});

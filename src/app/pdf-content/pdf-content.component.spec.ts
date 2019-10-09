import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfContentComponent } from './pdf-content.component';

describe('PdfContentComponent', () => {
  let component: PdfContentComponent;
  let fixture: ComponentFixture<PdfContentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PdfContentComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PdfContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

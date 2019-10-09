import {Injectable, Input} from '@angular/core';
import {Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  public CSS_UNIT = 96.0 / 72.0;
  public areaWidth = window.innerWidth - 16;

  private SCALE: number;

  private TRANSFORM: any;

  private pdfDocument: any;

  public onAfterDraw = new Subject();
  public renderHighestPriority = new Subject();

  constructor() {
    this.TRANSFORM = {};
    this.scale = 1;
  }

  @Input()
  public set pdf(pdfDocument: any) {
    this.pdfDocument = pdfDocument;
  }
  public get pdf() {
    return this.pdfDocument;
  }

  @Input()
  public set scale(scale: number) {
    this.SCALE = scale;
  }
  public get scale() {
    return this.SCALE;
  }

  @Input()
  public set transform(transform: any) {
    this.TRANSFORM = transform;
  }
  public get transform() {
    return this.TRANSFORM;
  }
}

import {Injectable, Input} from '@angular/core';
import {Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  public CSS_UNIT = 96.0 / 72.0;
  // Limit canvas size to 5 mega-pixels on mobile.
  // Support: Android, iOS
  public MAX_CANVAS_PIXELS = 5242880;
  public areaWidth = window.innerWidth;
  public mc: any;
  public lastTouchPosition: any;
  public previewScale: number;
  public pos: any;

  private SCALE: number;

  private docScale: number;
  private pdfDocument: any;
  private currentPageNum: number;
  public onAfterDraw = new Subject();
  public renderHighestPriority = new Subject();

  constructor() {
    this.scale = 2;
    this.pageNum = 1;
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
  public set realScale(scale: number) {
    this.docScale = scale;
  }
  public get realScale() {
    return this.docScale;
  }

  @Input()
  public set pageNum(pageNum: number) {
    this.currentPageNum = pageNum;
  }
  public get pageNum() {
    return this.currentPageNum;
  }
}

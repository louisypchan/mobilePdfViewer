import {AfterViewInit, Directive, ElementRef, EventEmitter, OnDestroy, Output} from '@angular/core';
import {Point} from '../_model/Point';
import {PdfService} from '../_service/pdf.service';

@Directive({
  selector: '[appDrag]'
})
export class DragDirective implements AfterViewInit, OnDestroy {

  private _lastTouchPos: Point;
  private dragging: boolean;

  @Output() dragMoved = new EventEmitter<Point>();
  @Output() dragStarted = new EventEmitter<Point>();
  @Output() dragEnded = new EventEmitter<any>();

  constructor(private el: ElementRef, private pdfService: PdfService) {
    // console.log(this.el);
    this.dragging = false;
  }

  ngAfterViewInit(): void {
    // console.log(this.el);
    this.el.nativeElement.addEventListener('touchstart', this.dragStart.bind(this), true);
    this.el.nativeElement.addEventListener('touchmove', this.dragMove.bind(this), true);
    this.el.nativeElement.addEventListener('touchend', this.dragEnd.bind(this), true);
  }

  ngOnDestroy(): void {
    this.el.nativeElement.removeEventListener('touchstart', this.dragStart.bind(this), true);
    this.el.nativeElement.removeEventListener('touchmove', this.dragMove.bind(this), true);
    this.el.nativeElement.removeEventListener('touchend', this.dragEnd.bind(this), true);
  }

  private dragStart(e: TouchEvent) {
    if (e.touches.length > 1) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    this._lastTouchPos = {
      x: e.touches[0].pageX,
      y: e.touches[0].pageY
    };
    this.dragging = false;
  }

  private dragMove(e: TouchEvent) {
    if (e.touches.length > 1) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (!this.dragging) {
      this.dragging = true;
    }
    if (this.dragging) {
      const dx = e.touches[0].pageX - this._lastTouchPos.x;
      const dy = e.touches[0].pageY - this._lastTouchPos.y;
      this.dragMoved.emit({x: dx / this.pdfService.scale, y: dy / this.pdfService.scale});
      this._lastTouchPos = {
        x: e.touches[0].pageX,
        y: e.touches[0].pageY
      };
    }
  }

  private dragEnd(e: TouchEvent) {
    let dragEvent = true;
    if (this.dragging) {
      this.dragging = false;
      dragEvent = true;
    } else {
      dragEvent = false;
    }
    this.dragEnded.emit({source: this.el.nativeElement, dragEvent});
  }
}

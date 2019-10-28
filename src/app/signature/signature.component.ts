import {
  AfterViewInit, ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import {Viewport} from '../_model/Viewport';
import {PdfService} from '../_service/pdf.service';
import {Utils} from '../_util';
import {StampService} from '../_service/stamp.service';
import {CdkDragStart} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-signature',
  templateUrl: './signature.component.html',
  styleUrls: ['./signature.component.scss']
})
export class SignatureComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {

  w: number;
  h: number;
  viewport: Viewport; // signature width/height
  @Input() scale: number;
  @Output() close = new EventEmitter();

  constructor(public pdfService: PdfService, private stampService: StampService, private ref: ChangeDetectorRef) { }

  ngOnInit() {
    this.reset();
    window.addEventListener('resize', this.reset.bind(this), false);
    this.stampService.getStamps('demo')
      .subscribe(result => {
        this.pdfService.stamps = result.data.stampList;
      });
  }

  reset() {
    this.setSignatureViewport();
    this.w = window.innerWidth;
    // this.h = window.innerHeight * 0.3;
    this.h = this.viewport.height + 40 + 2 + 50;
  }

  setSignatureViewport() {
    const wh = Utils.mmToPx(42, Utils.dpi()) * this.scale * this.pdfService.CSS_UNIT;
    this.viewport = {
      width: wh,
      height: wh
    };
  }

  destroy() {
    this.close.emit();
  }

  dragStart(event: CdkDragStart, index: number) {
    const rect = event.source.getRootElement().getBoundingClientRect();
    this.pdfService.stamps[index].viewport = {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top
    };
    this.pdfService.stamps[index].bg = 'rgba(255, 97, 97, .12)';
    this.pdfService.stamps[index].dragging = true;
    this.ref.detectChanges();
  }

  dragMove(event, index: number) {
    this.pdfService.stamps[index].viewport.pip = {
      x: event.pointerPosition.x - event.distance.x,
      y: event.pointerPosition.y - event.distance.y
    };
    this.pdfService.stamps[index].viewport.pie = {
      x: event.pointerPosition.x - event.distance.x - this.pdfService.stamps[index].viewport.left,
      y: event.pointerPosition.y - event.distance.y - this.pdfService.stamps[index].viewport.top
    };
  }

  dragEnd(event: CdkDragStart, index: number) {
    this.pdfService.stamps[index].dragging = false;
    this.pdfService.stamps[index].bg = null;
    this.ref.detectChanges();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.reset.bind(this));
  }

  ngAfterViewInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('scale' in changes) {
      if (changes.scale.currentValue > 0) {
        this.setSignatureViewport();
        this.h = this.viewport.height + 40 + 2 + 50;
      }
    }
  }
}

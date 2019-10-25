import {
  AfterViewInit,
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
import {Stamp} from '../_model/Stamp';
import {StampService} from '../_service/stamp.service';
import {CdkDragDrop} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-signature',
  templateUrl: './signature.component.html',
  styleUrls: ['./signature.component.scss']
})
export class SignatureComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {

  w: number;
  h: number;
  viewport: Viewport; // signature width/height
  stamps: Stamp[];
  @Input() scale: number;
  @Output() close = new EventEmitter();

  constructor(private pdfService: PdfService, private stampService: StampService) { }

  ngOnInit() {
    this.reset();
    window.addEventListener('resize', this.reset.bind(this), false);
    this.stampService.getStamps('demo')
      .subscribe(result => {
        this.stamps = result.data.stampList;
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

  drop(event: CdkDragDrop<string[]>) {
    console.log(event.previousContainer === event.container);
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

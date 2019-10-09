import {AfterViewInit, Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {Page} from '../_model/Page';
import {PdfService} from '../_service/pdf.service';

@Component({
  selector: 'app-pdf-content',
  templateUrl: './pdf-content.component.html',
  styleUrls: ['./pdf-content.component.scss']
})
export class PdfContentComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() type: string;
  @Input() page: Page;

  renderingState: number;

  constructor(private el: ElementRef, private pdfService: PdfService) { }

  ngOnInit() {
  }

  ngAfterViewInit(): void {
    this.draw();
  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  private draw() {
    this.renderingState = this.page.renderingState;
    this.renderingState = 1; // RUNNING
    this.paintOnCanvas();
  }

  /**
   * Returns scale factor for the canvas. It makes sense for the HiDPI displays.
   */
  private getOutputScale(ctx) {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const backingStoreRatio = ctx.webkitBackingStorePixelRatio || ctx.mozBackingStorePixelRatio ||
      ctx.msBackingStorePixelRatio || ctx.oBackingStorePixelRatio || ctx.backingStorePixelRatio || 1;
    const pixelRatio = devicePixelRatio / backingStoreRatio;
    return {
      sx: pixelRatio,
      sy: pixelRatio,
      scaled: pixelRatio !== 1
    };
  }

  private paintOnCanvas() {
    const canvas = this.el.nativeElement.children[0];
    // canvas.mozOpaque = true;
    const ctx = canvas.getContext('2d', { alpha: false, });
    const scale = this.el.nativeElement.offsetWidth / this.page.viewport.width * this.pdfService.scale;
    const viewport = this.page.viewport.clone( {scale: scale * this.pdfService.CSS_UNIT });
    canvas.height = this.page.minHeight * this.pdfService.scale;
    canvas.width = this.el.nativeElement.offsetWidth * this.pdfService.scale;
    const renderTask = this.page.pdfPage.render({
      canvasContext: ctx,
      viewport,
    });
  }
}

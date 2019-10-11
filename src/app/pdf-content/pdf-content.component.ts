import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges, ViewChild
} from '@angular/core';
import {Page} from '../_model/Page';
import {PdfService} from '../_service/pdf.service';
import * as pdfjsLib from 'pdfjs-dist/webpack';

@Component({
  selector: 'app-pdf-content',
  templateUrl: './pdf-content.component.html',
  styleUrls: ['./pdf-content.component.scss']
})
export class PdfContentComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() type: string;
  @Input() page: Page;
  @Input() scale: number;
  @Output() rendered = new EventEmitter<number>();
  @Output() rendering = new EventEmitter<number>();
  // @ts-ignore
  @ViewChild('canvas') canvas: ElementRef;

  ready: boolean;
  paintTask: any;
  renderingState: number;
  hasRestrictedScaling: boolean;
  rw: number;
  rh: number;
  w: number;
  h: number;
  ctx: any;
  visible: boolean;
  previewSource: string;

  constructor(private el: ElementRef, private pdfService: PdfService) { }

  ngOnInit() {
    this.ready = false;
    const actualSizeViewport = this.page.pdfPage.getViewport({ scale: this.pdfService.scale * this.pdfService.CSS_UNIT});
    this.w = actualSizeViewport.width;
    this.h = actualSizeViewport.height;
    this.rw = actualSizeViewport.width;
    this.rh = actualSizeViewport.height;
    this.visible = false;
  }

  ngAfterViewInit(): void {
    let rAF = window.requestAnimationFrame(() => {
      rAF = null;
      this.ready = true;
      this.canvas.nativeElement.mozOpaque = true;
      this.ctx = this.canvas.nativeElement.getContext('2d', { alpha: false, });
      this.draw();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('scale' in changes) {
      // console.log(changes.scale);
      if (this.ready) {
        this.draw();
      }
    }
  }

  private reset() {
    this.visible = false;
    this.renderingState = 0;
    if (this.paintTask) {
      this.paintTask.cancel();
      this.paintTask = null;
    }
  }

  private draw() {
    this.renderingState = this.page.renderingState;
    if (this.renderingState !== 0) {
      // Ensure that we reset all state to prevent issues.
      this.reset();
    }
    this.renderingState = 1; // RUNNING
    this.rendering.emit(this.page.id);
    this.paintTask = this.type === 'canvas' ? this.paintOnCanvas() : null;
    // TODO: support SVG
    const result = this.paintTask.promise.then(() => {
      // done with painting
      this.renderingState = 3;
      this.rendered.emit(this.page.id);
    }, reason => {
    });
    if (this.pdfService.onAfterDraw) {
      this.pdfService.onAfterDraw.next();
    }
    result.finally(() => {
      //
      // this.previewSource = this.canvas.nativeElement.toDataURL('image/png', 1.0);
      this.pdfService.renderHighestPriority.next();
    });
  }

  // Approximates float number as a fraction using Farey sequence (max order  of 8).
  private approximateFraction(x: number) {
    // Fast paths for int numbers or their inversions.
    if (Math.floor(x) === x) {
      return [x, 1];
    }
    const xinv = 1 / x;
    const limit = 8;
    if (xinv > limit) {
      return [1, limit];
    } else if (Math.floor(xinv) === xinv) {
      return [1, xinv];
    }
    const X = x > 1 ? xinv : x;
    // a/b and c/d are neighbours in Farey sequence.
    let a = 0;
    let b = 1;
    let c = 1;
    let d = 1;
    // Limiting search to order 8.
    while (true) {
      // Generating next term in sequence (order of q).
      const p = a + c;
      const q = b + d;
      if (q > limit) {
        break;
      }
      if (X <= p / q) {
        c = p; d = q;
      } else {
        a = p; b = q;
      }
    }
    let result;
    // Select closest of the neighbours to x.
    if (X - a / b < c / d - X) {
      result = X === x ? [a, b] : [b, a];
    } else {
      result = X === x ? [c, d] : [d, c];
    }
    return result;
  }

  private roundToDivide(x, div) {
    const r = x % div;
    return r === 0 ? x : Math.round(x - r + div);
  }

  private getOutputScale(ctx: any) {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
      ctx.mozBackingStorePixelRatio ||
      ctx.msBackingStorePixelRatio ||
      ctx.oBackingStorePixelRatio ||
      ctx.backingStorePixelRatio || 1;
    const pixelRatio = devicePixelRatio / backingStoreRatio;
    return {
      sx: pixelRatio,
      sy: pixelRatio,
      scaled: pixelRatio !== 1,
    };
  }

  private paintOnCanvas() {
    const renderCapability = pdfjsLib.createPromiseCapability();
    const outputScale = this.getOutputScale(this.ctx);
    this.visible = false;
    const actualSizeViewport = this.page.pdfPage.getViewport({ scale: this.pdfService.scale * this.pdfService.CSS_UNIT});
    const renderViewport = actualSizeViewport.clone({ scale: this.pdfService.realScale * this.pdfService.CSS_UNIT });
    outputScale.sx *= actualSizeViewport.width / renderViewport.width;
    outputScale.sy *= actualSizeViewport.height / renderViewport.height;
    outputScale.scaled = true;
    if (outputScale.sx < 1 || outputScale.sy < 1) {
      outputScale.sx = 1;
      outputScale.sy = 1;
      outputScale.scaled = false;
    }
    // calculate max scale
    const pixelsInViewport = renderViewport.width * renderViewport.height;
    const maxScale = Math.sqrt(this.pdfService.MAX_CANVAS_PIXELS / pixelsInViewport);
    if (outputScale.sx > maxScale || outputScale.sy > maxScale) {
      outputScale.sx = maxScale;
      outputScale.sy = maxScale;
      outputScale.scaled = true;
      this.hasRestrictedScaling = true;
    } else {
      this.hasRestrictedScaling = false;
    }
    //
    const sfx = this.approximateFraction(outputScale.sx);
    const sfy = this.approximateFraction(outputScale.sy);
    this.h = this.roundToDivide(renderViewport.height * outputScale.sy, sfy[0]);
    this.w = this.roundToDivide(renderViewport.width * outputScale.sx, sfx[0]);
    this.rh = this.roundToDivide(renderViewport.height * 1, sfy[1]);
    this.rw = this.roundToDivide(renderViewport.width * 1 , sfx[1]);
    // Rendering area
    const transform = !outputScale.scaled ? null :
      [outputScale.sx, 0, 0, outputScale.sy, 0, 0];
    const renderTask = this.page.pdfPage.render({
      canvasContext: this.ctx,
      transform,
      viewport: renderViewport
    });
    const result = {
      promise: renderCapability.promise,
      onRenderContinue(cont) {
        cont();
      },
      cancel() {
        renderTask.cancel();
      },
    };

    renderTask.onContinue = (cont) => {
      this.visible = true;
      if (result.onRenderContinue) {
        result.onRenderContinue(cont);
      } else {
        cont();
      }
    };
    renderTask.promise.then(() => {
      this.visible = true;
      renderCapability.resolve();
    }, error => {
      this.visible = true;
      renderCapability.reject(error);
    });
    return result;
  }
}

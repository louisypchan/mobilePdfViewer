import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
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

  ready: boolean;
  paintTask: any;
  renderingState: number;

  constructor(private el: ElementRef, private pdfService: PdfService) { }

  ngOnInit() {
    this.ready = false;
  }

  ngAfterViewInit(): void {
    this.ready = true;
    this.draw();
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
      this.pdfService.renderHighestPriority.next();
    });
  }

  private paintOnCanvas() {
    const renderCapability = pdfjsLib.createPromiseCapability();
    const canvas = this.el.nativeElement.querySelector('canvas');
    canvas.mozOpaque = true;
    const ctx = canvas.getContext('2d', { alpha: false, });
    canvas.setAttribute('hidden', 'hidden');
    const viewport = this.page.pdfPage.getViewport({ scale: this.pdfService.realScale * this.pdfService.CSS_UNIT});
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.height = canvas.height + 'px';
    canvas.style.width = canvas.width + 'px';
    const renderTask = this.page.pdfPage.render({
      canvasContext: ctx,
      viewport
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
      canvas.removeAttribute('hidden');
      if (result.onRenderContinue) {
        result.onRenderContinue(cont);
      } else {
        cont();
      }
    };
    renderTask.promise.then(() => {
      canvas.removeAttribute('hidden');
      renderCapability.resolve();
    }, error => {
      canvas.removeAttribute('hidden');
      renderCapability.reject(error);
    });
    return result;
  }
}

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

  @Output() rendered = new EventEmitter<number>();
  @Output() rendering = new EventEmitter<number>();

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
    if (this.renderingState === 0) {
      this.renderingState = 1; // RUNNING
      this.rendering.emit(this.page.id);
      const paintTask = this.type === 'canvas' ? this.paintOnCanvas() : null;
      // TODO: support SVG
      if (paintTask) {
        const result = paintTask.promise.then(() => {
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
    }
  }

  private paintOnCanvas() {
    const renderCapability = pdfjsLib.createPromiseCapability();
    const canvas = this.el.nativeElement.querySelector('canvas');
    canvas.mozOpaque = true;
    const ctx = canvas.getContext('2d', { alpha: false, });
    canvas.setAttribute('hidden', 'hidden');
    // TODO: different viewports??
    let viewport = this.page.pdfPage.getViewport({ scale: this.pdfService.CSS_UNIT});
    const scale = this.el.nativeElement.offsetWidth / viewport.width * this.pdfService.scale;
    viewport = this.page.viewport.clone( {scale: scale * this.pdfService.CSS_UNIT });
    canvas.height = this.page.minHeight * this.pdfService.scale;
    canvas.width = this.el.nativeElement.offsetWidth * this.pdfService.scale;
    const renderTask = this.page.pdfPage.render({
      canvasContext: ctx,
      viewport,
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

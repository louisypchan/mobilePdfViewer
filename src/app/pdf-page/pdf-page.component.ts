import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {PdfService} from '../_service/pdf.service';

@Component({
  selector: 'app-pdf-page',
  templateUrl: './pdf-page.component.html',
  styleUrls: ['./pdf-page.component.scss']
})
export class PdfPageComponent implements OnInit, OnChanges {

  @Input() pages: any[];
  @Input() type: string;
  @Output() rendered = new EventEmitter<number>();
  @Output() rendering = new EventEmitter<number>();

  constructor(private pdfService: PdfService) { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('pages' in changes) {
    }
  }

  onRendering(id: number) {
    this.rendering.emit(id);
  }

  onRendered(id: number) {
    this.rendered.emit(id);
  }

}

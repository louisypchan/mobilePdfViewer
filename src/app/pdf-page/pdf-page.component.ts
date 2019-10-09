import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {PdfService} from '../_service/pdf.service';

@Component({
  selector: 'app-pdf-page',
  templateUrl: './pdf-page.component.html',
  styleUrls: ['./pdf-page.component.scss']
})
export class PdfPageComponent implements OnInit, OnChanges {

  @Input() pages: any[];
  @Input() type: string;

  constructor(private pdfService: PdfService) { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('pages' in changes) {
    }
  }

}

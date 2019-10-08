import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-pdf-page',
  templateUrl: './pdf-page.component.html',
  styleUrls: ['./pdf-page.component.scss']
})
export class PdfPageComponent implements OnInit {

  @Input() pages: any[];

  constructor() { }

  ngOnInit() {
  }

}

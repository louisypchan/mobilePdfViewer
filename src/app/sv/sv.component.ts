import {Component, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {PdfService} from '../_service/pdf.service';
import * as pdfjsLib from 'pdfjs-dist/webpack';
import {SatPopover} from '@ncstate/sat-popover';

@Component({
  selector: 'app-sv',
  templateUrl: './sv.component.html',
  styleUrls: ['./sv.component.scss']
})
export class SvComponent implements OnInit {

  signatureType: number;
  isTop: boolean;
  isBottom: boolean;
  url: string;
  ready: boolean;
  // @ts-ignore
  @ViewChild('signatures') signatures: SatPopover;

  constructor(private route: ActivatedRoute, public  pdfService: PdfService) {
    //
  }

  ngOnInit() {
    this.url = this.route.snapshot.queryParams.url || 'assets/wKhYFV1fhJGEA4FJAAAAADB1rU8208.pdf';
    this.signatureType = +(this.route.snapshot.queryParams.st || 1 );
    this.isTop = true;
    this.isBottom = true;
    this.ready = false;
  }

  onScroll(e) {
    this.isTop = 0 - e.scroller.scrollBehaviorY.currentPos  === 0 - e.scroller.scrollBehaviorY.minScrollPos;
    this.isBottom = 0 - e.scroller.scrollBehaviorY.currentPos  === 0 - e.scroller.scrollBehaviorY.maxScrollPos;
  }

  onBsReady() {
    this.ready = true;
    this.isBottom = false;
  }

  setTitleUsingMetadata() {
    this.pdfService.pdf.getMetadata().then(data => {
      this.pdfService.docInfo = data.info;
      this.pdfService.metadata = data.metadata;
      if (this.route.snapshot.queryParams.title) {
        this.pdfService.name = decodeURIComponent(this.route.snapshot.queryParams.title);
      }
      if (!this.pdfService.name && this.pdfService.metadata && this.pdfService.metadata.has('dc:title')) {
        this.pdfService.name = this.pdfService.metadata.get('dc:title');
        // Ghostscript sometimes returns 'Untitled', so prevent setting the
        // title to 'Untitled.
        // if (title !== 'Untitled') {
        //   pdfTitle = title;
        // }
      }
      if (!this.pdfService.name && this.pdfService.docInfo && this.pdfService.docInfo.Title) {
        this.pdfService.name = this.pdfService.docInfo.Title;
      }
      // last choice
      if (!this.pdfService.name || this.pdfService.name === 'Untitled') {
        // set title from url
        this.pdfService.name = decodeURIComponent(pdfjsLib.getFilenameFromUrl(this.url) || this.url);
      }
    });
  }

  openSignatureList() {
    this.signatures.open();
  }
  onSignaturesClose() {
    this.signatures.close();
  }

  scroll2Top() {
    this.pdfService.scrollToTop.next();
  }

  scroll2Bottom() {
    this.pdfService.scrollToBotoom.next();
  }
}

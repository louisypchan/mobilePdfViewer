import {AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist/webpack';

@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss']
})
export class PdfViewerComponent implements OnInit, AfterViewInit {

  @Input() file: string;

  pdf: any;
  pages: any[];
  currentPage: 1; //
  scale: 0; // unknown
  // @ts-ignore
  @ViewChild('pdfViewer') pdfViewer: ElementRef;

  constructor() { }

  ngOnInit() {
  }

  ngAfterViewInit(): void {
    this.initPdfViewer();
  }

  private reset() {
    this.pages = [];
    this.currentPage = 1;
    this.scale = 0;
  }

  private initPages() {
    if (!this.pdf) {
      return;
    }
    if (this.pdf) {
      this.reset();
    }
    const pagesCount = this.pdf.numPages;
    const pagesCapability = pdfjsLib.createPromiseCapability();
    pagesCapability.promise.then(() => {
      //
      console.log(this.pages);
    });
    const onePageRenderedCapability = pdfjsLib.createPromiseCapability();
    const firstPagePromise = this.pdf.getPage(1);
    //
    // Fetch a single page so we can get a viewport that will be the default
    // viewport for all pages
    firstPagePromise.then(pdfPage => {
      // Fetch all the pages since the viewport is needed before printing
      // starts to create the correct size canvas. Wait until one page is
      // rendered so we don't tie up too many resources early on.
      onePageRenderedCapability.promise.then(() => {
        // disableAutoFetch ??
        let getPagesLeft = pagesCount;
        for (let pageNum = 1; pageNum <= pagesCount; ++pageNum) {
          //
          this.pdf.getPage(pageNum).then(page => {
            this.pages.push(page);
            if (--getPagesLeft === 0) {
              pagesCapability.resolve();
            }
          }, (reason) => {
            console.error(`Unable to get page ${pageNum} to initialize viewer`,
              reason);
            if (--getPagesLeft === 0) {
              pagesCapability.resolve();
            }
          });
        }
      });
      this.update();
    });
  }

  private update() {

  }

  private initPdfViewer() {
    const loadingTask = pdfjsLib.getDocument({
      url: this.file,
      cMapPacked: true,
      cMapUrl: `assets/cmaps`,
    });
    loadingTask.onProgress = (progressData) => {
      console.log(progressData);
      // progress
    };
    loadingTask.promise.then((pdfDocument) => {
      this.pdf = pdfDocument;
      this.initPages();
    });
  }
}

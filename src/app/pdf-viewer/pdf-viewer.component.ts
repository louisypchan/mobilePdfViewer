import {AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist/webpack';
import { Page } from '../_model/Page';
import { PdfService } from '../_service/pdf.service';

@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss']
})
export class PdfViewerComponent implements OnInit, AfterViewInit {

  @Input() file: string;
  @Input() renderType: string;
  pages: Page[];
  currentPage: number; //
  pagesCount: number;
  scale: number; // unknown
  pagesRequests: any[];
  // @ts-ignore
  @ViewChild('pdfViewer') pdfViewer: ElementRef;

  constructor(private el: ElementRef, public pdfService: PdfService) { }

  ngOnInit() {
    if (!this.renderType) {
      this.renderType = 'canvas';
    }
  }

  ngAfterViewInit(): void {
    this.initPdfViewer();
  }

  private reset() {
    this.pages = [];
    this.currentPage = 1;
    this.pagesCount = 1;
    this.scale = 0;
    this.pagesRequests = [];
    this.pdfService.transform = {
      transformOrigin: '0% 0%',
      transform: `scale(${this.pdfService.scale}, ${this.pdfService.scale}) translate(0px, 0px)`
    };
  }

  private initPages() {
    if (!this.pdfService.pdf) {
      return;
    }
    this.reset();
    this.pagesCount = this.pdfService.pdf.numPages;
    const pagesCapability = pdfjsLib.createPromiseCapability();
    pagesCapability.promise.then(() => {
      //
      // console.log(this.pages);
    });
    const onePageRenderedCapability = pdfjsLib.createPromiseCapability();
    const firstPagePromise = this.pdfService.pdf.getPage(1);
    //
    // Fetch a single page so we can get a viewport that will be the default
    // viewport for all pages
    firstPagePromise.then(pdfPage => {
      const viewport = pdfPage.getViewport({ scale: this.pdfService.CSS_UNIT, });
      const minHeight = (this.pdfViewer.nativeElement.clientWidth - 16) * viewport.height / viewport.width;
      for (let pageNum = 1; pageNum <= this.pagesCount; ++pageNum) {
        this.pages.push({
          id: pageNum,
          minHeight,
          viewport,
          renderingState: 0
        });
      }
      // Fetch all the pages since the viewport is needed before printing
      // starts to create the correct size canvas. Wait until one page is
      // rendered so we don't tie up too many resources early on.
      onePageRenderedCapability.promise.then(() => {
        // disableAutoFetch ??
        let getPagesLeft = this.pagesCount;
        for (let pageNum = 1; pageNum <= this.pagesCount; ++pageNum) {
          //
          this.pdfService.pdf.getPage(pageNum).then(page => {
            const index = this.pages.findIndex(p => p.id === pageNum);
            if (!this.pages[index].pdfPage) {
              this.pages[index].pdfPage = page;
            }
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

  private binarySearchFirstItem(items, condition) {
    let minIndex = 0;
    let maxIndex = items.length - 1;
    if (items.length === 0 || !condition(maxIndex)) {
      return items.length;
    }
    while (minIndex < maxIndex) {
      const currentIndex = (minIndex + maxIndex) >> 1;
      if (condition(currentIndex)) {
        maxIndex = currentIndex;
      } else {
        minIndex = currentIndex + 1;
      }
    }
    return minIndex;
  }

  private getVisiblePages() {
    const ele = this.el.nativeElement.firstChild;
    const top = ele.scrollTop;
    const bottom = top + ele.clientHeight;
    const [visible, numViews] = [[], this.pagesCount];
    const firstVisibleElementInd = numViews === 0 ? 0 : this.binarySearchFirstItem(this.pages, (index) =>
      (9 + this.pages[index].minHeight) * (index + 1) > top);
    let lastEdge = -1;
    for (let i = firstVisibleElementInd; i < numViews; i++) {
      const currentHeight = 9 * (i + 1) + this.pages[i].minHeight * i;
      const viewBottom = (9 + this.pages[i].minHeight) * (i + 1);
      if (lastEdge === -1) {
        if (viewBottom >= bottom) {
          lastEdge = viewBottom;
        }
      } else if (viewBottom > lastEdge) {
        break;
      }
      if (viewBottom <= top || currentHeight >= bottom) {
        continue;
      }
      const hiddenHeight = Math.max(0, top - currentHeight) +
        Math.max(0, viewBottom - bottom);
      // @ts-ignore
      const percent = ((this.pages[i].minHeight - hiddenHeight) * 100) / this.pages[i].minHeight | 0;
      visible.push({
        index: i,
        percent
      });
    }
    const [first, last] = [visible[0], visible[visible.length - 1]];
    visible.sort((a, b) => {
      const pc = a.percent - b.percent;
      if (Math.abs(pc) > 0.001) {
        return -pc;
      }
      return a.index - b.index; // ensure stability
    });
    return { first, last, pages: visible, };
  }

  private update() {
    const visible = this.getVisiblePages();
    if (visible.pages.length === 0) {
      // no visible page
      return;
    }
    this.renderHighestPriority(visible);
  }

  private renderHighestPriority(currentlyVisiblePages) {
    const visible = currentlyVisiblePages || this.getVisiblePages();
    const index = this.getHighestPriorityIndex(visible);
    if (index > -1) {
      //
      this.ensurePdfPageLoaded(index);
    }
  }

  private ensurePdfPageLoaded(pageIndex: number) {
    if (this.pages[pageIndex].pdfPage) {
      return;
    }
    if (this.pagesRequests[pageIndex]) {
      return;
    }
    // starts from 1, so need to add 1
    const promise = this.pdfService.pdf.getPage(pageIndex + 1).then(pdfPage => {
      if (!this.pages[pageIndex].pdfPage) {
        this.pages[pageIndex].pdfPage = pdfPage;
      }
      this.pagesRequests[pageIndex] = false;
    }).catch(reason => {
      console.error('Unable to get page for page view', reason);
      // Page error -- there is nothing can be done.
      this.pagesRequests[pageIndex] = null;
    });
    this.pagesRequests[pageIndex] = promise;
  }

  private getHighestPriorityIndex(visible) {
    let index = -1;
    visible.pages.every(p => {
      if (this.pages[p.index].renderingState !== 3) {
        index = p.index;
        return false;
      }
    });
    if (index !== -1) {
      return index;
    }
    // All the visible views have rendered; try to render next/previous pages.
    const nextPageIndex = visible.last.index;
    if (this.pages[nextPageIndex] && this.pages[nextPageIndex].renderingState !== 3) {
      index = nextPageIndex;
    }
    // Everything that needs to be rendered has been.
    return index;
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
      this.pdfService.pdf = pdfDocument;
      this.initPages();
    });
  }
}

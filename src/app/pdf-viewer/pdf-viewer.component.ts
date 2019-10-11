import {AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist/webpack';
import {Page} from '../_model/Page';
import {PdfService} from '../_service/pdf.service';
import Hammer from 'hammerjs';

@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss']
})
export class PdfViewerComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input() file: string;
  @Input() renderType: string;
  @Input() renderVisibleOnly: boolean;
  pages: Page[];
  currentPage: number; //
  pagesCount: number;
  scale: number; // unknown
  pagesRequests: any[];
  // @ts-ignore
  @ViewChild('pdfViewer') pdfViewer: ElementRef;
  container: HTMLDivElement;

  constructor(private el: ElementRef, public pdfService: PdfService) { }

  ngOnInit() {
    if (!this.renderType) {
      this.renderType = 'canvas';
    }
  }

  ngAfterViewInit(): void {
    this.container = this.el.nativeElement.children[1];
    this.pdfService.renderHighestPriority.subscribe({
      next: () => {
        this.renderHighestPriority(null);
      }
    });
    this.initPdfViewer();
    this.handleEvents();
    this.watchScroll();
  }

  ngOnDestroy(): void {
    this.pdfService.renderHighestPriority.unsubscribe();
  }

  private reset() {
    this.pages = [];
    this.currentPage = 1;
    this.pagesCount = 1;
    this.scale = 0;
    this.pagesRequests = [];
    this.pdfService.translate = {
      x: 0,
      y: 0
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
      // pagesloaded
      // console.log(this.pages);
    });
    const onePageRenderedCapability = pdfjsLib.createPromiseCapability();
    const firstPagePromise = this.pdfService.pdf.getPage(1);
    //
    // Fetch a single page so we can get a viewport that will be the default
    // viewport for all pages
    firstPagePromise.then(pdfPage => {
      const viewport = pdfPage.getViewport({ scale: this.pdfService.CSS_UNIT, });
      this.pdfService.realScale = this.pdfService.areaWidth / viewport.width;
      const minHeight = this.pdfService.realScale * viewport.height;
      for (let pageNum = 1; pageNum <= this.pagesCount; ++pageNum) {
        this.pages.push({
          id: pageNum,
          minHeight,
          minWidth: this.pdfService.areaWidth * this.pdfService.scale,
          viewport,
          renderingState: 0
        });
      }
      this.pdfService.onAfterDraw.subscribe({
        next: () => {
          onePageRenderedCapability.resolve();
          this.pdfService.onAfterDraw.unsubscribe();
          this.pdfService.onAfterDraw = null;
        }
      });
      // Fetch all the pages since the viewport is needed before printing
      // starts to create the correct size canvas. Wait until one page is
      // rendered so we don't tie up too many resources early on.
      onePageRenderedCapability.promise.then(() => {
        // disableAutoFetch ??
        // console.log(this.pdfService.pdf.loadingParams.disableAutoFetch);
        if (this.renderVisibleOnly) {
          // XXX: Printing is semi-broken with auto fetch disabled.
          pagesCapability.resolve();
          return;
        }
        let getPagesLeft = this.pagesCount;
        for (let pageNum = 1; pageNum <= this.pagesCount; ++pageNum) {
          //
          this.pdfService.pdf.getPage(pageNum).then(page => {
            const index = this.pages.findIndex(p => p.id === pageNum);
            const vp = page.getViewport({ scale: this.pdfService.CSS_UNIT});
            if (vp.height / this.pages[index].viewport.height !== 1) {
              this.pages[index].minWidth = vp.width * this.pdfService.realScale;
              this.pages[index].minHeight = vp.height * this.pdfService.realScale;
            }
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
    const top = this.container.scrollTop;
    const bottom = top + this.container.clientHeight;
    const [visible, numViews] = [[], this.pagesCount];
    const firstVisibleElementInd = numViews === 0 ? 0 : this.binarySearchFirstItem(this.pages, (index) =>
      (this.pages[index].minHeight * (index + 1) + 5 * index) * this.pdfService.scale > top);
    let lastEdge = -1;
    for (let i = firstVisibleElementInd; i < numViews; i++) {
      const currentHeight = (5 * i + this.pages[i].minHeight * i) * this.pdfService.scale;
      const viewBottom = (this.pages[i].minHeight * (i + 1) + 5 * i) * this.pdfService.scale;
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
      const percent = ((this.pages[i].minHeight * this.pdfService.scale - hiddenHeight) * 100)
        / (this.pages[i].minHeight * this.pdfService.scale) | 0;
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
    // console.log(visible);
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
    this.pagesRequests[pageIndex] = this.pdfService.pdf.getPage(pageIndex + 1).then(pdfPage => {
      const index = this.pages.findIndex(p => p.id === (pageIndex + 1));
      const vp = pdfPage.getViewport({ scale: this.pdfService.CSS_UNIT});
      if (vp.height / this.pages[index].viewport.height !== 1) {
        this.pages[index].minWidth = vp.width * this.pdfService.realScale;
        this.pages[index].minHeight = vp.height * this.pdfService.realScale;
      }
      if (!this.pages[pageIndex].pdfPage) {
        this.pages[pageIndex].pdfPage = pdfPage;
      }
      this.pagesRequests[pageIndex] = false;
    }).catch(reason => {
      console.error('Unable to get page for page view', reason);
      // Page error -- there is nothing can be done.
      this.pagesRequests[pageIndex] = null;
    });
  }

  private getHighestPriorityIndex(visible) {
    let index = -1;
    if (visible.pages.length === 0) {
      return index;
    }
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
      // disableAutoFetch: true,
      rangeChunkSize: 1024 * 512,
      disableStream: true,
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

  private handleEvents() {
    this.pdfService.mc = new Hammer.Manager(this.container, { touchAction: 'pan-x pan-y' });
    this.pdfService.mc.add(new Hammer.Tap({ event: 'doubletap', taps: 2 }));
    this.pdfService.mc.on('doubletap', this.onDoubleTap.bind(this));
  }

  private watchScroll() {
    let rAF = null;
    this.container.addEventListener('scroll', (evt) => {
      if (rAF) {
        return;
      }
      rAF = window.requestAnimationFrame(() => {
        rAF = null;
        this.currentPage = this.getPageIndexFromLocation(this.container.scrollTop, 88) + 2;
        this.update();
      });
    }, true);
  }

  private binarySearch(array: number[], val: number, leftIndex: number, rightIndex: number) {
    if (leftIndex > rightIndex) {
      return leftIndex - 1;
    }
    const midIndex =  Math.floor((leftIndex + rightIndex) / 2);
    const midVal = array[midIndex];
    if (midVal > val) {
      return this.binarySearch(array, val, leftIndex, midIndex - 1);
    } else if (midVal < val) {
      return this.binarySearch(array, val, midIndex + 1, rightIndex);
    } else {
      return midIndex;
    }
  }

  private getPageIndexFromLocation(y: number, offset: number = 0) {
    const indexes = [];
    for (let i = 0; i < this.pagesCount; i++) {
      const viewBottom = (this.pages[i].minHeight * (i + 1) + 5 * i) * this.pdfService.scale;
      indexes.push(viewBottom - offset);
    }
    return this.binarySearch(indexes, y, 0, this.pagesCount - 1);
  }

  private onDoubleTap(e) {
    // console.log(e);
    const scrollTop = this.container.scrollTop;
    const scrollLeft = this.container.scrollLeft;
    const [x, y] = [scrollLeft + e.center.x, scrollTop + e.center.y];
    const pageIndex = this.getPageIndexFromLocation(y) + 1;
    if (this.pdfService.scale > 1) {
      this.pdfService.scale--;
    } else {
      this.pdfService.scale++;
    }
    const scaleViewportWidth = ((this.pdfService.scale - 1) * this.pages[pageIndex].minWidth) / this.pdfService.scale;
    const scaleViewportHeight = ((this.pdfService.scale - 1) * this.pages[pageIndex].minHeight) / this.pdfService.scale;
    const newX = x * scaleViewportWidth / this.pages[pageIndex].minWidth;
    const newY = y * scaleViewportHeight / this.pages[pageIndex].minHeight;
    this.pdfService.translate = {
      x: 0 - newX,
      y: 0 - newY
    };
  }

  onRendering(id: number) {
    const index = this.pages.findIndex(page => page.id === id);
    this.pages[index].renderingState = 1;
  }

  onRendered(id: number) {
    const index = this.pages.findIndex(page => page.id === id);
    this.pages[index].renderingState = 3;
  }
}

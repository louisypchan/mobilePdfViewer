import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output, QueryList,
  ViewChild, ViewChildren
} from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist/webpack';
import {Page} from '../_model/Page';
import {PdfService} from '../_service/pdf.service';
import Hammer from 'hammerjs';
import BScroll from '@better-scroll/core';
import Zoom from '../plugins/zoom';
import {ActivatedRoute} from '@angular/router';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {Stamp} from '../_model/Stamp';
import {Point} from '../_model/Point';
import {SatPopover} from '@ncstate/sat-popover';

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
  pagesRequests: any[];
  // @ts-ignore
  @ViewChild('pdfViewer') pdfViewer: ElementRef;
  @ViewChildren('popover') popover: QueryList<SatPopover>;
  container: HTMLDivElement;
  bs: any;
  @Output() docReady = new EventEmitter();
  @Output() onscroll = new EventEmitter<any>();
  @Output() bsReady = new EventEmitter<any>();
  stamps: Stamp[];
  offsetHeight: number;
  boundariesArray: number[];

  constructor(private el: ElementRef, public pdfService: PdfService, private zone: NgZone, private route: ActivatedRoute) { }

  ngOnInit() {
    this.stamps = [];
    BScroll.use(Zoom);
    if (!this.renderType) {
      this.renderType = 'canvas';
    }
  }

  ngAfterViewInit(): void {
    this.container = this.el.nativeElement.children[1];
    this.offsetHeight = document.getElementById('title').offsetHeight;
    this.pdfService.renderHighestPriority.subscribe({
      next: () => {
        this.renderHighestPriority(null);
      }
    });
    this.initPdfViewer();
    this.handleEvents();
  }

  ngOnDestroy(): void {
    this.pdfService.scrollToBotoom.complete();
    this.pdfService.scrollToTop.complete();
    this.pdfService.scrollToBotoom.unsubscribe();
    this.pdfService.scrollToTop.unsubscribe();
    if (this.bs) {
      this.bs.off('scroll', this.watchScroll.bind(this));
      this.bs.off('afterZoom', this.zoomEnd.bind(this));
      this.bs.destory();
    }
    this.pdfService.renderHighestPriority.complete();
    this.pdfService.renderHighestPriority.unsubscribe();
  }

  private reset() {
    this.pages = [];
    this.currentPage = 1;
    this.pagesCount = 1;
    this.pagesRequests = [];
    this.pdfService.previewScale = +(this.pdfService.scale + '');
  }

  private initPages() {
    if (!this.pdfService.pdf) {
      return;
    }
    this.reset();
    this.pagesCount = this.pdfService.pdf.numPages;
    const pagesCapability = pdfjsLib.createPromiseCapability();
    pagesCapability.promise.then(() => {
      // this.bs.zoomTo(this.pdfService.scale, 0, 0);
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
          minWidth: this.pdfService.areaWidth,
          visible: false,
          scale: this.pdfService.scale,
          viewport,
          renderingState: 0
        });
      }
      // this.pages[0].pdfPage = pdfPage;
      // this.pages[0].visible = true;
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
      requestAnimationFrame(() => {
        this.bs = new BScroll(this.container, {
          probeType: 3,
          scrollX: true,
          scrollY: true,
          scrollbar: true,
          HWCompositing: false,
          bindToWrapper: true,
          bounceTime: 400,
          autoBlur: true,
          zoom: {
            start: this.pdfService.scale,
            min: 1,
            max: 3,
            hts: () => {
              this.removeStampsStatus();
            }
          }
        });
        this.bs.on('scroll', this.watchScroll, this);
        this.bs.on('afterZoom', this.zoomEnd, this);
        // this.bs.on('touchEnd', this.removeStampsStatus, this);
        this.pdfService.scrollToTop.subscribe({
          next: () => {
            //
            this.bs.scrollTo(this.bs.x, 0, 800);
          }
        });
        this.pdfService.scrollToBotoom.subscribe({
          next: () => {
            //
            this.bs.scrollTo(this.bs.x, this.bs.scroller.scrollBehaviorY.maxScrollPos, 800);
          }
        });
        this.bsReady.emit();
        this.update({x: 0, y: 0});
      });
    });
  }

  private removeStampsStatus() {
    this.popover.forEach(p => {
      p.close();
    });
    this.stamps.forEach(stamp => {
      stamp.selected = false;
    });
  }

  private binarySearchFirstItem(items, condition) {
    let minIndex = 0;
    let maxIndex = items.length - 1;
    if (items.length === 0) {
      return items.length;
    }
    if (!condition(maxIndex)) {
      return maxIndex;
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

  private getVisiblePages(cords) {
    const top = Math.abs(cords ? cords.y : this.bs.y);
    const bottom = top + this.container.clientHeight;
    const [visible, numViews] = [[], this.pagesCount];
    const firstVisibleElementInd = numViews === 0 ? 0 : this.binarySearchFirstItem(this.pages, (index) => {
      const offset = (this.container.offsetHeight - this.pages[index].minHeight + 5) * this.pdfService.scale;
      return (this.pages[index].minHeight * (index + 1) + 5 * index) * this.pdfService.scale > top + offset;
    });
    this.currentPage = firstVisibleElementInd + 1;
    this.pages[this.currentPage - 1].scale = this.pdfService.scale;
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
      if (!this.pages[i].visible) {
        this.pages[i].visible = true;
      }
      this.pages[i].scale = this.pdfService.scale;
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

  private update(cords) {
    const visible = this.getVisiblePages(cords);
    if (visible.pages.length === 0) {
      // no visible page
      return;
    }
    this.renderHighestPriority(visible);
  }

  private renderHighestPriority(currentlyVisiblePages) {
    const visible = currentlyVisiblePages || this.getVisiblePages(null);
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
      this.pagesRequests[pageIndex] = null;
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
      rangeChunkSize: 1024 * 1024,
      disableStream: true,
      cMapUrl: `assets/cmaps/`,
    });
    loadingTask.onProgress = (progressData) => {
      console.log(progressData);
      // progress
    };
    loadingTask.promise.then((pdfDocument) => {
      this.pdfService.pdf = pdfDocument;
      this.docReady.emit();
      this.initPages();
    });
  }

  private handleEvents() {
    this.pdfService.mc = new Hammer.Manager(this.container);
    // this.pdfService.mc.add(new Hammer.Pan({ threshold: 0, pointers: 1}));
    this.pdfService.mc.add(new Hammer.Tap({ event: 'doubletap', taps: 2 }));
    this.pdfService.mc.on('doubletap', this.onDoubleTap.bind(this));
  }

  watchScroll(cords) {
    this.update(cords);
    this.onscroll.emit({
      x: cords.x,
      y: cords.y,
      scroller: this.bs.scroller
    });
  }

  zoomEnd(e) {
    requestAnimationFrame(() => {
      const pageIndex = this.getPageIndexFromLocation(e.y) + 1;
      this.pdfService.previewScale = +(this.pdfService.scale + '');
      this.pdfService.scale = e.scale;
      this.pages[pageIndex].scale = this.pdfService.scale;
    });
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
    this.boundariesArray = [];
    for (let i = 0; i < this.pagesCount; i++) {
      const viewBottom = (this.pages[i].minHeight * (i + 1) + 5 * i) * this.pdfService.scale;
      this.boundariesArray.push(viewBottom - offset);
    }
    return this.binarySearch(this.boundariesArray, y, 0, this.pagesCount - 1);
  }

  private onDoubleTap(e) {
    let scale = this.pdfService.scale;
    if (scale > 1) {
      scale--;
    } else {
      scale++;
    }
    // this.pages[pageIndex].scale = this.pdfService.scale;
    this.bs.zoomTo(scale, e.center.x, e.center.y);
  }

  onRendering(id: number) {
    const index = this.pages.findIndex(page => page.id === id);
    this.pages[index].renderingState = 1;
  }

  onRendered(id: number) {
    const index = this.pages.findIndex(page => page.id === id);
    this.pages[index].renderingState = 3;
  }

  moveStamp(e: Point, index: number, popover: SatPopover) {
    popover.close();
    this.stamps[index].selected = false;
    this.stamps[index].viewport.left = this.stamps[index].viewport.left + e.x;
    this.stamps[index].viewport.top = this.stamps[index].viewport.top + e.y;
  }

  private adjustBoundary(left: number, top: number, rect: DOMRect | ClientRect): Point {
    let pageIndex = this.getPageIndexFromLocation(top * this.pdfService.scale) + 1;
    // console.log(this.pdfViewer.nativeElement.getBoundingClientRect());
    if (top < 0) {
      top = 0;
    }
    if (top * this.pdfService.scale + rect.height > this.boundariesArray[this.boundariesArray.length - 1]) {
      top = (this.boundariesArray[this.boundariesArray.length - 1] - rect.height) / this.pdfService.scale;
    }
    if (top * this.pdfService.scale + rect.height > this.boundariesArray[pageIndex]) {
      // console.log(pageIndex);
      if (top * this.pdfService.scale + rect.height / 2 - this.boundariesArray[pageIndex] > 0) {
        top = (this.boundariesArray[pageIndex] + 5 * this.pdfService.scale) / this.pdfService.scale;
        pageIndex = pageIndex + 1;
      } else {
        top = (this.boundariesArray[pageIndex] - rect.height) / this.pdfService.scale;
      }
    }
    if (left < 0) {
      left = 0;
    }
    if ( this.pages[pageIndex] && left * this.pdfService.scale + rect.width > this.pages[pageIndex].minWidth * this.pdfService.scale) {
      left = (this.pages[pageIndex].minWidth * this.pdfService.scale - rect.width) / this.pdfService.scale;
    }
    return {
      x: left,
      y: top
    };
  }

  adjustStampBoundary(event: any, index: number, popover: SatPopover) {
    if (event.dragEvent) {
      const rect = event.source.getBoundingClientRect();
      const [left, top] = [this.stamps[index].viewport.left, this.stamps[index].viewport.top];
      const point = this.adjustBoundary(left, top, rect);
      this.stamps[index].viewport.left = point.x;
      this.stamps[index].viewport.top = point.y;
    } else {
      // touch event
      this.stamps[index].selected = true;
      popover.open();
    }
  }

  removeStamp(index: number) {
    this.stamps.splice(index, 1);
  }

  drop(event: CdkDragDrop<string[]>) {
    if (event.previousContainer !== event.container && event.isPointerOverContainer) {
      const index = this.pdfService.stamps.findIndex(s => s.stampId === event.item.getRootElement().getAttribute('title'));
      const stamp = JSON.parse(JSON.stringify(this.pdfService.stamps[index]));
      const rect = event.item.getRootElement().getBoundingClientRect();
      let left = rect.left + event.distance.x - this.bs.x;
      let top = rect.top + event.distance.y - this.bs.y;
      left = left / this.pdfService.scale;
      top = top / this.pdfService.scale - this.offsetHeight;
      const point = this.adjustBoundary(left, top, rect);
      stamp.viewport.left = point.x;
      stamp.viewport.top = point.y;
      this.stamps.push(stamp);
    }
  }
}

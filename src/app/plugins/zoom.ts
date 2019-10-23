import BScroll from '@better-scroll/core';
import {
  getDistance,
  isUndef,
  fixInboundValue,
  offsetToBody,
  getRect,
  DOMRect,
  style
} from '@better-scroll/shared-utils';
import { TranslaterPoint } from '@better-scroll/core/src/translater';
import Behavior from '@better-scroll/core/src/scroller/Behavior';

interface ZoomConfig {
  start: number;
  min: number;
  max: number;
}

declare module '@better-scroll/core' {
  interface Options {
    zoom?: ZoomConfig;
  }
}

export default class Zoom {
  static pluginName = 'zoom';
  private options: Partial<ZoomConfig>;
  private currentScale: number;
  private wrapper: HTMLElement;
  private scaleElement: HTMLElement;
  private scaleElementInitSize: DOMRect;

  constructor(private bs: BScroll) {
    this.bs.proxy([{
      key: 'zoomTo',
      sourceKey: 'plugins.zoom.zoomTo'
    }]);
    this.bs.registerType(['beforeZoom', 'afterZoom']);
    this.options = this.bs.options.zoom as Partial<ZoomConfig>;
    this.currentScale = this.options.start || 1;
    this.init();
  }

  private init() {
    this.scaleElement = this.bs.scroller.content;
    this.scaleElement.style[style.transformOrigin as any] = '0 0';
    this.scaleElement.style[style.transform as any] =  this.scaleElement.style[style.transform as any]
      + ` scale(${this.currentScale}, ${this.currentScale})`;
    this.scaleElementInitSize = getRect(this.scaleElement);
    const scrollerIns = this.bs.scroller;
    this.wrapper = this.bs.scroller.wrapper;
    const scrollBehaviorX = scrollerIns.scrollBehaviorX;
    const scrollBehaviorY = scrollerIns.scrollBehaviorY;
    console.log(scrollBehaviorY);
    scrollerIns.translater.hooks.on('beforeTranslate', (transformStyle: string[], point: TranslaterPoint) => {
      const scale = point.scale ? point.scale : this.currentScale;
      this.currentScale = scale;
      transformStyle.push(`scale(${scale},${scale})`);
    });
  }

  private resetBoundaries(scale: number,
                          scrollBehavior: Behavior,
                          direction: 'x' | 'y',
                          extendValue?: number) {

  }
}


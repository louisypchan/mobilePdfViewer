import BScroll from '@better-scroll/core';
import EventEmitter from '@better-scroll/core/dist/types/base/EventEmitter';
import {
  getDistance,
  isUndef,
  fixInboundValue,
  getRect,
  DOMRect,
  style
} from '@better-scroll/shared-utils';
import { TranslaterPoint } from '@better-scroll/core/dist/types/translater';
import Behavior from '@better-scroll/core/dist/types/scroller/Behavior';

interface ZoomConfig {
  start: number;
  min: number;
  max: number;
  hts?: any;
}

interface Point {
  x: number;
  y: number;
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
  private zooming: boolean;
  private hooks: [];
  private startDistance: number;
  private startScale: number;
  private pos: Point;
  // private lastTransformScale: number;

  constructor(private bs: BScroll) {
    this.bs.proxy([{
      key: 'zoomTo',
      sourceKey: 'plugins.zoom.zoomTo'
    }, {
      key: 'getNewPos',
      sourceKey: 'plugins.zoom.getNewPos'
    }]);
    this.bs.registerType(['beforeZoom', 'afterZoom']);
    this.options = this.bs.options.zoom as Partial<ZoomConfig>;
    this.currentScale = this.options.start || 1;
    // this.lastTransformScale = this.currentScale;
    this.hooks = [];
    this.init();
  }

  private init() {
    this.scaleElement = this.bs.scroller.content;
    this.scaleElement.style[style.transformOrigin as any] = '0 0';
    this.scaleElement.style[style.transform as any] =  this.scaleElement.style[style.transform as any]
      + ` scale(${this.currentScale}, ${this.currentScale})`;
    this.scaleElementInitSize = getRect(this.scaleElement);
    this.wrapper = this.bs.scroller.wrapper;
    this.reset(this.currentScale);
    const scrollerIns = this.bs.scroller;
    //
    this.addHook(scrollerIns.actions.hooks, 'start', (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) {
        this.zoomStart(e);
      }
      if (this.options.hts) {
        this.options.hts();
      }
    });
    this.addHook(scrollerIns.actions.hooks, 'beforeMove', (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) {
        this.zoom(e);
        return true;
      }
      return false;
    });
    this.addHook(scrollerIns.actions.hooks, 'beforeEnd', (e: TouchEvent) => {
      if (this.zooming) {
        this.zoomEnd(e);
        return true;
      } else {
        return false;
      }
    });
    this.addHook(scrollerIns.translater.hooks, 'beforeTranslate', (transformStyle: string[], point: TranslaterPoint) => {
      const scale = point.scale ? point.scale : this.currentScale;
      this.currentScale = scale;
      transformStyle.push(`scale(${scale},${scale})`);
    });
    this.addHook(scrollerIns.hooks, 'ignoreDisMoveForSamePos', () => true);
    this.addHook(this.bs.hooks, 'destroy', this.destroy);
  }

  private getFingerDistance(e: TouchEvent) {
    const firstFinger = e.touches[0];
    const secondFinger = e.touches[1];
    const deltaX = Math.abs(firstFinger.pageX - secondFinger.pageX);
    const deltaY = Math.abs(firstFinger.pageY - secondFinger.pageY);
    return getDistance(deltaX, deltaY);
  }

  private zoomStart(e: TouchEvent) {
    this.zooming = true;
    const ff = e.touches[0];
    const sf = e.touches[1];
    this.startDistance = this.getFingerDistance(e);
    this.startScale = this.currentScale;
    this.pos = {
      x: Math.abs(ff.pageX + sf.pageX) / 2 - this.bs.x,
      y: Math.abs(ff.pageY + sf.pageY) / 2 - this.bs.y
    };
    this.bs.trigger(this.bs.eventTypes.beforeZoom, this.pos);
  }

  private zoom(e: TouchEvent) {
    const currentDistance = this.getFingerDistance(e);
    const currentScale = this.scaleCure((currentDistance / this.startDistance) * this.startScale);
    this.scaleTo(currentScale, this.pos, this.startScale, 0);
  }

  private zoomEnd(e: TouchEvent) {
    this.zooming = false;
    this.scaleTo(this.currentScale, this.pos, this.startScale || this.currentScale, 0);
    this.bs.trigger(this.bs.eventTypes.afterZoom, {x: this.pos.x,
    y: this.pos.y, scale: this.currentScale});
  }

  private reset(scale: number) {
    const scrollerIns = this.bs.scroller;
    const scrollBehaviorX = scrollerIns.scrollBehaviorX;
    const scrollBehaviorY = scrollerIns.scrollBehaviorY;
    // update scroll area
    this.resetBoundaries(scale, scrollBehaviorX, 'x');
    this.resetBoundaries(scale, scrollBehaviorY, 'y');
    // refresh indicates if exists
    if (this.bs.plugins.scrollbar) {
      this.bs.plugins.scrollbar.indicators.forEach(i => {
        i.refresh();
      });
    }
    this.bs.scroller = scrollerIns;
  }

  destroy() {
    this.hooks.forEach(item => {
      const hook = item[0];
      const hooksName = item[1];
      const handlerFn = item[2];
      // @ts-ignore
      hook.off(hooksName, handlerFn);
    });
    this.hooks.length = 0;
  }

  private addHook(hook: EventEmitter, name: string, handle: any) {
    hook.on(name, handle, this);
    // @ts-ignore
    this.hooks.push([hook, name, handle]);
  }

  private resetBoundaries(scale: number,
                          scrollBehavior: Behavior,
                          direction: 'x' | 'y',
                          extendValue?: number) {
    const p1 = direction === 'x' ? 'width' : 'height';
    const p2 = direction === 'x' ? 'offsetWidth' : 'offsetHeight';
    const max = 0 - (this.scaleElementInitSize[p1] * scale - this.wrapper[p2]);
    scrollBehavior.maxScrollPos = max;
    scrollBehavior.hasScroll = !!(0 - max);
  }

  zoomTo(scale: number, x: number, y: number) {
    this.zooming = true;
    const originX = x - this.bs.x;
    const originY = y - this.bs.y;
    const origin = {x: originX, y: originY};
    this.bs.trigger(this.bs.eventTypes.beforeZoom, origin);
    this.scaleTo(scale, origin, this.currentScale);
    this.zooming = false;
    this.bs.trigger(this.bs.eventTypes.afterZoom, {x: origin.x,
      y: origin.y, scale: this.currentScale});
  }

  private scaleCure(scale: number) {
    const { min = 1, max = 4 } = this.options;
    if (scale < min) {
      scale = 0.5 * min * Math.pow(2.0, scale / min);
    } else if (scale > max) {
      scale = 2.0 * max * Math.pow(0.5, max / scale);
    }
    return scale;
  }

  private restrictScaleLimit(scale: number): number {
    const { min = 1, max = 4 } = this.options;
    if (scale > max) {
      scale = max;
    } else if (scale < min) {
      scale = min;
    }
    return scale;
  }

  getNewPos(origin: number, scaled: number, scrollBehavior: Behavior, fixInBound?: boolean) {
    let newPos = origin - origin * scaled + scrollBehavior.startPos;
    if (fixInBound) {
      //
      newPos = fixInboundValue(newPos, scrollBehavior.maxScrollPos, 0);
    }
    return newPos;
  }

  private scaleTo(scale: number, origin: Point, previewScale: number, timing?: number) {
    this.currentScale = this.restrictScaleLimit(scale);
    const scaled = this.currentScale / previewScale;
    this.reset(this.currentScale);
    const scrollerIns = this.bs.scroller;
    // get new pos
    const newX = this.getNewPos(origin.x, scaled, scrollerIns.scrollBehaviorX, true);
    const newY = this.getNewPos(origin.y, scaled, scrollerIns.scrollBehaviorY, true);
    scrollerIns.scrollTo(
      newX,
      newY,
      isUndef(timing) ? this.bs.options.bounceTime : timing,
      undefined,
      {
        start: {
          scale: previewScale
        },
        end: {
          scale: this.currentScale,
        }
      }
    );
  }
}


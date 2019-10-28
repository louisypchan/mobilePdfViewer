import {Point} from './Point';

export interface Viewport {
  width: number;
  height: number;
  left?: number;
  top?: number;
  pip?: Point;
  pie?: Point;
}

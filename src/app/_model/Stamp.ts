import {Viewport} from './Viewport';

export interface Stamp {
  stampId: string;
  stampType: number;
  stampBase64: string;
  stampName: string;
  active?: boolean;
  dragging?: boolean;
  viewport?: Viewport;
}

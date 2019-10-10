export interface Page {
  id: number;
  minHeight: number;
  minWidth: number;
  pdfPage?: any;
  viewport: any;
  /*
   INITIAL: 0,
  RUNNING: 1,
  PAUSED: 2,
  FINISHED: 3
   */
  renderingState: number;
}

export const Utils = {
  dpi: (): number => {
    const div = document.createElement( 'div');
    div.style.height = '1in';
    div.style.width = '1in';
    div.style.top = '-100%"';
    div.style.left = '-100%';
    div.style.position = 'absolute';
    document.body.appendChild(div);
    const result =  div.offsetHeight;
    document.body.removeChild( div );
    return result;
  },
  mmToPx: (mm: number, dpi: number): number => {
    return (mm / 25.4) * dpi;
  }
};

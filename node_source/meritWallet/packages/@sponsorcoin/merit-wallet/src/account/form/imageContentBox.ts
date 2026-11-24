// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/form/imageContentBox.ts
//
// 2026-11-24 (owner rule 1: the white box keeps only 2px above and below the logo): a picture file carries its own empty (transparent) margins, which no CSS buffer can remove. This finds where the visible pixels are, as fractions of the picture, so the box can be cut to them.
// Reads the picture through a small canvas; a picture the browser will not let a page read (another site, no CORS) answers undefined and is shown whole.

export interface ImageContentBox {
  /** left, top, right, bottom of the visible pixels, each 0..1 of the picture's width / height */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const SAMPLE = 160;
const ALPHA_MIN = 12;

export function imageContentBox(img: HTMLImageElement): ImageContentBox | undefined {
  try {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) return undefined;
    const scale = Math.min(1, SAMPLE / Math.max(nw, nh));
    const w = Math.max(1, Math.round(nw * scale));
    const h = Math.max(1, Math.round(nh * scale));
    // an off-screen canvas: no document needed (the wallet keeps device access in its adapters), and an engine without it just shows the picture whole
    if (typeof OffscreenCanvas === 'undefined') return undefined;
    const ctx = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true });
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > ALPHA_MIN) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return undefined;
    // nothing to trim: leave the picture whole
    if (minX === 0 && minY === 0 && maxX === w - 1 && maxY === h - 1) return undefined;
    return { x0: minX / w, y0: minY / h, x1: (maxX + 1) / w, y1: (maxY + 1) / h };
  } catch {
    return undefined;
  }
}

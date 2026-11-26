// File: platform/browserZoom.ts
//
// The platform folder is the wallet's adapter to the device (the platform boundary test allows window / matchMedia here and nowhere else in src/). The browser-zoom compensation lives here for that reason; display/walletFrameScale.tsx re-exports it.
import { useEffect, useState } from 'react';
import { widthFitFactor } from '@sponsorcoin/spcoin-panels';

/**
 * 2026-11-26 (owner): the extension's element size is the standard (Width Scaler 1). Chrome keeps a zoom per site, and the page cannot read it apart from the screen's own scaling, but it can read their product, devicePixelRatio. The elements' size in SCREEN pixels is css size x zoom x devicePixelRatio, so scaling the page by REFERENCE_PIXEL_RATIO / devicePixelRatio gives every window the same element size on screen as the extension has, whatever its browser zoom. 
 * REFERENCE_PIXEL_RATIO is the extension side panel's pixel ratio (the Pixel Ratio row in Config -> Display shows it); provisional 4.2 until read from there.
 */
export const REFERENCE_PIXEL_RATIO = 4.2;
export function browserZoomCompensation(): number {
  try {
    if (typeof window === 'undefined') return 1;
    const ratio = window.devicePixelRatio || 1;
    // the browser zoom is cancelled (reference ratio / this ratio) and the elements fit the window (screen-pixel width over the reference width): the ratio drops out, leaving innerWidth x REFERENCE_PIXEL_RATIO / reference width, so the layout is the same width in its own units at any window width and any browser zoom
    return ratio > 0 ? (REFERENCE_PIXEL_RATIO / ratio) * widthFitFactor(window.innerWidth * ratio) : 1;
  } catch {
    return 1;
  }
}
/** The compensation, kept current while the browser zoom (or the screen) changes. */
export function useBrowserZoomCompensation(): number {
  const [factor, setFactor] = useState<number>(() => browserZoomCompensation());
  useEffect(() => {
    const onResize = () => setFactor(browserZoomCompensation());
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return factor;
}


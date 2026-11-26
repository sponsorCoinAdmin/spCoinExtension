// File: platform/browserZoom.ts
//
// The platform folder is the wallet's adapter to the device (the platform boundary test allows window / matchMedia here and nowhere else in src/). The browser-zoom compensation lives here for that reason; display/walletFrameScale.tsx re-exports it.
import { useEffect, useState } from 'react';

/**
 * 2026-11-26 (owner): the extension's element size is the standard (Width Scaler 1). Chrome keeps a zoom per site, and the page cannot read it apart from the screen's own scaling, but it can read their product, devicePixelRatio. The elements' size in SCREEN pixels is css size x zoom x devicePixelRatio, so scaling the page by REFERENCE_PIXEL_RATIO / devicePixelRatio gives every window the same element size on screen as the extension has, whatever its browser zoom. Mouse devices only (pointer: fine): a phone keeps its own sizing.
 * REFERENCE_PIXEL_RATIO is the extension side panel's pixel ratio (the Pixel Ratio row in Config -> Display shows it); provisional 4.2 until read from there.
 */
export const REFERENCE_PIXEL_RATIO = 4.2;
export function browserZoomCompensation(): number {
  try {
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) return 1;
    const ratio = window.devicePixelRatio || 1;
    return ratio > 0 ? REFERENCE_PIXEL_RATIO / ratio : 1;
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


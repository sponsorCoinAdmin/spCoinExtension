/**
 * 2026-11-26 (owner): the extension's element size is the standard (Width Scaler 1). Chrome keeps a zoom per site, and the page cannot read it apart from the screen's own scaling, but it can read their product, devicePixelRatio. The elements' size in SCREEN pixels is css size x zoom x devicePixelRatio, so scaling the page by REFERENCE_PIXEL_RATIO / devicePixelRatio gives every window the same element size on screen as the extension has, whatever its browser zoom.
 * REFERENCE_PIXEL_RATIO is the extension side panel's pixel ratio (the Pixel Ratio row in Config -> Display shows it); provisional 4.2 until read from there.
 */
export declare const REFERENCE_PIXEL_RATIO = 4.2;
export declare function browserZoomCompensation(): number;
/** The compensation, kept current while the browser zoom (or the screen) changes. */
export declare function useBrowserZoomCompensation(): number;

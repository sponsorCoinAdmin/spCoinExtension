/**
 * Holds the last successfully-shown image src until the NEXT one has
 * finished loading in the background, instead of handing a plain
 * `<img src={x}>` a brand-new URL and letting the element itself go
 * blank while the browser fetches it.
 *
 * Returns `nextSrc` unchanged on the very first render (nothing to hold
 * onto yet), then only updates once a later `nextSrc` change has actually
 * finished loading (or failed — see the onerror branch below).
 *
 * `fallbackSrc` (optional): when the background preload finds `nextSrc`
 * is broken, this hook hands the caller `fallbackSrc` directly instead of
 * the known-bad URL. Callers that don't pass one keep the original
 * behavior — the broken URL is handed through unchanged.
 */
export declare function usePreloadedImageSrc(nextSrc: string | undefined, fallbackSrc?: string): string | undefined;

// File: src/displayScale.ts
//
// 2026-11-20 (owner: the wallet is too small on a phone; "add display settings with a slider to scale the screen size", "a better default screen size for the phone"): the browser host's page scale. The wallet's text was drawn for a desktop panel (9 to 11 px on most screens),
// so a phone shows it small. The size is a percentage kept in this browser (each person sets their own) and applied to the whole page with CSS zoom, which the wallet's width-filling layout follows without breaking.
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

const KEY = 'merit.displayScale.v1';
export const DISPLAY_PERCENT_MIN = 80;
export const DISPLAY_PERCENT_MAX = 200; // 2026-11-20 (owner): the largest size the slider offers
/** A screen at most this wide is a phone: it starts at PHONE_DEFAULT_PERCENT. A wider screen is not, and starts at the size the wallet was designed for. */
const PHONE_MAX_WIDTH = 600;
/** 2026-11-20 (owner): a phone starts at 150%. (The wallet's text was drawn at 9 to 11 px for a desktop panel, which a phone shows small.) */
export const PHONE_DEFAULT_PERCENT = 150;

/** The size a screen of this width starts at: 150% on a phone, 100% on a wider screen. */
export function defaultDisplayPercent(viewportWidth: number): number {
  if (!(viewportWidth > 0) || viewportWidth > PHONE_MAX_WIDTH) return 100;
  return PHONE_DEFAULT_PERCENT;
}

function readSaved(): number | undefined {
  try {
    const raw = window.localStorage.getItem(KEY);
    const n = raw === null ? NaN : Number(raw);
    // a saved size outside the range (the limit has been 200, 165, 180 and is 200 again) is kept as close as the range allows, not thrown away
    return Number.isFinite(n) ? Math.min(DISPLAY_PERCENT_MAX, Math.max(DISPLAY_PERCENT_MIN, n)) : undefined;
  } catch {
    return undefined;
  }
}
function save(percent: number | undefined): void {
  try {
    if (percent === undefined) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, String(percent));
  } catch {
    /* storage unavailable: the size lasts for this page only */
  }
}
/** Scale the whole page (100 = as designed). */
export function applyDisplayPercent(percent: number): void {
  document.documentElement.style.zoom = percent === 100 ? '' : String(percent / 100);
}

/** The size this browser uses (its saved choice, else the default for this screen), applied to the page; `setPercent` is the person's choice, `reset` returns to the default. */
export function useDisplayScale(): { percent: number; defaultPercent: number; setPercent(percent: number): void; reset(): void } {
  // read once, before anything is scaled: the screen's own width decides the default
  const defaultRef = useRef<number>(defaultDisplayPercent(typeof window === 'undefined' ? 0 : window.innerWidth));
  const [percent, setPercentState] = useState<number>(() => (typeof window === 'undefined' ? 100 : readSaved() ?? defaultRef.current));
  useLayoutEffect(() => {
    applyDisplayPercent(percent);
  }, [percent]);
  const setPercent = useCallback((next: number) => {
    save(next);
    setPercentState(next);
  }, []);
  const reset = useCallback(() => {
    save(undefined);
    setPercentState(defaultRef.current);
  }, []);
  return { percent, defaultPercent: defaultRef.current, setPercent, reset };
}

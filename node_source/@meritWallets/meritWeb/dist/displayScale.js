// File: src/displayScale.ts
//
// 2026-11-20 (owner: the wallet is too small on a phone; "add display settings with a slider to scale the screen size", "a better default screen size for the phone"): the browser host's page scale. The wallet's text was drawn for a desktop panel (9 to 11 px on most screens),
// so a phone shows it small. The size is a percentage kept in this browser (each person sets their own) and applied to the whole page with CSS zoom, which the wallet's width-filling layout follows without breaking.
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { browserZoomCompensation } from '@sponsorcoin/merit-wallet';
const KEY = 'merit.displayScale.v2';
const OLD_KEY = 'merit.displayScale.v1';
/** 2026-11-25 (owner): the screen the wallet drew at 83% is now 100%. The page zoom is the slider's percent times this factor, so 100% looks as 83% looked, 200% as 166% did. A size saved under the old key (v1, before this) is converted so it looks the same. */
export const DISPLAY_BASE_FACTOR = 0.83;
export const DISPLAY_PERCENT_MIN = 50; // 2026-11-25 (owner): all three size bars run from 50% to 200%
export const DISPLAY_PERCENT_MAX = 200; // 2026-11-20 (owner): the largest size the slider offers
/** A screen at most this wide is a phone: it starts at PHONE_DEFAULT_PERCENT. A wider screen is not, and starts at the size the wallet was designed for. */
const PHONE_MAX_WIDTH = 600;
/** 2026-11-20 (owner): a phone starts at 150%. (The wallet's text was drawn at 9 to 11 px for a desktop panel, which a phone shows small.) */
export const PHONE_DEFAULT_PERCENT = 180; // 2026-11-25: 180% of the new base looks as the old 150% did (150 / 0.83)
/** The size a screen of this width starts at: 180% on a phone, 100% on a wider screen. */
export function defaultDisplayPercent(viewportWidth, hasMouse = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches) {
    // 2026-11-26 (owner): a phone is a touch screen, not a narrow window. A narrow window on a mouse device (the side panel, a small window, a browser zoomed in) starts at 100% too; its browser zoom is handled by the compensation.
    if (hasMouse)
        return 100;
    if (!(viewportWidth > 0) || viewportWidth > PHONE_MAX_WIDTH)
        return 100;
    return PHONE_DEFAULT_PERCENT;
}
function readSaved() {
    try {
        let raw = window.localStorage.getItem(KEY);
        if (raw === null) {
            // a size saved before the new base: converted so the page looks the same
            const old = window.localStorage.getItem(OLD_KEY);
            const oldN = old === null ? NaN : Number(old);
            if (Number.isFinite(oldN))
                raw = String(Math.round(oldN / DISPLAY_BASE_FACTOR));
        }
        const n = raw === null ? NaN : Number(raw);
        // a saved size outside the range (the limit has been 200, 165, 180 and is 200 again) is kept as close as the range allows, not thrown away
        return Number.isFinite(n) ? Math.min(DISPLAY_PERCENT_MAX, Math.max(DISPLAY_PERCENT_MIN, n)) : undefined;
    }
    catch {
        return undefined;
    }
}
function save(percent) {
    try {
        if (percent === undefined) {
            window.localStorage.removeItem(KEY);
            window.localStorage.removeItem(OLD_KEY);
        }
        else
            window.localStorage.setItem(KEY, String(percent));
    }
    catch {
        /* storage unavailable: the size lasts for this page only */
    }
}
/** Scale the whole page (100 = the base size, DISPLAY_BASE_FACTOR of the size the wallet was drawn at). */
export function applyDisplayPercent(percent) {
    // 2026-11-26 (owner): times the browser-zoom compensation, so a window looks the same size as the extension whatever its browser zoom (see merit-wallet walletFrameScale.tsx)
    document.documentElement.style.zoom = String((percent / 100) * DISPLAY_BASE_FACTOR * browserZoomCompensation());
}
/** The size this browser uses (its saved choice, else the default for this screen), applied to the page; `setPercent` is the person's choice, `reset` returns to the default. */
export function useDisplayScale() {
    // read once, before anything is scaled: the screen's own width decides the default
    const defaultRef = useRef(defaultDisplayPercent(typeof window === 'undefined' ? 0 : window.innerWidth));
    const [percent, setPercentState] = useState(() => (typeof window === 'undefined' ? 100 : readSaved() ?? defaultRef.current));
    useLayoutEffect(() => {
        applyDisplayPercent(percent);
        // the browser zoom (or the screen) changing is a resize: apply again
        const onResize = () => applyDisplayPercent(percent);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [percent]);
    const setPercent = useCallback((next) => {
        save(next);
        setPercentState(next);
    }, []);
    const reset = useCallback(() => {
        save(undefined);
        setPercentState(defaultRef.current);
    }, []);
    return { percent, defaultPercent: defaultRef.current, setPercent, reset };
}

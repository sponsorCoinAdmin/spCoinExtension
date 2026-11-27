import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// File: src/WalletImage.tsx
//
// 2026-11-27 (owner: "the image should always resolve as a promise and always be returned, or we display a missing-image icon"): an image the host supplies by address (the login logo).
// It loads through a promise that always settles: one retry after a short wait (a dev server rewriting the file, a slow network), then the wallet's own missing-image icon in the same box, so the layout never jumps and a broken-image glyph never shows.
import { useEffect, useState } from 'react';
const RETRY_WAIT_MS = 600;
/** Resolves with the address once the browser has the image; rejects when it cannot be loaded. Always settles. */
export function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = () => reject(new Error(`image failed: ${src}`));
        img.src = src;
    });
}
/** The image, tried twice; null when it never loads. */
export async function loadImageWithRetry(src, wait = RETRY_WAIT_MS) {
    try {
        return await loadImage(src);
    }
    catch {
        await new Promise((r) => setTimeout(r, wait));
        try {
            // a new query string so a cached failure is not reused
            return await loadImage(`${src}${src.includes('?') ? '&' : '?'}retry=1`);
        }
        catch {
            return null;
        }
    }
}
const missingBox = { display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', width: '100%', aspectRatio: '16 / 9', color: '#64748b' };
/** The missing-image icon: a framed picture with a slash. */
export function MissingImageIcon({ size = 48 }) {
    return (_jsxs("svg", { role: "img", "aria-label": "Image missing", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }), _jsx("circle", { cx: "8.5", cy: "8.5", r: "1.5" }), _jsx("path", { d: "M21 15l-5-5L5 21" }), _jsx("path", { d: "M3 3l18 18" })] }));
}
export default function WalletImage({ src, alt, style }) {
    const [state, setState] = useState(undefined);
    useEffect(() => {
        let live = true;
        void loadImageWithRetry(src).then((ok) => { if (live)
            setState({ src, ok }); });
        return () => { live = false; };
    }, [src]);
    const settled = state?.src === src ? state : undefined;
    if (settled?.ok)
        return _jsx("img", { src: settled.ok, alt: alt, style: style });
    // still loading: an empty box of the same shape; failed: the missing-image icon
    return _jsx("div", { style: missingBox, children: settled ? _jsx(MissingImageIcon, {}) : null });
}

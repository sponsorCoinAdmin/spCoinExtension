// File: display/walletFrameScale.tsx
//
// 2026-11-22 (owner: Display Size in every Merit wallet: extension, web app, sponsorcoin.org). The browser host scales its whole page (meritBrowser/displayScale.ts) and passes its own slider as configDisplaySizeContent. Every other host (the extension side panel,
// the web app's popup) passes none, so the wallet supplies the same slider itself and scales its OWN frame with CSS zoom. The frame's width and height limits are divided by the scale first, so the frame keeps its size on screen and its contents grow (like browser zoom).
import React, { useCallback, useState } from 'react';
import { DisplaySizePanel } from '@sponsorcoin/spcoin-panels';
import { usePlatform } from '../platform/platform';
const KEY = 'merit.walletFrameScale.v1';
export const FRAME_SCALE_MIN = 80;
export const FRAME_SCALE_MAX = 200;
function parse(raw) {
    const n = Number(raw);
    return raw !== null && Number.isFinite(n) && n >= FRAME_SCALE_MIN && n <= FRAME_SCALE_MAX ? n : 100;
}
/** The saved scale lives in the platform's own preference store (the wallet never touches the device itself). */
export function useWalletFrameScale() {
    const { storage } = usePlatform();
    const [percent, set] = useState(() => parse(storage.get(KEY)));
    const setPercent = useCallback((next) => {
        set(next);
        storage.set(KEY, String(next));
    }, [storage]);
    return { percent, setPercent };
}
export function frameScaleControl(scale) {
    return React.createElement(DisplaySizePanel, { percent: scale.percent, onPercentChange: scale.setPercent, defaultPercent: 100, min: FRAME_SCALE_MIN, max: FRAME_SCALE_MAX });
}

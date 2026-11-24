// File: display/walletFrameScale.tsx
//
// 2026-11-22 (owner: Display Size in every Merit wallet: extension, web app, sponsorcoin.org). The browser host scales its whole page (meritBrowser/displayScale.ts) and passes its own slider as configDisplaySizeContent. Every other host (the extension side panel,
// the web app's popup) passes none, so the wallet supplies the same slider itself and scales its OWN frame with CSS zoom. The frame's width and height limits are divided by the scale first, so the frame keeps its size on screen and its contents grow (like browser zoom).
import React, { useCallback, useState } from 'react';
import { DisplaySizePanel, DisplayScaleProvider } from '@sponsorcoin/spcoin-panels';
import { usePlatform } from '../platform/platform';
const KEY = 'merit.walletFrameScale.v1';
const TABLE_KEY = 'merit.tableDataScale.v1';
export const FRAME_SCALE_MIN = 80;
export const FRAME_SCALE_MAX = 200;
const META_KEY = 'merit.metaTableScale.v1';
export const META_SCALE_MIN = 80;
export const META_SCALE_MAX = 200;
export const TABLE_SCALE_MIN = 60;
export const TABLE_SCALE_MAX = 120;
function parse(raw, min, max) {
    const n = Number(raw);
    return raw !== null && Number.isFinite(n) && n >= min && n <= max ? n : 100;
}
/** The saved scale lives in the platform's own preference store (the wallet never touches the device itself). */
export function useWalletFrameScale() {
    const { storage } = usePlatform();
    const [percent, set] = useState(() => parse(storage.get(KEY), FRAME_SCALE_MIN, FRAME_SCALE_MAX));
    const setPercent = useCallback((next) => {
        set(next);
        storage.set(KEY, String(next));
    }, [storage]);
    return { percent, setPercent };
}
export function frameScaleControl(scale) {
    return React.createElement(DisplaySizePanel, { percent: scale.percent, onPercentChange: scale.setPercent, defaultPercent: 100, min: FRAME_SCALE_MIN, max: FRAME_SCALE_MAX });
}
/** The Data Table Size (the tables' own zoom; renamed from Table Data Size 2026-11-24, owner), kept in the platform's preference store; 100 = as designed. */
export function useTableDataScale() {
    const { storage } = usePlatform();
    const [percent, set] = useState(() => parse(storage.get(TABLE_KEY), TABLE_SCALE_MIN, TABLE_SCALE_MAX));
    const setPercent = useCallback((next) => {
        set(next);
        storage.set(TABLE_KEY, String(next));
    }, [storage]);
    return { percent, setPercent };
}
export function tableScaleControl(scale) {
    return React.createElement(DisplaySizePanel, { percent: scale.percent, onPercentChange: scale.setPercent, defaultPercent: 100, min: TABLE_SCALE_MIN, max: TABLE_SCALE_MAX, title: 'Data Table Size', panelId: 'TABLE_DATA_SIZE_PANEL' });
}
/** 2026-11-24 (owner): the Meta Table Size (the detail screens' meta tables), kept in the platform's preference store; 100 = as designed. */
export function useMetaTableScale() {
    const { storage } = usePlatform();
    const [percent, set] = useState(() => parse(storage.get(META_KEY), META_SCALE_MIN, META_SCALE_MAX));
    const setPercent = useCallback((next) => {
        set(next);
        storage.set(META_KEY, String(next));
    }, [storage]);
    return { percent, setPercent };
}
export function metaTableScaleControl(scale) {
    return React.createElement(DisplaySizePanel, { percent: scale.percent, onPercentChange: scale.setPercent, defaultPercent: 100, min: META_SCALE_MIN, max: META_SCALE_MAX, title: 'Meta Table Size', panelId: 'META_TABLE_SIZE_PANEL' });
}
/**
 * 2026-11-24 (owner: pinch on a header bar changes the Display Size): when the wallet scales its OWN frame (the host gave no Display Size slider), it provides that scale to the header bars; when a host owns the scale (the browser page), the host's provider is left alone.
 */
export function OwnDisplayScale({ own, scale, children }) {
    if (!own)
        return React.createElement(React.Fragment, null, children);
    return React.createElement(DisplayScaleProvider, { percent: scale.percent, onChange: scale.setPercent, min: FRAME_SCALE_MIN, max: FRAME_SCALE_MAX }, children);
}

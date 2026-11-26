// File: display/walletFrameScale.tsx
//
// 2026-11-22 (owner: Display Size in every Merit wallet: extension, web app, sponsorcoin.org). The browser host scales its whole page (meritBrowser/displayScale.ts) and passes its own slider as configDisplaySizeContent. Every other host (the extension side panel,
// the web app's popup) passes none, so the wallet supplies the same slider itself and scales its OWN frame with CSS zoom. The frame's width and height limits are divided by the scale first, so the frame keeps its size on screen and its contents grow (like browser zoom).
import React, { useCallback, useState } from 'react';
import { DisplaySizePanel, DisplayScaleProvider } from '@sponsorcoin/spcoin-panels';
import { usePlatform } from '../platform/platform';

const KEY = 'merit.walletFrameScale.v2';
const OLD_KEY = 'merit.walletFrameScale.v1';
/** 2026-11-25 (owner): the screen the wallet drew at 83% is now 100%. The frame's zoom is the slider's percent times this factor, so 100% looks as 83% looked. A size saved under the old key (v1) is converted so the wallet looks the same. */
export const FRAME_BASE_FACTOR = 0.83;
const TABLE_KEY = 'merit.tableDataScale.v1';
// 2026-11-25 (owner): all three size bars (Display, Data Table, Meta Table) run from 50% to 200%
export const FRAME_SCALE_MIN = 50;
export const FRAME_SCALE_MAX = 200;
const META_KEY = 'merit.metaTableScale.v1';
export const META_SCALE_MIN = 50;
export const META_SCALE_MAX = 200;
export const TABLE_SCALE_MIN = 50;
export const TABLE_SCALE_MAX = 200;

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
  React.useEffect(() => {
    const onResize = () => setFactor(browserZoomCompensation());
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return factor;
}

function parse(raw: string | null, min: number, max: number): number {
  const n = Number(raw);
  return raw !== null && Number.isFinite(n) && n >= min && n <= max ? n : 100;
}

/** The saved scale lives in the platform's own preference store (the wallet never touches the device itself). */
export function useWalletFrameScale(): { percent: number; setPercent(next: number): void } {
  const { storage } = usePlatform();
  const [percent, set] = useState<number>(() => {
    const saved = storage.get(KEY);
    if (saved !== null && saved !== undefined) return parse(saved, FRAME_SCALE_MIN, FRAME_SCALE_MAX);
    const old = Number(storage.get(OLD_KEY));
    return storage.get(OLD_KEY) != null && Number.isFinite(old) ? Math.min(FRAME_SCALE_MAX, Math.max(FRAME_SCALE_MIN, Math.round(old / FRAME_BASE_FACTOR))) : 100;
  });
  const setPercent = useCallback((next: number) => {
    set(next);
    storage.set(KEY, String(next));
  }, [storage]);
  return { percent, setPercent };
}

export function frameScaleControl(scale: { percent: number; setPercent(next: number): void }): React.ReactNode {
  return React.createElement(DisplaySizePanel, { percent: scale.percent, onPercentChange: scale.setPercent, defaultPercent: 100, min: FRAME_SCALE_MIN, max: FRAME_SCALE_MAX });
}

/** The Data Table Size (the tables' own zoom; renamed from Table Data Size 2026-11-24, owner), kept in the platform's preference store; 100 = as designed. */
export function useTableDataScale(): { percent: number; setPercent(next: number): void } {
  const { storage } = usePlatform();
  const [percent, set] = useState<number>(() => parse(storage.get(TABLE_KEY), TABLE_SCALE_MIN, TABLE_SCALE_MAX));
  const setPercent = useCallback((next: number) => {
    set(next);
    storage.set(TABLE_KEY, String(next));
  }, [storage]);
  return { percent, setPercent };
}

export function tableScaleControl(scale: { percent: number; setPercent(next: number): void }): React.ReactNode {
  return React.createElement(DisplaySizePanel, { percent: scale.percent, onPercentChange: scale.setPercent, defaultPercent: 100, min: TABLE_SCALE_MIN, max: TABLE_SCALE_MAX, title: 'Data Table Size', panelId: 'TABLE_DATA_SIZE_PANEL' });
}

/** 2026-11-24 (owner): the Meta Table Size (the detail screens' meta tables), kept in the platform's preference store; 100 = as designed. */
export function useMetaTableScale(): { percent: number; setPercent(next: number): void } {
  const { storage } = usePlatform();
  const [percent, set] = useState<number>(() => parse(storage.get(META_KEY), META_SCALE_MIN, META_SCALE_MAX));
  const setPercent = useCallback((next: number) => {
    set(next);
    storage.set(META_KEY, String(next));
  }, [storage]);
  return { percent, setPercent };
}

export function metaTableScaleControl(scale: { percent: number; setPercent(next: number): void }): React.ReactNode {
  return React.createElement(DisplaySizePanel, { percent: scale.percent, onPercentChange: scale.setPercent, defaultPercent: 100, min: META_SCALE_MIN, max: META_SCALE_MAX, title: 'Meta Table Size', panelId: 'META_TABLE_SIZE_PANEL' });
}

/**
 * 2026-11-24 (owner: pinch on a header bar changes the Display Size): when the wallet scales its OWN frame (the host gave no Display Size slider), it provides that scale to the header bars; when a host owns the scale (the browser page), the host's provider is left alone.
 */
export function OwnDisplayScale({ own, scale, children }: { own: boolean; scale: { percent: number; setPercent(next: number): void }; children: React.ReactNode }): React.ReactElement {
  if (!own) return React.createElement(React.Fragment, null, children);
  return React.createElement(DisplayScaleProvider, { percent: scale.percent, onChange: scale.setPercent, min: FRAME_SCALE_MIN, max: FRAME_SCALE_MAX }, children);
}

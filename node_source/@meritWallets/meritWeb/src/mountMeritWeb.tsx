// File: src/mountMeritWeb.tsx
//
// 2026-11-25 (owner: the wallet type, like the keystore or the vault, is INJECTED by the parent app; meritWeb needs no knowledge of frames): mounts the Merit Wallet into a page. Everything that differs by host arrives as an option:
// the wallet type, platform behavior (copy, open links, close), the close handler, and the test sections. Nothing here is test code.
import React from 'react';
import { createRoot } from 'react-dom/client';
import MeritWalletBrowser from './MeritWalletBrowser';
import type { BrowserWallet } from './createBrowserWallet';
import { MeritWalletType, domPlatform, type MeritPlatform } from '@sponsorcoin/merit-wallet';
import { resolveWalletType } from './walletType';
import { disableBrowserZoom } from './disableBrowserZoom';
import { recordPopupTimeline } from './popupLog';
import { mountPiecesFromInjectables, type MeritWebInjectables } from './injectables';

export interface MountMeritWebOptions {
  element: HTMLElement;
  core: BrowserWallet;
  snapshot: Record<string, unknown>;
  /** 2026-11-25: everything the host injects, in the one shape both mounts take (wallet type, settings, host functions: copyText, openUrl, close). The options below, when given, win over it. */
  injectables?: MeritWebInjectables;
  /** the Merit type the host wants shown (EXT, WEB_APP, WEB, ANDROID, IPHONE). Omitted or unknown: WEB. */
  walletType?: string;
  /** platform behavior the host replaces (for example copy and open-link through a parent page), layered over the browser's own. Omitted: the browser's own. */
  platform?: Partial<MeritPlatform>;
  /** what the wallet's close button does. Omitted: nothing. */
  onClose?: () => void;
  /** test-only sections a test page may inject (Test Accounts, Test Sites). The package has none of its own: a release page passes nothing. */
  configTestAccountsContent?: React.ReactNode;
  configTestSitesContent?: React.ReactNode;
}

export function mountMeritWeb({ element, core, snapshot, injectables, walletType, platform, onClose, configTestAccountsContent, configTestSitesContent }: MountMeritWebOptions): void {
  // 2026-11-25 (owner): no browser pinch zoom; the wallet's own pinch (Display Size, Meta Table Size) still works
  disableBrowserZoom();
  // 2026-11-26 (owner): a window opened by another page records what it does in its first seconds (see popupLog.ts)
  recordPopupTimeline();
  // 2026-11-26 (owner: "just do your best estimate and open once, stop the flashing"): a window opened from Config -> Test Sites is NOT resized, hidden or measured. It only tells the opener where it landed (rq = the width the opener asked window.open for), so the opener's estimate for the next window gets better.
  try {
    const requested = Number(new URLSearchParams(window.location.search).get('rq'));
    if (window.opener && requested > 0) {
      const openedAt = Math.round(window.innerWidth * (window.devicePixelRatio || 1));
      window.setTimeout(() => {
        try {
          window.opener?.postMessage({ type: 'merit-window-calibration', requested, physical: openedAt }, '*');
        } catch {
          /* no opener to tell */
        }
      }, 400);
    }
  } catch {
    /* nothing to report */
  }
  const injected = mountPiecesFromInjectables(injectables);
  const type = MeritWalletType[resolveWalletType(walletType ?? injected.walletType) as keyof typeof MeritWalletType];
  const platformOptions = injected.platform || platform ? { ...injected.platform, ...platform } : undefined;
  const merged = platformOptions ? ({ ...domPlatform, ...platformOptions } as MeritPlatform) : undefined;
  const close = onClose ?? injected.onClose;
  // the wallet fills its window, side to side and top to bottom, with square corners: the holding container is the one that rounds them
  createRoot(element).render(
    <div style={{ height: '100%' }}>
      <MeritWalletBrowser core={core} walletType={type} platform={merged} docked fullWidth data={snapshot} configTestAccountsContent={configTestAccountsContent} configTestSitesContent={configTestSitesContent} onClose={close ?? (() => undefined)} />
    </div>,
  );
}

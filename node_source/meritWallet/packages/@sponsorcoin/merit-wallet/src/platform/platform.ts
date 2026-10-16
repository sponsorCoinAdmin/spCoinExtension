// File: src/platform/platform.ts
//
// 2026-10-15 (docs/design/spcoinPackagesDesign.txt sections 8.5.7 item 1 and 8.5.8) -- the PLATFORM interface of the host contract: what the wallet needs from the device it runs on, as one interface a deployment implements. It is the "Platform" host interface of
// the package design (open a URL, copy to the clipboard, ...): the web app and the extension use the DOM implementation (./domPlatform.ts, the default); an Android or phone host injects its own through the `platform` prop of MeritWallet.
// The component calls these methods and never reaches for window, document, navigator or localStorage itself (checked by test/platformBoundary.test.mjs).
//
// This file holds no global: the interface, the React context that carries the host's choice, and the hook the components read it with.
import { createContext, useContext } from 'react';
import { domPlatform } from './domPlatform';

/** A tiny synchronous key-value store for UI preferences (not for keys: those are the vault's). */
export interface PlatformStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export interface MeritPlatform {
  /** Put text on the clipboard. Rejects when the device refuses. */
  copyText(text: string): Promise<void>;
  /** Open an address: in a new window by default, in the current one with `sameTab` (a mailto: link). */
  openUrl(url: string, options?: { sameTab?: boolean }): void;
  /** Hand the person a file to keep (the wallet backup): a download in a browser, a share sheet on a phone. */
  saveFile(name: string, content: string, mimeType: string): void;
  /** Small UI preferences that survive a restart. */
  storage: PlatformStorage;
  /** Is the wallet's page hidden (the tab was switched away, the window minimised)? A shown secret is cleared when it is. */
  isHidden(): boolean;
  /** The page was hidden or shown again. Returns the unsubscribe function. */
  onVisibilityChange(listener: () => void): () => void;
  /** The wallet's window came back to the front (an extension may have been installed meanwhile): the lists refresh. Returns the unsubscribe function. */
  onForeground(listener: () => void): () => void;
}

/** What a component reads: the host's platform, or the DOM one when the host gave none (the web app and the extension give none). */
export const MeritPlatformContext = createContext<MeritPlatform>(domPlatform);

export const usePlatform = (): MeritPlatform => useContext(MeritPlatformContext);

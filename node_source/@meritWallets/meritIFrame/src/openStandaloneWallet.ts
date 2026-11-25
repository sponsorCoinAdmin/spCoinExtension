// File: src/openStandaloneWallet.ts
//
// 2026-11-19 -- moved here from components/views/BrowserPanes/Header.tsx (which opened the stand-alone wallet). The wallet opens in its OWN browser window: its own document, so its own engine state and storage, with none of an iframe's storage, permission and message-bridge
// trouble. createWalletFrame is the iframe form, for a page that wants the wallet inline; it is the same URL, so the same wallet.
export const STANDALONE_WALLET_URL = 'http://localhost:3100/';
export const STANDALONE_WALLET_WINDOW = 'spcoin-standalone-wallet';

export interface StandaloneWalletOptions {
  /** Where the wallet app is served. Default: the spcoin-wallet dev app. */
  url?: string;
  width?: number;
  height?: number;
}

/** Open the wallet in its own popup window (or focus the one already open). Returns the window, or null when the browser blocked it. */
export function openStandaloneWallet({ url = STANDALONE_WALLET_URL, width = 460, height = 860 }: StandaloneWalletOptions = {}): Window | null {
  return window.open(url, STANDALONE_WALLET_WINDOW, `popup,width=${width},height=${height}`);
}

export interface WalletFrameOptions {
  url?: string;
  /** Where to put the frame. */
  parent: HTMLElement;
  width?: string;
  height?: string;
}

export interface WalletFrameHandle {
  frame: HTMLIFrameElement;
  /** Remove the frame. */
  dispose(): void;
}

/** The wallet inline, in an iframe of its own origin (no sandbox escape: it keeps its own storage). */
export function createWalletFrame({ url = STANDALONE_WALLET_URL, parent, width = '460px', height = '860px' }: WalletFrameOptions): WalletFrameHandle {
  const frame = document.createElement('iframe');
  frame.src = url;
  frame.title = 'Merit Wallet';
  frame.style.cssText = `width:${width};height:${height};border:0;`;
  parent.appendChild(frame);
  return { frame, dispose: () => frame.remove() };
}

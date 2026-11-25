// File: src/index.ts
//
// @meritWallets/meritWeb: the Merit Wallet web app (see README.md). 2026-11-25 (owner): meritBrowser's code was moved here, so this package is the whole wallet for a browser page.
export { mountMeritWeb } from './mountMeritWeb';
export type { MountMeritWebOptions } from './mountMeritWeb';
export { resolveWalletType } from './walletType';
export { mountPiecesFromInjectables } from './injectables';
// 2026-11-25: the page's debug capture, shared by every page that hosts the wallet (it was copied into four places)
export { installDebugCapture } from './debugCapture';
export type { MeritWebInjectables, HostFunction, MountPieces } from './injectables';
export type { MeritWebType } from './walletType';
export { default as MeritWalletBrowser } from './MeritWalletBrowser';
export type { MeritWalletBrowserProps } from './MeritWalletBrowser';
export { createBrowserWallet, BROWSER_AUTO_LOCK_MS } from './createBrowserWallet';
export type { BrowserChain, BrowserOnboarding, BrowserWallet, BrowserWalletOptions } from './createBrowserWallet';
export { createBrowserSend } from './browserSend';
export type { BrowserSendOptions, BrowserSendParams } from './browserSend';
export { useBrowserApproval } from './useBrowserApproval';
export { describeApproval } from './describeApproval';
export type { BrowserApprovalPage } from './useBrowserApproval';
export { registerBrowserDebug, endpointForDump } from './registerBrowserDebug';
export { meritDebug } from '@sponsorcoin/merit-wallet';
export { registerBrowserEngineHosts } from './registerBrowserEngineHosts';
export { registerBrowserData } from './registerBrowserData';
export type { BrowserDataSnapshot } from './registerBrowserData';
export { default as BrowserProviders } from './BrowserProviders';
export type { BrowserProvidersProps } from './BrowserProviders';
export { createBrowserSponsorHosts, readSpCoin } from './browserSponsor';

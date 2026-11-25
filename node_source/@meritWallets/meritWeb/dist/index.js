// File: src/index.ts
//
// @meritWallets/meritWeb: the Merit Wallet web app (see README.md). 2026-11-25 (owner): meritBrowser's code was moved here, so this package is the whole wallet for a browser page.
export { mountMeritWeb } from './mountMeritWeb';
export { resolveWalletType } from './walletType';
export { mountPiecesFromInjectables } from './injectables';
export { default as MeritWalletBrowser } from './MeritWalletBrowser';
export { createBrowserWallet, BROWSER_AUTO_LOCK_MS } from './createBrowserWallet';
export { createBrowserSend } from './browserSend';
export { useBrowserApproval } from './useBrowserApproval';
export { describeApproval } from './describeApproval';
export { registerBrowserDebug, endpointForDump } from './registerBrowserDebug';
export { meritDebug } from '@sponsorcoin/merit-wallet';
export { registerBrowserEngineHosts } from './registerBrowserEngineHosts';
export { registerBrowserData } from './registerBrowserData';
export { default as BrowserProviders } from './BrowserProviders';
export { createBrowserSponsorHosts, readSpCoin } from './browserSponsor';

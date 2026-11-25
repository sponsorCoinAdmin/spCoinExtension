// File: src/index.ts
//
// @meritWallets/meritExtension: the Chrome extension's package. It holds the extension's INJECTABLES (what the wallet's platform does for copy, open an address and close, done with the extension APIs) and mounts the wallet, meritWeb, straight into an extension page as the EXT type.
// 2026-11-25 (owner): it does not use the MeritWallet component and it does not use a frame: the extension page IS the wallet's page, so meritWeb is mounted directly. The extension's vault, connect relay and provider become further functions here when they are moved over.
import { mergeInjectables, mountMeritWeb } from '@meritWallets/meritWeb';
import { extensionInjectables } from './injectables';
export { extensionInjectables } from './injectables';
/** The Merit type this package injects. */
export const WALLET_TYPE = 'EXT';
/** The APIs of the page this runs in: the clipboard, chrome.tabs when it exists, window.open and window.close. */
export function pageExtensionApis() {
    const chromeApi = globalThis.chrome;
    return {
        clipboard: typeof navigator !== 'undefined' ? navigator.clipboard : undefined,
        tabs: chromeApi?.tabs,
        openWindow: (url) => { window.open(url, '_blank', 'noopener,noreferrer'); },
        closePage: () => { window.close(); },
    };
}
/** Mount the wallet into an extension page: `mountMeritExtension({ element, core, snapshot })`. */
export function mountMeritExtension({ injectables, apis, ...rest }) {
    mountMeritWeb({ ...rest, injectables: mergeInjectables(extensionInjectables(apis ?? pageExtensionApis()), injectables, WALLET_TYPE) });
}

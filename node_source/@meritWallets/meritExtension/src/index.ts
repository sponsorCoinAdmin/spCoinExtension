// File: src/index.ts
//
// @meritWallets/meritExtension: the Chrome extension's package. It holds the extension's INJECTABLES (what the wallet's platform does for copy, open an address and close, done with the extension APIs) and mounts the wallet, meritWeb, straight into an extension page as the EXT type.
// 2026-11-25 (owner): it does not use the MeritWallet component and it does not use a frame: the extension page IS the wallet's page, so meritWeb is mounted directly. The extension's vault, connect relay and provider become further functions here when they are moved over.
import { mergeInjectables, mountMeritWeb, type MeritWebInjectables, type MountMeritWebOptions } from '@meritWallets/meritWeb';
import { extensionInjectables, type ExtensionApis } from './injectables';

export { extensionInjectables, type ExtensionApis } from './injectables';

/** The Merit type this package injects. */
export const WALLET_TYPE = 'EXT' as const;

export interface MeritExtensionOptions extends Omit<MountMeritWebOptions, 'walletType' | 'injectables' | 'platform' | 'onClose'> {
  /** The extension's own functions and settings, laid over the defaults (a function with the same name replaces the default). */
  injectables?: Omit<MeritWebInjectables, 'walletType'>;
  /** The APIs to use instead of the page's own (for tests). */
  apis?: ExtensionApis;
}

/** The APIs of the page this runs in: the clipboard, chrome.tabs when it exists, window.open and window.close. */
export function pageExtensionApis(): ExtensionApis {
  const chromeApi = (globalThis as { chrome?: { tabs?: { create(options: { url: string }): unknown } } }).chrome;
  return {
    clipboard: typeof navigator !== 'undefined' ? navigator.clipboard : undefined,
    tabs: chromeApi?.tabs,
    openWindow: (url) => { window.open(url, '_blank', 'noopener,noreferrer'); },
    closePage: () => { window.close(); },
  };
}

/** Mount the wallet into an extension page: `mountMeritExtension({ element, core, snapshot })`. */
export function mountMeritExtension({ injectables, apis, ...rest }: MeritExtensionOptions): void {
  mountMeritWeb({ ...rest, injectables: mergeInjectables(extensionInjectables(apis ?? pageExtensionApis()), injectables, WALLET_TYPE) });
}

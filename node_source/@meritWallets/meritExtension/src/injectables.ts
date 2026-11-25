// File: src/injectables.ts
//
// 2026-11-25 (owner: meritExtension, meritAndroid and meritIPhone hold the injectables of their device): what the Chrome extension injects into the wallet. Pure: the browser and extension APIs come in as a plain object, so this is tested without a browser; only type imports (erased).
import type { MeritWebInjectables } from '@meritWallets/meritWeb';

/** The extension APIs the injectables use. Each is optional: the injectables fall back to the page's own behavior. */
export interface ExtensionApis {
  /** The page's clipboard (navigator.clipboard). */
  clipboard?: { writeText(text: string): Promise<void> };
  /** chrome.tabs: opens an address in a new tab. */
  tabs?: { create(options: { url: string }): unknown };
  /** Opens an address in the page's own way (window.open) when there is no chrome.tabs. */
  openWindow?: (url: string) => void;
  /** Closes this extension page (window.close). */
  closePage?: () => void;
}

/** The functions the wallet's platform uses, done the extension's way: copy through the clipboard, open an address in a new tab, close the extension page. */
export function extensionInjectables(apis: ExtensionApis): MeritWebInjectables {
  return {
    functions: {
      copyText: async (text: string) => {
        if (!apis.clipboard) throw new Error('no clipboard here');
        await apis.clipboard.writeText(String(text));
      },
      openUrl: (url: string) => {
        if (apis.tabs) apis.tabs.create({ url: String(url) });
        else apis.openWindow?.(String(url));
      },
      close: () => {
        apis.closePage?.();
      },
    },
  };
}

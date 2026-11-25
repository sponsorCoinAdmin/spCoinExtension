import type { MeritWebInjectables } from '@meritWallets/meritWeb';
/** The extension APIs the injectables use. Each is optional: the injectables fall back to the page's own behavior. */
export interface ExtensionApis {
    /** The page's clipboard (navigator.clipboard). */
    clipboard?: {
        writeText(text: string): Promise<void>;
    };
    /** chrome.tabs: opens an address in a new tab. */
    tabs?: {
        create(options: {
            url: string;
        }): unknown;
    };
    /** Opens an address in the page's own way (window.open) when there is no chrome.tabs. */
    openWindow?: (url: string) => void;
    /** Closes this extension page (window.close). */
    closePage?: () => void;
}
/** The functions the wallet's platform uses, done the extension's way: copy through the clipboard, open an address in a new tab, close the extension page. */
export declare function extensionInjectables(apis: ExtensionApis): MeritWebInjectables;

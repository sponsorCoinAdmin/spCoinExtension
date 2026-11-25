import { type MeritWebInjectables, type MountMeritWebOptions } from '@meritWallets/meritWeb';
import { type ExtensionApis } from './injectables';
export { extensionInjectables, type ExtensionApis } from './injectables';
/** The Merit type this package injects. */
export declare const WALLET_TYPE: "EXT";
export interface MeritExtensionOptions extends Omit<MountMeritWebOptions, 'walletType' | 'injectables' | 'platform' | 'onClose'> {
    /** The extension's own functions and settings, laid over the defaults (a function with the same name replaces the default). */
    injectables?: Omit<MeritWebInjectables, 'walletType'>;
    /** The APIs to use instead of the page's own (for tests). */
    apis?: ExtensionApis;
}
/** The APIs of the page this runs in: the clipboard, chrome.tabs when it exists, window.open and window.close. */
export declare function pageExtensionApis(): ExtensionApis;
/** Mount the wallet into an extension page: `mountMeritExtension({ element, core, snapshot })`. */
export declare function mountMeritExtension({ injectables, apis, ...rest }: MeritExtensionOptions): void;

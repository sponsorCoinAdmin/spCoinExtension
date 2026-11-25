import type { BrowserWallet } from './createBrowserWallet';
/** The endpoint as the dump may show it: scheme and host only. */
export declare function endpointForDump(rpcUrl: string): string;
export declare function registerBrowserDebug(core: BrowserWallet, build?: string): void;

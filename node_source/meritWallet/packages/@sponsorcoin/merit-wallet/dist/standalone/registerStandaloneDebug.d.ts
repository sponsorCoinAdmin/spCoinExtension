import type { StandaloneWallet } from './createStandaloneWallet';
/** The endpoint as the dump may show it: scheme and host only. */
export declare function endpointForDump(rpcUrl: string): string;
export declare function registerStandaloneDebug(core: StandaloneWallet, build?: string): void;

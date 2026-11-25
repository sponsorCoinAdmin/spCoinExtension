import { type ShellMountOptions } from '@meritWallets/meritIFrame';
/** The Merit type this shell injects. */
export declare const WALLET_TYPE: "EXT";
/** Open the wallet in a frame as the EXT type: `mountMeritExtension({ element, walletUrl, injectables })`. */
export declare const mountMeritExtension: (options: ShellMountOptions) => import("@meritWallets/meritIFrame").MeritIFrameMount;
export type MeritExtensionOptions = ShellMountOptions;

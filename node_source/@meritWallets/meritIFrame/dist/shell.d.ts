import { type MeritIFrameMount } from './mountMeritIFrame';
import { type HostInjectables } from './injectables';
import type { FrameWalletType } from './protocol';
export interface ShellMountOptions {
    /** Where the frame goes. */
    element: HTMLElement;
    /** The wallet page's address: absolute (https://sponsorcoin.org/) or a path inside the host's own files. */
    walletUrl: string;
    /** What this host injects. The wallet type is set by the shell and cannot be overridden here. */
    injectables?: Omit<HostInjectables, 'walletType'>;
    width?: string;
    height?: string;
}
/** The mount for one Merit type: `export const mountMeritExtension = createShellMount('EXT')`. */
export declare function createShellMount(walletType: FrameWalletType): (options: ShellMountOptions) => MeritIFrameMount;

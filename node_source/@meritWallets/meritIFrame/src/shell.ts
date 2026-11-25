// File: src/shell.ts
//
// 2026-11-25 (owner: none of the wallet host packages opens the MeritWallet component; they open meritWeb through meritIFrame): the one factory the host packages (meritWebApp, meritExtension, meritAndroid, meritIPhone) share. Each host package is a thin SHELL: it names its Merit type and the mount it gets here,
// and passes its own injectables (functions such as copyText, openUrl, close and any other name; plain-data settings). Nothing here knows about the wallet component.
import { mountMeritIFrame, type MeritIFrameMount } from './mountMeritIFrame';
import { withWalletType, type HostInjectables } from './injectables';
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
export function createShellMount(walletType: FrameWalletType): (options: ShellMountOptions) => MeritIFrameMount {
  return ({ element, walletUrl, injectables, width, height }) =>
    mountMeritIFrame({ element, walletUrl, injectables: withWalletType(injectables, walletType), width, height });
}

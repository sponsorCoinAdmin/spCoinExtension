// File: src/shell.ts
//
// 2026-11-25 (owner: none of the wallet host packages opens the MeritWallet component; they open meritWeb through meritIFrame): the one factory the host packages (meritWebApp, meritExtension, meritAndroid, meritIPhone) share. Each host package is a thin SHELL: it names its Merit type and the mount it gets here,
// and passes its own injectables (functions such as copyText, openUrl, close and any other name; plain-data settings). Nothing here knows about the wallet component.
import { mountMeritIFrame } from './mountMeritIFrame';
import { withWalletType } from './injectables';
/** The mount for one Merit type: `export const mountMeritExtension = createShellMount('EXT')`. */
export function createShellMount(walletType) {
    return ({ element, walletUrl, injectables, width, height }) => mountMeritIFrame({ element, walletUrl, injectables: withWalletType(injectables, walletType), width, height });
}

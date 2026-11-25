// File: src/index.ts
//
// @meritWallets/meritExtension: the EXT SHELL for the Chrome extension (its side panel or any extension page).
// 2026-11-25 (owner: none of the wallet host packages opens the MeritWallet component; they open meritWeb or meritIFrame): this shell does not draw a wallet and does not use the wallet component. It opens the wallet page (meritWeb) through meritIFrame with this Merit type,
// and passes this host's own functions (copyText, openUrl, close and any other name) and settings to the wallet as injectables. The wallet itself is meritWeb.
import { createShellMount } from '@meritWallets/meritIFrame';
/** The Merit type this shell injects. */
export const WALLET_TYPE = 'EXT';
/** Open the wallet in a frame as the EXT type: `mountMeritExtension({ element, walletUrl, injectables })`. */
export const mountMeritExtension = createShellMount(WALLET_TYPE);

// File: framed.ts
//
// 2026-11-25 (owner: complete the extension on meritIFrame and meritWeb): the HOST page of the framed wallet. It opens the extension's own wallet page (framed-wallet.html, built from @meritWallets/meritWeb) through the extension's shell, @meritWallets/meritExtension, which uses meritIFrame and injects the EXT wallet type.
// The manifest's extension-pages policy must say frame-ancestors 'self' for this to work (it was 'none'). The wallet page has the extension's origin, so it keeps its offline use and the chrome.* APIs.
// This page does NOT replace sidepanel.html: the extension's own wallet is unchanged. The framed wallet is its own wallet (its own vault) until the extension's vault, connect relay and provider become injected options.
import { mountMeritExtension } from '@meritWallets/meritExtension';

mountMeritExtension({
  element: document.getElementById('wallet')!,
  walletUrl: 'framed-wallet.html',
  injectables: {
    functions: {
      // the wallet's close button closes this extension page (a side panel or a tab)
      close: () => { window.close(); },
    },
  },
});

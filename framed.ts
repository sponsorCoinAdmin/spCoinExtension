// File: framed.ts
//
// 2026-11-25 (owner: complete the extension on meritIFrame and meritWeb): the HOST page of the framed wallet. It frames the extension's own wallet page (framed-wallet.html, built from @meritWallets/meritWeb) with meritIFrame and injects what an extension host injects.
// The manifest's extension-pages policy must say frame-ancestors 'self' for this to work (it was 'none'). The wallet page has the extension's origin, so it keeps its offline use and the chrome.* APIs.
// This page does NOT replace sidepanel.html: the extension's own wallet is unchanged. The framed wallet is its own wallet (its own vault) until the extension's vault, connect relay and provider become injected options.
import { mountMeritIFrame, type HostInjectables } from '@meritWallets/meritIFrame';

const asked = (new URLSearchParams(window.location.search).get('type') ?? 'EXT').toUpperCase().replace(' ', '_');
const injectables: HostInjectables = {
  walletType: asked,
  functions: {
    // the wallet's close button closes this extension page (a side panel or a tab)
    close: () => { window.close(); },
  },
};

mountMeritIFrame({ element: document.getElementById('wallet')!, walletUrl: 'framed-wallet.html', injectables });

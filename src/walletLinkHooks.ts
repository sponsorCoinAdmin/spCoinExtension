// File: src/walletLinkHooks.ts
//
// 2026-11-07 (owner request): the extension's remote wallets and the hook that says whether each is connected (MeritWallet's walletLinkHooks prop). ONE constant object: MeritWallet calls the hooks in its key order on every render.
import { useMetaMask } from '@sponsorcoin/merit-wallet';
import { useMeritWebApp } from './useMeritWebApp';
import { METAMASK_ID } from './metamaskAuthenticator';
import { WEB_APP_ID } from './webAppAuthenticator';

export const extensionWalletLinkHooks: Record<string, () => boolean> = {
  [WEB_APP_ID]: () => useMeritWebApp().meritWebAppConnected,
  [METAMASK_ID]: () => useMetaMask(window).metaMaskConnected,
};

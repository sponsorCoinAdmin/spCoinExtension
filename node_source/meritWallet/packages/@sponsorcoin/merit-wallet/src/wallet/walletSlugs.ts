// File: src/wallet/walletSlugs.ts
//
// 2026-11-01 (cleanup): the ONE map from a wallet's asset folder (its slug in the wallet list: merit, meritExtension, metamask, ledger, trezor) to its authenticator id. The wallet list (AddAccountFlow) and the connection state (MeritWallet) both read it.
import type { AuthenticatorId } from '../auth/authenticator';

export const WALLET_SLUG_ID: Record<string, AuthenticatorId> = {
  merit: 'serverKeystore',
  meritExtension: 'injected:org.sponsorcoin.merit',
  metamask: 'injected:io.metamask',
  ledger: 'hardware:ledger',
  trezor: 'hardware:trezor',
};

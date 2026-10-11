// File: src/wallet/walletSecurity.ts
//
// 2026-10-11 (docs/authenticationDesign.txt section 15.7, item W1b) -- the Config tab's "Wallet Security" (reveal a private key, reveal the recovery phrase) DERIVED FROM THE WALLET, for the active account: the
// account's own backend (Wallet.vaultFor) does the reveal behind the password, and the screen offers only what that backend supports (its flags decide; a signing-only backend such as MetaMask gets no section at all).
// Replaces the hand-written WalletSecurityApi each host built (the web's route call, the extension's message calls). MetaMask: Security & privacy.
import type { WalletSecurityApi } from '../WalletSecuritySection';
import { unlockErrorText } from './walletLock';
import type { Wallet } from './wallet';

/** The API for the active account, or undefined when its backend can reveal neither the key nor the phrase (then there is nothing to show). */
export function createWalletSecurityApi(wallet: Wallet, activeAddress: string | undefined): WalletSecurityApi | undefined {
  const canKey = !!activeAddress && wallet.can('revealKey', activeAddress);
  const canPhrase = !!activeAddress && wallet.can('revealPhrase', activeAddress);
  if (!canKey && !canPhrase) return undefined;
  const api: WalletSecurityApi = {
    async revealPrivateKey(password, address) {
      const vault = wallet.vaultFor(address);
      if (!vault || !wallet.can('revealKey', address)) throw new Error('This account is held by a wallet that cannot show its private key.');
      try {
        return await vault.revealPrivateKey({ kind: 'password', value: password }, address);
      } catch (error) {
        throw new Error(unlockErrorText(error));
      }
    },
  };
  if (canPhrase) {
    api.revealPhrase = async (password) => {
      const vault = wallet.vaultFor(activeAddress!);
      if (!vault) throw new Error('This account is held by a wallet that has no recovery phrase to show.');
      try {
        return await vault.revealRecoveryPhrase({ kind: 'password', value: password });
      } catch (error) {
        throw new Error(unlockErrorText(error));
      }
    };
  }
  return api;
}

// File: src/vault/vaultAuthenticator.ts
//
// 2026-10-11 (docs/design/accountAuthDesign.txt 14.4, item V4) -- an AUTHENTICATOR over a local vault: the package's Authenticator interface implemented by the vault that lives in this folder (VaultSession + WalletAccounts) with the
// approval queue and the LocalSigner (devOrigin accounts sign only on the local chain). It is the same shape for every store that holds keys itself: the BROWSER vault ('browserVault', IndexedDB), a phone ('deviceVault',
// Keychain / Keystore) and, in time, the extension. The host supplies the vault parts, the approval queue (its own confirmation screen drives approve / reject) and the RPC endpoints; this file adds no storage, no UI and no crypto.
import { AuthenticatorError, type Authenticator, type AuthenticatorAccount, type AuthenticatorChange, type AuthenticatorId, type AuthenticatorTransaction } from '../auth/authenticator';
import { ApprovalRejectedError, type ApprovalController } from './approvals';
import { DevAccountOnRealChainError, LocalSigner } from './localSigner';
import { VaultLockedError } from './vaultSession';
import { WalletAccountError } from './walletAccounts';
import type { LocalVaultParts } from './vaultCapability';
import type { Hex, Transport } from 'viem';

export interface VaultAuthenticatorOptions {
  id: Extract<AuthenticatorId, 'browserVault' | 'deviceVault' | 'localVault'>;
  /** For the account list and the Add menu ("Browser"). */
  label: string;
  parts: LocalVaultParts;
  approvals: ApprovalController;
  /** The RPC endpoint for a chain id; undefined when the chain is not configured. */
  rpcUrlFor: (chainId: number) => string | undefined;
  transportFor?: (chainId: number) => Transport | undefined;
  /** Who is asking, for the confirmation screen ('wallet' by default). */
  origin?: string;
}

export function createVaultAuthenticator(options: VaultAuthenticatorOptions): Authenticator {
  const { id, label, parts, approvals, rpcUrlFor, transportFor, origin } = options;
  const signer = new LocalSigner({ session: parts.session, accounts: parts.accounts, approvals, rpcUrlFor, transportFor });
  const translate = (error: unknown): never => {
    if (error instanceof AuthenticatorError) throw error;
    if (error instanceof ApprovalRejectedError) throw new AuthenticatorError('user_rejected', error.message, id);
    if (error instanceof VaultLockedError) throw new AuthenticatorError('locked', 'The wallet is locked.', id);
    if (error instanceof DevAccountOnRealChainError) throw new AuthenticatorError('wrong_chain', error.message, id);
    if (error instanceof WalletAccountError) throw new AuthenticatorError('unauthorized', error.message, id);
    throw error;
  };
  const accounts = (): AuthenticatorAccount[] => {
    if (!parts.session.isUnlocked()) return [];
    return parts.accounts.list().map((a) => ({ address: a.address, name: a.name, source: a.devOrigin ? 'hardhatTestAccounts' : id }));
  };

  return {
    id,
    label,
    capabilities: { signMessage: true, signTypedData: true, sendTransaction: true, listAccounts: true, createAccount: true, importKey: true, lock: true },
    vault: parts.vault,
    async status() {
      return { available: true, unlocked: parts.session.isUnlocked() };
    },
    async accounts() {
      return accounts();
    },
    async signMessage(address, message) {
      try {
        return await signer.signMessage({ address, message, origin });
      } catch (error) {
        return translate(error);
      }
    },
    async signTypedData(address, typedData) {
      try {
        return await signer.signTypedData({ address, typedData: (typeof typedData === 'string' ? JSON.parse(typedData) : typedData) as Record<string, unknown>, origin });
      } catch (error) {
        return translate(error);
      }
    },
    async sendTransaction(tx: AuthenticatorTransaction) {
      try {
        const { hash } = await signer.sendTransaction({ from: tx.from, to: tx.to, value: tx.value, data: tx.data, chainId: tx.chainId, origin });
        return { hash: hash as Hex };
      } catch (error) {
        return translate(error);
      }
    },
    onChange(listener: (change: AuthenticatorChange) => void) {
      return parts.session.onChange(() => listener(parts.session.isUnlocked() ? 'unlock' : 'lock'));
    },
  };
}

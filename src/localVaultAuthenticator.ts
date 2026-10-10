// File: src/localVaultAuthenticator.ts
//
// 2026-10-09 (docs/authenticationDesign.txt row 6, docs/nodeSourceMigrationPlan.txt row 6) -- the extension's 'localVault' AUTHENTICATOR: the package's Authenticator interface implemented on the extension vault
// that lives in the background worker. It adds no new signing path: signMessage / sendTransaction call the same helpers the Send / Swap / Sponsor / Rewards flows already use (localSigning.ts: queue the
// request in the worker, show the extension's own confirmation screen, approve or reject), status and accounts read the worker's vault state, and onChange follows the worker's "vault changed" broadcast.
// The extension registers it once at boot in its own authenticator registry; the resolver picks it for every account that has no other choice (the extension's app default).
import {
  AuthenticatorError,
  createAuthenticatorRegistry,
  type Authenticator,
  type AuthenticatorAccount,
  type AuthenticatorChange,
  type AuthenticatorTransaction,
} from '@sponsorcoin/merit-wallet';
import { signMessageWithVault, signWithVault, type ConfirmCopy } from './localSigning';

type WorkerReply = { ok: boolean; initialized?: boolean; unlocked?: boolean; accounts?: Array<{ address: string; name?: string; devOrigin?: boolean }> };
const worker = (message: unknown) => chrome.runtime.sendMessage(message) as Promise<WorkerReply>;

const confirmCopy = (title: string, signerAddress: string, chainId: number, message?: string): ConfirmCopy => ({ title, message, signerAddress, chainId });

export const localVaultAuthenticator: Authenticator = {
  id: 'localVault',
  label: 'Extension',
  capabilities: { signMessage: true, signTypedData: false, sendTransaction: true, listAccounts: true, createAccount: true, importKey: true, lock: true },
  async status() {
    const reply = await worker({ type: 'merit/vault/status' }).catch(() => undefined);
    // Available once a vault exists; unlocked when its keys are in the worker's memory.
    return { available: !!reply?.ok && reply.initialized !== false, unlocked: !!reply?.ok && !!reply.unlocked };
  },
  async accounts(): Promise<AuthenticatorAccount[]> {
    const reply = await worker({ type: 'merit/accounts/list' }).catch(() => undefined);
    return reply?.ok && Array.isArray(reply.accounts) ? reply.accounts.map((a) => ({ address: a.address, name: a.name, source: a.devOrigin ? 'hardhatTestAccounts' : 'vault' })) : [];
  },
  async signMessage(address, message) {
    try {
      return await signMessageWithVault(address, message, confirmCopy('Sign message', address, 0, message));
    } catch (error) {
      throw translate(error);
    }
  },
  async sendTransaction(tx: AuthenticatorTransaction) {
    try {
      return await signWithVault({ from: tx.from, to: tx.to ?? '', data: tx.data, value: tx.value === undefined ? undefined : tx.value.toString(), chainId: tx.chainId }, confirmCopy('Approve transaction', tx.from, tx.chainId));
    } catch (error) {
      throw translate(error);
    }
  },
  onChange(listener: (change: AuthenticatorChange) => void) {
    const handler = (message: { type?: string }) => {
      if (message?.type === 'merit/vault/changed') listener('accountsChanged');
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  },
};

/** The vault helpers throw plain Errors; map them onto the one error set (user rejected, locked, ...). */
function translate(error: unknown): AuthenticatorError {
  const text = error instanceof Error ? error.message : String(error);
  if (/rejected/i.test(text)) return new AuthenticatorError('user_rejected', text, 'localVault');
  if (/locked/i.test(text)) return new AuthenticatorError('locked', text, 'localVault');
  if (/not in the wallet|not allowed|refused/i.test(text)) return new AuthenticatorError('unauthorized', text, 'localVault');
  return new AuthenticatorError('unreachable', text, 'localVault');
}

/** The extension's registry: it has the one authenticator. */
export const extensionAuthenticatorRegistry = createAuthenticatorRegistry();
extensionAuthenticatorRegistry.register(localVaultAuthenticator);

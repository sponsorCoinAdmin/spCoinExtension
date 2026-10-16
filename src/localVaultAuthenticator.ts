// File: src/localVaultAuthenticator.ts
//
// 2026-10-09 (docs/authenticationDesign.txt row 6, docs/nodeSourceMigrationPlan.txt row 6) -- the extension's 'localVault' AUTHENTICATOR: the package's Authenticator interface implemented on the extension vault
// that lives in the background worker. It adds no new signing path: signMessage / sendTransaction call the same helpers the Send / Swap / Sponsor / Rewards flows already use (localSigning.ts: queue the
// request in the worker, show the extension's own confirmation screen, approve or reject), status and accounts read the worker's vault state, and onChange follows the worker's "vault changed" broadcast.
// The extension registers it once at boot in its own authenticator registry; the resolver picks it for every account that has no other choice (the extension's app default).
import {
  AuthenticatorError,
  createAuthenticatorRegistry,
  createWallet,
  createWorkerVault,
  type Authenticator,
  type AuthenticatorAccount,
  type AuthenticatorChange,
  type AuthenticatorId,
  type AuthenticatorTransaction,
  type WorkerReply as VaultWorkerReply,
} from '@sponsorcoin/merit-wallet';
import { signMessageWithVault, signWithVault, type ConfirmCopy } from './localSigning';
import { metamaskAuthenticator } from './metamaskAuthenticator';
import { ledgerAuthenticator } from './hardwareLedger';

type WorkerReply = { ok: boolean; initialized?: boolean; unlocked?: boolean; accounts?: Array<{ address: string; name?: string; devOrigin?: boolean }> };
const worker = (message: unknown) => chrome.runtime.sendMessage(message) as Promise<WorkerReply>;

const confirmCopy = (title: string, signerAddress: string, chainId: number, message?: string): ConfirmCopy => ({ title, message, signerAddress, chainId });

// 2026-10-11 (docs/authenticationDesign.txt section 15.7, item W1c): the extension's vault as the one VaultCapability interface, over the worker's messages (no change to the worker). The lock screen, the lock button,
// the security section and the delete / change-password buttons are derived from it by the component when the host passes `wallet`.
export const extensionVault = createWorkerVault(
  {
    send: (message) => chrome.runtime.sendMessage(message) as Promise<VaultWorkerReply>,
    subscribe: (handler) => {
      const listener = (message: { type?: string; unlocked?: boolean }) => handler(message);
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    },
  },
  { label: 'this device' },
);

export const localVaultAuthenticator: Authenticator = {
  id: 'localVault',
  label: 'Extension',
  displayName: 'Merit Wallet (Extension)',
  badge: 'Extension',
  capabilities: { signMessage: true, signTypedData: false, sendTransaction: true, listAccounts: true, createAccount: true, importKey: true, lock: true },
  vault: extensionVault,
  async status() {
    const reply = await worker({ type: 'merit/vault/status' }).catch(() => undefined);
    // Available once a vault exists; unlocked when its keys are in the worker's memory.
    return { available: !!reply?.ok && reply.initialized !== false, unlocked: !!reply?.ok && !!reply.unlocked };
  },
  async accounts(): Promise<AuthenticatorAccount[]> {
    const reply = await worker({ type: 'merit/accounts/list' }).catch(() => undefined);
    return reply?.ok && Array.isArray(reply.accounts) ? reply.accounts.map((a) => ({ address: a.address, name: a.name, source: a.devOrigin ? 'hardhatTestAccounts' : 'vault' })) : [];
  },
  async signMessage(address, message, display) {
    try {
      return await signMessageWithVault(address, message, confirmCopy(display?.title ?? 'Sign message', address, 0, display?.message ?? message));
    } catch (error) {
      throw translate(error);
    }
  },
  async sendTransaction(tx: AuthenticatorTransaction) {
    try {
      const d = tx.display;
      return await signWithVault(
        { from: tx.from, to: tx.to ?? '', data: tx.data, value: tx.value === undefined ? undefined : tx.value.toString(), chainId: tx.chainId },
        { ...confirmCopy(d?.title ?? 'Approve transaction', tx.from, tx.chainId, d?.message), contractAddress: d?.contractAddress, accounts: d?.accounts, tokens: d?.tokens, amount: d?.amount },
      );
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
// 2026-10-12 (docs/connectionDesign.txt item 9): MetaMask, asked through the relay tab (src/metamaskRelay.ts); the extension's list shows it as a second wallet beside the vault.
extensionAuthenticatorRegistry.register(metamaskAuthenticator);
// 2026-10-13 (docs/connectionDesign.txt item 12): a Ledger over WebHID (the package's shared hardware layer); the device shows every request on its own screen.
extensionAuthenticatorRegistry.register(ledgerAuthenticator);

/** Which wallet signs for an account, kept per account (the same rule as the web app: owners own accounts). An account with nothing saved is the vault's. */
const AUTHENTICATOR_CHOICE_KEY = 'meritAccountAuthenticator';
const readChoices = (): Record<string, AuthenticatorId> => {
  try {
    return JSON.parse(window.localStorage.getItem(AUTHENTICATOR_CHOICE_KEY) || '{}') as Record<string, AuthenticatorId>;
  } catch {
    return {};
  }
};
export const extensionAccountAuthenticatorStore = {
  get: (address: string): AuthenticatorId | undefined => readChoices()[address.toLowerCase()],
  set: (address: string, id: AuthenticatorId): void => {
    try {
      window.localStorage.setItem(AUTHENTICATOR_CHOICE_KEY, JSON.stringify({ ...readChoices(), [address.toLowerCase()]: id }));
    } catch {
      /* a browser that refuses storage keeps the choice for this session only */
    }
  },
};

/** The extension's wallet (src/wallet in the package): its one backend today, the local vault; MetaMask-style backends join the same registry later. */
export const extensionWallet = createWallet({ registry: extensionAuthenticatorRegistry, store: extensionAccountAuthenticatorStore, appDefault: () => 'localVault' });

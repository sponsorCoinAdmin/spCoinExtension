// File: src/walletBackground.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E1) -- the wallet vault inside the extension's background service worker, the MetaMask way:
// the worker owns the encrypted vault and, while unlocked, the decrypted keys. The side panel (a UI page) never sees a key; it sends the
// requests below and gets back results. The vault itself (PBKDF2 / AES-GCM, lock state, auto-lock, session persistence) is
// @sponsorcoin/merit-wallet/vault; this file only supplies the extension-specific parts: chrome.storage for the ciphertext, chrome.storage.session
// (memory only, cleared when the browser closes) so a worker that Chrome stops while idle does not re-lock the wallet, and the message API.
//
// What the vault holds (E2): a Secret Recovery Phrase and the accounts derived from it, plus accounts imported by private key
// (walletAccounts.ts in the package). Secrets never leave this worker except the phrase, which is returned once when the wallet is created and
// again only by merit/accounts/revealMnemonic after the password is checked a second time (as MetaMask does).
import { installProvider, getActiveChainId } from './walletProvider';
import {
  ApprovalController,
  ApprovalRejectedError,
  TooManyAttemptsError,
  DevAccountOnRealChainError,
  LocalSigner,
  VaultSession,
  WalletAccountError,
  WalletAccounts,
  WrongPasswordError,
  createWallet,
  type EncryptedVault,
  type VaultSessionStore,
  type ApprovalRequestInfo,
  type VaultStorage,
  type WalletAccountRecord,
  type WalletVaultContents,
} from '@sponsorcoin/merit-wallet/vault';
import { rpcUrlForChain } from './chainRpc';

const VAULT_KEY = 'spcoin_merit_vault';
const SESSION_KEY = 'spcoin_merit_vault_session';
/** Default idle time before the wallet locks itself, in minutes (changeable with merit/vault/setAutoLock). */
const DEFAULT_AUTO_LOCK_MINUTES = 15;

const chromeVaultStorage: VaultStorage = {
  read: async () => ((await chrome.storage.local.get(VAULT_KEY))[VAULT_KEY] as EncryptedVault | undefined),
  write: async (vault) => {
    await chrome.storage.local.set({ [VAULT_KEY]: vault });
  },
  clear: async () => {
    await chrome.storage.local.remove(VAULT_KEY);
  },
};

const chromeSessionStore: VaultSessionStore = {
  get: async () => ((await chrome.storage.session.get(SESSION_KEY))[SESSION_KEY] as Awaited<ReturnType<VaultSessionStore['get']>>),
  set: async (value) => {
    await chrome.storage.session.set({ [SESSION_KEY]: value });
  },
  clear: async () => {
    await chrome.storage.session.remove(SESSION_KEY);
  },
};

export type VaultRequest =
  | { type: 'merit/vault/status' }
  | { type: 'merit/vault/create'; password: string; mnemonic?: string }
  | { type: 'merit/vault/unlock'; password: string }
  | { type: 'merit/vault/lock' }
  | { type: 'merit/vault/changePassword'; oldPassword: string; newPassword: string }
  | { type: 'merit/vault/setAutoLock'; minutes: number }
  | { type: 'merit/vault/wipe' }
  | { type: 'merit/vault/verifyPassword'; password: string }
  | { type: 'merit/vault/exportBackup' }
  | { type: 'merit/vault/importBackup'; vault: EncryptedVault; password: string }
  | { type: 'merit/accounts/list' }
  | { type: 'merit/accounts/addDerived'; name?: string }
  | { type: 'merit/accounts/importPrivateKey'; privateKey: string; name?: string }
  | { type: 'merit/accounts/remove'; address: string }
  | { type: 'merit/accounts/rename'; address: string; name: string }
  | { type: 'merit/accounts/setActive'; address: string }
  | { type: 'merit/accounts/revealMnemonic'; password: string }
  | { type: 'merit/accounts/exportPrivateKey'; password: string; address: string }
  | { type: 'merit/accounts/testAccountsStatus' }
  | { type: 'merit/accounts/loadTestAccounts' }
  | { type: 'merit/accounts/unloadTestAccounts' }
  | { type: 'merit/signing/signMessage'; address: string; message: string; origin?: string }
  | { type: 'merit/signing/sendTransaction'; from: string; to?: string; value?: string; data?: string; chainId: number; origin?: string }
  | { type: 'merit/signing/pending' }
  | { type: 'merit/signing/approve'; id: string }
  | { type: 'merit/signing/reject'; id: string }
  | { type: 'merit/network/get' }
  | { type: 'merit/network/set'; chainId: number };

export type VaultResponse =
  | {
      ok: true;
      initialized: boolean;
      unlocked: boolean;
      /** Only from create: the Secret Recovery Phrase, shown once for backup. */
      mnemonic?: string;
      accounts?: WalletAccountRecord[];
      account?: WalletAccountRecord;
      active?: string;
      signature?: string;
      hash?: string;
      pending?: ApprovalRequestInfo[];
      chainId?: number;
      backup?: EncryptedVault;
      privateKey?: string;
      testAccounts?: { loaded: number; total: number; added?: number; removed?: number; kept?: number };
    }
  | { ok: false; error: 'wrong-password' | 'too-many-attempts' | 'locked' | 'invalid-request' | 'forbidden' | 'failed'; message?: string };

const session = new VaultSession<WalletVaultContents>({
  storage: chromeVaultStorage,
  sessionStore: chromeSessionStore,
  autoLockMs: DEFAULT_AUTO_LOCK_MINUTES * 60_000,
});

// After a worker restart: come back unlocked if the session is still inside the auto-lock time. Requests wait for this to settle.
const ready: Promise<boolean> = session.restore().catch(() => false);

const accounts = new WalletAccounts(session);
const approvals = new ApprovalController();
const signer = new LocalSigner({
  session,
  accounts,
  approvals,
  // The registry (spcoin-feeds) is the single network list; chainRpc asks it.
  rpcUrlFor: (chainId) => rpcUrlForChain(chainId),
});
// Web pages talk to the wallet through the provider (walletProvider.ts); it shares the vault, accounts, signer and approval queue above.
const provider = installProvider({ session, accounts, approvals, signer, ready });

// A locked wallet drops every waiting request (MetaMask does the same).
session.onChange(() => {
  if (!session.isUnlocked()) approvals.rejectAll('The wallet was locked.');
});

async function snapshot(extra: Record<string, unknown> = {}): Promise<VaultResponse> {
  return { ok: true, initialized: await session.isInitialized(), unlocked: session.isUnlocked(), ...extra } as VaultResponse;
}

async function handle(request: VaultRequest): Promise<VaultResponse> {
  await ready;
  try {
    switch (request.type) {
      case 'merit/vault/status':
        return snapshot();
      case 'merit/vault/create':
        if (typeof request.password !== 'string' || request.password.length < 8) return { ok: false, error: 'invalid-request', message: 'Password must be at least 8 characters.' };
        {
          const created = await createWallet(session, request.password, request.mnemonic === undefined ? {} : { mnemonic: request.mnemonic });
          return snapshot({ mnemonic: created.mnemonic, active: created.address });
        }
      case 'merit/vault/unlock':
        if (typeof request.password !== 'string' || !request.password) return { ok: false, error: 'invalid-request' };
        await session.unlock(request.password);
        return snapshot();
      case 'merit/vault/lock':
        session.lock();
        return snapshot();
      case 'merit/vault/changePassword':
        if (typeof request.newPassword !== 'string' || request.newPassword.length < 8) return { ok: false, error: 'invalid-request', message: 'Password must be at least 8 characters.' };
        await session.changePassword(request.oldPassword, request.newPassword);
        return snapshot();
      case 'merit/vault/setAutoLock':
        if (typeof request.minutes !== 'number' || !Number.isFinite(request.minutes) || request.minutes < 0) return { ok: false, error: 'invalid-request' };
        session.setAutoLockMs(request.minutes * 60_000);
        return snapshot();
      case 'merit/vault/verifyPassword':
        if (typeof request.password !== 'string' || !request.password) return { ok: false, error: 'invalid-request' };
        await session.verifyPassword(request.password);
        return snapshot();
      case 'merit/vault/wipe':
        await session.wipe();
        return snapshot();
      case 'merit/vault/exportBackup':
        return snapshot({ backup: await session.exportBackup() });
      case 'merit/vault/importBackup':
        await session.importBackup(request.vault, request.password);
        return snapshot();
      case 'merit/accounts/testAccountsStatus':
        return snapshot({ testAccounts: accounts.hardhatTestAccountStatus() });
      case 'merit/accounts/loadTestAccounts': {
        const result = await accounts.loadHardhatTestAccounts();
        return snapshot({ testAccounts: { ...accounts.hardhatTestAccountStatus(), added: result.added } });
      }
      case 'merit/accounts/unloadTestAccounts': {
        const result = await accounts.unloadHardhatTestAccounts();
        return snapshot({ testAccounts: { ...accounts.hardhatTestAccountStatus(), removed: result.removed, kept: result.kept } });
      }
      case 'merit/accounts/exportPrivateKey':
        return snapshot({ privateKey: await accounts.revealPrivateKey(request.password, request.address) });
      case 'merit/accounts/list':
        return snapshot({ accounts: accounts.list(), active: accounts.activeAddress() });
      case 'merit/accounts/addDerived':
        return snapshot({ account: await accounts.addDerived(request.name) });
      case 'merit/accounts/importPrivateKey':
        return snapshot({ account: await accounts.importPrivateKey(request.privateKey, request.name) });
      case 'merit/accounts/remove':
        await accounts.remove(request.address);
        return snapshot({ accounts: accounts.list() });
      case 'merit/accounts/rename':
        await accounts.rename(request.address, request.name);
        return snapshot({ accounts: accounts.list() });
      case 'merit/accounts/setActive':
        await accounts.setActive(request.address);
        void provider.notifyAccountsChanged();
        return snapshot({ active: accounts.activeAddress() });
      case 'merit/accounts/revealMnemonic':
        return snapshot({ mnemonic: await accounts.revealMnemonic(request.password) });
      case 'merit/signing/signMessage':
        // Waits for the user: the response arrives only after approve (or reject) from the wallet UI.
        return snapshot({ signature: await signer.signMessage({ address: request.address, message: request.message, origin: request.origin }) });
      case 'merit/signing/sendTransaction':
        return snapshot({
          hash: (await signer.sendTransaction({ from: request.from, to: request.to, value: request.value === undefined ? undefined : BigInt(request.value), data: request.data, chainId: request.chainId, origin: request.origin })).hash,
        });
      case 'merit/signing/pending':
        return snapshot({ pending: approvals.list() });
      case 'merit/signing/approve':
        await approvals.approve(request.id);
        return snapshot({ pending: approvals.list() });
      case 'merit/signing/reject':
        approvals.reject(request.id);
        return snapshot({ pending: approvals.list() });
      case 'merit/network/get':
        return snapshot({ chainId: await getActiveChainId() });
      case 'merit/network/set':
        if (typeof request.chainId !== 'number' || !Number.isInteger(request.chainId)) return { ok: false, error: 'invalid-request' };
        await provider.setChain(request.chainId);
        return snapshot({ chainId: request.chainId });
      default:
        return { ok: false, error: 'invalid-request' };
    }
  } catch (error) {
    if (error instanceof WrongPasswordError) return { ok: false, error: 'wrong-password' };
    if (error instanceof TooManyAttemptsError) return { ok: false, error: 'too-many-attempts', message: error.message };
    if (error instanceof ApprovalRejectedError) return { ok: false, error: 'failed', message: 'rejected' };
    if (error instanceof DevAccountOnRealChainError) return { ok: false, error: 'forbidden', message: error.message };
    if (error instanceof WalletAccountError) return { ok: false, error: 'invalid-request', message: error.message };
    if (error instanceof Error && error.name === 'VaultLockedError') return { ok: false, error: 'locked' };
    return { ok: false, error: 'failed', message: error instanceof Error ? error.message : String(error) };
  }
}

// Tell the open side panel when the wallet locks or unlocks (it also re-reads status on demand). Nobody listening is not an error.
session.onChange(() => {
  void chrome.runtime
    .sendMessage({ type: 'merit/vault/changed', unlocked: session.isUnlocked() })
    .catch(() => undefined);
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  const type = (message as { type?: unknown } | null)?.type;
  if (typeof type !== 'string' || !(type.startsWith('merit/vault/') || type.startsWith('merit/accounts/') || type.startsWith('merit/signing/') || type.startsWith('merit/network/')) || type === 'merit/vault/changed' || type === 'merit/signing/changed' || type === 'merit/network/changed') return false;
  // Only the extension's own pages (the side panel, or an extension page open in a tab) may drive the vault. A content script reports the URL of
  // the web page it runs in, and another extension reports another id, so both are refused.
  if (sender.id !== chrome.runtime.id || typeof sender.url !== 'string' || !sender.url.startsWith(chrome.runtime.getURL(''))) {
    sendResponse({ ok: false, error: 'forbidden' } satisfies VaultResponse);
    return false;
  }
  void handle(message as VaultRequest).then(sendResponse);
  return true; // respond asynchronously
});

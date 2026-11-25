// File: src/createBrowserWallet.ts
//
// 2026-11-18 (docs/design/standAloneWalletInstall.txt) -- the BROWSER wallet's core: everything a plain browser page needs to hold keys, with no server and no host app. It assembles pieces this package already has
// (the encrypted vault over IndexedDB, the unlocked session in sessionStorage, the vault authenticator, the approval queue, the wallet that ties them together) behind ONE call, so a developer passes only the chains.
// Pure TypeScript: no React, no DOM at import time (the browser APIs are looked up when the vault is first used), so it is testable under node with small fakes.
//
// Signing goes through `approvals` (nothing signs until a screen approves; the approval page is useBrowserApproval.ts). The engine hooks, the data snapshot, send and swap are the other files of this package.
import { createAuthenticatorRegistry, createIndexedDbVaultStorage, createLocalVaultParts, createVaultAuthenticator, createWallet, createWebSessionStore, type Authenticator, type LocalVaultParts, type VaultCapability, type Wallet } from '@sponsorcoin/merit-wallet';
import { ApprovalController, type VaultSessionStore, type VaultStorage } from '@sponsorcoin/merit-wallet/vault';
import { getNetworkConfiguration } from '@sponsorcoin/spcoin-feeds/networks';

export interface BrowserChain {
  chainId: number;
  /** The JSON-RPC endpoint this chain is read and written through. */
  rpcUrl: string;
  name?: string;
}

export interface BrowserWalletOptions {
  /** The chains the wallet works on. Required: the wallet never guesses an endpoint. */
  chains: readonly BrowserChain[];
  /** Names this install's browser storage ('<namespace>-vault' in IndexedDB, '<namespace>-session' in sessionStorage), so two wallets on one origin never share keys. Default: the package's shared names. */
  namespace?: string;
  /** Where the ENCRYPTED vault lives. Default: IndexedDB database 'merit-wallet-vault' (a test passes a Map-backed store). */
  storage?: VaultStorage;
  /** Where the unlocked session key lives between page loads. Default: sessionStorage (gone when the tab closes). */
  sessionStore?: VaultSessionStore;
  /** Lock after this long without activity. Default 15 minutes. */
  autoLockMs?: number;
}

export const BROWSER_AUTO_LOCK_MS = 15 * 60_000;

export interface BrowserOnboarding {
  /** Create a new wallet under `password`; resolves with the Secret Recovery Phrase to show ONCE. */
  createWallet(password: string): Promise<{ recoveryPhrase: string }>;
  importWallet(recoveryPhrase: string, password: string): Promise<void>;
  restoreBackup(file: string, password: string): Promise<void>;
}

export interface BrowserWallet {
  chains: readonly BrowserChain[];
  vault: VaultCapability;
  parts: LocalVaultParts;
  authenticator: Authenticator;
  wallet: Wallet;
  /** Every request that wants a signature waits here until a screen approves or rejects it. */
  approvals: ApprovalController;
  onboarding: BrowserOnboarding;
  /** Tell the wallet its account list changed (an account was added or removed by something other than the vault's own methods, which announce themselves). */
  announceAccountsChanged(): void;
  /** Come back unlocked after a page reload when the session key is still valid. Safe to call often. */
  restore(): Promise<boolean>;
}

export function createBrowserWallet(options: BrowserWalletOptions): BrowserWallet {
  if (!options.chains?.length) throw new Error('A stand-alone wallet needs at least one chain: { chainId, rpcUrl }.');
  const chains = options.chains;
  const parts = createLocalVaultParts({
    storage: options.storage ?? createIndexedDbVaultStorage(options.namespace ? { dbName: `${options.namespace}-vault` } : {}),
    sessionStore: options.sessionStore ?? createWebSessionStore(undefined, options.namespace ? `${options.namespace}-session` : undefined),
    label: 'this browser',
    platform: 'web',
    autoLockMs: options.autoLockMs ?? BROWSER_AUTO_LOCK_MS,
  });
  const approvals = new ApprovalController();
  // Adding, importing or removing an account changes the account list, but the vault only announces lock and unlock. The wallet redraws its account list on an authenticator announcement, so the vault's account methods are wrapped to make one.
  const accountListeners = new Set<() => void>();
  const announceAccounts = () => accountListeners.forEach((l) => l());
  // deleteWallet is announced too: the wallet then returns to its first-run setup screen
  for (const method of ['addAccount', 'importKey', 'removeAccount', 'importPhrase', 'create', 'importBackup', 'setActive', 'deleteWallet'] as const) {
    const original = parts.vault[method] as ((...args: unknown[]) => Promise<unknown>) | undefined;
    if (!original) continue;
    (parts.vault as unknown as Record<string, unknown>)[method] = async (...args: unknown[]) => {
      const result = await original.apply(parts.vault, args);
      announceAccounts();
      return result;
    };
  }
  const baseAuthenticator = createVaultAuthenticator({
    id: 'browserVault',
    label: 'Browser',
    parts,
    approvals,
    // 2026-11-20 (owner report: picking a network did nothing): a chain the page did not list is read through the network registry's endpoint, so a network chosen from the list works
    rpcUrlFor: (chainId) => chains.find((c) => c.chainId === chainId)?.rpcUrl ?? getNetworkConfiguration(chainId)?.rpcUrl,
    origin: 'wallet',
  });
  const authenticator: Authenticator = {
    ...baseAuthenticator,
    onChange(listener) {
      const offBase = baseAuthenticator.onChange(listener);
      const onAccounts = () => listener('accountsChanged');
      accountListeners.add(onAccounts);
      return () => {
        offBase();
        accountListeners.delete(onAccounts);
      };
    },
  };
  const registry = createAuthenticatorRegistry();
  registry.register(authenticator);
  const wallet = createWallet({ registry, appDefault: () => 'browserVault' });

  let restored: Promise<boolean> | undefined;
  const { vault } = parts;
  return {
    chains,
    vault,
    parts,
    authenticator,
    wallet,
    approvals,
    announceAccountsChanged: announceAccounts,
    onboarding: {
      createWallet: async (password) => ({ recoveryPhrase: (await vault.create({ kind: 'password', value: password })).recoveryPhrase }),
      importWallet: async (recoveryPhrase, password) => {
        await vault.importPhrase(recoveryPhrase, { kind: 'password', value: password });
      },
      restoreBackup: async (file, password) => {
        await vault.importBackup(file, { kind: 'password', value: password });
      },
    },
    restore: () => (restored ??= parts.session.restore().catch(() => false)),
  };
}

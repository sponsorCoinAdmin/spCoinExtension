// File: src/vaultScreens.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table rows 21 and 23) -- the extension's connections between the package's wallet screens
// (VaultAccountsPanel, WalletOnboardingPanel) and the vault in the background worker. Every call is a merit/* message to the worker; the worker
// is the only place keys exist. A failed reply becomes an Error with the worker's message so the screens can show it.
import type { TestAccountsApi, VaultAccountsApi } from '@sponsorcoin/merit-wallet';

type Reply = {
  ok: boolean;
  error?: string;
  message?: string;
  accounts?: Array<{ address: string; name: string; source: 'generated' | 'imported'; devOrigin: boolean }>;
  active?: string;
  mnemonic?: string;
  privateKey?: string;
  testAccounts?: { loaded: number; total: number; added?: number; removed?: number; kept?: number };
};

const MESSAGES: Record<string, string> = {
  'wrong-password': 'Incorrect password.',
  'too-many-attempts': 'Too many incorrect passwords. Wait a moment and try again.',
  locked: 'The wallet is locked.',
  // A background service that was not reloaded after an update does not know the newer requests and answers invalid-request with no text.
  'invalid-request': 'The wallet service is out of date. Reload the extension at chrome://extensions, then reopen the side panel.',
};

async function call(message: Record<string, unknown>): Promise<Reply> {
  const reply = (await chrome.runtime.sendMessage(message)) as Reply | undefined;
  if (!reply) throw new Error('The wallet did not answer.');
  if (!reply.ok) throw new Error(reply.message || MESSAGES[reply.error ?? ''] || 'The wallet could not do that.');
  return reply;
}

export const vaultAccountsApi: VaultAccountsApi = {
  async list() {
    const reply = await call({ type: 'merit/accounts/list' });
    return { accounts: reply.accounts ?? [], active: reply.active };
  },
  async setActive(address) {
    await call({ type: 'merit/accounts/setActive', address });
  },
  async addDerived(name) {
    await call({ type: 'merit/accounts/addDerived', name });
  },
  async importPrivateKey(privateKey, name) {
    await call({ type: 'merit/accounts/importPrivateKey', privateKey, name });
  },
  async rename(address, name) {
    await call({ type: 'merit/accounts/rename', address, name });
  },
  async remove(address) {
    await call({ type: 'merit/accounts/remove', address });
  },
  async exportPrivateKey(password, address) {
    return (await call({ type: 'merit/accounts/exportPrivateKey', password, address })).privateKey ?? '';
  },
  async revealMnemonic(password) {
    return (await call({ type: 'merit/accounts/revealMnemonic', password })).mnemonic ?? '';
  },
};

export const vaultOnboarding = {
  async createWallet(password: string): Promise<{ recoveryPhrase: string }> {
    const reply = await call({ type: 'merit/vault/create', password });
    return { recoveryPhrase: reply.mnemonic ?? '' };
  },
  async importWallet(recoveryPhrase: string, password: string): Promise<void> {
    await call({ type: 'merit/vault/create', password, mnemonic: recoveryPhrase });
  },
};

/** Is there a vault yet, and is it unlocked? */
export async function vaultStatus(): Promise<{ initialized: boolean; unlocked: boolean }> {
  const reply = (await chrome.runtime.sendMessage({ type: 'merit/vault/status' }).catch(() => undefined)) as { ok?: boolean; initialized?: boolean; unlocked?: boolean } | undefined;
  return { initialized: !!reply?.ok && !!reply.initialized, unlocked: !!reply?.ok && !!reply.unlocked };
}

/** The Config tab's Test Accounts section for the vault (AuthenticationType.VAULT): the worker derives and imports the Hardhat accounts itself. */
export const vaultTestAccountsApi: TestAccountsApi = {
  needsPassword: false,
  async status() {
    const reply = await call({ type: 'merit/accounts/testAccountsStatus' });
    return { loaded: reply.testAccounts?.loaded ?? 0, total: reply.testAccounts?.total ?? 20 };
  },
  async load() {
    const reply = await call({ type: 'merit/accounts/loadTestAccounts' });
    return { added: reply.testAccounts?.added ?? 0 };
  },
  async unload() {
    const reply = await call({ type: 'merit/accounts/unloadTestAccounts' });
    return { removed: reply.testAccounts?.removed ?? 0, kept: reply.testAccounts?.kept };
  },
};

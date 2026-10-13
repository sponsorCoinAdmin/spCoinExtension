// File: src/metamaskAuthenticator.ts
//
// 2026-10-12 (docs/connectionDesign.txt item 9): MetaMask as an approver for the extension. It is the package's one injected-wallet authenticator (createInjectedAuthenticator: the same code the web app uses for
// MetaMask) over a provider that asks the worker's relay (src/metamaskRelay.ts) instead of window.ethereum, because the side panel cannot see MetaMask. Everything MetaMask decides is decided in its own popup.
// What differs from the web: status() and accounts() read the accounts MetaMask shared the last time (kept in chrome.storage.local) and never open a tab; only connect, sign and send do.
import {
  createInjectedAuthenticator,
  type Authenticator,
  type AuthenticatorAccount,
  type AuthenticatorChange,
  type InjectedProvider,
} from '@sponsorcoin/merit-wallet';
import { METAMASK_ACCOUNTS_KEY } from './metamaskRelay';

export const METAMASK_ID = 'injected:io.metamask' as const;

type RelayReply = { ok: boolean; result?: unknown; error?: { code?: number; message?: string }; accounts?: string[] };
const send = (message: unknown) => chrome.runtime.sendMessage(message) as Promise<RelayReply | undefined>;

/** A provider whose requests go to MetaMask through the relay tab; MetaMask's error codes are kept so the package translates them (4001 rejected, 4900 unavailable, ...). */
const relayProvider: InjectedProvider = {
  async request({ method, params }) {
    const reply = await send({ type: 'merit/metamask/request', method, params });
    if (!reply?.ok) throw Object.assign(new Error(reply?.error?.message || 'MetaMask did not answer.'), { code: reply?.error?.code ?? 4900 });
    return reply.result;
  },
};

const base = createInjectedAuthenticator({ id: METAMASK_ID, label: 'MetaMask', getProvider: () => relayProvider });

/** The accounts MetaMask shared with the extension, as kept (no tab is opened). */
export async function metamaskAccounts(): Promise<string[]> {
  const reply = await send({ type: 'merit/metamask/accounts' }).catch(() => undefined);
  return reply?.ok && Array.isArray(reply.accounts) ? reply.accounts : [];
}

async function remember(accounts: string[]): Promise<void> {
  await send({ type: 'merit/metamask/setAccounts', accounts });
}

/** Does MetaMask hold this account for the extension (so a send or a signature for it goes to MetaMask, not to the vault)? */
export async function isMetaMaskAccount(address: string | undefined): Promise<boolean> {
  if (!address) return false;
  const lower = address.trim().toLowerCase();
  return (await metamaskAccounts()).some((a) => a.toLowerCase() === lower);
}

export const metamaskAuthenticator: Authenticator = {
  ...base,
  async status() {
    return { available: true, unlocked: (await metamaskAccounts()).length > 0 };
  },
  async accounts(): Promise<AuthenticatorAccount[]> {
    return (await metamaskAccounts()).map((address) => ({ address, source: METAMASK_ID }));
  },
  async connect() {
    const offered = await base.connect!();
    await remember(offered.map((a) => a.address));
    return offered;
  },
  async disconnect() {
    // forget first: the extension is disconnected whatever MetaMask says; the revoke is best effort and opens the tab only to ask MetaMask to drop the permission
    await remember([]);
    await base.disconnect?.().catch(() => undefined);
  },
  onChange(listener: (change: AuthenticatorChange) => void) {
    const handler = (changes: Record<string, unknown>, area: string) => {
      if (area === 'local' && METAMASK_ACCOUNTS_KEY in changes) listener('accountsChanged');
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  },
};

/** Who signs for this account: MetaMask when it shared the account with the extension, else the vault (the extension's own default). */
export async function authenticatorFor<T extends Authenticator>(address: string | undefined, vault: T): Promise<Authenticator> {
  return (await isMetaMaskAccount(address)) ? metamaskAuthenticator : vault;
}

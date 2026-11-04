// File: src/webAppAuthenticator.ts
//
// 2026-11-04 (docs/design/remoteWalletSigning.txt, step B; owner: any Merit wallet signs through any other): the Merit web app as an approver for the extension, the counterpart of MetaMask's (src/metamaskAuthenticator.ts). It is the package's one injected-wallet authenticator
// (createInjectedAuthenticator) over a provider that asks the worker's relay (src/webAppRelay.ts) instead of window.ethereum: a request goes to ONE web app page, which shows its own approval and returns only a result (an account list, a signature, a transaction hash). Keys never cross.
// What differs from the web: status() and accounts() read the accounts the web app shared the last time (kept in chrome.storage.local) and the link's state, and never ask the page; only connect, sign and send do. The id is 'serverKeystore', the web app's wallet everywhere else in the package.
import {
  createInjectedAuthenticator,
  type Authenticator,
  type AuthenticatorAccount,
  type AuthenticatorChange,
  type InjectedProvider,
} from '@sponsorcoin/merit-wallet';
import { extensionPeers } from './extensionPeers';

export const WEB_APP_ID = 'serverKeystore' as const;
/** The accounts the web app shared with the extension, kept so the list needs no round trip. */
export const WEB_APP_ACCOUNTS_KEY = 'meritWebAppAccounts';

type RelayReply = { ok: boolean; result?: unknown; error?: { code?: number; message?: string } };

/** A provider whose requests go to the web app through the worker; the page's error codes are kept so the package translates them (4001 rejected, 4900 unavailable, ...). */
const relayProvider: InjectedProvider = {
  async request({ method, params }) {
    const reply = (await chrome.runtime.sendMessage({ type: 'merit/web/request', method, params })) as RelayReply | undefined;
    if (!reply?.ok) throw Object.assign(new Error(reply?.error?.message || 'The Merit web app did not answer.'), { code: reply?.error?.code ?? 4900 });
    return reply.result;
  },
};

const base = createInjectedAuthenticator({ id: WEB_APP_ID, label: 'Merit (Web App)', getProvider: () => relayProvider });

async function sharedAccounts(): Promise<string[]> {
  const stored = (await chrome.storage.local.get(WEB_APP_ACCOUNTS_KEY))[WEB_APP_ACCOUNTS_KEY];
  return Array.isArray(stored) ? stored.filter((a): a is string => typeof a === 'string') : [];
}

async function remember(accounts: string[]): Promise<void> {
  await chrome.storage.local.set({ [WEB_APP_ACCOUNTS_KEY]: accounts });
}

/** Does the web app hold this account for the extension (so a send or a signature for it goes to the web app, not to the vault)? */
export async function isWebAppAccount(address: string | undefined): Promise<boolean> {
  if (!address) return false;
  const lower = address.trim().toLowerCase();
  return (await sharedAccounts()).some((a) => a.toLowerCase() === lower);
}

export const webAppAuthenticator: Authenticator = {
  ...base,
  async status() {
    // reachable and logged on and not disconnected by the person: the link's own answer (asked, never remembered); nothing is asked of the page here
    return { available: true, unlocked: extensionPeers.serverKeystore.get().connected && (await sharedAccounts()).length > 0 };
  },
  async accounts(): Promise<AuthenticatorAccount[]> {
    return (await sharedAccounts()).map((address) => ({ address, source: WEB_APP_ID }));
  },
  async connect() {
    const offered = await base.connect!();
    await remember(offered.map((a) => a.address));
    return offered;
  },
  async disconnect() {
    // forget first: the extension is disconnected from the web app's accounts whatever the page says; the revoke is best effort
    await remember([]);
    await base.disconnect?.().catch(() => undefined);
  },
  onChange(listener: (change: AuthenticatorChange) => void) {
    const handler = (changes: Record<string, unknown>, area: string) => {
      if (area === 'local' && WEB_APP_ACCOUNTS_KEY in changes) listener('accountsChanged');
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  },
};

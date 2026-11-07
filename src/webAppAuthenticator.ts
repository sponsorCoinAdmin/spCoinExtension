// File: src/webAppAuthenticator.ts
//
// 2026-11-04 (docs/design/remoteWalletSigning.txt, step B; owner: any Merit wallet signs through any other): the Merit web app as an approver for the extension, the counterpart of MetaMask's (src/metamaskAuthenticator.ts).
// 2026-11-06 (docs/design/meritConnectDesign.txt, row M8): the CONNECTION to the web app (who is connected, its accounts, the handshake that keeps the two lists one, disconnecting) is @sponsorcoin/merit-connect; this file
// supplies what is the extension's own: where the copy of the shared accounts is kept (chrome.storage.local), how the side panel reaches the worker, and the link state (src/extensionPeers.ts). Signing and sending still go through the
// package's injected-wallet authenticator over the same request function (row M10 moves them to the library). Keys never cross: the page returns only a result (an account list, a signature, a transaction hash).
// The id is 'serverKeystore', the web app's wallet everywhere else in the package.
import {
  createInjectedAuthenticator,
  type Authenticator,
  type InjectedProvider,
  withMeritConnection,
} from '@sponsorcoin/merit-wallet';
import { createMeritConnect, createPanelRequest } from '@sponsorcoin/merit-connect';
import { engineTrace } from '@sponsorcoin/spcoin-exchange-engine';
import { extensionPeers } from './extensionPeers';

export const WEB_APP_ID = 'serverKeystore' as const;
const LABEL = 'Merit (Web App)';
/** The accounts the web app shared with the extension, kept so the list needs no round trip. */
export const WEB_APP_ACCOUNTS_KEY = 'meritWebAppAccounts';
/** 2026-11-06 (owner rule): the web app accounts the extension KEPT in its list but disconnected. A disconnect made here changes the state only; only the web app removes an account (by disconnecting it there). */
export const WEB_APP_DISCONNECTED_KEY = 'meritWebAppDisconnected';

async function sharedAccounts(): Promise<string[]> {
  const stored = (await chrome.storage.local.get(WEB_APP_ACCOUNTS_KEY))[WEB_APP_ACCOUNTS_KEY];
  return Array.isArray(stored) ? stored.filter((a): a is string => typeof a === 'string') : [];
}

async function remember(accounts: string[]): Promise<void> {
  await chrome.storage.local.set({ [WEB_APP_ACCOUNTS_KEY]: accounts });
}

async function disconnectedAccounts(): Promise<string[]> {
  const stored = (await chrome.storage.local.get(WEB_APP_DISCONNECTED_KEY))[WEB_APP_DISCONNECTED_KEY];
  return Array.isArray(stored) ? stored.filter((a): a is string => typeof a === 'string') : [];
}

async function rememberDisconnected(accounts: string[]): Promise<void> {
  await chrome.storage.local.set({ [WEB_APP_DISCONNECTED_KEY]: accounts });
}

const newRid = () => `rq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
/** The side panel's request to the web app, through the worker's hub. Always resolves with a reply. */
const request = createPanelRequest({ sendMessage: (message) => chrome.runtime.sendMessage(message) });

/** 2026-11-06 (owner): the person is told when the web app took accounts out of this list. The panel's own handshake tells it directly; the worker (a change the web app pushed) leaves it in storage. */
export const WEB_APP_NOTICE_KEY = 'meritWebAppNotice';
const noticeListeners = new Set<(message: string, addresses?: string[]) => void>();
// a notice made before the wallet screen is up is shown to whatever subscribes in the next moments (the screen may mount more than once)
const RECENT_MS = 30_000;
const recent: Array<{ at: number; message: string; addresses: string[] }> = [];
const say = (message: string, addresses: string[] = []) => {
  recent.push({ at: Date.now(), message, addresses });
  noticeListeners.forEach((listener) => listener(message, addresses));
};

const connection = createMeritConnect({
  WEB_APP: {
    request,
    notify: say,
    link: () => {
      const peer = extensionPeers.serverKeystore;
      return { connected: peer.get().connected, loggedOn: peer.get().connected, detached: peer.isDetached() };
    },
    subscribeLink: (listener) => extensionPeers.serverKeystore.subscribe(listener),
    getShared: sharedAccounts,
    setShared: remember,
    getDisconnected: disconnectedAccounts,
    setDisconnected: rememberDisconnected,
    newRid,
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    now: () => Date.now(),
    trace: (event, detail) => engineTrace(event, detail),
  },
});

/** A provider whose requests go to the web app through the worker; the other wallet's error codes are kept so the package translates them (4001 rejected, 4900 unavailable, ...). */
const relayProvider: InjectedProvider = {
  async request({ method, params }) {
    const reply = await request(method, params, newRid());
    if (!reply.ok) throw Object.assign(new Error(reply.error.message), { code: reply.error.code });
    return reply.result;
  },
};

const base = createInjectedAuthenticator({ id: WEB_APP_ID, label: LABEL, getProvider: () => relayProvider });

/** Does the web app hold this account for the extension (so a send or a signature for it goes to the web app, not to the vault)? */
export async function isWebAppAccount(address: string | undefined): Promise<boolean> {
  if (!address) return false;
  const lower = address.trim().toLowerCase();
  return (await sharedAccounts()).some((a) => a.toLowerCase() === lower);
}

// 2026-11-06 (owner: it must not matter who connects to whom, the library is standard across the apps): the connection to the web app is the SAME wrapper the web app uses for the extension (withMeritConnection in the wallet package, over
// the merit-connect client). This file supplies only the extension's side of it: where the kept lists change (chrome.storage) and where the notices come from.
export const webAppAuthenticator: Authenticator = withMeritConnection(
  {
    ...base,
    async status() {
      // reachable and logged on and not disconnected by the person: the link's own answer (asked, never remembered); nothing is asked of the page here
      return { available: true, unlocked: extensionPeers.serverKeystore.get().connected && (await sharedAccounts()).length > 0 };
    },
  } as Authenticator,
  {
    client: connection,
    side: 'WEB_APP',
    onListChange(listener) {
      const handler = (changes: Record<string, unknown>, area: string) => {
        if (area === 'local' && (WEB_APP_ACCOUNTS_KEY in changes || WEB_APP_DISCONNECTED_KEY in changes)) listener();
      };
      chrome.storage.onChanged.addListener(handler);
      return () => chrome.storage.onChanged.removeListener(handler);
    },
    onNotice(listener) {
      noticeListeners.add(listener);
      recent.filter((n) => Date.now() - n.at < RECENT_MS).forEach((n) => listener(n.message, n.addresses));
      const handler = (changes: Record<string, { newValue?: unknown }>, area: string) => {
        const notice = changes[WEB_APP_NOTICE_KEY]?.newValue as { message?: unknown; addresses?: unknown } | undefined;
        if (area === 'local' && typeof notice?.message === 'string') listener(notice.message, Array.isArray(notice.addresses) ? notice.addresses.filter((a): a is string => typeof a === 'string') : []);
      };
      chrome.storage.onChanged.addListener(handler as never);
      return () => {
        noticeListeners.delete(listener);
        chrome.storage.onChanged.removeListener(handler as never);
      };
    },
  },
);

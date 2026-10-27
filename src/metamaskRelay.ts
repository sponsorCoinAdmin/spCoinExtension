// File: src/metamaskRelay.ts
//
// 2026-10-12 (docs/connectionDesign.txt item 9, reopened by the owner): MetaMask as an approver for the EXTENSION. The side panel is an extension page and MetaMask does not inject itself into
// extension pages, so the panel cannot reach it. The way through is one ordinary tab on the Merit web app's own address (/metamaskRelay.html, a static page): MetaMask injects into it like
// into any web page, and the extension's page script (inpage.ts) and content script (contentScript.ts) carry the request to MetaMask and the answer back. Nothing is signed here and no key is held:
// MetaMask asks the person in its own popup, exactly as it does for any site.
//   - Only the app's own address is opened (the open target, Local or Prod), only an allow-listed set of methods is sent, and an answer is accepted only from the tab opened here, from that address.
//   - Requests are sent one at a time; the tab stays open for a moment after the last one (a send makes three calls), then switches back to the app tab (openApp.ts's find-or-open) and closes itself.
//   - Closing the tab, or MetaMask not being installed, ends the request with the same error codes MetaMask uses (4001 rejected, 4900 unavailable).
// The accounts MetaMask shared are kept in chrome.storage.local so the list and the signing choice need no tab.
import { readOpenTarget, urlForOpenTarget } from './openTargetStorage';
import { openOrFocusApp } from './openApp';

export const RELAY_PATH = '/metamaskRelay.html';
export const METAMASK_ACCOUNTS_KEY = 'meritMetaMaskAccounts';

/** The only calls the relay passes to MetaMask: connect, read, sign, send, switch network, revoke. */
export const RELAY_METHODS = new Set([
  'eth_requestAccounts',
  'eth_accounts',
  'eth_chainId',
  'personal_sign',
  'eth_signTypedData_v4',
  'eth_sendTransaction',
  'wallet_switchEthereumChain',
  'wallet_revokePermissions',
]);

const REQUEST_TIMEOUT_MS = 5 * 60_000;
const TAB_LOAD_TIMEOUT_MS = 20_000;
const CLOSE_AFTER_IDLE_MS = 1500;

export interface RelayError {
  code: number;
  message: string;
}
export type RelayReply = { ok: true; result: unknown } | { ok: false; error: RelayError };

interface Waiting {
  tabId: number;
  resolve: (reply: RelayReply) => void;
}

const waiting = new Map<number, Waiting>();
let relayTabId: number | undefined;
let relayUrl: string | undefined;
let counter = 0;
let chain: Promise<unknown> = Promise.resolve();
let closeTimer: ReturnType<typeof setTimeout> | undefined;

const fail = (code: number, message: string): RelayReply => ({ ok: false, error: { code, message } });

/**
 * 2026-10-26 (owner report): closing the relay tab while it is still the active one leaves it to the browser's own
 * heuristic to pick what becomes active next, which does not reliably land back on the app tab (it picked an
 * unrelated tab once). The fix the owner asked for: do exactly what the side panel's own "open the web site" button
 * does (src/openApp.ts) and switch to the real app tab FIRST, so the relay tab is no longer active by the time it is
 * removed and the browser never has to guess.
 */
async function returnToApp(): Promise<void> {
  await openOrFocusApp().catch(() => undefined);
}

async function ensureTab(): Promise<number> {
  const base = urlForOpenTarget(await readOpenTarget());
  const url = `${base}${RELAY_PATH}`;
  if (relayTabId !== undefined && relayUrl === url) {
    const existing = await chrome.tabs.get(relayTabId).catch(() => undefined);
    if (existing?.id !== undefined) return existing.id;
  }
  const tab = await chrome.tabs.create({ url, active: true });
  if (tab.id === undefined) throw new Error('The MetaMask page could not be opened.');
  relayTabId = tab.id;
  relayUrl = url;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('The MetaMask page did not load.'));
    }, TAB_LOAD_TIMEOUT_MS);
    const listener = (id: number, info: { status?: string }) => {
      if (id !== tab.id || info.status !== 'complete') return;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    chrome.tabs.onUpdated.addListener(listener);
    // the page may already be complete by the time the listener is on
    void chrome.tabs.get(tab.id!).then((t) => {
      if (t.status === 'complete') listener(tab.id!, { status: 'complete' });
    });
  });
  return tab.id;
}

function scheduleClose(): void {
  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    if (waiting.size > 0 || relayTabId === undefined) return;
    const id = relayTabId;
    relayTabId = undefined;
    // switch away from the relay tab BEFORE removing it, so it is never the active tab the browser has to replace.
    void returnToApp().then(() => chrome.tabs.remove(id).catch(() => undefined));
  }, CLOSE_AFTER_IDLE_MS);
}

async function run(method: string, params: unknown): Promise<RelayReply> {
  if (!RELAY_METHODS.has(method)) return fail(-32601, `${method} is not supported through the relay.`);
  if (closeTimer) clearTimeout(closeTimer);
  let tabId: number;
  try {
    tabId = await ensureTab();
  } catch (error) {
    return fail(4900, error instanceof Error ? error.message : 'The MetaMask page could not be opened.');
  }
  const id = ++counter;
  const answer = new Promise<RelayReply>((resolve) => {
    waiting.set(id, { tabId, resolve });
    setTimeout(() => {
      if (waiting.delete(id)) resolve(fail(4900, 'MetaMask did not answer in time.'));
    }, REQUEST_TIMEOUT_MS);
  });
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'merit/relay/call', id, method, params });
  } catch {
    if (waiting.delete(id)) return fail(4900, 'The MetaMask page is not ready. Try again.');
  }
  const reply = await answer;
  scheduleClose();
  return reply;
}

/** Ask MetaMask (through the relay tab) one call at a time. Never throws: the answer says whether it worked. */
export function relayRequest(method: string, params?: unknown): Promise<RelayReply> {
  const next = chain.then(() => run(method, params));
  chain = next.catch(() => undefined);
  return next;
}

/** An answer from the relay tab (the content script forwards the page script's answer). Accepted only from the tab opened here, on the app's own address. */
export function acceptRelayResult(message: { id?: unknown; ok?: unknown; result?: unknown; error?: { code?: unknown; message?: unknown } }, sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id || sender.tab?.id === undefined || sender.tab.id !== relayTabId) return false;
  if (typeof sender.url !== 'string' || !relayUrl || !sender.url.startsWith(relayUrl)) return false;
  if (typeof message.id !== 'number') return false;
  const entry = waiting.get(message.id);
  if (!entry || entry.tabId !== sender.tab.id) return false;
  waiting.delete(message.id);
  entry.resolve(
    message.ok
      ? { ok: true, result: message.result }
      : fail(typeof message.error?.code === 'number' ? message.error.code : -32603, typeof message.error?.message === 'string' ? message.error.message : 'MetaMask did not answer.'),
  );
  return true;
}

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === relayTabId) {
    relayTabId = undefined;
    // the tab is already gone here (someone closed it by hand, or MetaMask navigated it away): the best that can be
    // done is bring the app tab forward after the fact, same routine as the normal close above.
    void returnToApp();
  }
  for (const [id, entry] of Array.from(waiting)) {
    if (entry.tabId !== tabId) continue;
    waiting.delete(id);
    entry.resolve(fail(4001, 'The MetaMask window was closed before it answered.'));
  }
});

export async function readMetaMaskAccounts(): Promise<string[]> {
  const stored = (await chrome.storage.local.get(METAMASK_ACCOUNTS_KEY))[METAMASK_ACCOUNTS_KEY];
  return Array.isArray(stored) ? stored.filter((a): a is string => typeof a === 'string') : [];
}

export async function writeMetaMaskAccounts(accounts: string[]): Promise<void> {
  await chrome.storage.local.set({ [METAMASK_ACCOUNTS_KEY]: Array.from(new Set(accounts.map((a) => a))) });
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  const m = message as { type?: unknown; method?: unknown; params?: unknown; accounts?: unknown } | null;
  const type = m?.type;
  if (type === 'merit/relay/result') {
    sendResponse({ ok: acceptRelayResult(m as Parameters<typeof acceptRelayResult>[0], sender) });
    return false;
  }
  if (typeof type !== 'string' || !type.startsWith('merit/metamask/')) return false;
  // Only the extension's own pages may use the relay (a content script reports the URL of the web page it runs in).
  if (sender.id !== chrome.runtime.id || typeof sender.url !== 'string' || !sender.url.startsWith(chrome.runtime.getURL(''))) {
    sendResponse({ ok: false, error: { code: 4100, message: 'forbidden' } });
    return false;
  }
  if (type === 'merit/metamask/request') {
    if (typeof m?.method !== 'string') {
      sendResponse({ ok: false, error: { code: -32602, message: 'A method is required.' } });
      return false;
    }
    void relayRequest(m.method, m.params).then(sendResponse);
    return true;
  }
  if (type === 'merit/metamask/accounts') {
    void readMetaMaskAccounts().then((accounts) => sendResponse({ ok: true, accounts }));
    return true;
  }
  if (type === 'merit/metamask/setAccounts') {
    const accounts = Array.isArray(m?.accounts) ? (m!.accounts as unknown[]).filter((a): a is string => typeof a === 'string') : [];
    void writeMetaMaskAccounts(accounts).then(() => sendResponse({ ok: true, accounts }));
    return true;
  }
  sendResponse({ ok: false, error: { code: -32601, message: 'unknown request' } });
  return false;
});

// File: src/metamaskRelay.ts
//
// 2026-10-12 (docs/connectionDesign.txt item 9, reopened by the owner): MetaMask as an approver for the EXTENSION. The side panel is an extension page and MetaMask does not inject itself into
// extension pages, so the panel cannot reach it. The way through is one ordinary page on the Merit web app's own address (/metamaskRelay.html, a static page): MetaMask injects into it like
// into any web page, and the extension's page script (inpage.ts) and content script (contentScript.ts) carry the request to MetaMask and the answer back. Nothing is signed here and no key is held:
// MetaMask asks the person in its own popup, exactly as it does for any site.
//   - Only the app's own address is opened (the open target, Local or Prod), only an allow-listed set of methods is sent, and an answer is accepted only from the page opened here, from that address.
//   - Requests are sent one at a time; the page stays open for a moment after the last one (a send makes three calls) and then closes itself.
//   - Closing the page, or MetaMask not being installed, ends the request with the same error codes MetaMask uses (4001 rejected, 4900 unavailable).
// The accounts MetaMask shared are kept in chrome.storage.local so the list and the signing choice need no page.
//   - 2026-10-26 (owner reports, repeatedly): this page used to be an ordinary TAB in the person's own window -- first opened ACTIVE (visibly taking over the window; two different ways of giving focus back
//     afterward were tried and were not enough), then opened with active: false (so it stopped stealing focus, but it was STILL a tab the person could see appear in their own tab strip, which was the actual
//     complaint: "remove this blue Approval tab completely"). The fix: it is no longer a tab in the person's window at all. It is its own separate, minimized, unfocused popup WINDOW
//     (chrome.windows.create, not chrome.tabs.create) -- MetaMask injects into its page exactly the same way, but there is nothing for the person to see in their own window, ever.
import { readOpenTarget, urlForOpenTarget } from './openTargetStorage';

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
let relayWindowId: number | undefined;
let relayUrl: string | undefined;
let counter = 0;
let chain: Promise<unknown> = Promise.resolve();
let closeTimer: ReturnType<typeof setTimeout> | undefined;

const fail = (code: number, message: string): RelayReply => ({ ok: false, error: { code, message } });

async function ensureTab(): Promise<number> {
  const base = urlForOpenTarget(await readOpenTarget());
  const url = `${base}${RELAY_PATH}`;
  if (relayTabId !== undefined && relayUrl === url) {
    const existing = await chrome.tabs.get(relayTabId).catch(() => undefined);
    if (existing?.id !== undefined) return existing.id;
  }
  // its own unfocused, minimized WINDOW -- not a tab in the person's own window at all (see the file header, 2026-10-26). Several earlier attempts
  // failed: state: 'minimized' at CREATE time is not reliable on real Chrome (the owner saw an ordinary visible, focused window); combining it with
  // an explicit position is rejected outright ("Invalid value for state"); a fully off-screen position is rejected too ("Invalid value for bounds
  // ... must be at least 50% within visible screen space" -- a deliberate anti-abuse rule); Chrome silently clamps a requested 1x1 size back up to
  // its own minimum; and even a SEPARATE windows.update({state:'minimized'}) called right after create is itself silently reverted moments later
  // (confirmed live: it reports success, but re-reading the window back shows state 'normal', focused true again) -- there is a brief window right
  // after a window is created where the OS/Chrome is still settling which window has focus, and a minimize issued into that window loses the race.
  // Waiting for that to settle before minimizing is what actually sticks (confirmed live, holds for 2+ seconds afterward).
  const win = await chrome.windows.create({ url, type: 'popup', focused: false });
  const tab = win?.tabs?.[0];
  if (win?.id === undefined || tab?.id === undefined) throw new Error('The MetaMask page could not be opened.');
  await new Promise((resolve) => setTimeout(resolve, 500));
  await chrome.windows.update(win.id, { state: 'minimized' }).catch(() => undefined);
  relayTabId = tab.id;
  relayWindowId = win.id;
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
    if (waiting.size > 0 || relayWindowId === undefined) return;
    const windowId = relayWindowId;
    relayTabId = undefined;
    relayWindowId = undefined;
    void chrome.windows.remove(windowId).catch(() => undefined);
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
    relayWindowId = undefined;
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

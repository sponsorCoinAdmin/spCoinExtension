// File: src/metamaskRelay.ts
//
// 2026-10-12 (docs/connectionDesign.txt item 9, reopened by the owner): MetaMask as an approver for the EXTENSION. The side panel is an extension page and MetaMask does not inject itself into
// extension pages, so the panel cannot reach it. The way through is one ordinary page on the Merit web app's own address (/metamaskRelay.html, a static page): MetaMask injects into it like
// into any web page, and the extension's page script (inpage.ts) and content script (contentScript.ts) carry the request to MetaMask and the answer back. Nothing is signed here and no key is held:
// MetaMask asks the person in its own popup, exactly as it does for any site.
//   - Only the app's own address is opened (the open target, Local or Prod), only an allow-listed set of methods is sent, and an answer is accepted only from the page opened here, from that address.
//   - The accounts MetaMask shared are kept in chrome.storage.local so the list and the signing choice need no page.
//   - 2026-10-27 (owner reports, repeatedly, then the owner's own line of questioning): this page went through three designs, each one still visible to the person in some way -- an ordinary ACTIVE tab
//     (took over the window), then a tab with active: false (stopped stealing focus, but still appeared as an entry in the tab strip -- the actual complaint, "remove this blue Approval tab completely"),
//     then its own minimized popup WINDOW (chrome.windows.create -- fighting Chrome's own window-state APIs the whole way: state at create time is unreliable, combining it with a position is rejected
//     outright, a fully off-screen position is rejected too as a deliberate anti-abuse rule, a requested tiny size is silently clamped back up, and even a follow-up windows.update to minimize was itself
//     silently reverted moments later by an OS focus-settle race -- a fixed delay before minimizing was the only thing that held, and still was not reliably confirmed on the owner's own real Chrome).
//     The owner's own question broke the deadlock: does this need to be a SEPARATE browsing context at all, or could it live inside a tab the person already has open? Confirmed live (real MetaMask): yes --
//     chrome.scripting.executeScript injects a hidden iframe into an EXISTING ordinary tab (found by host-permission URL match, or opened inactive if none exists, exactly like openApp.ts's own
//     find-or-open routine for the "open the web site" button); MetaMask injects into that iframe exactly as it would into a dedicated tab (confirmed: window.ethereum, EIP-6963 announce, a full
//     eth_requestAccounts round trip all work); and the tab the person is actually on never changes, not even for an instant -- confirmed by polling chrome.tabs.query throughout an entire real approval.
//     This does not work if the iframe's parent is an EXTENSION page (also confirmed live: nesting it inside the side panel itself gets no MetaMask injection at all -- a real Chrome isolation boundary,
//     not a bug), which is why it has to be a tab the person already has open (or one opened for them), never the side panel.
import { readOpenTarget, urlForOpenTarget } from './openTargetStorage';

export const RELAY_PATH = '/metamaskRelay.html';
export const METAMASK_ACCOUNTS_KEY = 'meritMetaMaskAccounts';
/** DOM ids of the elements injected into the app tab: the hidden relay iframe, and the small "approve in MetaMask" notice shown on the page while a request is open (owner request, 2026-10-27: "let us
 * know what is happening in the web app page"). */
const RELAY_FRAME_ID = 'merit-metamask-relay-frame';
const BANNER_ID = 'merit-metamask-relay-banner';

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
const HIDE_BANNER_AFTER_IDLE_MS = 1500;

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
/** The app tab currently hosting the hidden relay iframe -- an ordinary tab the person already had open, or one opened inactive for them. Never a dedicated tab/window of its own. */
let relayTabId: number | undefined;
let relayUrl: string | undefined;
let counter = 0;
let chain: Promise<unknown> = Promise.resolve();
let hideBannerTimer: ReturnType<typeof setTimeout> | undefined;

const fail = (code: number, message: string): RelayReply => ({ ok: false, error: { code, message } });

/** The app's own tab, found by its URL (host_permissions already covers it) -- the SAME routine openApp.ts's "open the web site" button uses, except never made active: finding or opening it must not
 * disturb whatever tab the person is actually looking at. */
async function findOrOpenAppTab(base: string): Promise<number> {
  const [existing] = await chrome.tabs.query({ url: `${base}/*` });
  if (existing?.id !== undefined) return existing.id;
  const tab = await chrome.tabs.create({ url: base, active: false });
  if (tab.id === undefined) throw new Error('The app page could not be opened.');
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('The app page did not load.'));
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

/** Creates the hidden relay iframe in the app tab if it is not already there (idempotent: also self-heals if the person navigated that tab away and back, since the element would be gone). Resolves only
 * once the iframe itself has loaded, the same guarantee the old tab/window-based ensureTab() gave before a request is sent into it. */
async function injectRelayFrame(tabId: number, url: string): Promise<void> {
  const [injected] = await chrome.scripting.executeScript({
    target: { tabId },
    func: (frameId: string, relayUrl: string) => {
      const existing = document.getElementById(frameId);
      if (existing) return Promise.resolve('existing');
      return new Promise((resolve) => {
        const frame = document.createElement('iframe');
        frame.id = frameId;
        frame.src = relayUrl;
        frame.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:0;';
        frame.onload = () => resolve('loaded');
        document.body.appendChild(frame);
      });
    },
    args: [RELAY_FRAME_ID, url],
  });
  if (injected?.result !== 'existing' && injected?.result !== 'loaded') throw new Error('The MetaMask page could not be opened.');
}

/** The on-page notice (owner request, 2026-10-27): shown in the app tab itself while a request is open, so there is something to see there too, not just the side panel's own "Waiting for MetaMask ..."
 * message. Idempotent (safe to call once per request, and updates its method name on every call since the same banner element is reused across a burst of different methods -- connect, switch chain, send);
 * hidden again after the whole burst of requests goes idle (hideApprovalBanner, below), or by hand via its own close button. Styled to match the wallet's own stakeConfirmPopupStyle (spcoin-common, div11/h3:
 * dark navy #11162A, red border #ef4444) and centered in the viewport, per the owner's own request ("more prominent without being overbearing") -- centered and house-styled, but no full-screen backdrop, so
 * it never blocks the page underneath. Text split 2026-10-27 (owner request): "Approve:" and the method name in the same red as the border (#f87171); the rest in the same blue as the Test page's own
 * "Exchange Context" dropdown (#5981F3, stakeConfirmPopupColors.BLUE) -- three separate spans, not one string, so each colour is exact rather than guessed. */
async function showApprovalBanner(tabId: number, method: string): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (bannerId: string, methodName: string) => {
      const methodSpanId = bannerId + '-method';
      const titleId = bannerId + '-title';
      let el = document.getElementById(bannerId);
      if (!el) {
        el = document.createElement('div');
        el.id = bannerId;
        el.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;display:flex;flex-direction:column;align-items:stretch;gap:10px;background:#11162A;border:1px solid #ef4444;border-radius:16px;padding:14px 20px 16px;font:600 16px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.35);pointer-events:auto;';
        // the active browser tab's own title, centered at the top (owner request, 2026-10-27): confirms which page this notice belongs to.
        const title = document.createElement('div');
        title.id = titleId;
        title.style.cssText = 'text-align:center;font-size:13px;font-weight:700;color:#8FA8FF;';
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:14px;';
        const text = document.createElement('span');
        const approve = document.createElement('span');
        approve.textContent = 'Approve:';
        approve.style.color = '#f87171';
        const middle = document.createElement('span');
        middle.textContent = ' MetaMask Authentication Request for Method ';
        middle.style.color = '#5981F3';
        const methodSpan = document.createElement('span');
        methodSpan.id = methodSpanId;
        methodSpan.style.color = '#f87171';
        text.appendChild(approve);
        text.appendChild(middle);
        text.appendChild(methodSpan);
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '✕';
        closeBtn.setAttribute('aria-label', 'Dismiss');
        closeBtn.style.cssText = 'all:unset;cursor:pointer;flex-shrink:0;color:#f87171;font-size:16px;line-height:1;padding:2px 4px;';
        closeBtn.onclick = () => { el!.style.display = 'none'; };
        row.appendChild(text);
        row.appendChild(closeBtn);
        el.appendChild(title);
        el.appendChild(row);
        document.body.appendChild(el);
      }
      const methodSpan = document.getElementById(methodSpanId);
      if (methodSpan) methodSpan.textContent = methodName;
      const titleEl = document.getElementById(titleId);
      if (titleEl) titleEl.textContent = 'Panel Tab ' + document.title;
      el.style.display = 'flex';
    },
    args: [BANNER_ID, method],
  }).catch(() => undefined);
}

async function hideApprovalBanner(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (bannerId: string) => {
      const el = document.getElementById(bannerId);
      if (el) el.style.display = 'none';
    },
    args: [BANNER_ID],
  }).catch(() => undefined);
}

async function ensureTab(): Promise<number> {
  const base = urlForOpenTarget(await readOpenTarget());
  const url = `${base}${RELAY_PATH}`;
  const tabId = await findOrOpenAppTab(base);
  await injectRelayFrame(tabId, url);
  relayTabId = tabId;
  relayUrl = url;
  return tabId;
}

function scheduleHideBanner(tabId: number): void {
  if (hideBannerTimer) clearTimeout(hideBannerTimer);
  hideBannerTimer = setTimeout(() => {
    if (waiting.size > 0) return;
    void hideApprovalBanner(tabId);
  }, HIDE_BANNER_AFTER_IDLE_MS);
}

async function run(method: string, params: unknown): Promise<RelayReply> {
  if (!RELAY_METHODS.has(method)) return fail(-32601, `${method} is not supported through the relay.`);
  if (hideBannerTimer) clearTimeout(hideBannerTimer);
  let tabId: number;
  try {
    tabId = await ensureTab();
  } catch (error) {
    return fail(4900, error instanceof Error ? error.message : 'The MetaMask page could not be opened.');
  }
  void showApprovalBanner(tabId, method);
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
  scheduleHideBanner(tabId);
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
  if (tabId === relayTabId) relayTabId = undefined;
  for (const [id, entry] of Array.from(waiting)) {
    if (entry.tabId !== tabId) continue;
    waiting.delete(id);
    entry.resolve(fail(4001, 'The app tab was closed before MetaMask answered.'));
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

// File: src/walletProvider.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E6 / table row 18) -- the extension's half of the injected provider, in the background worker.
// A web page talks to inpage.ts (an EIP-1193 provider it finds through EIP-6963); contentScript.ts relays each request here as
// merit/provider/request; the ProviderController in @sponsorcoin/merit-wallet decides what the page may do (accounts only after the user
// connects the site, every signature and transaction waits in the approval queue). This file supplies the extension-specific parts: where
// permissions and the active network are stored, how an RPC call is made, how events reach the pages, and how the approval screen is opened.
import {
  ProviderController,
  ProviderRpcError,
  PROVIDER_ERROR,
  type ApprovalController,
  type LocalSigner,
  type PermissionStore,
  type VaultSession,
  type WalletAccounts,
  type WalletVaultContents,
} from '@sponsorcoin/merit-wallet/vault';
import { listConfiguredNetworks } from '@sponsorcoin/spcoin-feeds/networks';
import { rpcUrlForChain } from './chainRpc';

const PERMISSIONS_KEY = 'spcoin_merit_permissions';
const CHAIN_KEY = 'spcoin_merit_active_chain';
const DEFAULT_CHAIN_ID = 31337;

const permissionStore: PermissionStore = {
  async get(origin) {
    const all = ((await chrome.storage.local.get(PERMISSIONS_KEY))[PERMISSIONS_KEY] ?? {}) as Record<string, string[]>;
    return all[origin] ?? [];
  },
  async set(origin, addresses) {
    const all = ((await chrome.storage.local.get(PERMISSIONS_KEY))[PERMISSIONS_KEY] ?? {}) as Record<string, string[]>;
    all[origin] = addresses;
    await chrome.storage.local.set({ [PERMISSIONS_KEY]: all });
  },
  async remove(origin) {
    const all = ((await chrome.storage.local.get(PERMISSIONS_KEY))[PERMISSIONS_KEY] ?? {}) as Record<string, string[]>;
    delete all[origin];
    await chrome.storage.local.set({ [PERMISSIONS_KEY]: all });
  },
  async origins() {
    return Object.keys(((await chrome.storage.local.get(PERMISSIONS_KEY))[PERMISSIONS_KEY] ?? {}) as Record<string, string[]>);
  },
};

export async function getActiveChainId(): Promise<number> {
  const stored = (await chrome.storage.local.get(CHAIN_KEY))[CHAIN_KEY];
  return typeof stored === 'number' ? stored : DEFAULT_CHAIN_ID;
}

const isKnownChain = (chainId: number) => listConfiguredNetworks({ showTestNets: true }).some((n) => n.chainId === chainId);

async function rpc(chainId: number, method: string, params: unknown[]): Promise<unknown> {
  const url = rpcUrlForChain(chainId);
  if (!url) throw new ProviderRpcError(PROVIDER_ERROR.chainDisconnected, `No network is configured for chain ${chainId}.`);
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const body = (await response.json()) as { result?: unknown; error?: { code?: number; message?: string } };
  if (body.error) throw new ProviderRpcError(body.error.code ?? PROVIDER_ERROR.internal, body.error.message ?? 'RPC error');
  return body.result;
}

/** Tell the pages of one origin (or every page) about an event; a tab without our content script is not an error. */
async function sendToTabs(origin: string | undefined, message: unknown) {
  const tabs = await chrome.tabs.query({}).catch(() => [] as chrome.tabs.Tab[]);
  for (const tab of tabs) {
    if (tab.id === undefined || !tab.url) continue;
    try {
      if (origin && new URL(tab.url).origin !== origin) continue;
    } catch {
      continue;
    }
    chrome.tabs.sendMessage(tab.id, message).catch(() => undefined);
  }
}

/**
 * A page is waiting on the user: make sure there is a wallet screen to show it on, like MetaMask's popup. 2026-10-14 (owner request): a wallet screen that is already open (a side panel, a tab, a popup) is
 * BROUGHT FORWARD (its browser window is focused and flashes, a tab is selected) instead of being left behind other windows; when there is none, a popup window is opened. A popup window needs no click
 * from the person (only chrome.sidePanel.open does), which is what lets a request from a remote page open the wallet.
 */
/** The name of the port the side panel keeps open while it is on screen (sidepanel.ts). */
export const SIDE_PANEL_PORT = 'merit-sidepanel';
/** How long a page's request may wait for the person before it is rejected (MetaMask has no limit; this wallet's side panel lives long, so an old request would show up much later). */
const PAGE_REQUEST_MAX_MS = 5 * 60_000;
const NEEDS_PERSON =new Set(['eth_requestAccounts', 'wallet_requestPermissions', 'eth_sendTransaction', 'personal_sign', 'eth_sign', 'eth_signTypedData_v4', 'eth_signTypedData_v3', 'eth_signTypedData']);
/** Side panels opened by gesture just now, per window: ensureWalletScreenOpen then knows the screen is already there. */
const openedNow = new Map<number, number>();
/** Set by installProvider: the wallet is locked. A locked wallet never gets a popup (the side panel shows the login and the waiting site); the popup was a second copy of the connect page. */
let isLockedWallet: () => boolean = () => false;
function openSidePanelNow(windowId: number | undefined) {
  if (windowId == null || windowId < 0) return;
  // An open side panel is brought to the request (it listens for 'merit/signing/changed' and shows the waiting request); closing it first was tried and is NOT done: the close and the open race, and no await may come first (the gesture is lost).
  const sp = chrome.sidePanel as unknown as { open(o: { windowId: number }): Promise<void> };
  // Marked BEFORE the open settles: the approval can reach ensureWalletScreenOpen while the open is still in flight (a locked wallet), and that must not add a popup next to the side panel.
  openedNow.set(windowId, Date.now());
  sp.open({ windowId }).catch((error) => {
    console.warn('side panel open (gesture)', error);
    openedNow.delete(windowId);
    void ensureWalletScreenOpen(windowId);
  });
}
async function ensureWalletScreenOpen(windowId?: number) {
  // 2026-10-15 (owner request): the wallet opens as the browser's SIDE PANEL, never a popup. A side panel already open in that window is closed and opened again, so it shows the waiting request fresh.
  // chrome.sidePanel.open needs a user gesture; the page's click that started the request reaches us through the content script's message, which carries it.
  if (windowId != null && openedNow.has(windowId) && Date.now() - (openedNow.get(windowId) as number) < 5000) return;
  if (windowId != null && windowId >= 0) {
    try {
      const sp = chrome.sidePanel as unknown as { open(o: { windowId: number }): Promise<void> };
      const open = await chrome.runtime.getContexts({ contextTypes: ['SIDE_PANEL'] as chrome.runtime.ContextType[] }).catch(() => []);
      // 2026-10-15: an open side panel is NEVER closed here. This path has no click behind it, so a close could not be followed by an open (the browser refuses an open without a gesture) and the panel would be gone.
      // The open panel listens for 'merit/signing/changed' and shows the waiting request by itself: it is only brought to the front.
      if (open.some((c) => c.windowId === windowId)) {
        await chrome.windows.update(windowId, { focused: true, drawAttention: true }).catch(() => undefined);
        return;
      }
      await sp.open({ windowId });
      return;
    } catch (error) {
      console.warn('side panel could not be opened from this request', error);
    }
  }
  try {
    const open = await chrome.runtime.getContexts({ contextTypes: ['SIDE_PANEL', 'TAB', 'POPUP'] as chrome.runtime.ContextType[] });
    if (open.length) {
      for (const context of open) {
        if (context.tabId != null && context.tabId >= 0) await chrome.tabs.update(context.tabId, { active: true }).catch(() => undefined);
        if (context.windowId != null && context.windowId >= 0) await chrome.windows.update(context.windowId, { focused: true, drawAttention: true }).catch(() => undefined);
      }
      return;
    }
  } catch {
    // getContexts missing on an old browser: fall through and open a window.
  }
  if (isLockedWallet()) return;
  if (windowId != null && openedNow.has(windowId) && Date.now() - (openedNow.get(windowId) as number) < 120000) return;
  // Last resort (the browser refused the side panel: no click behind the request): a popup window needs no click.
  await chrome.windows.create({ url: chrome.runtime.getURL('sidepanel.html'), type: 'popup', width: 400, height: 740 });
}

export interface ProviderDeps {
  session: VaultSession<WalletVaultContents>;
  accounts: WalletAccounts;
  approvals: ApprovalController;
  signer: LocalSigner;
  /** Resolves once the vault has been restored after a worker restart. */
  ready: Promise<unknown>;
}

export function installProvider({ session, accounts, approvals, signer, ready }: ProviderDeps): ProviderController {
  isLockedWallet = () => !session.isUnlocked();
  const controller = new ProviderController({
    session,
    accounts,
    approvals,
    signer,
    permissions: permissionStore,
    getChainId: getActiveChainId,
    setChainId: async (chainId) => {
      await chrome.storage.local.set({ [CHAIN_KEY]: chainId });
      chrome.runtime.sendMessage({ type: 'merit/network/changed', chainId }).catch(() => undefined);
    },
    isKnownChain,
    rpc,
  });

  controller.onEvent((e) => {
    void sendToTabs(e.origin, { type: 'merit/provider/event', event: e.event, data: e.data });
  });

  // Lock / unlock changes what every connected page may see.
  session.onChange(() => void controller.notifyAccountsChanged());

  // The approval screen: tell the side panel the list changed, and open a screen when a PAGE (not the wallet itself) is waiting.
  // The lock gate is the queue itself (as in MetaMask): a request from a page waits here while the wallet is locked, the side panel shows the login with the waiting site named, and the request is shown for approval only after the unlock
  // (dappApprovals.ts). A page's request ends when the person decides, when the side panel is closed (below), when the page cancels it, or after PAGE_REQUEST_MAX_MS; never silently.
  let seen = new Set<string>();
  let lastRequestWindowId: number | undefined;
  approvals.onChange(() => {
    chrome.runtime.sendMessage({ type: 'merit/signing/changed' }).catch(() => undefined);
    const pending = approvals.list();
    const fresh = pending.filter((p) => p.origin !== 'wallet' && !seen.has(p.id));
    seen = new Set(pending.map((p) => p.id));
    for (const p of fresh) {
      // an old request must not appear much later, after a long-forgotten unlock: it is rejected (the page sees 4001) once it is this old
      setTimeout(() => {
        if (approvals.list().some((q) => q.id === p.id)) approvals.reject(p.id, 'The request expired.');
      }, PAGE_REQUEST_MAX_MS);
    }
    if (fresh.length) void ensureWalletScreenOpen(lastRequestWindowId);
  });

  // Closing the wallet's screen answers every waiting page with "rejected" (MetaMask: closing the popup rejects). The side panel keeps a port open while it is on screen; a port going away is the hint that a screen may have closed, and the browser is then ASKED
  // whether any wallet screen is still open (a count of ports is not trusted: a port can outlive its page for a moment). Only when none is left are the waiting requests rejected.
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== SIDE_PANEL_PORT || port.sender?.id !== chrome.runtime.id) return;
    port.onDisconnect.addListener(() => {
      setTimeout(async () => {
        const open = await chrome.runtime.getContexts({ contextTypes: ['SIDE_PANEL', 'TAB', 'POPUP'] as chrome.runtime.ContextType[] }).catch(() => undefined);
        if (!open || open.some((c) => c.documentUrl?.includes('/sidepanel.html'))) return;
        for (const p of approvals.list()) if (p.origin !== 'wallet') approvals.reject(p.id, 'The wallet was closed.');
      }, 500);
    });
  });

  // Requests from pages arrive through the content script: it runs in the page's tab, so sender.tab is set and sender.origin is the PAGE's origin,
  // which is what permissions are keyed by (the request body is never trusted for it).
  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    const m = message as { type?: string; method?: string; params?: unknown } | null;
    if (!m || m.type !== 'merit/provider/request') return false;
    if (sender.id !== chrome.runtime.id || !sender.tab || typeof sender.origin !== 'string' || sender.origin === 'null' || typeof m.method !== 'string') {
      sendResponse({ ok: false, error: { code: PROVIDER_ERROR.unauthorized, message: 'Request not allowed.' } });
      return false;
    }
    const origin = sender.origin;
    lastRequestWindowId = sender.tab.windowId;
    // The page's own click, sent BEFORE any request (the app's Connect click): open the screen now, while the click's gesture is still alive. A request that follows only after the app's own awaits (finding the wallet, asking
    // its status) arrives too late for the browser to allow an open.
    if (m.method === 'merit_openWallet') {
      openSidePanelNow(sender.tab.windowId);
      sendResponse({ ok: true, result: null });
      return false;
    }
    // The page gave up waiting (Cancel, or its own time limit): its waiting requests end with "rejected", so no approval is left behind in the wallet. Only this site's own requests are touched.
    if (m.method === 'merit_cancelRequest') {
      for (const p of approvals.list()) if (p.origin === origin) approvals.reject(p.id, 'The site cancelled the request.');
      sendResponse({ ok: true, result: null });
      return false;
    }
    // The request carries the page click's user gesture only for this synchronous moment: open the side panel NOW for a request that can ask the person something.
    if (NEEDS_PERSON.has(m.method)) openSidePanelNow(sender.tab.windowId);
    void ready
      .then(() => controller.handle(origin, { method: m.method as string, params: m.params }))
      .then((result) => sendResponse({ ok: true, result: result === undefined ? null : result }))
      .catch((error: unknown) => {
        const e = error instanceof ProviderRpcError ? error : new ProviderRpcError(PROVIDER_ERROR.internal, error instanceof Error ? error.message : String(error));
        sendResponse({ ok: false, error: { code: e.code, message: e.message } });
      });
    return true;
  });

  return controller;
}

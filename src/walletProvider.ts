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

/** A page is waiting on the user: make sure there is a wallet screen to show it on (a side panel or tab already open counts). */
async function ensureWalletScreenOpen() {
  try {
    const open = await chrome.runtime.getContexts({ contextTypes: ['SIDE_PANEL', 'TAB', 'POPUP'] as chrome.runtime.ContextType[] });
    if (open.length) return;
  } catch {
    // getContexts missing on an old browser: fall through and open a window.
  }
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
  let seen = new Set<string>();
  approvals.onChange(() => {
    chrome.runtime.sendMessage({ type: 'merit/signing/changed' }).catch(() => undefined);
    const pending = approvals.list();
    const fresh = pending.filter((p) => p.origin !== 'wallet' && !seen.has(p.id));
    seen = new Set(pending.map((p) => p.id));
    if (fresh.length) void ensureWalletScreenOpen();
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

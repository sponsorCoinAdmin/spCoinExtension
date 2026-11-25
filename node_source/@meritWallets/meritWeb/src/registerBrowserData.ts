// File: src/registerBrowserData.ts
//
// 2026-11-19 (docs/design/standAloneWalletInstall.txt) -- the static data a browser wallet reads, registered from ONE snapshot the page hands over (the shared data package's bundledFeedData.json: network info, token lists, role account lists, the spCoin deployment map).
// This is the extension's src/bundledFeeds.ts as a function of the snapshot, so the wallet never asks a hosted app for anything: the feeds answer from the snapshot first (bundledFirst, hostedAllowed false) and the engine's network helpers read the same data.
// The snapshot is a parameter, not an import, so this package stays small and a host can supply a newer one. Call it once before the wallet mounts (registering twice is harmless).
import { registerBundledFeeds, setFeedNetworkPolicy } from '@sponsorcoin/spcoin-feeds/shared';
import { createBundledTokensStore, createTokensApi } from '@sponsorcoin/spcoin-feeds/api';
import { listConfiguredNetworks } from '@sponsorcoin/spcoin-feeds/networks';
import { loadSpCoinDeploymentMap, registerBundledFeeds as registerEngineBundledFeeds, registerLocalApi, registerNetworkData, resolveSpCoinDiskChainId } from '@sponsorcoin/spcoin-exchange-engine';

export type BrowserDataSnapshot = Record<string, unknown>;

const SNAPSHOT_ID = Symbol.for('merit-wallet.browser.snapshot');

/** The snapshot the page registered (for the readers that need the bundled ABIs and the deployment map), or undefined before registration. */
export function registeredBrowserData(): BrowserDataSnapshot | undefined {
  return (globalThis as unknown as Record<symbol, BrowserDataSnapshot | undefined>)[SNAPSHOT_ID];
}

export function registerBrowserData(data: BrowserDataSnapshot): void {
  const g = globalThis as unknown as Record<symbol, unknown>;
  if (g[SNAPSHOT_ID] === data) return;
  g[SNAPSHOT_ID] = data;

  registerBundledFeeds(data);
  setFeedNetworkPolicy({ bundledFirst: true, hostedAllowed: false, localAssets: true });

  const listOf = (path: string): unknown[] => {
    const raw = data[path] ?? data[path.toLowerCase()];
    return Array.isArray(raw) ? raw : [];
  };
  const tokenListOf = (chainId: number): unknown[] => {
    const key = Object.keys(data).find((k) => k.toLowerCase() === `/assets/blockchains/${chainId}/tokenlist.json`);
    return key && Array.isArray(data[key]) ? (data[key] as unknown[]) : [];
  };
  const tokenListChains = Object.keys(data).flatMap((k) => {
    const m = /^\/assets\/blockchains\/(\d+)\/tokenlist\.json$/i.exec(k);
    return m ? [Number(m[1])] : [];
  });
  registerEngineBundledFeeds({
    accountRoles: {
      recipients: listOf('/assets/accounts/recipients.accounts.json'),
      agents: listOf('/assets/accounts/agents.accounts.json'),
      sponsors: [],
    },
    // the chains with a token list are whatever the snapshot carries (the shared data package's set), not a list kept here
    tokenLists: Object.fromEntries(tokenListChains.map((id) => [id, tokenListOf(id)])),
  });

  // 2026-11-20: each chain's default settings are read from the data itself (every chain the snapshot carries) and registered FIRST: the network feed takes the endpoint of a network that carries none of its own (the Hardhat test chain) from them, so the list below has that chain only when the data does
  const defaultSettings = Object.fromEntries(
    Object.keys(data).flatMap((k) => {
      const m = /^\/assets\/blockchains\/(\d+)\/defaultNetworkSettings\.json$/i.exec(k);
      return m ? [[Number(m[1]), data[k]]] : [];
    }),
  );
  registerNetworkData({ chainIdList: [], defaultSettings: defaultSettings as never, configuredNetworks: [] });
  const configured = listConfiguredNetworks({ showTestNets: true });
  registerNetworkData({
    chainIdList: configured.map((n) => ({ chainId: n.chainId, name: n.name, symbol: n.symbol })),
    defaultSettings: defaultSettings as never,
    configuredNetworks: configured as unknown[],
  });

  // the token lists come from the same handler the web app serves at /api/spCoin/tokens, run in this page over the snapshot
  const store = createBundledTokensStore(data, { supportedChainIds: () => configured.map((n) => n.chainId), diskChainId: (chainId) => resolveSpCoinDiskChainId(chainId) });
  const tokensApi = createTokensApi(store);
  registerLocalApi('/api/spCoin/tokens', { get: tokensApi.list, post: tokensApi.batch });
  // the active spCoin of each chain, answered in-process
  for (const { chainId } of configured) {
    const record = data[`/api/spCoin/lab/networks/${chainId}/activeSpCoin`];
    if (record && typeof record === 'object') registerLocalApi(`/api/spCoin/lab/networks/${chainId}/activeSpCoin`, { get: async () => ({ status: 200, body: record }) });
  }
  const deployment = data['/resources/data/networks/spCoinDeployment.json'];
  if (deployment) loadSpCoinDeploymentMap(deployment as never);
}

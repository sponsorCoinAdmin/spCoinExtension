// File: src/standalone/registerStandaloneData.ts
//
// 2026-11-19 (docs/design/standAloneWalletInstall.txt) -- the static data a stand-alone wallet reads, registered from ONE snapshot the page hands over (the shared data package's bundledFeedData.json: network info, token lists, role account lists, the spCoin deployment map).
// This is the extension's src/bundledFeeds.ts as a function of the snapshot, so the wallet never asks a hosted app for anything: the feeds answer from the snapshot first (bundledFirst, hostedAllowed false) and the engine's network helpers read the same data.
// The snapshot is a parameter, not an import, so this package stays small and a host can supply a newer one. Call it once before the wallet mounts (registering twice is harmless).
import { registerBundledFeeds, setFeedNetworkPolicy } from '@sponsorcoin/spcoin-feeds/shared';
import { createBundledTokensStore, createTokensApi } from '@sponsorcoin/spcoin-feeds/api';
import { listConfiguredNetworks } from '@sponsorcoin/spcoin-feeds/networks';
import { loadSpCoinDeploymentMap, registerBundledFeeds as registerEngineBundledFeeds, registerLocalApi, registerNetworkData, resolveSpCoinDiskChainId } from '@sponsorcoin/spcoin-exchange-engine';

export type StandaloneDataSnapshot = Record<string, unknown>;

/** The chains the bundled token lists cover (the snapshot's own set). */
const TOKEN_LIST_CHAINS = [1, 8453, 137, 31337, 11155111];

const SNAPSHOT_ID = Symbol.for('merit-wallet.standalone.snapshot');

export function registerStandaloneData(snapshot: StandaloneDataSnapshot): void {
  const g = globalThis as unknown as Record<symbol, unknown>;
  if (g[SNAPSHOT_ID] === snapshot) return;
  g[SNAPSHOT_ID] = snapshot;
  const data = snapshot;

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
  registerEngineBundledFeeds({
    accountRoles: {
      recipients: listOf('/assets/accounts/recipients.accounts.json'),
      agents: listOf('/assets/accounts/agents.accounts.json'),
      sponsors: [],
    },
    tokenLists: Object.fromEntries(TOKEN_LIST_CHAINS.map((id) => [id, tokenListOf(id)])),
  });

  const configured = listConfiguredNetworks({ showTestNets: true });
  registerNetworkData({
    chainIdList: configured.map((n) => ({ chainId: n.chainId, name: n.name, symbol: n.symbol })),
    defaultSettings: Object.fromEntries(configured.map((n) => [n.chainId, data['/assets/blockchains/' + n.chainId + '/defaultNetworkSettings.json'] ?? {}])) as never,
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

// File: src/bundledFeeds.ts
//
// 2026-10-11 (docs/nodeSourceMigrationPlan.txt row 28, owner: independence is 100 percent): the snapshot now comes from the shared data package (@sponsorcoin/spcoin-data, the git submodule at node_source/spCoinData),
// which the web app (the data owner) rebuilds with its own script; this extension never reads the web app's source or files.
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table row 17, E5) -- registers the snapshot (bundledFeedData.json) with the feeds
// package, so the network info, token lists, role account lists and spCoin ABIs are still available when the hosted app cannot be reached
// (the feeds ask the network first; fresh data wins). Import this file once at startup, before any feed is read.
import { registerBundledFeeds, setFeedNetworkPolicy } from '@sponsorcoin/spcoin-feeds/shared';
import { registerBundledFeeds as registerEngineBundledFeeds, registerNetworkData, registerLocalApi, resolveSpCoinDiskChainId } from '@sponsorcoin/spcoin-exchange-engine';
import { createTokensApi, createBundledTokensStore } from '@sponsorcoin/spcoin-feeds/api';
import { listConfiguredNetworks } from '@sponsorcoin/spcoin-feeds/networks';
import snapshot from '../node_source/spCoinData/packages/@sponsorcoin/spcoin-data/bundledFeedData.json';

registerBundledFeeds(snapshot as Record<string, unknown>);
// localAssets (2026-10-12): the token and network logos ship inside the extension (the data package's assets/blockchains, copied by vite.config.ts), so those paths are read from its own files.
// 2026-10-11 (docs/nodeSourceMigrationPlan.txt row 25, owner: "I do not want any dependency on the web app"): the extension answers from its own bundle and never asks the hosted app: a bundled path is served without any request, anything else fails at once.
setFeedNetworkPolicy({ bundledFirst: true, hostedAllowed: false, localAssets: true });

// 2026-10-11 (plan row 13): the engine's list builder (the shared pickers) keeps its own bundled-feed registry: the role account lists and the per-chain token lists, taken from the same snapshot.
const data = snapshot as Record<string, unknown>;
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
    recipients: listOf('/assets/accounts/accountRoles/recipients.json'),
    agents: listOf('/assets/accounts/accountRoles/agents.json'),
    sponsors: listOf('/assets/accounts/accountRoles/sponsors.json'),
  },
  tokenLists: Object.fromEntries([1, 8453, 137, 31337, 11155111].map((id) => [id, tokenListOf(id)])),
});

// The engine's network helpers (the context's network record: name, symbol, RPC) read the static network data a host registers: each chain's default settings from the bundle, and the chain list
// and configured networks from the feeds package's own registry.
const configured = listConfiguredNetworks({ showTestNets: true });
registerNetworkData({
  chainIdList: configured.map((n) => ({ chainId: n.chainId, name: n.name, symbol: n.symbol })),
  defaultSettings: Object.fromEntries(
    configured.map((n) => [n.chainId, data['/assets/blockchains/' + n.chainId + '/defaultNetworkSettings.json'] ?? {}]),
  ) as never,
  configuredNetworks: configured as unknown[],
});

// 2026-10-20 (docs/meritMigration.txt part 2, row 4): the token lists come from the SAME handler the web app serves at /api/spCoin/tokens (spcoin-feeds createTokensApi), run in this process with a store over the bundle. It decides which tokens a list holds, in what order (by address), and drops the ones with no record, so the receive list shows what the web's shows (before, the raw bundled list was used: an unnamed N/A token and the sample bad address appeared).
const bundledTokensStore = createBundledTokensStore(data, { supportedChainIds: () => configured.map((n) => n.chainId), diskChainId: (chainId) => resolveSpCoinDiskChainId(chainId) });
const bundledTokensApi = createTokensApi(bundledTokensStore);
registerLocalApi('/api/spCoin/tokens', { get: bundledTokensApi.list, post: bundledTokensApi.batch });

/** The bundled snapshot itself, for code that reads a file directly (the spCoin ABI and deployment map). */
export const bundledFeedData = snapshot as Record<string, unknown>;

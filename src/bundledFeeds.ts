// File: src/bundledFeeds.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table row 17, E5) -- registers the snapshot made by scripts/bundleFeeds.mjs with the feeds
// package, so the network info, token lists, role account lists and spCoin ABIs are still available when the hosted app cannot be reached
// (the feeds ask the network first; fresh data wins). Import this file once at startup, before any feed is read.
import { registerBundledFeeds, setFeedNetworkPolicy } from '@sponsorcoin/spcoin-feeds/shared';
import { registerBundledFeeds as registerEngineBundledFeeds, registerNetworkData } from '@sponsorcoin/spcoin-exchange-engine';
import { listConfiguredNetworks } from '@sponsorcoin/spcoin-feeds/networks';
import snapshot from './bundledFeedData.json';

registerBundledFeeds(snapshot as Record<string, unknown>);
// 2026-10-11 (docs/nodeSourceMigrationPlan.txt row 25, owner: "I do not want any dependency on the web app"): the extension answers from its own bundle and never asks the hosted app: a bundled path is served without any request, anything else fails at once.
setFeedNetworkPolicy({ bundledFirst: true, hostedAllowed: false });

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

/** The bundled snapshot itself, for code that reads a file directly (the spCoin ABI and deployment map). */
export const bundledFeedData = snapshot as Record<string, unknown>;

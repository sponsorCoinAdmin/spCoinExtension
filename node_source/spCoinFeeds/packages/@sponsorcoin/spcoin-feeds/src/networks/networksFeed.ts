import type { NetworkRecord, NetworkListRowData } from './types';

const MERIT_WALLET_HARDHAT_CHAIN_ID = 31337;

/**
 * Mirrors lib/network/initialize/networks.json exactly (confirmed by direct
 * read, 2026-09-16) — the app's own real, static chain config, not fetched
 * (no dedicated network-list API route exists; the app itself bundles this
 * as a JSON import). isTestnet mirrors lib/utils/network/chains.ts's
 * TESTNET_CHAIN_IDS; defaultAuthSource mirrors components/wallet/lib/
 * meritConnect/authSource.ts's defaultAuthSourceForChain. No write function
 * exists alongside this: which network is "active" is a wagmi/wallet-
 * connector concern, and which auth source is currently selected per chain
 * is a live, per-user localStorage override (useNetworkAuthSource) — both
 * out of this static feed's scope, not silently dropped.
 */
const CONFIGURED_NETWORKS: NetworkRecord[] = [
  {
    chainId: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    logoURL: '/assets/blockchains/1/info/network.png',
    isTestnet: false,
    defaultAuthSource: 'metamask',
  },
  {
    chainId: 8453,
    name: 'Base',
    symbol: 'ETH',
    logoURL: '/assets/blockchains/8453/info/network.png',
    isTestnet: false,
    defaultAuthSource: 'metamask',
  },
  {
    chainId: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    logoURL: '/assets/blockchains/137/info/network.png',
    isTestnet: false,
    defaultAuthSource: 'metamask',
  },
  {
    chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
    name: 'HardHat',
    symbol: 'HH_BASE',
    // 2026-09-16, corrected after a live report (extension's Select
    // Network row for 31337 showed Base's blue circle icon, not a distinct
    // Hardhat one) — the doc comment this replaced had it backwards. The
    // real app's own static config, lib/network/initialize/networks.json,
    // gives Hardhat its OWN dedicated logo path
    // (/assets/blockchains/31337/logo.png, confirmed present on disk) —
    // resolveDiskAssetChainId's Base-fork mapping is real and correct for
    // token/account assets (contracts, avatars — those genuinely only
    // exist under 31337's disk folder via the Base alias), but the network
    // logo itself is the one asset kind that was never actually resolved
    // that way; it has always had its own file.
    logoURL: `/assets/blockchains/${MERIT_WALLET_HARDHAT_CHAIN_ID}/logo.png`,
    isTestnet: true,
    defaultAuthSource: 'merit',
  },
  {
    chainId: 11155111,
    name: 'Sepolia',
    symbol: 'ETH',
    logoURL: '/assets/blockchains/11155111/info/network.png',
    isTestnet: true,
    defaultAuthSource: 'metamask',
  },
];

export interface ListConfiguredNetworksOptions {
  showTestNets?: boolean;
}

/**
 * Real app ordering (components/wallet/lib/networks.tsx): the active
 * network always sorts first regardless of section, then remaining
 * mainnets, then testnets (only when showTestNets). Callers that don't
 * pass activeChainId get the plain mainnets-then-testnets order.
 */
export function listConfiguredNetworks(
  options?: ListConfiguredNetworksOptions,
  activeChainId?: number,
): NetworkRecord[] {
  const showTestNets = options?.showTestNets ?? true;
  const visible = CONFIGURED_NETWORKS.filter((n) => showTestNets || !n.isTestnet);

  if (activeChainId === undefined) return visible.slice();

  const active = visible.filter((n) => n.chainId === activeChainId);
  const rest = visible.filter((n) => n.chainId !== activeChainId);
  return [...active, ...rest];
}

/** Plain mapper → NetworkListTable's row shape. */
export function toNetworkListEntries(
  records: NetworkRecord[],
  activeChainId?: number,
): NetworkListRowData[] {
  return records.map((record) => ({
    id: String(record.chainId),
    symbol: record.symbol,
    name: record.name,
    isActive: record.chainId === activeChainId,
    authSource: record.defaultAuthSource,
  }));
}

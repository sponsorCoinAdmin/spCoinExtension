export interface NetworksFeedConfig {
  /** Included for parity with the other two domains' config shape, even
   *  though listConfiguredNetworks() itself makes no network request today
   *  (see that function's own doc comment for why). */
  baseUrl?: string;
}

export type NetworkAuthSource = 'merit' | 'metamask';

/**
 * Mirrors the real chain config lib/network/initialize/networks.json ships
 * (confirmed by direct read, 2026-09-16) plus the two derived fields the
 * real app's Networks screen (components/wallet/lib/networks.tsx) actually
 * renders per row: isTestnet (lib/utils/network/chains.ts's
 * TESTNET_CHAIN_IDS — Sepolia + Hardhat are testnets, Ethereum/Base/Polygon
 * are not) and defaultAuthSource (components/wallet/lib/meritConnect/
 * authSource.ts's defaultAuthSourceForChain — only Hardhat (31337) defaults
 * to 'merit', every other chain defaults to 'metamask'; this is the
 * hardcoded default only, not a live per-user override — the real app
 * layers a localStorage override on top via useNetworkAuthSource, which is
 * session/UI state, not something this feed reproduces).
 */
export interface NetworkRecord {
  chainId: number;
  name: string;
  symbol: string;
  /** Real logo path from networks.json, e.g. '/assets/blockchains/1/info/network.png'. */
  logoURL: string;
  isTestnet: boolean;
  defaultAuthSource: NetworkAuthSource;
}

/** Plain data shape for one NetworkListTable row — includes authSource
 *  (real domain data, unlike onSelect/onIconContextMenu/onAuthSourceChange,
 *  which stay the UI layer's job to attach) but omits icon, since
 *  spcoin-panels' NetworkListRowProps takes icon as a React.ReactNode
 *  (rendered element), not a URL — the caller turns logoURL into that
 *  element. */
export interface NetworkListRowData {
  id: string;
  symbol?: string;
  name?: string;
  isActive?: boolean;
  authSource: NetworkAuthSource;
}

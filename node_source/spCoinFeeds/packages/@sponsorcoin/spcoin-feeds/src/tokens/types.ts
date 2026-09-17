import type { FetchJsonConfig } from '../shared/fetchJson';

export type TokensFeedConfig = FetchJsonConfig;

/** One token link, e.g. { name: 'x', url: 'https://x.com/...' } —
 *  matches info.json's real shape (confirmed by direct read). */
export interface TokenLink {
  name: string;
  url: string;
}

/**
 * The hydrated shape GET/POST /api/spCoin/tokens returns per token —
 * `info.json`'s real fields (confirmed by direct read of a live file)
 * plus the address/chainId/logoURL the route computes and merges in.
 */
export interface TokenRecord {
  chainId: number;
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  website?: string;
  description?: string;
  explorer?: string;
  links?: TokenLink[];
  logoURL?: string;
}

export interface FetchTokenListOptions {
  /** Omit for a single chain via chainId; true fetches every configured
   *  chain (SUPPORTED_NETWORK_CHAIN_IDS server-side). */
  allNetworks?: boolean;
  page?: number;
  pageSize?: number;
}

export interface TokenListPage {
  items: TokenRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface TokenBatchRequest {
  chainId: number;
  address: string;
}

export interface TokenBatchResult {
  items: TokenRecord[];
  countRequested: number;
  countFound: number;
  missing: TokenBatchRequest[];
}

/** Plain data shape for one AssetListTable row — deliberately omits
 *  onSelect/onInfoClick/icon/badge (spcoin-panels' AssetListRowProps
 *  fields), same UI-callback boundary the accounts feed draws.
 *  `logoURL` is the one exception, same reasoning as accounts' own
 *  `avatarURL`/networks' `logoURL`: a real, already-resolved value (here,
 *  straight from TokenRecord.logoURL, computed server-side — not a path
 *  convention this package has to construct itself), not a UI callback.
 *  Optional because not every token has one server-side (unlike accounts/
 *  networks, where the convention path is always computable). */
export interface TokenListRowData {
  id: string;
  symbol?: string;
  name?: string;
  address?: string;
  logoURL?: string;
}

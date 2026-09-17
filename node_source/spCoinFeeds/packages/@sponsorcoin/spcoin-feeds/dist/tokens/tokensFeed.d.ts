import type { TokensFeedConfig, TokenRecord, FetchTokenListOptions, TokenListPage, TokenBatchRequest, TokenBatchResult, TokenListRowData } from './types';
/**
 * Computed the exact same way the real web app's own client-side
 * TokenLogo.tsx/getTokenLogoURL resolves a token's icon — a real, on-disk
 * path convention (/assets/blockchains/{mappedChainId}/contracts/
 * {0X<ADDRESS>}/logo.png), independent of whether /api/spCoin/tokens has a
 * hydrated record for this address at all.
 *
 * 2026-09-16, on live report ("not all images are displayed" in the token
 * list) — root cause: TokenRecord.logoURL (used by toAssetListEntries
 * above) only comes back for addresses the backend's own token DB happens
 * to have metadata for. WETH's real mainnet address had no such record
 * even though its real logo.png genuinely exists on disk at this exact
 * computed path — ETH/SPCOIN_V0 (which DO have DB records with a
 * logoURL) got their icons, WETH silently didn't. The real app's own
 * TokenLogo.tsx never depends on a DB record for the icon specifically —
 * it computes this same path directly from address+chainId. This function
 * lets a consumer do the same instead of only trying record.logoURL.
 */
export declare function getTokenLogoURL(chainId: number, address: string): string;
/**
 * GET /api/spCoin/tokens?chainId=&allData=true&page=&pageSize= (or
 * allNetworks=true instead of chainId) — always requests allData=true so
 * every returned row is a real hydrated TokenRecord, not just an address.
 */
export declare function fetchTokenList(chainId: number | undefined, options?: FetchTokenListOptions, config?: TokensFeedConfig): Promise<TokenListPage>;
/**
 * GET /api/spCoin/tokens?chainId=&address= — resolves to null on a 404
 * (token not registered for this chain), matching fetchAccountMetadata's
 * same not-found convention.
 */
export declare function fetchTokenByAddress(chainId: number, address: string, config?: TokensFeedConfig): Promise<TokenRecord | null>;
/** POST /api/spCoin/tokens with { requests: [{chainId,address}] } */
export declare function fetchTokensBatch(requests: TokenBatchRequest[], config?: TokensFeedConfig): Promise<TokenBatchResult>;
/**
 * Plain mapper → AssetListTable's row shape. No write function exists in
 * this domain to wrap — no endpoint for "add/remove a token" was found
 * during research; this is an explicit gap, not an oversight.
 */
export declare function toAssetListEntries(records: TokenRecord[]): TokenListRowData[];

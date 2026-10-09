import { type AccountListGroupData } from '@sponsorcoin/spcoin-feeds/accounts';
import { type IconCacheStorage } from '@sponsorcoin/spcoin-feeds/shared';
import type { NetworkAuthSource } from '@sponsorcoin/spcoin-panels';
import type { AssetListEntry } from '@sponsorcoin/spcoin-panels';
/** Plain data shape for one NETWORK_LIST row — a consumer with a real feed
 *  (e.g. @sponsorcoin/spcoin-feeds/networks' toNetworkListEntries) passes
 *  these via the networkRows prop below instead of this component's own
 *  SAMPLE_NETWORK_ROWS. defaultAuthSource seeds this row's Merit/MetaMask
 *  toggle before the user ever touches it — omit to fall back to 'merit',
 *  matching this component's own prior (now-corrected) hardcoded default. */
export interface MeritWalletNetworkRow {
    id: string;
    symbol?: string;
    name?: string;
    isActive?: boolean;
    defaultAuthSource?: NetworkAuthSource;
    /** Drives the Show Test Nets filter below when networkRows is supplied —
     *  replaces this component's own prior hardcoded `row.id !== 'hardhat'`
     *  check, which only worked for SAMPLE_NETWORK_ROWS' own made-up ids. */
    isTestnet?: boolean;
    /** Full, already-resolved icon URL (e.g. spcoin-feeds/networks'
     *  NetworkRecord.logoURL prefixed with whatever origin the caller is
     *  pointed at) — a plain string, not a React.ReactNode, matching this
     *  component's own titleBadgeSrc/closeIconSrc/infoIconSrc convention.
     *  This component turns it into the actual <img> element below; the
     *  caller's job is only to resolve a URL that will actually load from
     *  wherever this component is rendered (same reasoning as those other
     *  three props' own doc comments). */
    iconSrc?: string;
}
/**
 * One real set of icon caches, built from whatever storage the caller
 * supplies (defaults to a safe in-memory-only fallback). Callers of the
 * functions below should build exactly one of these per component instance
 * (not per call) so repeat fetches actually hit the cache.
 */
export declare function createMeritWalletIconCaches(storage?: IconCacheStorage): {
    getCachedNetworkIconDataUrl: (url: string, baseUrl: string, forceRefresh?: boolean) => Promise<string | undefined>;
    getCachedAccountIconDataUrl: (url: string, baseUrl: string, forceRefresh?: boolean) => Promise<string | undefined>;
    getCachedTokenIconDataUrl: (url: string, baseUrl: string, forceRefresh?: boolean) => Promise<string | undefined>;
};
export type MeritWalletIconCaches = ReturnType<typeof createMeritWalletIconCaches>;
export declare function buildNetworkRows(chainId: number, baseUrl: string, caches: MeritWalletIconCaches, forceRefresh?: boolean): Promise<MeritWalletNetworkRow[]>;
export declare function fetchAccountGroups(chainId: number, baseUrl: string, caches: MeritWalletIconCaches, forceRefresh?: boolean): Promise<AccountListGroupData[] | undefined>;
export declare function buildRecipientRows(chainId: number, baseUrl: string, caches: MeritWalletIconCaches, forceRefresh?: boolean): Promise<AssetListEntry[] | undefined>;
export declare function buildAllAccountRows(baseUrl: string, caches: MeritWalletIconCaches, forceRefresh?: boolean): Promise<AssetListEntry[] | undefined>;
export declare function buildTokenRows(chainId: number, baseUrl: string, caches: MeritWalletIconCaches, forceRefresh?: boolean): Promise<AssetListEntry[] | undefined>;

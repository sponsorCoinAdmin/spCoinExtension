import React from 'react';
import type { MeritWalletIconCaches } from '../panels/meritWalletDataFetch';
import { type RefreshNode, type RefreshNodeSpec, type RefreshTree } from './refreshTree';
export declare const RefreshNodeContext: React.Context<RefreshNode | undefined>;
/** Make a node under the nearest branch (or the tree's root) for as long as the component is mounted. Returns the node, so a branch can hand it down. */
export declare function useRefreshNode(id: string, spec: RefreshNodeSpec): RefreshNode | undefined;
/** A panel (or any group): its own callbacks, and everything rendered inside is a child of it in the refresh tree. */
export declare function RefreshBranch({ id, children, ...spec }: RefreshNodeSpec & {
    id: string;
    children: React.ReactNode;
}): React.JSX.Element;
/** The wallet's image cache (the one MeritWallet's lists read: sections by kind) and the origin its relative image paths are read from. MeritWallet provides it. */
export declare const ImageCacheContext: React.Context<{
    caches: MeritWalletIconCaches;
    baseUrl: string;
} | undefined>;
export type CachedImageKind = 'account' | 'token' | 'network' | 'wallet';
/**
 * An image the wallet's image cache owns (2026-11-09, owner: "it is supposed to be a cache recall"). It is shown the way the lists show their icons: read through the cache (the stored copy when there is one, fetched and stored when not),
 * and read again when the cache announces a change to it. It is a node of the refresh tree: step 1 of a refresh forces the entry to be fetched again and stored (once per image, however many nodes show it).
 * Until the cache answers, and for data/blob URLs or an image with no kind, the URL itself is shown.
 */
export declare function useCachedImage(src: string, kind: CachedImageKind | undefined): string;
/** MeritWallet's: make the tree available to everything inside, and refresh it each time the host's refresh token changes (not on the first render). */
export declare function RefreshTreeProvider({ tree, refreshToken, onDone, children }: {
    tree: RefreshTree;
    refreshToken: number; /** The tree has finished the refresh for this token (the Refresh button is enabled again). */
    onDone?: (refreshToken: number) => void;
    children: React.ReactNode;
}): React.JSX.Element;

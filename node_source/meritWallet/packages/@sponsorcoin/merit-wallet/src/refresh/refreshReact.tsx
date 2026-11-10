// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/refresh/refreshReact.tsx
//
// 2026-11-09 (owner design): refreshTree.ts bound to components. MeritWallet owns the tree and refreshes it when the host's Refresh finishes (refreshToken changes). A component that shows loaded data joins the tree:
//   <RefreshBranch id="NETWORK_PANEL"> ... </RefreshBranch>   a panel: everything inside it is a child of this node
//   useRefreshNode('table', { refreshPanelCache, updatePanelMethodCalls })   a leaf: this component's own data
//   useCachedImage(src, kind)                                an image from the wallet's image cache: read through it, and fetched again into it on every refresh
// A component outside a MeritWallet (a test, a storybook) gets no tree and these do nothing.
'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { engineTrace } from '@sponsorcoin/spcoin-exchange-engine';
import { usePlatform } from '../platform/platform';
import type { MeritWalletIconCaches } from '../panels/meritWalletDataFetch';
import { attachRefreshNode, createRefreshNode, type RefreshNode, type RefreshNodeSpec, type RefreshTree } from './refreshTree';

export const RefreshNodeContext = createContext<RefreshNode | undefined>(undefined);

/** Make a node under the nearest branch (or the tree's root) for as long as the component is mounted. Returns the node, so a branch can hand it down. */
export function useRefreshNode(id: string, spec: RefreshNodeSpec): RefreshNode | undefined {
  const parent = useContext(RefreshNodeContext);
  const nodeRef = useRef<RefreshNode | undefined>(undefined);
  if (parent && (!nodeRef.current || nodeRef.current.parent !== parent || nodeRef.current.id !== id)) nodeRef.current = createRefreshNode(parent, id, spec);
  if (nodeRef.current) nodeRef.current.spec = spec;
  const node = nodeRef.current;
  useEffect(() => (node ? attachRefreshNode(node) : undefined), [node]);
  return node;
}

/** A panel (or any group): its own callbacks, and everything rendered inside is a child of it in the refresh tree. */
export function RefreshBranch({ id, children, ...spec }: RefreshNodeSpec & { id: string; children: React.ReactNode }) {
  const outer = useContext(RefreshNodeContext);
  const node = useRefreshNode(id, spec);
  return <RefreshNodeContext.Provider value={node ?? outer}>{children}</RefreshNodeContext.Provider>;
}

/** The wallet's image cache (the one MeritWallet's lists read: sections by kind) and the origin its relative image paths are read from. MeritWallet provides it. */
export const ImageCacheContext = createContext<{ caches: MeritWalletIconCaches; baseUrl: string } | undefined>(undefined);

/** A short fingerprint of an image (its length and a checksum), so a trace can tell two versions of the same picture apart. */
const fingerprint = (url: string | undefined): string => {
  if (!url) return 'none';
  let h = 0;
  for (let i = 0; i < url.length; i += 17) h = (h * 31 + url.charCodeAt(i)) | 0;
  return `${url.length}:${(h >>> 0).toString(16)}`;
};

export type CachedImageKind = 'account' | 'token' | 'network' | 'wallet';
const SECTION: Record<CachedImageKind, 'getCachedAccountIconDataUrl' | 'getCachedTokenIconDataUrl' | 'getCachedNetworkIconDataUrl' | 'getCachedWalletIconDataUrl'> = {
  account: 'getCachedAccountIconDataUrl',
  token: 'getCachedTokenIconDataUrl',
  network: 'getCachedNetworkIconDataUrl',
  wallet: 'getCachedWalletIconDataUrl',
};

/**
 * An image the wallet's image cache owns (2026-11-09, owner: "it is supposed to be a cache recall"). It is shown the way the lists show their icons: read through the cache (the stored copy when there is one, fetched and stored when not),
 * and read again when the cache announces a change to it. It is a node of the refresh tree: step 1 of a refresh forces the entry to be fetched again and stored (once per image, however many nodes show it).
 * Until the cache answers, and for data/blob URLs or an image with no kind, the URL itself is shown.
 */
export function useCachedImage(src: string, kind: CachedImageKind | undefined): string {
  const cache = useContext(ImageCacheContext);
  const platform = usePlatform();
  const section = cache && kind && src && !/^(data|blob):/i.test(src) ? cache.caches[SECTION[kind]] : undefined;
  const baseUrl = cache?.baseUrl ?? '';
  const [shown, setShown] = useState<{ src: string; url: string } | undefined>(undefined);
  useEffect(() => {
    if (!section) return;
    let cancelled = false;
    const read = () => void section(src, baseUrl, false).then((url) => {
      engineTrace('cachedImage: read through the cache', { kind, src, image: fingerprint(url) });
      if (!cancelled && url) setShown({ src, url });
    });
    read();
    const off = platform.onImageCacheUpdated?.(read);
    return () => {
      cancelled = true;
      off?.();
    };
  }, [section, src, baseUrl, platform]);
  useRefreshNode(`image:${kind ?? ''}:${src}`, {
    refreshPanelCache: async (ctx) => {
      if (!section) return;
      const url = await ctx.once(`image:${kind}:${src}`, () => section(src, baseUrl, true));
      engineTrace('cachedImage: refreshed into the cache', { kind, src, image: fingerprint(url) });
      if (url) setShown({ src, url });
    },
  });
  return shown && shown.src === src ? shown.url : src;
}

/** MeritWallet's: make the tree available to everything inside, and refresh it each time the host's refresh token changes (not on the first render). */
export function RefreshTreeProvider({ tree, refreshToken, onDone, children }: { tree: RefreshTree; refreshToken: number; /** The tree has finished the refresh for this token (the Refresh button is enabled again). */ onDone?: (refreshToken: number) => void; children: React.ReactNode }) {
  const seen = useRef(refreshToken);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    if (seen.current === refreshToken) return;
    seen.current = refreshToken;
    void tree.refresh().finally(() => onDoneRef.current?.(refreshToken));
  }, [tree, refreshToken]);
  return <RefreshNodeContext.Provider value={tree.root}>{children}</RefreshNodeContext.Provider>;
}

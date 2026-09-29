// File: src/hydrateActiveAccount.ts
//
// 2026-09-18, Phase B.2 Stage 3 (see the web app repo's approved plan at
// .claude/plans/warm-questing-cookie.md) — real account IDENTITY hydration
// (name/symbol/website/description/email/logoURL) for
// ExchangeContext.apiCoreSyncedMembers.accounts.activeAccount, which
// LiteExchangeProvider's Stage 2.c wallet-source-change effect currently
// only ever sets to an empty-fields fallback (makeMinimalAccountFallback).
//
// Deliberately extension-local, not an engine-package addition — unlike
// storage/write/wallet-source extensions (which mirror a real shape the
// web app's own ExchangeProviderInner already has), there's no equivalent
// injection point to parallel here: the web app hydrates identity through
// its own, much larger accountHydration.ts pipeline (registry + IndexedDB
// cache + event emitter, every fetch hardcoded to a relative URL). This
// file reuses @sponsorcoin/spcoin-feeds's accountsFeed.ts instead — an
// already-built, already-proven-live, base-URL-parameterized version of
// the same capability (sidepanel.ts's own handleAccountIconClick and
// fetchAccountListGroups already call exactly these functions with the
// extension's real baseUrl today).
//
// Real finding from this stage's research, not assumed: no CORS work was
// needed for any of this. spCoinExtension/manifest.json already declares
// host_permissions covering the web app's origin — a Chrome extension
// page fetching a host covered by its own host_permissions bypasses the
// browser's CORS enforcement entirely, independent of the server's
// response headers (a different mechanism from the isSameOriginRequest()
// app-level checks Stage 2.b had to work around for unlock/reveal/sign —
// those are real and unaffected by host_permissions, but the account
// hydration routes/static files have no such check at all).

import { useEffect, useRef } from 'react';
import { useExchangeContext } from '@sponsorcoin/spcoin-exchange-engine';
import { fetchAccountMetadata, getAccountAvatarURL } from '@sponsorcoin/spcoin-feeds/accounts';

export function ActiveAccountHydrator({ baseUrl }: { baseUrl: string }) {
  const { exchangeContext, setExchangeContext } = useExchangeContext();
  const activeAddress = exchangeContext.apiCoreSyncedMembers.accounts.activeAccount?.address;

  // Same "only react to a genuine change, once per address" guard shape as
  // LiteExchangeProvider's own bootWalletAddressRef (liteProvider.tsx) —
  // without it, this effect's own setExchangeContext write would change
  // activeAccount and re-trigger itself.
  const hydratedAddressRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!activeAddress) return;
    if (hydratedAddressRef.current === activeAddress) return;
    hydratedAddressRef.current = activeAddress;

    (async () => {
      const metadata = await fetchAccountMetadata(activeAddress, { baseUrl }).catch(() => null);
      const logoURL = `${baseUrl}${getAccountAvatarURL(activeAddress)}`;

      setExchangeContext((prev) => {
        const current = prev.apiCoreSyncedMembers.accounts.activeAccount;
        // The active account may have changed again (or disconnected)
        // while this fetch was in flight — only apply a stale fetch's
        // result to the account it was actually fetched for.
        if (!current || current.address !== activeAddress) return prev;

        return {
          ...prev,
          apiCoreSyncedMembers: {
            ...prev.apiCoreSyncedMembers,
            accounts: {
              ...prev.apiCoreSyncedMembers.accounts,
              activeAccount: {
                ...current,
                name: metadata?.name ?? current.name,
                symbol: metadata?.symbol ?? current.symbol,
                website: metadata?.website ?? current.website,
                description: metadata?.description ?? current.description,
                email: metadata?.email ?? current.email,
                logoURL,
              },
            },
          },
        };
      }, 'hydrateActiveAccount');
    })();
  }, [activeAddress, baseUrl, setExchangeContext]);

  return null;
}

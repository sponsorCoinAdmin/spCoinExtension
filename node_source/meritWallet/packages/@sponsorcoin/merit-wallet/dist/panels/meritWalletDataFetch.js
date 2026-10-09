// File: meritWalletDataFetch.ts
// 2026-09-29 — portable real-data fetching for MeritWallet's own self-fetch
// (see MeritWallet.tsx's own doc comment). Generalized from
// spCoinExtension/sidepanel.ts's buildNetworkRows/fetchAccountGroups/
// buildRecipientRows/buildTokenRows (real, already-proven logic — a
// relocation, not a rewrite) with two seams added so any host can use it,
// not just that one extension:
//   - chainId is a real parameter now, not a hardcoded Hardhat constant.
//   - icon caching goes through an injected IconCacheStorage (spcoin-feeds/
//     shared) instead of a hardcoded chrome.storage.local call — this file
//     builds its own cache instances from whatever storage it's given,
//     defaulting to createInMemoryIconCacheStorage() (safe, zero-config).
//
// sidepanel.ts's OTHER ~16 chain-id/lock-status/unlock-token concerns
// (fetchKeystoreLockStatus, unlockMeritWalletAccount, sign/stake/claim/swap)
// are that extension's own transaction-execution/keystore code, a separate
// concern — not ported here. This file only builds the read-only list rows
// MeritWalletProps' own networkRows/accountGroups/tokenRows/recipientRows
// already accept.
import { listConfiguredNetworks, fetchNetworkIconBlob, } from '@sponsorcoin/spcoin-feeds/networks';
import { fetchAccountListGroups, fetchAccountRoleList, fetchAccountAvatarBlob, getAccountAvatarURL, } from '@sponsorcoin/spcoin-feeds/accounts';
import { fetchTokenList, getTokenLogoURL, fetchTokenIconBlob, } from '@sponsorcoin/spcoin-feeds/tokens';
import { createIconCache, createInMemoryIconCacheStorage, FeedFetchError, reportFeedError, } from '@sponsorcoin/spcoin-feeds/shared';
const TOKEN_LIST_PAGE_SIZE = 200;
/**
 * One real set of icon caches, built from whatever storage the caller
 * supplies (defaults to a safe in-memory-only fallback). Callers of the
 * functions below should build exactly one of these per component instance
 * (not per call) so repeat fetches actually hit the cache.
 */
export function createMeritWalletIconCaches(storage = createInMemoryIconCacheStorage()) {
    return {
        getCachedNetworkIconDataUrl: createIconCache('spcoin_network_icon_cache', fetchNetworkIconBlob, 'network', storage),
        getCachedAccountIconDataUrl: createIconCache('spcoin_account_icon_cache', fetchAccountAvatarBlob, 'account', storage),
        getCachedTokenIconDataUrl: createIconCache('spcoin_token_icon_cache', fetchTokenIconBlob, 'token', storage),
    };
}
// Icons fetched in parallel, same baseUrl every other real fetch here goes
// through. A row whose icon fetch fails just renders with no icon
// (getCachedIconDataUrl never throws) rather than breaking the whole list.
export async function buildNetworkRows(chainId, baseUrl, caches, forceRefresh = false) {
    const networks = listConfiguredNetworks({ showTestNets: true });
    const iconUrls = await Promise.all(networks.map((network) => caches.getCachedNetworkIconDataUrl(network.logoURL, baseUrl, forceRefresh)));
    return networks.map((network, i) => ({
        id: String(network.chainId),
        symbol: network.symbol,
        name: network.name,
        isActive: network.chainId === chainId,
        defaultAuthSource: network.defaultAuthSource,
        isTestnet: network.isTestnet,
        iconSrc: iconUrls[i],
    }));
}
// fetchAccountListGroups doesn't know which account is "active" (a
// wallet-session concern, not this keystore-read's job) — no account is marked active here. The host passes
// the real selection (MeritWallet's activeAccountAddress); until one is chosen the header reads "Select Account".
export async function fetchAccountGroups(chainId, baseUrl, caches, forceRefresh = false) {
    try {
        const groups = await fetchAccountListGroups(chainId, { baseUrl });
        const flatAccounts = groups.flatMap((group) => group.accounts);
        const iconUrls = await Promise.all(flatAccounts.map((account) => caches.getCachedAccountIconDataUrl(account.avatarURL, baseUrl, forceRefresh)));
        let cursor = 0;
        return groups.map((group) => ({
            ...group,
            accounts: group.accounts.map((account) => ({
                ...account,
                iconSrc: iconUrls[cursor++],
            })),
        }));
    }
    catch (error) {
        // undefined (not []) so MeritWallet's own `accountGroups ??
        // SAMPLE_ACCOUNT_GROUPS` fallback actually kicks in, rather than
        // rendering a real-but-empty account list.
        //
        // 2026-10-01 — a 404 here is NOT a fault. GET testAccounts answers 404
        // (deliberately) when no keystore file is configured for the requested
        // network — the normal state for any chain that isn't the local Hardhat
        // one, e.g. chainId 1 on a fresh boot. The fallback below is the
        // designed handling for exactly that, so it stays; only the log level
        // changes. Previously every mainnet/network-switch console.error'd a
        // FeedFetchError for a state the app was already handling correctly,
        // which buried real failures in noise. A genuine 5xx/network error is
        // still logged, and is the case worth being loud about.
        if (error instanceof FeedFetchError && error.status === 404) {
            return undefined;
        }
        reportFeedError('account list (falling back to sample data)', error);
        return undefined;
    }
}
// Shared "resolve icons in parallel, then map row+iconSrc to an
// AssetListEntry" tail for buildRecipientRows/buildTokenRows below.
async function withAssetIcons(rows, baseUrl, forceRefresh, getIconUrl, getCachedIconDataUrl, toEntry) {
    const iconUrls = await Promise.all(rows.map((row) => getCachedIconDataUrl(getIconUrl(row), baseUrl, forceRefresh)));
    return rows.map((row, i) => toEntry(row, iconUrls[i]));
}
// The real, chain-scoped recipient directory (e.g. real sponsor-selected
// causes) — NOT the wallet's own accounts (fetchAccountGroups above); see
// spcoin-feeds/accounts' fetchAccountRoleList doc comment for the full
// reasoning behind that distinction.
export async function buildRecipientRows(chainId, baseUrl, caches, forceRefresh = false) {
    try {
        const rows = await fetchAccountRoleList('recipients', chainId, { baseUrl });
        return await withAssetIcons(rows, baseUrl, forceRefresh, (row) => row.avatarURL, caches.getCachedAccountIconDataUrl, (row, iconSrc) => ({ id: row.id, symbol: row.symbol, name: row.name, address: row.address, iconSrc }));
    }
    catch (error) {
        // Same "undefined, not a real-but-empty array" fallback reasoning as
        // fetchAccountGroups above — lets MeritWallet's own `recipientRows ??
        // flatAccountRows` fallback kick in instead of rendering a genuinely
        // empty recipient list.
        reportFeedError('recipient list (falling back to wallet accounts)', error);
        return undefined;
    }
}
// 2026-10-03 — the "browse all known accounts" directory the web app's Send
// recipient picker opens (FEED_TYPE.REMOTE_ACCOUNT_SEND_LIST, backed by
// /api/spCoin/accounts — see components/views/RadioOverlayPanels/
// SendRecipientPanel.tsx and ActiveListPanel.tsx). This package fed Send's
// recipient list from the chain's recipient directory instead (buildRecipientRows
// above), so the two apps showed different lists for the same picker: the web
// listed every account folder, the extension only that chain's recipients.
// Sponsor's recipient picker stays on buildRecipientRows — the web app uses
// REMOTE_RECIPIENT_ACCOUNTS there. First page only (200 = the route's max),
// same as the web's own first request.
export async function buildAllAccountRows(baseUrl, caches, forceRefresh = false) {
    try {
        const url = `${baseUrl}/api/spCoin/accounts?allData=true&page=1&pageSize=200`;
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok)
            throw new FeedFetchError(`/api/spCoin/accounts failed with ${response.status}.`, response.status, url);
        const json = (await response.json());
        const rows = (json.items ?? []).filter((item) => typeof item.address === 'string');
        return await withAssetIcons(rows, baseUrl, forceRefresh, (row) => getAccountAvatarURL(row.address), caches.getCachedAccountIconDataUrl, (row, iconSrc) => ({
            id: row.address,
            symbol: row.data?.symbol,
            name: row.data?.name,
            address: row.address,
            iconSrc,
        }));
    }
    catch (error) {
        // undefined (not []) so the caller's recipient-feed fallback still applies.
        reportFeedError('all-accounts list (falling back to recipient list)', error);
        return undefined;
    }
}
// Icon does NOT depend on the token record's own `logoURL` — getTokenLogoURL
// computes the same on-disk path convention a real web app's TokenLogo.tsx
// would use, independent of DB registration, so a token with no DB record
// still gets a real attempt at its real icon.
export async function buildTokenRows(chainId, baseUrl, caches, forceRefresh = false) {
    try {
        const { items } = await fetchTokenList(chainId, { pageSize: TOKEN_LIST_PAGE_SIZE }, { baseUrl });
        return await withAssetIcons(items, baseUrl, forceRefresh, (t) => getTokenLogoURL(chainId, t.address), caches.getCachedTokenIconDataUrl, (t, iconSrc) => ({ id: t.address, symbol: t.symbol, name: t.name, address: t.address, decimals: t.decimals, iconSrc }));
    }
    catch (error) {
        // Same "undefined, not a real-but-iconless array" fallback reasoning as
        // fetchAccountGroups above — lets MeritWallet's own `tokenRows ??
        // SAMPLE_TOKEN_ROWS` fallback kick in instead of rendering a real
        // lookup that partially failed.
        reportFeedError('token list (falling back to sample data)', error);
        return undefined;
    }
}

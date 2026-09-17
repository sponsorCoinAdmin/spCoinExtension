import React from 'react';
import { createRoot } from 'react-dom/client';
import { MeritWallet, type MenuTabKey, type MeritWalletNetworkRow, type AssetListEntry } from '@sponsorcoin/spcoin-panels';
import { listConfiguredNetworks } from '@sponsorcoin/spcoin-feeds/networks';
import {
  fetchAccountListGroups,
  fetchAccountMetadata,
  fetchAccountRoleList,
  getAccountAvatarURL,
  type AccountListGroupData,
} from '@sponsorcoin/spcoin-feeds/accounts';
import { fetchTokenList, fetchTokenByAddress, getTokenLogoURL } from '@sponsorcoin/spcoin-feeds/tokens';
import { openOrFocusApp } from './src/openApp';
import { readOpenTarget, writeOpenTarget, urlForOpenTarget, type OpenTarget } from './src/openTargetStorage';
import { readMeritWalletUiState, writeMeritWalletUiState } from './src/meritWalletUiStorage';
import { getCachedNetworkIconDataUrl } from './src/networkIconCache';
import { getCachedAccountIconDataUrl } from './src/accountIconCache';
import { getCachedTokenIconDataUrl } from './src/tokenIconCache';

// 2026-09-16 — real data, added on request ("network connect and
// activeAccount initialization"). Only Hardhat has any real keystore
// accounts today (testAccounts.json is Hardhat-only, see
// spcoin-feeds/accounts' own doc comment), so it's the only sensible
// "active" default until a real wallet-connection flow exists — not a
// placeholder value, but not a live-connection read either. Both fetches
// go through urlForOpenTarget(openTarget) — the SAME Local/Prod toggle the
// Open button already uses (openTargetStorage.ts) — so real data always
// comes from whichever app instance this side panel is actually pointed
// at, not a hardcoded origin.
const MERIT_WALLET_HARDHAT_CHAIN_ID = 31337;

// Icons fetched (and cached — see networkIconCache.ts) in parallel, same
// baseUrl every other real fetch in this file goes through. A row whose
// icon fetch fails just renders with no icon (getCachedNetworkIconDataUrl
// never throws) rather than breaking the whole list. forceRefresh bypasses
// the icon cache's TTL — wired to the header's own refresh button below.
async function buildNetworkRows(baseUrl: string, forceRefresh = false): Promise<MeritWalletNetworkRow[]> {
  const networks = listConfiguredNetworks({ showTestNets: true });
  const iconUrls = await Promise.all(
    networks.map((network) => getCachedNetworkIconDataUrl(network.logoURL, baseUrl, forceRefresh)),
  );

  const rows = networks.map((network, i) => ({
    id: String(network.chainId),
    symbol: network.symbol,
    name: network.name,
    isActive: network.chainId === MERIT_WALLET_HARDHAT_CHAIN_ID,
    defaultAuthSource: network.defaultAuthSource,
    isTestnet: network.isTestnet,
    iconSrc: iconUrls[i],
  }));
  // Temporary diagnostic, added 2026-09-16 — remove once icon loading is
  // confirmed working live (console showed no fetch error at all, which
  // contradicted the DOM rendering no icon; this settles which one lied).
  console.log(
    'buildNetworkRows iconSrc results:',
    rows.map((r) => ({ id: r.id, name: r.name, hasIcon: !!r.iconSrc, iconSrcPrefix: r.iconSrc?.slice(0, 30) })),
  );
  return rows;
}

// Icons fetched (and cached — see accountIconCache.ts) in parallel, same
// pattern as buildNetworkRows above. A row whose icon fetch fails just
// renders with no icon (getCachedAccountIconDataUrl never throws) rather
// than breaking the whole list.
async function fetchAccountGroups(
  baseUrl: string,
  forceRefresh = false,
): Promise<AccountListGroupData[] | undefined> {
  try {
    const groups = await fetchAccountListGroups(MERIT_WALLET_HARDHAT_CHAIN_ID, { baseUrl });
    const flatAccounts = groups.flatMap((group) => group.accounts);
    const iconUrls = await Promise.all(
      flatAccounts.map((account) => getCachedAccountIconDataUrl(account.avatarURL, baseUrl, forceRefresh)),
    );
    let cursor = 0;
    // fetchAccountListGroups doesn't know which account is "active" (that's
    // a wallet-session concern, not this keystore-read's job) — mark the
    // first real account active here, same "first is the sensible default"
    // treatment as the network list above, not a live selection yet.
    return groups.map((group, i) => ({
      ...group,
      accounts: group.accounts.map((account, j) => ({
        ...account,
        isActive: i === 0 && j === 0,
        iconSrc: iconUrls[cursor++],
      })),
    }));
  } catch (error) {
    // The configured app instance may not be reachable (wrong port, not
    // running, etc.) — undefined (not []) so MeritWallet's own `accountGroups
    // ?? SAMPLE_ACCOUNT_GROUPS` fallback actually kicks in, rather than
    // rendering a real-but-empty account list.
    console.error('Failed to load real account groups, falling back to sample data:', error);
    return undefined;
  }
}

// 2026-09-16, on live report ("I think the selection lists are different
// in the web site vs the extension") — Send/Sponsor's recipient picker was
// silently reusing the wallet's own accounts (fetchAccountGroups above,
// HH_BASE_1..19) as a placeholder; the real app reads a genuinely
// different, chain-scoped directory instead (real sponsor-selected causes
// like "FREE | Born Free USA") — see spcoin-feeds/accounts'
// fetchAccountRoleList doc comment for the full reasoning. Same icon-
// resolution shape as fetchAccountGroups above.
async function buildRecipientRows(baseUrl: string, forceRefresh = false): Promise<AssetListEntry[] | undefined> {
  try {
    const rows = await fetchAccountRoleList('recipients', MERIT_WALLET_HARDHAT_CHAIN_ID, { baseUrl });
    const iconUrls = await Promise.all(
      rows.map((row) => getCachedAccountIconDataUrl(row.avatarURL, baseUrl, forceRefresh)),
    );
    return rows.map((row, i) => ({
      id: row.id,
      symbol: row.symbol,
      name: row.name,
      address: row.address,
      iconSrc: iconUrls[i],
    }));
  } catch (error) {
    // Same "undefined, not a real-but-empty array" fallback reasoning as
    // fetchAccountGroups above — lets MeritWallet's own `recipientRows ??
    // flatAccountRows` fallback kick in instead of rendering a genuinely
    // empty recipient list.
    console.error('Failed to load real recipient rows, falling back to wallet accounts:', error);
    return undefined;
  }
}

// 2026-09-16 — switched from a 3-address hardcoded sample to the real,
// full per-chain token list (on report: "the web and extension lists are
// different for the same swap tokenSelectDropDown chevron selection" — the
// web app's own Select-a-Token screen, via fetchAndBuildDataList.ts's
// loadTokenPageRecords, calls this exact same `/api/spCoin/tokens?
// allData=true&chainId=&page=&pageSize=` endpoint; spcoin-feeds/tokens
// already exported `fetchTokenList` wrapping it, this file just wasn't
// calling it yet — fetchTokensBatch (address-lookup-shaped, kept the list
// capped at whichever 3 addresses were hardcoded here) was never the right
// function for "enumerate the token list" to begin with).
//
// Icon still does NOT depend on the token record's own `logoURL` (kept
// from the prior fix, still correct): getTokenLogoURL computes the SAME
// on-disk path convention the real web app's own client-side TokenLogo.tsx
// uses, independent of DB registration, so a token with no DB record still
// gets a real attempt at its real icon; getCachedTokenIconDataUrl's own
// try/catch still degrades gracefully to no icon for whichever address
// genuinely has no logo.png file at that path.
const TOKEN_LIST_PAGE_SIZE = 200;

async function buildTokenRows(baseUrl: string, forceRefresh = false): Promise<AssetListEntry[] | undefined> {
  try {
    const { items } = await fetchTokenList(
      MERIT_WALLET_HARDHAT_CHAIN_ID,
      { pageSize: TOKEN_LIST_PAGE_SIZE },
      { baseUrl },
    );
    const iconUrls = await Promise.all(
      items.map((t) =>
        getCachedTokenIconDataUrl(
          getTokenLogoURL(MERIT_WALLET_HARDHAT_CHAIN_ID, t.address),
          baseUrl,
          forceRefresh,
        ),
      ),
    );
    return items.map((t, i) => ({
      id: t.address,
      symbol: t.symbol,
      name: t.name,
      address: t.address,
      iconSrc: iconUrls[i],
    }));
  } catch (error) {
    // Same "undefined, not a real-but-iconless array" fallback reasoning
    // as fetchAccountGroups above — lets MeritWallet's own `tokenRows ??
    // SAMPLE_TOKEN_ROWS` fallback kick in instead of rendering a real
    // lookup that partially failed.
    console.error('Failed to load real token rows, falling back to sample data:', error);
    return undefined;
  }
}

// 2026-09-14 — simplified further, on direct request ("the extension
// should embed just MeritWallet.tsx"). Previously this file hand-assembled
// WalletHeader/WalletAccountHeader/PanelTitle/MenuTabHeaderBar/the 5 tab
// panels into MeritWallet's slots itself — that composition now lives
// inside MeritWallet.tsx (@sponsorcoin/spcoin-panels) itself, so this file
// just renders the one component. See that file's own doc comment for the
// full reasoning.

// 2026-09-10, on request (switch from a persistent window to a real
// Chrome side panel — see background.ts's own comment for the full
// reasoning). chrome.sidePanel.close() is the side-panel equivalent of
// window.close() (which doesn't apply here; a side panel isn't a
// separate window object) — confirmed against the official API
// reference. Requires Chrome 141+; caught rather than thrown on an older
// browser, since failing to auto-close silently is a far smaller problem
// than an uncaught rejection breaking the click handler entirely.
const closeSidePanel = () => {
  void chrome.sidePanel
    .close({ windowId: chrome.windows.WINDOW_ID_CURRENT })
    .catch((error) => console.error('Failed to close side panel:', error));
};

// 2026-09-14, on request ("the close X is fine in the web, but it has no
// purpose in the extension... replace that with [www.png]... onClick, do
// the exact same as the Open button") — originally pulled out of a
// separate bottom #open-app button's own click listener so both it and
// this handler shared one definition; that button itself was removed
// later the same day ("totally remove the Open Button" — redundant once
// this header icon did the exact same thing), so this is now the only
// caller.
const handleOpenApp = () => {
  void openOrFocusApp().then(() => closeSidePanel());
};

// titleBadgeSrc/wwwIconUrl: WalletHeader's own defaults point at the web
// app's `/assets/miscellaneous/...` — an absolute, page-relative path that
// only resolves against sponsorcoin.org's own origin. Inside the extension
// (chrome-extension://<id>/...) that 404s silently, showing as broken
// squares — exactly why these props exist (see WalletHeader.tsx's own doc
// comment). chrome.runtime.getURL turns each bundled icon into a real,
// resolvable extension URL.
const brandLogoUrl = chrome.runtime.getURL('assets/meritWallet.png');
const wwwIconUrl = chrome.runtime.getURL('assets/www.png');
// 2026-09-15 — same reasoning, for AssetListRow's own info.png (the
// "TOKEN META" list's per-row info button, MeritWallet's own infoIconSrc
// prop) — confirmed live via a real loaded-extension Playwright check
// before this fix existed: naturalWidth 0, a genuine 404, not a guess.
const infoIconUrl = chrome.runtime.getURL('assets/info.png');

// 2026-09-14, on request ("persist the merit wallet" / the Open button's
// Local-vs-Prod target) — a Chrome side panel's whole document, this
// script included, is torn down on close and rebuilt from scratch on the
// next open (unlike a persistent background page), so MeritWallet's own
// activeTab/menuOpen/openTarget state (all plain useState — see that
// file's own doc comments) would otherwise reset to its defaults every
// time. chrome.storage.local (openTargetStorage.ts / meritWalletUiStorage.ts)
// is this extension's own persistence, read once here before the first
// render and written back on every change the wallet reports.
async function renderWallet() {
  const walletRoot = document.getElementById('wallet-root');
  if (!walletRoot) return;
  const root = createRoot(walletRoot);

  const [openTarget, uiState] = await Promise.all([readOpenTarget(), readMeritWalletUiState()]);
  const baseUrl = urlForOpenTarget(openTarget);

  // refreshing/data live outside React (this file isn't a component) — each
  // change just re-runs this same render() against the same root, same
  // pattern React's own docs use for a plain-script root.
  let refreshing = false;
  let accountGroups: AccountListGroupData[] | undefined;
  let networkRows: MeritWalletNetworkRow[] = [];
  let tokenRows: AssetListEntry[] | undefined;
  let recipientRows: AssetListEntry[] | undefined;
  // 2026-09-16 — ACCOUNT_PANEL slice: which account's details are currently
  // being viewed (set the moment the avatar icon is clicked, independent
  // of whether the fetch below has resolved yet — see MeritWallet's own
  // accountDetail prop doc comment for why `address` gates trust here).
  let accountDetail:
    | {
        address: string;
        avatarSrc?: string;
        name?: string;
        symbol?: string;
        email?: string;
        website?: string;
        description?: string;
      }
    | null = null;
  // Same idea, for the token-list's own info icon (Select a Token) — see
  // MeritWallet's own tokenDetail prop doc comment.
  let tokenDetail:
    | {
        address: string;
        logoSrc?: string;
        name?: string;
        symbol?: string;
        decimals?: number;
        website?: string;
        explorer?: string;
        description?: string;
      }
    | null = null;

  function render() {
    root.render(
      React.createElement(MeritWallet, {
        networkRows,
        accountGroups,
        tokenRows,
        recipientRows,
        // A Chrome side panel is closer to the web app's own docked/split-
        // pane mode (full-height, no floating-dialog corners) than its
        // floating popup mode — see MeritWallet.tsx's own `docked` doc
        // comment. fullWidth drops the web app's 364px cap, which assumes a
        // fixed-width floating context — wrong here, where the panel itself
        // is already narrow and user-resizable.
        docked: true,
        fullWidth: true,
        titleBadgeSrc: brandLogoUrl,
        // Same handler as the bottom Open button, not just a same-looking
        // icon — this header icon no longer means "dismiss the wallet" in
        // the extension, it means "open the real web app" (which closes the
        // side panel as a result, same as clicking Open directly).
        onClose: handleOpenApp,
        closeIconSrc: wwwIconUrl,
        infoIconSrc: infoIconUrl,
        // 2026-09-16 — real refresh, added on request. Forces a real
        // re-fetch of the account list and network icons (bypassing the
        // icon cache's TTL via forceRefresh), not just a spinner —
        // previously unwired, so clicking this icon did nothing at all.
        onRefresh: () => void handleRefresh(),
        refreshing,
        initialActiveTab: uiState.activeTab,
        onActiveTabChange: (tab: MenuTabKey) => void writeMeritWalletUiState({ activeTab: tab }),
        initialMenuOpen: uiState.menuOpen,
        onMenuOpenChange: (open: boolean) => void writeMeritWalletUiState({ menuOpen: open }),
        initialOpenTarget: openTarget,
        onOpenTargetChange: (target: OpenTarget) => void writeOpenTarget(target),
        onAccountRowSelect: handleAccountRowSelect,
        onNetworkRowSelect: handleNetworkRowSelect,
        onAccountIconClick: (address: string) => void handleAccountIconClick(address),
        accountDetail,
        onTokenIconClick: (address: string) => void handleTokenIconClick(address),
        tokenDetail,
      }),
    );
  }

  // 2026-09-16, on request ("when the avatar.png is selected we should get
  // ACCOUNT_PANEL with the address sent as a parameter to open the
  // avatar.png and the info.json to populate the tables") — mirrors
  // buildTokenRows' own two-step shape: resolve the icon via getTokenLogoURL
  // independent of whether the metadata record exists (getAccountAvatarURL
  // here, same "the disk path is always computable" reasoning), and the
  // info.json-equivalent (fetchAccountMetadata — the real
  // /assets/accounts/{address}/account.json file) separately, since a
  // missing metadata record shouldn't hide an avatar that genuinely exists,
  // or vice versa. Sets accountDetail to `null` fields (not undefined) on a
  // real fetch failure, matching AccountDetailPanel's own "—" placeholder
  // for whichever field genuinely has nothing to show.
  async function handleAccountIconClick(address: string) {
    accountDetail = null;
    render();
    const [avatarSrc, metadata] = await Promise.all([
      getCachedAccountIconDataUrl(getAccountAvatarURL(address), baseUrl),
      fetchAccountMetadata(address, { baseUrl }).catch(() => null),
    ]);
    accountDetail = {
      address,
      avatarSrc,
      name: metadata?.name,
      symbol: metadata?.symbol,
      email: metadata?.email,
      website: metadata?.website,
      description: metadata?.description,
    };
    render();
  }

  // 2026-09-16, on request ("do the same for the info.png in the lists")
  // — the token-list counterpart to handleAccountIconClick above, same
  // two-step/two-render shape. fetchTokenByAddress is the same real
  // /api/spCoin/tokens lookup buildTokenRows already uses for the list
  // itself; getTokenLogoURL is the same disk-path convention (independent
  // of whether a DB record exists) that fixed the earlier "not all images
  // are displayed" bug.
  async function handleTokenIconClick(address: string) {
    tokenDetail = null;
    render();
    const [logoSrc, record] = await Promise.all([
      getCachedTokenIconDataUrl(getTokenLogoURL(MERIT_WALLET_HARDHAT_CHAIN_ID, address), baseUrl),
      fetchTokenByAddress(MERIT_WALLET_HARDHAT_CHAIN_ID, address, { baseUrl }).catch(() => null),
    ]);
    tokenDetail = {
      address,
      logoSrc,
      name: record?.name,
      symbol: record?.symbol,
      decimals: record?.decimals,
      website: record?.website,
      explorer: record?.explorer,
      description: record?.description,
    };
    render();
  }

  // 2026-09-16, on live report ("assetSelectDropDown is supposed to...
  // return the address back to the caller... works in the web page, but
  // not in the extension") — MeritWallet's own row-select callbacks
  // (added this same session, see its own doc comment) fire on pick but
  // don't know what "become active" means for THIS consumer's data — that's
  // this caller's job, same as every other real-data injection point in
  // this file. Flips isActive on the picked row, clears it on every other
  // row (both across groups for accounts), then re-renders so the header
  // pill and the "ACTIVE" badge both reflect the pick immediately — no
  // fresh fetch needed, this is a pure local selection, not new data.
  function handleAccountRowSelect(accountId: string) {
    if (!accountGroups) return;
    accountGroups = accountGroups.map((group) => ({
      ...group,
      accounts: group.accounts.map((account) => ({
        ...account,
        isActive: account.id === accountId,
      })),
    }));
    render();
  }

  function handleNetworkRowSelect(networkId: string) {
    networkRows = networkRows.map((row) => ({
      ...row,
      isActive: row.id === networkId,
    }));
    render();
  }

  async function handleRefresh() {
    refreshing = true;
    render();
    [accountGroups, networkRows, tokenRows, recipientRows] = await Promise.all([
      fetchAccountGroups(baseUrl, /* forceRefresh */ true),
      buildNetworkRows(baseUrl, /* forceRefresh */ true),
      buildTokenRows(baseUrl, /* forceRefresh */ true),
      buildRecipientRows(baseUrl, /* forceRefresh */ true),
    ]);
    refreshing = false;
    render();
  }

  // 2026-09-16, on request ("while waiting we should always show the
  // required page first") — render the wallet shell immediately with
  // whatever's on hand (uiState's own persisted tab/menu selection,
  // MeritWallet's own SAMPLE_*/empty fallbacks for the not-yet-loaded
  // account/network/token rows) instead of leaving `wallet-root` blank
  // for however long the three real fetches below take. Real data then
  // replaces it in place once it resolves — same two-render pattern
  // handleRefresh already uses, just applied to the very first load too.
  render();

  [accountGroups, networkRows, tokenRows, recipientRows] = await Promise.all([
    fetchAccountGroups(baseUrl),
    buildNetworkRows(baseUrl),
    buildTokenRows(baseUrl),
    buildRecipientRows(baseUrl),
  ]);
  render();
}

void renderWallet();

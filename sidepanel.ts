import React from 'react';
import { createRoot } from 'react-dom/client';
import './src/tailwind.css';
import { MeritWallet, PasswordPanel, type MeritWalletNetworkRow, type AssetListEntry, type ManageSponsorshipRole, type ManageSponsorshipRoleRow } from '@sponsorcoin/spcoin-panels';
import { APP_TYPE } from '@sponsorcoin/spcoin-common';
import {
  readRecordValue,
  formatAccountRecordAmount,
  REWARD_ROLES,
  REWARD_ROLE_CONFIG,
  TOTAL_REWARD_CONFIG,
  getPendingRewardsTotalFromRecord,
  getAccountRecordPendingReward,
} from '@sponsorcoin/spcoin-panels';
import {
  LiteExchangeProvider,
  PanelBootstrap,
  type ExchangeContextWalletSource,
} from '@sponsorcoin/spcoin-exchange-engine';
import {
  extensionExchangeContextStorageExtensions,
  extensionExchangeContextWriteExtensions,
} from './src/exchangeContextStorage';
import { readDisplayStackRaw, makeSyncDisplayStackStorage } from './src/displayStackStorage';
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
import { ActiveAccountHydrator } from './src/hydrateActiveAccount';
import { hydrateAccountFromAddress } from './src/hydrateAccountFromAddress';
import { TransactionConfirmOrchestrator } from './src/TransactionConfirmOrchestrator';
import { sendNativeMerit } from './src/sendNative';
import { getAccountRecord } from './src/getAccountRecord';
import { estimateOffChainRewards } from './src/estimateOffChainRewards';
import { executeStakeTransaction, SPOIN_STAKE_ABI } from './src/executeStakeTransaction';
import { executeClaimTransaction, SPOIN_CLAIM_ABI } from './src/executeClaimTransaction';
import { executeUniswapV3Swap } from './src/executeUniswapV3Swap';
import { parseAbi } from 'viem';

// 2026-09-22, Phase B.2 Stage 4 follow-up — the real Hardhat/HH_BASE RPC
// URL, same value the web app itself uses for this exact chain id
// (public/assets/blockchains/31337/defaultNetworkSettings.json's own
// networkHeader.rpcUrl) — a stable public HTTPS proxy, not a
// localhost-only address, so it resolves from this extension too. Checked
// directly rather than assumed: LiteExchangeProvider's default boot
// context has rpcUrl: '' (Stage 13.a's own deliberate "not needed yet"
// scope cut) — this constant is what closes that gap for the one real
// caller (handleSendSubmit below) that now needs it. Already public — this
// exact string is served today from that same static JSON file, not a
// secret newly exposed here.
const MERIT_WALLET_HARDHAT_RPC_URL = 'https://rpc.sponsorcoin.org/f5b4d4b4a2614a540189b979d068639c3fd44bbb1dfcdb5a';

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

// spCoin contract address for the Hardhat chain — the same V0 fallback the
// web app uses (components/views/TradingStationPanel/StakingStatusPanel.tsx's
// FALLBACK_SPONSOR_COIN_ADDRESS), since the extension has no ExchangeContext
// activeTokens.activeSpCoinAddress to read from yet (Phase B.2 Stage 2 — see
// exchangeContextTypes.ts). This is the deployed spCoin V0 on Hardhat 31337.
const SPOIN_HARDHAT_CONTRACT_ADDRESS = '0x0E9166c03194E40eE84532e9A659abcE40ab1724';

// Initial ExchangeContextWalletSource, disconnected — a plain object, not
// a hook, since this file isn't a React component (renderWallet's own
// `walletSource` local variable is what actually varies now, Stage 2.c;
// this constant is just its starting value). `ready: true` so
// LiteExchangeProvider's boot effect fires immediately, same as wagmi's
// own "settled, disconnected" state.
const DISCONNECTED_WALLET_SOURCE: ExchangeContextWalletSource = {
  ready: true,
  address: undefined,
  isConnected: false,
  chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
};

// Icons fetched (and cached — see networkIconCache.ts) in parallel, same
// baseUrl every other real fetch in this file goes through. A row whose
// icon fetch fails just renders with no icon (getCachedNetworkIconDataUrl
// never throws) rather than breaking the whole list. forceRefresh bypasses
// the icon cache's TTL — wired to the header's own refresh button below.
async function buildNetworkRows(chainId: number, baseUrl: string, forceRefresh = false): Promise<MeritWalletNetworkRow[]> {
  const networks = listConfiguredNetworks({ showTestNets: true });
  const iconUrls = await Promise.all(
    networks.map((network) => getCachedNetworkIconDataUrl(network.logoURL, baseUrl, forceRefresh)),
  );

  const rows = networks.map((network, i) => ({
    id: String(network.chainId),
    symbol: network.symbol,
    name: network.name,
    isActive: network.chainId === chainId,
    defaultAuthSource: network.defaultAuthSource,
    isTestnet: network.isTestnet,
    iconSrc: iconUrls[i],
  }));
  return rows;
}

// Icons fetched (and cached — see accountIconCache.ts) in parallel, same
// pattern as buildNetworkRows above. A row whose icon fetch fails just
// renders with no icon (getCachedAccountIconDataUrl never throws) rather
// than breaking the whole list.
async function fetchAccountGroups(
  chainId: number,
  baseUrl: string,
  forceRefresh = false,
): Promise<AccountListGroupData[] | undefined> {
  try {
    const groups = await fetchAccountListGroups(chainId, { baseUrl });
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

// 2026-09-18, Phase B.2 Stage 2.c — spcoin-feeds' own KeystoreAccountEntry
// (accountsFeed.ts) deliberately mirrors toClientSafeKeyStoreEntries'
// client-safe shape MINUS isLocked/encryptedKey — those are keystore
// internals, not part of that package's own "public account list" concern.
// Fetched separately here, directly against the same testAccounts route
// (CORS-enabled for GET only, Stage 2.a), to know which accounts need a
// password before `unlockMeritWalletAccount` below is worth prompting for.
interface RawTestAccountEntry {
  address?: unknown;
  isLocked?: unknown;
  hasPrivateKey?: unknown;
}

async function fetchKeystoreLockStatus(baseUrl: string): Promise<Map<string, boolean>> {
  const lockStatus = new Map<string, boolean>();
  try {
    const response = await fetch(`${baseUrl}/api/spCoin/lab/networks/${MERIT_WALLET_HARDHAT_CHAIN_ID}/testAccounts`);
    if (!response.ok) return lockStatus;
    const entries = (await response.json()) as RawTestAccountEntry[];
    if (!Array.isArray(entries)) return lockStatus;
    for (const entry of entries) {
      const address = typeof entry?.address === 'string' ? entry.address.trim().toLowerCase() : '';
      if (!address) continue;
      lockStatus.set(address, Boolean(entry?.isLocked));
    }
  } catch (error) {
    // A locked-status lookup failing just means every account is treated
    // as "not locked" (handleAccountRowSelect's own `?? false` below) —
    // the unlock prompt simply won't show; not a hard failure for the
    // rest of the wallet UI.
    console.error('Failed to load Merit Wallet keystore lock status:', error);
  }
  return lockStatus;
}

// 2026-09-18, Phase B.2 Stage 2.c — POSTs to the same unlock route the web
// app's own PasswordGateOrchestrator flow uses (app/api/spCoin/meritConnect/
// unlock/route.ts), now cross-origin-trusted for this extension's pinned
// origin (Stage 2.b's meritConnectExtensionAuth.ts). Returns only an
// opaque, short-lived capability token — the private key itself never
// reaches this file, same guarantee the web app's own flow has.
async function unlockMeritWalletAccount(
  baseUrl: string,
  address: string,
  password: string,
): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  try {
    const response = await fetch(`${baseUrl}/api/spCoin/meritConnect/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chainId: MERIT_WALLET_HARDHAT_CHAIN_ID, address, password }),
    });
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; token?: string; message?: string };
    if (!response.ok || !payload.ok || !payload.token) {
      return { ok: false, message: payload.message || 'Unlock failed.' };
    }
    return { ok: true, token: payload.token };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

// 2026-09-17, feedType-parameterized-dropdowns migration — the shared
// "resolve icons in parallel, then map row+iconSrc to an AssetListEntry"
// tail every real-data list builder in this file was hand-rolling
// separately (buildRecipientRows/buildTokenRows below; buildNetworkRows and
// fetchAccountGroups above stay separate — their own source calls aren't a
// spcoin-feeds row fetch in the first place, listConfiguredNetworks is a
// synchronous local config read, and fetchAccountGroups' own grouped
// AccountListGroupData shape isn't a flat row list). Each caller still owns
// its own fetch call and its own try/catch + console.error message — only
// the icon-resolution/mapping step, genuinely identical across both, is
// shared here.
async function withAssetIcons<TRow>(
  rows: TRow[],
  baseUrl: string,
  forceRefresh: boolean,
  getIconUrl: (row: TRow) => string,
  getCachedIconDataUrl: (url: string, baseUrl: string, forceRefresh?: boolean) => Promise<string | undefined>,
  toEntry: (row: TRow, iconSrc: string | undefined) => AssetListEntry,
): Promise<AssetListEntry[]> {
  const iconUrls = await Promise.all(rows.map((row) => getCachedIconDataUrl(getIconUrl(row), baseUrl, forceRefresh)));
  return rows.map((row, i) => toEntry(row, iconUrls[i]));
}

// 2026-09-16, on live report ("I think the selection lists are different
// in the web site vs the extension") — Send/Sponsor's recipient picker was
// silently reusing the wallet's own accounts (fetchAccountGroups above,
// HH_BASE_1..19) as a placeholder; the real app reads a genuinely
// different, chain-scoped directory instead (real sponsor-selected causes
// like "FREE | Born Free USA") — see spcoin-feeds/accounts'
// fetchAccountRoleList doc comment for the full reasoning. Same icon-
// resolution shape as fetchAccountGroups above.
async function buildRecipientRows(chainId: number, baseUrl: string, forceRefresh = false): Promise<AssetListEntry[] | undefined> {
  try {
    const rows = await fetchAccountRoleList('recipients', chainId, { baseUrl });
    return await withAssetIcons(
      rows,
      baseUrl,
      forceRefresh,
      (row) => row.avatarURL,
      getCachedAccountIconDataUrl,
      (row, iconSrc) => ({ id: row.id, symbol: row.symbol, name: row.name, address: row.address, iconSrc }),
    );
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

async function buildTokenRows(chainId: number, baseUrl: string, forceRefresh = false): Promise<AssetListEntry[] | undefined> {
  try {
    const { items } = await fetchTokenList(
      chainId,
      { pageSize: TOKEN_LIST_PAGE_SIZE },
      { baseUrl },
    );
    return await withAssetIcons(
      items,
      baseUrl,
      forceRefresh,
      (t) => getTokenLogoURL(chainId, t.address),
      getCachedTokenIconDataUrl,
      (t, iconSrc) => ({ id: t.address, symbol: t.symbol, name: t.name, address: t.address, decimals: t.decimals, iconSrc }),
    );
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
//
// 2026-09-21, on direct request — real regression + real fix, not a
// cosmetic revert. An earlier pass this same day removed `wwwIconUrl`
// entirely, reasoning that a caller-supplied `closeIconSrc` override was
// fragile (easy to accidentally drop, which is exactly what had just
// happened) — but the actual fix for "easy to accidentally drop" is a
// real `APP_TYPE` flag deciding this centrally in WalletHeader.tsx
// itself (@sponsorcoin/spcoin-common's new appType.ts, shared node_source
// between this repo and spcoin-nextjs-front-end), not removing the
// feature. Restored here, now passed alongside `appType:
// APP_TYPE.EXTENSION` below rather than as a bare `closeIconSrc`
// override — WalletHeader.tsx only honors it when `appType` says this
// really is the extension.
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
// menuOpen/openTarget state (plain useState — see that file's own doc
// comments) would otherwise reset to its defaults every time.
// chrome.storage.local (openTargetStorage.ts / meritWalletUiStorage.ts)
// is this extension's own persistence, read once here before the first
// render and written back on every change the wallet reports. activeTab
// used to live here too — moved 2026-09-21 (Path A) onto the real
// panel-tree engine's own persistence instead, see
// meritWalletUiStorage.ts's own header comment for why.
async function renderWallet() {
  const walletRoot = document.getElementById('wallet-root');
  if (!walletRoot) return;
  const root = createRoot(walletRoot);

  const [openTarget, uiState, persistedDisplayStack] = await Promise.all([
    readOpenTarget(),
    readMeritWalletUiState(),
    readDisplayStackRaw(),
  ]);
  const baseUrl = urlForOpenTarget(openTarget);
  // 2026-09-21, Path A — DisplayStackProvider's own storage contract is
  // synchronous (see displayStackStorage.ts's own header comment for why
  // this needs pre-resolving here rather than passed as an async
  // function), so the real chrome.storage.local-backed value is read
  // above, alongside this file's other storage reads, and wrapped into a
  // sync closure once, here, rather than on every render() call.
  const displayStackStorage = makeSyncDisplayStackStorage(persistedDisplayStack);

  // refreshing/data live outside React (this file isn't a component) — each
  // change just re-runs this same render() against the same root, same
  // pattern React's own docs use for a plain-script root.
  let refreshing = false;
  let accountGroups: AccountListGroupData[] | undefined;
  let networkRows: MeritWalletNetworkRow[] = [];
  let tokenRows: AssetListEntry[] | undefined;
  let recipientRows: AssetListEntry[] | undefined;
  // Phase B.2 Stage 2.c — real wallet-source state, same "plain outer-scope
  // variable, mutated then render() called" shape as every other piece of
  // state in this file (accountGroups, refreshing, etc.), not React state.
  let walletSource: ExchangeContextWalletSource = DISCONNECTED_WALLET_SOURCE;
  let lockStatusByAddress = new Map<string, boolean>();
  // The single currently-unlocked account's capability token (one at a
  // time, matching walletSource's own single-active-address model — Merit
  // Wallet Stage 2.c doesn't support switching between two simultaneously
  // unlocked accounts, same "unlock once, one active session" shape as
  // walletSource.address itself). Not currently consumed anywhere yet
  // (Stage 3/4's job — sign/hydration) but kept here, address-scoped, so
  // this stage's own re-select doesn't immediately re-prompt for a
  // password it just successfully entered.
  let unlockToken: string | null = null;
  let unlockTokenAddress: string | null = null;
  let unlockPrompt: { address: string } | null = null;
  let unlockError: string | undefined;
  let unlocking = false;
  // Phase B.2 Stage 4 follow-up — the SEND tab's real, controlled amount
  // field (MeritWallet.tsx's own sendAmount/onSendAmountChange props, this
  // session) and busy flag while a real send is in flight.
  let sendAmount = '';
   let sendBusy = false;
   // 2026-09-26, Phase 4 — SPONSOR tab stake execution busy flag + amount state.
    let sponsorStakeBusy = false;
    let sponsorStakeAmount = '';
    let sponsorSwapBusy = false;
    // 2026-09-28, TRADING_STATION_PANEL migration — SWAP tab amount + busy state.
    let swapAmount = '';
    let swapBusy = false;
    /** 2026-09-27, Phase 4 — swap execution callback for SPONSOR tab.
     *  Called by MeritWallet when the user clicks "Swap to spCoin" before
     *  staking. Uses the extension's executeUniswapV3Swap adapter which
     *  delegates to the portable @sponsorcoin/spcoin-onchain module via
     *  the extension's TradeExecutor (tradeExecutorMerit.ts). */
    async function handleSponsorSwapSubmit(params: {
      tokenIn: string;
      tokenOut: string;
      amountIn: bigint;
      recipient: string;
      chainId: number;
    }) {
      const from = walletSource.address;
      if (!from) {
        alert('Select and activate an account first.');
        return;
      }

      sponsorSwapBusy = true;
      render();

      try {
        const result = await executeUniswapV3Swap({
          baseUrl,
          rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
          chainId: params.chainId,
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountIn: params.amountIn,
          amountOutMinimum: 0n,
          recipient: params.recipient,
          fee: 3000,
          fromAddress: from,
        });

        if (result.transactionHash) {
          alert(`Swap submitted. Transaction hash: ${result.transactionHash}`);
        } else {
          alert('Swap completed with no transaction hash.');
        }
      } catch (error) {
        alert(`Swap failed: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        sponsorSwapBusy = false;
        render();
      }
    }

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

  // Phase B.2 — on-chain AccountStruct fetched via getAccountRecord through
  // /api/spCoin/run-script. Populated when an account is activated (either
  // directly for an unlocked account, or after the password unlock resolves
  // for a locked one). Passed to MeritWallet as `accountRecord` so panels
  // like ManageSponsorshipsPanel can render real on-chain data without
  // needing their own run-script client wired up — this file's plain fetch()
  // pattern with an absolute baseUrl resolves correctly from a
  // chrome-extension:// origin, and the server's read-only CORS grant
  // (exchangeContextCors.ts, MERIT_EXTENSION_ORIGIN) is already wired into
  // run-script/route.ts's POST handler.
  let   accountRecord: unknown = null;

  // Phase B.2 — estimateOffChainTotalRewards result for the active account,
  // fetched alongside getAccountRecord so panels like ManageSponsorshipsPanel
  // have everything they need on account selection.
   let rewardEstimate: unknown = null;

   // 2026-09-27, Phase C — parsed reward display state for ManageSponsorshipsPanel.
   // Derived from accountRecord + rewardEstimate in parseRewardDisplay().
   let rewardTradingText = '';
   let rewardStakedText = '';
   let rewardPendingText = '';
   let rewardTotalCoinsText = '';
   let rewardRows: ManageSponsorshipRoleRow[] = [];
   let rewardRoleLoading: Record<string, boolean> = {};
   let rewardClaimBusy = false;
   let rewardEstimateBusy = false;
   let rewardError: string | undefined;

  function render() {
    root.render(
      React.createElement(
        LiteExchangeProvider,
        {
          walletSource,
          storageExtensions: extensionExchangeContextStorageExtensions,
          writeExtensions: extensionExchangeContextWriteExtensions,
          displayStackStorage,
        },
        React.createElement(PanelBootstrap),
        // Phase B.2 Stage 3 — hydrates activeAccount's real name/logo/etc
        // once a wallet source resolves to a real address; no UI of its
        // own (see hydrateActiveAccount.ts's own doc comment).
        React.createElement(ActiveAccountHydrator, { baseUrl }),
        // Phase B.2 Stage 4.c — renders TransactionConfirmPanel (always an
        // explicit Approve/Reject gate — see pendingSignRequestStore.ts's
        // own header comment for why this doesn't mirror the web app's
        // auto-approve default) whenever pendingSignRequestStore has a
        // pending request. No real producer wired in yet (Stage 4.b's
        // server-side allowlist isn't implemented, Stage 4.d hasn't
        // extended cross-origin trust to `sign`) — mounted now so it's a
        // real, ready capability the moment that lands. Sibling of
        // MeritWallet/PasswordPanel below, not nested under either, since
        // it needs to overlay regardless of which of those two is showing.
        React.createElement(TransactionConfirmOrchestrator),
        // Phase B.2 Stage 2.c — PasswordPanel replaces MeritWallet
        // entirely while a locked account's password is being requested,
        // same shape as the web app's own PasswordGateOrchestrator
        // (whole-wallet gate, not a modal-over-content overlay) — simpler
        // to reason about for this first real wallet-source wiring than a
        // layered overlay would be.
        unlockPrompt
          ? React.createElement(PasswordPanel, {
              mode: 'unlock',
              icon: React.createElement('img', { src: brandLogoUrl, alt: '' }),
              errorText: unlockError,
              submitting: unlocking,
              onSubmit: (password: string) => void handleUnlockSubmit(password),
            })
          : React.createElement(MeritWallet, {
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
          // 2026-09-21, on direct request — `onClose` stays wired to the
          // same handler as the (removed) bottom Open button: this means
          // "open the real web app" (which closes the side panel as a
          // result). `appType: APP_TYPE.EXTENSION` + `wwwIconSrc` is the
          // real, centralized mechanism (WalletHeader.tsx/@sponsorcoin/
          // spcoin-common's new APP_TYPE flag) that tells WalletHeader to
          // show `wwwIconUrl` instead of its own default X — see this
          // file's own `wwwIconUrl` comment above for why this replaced a
          // bare `closeIconSrc` override.
          onClose: handleOpenApp,
          appType: APP_TYPE.EXTENSION,
          wwwIconSrc: wwwIconUrl,
          infoIconSrc: infoIconUrl,
          // 2026-09-16 — real refresh, added on request. Forces a real
          // re-fetch of the account list and network icons (bypassing the
          // icon cache's TTL via forceRefresh), not just a spinner —
          // previously unwired, so clicking this icon did nothing at all.
          onRefresh: () => void handleRefresh(),
          refreshing,
          // 2026-09-21, Path A — initialActiveTab/onActiveTabChange
          // deliberately NOT wired here anymore. MeritWallet.tsx's
          // activeTab now comes from the real engine's own
          // usePanelTree()/activeMainOverlay, and that engine already
          // persists which tab was active via its own storage extension
          // (LiteExchangeProvider's default window.localStorage) — wiring
          // this too would just be a second, separately-written copy of
          // the same fact. See meritWalletUiStorage.ts's own header
          // comment for the full reasoning.
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
          // Phase B.2 Stage 4 follow-up — the real SEND tab wiring.
          sendAmount,
          onSendAmountChange: (value: string) => {
            sendAmount = value;
            render();
          },
          sendBusy,
          onSendSubmit: (params: {
            recipientAddress?: string;
            tokenAddress?: string;
            amount: string;
            decimals?: number;
            tokenSymbol?: string;
           }) => void handleSendSubmit(params),
           // 2026-09-26, Phase 4 — SPONSOR tab stake execution wiring.
           sponsorStakeSubmitBusy: sponsorStakeBusy,
           onSponsorStakeSubmit: (params: {
             recipientAddress?: string;
             agentAddress?: string;
             amount: bigint;
             recipientRateKey: number;
             agentRateKey: number;
           }) => void handleSponsorStakeSubmit(params),
           // 2026-09-26, Phase 4 finish — real amount input for SPONSOR tab.
           sponsorAmount: sponsorStakeAmount,
           onSponsorAmountChange: (value: string) => {
             sponsorStakeAmount = value;
             render();
           },
          sponsorAmountBusy: sponsorStakeBusy,
          // 2026-09-27, Phase 4 — swap execution wiring for SPONSOR tab.
          onSponsorSwapSubmit: (params: {
            tokenIn: string;
            tokenOut: string;
            amountIn: bigint;
            recipient: string;
            chainId: number;
          }) => void handleSponsorSwapSubmit(params),
           sponsorSwapBusy,
           // 2026-09-28, TRADING_STATION_PANEL migration — SWAP tab execution props.
           swapAmount,
           onSwapAmountChange: (value: string) => {
             swapAmount = value;
             render();
           },
           swapBusy,
           onSwapSubmit: (params: {
             sellTokenAddress: string;
             buyTokenAddress: string;
             amountIn: bigint;
             recipient: string;
             chainId: number;
           }) => void handleSponsorSwapSubmit({
             tokenIn: params.sellTokenAddress,
             tokenOut: params.buyTokenAddress,
             amountIn: params.amountIn,
             recipient: params.recipient,
             chainId: params.chainId,
           }),
           activeChainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
         // 2026-09-27, TODO 4 — AGENT_HEADER_PANEL auto-seed wiring.
          defaultAgentAddress: import.meta.env.NEXT_PUBLIC_DEFAULT_AGENT_ADDRESS,
          onHydrateAgent: (address: string) => hydrateAccountFromAddress(address, { baseUrl }),
           // 2026-09-27, Phase C — REWARDS tab claim/estimate wiring for
           // ManageSponsorshipsPanel. Display strings parsed from
           // accountRecord via parseRewardDisplay(); claim callbacks use the
           // extension's executeClaimTransaction adapter (viem encodeFunctionData
           // + TradeExecutor/meritSign pipeline); estimate callbacks use the
           // extension's estimateOffChainRewards client (spcoin_rread via
           // /api/spCoin/run-script, already CORS-trusted cross-origin).
           tradingAmountText: rewardTradingText,
           stakedAmountText: rewardStakedText,
           pendingAmountText: rewardPendingText,
           totalCoinsText: rewardTotalCoinsText,
           rewardRows,
           onRoleEstimate: (role: ManageSponsorshipRole) => void handleRoleEstimate(role),
           onRoleClaim: (role: ManageSponsorshipRole) => void handleRoleClaim(role),
           pendingInitialLoading: !rewardEstimate && !rewardClaimBusy,
           pendingClaimInProgress: rewardClaimBusy,
           pendingClaimDisabled: rewardClaimBusy || !walletSource.address,
           pendingErrorText: rewardError,
           onPendingEstimate: () => void handlePendingEstimate(),
           onPendingClaim: () => void handlePendingClaim(),
          }),
      ),
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
  // Phase B.2 Stage 2.c — accountId is the account's address (spcoin-feeds'
  // own accountsFeed.ts builds `id: entry.address`, confirmed by reading
  // it, not assumed). A locked account with no currently-valid unlock
  // token prompts for its password (render() swaps to PasswordPanel);
  // everything else (unencrypted entries, or an account this session
  // already unlocked) activates the wallet source immediately, no prompt.
  function handleAccountRowSelect(accountId: string) {
    if (!accountGroups) return;
    const address = accountId.trim().toLowerCase();
    const isLocked = lockStatusByAddress.get(address) ?? false;
    const alreadyUnlocked = unlockTokenAddress === address;

    if (isLocked && !alreadyUnlocked) {
      unlockPrompt = { address: accountId };
      unlockError = undefined;
      render();
      return;
    }

    activateAccount(accountId);
  }

  // Marks the row active (existing local-selection behavior, unchanged)
  // and sets it as the real ExchangeContextWalletSource's active address.
  function activateAccount(accountId: string) {
    if (!accountGroups) return;
    accountGroups = accountGroups.map((group) => ({
      ...group,
      accounts: group.accounts.map((account) => ({
        ...account,
        isActive: account.id === accountId,
      })),
    }));
    walletSource = { ...walletSource, address: accountId, isConnected: true };
    render();
    void fetchAccountRecord(accountId);
  }

  // Phase B.2 — fetches the on-chain AccountStruct for the active account
  // via /api/spCoin/run-script. Best-effort: a failed fetch just leaves
  // `accountRecord` as null; the panels that need real data degrade
  // gracefully (same "undefined, not a real-but-empty" pattern this file's
  // other data loaders already use). Uses the same baseUrl/chainId/rpcUrl
  // constants every other hardhat-specific call in this file does.
  async function fetchAccountRecord(address: string) {
    accountRecord = null;
    render();
    try {
      [accountRecord, rewardEstimate] = await Promise.all([
        getAccountRecord(address, {
          baseUrl,
          contractAddress: SPOIN_HARDHAT_CONTRACT_ADDRESS,
          rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
          chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
        }),
        estimateOffChainRewards(address, 'estimateOffChainTotalRewards', {
          baseUrl,
          contractAddress: SPOIN_HARDHAT_CONTRACT_ADDRESS,
          rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
          chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
        }).catch((error) => {
          console.error('Failed to load reward estimate:', error);
          return null;
        }),
      ]);
     } catch (error) {
       console.error('Failed to load account record:', error);
       accountRecord = null;
     }
     parseRewardDisplay();
     render();
   }

  async function handleUnlockSubmit(password: string) {
    if (!unlockPrompt) return;
    unlocking = true;
    unlockError = undefined;
    render();

    const address = unlockPrompt.address;
    const result = await unlockMeritWalletAccount(baseUrl, address, password);

    unlocking = false;
    if (!result.ok) {
      unlockError = result.message;
      render();
      return;
    }

    unlockToken = result.token;
    unlockTokenAddress = address.trim().toLowerCase();
    unlockPrompt = null;
    unlockError = undefined;
    activateAccount(address);
  }

  // Phase B.2 Stage 4 follow-up ("build actual trading functionality...
  // do it") — the first real trade-execution flow in the extension.
  // Native-currency only (see sendNative.ts's own header comment for why
  // an ERC20 tokenAddress is rejected rather than guessed at). Approval
  // gating (TransactionConfirmPanel) happens inside signAndSendMeritTransaction
  // itself — this function's own job is just resolving the real params
  // (active address, cached unlock token if this account is locked, the
  // real Hardhat rpcUrl) and reporting the outcome.
  async function handleSendSubmit(params: {
    recipientAddress?: string;
    tokenAddress?: string;
    amount: string;
    decimals?: number;
    tokenSymbol?: string;
  }) {
    const from = walletSource.address;
    if (!from) {
      alert('Select and activate an account first.');
      return;
    }

    sendBusy = true;
    render();

    const network = networkRows.find((row) => row.isActive);
    const result = await sendNativeMerit({
      baseUrl,
      chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
      rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
      from,
      recipientAddress: params.recipientAddress,
       tokenAddress: params.tokenAddress,
       amount: params.amount,
       decimals: params.decimals,
       tokenSymbol: params.tokenSymbol,
       nativeSymbol: network?.symbol ?? 'ETH',
      unlockToken: unlockTokenAddress === from.trim().toLowerCase() ? (unlockToken ?? undefined) : undefined,
    });

    sendBusy = false;
    if (result.ok) {
      sendAmount = '';
      // No MESSAGE_PANEL-equivalent result UI exists in the extension yet
      // (a real, separate gap — same class as the web app's own
      // confirmation-flow richness not being ported) — a plain alert is
      // the honest minimum until that's built.
      alert(`Sent. Transaction hash: ${result.hash}`);
    } else {
      alert(`Send failed: ${result.message}`);
    }
    render();
  }

  // 2026-09-26, Phase 4 — SPONSOR tab stake execution wiring.
  // Uses the portable executeStakeTransaction (from @sponsorcoin/spcoin-onchain
  // via @sponsorcoin/spcoin-exchange-engine) wrapped by the extension's own
  // executeStakeTransaction.ts adapter, which bridges to the Merit signing
  // pipeline via tradeExecutorMerit.ts.
  // NOTE: recipientKey/agentKey/rate-key resolution still need real wiring —
  // the current MeritWallet inert-fallback passes placeholder values (amount 0n,
  // rate keys 0). This handler wires the full path so it's ready for when real
  // inputs are threaded through.
  async function handleSponsorStakeSubmit(params: {
    recipientAddress?: string;
    agentAddress?: string;
    amount: bigint;
    recipientRateKey: number;
    agentRateKey: number;
  }) {
    const from = walletSource.address;
    if (!from) {
      alert('Select and activate an account first.');
      return;
    }

    sponsorStakeBusy = true;
    render();

    try {
      const recipientKey = params.recipientAddress ?? '';
      const agentKey = params.agentAddress ?? '';

      const result = await executeStakeTransaction({
        baseUrl,
        rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
        recipientKey,
        agentKey,
        amountRaw: params.amount,
        desiredRecipientRateKey: params.recipientRateKey,
        desiredAgentRateKey: params.agentRateKey,
        recipientRateRange: [0, 100],
        agentRateRange: [0, 100],
        abi: SPOIN_STAKE_ABI,
        contractAddress: SPOIN_HARDHAT_CONTRACT_ADDRESS,
        chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
        fromAddress: from,
      });

      if (result.transactionHash) {
        alert(`Stake submitted. Transaction hash: ${result.transactionHash}`);
      } else {
        alert('Stake completed with no transaction hash.');
      }
    } catch (error) {
      alert(`Stake failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      sponsorStakeBusy = false;
      sponsorStakeAmount = '';
      render();
     }
   }

   // 2026-09-27, Phase C — parse accountRecord + rewardEstimate into the display
   // strings + per-role rows that ManageSponsorshipsPanel expects. Uses the
   // same helpers exported from @sponsorcoin/spcoin-panels (readRecordValue,
   // formatAccountRecordAmount, getAccountRecordPendingReward, etc.) that the
   // web app's own ManageSponsorshipsPanel.tsx uses — keeping this extension's
   // parsing identical so rows look the same.
   function parseRewardDisplay() {
     if (!accountRecord) {
       rewardTradingText = '';
       rewardStakedText = '';
       rewardPendingText = '';
       rewardTotalCoinsText = '';
       rewardRows = [];
       return;
     }
      const rawBalance = readRecordValue(accountRecord, ['totalSpCoins', 'balanceOf']);
      const rawStaked = readRecordValue(accountRecord, ['totalSpCoins', 'stakedBalance']);
      const rawPending = getPendingRewardsTotalFromRecord(accountRecord);
      rewardTradingText = formatAccountRecordAmount(rawBalance, 18);
      rewardStakedText = formatAccountRecordAmount(rawStaked, 18);
      rewardPendingText = formatAccountRecordAmount(rawPending, 18);
      const toBigInt = (v: unknown): bigint => {
        const s = String(v ?? '0').replace(/,/g, '');
        try { return BigInt(s); } catch { return BigInt(0); }
      };
      rewardTotalCoinsText = formatAccountRecordAmount(
        toBigInt(rawBalance) + toBigInt(rawStaked) + toBigInt(rawPending),
        18,
      );
     // Per-role rows: amounts from the role-specific pendingRewards fields,
     // availability from the role flag bits in accountRecord.
     rewardRows = REWARD_ROLES.map((role) => {
       const config = REWARD_ROLE_CONFIG[role];
       const rawAmount = getAccountRecordPendingReward(accountRecord, role);
       const roleFlag = readRecordValue(accountRecord, [config.roleFlag]);
       const amount = rawAmount != null ? formatAccountRecordAmount(rawAmount, 18) : '0.0';
       return {
         role,
         amount,
         available: Boolean(roleFlag),
         loading: !!rewardRoleLoading[role],
       };
     });
   }

   // 2026-09-27, Phase C — total-reward estimate callback. Fires the extension's
   // estimateOffChainRewards client (spcoin_rread via /api/spCoin/run-script,
   // already CORS-trusted cross-origin). Updates rewardEstimate + re-parses
   // the display strings. On error, surfaces a message via pendingErrorText.
   async function handlePendingEstimate() {
     const from = walletSource.address;
     if (!from) {
       alert('Select and activate an account first.');
       return;
     }
     rewardEstimateBusy = true;
     rewardError = undefined;
     parseRewardDisplay();
     render();
     try {
       rewardEstimate = await estimateOffChainRewards(from, TOTAL_REWARD_CONFIG.estimateMethod, {
         baseUrl,
         contractAddress: SPOIN_HARDHAT_CONTRACT_ADDRESS,
         rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
         chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
       });
       parseRewardDisplay();
     } catch (error) {
       rewardError = `Estimate failed: ${error instanceof Error ? error.message : String(error)}`;
       parseRewardDisplay();
     } finally {
       rewardEstimateBusy = false;
       render();
     }
   }

   // 2026-09-27, Phase C — per-role estimate callback. Fires the role-specific
   // estimate method (estimateOffChainSponsorRewards / Recipient / Agent).
   async function handleRoleEstimate(role: ManageSponsorshipRole) {
     const from = walletSource.address;
     if (!from) {
       alert('Select and activate an account first.');
       return;
     }
     const config = REWARD_ROLE_CONFIG[role];
     rewardRoleLoading[role] = true;
     rewardError = undefined;
     parseRewardDisplay();
     render();
     try {
        await estimateOffChainRewards(from, config.estimateMethod as Parameters<typeof estimateOffChainRewards>[1], {
         baseUrl,
         contractAddress: SPOIN_HARDHAT_CONTRACT_ADDRESS,
         rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
         chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
       });
       parseRewardDisplay();
      } catch (error) {
        rewardError = `Estimate failed: ${error instanceof Error ? error.message : String(error)}`;
        rewardRoleLoading[role] = false;
        parseRewardDisplay();
        render();
        return;
      }
      rewardRoleLoading[role] = false;
      parseRewardDisplay();
      render();
    }


   // 2026-09-27, Phase C — total-reward claim (claimOnChainTotalRewards).
   // Uses the extension's executeClaimTransaction adapter: viem encodeFunctionData
   // + TradeExecutor (meritSign) pipeline. After confirmation, re-fetches accountRecord
   // to refresh all display strings.
   async function handlePendingClaim() {
     const from = walletSource.address;
     if (!from) {
       alert('Select and activate an account first.');
       return;
     }
     rewardClaimBusy = true;
     parseRewardDisplay();
     render();
     try {
       const result = await executeClaimTransaction({
         baseUrl,
         rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
         accountKey: from,
         method: TOTAL_REWARD_CONFIG.claimMethod,
         abi: SPOIN_CLAIM_ABI,
         contractAddress: SPOIN_HARDHAT_CONTRACT_ADDRESS,
         chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
         fromAddress: from,
         onConfirmed: () => void fetchAccountRecord(from),
       });
       if (result.transactionHash) {
         alert(`Claim submitted. Transaction hash: ${result.transactionHash}`);
       }
     } catch (error) {
       alert(`Claim failed: ${error instanceof Error ? error.message : String(error)}`);
     } finally {
       rewardClaimBusy = false;
       await fetchAccountRecord(from);
       render();
     }
   }

   // 2026-09-27, Phase C — per-role claim callback.
   // Uses the role-specific claimOnChain* method.
   async function handleRoleClaim(role: ManageSponsorshipRole) {
     const from = walletSource.address;
     if (!from) {
       alert('Select and activate an account first.');
       return;
     }
     const config = REWARD_ROLE_CONFIG[role];
     rewardRoleLoading[role] = true;
     parseRewardDisplay();
     render();
     try {
       const result = await executeClaimTransaction({
         baseUrl,
         rpcUrl: MERIT_WALLET_HARDHAT_RPC_URL,
         accountKey: from,
          method: config.claimMethod as Parameters<typeof executeClaimTransaction>[0]['method'],
         abi: SPOIN_CLAIM_ABI,
         contractAddress: SPOIN_HARDHAT_CONTRACT_ADDRESS,
         chainId: MERIT_WALLET_HARDHAT_CHAIN_ID,
         fromAddress: from,
         onConfirmed: () => void fetchAccountRecord(from),
       });
       if (result.transactionHash) {
         alert(`Claim submitted. Transaction hash: ${result.transactionHash}`);
       }
     } catch (error) {
       alert(`Claim failed: ${error instanceof Error ? error.message : String(error)}`);
     } finally {
       rewardRoleLoading[role] = false;
       await fetchAccountRecord(from);
       render();
     }
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
    [accountGroups, networkRows, tokenRows, recipientRows, lockStatusByAddress] = await Promise.all([
      fetchAccountGroups(MERIT_WALLET_HARDHAT_CHAIN_ID, baseUrl, /* forceRefresh */ true),
      buildNetworkRows(MERIT_WALLET_HARDHAT_CHAIN_ID, baseUrl, /* forceRefresh */ true),
      buildTokenRows(MERIT_WALLET_HARDHAT_CHAIN_ID, baseUrl, /* forceRefresh */ true),
      buildRecipientRows(MERIT_WALLET_HARDHAT_CHAIN_ID, baseUrl, /* forceRefresh */ true),
      fetchKeystoreLockStatus(baseUrl),
    ]);
    refreshing = false;
    render();
  }

  // 2026-09-16, on request ("while waiting we should always show the
  // required page first") — render the wallet shell immediately with
  // whatever's on hand (uiState's own persisted menu selection, the real
  // engine's own persisted tab — see this file's own Path-A comment
  // above — MeritWallet's own SAMPLE_*/empty fallbacks for the not-yet-loaded
  // account/network/token rows) instead of leaving `wallet-root` blank
  // for however long the three real fetches below take. Real data then
  // replaces it in place once it resolves — same two-render pattern
  // handleRefresh already uses, just applied to the very first load too.
  render();

  [accountGroups, networkRows, tokenRows, recipientRows, lockStatusByAddress] = await Promise.all([
    fetchAccountGroups(MERIT_WALLET_HARDHAT_CHAIN_ID, baseUrl),
    buildNetworkRows(MERIT_WALLET_HARDHAT_CHAIN_ID, baseUrl),
    buildTokenRows(MERIT_WALLET_HARDHAT_CHAIN_ID, baseUrl),
    buildRecipientRows(MERIT_WALLET_HARDHAT_CHAIN_ID, baseUrl),
    fetchKeystoreLockStatus(baseUrl),
  ]);
  render();
}

void renderWallet();

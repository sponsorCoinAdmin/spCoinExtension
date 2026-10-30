// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/MeritWallet.tsx
// 2026-10-08 — moved here, unchanged apart from its imports, from @sponsorcoin/spcoin-panels (docs/meritWalletNpmDesignToDo.txt, S1).
// Self-contained Merit Wallet component — 2026-09-14, per docs/design/
// extensionPlan.txt's "Direction changed" entry (one shared `MeritWallet`
// component instead of two independently-rebuilt wallets), simplified on
// direct request: "the extension should embed just MeritWallet.tsx" — not
// a bare shell requiring the caller to assemble header/account-row/tabs/
// panel-bodies itself via 3 injected slots (that earlier design, tried
// first, put real composition work back on every consumer).
//
// This component now composes its own header (WalletHeader +
// NetworkSelectDropDown), account row (WalletAccountHeader), tab title
// (PanelTitle), tab strip + active panel body (MenuTabHeaderBar +
// TradingStationPanel/SendTabPanel/SponsorshipPanel/
// ManageSponsorshipsPanel/WalletConfigPanel) internally, using this same
// package's own portable, inert placeholder versions of each — the exact
// composition sidepanel.ts used to hand-assemble itself. A consumer now
// just renders `<MeritWallet onClose={...} />` and gets the whole nested
// layout for free.
//
// No @/-aliased imports, no Tailwind (a component library shouldn't
// require every consumer to run a Tailwind pipeline — see
// WalletHeader.tsx's own header comment), so this has no dependency on
// any one app's ExchangeContext/panel-tree/styling pipeline. Every piece
// composed here is already independently portable — see each file's own
// doc comment (WalletHeader.tsx, WalletAccountHeader.tsx, PanelTitle.tsx,
// MenuTabHeaderBar.tsx, and the 5 tab-panel files).
//
// `SP_COIN_DISPLAY.MERIT_WALLET` itself is deliberately NOT gated inside
// this component — extensionPlan.txt's "Third slice" entry ruled that
// migration out (PasswordGateOrchestrator.tsx depends on it app-wide;
// migrating it wrong risks the password gate failing to force closed).
// Whether/when to render this component at all stays the host's call.

'use client';

import { lockLogoStyle, fitImageStyle, walletFrameStyle, walletFrameCss, walletFrameClassName } from '@sponsorcoin/spcoin-common/styles';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAddress, formatUnits } from 'viem';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { APP_TYPE } from '@sponsorcoin/spcoin-common';
import type { TokenContract } from '@sponsorcoin/spcoin-common/context';
import { TRADE_DIRECTION, FEED_TYPE } from '@sponsorcoin/spcoin-common/context';
import { plainSendStepStore, stepThroughApprovalStore } from '@sponsorcoin/spcoin-exchange-engine';
import { StakeConfirmPopup } from '@sponsorcoin/spcoin-panels';
import {
  usePanelTree,
  usePanelVisible,
  useOpenActiveListPanel,
  useActiveListPanelChild,
  panelStore,
  useEnforceRadioPanelGroups,
  useEnforcePanelAncestorVisibility,
  useEnforceRadioPanelContainers,
  useAgentAccount,
  useActiveAccount,
  useExchangeContext,
  useSellTokenContract,
  useBuyTokenContract,
  useSlippage,
  useTradeDirection,
  useSellAmount,
  useBuyAmount,
  activeListPanelStore,
  type WalletListSelectionSlot,
  panelTreeTrace,
  useDisplayStack,
  usePreviewTokenContract,
  clampDisplay,
  isIntermediateDecimal,
  maxInputSz,
  TYPING_GRACE_MS,
} from '@sponsorcoin/spcoin-exchange-engine';
import { AssetSelectListPanel as AssetSelectListPanelHost, PanelGate, UniSelectPanelWithSwap, WalletPanel, WalletSelectDropDownHosted, setWalletAssetBaseUrl, useWalletListTitle, WalletConnectProvider, ConfigSlippagePanel, PACKAGE_BUILD, SHOW_BUILD_MARKERS, LoginHeader, WalletNetworkHeader, ManageSponsorshipsPanel, AgentHeaderPanel, PasswordPanel, type AssetListEntry, AccountListCard, type AccountListGroup, SponsorStakingListPanel, AssetListSelectPanel, PanelTreePanel, WalletBalanceContext, useFetchedBalance, fetchedBalanceText, type FetchBalance, NetworkListTable, type NetworkListEntry, WalletConfigPanel, type OpenTarget, type MeritWalletPasswordMode as ConfigPasswordMode, type ApplicationSyncMode, type MeritWalletLocation, type MeritExtensionChannel, TokenLogo, AccountAvatar } from '@sponsorcoin/spcoin-panels';
import type { Wallet } from './wallet/wallet';
import { domPlatform } from './platform/domPlatform';
import { MeritPlatformContext, type MeritPlatform } from './platform/platform';
import { ALL_WALLET_DERIVATIONS, mergeWalletProps, useWalletDerivedProps, type WalletDerivation } from './wallet/walletProps';
import { useApproverAccounts } from './wallet/approverAccountsReact';
import { useApprovalMessagePanel } from './auth/useApprovalMessagePanel';
import type { ApproverHost } from './wallet/approverAccounts';
import { walletName, type AuthenticatorId } from './auth/authenticator';
import type { IconCacheStorage } from '@sponsorcoin/spcoin-feeds/shared';
import { createMeritWalletIconCaches, buildNetworkRows as selfFetchNetworkRows, fetchAccountGroups as selfFetchAccountGroups, buildTokenRows as selfFetchTokenRows, NetworkSelectDropDown, WalletAccountHeader, PanelTitle, MenuTabHeaderBar, type MenuTabKey, WalletRadioPanels, TradingStationPanel, SendTabPanel, NetworkDetailPanel, MeritInfoPanelReal, type MeritWalletNetworkRow } from './panels';
import TokenPanel from './TokenPanel';
// Panel visibility in this component goes through exactly one engine:
// @sponsorcoin/spcoin-exchange-engine's panelStore, read via PanelGate /
// usePanelVisible. The package's own separate store (panelState.ts) was
// deleted 2026-10-02 — see this package's index.ts header for why a
// second store let a tree toggle silently do nothing.
import ConnectedMessagePanel from './ConnectedMessagePanel';
import { useMeritApprovalMessagePanel, type ApprovalHost } from './approval/useMeritApprovalMessagePanel';
import ConnectedRewardsPanel, { type RewardsHost, type RewardsPanelExtras } from './rewards/ConnectedRewardsPanel';
import AddAccountFlow, { type AddAccountHost } from './account/AddAccountFlow';
import TestAccountsSection, { type TestAccountsApi } from './TestAccountsSection';
import ConnectedSponsorPanel from './sponsor/ConnectedSponsorPanel';
import { ConnectedTradeButton, type TradeHost } from './trade/tradeHost';
import WalletSessionDialogs, { sessionConfigHandlers, type WalletSessionDialog } from './config/WalletSessionDialogs';
import type { WalletSessionHost } from './walletSessionHost';
import AccountDetailScreen, { type AccountDetailHost } from './account/AccountDetailScreen';
import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
import RecoveryPhraseScreen from './RecoveryPhraseScreen';
import WalletOnboardingPanel, { type WalletOnboardingPanelProps } from './WalletOnboardingPanel';
import ConnectedSponsorStakingList, { type SponsorStakingHost } from './sponsor/ConnectedSponsorStakingList';
import { buildSendReceipt, toMessageAccount, type HostTransactionResult } from './receipt/transactionReceipts';
import { isNativePlaceholder } from './send/sendTransfer';
import { useTransactionReceipt } from './receipt/useTransactionReceipt';
import { ActiveAccountProfileContext } from './swap/activeAccountProfile';
import ConnectedAgentSelectDropDown from './AgentSelectDropDown';
import { useNativeToken } from '@sponsorcoin/spcoin-exchange-engine';

// 2026-09-30, Stage B (real trade wiring) — a minimal, dependency-free
// decimal-string -> bigint parser for the SWAP tab's amount inputs. No
// `ethers`/`viem` import here on purpose: this is a portable package (the
// extension's Vite bundle included), and a full BigNumber-parsing library
// is unnecessary weight for one small, well-understood conversion. Returns
// undefined (never throws) for anything not yet a complete number — a
// mid-type state like "12." or "" — so the caller can just skip pushing to
// real ExchangeContext that keystroke and keep the local text as typed.
function parseDecimalAmount(text: string, decimals: number): bigint | undefined {
  const trimmed = text.trim();
  if (!trimmed || trimmed === '.' || !/^\d*\.?\d*$/.test(trimmed)) return undefined;
  const [wholeRaw, fracRaw = ''] = trimmed.split('.');
  const whole = wholeRaw || '0';
  const frac = fracRaw.slice(0, decimals).padEnd(decimals, '0');
  try {
    return BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt(frac || '0');
  } catch {
    return undefined;
  }
}

// 2026-09-21, Path A ("single source of truth") — the 5-tab strip's own
// real panel-tree ids, all confirmed members of RADIO_PANEL_GROUPS'
// MAIN_RADIO_OVERLAY_PANELS group (verified by reading panelGroups.ts
// directly, not assumed), so useEnforceRadioPanelGroups below already
// gives correct mutual-exclusivity for free — no hand-rolled reset
// needed the way the old local-state activeTab did.
const TAB_PANEL_IDS: Record<MenuTabKey, SP_COIN_DISPLAY> = {
  SWAP: SP_COIN_DISPLAY.TRADING_STATION_PANEL,
  SEND: SP_COIN_DISPLAY.SEND_PANEL,
  SPONSOR: SP_COIN_DISPLAY.SPONSORSHIP_PANEL,
  REWARDS: SP_COIN_DISPLAY.MANAGE_SPONSORSHIPS_PANEL,
  CONFIG: SP_COIN_DISPLAY.WALLET_CONFIG_PANEL,
};
const TAB_KEY_BY_PANEL_ID: Partial<Record<SP_COIN_DISPLAY, MenuTabKey>> = Object.fromEntries(
  (Object.entries(TAB_PANEL_IDS) as [MenuTabKey, SP_COIN_DISPLAY][]).map(([tab, id]) => [id, tab]),
);

// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt row 7): the radio-group table with its fallbacks and containers is radioPanelGroups.ts, the
// web app's version, shared with WalletOverlayHost. This file used to keep its own copy, which lacked the STAKED_SP_COIN_PANEL_MODES fallback.
// EMPTY_RADIO_PANEL_GROUPS is manageRadioPanels=false's no-op input (see that prop's doc comment on MeritWalletProps).
import type { AuthenticationType } from './auth/authenticationType';
import { RADIO_PANEL_GROUPS_WITH_FALLBACKS, EMPTY_RADIO_PANEL_GROUPS } from './radioPanelGroups';
import { PersistedTimeoutPicker } from './walletConfigPanelProps';

// 2026-09-15, on request ("the Token/Account/NetworkSelectListDropdown
// chevrons [need] to be linked to the required panels") — which
// ACTIVE_LIST_PANEL_MODES-equivalent list (if any) is currently overlaying
// the active tab's own body. 'account' added once AccountListCard.tsx
// (LOCAL_ACCOUNT_WALLET_LIST's own distinct layout) was built; 'network'
// added once NetworkListTable.tsx (NETWORK_LIST's own distinct layout) was
// built. 'sponsorPayToken'/'sponsorRecipient' added same day, on direct
// correction ("you did not do the sponsor tab") — SponsorshipPanel.tsx has
// the exact same pay-token/recipient pill pair Swap/Send already had wired,
// just missed in the first pass over all five tabs.
type ActiveListMode = WalletListSelectionSlot | null;

// 2026-09-21, Path A — which real id each ActiveListMode value opens.
// Several modes share one list TYPE (sellToken/buyToken/sendToken/
// sponsorPayToken all open the same token list) — distinguishing WHICH
// trade slot a list fills has no panel-tree equivalent and correctly
// is stored with the active-list params by the exchange engine and read by
// `commitSelection`
// below) — same separation the real web app's own TokenSelectDropDown
// already uses between panel visibility and which ExchangeContext field
// a pick writes into.
//
// 2026-09-30, real bug fix (live report, with a trace log — picking a
// token from the ZERO_X "You Receive" dropdown returned to a "Select a
// Token" overlay instead of the Trading Station tab, with the pick
// landing in the wrong panel). Root cause: these used to point at the
// real app's SHARED ids (REMOTE_TOKEN_LIST, REMOTE_ACCOUNT_SEND_LIST,
// REMOTE_ACCOUNT_RECIPIENT_LIST, LOCAL_ACCOUNT_WALLET_LIST, NETWORK_LIST)
// — the exact ids the real web app's own ActiveListPanel.tsx/
// PanelListSelectWrapper.tsx are built on. On any page where both Merit
// Wallet and the real app's own exchange UI are mounted at once (e.g. the
// /Test page), opening one of these from Merit Wallet ALSO activated the
// real app's generic picker, and the two independently reacted to the
// same flags with their own, conflicting close/restore logic — a real
// trace showed the real app's own `PanelListSelectWrapper:handleCommit`
// firing for a click made inside Merit Wallet's own floating window.
// Switched to Merit Wallet's own private ids (spCoinDisplay.ts,
// MERIT_WALLET_*_LIST_OVERLAY — see that enum's own doc comment), one per
// real list TYPE this map opens, so Merit Wallet can never again collide
// with the real app's shared picker. This map's job is unchanged: picking
// a row still writes back through `commitSelection`'s `slot` (captured
// from `activeListMode` before closing) into whichever caller opened the
// list — sellToken/buyToken write the real ExchangeContext token
// contracts, every other slot writes this component's own `selections`
// state keyed by slot. Only WHICH FLAG marks "a list is open" changed.
//
// 2026-09-22, real fix (live report, with a real-web-app screenshot
// comparison) — sendRecipient was wrongly sharing sponsorRecipient's own
// list id, an assumption never checked against the real app: the real
// web app's own Send recipient picker opens the full "browse all known
// accounts" directory, a different, wider list than Sponsor's own
// recipient picker. Preserved here as two distinct private ids
// (MERIT_WALLET_SEND_RECIPIENT_LIST_OVERLAY vs.
// MERIT_WALLET_SPONSOR_RECIPIENT_LIST_OVERLAY) for the same reason.
// Both since retired (2026-10-23, docs/meritFixes.txt §13-14) — neither
// name exists in the enum anymore; sendRecipient now opens the real
// REMOTE_ACCOUNT_SEND_LIST, sponsorRecipient's own mode was removed
// earlier still (2026-10-11) when the Sponsor tab moved onto
// REMOTE_ACCOUNT_RECIPIENT_LIST directly.
// 2026-10-03 — token/account feeds return lowercase addresses, while the web
// app shows EIP-55 checksummed ones (0xEe…EEeE vs 0xee…eeee for the very same
// token). Normalize once, where a pick is committed, so every slot displays the
// same form in both apps. Non-address strings (e.g. "NetworkId : 1") pass through.
function toChecksumAddress(address?: string): string | undefined {
  if (!address) return address;
  try {
    return getAddress(address);
  } catch {
    return address;
  }
}

// 2026-10-22/23, owner investigation (docs/meritFixes.txt) — attempted
// switching all six modes to the real shared ids at once; found Merit
// Wallet already mounts AssetSelectListPanel internally (sharedListHost)
// for the Sponsor tab's own shared-id pickers, and its render-priority
// chain picks sharedListHost over this component's own listOverlay
// whenever ASSET_SELECT_LIST_PANEL is visible — so switching these modes
// to real, properly-nested ids without also unifying the two renderers
// would blank Merit's own network/account/token screens, not just risk a
// cross-page collision. Reverted, then redone one mode at a time instead,
// each verified live before the next: sellToken/buyToken/sendToken first
// (REMOTE_TOKEN_LIST, see paramsForMode's own doc comment below for the
// mechanism and the stale-closure bug found along the way), confirmed
// live; then this round, sendRecipient/account/network, completing the
// set — all six now open through openActiveListPanel (see setActiveList
// below), not a bare openPanel(). account/network additionally needed
// AssetSelectListPanel to gain a host-rendered branch (renderAccountManagement/
// renderNetworkList below) since, unlike the other four, nothing in
// AssetSelectListPanel renders LOCAL_ACCOUNT_WALLET_LIST/NETWORK_LIST through
// PanelListSelectWrapper — those need the host's own wallet/network data,
// not a generic feed.
const LIST_PANEL_ID_FOR_MODE: Record<Exclude<ActiveListMode, null>, SP_COIN_DISPLAY> = {
  sellToken: SP_COIN_DISPLAY.REMOTE_TOKEN_LIST,
  buyToken: SP_COIN_DISPLAY.REMOTE_TOKEN_LIST,
  sendToken: SP_COIN_DISPLAY.REMOTE_TOKEN_LIST,
  sendRecipient: SP_COIN_DISPLAY.REMOTE_ACCOUNT_SEND_LIST,
  account: SP_COIN_DISPLAY.LOCAL_ACCOUNT_WALLET_LIST,
  network: SP_COIN_DISPLAY.NETWORK_LIST,
};

// Sample groups for AccountListCard.tsx (LOCAL_ACCOUNT_WALLET_LIST) — same
// "Doggie | Hot Dog" example already used elsewhere in this file's own
// sample data. No row is flagged isActive: the header must read "Select Account" until a real account is chosen, never a sample address.
const SAMPLE_ACCOUNT_GROUPS: AccountListGroup[] = [
  {
    id: 'hardhat',
    label: 'Merit Wallet',
    isActiveSource: true,
    accounts: [
      { id: '0xf3', symbol: 'Doggie', name: 'Hot Dog', address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266' },
      { id: '0x709', symbol: 'HH_BASE_1', name: 'HH 1', address: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8' },
      { id: '0x3c4', symbol: 'HH_BASE_2', name: 'HH 2', address: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc' },
    ],
  },
  {
    id: 'metamask',
    label: 'MetaMask',
    isActiveSource: false,
    connectLabel: 'Connect',
    accounts: [],
  },
];

// Sample rows for NetworkListTable.tsx (NETWORK_LIST) — one active mainnet
// (Ethereum) plus two more, matching networks.tsx's own "active pinned
// first" convention.
const SAMPLE_NETWORK_ROWS: NetworkListEntry[] = [
  { id: 'eth-mainnet', symbol: 'ETH', name: 'Ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', isActive: true },
  { id: 'polygon', symbol: 'MATIC', name: 'Polygon', address: '0x00000000000000000000000000000000001010' },
  { id: 'hardhat', symbol: 'HH', name: 'Hardhat', address: '0x0000000000000000000000000000000000539b' },
];

export type { MeritWalletNetworkRow };

export interface MeritWalletProps {
  /** Docked (full-height, square corners, no right border — a split-pane
   *  layout) vs. floating/dialog (rounded corners, capped height). Default
   *  false. */
  docked?: boolean;
  /** Drops the web app's 380px cap in favor of a plain 100% width — for a
   *  consumer (like a Chrome side panel) that's already narrow and
   *  user-resizable rather than floating inside a wider page. Default
   *  false. */
  fullWidth?: boolean;
  /** Forwarded to the header's close (X) button. Required — every real
   *  consumer needs a way to close this. */
  onClose: () => void;
  /** Forwarded to WalletHeader's own titleBadgeSrc — override for a
   *  consumer whose default asset path won't resolve (see
   *  WalletHeader.tsx's own doc comment on why the extension needs this). */
  titleBadgeSrc?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Forwarded to WalletHeader's own appType — the real source of truth
   *  for which close icon renders (see that file's own doc comment).
   *  Omit for the default X, correct for the web app and any not-yet-wired
   *  future platform. */
  appType?: APP_TYPE;
  /** Forwarded to WalletHeader's own wwwIconSrc — only meaningful when
   *  `appType === APP_TYPE.EXTENSION`, since only that caller can resolve
   *  the real chrome.runtime.getURL(...) asset path. */
  wwwIconSrc?: string;
  /** Forwarded to WalletHeader's own closeIconSrc — an explicit manual
   *  override, still supported, that takes priority over the
   *  `appType`-driven choice above. See that file's own doc comment. */
  closeIconSrc?: string;
  /** Forwarded to every AssetListRow's own infoIconSrc (see that file's
   *  doc comment) — same "extension bundles its own copy, passes
   *  chrome.runtime.getURL(...)" reasoning as titleBadgeSrc/closeIconSrc
   *  above. Omit to use AssetListRow's own default (the web app's hosted
   *  path), correct when this component is embedded directly in that app. */
  infoIconSrc?: string;
  // 2026-09-14, on request ("persist the merit wallet") — which tab and
  // menu-open state to start on, plus a notification every time either
  // changes. This component still owns the live state itself (a plain
  // useState seeded from these, not a fully controlled prop) — same
  // "uncontrolled, seeded + notified" shape as the rest of this file's own
  // optional callback props (onRefresh, onClose), not a new pattern. A
  // consumer that wants this to survive a remount (spCoinExtension's
  // sidepanel.ts, whose whole page — and this component with it — is torn
  // down every time the Chrome side panel closes, unlike a normal SPA
  // route change) reads its own persisted store for the initial values and
  // writes it again on each callback; this component has no opinion on
  // where or whether that persistence happens.
  initialActiveTab?: MenuTabKey;
  onActiveTabChange?: (tab: MenuTabKey) => void;
  initialMenuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  // Same "uncontrolled, seeded + notified" shape as initialActiveTab/
  // initialMenuOpen just above — NOT a plain pass-through prop (an earlier
  // pass here got this wrong: a raw `openTarget` prop with no internal
  // state means clicking Local/Prod fires onOpenTargetChange but nothing
  // ever re-renders WalletConfigPanel with the new value, since the
  // consumer's own render call that supplied `openTarget` never re-runs on
  // this component's account — the radio would silently stay on the old
  // selection until the whole page next remounted). initialOpenTarget seeds
  // real internal state instead, exactly like activeTab/menuOpen.
  initialOpenTarget?: OpenTarget;
  onOpenTargetChange?: (target: OpenTarget) => void;
  // Real-data injection points, added 2026-09-16 so a consumer with a real
  // feed (spCoinExtension via @sponsorcoin/spcoin-feeds) can replace this
  // component's own hardcoded SAMPLE_NETWORK_ROWS/SAMPLE_ACCOUNT_GROUPS.
  // Omit either (or both) to keep today's placeholder behavior unchanged.
  // 2026-09-29 update: this component now DOES depend on
  // @sponsorcoin/spcoin-feeds directly (see the self-fetch props below) —
  // these explicit props still take priority over self-fetching either way,
  // so a caller that already has its own real feed (spCoinExtension) is
  // completely unaffected by that; only a caller supplying neither this
  // prop nor chainId still gets the original placeholder-sample behavior.
  networkRows?: MeritWalletNetworkRow[];
  accountGroups?: AccountListGroup[];
  // 2026-09-16, on request ("find the icons like the web page finds them
  // and put them in the list like TokenListDropDown and AccountListDropDown")
  // — the shared "TOKEN META" list (REMOTE_TOKEN_LIST) had no equivalent
  // real-data injection point at all yet (unlike networkRows/accountGroups
  // above); a consumer with a real token feed (@sponsorcoin/spcoin-feeds/
  // tokens) passes rows here, each optionally carrying `iconSrc` (see
  // AssetListRow.tsx's own doc comment) for a real logo. Omit to keep
  // today's SAMPLE_TOKEN_ROWS placeholder unchanged. REMOTE_ACCOUNT_AGENT_
  // LIST/REMOTE_ACCOUNT_RECIPIENT_LIST need no separate prop — they now
  // reuse accountGroups' own accounts (see effectiveAccountGroups below),
  // which already carry real icons once a caller supplies real accountGroups.
  tokenRows?: AssetListEntry[];
  // 2026-10-23 — recipientRows removed: its only purpose was seeding
  // Merit's own sendRecipient list rendering (FEED_TYPE.REMOTE_RECIPIENT_
  // ACCOUNTS), already replaced by the shared package's own
  // PanelListSelectWrapper/REMOTE_ACCOUNT_SEND_LIST feed (docs/
  // meritFixes.txt §12) — nothing in this file reads a resolved recipient
  // list anymore.
  /** 2026-10-09 -- turns the Rewards tab live (Trading / Staked / Pending with estimate and claim, Auto Refresh), the same card and data hook the web app runs. Omit for the static table. */
  rewardsHost?: RewardsHost;
  /** What the host adds around the Rewards card: a shared Auto Refresh store, the Deposit Account row's starting address, a refresh registration hook and a trace sink (all data or functions). */
  rewardsExtras?: RewardsPanelExtras;
  /**
   * 2026-10-09 -- turns the Sponsored Recipient Accounts list (opened from Rewards > Unstake) live, with Un-Stake: the web app's card and confirm popup over the host's
   * chain reads and one send-an-unstake-transaction function. 
   */
  stakingHost?: SponsorStakingHost;
  /** The host's real active account. When provided (even as ''), it alone decides which row is active: '' means none, so the header reads "Select Account". Omit to keep each row's own isActive flag (the extension's own feed). */
  activeAccountAddress?: string;
  /** 2026-10-13: the active account's profile as the host knows it (any wallet's account, not only the keystore's). The header's account pill shows it when no listed row is the active one (a MetaMask account is not in the keystore list). */
  activeAccountName?: string;
  activeAccountSymbol?: string;
  activeAccountLogoURL?: string;
  // 2026-09-29 — self-fetch opt-in. Supplying chainId is the real signal
  // "please fetch real data yourself" (via @sponsorcoin/spcoin-feeds,
  // generalized from spCoinExtension's own already-proven fetch logic —
  // see meritWalletDataFetch.ts's own doc comment): whichever of
  // networkRows/accountGroups/tokenRows above the caller did
  // NOT also supply explicitly gets self-fetched instead of falling back to
  // SAMPLE_*. Omit chainId entirely and nothing here changes — same
  // placeholder-or-explicit-prop behavior as before this existed. A caller
  // that already supplies all four explicitly (spCoinExtension today) needs
  // neither chainId nor baseUrl — explicit props always win regardless.
  chainId?: number;
  // Same convention as fetchJson.ts's own FetchJsonConfig.baseUrl — '' by
  // default (same-origin, the web app's own case). Only meaningful together
  // with chainId; ignored otherwise.
  baseUrl?: string;
  // Where self-fetched icons get cached — defaults to a safe, zero-config
  // in-memory fallback (createInMemoryIconCacheStorage) if omitted. A
  // caller wanting real persistence across sessions passes
  // createLocalStorageIconCacheStorage() (or, for an extension, its own
  // chrome.storage.local-backed adapter) from @sponsorcoin/spcoin-feeds/
  // shared. Ignored when chainId is omitted (nothing to cache).
  storage?: IconCacheStorage;
  // 2026-09-29 — self-fetch has no way to know "the caller wants fresh
  // data now" on its own (it only runs once per chainId/baseUrl change,
  // by design — see that effect's own doc comment). refreshToken is that
  // signal: bump it (e.g. ++value) from the SAME onRefresh handler that
  // already exists below, and self-fetch re-runs with forceRefresh:true
  // for whichever of the 4 row lists it owns (an explicit prop is still
  // never touched, refresh or not — same "explicit prop always wins"
  // rule as everywhere else). Omit entirely if the caller never refreshes
  // self-fetched data specifically (e.g. it only supplies explicit props,
  // or has nothing self-fetched to refresh) — self-fetch still runs once
  // on mount either way.
  refreshToken?: number;
  // 2026-09-16, on live report ("assetSelectDropDown is supposed to...
  // return the address back to the caller... works in the web page, but
  // not in the extension") — root cause: onSelect on every list row (see
  // closeListOverlay's own doc comment below) only ever closed the
  // overlay, it never told the caller WHICH row was picked. That was an
  // honest limitation while accountGroups/networkRows were both hardcoded
  // SAMPLE_* data with no real "become active" concept behind them — once
  // a consumer supplies real accountGroups/networkRows (spCoinExtension
  // via @sponsorcoin/spcoin-feeds), there IS something real to commit a
  // pick into, this component just never grew the callback to do it. The
  // real app's own (non-portable) MeritWallet.tsx never hit this because
  // its own AssetSelectDropDown/ActiveListPanel wiring goes straight
  // through ExchangeContext, not through this package at all. Omit either
  // to keep today's inert (close-only) behavior.
  /** A row of the account list was chosen. `groupId` is the approver's group the row sits in (the wallet's backend id) when the list is the per-approver list. */
  onAccountRowSelect?: (accountId: string, groupId?: string) => void | boolean | Promise<boolean | void>;
  onNetworkRowSelect?: (networkId: string) => void;
  // 2026-09-16, on request ("when the avatar.png is selected we should get
  // ACCOUNT_PANEL with the address sent as a parameter to open the
  // avatar.png and the info.json to populate the tables") — fired when
  // WalletAccountHeader's own avatar icon is clicked (distinct from the
  // rest of the row, which still opens the account LIST via
  // onAccountRowSelect above — same icon-vs-row split NetworkSelectDropDown
  // already has). The caller's job to actually fetch avatar/info.json for
  // this address and pass the result back via `accountDetail` below — this
  // component has no feed dependency of its own, same boundary every other
  // real-data prop here draws.
  onAccountIconClick?: (address: string) => void;
  /** 2026-10-08 (table row 21): the "Add a Wallet/Account" button at the foot of the account list. Omit it and the list shows the button inert, as before. */
  onAddAccount?: () => void;
  /** Data to render in the account-details overlay once
   *  onAccountIconClick's caller has resolved it. `address` gates which
   *  click this answers — this component shows a loading state for any
   *  address that doesn't (yet) match the one currently being viewed,
   *  rather than briefly flashing a stale previous account's details. */
  accountDetail?: {
    address: string;
    avatarSrc?: string;
    name?: string;
    symbol?: string;
    email?: string;
    website?: string;
    description?: string;
    /** The record's recipientNetwork (chain ids), kept when the profile is saved. */
    recipientNetwork?: number[];
  } | null;
  /**
   * 2026-10-09 -- lets the user edit the public profile of the wallet's own accounts from Account Details (name, symbol, email, website, description, avatar), the web
   * app's account editor over the host's signer. Omit and Account Details stays read-only.
   */
  /** docs/meritMigration.txt row 14: the account detail screen (avatar, profile table, Private Key row) over this host's data and functions. */
  accountDetailHost?: AccountDetailHost;
  /** 2026-10-10 (docs/design/accountAuthDesign.txt section 17 item 2): what the shared Add a Wallet/Account flow does for this host. When given, the list's button opens the shared flow; otherwise onAddAccount is called as before. */
  addAccountHost?: AddAccountHost;
  // 2026-09-16, on request ("do the same for the info.png in the lists")
  // — every AssetListRow already had a real, unwired `onInfoClick` (see
  // that file's own doc comment); this is the same icon-click-opens-a-
  // detail-view mechanism as onAccountIconClick/accountDetail above,
  // applied to every list row's own (i) info button instead of just the
  // header avatar. Account-shaped rows (Active Account Selection/Select
  // Recipient/Select Agent) reuse onAccountIconClick/accountDetail
  // unchanged, since they're the same entity shape.
  // 2026-10-23 — onTokenIconClick (the token-row equivalent) removed:
  // its only caller was Merit's own "Select a Token" list rendering,
  // which this same date's redesign (docs/meritFixes.txt §11) replaced
  // with the shared package's generic PanelListSelectWrapper — nothing
  // calls this anymore.
  // 2026-10-26 — `tokenDetail` itself removed too: TOKEN_PANEL's own
  // overlay now renders TokenPanel.tsx (the package's panel-tree-aware
  // screen, reading TOKEN_META_DATA/TOKEN_LOGO visibility directly the way
  // AccountDetailScreen reads its own ACCOUNT_LOGO/ACCOUNT_META_DATA pair —
  // see tokenDetailOverlay's own doc comment), which has no such override
  // prop and hydrates itself. No host (web app or extension) ever actually
  // supplied this, confirmed by direct search.
  // 2026-09-16, same request, network list's own equivalent — but unlike
  // onAccountIconClick above, this does NOT fire from
  // Select Network's own list rows (2026-09-17, on live report: a list
  // row's icon commits that row, same as every other list in this file —
  // see the network row mapping's own doc comment below for why the
  // original "icon opens details" wiring there was wrong). It fires only
  // from the WALLET_NETWORK_HEADER trigger pill's own icon, once a network
  // is already active — same "preview the currently selected entity" role
  // that trigger pill's icon plays for accounts/tokens. Fires purely as a
  // notification either way — the row it targets already carries
  // everything NetworkDetailPanel shows (networkRows is fully in-memory, no
  // per-network fetch exists), so this component renders straight from
  // that row itself rather than waiting on a caller round-trip. Omit if the
  // caller has no use for the click.
  onNetworkIconClick?: (networkId: string) => void;
  // 2026-09-22, Phase B.2 Stage 4 follow-up ("build the extension-side
  // signer wrapper... do it" — real trade-execution UI) — the SEND tab's
  // amount field, same "controlled prop, caller owns the real state" shape
  // ConfigSlippagePanel.tsx's bps/onBpsChange already established: this
  // component has no ExchangeContext/signing access of its own, so it
  // can't own the value itself. `selections.sendToken`/`selections.
  // sendRecipient` (this file's own internal picker state, unchanged)
  // already resolve real addresses — passed as arguments to onSendSubmit
  // below rather than exposed as a separate prop, since nothing outside
  // this component needs them except at the moment of submit.
  sendAmount?: string;
  onSendAmountChange?: (value: string) => void;
  /** True while a real send is in flight — passed straight to SendTabPanel's submitLabel/disabled state. */
  sendBusy?: boolean;
  /**
   * Fires on the SEND tab's submit click. `tokenAddress` is present for an
   * ERC20 send (omitted for native); `decimals` is the picked token's real
   * decimals (resolved from the token-list row, Stage 32's follow-up), the
   * correct amount-to-wei source this component's own PickedEntry now carries
   * — a caller wiring ERC20 sends should pass both through to its wei parser.
   */
   /** May return the outcome (hash + receipt, or a failure message): the wallet then shows the same result card the web app shows. */
   onSendSubmit?: (params: { recipientAddress?: string; tokenAddress?: string; amount: string; decimals?: number; tokenSymbol?: string }) => void | Promise<HostTransactionResult | void>;
  /**
   * 2026-10-11 (docs/design/accountAuthDesign.txt section 15.7, item W1): the host's WALLET: every key backend behind one object (src/wallet/wallet.ts). When given, the lock screen, the lock button, the
   * authentication type and the Wallet Security section are derived from it, and the delete-wallet / change-password buttons are removed for a backend that cannot do them. A prop the host passes itself
   * still wins over the derived one, so a host can move over one prop at a time.
   */
  wallet?: Wallet;
  /**
   * 2026-10-15 (docs/design/spcoinPackagesDesign.txt 8.5.7): the PLATFORM this wallet runs on: copy to the clipboard, open a URL, save a file, remember a small preference, tell when the window came back to the front. A browser host (the web app, the extension,
   * a WebView) leaves it out and gets the DOM implementation; a host with another device injects its own. The component never calls window, document, navigator or localStorage for these.
   */
  platform?: MeritPlatform;
  /**
   * 2026-10-12 (docs/design/accountAuthDesign.txt section 17 items 6 / 7): with `wallet` AND this, the account list is the per-approver list derived from the wallet (one group per backend, badges ACTIVE / Install / Unlock / Connect /
   * INACTIVE), choosing a row connects it through the one connect operation, and a failed connect is shown in the list's banner. The host supplies what it owns: setting / clearing its active account, where an approver is
   * installed from, how an approver is unlocked. Passing it asks for the derived list: it replaces the host's own accountGroups / onAccountRowSelect once the list has loaded (they stay as the fallback until then).
   */
  approverHost?: ApproverHost;
  /** The banner above the account list (a failed connect). Derived when `approverHost` is given; a host may also set it. */
  accountListNotice?: string;
  /** The wallet that signs for the active account (derived from `wallet` when the host does not pass it), shown as the account header's tooltip. */
  activeWalletName?: string;
  /** 2026-10-13 (owner request): the id of the wallet that signs for the active account (derived from `wallet` when the host does not pass it). The wallet pill under the tabs shows its icon and name, read from public/assets/wallets. */
  activeWalletId?: string;
  /** The wallet THIS app is (web app: its keystore, extension: its vault). The wallet pill on the add and wallet-list screens names it, and the add flow adds to it by default: the host's identity, not the active account's wallet (the active account may belong to another wallet). A host with an `approverHost` may leave it out: approverHost.nativeWalletId is used. */
  nativeWalletId?: string;
  /** Which wallets are connected to this app, by wallet asset folder (merit, meritExtension, metamask, ledger, trezor): the wallet list's Connected / Disconnected buttons. Derived from `approverHost` when the host does not pass it. */
  walletConnection?: Record<string, boolean>;
  /** Disconnect a wallet of the wallet list, by asset folder. Derived from `approverHost` when the host does not pass it. */
  onDisconnectWallet?: (slug: string) => void;
  /** Show the wallet pill (WalletSelectDropDown) just under the tabs: its down chevron opens the wallet list (REMOTE_WALLET_LIST), its icon opens the active wallet's panel (WALLET_PANEL). Default true. */
  showWalletSelect?: boolean;
  /** Where the wallet asset files (public/assets/wallets) are served from: this page's own origin by default; a host on another origin (the extension) passes the web app's address. */
  walletAssetBaseUrl?: string;
  /** What the component may derive from `wallet` (default: everything). A host that has its own lock gate (the web app) leaves out 'lock' and 'logoff'. */
  walletDerives?: readonly WalletDerivation[];
  /** The trade screens' host data and functions (the Swap tab and the Sponsor tab trade through one path): the trading provider, a trace sink, how a recipient's site opens and one hook for the confirm popup's state. The component draws the screens. */
  tradeHost?: TradeHost;
  // 2026-09-29, real bug fix (live report — "the tab stays on Rewards no
  // matter what I click", traced via a real trace log to
  // useEnforceRadioPanelGroups:MAIN_RADIO_OVERLAY_PANELS:closeOther firing
  // 15+ times in a row on the exact same panel — thrashing, not a single
  // clean resolution). Root cause: this component calls
  // useEnforceRadioPanelGroups itself (below) so the EXTENSION — which has
  // no separate host component — gets working radio-panel enforcement for
  // free (see this file's own 2026-09-21 doc comment on activeMainOverlay
  // for that original reasoning). The web app was never meant to hit this:
  // it already has its own components/views/RadioOverlayPanelHost.tsx
  // calling the exact same hook, globally, on the exact same shared
  // panel-tree state. Once the web app started rendering THIS component
  // too (single-source-of-truth convergence), that became TWO independent
  // instances of the same conflict-resolution logic racing on shared
  // state, each with its own private lastWinnerRef/previousVisibleKeysRef
  // unaware of the other — exactly what produces the thrashing above
  // instead of one clean resolution.
  // manageRadioPanels (default true, matching every existing caller's
  // actual behavior, including the extension) lets a host that ALREADY
  // owns this enforcement (the web app) opt out of the duplicate; the
  // extension's sidepanel.ts omits this prop entirely and keeps today's
  // self-sufficient behavior. Scoped to useEnforceRadioPanelGroups only —
  // the trace evidence points specifically at IT thrashing, not
  // useEnforcePanelAncestorVisibility (which takes no arguments and has no
  // equivalent disable hook of its own; leaving it called unconditionally
  // here, unchanged, rather than widening this fix into a second package).
  manageRadioPanels?: boolean;
  // 2026-10-03 — real token balances for EVERY row that shows one (Swap sell/buy/
  // Uniswap receive, Send, Sponsor pay). The package's rows hard-coded
  // "Balance: 0", so a host without wagmi (the extension) never showed a real
  // balance anywhere; the web app doesn't hit this only because its overlayHost
  // renders its own components with wagmi reads. Caller-supplied as a FETCHER
  // (not text) because the picked token and the active account both live inside
  // this component. Omit `tokenAddress` for the native token. Resolve undefined
  // when unavailable. An explicit sellBalanceText/buyBalanceText prop still wins.
  fetchBalance?: FetchBalance;
  // 2026-09-29, real bug fix — this component had ZERO rendering for
  // PASSWORD_PANEL: whenever the wallet is locked, panelTreeCallbacks.ts's
  // own centralized guard (see its own doc comment) silently redirects
  // EVERY openPanel(anyTab) call to PASSWORD_PANEL instead — real, working
  // gate behavior, confirmed live via trace log (isGateOpen: false,
  // willRedirectToPasswordPanel: true on every click). But since
  // PASSWORD_PANEL isn't a member of TAB_PANEL_IDS, derivedTab came back
  // undefined and activeTab fell back to whatever tab was active before
  // the lock, forever — the wallet correctly refused every action, but
  // silently, with no UI telling the user why or letting them unlock.
  // These props wire in @sponsorcoin/spcoin-panels' own portable
  // PasswordPanel (already used by the web app's real, non-portable
  // components/views/RadioOverlayPanels/PasswordPanel.tsx as a thin
  // wrapper around the exact same component) so THIS component can show
  // it directly when activeMainOverlay is PASSWORD_PANEL, instead of
  // falling through to stale tab content. All optional/omittable, same
  // "omit for inert behavior" convention as every other real-action prop
  // here — a caller that never wires these simply won't show anything
  // when locked (today's exact behavior), not a regression.
  passwordMode?: 'checking' | 'setup' | 'unlock';
  /** The artwork of the login page: an image URL (the data); the component draws it. */
  passwordIconSrc?: string;
  /** How the wallet answers a write's approval: the host checks the password (`unlock`) and may gate a debug step. The component draws the approval screen itself. */
  approvalHost?: ApprovalHost;
  /**
   * 2026-10-08 (table row 23): the wallet is locked (or has no wallet yet), so show the password screen in place of everything else, whatever the panel tree says.
   * The lock gate lives here, in the component; whether and where the wallet is shown at all stays with the host (a layout gate).
   */
  walletLocked?: boolean;
  /** Shown as a "Forgot password? Reset wallet" link under the lock screen; the host confirms and wipes (the wallet can only be restored from its Secret Recovery Phrase). */
  onResetWallet?: () => void;
  passwordErrorText?: string;
  /** 2026-10-14: a neutral line above the login form (the extension: a site is waiting to connect). */
  passwordNoticeText?: string;
  // 2026-10-02, real bug fix — forwards the confirm field's value alongside
  // the password, matching PasswordPanel's own onSubmit (see its doc comment
  // for why). Without the second argument a host could not perform the
  // setup-mode confirmation check at all, which is what made the web app's
  // "Passwords do not match." fire on every setup attempt.
  onPasswordSubmit?: (password: string, confirmPassword: string) => void;
  passwordSubmitting?: boolean;
  /**
   * 2026-10-13 (first-run wallet creation): a NEW wallet's Secret Recovery Phrase, set by the host right after the password is created. While it is set, the login page shows the shared
   * RecoveryPhraseScreen (the words, a copy icon, "I have saved it") in place of the password form; the host keeps the wallet gated until onRecoveryPhraseSaved fires.
   */
  recoveryPhrase?: string;
  onRecoveryPhraseSaved?: () => void;
  /**
   * 2026-10-19 (docs/meritMigration.txt rows 27 / 28: a host passes data and functions, it never draws a wallet screen): first-run setup. While this is set the component draws the
   * "Set up your wallet" screen (create a wallet, import by recovery phrase, restore a backup) INSTEAD of the wallet, and the host only supplies what the screen calls. The host clears it
   * (sets undefined) when onDone fires and the vault exists.
   */
  onboarding?: WalletOnboardingPanelProps;
  // 2026-09-30, real bug fix (live report — "balanceOf... not working" on
  // the SWAP tab). Real balance TEXT, caller-supplied — this can't just be
  // fetched inside this component (wagmi's usePublicClient, which a real
  // balance read needs, throws without a WagmiProvider ancestor — the
  // extension has none). Omit for today's "Balance: 0" default
  // (ExchangeTradingPair's own fallback), same "omit for inert behavior"
  // convention as every other real-data prop here.
  //
  // 2026-09-30 — onSellTokenChange/onBuyTokenChange REMOVED (see the panel-
  // tree-sync bug writeup near sellTokenContract's own declaration below).
  // sell/buy token selection now lives on the real, shared ExchangeContext
  // (useSellTokenContract/useBuyTokenContract) instead of this component's
  // own local `selections` state, so a caller that needs the picked address
  // (e.g. this wrapper's own balance fetch) can just read the SAME shared
  // context directly — it no longer needs this component to report it via
  // callback.
  sellBalanceText?: string;
  buyBalanceText?: string;
  // 2026-09-30, Stage B (real trade wiring, live report — "you have the
  // uniswap panel selected in the panel tree, why is it not in the GUI").
  // Both opaque — real content is wagmi/Merit-signer coupled (live quotes,
  // real swap execution), so it can't live inside this always-shared
  // component (same reasoning as sellBalanceText above). Each already
  // self-gates on its own real panel-tree node (ZERO_X_TRADE_BUTTON /
  // UNI_SELECT_PANEL) when built from the real web-app components, so this
  // component doesn't add a second visibility check on top — omit either
  // for no content (the extension today), not a regression.
  /** 2026-10-05, on request — the 0X engine's trade/submit
   *  button lives on its own dedicated ZERO_X_TRADE_BUTTON
   *  panel-tree node (the old CONNECT_TRADE_BUTTON, which
   *  carried the wallet-connection functionality too, was
   *  removed from the app on the same request). This is that
   *  button's opaque slot — same shape and same self-gating
   *  reasoning as the note above (the web app's ZeroXTradeButton
   *  self-gates on ZERO_X_TRADE_BUTTON when built from the real
   *  web-app components, and the shared ExchangeTradingPair
   *  additionally gates this slot on its own panel-tree node,
   *  so this component adds no visibility check of its own
   *  for it either). */

  // 2026-09-30, real bug fix (live report — "none of the radio buttons
  // checkboxes or other buttons in the config panel work"). This
  // component's own CONFIG tab renders WalletConfigPanel (below) but,
  // until now, only ever forwarded openTarget/onOpenTargetChange into it
  // — every other real setting rendered fully inert. These props mirror
  // WalletConfigPanelProps 1:1 (see that file), letting a real host (the
  // web app's components/views/MeritWallet.tsx, via its own
  // useMeritWalletConfig() hook — lib/spCoinWallet/useMeritWalletConfig.tsx
  // — the SAME real logic components/views/WalletConfig.tsx already used)
  // wire real values through. All optional/omittable — a caller that
  // never passes these (the extension today) keeps WalletConfigPanel's
  // own inert-decorative defaults, not a regression.
  // configPasswordMode/onConfigPasswordModeChange (not passwordMode/
  // onPasswordModeChange) — this component's own passwordMode prop
  // already means something else entirely (the password-GATE UI state:
  // 'checking'|'setup'|'unlock', see its own doc comment above) — reusing
  // that name for the Config tab's separate password-PROTECTION-MODE
  // setting would silently collide.
  configPasswordMode?: ConfigPasswordMode;
  onConfigPasswordModeChange?: (mode: ConfigPasswordMode) => void;
  /** The persisted-password time limit in hours (the data) and what a change does (the action): the component draws the Time Limit picker itself. Omit both and there is no picker. */
  configPersistedTimeoutHours?: number;
  onConfigPersistedTimeoutHoursChange?: (hours: number) => void;
  configPasswordDescription?: string;
  configMandatorySecurity?: boolean;
  onConfigMandatorySecurityChange?: (mandatory: boolean) => void;
  configMandatoryApproval?: boolean;
  onConfigMandatoryApprovalChange?: (mandatory: boolean) => void;
  configPasswordResetPanelContent?: React.ReactNode;
  configSyncMode?: ApplicationSyncMode;
  onConfigSyncModeChange?: (mode: ApplicationSyncMode) => void;
  configSyncDescription?: string;
  configLocation?: MeritWalletLocation;
  onConfigLocationChange?: (location: MeritWalletLocation) => void;
  configShowBackgroundPage?: boolean;
  onConfigShowBackgroundPageChange?: (show: boolean) => void;
  configModalMode?: boolean;
  onConfigModalModeChange?: (modal: boolean) => void;
  configSecurityPanelContent?: React.ReactNode;
  /** The Config tab's "Who signs" section (derived from `wallet`: which holder signs for the active account, and the switch). */
  configSigningPanelContent?: React.ReactNode;
  /** The Config tab's "Backup file" section (derived from `wallet` when its key-keeping backend can make a backup file). */
  configBackupPanelContent?: React.ReactNode;
  /** The Config tab's Test Accounts section (loads Hardhat's standard accounts into the host's store); the component draws it. Omit to hide it. */
  configTestAccounts?: { api: TestAccountsApi; authenticationType?: AuthenticationType; onChanged?(): void };
  /** 2026-10-08: how this wallet authenticates locally: KEYSTORE (web app, server keystore) or VAULT (extension). Set by the host. */
  authenticationType?: AuthenticationType;
  configUniSelectVisible?: boolean;
  onConfigUniswapEngineChange?: (checked: boolean) => void;
  /** The 0X engine checkbox's state (the host's own
   *  usePanelVisible(ZERO_X_SELECT_PANEL) read — the engine's
   *  primary panel-tree flag since CONNECT_TRADE_BUTTON was
   *  removed 2026-10-05). */
  configZeroXEngineVisible?: boolean;
  onConfig0xEngineChange?: (checked: boolean) => void;
  configResetPanelsContent?: React.ReactNode;
  /** A host-supplied section shown last on the Config tab (the web app's dev-only shared-libraries sync/build control); the extension supplies none. */
  configDevToolsContent?: React.ReactNode;
  configExtensionChannel?: MeritExtensionChannel;
  onConfigExtensionChannelChange?: (channel: MeritExtensionChannel) => void;
  configExtensionDownloadPath?: string;
  /** 2026-10-08: the Config tab's Logoff / Reset Password / Delete Account buttons (inert when omitted). */
  onConfigLogoff?: () => void;
  onConfigResetPassword?: () => void;
  onConfigDeleteAccount?: () => void;
  /** The Config tab's Delete Wallet button (below Reset Password); the host asks for the password and wipes. */
  onConfigDeleteWallet?: () => void;
  /** docs/meritMigration.txt row 18: Reset Password and wallet deletion over host functions; the component draws the dialogs. */
  walletSession?: WalletSessionHost;
}

// 2026-10-03 — accountEntryToSpCoinAccount (the AccountListEntry ->
// spCoinAccount bridge for AccountListRewardsPanel, added 2026-09-24) removed:
// the header account list now renders AccountListCard directly, which takes
// AccountListEntry as-is. AccountListRewardsPanel remains exported by the
// package for hosts that want the reward-aware list.

function MeritWalletInner({
  docked = false,
  fullWidth = false,
  onClose,
  titleBadgeSrc,
  onRefresh,
  refreshing,
  appType,
  wwwIconSrc,
  closeIconSrc,
  infoIconSrc,
  initialActiveTab,
  onActiveTabChange,
  initialMenuOpen,
  onMenuOpenChange,
  initialOpenTarget,
  onOpenTargetChange,
  networkRows,
  accountGroups,
  accountListNotice,
  activeWalletName,
  activeWalletId,
  nativeWalletId,
  walletConnection,
  onDisconnectWallet,
  showWalletSelect = true,
  walletAssetBaseUrl,
  wallet,
  tokenRows,
  rewardsHost,
  rewardsExtras,
  stakingHost,
  accountDetailHost,
  addAccountHost,
  activeAccountAddress,
  activeAccountName,
  activeAccountSymbol,
  activeAccountLogoURL,
  chainId,
  baseUrl,
  storage,
  refreshToken,
  onAccountRowSelect,
  onNetworkRowSelect,
  onAccountIconClick,
  onAddAccount,
  accountDetail,
  onNetworkIconClick,
  sendAmount,
  onSendAmountChange,
  sendBusy,
  onSendSubmit,
  tradeHost,
  manageRadioPanels = true,
  fetchBalance,
  passwordMode = 'unlock',
  passwordIconSrc,
  approvalHost,
  walletLocked,
  onResetWallet,
  passwordErrorText,
  passwordNoticeText,
  onPasswordSubmit,
  passwordSubmitting,
  recoveryPhrase,
  onRecoveryPhraseSaved,
  sellBalanceText,
  buyBalanceText,
  configPasswordMode,
  onConfigPasswordModeChange,
  configPersistedTimeoutHours,
  onConfigPersistedTimeoutHoursChange,
  configPasswordDescription,
  configMandatorySecurity,
  onConfigMandatorySecurityChange,
  configMandatoryApproval,
  onConfigMandatoryApprovalChange,
  configPasswordResetPanelContent,
  configSyncMode,
  onConfigSyncModeChange,
  configSyncDescription,
  configLocation,
  onConfigLocationChange,
  configShowBackgroundPage,
  onConfigShowBackgroundPageChange,
  configModalMode,
  onConfigModalModeChange,
  configSecurityPanelContent,
  configSigningPanelContent,
  configBackupPanelContent,
  configTestAccounts,
  configUniSelectVisible,
  onConfigUniswapEngineChange,
  configZeroXEngineVisible,
  onConfig0xEngineChange,
  configResetPanelsContent,
  configDevToolsContent,
  configExtensionChannel,
  onConfigExtensionChannelChange,
  configExtensionDownloadPath,
  onConfigLogoff,
  onConfigResetPassword,
  onConfigDeleteAccount,
  onConfigDeleteWallet,
  walletSession,
}: MeritWalletProps) {
  // 2026-09-21, Path A — activeTab is now DERIVED from the real engine's
  // activeMainOverlay (the same computed value PanelBootstrap itself
  // reads), not owned local state. useEnforceRadioPanelGroups/
  // useEnforcePanelAncestorVisibility are the same two hooks the web
  // app's own RadioOverlayPanelHost.tsx wires — this component is the
  // one place that composes everything for the extension (see this
  // file's own top-of-file doc comment), so they're called here rather
  // than adding a second host component sidepanel.ts would need to
  // remember to mount.
  const {
    activeMainOverlay,
    openPanel,
    closePanel,

    setPanelVisible: setRealPanelVisible,
  } = usePanelTree();
  // 2026-10-29, on request ("it should at least open in message panel [...]
  // Yes, move it into Message Panel") — replaces <ApprovalResponder
  // host={approvalHost} /> (see this file's own git history): same
  // decision logic, but it publishes to every ConnectedMessagePanel
  // instance via pendingApprovalMessageStore instead of rendering its own
  // standalone backdrop over everything — see that hook's own doc comment
  // for why this call's return value (void) isn't what wires it up.
  useMeritApprovalMessagePanel(approvalHost);
  // 2026-10-23, owner investigation (docs/meritFixes.txt) — the sell/buy/
  // send token pickers now open through the SAME mechanism Group 2's
  // pickers (Sell/BuySelectPanelLayoutContainer.tsx, AgentSelectDropDown.tsx,
  // RecipientSelectDropDown.tsx) already use successfully, instead of the
  // raw openPanel()+local activeListMode path every other mode still uses.
  // openActiveListPanel explicitly opens ASSET_SELECT_LIST_PANEL/
  // ACTIVE_LIST_PANEL/the mode flag together (no reliance on a reactive
  // ancestor-auto-reveal hook) and stashes the params sharedListHost's own
  // PanelListSelectWrapper reads — the thing a bare enum swap alone did not
  // supply, confirmed live (REMOTE_TOKEN_LIST alone opened nothing at all).
  const { openActiveListPanel, closeActiveListPanel } = useOpenActiveListPanel();
  // 2026-10-09: result cards for Send / Sponsor. The active account's profile is filled in once the account rows are resolved (further down), and read at
  // the moment a result arrives.
  const showReceipt = useTransactionReceipt();
  const activeProfileRef = useRef<{ address?: string; name?: string; symbol?: string; logoURL?: string } | undefined>(undefined);
  // 2026-09-30, real bug fix (live report — "the panel tree has closed
  // panels but they did not close in the GUI... each gate should be
  // directly connected to its associated panel"). Confirmed by reading the
  // real web app's TradingStationPanel: SELL_SELECT_PANEL/ZERO_X_SELECT_
  // PANEL/ZERO_X_CONFIG_SLIPPAGE_PANEL/SWAP_ARROW_BUTTON are independent panel-
  // tree nodes gated via usePanelTree().isVisible(ID) there — none of them
  // touch wagmi, so they're safe to gate directly here too, the same way
  // STAKING_CONTROLLER_PANEL already is elsewhere in this file. Root cause
  // was NOT a duplicate/out-of-sync ExchangeContext (this component already
  // shares the one real instance via usePanelTree() above) — it was that
  // nothing downstream of TradingStationPanel's own sellVisible/buyVisible/
  // arrowVisible/buyPrefixContent props (all real, all already supported by
  // ExchangeTradingPair.tsx) was ever fed a value, so they sat on their
  // hardcoded-true/absent defaults regardless of tree state. See
  // docs/design/extensionPlan.txt section 6 section 2.1 for the full research.
  //
  // sell/buy token selection also moves here, off this component's own
  // local `selections` state (see commitSelection's own doc comment below)
  // and onto the real shared ExchangeContext via useSellTokenContract/
  // useBuyTokenContract — safe in both hosts (the extension's
  // LiteExchangeProvider and the web app's ExchangeProvider both populate
  // the same real ExchangeContextState these hooks read), and lets the web
  // app wrapper read the SAME picked token directly for its own balance
  // fetch instead of needing this component to report it via callback
  // (onSellTokenChange/onBuyTokenChange, now removed — see MeritWalletProps'
  // own doc comment).
  const [sellTokenContract, setSellTokenContract] = useSellTokenContract();
  const [buyTokenContract, setBuyTokenContract] = useBuyTokenContract();
  const { data: slippage, setBps: setSlippageBps } = useSlippage();
  // 2026-10-05, ZERO_X_SELECT_PANEL parity (live report: the web
  // app's buy row reads "You Receive ± 2.00% [cog]", the
  // extension's read plain "You Receive" with no cog) — the web
  // app's own composition feeds the shared ExchangeTradingPair
  // buyLabel/onCogClick from useBuySelectPanelProps
  // (BuySelectPanelLayoutContainer.tsx: the label mirrors
  // SlippageComponent.tsx's !isSell/plain=false branch; the cog
  // is the buy row's only entry point into ZERO_X_CONFIG_SLIPPAGE_PANEL).
  // This component's SWAP-tab composition never supplied either,
  // so the shared pair fell back to its plain 'You Receive:'
  // default with no cog. Both are computed here now — same
  // engine hooks, same call shape — so both hosts render the
  // same row. useSlippage() always resolves (its own default is
  // { bps: 200, percentage: 2, percentageString: '2.00%' }), so
  // percentageString needs no fallback.
  const [tradeDirection] = useTradeDirection();
  const slippageCogVisible = usePanelVisible(SP_COIN_DISPLAY.ZERO_X_CONFIG_SLIPPAGE_PANEL);
  const handleSlippageCog = useCallback(() => {
    if (slippageCogVisible) {
      closePanel(SP_COIN_DISPLAY.ZERO_X_CONFIG_SLIPPAGE_PANEL, 'MeritWallet:slippageCog:close');
    } else {
      openPanel(SP_COIN_DISPLAY.ZERO_X_CONFIG_SLIPPAGE_PANEL, 'MeritWallet:slippageCog:open');
    }
  }, [slippageCogVisible, openPanel, closePanel]);
  const buyLabel =
    tradeDirection === TRADE_DIRECTION.SELL_EXACT_OUT
      ? `You Receive (Zero X) ± ${slippage.percentageString}`
      : 'You Receive:';
  // 2026-09-30, real bug fix (sweep after the same class of bug was
  // confirmed live in the web app's UniSelectPanel/index.tsx, in THIS
  // file's own sibling package). isVisible (from usePanelTree() above) is
  // a plain, non-reactive snapshot read — usePanelTree.ts has no
  // useSyncExternalStore subscription of its own, so calling it during
  // render only shows fresh data when something ELSE happens to also
  // re-render this component around the same time as a panelStore write.
  // usePanelVisible(id) is the correctly-reactive hook this same package
  // already exports for exactly this. Portable — reaches the extension
  // too, same as every other fix in this file (see MeritWallet's own
  // top-of-file doc comment on why this is the one shared component).
  // The hamburger and the tab bar share ONE state: the MENU_TAB_HEADER_BAR flag in the panel tree (no local copy). initialMenuOpen seeds the flag once; onMenuOpenChange hears every change, whoever made it (the hamburger, the panel-tree row).
  const menuTabHeaderVisible = usePanelVisible(SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR);
  const menuSeeded = useRef(false);
  useEffect(() => {
    if (menuSeeded.current) return;
    menuSeeded.current = true;
    if (initialMenuOpen === false) closePanel(SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR, 'MeritWallet:initialMenuOpen');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once
  }, []);
  const lastMenuReported = useRef<boolean | null>(null);
  useEffect(() => {
    if (lastMenuReported.current === menuTabHeaderVisible) return;
    const first = lastMenuReported.current === null;
    lastMenuReported.current = menuTabHeaderVisible;
    if (!first) onMenuOpenChange?.(menuTabHeaderVisible);
  }, [menuTabHeaderVisible, onMenuOpenChange]);
  const panelTreeVisible = usePanelVisible(SP_COIN_DISPLAY.PANEL_TREE_PANEL);
  // 2026-10-23 (owner report: MERIT_INFO_PANEL shows empty) — this flag and
  // meritInfoOverlay below were lost when WalletOverlayHost.tsx (which used
  // to render `slots.meritInfoPanel ?? <MeritInfoPanelReal />` for this
  // exact panel) was deleted 2026-10-18 ("the web runs on the component's
  // own body (overlay host and nine panels deleted)") — every OTHER
  // full-body overlay it hosted (panelTreeOverlay among them) was ported
  // into this component's own body at the same time; this one was missed.
  const meritInfoVisible = usePanelVisible(SP_COIN_DISPLAY.MERIT_INFO_PANEL);
  const messageVisible = usePanelVisible(SP_COIN_DISPLAY.MESSAGE_PANEL);
  // 2026-10-13: where the wallet asset files are served from, for the pill, the list and the panel alike (a host on another origin, the extension, passes the web app's address)
  if (walletAssetBaseUrl !== undefined) setWalletAssetBaseUrl(walletAssetBaseUrl); // set while rendering (an idempotent module setting), so the children's first render already reads it
  const walletPanelVisible = usePanelVisible(SP_COIN_DISPLAY.WALLET_PANEL);
  const walletLogoVisible = usePanelVisible(SP_COIN_DISPLAY.WALLET_LOGO);
  const walletMetaDataVisible = usePanelVisible(SP_COIN_DISPLAY.WALLET_META_DATA);
  const sellVisible = usePanelVisible(SP_COIN_DISPLAY.SELL_SELECT_PANEL);
  const zeroXVisible = usePanelVisible(SP_COIN_DISPLAY.ZERO_X_SELECT_PANEL);
  const swapArrowVisible = usePanelVisible(SP_COIN_DISPLAY.SWAP_ARROW_BUTTON);
  // 2026-09-29 — manageRadioPanels' own doc comment (MeritWalletProps)
  // explains why this needs to be conditional: a host that already runs
  // this same hook (the web app's RadioOverlayPanelHost.tsx) must not get
  // a second, independent instance fighting it. Passing [] rather than
  // skipping the call keeps this Rules-of-Hooks-compliant (same hook
  // called every render, just with nothing to enforce when disabled).
  useEnforceRadioPanelGroups(manageRadioPanels ? RADIO_PANEL_GROUPS_WITH_FALLBACKS : EMPTY_RADIO_PANEL_GROUPS);
  useEnforcePanelAncestorVisibility();
  // 2026-10-03 — containment, and it MUST come after ancestor reveal above.
  // React runs effects in hook order within a commit, so a bare
  // setPanelVisible on one of the twelve detail panels gets its container
  // opened first and this pass then stands down; the other order would close
  // the panel again in the same flush that revealed its container.
  useEnforceRadioPanelContainers(
    manageRadioPanels ? RADIO_PANEL_GROUPS_WITH_FALLBACKS : EMPTY_RADIO_PANEL_GROUPS,
  );
  // 2026-09-25, on request ("migrate AGENT_HEADER_PANEL") — useAgentAccount
  // is genuinely portable (already in @sponsorcoin/spcoin-exchange-engine),
  // so agentAccount here is real, live, shared state — not a placeholder —
  // same read/write the web app's own AgentHeaderContainer.tsx uses. What's
  // still NOT wired: the AGENT_SELECT_DROP_DOWN picker itself
  // (node_source/spCoinPanels/AssetSelectDropDowns/AgentSelectDropDown.tsx)
  // depends on components/utility/AccountAvatar.tsx (icon rendering) and
  // its own further chain (useOpenAccountComponent, useWalletAccountsList,
  // assetHelpers) — none of which exist in this repo yet, a real, separate
  // gap found while checking, not attempted here (same bucket as
  // TokenLogo/usePriceAPI elsewhere in this migration). defaultAgentAddress/
  // onHydrateAgent are also omitted — hydrateAccountFromAddress is a real,
  // substantial web-app-only on-chain fetch/cache layer, not portable as a
  // quick move.
  const [agentAccount] = useAgentAccount();

  // 2026-09-29 — self-fetch (see chainId's own doc comment on
  // MeritWalletProps above). One real icon-cache set per component
  // instance (not per fetch), built from whatever `storage` this instance
  // was given — a ref, not useMemo, since the actual identity only needs
  // to be stable across renders, not recomputed on a dependency change
  // (storage isn't expected to change after mount).
  const iconCachesRef = useRef<ReturnType<typeof createMeritWalletIconCaches> | undefined>(undefined);
  if (!iconCachesRef.current) iconCachesRef.current = createMeritWalletIconCaches(storage);

  const [selfFetchedNetworkRows, setSelfFetchedNetworkRows] = useState<MeritWalletNetworkRow[] | undefined>(undefined);
  const [selfFetchedAccountGroups, setSelfFetchedAccountGroups] = useState<AccountListGroup[] | undefined>(undefined);
  const [selfFetchedTokenRows, setSelfFetchedTokenRows] = useState<AssetListEntry[] | undefined>(undefined);

  // Only fetches whichever of the 3 the caller did NOT already supply
  // explicitly (checked once, at effect-run time — an explicit prop always
  // wins, self-fetch never overwrites it). Re-runs if chainId/baseUrl
  // change (e.g. the host's own wallet switches networks) OR refreshToken
  // changes (the caller's own onRefresh handler bumping it — see that
  // prop's own doc comment). forceRefresh is false on the very first run
  // (respects each icon's normal cache TTL) and true on every subsequent
  // run (a refreshToken bump always means "the user explicitly asked for
  // fresh data now", so it bypasses the TTL rather than possibly serving a
  // still-fresh-by-the-clock but stale-by-intent cached icon). Each fetch
  // degrades independently: a failure logs and leaves that one row list on
  // its SAMPLE_* fallback (see the resolved* variables below), same
  // per-domain isolation meritWalletDataFetch.ts's own functions already
  // guarantee.
  const hasFetchedOnceRef = useRef(false);
  const tokenRowsChainRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (chainId == null) return;
    const caches = iconCachesRef.current!;
    const resolvedBaseUrl = baseUrl ?? '';
    const forceRefresh = hasFetchedOnceRef.current;
    hasFetchedOnceRef.current = true;
    let cancelled = false;

    if (networkRows === undefined) {
      void selfFetchNetworkRows(chainId, resolvedBaseUrl, caches, forceRefresh)
        .then((rows) => { if (!cancelled) setSelfFetchedNetworkRows(rows); })
        .catch((error) => console.error('MeritWallet: failed to self-fetch network rows:', error));
    }
    if (accountGroups === undefined) {
      void selfFetchAccountGroups(chainId, resolvedBaseUrl, caches, forceRefresh)
        .then((groups) => { if (!cancelled) setSelfFetchedAccountGroups(groups); })
        .catch((error) => console.error('MeritWallet: failed to self-fetch account groups:', error));
    }
    if (tokenRows === undefined) {
      // another chain's rows must not stay up while this chain's list loads
      if (tokenRowsChainRef.current !== undefined && tokenRowsChainRef.current !== chainId) setSelfFetchedTokenRows(undefined);
      tokenRowsChainRef.current = chainId;
      void selfFetchTokenRows(chainId, resolvedBaseUrl, caches, forceRefresh)
        .then((rows) => { if (!cancelled) setSelfFetchedTokenRows(rows); })
        .catch((error) => console.error('MeritWallet: failed to self-fetch token rows:', error));
    }
    return () => {
      cancelled = true;
    };
    // Deliberately NOT depending on networkRows/accountGroups/tokenRows
    // themselves — those are "did the caller supply this at
    // all" checks meant to run once per chainId/baseUrl/refreshToken
    // change, not on every render; including them would refetch every
    // time self-fetched state itself changes (an infinite loop for
    // whichever ones ARE self-fetched, since setting state neither of
    // these two deps includes is exactly what a targeted lint-disable
    // here is for).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, baseUrl, refreshToken]);

  // Layering: explicit prop > self-fetched > (existing SAMPLE_* fallback,
  // applied further down at each of these 3's own point of use, unchanged).
  const resolvedNetworkRows = networkRows ?? selfFetchedNetworkRows;
  const fetchedAccountGroups = accountGroups ?? selfFetchedAccountGroups;
  // 2026-10-26 (owner report: MetaMask's and the extension's own rows
  // never showed "Connected", though their groups correctly showed
  // ACTIVE, and only the native Merit group's row worked) -- root cause,
  // confirmed via a captured trace: buildApproverGroups (approverAccounts.ts)
  // already computes isActive correctly, checking BOTH the active account
  // address AND which authenticator/group it belongs to
  // (isActiveSource && same(entry.address, activeAddress)). This memo used
  // to unconditionally RECOMPUTE isActive from scratch, by address alone,
  // with no idea which authenticator a row's own address belongs to --
  // a second, redundant source of truth for the exact same flag, the same
  // "two places decide one thing" shape behind several other bugs this
  // session. Now only fills isActive when the caller hasn't already
  // decided it (the self-fetched/SAMPLE fallback path, whose accounts
  // never carry the flag); the approver system's own already-correct
  // value is no longer overwritten.
  const resolvedAccountGroups = useMemo(() => {
    if (activeAccountAddress === undefined || !fetchedAccountGroups) return fetchedAccountGroups;
    const want = activeAccountAddress.trim().toLowerCase();
    return fetchedAccountGroups.map((group) => ({
      ...group,
      accounts: group.accounts.map((account) => ({
        ...account,
        isActive: typeof account.isActive === 'boolean' ? account.isActive : !!want && String(account.address ?? '').toLowerCase() === want,
      })),
    }));
  }, [fetchedAccountGroups, activeAccountAddress]);
  const resolvedTokenRows = tokenRows ?? selfFetchedTokenRows;

  const [openTarget, setOpenTarget] = useState<OpenTarget>(initialOpenTarget ?? 'prod');
  // 2026-09-21, Path A — REAL BUG caught and fixed before shipping, not
  // hypothetical: `ASSET_SELECT_LIST_PANEL` (the list overlay's real
  // parent) is a `MAIN_RADIO_OVERLAY_PANELS` sibling of every trade-tab
  // panel (confirmed by reading `panelTreeCallbacks.ts`'s own `openPanel`
  // directly — opening any `ACTIVE_LIST_PANEL` child walks `PARENT_OF` up
  // to find the nearest radio-group ancestor and applies the SAME atomic
  // "show this, close every other radio member" write a direct tab
  // switch would). So opening a list overlay genuinely closes whichever
  // trade tab was active — a bare `TAB_KEY_BY_PANEL_ID[activeMainOverlay]`
  // derivation would silently show Swap every time a list opened from
  // Send/Sponsor/Rewards/Config.
  //
  // Confirmed the real web app has this exact structural fact and solves
  // it — read `AccountPanelTabBar.tsx` directly: it snapshots the active
  // tab into a ref when its own overlay-visibility flag flips true,
  // restores it when the flag flips back false, via a REACTIVE useEffect.
  // A first draft here copied that shape directly, including an explicit
  // `openPanel` restore call — then a second read caught a real ordering
  // bug in it: if the user clicks a DIFFERENT tab while the list overlay
  // is still open, `handleTabClick`'s own `openPanel(newTab)` and the
  // overlay-closing write can land in the same commit, so a reactive
  // effect keyed off "did isOverlayOpen just flip" can't tell "overlay
  // closed on its own" apart from "overlay closed because the user chose
  // a different tab" — it would restore the STALE pre-overlay tab,
  // overriding the user's real click.
  //
  // Fixed with a simpler, race-free shape: `activeTab` is derived fresh
  // every render from `activeMainOverlay` when it's a real tab id, and
  // falls back to the last real value (remembered in a plain ref,
  // written during render — an accepted React pattern for exactly this
  // "remember the last non-null value" case) whenever it isn't (a list
  // overlay or detail panel covering the tabs). Pure per-render
  // computation, no effect, nothing to race. The tradeoff, accepted
  // deliberately: while a list overlay is open, the real engine's own
  // trade-tab panel is genuinely closed (not just visually covered) —
  // `useEnforceRadioPanelGroups`'s fallback will reopen the hardcoded
  // `TRADING_STATION_PANEL` default if the group hits zero visible
  // members, which only matters for what gets persisted if the user
  // closes the whole side panel without ever choosing a new tab
  // afterward — this component's own rendering stays correct regardless
  // (via the ref), which is what a user actually sees.
  const lastKnownTabRef = useRef<MenuTabKey>(initialActiveTab ?? 'SWAP');
  const derivedTab: MenuTabKey | undefined =
    activeMainOverlay != null ? TAB_KEY_BY_PANEL_ID[activeMainOverlay] : undefined;
  if (derivedTab) lastKnownTabRef.current = derivedTab;
  const activeTab: MenuTabKey = derivedTab ?? lastKnownTabRef.current;
  // 2026-10-24 (owner report, screenshots): the TAB STRIP's own highlight
  // must NOT use activeTab above — that intentionally keeps remembering the
  // last real tab for gatedTabBody (which tab's own content renders while a
  // list/detail covers it), which is right for THAT, but wrong for what the
  // tab strip visually shows: "if the associated Tab Panel is on top of the
  // [real navigation] stack, then it is highlighted. if not, it is not" —
  // the owner's own rule, confirmed across 7 screenshots (Swap stayed
  // highlighted with MERIT_INFO_PANEL covering the body and
  // TRADING_STATION_PANEL buried under WALLET_CONFIG_PANEL in the stack;
  // Config stayed highlighted with ASSET_SELECT_LIST_PANEL — the network
  // selector, opened from the header, not the Config tab itself — on top).
  // displayStackIds (useDisplayStack, real React state, re-renders on every
  // push/pop) is the actual navigation stack; its own last entry is "what
  // is really on top" -- TAB_KEY_BY_PANEL_ID[that] is the tab to highlight,
  // or null for none, with NO lastKnownTabRef-style fallback (that fallback
  // is exactly the bug: it remembers a tab that is no longer on top).
  const { displayStackIds } = useDisplayStack();
  const topOfStackId = displayStackIds.length > 0 ? displayStackIds[displayStackIds.length - 1] : undefined;
  const highlightedTab: MenuTabKey | null = topOfStackId != null ? TAB_KEY_BY_PANEL_ID[topOfStackId] ?? null : null;
  // The list owns its picker destination in the engine's parameter store;
  // this component keeps no duplicate slot state. The panel tree still owns visibility.
  const activeListModeLocal = React.useSyncExternalStore(
    activeListPanelStore.subscribe,
    activeListPanelStore.getWalletListSelectionSlot,
    () => null,
  );
  const listPanelIdFor = (mode: Exclude<ActiveListMode, null>): SP_COIN_DISPLAY =>
    LIST_PANEL_ID_FOR_MODE[mode];
  // 2026-10-23 (docs/meritFixes.txt §15-16) — the single source of truth for
  // "which ACTIVE_LIST_PANEL_MODES member is really active right now,"
  // already ANDed against ASSET_SELECT_LIST_PANEL's own visibility (see
  // useActiveListPanelChild's own doc comment for why that AND-gate, not an
  // effect-based reset, is what actually closes this bug). Used both here
  // (replacing the old accountListTreeOpen/networkListTreeOpen fallback,
  // which read the two leaky child flags directly) and below, for
  // sharedListHost — one read, two consumers, so they can never disagree.
  const activeChild = useActiveListPanelChild();
  // The wallet's own list overlays are not radio members: the tab stays the main overlay while one is open, and the list the person just opened must show.
  const activeListMode: ActiveListMode =
    activeListModeLocal ??
    (activeChild === SP_COIN_DISPLAY.LOCAL_ACCOUNT_WALLET_LIST
      ? 'account'
      : activeChild === SP_COIN_DISPLAY.NETWORK_LIST
        ? 'network'
        : null);
  // 2026-10-23 — all six modes now open through openActiveListPanel (see
  // paramsForMode below), not a bare openPanel(): openPanel(childId) alone
  // never actually opens ASSET_SELECT_LIST_PANEL (a MAIN_RADIO_OVERLAY_PANELS
  // member — useEnforcePanelAncestorVisibility.ts deliberately stops its
  // ancestor-reveal walk before those), so sharedListHost's own
  // PanelListSelectWrapper / host-rendered branches never actually showed.
  // paramsForMode is defined further down (after the state/handlers it
  // closes over), but that's fine — this function isn't CALLED until some
  // later click, well after this render (and paramsForMode's own
  // definition) has completed.
  const setActiveList = (mode: ActiveListMode) => {
    if (mode) {
      activeListPanelStore.setWalletListSelectionSlot(mode);
      openActiveListPanel(paramsForMode(mode), 'MeritWallet:setActiveList', listPanelIdFor(mode));
    } else {
      activeListPanelStore.setWalletListSelectionSlot(null);
      // 2026-10-23 — was a hand-rolled partial close (just
      // activeListPanelStore.clear() + closing ASSET_SELECT_LIST_PANEL
      // itself), which never closed the specific ACTIVE_LIST_PANEL_MODES
      // child that was actually open (e.g. NETWORK_LIST) — the exact root
      // cause of the "pop the stack, content stays visible" bug (docs/
      // meritFixes.txt §15-16). closeActiveListPanel already does this
      // correctly (closes whichever mode is open, then ACTIVE_LIST_PANEL,
      // then this panel, then clears the store) — same call Group 2's own
      // pickers already use to close. The AND-gated useActiveListPanelChild
      // hook makes every reader of activeChild immune to a stale child flag
      // regardless, but other direct readers of these six flags (e.g.
      // TokenPanel.tsx) are not — this is the real fix, not a belt-and-
      // suspenders extra.
      closeActiveListPanel('NAV_POP:MeritWallet:setActiveList:close');
    }
  };
  // A header chevron TOGGLES its list: down opens it (pushes the display stack), up closes it (pops it). Open = the local mode OR the tree flag of the list id (a host may have opened it through the tree).
  const toggleList = (mode: Exclude<ActiveListMode, null>) => {
    if (activeListMode === mode || panelStore.isVisible(listPanelIdFor(mode))) setActiveList(null);
    else setActiveList(mode);
  };
  // 2026-09-16, on live report ("selecting a token from the logo.png,
  // nothing is returned to [the Swap tab]... same case for all tab
  // selectdropdowns") — the actual "commit this pick" step every list
  // row's onSelect was still missing (see closeListOverlay's own doc
  // comment below — true when written, now finally closed): picking a
  // token/recipient closed the overlay but never told the tab panel WHAT
  // was picked, because TradingStationPanel/SendTabPanel/SponsorshipPanel
  // never received anything beyond their own onXxxClick openers. Those
  // panels' own sellSymbol/buySymbol/sendTokenSymbol/recipientSymbol (etc.)
  // props already exist and are already real, controlled display fields
  // (see ExchangeTradingPair.tsx/SendTabPanel.tsx/SponsorshipPanel.tsx) —
  // this was purely a missing "remember the pick, feed it back down" step,
  // not new UI. Keyed by ActiveListMode so each of the six pickable slots
  // (sell/buy/send token, send/sponsor recipient, sponsor pay-token) keeps
  // its own independent selection — picking a sell token must never
  // overwrite what's shown in the buy slot.
  type PickableSlot = 'sellToken' | 'buyToken' | 'sendToken' | 'sendRecipient';
  interface PickedEntry {
    symbol?: string;
    name?: string;
    address?: string;
    iconSrc?: string;
    /** 2026-09-23, Stage 39 — token decimals, threaded from the token-list
     *  row so an ERC20 send has a correct amount-to-wei source at submit
     *  time (Stage 32 previously had no correct source and rejected
     *  `tokenAddress` outright). Undefined for non-token picks (accounts have
     *  no decimals concept) — harmless passthrough for those slots. */
    decimals?: number;
  }
  const [selections, setSelections] = useState<Partial<Record<PickableSlot, PickedEntry>>>({});
  // 2026-10-09 -- the Send tab starts on the network's native token (the web app's Send tab shows ETH until another token is picked): the native row of the token list
  // when it has one, otherwise a plain entry built from the active network's symbol.
  const NATIVE_SEND_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  // 2026-10-11 -- the chain's native token record (bundled in the extension) names the token when the list has no native row, ahead of the network's own symbol (HH_BASE on the fork).
  const nativeMeta = useNativeToken();
  const nativeSendEntry = useMemo<PickedEntry>(() => {
    const row = (resolvedTokenRows ?? []).find((r) => String(r.address ?? '').toLowerCase() === NATIVE_SEND_ADDRESS.toLowerCase());
    const network = (resolvedNetworkRows ?? []).find((r) => r.isActive);
    return {
      symbol: row?.symbol ?? nativeMeta?.symbol ?? network?.symbol ?? 'ETH',
      name: row?.name ?? nativeMeta?.name,
      address: NATIVE_SEND_ADDRESS,
      iconSrc: row?.iconSrc,
      decimals: 18,
    };
  }, [resolvedTokenRows, resolvedNetworkRows, nativeMeta]);
  const sendTokenEntry: PickedEntry = selections.sendToken ?? nativeSendEntry;
  // 2026-10-30, on request ("animate the Send tab like you animated the Swap tab with the step tab on") - with the Steps checkbox checked the
  // Send click opens the step popup (Confirm Send -> Send Complete, with the receipt behind a scroll) instead of sending at once. A plain
  // transfer has no approve stage. The popup's state lives in plainSendStepStore (reading the receipt opens MESSAGE_PANEL).
  const plainSend = React.useSyncExternalStore(plainSendStepStore.subscribe, plainSendStepStore.getSnapshot, plainSendStepStore.getServerSnapshot);
  const sendRecipientProfile = {
    address: selections.sendRecipient?.address,
    name: selections.sendRecipient?.name,
    symbol: selections.sendRecipient?.symbol,
    logoURL: selections.sendRecipient?.iconSrc,
  };
  // The real send. deferReceipt: keep the success receipt for the popup's scroll instead of opening MESSAGE_PANEL; a failure always opens it.
  const performSend = async (deferReceipt: boolean): Promise<boolean> => {
    if (!onSendSubmit) return false;
    const params = {
      recipientAddress: selections.sendRecipient?.address,
      tokenAddress: sendTokenEntry.address,
      decimals: sendTokenEntry.decimals,
      tokenSymbol: sendTokenEntry.symbol,
      amount: sendAmount ?? '',
    };
    const result = await Promise.resolve(onSendSubmit(params));
    if (!result) return false;
    const receipt = buildSendReceipt({
      result,
      amount: params.amount,
      tokenSymbol: params.tokenSymbol ?? '',
      tokenAddress: isNativePlaceholder(params.tokenAddress) ? undefined : params.tokenAddress,
      from: activeProfileRef.current,
      to: sendRecipientProfile,
    });
    // A confirmed send clears the amount; a failed one leaves everything as it was.
    if (result.ok) onSendAmountChange?.('');
    if (deferReceipt && result.ok) {
      plainSendStepStore.set({ receipt, phase: 'done' });
      return true;
    }
    showReceipt(receipt, 'MeritWallet:send');
    return result.ok;
  };
  const startSend = () => {
    if (stepThroughApprovalStore.get()) {
      plainSendStepStore.set({ open: true, phase: 'confirm', viewing: false, viewingSeen: false, receipt: null, scrollRead: false });
      return;
    }
    void performSend(false);
  };
  const confirmSendStep = async () => {
    if (plainSendStepStore.get().phase === 'confirm') {
      const ok = await performSend(true);
      if (!ok) plainSendStepStore.close(); // a failure has already opened its error receipt
      return;
    }
    plainSendStepStore.close(); // done: the "Send Complete" button
  };
  const showSendStepReceipt = () => {
    const saved = plainSendStepStore.get().receipt as Parameters<typeof showReceipt>[0] | null;
    if (saved) showReceipt(saved, 'MeritWallet:send');
    plainSendStepStore.set({ scrollRead: true, viewing: true, viewingSeen: false });
  };
  // Reading the receipt hides the popup until MESSAGE_PANEL closes again, then it comes back exactly as it was.
  useEffect(() => {
    if (!plainSend.viewing) return;
    if (messageVisible) {
      if (!plainSend.viewingSeen) plainSendStepStore.set({ viewingSeen: true });
      return;
    }
    if (plainSend.viewingSeen) plainSendStepStore.set({ viewing: false, viewingSeen: false });
  }, [plainSend.viewing, plainSend.viewingSeen, messageVisible]);
  // 2026-10-11 (row 13): a list the shared panels opened through the panel tree (pay token, recipient, agent); the host's listHost renders it.
  useApprovalMessagePanel();
  const panelTreeListOpen = usePanelVisible(SP_COIN_DISPLAY.ASSET_SELECT_LIST_PANEL);
  // sharedListHost itself (it needs renderNetworkList/renderAccountManagement,
  // defined further down near where they used to live as listOverlay's own
  // 'account'/'network' branches) is declared below, after those two
  // functions — see its own doc comment there.
  // 2026-10-13 (owner request): the wallet pill belongs to the Add a Wallet/Account menu (ADD_WALLET_ACCOUNT: Create Account, Import, Connect), where it picks the wallet the account is added to, and to the wallet list
  // it opens (REMOTE_WALLET_LIST). It is NOT on the account list itself or on the tab pages.
  const addMenuVisible = usePanelVisible(SP_COIN_DISPLAY.ADD_WALLET_ACCOUNT);
  // 2026-10-13 (owner report): the back arrow on the Add / Manage Wallets and Accounts pages must pop the display stack one screen at a time (leaf -> menu -> account list). It used to close the list host first
  // (activeListMode), leaving the menu title over an empty body, and only the second press left.
  const importWalletLeafVisible = usePanelVisible(SP_COIN_DISPLAY.IMPORT_A_WALLET);
  const importAccountLeafVisible = usePanelVisible(SP_COIN_DISPLAY.IMPORT_AN_ACCOUNT);
  const connectAccountLeafVisible = usePanelVisible(SP_COIN_DISPLAY.CONNECT_ACCOUNT);
  const connectHardwareLeafVisible = usePanelVisible(SP_COIN_DISPLAY.CONNECT_HARDWARE_WALLET);
  const createAccountLeafVisible = usePanelVisible(SP_COIN_DISPLAY.CREATE_ACCOUNT);
  const walletListLeafVisible = usePanelVisible(SP_COIN_DISPLAY.WALLET_LIST_SELECT_PANEL);
  const connectExtensionLeafVisible = usePanelVisible(SP_COIN_DISPLAY.CONNECT_MERIT_EXTENSION);
  const addFlowTop: SP_COIN_DISPLAY | undefined = connectExtensionLeafVisible
    ? SP_COIN_DISPLAY.CONNECT_MERIT_EXTENSION
    : walletListLeafVisible
    ? SP_COIN_DISPLAY.WALLET_LIST_SELECT_PANEL
    : importWalletLeafVisible
    ? SP_COIN_DISPLAY.IMPORT_A_WALLET
    : importAccountLeafVisible
      ? SP_COIN_DISPLAY.IMPORT_AN_ACCOUNT
      : connectAccountLeafVisible
        ? SP_COIN_DISPLAY.CONNECT_ACCOUNT
        : connectHardwareLeafVisible
          ? SP_COIN_DISPLAY.CONNECT_HARDWARE_WALLET
          : createAccountLeafVisible
            ? SP_COIN_DISPLAY.CREATE_ACCOUNT
            : addMenuVisible
              ? SP_COIN_DISPLAY.ADD_WALLET_ACCOUNT
              : undefined;
  const walletListVisible = usePanelVisible(SP_COIN_DISPLAY.REMOTE_WALLET_LIST);

  // 2026-10-03 — token balances (see fetchBalance's doc comment). The active
  // account is read straight off the resolved groups here because the tab bodies
  // below are built before activeAccountEntry is derived.
  const activeBalanceAccount = (resolvedAccountGroups ?? SAMPLE_ACCOUNT_GROUPS)
    .flatMap((group) => group.accounts)
    .find((account) => account.isActive)?.address;
  // 2026-10-05 — every row (this component's own AND any a host renders inside overlayHost) reads the same
  // fetcher + account through this context; see walletBalance.tsx.
  const walletBalanceValue = useMemo(
    () => ({ fetchBalance, accountAddress: activeBalanceAccount, refreshToken }),
    [fetchBalance, activeBalanceAccount, refreshToken],
  );
  const sendBalance = useFetchedBalance(fetchBalance, sendTokenEntry.address, activeBalanceAccount, refreshToken);
  // The recipient's balance of the token being sent (the Recipient row's line, as in the web Send tab).
  const recipientSendBalance = useFetchedBalance(fetchBalance, sendTokenEntry.address, selections.sendRecipient?.address, refreshToken);
  const sellBalance = useFetchedBalance(fetchBalance, sellTokenContract?.address, activeBalanceAccount, refreshToken);
  const buyBalance = useFetchedBalance(fetchBalance, buyTokenContract?.address, activeBalanceAccount, refreshToken);
  const fetchedSellBalanceText = fetchedBalanceText(fetchBalance, sellBalance, sellTokenContract?.decimals ?? 18);
  const fetchedBuyBalanceText = fetchedBalanceText(fetchBalance, buyBalance, buyTokenContract?.decimals ?? 18);
  // 2026-10-27 (owner report) — on-screen balance text stays plain
  // "Balance: X"; the richer "${symbol} Balance: X" still shows on hover,
  // via these separate *Title* variables (TradeAmountRow's own doc comment
  // has the full reasoning).
  const fetchedSellBalanceTitle = sellTokenContract?.symbol && fetchedSellBalanceText ? `${sellTokenContract.symbol} ${fetchedSellBalanceText}` : undefined;
  const fetchedBuyBalanceTitle = buyTokenContract?.symbol && fetchedBuyBalanceText ? `${buyTokenContract.symbol} ${fetchedBuyBalanceText}` : undefined;
  // The Send button's text and readiness are the shared computeSendButton (spcoin-panels), the same rules and the same button the web app's Send tab uses.
  const sendDecimals = sendTokenEntry.decimals ?? 18;
  const sendHasRecipient = Boolean(selections.sendRecipient?.address);
  const sendBalanceText = fetchedBalanceText(fetchBalance, sendBalance, sendDecimals);
  const sendBalanceTitle = sendTokenEntry.symbol && sendBalanceText ? `${sendTokenEntry.symbol} ${sendBalanceText}` : undefined;
  const recipientBalanceText = fetchedBalanceText(fetchBalance, recipientSendBalance, sendDecimals);
  const recipientBalanceTitle = sendTokenEntry.symbol && recipientBalanceText ? `${sendTokenEntry.symbol} ${recipientBalanceText}` : undefined;

  // 2026-09-30, real bug fix (live report — "balanceOf... not working" /
  // "cannot type input in the Amount field" on the SWAP tab). Root cause:
  // unlike SEND/SPONSOR (real amount state + real onSubmit wired in
  // stage 5), the SWAP tab's TradingStationPanel was only ever given
  // token symbol/address/icon — ExchangeTradingPair already supports
  // sellAmount/onSellAmountChange/sellBalanceText (and the buy-side
  // equivalents), nothing had ever wired them.
  //
  // 2026-09-30, Stage B (real 0x/Uniswap trade buttons) — kept as LOCAL
  // TEXT state (not a MeritWalletProps prop) so the input can hold exactly
  // what the user typed, including transient states a bigint round-trip
  // can't represent ("12.", ".5") — but every valid keystroke ALSO parses
  // to a bigint and pushes into the real, shared ExchangeContext via
  // useSellAmount()/useBuyAmount() (same real hooks ExchangeButton.tsx's
  // real trade execution reads sellAmount/buyAmount FROM). Required for
  // correctness now that this component renders the real ConnectTradeButton
  // (below): without this, a real trade would execute against whatever
  // stale amount happened to already be in the shared context (possibly
  // 0, possibly left over from the main page's own Swap tab), not what the
  // user actually typed in Merit Wallet. parseDecimalAmount returns
  // undefined (skips the context push, keeps the local text as typed) for
  // any not-yet-a-full-number input — never throws, never blocks typing.
  const [sellAmountText, setSellAmountText] = useState('');
  const [buyAmountText, setBuyAmountText] = useState('');
  const [sellAmountContext, setSellAmountContext] = useSellAmount();
  const [buyAmountContextValue, setBuyAmountContext] = useBuyAmount();
  const sellDecimals = sellTokenContract?.decimals ?? 18;
  const buyDecimals = buyTokenContract?.decimals ?? 18;
  const sellTypingUntilRef = useRef(0);
  const buyTypingUntilRef = useRef(0);
  const setSellAmount = (text: string) => {
    sellTypingUntilRef.current = Date.now() + TYPING_GRACE_MS;
    setSellAmountText(text);
    const parsed = parseDecimalAmount(text, sellDecimals);
    if (parsed !== undefined) setSellAmountContext(parsed);
  };
  const setBuyAmount = (text: string) => {
    buyTypingUntilRef.current = Date.now() + TYPING_GRACE_MS;
    setBuyAmountText(text);
    const parsed = parseDecimalAmount(text, buyDecimals);
    if (parsed !== undefined) setBuyAmountContext(parsed);
  };

  // 2026-10-27 (owner report, live screenshot — Trace Log showed
  // sellTokenContract.amount already back at 0 after a Uniswap swap
  // succeeded, but the "You Exactly Pay" box kept showing the pre-swap
  // amount) — root cause: both hooks above used to discard the live
  // context value (`const [, setSellAmountContext] = useSellAmount()`),
  // so an external reset (UniSelectPanelLayoutContainer's setSwapState,
  // on swap success) updated the real ExchangeContext but this panel's own
  // local sellAmountText/buyAmountText strings — the only thing the input
  // actually renders — had no path back to it; they only ever got written
  // by the user's own typing (setSellAmount/setBuyAmount above). Same
  // resync-with-retry pattern as spcoin-panels' SellSelectPanelLayoutContainer.tsx
  // (that file's own 2026-10-27 fix for the identical bug one layer down):
  // a grace window protects an in-flight keystroke from being overwritten
  // by a stale/concurrent context read, and a retryTick forces one more
  // pass once that window closes instead of silently skipping forever.
  const [sellRetryTick, setSellRetryTick] = useState(0);
  const [buyRetryTick, setBuyRetryTick] = useState(0);

  useEffect(() => {
    if (isIntermediateDecimal(sellAmountText)) return undefined;
    const remaining = sellTypingUntilRef.current - Date.now();
    if (remaining > 0) {
      const timer = setTimeout(() => setSellRetryTick((t) => t + 1), remaining);
      return () => clearTimeout(timer);
    }
    const formatted = clampDisplay(formatUnits(sellAmountContext ?? 0n, sellDecimals), maxInputSz);
    if (sellAmountText !== formatted) setSellAmountText(formatted);
    return undefined;
  }, [sellAmountContext, sellDecimals, sellAmountText, sellRetryTick]);

  useEffect(() => {
    if (isIntermediateDecimal(buyAmountText)) return undefined;
    const remaining = buyTypingUntilRef.current - Date.now();
    if (remaining > 0) {
      const timer = setTimeout(() => setBuyRetryTick((t) => t + 1), remaining);
      return () => clearTimeout(timer);
    }
    const formatted = clampDisplay(formatUnits(buyAmountContextValue ?? 0n, buyDecimals), maxInputSz);
    if (buyAmountText !== formatted) setBuyAmountText(formatted);
    return undefined;
  }, [buyAmountContextValue, buyDecimals, buyAmountText, buyRetryTick]);

  // Real balance TEXT is a caller-supplied prop (sellBalanceText/
  // buyBalanceText on MeritWalletProps), NOT fetched here directly.
  // @sponsorcoin/spcoin-exchange-engine's useGetBalance internally calls
  // wagmi's usePublicClient(), which THROWS without a real WagmiProvider
  // ancestor — real risk caught before shipping: the extension's
  // sidepanel.ts has no wagmi wiring at all, so calling that hook
  // unconditionally in THIS always-shared component would crash the
  // extension's entire Merit Wallet the moment it mounted, regardless of
  // any `enabled:false` guard (Rules of Hooks means the hook itself still
  // runs). The web app's own wrapper IS wagmi-wrapped and calls
  // useGetBalance safely there instead, feeding the formatted result back
  // down as a plain string — same shape as onSendSubmit/sendAmount: real,
  // wagmi/web-app-only logic stays in the wrapper. The wrapper reads WHICH
  // token to fetch a balance for directly off the same shared
  // ExchangeContext (useSellTokenContract/useBuyTokenContract, sourced once
  // near usePanelTree() above) instead of a callback prop — see that
  // declaration's own doc comment.
  // Separate from activeListMode — this is a DETAIL view (one account,
  // read-only), not a list to pick from, and can be reached from a
  // different trigger (the avatar icon, not the row/chevron). Null when
  // closed; a real address string while showing that account's details.
  const [accountDetailAddress, setAccountDetailAddress] = useState<string | null>(null);
  const accountDetailVisible = usePanelVisible(SP_COIN_DISPLAY.ACCOUNT_PANEL);
  // The role detail panels (an agent, a sponsor, a recipient) show the same account detail screen for the account the exchange context holds in that role.
  const agentPanelVisible = usePanelVisible(SP_COIN_DISPLAY.AGENT_PANEL);
  const sponsorPanelVisible = usePanelVisible(SP_COIN_DISPLAY.SPONSOR_PANEL);
  const recipientPanelVisible = usePanelVisible(SP_COIN_DISPLAY.RECIPIENT_PANEL);
  const { exchangeContext: roleContext } = useExchangeContext();
  const [activeAccountForDetail] = useActiveAccount();
  // Same idea, for the token-list's own info icon (Select a Token).
  // 2026-10-26 (owner decision, after a live report: right-clicking a token
  // row opened TOKEN_PANEL -- the title bar updated, correctly pushed onto
  // the displayStack -- but the content area stayed blank) --
  // tokenDetailAddress/setTokenDetailAddress removed: nothing has set it to
  // a real address since 2026-10-20 (openTokenDetail, the only caller that
  // ever did, was removed in favor of the shared package's generic row
  // click, TokenListItem.tsx's openPreview(), which sets previewToken
  // instead). Rather than resurrect a second, parallel "what token is
  // open" field -- the exact class of bug (two sources of truth drifting
  // apart) chased everywhere else in the panel tree this session -- this
  // now reads the one real source directly: the same previewToken
  // TokenPanel.tsx (the package's own, separately-mounted copy) already
  // correctly uses.
  const [previewToken, setPreviewTokenContract] = usePreviewTokenContract();
  const tokenDetailVisible = usePanelVisible(SP_COIN_DISPLAY.TOKEN_PANEL);
  const previewTokenAddress = previewToken?.address ?? null;
  // Same idea, for the network-list's own icon (Select Network) — see
  // onNetworkIconClick's own doc comment for why this one needs no
  // separate "detail" data prop from the caller.
  const [networkDetailId, setNetworkDetailId] = useState<string | null>(null);
  const networkDetailVisible = usePanelVisible(SP_COIN_DISPLAY.NETWORK_PANEL);
  // 2026-09-21, Path A — ACCOUNT_PANEL/TOKEN_PANEL/NETWORK_PANEL are ALL
  // `MAIN_RADIO_OVERLAY_PANELS` members too (verified the same way as
  // the tab/list-overlay pieces — read `panelGroups.ts` directly), so
  // opening one radio-atomically closes whatever else was showing there
  // (a trade tab, or a list overlay's real ids) in the real engine, same
  // interaction as the list-overlay slice already found and fixed for.
  // These addresses/ids identify the selected detail record. The panel
  // tree flags below own whether their detail screens are visible.
  const openAccountDetail = (address: string) => {
    setAccountDetailAddress(address);
    openPanel(SP_COIN_DISPLAY.ACCOUNT_PANEL, 'MeritWallet:openAccountDetail');
  };
  // 2026-10-23 — openTokenDetail (the token-row equivalent of
  // openAccountDetail/openNetworkDetail below) removed: its only caller was
  // Merit's own "Select a Token" list rendering, replaced by the shared
  // package's generic PanelListSelectWrapper (docs/meritFixes.txt §11),
  // which sets previewToken (usePreviewTokenContract) instead of calling
  // anything here. TOKEN_PANEL/tokenDetailVisible stay; the
  // tokenDetailAddress local state this comment used to also point to, and
  // the self-fetch hydration chain (selfTokenDetail/effectiveTokenDetail)
  // that fed the old flat TokenDetailPanel overlay, were removed 2026-10-26
  // alongside tokenDetailOverlay's own switch to TokenPanel.tsx (see that
  // variable's own doc comment) — TokenPanel hydrates itself.
  const openNetworkDetail = (id: string) => {
    setNetworkDetailId(id);
    openPanel(SP_COIN_DISPLAY.NETWORK_PANEL, 'MeritWallet:openNetworkDetail');
  };
  const [showTestNets, setShowTestNets] = useState(false);
  // Reset Password and wallet deletion: the component draws the dialogs, the host (walletSession) supplies the calls.
  const [sessionDialog, setSessionDialog] = useState<WalletSessionDialog>(null);
  const sessionHandlers = sessionConfigHandlers(walletSession, setSessionDialog, { onResetPassword: onConfigResetPassword, onDeleteAccount: onConfigDeleteAccount, onDeleteWallet: onConfigDeleteWallet });
  const configResetPassword = sessionHandlers.onResetPassword;
  const configDeleteAccount = sessionHandlers.onDeleteAccount;
  const configDeleteWallet = sessionHandlers.onDeleteWallet;

  const handleTabClick = (tab: MenuTabKey) => {
    // Owner rule (2026-10-26): a tab click is ONLY the plain displayStack
    // push/pop rule, unconditionally, every time -- "if tab selected and is
    // on the displayStack, pop until it is on top; otherwise push it on
    // top." No "selecting the tab you're already on does nothing"
    // exception anymore (owner report: clicking Swap from "Select Network",
    // with Swap already the derived activeTab, did nothing -- the old
    // willNoOp check treated that as a no-op click, but the real rule is
    // unconditional: Swap IS on the stack, so it must pop up to it, same as
    // any other click). This also removes the onGlobalOverlay special case
    // (MERIT_INFO_PANEL/PANEL_TREE_PANEL) that existed only to patch one
    // hole in willNoOp -- with no no-op branch left, there is nothing left
    // for it to patch.
    //
    // This used to also remember and restore whatever list/detail was open
    // over each tab (docs 8.5.10, 2026-10-16, via listByTabRef/
    // detailByTabRef) -- removed after three straight bugs traced back to
    // behavior layered on TOP of the plain pop/push rule, never the rule
    // itself (confirmed correct by hand-trace every time): the old "tab
    // section" stack design, then closeActiveListPanel's own stale
    // restore, then that remember-and-reopen feature itself re-pushing a
    // list moments after validateTab had already popped it off correctly.
    panelTreeTrace('MeritWallet:handleTabClick', {
      tab,
      activeTab,
      activeMainOverlay: activeMainOverlay != null ? SP_COIN_DISPLAY[activeMainOverlay] : null,
    });
    openPanel(TAB_PANEL_IDS[tab], 'MeritWallet:handleTabClick');
    // Whatever list was open over the tab just left is simply closed, not
    // remembered. openPanel(tab) above already popped/replaced
    // ASSET_SELECT_LIST_PANEL itself on the stack (validateTab's own
    // pushRule), so this only needs to clear the non-stack bits that
    // doesn't touch: the open ACTIVE_LIST_PANEL_MODES child,
    // ACTIVE_LIST_PANEL, and the local selection-slot store.
    // `keepContainer: true` skips closeActiveListPanel's own
    // ASSET_SELECT_LIST_PANEL close (and the stale-stack restore read that
    // used to come with it, see that function's own doc comment) --
    // openPanel(tab) above already handled it correctly.
    activeListPanelStore.setWalletListSelectionSlot(null);
    closeActiveListPanel('NAV_POP:MeritWallet:handleTabClick:tabSwitch', { keepContainer: true });
  };
  // The selected detail record is data tied to its panel: it goes when the panel closes, not when the tab changes.
  useEffect(() => { if (!accountDetailVisible) setAccountDetailAddress(null); }, [accountDetailVisible]);
  // 2026-10-26 (owner report, trace-confirmed: right-clicking a token row
  // still showed a blank body even after tokenDetailOverlay was switched to
  // read previewToken) -- a plain `!tokenDetailVisible` check (this
  // effect's own first version) fires on the VERY FIRST render after
  // openPreview() sets previewToken, before TOKEN_PANEL's own visibility
  // write has landed (that's a SEPARATE, later-scheduled write --
  // schedule(), panelTreeDebug.ts, never batches). At that instant
  // tokenDetailVisible still reads false, so this effect saw "not open,
  // but there's a preview token -- must be stale" and cleared it
  // immediately, before tokenDetailVisible ever got the chance to become
  // true. By the time it did, previewToken was already gone again -- the
  // two conditions tokenDetailOverlay needs were never true at the same
  // moment. Same fix TokenPanel.tsx's own version of this effect already
  // uses: a wasVisible ref, so this only clears on a genuine
  // was-open-now-closed transition, never on "hasn't opened yet."
  const tokenDetailWasVisibleRef = useRef(false);
  useEffect(() => {
    const wasVisible = tokenDetailWasVisibleRef.current;
    tokenDetailWasVisibleRef.current = tokenDetailVisible;
    if (!wasVisible || tokenDetailVisible) return;
    if (previewToken) setPreviewTokenContract(undefined);
  }, [tokenDetailVisible, previewToken, setPreviewTokenContract]);
  useEffect(() => { if (!networkDetailVisible) setNetworkDetailId(null); }, [networkDetailVisible]);

  // 2026-09-21, Path A — initialActiveTab/onActiveTabChange used to be a
  // plain "seed local state, notify on every setActiveTab" pair; now that
  // activeTab is derived from the real engine, this becomes "seed the
  // engine once on first mount if the caller asked for something other
  // than the cold-boot default (PanelBootstrap already opens
  // TRADING_STATION_PANEL/SWAP on a genuinely fresh boot, so only a
  // non-SWAP initialActiveTab needs an explicit open here)" plus "notify
  // whenever the engine's own activeTab actually changes." Guarded by a
  // ref so this fires once, not on every render.
  const didSeedInitialTab = useRef(false);
  useEffect(() => {
    if (didSeedInitialTab.current) return;
    didSeedInitialTab.current = true;
    if (initialActiveTab && initialActiveTab !== 'SWAP') {
      openPanel(TAB_PANEL_IDS[initialActiveTab], 'MeritWallet:initialActiveTab');
    }
  }, [initialActiveTab, openPanel]);
  const previousNotifiedTabRef = useRef<MenuTabKey | undefined>(undefined);
  useEffect(() => {
    if (previousNotifiedTabRef.current === activeTab) return;
    previousNotifiedTabRef.current = activeTab;
    onActiveTabChange?.(activeTab);
  }, [activeTab, onActiveTabChange]);

  const handleOpenTargetChange = (target: OpenTarget) => {
    setOpenTarget(target);
    onOpenTargetChange?.(target);
  };

  const handleMenuClick = () => {
    if (menuTabHeaderVisible) closePanel(SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR, 'MeritWallet:hamburger:close');
    else openPanel(SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR, 'MeritWallet:hamburger:open');
  };

  // WALLET_NETWORK_HEADER seed — this engine starts every panel at `false`
  // until something calls setVisible (see extensionPlan.txt's "Third
  // slice" entry); since this component now owns that gate internally
  // (the PanelGate below), it has to seed it itself on mount rather than
  // relying on the caller to remember to, the way sidepanel.ts used to
  // before this component became self-contained.
  //
  // 2026-09-21, Path A — moved onto the real engine's setPanelVisible
  // (writes through ExchangeContext, same real panelStore the web app
  // uses, via the single usePanelTree() call above). MANAGE_PENDING_REWARDS
  // seeded true right alongside it, same reasoning as always: with no
  // real click-driven "open" call site yet (onTogglePending isn't wired
  // to anything in this component's own composition — see
  // ManageSponsorshipsPanelProps' own doc comment), an unseeded panel
  // renders permanently hidden, not open, and the Rewards tab's table
  // shape should show fully expanded by default, matching every other
  // placeholder's own representative-state-by-default treatment.
  // MERIT_REWARDS_SUMMARY needed no such seed and no replacement — see
  // ManageSponsorshipsPanel.tsx's own header comment for why removing it
  // outright (not migrating it to a real id) was the correct fix.
  //
  // 2026-09-22 — WALLET_RADIO_PANELS seeded true right alongside them,
  // same reasoning: `defaultVisible: true` in the shared registry
  // (panelRegistry.ts/defaultPanelTree.ts) does NOT self-apply in this
  // Lite runtime the way it presumably does under the web app's own full
  // ExchangeProvider — this engine starts every panel at `false` until
  // something calls setVisible, per this effect's own header comment
  // above. Added the moment `body` started rendering through the new
  // shared `<WalletRadioPanels>` gate (see the render below) — without
  // this, the entire tab body would render permanently hidden here,
  // exactly the class of bug this same effect already exists to prevent
  // for the other two ids.
  // 2026-09-30, real bug fix (live report — "WALLET_RADIO_PANELS... does
  // not toggle to [+]"). Root cause, confirmed by tracing useSetPanelVisible
  // (spcoin-exchange-engine): setPanelVisible's useCallback depends on
  // exchangeContext directly, so its identity changes on EVERY context
  // write app-wide, not just panel-tree ones. This effect's own dependency
  // array was just [setRealPanelVisible] — meaning it re-fired on almost
  // any unrelated write while Merit Wallet stayed mounted, re-forcing all
  // four of these panels back to visible:true each time — including
  // immediately after the debug tree's own setPanelVisible(...,false)
  // close-click, so WALLET_RADIO_PANELS could never actually show closed.
  // The comments below were always describing a ONE-TIME bootstrap concern
  // ("seed the moment body starts rendering") — this was never meant to be
  // an ongoing enforcement effect, just written with an unintentionally
  // unstable dependency. hasSeededVisibilityRef makes the seed genuinely
  // one-time per mount, matching the original intent, while still
  // satisfying exhaustive-deps (setRealPanelVisible stays listed; the ref
  // guard just makes a re-invocation with a "new" identity a no-op).
  const hasSeededVisibilityRef = useRef(false);
  useEffect(() => {
    if (hasSeededVisibilityRef.current) return;
    hasSeededVisibilityRef.current = true;
    setRealPanelVisible(SP_COIN_DISPLAY.WALLET_NETWORK_HEADER, true);
    // 2026-10-03 — MANAGE_PENDING_REWARDS and STAKING_CONTROLLER_PANEL are NO
    // LONGER seeded true here. Both are children of a tab panel (Rewards /
    // Sponsor), and a visible child makes the ancestor rule open its parent tab,
    // so a fresh profile landed on whichever tab the last seed belonged to
    // instead of Swap — and opening that tab closed the Swap tab's whole
    // subtree, persisting its children (the sell token pill, the token logos)
    // as hidden. The extension now hydrates the registry defaults (see
    // spCoinExtension/src/panelVisibilityStorage.ts), which is also what the web
    // app starts from, so these deviations only made the two apps differ.
    setRealPanelVisible(SP_COIN_DISPLAY.WALLET_RADIO_PANELS, true);
  }, [setRealPanelVisible]);

  // 2026-09-15 — when a list overlay is open (see ActiveListMode's own doc
  // comment above), it replaces the active tab's own body entirely rather
  // than stacking on top of it, matching the real app's ActiveListPanel
  // (an overlay that fully owns the panel body while open, not a layered
  // popover). onSelect closes it the same way a real row pick would.
  const closeListOverlay = () => setActiveList(null);

  // 2026-10-23 — commitSelection (the "commit this pick" step PickableSlot's
  // own doc comment above describes) removed: its only callers were
  // buildAddressBar's own typed-address-entry preview rows, already removed
  // alongside it (docs/meritFixes.txt §15-16) — paramsForMode below already
  // inlines the equivalent commit logic per mode, keyed on `mode` itself
  // rather than this function's activeListMode-read (see that function's
  // own doc comment for why that distinction mattered, a real stale-closure
  // bug once).

  // 2026-10-23, owner investigation (docs/meritFixes.txt §11-12) — what
  // setActiveList hands to openActiveListPanel for each mode. sellToken/
  // buyToken/sendToken went first (see the stale-closure bug writeup this
  // function's own history carried, now folded in below): onCommit is
  // built HERE, in the same render as the click that opens the list, and
  // a pick fires much later against whichever closure was captured at
  // that moment — so it must not read anything that only becomes correct
  // after a re-render (activeListMode, read via the external
  // activeListPanelStore, is exactly that kind of value; `mode`, this
  // function's own parameter, is not — it's fixed for the whole call).
  // That's why every branch below reads `mode` directly instead of
  // routing through commitSelection's activeListMode inference.
  // account/network return null: they're host-rendered
  // (renderAccountManagement/renderNetworkList below, via
  // AssetSelectListPanel's own host-callback props) and read no feed
  // params at all — the params object exists only for modes that render
  // through the package's generic PanelListSelectWrapper.
  const paramsForMode = (mode: Exclude<ActiveListMode, null>) => {
    if (mode === 'sellToken' || mode === 'buyToken' || mode === 'sendToken') {
      return {
        feedType: FEED_TYPE.REMOTE_TOKEN_LIST,
        onCommit: (asset: TokenContract | spCoinAccount) => {
          const token = asset as TokenContract;
          const address = toChecksumAddress(token.address as unknown as string);
          if (mode === 'sellToken' || mode === 'buyToken') {
            const contract: TokenContract | undefined = address
              ? {
                  address: address as TokenContract['address'],
                  symbol: token.symbol,
                  name: token.name,
                  decimals: token.decimals,
                  logoURL: token.logoURL,
                  balance: BigInt(0),
                }
              : undefined;
            if (mode === 'sellToken') setSellTokenContract(contract);
            else setBuyTokenContract(contract);
          } else {
            setSelections((prev) => ({
              ...prev,
              [mode]: {
                symbol: token.symbol,
                name: token.name,
                address,
                iconSrc: token.logoURL,
                decimals: token.decimals,
              },
            }));
          }
          closeListOverlay();
        },
        selectOnLogoClick: true,
      };
    }
    if (mode === 'sendRecipient') {
      return {
        // sendRecipient's own real id (REMOTE_ACCOUNT_SEND_LIST) has a matching FEED_TYPE member exactly.
        feedType: FEED_TYPE.REMOTE_ACCOUNT_SEND_LIST,
        onCommit: (asset: TokenContract | spCoinAccount) => {
          const account = asset as spCoinAccount;
          const address = toChecksumAddress(account.address as unknown as string);
          setSelections((prev) => ({
            ...prev,
            sendRecipient: { symbol: account.symbol, name: account.name, address, iconSrc: account.logoURL },
          }));
          closeListOverlay();
        },
        // 2026-10-27 (owner report) — missing here, unlike the sellToken/
        // buyToken/sendToken block above: clicking a row's own logo/icon
        // fell through to the list's default row-click (open the account's
        // TOKEN_PANEL preview, "Select Preview Image") instead of committing
        // the recipient and returning to the Send tab. Same affordance as
        // every other picker in this function.
        selectOnLogoClick: true,
      };
    }
    // account | network
    return null;
  };

  const iconFromSrc = (src?: string) =>
    src
      ? React.createElement('img', {
          src,
          alt: '',
          style: fitImageStyle,
        })
      : undefined;

  // 2026-09-29 — StakingControllerPanel's own opaque-slot inputs
  // (configCog/recipientContent) removed along with its render below
  // (see that render site's own doc comment for why: pure duplicate
  // content, disabled until Phase B.2 gives it something unique to show).
  // Restore both from git history alongside the render if re-enabling.

  const tabBody =
    activeTab === 'SWAP'
      ? React.createElement(TradingStationPanel, {
          onSellTokenClick: () => setActiveList('sellToken'),
          onBuyTokenClick: () => setActiveList('buyToken'),
          sellSymbol: sellTokenContract?.symbol,
          sellAddress: sellTokenContract?.address,
          // 2026-10-22 (owner report): iconFromSrc returned undefined with no token picked, leaving the pill's icon slot empty — TokenLogo renders unconditionally and falls back to STATIC_ASSET_ICON_URL on its own, matching the Uniswap row's own pill (UniSelectPanelWithSwap, fed by BuySelectPanelLayoutContainer's identical fix).
          sellIcon: React.createElement(TokenLogo, { tokenContract: sellTokenContract, style: fitImageStyle }),
          buySymbol: buyTokenContract?.symbol,
          buyAddress: buyTokenContract?.address,
          buyIcon: React.createElement(TokenLogo, { tokenContract: buyTokenContract, style: fitImageStyle }),
          // 2026-09-30 — real amount input + real balance reads, see their
          // own doc comment above (near sellAmountText's declaration).
          sellAmount: sellAmountText,
          onSellAmountChange: setSellAmount,
          sellBalanceText: sellBalanceText ?? fetchedSellBalanceText,
          sellBalanceTitle: fetchedSellBalanceTitle,
          buyAmount: buyAmountText,
          onBuyAmountChange: setBuyAmount,
          buyBalanceText: buyBalanceText ?? fetchedBuyBalanceText,
          buyBalanceTitle: fetchedBuyBalanceTitle,
          // 2026-10-05 — the live, trade-direction-dependent buy
          // label ("You Receive ± 2.00%") and the slippage cog
          // toggle, see buyLabel/handleSlippageCog's own doc
          // comment near useSlippage() above.
          buyLabel,
          onCogClick: handleSlippageCog,
          // 2026-09-30 — real panel-tree gates, see usePanelTree()'s own
          // doc comment above for the full root-cause writeup. All three
          // are real, independent panel-tree nodes; ExchangeTradingPair.tsx
          // already supports gating on them, it just never received a
          // value before now.
          sellVisible,
          buyVisible: zeroXVisible,
          arrowVisible: swapArrowVisible,
          // ConfigSlippagePanel is already fully self-gating (checks its
          // own usePanelVisible(ZERO_X_CONFIG_SLIPPAGE_PANEL) internally, renders
          // null when hidden) — no extra visibility check needed here.
          buyPrefixContent: React.createElement(ConfigSlippagePanel, {
            bps: slippage.bps,
            onBpsChange: setSlippageBps,
          }),
          // 2026-09-30, Stage B — the real 0x trade button
          // (ZeroXTradeButton/ExchangeButton) and the real
          // Uniswap section (UniSelectPanel) are both
          // wagmi-dependent (live quotes, signer, real swap
          // execution), so they're opaque ReactNode slots a
          // wagmi-wrapped caller fills — same "real logic stays
          // in the wrapper" shape as sellBalanceText/
          // buyBalanceText above. Both self-gate on their own
          // real panel-tree node already, so this component
          // doesn't need its own visibility check for either —
          // undefined (the extension today) renders nothing,
          // not a regression. (The old CONNECT_TRADE_BUTTON
          // connection-button slot was removed 2026-10-05
          // together with its panel-tree node.)
          // The trade button and the Uniswap section are the shared engine-path screens, the same in every app (docs/design/spcoinPackagesDesign.txt 8.5.12).
          zeroXTradeButtonContent: React.createElement(ConnectedTradeButton, { host: tradeHost }),
          buySuffixContent: React.createElement(UniSelectPanelWithSwap),
        })
      : activeTab === 'SEND'
        ? React.createElement(SendTabPanel, {
            onSendTokenClick: () => setActiveList('sendToken'),
            onRecipientClick: () => setActiveList('sendRecipient'),
            sendTokenSymbol: sendTokenEntry.symbol,
            sendTokenAddress: sendTokenEntry.address,
            sendTokenIcon: iconFromSrc(sendTokenEntry.iconSrc),
            recipientSymbol: selections.sendRecipient?.symbol,
            recipientAddress: selections.sendRecipient?.address,
            // 2026-10-22 (owner report): iconFromSrc returned undefined with no recipient picked, leaving the pill's icon slot empty — AccountAvatar renders unconditionally and falls back to ANONYMOUS_ACCOUNT_AVATAR_URL on its own, matching every other account-style pill.
            recipientIcon: React.createElement(AccountAvatar, {
              logoURL: selections.sendRecipient?.iconSrc,
              symbol: selections.sendRecipient?.symbol,
              name: selections.sendRecipient?.name,
              address: selections.sendRecipient?.address,
              style: fitImageStyle,
            }),
            // 2026-09-22, Phase B.2 Stage 4 follow-up — real amount input +
            // submit wiring (see MeritWalletProps.onSendSubmit's own doc
            // comment for why tokenAddress/decimals aren't fully resolved
            // here yet — a caller should treat a present sendToken pick as
            // not-yet-supported for a real send).
             sendAmount,
             onSendAmountChange,
             sendDecimals,
             sendBalanceRaw: sendBalance ?? undefined,
             sendHasRecipient,
             sendSymbol: sendTokenEntry.symbol ?? '',
             submitBusy: sendBusy,
             balanceText: sendBalanceText,
             balanceTitle: sendBalanceTitle,
             recipientBalanceText,
             recipientBalanceTitle,
             // 2026-09-23, Stage 39 — resolve the real sendToken address +
             // decimals picked via the token list picker (see PickedEntry's
             // own decimals doc comment) and pass them, plus the amount, to
             // onSendSubmit. NOTE: SendTabPanel.onSubmit is `() => void`
             // (no args) — the amount is read from this component's own
             // `sendAmount` prop (the same controlled source SendTabPanel
             // renders), NOT from a submit event's params. Earlier wiring
             // destructured `params.amount` from that no-arg callback,
             // which would throw at runtime on a real Send click — only
             // `tsc`/`vite` verified in 2026-09-22 (no browser-automation
             // available), not live-driven. Native send omits tokenAddress;
             // an ERC20 send passes both.
             onSubmit: onSendSubmit ? startSend : undefined,
          })
        : activeTab === 'SPONSOR'
          ? React.createElement(ConnectedSponsorPanel, { host: tradeHost })
          : activeTab === 'REWARDS' && rewardsHost
            ? React.createElement(ConnectedRewardsPanel, { host: rewardsHost, extras: rewardsExtras })
            : activeTab === 'REWARDS'
            ? React.createElement(ManageSponsorshipsPanel, {
                // 2026-09-24, SPONSOR_STAKING_LIST EXT wiring (minimal bar) —
                // mirrors the real web app's own ManageSponsorshipsPanel.tsx
                // unstakeAllSponsorships callback exactly: opens
                // SPONSOR_STAKING_LIST via the real, shared engine's openPanel.
                // SponsorStakingListPanel itself self-gates on that same id
                // (see its own `panelId` default) and is mounted unconditionally
                // below, so no separate usePanelVisible check is needed here.
                onUnstake: () => openPanel(SP_COIN_DISPLAY.SPONSOR_STAKING_LIST, 'MeritWallet:unstakeAllSponsorships'),
              })
            : React.createElement(WalletConfigPanel, {
                onOpenPanelTree: () => openPanel(SP_COIN_DISPLAY.PANEL_TREE_PANEL, 'MeritWallet:openPanelTree'),
                openTarget,
                onOpenTargetChange: handleOpenTargetChange,
                // 2026-09-30 — see configPasswordMode's own doc comment on
                // MeritWalletProps for why every prop below is forwarded
                // as-is (real logic lives in the caller, via
                // useMeritWalletConfig() — this component only renders it).
                passwordMode: configPasswordMode,
                onPasswordModeChange: onConfigPasswordModeChange,
                persistedTimeoutContent: configPersistedTimeoutHours !== undefined && onConfigPersistedTimeoutHoursChange ? React.createElement(PersistedTimeoutPicker, { hours: configPersistedTimeoutHours, onChange: onConfigPersistedTimeoutHoursChange }) : undefined,
                passwordDescription: configPasswordDescription,
                mandatorySecurity: configMandatorySecurity,
                onMandatorySecurityChange: onConfigMandatorySecurityChange,
                mandatoryApproval: configMandatoryApproval,
                onMandatoryApprovalChange: onConfigMandatoryApprovalChange,
                passwordResetPanelContent: configPasswordResetPanelContent,
                syncMode: configSyncMode,
                onSyncModeChange: onConfigSyncModeChange,
                syncDescription: configSyncDescription,
                location: configLocation,
                onLocationChange: onConfigLocationChange,
                showBackgroundPage: configShowBackgroundPage,
                onShowBackgroundPageChange: onConfigShowBackgroundPageChange,
                modalMode: configModalMode,
                onModalModeChange: onConfigModalModeChange,
                securityPanelContent: configSecurityPanelContent,
                signingPanelContent: configSigningPanelContent,
                backupPanelContent: configBackupPanelContent,
                testAccountsContent: configTestAccounts ? React.createElement(TestAccountsSection, { api: configTestAccounts.api, authenticationType: configTestAccounts.authenticationType, onChanged: configTestAccounts.onChanged }) : undefined,
                uniSelectVisible: configUniSelectVisible,
                onUniswapEngineChange: onConfigUniswapEngineChange,
                zeroXEngineVisible: configZeroXEngineVisible,
                on0xEngineChange: onConfig0xEngineChange,
                resetPanelsContent: configResetPanelsContent,
                devToolsContent: configDevToolsContent,
                extensionChannel: configExtensionChannel,
                onExtensionChannelChange: onConfigExtensionChannelChange,
                extensionDownloadPath: configExtensionDownloadPath,
                onLogoff: onConfigLogoff,
                onResetPassword: configResetPassword,
                onDeleteAccount: configDeleteAccount,
                onDeleteWallet: configDeleteWallet,
              });

  // Real data (networkRows/accountGroups) vs. this component's own
  // placeholder samples — see MeritWalletProps' own doc comment on why this
  // component never fetches either itself.
  //
  // 2026-09-16, on request ("check the NetworkList in the NPM lib as that
  // works") — resolves each account's iconSrc (a real, cached avatar data
  // URL a consumer like spCoinExtension fetches via
  // @sponsorcoin/spcoin-feeds/accounts' avatarURL) into an actual <img>
  // exactly once here, same conversion the network list overlay below
  // already does for row.iconSrc — so both the account-list overlay's own
  // rows AND activeAccountEntry (which WalletAccountHeader's `icon` prop
  // reads below) get a real avatar without duplicating this conversion in
  // two places. `icon` wins if a caller already supplied one directly.
  const effectiveAccountGroups: AccountListGroup[] = (resolvedAccountGroups ?? SAMPLE_ACCOUNT_GROUPS).map((group) => ({
    ...group,
    accounts: group.accounts.map((account) => ({
      ...account,
      icon:
        account.icon ??
        (account.iconSrc
          ? React.createElement('img', {
              src: account.iconSrc,
              alt: '',
              style: fitImageStyle,
            })
          : undefined),
    })),
  }));
  const networkRowsSource: MeritWalletNetworkRow[] = resolvedNetworkRows ?? SAMPLE_NETWORK_ROWS;
  // The sample fallback's own testnet marker was always just the 'hardhat'
  // id (never a real isTestnet field) — preserved exactly for that path;
  // real (explicit or self-fetched) networkRows use the real isTestnet flag
  // instead.
  const isRowTestnet = (row: MeritWalletNetworkRow) =>
    resolvedNetworkRows ? Boolean(row.isTestnet) : row.id === 'hardhat';
  const visibleNetworkRows = showTestNets
    ? networkRowsSource
    : networkRowsSource.filter((row) => !isRowTestnet(row));
  // Drives the header's compact network pill and account row — same
  // isActive flag the list overlays already use, just read once more here
  // rather than duplicated as separate props.
  const activeNetworkRow = networkRowsSource.find((row) => row.isActive);
  const flatAccountRows = effectiveAccountGroups.flatMap((group) => group.accounts);
  // 2026-10-13 (owner request): the wallet pill names the wallet whose group is ACTIVE in the list below it (the web's list keys its groups 'hardhat' = the dev keystore, 'metamask'), whenever the host has no
  // active account address to derive it from.
  const activeGroupId = effectiveAccountGroups.find((group) => group.isActiveSource)?.id;
  const pillWalletId = nativeWalletId ?? activeWalletId ?? (activeGroupId === 'hardhat' ? 'serverKeystore' : activeGroupId === 'metamask' ? 'injected:io.metamask' : activeGroupId);
  // 2026-10-13 (owner report): the header's account pill read "Select Account" while a MetaMask account was active, because only the listed (keystore) rows were searched. The host's own active account fills in.
  const hostActiveAddress = String(activeAccountAddress ?? '').trim();
  // The header's avatar, name and symbol fill from the listed row for that address when the host passes none (the list already resolved its avatar), so the header never shows the anonymous placeholder for an account the list shows.
  const listedActiveRow = hostActiveAddress ? flatAccountRows.find((account) => String(account.address ?? '').toLowerCase() === hostActiveAddress.toLowerCase()) : undefined;
  const hostActiveEntry = hostActiveAddress
    ? ({
        id: hostActiveAddress,
        address: hostActiveAddress,
        name: activeAccountName || listedActiveRow?.name || undefined,
        symbol: activeAccountSymbol || listedActiveRow?.symbol || undefined,
        iconSrc: activeAccountLogoURL || listedActiveRow?.iconSrc || undefined,
        icon: activeAccountLogoURL ? React.createElement('img', { src: activeAccountLogoURL, alt: '', style: fitImageStyle }) : listedActiveRow?.icon,
        isActive: true,
      } as (typeof flatAccountRows)[number])
    : undefined;
  // The listed active row may know less than the host does (a per-wallet list has an address, not a profile): for the same address the host's active-account profile (name, symbol, avatar) fills what the row lacks, so the header never shows the anonymous placeholder.
  const listedActive = flatAccountRows.find((account) => account.isActive);
  const activeAccountEntry =
    listedActive && hostActiveEntry && String(listedActive.address ?? '').toLowerCase() === hostActiveAddress.toLowerCase()
      ? ({ ...listedActive, name: activeAccountName || listedActive.name, symbol: activeAccountSymbol || listedActive.symbol, iconSrc: activeAccountLogoURL || listedActive.iconSrc, icon: listedActive.icon ?? hostActiveEntry.icon } as typeof listedActive)
      : listedActive ?? hostActiveEntry;
  activeProfileRef.current = activeAccountEntry ? { address: activeAccountEntry.address, name: activeAccountEntry.name, symbol: activeAccountEntry.symbol, logoURL: activeAccountEntry.iconSrc } : undefined;
  // 2026-09-24, ASSET_SELECT_LIST_PANEL real container (on request, after
  // discussion) — this whole block used to jump straight from
  // `activeListMode` to AssetListTable/AccountListRewardsPanel/
  // NetworkListTable with no intermediate container representing the real,
  // distinct ASSET_SELECT_LIST_PANEL (38) panel id that sits between
  // ACTIVE_LIST_PANEL and its content children in panelRegistry.ts — a
  // flattened structure that didn't match the real panel-tree hierarchy.
  // Every branch below now routes its existing, unchanged content through
  // the package's own real AssetListSelectPanel shell as `listContent`
  // instead of rendering it directly. Deliberately NOT a cosmetic-only
  // change even though none of these feed types trigger the shell's
  // address-bar/manage-view behavior today (same as the ASSET_SELECT_LIST_PANEL
  // investigation earlier this session found) — the point is giving the
  // extension a REAL, shared container matching the actual architecture, so
  // a future platform (iPhone/Android, per appSplitDevelopmentTime.md) reuses
  // this one real component instead of every platform rebuilding its own
  // flattened list-overlay structure from scratch. `addressBar`/
  // `manageContent` stay omitted (no ADDRESS_PANEL/manage-view concept exists
  // in the extension yet) — safe, since the shell's own render guard
  // requires both `showAddressBar` AND a supplied `addressBar` node.
  // 2026-10-23 — buildAddressBar (the ADDRESS_PANEL typed-address-entry
  // mechanism this comment used to describe, for sellToken/buyToken/
  // sendToken/sendRecipient's own rows) removed along with
  // resolveAssetAddress/entryResolution/addressRowsRef/addressInput: its
  // only callers were those same four modes' old Merit-local list
  // rendering, already replaced by the shared package's own
  // PanelListSelectWrapper (docs/meritFixes.txt §11-12), which has its own
  // equivalent typed-entry handling — nothing in this file needs this
  // apparatus anymore. account/network never used it (no addressBar prop
  // on their own AssetListSelectPanel calls below).

  // 2026-10-23 — sellToken/buyToken/sendToken/sendRecipient used to render
  // here too (Merit's own AssetListSelectPanel+AssetListTable, fed by
  // effectiveTokenRows/recipientListRows). Now that those four modes open
  // the real REMOTE_TOKEN_LIST/REMOTE_ACCOUNT_SEND_LIST ids via
  // openActiveListPanel (see paramsForMode above), ASSET_SELECT_LIST_PANEL
  // is already visible by the time this component would pick a branch, so
  // the body chain's own `activeChild != null ? sharedListHost : null` wins
  // before `listOverlay` is even consulted — those branches could never
  // render again, so they're removed rather than left as dead code.
  //
  // account/network keep a listOverlay fallback (reusing these same two
  // render functions, so there is only ever one copy of this JSX), but its
  // trigger narrowed with §15-16's redesign: `activeListMode`'s own
  // 'account'/'network' derivation now comes from activeChild (AND-gated
  // against ASSET_SELECT_LIST_PANEL's own visibility, see
  // useActiveListPanelChild's doc comment), not from reading
  // LOCAL_ACCOUNT_WALLET_LIST/NETWORK_LIST's raw flags directly the way it
  // used to. That means a host that set only the child flag without also
  // opening ASSET_SELECT_LIST_PANEL itself (the literal "opened it through
  // the tree" edge case this fallback was first built for) no longer
  // surfaces here either — activeListMode stays null, same as
  // sharedListHost staying closed. Acceptable: §12's own investigation
  // already established nothing in this codebase actually sets these flags
  // that way today: a `grep` for every direct setPanelVisible/openPanel
  // call against these two ids turned up only setActiveList/toggleList/
  // openAccountList, so this edge case was defensive, not real. What this
  // fallback still legitimately covers: a parent-tree state restore (e.g.
  // a persisted panel-tree snapshot opening ASSET_SELECT_LIST_PANEL +
  // NETWORK_LIST together on reload) racing ahead of this component's own
  // render on first mount.
  const renderAccountManagement = () =>
    // 2026-09-24, ACCOUNT_LIST_REWARDS_PANEL EXT wiring (minimal
    // bar, matching AGENT_HEADER_PANEL's own precedent) — swaps
    // the plain AccountListCard for the reward-aware shell so the
    // component is actually reachable in the extension. See
    // accountEntryToSpCoinAccount's own doc comment for the type
    // bridge; onPickAccount/onClaimRewards stay unwired (no real
    // on-chain reward-discovery feed exists in the extension yet
    // — see docs/npmMigrationDesign.md's own dated entry on that
    // real, separately-scoped gap).
    // 2026-10-03, on request ("the web app has the correct list") —
    // this branch rendered AccountListRewardsPanel (the reward-aware
    // card list), while the web app's own header account pill opens
    // LOCAL_ACCOUNT_WALLET_LIST ("Active Account Selection": Merit
    // Wallet/MetaMask groups, ACTIVE badge, Add a Wallet/Account).
    // AccountListCard is this package's pixel-copied portable version
    // of exactly that screen (see its header comment), so both apps
    // now show the same list from the same account groups.
    React.createElement(AssetListSelectPanel, {
      containerType: SP_COIN_DISPLAY.ASSET_SELECT_LIST_PANEL,
      // WALLET_ACCOUNTS is the closest real match — its own doc
      // comment in enums.ts: "Local wallet account list (all known
      // accounts)... Used by the Send flow's recipient picker."
      feedType: FEED_TYPE.WALLET_ACCOUNTS,
      listContent: React.createElement(AccountListCard, {
        groups: effectiveAccountGroups.map((group) => ({
          ...group,
          accounts: group.accounts.map((account) => ({
            ...account,
            // 2026-10-26 (owner report: "the ADDRESS_PANEL should not close
            // when I select another active Account for approval on this
            // page") -- this is the Active Account Selection list
            // (WALLET_ACCOUNTS feed, no address bar of its own), so "it"
            // means this list itself: it used to close on any successful
            // connect, same as every other list's pick-and-close row. That
            // was wrong here specifically -- connecting a different account
            // can kick off an approval flow (the wallet's own popup, a
            // pending-signature state) the owner needs to keep watching
            // this list to see settle, not have it yanked away the instant
            // the connect call returns. A failed connect already stayed
            // open (so its banner is seen); now a successful one does too.
            // The back arrow/X still close it explicitly.
            //
            // 2026-10-29 (owner report, live: "it should also close this
            // page to return to Add Sponsorship... the Recipient [list] can
            // be used as an example how Active Account should close its
            // panel") -- narrowed rather than reverting 2026-10-26 above: a
            // FAILED connect (result === false; ApproverController.connect's
            // own contract, see approverAccounts.ts) still leaves the list
            // open so its banner is seen, unchanged. A SUCCESSFUL connect
            // (no pending approval state to keep watching once it resolves
            // true) now closes again, matching every other pick-and-close
            // row in this app -- the Recipient list included, which already
            // worked this way and is what the owner pointed to as correct.
            onSelect: () => {
              void (async () => {
                const result = await onAccountRowSelect?.(account.id, group.id);
                if (result !== false) closeListOverlay();
              })();
            },
            onInfoClick: account.address
              ? () => {
                  openAccountDetail(account.address!);
                  onAccountIconClick?.(account.address!);
                }
              : undefined,
          })),
        })),
        infoIconSrc,
        errorMessage: accountListNotice,
        onAddWalletAccount: addAccountHost ? () => {
          closeListOverlay();
          openPanel(SP_COIN_DISPLAY.ADD_WALLET_ACCOUNT, 'MeritWallet:openAddWalletAccount');
        } : onAddAccount ? () => { closeListOverlay(); onAddAccount(); } : undefined,
      }),
    });
  const renderNetworkList = () =>
    React.createElement(AssetListSelectPanel, {
      containerType: SP_COIN_DISPLAY.ASSET_SELECT_LIST_PANEL,
      // No real FEED_TYPE concept exists for a network list — this
      // enum has no NETWORK_LIST member. WALLET_ACCOUNTS reused as
      // a safe inert placeholder: it's not a MANAGE_* value, so
      // isManageView stays false regardless (same as every other
      // branch here), the only thing feedType actually gates.
      feedType: FEED_TYPE.WALLET_ACCOUNTS,
      listContent: React.createElement(NetworkListTable, {
        rows: visibleNetworkRows.map((row) => ({
          ...row,
          // NetworkListRow's own AssetSelectDropDown gates its whole
          // symbol/name display on `hasEntity={!!address}` (a
          // TokenListRow/AccountListRow-ism this row shape
          // inherited). Corrected 2026-09-16: this used to fabricate
          // a fake native-currency placeholder address to satisfy
          // that gate — wrong, per the real app's own
          // NetworkSelectDropDown.tsx (`address={isRow ?
          // \`NetworkId : ${numericCurrentId}\` : triggerLabel}`),
          // which feeds a literal "NetworkId : $id" label into this
          // exact slot instead of a real/fake address. Matches that
          // exactly now — real per-chain data, not a fabricated
          // stand-in.
          address: `NetworkId : ${row.id}`,
          icon: row.iconSrc
            ? React.createElement('img', {
                src: row.iconSrc,
                alt: '',
                style: fitImageStyle,
              })
            : undefined,
          onSelect: () => {
            closeListOverlay();
            onNetworkRowSelect?.(row.id);
          },
          // 2026-09-17, on live report ("selecting the network.png in
          // any row is supposed to return the network... but instead
          // opens NETWORK_PANEL for every row") — was wired to
          // setNetworkDetailId (open the detail panel), on the belief
          // this row's own right-side auth-toggle slot leaves no room
          // for a separate info button, so the icon should fill that
          // role instead (see NetworkListRow.tsx's own doc comment).
          // That reasoning didn't match how every OTHER list row in
          // this file actually behaves: Token/Recipient/Account rows
          // never wire onIconClick as a detail-opener at the list
          // level at all (only their TRIGGER pill's own icon does,
          // once something is already active — see
          // activeNetworkRow's onIconClick below) — a list row's
          // icon commits, same as clicking the rest of the row, with
          // no onIconClick override needed since AssetSelectDropDown
          // already falls the click through to onRowClick when
          // onIconClick is omitted. Simply not overriding it here
          // makes network rows consistent with every other list.
        })),
        showTestNets,
        onToggleShowTestNets: () => setShowTestNets((prev) => !prev),
      }),
    });
  // Declared here, not near activeChild above, because it needs
  // renderNetworkList/renderAccountManagement (just defined) in scope —
  // see that earlier declaration site's own doc comment. activeChild itself
  // was already computed early (so activeListMode could derive from the
  // same single read) — passed straight through as AssetSelectListPanel's
  // one parameter, not re-read here.
  const sharedListHost = React.createElement(AssetSelectListPanelHost, {
    activeChild,
    walletChrome: true,
    renderNetworkList,
    renderAccountManagement,
  });
  const listOverlay =
    activeListMode === 'account'
      ? renderAccountManagement()
      : activeListMode === 'network'
        ? renderNetworkList()
        : null;

      // PanelGate's props type requires `children` as a prop, so createElement's children argument does not type-check here
      // eslint-disable-next-line react/no-children-prop
      const gatedTabBody = React.createElement(PanelGate, { panel: TAB_PANEL_IDS[activeTab], children: tabBody });

  // 2026-10-10: the shared Add a Wallet/Account flow (the host's addAccountHost), shown over the wallet like the profile editor.
  // docs/meritMigration.txt row 19 (found by the deep walk, 2026-10-20, in BOTH apps): backing out of the Add a Wallet/Account screens left the tab's title over a BLANK body. "Add a Wallet" closes the account-list overlay and then opens the add flow, so when the flow is
  // popped there is no invoker for the panel tree to restore and no radio panel is visible; clicking the tab you are already on does nothing by rule (handleTabClick), so the blank stayed until another tab was chosen.
  // When the add flow has CLOSED (checked after the pop is applied: calling openPanel in the same tick as the pop raced with it and made the first tap on Go back do nothing), the active tab's own panel is shown again.
  const prevAddFlowTopRef = useRef(addFlowTop);
  useEffect(() => {
    const wasOpen = prevAddFlowTopRef.current != null;
    prevAddFlowTopRef.current = addFlowTop;
    if (wasOpen && addFlowTop == null) openPanel(TAB_PANEL_IDS[activeTab], 'MeritWallet:addFlowRestoreTab');
  }, [addFlowTop]);
  const addAccountOverlay = addFlowTop != null && addAccountHost
    ? React.createElement(AddAccountFlow, { host: addAccountHost, wallet, activeAddress: activeAccountAddress, nativeWalletId, walletConnection, onDisconnectWallet, onDone: () => closePanel(addFlowTop, 'MeritWallet:addAccountFlow:done') })
    : null;
  // docs/meritMigration.txt row 14: the one account detail screen (avatar, profile table, Private Key row); the host's accountDetailHost says how a save is signed and how a key is revealed.
  const roleAccounts = roleContext?.apiCoreSyncedMembers?.accounts;
  const roleDetail = agentPanelVisible
    ? { role: SP_COIN_DISPLAY.AGENT_ACCOUNT as const, account: roleAccounts?.agentAccount, empty: 'No agent selected.' }
    : sponsorPanelVisible
    ? { role: SP_COIN_DISPLAY.SPONSOR_ACCOUNT as const, account: roleAccounts?.sponsorAccount, empty: 'No sponsor selected.' }
    : recipientPanelVisible
    ? { role: SP_COIN_DISPLAY.RECIPIENT_ACCOUNT as const, account: roleAccounts?.recipientAccount, empty: 'No recipient selected.' }
    : undefined;
  // The active account's detail: the address picked from a list, else the active account (the panel opened from the header).
  const detailAddress = accountDetailAddress ?? String((activeAccountForDetail as { address?: string } | undefined)?.address ?? '').trim() ?? undefined;
  const accountDetailOverlay = !accountDetailHost
    ? null
    : roleDetail
    ? roleDetail.account
      ? React.createElement(AccountDetailScreen, { account: roleDetail.account as spCoinAccount, role: roleDetail.role, host: accountDetailHost })
      : React.createElement('div', { style: walletFrameStyle.roleEmpty }, roleDetail.empty)
    : accountDetailVisible && detailAddress
    ? React.createElement(AccountDetailScreen, {
        account: { address: detailAddress, ...(accountDetail?.address === detailAddress ? { name: accountDetail.name, symbol: accountDetail.symbol, logoURL: accountDetail.avatarSrc } : {}) } as spCoinAccount,
        role: SP_COIN_DISPLAY.ACTIVE_ACCOUNT,
        host: accountDetailHost,
      })
    : null;

  // 2026-10-26 (owner report: TOKEN_PANEL's own TOKEN_LOGO/TOKEN_META_DATA
  // children never actually opened or closed anything — unlike
  // ACCOUNT_PANEL's AccountDetailScreen, which reads usePanelVisible on its
  // own ACCOUNT_LOGO/ACCOUNT_META_DATA pair). Root cause: this overlay used
  // to build the flat, static TokenDetailPanel (address/name/symbol rows,
  // no panel-tree awareness at all) instead of TokenPanel.tsx — the
  // package's own panel-tree-aware token screen, which already reads
  // TOKEN_META_DATA/TOKEN_LOGO visibility exactly the way AccountDetailScreen
  // reads its own pair (see this file's own 2026-10-20 doc comment above
  // previewToken: "TokenPanel.tsx ... already correctly uses" it) but was
  // never actually wired in here. TokenPanel is self-contained (reads
  // previewToken/chain/baseUrl via the engine's own hooks, same as
  // AccountDetailScreen reads its host), so no props are needed.
  const tokenDetailOverlay = tokenDetailVisible && previewTokenAddress
    ? React.createElement(TokenPanel, {})
    : null;

  // No loading branch needed — unlike accounts/tokens, this row's own data
  // (networkRowsSource) is already fully in memory the moment the icon is
  // clicked; see onNetworkIconClick's own doc comment on MeritWalletProps.
  const networkDetailRow = networkDetailVisible && networkDetailId
    ? networkRowsSource.find((row) => row.id === networkDetailId)
    : undefined;
  const networkDetailOverlay = networkDetailRow
    ? React.createElement(NetworkDetailPanel, {
        id: networkDetailRow.id,
        logoSrc: networkDetailRow.iconSrc,
        name: networkDetailRow.name,
        symbol: networkDetailRow.symbol,
        isTestnet: networkDetailRow.isTestnet,
      })
    : null;

  // 2026-09-29, real bug fix — see passwordMode's own doc comment on
  // MeritWalletProps for the full root-cause. Highest priority in this
  // chain, deliberately: a locked wallet should block every other overlay
  // (detail panels, list pickers, the tab body itself), matching
  // panelTreeCallbacks.ts's own "every other radio-member open redirects
  // to PASSWORD_PANEL while locked" behavior — the UI should reflect the
  // same precedence the real engine already enforces.
  // 2026-10-03, on request ("whenever displaying the PASSWORD_PANEL, never
  // display AGENT_HEADER_PANEL") — shared by the password overlay below and the
  // agent header's render site, so both follow the one condition.
  const passwordPanelShowing = !!walletLocked || activeMainOverlay === SP_COIN_DISPLAY.PASSWORD_PANEL;
  const passwordOverlay =
    passwordPanelShowing && recoveryPhrase
      ? React.createElement(RecoveryPhraseScreen, { recoveryPhrase, onContinue: () => onRecoveryPhraseSaved?.(), autoHide: false })
      : passwordPanelShowing
      ? React.createElement(PasswordPanel, {
          mode: passwordMode,
          showTitle: false,
          icon: passwordIconSrc ? React.createElement('img', { src: passwordIconSrc, alt: 'Merit Wallet', style: lockLogoStyle }) : undefined,
          errorText: passwordErrorText,
          noticeText: passwordNoticeText,
          onSubmit: onPasswordSubmit,
          submitting: passwordSubmitting,
          clearOnSubmit: true,
        })
      : null;
  const passwordOverlayWithReset =
    passwordOverlay && walletLocked && onResetWallet
      ? React.createElement(
          React.Fragment,
          null,
          passwordOverlay,
          React.createElement(
            'div',
            { style: walletFrameStyle.forgotRow },
            React.createElement(
              'button',
              { type: 'button', onClick: onResetWallet, style: walletFrameStyle.forgotLink },
              'Forgot password? Reset wallet',
            ),
          ),
        )
      : passwordOverlay;

  // 2026-10-05 — PANEL_TREE_PANEL is a main-radio view (opened from Config), not a tab: it replaces the body
  // while it is the showing member, exactly like the other full-body overlays.
  const panelTreeOverlay = panelTreeVisible ? React.createElement(PanelTreePanel) : null;

  // 2026-10-23 — MERIT_INFO_PANEL is PANEL_TREE_PANEL's own sibling in the
  // same MAIN_RADIO_OVERLAY_PANELS radio group (the "Merit Wallet" header
  // title opens it, WalletHeader.tsx's handleTitleClick) — same "replaces
  // the body while showing" treatment. See meritInfoVisible's own doc
  // comment above for why this was missing.
  // 2026-10-24 (owner report: the extension's own About panel showed
  // "N/A" for every field, the web app's showed real data) — baseUrl was
  // left at its default ('', same-origin relative), exactly the
  // portability wrinkle MeritInfoPanelReal.tsx's own header comment
  // already flagged: a relative fetch of /assets/miscellaneous/
  // meritInfo.json resolves fine for the web app but not from the
  // extension's chrome-extension:// origin. walletAssetBaseUrl already
  // exists and is passed to WalletPanel/WalletSelectDropDownHosted below
  // for this exact reason ("a host on another origin, the extension,
  // passes the web app's address") — just never wired to this panel too.
  const meritInfoOverlay = meritInfoVisible
    ? React.createElement(MeritInfoPanelReal, { baseUrl: walletAssetBaseUrl })
    : null;

  // 2026-10-09 -- the result card of a swap (Success / error, from the shared runUniswapSwap flow). The web app shows MESSAGE_PANEL through its
  // overlayHost; a host without one (the extension) gets it here, in place of the body, until the user closes it.
  const messageOverlay = messageVisible ? React.createElement(ConnectedMessagePanel) : null;

  // 2026-10-13 (owner request): WALLET_PANEL, the active wallet's account.json. The web app shows it through its overlayHost (walletPanel slot); a host without one (the extension) gets it here, in place of the body.
  const walletPanelOverlay = walletPanelVisible ? React.createElement(WalletPanel, { walletId: activeWalletId, baseUrl: walletAssetBaseUrl, showLogo: walletLogoVisible, showMetaData: walletMetaDataVisible }) : null;

  // 2026-10-23 — gated on `activeChild != null`, not the coarser
  // panelTreeListOpen (= ASSET_SELECT_LIST_PANEL's own flag alone): the two
  // can genuinely disagree (parent open, no child flag actually set is a
  // real transient state), and sharedListHost is a React element — always
  // truthy as a VALUE even when it will render null internally — so gating
  // on the less precise flag would let this `??` chain stop here with
  // nothing on screen instead of correctly falling through to listOverlay/
  // gatedTabBody.
  // 2026-10-26 (diagnostic, owner report: right-clicking a token row still
  // shows a blank body after tokenDetailOverlay was switched to read
  // previewToken) -- logs which of these resolved truthy/falsy right
  // before the chain picks one, so the next capture shows which overlay is
  // actually winning instead of tokenDetailOverlay.
  panelTreeTrace('MeritWallet:body overlay chain', {
    messageOverlay: messageOverlay != null,
    passwordOverlayWithReset: passwordOverlayWithReset != null,
    panelTreeOverlay: panelTreeOverlay != null,
    meritInfoOverlay: meritInfoOverlay != null,
    addAccountOverlay: addAccountOverlay != null,
    accountDetailOverlay: accountDetailOverlay != null,
    accountDetailVisible,
    tokenDetailOverlay: tokenDetailOverlay != null,
    tokenDetailVisible,
    previewTokenAddress,
    networkDetailOverlay: networkDetailOverlay != null,
    walletPanelOverlay: walletPanelOverlay != null,
    activeChild: activeChild != null ? SP_COIN_DISPLAY[activeChild] : null,
    listOverlay: listOverlay != null,
  });
  const body =
    messageOverlay ?? passwordOverlayWithReset ?? panelTreeOverlay ?? meritInfoOverlay ?? addAccountOverlay ?? accountDetailOverlay ?? tokenDetailOverlay ?? networkDetailOverlay ?? walletPanelOverlay ?? (activeChild != null ? sharedListHost : null) ?? listOverlay ?? gatedTabBody;

  // Matches the real app's own per-tab titles (useActiveWalletPanelTitle.tsx,
  // its `sponsorshipPanelVisible`/`tradingTabVisible`/`sendTabVisible`/
  // `rewardsTabVisible` ternary) — PanelTitle's own default ("Trading
  // Station") only ever matched the Swap tab; without this, every other
  // tab kept showing that stale default instead of updating to reflect
  // which one is actually active.
  // 2026-10-02 — the password overlay's title was a bare 'Login', which is
  // wrong for setup mode (there's no account to log into yet). This is the
  // text that sits immediately right of the Back button (PanelTitle's
  // `title` prop) — NOT PasswordPanel's own inner <h2>, which keeps its
  // original "Create Your Merit Wallet Password" / "Unlock Merit Wallet"
  // wording. PasswordPanel's inner heading is suppressed here because this
  // component already shows the state in PanelTitle; passwordMode drives both.
  // 2026-10-15 (owner request): "Select Software Wallet" / "Select Hardware Wallet" / "Select Wallet", by the list's two footer boxes
  const walletListScreenTitle = useWalletListTitle();
  const panelTitle = passwordOverlay
    ? passwordMode === 'setup' ? 'Create Account' : 'Account Login'
    : walletListLeafVisible
    ? walletListScreenTitle
    : addMenuVisible && panelTreeListOpen
    ? 'Add Wallet Account'
    : panelTreeVisible
    ? 'Panel Tree'
    : meritInfoVisible
    ? 'About Merit Wallet'
    : accountDetailVisible
    ? 'Account Details'
    : tokenDetailVisible
      ? 'Token Details'
      : networkDetailVisible
        ? 'Network Details'
        : activeListMode === 'sellToken' ||
    activeListMode === 'buyToken' ||
    activeListMode === 'sendToken'
      ? 'Select a Token'
      : activeListMode === 'sendRecipient'
        ? 'Select Recipient'
        : activeListMode === 'account'
          ? 'Active Account Selection'
          : activeListMode === 'network'
            ? 'Select Network'
            : activeTab === 'SWAP'
          ? 'Trading Station'
          : activeTab === 'SEND'
            ? 'Send Token'
            : activeTab === 'SPONSOR'
              ? 'Add Sponsorship'
              : activeTab === 'REWARDS'
                ? 'Rewards Management'
                : 'Wallet Config';

  return (
    <WalletBalanceContext.Provider value={walletBalanceValue}>
    {/* 2026-10-09: connect mode is derived from "no active account"; every action button below turns into a Connect button that opens the account list. */}
    <WalletConnectProvider hasAccount={!!String(activeAccountAddress ?? '').trim()} openAccountList={() => setActiveList('account')}>
    <ActiveAccountProfileContext.Provider value={activeAccountEntry ? { address: activeAccountEntry.address, name: activeAccountEntry.name, symbol: activeAccountEntry.symbol, logoURL: activeAccountEntry.iconSrc } : undefined}>
    <div className={walletFrameClassName} style={walletFrameStyle.frame(fullWidth, docked)}>
      <style>{walletFrameCss}</style>
      {/* 2026-10-13 (owner request): the login / create-account page has its OWN grey header (LOGIN_HEADER): a text title and the close button, nothing else.
          While it shows, the network header and the account header below are not rendered. */}
      {passwordPanelShowing && (
        <PanelGate panel={SP_COIN_DISPLAY.LOGIN_HEADER} lazyLoad={false}>
          <LoginHeader
            title={recoveryPhrase || passwordMode === 'setup' ? 'Create Merit Wallet Account' : 'Merit Wallet Login'}
            onClose={onClose}
            appType={appType}
            wwwIconSrc={wwwIconSrc}
            closeIconSrc={closeIconSrc}
          />
        </PanelGate>
      )}
      {!passwordPanelShowing && (
      <PanelGate panel={SP_COIN_DISPLAY.WALLET_NETWORK_HEADER} lazyLoad={false}>
        <WalletNetworkHeader
          mode="normal"
          leftSlot={
            <NetworkSelectDropDown
              label={activeNetworkRow?.name}
              // 2026-09-16, on live report ("the NetworkSelectDropDown is
              // not showing the network icon in the WALLET_NETWORK_HEADER")
              // — activeNetworkRow.iconSrc was already real (same value the
              // Select Network list's own rows resolve their icon from
              // below), this render site just never turned it into an
              // <img> and passed it into NetworkSelectDropDown's own icon
              // slot — same conversion the network-list rows already do.
              icon={
                activeNetworkRow?.iconSrc
                  ? React.createElement('img', {
                      src: activeNetworkRow.iconSrc,
                      alt: '',
                      style: fitImageStyle,
                    })
                  : undefined
              }
              onSelectClick={() => toggleList('network')}
              onIconClick={
                activeNetworkRow
                  ? () => {
                      openNetworkDetail(activeNetworkRow.id);
                      onNetworkIconClick?.(activeNetworkRow.id);
                    }
                  : undefined
              }
              chevronUp={activeListMode === 'network'}
            />
          }
          titleBadgeSrc={titleBadgeSrc}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onClose={onClose}
          appType={appType}
          wwwIconSrc={wwwIconSrc}
          closeIconSrc={closeIconSrc}
        />
      </PanelGate>
      )}
      {/* 2026-10-02 — WALLET_ACCOUNT_HEADER had no reader anywhere: this render
          site is the only one in the app (the app's own
          components/views/Headers/PanelSubTitle.tsx, which also rendered a
          WalletAccountHeader, turned out to be dead code — imported by nothing),
          and it rendered ungated, so toggling the flag in the panel tree did
          nothing. `lazyLoad={false}` matches the network header directly above:
          keep the account row mounted and hide it, rather than unmounting and
          re-running its onIconClick/onSelectClick wiring on every toggle. */}
      {!passwordPanelShowing && (
      <PanelGate panel={SP_COIN_DISPLAY.WALLET_ACCOUNT_HEADER} lazyLoad={false}>
        <WalletAccountHeader
          icon={activeAccountEntry?.icon}
          address={activeAccountEntry?.address}
          symbol={activeAccountEntry?.symbol}
          name={activeAccountEntry?.name}
          placeholderLabel="Select Account"
          onSelectClick={() => toggleList('account')}
          onIconClick={(address) => {
            if (!address) return;
            openAccountDetail(address);
            onAccountIconClick?.(address);
          }}
          chevronUp={activeListMode === 'account'}
          walletName={activeWalletName}
        />
      </PanelGate>
      )}
      {/* 2026-09-24, AGENT_HEADER_PANEL EXT wiring — mounted with the real,
          live agentName (see the useAgentAccount() call above) rather than
          fully inert. Positioned to match the real web app's own
          components/views/MeritWallet.tsx, which renders
          <AgentHeaderContainer /> immediately before its own tab-strip
          area (MenuTabHeaderBar) — same relative position here, just
          before the PanelTitle/MenuTabHeaderBar block below. Self-gates
          via its own internal PanelGate(AGENT_HEADER_PANEL) default, so
          this renders nothing unless/until something opens that panel.
          2026-09-25: agentName wired real (see this file's own
          useAgentAccount comment above for what's still deferred — the
          picker's own icon dependency chain). */}
      {/* Never shown on the Account Login / Create Account screen, whatever the
          AGENT_HEADER_PANEL flag says. Unmounting (not just hiding) also drops
          the Ctrl+Alt+A shortcut while locked, which is intended: there is no agent
          to pick before the wallet is unlocked. */}
      {!passwordPanelShowing && (
        <AgentHeaderPanel agentName={agentAccount?.name}>
          {/* 2026-10-08 (docs/meritWalletNpmDesignToDo.txt row 5): the default is the engine-wired picker (AgentSelectDropDown.tsx in this
              package), the same one the web app uses, instead of an inert pill. A host can still pass its own through agentSelectSlot. */}
          <ConnectedAgentSelectDropDown />
        </AgentHeaderPanel>
      )}
      <div style={walletFrameStyle.body}>
        {/* 2026-10-03 — PANEL_TITLE and MENU_TAB_HEADER_BAR rendered ungated
            here: the only reads of those flags were the Ctrl+Alt+T / Ctrl+Alt+A key
            handlers, so a tree-row toggle changed the store and nothing else.
            The web app's own wrappers (ActiveWalletPanelTitle,
            AccountPanelContent) already gate them; this render site did not. */}
        {/* 2026-10-13 (owner request): no title row ("Account Login" / "Create Account") under the grey header on the login screen: the grey header already says it. */}
        {!passwordPanelShowing && (
        <PanelGate panel={SP_COIN_DISPLAY.PANEL_TITLE} lazyLoad={false}>
        <PanelTitle
          title={panelTitle}
          onMenuClick={handleMenuClick}
          menuOpen={menuTabHeaderVisible}
          // 2026-10-03, on request — on the Account Login / Create Account
          // screen the title bar shows only its title: no back button (nothing
          // to go back to while locked) and no hamburger menu.
          hideBackButton={passwordPanelShowing}
          hideMenuButton={passwordPanelShowing}
          // 2026-09-15 — the back arrow already existed (inert, no
          // onBackClick ever passed); now real whenever a list overlay is
          // open, closing it back to the tab it was opened from.
          // 2026-10-05, task 11c (live report: back arrow did nothing
          // with SPONSORSHIP_PANEL open — no detail overlay was open,
          // so this was `undefined` and the click was inert) — final
          // fallback is now the real panel-tree pop-top: closePanel's
          // legacy string-first overload pops the top IS_STACK_COMPONENT
          // off displayStack, hides it (NAV_CLOSE: invoker →
          // radio-restore-on-pop) and re-opens whatever is next on the
          // stack (usePanelTree.ts's closePanel pop-top branch). No-ops
          // safely when the stack is empty. Same call shape as the web
          // app's own ActiveWalletPanelTitle back button.
          onBackClick={
            accountDetailVisible
              ? () => {
                  setAccountDetailAddress(null);
                  closePanel('NAV_POP:MeritWallet:accountDetailBack');
                }
              : tokenDetailVisible
                ? () => {
                    if (previewToken) setPreviewTokenContract(undefined);
                    closePanel('NAV_POP:MeritWallet:tokenDetailBack');
                  }
                : networkDetailVisible
                  ? () => {
                      setNetworkDetailId(null);
                      closePanel('NAV_POP:MeritWallet:networkDetailBack');
                    }
                  : addFlowTop != null
                    ? () => closePanel(addFlowTop, 'NAV_POP:MeritWallet:addFlowBack')
                    // 2026-10-28, real bug fix (live report, Test page:
                    // "the down chevron points up" after Back from the
                    // Sponsor tab's recipient list, and never reverts) —
                    // activeListMode is null for a list opened directly
                    // through openActiveListPanel rather than this
                    // component's own setActiveList (RecipientSelectDropDown.tsx's
                    // REMOTE_ACCOUNT_RECIPIENT_LIST among them — it only ever
                    // recognizes its own 'account'/'network' fallback modes,
                    // see this file's own activeListMode derivation comment),
                    // so Back fell through to the generic stack-pop below,
                    // which never calls closeActiveListPanel — the list's
                    // flags stayed stuck true, and the chevron (which reads
                    // REMOTE_ACCOUNT_RECIPIENT_LIST's own visibility) stayed
                    // pointing up forever. activeChild (useActiveListPanelChild,
                    // already this file's own single source of truth
                    // elsewhere) covers all six ACTIVE_LIST_PANEL_MODES
                    // members, not just two — same close action already
                    // proven correct for account/network.
                    : activeListMode || activeChild != null
                      ? () => setActiveList(null)
                      : () => closePanel('MeritWallet:back')
          }
        />
        </PanelGate>
        )}
        {/* Only the tab STRIP follows MENU_TAB_HEADER_BAR; the body below it
            is WALLET_RADIO_PANELS' and must not collapse with it. */}
        {/* 2026-10-03, on request — the tab strip is also hidden while the
            password panel is active (it collapses; the body below it, which IS
            the password form, is untouched). */}
        {/* 2026-10-12 (accountAuthDesign row 11): while another wallet is deciding on a request, one neutral line says so (nothing shows when nothing is pending). 2026-10-13: it is OUTSIDE the tab header bar, so it also shows over the lock screen, and it
            also says how a request just ended ("Merit extension did not approve: User rejected the request."). */}
        {/* 2026-10-14 (owner request): the waiting / did-not-approve notice is a MESSAGE_PANEL message (useApprovalMessagePanel, called above), not a line over the wallet. */}
        <MenuTabHeaderBar open={menuTabHeaderVisible && !passwordPanelShowing} activeTab={highlightedTab} onTabClick={handleTabClick}>
          {/* 2026-09-22 — `body` (whichever of tabBody/listOverlay/the
              three detail overlays is currently active — see that
              variable's own definition above) now renders through the
              real, shared WALLET_RADIO_PANELS gate instead of directly,
              matching the Web App's own RadioOverlayPanelHost, which
              WalletRadioPanels.tsx there already wraps this same way. Real
              shared code now, not two independently-hand-synced copies —
              see docs/npmPanelDisplayIssue.md. */}
          {/* 2026-10-13 (owner request): the wallet pill, just under the tabs (not on the lock screen). The down chevron opens the wallet list, the icon the active wallet's panel. */}
          {/* 2026-10-13 (owner request): the wallet pill belongs to the Active Account Selection page only, not to the tab pages. */}
          {showWalletSelect && !passwordPanelShowing && panelTreeListOpen && (addMenuVisible || walletListVisible) && !walletListLeafVisible && (
            <div id="WALLET_SELECT_ROW" style={walletFrameStyle.walletSelectRow}>
              <WalletSelectDropDownHosted walletId={pillWalletId} displayName={pillWalletId ? walletName(pillWalletId) : undefined} baseUrl={walletAssetBaseUrl} />
            </div>
          )}
          <WalletRadioPanels>{body}</WalletRadioPanels>
        </MenuTabHeaderBar>
      </div>
      <WalletSessionDialogs dialog={sessionDialog} onClose={() => setSessionDialog(null)} session={walletSession} />
      {/* 2026-09-24, SPONSOR_STAKING_LIST EXT wiring (minimal bar) — mounted
          unconditionally, as a sibling of the tab body rather than folded
          into it, since it's a real web-app overlay (opened from
          ManageSponsorshipsPanel's "Staked" row Unstake button, above) that
          layers on top of whichever tab was already showing, not a tab
          itself. Self-gates via its own internal PanelGate(SPONSOR_STAKING_LIST)
          default, so this renders nothing until openPanel above actually
          opens it. Inert defaults (empty recipients/no data) — no real
          on-chain staking-list feed exists in the extension yet; see
          docs/npmMigrationDesign.md's own dated entry on that real,
          separately-scoped gap. */}
      {/* 2026-10-03 — skipped when a consumer supplies overlayHost: that host
          (the web app's RadioOverlayPanelHost) already mounts its own real
          SponsorStakingListPanel on the same SPONSOR_STAKING_LIST flag, so
          this inert copy rendered a second, empty table under it. */}
      {/* 2026-10-14 (owner report: the locked extension showed the staking list instead of the login form): this overlay self-gates on a flag the extension REMEMBERS across sessions, so it must not draw while the login page is showing. */}
      {!passwordPanelShowing && (
        stakingHost ? <ConnectedSponsorStakingList host={stakingHost} /> : <SponsorStakingListPanel recipients={[]} stakeInfoByAddress={{}} decimals={18} loading={false} />
      )}
      {/* 2026-09-27, STAKING_CONTROLLER_PANEL EXT wiring — render the portable
          StakingControllerPanel shell as a sibling overlay, same pattern as
          SponsorStakingListPanel above. Once Phase B.2 wires the real
          exchangeTradingPair/connectTradeButton slots into
          SponsorshipPanel, this shell was meant to migrate to the
          recipientSelectPanel slot and the inert fallback would drop out.
          2026-09-29 fix #1 (real bug report — this shell bled through under
          every tab, not just SPONSOR): gated on activeTab === 'SPONSOR'
          directly, since usePanelVisible's own flag only answers "has this
          panel ever been opened," not "is SPONSOR the tab showing right
          now."
          2026-09-29 fix #2 (real bug report — "Recipient Name not Specified"
          duplicated on screen): even correctly confined to the SPONSOR tab,
          this shell is currently pure duplicate content. Its ENTIRE render
          (see StakingControllerPanel.tsx) is a config cog + "You are
          Sponsoring" + recipientContent — nothing else; the config cog's
          own target (SPONSOR_CONFIG_PANEL) isn't wired into this tab body
          anywhere. SponsorshipPanel's own inert fallback below (used
          because no real recipientSelectPanel/exchangeTradingPair/etc.
          slots are passed to it yet — see ITS OWN doc comment) already
          renders the identical "You are Sponsoring" header, PLUS the real,
          wired amount inputs and submit button this shell doesn't have.
          Disabled entirely rather than left duplicating that header until
          Phase B.2 actually gives this shell something unique to show
          (real sponsor-rate config, once SPONSOR_CONFIG_PANEL is wired) —
          re-enable then, not before.
      {activeTab === 'SPONSOR' && !passwordPanelShowing && (
        <StakingControllerPanel
          sponsorMode={'SPONSOR' as StakingControllerPanelMode}
          recipientContent={stakingControllerRecipientContent}
          configCog={stakingControllerConfigCog}
        />
      )}
      */}
      {/* 2026-09-14, on request ("put a marker on the wallet to be sure",
          later "this marker is to be updated... for every deploy in the
          extension package") — a small, permanent identity+freshness stamp
          on the component ITSELF, not just the host page's own build-number
          tag (e.g. the extension's sidepanel.html #build-tag). That tag
          only confirms which page build is loaded; it says nothing about
          which component actually rendered inside it, or whether THIS
          component is current. This one does: it's baked into
          MeritWallet.tsx itself, so it appears wherever this exact shared
          component is used (the extension today; the web app too, if/when
          it re-adopts this component) — a direct, unambiguous "yes, this is
          genuinely @sponsorcoin/spcoin-panels' MeritWallet, at build N"
          signal, not an inference from layout resemblance alone. The build
          number comes from packageBuildTag.ts's single PACKAGE_BUILD
          constant — bump that one file, this (and every tab-panel body's
          own matching marker) updates together. See components/views/
          MeritWallet.tsx (spcoin-nextjs-front-end) for the web app's own,
          separate, non-numbered marker on its own genuinely different
          component of the same name — the two are NOT the same file today
          (see extensionPlan.txt's "Direction changed" entry); this marker
          is what makes that fact directly visible instead of assumed. */}
      {/* 2026-09-15 — same SHOW_BUILD_MARKERS switch TabBodyMarker.tsx now
          checks internally (see packageBuildTag.ts's own doc comment) —
          this marker isn't rendered via that shared component, so it
          needs its own check. */}
      <StakeConfirmPopup
        isOpen={plainSend.open && !plainSend.viewing}
        mode="SPONSOR"
        isSpCoin={false}
        sendOnly
        payTokenContract={{ address: sendTokenEntry.address ?? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', chainId, symbol: sendTokenEntry.symbol, name: sendTokenEntry.name, decimals: sendTokenEntry.decimals, logoURL: sendTokenEntry.iconSrc } as unknown as TokenContract}
        activeAccount={toMessageAccount(activeProfileRef.current)}
        recipientAccount={toMessageAccount(sendRecipientProfile)}
        hasAgent={false}
        swapReceiptReady={plainSend.phase === 'done'}
        swapReceiptKept={plainSend.phase === 'done'}
        swapScrollRead={plainSend.scrollRead}
        onShowSwapReceipt={showSendStepReceipt}
        onCancel={() => plainSendStepStore.close()}
        onConfirm={() => {
          void confirmSendStep();
        }}
        chainId={chainId}
      />
      {SHOW_BUILD_MARKERS && (
        <div data-build-marker="" style={walletFrameStyle.buildMarker}>
          ⟨@sponsorcoin/merit-wallet/MeritWallet.tsx · build {PACKAGE_BUILD}⟩
        </div>
      )}
      {/* The screen that answers a write's approval (Approve / Reject, the password when locked) is
          now MESSAGE_PANEL itself — useMeritApprovalMessagePanel(approvalHost) above drives it;
          nothing renders here any more. */}
    </div>
    </ActiveAccountProfileContext.Provider>
    </WalletConnectProvider>
    </WalletBalanceContext.Provider>
  );
}

let warnedNoAccountSource = false;

/**
 * The component. A host that passes `wallet` gets the lock screen, the lock button, the authentication type and the Wallet Security section from it (src/wallet/walletProps.tsx); everything else, and every
 * prop the host passes explicitly, is unchanged.
 */
function MeritWalletWired(props: MeritWalletProps) {
  const platform = props.platform ?? domPlatform;
  // 2026-10-15 (docs/design/spcoinPackagesDesign.txt 8.5.7 item 4): a host must say where its accounts come from (a wallet, its own account groups, or a chain to self-fetch for). A host that says none gets the component's SAMPLE accounts and tokens, which is
  // never what a deployment wants, so it is reported loudly, once, instead of shipping silently.
  React.useEffect(() => {
    if (props.wallet === undefined && props.accountGroups === undefined && props.chainId === undefined && !warnedNoAccountSource) {
      warnedNoAccountSource = true;
      console.error('MeritWallet: the host supplied no wallet, no accountGroups and no chainId, so the wallet shows SAMPLE data. Inject one of them (docs/design/spcoinPackagesDesign.txt 8.5.4).');
    }
  }, [props.wallet, props.accountGroups, props.chainId]);
  const derived = useWalletDerivedProps(props.wallet, props.activeAccountAddress, props.walletDerives);
  const wantsAccounts = !!props.approverHost && (props.walletDerives ?? ALL_WALLET_DERIVATIONS).includes('accounts');
  const approvers = useApproverAccounts(wantsAccounts ? props.wallet : undefined, props.approverHost, props.activeAccountAddress, platform);
  const accountDerived: Partial<MeritWalletProps> = approvers.groups
    ? {
        accountGroups: approvers.groups,
        accountListNotice: approvers.notice || undefined,
        onAccountRowSelect: async (accountId: string, groupId?: string) => {
          const approverId = (groupId ?? (props.wallet ? props.wallet.backendIdFor(accountId) : undefined)) as AuthenticatorId | undefined;
          if (!approverId || !approvers.controller) return false;
          return approvers.controller.connect(approverId, accountId);
        },
      }
    : {};
  // A host that passes `approverHost` has asked for the derived account list: it replaces the host's own accountGroups / onAccountRowSelect (which stay as the fallback until the list has loaded).
  const activeWalletId = props.wallet && props.activeAccountAddress ? props.wallet.backendIdFor(props.activeAccountAddress) : undefined;
  const activeWalletName = activeWalletId && props.wallet ? props.wallet.backend(activeWalletId)?.name : undefined;
  const nativeWalletId = props.nativeWalletId ?? props.approverHost?.nativeWalletId;
  // the wallet list's Connected / Disconnected buttons, from the approver list (a wallet is connected when the host says so or the connected-only list holds it)
  const connectionOfWallet: Record<string, AuthenticatorId> = { merit: 'serverKeystore', meritExtension: 'injected:org.sponsorcoin.merit', metamask: 'injected:io.metamask', ledger: 'hardware:ledger', trezor: 'hardware:trezor' };
  const derivedConnection: Partial<MeritWalletProps> = approvers.groups
    ? {
        walletConnection: props.walletConnection ?? Object.fromEntries(Object.entries(connectionOfWallet).map(([slug, id]) => [slug, props.approverHost?.isConnected?.(id) ?? approvers.groups!.some((g) => g.id === id)])),
        onDisconnectWallet: props.onDisconnectWallet ?? ((slug: string) => { const id = connectionOfWallet[slug]; if (id) void approvers.controller?.disconnect(id); }),
      }
    : {};
  const merged = props.wallet ? { ...mergeWalletProps(props, { ...derived, activeWalletName }, props.wallet, props.activeAccountAddress), activeWalletId: props.activeWalletId ?? activeWalletId, nativeWalletId, ...accountDerived, ...derivedConnection } : { ...props, nativeWalletId };
  return React.createElement(MeritPlatformContext.Provider, { value: platform }, React.createElement(MeritWalletInner, merged));
}

/**
 * The component. First-run setup replaces the wallet (a different component type, so the wallet's own state starts fresh when setup ends, the same as when the host used to swap it out);
 * otherwise the wired wallet. The setup screen runs inside the same platform context (clipboard) as the wallet.
 */
export default function MeritWallet(props: MeritWalletProps) {
  if (props.onboarding) {
    return React.createElement(MeritPlatformContext.Provider, { value: props.platform ?? domPlatform }, React.createElement(WalletOnboardingPanel, props.onboarding));
  }
  return React.createElement(MeritWalletWired, props);
}

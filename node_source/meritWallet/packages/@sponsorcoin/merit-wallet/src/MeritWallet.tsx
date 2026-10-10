// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/MeritWallet.tsx
// 2026-10-08 — moved here, unchanged apart from its imports, from @sponsorcoin/spcoin-panels (docs/meritWalletNpmDesignToDo.txt, S1).
// Self-contained Merit Wallet component — 2026-09-14, per docs/design/
// extensionPlan.md's "Direction changed" entry (one shared `MeritWallet`
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
// this component — extensionPlan.md's "Third slice" entry ruled that
// migration out (PasswordGateOrchestrator.tsx depends on it app-wide;
// migrating it wrong risks the password gate failing to force closed).
// Whether/when to render this component at all stays the host's call.

'use client';

import { walletColors } from '@sponsorcoin/spcoin-common/styles';
import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { formatUnits, getAddress } from 'viem';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { APP_TYPE } from '@sponsorcoin/spcoin-common';
import type { TokenContract } from '@sponsorcoin/spcoin-common/context';
import { TRADE_DIRECTION } from '@sponsorcoin/spcoin-common/context';
import {
  usePanelTree,
  usePanelVisible,
  useEnforceRadioPanelGroups,
  useEnforcePanelAncestorVisibility,
  useEnforceRadioPanelContainers,
  useAgentAccount,
  useSellTokenContract,
  useBuyTokenContract,
  useSlippage,
  useTradeDirection,
  useSellAmount,
  useBuyAmount,
  sponsorRateConfigStore,
  deriveSponsorRatePercentages,
  useSponsorMode,
} from '@sponsorcoin/spcoin-exchange-engine';
import { PanelGate } from '@sponsorcoin/spcoin-panels';
import { WalletConnectProvider } from '@sponsorcoin/spcoin-panels';
import { ConfigSlippagePanel } from '@sponsorcoin/spcoin-panels';
import type { IconCacheStorage } from '@sponsorcoin/spcoin-feeds/shared';
import { createMeritWalletIconCaches, buildNetworkRows as selfFetchNetworkRows, fetchAccountGroups as selfFetchAccountGroups, buildRecipientRows as selfFetchRecipientRows, buildAllAccountRows as selfFetchAllAccountRows, buildTokenRows as selfFetchTokenRows } from './panels';
// Panel visibility in this component goes through exactly one engine:
// @sponsorcoin/spcoin-exchange-engine's panelStore, read via PanelGate /
// usePanelVisible. The package's own separate store (panelState.ts) was
// deleted 2026-10-02 — see this package's index.ts header for why a
// second store let a tree toggle silently do nothing.
import { PACKAGE_BUILD, SHOW_BUILD_MARKERS } from '@sponsorcoin/spcoin-panels';
import { WalletNetworkHeader } from '@sponsorcoin/spcoin-panels';
import { NetworkSelectDropDown } from './panels';
import { WalletAccountHeader } from './panels';
import { PanelTitle } from './panels';
import ConnectedMessagePanel from './ConnectedMessagePanel';
import ConnectedRewardsPanel, { type RewardsHost } from './rewards/ConnectedRewardsPanel';
import AccountProfileEditor, { type AccountProfileHost } from './account/AccountProfileEditor';
import AddAccountFlow, { type AddAccountHost } from './account/AddAccountFlow';
import ConnectedSponsorStakingList, { type SponsorStakingHost } from './sponsor/ConnectedSponsorStakingList';
import { getStakedRawForPair } from './sponsor/sponsorReads';
import { buildSendReceipt, buildStakeReceipt, type HostTransactionResult } from './receipt/transactionReceipts';
import { isNativePlaceholder, parseDecimalToWei } from './send/sendTransfer';
import { useTransactionReceipt } from './receipt/useTransactionReceipt';
import { ActiveAccountProfileContext } from './swap/activeAccountProfile';
import { MenuTabHeaderBar, type MenuTabKey } from './panels';
import { WalletRadioPanels } from './panels';
import { TradingStationPanel } from './panels';
import { SendTabPanel } from './panels';
import { SponsorshipPanel, StakingControllerPanel, ConfigSponsorshipPanel } from '@sponsorcoin/spcoin-panels';
import { ManageSponsorshipsPanel } from '@sponsorcoin/spcoin-panels';
import { AgentHeaderPanel } from '@sponsorcoin/spcoin-panels';
import ConnectedAgentSelectDropDown from './AgentSelectDropDown';
import { WalletConfigPanel, type OpenTarget,
  type MeritWalletPasswordMode as ConfigPasswordMode,
  type ApplicationSyncMode,
  type MeritWalletLocation,
  type MeritExtensionChannel, } from '@sponsorcoin/spcoin-panels';
import { PasswordPanel } from '@sponsorcoin/spcoin-panels';
import { AssetListTable, type AssetListEntry } from '@sponsorcoin/spcoin-panels';
import { AccountListCard, type AccountListGroup } from '@sponsorcoin/spcoin-panels';
import { SponsorStakingListPanel } from '@sponsorcoin/spcoin-panels';
import { FEED_TYPE } from '@sponsorcoin/spcoin-common/context';
import { AssetListSelectPanel } from '@sponsorcoin/spcoin-panels';
import { AddressPanel } from './panels';
import { PanelTreePanel } from '@sponsorcoin/spcoin-panels';
import { WalletBalanceContext, useFetchedBalance, fetchedBalanceText, type FetchBalance } from '@sponsorcoin/spcoin-panels';
import { balancesChangedStore, classifyAddressText, type AssetEntryKind, type AssetEntryResult } from '@sponsorcoin/spcoin-exchange-engine';
import type { AssetPreviewRowProps } from '@sponsorcoin/spcoin-panels';
import { AccountDetailPanel } from './panels';
import { TokenDetailPanel } from './panels';
import { NetworkDetailPanel } from './panels';
import { NetworkListTable, type NetworkListEntry } from '@sponsorcoin/spcoin-panels';
import { type NetworkAuthSource } from '@sponsorcoin/spcoin-panels';
import type { MeritWalletNetworkRow } from './panels';

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
import SwapTradeButton, { type SwapTradeButtonHost } from './swap/SwapTradeButton';
import ConnectedUniSelectPanel from './swap/ConnectedUniSelectPanel';
import { RADIO_PANEL_GROUPS_WITH_FALLBACKS, EMPTY_RADIO_PANEL_GROUPS } from './radioPanelGroups';

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
type ActiveListMode =
  | 'sellToken'
  | 'buyToken'
  | 'sendToken'
  | 'sendRecipient'
  | 'sponsorPayToken'
  | 'sponsorRecipient'
  | 'account'
  | 'network'
  | null;

// 2026-09-21, Path A — which real id each ActiveListMode value opens.
// Several modes share one list TYPE (sellToken/buyToken/sendToken/
// sponsorPayToken all open the same token list) — distinguishing WHICH
// trade slot a list fills has no panel-tree equivalent and correctly
// stays local state (`activeListMode` itself, read by `commitSelection`
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

const LIST_PANEL_ID_FOR_MODE: Record<Exclude<ActiveListMode, null>, SP_COIN_DISPLAY> = {
  sellToken: SP_COIN_DISPLAY.MERIT_WALLET_TOKEN_LIST_OVERLAY,
  buyToken: SP_COIN_DISPLAY.MERIT_WALLET_TOKEN_LIST_OVERLAY,
  sendToken: SP_COIN_DISPLAY.MERIT_WALLET_TOKEN_LIST_OVERLAY,
  sponsorPayToken: SP_COIN_DISPLAY.MERIT_WALLET_TOKEN_LIST_OVERLAY,
  sendRecipient: SP_COIN_DISPLAY.MERIT_WALLET_SEND_RECIPIENT_LIST_OVERLAY,
  sponsorRecipient: SP_COIN_DISPLAY.MERIT_WALLET_SPONSOR_RECIPIENT_LIST_OVERLAY,
  account: SP_COIN_DISPLAY.MERIT_WALLET_ACCOUNT_LIST_OVERLAY,
  network: SP_COIN_DISPLAY.MERIT_WALLET_NETWORK_LIST_OVERLAY,
};
// Every real id ANY mode above can open — used to unconditionally close
// whichever one was actually open, without this component needing to
// separately track "which real id is currently open" alongside
// activeListMode itself (closePanel on an already-closed panel is a
// no-op, so closing all of these is safe, not wasteful in any way that
// matters).
//
// 2026-09-30 — these are now Merit Wallet's own private
// MERIT_WALLET_*_LIST_OVERLAY ids (flat roots, no parent/children — see
// spCoinDisplay.ts's own doc comment), not the real app's shared
// REMOTE_TOKEN_LIST/ACTIVE_LIST_PANEL family. Since nothing else in the
// tree declares them as a child, opening one no longer auto-reveals any
// ancestor (useEnforcePanelAncestorVisibility.ts has nothing to walk up
// to) — the explicit ACTIVE_LIST_PANEL/ASSET_LIST_SELECT_PANEL closes
// this function used to need right after this loop are gone for the same
// reason: there is no shared ancestor left for Merit Wallet to leave
// stuck open.
const ALL_LIST_PANEL_IDS: readonly SP_COIN_DISPLAY[] = [
  SP_COIN_DISPLAY.MERIT_WALLET_TOKEN_LIST_OVERLAY,
  SP_COIN_DISPLAY.MERIT_WALLET_SEND_RECIPIENT_LIST_OVERLAY,
  SP_COIN_DISPLAY.MERIT_WALLET_SPONSOR_RECIPIENT_LIST_OVERLAY,
  SP_COIN_DISPLAY.MERIT_WALLET_ACCOUNT_LIST_OVERLAY,
  SP_COIN_DISPLAY.MERIT_WALLET_NETWORK_LIST_OVERLAY,
];

// Static sample rows — this package has no real feed to query (see
// AssetListTable.tsx's own "placeholder, not logic" doc comment); a
// representative, clearly-fake set is enough to prove the shared list
// shape renders and scrolls correctly, same "representative state by
// default" treatment ManageSponsorshipsPanel/RewardRow already use.
const SAMPLE_TOKEN_ROWS: AssetListEntry[] = [
  { id: '0xeeee', symbol: 'ETH', name: 'Ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
  { id: '0xspcoinv0', symbol: 'SPCOIN_V0', name: 'Sponsor Coin V0', address: '0xf3405e01f11d9d7841b4dc61f13a9834c88a5e1b' },
  { id: '0xweth', symbol: 'WETH', name: 'Wrapped Ether', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
];

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
// first" convention. Real per-chain auth-source state (merit/metamask)
// lives in this component's own useState below, keyed by row id, exactly
// how networks.tsx keys NetworkAuthToggle per chainId.
const SAMPLE_NETWORK_ROWS: NetworkListEntry[] = [
  { id: 'eth-mainnet', symbol: 'ETH', name: 'Ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', isActive: true },
  { id: 'polygon', symbol: 'MATIC', name: 'Polygon', address: '0x00000000000000000000000000000000001010' },
  { id: 'hardhat', symbol: 'HH', name: 'Hardhat', address: '0x0000000000000000000000000000000000539b' },
];

export type { MeritWalletNetworkRow };

export interface MeritWalletProps {
  /**
   * 2026-10-05 — resolves an address typed into a list's ADDRESS_PANEL that is NOT in the
   * rows already loaded (on-chain token lookup / account hydration). The host builds it
   * from the engine's resolveAssetEntry with its own RPC client; omit it and such an
   * address just shows "not in this list". `peerAddress` is the other side's token (duplicate guard).
   */
  resolveAssetAddress?: (address: string, kind: AssetEntryKind, peerAddress?: string) => Promise<AssetEntryResult>;
  /** Docked (full-height, square corners, no right border — a split-pane
   *  layout) vs. floating/dialog (rounded corners, capped height). Default
   *  false. */
  docked?: boolean;
  /** Drops the web app's 364px cap in favor of a plain 100% width — for a
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
  // 2026-09-16, on live report ("I think the selection lists are different
  // in the web site vs the extension") — Send/Sponsor's own recipient
  // picker used to silently fall back to flatAccountRows (the WALLET's
  // own accounts — HH_BASE_1..19), the same fallback this file's own
  // comment right below already flags as a placeholder. The real app's
  // Send/Sponsor recipient picker reads a genuinely different, chain-
  // scoped directory (FEED_TYPE.REMOTE_RECIPIENT_ACCOUNTS — real
  // sponsor-selected causes, e.g. "FREE | Born Free USA"), confirmed live
  // by comparing the two side by side. Optional and additive: omit to
  // keep today's flatAccountRows fallback for a consumer with no real
  // recipient feed of its own yet.
  recipientRows?: AssetListEntry[];
  /** (Kept for hosts that still pass it; the staked line now reads fetchStakedAmount below.) 2026-10-07 — the active spCoin token's address. The line was the
   *  active account's balance of this token (read through fetchBalance), as in the web app. Omit and that
   *  line keeps its static "…: 0". */
  activeSpCoinAddress?: string;
  /**
   * 2026-10-09 -- how much the active account has staked with one recipient (the web app's getStakedAmountForRecipient: the sum of stakedSPCoins over the pair's
   * rate keys), in base units of the spCoin. The SPONSOR tab's "Sponsor Staked spCoins" line is this number, NOT the account's balance of the spCoin token.
   * Omit and the line stays "…: 0".
   */
  fetchStakedAmount?: (sponsorAddress: string, recipientAddress: string) => Promise<bigint>;
  /** 2026-10-09 -- turns the Rewards tab live (Trading / Staked / Pending with estimate and claim, Auto Refresh), the same card and data hook the web app runs. Omit for the static table. */
  rewardsHost?: RewardsHost;
  /**
   * 2026-10-09 -- turns the Sponsored Recipient Accounts list (opened from Rewards > Unstake) live, with Un-Stake: the web app's card and confirm popup over the host's
   * chain reads and one send-an-unstake-transaction function. Also supplies the Sponsor tab's staked line when fetchStakedAmount is not given.
   */
  stakingHost?: SponsorStakingHost;
  /** The host's real active account. When provided (even as ''), it alone decides which row is active: '' means none, so the header reads "Select Account". Omit to keep each row's own isActive flag (the extension's own feed). */
  activeAccountAddress?: string;
  // 2026-09-29 — self-fetch opt-in. Supplying chainId is the real signal
  // "please fetch real data yourself" (via @sponsorcoin/spcoin-feeds,
  // generalized from spCoinExtension's own already-proven fetch logic —
  // see meritWalletDataFetch.ts's own doc comment): whichever of
  // networkRows/accountGroups/tokenRows/recipientRows above the caller did
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
  onAccountRowSelect?: (accountId: string) => void;
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
  /**
   * 2026-10-08 (table row 22): lets a host without the web trading pipeline (the extension) get a working Swap tab. When set and the host passes no
   * zeroXTradeButtonContent / uniSelectContent of its own, the 0x trade button and the Uniswap section are the package's (price + swap through this host).
   */
  swapHost?: SwapTradeButtonHost;
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
  accountProfileHost?: AccountProfileHost;
  /** 2026-10-10 (connectionDesign item 2): what the shared Add a Wallet/Account flow does for this host. When given, the list's button opens the shared flow; otherwise onAddAccount is called as before. */
  addAccountHost?: AddAccountHost;
  // 2026-09-16, on request ("do the same for the info.png in the lists")
  // — every AssetListRow already had a real, unwired `onInfoClick` (see
  // that file's own doc comment); this is the same icon-click-opens-a-
  // detail-view mechanism as onAccountIconClick/accountDetail above,
  // applied to every list row's own (i) info button instead of just the
  // header avatar. Token rows (Select a Token) get onTokenIconClick/
  // tokenDetail; account-shaped rows (Active Account Selection/Select
  // Recipient/Select Agent) reuse onAccountIconClick/accountDetail
  // unchanged, since they're the same entity shape.
  onTokenIconClick?: (address: string) => void;
  tokenDetail?: {
    address: string;
    logoSrc?: string;
    name?: string;
    symbol?: string;
    decimals?: number;
    website?: string;
    explorer?: string;
    description?: string;
  } | null;
  // 2026-09-16, same request, network list's own equivalent — but unlike
  // onTokenIconClick/onAccountIconClick above, this does NOT fire from
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
   // 2026-09-26, Phase 4 — SPONSOR tab stake execution wiring. Fires on the
   // SPONSOR tab's submit (stake) click. The caller supplies the real
   // recipientKey/agentKey/rate config; this component only resolves the
   // picked addresses from its own selections state and passes them back.
  sponsorStakeSubmitBusy?: boolean;
  onSponsorStakeSubmit?: (params: {
    recipientAddress?: string;
    agentAddress?: string;
    amount: bigint;
    recipientRateKey: number;
    agentRateKey: number;
  }) => void | Promise<HostTransactionResult | void>;
  /** 2026-09-26, Phase 4 finish — real stake amount input for the SPONSOR
   *  tab. Mirrors sendAmount/onSendAmountChange on the SEND tab. */
  sponsorAmount?: string;
  onSponsorAmountChange?: (value: string) => void;
  sponsorAmountBusy?: boolean;
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
  // 2026-10-03 — consumer-owned overlay host, rendered inside this wallet's
  // own <WalletRadioPanels> gate (see WalletRadioPanels.tsx's overlayHost doc
  // for the full account of how the web app ended up with no overlay host
  // mounted at all). The web app passes its RadioOverlayPanelHost here; the
  // extension omits it. Optional, so no existing caller changes behaviour.
  overlayHost?: React.ReactNode;
  // 2026-10-03 — consumer-owned AGENT_SELECT_DROP_DOWN picker. AgentHeaderPanel
  // was mounted with no children, so toggling AGENT_SELECT_DROP_DOWN on drew an
  // empty row. The web app passes its hook-wired AgentSelectDropDown (list
  // opening / validateAccount live in the app); when omitted this renders the
  // engine-wired picker from this package (AgentSelectDropDown.tsx), the same one the web app uses.
  agentSelectSlot?: React.ReactNode;
  // 2026-10-03 — real token balances for EVERY row that shows one (Swap sell/buy/
  // Uniswap receive, Send, Sponsor pay). The package's rows hard-coded
  // "Balance: 0", so a host without wagmi (the extension) never showed a real
  // balance anywhere; the web app doesn't hit this only because its overlayHost
  // renders its own components with wagmi reads. Caller-supplied as a FETCHER
  // (not text) because the picked token and the active account both live inside
  // this component. Omit `tokenAddress` for the native token. Resolve undefined
  // when unavailable. An explicit sellBalanceText/buyBalanceText prop still wins.
  fetchBalance?: FetchBalance;
  // 2026-10-03 — per-mode override of which panel id the header's list pills
  // open (see setActiveList). For a host that supplies overlayHost and renders
  // its own lists from shared ids; omit for the portable standalone behavior.
  listPanelIdOverrides?: Partial<Record<Exclude<ActiveListMode, null>, SP_COIN_DISPLAY>>;
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
  passwordIcon?: React.ReactNode;
  /**
   * 2026-10-08 (table row 23): the wallet is locked (or has no wallet yet), so show the password screen in place of everything else, whatever the panel tree says.
   * The lock gate lives here, in the component; whether and where the wallet is shown at all stays with the host (a layout gate).
   */
  walletLocked?: boolean;
  /** Shown as a "Forgot password? Reset wallet" link under the lock screen; the host confirms and wipes (the wallet can only be restored from its Secret Recovery Phrase). */
  onResetWallet?: () => void;
  passwordErrorText?: string;
  // 2026-10-02, real bug fix — forwards the confirm field's value alongside
  // the password, matching PasswordPanel's own onSubmit (see its doc comment
  // for why). Without the second argument a host could not perform the
  // setup-mode confirmation check at all, which is what made the web app's
  // "Passwords do not match." fire on every setup attempt.
  onPasswordSubmit?: (password: string, confirmPassword: string) => void;
  passwordSubmitting?: boolean;
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
  zeroXTradeButtonContent?: React.ReactNode;
  uniSelectContent?: React.ReactNode;

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
  configPersistedTimeoutContent?: React.ReactNode;
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
  /** 2026-10-08: the Config tab's Test Accounts section (TestAccountsSection); omit to hide it. */
  configTestAccountsContent?: React.ReactNode;
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
  configExtensionChannel?: MeritExtensionChannel;
  onConfigExtensionChannelChange?: (channel: MeritExtensionChannel) => void;
  configExtensionDownloadPath?: string;
  /** 2026-10-08: the Config tab's Logoff / Reset Password / Delete Account buttons (inert when omitted). */
  onConfigLogoff?: () => void;
  onConfigResetPassword?: () => void;
  onConfigDeleteAccount?: () => void;
  /** The Config tab's Delete Wallet button (below Reset Password); the host asks for the password and wipes. */
  onConfigDeleteWallet?: () => void;
}

// 2026-10-03 — accountEntryToSpCoinAccount (the AccountListEntry ->
// spCoinAccount bridge for AccountListRewardsPanel, added 2026-09-24) removed:
// the header account list now renders AccountListCard directly, which takes
// AccountListEntry as-is. AccountListRewardsPanel remains exported by the
// package for hosts that want the reward-aware list.

// 2026-10-09 -- the Sponsor tab's settings cog (the web app uses a cog image asset; an inline SVG needs no asset in either host).
const SPONSOR_CONFIG_COG = React.createElement(
  'svg',
  { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: '#94a3b8', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
  React.createElement('circle', { cx: 12, cy: 12, r: 3 }),
  React.createElement('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' }),
);

/** The rate keys a stake uses, from the same store the rate sliders write (the web's doStake reads it the same way; ranges default to 0-100). */
function currentSponsorRateKeys() {
  const config = sponsorRateConfigStore.get();
  const range: [number, number] = [0, 100];
  const clamp = (v: number) => Math.min(Math.max(v, range[0]), range[1]);
  const { sponsorPct, recipientPct, agentPct } = deriveSponsorRatePercentages(config, range, range);
  return { recipient: clamp(config.sponsorStep), agent: clamp(config.agentStep), sponsorPct, recipientPct, agentPct };
}

export default function MeritWallet({
  resolveAssetAddress,
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
  tokenRows,
  recipientRows,
  activeSpCoinAddress,
  fetchStakedAmount: fetchStakedAmountProp,
  rewardsHost,
  stakingHost,
  accountProfileHost,
  addAccountHost,
  activeAccountAddress,
  chainId,
  baseUrl,
  storage,
  refreshToken,
  onAccountRowSelect,
  onNetworkRowSelect,
  onAccountIconClick,
  onAddAccount,
  swapHost,
  accountDetail,
  onTokenIconClick,
  tokenDetail,
  onNetworkIconClick,
  sendAmount,
  onSendAmountChange,
  sendBusy,
  onSendSubmit,
  sponsorStakeSubmitBusy,
  onSponsorStakeSubmit,
  sponsorAmount,
  onSponsorAmountChange,
  sponsorAmountBusy,
  manageRadioPanels = true,
  overlayHost,
  agentSelectSlot,
  fetchBalance,
  listPanelIdOverrides,
  passwordMode = 'unlock',
  passwordIcon,
  walletLocked,
  onResetWallet,
  passwordErrorText,
  onPasswordSubmit,
  passwordSubmitting,
  sellBalanceText,
  buyBalanceText,
  zeroXTradeButtonContent,
  uniSelectContent,
  configPasswordMode,
  onConfigPasswordModeChange,
  configPersistedTimeoutContent,
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
  configTestAccountsContent,
  configUniSelectVisible,
  onConfigUniswapEngineChange,
  configZeroXEngineVisible,
  onConfig0xEngineChange,
  configResetPanelsContent,
  configExtensionChannel,
  onConfigExtensionChannelChange,
  configExtensionDownloadPath,
  onConfigLogoff,
  onConfigResetPassword,
  onConfigDeleteAccount,
  onConfigDeleteWallet,
}: MeritWalletProps) {
  const [menuOpen, setMenuOpen] = useState(initialMenuOpen ?? true);
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
  // 2026-10-09: result cards for Send / Sponsor. The active account's profile is filled in once the account rows are resolved (further down), and read at
  // the moment a result arrives.
  const showReceipt = useTransactionReceipt();
  const activeProfileRef = useRef<{ address?: string; name?: string; symbol?: string; logoURL?: string } | undefined>(undefined);
  // 2026-09-30, real bug fix (live report — "the panel tree has closed
  // panels but they did not close in the GUI... each gate should be
  // directly connected to its associated panel"). Confirmed by reading the
  // real web app's TradingStationPanel: SELL_SELECT_PANEL/ZERO_X_SELECT_
  // PANEL/CONFIG_SLIPPAGE_PANEL/SWAP_ARROW_BUTTON are independent panel-
  // tree nodes gated via usePanelTree().isVisible(ID) there — none of them
  // touch wagmi, so they're safe to gate directly here too, the same way
  // STAKING_CONTROLLER_PANEL already is elsewhere in this file. Root cause
  // was NOT a duplicate/out-of-sync ExchangeContext (this component already
  // shares the one real instance via usePanelTree() above) — it was that
  // nothing downstream of TradingStationPanel's own sellVisible/buyVisible/
  // arrowVisible/buyPrefixContent props (all real, all already supported by
  // ExchangeTradingPair.tsx) was ever fed a value, so they sat on their
  // hardcoded-true/absent defaults regardless of tree state. See
  // docs/design/meritWalletDesignDoc.txt section 2.1 for the full research.
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
  // is the buy row's only entry point into CONFIG_SLIPPAGE_PANEL).
  // This component's SWAP-tab composition never supplied either,
  // so the shared pair fell back to its plain 'You Receive:'
  // default with no cog. Both are computed here now — same
  // engine hooks, same call shape — so both hosts render the
  // same row. useSlippage() always resolves (its own default is
  // { bps: 200, percentage: 2, percentageString: '2.00%' }), so
  // percentageString needs no fallback.
  const [tradeDirection] = useTradeDirection();
  const slippageCogVisible = usePanelVisible(SP_COIN_DISPLAY.CONFIG_SLIPPAGE_PANEL);
  const handleSlippageCog = useCallback(() => {
    if (slippageCogVisible) {
      closePanel(SP_COIN_DISPLAY.CONFIG_SLIPPAGE_PANEL, 'MeritWallet:slippageCog:close');
    } else {
      openPanel(SP_COIN_DISPLAY.CONFIG_SLIPPAGE_PANEL, 'MeritWallet:slippageCog:open');
    }
  }, [slippageCogVisible, openPanel, closePanel]);
  const buyLabel =
    tradeDirection === TRADE_DIRECTION.SELL_EXACT_OUT
      ? `You Receive ± ${slippage.percentageString}`
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
  const menuTabHeaderVisible = usePanelVisible(SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR);
  const panelTreeVisible = usePanelVisible(SP_COIN_DISPLAY.PANEL_TREE_PANEL);
  const messageVisible = usePanelVisible(SP_COIN_DISPLAY.MESSAGE_PANEL);
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
  const [selfFetchedRecipientRows, setSelfFetchedRecipientRows] = useState<AssetListEntry[] | undefined>(undefined);
  // 2026-10-03 — Send's recipient picker lists every known account, not the
  // chain's recipient directory (see buildAllAccountRows' doc comment).
  const [selfFetchedAllAccountRows, setSelfFetchedAllAccountRows] = useState<AssetListEntry[] | undefined>(undefined);

  // Only fetches whichever of the 4 the caller did NOT already supply
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
      void selfFetchTokenRows(chainId, resolvedBaseUrl, caches, forceRefresh)
        .then((rows) => { if (!cancelled) setSelfFetchedTokenRows(rows); })
        .catch((error) => console.error('MeritWallet: failed to self-fetch token rows:', error));
    }
    if (recipientRows === undefined) {
      void selfFetchRecipientRows(chainId, resolvedBaseUrl, caches, forceRefresh)
        .then((rows) => { if (!cancelled) setSelfFetchedRecipientRows(rows); })
        .catch((error) => console.error('MeritWallet: failed to self-fetch recipient rows:', error));
    }
    void selfFetchAllAccountRows(resolvedBaseUrl, caches, forceRefresh)
      .then((rows) => { if (!cancelled) setSelfFetchedAllAccountRows(rows); })
      .catch((error) => console.error('MeritWallet: failed to self-fetch all-account rows:', error));

    return () => {
      cancelled = true;
    };
    // Deliberately NOT depending on networkRows/accountGroups/tokenRows/
    // recipientRows themselves — those are "did the caller supply this at
    // all" checks meant to run once per chainId/baseUrl/refreshToken
    // change, not on every render; including them would refetch every
    // time self-fetched state itself changes (an infinite loop for
    // whichever ones ARE self-fetched, since setting state neither of
    // these two deps includes is exactly what a targeted lint-disable
    // here is for).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, baseUrl, refreshToken]);

  // Layering: explicit prop > self-fetched > (existing SAMPLE_* fallback,
  // applied further down at each of these 4's own point of use, unchanged).
  const resolvedNetworkRows = networkRows ?? selfFetchedNetworkRows;
  const fetchedAccountGroups = accountGroups ?? selfFetchedAccountGroups;
  const resolvedAccountGroups = useMemo(() => {
    if (activeAccountAddress === undefined || !fetchedAccountGroups) return fetchedAccountGroups;
    const want = activeAccountAddress.trim().toLowerCase();
    return fetchedAccountGroups.map((group) => ({
      ...group,
      accounts: group.accounts.map((account) => ({ ...account, isActive: !!want && String(account.address ?? '').toLowerCase() === want })),
    }));
  }, [fetchedAccountGroups, activeAccountAddress]);
  const resolvedTokenRows = tokenRows ?? selfFetchedTokenRows;
  const resolvedRecipientRows = recipientRows ?? selfFetchedRecipientRows;

  const [openTarget, setOpenTarget] = useState<OpenTarget>(initialOpenTarget ?? 'prod');
  // 2026-09-21, Path A — REAL BUG caught and fixed before shipping, not
  // hypothetical: `ASSET_LIST_SELECT_PANEL` (the list overlay's real
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
  // activeListMode stays local state (it also carries "which trade slot"
  // info the panel tree has no id for, see LIST_PANEL_ID_FOR_MODE's own
  // doc comment below), but every write also mirrors into the real
  // engine's panel tree via this one helper — into Merit Wallet's own
  // private MERIT_WALLET_*_LIST_OVERLAY ids as of 2026-09-30, not the real
  // app's shared list ids (see LIST_PANEL_ID_FOR_MODE's doc comment for
  // why) — so nothing gets out of sync between "what this component
  // renders" and "what the shared, single-source-of-truth panel tree says
  // is open."
  const [activeListMode, setActiveListModeRaw] = useState<ActiveListMode>(null);
  // 2026-10-05 — the ADDRESS_PANEL's typed value for the open token/recipient list.
  // Cleared whenever the list changes or closes (setActiveList below).
  const [addressInput, setAddressInput] = useState('');
  // What the host's resolver made of the typed address (only for addresses NOT in the loaded
  // rows). `result: null` = lookup in flight. See the effect below buildAddressBar.
  const [entryResolution, setEntryResolution] = useState<{ address: string; result: AssetEntryResult | null } | null>(null);
  const addressRowsRef = useRef<ReadonlyArray<{ address?: string }>>([]);
  // 2026-09-30 — list overlays use Merit Wallet's own private, flat-root
  // MERIT_WALLET_*_LIST_OVERLAY ids (see LIST_PANEL_ID_FOR_MODE's own doc
  // comment for why). This function deliberately does NOT also close/reopen
  // TAB_PANEL_IDS[activeTab] to keep the debug tree's flag in sync while a
  // list is shown — two different attempts at that were tried and reverted
  // the same day, both breaking real navigation worse than the cosmetic
  // issue they fixed:
  //   1. closePanel(TAB_PANEL_IDS[activeTab]) — TAB_PANEL_IDS are
  //      MAIN_RADIO_OVERLAY_PANELS members, and closePanel on one of those
  //      always pops the display stack and restores whatever was
  //      PREVIOUSLY active there — confirmed live via trace: closing
  //      TRADING_STATION_PANEL to open a token list restored a stale
  //      SEND_PANEL entry left on the stack from an unrelated earlier
  //      visit, so picking a token landed back on the Send tab instead of
  //      Swap.
  //   2. setPanelVisible(TAB_PANEL_IDS[activeTab], false) (the engine's raw,
  //      side-effect-free setter) — avoids the stack-restore above, but
  //      leaves the WHOLE MAIN_RADIO_OVERLAY_PANELS group at zero visible
  //      members while the list is shown, which triggers
  //      useEnforceRadioPanelGroups's OWN "zero visible -> force the
  //      group's fallbackPanel visible" effect — and that fallback is
  //      hardcoded to TRADING_STATION_PANEL always, regardless of which
  //      tab was actually active, so opening a list from the Send tab
  //      would snap back to Swap instead.
  // Both of the engine's own tab-closing primitives are built for REAL
  // navigation (switching tabs, going back) and carry restore semantics
  // that actively fight "temporarily cover the current tab, then return to
  // exactly it" — there is no primitive that does the latter without this
  // component tracking its own state, and duplicating the engine's
  // stack/fallback bookkeeping here is worse than the cosmetic cost of
  // leaving TAB_PANEL_IDS[activeTab] visible:true in the tree while
  // activeListMode's local override (body's own `??` chain, below) shows
  // the list overlay instead — the GUI itself is unaffected either way.
  // 2026-10-03 — a host that supplies overlayHost replaces this component's own
  // body (WalletRadioPanels renders `overlayHost ?? children`), and that body is
  // the only place the private MERIT_WALLET_*_LIST_OVERLAY ids are drawn. So the
  // header's network/account pills opened an id nothing rendered: the web app's
  // NETWORK_LIST never showed. listPanelIdOverrides lets such a host point a
  // mode at the shared id its own host renders.
  const listPanelIdFor = (mode: Exclude<ActiveListMode, null>): SP_COIN_DISPLAY =>
    listPanelIdOverrides?.[mode] ?? LIST_PANEL_ID_FOR_MODE[mode];
  const setActiveList = (mode: ActiveListMode) => {
    setActiveListModeRaw(mode);
    setAddressInput('');
    if (mode) {
      openPanel(listPanelIdFor(mode), 'MeritWallet:setActiveList');
    } else {
      const overrideIds = Object.values(listPanelIdOverrides ?? {}) as SP_COIN_DISPLAY[];
      for (const id of [...ALL_LIST_PANEL_IDS, ...overrideIds]) closePanel(id, 'MeritWallet:setActiveList:close');
    }
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
  type PickableSlot = 'sellToken' | 'buyToken' | 'sendToken' | 'sendRecipient' | 'sponsorPayToken' | 'sponsorRecipient';
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
  const nativeSendEntry = useMemo<PickedEntry>(() => {
    const row = (resolvedTokenRows ?? []).find((r) => String(r.address ?? '').toLowerCase() === NATIVE_SEND_ADDRESS.toLowerCase());
    const network = (resolvedNetworkRows ?? []).find((r) => r.isActive);
    return {
      symbol: row?.symbol ?? network?.symbol ?? 'ETH',
      name: row?.name,
      address: NATIVE_SEND_ADDRESS,
      iconSrc: row?.iconSrc,
      decimals: 18,
    };
  }, [resolvedTokenRows, resolvedNetworkRows]);
  const sendTokenEntry: PickedEntry = selections.sendToken ?? nativeSendEntry;
  // 2026-10-09 -- the Sponsor tab stakes spCoins, so (as the web app does in STAKE mode) the pay token is the active spCoin until another is picked, and only the spCoin can
  // be staked: another pay token means "swap, then stake", which is not available here yet (it is not wired in the web app either), and the button says so.
  const spCoinPayEntry = useMemo<PickedEntry | undefined>(
    () => (activeSpCoinAddress ? { symbol: 'SPCOIN', name: 'Sponsor Coin', address: activeSpCoinAddress, decimals: 18 } : undefined),
    [activeSpCoinAddress],
  );
  // Pinned to the spCoin only in STAKE mode (arriving from Rewards > Stake), as the web app does; the default Sponsor tab starts on "Select Token" in both apps.
  const { mode: sponsorMode } = useSponsorMode();
  const sponsorPayEntry: PickedEntry | undefined = selections.sponsorPayToken ?? (sponsorMode === 'STAKE' ? spCoinPayEntry : undefined);
  const sponsorPayIsSpCoin = !!sponsorPayEntry && (!activeSpCoinAddress || String(sponsorPayEntry.address ?? '').toLowerCase() === activeSpCoinAddress.toLowerCase());

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
  const payBalance = useFetchedBalance(fetchBalance, sponsorPayEntry?.address, activeBalanceAccount, refreshToken);
  const fetchedSellBalanceText = fetchedBalanceText(fetchBalance, sellBalance, sellTokenContract?.decimals ?? 18);
  const fetchedBuyBalanceText = fetchedBalanceText(fetchBalance, buyBalance, buyTokenContract?.decimals ?? 18);
  const fetchedPayBalanceText = fetchedBalanceText(fetchBalance, payBalance, sponsorPayEntry?.decimals ?? 18);
  // "Sponsor Staked spCoins" = what the active account has staked with the picked recipient (as in the web app), read through the host's fetchStakedAmount.
  const fetchStakedAmount = useMemo(
    () => fetchStakedAmountProp ?? (stakingHost ? (sponsor: string, recipient: string) => getStakedRawForPair(sponsor, recipient, stakingHost.read) : undefined),
    [fetchStakedAmountProp, stakingHost],
  );
  // As the web's doStake: an agent takes part only when one is selected and the agent share of the split is above zero.
  const stakeAgentAddress = () => {
    const address = String(agentAccount?.address ?? '').trim();
    return address && currentSponsorRateKeys().agentPct > 0 ? address : undefined;
  };
  const stakedRecipientAddress = selections.sponsorRecipient?.address;
  // Read at the moment of use through a getter object so the click handlers always see the sliders' latest values.
  const sponsorRateKeys = { get recipient() { return currentSponsorRateKeys().recipient; }, get agent() { return currentSponsorRateKeys().agent; }, get sponsorPct() { return currentSponsorRateKeys().sponsorPct; }, get recipientPct() { return currentSponsorRateKeys().recipientPct; } };
  const [pairStaked, setPairStaked] = useState<{ key: string; base: string; amount?: bigint } | undefined>(undefined);
  // 2026-10-10: a confirmed write (stake, send, swap) bumps balancesChangedStore, so the staked amount is re-read at once, as the balance rows are.
  const balancesTick = useSyncExternalStore(balancesChangedStore.subscribe, balancesChangedStore.getSnapshot, balancesChangedStore.getServerSnapshot);
  const pairBase = `${activeBalanceAccount ?? ''}|${stakedRecipientAddress ?? ''}`;
  const pairKey = `${pairBase}|${refreshToken ?? 0}|${balancesTick}`;
  useEffect(() => {
    if (!fetchStakedAmount || !activeBalanceAccount || !stakedRecipientAddress) {
      setPairStaked(undefined);
      return;
    }
    let cancelled = false;
    fetchStakedAmount(activeBalanceAccount, stakedRecipientAddress)
      .then((amount) => !cancelled && setPairStaked({ key: pairKey, base: pairBase, amount }))
      .catch(() => !cancelled && setPairStaked({ key: pairKey, base: pairBase, amount: undefined }));
    return () => {
      cancelled = true;
    };
  }, [fetchStakedAmount, activeBalanceAccount, stakedRecipientAddress, pairKey, pairBase]);
  const stakedBalanceText =
    fetchStakedAmount && stakedRecipientAddress
      ? `Sponsor Staked spCoins: ${pairStaked?.base !== pairBase ? '…' : pairStaked.amount != null ? formatUnits(pairStaked.amount, 18) : '—'}`
      : undefined;

  // The Send button's text and readiness are the shared computeSendButton (spcoin-panels), the same rules and the same button the web app's Send tab uses.
  const sendDecimals = sendTokenEntry.decimals ?? 18;
  const sendHasRecipient = Boolean(selections.sendRecipient?.address);
  const sendBalanceText = fetchedBalanceText(fetchBalance, sendBalance, sendDecimals);
  const recipientBalanceText = fetchedBalanceText(fetchBalance, recipientSendBalance, sendDecimals);

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
  const [, setSellAmountContext] = useSellAmount();
  const [, setBuyAmountContext] = useBuyAmount();
  const sellDecimals = sellTokenContract?.decimals ?? 18;
  const buyDecimals = buyTokenContract?.decimals ?? 18;
  const setSellAmount = (text: string) => {
    setSellAmountText(text);
    const parsed = parseDecimalAmount(text, sellDecimals);
    if (parsed !== undefined) setSellAmountContext(parsed);
  };
  const setBuyAmount = (text: string) => {
    setBuyAmountText(text);
    const parsed = parseDecimalAmount(text, buyDecimals);
    if (parsed !== undefined) setBuyAmountContext(parsed);
  };

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
  const [editingProfile, setEditingProfile] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  useEffect(() => setEditingProfile(false), [accountDetailAddress]);
  // Same idea, for the token-list's own info icon (Select a Token).
  const [tokenDetailAddress, setTokenDetailAddress] = useState<string | null>(null);
  // Same idea, for the network-list's own icon (Select Network) — see
  // onNetworkIconClick's own doc comment for why this one needs no
  // separate "detail" data prop from the caller.
  const [networkDetailId, setNetworkDetailId] = useState<string | null>(null);
  // 2026-09-21, Path A — ACCOUNT_PANEL/TOKEN_PANEL/NETWORK_PANEL are ALL
  // `MAIN_RADIO_OVERLAY_PANELS` members too (verified the same way as
  // the tab/list-overlay pieces — read `panelGroups.ts` directly), so
  // opening one radio-atomically closes whatever else was showing there
  // (a trade tab, or a list overlay's real ids) in the real engine, same
  // interaction as the list-overlay slice already found and fixed for.
  // These 3 openers mirror that same write; `restoreAfterDetailClose`
  // (used by every close path below) explicitly re-opens whichever of
  // {the list overlay, the active tab} should show next now that the
  // detail's own radio-open has closed it — same explicit,
  // non-reactive-effect shape as the tab-restore fix above, for the same
  // race-avoidance reason. Each opener leaves the OTHER two detail
  // fields untouched, matching this file's own pre-existing behavior
  // (the body/panelTitle ternaries below only ever read the
  // highest-priority one, and a caller has never explicitly cleared
  // siblings on a fresh open) — not a gap introduced here.
  const openAccountDetail = (address: string) => {
    setAccountDetailAddress(address);
    openPanel(SP_COIN_DISPLAY.ACCOUNT_PANEL, 'MeritWallet:openAccountDetail');
  };
  const openTokenDetail = (address: string) => {
    setTokenDetailAddress(address);
    openPanel(SP_COIN_DISPLAY.TOKEN_PANEL, 'MeritWallet:openTokenDetail');
  };
  const openNetworkDetail = (id: string) => {
    setNetworkDetailId(id);
    openPanel(SP_COIN_DISPLAY.NETWORK_PANEL, 'MeritWallet:openNetworkDetail');
  };
  const restoreAfterDetailClose = () => {
    if (activeListMode) {
      openPanel(listPanelIdFor(activeListMode), 'MeritWallet:closeDetail:restoreList');
    } else {
      openPanel(TAB_PANEL_IDS[activeTab], 'MeritWallet:closeDetail:restoreTab');
    }
  };
  // Per-row Merit/MetaMask auth-source selection for NETWORK_LIST — keyed
  // by row id, same "own live state, not a real per-chain RPC setting yet"
  // treatment as everything else in this file (see networks.tsx's own
  // NetworkAuthToggle for the real, per-chainId-persisted version this
  // stands in for). Defaults every row to 'merit', matching that hook's
  // own default when nothing's been set for a chain yet.
  const [networkAuthSources, setNetworkAuthSources] = useState<Record<string, NetworkAuthSource>>({});
  const [showTestNets, setShowTestNets] = useState(false);

  // 2026-09-21, Path A — openPanel(TAB_PANEL_IDS[tab]) now does the tab
  // switch itself (useEnforceRadioPanelGroups above closes every other
  // MAIN_RADIO_OVERLAY_PANELS member automatically). activeListMode/
  // accountDetailAddress/tokenDetailAddress/networkDetailId are NOT
  // panel-tree ids yet (still local state — the list-overlay/detail-panel
  // migration is later scope, not done in this change), so all 4 still
  // need an explicit manual reset here, same as before. Closing the real
  // engine's ASSET_LIST_SELECT_PANEL via radio-group enforcement has no
  // effect on this component's own separate activeListMode variable
  // until that migration actually happens — do not remove this reset
  // before then, it would silently break tab-switch-closes-overlay.
  //
  const handleTabClick = (tab: MenuTabKey) => {
    openPanel(TAB_PANEL_IDS[tab], 'MeritWallet:handleTabClick');
    setActiveList(null);
    setAccountDetailAddress(null);
    setTokenDetailAddress(null);
    setNetworkDetailId(null);
  };

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
    setMenuOpen((prev) => {
      const next = !prev;
      onMenuOpenChange?.(next);
      return next;
    });
  };

  // WALLET_NETWORK_HEADER seed — this engine starts every panel at `false`
  // until something calls setVisible (see extensionPlan.md's "Third
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

  // 2026-09-16 — the actual "commit this pick" step (see PickableSlot's
  // own doc comment above for the full report/reasoning). Reads
  // activeListMode BEFORE closing the overlay — closeListOverlay only
  // schedules the state update, it doesn't mutate this render's own
  // `activeListMode` binding, so capturing it first (implicitly, by
  // reading it in this same synchronous call) is safe and correct.
  const commitSelection = (pickedRow: {
    symbol?: string;
    name?: string;
    address?: string;
    iconSrc?: string;
    decimals?: number;
  }) => {
    const row = { ...pickedRow, address: toChecksumAddress(pickedRow.address) };
    const slot = activeListMode as PickableSlot | null;
    closeListOverlay();
    if (!slot) return;

    // 2026-09-30 — sell/buy picks now write the real shared ExchangeContext
    // (see sellTokenContract's own doc comment near usePanelTree() above)
    // instead of this component's own local `selections` state, so every
    // other consumer of the same context (the web app's own main Swap tab,
    // the real balance fetch, future Uniswap/0x quote wiring) sees the pick
    // immediately. Every other slot (send/sponsor tokens+recipients) stays
    // on local `selections` — genuinely Merit-Wallet-only picks with no
    // real ExchangeContext counterpart today. balance defaults to 0n here,
    // same as liteProvider.tsx's own makeMinimalAccountFallback — real
    // balance display is the caller-supplied sellBalanceText/buyBalanceText
    // prop, not this field.
    if (slot === 'sellToken' || slot === 'buyToken') {
      const contract: TokenContract | undefined = row.address
        ? {
            address: row.address as TokenContract['address'],
            symbol: row.symbol,
            name: row.name,
            decimals: row.decimals,
            logoURL: row.iconSrc,
            balance: BigInt(0),
          }
        : undefined;
      if (slot === 'sellToken') setSellTokenContract(contract);
      else setBuyTokenContract(contract);
      return;
    }

    setSelections((prev) => ({
      ...prev,
      [slot]: {
        symbol: row.symbol,
        name: row.name,
        address: row.address,
        iconSrc: row.iconSrc,
        decimals: row.decimals,
      },
    }));
  };

  const iconFromSrc = (src?: string) =>
    src
      ? React.createElement('img', {
          src,
          alt: '',
          style: { width: '100%', height: '100%', objectFit: 'contain' },
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
          sellIcon: iconFromSrc(sellTokenContract?.logoURL),
          buySymbol: buyTokenContract?.symbol,
          buyAddress: buyTokenContract?.address,
          buyIcon: iconFromSrc(buyTokenContract?.logoURL),
          // 2026-09-30 — real amount input + real balance reads, see their
          // own doc comment above (near sellAmountText's declaration).
          sellAmount: sellAmountText,
          onSellAmountChange: setSellAmount,
          sellBalanceText: sellBalanceText ?? fetchedSellBalanceText,
          buyAmount: buyAmountText,
          onBuyAmountChange: setBuyAmount,
          buyBalanceText: buyBalanceText ?? fetchedBuyBalanceText,
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
          // own usePanelVisible(CONFIG_SLIPPAGE_PANEL) internally, renders
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
          zeroXTradeButtonContent: zeroXTradeButtonContent ?? (swapHost ? React.createElement(SwapTradeButton, { host: swapHost }) : undefined),
          buySuffixContent:
            uniSelectContent ??
            (swapHost
              ? React.createElement(ConnectedUniSelectPanel, { host: swapHost, onBuyTokenClick: () => setActiveList('buyToken'), balanceText: buyBalanceText ?? fetchedBuyBalanceText })
              : undefined),
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
            recipientIcon: iconFromSrc(selections.sendRecipient?.iconSrc),
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
             recipientBalanceText,
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
             onSubmit: onSendSubmit
               ? () => {
                   const params = {
                     recipientAddress: selections.sendRecipient?.address,
                     tokenAddress: sendTokenEntry.address,
                     decimals: sendTokenEntry.decimals,
                     tokenSymbol: sendTokenEntry.symbol,
                     amount: sendAmount ?? '',
                   };
                   void Promise.resolve(onSendSubmit(params)).then((result) => {
                     if (!result) return;
                     showReceipt(
                       buildSendReceipt({
                         result,
                         amount: params.amount,
                         tokenSymbol: params.tokenSymbol ?? '',
                         tokenAddress: isNativePlaceholder(params.tokenAddress) ? undefined : params.tokenAddress,
                         from: activeProfileRef.current,
                         to: { address: selections.sendRecipient?.address, name: selections.sendRecipient?.name, symbol: selections.sendRecipient?.symbol, logoURL: selections.sendRecipient?.iconSrc },
                       }),
                       'MeritWallet:send',
                     );
                     // A confirmed send clears the amount; a failed one leaves everything as it was.
                     if (result.ok) onSendAmountChange?.('');
                   });
                 }
               : undefined,
          })
        : activeTab === 'SPONSOR'
          ? React.createElement(SponsorshipPanel, {
              onPayTokenClick: () => setActiveList('sponsorPayToken'),
              onRecipientClick: () => setActiveList('sponsorRecipient'),
              // 2026-10-09 -- the web app's header ("You are Sponsoring <recipient>" with the settings cog) and its rate sliders (ConfigSponsorshipPanel), the same
              // shared components, so the rates the stake uses are the ones the user sets (the web default is 50 / 50, not the 0 / 0 the extension used to send).
              recipientSelectPanel: React.createElement(StakingControllerPanel, {
                sponsorMode: 'STAKE',
                configCog: SPONSOR_CONFIG_COG,
                recipientContent: React.createElement(
                  'div',
                  { onClick: () => setActiveList('sponsorRecipient'), style: { cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#ffffff', textAlign: 'center' } },
                  selections.sponsorRecipient?.symbol && selections.sponsorRecipient?.name
                    ? `${selections.sponsorRecipient.symbol}: ${selections.sponsorRecipient.name}`
                    : selections.sponsorRecipient?.name ?? selections.sponsorRecipient?.symbol ?? 'Recipient Name not Specified',
                ),
              }),
              configSponsorshipPanel: React.createElement(ConfigSponsorshipPanel, {}),
              // "You are Sponsoring <name>" is a single descriptive line,
              // not a compact pill — "SYMBOL: Name" matches this
              // component's own placeholder format (e.g. "FREE: Born Free
              // USA"), not just the bare symbol a trade pill would show.
              recipientName:
                selections.sponsorRecipient?.symbol && selections.sponsorRecipient?.name
                  ? `${selections.sponsorRecipient.symbol}: ${selections.sponsorRecipient.name}`
                  : selections.sponsorRecipient?.name ?? selections.sponsorRecipient?.symbol,
              payTokenSymbol: sponsorPayEntry?.symbol,
              payTokenAddress: sponsorPayEntry?.address,
              payBalanceText: fetchedPayBalanceText,
              stakedBalanceText,
              payTokenIcon: iconFromSrc(sponsorPayEntry?.iconSrc),
              // 2026-09-16, on live report ("recipientSelectDropDown does
              // not work as nothing is returned... New Recipient Staked
              // spCoins") — this pill's own onTokenPillClick is already
              // wired to the SAME onRecipientClick as "You are Sponsoring"
              // above (see that prop's own doc comment, corrected earlier
              // the same day), but its DISPLAY was never fed the result —
              // recipientName got selections.sponsorRecipient, this pill's
              // own stakedToken* props didn't. Same picked recipient, same
              // source, just the compact-pill format instead of the
              // descriptive-line one.
              stakedTokenSymbol: selections.sponsorRecipient?.symbol,
              stakedTokenAddress: selections.sponsorRecipient?.address,
              stakedTokenIcon: iconFromSrc(selections.sponsorRecipient?.iconSrc),
              // 2026-09-16, on correction ("that was not where the account
              // panel should be opened... it should have been opened...
              // in 'New Recipient Staked spCoins'... when the avatar.png
              // was clicked") — reverted the earlier (wrong) attempt that
              // wired this onto the LIST rows you pick FROM; the real ask
              // is this TRIGGER pill's own icon, for whichever recipient
              // is already picked — same setAccountDetailAddress/
              // onAccountIconClick mechanism as every other detail-open
              // callback here.
              onStakedRecipientIconClick: selections.sponsorRecipient?.address
                ? () => {
                    openAccountDetail(selections.sponsorRecipient!.address!);
                    onAccountIconClick?.(selections.sponsorRecipient!.address!);
                  }
                : undefined,
               // 2026-09-26, Phase 4 finish — real amount/rate wiring for SPONSOR
               // tab. Amount comes from sponsorAmount (user-entered decimal);
               // parsed to raw 18-decimal units at submit (mirrors the web app's
               // doStake parsing in swap.tsx). Rate keys stay 0 — full rate
               // selection UI is Phase C.
               submitLabel: sponsorStakeSubmitBusy ? 'Staking…' : sponsorPayIsSpCoin ? 'Add New Sponsorship' : 'Pay with spCoin to stake',
               onSubmit: onSponsorStakeSubmit && sponsorPayIsSpCoin
                 ? () => {
                     const amountRaw = parseDecimalToWei(sponsorAmount ?? '', 18) ?? 0n;
                     void Promise.resolve(
                       onSponsorStakeSubmit({
                         recipientAddress: selections.sponsorRecipient?.address,
                         agentAddress: stakeAgentAddress(),
                         amount: amountRaw,
                         recipientRateKey: sponsorRateKeys.recipient,
                         agentRateKey: sponsorRateKeys.agent,
                       }),
                     ).then((result) => {
                       if (!result) return;
                       showReceipt(
                         buildStakeReceipt({
                           result,
                           amount: sponsorAmount ?? '',
                           stakeSymbol: sponsorPayEntry?.symbol ?? '',
                           sponsor: activeProfileRef.current,
                           recipient: { address: selections.sponsorRecipient?.address, name: selections.sponsorRecipient?.name, symbol: selections.sponsorRecipient?.symbol, logoURL: selections.sponsorRecipient?.iconSrc },
                           agent: stakeAgentAddress() ? { address: String(agentAccount?.address ?? ''), name: agentAccount?.name, symbol: agentAccount?.symbol, logoURL: agentAccount?.logoURL } : undefined,
                           sponsorRatePct: sponsorRateKeys.sponsorPct,
                           recipientRatePct: sponsorRateKeys.recipientPct,
                           agentRatePct: stakeAgentAddress() ? currentSponsorRateKeys().agentPct : undefined,
                         }),
                         'MeritWallet:stake',
                       );
                       // A confirmed stake clears the amount; a failed one leaves everything as it was.
                       if (result.ok) onSponsorAmountChange?.('');
                     });
                   }
                 : undefined,
               sponsorAmount,
               onSponsorAmountChange,
               sponsorAmountBusy,
             })
          : activeTab === 'REWARDS' && rewardsHost
            ? React.createElement(ConnectedRewardsPanel, { host: rewardsHost })
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
                persistedTimeoutContent: configPersistedTimeoutContent,
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
                testAccountsContent: configTestAccountsContent,
                uniSelectVisible: configUniSelectVisible,
                onUniswapEngineChange: onConfigUniswapEngineChange,
                zeroXEngineVisible: configZeroXEngineVisible,
                on0xEngineChange: onConfig0xEngineChange,
                resetPanelsContent: configResetPanelsContent,
                extensionChannel: configExtensionChannel,
                onExtensionChannelChange: onConfigExtensionChannelChange,
                extensionDownloadPath: configExtensionDownloadPath,
                onLogoff: onConfigLogoff,
                onResetPassword: onConfigResetPassword,
                onDeleteAccount: onConfigDeleteAccount,
                onDeleteWallet: onConfigDeleteWallet,
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
              style: { width: '100%', height: '100%', objectFit: 'contain' },
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
  const activeAccountEntry = flatAccountRows.find((account) => account.isActive);
  activeProfileRef.current = activeAccountEntry ? { address: activeAccountEntry.address, name: activeAccountEntry.name, symbol: activeAccountEntry.symbol, logoURL: activeAccountEntry.iconSrc } : undefined;
  const effectiveTokenRows = resolvedTokenRows ?? SAMPLE_TOKEN_ROWS;

  // 2026-09-24, ASSET_LIST_SELECT_PANEL real container (on request, after
  // discussion) — this whole block used to jump straight from
  // `activeListMode` to AssetListTable/AccountListRewardsPanel/
  // NetworkListTable with no intermediate container representing the real,
  // distinct ASSET_LIST_SELECT_PANEL (38) panel id that sits between
  // ACTIVE_LIST_PANEL and its content children in panelRegistry.ts — a
  // flattened structure that didn't match the real panel-tree hierarchy.
  // Every branch below now routes its existing, unchanged content through
  // the package's own real AssetListSelectPanel shell as `listContent`
  // instead of rendering it directly. Deliberately NOT a cosmetic-only
  // change even though none of these feed types trigger the shell's
  // address-bar/manage-view behavior today (same as the ASSET_LIST_SELECT_PANEL
  // investigation earlier this session found) — the point is giving the
  // extension a REAL, shared container matching the actual architecture, so
  // a future platform (iPhone/Android, per appSplitDevelopmentTime.md) reuses
  // this one real component instead of every platform rebuilding its own
  // flattened list-overlay structure from scratch. `addressBar`/
  // `manageContent` stay omitted (no ADDRESS_PANEL/manage-view concept exists
  // in the extension yet) — safe, since the shell's own render guard
  // requires both `showAddressBar` AND a supplied `addressBar` node.
  // 2026-10-05 — ADDRESS_PANEL for the extension's list overlays, the same
  // shared pieces (AddressPanel = HexAddressInput + AssetPreviewRow) the web app
  // draws. Entering an address NEVER leaves the list: a full address that is in
  // the rows already loaded shows as a preview row, and clicking that row commits
  // it (commitSelection), exactly like the web app. An address that isn't in the
  // list shows a red "not in this list" row — resolving unknown addresses
  // on-chain is the web app's validation FSM, not ported yet.
  const buildAddressBar = (
    rows: ReadonlyArray<{ symbol?: string; name?: string; address?: string; iconSrc?: string; decimals?: number }>,
    kind: 'token' | 'account',
    onInfo: (address: string) => void,
  ) => {
    const typed = addressInput.trim();
    let preview: AssetPreviewRowProps | null = null;
    if (typed) {
      const isFull = /^0x[0-9a-fA-F]{40}$/.test(typed);
      const isPartial = /^(0|0x[0-9a-fA-F]{0,39})$/i.test(typed);
      if (isFull) {
        const hit = rows.find((r) => r.address?.toLowerCase() === typed.toLowerCase());
        const resolved = entryResolution && entryResolution.address.toLowerCase() === typed.toLowerCase() ? entryResolution : null;
        preview = hit
          ? {
              icon: iconFromSrc(hit.iconSrc),
              symbol: hit.symbol,
              name: hit.name,
              address: hit.address,
              onSelect: () => commitSelection(hit),
              infoIconSrc,
              onInfoClick: hit.address ? () => onInfo(hit.address!) : undefined,
            }
          : resolveAssetAddress
            ? resolved && resolved.result
              ? resolved.result.status === 'ok'
                ? {
                    icon: iconFromSrc(resolved.result.asset.logoURL),
                    symbol: resolved.result.asset.symbol,
                    name: resolved.result.asset.name,
                    address: resolved.result.asset.address,
                    onSelect: () =>
                      commitSelection({
                        symbol: resolved.result && resolved.result.status === 'ok' ? resolved.result.asset.symbol : undefined,
                        name: resolved.result && resolved.result.status === 'ok' ? resolved.result.asset.name : undefined,
                        address: typed,
                        iconSrc: resolved.result && resolved.result.status === 'ok' ? resolved.result.asset.logoURL : undefined,
                        decimals: resolved.result && resolved.result.status === 'ok' ? resolved.result.asset.decimals : undefined,
                      }),
                  }
                : {
                    tone: 'error',
                    icon: undefined,
                    name: 'message' in resolved.result ? resolved.result.message : 'Address not available',
                    address: typed,
                  }
              : { icon: undefined, name: 'Looking up address…', address: typed }
            : {
                tone: 'error',
                icon: undefined,
                name: kind === 'token' ? 'Token not in this list' : 'Account not in this list',
                address: typed,
              };
      } else if (!isPartial) {
        preview = { tone: 'error', icon: undefined, name: 'Invalid address', address: '' };
      }
    }
    return React.createElement(AddressPanel, { value: addressInput, onChange: setAddressInput, preview });
  };
  const recipientListRows =
    (activeListMode === 'sendRecipient' ? selfFetchedAllAccountRows : undefined) ??
    resolvedRecipientRows ??
    flatAccountRows;

  addressRowsRef.current =
    activeListMode === 'sendRecipient' || activeListMode === 'sponsorRecipient' ? recipientListRows : effectiveTokenRows;
  // Resolve a full address that isn't in the loaded rows (host-supplied; see resolveAssetAddress).
  // The rows ref is read, not depended on, so a list refresh doesn't re-run the lookup.
  useEffect(() => {
    const typed = addressInput.trim();
    if (!resolveAssetAddress || !activeListMode || classifyAddressText(typed) !== 'ok') {
      setEntryResolution(null);
      return;
    }
    if (addressRowsRef.current.some((r) => r.address?.toLowerCase() === typed.toLowerCase())) {
      setEntryResolution(null);
      return;
    }
    let cancelled = false;
    setEntryResolution({ address: typed, result: null });
    const kind: AssetEntryKind = activeListMode === 'sendRecipient' || activeListMode === 'sponsorRecipient' ? 'account' : 'token';
    const peer =
      activeListMode === 'sellToken'
        ? buyTokenContract?.address
        : activeListMode === 'buyToken'
          ? sellTokenContract?.address
          : undefined;
    resolveAssetAddress(typed, kind, peer ? String(peer) : undefined)
      .then((result) => {
        if (!cancelled) setEntryResolution({ address: typed, result });
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setEntryResolution({
            address: typed,
            result: { status: 'error', message: error instanceof Error ? error.message : 'Lookup failed' },
          });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressInput, activeListMode, resolveAssetAddress]);

  const listOverlay =
    activeListMode === 'sellToken' ||
    activeListMode === 'buyToken' ||
    activeListMode === 'sendToken' ||
    activeListMode === 'sponsorPayToken'
      ? React.createElement(AssetListSelectPanel, {
          containerType: LIST_PANEL_ID_FOR_MODE[activeListMode],
          feedType: FEED_TYPE.REMOTE_TOKEN_LIST,
          addressBar: buildAddressBar(effectiveTokenRows, 'token', (address) => {
            openTokenDetail(address);
            onTokenIconClick?.(address);
          }),
          listContent: React.createElement(AssetListTable, {
            rows: effectiveTokenRows.map((row) => ({
              ...row,
              onSelect: () => commitSelection(row),
              infoIconSrc,
              onInfoClick: row.address
                ? () => {
                    openTokenDetail(row.address!);
                    onTokenIconClick?.(row.address!);
                  }
                : undefined,
            })),
            metaLabel: 'Token Meta',
          }),
        })
      : activeListMode === 'sendRecipient' || activeListMode === 'sponsorRecipient'
        ? React.createElement(AssetListSelectPanel, {
            containerType: LIST_PANEL_ID_FOR_MODE[activeListMode],
            // sendRecipient's own real id (REMOTE_ACCOUNT_SEND_LIST) has a
            // matching FEED_TYPE member exactly; sponsorRecipient's real id
            // (REMOTE_ACCOUNT_RECIPIENT_LIST) maps to REMOTE_RECIPIENT_ACCOUNTS
            // per the web app's own deriveFeedTypeFromDisplay.ts.
            feedType: activeListMode === 'sendRecipient' ? FEED_TYPE.REMOTE_ACCOUNT_SEND_LIST : FEED_TYPE.REMOTE_RECIPIENT_ACCOUNTS,
            addressBar: buildAddressBar(recipientListRows, 'account', (address) => {
              openAccountDetail(address);
              onAccountIconClick?.(address);
            }),
            listContent: React.createElement(AssetListTable, {
              // Prefers the caller's own real recipient directory
              // (recipientRows — see that prop's own doc comment) once
              // supplied; falls back to the wallet's own accounts
              // (flatAccountRows) only for a consumer with no real
              // recipient feed of its own yet, same "placeholder until a
              // real feed exists" treatment every other fallback in this
              // file already has.
              // Send lists every known account (the web's REMOTE_ACCOUNT_SEND_LIST);
              // Sponsor keeps the chain's recipient directory.
              rows: recipientListRows.map((row) => ({
                ...row,
                onSelect: () => commitSelection(row),
                infoIconSrc,
                onInfoClick: row.address
                  ? () => {
                      openAccountDetail(row.address!);
                      onAccountIconClick?.(row.address!);
                    }
                  : undefined,
              })),
              metaLabel: 'Account Meta',
            }),
          })
        : activeListMode === 'account'
          ? (() => {
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
              return React.createElement(AssetListSelectPanel, {
                containerType: LIST_PANEL_ID_FOR_MODE.account,
                // WALLET_ACCOUNTS is the closest real match — its own doc
                // comment in enums.ts: "Local wallet account list (all known
                // accounts)... Used by the Send flow's recipient picker."
                feedType: FEED_TYPE.WALLET_ACCOUNTS,
                listContent: React.createElement(AccountListCard, {
                  groups: effectiveAccountGroups.map((group) => ({
                    ...group,
                    accounts: group.accounts.map((account) => ({
                      ...account,
                      onSelect: () => {
                        closeListOverlay();
                        onAccountRowSelect?.(account.id);
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
                  onAddWalletAccount: addAccountHost ? () => { closeListOverlay(); setAddingAccount(true); } : onAddAccount ? () => { closeListOverlay(); onAddAccount(); } : undefined,
                }),
              });
            })()
          : activeListMode === 'network'
            ? React.createElement(AssetListSelectPanel, {
                containerType: LIST_PANEL_ID_FOR_MODE.network,
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
                        style: { width: '100%', height: '100%', objectFit: 'contain' },
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
                  authSource: networkAuthSources[row.id] ?? row.defaultAuthSource ?? 'merit',
                  onAuthSourceChange: (source: NetworkAuthSource) =>
                    setNetworkAuthSources((prev) => ({ ...prev, [row.id]: source })),
                })),
                  showTestNets,
                  onToggleShowTestNets: () => setShowTestNets((prev) => !prev),
                }),
              })
            : null;

      const gatedTabBody = React.createElement(
        PanelGate,
        { panel: TAB_PANEL_IDS[activeTab], children: tabBody },
      );

  const accountDetailView = accountDetailAddress
    ? React.createElement(AccountDetailPanel, {
        address: accountDetailAddress,
        // Only trust accountDetail once it actually answers the address
        // currently being viewed — otherwise this would briefly render a
        // still-fresh previous account's details (or stale undefined
        // fields) under the new address for one render, between the click
        // and the caller's own fetch resolving.
        ...(accountDetail && accountDetail.address === accountDetailAddress
          ? {
              avatarSrc: accountDetail.avatarSrc,
              name: accountDetail.name,
              symbol: accountDetail.symbol,
              email: accountDetail.email,
              website: accountDetail.website,
              description: accountDetail.description,
              loading: false,
            }
          : { loading: true }),
      })
    : null;

  // 2026-10-09: an account the wallet owns can be edited from its Account Details (the profile editor), when the host supplies accountProfileHost.
  const profileLoaded = !!accountDetail && !!accountDetailAddress && accountDetail.address === accountDetailAddress;
  const profileEditable = !!accountProfileHost && !!accountDetailAddress && profileLoaded && accountProfileHost.canEdit(accountDetailAddress);
  // 2026-10-10: the shared Add a Wallet/Account flow (the host's addAccountHost), shown over the wallet like the profile editor.
  const addAccountOverlay = addingAccount && addAccountHost ? React.createElement(AddAccountFlow, { host: addAccountHost, onDone: () => setAddingAccount(false) }) : null;
  const accountDetailOverlay =
    accountDetailAddress && accountProfileHost && editingProfile && profileLoaded
      ? React.createElement(AccountProfileEditor, {
          address: accountDetailAddress,
          initial: { name: accountDetail?.name, symbol: accountDetail?.symbol, email: accountDetail?.email, website: accountDetail?.website, description: accountDetail?.description, avatarSrc: accountDetail?.avatarSrc, recipientNetwork: accountDetail?.recipientNetwork },
          exists: !!(accountDetail?.name || accountDetail?.symbol),
          host: accountProfileHost,
          onDone: () => setEditingProfile(false),
        })
      : accountDetailView && profileEditable
        ? React.createElement(
            'div',
            null,
            accountDetailView,
            React.createElement(
              'div',
              { style: { padding: '8px 12px' } },
              React.createElement(
                'button',
                { type: 'button', onClick: () => setEditingProfile(true), style: { width: '100%', borderRadius: 8, border: 'none', background: '#5981F3', color: '#ffffff', fontSize: 12, fontWeight: 600, padding: '9px 0', cursor: 'pointer' } },
                'Edit Profile',
              ),
            ),
          )
        : accountDetailView;

  const tokenDetailOverlay = tokenDetailAddress
    ? React.createElement(TokenDetailPanel, {
        address: tokenDetailAddress,
        // Same "only trust it once it answers the current address" gate
        // as accountDetailOverlay above.
        ...(tokenDetail && tokenDetail.address === tokenDetailAddress
          ? {
              logoSrc: tokenDetail.logoSrc,
              name: tokenDetail.name,
              symbol: tokenDetail.symbol,
              decimals: tokenDetail.decimals,
              website: tokenDetail.website,
              explorer: tokenDetail.explorer,
              description: tokenDetail.description,
              loading: false,
            }
          : { loading: true }),
      })
    : null;

  // No loading branch needed — unlike accounts/tokens, this row's own data
  // (networkRowsSource) is already fully in memory the moment the icon is
  // clicked; see onNetworkIconClick's own doc comment on MeritWalletProps.
  const networkDetailRow = networkDetailId
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
    passwordPanelShowing
      ? React.createElement(PasswordPanel, {
          mode: passwordMode,
          showTitle: false,
          icon: passwordIcon,
          errorText: passwordErrorText,
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
            { style: { textAlign: 'center', padding: '8px 12px' } },
            React.createElement(
              'button',
              { type: 'button', onClick: onResetWallet, style: { background: 'none', border: 0, color: '#94a3b8', textDecoration: 'underline', cursor: 'pointer', font: 'inherit', fontSize: 12 } },
              'Forgot password? Reset wallet',
            ),
          ),
        )
      : passwordOverlay;

  // 2026-10-05 — PANEL_TREE_PANEL is a main-radio view (opened from Config), not a tab: it replaces the body
  // while it is the showing member, exactly like the other full-body overlays.
  const panelTreeOverlay = panelTreeVisible ? React.createElement(PanelTreePanel) : null;

  // 2026-10-09 -- the result card of a swap (Success / error, from the shared runUniswapSwap flow). The web app shows MESSAGE_PANEL through its
  // overlayHost; a host without one (the extension) gets it here, in place of the body, until the user closes it.
  const messageOverlay = messageVisible && !overlayHost ? React.createElement(ConnectedMessagePanel) : null;

  const body =
    messageOverlay ?? passwordOverlayWithReset ?? panelTreeOverlay ?? addAccountOverlay ?? accountDetailOverlay ?? tokenDetailOverlay ?? networkDetailOverlay ?? listOverlay ?? gatedTabBody;

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
  const panelTitle = passwordOverlay
    ? passwordMode === 'setup' ? 'Create Account' : 'Account Login'
    : panelTreeVisible
    ? 'Panel Tree'
    : accountDetailAddress
    ? 'Account Details'
    : tokenDetailAddress
      ? 'Token Details'
      : networkDetailId
        ? 'Network Details'
        : activeListMode === 'sellToken' ||
    activeListMode === 'buyToken' ||
    activeListMode === 'sendToken' ||
    activeListMode === 'sponsorPayToken'
      ? 'Select a Token'
      : activeListMode === 'sendRecipient' || activeListMode === 'sponsorRecipient'
        ? 'Select Recipient'
        : activeListMode === 'account'
          ? 'Active Account Selection'
          : activeListMode === 'network'
            ? 'Select Network'
            : activeTab === 'SWAP'
          ? 'Trading Station'
          : activeTab === 'SEND'
            ? 'Send Account'
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
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 5,
        width: fullWidth ? '100%' : 'min(364px, calc(100vw - 32px))',
        overflow: 'hidden',
        pointerEvents: 'auto',
        border: '1px solid #2e3654',
        background: walletColors.background,
        color: walletColors.white,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        ...(docked
          ? { height: '100%', borderRadius: 0, borderRight: 'none' }
          : { maxHeight: 'min(1000px, calc(100vh - 100px))', borderRadius: 15 }),
      }}
    >
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
                      style: { width: '100%', height: '100%', objectFit: 'contain' },
                    })
                  : undefined
              }
              onSelectClick={() => setActiveList('network')}
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
      {/* 2026-10-02 — WALLET_ACCOUNT_HEADER had no reader anywhere: this render
          site is the only one in the app (the app's own
          components/views/Headers/PanelSubTitle.tsx, which also rendered a
          WalletAccountHeader, turned out to be dead code — imported by nothing),
          and it rendered ungated, so toggling the flag in the panel tree did
          nothing. `lazyLoad={false}` matches the network header directly above:
          keep the account row mounted and hide it, rather than unmounting and
          re-running its onIconClick/onSelectClick wiring on every toggle. */}
      <PanelGate panel={SP_COIN_DISPLAY.WALLET_ACCOUNT_HEADER} lazyLoad={false}>
        <WalletAccountHeader
          icon={activeAccountEntry?.icon}
          address={activeAccountEntry?.address}
          symbol={activeAccountEntry?.symbol}
          name={activeAccountEntry?.name}
          placeholderLabel="Select Account"
          onSelectClick={() => setActiveList('account')}
          onIconClick={(address) => {
            if (!address) return;
            openAccountDetail(address);
            onAccountIconClick?.(address);
          }}
          chevronUp={activeListMode === 'account'}
        />
      </PanelGate>
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
          the Alt+A shortcut while locked, which is intended: there is no agent
          to pick before the wallet is unlocked. */}
      {!passwordPanelShowing && (
        <AgentHeaderPanel agentName={agentAccount?.name}>
          {/* 2026-10-08 (docs/meritWalletNpmDesignToDo.txt row 5): the default is the engine-wired picker (AgentSelectDropDown.tsx in this
              package), the same one the web app uses, instead of an inert pill. A host can still pass its own through agentSelectSlot. */}
          {agentSelectSlot ?? <ConnectedAgentSelectDropDown />}
        </AgentHeaderPanel>
      )}
      <div style={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
        {/* 2026-10-03 — PANEL_TITLE and MENU_TAB_HEADER_BAR rendered ungated
            here: the only reads of those flags were the Alt+M/Alt+A key
            handlers, so a tree-row toggle changed the store and nothing else.
            The web app's own wrappers (ActiveWalletPanelTitle,
            AccountPanelContent) already gate them; this render site did not. */}
        <PanelGate panel={SP_COIN_DISPLAY.PANEL_TITLE} lazyLoad={false}>
        <PanelTitle
          title={panelTitle}
          onMenuClick={handleMenuClick}
          menuOpen={menuOpen}
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
            accountDetailAddress
              ? () => {
                  setAccountDetailAddress(null);
                  restoreAfterDetailClose();
                }
              : tokenDetailAddress
                ? () => {
                    setTokenDetailAddress(null);
                    restoreAfterDetailClose();
                  }
                : networkDetailId
                  ? () => {
                      setNetworkDetailId(null);
                      restoreAfterDetailClose();
                    }
                  : activeListMode
                    ? () => setActiveList(null)
                    : () => closePanel('MeritWallet:back')
          }
        />
        </PanelGate>
        {/* Only the tab STRIP follows MENU_TAB_HEADER_BAR; the body below it
            is WALLET_RADIO_PANELS' and must not collapse with it. */}
        {/* 2026-10-03, on request — the tab strip is also hidden while the
            password panel is active (it collapses; the body below it, which IS
            the password form, is untouched). */}
        <MenuTabHeaderBar open={menuOpen && menuTabHeaderVisible && !passwordPanelShowing} activeTab={activeTab} onTabClick={handleTabClick}>
          {/* 2026-09-22 — `body` (whichever of tabBody/listOverlay/the
              three detail overlays is currently active — see that
              variable's own definition above) now renders through the
              real, shared WALLET_RADIO_PANELS gate instead of directly,
              matching the Web App's own RadioOverlayPanelHost, which
              WalletRadioPanels.tsx there already wraps this same way. Real
              shared code now, not two independently-hand-synced copies —
              see docs/npmPanelDisplayIssue.md. */}
          <WalletRadioPanels overlayHost={overlayHost}>{body}</WalletRadioPanels>
        </MenuTabHeaderBar>
      </div>
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
      {!overlayHost && (
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
      {activeTab === 'SPONSOR' && (
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
          (see extensionPlan.md's "Direction changed" entry); this marker
          is what makes that fact directly visible instead of assumed. */}
      {/* 2026-09-15 — same SHOW_BUILD_MARKERS switch TabBodyMarker.tsx now
          checks internally (see packageBuildTag.ts's own doc comment) —
          this marker isn't rendered via that shared component, so it
          needs its own check. */}
      {SHOW_BUILD_MARKERS && (
        <div
          style={{
            position: 'absolute',
            bottom: 2,
            left: 6,
            zIndex: 999999,
            font: '9px monospace',
            color: walletColors.slateMid,
            pointerEvents: 'none',
          }}
        >
          ⟨@sponsorcoin/merit-wallet/MeritWallet.tsx · build {PACKAGE_BUILD}⟩
        </div>
      )}
    </div>
    </ActiveAccountProfileContext.Provider>
    </WalletConnectProvider>
    </WalletBalanceContext.Provider>
  );
}

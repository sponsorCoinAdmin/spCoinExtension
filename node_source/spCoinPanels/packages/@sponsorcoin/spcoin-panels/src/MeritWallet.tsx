// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MeritWallet.tsx
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

import React, { useEffect, useRef, useState } from 'react';
import { SP_COIN_DISPLAY, RADIO_PANEL_GROUPS } from '@sponsorcoin/spcoin-common/panels';
import { APP_TYPE } from '@sponsorcoin/spcoin-common';
import {
  usePanelTree,
  useEnforceRadioPanelGroups,
  useEnforcePanelAncestorVisibility,
  useAgentAccount,
} from '@sponsorcoin/spcoin-exchange-engine';
import PanelGate from './PanelGate';
// 2026-09-21, Path A — MERIT_REWARDS_SUMMARY/MERIT_REWARDS_PENDING
// resolved: SUMMARY removed outright (redundant with tab-level gating —
// see ManageSponsorshipsPanel.tsx's own header comment), PENDING mapped
// onto the real MANAGE_PENDING_REWARDS id (see
// RewardsPendingByAccountTypePanel.tsx's own header comment). This file
// no longer has anything routed through the old, deliberately-separate
// meritPanelState — every real panel this component gates now goes
// through the one shared engine.
import { PACKAGE_BUILD, SHOW_BUILD_MARKERS } from './packageBuildTag';
import WalletNetworkHeader from './WalletHeader';
import NetworkSelectDropDown from './NetworkSelectDropDown';
import WalletAccountHeader from './WalletAccountHeader';
import PanelTitle from './PanelTitle';
import MenuTabHeaderBar, { type MenuTabKey } from './MenuTabHeaderBar';
import WalletRadioPanels from './WalletRadioPanels';
import TradingStationPanel from './TradingStationPanel';
import SendTabPanel from './SendTabPanel';
import SponsorshipPanel from './SponsorshipPanel';
import StakingControllerPanel, { type StakingControllerPanelMode } from './StakingControllerPanel';
import ManageSponsorshipsPanel from './ManageSponsorshipsPanel';
import AgentHeaderPanel from './AgentHeaderPanel';
import WalletConfigPanel, { type OpenTarget } from './WalletConfigPanel';
import AssetListTable, { type AssetListEntry } from './AssetListTable';
import { type AccountListGroup, type AccountListEntry } from './AccountListCard';
import AccountListRewardsPanel from './AccountListRewardsPanel';
import SponsorStakingListPanel from './SponsorStakingListPanel';
import { STATUS, FEED_TYPE, type spCoinAccount } from '@sponsorcoin/spcoin-common/context';
import AssetListSelectPanel from './AssetListSelectPanel';
import AccountDetailPanel from './AccountDetailPanel';
import TokenDetailPanel from './TokenDetailPanel';
import NetworkDetailPanel from './NetworkDetailPanel';
import NetworkListTable, { type NetworkListEntry } from './NetworkListTable';
import { type NetworkAuthSource } from './NetworkListRow';

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

// Same RADIO_PANEL_GROUPS the web app's own RadioOverlayPanelHost.tsx
// uses, from the same shared, published package — not a second,
// hand-maintained copy. Only MAIN_RADIO_OVERLAY_PANELS gets a
// fallbackPanel here (TRADING_STATION_PANEL/Swap, matching the web app's
// own choice and PanelBootstrap's own cold-boot default) — the other
// groups (ACCOUNT_PANEL_MODES, ACTIVE_LIST_PANEL_MODES, etc.) correctly
// allow zero visible members in this consumer too, same reasoning as the
// web app's own RadioOverlayPanelHost.tsx doc comment.
const RADIO_PANEL_GROUPS_WITH_FALLBACKS = RADIO_PANEL_GROUPS.map((group) =>
  group.name === 'MAIN_RADIO_OVERLAY_PANELS'
    ? { ...group, fallbackPanel: SP_COIN_DISPLAY.TRADING_STATION_PANEL }
    : group,
);

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

// 2026-09-21, Path A — which real ACTIVE_LIST_PANEL child each
// ActiveListMode value opens. Several modes share one real list TYPE
// (sellToken/buyToken/sendToken/sponsorPayToken all open the same
// REMOTE_TOKEN_LIST) — the real engine can only say "the token list is
// open," not "for the sell slot specifically." That finer distinction
// (which trade slot this list fills) has no panel-tree equivalent and
// correctly stays local state (`activeListMode` itself, read by
// `commitSelection` below) — same separation the real web app's own
// TokenSelectDropDown already uses between panel visibility and which
// ExchangeContext field a pick writes into.
//
// 2026-09-22, real fix (live report, with a real-web-app screenshot
// comparison) — sendRecipient was WRONGLY sharing sponsorRecipient's
// REMOTE_ACCOUNT_RECIPIENT_LIST, an assumption from when this map was
// first written ("REMOTE_ACCOUNT_SEND_LIST aren't reachable from any of this
// file's 8 modes today"), never actually checked against the real app.
// The real web app's own Send recipient picker
// (components/views/RadioOverlayPanels/SendRecipientPanel.tsx/
// SendLayoutContainer.tsx) opens REMOTE_ACCOUNT_SEND_LIST specifically — the
// full "browse all known accounts" directory, not the narrower list
// REMOTE_ACCOUNT_RECIPIENT_LIST gates (confirmed directly, not assumed:
// useActiveListPanelParams.ts's own doc comment: "REMOTE_ACCOUNT_SEND_LIST is
// also what Send's 'To Recipient' picker opens with"). Sponsor's own
// recipient picker keeps REMOTE_ACCOUNT_RECIPIENT_LIST, unchanged — only
// Send's was wrong.
const LIST_PANEL_ID_FOR_MODE: Record<Exclude<ActiveListMode, null>, SP_COIN_DISPLAY> = {
  sellToken: SP_COIN_DISPLAY.REMOTE_TOKEN_LIST,
  buyToken: SP_COIN_DISPLAY.REMOTE_TOKEN_LIST,
  sendToken: SP_COIN_DISPLAY.REMOTE_TOKEN_LIST,
  sponsorPayToken: SP_COIN_DISPLAY.REMOTE_TOKEN_LIST,
  sendRecipient: SP_COIN_DISPLAY.REMOTE_ACCOUNT_SEND_LIST,
  sponsorRecipient: SP_COIN_DISPLAY.REMOTE_ACCOUNT_RECIPIENT_LIST,
  account: SP_COIN_DISPLAY.LOCAL_ACCOUNT_WALLET_LIST,
  network: SP_COIN_DISPLAY.NETWORK_LIST,
};
// Every real id ANY mode above can open — used to unconditionally close
// whichever one was actually open, without this component needing to
// separately track "which real id is currently open" alongside
// activeListMode itself (closePanel on an already-closed panel is a
// no-op, so closing all 4 is safe, not wasteful in any way that matters).
const ALL_LIST_PANEL_IDS: readonly SP_COIN_DISPLAY[] = [
  SP_COIN_DISPLAY.REMOTE_TOKEN_LIST,
  SP_COIN_DISPLAY.REMOTE_ACCOUNT_RECIPIENT_LIST,
  SP_COIN_DISPLAY.REMOTE_ACCOUNT_SEND_LIST,
  SP_COIN_DISPLAY.LOCAL_ACCOUNT_WALLET_LIST,
  SP_COIN_DISPLAY.NETWORK_LIST,
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
// sample data, now the group's active row (isActive: true).
const SAMPLE_ACCOUNT_GROUPS: AccountListGroup[] = [
  {
    id: 'hardhat',
    label: 'Merit Wallet',
    isActiveSource: true,
    accounts: [
      { id: '0xf3', symbol: 'Doggie', name: 'Hot Dog', address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', isActive: true },
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

export interface MeritWalletProps {
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
  // Omit either (or both) to keep today's placeholder behavior unchanged —
  // this component still has zero dependency on any feed package itself,
  // consistent with the "no app-internal imports" discipline every other
  // file in this package follows; fetching stays the consumer's job.
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
  } | null;
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
   onSendSubmit?: (params: { recipientAddress?: string; tokenAddress?: string; amount: string; decimals?: number; tokenSymbol?: string }) => void;
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
  }) => void;
  /** 2026-09-26, Phase 4 finish — real stake amount input for the SPONSOR
   *  tab. Mirrors sendAmount/onSendAmountChange on the SEND tab. */
  sponsorAmount?: string;
  onSponsorAmountChange?: (value: string) => void;
  sponsorAmountBusy?: boolean;
}

// 2026-09-24, ACCOUNT_LIST_REWARDS_PANEL EXT wiring — this package's own
// AccountListEntry (AccountListCard.tsx, what MeritWalletProps' own
// accountGroups already carries) isn't the same shape as AccountListRewardsPanel's
// required `spCoinAccount[]` (from @sponsorcoin/spcoin-common/context) — the
// real web app's own AssetListSelectPanel.tsx feeds it a genuine spCoinAccount
// list resolved from a live feed; this caller has no such feed, so every
// field spCoinAccount requires but AccountListEntry doesn't carry (type/
// website/description/status/balance) gets an inert, safe default, same
// "representative state, not real logic" treatment as this file's own
// SAMPLE_* rows. Real `name`/`symbol`/`address`/`logoURL` pass through as-is.
function accountEntryToSpCoinAccount(entry: AccountListEntry): spCoinAccount {
  return {
    name: entry.name ?? '',
    symbol: entry.symbol ?? '',
    type: '',
    website: '',
    description: '',
    status: STATUS.SUCCESS,
    address: (entry.address ?? '0x0000000000000000000000000000000000000000') as spCoinAccount['address'],
    logoURL: entry.iconSrc,
    balance: 0n,
  };
}

export default function MeritWallet({
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
  onAccountRowSelect,
  onNetworkRowSelect,
  onAccountIconClick,
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
  useEnforceRadioPanelGroups(RADIO_PANEL_GROUPS_WITH_FALLBACKS);
  useEnforcePanelAncestorVisibility();
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
  // engine's ACTIVE_LIST_PANEL/its children via this one helper, so
  // nothing gets out of sync between "what this component renders" and
  // "what the shared, single-source-of-truth panel tree says is open."
  const [activeListMode, setActiveListModeRaw] = useState<ActiveListMode>(null);
  const setActiveList = (mode: ActiveListMode) => {
    setActiveListModeRaw(mode);
    if (mode) {
      openPanel(LIST_PANEL_ID_FOR_MODE[mode], 'MeritWallet:setActiveList');
    } else {
      for (const id of ALL_LIST_PANEL_IDS) closePanel(id, 'MeritWallet:setActiveList:close');
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
  // Separate from activeListMode — this is a DETAIL view (one account,
  // read-only), not a list to pick from, and can be reached from a
  // different trigger (the avatar icon, not the row/chevron). Null when
  // closed; a real address string while showing that account's details.
  const [accountDetailAddress, setAccountDetailAddress] = useState<string | null>(null);
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
      openPanel(LIST_PANEL_ID_FOR_MODE[activeListMode], 'MeritWallet:closeDetail:restoreList');
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
  useEffect(() => {
    setRealPanelVisible(SP_COIN_DISPLAY.WALLET_NETWORK_HEADER, true);
    setRealPanelVisible(SP_COIN_DISPLAY.MANAGE_PENDING_REWARDS, true);
    setRealPanelVisible(SP_COIN_DISPLAY.WALLET_RADIO_PANELS, true);
    // 2026-09-27, STAKING_CONTROLLER_PANEL EXT wiring — seed the portable
    // StakingControllerPanel shell visible so it renders inside the SPONSOR
    // tab alongside the SponsorshipPanel's inert fallback. Same seeding
    // pattern as the other panels above; self-gates via its own
    // usePanelVisible(STAKING_CONTROLLER_PANEL) in the shell itself.
    setRealPanelVisible(SP_COIN_DISPLAY.STAKING_CONTROLLER_PANEL, true);
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
  const commitSelection = (row: {
    symbol?: string;
    name?: string;
    address?: string;
    iconSrc?: string;
    decimals?: number;
  }) => {
    const slot = activeListMode as PickableSlot | null;
    closeListOverlay();
    if (!slot) return;
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

  // 2026-09-27, STAKING_CONTROLLER_PANEL EXT wiring — extension-safe opaque
  // slots for the portable StakingControllerPanel shell (the web app's
  // RecipientSelectPanel.tsx wrapper supplies these via next/image +
  // AccountAvatar + next/link; the extension has no Next.js, so inline SVG
  // + plain <div>/<img> instead). Same "SYMBOL: Name" format as the inert
  // SponsorshipPanel fallback's recipientName below.
  const stakingControllerConfigCog = React.createElement(
    'svg',
    {
      width: 15,
      height: 15,
      viewBox: '0 0 15 15',
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
      style: { width: '100%', height: '100%' },
    },
    React.createElement('path', {
      fill: '#94a3b8',
      d: 'M7.5 1.5a.75.75 0 0 1 .75.75V3a.75.75 0 0 1-1.5 0V2.25a.75.75 0 0 1 .75-.75ZM1.5 7.5a.75.75 0 0 1 .75-.75H2.25a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1-.75-.75Zm11.5 0a.75.75 0 0 1 .75-.75h.25a.75.75 0 0 1 0 1.5h-.25a.75.75 0 0 1-.75-.75ZM3.55 3.55a.75.75 0 0 1 1.06 0l.17.17a.75.75 0 1 1-1.06 1.06l-.17-.17a.75.75 0 0 1 0-1.06Zm7.89 7.89a.75.75 0 0 1 1.06 0l.17.17a.75.75 0 1 1-1.06 1.06l-.17-.17a.75.75 0 0 1 0-1.06ZM3.55 11.45a.75.75 0 0 1 0 1.06l-.17.17a.75.75 0 1 1-1.06-1.06l.17-.17a.75.75 0 0 1 1.06 0ZM7.5 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
    }),
  );

  const stakingControllerRecipientName =
    selections.sponsorRecipient?.symbol && selections.sponsorRecipient?.name
      ? `${selections.sponsorRecipient.symbol}: ${selections.sponsorRecipient.name}`
      : selections.sponsorRecipient?.name ?? selections.sponsorRecipient?.symbol;
  const stakingControllerRecipientContent = React.createElement(
    'div',
    {
      id: 'OpenRecipientSite',
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        cursor: selections.sponsorRecipient ? 'pointer' : 'default',
        fontSize: 15,
        fontWeight: 700,
        color: '#ffffff',
      },
      onClick: () => setActiveList('sponsorRecipient'),
    },
    selections.sponsorRecipient?.iconSrc
      ? React.createElement('img', {
          src: selections.sponsorRecipient.iconSrc,
          alt: '',
          style: { width: 14, height: 14, borderRadius: 4, objectFit: 'contain' },
        })
      : null,
    stakingControllerRecipientName ?? 'Recipient Name not Specified',
  );

  const tabBody =
    activeTab === 'SWAP'
      ? React.createElement(TradingStationPanel, {
          onSellTokenClick: () => setActiveList('sellToken'),
          onBuyTokenClick: () => setActiveList('buyToken'),
          sellSymbol: selections.sellToken?.symbol,
          sellAddress: selections.sellToken?.address,
          sellIcon: iconFromSrc(selections.sellToken?.iconSrc),
          buySymbol: selections.buyToken?.symbol,
          buyAddress: selections.buyToken?.address,
          buyIcon: iconFromSrc(selections.buyToken?.iconSrc),
        })
      : activeTab === 'SEND'
        ? React.createElement(SendTabPanel, {
            onSendTokenClick: () => setActiveList('sendToken'),
            onRecipientClick: () => setActiveList('sendRecipient'),
            sendTokenSymbol: selections.sendToken?.symbol,
            sendTokenAddress: selections.sendToken?.address,
            sendTokenIcon: iconFromSrc(selections.sendToken?.iconSrc),
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
             submitLabel: sendBusy ? 'Sending…' : 'Send',
             submitBusy: sendBusy,
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
               ? () =>
                   onSendSubmit({
                     recipientAddress: selections.sendRecipient?.address,
                     tokenAddress: selections.sendToken?.address,
                     decimals: selections.sendToken?.decimals,
                     tokenSymbol: selections.sendToken?.symbol,
                     amount: sendAmount ?? '',
                   })
               : undefined,
          })
        : activeTab === 'SPONSOR'
          ? React.createElement(SponsorshipPanel, {
              onPayTokenClick: () => setActiveList('sponsorPayToken'),
              onRecipientClick: () => setActiveList('sponsorRecipient'),
              // "You are Sponsoring <name>" is a single descriptive line,
              // not a compact pill — "SYMBOL: Name" matches this
              // component's own placeholder format (e.g. "FREE: Born Free
              // USA"), not just the bare symbol a trade pill would show.
              recipientName:
                selections.sponsorRecipient?.symbol && selections.sponsorRecipient?.name
                  ? `${selections.sponsorRecipient.symbol}: ${selections.sponsorRecipient.name}`
                  : selections.sponsorRecipient?.name ?? selections.sponsorRecipient?.symbol,
              payTokenSymbol: selections.sponsorPayToken?.symbol,
              payTokenAddress: selections.sponsorPayToken?.address,
              payTokenIcon: iconFromSrc(selections.sponsorPayToken?.iconSrc),
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
               submitLabel: sponsorStakeSubmitBusy ? 'Staking…' : 'Add New Sponsorship',
               onSubmit: onSponsorStakeSubmit
                 ? () => {
                     const amountRaw = sponsorAmount
                       ? BigInt(Math.round(parseFloat(sponsorAmount) * 1e18))
                       : 0n;
                     onSponsorStakeSubmit({
                       recipientAddress: selections.sponsorRecipient?.address,
                       agentAddress: undefined,
                       amount: amountRaw,
                       recipientRateKey: 0,
                       agentRateKey: 0,
                     });
                   }
                 : undefined,
               sponsorAmount,
               onSponsorAmountChange,
               sponsorAmountBusy,
             })
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
            : React.createElement(WalletConfigPanel, { openTarget, onOpenTargetChange: handleOpenTargetChange });

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
  const effectiveAccountGroups: AccountListGroup[] = (accountGroups ?? SAMPLE_ACCOUNT_GROUPS).map((group) => ({
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
  const networkRowsSource: MeritWalletNetworkRow[] = networkRows ?? SAMPLE_NETWORK_ROWS;
  // The sample fallback's own testnet marker was always just the 'hardhat'
  // id (never a real isTestnet field) — preserved exactly for that path;
  // real networkRows use the real isTestnet flag instead.
  const isRowTestnet = (row: MeritWalletNetworkRow) =>
    networkRows ? Boolean(row.isTestnet) : row.id === 'hardhat';
  const visibleNetworkRows = showTestNets
    ? networkRowsSource
    : networkRowsSource.filter((row) => !isRowTestnet(row));
  // Drives the header's compact network pill and account row — same
  // isActive flag the list overlays already use, just read once more here
  // rather than duplicated as separate props.
  const activeNetworkRow = networkRowsSource.find((row) => row.isActive);
  const flatAccountRows = effectiveAccountGroups.flatMap((group) => group.accounts);
  const activeAccountEntry = flatAccountRows.find((account) => account.isActive);
  const effectiveTokenRows = tokenRows ?? SAMPLE_TOKEN_ROWS;

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
  const listOverlay =
    activeListMode === 'sellToken' ||
    activeListMode === 'buyToken' ||
    activeListMode === 'sendToken' ||
    activeListMode === 'sponsorPayToken'
      ? React.createElement(AssetListSelectPanel, {
          containerType: LIST_PANEL_ID_FOR_MODE[activeListMode],
          feedType: FEED_TYPE.REMOTE_TOKEN_LIST,
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
            listContent: React.createElement(AssetListTable, {
              // Prefers the caller's own real recipient directory
              // (recipientRows — see that prop's own doc comment) once
              // supplied; falls back to the wallet's own accounts
              // (flatAccountRows) only for a consumer with no real
              // recipient feed of its own yet, same "placeholder until a
              // real feed exists" treatment every other fallback in this
              // file already has.
              rows: (recipientRows ?? flatAccountRows).map((row) => ({
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
              const accountListRewardsEntries = effectiveAccountGroups.flatMap((group) => group.accounts);
              return React.createElement(AssetListSelectPanel, {
                containerType: LIST_PANEL_ID_FOR_MODE.account,
                // WALLET_ACCOUNTS is the closest real match — its own doc
                // comment in enums.ts: "Local wallet account list (all known
                // accounts)... Used by the Send flow's recipient picker."
                feedType: FEED_TYPE.WALLET_ACCOUNTS,
                listContent: React.createElement(AccountListRewardsPanel, {
                  accountList: accountListRewardsEntries.map(accountEntryToSpCoinAccount),
                  setAccountCallBack: (account?: spCoinAccount) => {
                    closeListOverlay();
                    const matched = account?.address
                      ? accountListRewardsEntries.find(
                          (entry) => entry.address?.toLowerCase() === account.address.toLowerCase(),
                        )
                      : undefined;
                    if (matched) onAccountRowSelect?.(matched.id);
                  },
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

  const accountDetailOverlay = accountDetailAddress
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

  const body = accountDetailOverlay ?? tokenDetailOverlay ?? networkDetailOverlay ?? listOverlay ?? tabBody;

  // Matches the real app's own per-tab titles (useActiveWalletPanelTitle.tsx,
  // its `sponsorshipPanelVisible`/`tradingTabVisible`/`sendTabVisible`/
  // `rewardsTabVisible` ternary) — PanelTitle's own default ("Trading
  // Station") only ever matched the Swap tab; without this, every other
  // tab kept showing that stale default instead of updating to reflect
  // which one is actually active.
  const panelTitle = accountDetailAddress
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
        background: '#0b0e19',
        color: '#fff',
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
      <WalletAccountHeader
        icon={activeAccountEntry?.icon}
        address={activeAccountEntry?.address}
        symbol={activeAccountEntry?.symbol}
        name={activeAccountEntry?.name}
        onSelectClick={() => setActiveList('account')}
        onIconClick={(address) => {
          if (!address) return;
          openAccountDetail(address);
          onAccountIconClick?.(address);
        }}
        chevronUp={activeListMode === 'account'}
      />
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
      <AgentHeaderPanel agentName={agentAccount?.name} />
      <div style={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
        <PanelTitle
          title={panelTitle}
          onMenuClick={handleMenuClick}
          menuOpen={menuOpen}
          // 2026-09-15 — the back arrow already existed (inert, no
          // onBackClick ever passed); now real whenever a list overlay is
          // open, closing it back to the tab it was opened from.
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
                    : undefined
          }
        />
        <MenuTabHeaderBar open={menuOpen} activeTab={activeTab} onTabClick={handleTabClick}>
          {/* 2026-09-22 — `body` (whichever of tabBody/listOverlay/the
              three detail overlays is currently active — see that
              variable's own definition above) now renders through the
              real, shared WALLET_RADIO_PANELS gate instead of directly,
              matching the Web App's own RadioOverlayPanelHost, which
              WalletRadioPanels.tsx there already wraps this same way. Real
              shared code now, not two independently-hand-synced copies —
              see docs/npmPanelDisplayIssue.md. */}
          <WalletRadioPanels>{body}</WalletRadioPanels>
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
      <SponsorStakingListPanel recipients={[]} stakeInfoByAddress={{}} decimals={18} loading={false} />
      {/* 2026-09-27, STAKING_CONTROLLER_PANEL EXT wiring — render the portable
          StakingControllerPanel shell as a sibling overlay, same pattern as
          SponsorStakingListPanel above. Seeded visible in the useEffect above;
          self-gates via its own usePanelVisible(STAKING_CONTROLLER_PANEL).
          Extension-safe configCog (inline SVG, no cog.png asset) and
          recipientContent (plain <div>/<img>, no AccountAvatar/next/link)
          supplied as opaque slots — same opaque-slot split as the web app's
          own RecipientSelectPanel.tsx wrapper. Once Phase B.2 wires the real
          exchangeTradingPair/connectTradeButton/feeDisclosure slots into
          SponsorshipPanel, this shell will migrate to the recipientSelectPanel
          slot and the inert fallback will drop out. */}
      <StakingControllerPanel
        sponsorMode={'SPONSOR' as StakingControllerPanelMode}
        recipientContent={stakingControllerRecipientContent}
        configCog={stakingControllerConfigCog}
      />
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
            color: '#475569',
            pointerEvents: 'none',
          }}
        >
          ⟨@sponsorcoin/spcoin-panels/MeritWallet.tsx · build {PACKAGE_BUILD}⟩
        </div>
      )}
    </div>
  );
}

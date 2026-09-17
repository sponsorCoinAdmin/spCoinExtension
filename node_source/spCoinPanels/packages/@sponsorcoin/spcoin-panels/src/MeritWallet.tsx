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

import React, { useEffect, useState } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import MeritPanelGate from './MeritPanelGate';
import { meritPanelState } from './panelState';
import { PACKAGE_BUILD, SHOW_BUILD_MARKERS } from './packageBuildTag';
import WalletHeader from './WalletHeader';
import NetworkSelectDropDown from './NetworkSelectDropDown';
import WalletAccountHeader from './WalletAccountHeader';
import PanelTitle from './PanelTitle';
import MenuTabHeaderBar, { type MenuTabKey } from './MenuTabHeaderBar';
import TradingStationPanel from './TradingStationPanel';
import SendTabPanel from './SendTabPanel';
import SponsorshipPanel from './SponsorshipPanel';
import ManageSponsorshipsPanel from './ManageSponsorshipsPanel';
import WalletConfigPanel, { type OpenTarget } from './WalletConfigPanel';
import AssetListTable, { type AssetListEntry } from './AssetListTable';
import AccountListCard, { type AccountListGroup } from './AccountListCard';
import AccountDetailPanel from './AccountDetailPanel';
import TokenDetailPanel from './TokenDetailPanel';
import NetworkDetailPanel from './NetworkDetailPanel';
import NetworkListTable, { type NetworkListEntry } from './NetworkListTable';
import { type NetworkAuthSource } from './NetworkListRow';

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
  /** Forwarded to WalletHeader's own closeIconSrc — see that file's own
   *  doc comment on why the extension swaps the close X for this. */
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
  // 2026-09-16, same request, network list's own equivalent. Unlike the
  // two above, this fires purely as a notification — the row the icon
  // belongs to already carries everything NetworkDetailPanel shows
  // (networkRows is fully in-memory, no per-network fetch exists), so this
  // component renders straight from that row itself rather than waiting on
  // a caller round-trip. Omit if the caller has no use for the click.
  onNetworkIconClick?: (networkId: string) => void;
}

export default function MeritWallet({
  docked = false,
  fullWidth = false,
  onClose,
  titleBadgeSrc,
  onRefresh,
  refreshing,
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
}: MeritWalletProps) {
  const [menuOpen, setMenuOpen] = useState(initialMenuOpen ?? true);
  const [activeTab, setActiveTab] = useState<MenuTabKey>(initialActiveTab ?? 'SWAP');
  const [openTarget, setOpenTarget] = useState<OpenTarget>(initialOpenTarget ?? 'prod');
  const [activeListMode, setActiveListMode] = useState<ActiveListMode>(null);
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
  // Per-row Merit/MetaMask auth-source selection for NETWORK_LIST — keyed
  // by row id, same "own live state, not a real per-chain RPC setting yet"
  // treatment as everything else in this file (see networks.tsx's own
  // NetworkAuthToggle for the real, per-chainId-persisted version this
  // stands in for). Defaults every row to 'merit', matching that hook's
  // own default when nothing's been set for a chain yet.
  const [networkAuthSources, setNetworkAuthSources] = useState<Record<string, NetworkAuthSource>>({});
  const [showTestNets, setShowTestNets] = useState(false);

  // Switching tabs while a list overlay is open would otherwise leave it
  // showing on top of the NEW tab's body (e.g. open "Select a Token" from
  // Swap, click Send, still see the token list) — closing it here matches
  // the real app's own ActiveListPanel reset-on-parent-close behavior.
  const handleTabClick = (tab: MenuTabKey) => {
    setActiveTab(tab);
    setActiveListMode(null);
    setAccountDetailAddress(null);
    setTokenDetailAddress(null);
    setNetworkDetailId(null);
    onActiveTabChange?.(tab);
  };

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
  // (the MeritPanelGate below), it has to seed it itself on mount rather
  // than relying on the caller to remember to, the way sidepanel.ts used
  // to before this component became self-contained.
  //
  // 2026-09-14 — MERIT_REWARDS_SUMMARY/MERIT_REWARDS_PENDING seeded here
  // too, same reasoning: both new, genuinely Merit-only panel ids
  // (panelState.ts's own MeritOnlyPanelId — see docs/design/
  // extensionPlan.md's "Fourth slice" entry) start unseen like every
  // other id in this engine, and with no real click-driven "open" call
  // site for either yet, an unseeded pair renders as permanently hidden,
  // not open. Seeded true so the Rewards tab's table shape shows fully
  // expanded by default, matching every other placeholder's own
  // representative-state-by-default treatment.
  useEffect(() => {
    meritPanelState.setVisible(SP_COIN_DISPLAY.WALLET_NETWORK_HEADER, true);
    meritPanelState.setVisible('MERIT_REWARDS_SUMMARY', true);
    meritPanelState.setVisible('MERIT_REWARDS_PENDING', true);
  }, []);

  // 2026-09-15 — when a list overlay is open (see ActiveListMode's own doc
  // comment above), it replaces the active tab's own body entirely rather
  // than stacking on top of it, matching the real app's ActiveListPanel
  // (an overlay that fully owns the panel body while open, not a layered
  // popover). onSelect closes it the same way a real row pick would.
  const closeListOverlay = () => setActiveListMode(null);

  // 2026-09-16 — the actual "commit this pick" step (see PickableSlot's
  // own doc comment above for the full report/reasoning). Reads
  // activeListMode BEFORE closing the overlay — closeListOverlay only
  // schedules the state update, it doesn't mutate this render's own
  // `activeListMode` binding, so capturing it first (implicitly, by
  // reading it in this same synchronous call) is safe and correct.
  const commitSelection = (row: { symbol?: string; name?: string; address?: string; iconSrc?: string }) => {
    const slot = activeListMode as PickableSlot | null;
    closeListOverlay();
    if (!slot) return;
    setSelections((prev) => ({
      ...prev,
      [slot]: { symbol: row.symbol, name: row.name, address: row.address, iconSrc: row.iconSrc },
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

  const tabBody =
    activeTab === 'SWAP'
      ? React.createElement(TradingStationPanel, {
          onSellTokenClick: () => setActiveListMode('sellToken'),
          onBuyTokenClick: () => setActiveListMode('buyToken'),
          sellSymbol: selections.sellToken?.symbol,
          sellAddress: selections.sellToken?.address,
          sellIcon: iconFromSrc(selections.sellToken?.iconSrc),
          buySymbol: selections.buyToken?.symbol,
          buyAddress: selections.buyToken?.address,
          buyIcon: iconFromSrc(selections.buyToken?.iconSrc),
        })
      : activeTab === 'SEND'
        ? React.createElement(SendTabPanel, {
            onSendTokenClick: () => setActiveListMode('sendToken'),
            onRecipientClick: () => setActiveListMode('sendRecipient'),
            sendTokenSymbol: selections.sendToken?.symbol,
            sendTokenAddress: selections.sendToken?.address,
            sendTokenIcon: iconFromSrc(selections.sendToken?.iconSrc),
            recipientSymbol: selections.sendRecipient?.symbol,
            recipientAddress: selections.sendRecipient?.address,
            recipientIcon: iconFromSrc(selections.sendRecipient?.iconSrc),
          })
        : activeTab === 'SPONSOR'
          ? React.createElement(SponsorshipPanel, {
              onPayTokenClick: () => setActiveListMode('sponsorPayToken'),
              onRecipientClick: () => setActiveListMode('sponsorRecipient'),
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
                    setAccountDetailAddress(selections.sponsorRecipient!.address!);
                    onAccountIconClick?.(selections.sponsorRecipient!.address!);
                  }
                : undefined,
            })
          : activeTab === 'REWARDS'
            ? React.createElement(ManageSponsorshipsPanel, {})
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

  const listOverlay =
    activeListMode === 'sellToken' ||
    activeListMode === 'buyToken' ||
    activeListMode === 'sendToken' ||
    activeListMode === 'sponsorPayToken'
      ? React.createElement(AssetListTable, {
          rows: effectiveTokenRows.map((row) => ({
            ...row,
            onSelect: () => commitSelection(row),
            infoIconSrc,
            onInfoClick: row.address
              ? () => {
                  setTokenDetailAddress(row.address!);
                  onTokenIconClick?.(row.address!);
                }
              : undefined,
          })),
          metaLabel: 'Token Meta',
        })
      : activeListMode === 'sendRecipient' || activeListMode === 'sponsorRecipient'
        ? React.createElement(AssetListTable, {
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
                    setAccountDetailAddress(row.address!);
                    onAccountIconClick?.(row.address!);
                  }
                : undefined,
            })),
            metaLabel: 'Account Meta',
          })
        : activeListMode === 'account'
          ? React.createElement(AccountListCard, {
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
                        setAccountDetailAddress(account.address!);
                        onAccountIconClick?.(account.address!);
                      }
                    : undefined,
                })),
              })),
              infoIconSrc,
            })
          : activeListMode === 'network'
            ? (console.log(
                'MeritWallet visibleNetworkRows at render:',
                visibleNetworkRows.map((r) => ({ id: r.id, name: r.name, hasIconSrc: !!r.iconSrc })),
              ),
              React.createElement(NetworkListTable, {
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
                  onIconClick: () => {
                    setNetworkDetailId(row.id);
                    onNetworkIconClick?.(row.id);
                  },
                  authSource: networkAuthSources[row.id] ?? row.defaultAuthSource ?? 'merit',
                  onAuthSourceChange: (source: NetworkAuthSource) =>
                    setNetworkAuthSources((prev) => ({ ...prev, [row.id]: source })),
                })),
                showTestNets,
                onToggleShowTestNets: () => setShowTestNets((prev) => !prev),
              }))
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
      <MeritPanelGate panel={SP_COIN_DISPLAY.WALLET_NETWORK_HEADER} lazyLoad={false}>
        <WalletHeader
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
              onSelectClick={() => setActiveListMode('network')}
              onIconClick={
                activeNetworkRow
                  ? () => {
                      setNetworkDetailId(activeNetworkRow.id);
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
          closeIconSrc={closeIconSrc}
        />
      </MeritPanelGate>
      <WalletAccountHeader
        icon={activeAccountEntry?.icon}
        address={activeAccountEntry?.address}
        symbol={activeAccountEntry?.symbol}
        name={activeAccountEntry?.name}
        onSelectClick={() => setActiveListMode('account')}
        onIconClick={(address) => {
          if (!address) return;
          setAccountDetailAddress(address);
          onAccountIconClick?.(address);
        }}
        chevronUp={activeListMode === 'account'}
      />
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
              ? () => setAccountDetailAddress(null)
              : tokenDetailAddress
                ? () => setTokenDetailAddress(null)
                : networkDetailId
                  ? () => setNetworkDetailId(null)
                  : activeListMode
                    ? () => setActiveListMode(null)
                    : undefined
          }
        />
        <MenuTabHeaderBar open={menuOpen} activeTab={activeTab} onTabClick={handleTabClick}>
          {body}
        </MenuTabHeaderBar>
      </div>
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

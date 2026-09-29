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
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useRef, useState } from 'react';
import { SP_COIN_DISPLAY, RADIO_PANEL_GROUPS } from '@sponsorcoin/spcoin-common/panels';
import { usePanelTree, usePanelVisible, useEnforceRadioPanelGroups, useEnforcePanelAncestorVisibility, useAgentAccount, } from '@sponsorcoin/spcoin-exchange-engine';
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
import MenuTabHeaderBar from './MenuTabHeaderBar';
import WalletRadioPanels from './WalletRadioPanels';
import TradingStationPanel from './TradingStationPanel';
import SendTabPanel from './SendTabPanel';
import SponsorshipPanel from './SponsorshipPanel';
import StakingControllerPanel from './StakingControllerPanel';
import ManageSponsorshipsPanel from './ManageSponsorshipsPanel';
import AgentHeaderPanel from './AgentHeaderPanel';
import AccountAvatar from './components/utility/AccountAvatar';
import AgentSelectDropDown from './AgentSelectDropDown';
import WalletConfigPanel from './WalletConfigPanel';
import AssetListTable from './AssetListTable';
import AccountListRewardsPanel from './AccountListRewardsPanel';
import SponsorStakingListPanel from './SponsorStakingListPanel';
import { STATUS, FEED_TYPE } from '@sponsorcoin/spcoin-common/context';
import AssetListSelectPanel from './AssetListSelectPanel';
import AccountDetailPanel from './AccountDetailPanel';
import TokenDetailPanel from './TokenDetailPanel';
import NetworkDetailPanel from './NetworkDetailPanel';
import NetworkListTable from './NetworkListTable';
import FloatingSelectPopup from './FloatingSelectPopup';
// 2026-09-21, Path A ("single source of truth") — the 5-tab strip's own
// real panel-tree ids, all confirmed members of RADIO_PANEL_GROUPS'
// MAIN_RADIO_OVERLAY_PANELS group (verified by reading panelGroups.ts
// directly, not assumed), so useEnforceRadioPanelGroups below already
// gives correct mutual-exclusivity for free — no hand-rolled reset
// needed the way the old local-state activeTab did.
const TAB_PANEL_IDS = {
    SWAP: SP_COIN_DISPLAY.TRADING_STATION_PANEL,
    SEND: SP_COIN_DISPLAY.SEND_PANEL,
    SPONSOR: SP_COIN_DISPLAY.SPONSORSHIP_PANEL,
    REWARDS: SP_COIN_DISPLAY.MANAGE_SPONSORSHIPS_PANEL,
    CONFIG: SP_COIN_DISPLAY.WALLET_CONFIG_PANEL,
};
const TAB_KEY_BY_PANEL_ID = Object.fromEntries(Object.entries(TAB_PANEL_IDS).map(([tab, id]) => [id, tab]));
// Same RADIO_PANEL_GROUPS the web app's own RadioOverlayPanelHost.tsx
// uses, from the same shared, published package — not a second,
// hand-maintained copy. Only MAIN_RADIO_OVERLAY_PANELS gets a
// fallbackPanel here (TRADING_STATION_PANEL/Swap, matching the web app's
// own choice and PanelBootstrap's own cold-boot default) — the other
// groups (ACCOUNT_PANEL_MODES, ACTIVE_LIST_PANEL_MODES, etc.) correctly
// allow zero visible members in this consumer too, same reasoning as the
// web app's own RadioOverlayPanelHost.tsx doc comment.
const RADIO_PANEL_GROUPS_WITH_FALLBACKS = RADIO_PANEL_GROUPS.map((group) => group.name === 'MAIN_RADIO_OVERLAY_PANELS'
    ? { ...group, fallbackPanel: SP_COIN_DISPLAY.TRADING_STATION_PANEL }
    : group);
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
const LIST_PANEL_ID_FOR_MODE = {
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
const ALL_LIST_PANEL_IDS = [
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
const SAMPLE_TOKEN_ROWS = [
    { id: '0xeeee', symbol: 'ETH', name: 'Ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
    { id: '0xspcoinv0', symbol: 'SPCOIN_V0', name: 'Sponsor Coin V0', address: '0xf3405e01f11d9d7841b4dc61f13a9834c88a5e1b' },
    { id: '0xweth', symbol: 'WETH', name: 'Wrapped Ether', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
];
// Sample groups for AccountListCard.tsx (LOCAL_ACCOUNT_WALLET_LIST) — same
// "Doggie | Hot Dog" example already used elsewhere in this file's own
// sample data, now the group's active row (isActive: true).
const SAMPLE_ACCOUNT_GROUPS = [
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
const SAMPLE_NETWORK_ROWS = [
    { id: 'eth-mainnet', symbol: 'ETH', name: 'Ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', isActive: true },
    { id: 'polygon', symbol: 'MATIC', name: 'Polygon', address: '0x00000000000000000000000000000000001010' },
    { id: 'hardhat', symbol: 'HH', name: 'Hardhat', address: '0x0000000000000000000000000000000000539b' },
];
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
function accountEntryToSpCoinAccount(entry) {
    return {
        name: entry.name ?? '',
        symbol: entry.symbol ?? '',
        type: '',
        website: '',
        description: '',
        status: STATUS.SUCCESS,
        address: (entry.address ?? '0x0000000000000000000000000000000000000000'),
        logoURL: entry.iconSrc,
        balance: 0n,
    };
}
export default function MeritWallet({ docked = false, fullWidth = false, onClose, titleBadgeSrc, onRefresh, refreshing, appType, wwwIconSrc, closeIconSrc, infoIconSrc, initialActiveTab, onActiveTabChange, initialMenuOpen, onMenuOpenChange, initialOpenTarget, onOpenTargetChange, networkRows, accountGroups, tokenRows, recipientRows, onAccountRowSelect, onNetworkRowSelect, onAccountIconClick, accountDetail, onTokenIconClick, tokenDetail, onNetworkIconClick, sendAmount, onSendAmountChange, sendBusy, onSendSubmit, sponsorStakeSubmitBusy, onSponsorStakeSubmit, sponsorAmount, onSponsorAmountChange, sponsorAmountBusy, onSponsorSwapSubmit, sponsorSwapBusy, swapAmount, onSwapAmountChange, swapBusy, onSwapSubmit, activeChainId = 31337, defaultAgentAddress, onHydrateAgent, onSetAgentAccount, 
// 2026-09-27, Phase C — reward display + claim/estimate callbacks.
tradingAmountText, stakedAmountText, pendingAmountText, totalCoinsText, tradingOrStalledLoading, tradingIsZero, stakedIsZero, pendingIsZero, pendingInitialLoading, pendingRoleUnavailable, pendingClaimInProgress, pendingClaimDisabled, pendingErrorText, rewardRows, onRoleEstimate, onRoleClaim, pendingVisible, onOpenPendingGroup, onPendingHeaderEstimate, onClosePendingGroup, onPendingEstimate, onPendingClaim, autoRefresh, onAutoRefreshChange, onStakedLabelClick, }) {
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
    const { activeMainOverlay, openPanel, closePanel, setPanelVisible: setRealPanelVisible, } = usePanelTree();
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
    const [agentAccount, setAgentAccount] = useAgentAccount();
    const [openTarget, setOpenTarget] = useState(initialOpenTarget ?? 'prod');
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
    const lastKnownTabRef = useRef(initialActiveTab ?? 'SWAP');
    const derivedTab = activeMainOverlay != null ? TAB_KEY_BY_PANEL_ID[activeMainOverlay] : undefined;
    if (derivedTab)
        lastKnownTabRef.current = derivedTab;
    const activeTab = derivedTab ?? lastKnownTabRef.current;
    // activeListMode stays local state (it also carries "which trade slot"
    // info the panel tree has no id for, see LIST_PANEL_ID_FOR_MODE's own
    // doc comment below), but every write also mirrors into the real
    // engine's ACTIVE_LIST_PANEL/its children via this one helper, so
    // nothing gets out of sync between "what this component renders" and
    // "what the shared, single-source-of-truth panel tree says is open."
    const [activeListMode, setActiveListModeRaw] = useState(null);
    const setActiveList = (mode) => {
        setActiveListModeRaw(mode);
        if (mode) {
            openPanel(LIST_PANEL_ID_FOR_MODE[mode], 'MeritWallet:setActiveList');
        }
        else {
            for (const id of ALL_LIST_PANEL_IDS)
                closePanel(id, 'MeritWallet:setActiveList:close');
        }
    };
    const [selections, setSelections] = useState({});
    // Separate from activeListMode — this is a DETAIL view (one account,
    // read-only), not a list to pick from, and can be reached from a
    // different trigger (the avatar icon, not the row/chevron). Null when
    // closed; a real address string while showing that account's details.
    const [accountDetailAddress, setAccountDetailAddress] = useState(null);
    // Same idea, for the token-list's own info icon (Select a Token).
    const [tokenDetailAddress, setTokenDetailAddress] = useState(null);
    // Same idea, for the network-list's own icon (Select Network) — see
    // onNetworkIconClick's own doc comment for why this one needs no
    // separate "detail" data prop from the caller.
    const [networkDetailId, setNetworkDetailId] = useState(null);
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
    const openAccountDetail = (address) => {
        setAccountDetailAddress(address);
        openPanel(SP_COIN_DISPLAY.ACCOUNT_PANEL, 'MeritWallet:openAccountDetail');
    };
    const openTokenDetail = (address) => {
        setTokenDetailAddress(address);
        openPanel(SP_COIN_DISPLAY.TOKEN_PANEL, 'MeritWallet:openTokenDetail');
    };
    const openNetworkDetail = (id) => {
        setNetworkDetailId(id);
        openPanel(SP_COIN_DISPLAY.NETWORK_PANEL, 'MeritWallet:openNetworkDetail');
    };
    const restoreAfterDetailClose = () => {
        if (activeListMode) {
            openPanel(LIST_PANEL_ID_FOR_MODE[activeListMode], 'MeritWallet:closeDetail:restoreList');
        }
        else {
            openPanel(TAB_PANEL_IDS[activeTab], 'MeritWallet:closeDetail:restoreTab');
        }
    };
    // Per-row Merit/MetaMask auth-source selection for NETWORK_LIST — keyed
    // by row id, same "own live state, not a real per-chain RPC setting yet"
    // treatment as everything else in this file (see networks.tsx's own
    // NetworkAuthToggle for the real, per-chainId-persisted version this
    // stands in for). Defaults every row to 'merit', matching that hook's
    // own default when nothing's been set for a chain yet.
    const [networkAuthSources, setNetworkAuthSources] = useState({});
    const [showTestNets, setShowTestNets] = useState(false);
    // 2026-09-28, NETWORK_SELECTION_POPUP EXT wiring — reads the panel-tree
    // visibility flag for the floating network-selection popup. The shell
    // (FloatingSelectPopup) is already in the package; MeritWallet now serves
    // as its own composition root, rendering it as a sibling overlay with
    // extension-safe children (NetworkListTable with auth toggles). No seed
    // here — opens on demand via the wallet-header network icon click.
    const networkSelectPopupVisible = usePanelVisible(SP_COIN_DISPLAY.NETWORK_SELECTION_POPUP);
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
    const handleTabClick = (tab) => {
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
        if (didSeedInitialTab.current)
            return;
        didSeedInitialTab.current = true;
        if (initialActiveTab && initialActiveTab !== 'SWAP') {
            openPanel(TAB_PANEL_IDS[initialActiveTab], 'MeritWallet:initialActiveTab');
        }
    }, [initialActiveTab, openPanel]);
    const previousNotifiedTabRef = useRef(undefined);
    useEffect(() => {
        if (previousNotifiedTabRef.current === activeTab)
            return;
        previousNotifiedTabRef.current = activeTab;
        onActiveTabChange?.(activeTab);
    }, [activeTab, onActiveTabChange]);
    const handleOpenTargetChange = (target) => {
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
    const commitSelection = (row) => {
        const slot = activeListMode;
        closeListOverlay();
        if (!slot)
            return;
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
    const iconFromSrc = (src) => src
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
    const stakingControllerConfigCog = React.createElement('svg', {
        width: 15,
        height: 15,
        viewBox: '0 0 15 15',
        fill: 'none',
        xmlns: 'http://www.w3.org/2000/svg',
        style: { width: '100%', height: '100%' },
    }, React.createElement('path', {
        fill: '#94a3b8',
        d: 'M7.5 1.5a.75.75 0 0 1 .75.75V3a.75.75 0 0 1-1.5 0V2.25a.75.75 0 0 1 .75-.75ZM1.5 7.5a.75.75 0 0 1 .75-.75H2.25a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1-.75-.75Zm11.5 0a.75.75 0 0 1 .75-.75h.25a.75.75 0 0 1 0 1.5h-.25a.75.75 0 0 1-.75-.75ZM3.55 3.55a.75.75 0 0 1 1.06 0l.17.17a.75.75 0 1 1-1.06 1.06l-.17-.17a.75.75 0 0 1 0-1.06Zm7.89 7.89a.75.75 0 0 1 1.06 0l.17.17a.75.75 0 1 1-1.06 1.06l-.17-.17a.75.75 0 0 1 0-1.06ZM3.55 11.45a.75.75 0 0 1 0 1.06l-.17.17a.75.75 0 1 1-1.06-1.06l.17-.17a.75.75 0 0 1 1.06 0ZM7.5 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
    }));
    const stakingControllerRecipientName = selections.sponsorRecipient?.symbol && selections.sponsorRecipient?.name
        ? `${selections.sponsorRecipient.symbol}: ${selections.sponsorRecipient.name}`
        : selections.sponsorRecipient?.name ?? selections.sponsorRecipient?.symbol;
    const stakingControllerRecipientContent = React.createElement('div', {
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
    }, selections.sponsorRecipient?.iconSrc
        ? React.createElement('img', {
            src: selections.sponsorRecipient.iconSrc,
            alt: '',
            style: { width: 14, height: 14, borderRadius: 4, objectFit: 'contain' },
        })
        : null, stakingControllerRecipientName ?? 'Recipient Name not Specified');
    const tabBody = activeTab === 'SWAP'
        ? React.createElement(TradingStationPanel, {
            onSellTokenClick: () => setActiveList('sellToken'),
            onBuyTokenClick: () => setActiveList('buyToken'),
            sellAmount: swapAmount,
            onSellAmountChange: onSwapAmountChange,
            sellSymbol: selections.sellToken?.symbol,
            sellAddress: selections.sellToken?.address,
            sellIcon: iconFromSrc(selections.sellToken?.iconSrc),
            buySymbol: selections.buyToken?.symbol,
            buyAddress: selections.buyToken?.address,
            buyIcon: iconFromSrc(selections.buyToken?.iconSrc),
            submitLabel: swapBusy ? 'Swapping…' : 'Swap',
            onSubmit: onSwapSubmit
                ? () => {
                    const amountIn = swapAmount
                        ? BigInt(Math.round(parseFloat(swapAmount) * 1e18))
                        : 0n;
                    onSwapSubmit({
                        sellTokenAddress: selections.sellToken?.address ?? '',
                        buyTokenAddress: selections.buyToken?.address ?? '',
                        amountIn,
                        recipient: agentAccount?.address ?? '',
                        chainId: activeChainId,
                    });
                }
                : undefined,
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
                    ? () => onSendSubmit({
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
                    recipientName: selections.sponsorRecipient?.symbol && selections.sponsorRecipient?.name
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
                            openAccountDetail(selections.sponsorRecipient.address);
                            onAccountIconClick?.(selections.sponsorRecipient.address);
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
                    onSponsorSwapSubmit: onSponsorSwapSubmit
                        ? () => onSponsorSwapSubmit({
                            tokenIn: selections.sponsorPayToken?.address ?? '',
                            tokenOut: selections.sponsorRecipient?.address ?? '',
                            amountIn: sponsorAmount
                                ? BigInt(Math.round(parseFloat(sponsorAmount) * 1e18))
                                : 0n,
                            recipient: activeAccountEntry?.address ?? '',
                            chainId: activeChainId,
                        })
                        : undefined,
                    sponsorSwapBusy,
                })
                : activeTab === 'REWARDS'
                    ? React.createElement(ManageSponsorshipsPanel, {
                        // 2026-09-24, SPONSOR_STAKING_LIST EXT wiring — mirrors the real
                        // web app's unstakeAllSponsorships callback: opens
                        // SPONSOR_STAKING_LIST via the real, shared engine's openPanel.
                        // SponsorStakingListPanel self-gates on that same id (see its
                        // own `panelId` default) and is mounted unconditionally below,
                        // so no separate usePanelVisible check is needed here.
                        onUnstake: () => openPanel(SP_COIN_DISPLAY.SPONSOR_STAKING_LIST, 'MeritWallet:unstakeAllSponsorships'),
                        // 2026-09-27, Phase C — display strings parsed from accountRecord.
                        tradingAmountText,
                        stakedAmountText,
                        pendingAmountText,
                        totalCoinsText,
                        // Loading / zero flags from caller (parsed from accountRecord).
                        tradingOrStalledLoading,
                        tradingIsZero,
                        stakedIsZero,
                        pendingIsZero,
                        pendingInitialLoading,
                        pendingRoleUnavailable,
                        pendingClaimInProgress,
                        pendingClaimDisabled,
                        pendingErrorText,
                        // Per-role rows + callbacks.
                        rewardRows,
                        onRoleEstimate,
                        onRoleClaim,
                        // Expanded-pending group visibility + header controls.
                        pendingVisible,
                        onOpenPendingGroup,
                        onPendingHeaderEstimate,
                        onClosePendingGroup,
                        onPendingEstimate,
                        onPendingClaim,
                        // Staked-row label click (opens SPONSOR_STAKING_LIST).
                        onStakedLabelClick,
                        // Auto-refresh toggle.
                        autoRefresh,
                        onAutoRefreshChange,
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
    const effectiveAccountGroups = (accountGroups ?? SAMPLE_ACCOUNT_GROUPS).map((group) => ({
        ...group,
        accounts: group.accounts.map((account) => ({
            ...account,
            icon: account.icon ??
                (account.iconSrc
                    ? React.createElement('img', {
                        src: account.iconSrc,
                        alt: '',
                        style: { width: '100%', height: '100%', objectFit: 'contain' },
                    })
                    : undefined),
        })),
    }));
    const networkRowsSource = networkRows ?? SAMPLE_NETWORK_ROWS;
    // The sample fallback's own testnet marker was always just the 'hardhat'
    // id (never a real isTestnet field) — preserved exactly for that path;
    // real networkRows use the real isTestnet flag instead.
    const isRowTestnet = (row) => networkRows ? Boolean(row.isTestnet) : row.id === 'hardhat';
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
    const listOverlay = activeListMode === 'sellToken' ||
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
                            openTokenDetail(row.address);
                            onTokenIconClick?.(row.address);
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
                                openAccountDetail(row.address);
                                onAccountIconClick?.(row.address);
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
                            setAccountCallBack: (account) => {
                                closeListOverlay();
                                const matched = account?.address
                                    ? accountListRewardsEntries.find((entry) => entry.address?.toLowerCase() === account.address.toLowerCase())
                                    : undefined;
                                if (matched)
                                    onAccountRowSelect?.(matched.id);
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
                                onAuthSourceChange: (source) => setNetworkAuthSources((prev) => ({ ...prev, [row.id]: source })),
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
    return (_jsxs("div", { style: {
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
        }, children: [_jsx(PanelGate, { panel: SP_COIN_DISPLAY.WALLET_NETWORK_HEADER, lazyLoad: false, children: _jsx(WalletNetworkHeader, { mode: "normal", leftSlot: _jsx("div", { onContextMenu: (e) => {
                            e.preventDefault();
                            openPanel(SP_COIN_DISPLAY.NETWORK_SELECTION_POPUP, 'MeritWallet:networkIconContextMenu');
                        }, children: _jsx(NetworkSelectDropDown, { label: activeNetworkRow?.name, 
                            // 2026-09-16, on live report ("the NetworkSelectDropDown is
                            // not showing the network icon in the WALLET_NETWORK_HEADER")
                            // — activeNetworkRow.iconSrc was already real (same value the
                            // Select Network list's own rows resolve their icon from
                            // below), this render site just never turned it into an
                            // <img> and passed it into NetworkSelectDropDown's own icon
                            // slot — same conversion the network-list rows already do.
                            icon: activeNetworkRow?.iconSrc
                                ? React.createElement('img', {
                                    src: activeNetworkRow.iconSrc,
                                    alt: '',
                                    style: { width: '100%', height: '100%', objectFit: 'contain' },
                                })
                                : undefined, onSelectClick: () => setActiveList('network'), onIconClick: activeNetworkRow
                                ? () => {
                                    openNetworkDetail(activeNetworkRow.id);
                                    onNetworkIconClick?.(activeNetworkRow.id);
                                }
                                : undefined, chevronUp: activeListMode === 'network' }) }), titleBadgeSrc: titleBadgeSrc, onRefresh: onRefresh, refreshing: refreshing, onClose: onClose, appType: appType, wwwIconSrc: wwwIconSrc, closeIconSrc: closeIconSrc }) }), _jsx(WalletAccountHeader, { icon: activeAccountEntry?.icon, address: activeAccountEntry?.address, symbol: activeAccountEntry?.symbol, name: activeAccountEntry?.name, onSelectClick: () => setActiveList('account'), onIconClick: (address) => {
                    if (!address)
                        return;
                    openAccountDetail(address);
                    onAccountIconClick?.(address);
                }, chevronUp: activeListMode === 'account' }), _jsx(AgentHeaderPanel, { agentName: agentAccount?.name, defaultAgentAddress: defaultAgentAddress, onHydrateAgent: onHydrateAgent, onSetAgentAccount: onSetAgentAccount ?? ((account) => setAgentAccount(account)), children: agentAccount ? (_jsx(AgentSelectDropDown, { icon: _jsx(AccountAvatar, { account: agentAccount, mode: SP_COIN_DISPLAY.AGENT_ACCOUNT, className: "h-full w-full object-cover", roleLabel: "AGENT" }), address: String(agentAccount.address ?? ''), symbol: agentAccount?.symbol, placeholderLabel: "Select Agent" })) : undefined }), _jsxs("div", { style: { display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', overflow: 'hidden' }, children: [_jsx(PanelTitle, { title: panelTitle, onMenuClick: handleMenuClick, menuOpen: menuOpen, 
                        // 2026-09-15 — the back arrow already existed (inert, no
                        // onBackClick ever passed); now real whenever a list overlay is
                        // open, closing it back to the tab it was opened from.
                        onBackClick: accountDetailAddress
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
                                        : undefined }), _jsx(MenuTabHeaderBar, { open: menuOpen, activeTab: activeTab, onTabClick: handleTabClick, children: _jsx(WalletRadioPanels, { children: body }) })] }), _jsx(SponsorStakingListPanel, { recipients: [], stakeInfoByAddress: {}, decimals: 18, loading: false }), _jsx(StakingControllerPanel, { sponsorMode: 'SPONSOR', recipientContent: stakingControllerRecipientContent, configCog: stakingControllerConfigCog }), _jsx(FloatingSelectPopup, { open: networkSelectPopupVisible, title: "Select Network", onClose: () => closePanel(SP_COIN_DISPLAY.NETWORK_SELECTION_POPUP, 'MeritWallet:closeNetworkSelectPopup'), zIndexClassName: "z-[10000]", minHeightClassName: "min-h-[300px]", bodyOverflow: "auto", children: _jsx(NetworkListTable, { rows: visibleNetworkRows.map((row) => ({
                        ...row,
                        authSource: networkAuthSources[row.id] ?? row.defaultAuthSource ?? 'merit',
                        onAuthSourceChange: (source) => setNetworkAuthSources((prev) => ({ ...prev, [row.id]: source })),
                    })), showTestNets: showTestNets, onToggleShowTestNets: () => setShowTestNets((prev) => !prev) }) }), SHOW_BUILD_MARKERS && (_jsxs("div", { style: {
                    position: 'absolute',
                    bottom: 2,
                    left: 6,
                    zIndex: 999999,
                    font: '9px monospace',
                    color: '#475569',
                    pointerEvents: 'none',
                }, children: ["\u27E8@sponsorcoin/spcoin-panels/MeritWallet.tsx \u00B7 build ", PACKAGE_BUILD, "\u27E9"] }))] }));
}

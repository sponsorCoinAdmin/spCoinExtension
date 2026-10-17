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
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { walletColors } from '@sponsorcoin/spcoin-common/styles';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAddress } from 'viem';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { TRADE_DIRECTION, FEED_TYPE } from '@sponsorcoin/spcoin-common/context';
import { usePanelTree, usePanelVisible, panelStore, useEnforceRadioPanelGroups, useEnforcePanelAncestorVisibility, useEnforceRadioPanelContainers, useAgentAccount, useSellTokenContract, useBuyTokenContract, useSlippage, useTradeDirection, useSellAmount, useBuyAmount, } from '@sponsorcoin/spcoin-exchange-engine';
import { PanelGate, WalletPanel, WalletSelectDropDownHosted, setWalletAssetBaseUrl, useWalletListTitle, WalletConnectProvider, ConfigSlippagePanel, PACKAGE_BUILD, SHOW_BUILD_MARKERS, LoginHeader, WalletNetworkHeader, ManageSponsorshipsPanel, AgentHeaderPanel, PasswordPanel, AssetListTable, AccountListCard, SponsorStakingListPanel, AssetListSelectPanel, PanelTreePanel, WalletBalanceContext, useFetchedBalance, fetchedBalanceText, NetworkListTable, WalletConfigPanel } from '@sponsorcoin/spcoin-panels';
import { domPlatform } from './platform/domPlatform';
import { MeritPlatformContext } from './platform/platform';
import { ALL_WALLET_DERIVATIONS, mergeWalletProps, useWalletDerivedProps } from './wallet/walletProps';
import { useApproverAccounts } from './wallet/approverAccountsReact';
import { useApprovalMessagePanel } from './auth/useApprovalMessagePanel';
import { walletName } from './auth/authenticator';
import { createMeritWalletIconCaches, buildNetworkRows as selfFetchNetworkRows, fetchAccountGroups as selfFetchAccountGroups, buildRecipientRows as selfFetchRecipientRows, buildAllAccountRows as selfFetchAllAccountRows, buildTokenRows as selfFetchTokenRows, NetworkSelectDropDown, WalletAccountHeader, PanelTitle, MenuTabHeaderBar, WalletRadioPanels, TradingStationPanel, SendTabPanel, AddressPanel, AccountDetailPanel, TokenDetailPanel, NetworkDetailPanel } from './panels';
// Panel visibility in this component goes through exactly one engine:
// @sponsorcoin/spcoin-exchange-engine's panelStore, read via PanelGate /
// usePanelVisible. The package's own separate store (panelState.ts) was
// deleted 2026-10-02 — see this package's index.ts header for why a
// second store let a tree toggle silently do nothing.
import ConnectedMessagePanel from './ConnectedMessagePanel';
import ConnectedRewardsPanel from './rewards/ConnectedRewardsPanel';
import AccountProfileEditor from './account/AccountProfileEditor';
import AddAccountFlow from './account/AddAccountFlow';
import RecoveryPhraseScreen from './RecoveryPhraseScreen';
import ConnectedSponsorStakingList from './sponsor/ConnectedSponsorStakingList';
import { buildSendReceipt } from './receipt/transactionReceipts';
import { isNativePlaceholder } from './send/sendTransfer';
import { useTransactionReceipt } from './receipt/useTransactionReceipt';
import { ActiveAccountProfileContext } from './swap/activeAccountProfile';
import ConnectedAgentSelectDropDown from './AgentSelectDropDown';
import { classifyAddressText, useNativeToken } from '@sponsorcoin/spcoin-exchange-engine';
// 2026-09-30, Stage B (real trade wiring) — a minimal, dependency-free
// decimal-string -> bigint parser for the SWAP tab's amount inputs. No
// `ethers`/`viem` import here on purpose: this is a portable package (the
// extension's Vite bundle included), and a full BigNumber-parsing library
// is unnecessary weight for one small, well-understood conversion. Returns
// undefined (never throws) for anything not yet a complete number — a
// mid-type state like "12." or "" — so the caller can just skip pushing to
// real ExchangeContext that keystroke and keep the local text as typed.
function parseDecimalAmount(text, decimals) {
    const trimmed = text.trim();
    if (!trimmed || trimmed === '.' || !/^\d*\.?\d*$/.test(trimmed))
        return undefined;
    const [wholeRaw, fracRaw = ''] = trimmed.split('.');
    const whole = wholeRaw || '0';
    const frac = fracRaw.slice(0, decimals).padEnd(decimals, '0');
    try {
        return BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt(frac || '0');
    }
    catch {
        return undefined;
    }
}
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
import SwapTradeButton from './swap/SwapTradeButton';
import ConnectedUniSelectPanel from './swap/ConnectedUniSelectPanel';
import { RADIO_PANEL_GROUPS_WITH_FALLBACKS, EMPTY_RADIO_PANEL_GROUPS } from './radioPanelGroups';
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
function toChecksumAddress(address) {
    if (!address)
        return address;
    try {
        return getAddress(address);
    }
    catch {
        return address;
    }
}
const LIST_PANEL_ID_FOR_MODE = {
    sellToken: SP_COIN_DISPLAY.MERIT_WALLET_TOKEN_LIST_OVERLAY,
    buyToken: SP_COIN_DISPLAY.MERIT_WALLET_TOKEN_LIST_OVERLAY,
    sendToken: SP_COIN_DISPLAY.MERIT_WALLET_TOKEN_LIST_OVERLAY,
    sendRecipient: SP_COIN_DISPLAY.MERIT_WALLET_SEND_RECIPIENT_LIST_OVERLAY,
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
const ALL_LIST_PANEL_IDS = [
    SP_COIN_DISPLAY.MERIT_WALLET_TOKEN_LIST_OVERLAY,
    SP_COIN_DISPLAY.MERIT_WALLET_SEND_RECIPIENT_LIST_OVERLAY,
    SP_COIN_DISPLAY.MERIT_WALLET_ACCOUNT_LIST_OVERLAY,
    SP_COIN_DISPLAY.MERIT_WALLET_NETWORK_LIST_OVERLAY,
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
// sample data. No row is flagged isActive: the header must read "Select Account" until a real account is chosen, never a sample address.
const SAMPLE_ACCOUNT_GROUPS = [
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
const SAMPLE_NETWORK_ROWS = [
    { id: 'eth-mainnet', symbol: 'ETH', name: 'Ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', isActive: true },
    { id: 'polygon', symbol: 'MATIC', name: 'Polygon', address: '0x00000000000000000000000000000000001010' },
    { id: 'hardhat', symbol: 'HH', name: 'Hardhat', address: '0x0000000000000000000000000000000000539b' },
];
// 2026-10-03 — accountEntryToSpCoinAccount (the AccountListEntry ->
// spCoinAccount bridge for AccountListRewardsPanel, added 2026-09-24) removed:
// the header account list now renders AccountListCard directly, which takes
// AccountListEntry as-is. AccountListRewardsPanel remains exported by the
// package for hosts that want the reward-aware list.
function MeritWalletInner({ resolveAssetAddress, docked = false, fullWidth = false, onClose, titleBadgeSrc, onRefresh, refreshing, appType, wwwIconSrc, closeIconSrc, infoIconSrc, initialActiveTab, onActiveTabChange, initialMenuOpen, onMenuOpenChange, initialOpenTarget, onOpenTargetChange, networkRows, accountGroups, accountListNotice, activeWalletName, activeWalletId, showWalletSelect = true, walletAssetBaseUrl, wallet, tokenRows, recipientRows, rewardsHost, stakingHost, accountProfileHost, addAccountHost, activeAccountAddress, activeAccountName, activeAccountSymbol, activeAccountLogoURL, chainId, baseUrl, storage, refreshToken, onAccountRowSelect, onNetworkRowSelect, onAccountIconClick, onAddAccount, swapHost, accountDetail, onTokenIconClick, tokenDetail, onNetworkIconClick, sendAmount, onSendAmountChange, sendBusy, onSendSubmit, sponsorPanel, listHost, manageRadioPanels = true, overlayHost, agentSelectSlot, fetchBalance, listPanelIdOverrides, passwordMode = 'unlock', passwordIcon, walletLocked, onResetWallet, passwordErrorText, passwordNoticeText, onPasswordSubmit, passwordSubmitting, recoveryPhrase, onRecoveryPhraseSaved, sellBalanceText, buyBalanceText, zeroXTradeButtonContent, uniSelectContent, configPasswordMode, onConfigPasswordModeChange, configPersistedTimeoutContent, configPasswordDescription, configMandatorySecurity, onConfigMandatorySecurityChange, configMandatoryApproval, onConfigMandatoryApprovalChange, configPasswordResetPanelContent, configSyncMode, onConfigSyncModeChange, configSyncDescription, configLocation, onConfigLocationChange, configShowBackgroundPage, onConfigShowBackgroundPageChange, configModalMode, onConfigModalModeChange, configSecurityPanelContent, configSigningPanelContent, configBackupPanelContent, configTestAccountsContent, configUniSelectVisible, onConfigUniswapEngineChange, configZeroXEngineVisible, onConfig0xEngineChange, configResetPanelsContent, configExtensionChannel, onConfigExtensionChannelChange, configExtensionDownloadPath, onConfigLogoff, onConfigResetPassword, onConfigDeleteAccount, onConfigDeleteWallet, }) {
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
    // 2026-10-09: result cards for Send / Sponsor. The active account's profile is filled in once the account rows are resolved (further down), and read at
    // the moment a result arrives.
    const showReceipt = useTransactionReceipt();
    const activeProfileRef = useRef(undefined);
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
        }
        else {
            openPanel(SP_COIN_DISPLAY.CONFIG_SLIPPAGE_PANEL, 'MeritWallet:slippageCog:open');
        }
    }, [slippageCogVisible, openPanel, closePanel]);
    const buyLabel = tradeDirection === TRADE_DIRECTION.SELL_EXACT_OUT
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
    // The hamburger and the tab bar share ONE state: the MENU_TAB_HEADER_BAR flag in the panel tree (no local copy). initialMenuOpen seeds the flag once; onMenuOpenChange hears every change, whoever made it (the hamburger, the panel-tree row).
    const menuTabHeaderVisible = usePanelVisible(SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR);
    const menuSeeded = useRef(false);
    useEffect(() => {
        if (menuSeeded.current)
            return;
        menuSeeded.current = true;
        if (initialMenuOpen === false)
            closePanel(SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR, 'MeritWallet:initialMenuOpen');
        // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once
    }, []);
    const lastMenuReported = useRef(null);
    useEffect(() => {
        if (lastMenuReported.current === menuTabHeaderVisible)
            return;
        const first = lastMenuReported.current === null;
        lastMenuReported.current = menuTabHeaderVisible;
        if (!first)
            onMenuOpenChange?.(menuTabHeaderVisible);
    }, [menuTabHeaderVisible, onMenuOpenChange]);
    const panelTreeVisible = usePanelVisible(SP_COIN_DISPLAY.PANEL_TREE_PANEL);
    const messageVisible = usePanelVisible(SP_COIN_DISPLAY.MESSAGE_PANEL);
    // 2026-10-13: where the wallet asset files are served from, for the pill, the list and the panel alike (a host on another origin, the extension, passes the web app's address)
    if (walletAssetBaseUrl !== undefined)
        setWalletAssetBaseUrl(walletAssetBaseUrl); // set while rendering (an idempotent module setting), so the children's first render already reads it
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
    useEnforceRadioPanelContainers(manageRadioPanels ? RADIO_PANEL_GROUPS_WITH_FALLBACKS : EMPTY_RADIO_PANEL_GROUPS);
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
    const iconCachesRef = useRef(undefined);
    if (!iconCachesRef.current)
        iconCachesRef.current = createMeritWalletIconCaches(storage);
    const [selfFetchedNetworkRows, setSelfFetchedNetworkRows] = useState(undefined);
    const [selfFetchedAccountGroups, setSelfFetchedAccountGroups] = useState(undefined);
    const [selfFetchedTokenRows, setSelfFetchedTokenRows] = useState(undefined);
    // false until the token self-fetch has finished (rows or failure): until then the pickers must not show the placeholder rows as if they were the real list.
    const [tokenFetchSettled, setTokenFetchSettled] = useState(false);
    const [selfFetchedRecipientRows, setSelfFetchedRecipientRows] = useState(undefined);
    // 2026-10-03 — Send's recipient picker lists every known account, not the
    // chain's recipient directory (see buildAllAccountRows' doc comment).
    const [selfFetchedAllAccountRows, setSelfFetchedAllAccountRows] = useState(undefined);
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
    const tokenRowsChainRef = useRef(undefined);
    useEffect(() => {
        if (chainId == null)
            return;
        const caches = iconCachesRef.current;
        const resolvedBaseUrl = baseUrl ?? '';
        const forceRefresh = hasFetchedOnceRef.current;
        hasFetchedOnceRef.current = true;
        let cancelled = false;
        if (networkRows === undefined) {
            void selfFetchNetworkRows(chainId, resolvedBaseUrl, caches, forceRefresh)
                .then((rows) => { if (!cancelled)
                setSelfFetchedNetworkRows(rows); })
                .catch((error) => console.error('MeritWallet: failed to self-fetch network rows:', error));
        }
        if (accountGroups === undefined) {
            void selfFetchAccountGroups(chainId, resolvedBaseUrl, caches, forceRefresh)
                .then((groups) => { if (!cancelled)
                setSelfFetchedAccountGroups(groups); })
                .catch((error) => console.error('MeritWallet: failed to self-fetch account groups:', error));
        }
        if (tokenRows === undefined) {
            setTokenFetchSettled(false);
            // another chain's rows must not stay up while this chain's list loads
            if (tokenRowsChainRef.current !== undefined && tokenRowsChainRef.current !== chainId)
                setSelfFetchedTokenRows(undefined);
            tokenRowsChainRef.current = chainId;
            void selfFetchTokenRows(chainId, resolvedBaseUrl, caches, forceRefresh)
                .then((rows) => { if (!cancelled) {
                setSelfFetchedTokenRows(rows);
                setTokenFetchSettled(true);
            } })
                .catch((error) => { console.error('MeritWallet: failed to self-fetch token rows:', error); if (!cancelled)
                setTokenFetchSettled(true); });
        }
        if (recipientRows === undefined) {
            void selfFetchRecipientRows(chainId, resolvedBaseUrl, caches, forceRefresh)
                .then((rows) => { if (!cancelled)
                setSelfFetchedRecipientRows(rows); })
                .catch((error) => console.error('MeritWallet: failed to self-fetch recipient rows:', error));
        }
        void selfFetchAllAccountRows(resolvedBaseUrl, caches, forceRefresh)
            .then((rows) => { if (!cancelled)
            setSelfFetchedAllAccountRows(rows); })
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
        if (activeAccountAddress === undefined || !fetchedAccountGroups)
            return fetchedAccountGroups;
        const want = activeAccountAddress.trim().toLowerCase();
        return fetchedAccountGroups.map((group) => ({
            ...group,
            accounts: group.accounts.map((account) => ({ ...account, isActive: !!want && String(account.address ?? '').toLowerCase() === want })),
        }));
    }, [fetchedAccountGroups, activeAccountAddress]);
    const resolvedTokenRows = tokenRows ?? selfFetchedTokenRows;
    const resolvedRecipientRows = recipientRows ?? selfFetchedRecipientRows;
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
    // activeListMode remains local because it carries the picker destination slot;
    // tree flags below remain the sole source for whether the list is visible.
    const [activeListModeLocal, setActiveListModeRaw] = useState(null);
    // 2026-10-05 — the ADDRESS_PANEL's typed value for the open token/recipient list.
    // Cleared whenever the list changes or closes (setActiveList below).
    const [addressInput, setAddressInput] = useState('');
    // What the host's resolver made of the typed address (only for addresses NOT in the loaded
    // rows). `result: null` = lookup in flight. See the effect below buildAddressBar.
    const [entryResolution, setEntryResolution] = useState(null);
    const addressRowsRef = useRef([]);
    const listPanelIdFor = (mode) => listPanelIdOverrides?.[mode] ?? LIST_PANEL_ID_FOR_MODE[mode];
    const accountListTreeOpen = usePanelVisible(listPanelIdFor('account'));
    const networkListTreeOpen = usePanelVisible(listPanelIdFor('network'));
    const activeListMode = activeListModeLocal ?? (accountListTreeOpen ? 'account' : networkListTreeOpen ? 'network' : null);
    const setActiveList = (mode) => {
        setAddressInput('');
        if (mode) {
            setActiveListModeRaw(mode);
            openPanel(listPanelIdFor(mode), 'MeritWallet:setActiveList');
        }
        else {
            const overrideIds = Object.values(listPanelIdOverrides ?? {});
            for (const id of [...ALL_LIST_PANEL_IDS, ...overrideIds])
                closePanel(id, 'MeritWallet:setActiveList:close');
            if (panelStore.isVisible(SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL))
                closePanel(SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL, 'NAV_POP:MeritWallet:setActiveList:close');
        }
    };
    // A header chevron TOGGLES its list: down opens it (pushes the display stack), up closes it (pops it). Open = the local mode OR the tree flag of the list id (a host may have opened it through the tree).
    const toggleList = (mode) => {
        if (activeListMode === mode || panelStore.isVisible(listPanelIdFor(mode)))
            setActiveList(null);
        else
            setActiveList(mode);
    };
    const [selections, setSelections] = useState({});
    // 2026-10-09 -- the Send tab starts on the network's native token (the web app's Send tab shows ETH until another token is picked): the native row of the token list
    // when it has one, otherwise a plain entry built from the active network's symbol.
    const NATIVE_SEND_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    // 2026-10-11 -- the chain's native token record (bundled in the extension) names the token when the list has no native row, ahead of the network's own symbol (HH_BASE on the fork).
    const nativeMeta = useNativeToken();
    const nativeSendEntry = useMemo(() => {
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
    const sendTokenEntry = selections.sendToken ?? nativeSendEntry;
    // 2026-10-11 (row 13): a list the shared panels opened through the panel tree (pay token, recipient, agent); the host's listHost renders it.
    useApprovalMessagePanel();
    const panelTreeListOpen = usePanelVisible(SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL);
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
    const addFlowTop = connectExtensionLeafVisible
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
    const walletBalanceValue = useMemo(() => ({ fetchBalance, accountAddress: activeBalanceAccount, refreshToken }), [fetchBalance, activeBalanceAccount, refreshToken]);
    const sendBalance = useFetchedBalance(fetchBalance, sendTokenEntry.address, activeBalanceAccount, refreshToken);
    // The recipient's balance of the token being sent (the Recipient row's line, as in the web Send tab).
    const recipientSendBalance = useFetchedBalance(fetchBalance, sendTokenEntry.address, selections.sendRecipient?.address, refreshToken);
    const sellBalance = useFetchedBalance(fetchBalance, sellTokenContract?.address, activeBalanceAccount, refreshToken);
    const buyBalance = useFetchedBalance(fetchBalance, buyTokenContract?.address, activeBalanceAccount, refreshToken);
    const fetchedSellBalanceText = fetchedBalanceText(fetchBalance, sellBalance, sellTokenContract?.decimals ?? 18);
    const fetchedBuyBalanceText = fetchedBalanceText(fetchBalance, buyBalance, buyTokenContract?.decimals ?? 18);
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
    const setSellAmount = (text) => {
        setSellAmountText(text);
        const parsed = parseDecimalAmount(text, sellDecimals);
        if (parsed !== undefined)
            setSellAmountContext(parsed);
    };
    const setBuyAmount = (text) => {
        setBuyAmountText(text);
        const parsed = parseDecimalAmount(text, buyDecimals);
        if (parsed !== undefined)
            setBuyAmountContext(parsed);
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
    const [accountDetailAddress, setAccountDetailAddress] = useState(null);
    const accountDetailVisible = usePanelVisible(SP_COIN_DISPLAY.ACCOUNT_PANEL);
    const [editingProfile, setEditingProfile] = useState(false);
    useEffect(() => setEditingProfile(false), [accountDetailAddress]);
    // Same idea, for the token-list's own info icon (Select a Token).
    const [tokenDetailAddress, setTokenDetailAddress] = useState(null);
    const tokenDetailVisible = usePanelVisible(SP_COIN_DISPLAY.TOKEN_PANEL);
    // Same idea, for the network-list's own icon (Select Network) — see
    // onNetworkIconClick's own doc comment for why this one needs no
    // separate "detail" data prop from the caller.
    const [networkDetailId, setNetworkDetailId] = useState(null);
    const networkDetailVisible = usePanelVisible(SP_COIN_DISPLAY.NETWORK_PANEL);
    // 2026-09-21, Path A — ACCOUNT_PANEL/TOKEN_PANEL/NETWORK_PANEL are ALL
    // `MAIN_RADIO_OVERLAY_PANELS` members too (verified the same way as
    // the tab/list-overlay pieces — read `panelGroups.ts` directly), so
    // opening one radio-atomically closes whatever else was showing there
    // (a trade tab, or a list overlay's real ids) in the real engine, same
    // interaction as the list-overlay slice already found and fixed for.
    // These addresses/ids identify the selected detail record. The panel
    // tree flags below own whether their detail screens are visible.
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
    const [showTestNets, setShowTestNets] = useState(false);
    // The list selection mode is still local state and is reset on tab
    // changes. Detail visibility is tree-owned; these ids only retain which
    // record was selected and can be cleared when leaving the detail screen.
    const handleTabClick = (tab) => {
        // Owner rule (docs 8.5.10): selecting the tab you are on changes nothing (what is open over it stays); selecting another tab goes through validateTab (openPanel routes tabs there), and what was open over the tab you leave stays on the stack, to come back with it.
        if (tab === activeTab)
            return;
        openPanel(TAB_PANEL_IDS[tab], 'MeritWallet:handleTabClick');
        // This component's own covering state (the private list overlays and the detail screens) is not on the stack: it is cleared. It never pops the stack here.
        setAddressInput('');
        setActiveListModeRaw(null);
        for (const id of ALL_LIST_PANEL_IDS)
            closePanel(id, 'MeritWallet:handleTabClick:closePrivateList');
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
        if (menuTabHeaderVisible)
            closePanel(SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR, 'MeritWallet:hamburger:close');
        else
            openPanel(SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR, 'MeritWallet:hamburger:open');
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
        if (hasSeededVisibilityRef.current)
            return;
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
    const commitSelection = (pickedRow) => {
        const row = { ...pickedRow, address: toChecksumAddress(pickedRow.address) };
        const slot = activeListMode;
        closeListOverlay();
        if (!slot)
            return;
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
            const contract = row.address
                ? {
                    address: row.address,
                    symbol: row.symbol,
                    name: row.name,
                    decimals: row.decimals,
                    logoURL: row.iconSrc,
                    balance: BigInt(0),
                }
                : undefined;
            if (slot === 'sellToken')
                setSellTokenContract(contract);
            else
                setBuyTokenContract(contract);
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
    const iconFromSrc = (src) => src
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
    const tabBody = activeTab === 'SWAP'
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
            buySuffixContent: uniSelectContent ??
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
                            if (!result)
                                return;
                            showReceipt(buildSendReceipt({
                                result,
                                amount: params.amount,
                                tokenSymbol: params.tokenSymbol ?? '',
                                tokenAddress: isNativePlaceholder(params.tokenAddress) ? undefined : params.tokenAddress,
                                from: activeProfileRef.current,
                                to: { address: selections.sendRecipient?.address, name: selections.sendRecipient?.name, symbol: selections.sendRecipient?.symbol, logoURL: selections.sendRecipient?.iconSrc },
                            }), 'MeritWallet:send');
                            // A confirmed send clears the amount; a failed one leaves everything as it was.
                            if (result.ok)
                                onSendAmountChange?.('');
                        });
                    }
                    : undefined,
            })
            : activeTab === 'SPONSOR'
                ? (sponsorPanel ?? null)
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
                            signingPanelContent: configSigningPanelContent,
                            backupPanelContent: configBackupPanelContent,
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
    const effectiveAccountGroups = (resolvedAccountGroups ?? SAMPLE_ACCOUNT_GROUPS).map((group) => ({
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
    const networkRowsSource = resolvedNetworkRows ?? SAMPLE_NETWORK_ROWS;
    // The sample fallback's own testnet marker was always just the 'hardhat'
    // id (never a real isTestnet field) — preserved exactly for that path;
    // real (explicit or self-fetched) networkRows use the real isTestnet flag
    // instead.
    const isRowTestnet = (row) => resolvedNetworkRows ? Boolean(row.isTestnet) : row.id === 'hardhat';
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
    const pillWalletId = activeWalletId ?? (activeGroupId === 'hardhat' ? 'serverKeystore' : activeGroupId === 'metamask' ? 'injected:io.metamask' : activeGroupId);
    // 2026-10-13 (owner report): the header's account pill read "Select Account" while a MetaMask account was active, because only the listed (keystore) rows were searched. The host's own active account fills in.
    const hostActiveAddress = String(activeAccountAddress ?? '').trim();
    const hostActiveEntry = hostActiveAddress
        ? {
            id: hostActiveAddress,
            address: hostActiveAddress,
            name: activeAccountName || undefined,
            symbol: activeAccountSymbol || undefined,
            iconSrc: activeAccountLogoURL || undefined,
            icon: activeAccountLogoURL ? React.createElement('img', { src: activeAccountLogoURL, alt: '', style: { width: '100%', height: '100%', objectFit: 'contain' } }) : undefined,
            isActive: true,
        }
        : undefined;
    const activeAccountEntry = flatAccountRows.find((account) => account.isActive) ?? hostActiveEntry;
    activeProfileRef.current = activeAccountEntry ? { address: activeAccountEntry.address, name: activeAccountEntry.name, symbol: activeAccountEntry.symbol, logoURL: activeAccountEntry.iconSrc } : undefined;
    // While the first self-fetch is still running (and no rows were passed in), the picker lists nothing and says it is loading, instead of showing the three placeholder rows and then
    // swapping in the real list (and its logos) the next time it is opened. The placeholders only appear after a fetch that failed.
    const tokenRowsLoading = tokenRows === undefined && resolvedTokenRows === undefined && !tokenFetchSettled;
    const effectiveTokenRows = resolvedTokenRows ?? (tokenRowsLoading ? [] : SAMPLE_TOKEN_ROWS);
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
    const buildAddressBar = (rows, kind, onInfo) => {
        const typed = addressInput.trim();
        let preview = null;
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
                        onInfoClick: hit.address ? () => onInfo(hit.address) : undefined,
                    }
                    : resolveAssetAddress
                        ? resolved?.result
                            ? resolved.result.status === 'ok'
                                ? {
                                    icon: iconFromSrc(resolved.result.asset.logoURL),
                                    symbol: resolved.result.asset.symbol,
                                    name: resolved.result.asset.name,
                                    address: resolved.result.asset.address,
                                    onSelect: () => commitSelection({
                                        symbol: resolved.result?.status === 'ok' ? resolved.result.asset.symbol : undefined,
                                        name: resolved.result?.status === 'ok' ? resolved.result.asset.name : undefined,
                                        address: typed,
                                        iconSrc: resolved.result?.status === 'ok' ? resolved.result.asset.logoURL : undefined,
                                        decimals: resolved.result?.status === 'ok' ? resolved.result.asset.decimals : undefined,
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
            }
            else if (!isPartial) {
                preview = { tone: 'error', icon: undefined, name: 'Invalid address', address: '' };
            }
        }
        return React.createElement(AddressPanel, { value: addressInput, onChange: setAddressInput, preview });
    };
    const recipientListRows = (activeListMode === 'sendRecipient' ? selfFetchedAllAccountRows : undefined) ??
        resolvedRecipientRows ??
        flatAccountRows;
    addressRowsRef.current =
        activeListMode === 'sendRecipient' ? recipientListRows : effectiveTokenRows;
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
        const kind = activeListMode === 'sendRecipient' ? 'account' : 'token';
        const peer = activeListMode === 'sellToken'
            ? buyTokenContract?.address
            : activeListMode === 'buyToken'
                ? sellTokenContract?.address
                : undefined;
        resolveAssetAddress(typed, kind, peer ? String(peer) : undefined)
            .then((result) => {
            if (!cancelled)
                setEntryResolution({ address: typed, result });
        })
            .catch((error) => {
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
    const listOverlay = activeListMode === 'sellToken' ||
        activeListMode === 'buyToken' ||
        activeListMode === 'sendToken'
        ? React.createElement(AssetListSelectPanel, {
            containerType: SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL,
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
                            openTokenDetail(row.address);
                            onTokenIconClick?.(row.address);
                        }
                        : undefined,
                })),
                metaLabel: tokenRowsLoading ? 'Token Meta (loading...)' : 'Token Meta',
            }),
        })
        : activeListMode === 'sendRecipient'
            ? React.createElement(AssetListSelectPanel, {
                containerType: SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL,
                // sendRecipient's own real id (REMOTE_ACCOUNT_SEND_LIST) has a matching FEED_TYPE member exactly.
                feedType: FEED_TYPE.REMOTE_ACCOUNT_SEND_LIST,
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
                    // Send lists every known account (the web's REMOTE_ACCOUNT_SEND_LIST).
                    rows: recipientListRows.map((row) => ({
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
                    // 2026-10-03, on request ("the web app has the correct list") —
                    // this branch rendered AccountListRewardsPanel (the reward-aware
                    // card list), while the web app's own header account pill opens
                    // LOCAL_ACCOUNT_WALLET_LIST ("Active Account Selection": Merit
                    // Wallet/MetaMask groups, ACTIVE badge, Add a Wallet/Account).
                    // AccountListCard is this package's pixel-copied portable version
                    // of exactly that screen (see its header comment), so both apps
                    // now show the same list from the same account groups.
                    return React.createElement(AssetListSelectPanel, {
                        containerType: SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL,
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
                                        // a connect that fails keeps the list open so its banner (accountListNotice) is seen; anything else closes it as before
                                        const result = onAccountRowSelect?.(account.id, group.id);
                                        if (result instanceof Promise)
                                            void result.then((ok) => { if (ok !== false)
                                                closeListOverlay(); });
                                        else if (result === false)
                                            return;
                                        else
                                            closeListOverlay();
                                    },
                                    onInfoClick: account.address
                                        ? () => {
                                            openAccountDetail(account.address);
                                            onAccountIconClick?.(account.address);
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
                })()
                : activeListMode === 'network'
                    ? React.createElement(AssetListSelectPanel, {
                        containerType: SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL,
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
                            })),
                            showTestNets,
                            onToggleShowTestNets: () => setShowTestNets((prev) => !prev),
                        }),
                    })
                    : null;
    // PanelGate's props type requires `children` as a prop, so createElement's children argument does not type-check here
    // eslint-disable-next-line react/no-children-prop
    const gatedTabBody = React.createElement(PanelGate, { panel: TAB_PANEL_IDS[activeTab], children: tabBody });
    const accountDetailView = accountDetailVisible && accountDetailAddress
        ? React.createElement(AccountDetailPanel, {
            address: accountDetailAddress,
            // Only trust accountDetail once it actually answers the address
            // currently being viewed — otherwise this would briefly render a
            // still-fresh previous account's details (or stale undefined
            // fields) under the new address for one render, between the click
            // and the caller's own fetch resolving.
            ...(accountDetail?.address === accountDetailAddress
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
    const profileLoaded = accountDetailVisible && !!accountDetail && !!accountDetailAddress && accountDetail.address === accountDetailAddress;
    const profileEditable = !!accountProfileHost && !!accountDetailAddress && profileLoaded && accountProfileHost.canEdit(accountDetailAddress);
    // 2026-10-10: the shared Add a Wallet/Account flow (the host's addAccountHost), shown over the wallet like the profile editor.
    const addAccountOverlay = addFlowTop != null && addAccountHost
        ? React.createElement(AddAccountFlow, { host: addAccountHost, wallet, activeAddress: activeAccountAddress, onDone: () => closePanel(addFlowTop, 'MeritWallet:addAccountFlow:done') })
        : null;
    const accountDetailOverlay = accountDetailVisible && accountDetailAddress && accountProfileHost && editingProfile && profileLoaded
        ? React.createElement(AccountProfileEditor, {
            address: accountDetailAddress,
            initial: { name: accountDetail?.name, symbol: accountDetail?.symbol, email: accountDetail?.email, website: accountDetail?.website, description: accountDetail?.description, avatarSrc: accountDetail?.avatarSrc, recipientNetwork: accountDetail?.recipientNetwork },
            exists: !!(accountDetail?.name || accountDetail?.symbol),
            host: accountProfileHost,
            onDone: () => setEditingProfile(false),
        })
        : accountDetailView && profileEditable
            ? React.createElement('div', null, accountDetailView, React.createElement('div', { style: { padding: '8px 12px' } }, React.createElement('button', { type: 'button', onClick: () => setEditingProfile(true), style: { width: '100%', borderRadius: 8, border: 'none', background: '#5981F3', color: '#ffffff', fontSize: 12, fontWeight: 600, padding: '9px 0', cursor: 'pointer' } }, 'Edit Profile')))
            : accountDetailView;
    const tokenDetailOverlay = tokenDetailVisible && tokenDetailAddress
        ? React.createElement(TokenDetailPanel, {
            address: tokenDetailAddress,
            // Same "only trust it once it answers the current address" gate
            // as accountDetailOverlay above.
            ...(tokenDetail?.address === tokenDetailAddress
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
    const passwordOverlay = passwordPanelShowing && recoveryPhrase
        ? React.createElement(RecoveryPhraseScreen, { recoveryPhrase, onContinue: () => onRecoveryPhraseSaved?.(), autoHide: false })
        : passwordPanelShowing
            ? React.createElement(PasswordPanel, {
                mode: passwordMode,
                showTitle: false,
                icon: passwordIcon,
                errorText: passwordErrorText,
                noticeText: passwordNoticeText,
                onSubmit: onPasswordSubmit,
                submitting: passwordSubmitting,
                clearOnSubmit: true,
            })
            : null;
    const passwordOverlayWithReset = passwordOverlay && walletLocked && onResetWallet
        ? React.createElement(React.Fragment, null, passwordOverlay, React.createElement('div', { style: { textAlign: 'center', padding: '8px 12px' } }, React.createElement('button', { type: 'button', onClick: onResetWallet, style: { background: 'none', border: 0, color: '#94a3b8', textDecoration: 'underline', cursor: 'pointer', font: 'inherit', fontSize: 12 } }, 'Forgot password? Reset wallet')))
        : passwordOverlay;
    // 2026-10-05 — PANEL_TREE_PANEL is a main-radio view (opened from Config), not a tab: it replaces the body
    // while it is the showing member, exactly like the other full-body overlays.
    const panelTreeOverlay = panelTreeVisible ? React.createElement(PanelTreePanel) : null;
    // 2026-10-09 -- the result card of a swap (Success / error, from the shared runUniswapSwap flow). The web app shows MESSAGE_PANEL through its
    // overlayHost; a host without one (the extension) gets it here, in place of the body, until the user closes it.
    const messageOverlay = messageVisible && !overlayHost ? React.createElement(ConnectedMessagePanel) : null;
    // 2026-10-13 (owner request): WALLET_PANEL, the active wallet's account.json. The web app shows it through its overlayHost (walletPanel slot); a host without one (the extension) gets it here, in place of the body.
    const walletPanelOverlay = walletPanelVisible && !overlayHost ? React.createElement(WalletPanel, { walletId: activeWalletId, baseUrl: walletAssetBaseUrl, showLogo: walletLogoVisible, showMetaData: walletMetaDataVisible }) : null;
    const body = messageOverlay ?? passwordOverlayWithReset ?? panelTreeOverlay ?? addAccountOverlay ?? accountDetailOverlay ?? tokenDetailOverlay ?? networkDetailOverlay ?? walletPanelOverlay ?? (listHost && panelTreeListOpen ? listHost : null) ?? listOverlay ?? gatedTabBody;
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
    return (_jsx(WalletBalanceContext.Provider, { value: walletBalanceValue, children: _jsx(WalletConnectProvider, { hasAccount: !!String(activeAccountAddress ?? '').trim(), openAccountList: () => setActiveList('account'), children: _jsx(ActiveAccountProfileContext.Provider, { value: activeAccountEntry ? { address: activeAccountEntry.address, name: activeAccountEntry.name, symbol: activeAccountEntry.symbol, logoURL: activeAccountEntry.iconSrc } : undefined, children: _jsxs("div", { style: {
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
                    }, children: [passwordPanelShowing && (_jsx(PanelGate, { panel: SP_COIN_DISPLAY.LOGIN_HEADER, lazyLoad: false, children: _jsx(LoginHeader, { title: recoveryPhrase || passwordMode === 'setup' ? 'Create Merit Wallet Account' : 'Merit Wallet Login', onClose: onClose, appType: appType, wwwIconSrc: wwwIconSrc, closeIconSrc: closeIconSrc }) })), !passwordPanelShowing && (_jsx(PanelGate, { panel: SP_COIN_DISPLAY.WALLET_NETWORK_HEADER, lazyLoad: false, children: _jsx(WalletNetworkHeader, { mode: "normal", leftSlot: _jsx(NetworkSelectDropDown, { label: activeNetworkRow?.name, 
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
                                        : undefined, onSelectClick: () => toggleList('network'), onIconClick: activeNetworkRow
                                        ? () => {
                                            openNetworkDetail(activeNetworkRow.id);
                                            onNetworkIconClick?.(activeNetworkRow.id);
                                        }
                                        : undefined, chevronUp: activeListMode === 'network' }), titleBadgeSrc: titleBadgeSrc, onRefresh: onRefresh, refreshing: refreshing, onClose: onClose, appType: appType, wwwIconSrc: wwwIconSrc, closeIconSrc: closeIconSrc }) })), !passwordPanelShowing && (_jsx(PanelGate, { panel: SP_COIN_DISPLAY.WALLET_ACCOUNT_HEADER, lazyLoad: false, children: _jsx(WalletAccountHeader, { icon: activeAccountEntry?.icon, address: activeAccountEntry?.address, symbol: activeAccountEntry?.symbol, name: activeAccountEntry?.name, placeholderLabel: "Select Account", onSelectClick: () => toggleList('account'), onIconClick: (address) => {
                                    if (!address)
                                        return;
                                    openAccountDetail(address);
                                    onAccountIconClick?.(address);
                                }, chevronUp: activeListMode === 'account', walletName: activeWalletName }) })), !passwordPanelShowing && (_jsx(AgentHeaderPanel, { agentName: agentAccount?.name, children: agentSelectSlot ?? _jsx(ConnectedAgentSelectDropDown, {}) })), _jsxs("div", { style: { display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', overflow: 'hidden' }, children: [!passwordPanelShowing && (_jsx(PanelGate, { panel: SP_COIN_DISPLAY.PANEL_TITLE, lazyLoad: false, children: _jsx(PanelTitle, { title: panelTitle, onMenuClick: handleMenuClick, menuOpen: menuTabHeaderVisible, 
                                        // 2026-10-03, on request — on the Account Login / Create Account
                                        // screen the title bar shows only its title: no back button (nothing
                                        // to go back to while locked) and no hamburger menu.
                                        hideBackButton: passwordPanelShowing, hideMenuButton: passwordPanelShowing, 
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
                                        onBackClick: accountDetailVisible
                                            ? () => {
                                                setAccountDetailAddress(null);
                                                closePanel('NAV_POP:MeritWallet:accountDetailBack');
                                            }
                                            : tokenDetailVisible
                                                ? () => {
                                                    setTokenDetailAddress(null);
                                                    closePanel('NAV_POP:MeritWallet:tokenDetailBack');
                                                }
                                                : networkDetailVisible
                                                    ? () => {
                                                        setNetworkDetailId(null);
                                                        closePanel('NAV_POP:MeritWallet:networkDetailBack');
                                                    }
                                                    : addFlowTop != null
                                                        ? () => closePanel(addFlowTop, 'NAV_POP:MeritWallet:addFlowBack')
                                                        : activeListMode
                                                            ? () => setActiveList(null)
                                                            : () => closePanel('MeritWallet:back') }) })), _jsxs(MenuTabHeaderBar, { open: menuTabHeaderVisible && !passwordPanelShowing, activeTab: activeTab, onTabClick: handleTabClick, children: [showWalletSelect && !passwordPanelShowing && panelTreeListOpen && (addMenuVisible || walletListVisible) && !walletListLeafVisible && (_jsx("div", { id: "WALLET_SELECT_ROW", style: { padding: '6px 10px', display: 'flex', alignItems: 'center' }, children: _jsx(WalletSelectDropDownHosted, { walletId: pillWalletId, displayName: pillWalletId ? walletName(pillWalletId) : undefined, baseUrl: walletAssetBaseUrl }) })), _jsx(WalletRadioPanels, { overlayHost: overlayHost, children: body })] })] }), !overlayHost && !passwordPanelShowing && (stakingHost ? _jsx(ConnectedSponsorStakingList, { host: stakingHost }) : _jsx(SponsorStakingListPanel, { recipients: [], stakeInfoByAddress: {}, decimals: 18, loading: false })), SHOW_BUILD_MARKERS && (_jsxs("div", { style: {
                                position: 'absolute',
                                bottom: 2,
                                left: 6,
                                zIndex: 999999,
                                font: '9px monospace',
                                color: walletColors.slateMid,
                                pointerEvents: 'none',
                            }, children: ["\u27E8@sponsorcoin/merit-wallet/MeritWallet.tsx \u00B7 build ", PACKAGE_BUILD, "\u27E9"] }))] }) }) }) }));
}
let warnedNoAccountSource = false;
/**
 * The component. A host that passes `wallet` gets the lock screen, the lock button, the authentication type and the Wallet Security section from it (src/wallet/walletProps.tsx); everything else, and every
 * prop the host passes explicitly, is unchanged.
 */
export default function MeritWallet(props) {
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
    const accountDerived = approvers.groups
        ? {
            accountGroups: approvers.groups,
            accountListNotice: approvers.notice || undefined,
            onAccountRowSelect: async (accountId, groupId) => {
                const approverId = (groupId ?? (props.wallet ? props.wallet.backendIdFor(accountId) : undefined));
                if (!approverId || !approvers.controller)
                    return false;
                return approvers.controller.connect(approverId, accountId);
            },
        }
        : {};
    // A host that passes `approverHost` has asked for the derived account list: it replaces the host's own accountGroups / onAccountRowSelect (which stay as the fallback until the list has loaded).
    const activeWalletId = props.wallet && props.activeAccountAddress ? props.wallet.backendIdFor(props.activeAccountAddress) : undefined;
    const activeWalletName = activeWalletId && props.wallet ? props.wallet.backend(activeWalletId)?.name : undefined;
    const merged = props.wallet ? { ...mergeWalletProps(props, { ...derived, activeWalletName }, props.wallet, props.activeAccountAddress), activeWalletId: props.activeWalletId ?? activeWalletId, ...accountDerived } : props;
    return React.createElement(MeritPlatformContext.Provider, { value: platform }, React.createElement(MeritWalletInner, merged));
}

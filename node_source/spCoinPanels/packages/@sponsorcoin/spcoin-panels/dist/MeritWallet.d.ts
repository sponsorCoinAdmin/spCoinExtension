import React from 'react';
import { APP_TYPE } from '@sponsorcoin/spcoin-common';
import { type MenuTabKey } from './MenuTabHeaderBar';
import { type ManageSponsorshipRole, type ManageSponsorshipRoleRow } from './ManageSponsorshipsPanel';
import { type HydratedAgent } from './AgentHeaderPanel';
import { type OpenTarget } from './WalletConfigPanel';
import { type AssetListEntry } from './AssetListTable';
import { type AccountListGroup } from './AccountListCard';
import { type NetworkAuthSource } from './NetworkListRow';
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
    initialActiveTab?: MenuTabKey;
    onActiveTabChange?: (tab: MenuTabKey) => void;
    initialMenuOpen?: boolean;
    onMenuOpenChange?: (open: boolean) => void;
    initialOpenTarget?: OpenTarget;
    onOpenTargetChange?: (target: OpenTarget) => void;
    networkRows?: MeritWalletNetworkRow[];
    accountGroups?: AccountListGroup[];
    /** 2026-09-27, Phase 4 — chainId for swap/stake execution. Defaults to
     *  31337 (Hardhat) when omitted. */
    activeChainId?: number;
    tokenRows?: AssetListEntry[];
    recipientRows?: AssetListEntry[];
    onAccountRowSelect?: (accountId: string) => void;
    onNetworkRowSelect?: (networkId: string) => void;
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
    onNetworkIconClick?: (networkId: string) => void;
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
    onSendSubmit?: (params: {
        recipientAddress?: string;
        tokenAddress?: string;
        amount: string;
        decimals?: number;
        tokenSymbol?: string;
    }) => void;
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
    /** 2026-09-27, Phase 4 — swap execution callback for SPONSOR tab.
       *  MeritWallet calls this with the current selections so the caller
       *  (sidepanel.ts) can invoke executeUniswapV3Swap with the right params.
       *  Omit to skip swap (inert-only behavior). */
    onSponsorSwapSubmit?: (params: {
        tokenIn: string;
        tokenOut: string;
        amountIn: bigint;
        recipient: string;
        chainId: number;
    }) => void;
    sponsorSwapBusy?: boolean;
    /** 2026-09-28, TRADING_STATION_PANEL migration — SWAP tab swap execution. */
    swapAmount?: string;
    onSwapAmountChange?: (value: string) => void;
    swapBusy?: boolean;
    onSwapSubmit?: (params: {
        sellTokenAddress: string;
        buyTokenAddress: string;
        amountIn: bigint;
        recipient: string;
        chainId: number;
    }) => void;
    /** 2026-09-27 — TODO 4 wiring: default agent address for AGENT_HEADER_PANEL
    *  auto-seed. The web app reads this from NEXT_PUBLIC_DEFAULT_AGENT_ADDRESS;
    *  the extension should pass the same env-derived value (or omit to skip
    *  auto-seed). Omit to keep current inert behavior (no default agent). */
    defaultAgentAddress?: string;
    /** 2026-09-27 — TODO 4 wiring: resolve a HydratedAgent from an address.
     *  Caller supplies the real fetch (fetchAccountMetadata + getAccountAvatarURL);
     *  this package has no feed dependency of its own. Omit to skip auto-seed. */
    onHydrateAgent?: (address: string) => Promise<HydratedAgent | undefined>;
    /** 2026-09-27 — TODO 4 wiring: commit the hydrated default agent back into
     *  account state (useAgentAccount's setter). Omit to skip auto-seed. */
    onSetAgentAccount?: (account: HydratedAgent) => void;
    tradingAmountText?: string;
    stakedAmountText?: string;
    pendingAmountText?: string;
    totalCoinsText?: string;
    tradingOrStalledLoading?: boolean;
    tradingIsZero?: boolean;
    stakedIsZero?: boolean;
    pendingIsZero?: boolean;
    pendingInitialLoading?: boolean;
    pendingRoleUnavailable?: boolean;
    pendingClaimInProgress?: boolean;
    pendingClaimDisabled?: boolean;
    pendingErrorText?: string;
    rewardRows?: ManageSponsorshipRoleRow[];
    onRoleEstimate?: (role: ManageSponsorshipRole) => void;
    onRoleClaim?: (role: ManageSponsorshipRole) => void;
    pendingVisible?: boolean;
    onOpenPendingGroup?: () => void;
    onPendingHeaderEstimate?: () => void;
    onClosePendingGroup?: () => void;
    onPendingEstimate?: () => void;
    onPendingClaim?: () => void;
    autoRefresh?: boolean;
    onAutoRefreshChange?: (v: boolean) => void;
    onStakedLabelClick?: () => void;
}
export default function MeritWallet({ docked, fullWidth, onClose, titleBadgeSrc, onRefresh, refreshing, appType, wwwIconSrc, closeIconSrc, infoIconSrc, initialActiveTab, onActiveTabChange, initialMenuOpen, onMenuOpenChange, initialOpenTarget, onOpenTargetChange, networkRows, accountGroups, tokenRows, recipientRows, onAccountRowSelect, onNetworkRowSelect, onAccountIconClick, accountDetail, onTokenIconClick, tokenDetail, onNetworkIconClick, sendAmount, onSendAmountChange, sendBusy, onSendSubmit, sponsorStakeSubmitBusy, onSponsorStakeSubmit, sponsorAmount, onSponsorAmountChange, sponsorAmountBusy, onSponsorSwapSubmit, sponsorSwapBusy, swapAmount, onSwapAmountChange, swapBusy, onSwapSubmit, activeChainId, defaultAgentAddress, onHydrateAgent, onSetAgentAccount, tradingAmountText, stakedAmountText, pendingAmountText, totalCoinsText, tradingOrStalledLoading, tradingIsZero, stakedIsZero, pendingIsZero, pendingInitialLoading, pendingRoleUnavailable, pendingClaimInProgress, pendingClaimDisabled, pendingErrorText, rewardRows, onRoleEstimate, onRoleClaim, pendingVisible, onOpenPendingGroup, onPendingHeaderEstimate, onClosePendingGroup, onPendingEstimate, onPendingClaim, autoRefresh, onAutoRefreshChange, onStakedLabelClick, }: MeritWalletProps): React.JSX.Element;

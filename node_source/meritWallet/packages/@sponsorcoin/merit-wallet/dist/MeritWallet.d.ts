import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { APP_TYPE } from '@sponsorcoin/spcoin-common';
import type { IconCacheStorage } from '@sponsorcoin/spcoin-feeds/shared';
import { type RewardsHost } from './rewards/ConnectedRewardsPanel';
import { type AccountProfileHost } from './account/AccountProfileEditor';
import { type AddAccountHost } from './account/AddAccountFlow';
import { type SponsorStakingHost } from './sponsor/ConnectedSponsorStakingList';
import { type HostTransactionResult } from './receipt/transactionReceipts';
import { type MenuTabKey } from './panels';
import { type OpenTarget, type MeritWalletPasswordMode as ConfigPasswordMode, type ApplicationSyncMode, type MeritWalletLocation, type MeritExtensionChannel } from '@sponsorcoin/spcoin-panels';
import { type AssetListEntry } from '@sponsorcoin/spcoin-panels';
import { type AccountListGroup } from '@sponsorcoin/spcoin-panels';
import { type FetchBalance } from '@sponsorcoin/spcoin-panels';
import { type AssetEntryKind, type AssetEntryResult } from '@sponsorcoin/spcoin-exchange-engine';
import type { MeritWalletNetworkRow } from './panels';
import type { AuthenticationType } from './auth/authenticationType';
import { type SwapTradeButtonHost } from './swap/SwapTradeButton';
type ActiveListMode = 'sellToken' | 'buyToken' | 'sendToken' | 'sendRecipient' | 'sponsorPayToken' | 'sponsorRecipient' | 'account' | 'network' | null;
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
    initialActiveTab?: MenuTabKey;
    onActiveTabChange?: (tab: MenuTabKey) => void;
    initialMenuOpen?: boolean;
    onMenuOpenChange?: (open: boolean) => void;
    initialOpenTarget?: OpenTarget;
    onOpenTargetChange?: (target: OpenTarget) => void;
    networkRows?: MeritWalletNetworkRow[];
    accountGroups?: AccountListGroup[];
    tokenRows?: AssetListEntry[];
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
    chainId?: number;
    baseUrl?: string;
    storage?: IconCacheStorage;
    refreshToken?: number;
    onAccountRowSelect?: (accountId: string) => void;
    onNetworkRowSelect?: (networkId: string) => void;
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
    /** May return the outcome (hash + receipt, or a failure message): the wallet then shows the same result card the web app shows. */
    onSendSubmit?: (params: {
        recipientAddress?: string;
        tokenAddress?: string;
        amount: string;
        decimals?: number;
        tokenSymbol?: string;
    }) => void | Promise<HostTransactionResult | void>;
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
    manageRadioPanels?: boolean;
    overlayHost?: React.ReactNode;
    agentSelectSlot?: React.ReactNode;
    fetchBalance?: FetchBalance;
    listPanelIdOverrides?: Partial<Record<Exclude<ActiveListMode, null>, SP_COIN_DISPLAY>>;
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
    onPasswordSubmit?: (password: string, confirmPassword: string) => void;
    passwordSubmitting?: boolean;
    sellBalanceText?: string;
    buyBalanceText?: string;
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
export default function MeritWallet({ resolveAssetAddress, docked, fullWidth, onClose, titleBadgeSrc, onRefresh, refreshing, appType, wwwIconSrc, closeIconSrc, infoIconSrc, initialActiveTab, onActiveTabChange, initialMenuOpen, onMenuOpenChange, initialOpenTarget, onOpenTargetChange, networkRows, accountGroups, tokenRows, recipientRows, activeSpCoinAddress, fetchStakedAmount: fetchStakedAmountProp, rewardsHost, stakingHost, accountProfileHost, addAccountHost, activeAccountAddress, chainId, baseUrl, storage, refreshToken, onAccountRowSelect, onNetworkRowSelect, onAccountIconClick, onAddAccount, swapHost, accountDetail, onTokenIconClick, tokenDetail, onNetworkIconClick, sendAmount, onSendAmountChange, sendBusy, onSendSubmit, sponsorStakeSubmitBusy, onSponsorStakeSubmit, sponsorAmount, onSponsorAmountChange, sponsorAmountBusy, manageRadioPanels, overlayHost, agentSelectSlot, fetchBalance, listPanelIdOverrides, passwordMode, passwordIcon, walletLocked, onResetWallet, passwordErrorText, onPasswordSubmit, passwordSubmitting, sellBalanceText, buyBalanceText, zeroXTradeButtonContent, uniSelectContent, configPasswordMode, onConfigPasswordModeChange, configPersistedTimeoutContent, configPasswordDescription, configMandatorySecurity, onConfigMandatorySecurityChange, configMandatoryApproval, onConfigMandatoryApprovalChange, configPasswordResetPanelContent, configSyncMode, onConfigSyncModeChange, configSyncDescription, configLocation, onConfigLocationChange, configShowBackgroundPage, onConfigShowBackgroundPageChange, configModalMode, onConfigModalModeChange, configSecurityPanelContent, configTestAccountsContent, configUniSelectVisible, onConfigUniswapEngineChange, configZeroXEngineVisible, onConfig0xEngineChange, configResetPanelsContent, configExtensionChannel, onConfigExtensionChannelChange, configExtensionDownloadPath, onConfigLogoff, onConfigResetPassword, onConfigDeleteAccount, onConfigDeleteWallet, }: MeritWalletProps): React.JSX.Element;

// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/hostContract.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, row 9 / S2c) -- the host contract: what MeritWallet needs from whatever app mounts it.
// Two parts.
//
// 1. MeritWalletHost: every prop MeritWalletProps has, filed under exactly one of eight sections. The sections are the contract's
//    shape; a host (the web wrapper, the extension's sidepanel.ts, later a phone app) supplies props from these sections and nothing
//    else. The classification is checked by the compiler: a prop added to MeritWalletProps without a section here makes the
//    package fail to build (see Unclassified below), so the contract cannot drift silently.
//
// 2. MeritWalletApi: the wallet API the component talks to for things that cannot be props, modelled on MetaMask's controllers
//    (KeyringController: unlock / lock / accounts / signing; ApprovalController: the pending-approval queue; NetworkController: the
//    network registry). It is an interface only. Implementations: LOCAL (the extension's background worker owns the vault), PROVIDER (the web
//    app asks the extension through an injected EIP-1193 provider) and HTTP (the server routes used today). The component itself must use no
//    browser globals (window, document, localStorage, chrome): everything host-specific arrives through these two parts.
import type { MeritWalletProps } from './MeritWallet';
import type { NetworkRecord } from '@sponsorcoin/spcoin-feeds/networks';
import type { WalletDataSource } from './walletData';

/** How the wallet is framed and closed: layout, title bar, header icons, refresh. */
export type HostLayout = Pick<
  MeritWalletProps,
  | 'docked' | 'fullWidth' | 'onClose' | 'titleBadgeSrc' | 'appType' | 'wwwIconSrc' | 'closeIconSrc' | 'infoIconSrc'
  | 'onRefresh' | 'refreshing' | 'refreshToken'
>;

/** UI state the host remembers across loads (its own storage). */
export type HostUiState = Pick<
  MeritWalletProps,
  'initialActiveTab' | 'onActiveTabChange' | 'initialMenuOpen' | 'onMenuOpenChange' | 'initialOpenTarget' | 'onOpenTargetChange'
>;

/** Data the host supplies or lets the component fetch itself (chainId + baseUrl + storage turn the self-fetch on). */
export type HostData = Pick<
  MeritWalletProps,
  | 'networkRows' | 'accountGroups' | 'tokenRows' | 'recipientRows' | 'chainId' | 'baseUrl' | 'storage'
  | 'resolveAssetAddress' | 'fetchBalance' | 'sellBalanceText' | 'buyBalanceText' | 'activeSpCoinAddress' | 'fetchStakedAmount' | 'rewardsHost' | 'stakingHost' | 'activeAccountAddress'
>;

/** What the host does when the user picks or inspects a row. */
export type HostSelection = Pick<
  MeritWalletProps,
  | 'onAccountRowSelect' | 'onNetworkRowSelect' | 'onAccountIconClick' | 'onAddAccount' | 'swapHost' | 'accountDetail' | 'accountProfileHost' | 'onTokenIconClick' | 'tokenDetail'
  | 'onNetworkIconClick'
>;

/** Transactions the user starts from the Send and Sponsor tabs, and the input state around them. */
export type HostActions = Pick<
  MeritWalletProps,
  | 'sendAmount' | 'onSendAmountChange' | 'sendBusy' | 'onSendSubmit'
  | 'sponsorStakeSubmitBusy' | 'onSponsorStakeSubmit' | 'sponsorAmount' | 'onSponsorAmountChange' | 'sponsorAmountBusy'
>;

/** The body: who owns the radio groups, the overlay host, and the slots a host fills with its own panels. */
export type HostSlots = Pick<
  MeritWalletProps,
  | 'manageRadioPanels' | 'overlayHost' | 'agentSelectSlot' | 'listPanelIdOverrides' | 'zeroXTradeButtonContent' | 'uniSelectContent'
  | 'configPersistedTimeoutContent' | 'configPasswordResetPanelContent' | 'configSecurityPanelContent' | 'configTestAccountsContent' | 'configResetPanelsContent'
>;

/** The lock screen: the vault is locked or being set up (MetaMask's gate is the lock state). */
export type HostLock = Pick<
  MeritWalletProps,
  'passwordMode' | 'walletLocked' | 'onResetWallet' | 'passwordIcon' | 'passwordErrorText' | 'onPasswordSubmit' | 'passwordSubmitting'
>;

/** The Config tab's values and handlers. */
export type HostConfig = Pick<
  MeritWalletProps,
  | 'configPasswordMode' | 'onConfigPasswordModeChange' | 'configPasswordDescription' | 'configMandatorySecurity'
  | 'onConfigMandatorySecurityChange' | 'configMandatoryApproval' | 'onConfigMandatoryApprovalChange' | 'configSyncMode'
  | 'onConfigSyncModeChange' | 'configSyncDescription' | 'configLocation' | 'onConfigLocationChange' | 'configShowBackgroundPage'
  | 'onConfigShowBackgroundPageChange' | 'configModalMode' | 'onConfigModalModeChange' | 'configUniSelectVisible'
  | 'onConfigUniswapEngineChange' | 'configZeroXEngineVisible' | 'onConfig0xEngineChange' | 'configExtensionChannel'
  | 'onConfigExtensionChannelChange' | 'configExtensionDownloadPath' | 'onConfigLogoff' | 'onConfigResetPassword' | 'onConfigDeleteAccount' | 'onConfigDeleteWallet' | 'authenticationType'
>;

export type MeritWalletHost = HostLayout & HostUiState & HostData & HostSelection & HostActions & HostSlots & HostLock & HostConfig;

// Compile-time completeness check: every key of MeritWalletProps must be in one section. Adding a prop without filing it makes
// `Unclassified` non-empty and the assignment below a type error.
type Unclassified = Exclude<keyof MeritWalletProps, keyof MeritWalletHost>;
export const MERIT_WALLET_PROPS_ARE_ALL_CLASSIFIED: [Unclassified] extends [never] ? true : { missing: Unclassified } = true;

// ---------------------------------------------------------------------------------------------------------------------------------
// The wallet API.
// ---------------------------------------------------------------------------------------------------------------------------------

export interface WalletAccountSummary {
  address: string;
  name?: string;
  /** Where the key lives: generated from the recovery phrase, imported by private key, or a hardware device. */
  source?: 'generated' | 'imported' | 'hardware';
}

export interface WalletTransactionRequest {
  from: string;
  to?: string;
  value?: bigint;
  data?: string;
  chainId: number;
}

export interface WalletApprovalRequest {
  id: string;
  kind: 'sign' | 'transaction' | 'connect';
  origin?: string;
  summary: string;
}

/** The vault's lock state (MetaMask KeyringController: isUnlocked, submitPassword, setLocked). */
export interface WalletSessionApi {
  isUnlocked(): Promise<boolean>;
  unlock(password: string): Promise<boolean>;
  lock(): Promise<void>;
  /** Subscribe to lock / unlock; returns the unsubscribe function. */
  onChange(listener: () => void): () => void;
}

/** The accounts the vault holds (MetaMask KeyringController / AccountsController). */
export interface WalletAccountsApi {
  list(): Promise<WalletAccountSummary[]>;
  activeAddress(): Promise<string | undefined>;
  setActive(address: string): Promise<void>;
  /** Create the next account from the recovery phrase, or import one by private key. */
  create(name?: string): Promise<WalletAccountSummary>;
  importPrivateKey(privateKey: string, name?: string): Promise<WalletAccountSummary>;
  remove(address: string): Promise<void>;
}

/** Signing and sending, always behind an approval (MetaMask ApprovalController: every request waits for the user). */
export interface WalletSigningApi {
  signMessage(params: { address: string; message: string }): Promise<string>;
  sendTransaction(request: WalletTransactionRequest): Promise<{ hash: string }>;
  pendingApprovals(): Promise<WalletApprovalRequest[]>;
  approve(id: string): Promise<void>;
  reject(id: string): Promise<void>;
  onApprovalsChange(listener: () => void): () => void;
}

/** The network registry (MetaMask NetworkController: configurations by chain id, one selected). */
export interface WalletNetworksApi {
  list(): NetworkRecord[];
  get(chainId: number): NetworkRecord | undefined;
  activeChainId(): number;
  setActiveChainId(chainId: number): Promise<void>;
}

export interface MeritWalletApi {
  session: WalletSessionApi;
  accounts: WalletAccountsApi;
  signing: WalletSigningApi;
  networks: WalletNetworksApi;
  /** Reads (token records, network info, ...): the WalletDataProvider interface, which grows as panels move in. */
  data: WalletDataSource;
}

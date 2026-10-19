// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/index.ts
//
// Public surface of @sponsorcoin/merit-wallet: the one Merit Wallet component. Created 2026-10-08 by moving MeritWallet.tsx out of
// @sponsorcoin/spcoin-panels (docs/meritWalletNpmDesignToDo.txt, S1). It composes panels from spcoin-panels, which is a peer dependency
// (resolved through the host app's own node_modules so there is exactly one instance of it and of the exchange engine's panelStore).
export { default as MeritWallet } from './MeritWallet';
export type { MeritWalletProps, MeritWalletNetworkRow } from './MeritWallet';
export { createWalletRefresh, useWalletRefresh } from './walletRefresh';
export type { WalletRefreshCallbacks, WalletRefreshState, WalletRefreshController } from './walletRefresh';
export { default as ConnectedAgentSelectDropDown } from './AgentSelectDropDown';
export type { ConnectedAgentSelectDropDownProps } from './AgentSelectDropDown';
export {
  DEFAULT_WALLET_CONFIG,
  sanitizeWalletConfig,
  passwordDescriptionFor,
  syncDescriptionFor,
  extensionDownloadPathFor,
  createWalletConfig,
  useWalletConfig,
} from './walletConfig';
export type { MeritWalletConfigState, WalletConfigAdapter, WalletConfigController } from './walletConfig';
export { RADIO_PANEL_GROUPS_WITH_FALLBACKS, EMPTY_RADIO_PANEL_GROUPS } from './radioPanelGroups';
export { WalletDataProvider, useWalletData } from './walletData';
export type { WalletDataSource } from './walletData';
export { TokenBuyPanel, TokenSellPanel, TokenBuySwapPanel, TokenSellSwapPanel, TokenSendPanel } from './TokenSlotPanels';
export { default as ConnectedMessagePanel } from './ConnectedMessagePanel';
export { buildSendReceipt, buildStakeReceipt, toMessageAccount } from './receipt/transactionReceipts';
export type { HostTransactionResult, ReceiptProfile } from './receipt/transactionReceipts';
export type { ConnectedMessagePanelProps } from './ConnectedMessagePanel';
export { default as ConnectedNetworkPanel, networkElementFromRegistry, useLiveNetworkFromContext } from './ConnectedNetworkPanel';
export type { ConnectedNetworkPanelProps, LiveNetwork } from './ConnectedNetworkPanel';
export type {
  HostLayout, HostUiState, HostData, HostSelection, HostActions, HostSlots, HostLock, HostConfig, MeritWalletHost,
  WalletAccountSummary, WalletTransactionRequest, WalletApprovalRequest, WalletSessionApi, WalletAccountsApi, WalletSigningApi,
  WalletNetworksApi, MeritWalletApi,
} from './hostContract';
export { MERIT_WALLET_PROPS_ARE_ALL_CLASSIFIED } from './hostContract';
export {
  VAULT_VERSION,
  VAULT_ALGORITHM,
  DEFAULT_PBKDF2_ITERATIONS,
  WrongPasswordError,
  createEncryptedVault,
  unlockEncryptedVault,
  deriveVaultKey,
  encryptWithKey,
  decryptWithKey,
  type EncryptedVault,
} from './vault/vaultCrypto';
export { VaultSession, VaultLockedError, type VaultStorage, type VaultSessionOptions, type VaultSessionStore, type PersistedVaultSession } from './vault/vaultSession';
export { useWalletConfigPanelProps, splitPersistedTimeout, joinPersistedTimeout, HOUR_OPTIONS, MINUTE_OPTIONS, type WalletConfigEngine } from './walletConfigPanelProps';
export { createLocalVaultParts, type LocalVaultParts } from './vault/vaultCapability';
export { createIndexedDbVaultStorage, createWebSessionStore, type IndexedDbVaultStorageOptions } from './vault/browserStorage';
export { createVaultAuthenticator, type VaultAuthenticatorOptions } from './vault/vaultAuthenticator';
// 2026-10-11 (section 15.7, item W1c): the vault capability over a message transport (the extension's background worker, later a phone's native key manager).
export { createWorkerVault, workerError, type WorkerVault, type WorkerVaultTransport, type WorkerReply } from './vault/workerVault';
// 2026-10-11 (section 14.10.1, items V12 / W1e): the phone backend: PhoneKeyManager is what native code implements; the adapters make it a VaultCapability and an Authenticator.
export { createPhoneVault, createPhoneAuthenticator, PhoneAuthError, type PhoneKeyManager, type PhoneAccount, type PhoneAuthErrorCode, type PhoneAuthenticatorOptions } from './vault/phoneVault';
export { createLocalVault, VaultError, MIN_PASSWORD_LENGTH, MIN_PIN_LENGTH, BACKUP_FORMAT, type VaultCapability, type VaultCapabilities, type VaultCredential, type VaultCredentialKind, type VaultAccount, type VaultErrorCode, type LocalVaultOptions } from './vault/vaultCapability';
export { parseDecimalToWei, encodeErc20Transfer, prepareTransfer, executeSend, isNativePlaceholder } from './send/sendTransfer';
export type { PreparedTransaction, PrepareResult, TransferParams, SendRequest, SendOutcome, SendTransport, ExecuteSendParams, SendResult } from './send/sendTransfer';
export { MIN_WALLET_PASSWORD_LENGTH, passwordModeFor, phaseFromStatus, submitWalletPassword, createWalletSession } from './session/walletSession';
export { validateLogin, isLoginGateClosed, deriveLoginState } from './session/validateLogin';
export type { LoginState, LoginRequestKind, LoginRequirement, ValidateLoginInput } from './session/validateLogin';
export type { WalletSessionPhase, WalletPasswordMode, WalletSessionStatus, WalletSessionAdapter, WalletSessionState, PasswordSubmitResult, WalletSessionController } from './session/walletSession';
export { useWalletSession } from './session/walletSessionReact';
export type { UseWalletSessionResult } from './session/walletSessionReact';
export { readContractDirect, toRunScriptShape, createDirectReadStep } from './chain/directReads';
export type { DirectReadParams, DirectReadStepParams } from './chain/directReads';
export { MERIT_RDNS, discoverWallets, findMeritWallet, createInjectedWalletApi } from './provider/injectedWallet';
export type { Eip1193Provider, Eip6963Detail, DiscoveryWindow, InjectedWalletApi } from './provider/injectedWallet';
export { createQuoteClient, QuoteServiceError } from './swap/quoteClient';
export type { QuoteRequest, QuoteClient } from './swap/quoteClient';
export { default as TokenPanel } from './TokenPanel';
export { tokenDetailRows, CopyBtn } from './TokenSlotPanels';
export { default as VaultAccountsPanel } from './VaultAccountsPanel';
export type { VaultAccountsApi, VaultAccountRow, VaultAccountsPanelProps } from './VaultAccountsPanel';
export { default as RecoveryPhraseScreen } from './RecoveryPhraseScreen';
export type { RecoveryPhraseScreenProps } from './RecoveryPhraseScreen';
export { default as WalletOnboardingPanel } from './WalletOnboardingPanel';
export type { WalletOnboardingPanelProps } from './WalletOnboardingPanel';
export { default as MeritWalletHostView, meritWalletPropsFromHost } from './MeritWalletHostView';
export type { MeritWalletHostSections } from './MeritWalletHostView';
export { default as ChangePasswordPanel } from './ChangePasswordPanel';
export { default as DeleteWalletDialog } from './DeleteWalletDialog';
export { AuthenticationType, authenticationTypeLabel } from './auth/authenticationType';
export { default as TestAccountsSection } from './TestAccountsSection';
export type { TestAccountsApi, TestAccountsSectionProps } from './TestAccountsSection';
export { default as PasswordPromptDialog } from './PasswordPromptDialog';

export { default as ConnectedRewardsPanel } from './rewards/ConnectedRewardsPanel';
export type { RewardsHost, RewardsPanelExtras } from './rewards/ConnectedRewardsPanel';
export { estimatePendingRewards, estimateRewardsByMethod, accrue, splitRewardPool, splitAgentPool, type PendingRewards, type EstimateRewardsParams } from './rewards/estimateRewards';
export { default as WalletSecuritySection } from './WalletSecuritySection';
export type { WalletSecurityApi } from './WalletSecuritySection';
export { default as ConnectedSponsorStakingList } from './sponsor/ConnectedSponsorStakingList';
export type { SponsorStakingHost } from './sponsor/ConnectedSponsorStakingList';
export * from './sponsor/sponsorReads';
export { unstakeSpCoin } from './sponsor/unstakeWalk';
export type { UnstakeSend, UnstakeMethod, UnstakeSpCoinResult } from './sponsor/unstakeWalk';
export type { AccountProfileHost, AccountProfileInitial } from './account/accountDetailHostFromProfile';
export { saveAccountProfile } from './account/accountProfileClient';
export * from './account/profileForm';

export * from './auth/authenticator';
export * from './auth/resolve';
// 2026-10-11 (docs/design/accountAuthDesign.txt section 15.7, item W1a): the wallet object (registry, saved choice per account, resolver, accounts, capabilities) a host hands the component.
export * from './wallet/wallet';
export { MeritPlatformContext, usePlatform, type MeritPlatform, type PlatformStorage } from './platform/platform';
export { domPlatform } from './platform/domPlatform';
export { createWalletLockStore, unlockErrorText, type WalletLockState, type WalletLockStore, type WalletLockPhase } from './wallet/walletLock';
export { createWalletSecurityApi } from './wallet/walletSecurity';
export { deriveWalletProps, mergeWalletProps, useWalletDerivedProps, authenticationTypeOf, ALL_WALLET_DERIVATIONS, type WalletDerivation } from './wallet/walletProps';

// 2026-10-09 (row 18) -- the shared account editor: state/actions hook, its host interface, form types and the form's pure helpers (the profile-form names that collide keep their own export above).
export { useAccountForm } from './account/form/useAccountForm';
export type { AccountFormHost, UseAccountFormParams } from './account/form/useAccountForm';
export type * from './account/form/formTypes';
export {
  DEFAULT_ACCOUNT_LOGO_URL, EMPTY_FORM_DATA, FORM_FIELDS, FORM_ERROR_FOCUS_ORDER, FIELD_TITLES, FIELD_PLACEHOLDERS, LOGO_TARGET_WIDTH_PX, LOGO_TARGET_HEIGHT_PX, LOGO_MAX_INPUT_BYTES as ACCOUNT_LOGO_MAX_INPUT_BYTES, LOGO_MAX_OUTPUT_BYTES as ACCOUNT_LOGO_MAX_OUTPUT_BYTES,
  normalizeAddress, ensureAbsoluteAssetURL, withCacheBust, toPreviewHref, getAbsoluteFieldError, getFieldTooLargeMessage, shouldBlockAdditionalInput, shouldOpenLinkFromInputClick, trimForm,
  FIELD_MAX_LENGTHS as ACCOUNT_FIELD_MAX_LENGTHS, isValidEmail as isValidAccountEmail, isValidWebsite as isValidAccountWebsite,
} from './account/form/formHelpers';
export { useAccountFormDerivedState } from './account/form/useAccountFormDerivedState';
export { default as AccountFormPanel } from './account/form/AccountFormPanel';
export { default as AccountAvatarPanel } from './account/form/AccountAvatarPanel';
export { default as DisconnectedControl } from './account/form/DisconnectedControl';
export { default as AddAccountFlow } from './account/AddAccountFlow';
export { DEFAULT_CONNECT_UNAVAILABLE } from './account/AddAccountFlow';
export type { AddAccountHost, AddAccountEntry, ConnectApproverEntry, NewAccountProfile } from './account/AddAccountFlow';
export { default as SendComponent } from './send/SendComponent';
export { default as AgentSelectDropDownWithAvatar } from './AgentSelectDropDownWithAvatar';
export { connectAccount, disconnectAccount, ConnectChoiceRequired, type ConnectHost, type ConnectParams, type DisconnectParams } from './auth/connect';
export { createInjectedAuthenticator, translateProviderError, type InjectedProvider, type InjectedAuthenticatorOptions } from './auth/injectedAuthenticator';
export {
  requestMeritWriteApproval,
  subscribeMeritApproval,
  getPendingMeritApproval,
  resolveMeritApproval,
  requestReauthentication,
  clearSettledMeritApproval,
} from './approval/meritApproval';
export type { MeritApprovalRequest, MeritApprovalPhase } from './approval/meritApproval';
export { default as ApprovalResponder } from './approval/ApprovalResponder';
export type { ApprovalHost } from './approval/ApprovalResponder';
export { buildApproverGroups, mergeWalletAccountEntries, createApproverController, connectNoticeText, type ApproverHost, type ApproverGroupsInput, type ApproverController } from './wallet/approverAccounts';
export { useApproverAccounts, type ApproverAccounts } from './wallet/approverAccountsReact';
export { signInForToken, signInWithWallet, type SignInParams } from './account/signIn';
export { readSigningChoices, chooseSigner, signingWarning, type SigningChoices, type SigningHolder, type HolderState } from './wallet/accountSigning';
export { default as AccountSigningSection } from './wallet/AccountSigningSection';
export { approvalWaiting, createApprovalWaitingStore, approvalWaitingText, outcomeText, withApprovalNotice, type ApprovalWaiting, type ApprovalOutcome, type ApprovalWaitingStore, type ApprovalAction } from './auth/approvalWaiting';
export { default as WalletBackupSection, BACKUP_FILE_NAME } from './wallet/WalletBackupSection';
export { readAddTargets, addEntryReasons, type AddTarget, type AddTargets, type AddKeyEntry } from './wallet/addTarget';
export { createHardwareAuthenticator, HardwareError, type HardwareTransport, type HardwareErrorCode, type HardwareAuthenticatorOptions } from './auth/hardwareAuthenticator';
export { createTrezorTransport, translateTrezorError, type TrezorTransport, type TrezorTransportOptions, type TrezorConnectApi, type TrezorResponse } from './auth/trezorTransport';
export { createSerialQueue, createDeviceState, prepareTransaction, assembleSignedTransaction, messageSignature, ethereumBip44Path, type ChainRpc, type DeviceAccount } from './auth/hardwareShared';
export { createLedgerTransport, translateLedgerError, ledgerLivePath, type LedgerTransport, type LedgerTransportOptions, type LedgerEthApp, type LedgerHidDevice, type LedgerHidTransportClass } from './auth/ledgerTransport';
export { watchSecret, useSecretClearing, SECRET_SHOWN_MAX_MS, NEW_PHRASE_SHOWN_MAX_MS, type SecretWatchEnv } from './security/secretClearing';
export { createTransferRequest, sealForTransfer, requestAccountFromProvider, type TransferSeal, type TransferProvider } from './vault/accountTransfer';

// docs/meritMigration.txt row 14: the account detail screen (avatar, profile table with role chips, Private Key row, sponsored / staked amounts) written once; a host passes an AccountDetailHost (data and functions only).
export { default as AccountDetailScreen, flagsForRole } from './account/AccountDetailScreen';
export type { AccountDetailHost, AccountDetailRole } from './account/AccountDetailScreen';
export { PasswordRequiredError, isPasswordRequired } from './account/AccountPrivateKeyRow';
export { accountDetailHostFromProfile } from './account/accountDetailHostFromProfile';
export type { WalletSessionHost } from './walletSessionHost';
export { default as ConnectedWalletConfig } from './config/ConnectedWalletConfig';
export type { ConnectedWalletConfigProps } from './config/ConnectedWalletConfig';
export { default as ConnectedSponsorPanel } from './sponsor/ConnectedSponsorPanel';
export type { SponsorPanelHost, StakeConfirmHostState } from './sponsor/ConnectedSponsorPanel';

// 2026-10-18 (docs/appPackages.txt, item 2) -- shared injectable component interfaces app packages implement and meritWallet consumes via host.
// 2026-10-18 (docs/appPackages.txt, item 2) -- shared injectable component interfaces app packages implement and meritWallet consumes via host.
export type {
  InjectableCredentialKind, InjectableCredential,
  InjectableCapabilities, InjectableAccount,
  IInjectableComponent, IKeyStore, IVault, IPlatformStore,
} from './injectableComponentTypes';
export { ConnectedTradeButton } from './trade/tradeHost';
export type { TradeHost } from './trade/tradeHost';

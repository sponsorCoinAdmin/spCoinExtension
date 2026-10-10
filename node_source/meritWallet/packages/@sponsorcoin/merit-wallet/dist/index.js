// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/index.ts
//
// Public surface of @sponsorcoin/merit-wallet: the one Merit Wallet component. Created 2026-10-08 by moving MeritWallet.tsx out of
// @sponsorcoin/spcoin-panels (docs/meritWalletNpmDesignToDo.txt, S1). It composes panels from spcoin-panels, which is a peer dependency
// (resolved through the host app's own node_modules so there is exactly one instance of it and of the exchange engine's panelStore).
export { default as MeritWallet } from './MeritWallet';
export { createWalletRefresh, useWalletRefresh } from './walletRefresh';
export { default as ConnectedAgentSelectDropDown } from './AgentSelectDropDown';
export { DEFAULT_WALLET_CONFIG, sanitizeWalletConfig, passwordDescriptionFor, syncDescriptionFor, extensionDownloadPathFor, createWalletConfig, useWalletConfig, } from './walletConfig';
export { default as WalletOverlayHost } from './WalletOverlayHost';
export { RADIO_PANEL_GROUPS_WITH_FALLBACKS, EMPTY_RADIO_PANEL_GROUPS } from './radioPanelGroups';
export { WalletDataProvider, useWalletData } from './walletData';
export { TokenBuyPanel, TokenSellPanel, TokenBuySwapPanel, TokenSellSwapPanel, TokenSendPanel } from './TokenSlotPanels';
export { default as ConnectedMessagePanel } from './ConnectedMessagePanel';
export { buildSendReceipt, buildStakeReceipt, toMessageAccount } from './receipt/transactionReceipts';
export { default as ConnectedNetworkPanel, networkElementFromRegistry, useLiveNetworkFromContext } from './ConnectedNetworkPanel';
export { MERIT_WALLET_PROPS_ARE_ALL_CLASSIFIED } from './hostContract';
export { VAULT_VERSION, VAULT_ALGORITHM, DEFAULT_PBKDF2_ITERATIONS, WrongPasswordError, createEncryptedVault, unlockEncryptedVault, deriveVaultKey, encryptWithKey, decryptWithKey, } from './vault/vaultCrypto';
export { VaultSession, VaultLockedError } from './vault/vaultSession';
export { parseDecimalToWei, encodeErc20Transfer, prepareTransfer, executeSend } from './send/sendTransfer';
export { MIN_WALLET_PASSWORD_LENGTH, passwordModeFor, phaseFromStatus, submitWalletPassword, createWalletSession } from './session/walletSession';
export { useWalletSession } from './session/walletSessionReact';
export { readContractDirect, toRunScriptShape, createDirectReadStep } from './chain/directReads';
export { MERIT_RDNS, discoverWallets, findMeritWallet, createInjectedWalletApi } from './provider/injectedWallet';
export { createQuoteClient, QuoteServiceError } from './swap/quoteClient';
export { default as TokenPanel } from './TokenPanel';
export { tokenDetailRows, CopyBtn } from './TokenSlotPanels';
export { default as ConnectedPasswordPanel } from './ConnectedPasswordPanel';
export { default as VaultAccountsPanel } from './VaultAccountsPanel';
export { default as WalletOnboardingPanel } from './WalletOnboardingPanel';
export { quoteSwap, minimumAmountOut, NoSwapPriceError } from './swap/swapPrice';
export { default as SwapTradeButton } from './swap/SwapTradeButton';
export { default as ConnectedUniSelectPanel } from './swap/ConnectedUniSelectPanel';
export { useSwapQuote } from './swap/useSwapQuote';
export { default as MeritWalletHostView, meritWalletPropsFromHost } from './MeritWalletHostView';
export { default as ChangePasswordPanel } from './ChangePasswordPanel';
export { default as DeleteWalletDialog } from './DeleteWalletDialog';
export { AuthenticationType, authenticationTypeLabel } from './auth/authenticationType';
export { default as TestAccountsSection } from './TestAccountsSection';
export { default as PasswordPromptDialog } from './PasswordPromptDialog';
export { default as ConnectedRewardsPanel } from './rewards/ConnectedRewardsPanel';
export { estimatePendingRewards, estimateRewardsByMethod, accrue, splitRewardPool, splitAgentPool } from './rewards/estimateRewards';
export { default as WalletSecuritySection } from './WalletSecuritySection';
export { default as ConnectedSponsorStakingList } from './sponsor/ConnectedSponsorStakingList';
export * from './sponsor/sponsorReads';
export { unstakeSpCoin } from './sponsor/unstakeWalk';
export { default as AccountProfileEditor } from './account/AccountProfileEditor';
export { saveAccountProfile } from './account/accountProfileClient';
export * from './account/profileForm';
export * from './auth/authenticator';
export * from './auth/resolve';
// 2026-10-09 (row 18) -- the shared account editor: state/actions hook, its host interface, form types and the form's pure helpers (the profile-form names that collide keep their own export above).
export { useAccountForm } from './account/form/useAccountForm';
export { DEFAULT_ACCOUNT_LOGO_URL, EMPTY_FORM_DATA, FORM_FIELDS, FORM_ERROR_FOCUS_ORDER, FIELD_TITLES, FIELD_PLACEHOLDERS, LOGO_TARGET_WIDTH_PX, LOGO_TARGET_HEIGHT_PX, LOGO_MAX_INPUT_BYTES as ACCOUNT_LOGO_MAX_INPUT_BYTES, LOGO_MAX_OUTPUT_BYTES as ACCOUNT_LOGO_MAX_OUTPUT_BYTES, normalizeAddress, ensureAbsoluteAssetURL, withCacheBust, toPreviewHref, getAbsoluteFieldError, getFieldTooLargeMessage, shouldBlockAdditionalInput, shouldOpenLinkFromInputClick, trimForm, FIELD_MAX_LENGTHS as ACCOUNT_FIELD_MAX_LENGTHS, isValidEmail as isValidAccountEmail, isValidWebsite as isValidAccountWebsite, } from './account/form/formHelpers';
export { useAccountFormDerivedState } from './account/form/useAccountFormDerivedState';
export { default as AccountFormPanel } from './account/form/AccountFormPanel';
export { default as AccountAvatarPanel } from './account/form/AccountAvatarPanel';
export { default as DisconnectedControl } from './account/form/DisconnectedControl';

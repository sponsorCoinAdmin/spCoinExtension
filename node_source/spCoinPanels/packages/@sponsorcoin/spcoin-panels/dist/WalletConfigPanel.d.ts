import React from 'react';
export type MeritWalletPasswordMode = 'appRequired' | 'firstApproved' | 'methodRequired' | 'disabled' | 'persisted';
export type ApplicationSyncMode = 'disable' | 'enable' | 'authorize';
export type MeritWalletLocation = 'CENTER' | 'FIXED' | 'FLOATING' | 'SPLIT_PANE' | 'STICK_TO_TOP';
export type MeritExtensionChannel = 'test' | 'prod';
export type OpenTarget = 'local' | 'prod';
export interface WalletConfigPanelProps {
    /** Current mode. Default 'appRequired' (the inert/placeholder default). */
    passwordMode?: MeritWalletPasswordMode;
    /** Fires with the new mode; omit for inert decorative radios. */
    onPasswordModeChange?: (mode: MeritWalletPasswordMode) => void;
    /** Persisted mode's time-limit picker (the real app's ScrollableDropdown pair). */
    persistedTimeoutContent?: React.ReactNode;
    /** Mode-dependent description paragraph; defaults to a representative string. */
    passwordDescription?: string;
    /** Mandatory Password Required checkbox. Default true (inert placeholder default). */
    mandatorySecurity?: boolean;
    onMandatorySecurityChange?: (mandatory: boolean) => void;
    /** All Transaction Approval Required checkbox. Default true (inert placeholder default). */
    mandatoryApproval?: boolean;
    onMandatoryApprovalChange?: (mandatory: boolean) => void;
    /** <WalletPasswordResetPanel /> (web app). Omit to render Logoff/Reset buttons instead. */
    passwordResetPanelContent?: React.ReactNode;
    /** Extension-style action buttons (consumer only). */
    onLogoff?: () => void;
    onResetPassword?: () => void;
    syncMode?: ApplicationSyncMode;
    onSyncModeChange?: (mode: ApplicationSyncMode) => void;
    syncDescription?: string;
    location?: MeritWalletLocation;
    onLocationChange?: (loc: MeritWalletLocation) => void;
    showBackgroundPage?: boolean;
    onShowBackgroundPageChange?: (show: boolean) => void;
    modalMode?: boolean;
    onModalModeChange?: (modal: boolean) => void;
    securityPanelContent?: React.ReactNode;
    /** Visibility of UNI_SELECT_PANEL (resolved by caller via its own panel-tree access). */
    uniSelectVisible?: boolean;
    onUniswapEngineChange?: (checked: boolean) => void;
    /** Visibility of CONNECT_TRADE_BUTTON (the 0X engine toggle). */
    connectTradeButtonVisible?: boolean;
    on0xEngineChange?: (checked: boolean) => void;
    resetPanelsContent?: React.ReactNode;
    extensionChannel?: MeritExtensionChannel;
    onExtensionChannelChange?: (channel: MeritExtensionChannel) => void;
    extensionDownloadPath?: string;
    openTarget?: OpenTarget;
    onOpenTargetChange?: (target: OpenTarget) => void;
}
export default function WalletConfigPanel({ passwordMode, onPasswordModeChange, persistedTimeoutContent, passwordDescription, mandatorySecurity, onMandatorySecurityChange, mandatoryApproval, onMandatoryApprovalChange, passwordResetPanelContent, onLogoff, onResetPassword, syncMode, onSyncModeChange, syncDescription, location, onLocationChange, showBackgroundPage, onShowBackgroundPageChange, modalMode, onModalModeChange, securityPanelContent, uniSelectVisible, onUniswapEngineChange, connectTradeButtonVisible, on0xEngineChange, resetPanelsContent, extensionChannel, onExtensionChannelChange, extensionDownloadPath, openTarget, onOpenTargetChange, }: WalletConfigPanelProps): React.JSX.Element;

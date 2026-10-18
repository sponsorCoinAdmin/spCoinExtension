import React from 'react';
import type { ApplicationSyncMode, MeritExtensionChannel, MeritWalletLocation, MeritWalletPasswordMode } from '@sponsorcoin/spcoin-panels';
import { type WalletConfigAdapter } from './walletConfig';
export declare const HOUR_OPTIONS: number[];
export declare const MINUTE_OPTIONS: number[];
/** A persisted-password time limit in hours as the two numbers the pickers show (hours 0-24, minutes 0-59 of the remainder). */
export declare function splitPersistedTimeout(hours: number): {
    hours: number;
    minutes: number;
};
/** The two picker values back to hours: a missing number counts as 0, and the result stays between one minute and 24 hours. */
export declare function joinPersistedTimeout(hours: number, minutes: number): number;
/** The Time Limit picker (hours and minutes) under the Persisted password option. Drawn by the component from the host's hours value (the data) and change callback (the action). */
export declare function PersistedTimeoutPicker({ hours, onChange }: {
    hours: number;
    onChange: (hours: number) => void;
}): React.JSX.Element;
export interface WalletConfigEngine {
    uniSelectVisible: boolean;
    zeroXEngineVisible: boolean;
    applyUniswapEngine(checked: boolean): void;
    apply0xEngine(checked: boolean): void;
}
export declare function useWalletConfigPanelProps({ adapter, engine }: {
    adapter: WalletConfigAdapter;
    engine: WalletConfigEngine;
}): {
    passwordMode: MeritWalletPasswordMode;
    onPasswordModeChange: (mode: MeritWalletPasswordMode) => void;
    persistedTimeoutHours: number;
    onPersistedTimeoutHoursChange: (value: number) => void;
    passwordDescription: string;
    mandatorySecurity: boolean;
    onMandatorySecurityChange: (mandatory: boolean) => void;
    mandatoryApproval: boolean;
    onMandatoryApprovalChange: (mandatory: boolean) => void;
    syncMode: ApplicationSyncMode;
    onSyncModeChange: (mode: ApplicationSyncMode) => void;
    syncDescription: string;
    location: MeritWalletLocation;
    onLocationChange: (loc: MeritWalletLocation) => void;
    showBackgroundPage: boolean;
    onShowBackgroundPageChange: (show: boolean) => void;
    modalMode: boolean;
    onModalModeChange: (modal: boolean) => void;
    uniSelectVisible: boolean;
    onUniswapEngineChange: (checked: boolean) => void;
    zeroXEngineVisible: boolean;
    on0xEngineChange: (checked: boolean) => void;
    extensionChannel: MeritExtensionChannel;
    onExtensionChannelChange: (channel: MeritExtensionChannel) => void;
    extensionDownloadPath: string;
};

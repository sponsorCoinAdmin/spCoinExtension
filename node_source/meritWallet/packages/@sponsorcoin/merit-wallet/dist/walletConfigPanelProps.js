import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { timeLimitStyle } from '@sponsorcoin/spcoin-common/styles';
import { ScrollableDropdown } from '@sponsorcoin/spcoin-panels';
import { extensionDownloadPathFor, passwordDescriptionFor, syncDescriptionFor, useWalletConfig } from './walletConfig';
export const HOUR_OPTIONS = Array.from({ length: 25 }, (_, h) => h); // 0-24
export const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, m) => m); // 0-59
/** A persisted-password time limit in hours as the two numbers the pickers show (hours 0-24, minutes 0-59 of the remainder). */
export function splitPersistedTimeout(hours) {
    const whole = Math.min(24, Math.floor(hours));
    return { hours: whole, minutes: Math.round((hours - whole) * 60) };
}
/** The two picker values back to hours: a missing number counts as 0, and the result stays between one minute and 24 hours. */
export function joinPersistedTimeout(hours, minutes) {
    const raw = (Number.isFinite(hours) ? hours : 0) + (Number.isFinite(minutes) ? minutes : 0) / 60;
    return Math.min(24, Math.max(1 / 60, raw));
}
/** The Time Limit picker (hours and minutes) under the Persisted password option. Drawn by the component from the host's hours value (the data) and change callback (the action). */
export function PersistedTimeoutPicker({ hours, onChange }) {
    const timeout = splitPersistedTimeout(hours);
    return (_jsxs("div", { style: timeLimitStyle.row, children: [_jsx("span", { style: timeLimitStyle.label, title: "2026-10-13: ONE idle time limit for every password mode. How long the wallet stays logged in without being used before it locks itself (in Persisted mode it is also how long the stored password stays valid). Resets to this full duration every time the wallet is actually used.", children: "Time Limit" }), _jsxs("div", { style: timeLimitStyle.pickers, children: [_jsx(ScrollableDropdown, { ariaLabel: "Time limit hours", value: timeout.hours, options: HOUR_OPTIONS, suffix: "h", onChange: (h) => onChange(joinPersistedTimeout(h, timeout.minutes)) }), _jsx(ScrollableDropdown, { ariaLabel: "Time limit minutes", value: timeout.minutes, options: MINUTE_OPTIONS, suffix: "m", onChange: (m) => onChange(joinPersistedTimeout(timeout.hours, m)) })] })] }));
}
export function useWalletConfigPanelProps({ adapter, engine }) {
    const { state: config, set: setConfig } = useWalletConfig(adapter);
    const { showBackgroundPage, modalMode, location, passwordMode, persistedPasswordTimeoutHours, mandatorySecurity, mandatoryApproval, syncMode, extensionChannel } = config;
    return {
        passwordMode,
        onPasswordModeChange: (mode) => setConfig({ passwordMode: mode }),
        persistedTimeoutHours: persistedPasswordTimeoutHours,
        onPersistedTimeoutHoursChange: (value) => setConfig({ persistedPasswordTimeoutHours: value }),
        passwordDescription: passwordDescriptionFor(passwordMode),
        mandatorySecurity,
        onMandatorySecurityChange: (mandatory) => setConfig({ mandatorySecurity: mandatory }),
        mandatoryApproval,
        onMandatoryApprovalChange: (mandatory) => setConfig({ mandatoryApproval: mandatory }),
        syncMode,
        onSyncModeChange: (mode) => setConfig({ syncMode: mode }),
        syncDescription: syncDescriptionFor(syncMode),
        location,
        onLocationChange: (loc) => setConfig({ location: loc }),
        showBackgroundPage,
        onShowBackgroundPageChange: (show) => setConfig({ showBackgroundPage: show }),
        modalMode,
        onModalModeChange: (modal) => setConfig({ modalMode: modal }),
        uniSelectVisible: engine.uniSelectVisible,
        onUniswapEngineChange: engine.applyUniswapEngine,
        zeroXEngineVisible: engine.zeroXEngineVisible,
        on0xEngineChange: engine.apply0xEngine,
        extensionChannel,
        onExtensionChannelChange: (channel) => setConfig({ extensionChannel: channel }),
        extensionDownloadPath: extensionDownloadPathFor(extensionChannel),
    };
}

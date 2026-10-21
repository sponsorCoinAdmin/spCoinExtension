// File: src/walletConfigPanelProps.tsx
//
// 2026-10-11 (docs/nodeSourceMigrationPlan.txt row 11, owner: "I do not want any dependency on the web app"): everything the Config tab's panel needs, built ONCE in the package from a host ADAPTER. This was the web app's lib/spCoinWallet/useMeritWalletConfig.tsx: the handlers
// that turn a click into a config change, the persisted-password time limit (the hours / minutes pickers and their clamp) and the descriptions under the options. A host now passes only what is really its own:
//   adapter  where the config is stored and what a change does besides (the web app's localStorage record, clearing or persisting its cached wallet password, a window event; the extension's chrome.storage with no side effects),
//   engine   the two engine toggles (Uniswap and 0x) as the panel-visibility state plus the functions that change it.
// The result is spread onto the shared WalletConfigPanel (spcoin-panels). Nothing here imports web code.
import React from 'react';
import { timeLimitStyle } from '@sponsorcoin/spcoin-common/styles';
import { ScrollableDropdown } from '@sponsorcoin/spcoin-panels';
import type { ApplicationSyncMode, MeritExtensionChannel, MeritWalletLocation, MeritWalletPasswordMode } from '@sponsorcoin/spcoin-panels';
import { clampPersistedPasswordTimeoutHours, extensionDownloadPathFor, passwordDescriptionFor, syncDescriptionFor, useWalletConfig, type WalletConfigAdapter } from './walletConfig';

export const HOUR_OPTIONS = Array.from({ length: 25 }, (_, h) => h); // 0-24
export const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, m) => m); // 0-59

/** A persisted-password time limit in hours as the two numbers the pickers show (hours 0-24, minutes 0-59 of the remainder). */
export function splitPersistedTimeout(hours: number): { hours: number; minutes: number } {
  const whole = Math.min(24, Math.floor(hours));
  return { hours: whole, minutes: Math.round((hours - whole) * 60) };
}

/** The two picker values back to hours: a missing number counts as 0, and the result stays between one minute and 24 hours. */
export function joinPersistedTimeout(hours: number, minutes: number): number {
  const raw = (Number.isFinite(hours) ? hours : 0) + (Number.isFinite(minutes) ? minutes : 0) / 60;
  return clampPersistedPasswordTimeoutHours(raw);
}

/** The Time Limit picker (hours and minutes) under the Persisted password option. Drawn by the component from the host's hours value (the data) and change callback (the action). */
export function PersistedTimeoutPicker({ hours, onChange }: { hours: number; onChange: (hours: number) => void }) {
  const timeout = splitPersistedTimeout(hours);
  return (
    <div style={timeLimitStyle.row}>
      <span style={timeLimitStyle.label} title="2026-10-13: ONE idle time limit for every password mode. How long the wallet stays logged in without being used before it locks itself (in Persisted mode it is also how long the stored password stays valid). Resets to this full duration every time the wallet is actually used.">
        Time Limit
      </span>
      <div style={timeLimitStyle.pickers}>
        <ScrollableDropdown
          ariaLabel="Time limit hours"
          value={timeout.hours}
          options={HOUR_OPTIONS}
          suffix="h"
          onChange={(h) => onChange(joinPersistedTimeout(h, timeout.minutes))}
        />
        <ScrollableDropdown
          ariaLabel="Time limit minutes"
          value={timeout.minutes}
          options={MINUTE_OPTIONS}
          suffix="m"
          onChange={(m) => onChange(joinPersistedTimeout(timeout.hours, m))}
        />
      </div>
    </div>
  );
}

export interface WalletConfigEngine {
  uniSelectVisible: boolean;
  zeroXEngineVisible: boolean;
  applyUniswapEngine(checked: boolean): void;
  apply0xEngine(checked: boolean): void;
}

export function useWalletConfigPanelProps({ adapter, engine }: { adapter: WalletConfigAdapter; engine: WalletConfigEngine }) {
  const { state: config, set: setConfig } = useWalletConfig(adapter);
  const { showBackgroundPage, modalMode, location, passwordMode, persistedPasswordTimeoutHours, mandatorySecurity, mandatoryApproval, syncMode, extensionChannel } = config;
  return {
    passwordMode,
    onPasswordModeChange: (mode: MeritWalletPasswordMode) => setConfig({ passwordMode: mode }),
    persistedTimeoutHours: persistedPasswordTimeoutHours,
    onPersistedTimeoutHoursChange: (value: number) => setConfig({ persistedPasswordTimeoutHours: value }),
    passwordDescription: passwordDescriptionFor(passwordMode),
    mandatorySecurity,
    onMandatorySecurityChange: (mandatory: boolean) => setConfig({ mandatorySecurity: mandatory }),
    mandatoryApproval,
    onMandatoryApprovalChange: (mandatory: boolean) => setConfig({ mandatoryApproval: mandatory }),
    syncMode,
    onSyncModeChange: (mode: ApplicationSyncMode) => setConfig({ syncMode: mode }),
    syncDescription: syncDescriptionFor(syncMode),
    location,
    onLocationChange: (loc: MeritWalletLocation) => setConfig({ location: loc }),
    showBackgroundPage,
    onShowBackgroundPageChange: (show: boolean) => setConfig({ showBackgroundPage: show }),
    modalMode,
    onModalModeChange: (modal: boolean) => setConfig({ modalMode: modal }),
    uniSelectVisible: engine.uniSelectVisible,
    onUniswapEngineChange: engine.applyUniswapEngine,
    zeroXEngineVisible: engine.zeroXEngineVisible,
    on0xEngineChange: engine.apply0xEngine,
    extensionChannel,
    onExtensionChannelChange: (channel: MeritExtensionChannel) => setConfig({ extensionChannel: channel }),
    extensionDownloadPath: extensionDownloadPathFor(extensionChannel),
  };
}

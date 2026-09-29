// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/WalletConfigPanel.tsx
// Portable shell for WALLET_CONFIG_PANEL (2026-09-12, revised 2026-09-14 on
// request — "look at the buffer spacing between the components" / missing text).
// Originally inert (a section SHAPE with representative labels); the real app
// version (components/views/WalletConfig.tsx) reads/writes a dozen+ live
// settings against meritWalletStorage + usePanelTree/useSetTradingStation/
// sponsorRateConfigStore with security side-effects (clear/persist cached
// password). That logic stays in the web-app wrapper; this component is now
// the portable, hook-free renderer: every live value + every onChange callback
// is a resolved prop, every non-portable sub-fragment (the persisted-timeout
// ScrollableDropdown, WalletSecurityPanel, WalletPasswordResetPanel, and the
// Reset Default Panels block that drives panelStore) is an opaque slot.
//
// Inert contract: with every optional prop/handler omitted this still renders
// the real app's full section set (Password Protection, Application
// Synchronization, Placement, Show Background Page + Modal Mode, Exchange
// Engine, Extension) with the same visuals as the real tab, just inert — so a
// standalone consumer (the extension) gets an accurate layout even with no
// ExchangeContext/wallet state wired yet. The consumer-only "Options" section
// (openTarget — which origin the extension's Open button targets) is the lone
// exception to "inert everywhere": it was already live-wired in the placeholder
// because the extension has a real consumer for it today (openApp.ts).
//
// 2026-09-14 revision notes (preserved verbatim from the original placeholder
// pass, kept since they document the spacing/color parity work that is still in
// force): outer spacing was `gap:10, padding:12` — the real container is
// `space-y-2` (8px) with NO outer padding at all (just a bottom pb-3); that
// stray padding pushed every section inward relative to the real layout. Each
// section card was `borderRadius:10, padding:10` uniform — real cards are
// `rounded-[15px]` with `px-5 py-3` (20px sides, 12px top/bottom), background
// `#161922` (was `#151b2e`, close but not exact). Password Protection was also
// missing its descriptive paragraph and the "Mandatory Password Required"/
// "All Transaction Approval Required" checkbox rows entirely — added back,
// matching the real copy verbatim, both checked (the real default is
// mandatorySecurity:false/mandatoryApproval:true, but the more common screen
// state — and the inert default here — has both checked). Application
// Synchronization's own descriptive paragraph added too, for the same reason.
//
// 2026-09-14, on request ("why does the extension open button always open
// sponsorCoin.org and not localhost:3000") — one exception to this file's
// otherwise "entirely inert" rule: the "Options" section below IS real,
// live-wired, unlike every RadioRow/CheckboxRow elsewhere on this page (those
// stay decorative — no real state to back them yet). That one has a real
// consumer today (the Open button, via spCoinExtension/src/openApp.ts), so it's
// a genuine controlled `openTarget`/`onOpenTargetChange` prop pair instead of a
// fixed dot. Deliberately has no counterpart in the real app's WalletConfig.tsx
// — Local/Prod is meaningless there (the web app IS whichever origin it's
// already running on); it only exists for a standalone consumer that opens a
// separate tab, like this extension.
//
// 2026-09-24 — FULL PORT: every section is now live-wired behind optional
// callbacks + resolved-value props; inert defaults preserved so existing
// consumers see no behavior change. Type unions are inlined (this package can't
// import the @/-aliased meritWalletStorage types) and mirror them exactly,
// except `disabled` — that mode was removed from the real app's display array
// (2026-08-27) so it is intentionally absent here even though the upstream
// type still lists it. The Placement Location options now include "Split Pane"
// (was missing in the placeholder) and the Extension section (Test/Prod
// channel + download path) now renders instead of being absent.

'use client';

import React from 'react';
import { PACKAGE_BUILD } from './packageBuildTag';
import TabBodyMarker from './TabBodyMarker';

// Inlined mirrors of the web-app types in lib/spCoinWallet/meritWalletStorage.ts
// — can't import @/-aliased types from a portable package. The union members
// match upstream exactly (including 'disabled', which the real app keeps in
// the TYPE because stored config may still hold it); 'disabled' is simply
// omitted from this file's PASSWORD_OPTIONS array below, same as the real app
// removed it from the UI (2026-08-27) — so a stored 'disabled' value renders
// inert (no radio active, no description) but stays type-compatible.
export type MeritWalletPasswordMode = 'appRequired' | 'firstApproved' | 'methodRequired' | 'disabled' | 'persisted';
export type ApplicationSyncMode = 'disable' | 'enable' | 'authorize';
export type MeritWalletLocation = 'CENTER' | 'FIXED' | 'FLOATING' | 'SPLIT_PANE' | 'STICK_TO_TOP';
export type MeritExtensionChannel = 'test' | 'prod';

// Local/Prod — which app URL the extension's Open button targets. A plain
// string union, not imported from spCoinExtension (this package can't depend
// on its only consumer) — structurally identical to that repo's own
// openTargetStorage.ts#OpenTarget, the actual source of truth for what each
// value means.
export type OpenTarget = 'local' | 'prod';

const DOT_ACTIVE = '#16a34a'; // green-600, matches the app's real active-option color
const DOT_INACTIVE = '#dc2626'; // red-600, matches the app's real inactive-option color

// Classic visually-hidden style for the native radio/checkbox that drives a
// shell-styled row. Inline only — spCoinExtension has no Tailwind pipeline.
const visuallyHiddenStyle: React.CSSProperties = {
  position: 'absolute',
  boxSizing: 'border-box',
  height: '1px',
  width: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
  margin: -1,
  padding: 0,
};

// Inert OR live. A row is live (a real `<input type="radio">`) when `onSelect`
// is supplied — otherwise it stays the original decorative dot. `title` is the
// same tooltip the real app attaches to each option's label.
function RadioRow({
  label,
  active,
  title,
  name,
  value,
  onSelect,
}: {
  label: string;
  active: boolean;
  title?: string;
  name?: string;
  value?: string;
  onSelect?: () => void;
}) {
  const interactive = typeof onSelect === 'function';
  const dot = (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '9999px',
        background: active ? DOT_ACTIVE : DOT_INACTIVE,
      }}
    />
  );
  const textSpan = (
    <span style={{ fontSize: 11, fontWeight: active ? 700 : 400, color: active ? '#e2e8f0' : '#94a3b8' }}>
      {label}
    </span>
  );
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 12 }}>
      {interactive ? (
        // 2026-09-25, real fix — the dot used to sit OUTSIDE this <label>
        // as a plain decorative sibling span, so clicking directly on it
        // (the option's most obvious click target) did nothing; only the
        // text word itself was wired to the hidden radio input. Moved
        // inside so the whole dot+label row is one click target, same
        // pattern CheckboxRow below already uses.
        <label
          title={title ?? ''}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
        >
          <input
            type="radio"
            name={name}
            value={value}
            checked={active}
            onChange={onSelect}
            style={visuallyHiddenStyle}
          />
          {dot}
          {textSpan}
        </label>
      ) : (
        <span title={title ?? ''} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {dot}
          {textSpan}
        </span>
      )}
    </div>
  );
}

// Inert OR live checkbox. Live when `onSelect` is supplied. Mirrors the real
// app's `accent-[#5981F3]` checkbox. `readOnly` keeps the inert rows clickable-
// but-not-actually-toggleable exactly like the placeholder's `readOnly` input.
function CheckboxRow({
  label,
  checked,
  title,
  onSelect,
}: {
  label: string;
  checked: boolean;
  title?: string;
  onSelect?: (checked: boolean) => void;
}) {
  const interactive = typeof onSelect === 'function';
  return (
    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }} title={title ?? ''}>
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        readOnly={!interactive}
        onChange={interactive ? (event) => onSelect(event.target.checked) : undefined}
        title={title ?? ''}
        style={{ height: 15, width: 15, flexShrink: 0, accentColor: '#5981F3' }}
      />
    </div>
  );
}

// Real, interactive counterpart to the decorative RadioRow above — used only by
// the Options section (see this file's own header comment on why that section
// alone is live-wired). Kept verbatim from the placeholder.
function LiveRadioRow({
  label,
  checked,
  onSelect,
  name,
}: {
  label: string;
  checked: boolean;
  onSelect: () => void;
  name: string;
}) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 12, cursor: 'pointer' }}>
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        style={{ height: 12, width: 12, flexShrink: 0, accentColor: DOT_ACTIVE, cursor: 'pointer' }}
      />
      <span style={{ fontSize: 11, fontWeight: checked ? 700 : 400, color: checked ? '#e2e8f0' : '#94a3b8' }}>
        {label}
      </span>
    </label>
  );
}

function ConfigSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderRadius: 15, border: '1px solid #1e293b', background: '#161922', padding: '10px 16px' }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#ffffff', marginBottom: 8 }}>{title}</span>
      {children}
    </div>
  );
}

// Inert fallbacks match the placeholder's original look so existing consumers
// that pass nothing still render the same visuals.
const DEFAULT_PASSWORD_DESCRIPTION: Record<string, string> = {
  appRequired:
    'Merit Wallet locks behind a password every session — enter it once and every write for the rest of the session is approved without asking again. The current default.',
  methodRequired:
    'The strictest mode — Merit Wallet locks behind a password every session, same as App, and on top of that every write still asks for its account’s password at that moment, every time.',
};

export interface WalletConfigPanelProps {
  // --- Password Protection ---
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

  // --- Application Synchronization ---
  syncMode?: ApplicationSyncMode;
  onSyncModeChange?: (mode: ApplicationSyncMode) => void;
  syncDescription?: string;

  // --- Merit Wallet Placement Location ---
  location?: MeritWalletLocation;
  onLocationChange?: (loc: MeritWalletLocation) => void;

  // --- Show Background Page + Modal Mode ---
  showBackgroundPage?: boolean;
  onShowBackgroundPageChange?: (show: boolean) => void;
  modalMode?: boolean;
  onModalModeChange?: (modal: boolean) => void;

  // --- WalletSecurityPanel (web app; non-portable sub-component) ---
  securityPanelContent?: React.ReactNode;

  // --- Exchange Engine ---
  /** Visibility of UNI_SELECT_PANEL (resolved by caller via its own panel-tree access). */
  uniSelectVisible?: boolean;
  onUniswapEngineChange?: (checked: boolean) => void;
  /** Visibility of CONNECT_TRADE_BUTTON (the 0X engine toggle). */
  connectTradeButtonVisible?: boolean;
  on0xEngineChange?: (checked: boolean) => void;

  // --- Reset Default Panels (web app; non-portable, panel-tree coupled) ---
  resetPanelsContent?: React.ReactNode;

  // --- Extension (Test/Prod release channel + download path) ---
  extensionChannel?: MeritExtensionChannel;
  onExtensionChannelChange?: (channel: MeritExtensionChannel) => void;
  extensionDownloadPath?: string;

  // --- Consumer-only Options (extension Open button target) ---
  openTarget?: OpenTarget;
  onOpenTargetChange?: (target: OpenTarget) => void;
}

const PASSWORD_OPTIONS: Array<{ value: MeritWalletPasswordMode; label: string; title: string }> = [
  { value: 'appRequired', label: 'App', title: 'Password required once per session to open the app. Every write after that is approved automatically, no further prompts.' },
  { value: 'firstApproved', label: 'Initial', title: 'Browse and use the app without unlocking first. The first write that needs a signature asks for the password once — every write after that is approved automatically.' },
  { value: 'methodRequired', label: 'All', title: 'The strictest mode: password required to open the app, same as App — and on top of that, every write still asks for its account’s password at that moment, every time.' },
  { value: 'persisted', label: 'Persisted', title: 'Same as App, except the password itself is remembered (encrypted) across reloads for the time limit below — a temporary bypass, not a hardened secret store. See the time limit field for details.' },
];

const SYNC_OPTIONS: Array<{ value: ApplicationSyncMode; label: string; title: string }> = [
  { value: 'authorize', label: 'Authorize', title: 'Sync runs, and every sync mint requires the login password every time, the same way "All Transaction Approval Required" forces regular writes.' },
  { value: 'enable', label: 'Enable', title: 'Sync runs using whatever password is already cached — never prompts on its own. If nothing is cached yet, that sync cycle is silently skipped rather than asking. The current default.' },
  { value: 'disable', label: 'Disable', title: 'The whole cross-process sync layer is off — no background pushes, no cross-session/cross-tab updates. Real writes (swap/stake/sponsor/send) are unaffected. Use this to test whether sync itself is causing a problem, or to run the wallet fully standalone.' },
];

const LOCATION_OPTIONS: Array<{ value: MeritWalletLocation; label: string }> = [
  { value: 'CENTER', label: 'Center' },
  { value: 'FIXED', label: 'Fixed' },
  { value: 'FLOATING', label: 'Float' },
  { value: 'SPLIT_PANE', label: 'Split Pane' },
  { value: 'STICK_TO_TOP', label: 'Top' },
];

const EXTENSION_OPTIONS: Array<{ value: MeritExtensionChannel; label: string; title: string }> = [
  {
    value: 'test',
    label: 'Test',
    title: 'The auto-updating "latest" release — republishes on every push to spCoinExtension’s main. Same build the /Test page’s own "Testing Build" link points at.',
  },
  {
    value: 'prod',
    label: 'Prod',
    title: 'The pinned "production" release — only moves when a version tag is deliberately pushed. Same build the header’s "Add Extension" button always serves.',
  },
];

export default function WalletConfigPanel({
  passwordMode = 'appRequired',
  onPasswordModeChange,
  persistedTimeoutContent,
  passwordDescription,
  mandatorySecurity = true,
  onMandatorySecurityChange,
  mandatoryApproval = true,
  onMandatoryApprovalChange,
  passwordResetPanelContent,
  onLogoff,
  onResetPassword,
  syncMode = 'disable',
  onSyncModeChange,
  syncDescription,
  location = 'STICK_TO_TOP',
  onLocationChange,
  showBackgroundPage = false,
  onShowBackgroundPageChange,
  modalMode = false,
  onModalModeChange,
  securityPanelContent,
  uniSelectVisible = false,
  onUniswapEngineChange,
  connectTradeButtonVisible = false,
  on0xEngineChange,
  resetPanelsContent,
  extensionChannel = 'prod',
  onExtensionChannelChange,
  extensionDownloadPath = '/spCoinExtension/spCoinExtension.zip',
  openTarget = 'prod',
  onOpenTargetChange,
}: WalletConfigPanelProps) {
  const persistedMode = passwordMode === 'persisted';

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 12 }}>
      <TabBodyMarker path="WalletConfigPanel.tsx" build={PACKAGE_BUILD} />

      {/* Password Protection first (2026-09-02) — the tab's most security-
          relevant control, ahead of purely cosmetic/layout settings below it. */}
      <ConfigSection title="Password Protection">
        <div>
          {PASSWORD_OPTIONS.map((option) => (
            <RadioRow
              key={option.value}
              label={option.label}
              active={passwordMode === option.value}
              title={option.title}
              name="merit-wallet-password-mode"
              value={option.value}
              onSelect={onPasswordModeChange ? () => onPasswordModeChange(option.value) : undefined}
            />
          ))}
        </div>

        {persistedMode && persistedTimeoutContent ? (
          <div style={{ marginTop: 8 }}>{persistedTimeoutContent}</div>
        ) : null}

        <p style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
          {passwordDescription ?? DEFAULT_PASSWORD_DESCRIPTION[passwordMode] ?? ''}
        </p>

        <CheckboxRow
          label="Mandatory Password Required"
          checked={mandatorySecurity}
          title="Displays methods with mandatory set to true — those always require the real per-account password check, no matter which mode is selected above."
          onSelect={onMandatorySecurityChange}
        />
        <CheckboxRow
          label="All Transaction Approval Required"
          checked={mandatoryApproval}
          title="Every regular Merit-authorized write requires the login password, every time, instead of silently reusing a cached one. Unchecked: falls back to the Mandatory Password Required setting above."
          onSelect={onMandatoryApprovalChange}
        />

        {passwordResetPanelContent ? (
          passwordResetPanelContent
        ) : (
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onLogoff}
              style={{ flex: 1, borderRadius: 6, border: 'none', background: '#ca8a04', color: '#000', fontSize: 11, fontWeight: 600, padding: '6px 0', cursor: onLogoff ? 'pointer' : 'default' }}
            >
              Logoff
            </button>
            <button
              type="button"
              onClick={onResetPassword}
              style={{ flex: 1, borderRadius: 6, border: 'none', background: '#ca8a04', color: '#000', fontSize: 11, fontWeight: 600, padding: '6px 0', cursor: onResetPassword ? 'pointer' : 'default' }}
            >
              Reset Password
            </button>
          </div>
        )}
      </ConfigSection>

      <ConfigSection title="Application Synchronization">
        <div>
          {SYNC_OPTIONS.map((option) => (
            <RadioRow
              key={option.value}
              label={option.label}
              active={syncMode === option.value}
              title={option.title}
              name="merit-wallet-sync-mode"
              value={option.value}
              onSelect={onSyncModeChange ? () => onSyncModeChange(option.value) : undefined}
            />
          ))}
        </div>
        <p style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
          {syncDescription ?? ''}
        </p>
      </ConfigSection>

      <ConfigSection title="Merit Wallet Placement Location">
        <div>
          {LOCATION_OPTIONS.map((option) => (
            <RadioRow
              key={option.value}
              label={option.label}
              active={location === option.value}
              name="merit-wallet-location"
              value={option.value}
              onSelect={onLocationChange ? () => onLocationChange(option.value) : undefined}
            />
          ))}
        </div>
      </ConfigSection>

      <ConfigSection title="Display">
        <CheckboxRow
          label="Show Background Page"
          checked={showBackgroundPage}
          onSelect={onShowBackgroundPageChange}
        />
        <CheckboxRow
          label="Modal Mode"
          checked={modalMode}
          onSelect={onModalModeChange}
        />
      </ConfigSection>

      {securityPanelContent ? <ConfigSection title="Wallet Security">{securityPanelContent}</ConfigSection> : null}

      <ConfigSection title="Exchange Engine">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <CheckboxRow
            label="Uniswap"
            checked={uniSelectVisible}
            onSelect={onUniswapEngineChange}
          />
          <CheckboxRow
            label="0X"
            checked={connectTradeButtonVisible}
            onSelect={on0xEngineChange}
          />
        </div>
        <p style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
          Shows or hides each engine's own panels in the Swap tab, independently — check both, either, or neither.
        </p>
      </ConfigSection>

      {resetPanelsContent ? <>{resetPanelsContent}</> : null}

      <ConfigSection title="Extension">
        <div>
          {EXTENSION_OPTIONS.map((option) => (
            <RadioRow
              key={option.value}
              label={option.label}
              active={extensionChannel === option.value}
              title={option.title}
              name="merit-wallet-extension-channel"
              value={option.value}
              onSelect={onExtensionChannelChange ? () => onExtensionChannelChange(option.value) : undefined}
            />
          ))}
        </div>
        <p style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
          Download path:{' '}
          <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{extensionDownloadPath}</span>
        </p>
      </ConfigSection>

      {/* Consumer-only Options section — see this file's own header comment on
          why this section alone is live-wired (only meaningful to a standalone
          consumer like the extension that opens a separate tab). Rendered only
          when a caller opts in via onOpenTargetChange — the real web app's
          WalletConfig.tsx has no Local/Prod target concept (it IS whichever
          origin it's already running on), so rendering it there would add an
          inert section the real tab never had. */}
      {onOpenTargetChange ? (
        <ConfigSection title="Options">
          <div>
            <LiveRadioRow
              name="spcoin-open-target"
              label="Local"
              checked={openTarget === 'local'}
              onSelect={() => onOpenTargetChange?.('local')}
            />
            <LiveRadioRow
              name="spcoin-open-target"
              label="Prod"
              checked={openTarget === 'prod'}
              onSelect={() => onOpenTargetChange?.('prod')}
            />
          </div>
          <p style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
            Which site the Open button below the wallet opens — Local for
            http://localhost:3000, Prod for the real sponsorCoin.org.
          </p>
        </ConfigSection>
      ) : null}
    </div>
  );
}

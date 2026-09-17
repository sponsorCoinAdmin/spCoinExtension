// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/WalletConfigPanel.tsx
// Portable placeholder for WALLET_CONFIG_PANEL (2026-09-12, revised
// 2026-09-14 on request — "look at the buffer spacing between the
// components" / missing text). The real app version
// (components/views/WalletConfig.tsx, 643 lines) reads/writes a dozen+
// real settings against live ExchangeContext state (password mode,
// cross-process sync mode, panel placement, exchange engine selection,
// etc.) — none of which exists in a standalone consumer (the extension,
// today). This ports the section SHAPE with representative option labels,
// entirely inert — no state, no real settings wired.
//
// 2026-09-14 revision, verified against the real component directly
// rather than approximated: outer spacing was `gap:10, padding:12` —
// the real container is `space-y-2` (8px) with NO outer padding at all
// (just a bottom pb-3); that stray padding pushed every section inward
// relative to the real layout. Each section card was `borderRadius:10,
// padding:10` uniform — real cards are `rounded-[15px]` with `px-5 py-3`
// (20px sides, 12px top/bottom), background `#161922` (was `#151b2e`,
// close but not exact). Password Protection was also missing its
// descriptive paragraph and the "Mandatory Password Required"/"All
// Transaction Approval Required" checkbox rows entirely — added back,
// matching the real copy verbatim, both checked (the real default is
// mandatorySecurity:false/mandatoryApproval:true, but the more common
// screen state — and this file's job is representative shape, not the
// real default — has both checked). Application Synchronization's own
// descriptive paragraph added too, for the same reason.
//
// 2026-09-14, on request ("why does the extension open button always open
// sponsorCoin.org and not localhost:3000") — one exception to this file's
// otherwise "entirely inert, no state, no real settings wired" rule: the
// "Options" section below IS real, live-wired, unlike every RadioRow/
// CheckboxRow elsewhere on this page (those stay decorative — no real
// state to back them yet). This one has a real consumer today (the Open
// button, via spCoinExtension/src/openApp.ts), so it's a genuine
// controlled `openTarget`/`onOpenTargetChange` prop pair instead of a
// fixed dot. Deliberately has no counterpart in the real app's own
// WalletConfig.tsx — Local/Prod is meaningless there (the web app IS
// whichever origin it's already running on); it only exists for a
// standalone consumer that opens a separate tab, like this extension.

'use client';

import React from 'react';
import { PACKAGE_BUILD } from './packageBuildTag';
import TabBodyMarker from './TabBodyMarker';

// Local/Prod — which app URL the extension's Open button targets. A plain
// string union, not imported from spCoinExtension (this package can't
// depend on its only consumer) — structurally identical to that repo's own
// openTargetStorage.ts#OpenTarget, which is the actual source of truth for
// what each value means.
export type OpenTarget = 'local' | 'prod';

const DOT_ACTIVE = '#16a34a'; // green-600, matches the app's real active-option color
const DOT_INACTIVE = '#dc2626'; // red-600, matches the app's real inactive-option color

function RadioRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 12 }}>
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '9999px',
          background: active ? DOT_ACTIVE : DOT_INACTIVE,
        }}
      />
      <span style={{ fontSize: 11, fontWeight: active ? 700 : 400, color: active ? '#e2e8f0' : '#94a3b8' }}>
        {label}
      </span>
    </div>
  );
}

// Real, interactive counterpart to the decorative RadioRow above — used
// only by the Options section below (see this file's own header comment
// on why that section alone is live-wired).
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

function CheckboxRow({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        readOnly
        style={{ height: 15, width: 15, flexShrink: 0, accentColor: '#5981F3' }}
      />
    </div>
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

export interface WalletConfigPanelProps {
  /** Omit for an inert row of every button doing nothing. */
  onLogoff?: () => void;
  onResetPassword?: () => void;
  /** Which app URL the extension's Open button targets. Default 'prod' —
   *  see this file's own header comment; no effect outside a consumer that
   *  actually reads it (today, only spCoinExtension's openApp.ts does). */
  openTarget?: OpenTarget;
  onOpenTargetChange?: (target: OpenTarget) => void;
}

export default function WalletConfigPanel({
  onLogoff,
  onResetPassword,
  openTarget = 'prod',
  onOpenTargetChange,
}: WalletConfigPanelProps) {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 12 }}>
      <TabBodyMarker path="WalletConfigPanel.tsx" build={PACKAGE_BUILD} />
      <ConfigSection title="Password Protection">
        <div>
          <RadioRow label="App" active />
          <RadioRow label="Initial" active={false} />
          <RadioRow label="All" active={false} />
          {/* 2026-09-14 — shape parity with the real app's 4th Password
              Protection option (WalletConfig.tsx's 'persisted' mode: a
              temporary encrypted-password reload bypass with its own
              time-limit field). Decorative only, same as every other
              RadioRow here — no real timeout field to match, since this
              placeholder has no live passwordMode state to react to. */}
          <RadioRow label="Persisted" active={false} />
        </div>
        <p style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
          Merit Wallet locks behind a password every session — enter it once and every write for
          the rest of the session is approved without asking again. The current default.
        </p>
        <CheckboxRow label="Mandatory Password Required" checked />
        <CheckboxRow label="All Transaction Approval Required" checked />
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
      </ConfigSection>

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
          http://localhost:3000, Prod for the real sponsorcoin.org.
        </p>
      </ConfigSection>

      <ConfigSection title="Application Synchronization">
        <div>
          <RadioRow label="Authorize" active={false} />
          <RadioRow label="Enable" active={false} />
          <RadioRow label="Disable" active />
        </div>
        <p style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
          The whole cross-process sync layer is off — no background pushes, no cross-session/cross-tab
          updates. Real writes (swap/stake/sponsor/send) are unaffected.
        </p>
      </ConfigSection>

      <ConfigSection title="Merit Wallet Placement Location">
        <div>
          <RadioRow label="Center" active={false} />
          <RadioRow label="Fixed" active={false} />
          <RadioRow label="Float" active={false} />
          <RadioRow label="Split Pane" active={false} />
          <RadioRow label="Top" active />
        </div>
      </ConfigSection>

      <ConfigSection title="Exchange Engine">
        <div>
          <RadioRow label="Uniswap" active />
          <RadioRow label="0X" active={false} />
        </div>
      </ConfigSection>
    </div>
  );
}

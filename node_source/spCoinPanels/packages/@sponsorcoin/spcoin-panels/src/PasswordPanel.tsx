// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/PasswordPanel.tsx
// Portable placeholder for PASSWORD_PANEL (2026-09-12) — the real app
// version (components/views/RadioOverlayPanels/PasswordPanel.tsx) reads a
// live `useSpCoinWallet()` (real setWalletPassword/unlockWallet calls
// against the actual Merit keystore) — none of which exists in a
// standalone consumer (the extension, today). Same shape (logo, title,
// password field(s), submit button), entirely inert unless the caller
// wires `onSubmit` — same "presentation only, no sync yet" scope every
// other extension-bound component here follows. Inline styles (no
// Tailwind), same reasoning as every sibling component.

'use client';

import React, { useState } from 'react';

export interface PasswordPanelProps {
  /** Matches the real component's own three states — 'checking' shows no
   *  form at all (nothing to submit yet). Defaults to 'unlock', the more
   *  common real-world state (a password already exists). */
  mode?: 'checking' | 'setup' | 'unlock';
  /** Logo shown above the title — omit for no image (same "no default
   *  avatar" convention as every other placeholder here). */
  icon?: React.ReactNode;
  errorText?: string;
  /** Omit for an inert form that does nothing on submit. */
  onSubmit?: (password: string) => void;
  submitting?: boolean;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: 8,
  border: '1px solid #334155',
  background: '#0e111b',
  padding: '8px 10px',
  fontSize: 12,
  color: '#ffffff',
  outline: 'none',
};

export default function PasswordPanel({
  mode = 'unlock',
  icon,
  errorText,
  onSubmit,
  submitting = false,
}: PasswordPanelProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const isSetupMode = mode === 'setup';
  const isCheckingStatus = mode === 'checking';

  const title = isCheckingStatus
    ? 'Checking Merit Wallet…'
    : isSetupMode
      ? 'Create Your Merit Wallet Password'
      : 'Unlock Merit Wallet';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
        {icon && <div style={{ width: '100%', maxWidth: 160 }}>{icon}</div>}
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#ffffff' }}>{title}</h2>
        {isSetupMode && (
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
            This one password protects every account you Import or Create in Merit Wallet.
          </p>
        )}
      </div>

      {errorText && (
        <div style={{ borderRadius: 8, background: 'rgba(127,29,29,0.6)', padding: '6px 10px', fontSize: 10, color: '#fca5a5' }}>
          {errorText}
        </div>
      )}

      {!isCheckingStatus && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit?.(password);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={isSetupMode ? 'new-password' : 'current-password'}
            style={inputStyle}
          />
          {isSetupMode && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              autoComplete="new-password"
              style={inputStyle}
            />
          )}
          <button
            type="submit"
            disabled={submitting || !password || (isSetupMode && !confirmPassword)}
            style={{
              width: '100%',
              borderRadius: 8,
              border: 'none',
              background: '#5981F3',
              padding: '8px 0',
              fontSize: 12,
              fontWeight: 600,
              color: '#ffffff',
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting || !password || (isSetupMode && !confirmPassword) ? 0.5 : 1,
            }}
          >
            {submitting ? 'Please wait...' : isSetupMode ? 'Create Password' : 'Unlock'}
          </button>
        </form>
      )}
    </div>
  );
}

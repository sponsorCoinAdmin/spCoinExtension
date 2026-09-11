// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/WalletHeader.tsx
// Portable copy of components/views/WalletHeader.tsx (2026-09-11, "Pages
// Grey header bar" slice — see docs/design/extensionPlan.md). No sync/state
// plumbing here at all, deliberately (on request) — this is presentation
// only: refresh/close are injected callbacks, exactly like the app's own
// version already had them (nothing to decouple there). Rewritten with
// plain inline styles instead of Tailwind classes (2026-09-11, on request
// — see MeritTitleComponent.tsx's own header comment, point 3, for the
// full reasoning: a component library shouldn't require every consumer to
// run a Tailwind pipeline just to render correctly). Hover/spin states use
// local component state + a tiny inline <style> for the keyframes, rather
// than an external stylesheet a CJS package build can't easily ship.

'use client';

import React, { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import MeritTitleComponent from './MeritTitleComponent';

type WalletHeaderMode = 'selection' | 'normal';

export interface WalletHeaderProps {
  mode: WalletHeaderMode;
  /** Normal mode: falls back to the default MeritTitleComponent badge+label
   *  when omitted. Selection mode: falls back to 'Select Active Account'. */
  title?: React.ReactNode;
  /** Omit for the default spCoin-logo badge. */
  leftSlot?: React.ReactNode;
  /** Src for the default leftSlot badge (only used when leftSlot is
   *  omitted). Defaults to the app's own hosted asset — override for any
   *  consumer that can't reach that origin. */
  iconSrc?: string;
  /** Src for MeritTitleComponent's own badge (only used when both leftSlot
   *  and title are omitted, i.e. the true default-normal-mode render). */
  titleBadgeSrc?: string;
  /** Forwarded to MeritTitleComponent — omit for an inert (non-clickable)
   *  default title. */
  onTitleClick?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  refreshAriaLabel?: string;
  closeAriaLabel?: string;
  onClose: () => void;
}

const DEFAULT_ICON_SRC = '/assets/miscellaneous/spCoin.png';

const iconButtonBaseStyle: React.CSSProperties = {
  display: 'flex',
  height: 44,
  width: 44,
  alignItems: 'center',
  justifyContent: 'center',
  appearance: 'none',
  border: 'none',
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  transition: 'opacity 120ms ease',
};

function IconButton({
  onClick,
  disabled,
  ariaLabel,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...iconButtonBaseStyle,
        opacity: disabled ? 0.5 : hovered ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );
}

export default function WalletHeader({
  mode,
  title,
  leftSlot,
  iconSrc = DEFAULT_ICON_SRC,
  titleBadgeSrc,
  onTitleClick,
  onRefresh,
  refreshing,
  refreshAriaLabel,
  closeAriaLabel,
  onClose,
}: WalletHeaderProps) {
  const isSelection = mode === 'selection';

  return (
    <div
      style={{
        position: 'relative',
        background: '#77808e',
        paddingLeft: 16,
        paddingRight: 10,
        paddingTop: 6,
        paddingBottom: 1,
      }}
    >
      {/* Scoped keyframes for the refresh spin — the one thing inline
          styles alone can't express. Harmless if this component renders
          more than once (duplicate rule, same name, no conflict). */}
      <style>{'@keyframes spcoinWalletHeaderSpin { to { transform: rotate(360deg); } }'}</style>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center' }}>
          {leftSlot ?? (
            <span
              style={{
                display: 'flex',
                height: 44,
                width: 44,
                flexShrink: 0,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                background: 'transparent',
              }}
            >
              <img
                src={iconSrc}
                alt="SponsorCoin"
                width={44}
                height={44}
                style={{ height: '100%', width: '100%', objectFit: 'contain' }}
              />
            </span>
          )}
        </div>
        <h2
          style={{
            pointerEvents: 'none',
            marginTop: -10,
            marginBottom: 0,
            minWidth: 0,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.25,
            color: '#e2e8f0',
          }}
        >
          {title ??
            (isSelection ? (
              'Select Active Account'
            ) : (
              <MeritTitleComponent badgeSrc={titleBadgeSrc} onTitleClick={onTitleClick} />
            ))}
        </h2>
        <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center' }}>
          <IconButton
            onClick={onRefresh}
            disabled={refreshing}
            ariaLabel={refreshAriaLabel ?? (isSelection ? 'Refresh accounts' : 'Refresh wallet')}
          >
            <RefreshCw
              style={{
                height: 28,
                width: 28,
                color: '#1f2937',
                animation: refreshing ? 'spcoinWalletHeaderSpin 1s linear infinite' : undefined,
              }}
              strokeWidth={1.5}
            />
          </IconButton>
          <IconButton
            onClick={onClose}
            ariaLabel={closeAriaLabel ?? (isSelection ? 'Close account selection' : 'Close Merit Wallet')}
          >
            <X style={{ height: 38, width: 38, color: '#1f2937' }} strokeWidth={1.5} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

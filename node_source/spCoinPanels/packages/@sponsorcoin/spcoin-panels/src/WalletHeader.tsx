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
import { APP_TYPE } from '@sponsorcoin/spcoin-common';
import MeritTitleComponent from './MeritTitleComponent';

type WalletNetworkHeaderMode = 'selection' | 'normal';

export interface WalletNetworkHeaderProps {
  mode: WalletNetworkHeaderMode;
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
  /** Whether to show the Merit badge in the default title. */
  showTitleBadge?: boolean;
  /** Forwarded to MeritTitleComponent — omit for an inert (non-clickable)
   *  default title. */
  onTitleClick?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  refreshAriaLabel?: string;
  closeAriaLabel?: string;
  onClose: () => void;
  /** 2026-09-21, on direct request — the platform this component is
   *  running in, the real source of truth for which close icon renders
   *  (`appType === EXTENSION` → `wwwIconSrc`, everything else → the
   *  default X). Replaces asking every caller to remember to pass the
   *  right icon manually (the class of bug that caused a real live
   *  regression: this exact icon silently reverted to the default X in
   *  the extension when a caller's own override was accidentally
   *  dropped). Optional — omitted (or any non-EXTENSION value, including
   *  the not-yet-wired I_PHONE/ANDROID) falls back to the default X,
   *  matching every current web-app caller's own existing behavior
   *  exactly, so nothing had to change there for this to land safely. */
  appType?: APP_TYPE;
  /** 2026-09-14, on request ("the close X is fine in the web, but it has
   *  no purpose in the extension") — a standalone dismiss has nothing to
   *  reveal underneath in a Chrome side panel (unlike the web app's own
   *  floating overlay, where closing uncovers the page behind it), so a
   *  consumer whose "close" really means "open the real web app instead"
   *  supplies this image, shown only when `appType === EXTENSION` (see
   *  above). `onClose` still fires either way — only the icon changes;
   *  what "close" actually does is entirely the caller's own choice (see
   *  sidepanel.ts's own use, where it's rewired to the exact same
   *  handler as the removed Open button). Only this package's own
   *  callers can resolve the real asset URL (`chrome.runtime.getURL`),
   *  so this stays an injected prop rather than something `appType`
   *  alone could resolve internally. */
  wwwIconSrc?: string;
  /** Explicit manual override, still supported for a consumer with a
   *  reason to show something other than either of the two `appType`-
   *  driven choices above — takes priority over both when set. */
  closeIconSrc?: string;
}

const DEFAULT_ICON_SRC = '/assets/miscellaneous/spCoin.png';

const iconButtonBaseStyle: React.CSSProperties = {
  display: 'flex',
  height: 30,
  width: 30,
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

export default function WalletNetworkHeader({
  mode,
  title,
  leftSlot,
  iconSrc = DEFAULT_ICON_SRC,
  titleBadgeSrc,
  showTitleBadge = true,
  onTitleClick,
  onRefresh,
  refreshing,
  refreshAriaLabel,
  closeAriaLabel,
  onClose,
  appType,
  wwwIconSrc,
  closeIconSrc,
}: WalletNetworkHeaderProps) {
  const isSelection = mode === 'selection';
  // 2026-09-21 — explicit override wins; otherwise appType decides
  // (EXTENSION -> wwwIconSrc, everything else -> the default X below).
  const resolvedCloseIconSrc =
    closeIconSrc ?? (appType === APP_TYPE.EXTENSION ? wwwIconSrc : undefined);

  return (
    <div
      style={{
        position: 'relative',
        // 2026-09-21, on direct request — was 'transparent', silently
        // inheriting whatever sat behind it (the extension's dark navy
        // wallet background, since this component has no PARENT
        // background of its own to fall back to the way the web app's
        // own SEPARATE `components/views/Headers/WalletNetworkPanel.tsx`
        // does with its own hardcoded `bg-[#77808e]`). This is the one,
        // real header color both apps should show — not two
        // implementations quietly drifting apart. See that file's own
        // outer container for the source of this exact value.
        background: '#77808e',
        // 2026-09-22, on direct request — 6px (was 16px). Both apps now
        // read this one file (see WalletAccountHeader.tsx's own matching
        // value below it — that one's real content padding, not a
        // separate component this needs to stay in sync with anymore).
        padding: '0 6px 2px 6px',
      }}
    >
      {/* Scoped keyframes for the refresh spin — the one thing inline
          styles alone can't express. Harmless if this component renders
          more than once (duplicate rule, same name, no conflict). */}
      <style>{'@keyframes spcoinWalletHeaderSpin { to { transform: rotate(360deg); } }'}</style>
      {/* 2026-09-22 — briefly 'center' (see the now-superseded comment this
          replaced), reverted back to 'flex-end' on direct request ("make
          the bottom of [MeritTitleComponent] line up with the bottom of
          the NetworkSelectDropDown") — MeritTitleComponent's badge (26px)
          is taller than the network pill (16-18px), so center alignment
          matches their MIDPOINTS, not their bottoms; flex-end is what
          actually achieves "bottoms line up". Safe to bring back now:
          the ORIGINAL flex-end bug was leftSlot's rendered height
          differing between the web app's real NetworkSelectDropDown and
          this package's own placeholder — since fixed independently by
          matching their icon/pill size props (see MeritWallet.tsx's own
          2026-09-22 comment on that), so both apps' leftSlot heights
          agree again and flex-end lines everything up consistently in
          both. */}
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center' }}>
          {leftSlot ?? (
            <span
              style={{
                display: 'flex',
                height: 30,
                width: 30,
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
                width={30}
                height={30}
                style={{ height: '100%', width: '100%', objectFit: 'contain' }}
              />
            </span>
          )}
        </div>
        <h2
          style={{
            pointerEvents: 'none',
            marginTop: 0,
            marginBottom: 0,
            minWidth: 0,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1.25,
            color: '#e2e8f0',
          }}
        >
          {title ??
            (isSelection ? (
              'Select Active Account'
            ) : (
              <MeritTitleComponent badgeSrc={titleBadgeSrc} showBadge={showTitleBadge} onTitleClick={onTitleClick} />
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
                height: 18,
                width: 18,
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
            {resolvedCloseIconSrc ? (
              <img
                src={resolvedCloseIconSrc}
                alt=""
                style={{ height: 22, width: 22, objectFit: 'contain' }}
              />
            ) : (
              <X style={{ height: 24, width: 24, color: '#1f2937' }} strokeWidth={1.5} />
            )}
          </IconButton>
        </div>
      </div>
    </div>
  );
}

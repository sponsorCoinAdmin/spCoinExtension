// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/BuySellSwapArrowButton.tsx
//
// 2026-09-22, real migration (on request, "you will have to migrate their
// functionality as well" — not just a presentational shell) — the real,
// live SWAP_ARROW_BUTTON, promoted from
// components/views/TradingStationPanel/SwapArrowButton/index.tsx. That
// file's actual sell/buy-amount-shifting math (toDecimalString/
// shiftDecimal/coerceShiftedAmount below) had no ExchangeContext coupling
// at all — pure functions operating on plain values — so it moves here
// verbatim as the real, single source of truth, not duplicated. The click
// handler that CALLS this math (building nextSell/nextBuy from
// exchangeContext.apiCoreSyncedMembers.tradeData, committing via
// setSellTokenContract/setBuyTokenContract, mutating the 0x price SWR key)
// is irreducibly ExchangeContext-bound and stays local — that file is now
// a thin wrapper that resolves those hooks, builds onClick with these same
// exported helpers, and renders this component.
//
// usePanelVisible(panelId) is genuinely portable (Path A, real shared
// engine) so this component calls it directly instead of taking `visible`
// as a prop, matching WalletRadioPanels.tsx's own pattern.
//
// Visual spec (size/colors/position) matches the real app's exact markup —
// NOT the separate, deliberately-inert placeholder SwapArrowButton private
// function inside ExchangeTradingPair.tsx (that one is its own, smaller,
// extension-preview-only shape; this is the real, live component).
//
// 2026-09-22, real bug fix — this component originally styled itself with
// Tailwind classes only (`bg-[#3a4157]`/`border-2 border-[#0E111B]`/
// `rounded-lg`/`text-[#5F6783]`/`hover:text-white`). Two separate gaps
// made that silently render unstyled in BOTH real apps: the Extension has
// never run Tailwind at all (see docs/handoff.md's AssetSelectDropDown
// entry — the same class of gap), and the Web App's own `tailwind.config.js`
// `content` glob never scanned `node_source/` at all, so these exact
// arbitrary-value classes (unique to this file) never got real CSS
// generated for them there either — confirmed live: `3a4157`/`5F6783`
// were entirely absent from the compiled `.next` output, while common
// classes shared with other, scanned files (`absolute`, `rounded-lg`,
// `border-2`, etc.) happened to survive, which is what made the button
// render as a plain, colorless outlined box instead of fully invisible —
// easy to misread as "a CSS override problem" rather than "never compiled
// at all." Fixed two ways: (1) `tailwind.config.js`'s `content` now
// includes `node_source/spCoinPanels/**`, so the Web App gets real CSS
// for these classes again; (2) real inline `style` values added here too,
// sourced from `@sponsorcoin/spcoin-common/styles`' new
// `SWAP_ARROW_BG`/`SWAP_ARROW_BORDER`/`SWAP_ARROW_IDLE_COLOR`/
// `SWAP_ARROW_HOVER_COLOR` (the same real values already proven correct
// by ExchangeTradingPair.tsx's own placeholder SwapArrowButton, which
// only ever used inline styles and was unaffected by either gap) — so
// this renders correctly in the Extension too, not just the Web App,
// and keeps rendering correctly even if the Tailwind content-glob fix
// above is ever reverted or missed by a future package. The Tailwind
// classes stay in place as well — harmless now that they compile, and
// they're what a future purely-Tailwind consumer would see first.

'use client';

import React, { useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import {
  SWAP_ARROW_BG,
  SWAP_ARROW_BORDER,
  SWAP_ARROW_IDLE_COLOR,
  SWAP_ARROW_HOVER_COLOR,
} from '@sponsorcoin/spcoin-common/styles';
import { usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';

export function toDecimalString(v: unknown): string {
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '0';
  if (typeof v === 'string') return v.trim() || '0';
  return '0';
}

export function shiftDecimal(value: string, shift: number): string {
  if (value === '0' || value === '-0') return '0';

  let sign = '';
  if (value.startsWith('-')) {
    sign = '-';
    value = value.slice(1);
  }

  const [wholeRaw, fracRaw = ''] = value.split('.');
  const whole = wholeRaw.replace(/^0+(?!$)/, '');
  const frac = fracRaw;
  const digits = (whole + frac).replace(/^0+$/, '0');
  const pointIndex = whole.length;
  const newPointIndex = pointIndex + shift;

  if (newPointIndex >= digits.length) {
    return sign + digits + '0'.repeat(newPointIndex - digits.length);
  }
  if (newPointIndex <= 0) {
    const zeros = -newPointIndex;
    const tail = digits.replace(/^0+/, '');
    return sign + '0.' + '0'.repeat(zeros) + (tail || '0');
  }

  const left = digits.slice(0, newPointIndex).replace(/^0+(?!$)/, '') || '0';
  const right = digits.slice(newPointIndex).replace(/0+$/, '');
  return right ? sign + left + '.' + right : sign + left;
}

export function coerceShiftedAmount(original: unknown, shifted: string): bigint | string {
  if (typeof original === 'bigint' && !shifted.includes('.')) {
    try {
      return BigInt(shifted);
    } catch {}
  }
  return shifted;
}

export interface BuySellSwapArrowButtonProps {
  panelId?: SP_COIN_DISPLAY;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function BuySellSwapArrowButton({
  panelId = SP_COIN_DISPLAY.SWAP_ARROW_BUTTON,
  onClick,
}: BuySellSwapArrowButtonProps) {
  const show = usePanelVisible(panelId);
  const [hovered, setHovered] = useState(false);

  if (!show) return null;

  // Single source of truth for placement: anchored to the bottom edge of
  // whichever slot renders this button (that slot must be `position:
  // relative`), straddling the seam with the slot below it. Used
  // identically by the Swap tab (TradingStationPanel) and the Sponsor tab
  // (SponsorPanel) in the real app — both render this exact component the
  // same way so this stays a single methodology.
  return (
    <div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-[9999]"
      style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translate(-50%, 50%)', zIndex: 9999 }}
    >
      <div
        id="SWAP_ARROW_BUTTON"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`
          relative
          z-10
          mx-auto
          flex items-center justify-center
          w-5 h-5
          text-[#5F6783] bg-[#3a4157]
          rounded-lg border-2 border-[#0E111B]
          text-xs
          transition-colors duration-300
          cursor-pointer hover:text-white
        `}
        style={{
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 10,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: 8,
          border: `2px solid ${SWAP_ARROW_BORDER}`,
          background: SWAP_ARROW_BG,
          color: hovered ? SWAP_ARROW_HOVER_COLOR : SWAP_ARROW_IDLE_COLOR,
          fontSize: 12,
          transition: 'color 300ms',
          cursor: 'pointer',
        }}
      >
        <ArrowDown size={13} />
      </div>
    </div>
  );
}

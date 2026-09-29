// File: src/ExchangeButton.tsx
// Portable ExchangeButton presentation shell (2026-09-27, Phase 4
// TRADING_STATION_PANEL). Accepts all non-portable state-machine values as
// props — the caller (web app or extension) derives buttonType, buttonText,
// bgClass, disabled, busy, and click handlers from its own context-bound
// state (useSwapFunctions, useSponsorMode, useExchangeContext, stores, etc.)
// and passes the StakeConfirmPopup as a serialized ReactNode slot.

'use client';

import type { ReactNode } from 'react';
import type { BUTTON_TYPE } from '@sponsorcoin/spcoin-common/context';
import ActionButton, { type ActionButtonBgClass } from './ActionButton';

export type { ActionButtonBgClass };

export interface ExchangeButtonProps {
  id?: string;
  buttonType: BUTTON_TYPE;
  buttonText: ReactNode;
  bgClass: ActionButtonBgClass;
  onClick: () => void;
  disabled: boolean;
  busy: boolean;
  warnOnHover: boolean;
  hoverText?: ReactNode;
  endAdornment?: ReactNode;
  /** Rendered after the button — the caller's own confirm popup (e.g.
    * StakeConfirmPopup), or null if not shown. */
  confirmPopup?: ReactNode;
}

export default function ExchangeButton({
  id,
  buttonType: _buttonType,
  buttonText,
  bgClass,
  onClick,
  disabled,
  busy,
  warnOnHover,
  hoverText,
  endAdornment,
  confirmPopup,
}: ExchangeButtonProps) {
  return (
    <>
      <ActionButton
        id={id ?? 'ExchangeButton'}
        text={buttonText}
        bgClass={bgClass}
        onClick={onClick}
        disabled={disabled}
        busy={busy}
        endAdornment={endAdornment}
        warnOnHover={warnOnHover}
        hoverText={hoverText}
      />
      {confirmPopup ?? null}
    </>
  );
}

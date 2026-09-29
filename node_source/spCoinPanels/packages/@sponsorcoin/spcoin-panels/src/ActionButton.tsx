// File: src/ActionButton.tsx
// Portable ActionButton (2026-09-27, Phase 4 TRADING_STATION_PANEL).
// Pure presentation component — no non-portable imports. Accepts a
// bgClass variant that controls the button color scheme. The caller derives
// this from its own button-type state machine (which depends on
// useExchangeContext/useErrorMessage — not portable yet).

'use client';

import type { ReactNode } from 'react';

export type ActionButtonBgClass =
  | 'bg-[#243056]'
  | 'bg-[#501505]'
  | 'bg-[#1f3e1d]'
  | 'bg-orange-600';

export interface ActionButtonProps {
  id?: string;
  text: ReactNode;
  bgClass: ActionButtonBgClass;
  onClick?: () => void;
  disabled?: boolean;
  /** true while a transaction is in flight — disabled but hover-reactive. */
  busy?: boolean;
  /** Rendered as an absolutely-positioned overlay (sibling of <button>,
    * not child — a button cannot nest another interactive element). */
  endAdornment?: ReactNode;
  /** Hover-warn affordance — throbs text, optionally replacing it on hover. */
  warnOnHover?: boolean;
  hoverText?: ReactNode;
}

export default function ActionButton({
  id,
  text,
  bgClass,
  onClick,
  disabled = false,
  busy = false,
  endAdornment,
  warnOnHover = false,
  hoverText,
}: ActionButtonProps) {
  return (
    <div className="relative p-0 m-0">
      <button
        id={id}
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={[
          'group flex items-center justify-center',
          bgClass === 'bg-orange-600' ? 'text-white' : 'text-[#5981F3]',
          bgClass,
          'w-full h-[34px]',
          'text-[12px] font-bold',
          'rounded-[8px]',
          'transition-[color,background-color] duration-300',
          disabled
            ? busy
              ? 'opacity-60 cursor-not-allowed hover:bg-orange-500'
              : warnOnHover
                ? 'opacity-60 cursor-not-allowed hover:bg-orange-600 hover:text-white'
                : 'opacity-60 cursor-not-allowed'
            : warnOnHover
              ? 'hover:cursor-pointer hover:bg-orange-600 hover:text-white'
              : 'hover:cursor-pointer hover:text-green-500',
        ].join(' ')}
      >
        {warnOnHover && hoverText !== undefined ? (
          <>
            <span className="group-hover:hidden">{text}</span>
            <span className="hidden group-hover:inline group-hover:animate-throb">{hoverText}</span>
          </>
        ) : (
          <span className={warnOnHover ? 'group-hover:animate-throb' : undefined}>{text}</span>
        )}
      </button>
      {endAdornment && (
        <span className="absolute inset-y-0 right-3 z-10 flex items-center">{endAdornment}</span>
      )}
    </div>
  );
}

// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AffiliateFee.tsx
//
// 2026-09-22, real migration — promoted from the web app's real
// components/views/TradingStationPanel/AffiliateFee/index.tsx. Its one
// real coupling (useBuyTokenContract) is only ever used for `.decimals`/
// `.symbol` — plain data, not a live write handle — so those two values
// become props instead, same "opaque slot" shape as ConfigSlippagePanel/
// SwapArrowButton earlier this session.
//
// 2026-09-29, real fix (library isolation audit) — corrects this file's own
// prior claim that "each consuming app's own bundler (Next.js here, Vite in
// the extension) inlines process.env.NEXT_PUBLIC_AFFILIATE_FEE at ITS OWN
// build time." That's true for Next.js but NOT for Vite (the extension's
// own bundler) — Vite has no built-in process.env.NEXT_PUBLIC_* inlining at
// all (its own convention is import.meta.env.VITE_*, a different prefix
// and a different mechanism entirely), and the extension's vite.config.ts
// has no `define` block adding one. So this read was always silently
// `undefined` in the extension, not "reading correctly per-app" as
// previously assumed. `feeRate` is now a plain prop instead — same shape
// this file already uses for `decimals`/`symbol` — resolved by the web
// app's own wrapper (components/views/TradingStationPanel/AffiliateFee/
// index.tsx), which reads process.env.NEXT_PUBLIC_AFFILIATE_FEE itself and
// passes the real value down; a bare consumer (the extension, today)
// defaults to 0, same as the value this always silently evaluated to there
// before this fix — zero behavior change for the extension either way.

'use client';

import React, { useMemo } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';

// `ethers` is not a dependency of every consumer of this package (the
// extension doesn't have it, confirmed when this class of gap first
// surfaced this session — sendNative.ts's own header comment) — a small,
// self-contained replacement for formatUnits instead of taking on that
// dependency for one conversion. Same exact-decimal-string-then-float
// shape ethers.formatUnits + Number(...) already had (the final float
// conversion was already lossy in the original code too — this changes
// nothing about that, only removes the dependency).
function formatUnitsToNumber(raw: string, decimals: number): number {
  const value = BigInt(raw);
  const negative = value < BigInt(0);
  const abs = negative ? -value : value;
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = abs / divisor;
  const fraction = abs % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  const str = fractionStr ? `${whole}.${fractionStr}` : `${whole}`;
  return Number(negative ? `-${str}` : str);
}

export interface AffiliateFeeProps {
  panelId?: SP_COIN_DISPLAY;
  grossBuyAmount: string | undefined;
  decimals?: number;
  symbol?: string;
  /** The affiliate fee rate (e.g. 0.01 for 1%) — see this file's own
   * header comment for why this is a plain prop, not an env read. */
  feeRate?: number;
}

export default function AffiliateFee({
  panelId = SP_COIN_DISPLAY.AFFILIATE_FEE,
  grossBuyAmount,
  decimals = 18,
  symbol = '',
  feeRate = 0,
}: AffiliateFeeProps) {
  const show = usePanelVisible(panelId);

  const text = useMemo(() => {
    if (!show) return null;
    if (!grossBuyAmount) return null;

    try {
      const amount = formatUnitsToNumber(grossBuyAmount, decimals);
      const fee = amount * feeRate;
      if (!isFinite(fee) || fee <= 0) return null;

      const pretty = fee >= 1 ? fee.toFixed(4) : fee.toPrecision(4);
      return `Affiliate Fee: ${pretty} ${symbol}`;
    } catch {
      return null;
    }
  }, [show, grossBuyAmount, decimals, symbol, feeRate]);

  if (!text) return null;
  return <div id="AFFILIATE_FEE" className="text-slate-400">{text}</div>;
}

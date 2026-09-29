// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/ConfigSlippagePanel.tsx
//
// 2026-09-22, real migration (on request, "you will have to migrate their
// functionality as well") — the real, live CONFIG_SLIPPAGE_PANEL, promoted
// from components/views/TradingStationPanel/ConfigSlippagePanel/index.tsx.
// Every piece of that file's own logic (slider bounds, percent formatting,
// close handling) was already free of ExchangeContext coupling — the ONLY
// non-portable piece was the single `useSlippage()` call, which reads/writes
// exchangeContext.apiCoreSyncedMembers.tradeData.slippage. That file is now
// a thin wrapper: it resolves useSlippage() and passes `bps`/`onBpsChange`
// down to this component instead of pulling them from context directly.
//
// usePanelTree/usePanelVisible are genuinely portable (Path A, real shared
// engine) so this component calls them directly, same as
// BuySellSwapArrowButton.tsx's own pattern.

'use client';

import React, { useCallback } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { usePanelTree, usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';

// Slippage bounds in basis points (bps)
export const SLIPPAGE_MIN_BPS = 50; // 0.50%
export const SLIPPAGE_MAX_BPS = 500; // 5.00%
export const SLIPPAGE_STEP_BPS = 5; // 0.05% increments

export interface ConfigSlippagePanelProps {
  panelId?: SP_COIN_DISPLAY;
  /** Current slippage, in bps. Caller owns the real value (ExchangeContext-bound). */
  bps: number;
  onBpsChange: (bps: number) => void;
}

export default function ConfigSlippagePanel({
  panelId = SP_COIN_DISPLAY.CONFIG_SLIPPAGE_PANEL,
  bps,
  onBpsChange,
}: ConfigSlippagePanelProps) {
  const { closePanel } = usePanelTree();
  const isVisible = usePanelVisible(panelId);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(e.target.value);
      if (!Number.isFinite(next)) return;
      if (next !== bps) onBpsChange(next);
    },
    [bps, onBpsChange],
  );

  const handleClose = useCallback(() => {
    if (!isVisible) return;
    closePanel(panelId, 'ConfigSlippagePanel:close');
  }, [closePanel, isVisible, panelId]);

  if (!isVisible) return null;

  // bps -> percent, formatted as #,##%
  const percentValue = bps / 100; // 100 bps -> 1.00
  const spRateLabel = `${percentValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;

  return (
    // 2026-09-25, real fix (on request, "make the slippage panel have the
    // same size and style as the buttons just fixed") — matches
    // UniswapTradeButton.tsx/CustomConnectButton's own shell exactly
    // (h-[34px], rounded-[8px], bg-[#243056], text-[#5981F3]) instead of
    // this panel's previous one-off bg-[#1f2639]/h-[45px]/rounded-[12px]/
    // text-[#94a3b8]. The inner "Slippage:" pill's own separate
    // bg-[#243056] is dropped too — redundant now that the container
    // itself is that color — and its text drops to the same 12px bold the
    // buttons use instead of its previous 17px.
    <div
      id="CONFIG_SLIPPAGE_PANEL"
      className="
        bg-[#243056] text-[#5981F3]
        border-0 h-[34px]
        rounded-[8px]
        px-[11px]
        flex items-center
      "
    >
      {/* Slider on the left */}
      <input
        type="range"
        title="Adjust Slippage Tolerance"
        className="border-0 h-[1px] w-[224px] rounded-none outline-none bg-white cursor-pointer"
        min={SLIPPAGE_MIN_BPS}
        max={SLIPPAGE_MAX_BPS}
        step={SLIPPAGE_STEP_BPS}
        value={bps}
        onChange={handleSliderChange}
      />

      {/* Spacer to push label+X to the far right */}
      <div className="flex-1" />

      {/* Slippage label (formatted #,##%) */}
      <div className="mr-[8px] flex items-center gap-[5px] font-bold text-[12px]">
        Slippage:
        <div id="slippage">{spRateLabel}</div>
      </div>

      {/* Close button */}
      <button
        type="button"
        aria-label="Close"
        onClick={handleClose}
        className="
          cursor-pointer w-5 text-[12px] font-bold leading-none
          bg-transparent
          border-0 outline-none ring-0 appearance-none
          focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0
          hover:bg-transparent active:bg-transparent
          text-[#5981F3] hover:text-green-500
        "
      >
        X
      </button>
    </div>
  );
}

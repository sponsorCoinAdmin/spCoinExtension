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
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { usePanelTree, usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
// Slippage bounds in basis points (bps)
export const SLIPPAGE_MIN_BPS = 50; // 0.50%
export const SLIPPAGE_MAX_BPS = 500; // 5.00%
export const SLIPPAGE_STEP_BPS = 5; // 0.05% increments
export default function ConfigSlippagePanel({ panelId = SP_COIN_DISPLAY.CONFIG_SLIPPAGE_PANEL, bps, onBpsChange, }) {
    const { closePanel } = usePanelTree();
    const isVisible = usePanelVisible(panelId);
    const handleSliderChange = useCallback((e) => {
        const next = Number(e.target.value);
        if (!Number.isFinite(next))
            return;
        if (next !== bps)
            onBpsChange(next);
    }, [bps, onBpsChange]);
    const handleClose = useCallback(() => {
        if (!isVisible)
            return;
        closePanel(panelId, 'ConfigSlippagePanel:close');
    }, [closePanel, isVisible, panelId]);
    if (!isVisible)
        return null;
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
    _jsxs("div", { id: "CONFIG_SLIPPAGE_PANEL", className: "\r\n        bg-[#243056] text-[#5981F3]\r\n        border-0 h-[34px]\r\n        rounded-[8px]\r\n        px-[11px]\r\n        flex items-center\r\n      ", children: [_jsx("input", { type: "range", title: "Adjust Slippage Tolerance", className: "border-0 h-[1px] w-[224px] rounded-none outline-none bg-white cursor-pointer", min: SLIPPAGE_MIN_BPS, max: SLIPPAGE_MAX_BPS, step: SLIPPAGE_STEP_BPS, value: bps, onChange: handleSliderChange }), _jsx("div", { className: "flex-1" }), _jsxs("div", { className: "mr-[8px] flex items-center gap-[5px] font-bold text-[12px]", children: ["Slippage:", _jsx("div", { id: "slippage", children: spRateLabel })] }), _jsx("button", { type: "button", "aria-label": "Close", onClick: handleClose, className: "\r\n          cursor-pointer w-5 text-[12px] font-bold leading-none\r\n          bg-transparent\r\n          border-0 outline-none ring-0 appearance-none\r\n          focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0\r\n          hover:bg-transparent active:bg-transparent\r\n          text-[#5981F3] hover:text-green-500\r\n        ", children: "X" })] }));
}

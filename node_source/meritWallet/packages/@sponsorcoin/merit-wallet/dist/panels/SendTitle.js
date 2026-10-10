// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/SendTitle.tsx
//
// 2026-09-22, real migration — promoted verbatim from the web app's real
// components/views/Headers/SendTitle.tsx. Zero hooks beyond PanelGate
// (already portable) — a pure, static, controlled-by-nothing component,
// so the whole thing moves.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { PanelGate } from '@sponsorcoin/spcoin-panels';
export default function SendTitle() {
    return (_jsx(PanelGate, { panel: SP_COIN_DISPLAY.SEND_TITLE, children: _jsx("div", { className: "relative shrink-0 select-none py-3 text-center", children: _jsx("h2", { className: "m-0 text-xl font-extrabold leading-tight tracking-wide text-[#5981F3] md:text-2xl", children: "Send" }) }) }));
}

// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/FeeDisclosure.tsx
//
// 2026-09-22, real migration (on request, "start with the easiest and
// move towards the hardest") — promoted verbatim from the web app's real
// components/views/TradingStationPanel/FeeDisclosure/index.tsx, not a
// placeholder rebuild. Checked before moving anything: this component has
// zero ExchangeContext coupling at all — just the already-portable
// usePanelVisible plus static text — so the whole thing moves, unlike
// every "opaque slot" split this session did for a more coupled
// component. Shared by both FEE_DISCLOSURE (Swap tab) and
// SPONSOR_FEE_DISCLOSURE (Sponsor tab) via the same panelId prop, already
// parameterized in the original file.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
export default function FeeDisclosure({ panelId = SP_COIN_DISPLAY.FEE_DISCLOSURE }) {
    const show = usePanelVisible(panelId);
    if (!show)
        return null;
    return (_jsx("div", { id: "FEE_DISCLOSURE", className: "relative top-[2px] text-left text-[#94a3b8] text-[11px]", children: "Fee Disclosures" }));
}

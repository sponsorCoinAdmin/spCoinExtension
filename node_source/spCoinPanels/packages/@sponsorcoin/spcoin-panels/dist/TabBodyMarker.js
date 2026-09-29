// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/TabBodyMarker.tsx
// 2026-09-14, on request ("put a marker on every tab... the marker is to
// be updated for every deploy in the extension package") — shared small
// corner marker rendered inside every one of MeritWallet.tsx's 5 tab-panel
// bodies (TradingStationPanel/SendTabPanel/SponsorshipPanel/
// ManageSponsorshipsPanel/WalletConfigPanel), stating which literal file
// rendered it plus packageBuildTag.ts's own PACKAGE_BUILD number — lets
// "is this tab genuinely the same component as the web app's own tab of
// the same name" be read directly off screen instead of inferred from
// spacing/layout resemblance alone (today it is NOT — each of these 5
// files is a separate, hand-built placeholder from the real app's own
// version; see each file's own header comment). One shared component
// instead of pasting the same absolute-positioned <div> five times, so a
// future style tweak (position/size/color) only needs editing once.
//
// Anchors to the nearest `position: relative` ancestor — every caller's
// own outer wrapper must set that itself (each already does, see that
// file's own root element).
'use client';
import { jsxs as _jsxs } from "react/jsx-runtime";
import { SHOW_BUILD_MARKERS } from './packageBuildTag';
export default function TabBodyMarker({ path, build }) {
    // 2026-09-15, on request — single choke point for packageBuildTag.ts's
    // own SHOW_BUILD_MARKERS flag (see that file's own doc comment), so none
    // of this component's 5 callers need their own conditional.
    if (!SHOW_BUILD_MARKERS)
        return null;
    return (_jsxs("div", { style: {
            position: 'absolute',
            top: 2,
            right: 4,
            zIndex: 999999,
            font: '9px monospace',
            color: '#475569',
            pointerEvents: 'none',
        }, children: ["\u27E8", path, " \u00B7 build ", build, "\u27E9"] }));
}

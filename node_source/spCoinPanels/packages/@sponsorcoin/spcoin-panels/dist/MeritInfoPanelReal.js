// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MeritInfoPanelReal.tsx
//
// 2026-09-22, real migration — promoted from the web app's real
// components/views/RadioOverlayPanels/MeritInfoPanel/index.tsx. Named
// MeritInfoPanelReal, not MeritInfoPanel, because this package already has
// its own separate, inert MeritInfoPanel.tsx placeholder (extension
// preview only) — same "don't silently replace a placeholder with a
// same-named real component" caution as ProcessFlowPanel.tsx/
// TransactionConfirmPanel.tsx's own relationship earlier this session.
// Nothing wires this in as a swap-in replacement; a future caller (either
// app) picks it explicitly.
//
// The one real portability wrinkle: the original fetches
// '/assets/miscellaneous/meritInfo.json' by a bare relative path, which
// resolves fine in the web app (same origin) but would NOT resolve from
// the extension's own chrome-extension:// origin (same class of gap
// sendNative.ts's own header comment already flagged for MeritServerSigner's
// relative fetch). Fixed by taking an optional baseUrl prop, defaulting to
// '' (relative — today's exact web-app behavior, zero change there);
// a future extension caller passes its own real origin, same convention
// hydrateActiveAccount.ts/accountsFeed.ts already established.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import ReadOnlyMetaDataTable from './ReadOnlyMetaDataTable';
import { getMeritInfoMetaData } from './recordFields';
export default function MeritInfoPanelReal({ panelId = SP_COIN_DISPLAY.MERIT_INFO_PANEL, baseUrl = '', }) {
    const vMeritInfoPanel = usePanelVisible(panelId);
    const [info, setInfo] = useState(undefined);
    useEffect(() => {
        if (!vMeritInfoPanel)
            return;
        let cancelled = false;
        fetch(`${baseUrl}/assets/miscellaneous/meritInfo.json`, { cache: 'no-store' })
            .then((res) => (res.ok ? res.json() : undefined))
            .then((data) => {
            if (!cancelled)
                setInfo(data);
        })
            .catch(() => {
            if (!cancelled)
                setInfo(undefined);
        });
        return () => {
            cancelled = true;
        };
    }, [vMeritInfoPanel, baseUrl]);
    if (!vMeritInfoPanel)
        return null;
    const tabs = Array.isArray(info?.tabs) ? info.tabs : [];
    const rows = getMeritInfoMetaData(info).map((f) => {
        if (!f.value)
            return { label: f.label, value: 'N/A' };
        if (f.kind === 'url') {
            return {
                label: f.label,
                value: (_jsx("a", { href: f.value, target: "_blank", rel: "noopener noreferrer", className: "underline decoration-slate-400/60 underline-offset-2 hover:decoration-slate-200 break-all", children: f.value })),
            };
        }
        return { label: f.label, value: f.value };
    });
    if (info?.description || tabs.length) {
        rows.push({
            label: 'Description',
            value: (_jsxs("div", { className: "flex flex-col gap-2", children: [info?.description ? _jsx("p", { className: "m-0", children: info.description }) : null, tabs.length ? (_jsx("ul", { className: "m-0 flex list-disc flex-col gap-1 pl-5", children: tabs.map((tab) => (_jsxs("li", { children: [_jsxs("span", { className: "font-semibold", children: [String(tab.key).toUpperCase(), ":"] }), ' ', tab.detail] }, tab.key))) })) : null] })),
        });
    }
    return (_jsx("div", { id: "MERIT_INFO_PANEL", children: _jsx(ReadOnlyMetaDataTable, { rows: rows, logoURL: `${baseUrl}/assets/miscellaneous/meritWallet.png?v=22`, logoAlt: "Merit Wallet", logoRoundedClassName: "", logoBackgroundClassName: "", logoContainerClassName: "py-[5px]", logoContainerSizeClassName: "w-full", logoSizeClassName: "w-[calc(100%-40px)] mx-auto" }) }));
}

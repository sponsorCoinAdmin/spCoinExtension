// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/TokenSelectDropDown.tsx
//
// 2026-09-18, moved in from node_source/spCoinPanels/AssetSelectDropDowns/
// (web-app-only glue) — fourth of the five real dropdown wrapper
// components. Same treatment as AccountSelectDropDown: built on
// AssetSelectDropDown directly rather than duplicated inline-style markup,
// since this component's own unique logic (icon resolution, default click
// behavior) is small relative to what it reuses.
//
// The web app's real wrapper owns two separate concerns this component
// deliberately has no knowledge of: (1) which of Swap/Sponsor/Send's own
// tradeData field (sellTokenContract/buyTokenContract/a controlled `token`
// prop) this instance is bound to, and which detail panel its icon should
// open (targetPanel — TOKEN_SELL_SWAP_PANEL vs. TOKEN_BUY_PANEL vs. plain
// TOKEN_PANEL, depending on which tab is visible); (2) the actual
// openActiveListPanel(feedType, onCommit, peerAddress) call. Both are real
// ExchangeContext-runtime concerns — this component only renders whatever
// icon/symbol/address/click-handler it's handed.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useRef } from 'react';
import { AssetSelectDropDown, ASSET_SELECT_DISPLAY } from '@sponsorcoin/spcoin-panels';
const DEFAULT_WRAPPER_STYLE = {
    position: 'absolute',
    top: 12,
    right: 20,
    minWidth: 50,
};
export default function TokenSelectDropDown({ icon, hasEntity = false, address, symbol, name, label = 'Select Token', onSelectClick, onAddressClick, showChevron = false, showDisplay, addrPrePostSize = 4, showSymbol = false, showName = false, collapseKey, onExpandedChange, restrictRowClickToChevron = false, copyLabel = 'Copy token address', style, dataPanelRoot, panelGateId, panelGate, }) {
    // Guard against re-entrancy while a previous click is still settling —
    // real behavior (not just logging, see the original's own doc comment on
    // why this survived a debug-cleanup pass), kept here since it's about
    // this component's own click affordance, not the ExchangeContext write
    // the click eventually triggers.
    const openingRef = useRef(false);
    const handleRowClick = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (openingRef.current)
            return;
        openingRef.current = true;
        setTimeout(() => {
            openingRef.current = false;
        }, 400);
        onSelectClick?.(e);
    }, [onSelectClick]);
    const resolvedShowDisplay = showDisplay ??
        (ASSET_SELECT_DISPLAY.ICON |
            ASSET_SELECT_DISPLAY.SYMBOL |
            ASSET_SELECT_DISPLAY.ADDRESS |
            ASSET_SELECT_DISPLAY.COPY |
            ASSET_SELECT_DISPLAY.ADDR_COMP |
            (showChevron ? ASSET_SELECT_DISPLAY.CHEVRON_DN : 0));
    return (_jsx("div", { style: { ...DEFAULT_WRAPPER_STYLE, ...style }, "data-panel-root": dataPanelRoot, children: _jsx(AssetSelectDropDown, { rootId: "TokenSelectDropDown", hasEntity: hasEntity, icon: icon, symbol: symbol, name: name, address: address ?? '', placeholderLabel: label, copyLabel: copyLabel, showDisplay: resolvedShowDisplay, showSymbol: showSymbol, showName: showName, onRowClick: handleRowClick, onAddressClick: onAddressClick, restrictRowClickToChevron: restrictRowClickToChevron, addrPrePostSize: addrPrePostSize, panelGateId: panelGateId, panelGate: panelGate, collapseKey: collapseKey, onExpandedChange: onExpandedChange }) }));
}

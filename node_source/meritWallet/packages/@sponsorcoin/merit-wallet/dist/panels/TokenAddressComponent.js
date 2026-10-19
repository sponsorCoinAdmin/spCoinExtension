// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/TokenAddressComponent.tsx
//
// 2026-09-22, real migration (opaque-slot split) — promoted from the web
// app's real components/views/Headers/TokenAddressComponent.tsx. Its real
// couplings were: useSellTokenContract/useBuyTokenContract/useNativeToken
// (live ExchangeContext token data — useNativeToken specifically does a
// real async API fetch keyed off the live chain id, not just a data read)
// and TokenLogo (a local component with its OWN always-on ExchangeContext-
// bound click-to-preview behavior, confirmed by reading it directly — no
// prop disables that, so it can't be ported as-is either). Neither is
// portable, so both stay local: `token` becomes a plain resolved-data
// prop (address/symbol/name/blockchainName, already-derived strings, not
// live handles) and `icon` becomes a slot the caller fills with the real
// `<TokenLogo>`, same shape TokenSelectDropDown's own portable/local split
// already established. usePanelVisible/the chevron's open/close mechanics
// stay here, genuinely portable — this component calls them directly
// (self-gating, same pattern as SwapArrowButton/ConfigSlippagePanel
// earlier this session) — only `onSelectClick` itself (what a chevron
// click actually opens) is a caller-supplied callback, since that's the
// one piece requiring the real openActiveListPanel/onCommit/peerAddress
// wiring TokenSelectDropDown's own web-app wrapper already owns.
'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { tokenAddressClass } from '@sponsorcoin/spcoin-common/styles';
import { useState } from 'react';
import { useCopyFeedback } from '../platform/useCopyFeedback';
import { Copy, Check, ChevronDown } from 'lucide-react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
export default function TokenAddressComponent({ panelId = SP_COIN_DISPLAY.TOKEN_ADDRESS_COMPONENT, address, symbol, name, blockchainName, icon, onSelectClick, }) {
    const visible = usePanelVisible(panelId);
    const tokenListVisible = usePanelVisible(SP_COIN_DISPLAY.ACTIVE_LIST_PANEL);
    const { copied, copy } = useCopyFeedback();
    const [headerVisible, setHeaderVisible] = useState(false);
    if (!visible)
        return null;
    const handleCopy = (e) => {
        e.stopPropagation();
        if (!address)
            return;
        copy(address);
    };
    return (_jsxs(_Fragment, { children: [headerVisible && (_jsxs("div", { className: tokenAddressClass.header, children: [_jsx("span", { className: tokenAddressClass.headerTitle, children: blockchainName ? `${blockchainName} Network` : 'Network' }), (symbol || name) && (_jsxs("span", { className: tokenAddressClass.headerSub, children: [symbol, name ? `: ${name}` : ''] }))] })), _jsxs("div", { className: tokenAddressClass.row, children: [_jsx("div", { className: tokenAddressClass.iconBox, children: icon }), _jsxs("div", { className: tokenAddressClass.pill, children: [_jsx("span", { className: tokenAddressClass.address, title: headerVisible ? 'Hide token info' : 'Show token info', onClick: () => setHeaderVisible((v) => !v), children: address || '—' }), _jsx("button", { type: "button", onClick: onSelectClick, className: tokenAddressClass.selectButton, "aria-label": tokenListVisible ? 'Close token list' : 'Select token', children: _jsx(ChevronDown, { className: tokenAddressClass.chevron(tokenListVisible) }) })] }), _jsx("button", { type: "button", onClick: handleCopy, disabled: !address, className: tokenAddressClass.copyButton, "aria-label": "Copy token contract address", title: "Copy token contract address", children: copied
                            ? _jsx(Check, { className: tokenAddressClass.copied })
                            : _jsx(Copy, { className: tokenAddressClass.copy }) })] })] }));
}

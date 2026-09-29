// File: src/ExchangeButton.tsx
// Portable ExchangeButton presentation shell (2026-09-27, Phase 4
// TRADING_STATION_PANEL). Accepts all non-portable state-machine values as
// props — the caller (web app or extension) derives buttonType, buttonText,
// bgClass, disabled, busy, and click handlers from its own context-bound
// state (useSwapFunctions, useSponsorMode, useExchangeContext, stores, etc.)
// and passes the StakeConfirmPopup as a serialized ReactNode slot.
'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import ActionButton from './ActionButton';
export default function ExchangeButton({ id, buttonType: _buttonType, buttonText, bgClass, onClick, disabled, busy, warnOnHover, hoverText, endAdornment, confirmPopup, }) {
    return (_jsxs(_Fragment, { children: [_jsx(ActionButton, { id: id ?? 'ExchangeButton', text: buttonText, bgClass: bgClass, onClick: onClick, disabled: disabled, busy: busy, endAdornment: endAdornment, warnOnHover: warnOnHover, hoverText: hoverText }), confirmPopup ?? null] }));
}

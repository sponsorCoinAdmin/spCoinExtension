// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/WalletHeader.tsx
// Portable copy of components/views/WalletHeader.tsx (2026-09-11, "Pages
// Grey header bar" slice — see docs/design/extensionPlan.md). No sync/state
// plumbing here at all, deliberately (on request) — this is presentation
// only: refresh/close are injected callbacks, exactly like the app's own
// version already had them (nothing to decouple there). Rewritten with
// plain inline styles instead of Tailwind classes (2026-09-11, on request
// — see MeritTitleComponent.tsx's own header comment, point 3, for the
// full reasoning: a component library shouldn't require every consumer to
// run a Tailwind pipeline just to render correctly). Hover/spin states use
// local component state + a tiny inline <style> for the keyframes, rather
// than an external stylesheet a CJS package build can't easily ship.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { APP_TYPE } from '@sponsorcoin/spcoin-common';
import MeritTitleComponent from './MeritTitleComponent';
const DEFAULT_ICON_SRC = '/assets/miscellaneous/spCoin.png';
const iconButtonBaseStyle = {
    display: 'flex',
    height: 30,
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    appearance: 'none',
    border: 'none',
    background: 'transparent',
    padding: 0,
    cursor: 'pointer',
    transition: 'opacity 120ms ease',
};
function IconButton({ onClick, disabled, ariaLabel, children, }) {
    const [hovered, setHovered] = useState(false);
    return (_jsx("button", { type: "button", onClick: onClick, disabled: disabled, "aria-label": ariaLabel, title: ariaLabel, onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), style: {
            ...iconButtonBaseStyle,
            opacity: disabled ? 0.5 : hovered ? 0.7 : 1,
        }, children: children }));
}
export default function WalletNetworkHeader({ mode, title, leftSlot, iconSrc = DEFAULT_ICON_SRC, titleBadgeSrc, showTitleBadge = true, onTitleClick, onRefresh, refreshing, refreshAriaLabel, closeAriaLabel, onClose, appType, wwwIconSrc, closeIconSrc, }) {
    const isSelection = mode === 'selection';
    // 2026-09-21 — explicit override wins; otherwise appType decides
    // (EXTENSION -> wwwIconSrc, everything else -> the default X below).
    const resolvedCloseIconSrc = closeIconSrc ?? (appType === APP_TYPE.EXTENSION ? wwwIconSrc : undefined);
    return (_jsxs("div", { style: {
            position: 'relative',
            // 2026-09-21, on direct request — was 'transparent', silently
            // inheriting whatever sat behind it (the extension's dark navy
            // wallet background, since this component has no PARENT
            // background of its own to fall back to the way the web app's
            // own SEPARATE `components/views/Headers/WalletNetworkPanel.tsx`
            // does with its own hardcoded `bg-[#77808e]`). This is the one,
            // real header color both apps should show — not two
            // implementations quietly drifting apart. See that file's own
            // outer container for the source of this exact value.
            background: '#77808e',
            // 2026-09-22, on direct request — 6px (was 16px). Both apps now
            // read this one file (see WalletAccountHeader.tsx's own matching
            // value below it — that one's real content padding, not a
            // separate component this needs to stay in sync with anymore).
            padding: '0 6px 2px 6px',
        }, children: [_jsx("style", { children: '@keyframes spcoinWalletHeaderSpin { to { transform: rotate(360deg); } }' }), _jsxs("div", { style: { display: 'flex', alignItems: 'flex-end' }, children: [_jsx("div", { style: { display: 'flex', flexShrink: 0, alignItems: 'center' }, children: leftSlot ?? (_jsx("span", { style: {
                                display: 'flex',
                                height: 30,
                                width: 30,
                                flexShrink: 0,
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                background: 'transparent',
                            }, children: _jsx("img", { src: iconSrc, alt: "SponsorCoin", width: 30, height: 30, style: { height: '100%', width: '100%', objectFit: 'contain' } }) })) }), _jsx("h2", { style: {
                            pointerEvents: 'none',
                            marginTop: 0,
                            marginBottom: 0,
                            minWidth: 0,
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textAlign: 'center',
                            fontSize: 15,
                            fontWeight: 700,
                            lineHeight: 1.25,
                            color: '#e2e8f0',
                        }, children: title ??
                            (isSelection ? ('Select Active Account') : (_jsx(MeritTitleComponent, { badgeSrc: titleBadgeSrc, showBadge: showTitleBadge, onTitleClick: onTitleClick }))) }), _jsxs("div", { style: { display: 'flex', flexShrink: 0, alignItems: 'center' }, children: [_jsx(IconButton, { onClick: onRefresh, disabled: refreshing, ariaLabel: refreshAriaLabel ?? (isSelection ? 'Refresh accounts' : 'Refresh wallet'), children: _jsx(RefreshCw, { style: {
                                        height: 18,
                                        width: 18,
                                        color: '#1f2937',
                                        animation: refreshing ? 'spcoinWalletHeaderSpin 1s linear infinite' : undefined,
                                    }, strokeWidth: 1.5 }) }), _jsx(IconButton, { onClick: onClose, ariaLabel: closeAriaLabel ?? (isSelection ? 'Close account selection' : 'Close Merit Wallet'), children: resolvedCloseIconSrc ? (_jsx("img", { src: resolvedCloseIconSrc, alt: "", style: { height: 22, width: 22, objectFit: 'contain' } })) : (_jsx(X, { style: { height: 24, width: 24, color: '#1f2937' }, strokeWidth: 1.5 })) })] })] })] }));
}

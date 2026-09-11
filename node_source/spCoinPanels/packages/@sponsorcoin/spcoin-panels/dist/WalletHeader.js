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
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WalletHeader;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const MeritTitleComponent_1 = __importDefault(require("./MeritTitleComponent"));
const DEFAULT_ICON_SRC = '/assets/miscellaneous/spCoin.png';
const iconButtonBaseStyle = {
    display: 'flex',
    height: 44,
    width: 44,
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
    const [hovered, setHovered] = (0, react_1.useState)(false);
    return ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClick, disabled: disabled, "aria-label": ariaLabel, title: ariaLabel, onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), style: {
            ...iconButtonBaseStyle,
            opacity: disabled ? 0.5 : hovered ? 0.7 : 1,
        }, children: children }));
}
function WalletHeader({ mode, title, leftSlot, iconSrc = DEFAULT_ICON_SRC, titleBadgeSrc, onTitleClick, onRefresh, refreshing, refreshAriaLabel, closeAriaLabel, onClose, }) {
    const isSelection = mode === 'selection';
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            position: 'relative',
            background: '#77808e',
            paddingLeft: 16,
            paddingRight: 10,
            paddingTop: 6,
            paddingBottom: 1,
        }, children: [(0, jsx_runtime_1.jsx)("style", { children: '@keyframes spcoinWalletHeaderSpin { to { transform: rotate(360deg); } }' }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexShrink: 0, alignItems: 'center' }, children: leftSlot !== null && leftSlot !== void 0 ? leftSlot : ((0, jsx_runtime_1.jsx)("span", { style: {
                                display: 'flex',
                                height: 44,
                                width: 44,
                                flexShrink: 0,
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                background: 'transparent',
                            }, children: (0, jsx_runtime_1.jsx)("img", { src: iconSrc, alt: "SponsorCoin", width: 44, height: 44, style: { height: '100%', width: '100%', objectFit: 'contain' } }) })) }), (0, jsx_runtime_1.jsx)("h2", { style: {
                            pointerEvents: 'none',
                            marginTop: -10,
                            marginBottom: 0,
                            minWidth: 0,
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textAlign: 'center',
                            fontSize: 24,
                            fontWeight: 700,
                            lineHeight: 1.25,
                            color: '#e2e8f0',
                        }, children: title !== null && title !== void 0 ? title : (isSelection ? ('Select Active Account') : ((0, jsx_runtime_1.jsx)(MeritTitleComponent_1.default, { badgeSrc: titleBadgeSrc, onTitleClick: onTitleClick }))) }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexShrink: 0, alignItems: 'center' }, children: [(0, jsx_runtime_1.jsx)(IconButton, { onClick: onRefresh, disabled: refreshing, ariaLabel: refreshAriaLabel !== null && refreshAriaLabel !== void 0 ? refreshAriaLabel : (isSelection ? 'Refresh accounts' : 'Refresh wallet'), children: (0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { style: {
                                        height: 28,
                                        width: 28,
                                        color: '#1f2937',
                                        animation: refreshing ? 'spcoinWalletHeaderSpin 1s linear infinite' : undefined,
                                    }, strokeWidth: 1.5 }) }), (0, jsx_runtime_1.jsx)(IconButton, { onClick: onClose, ariaLabel: closeAriaLabel !== null && closeAriaLabel !== void 0 ? closeAriaLabel : (isSelection ? 'Close account selection' : 'Close Merit Wallet'), children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { style: { height: 38, width: 38, color: '#1f2937' }, strokeWidth: 1.5 }) })] })] })] }));
}

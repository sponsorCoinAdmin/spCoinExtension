// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/FloatingSelectPopup.tsx
//
// 2026-09-23 — promoted from components/views/RadioOverlayPanels/ListSelectPanels/
// FloatingSelectPopup.tsx (the Deployment card's "Select Network" popup's shell).
// Zero coupling beyond already-portable pieces: useDraggablePopup (a pure
// mouse-tracking hook, no web-only deps) and WalletNetworkHeader (already in
// this package). Same opaque-slot pattern as every other migration this
// session — the shell is portable, only the per-caller content (the list
// rows, the auth toggles, the network options) stays in the web app.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useDraggablePopup } from './useDraggablePopup';
import WalletNetworkHeader from './WalletHeader';
/**
 * Single source of truth for the floating, draggable "popup with a grey
 * title bar + X" shell. Previously each consumer (TokenListOverlay,
 * NetworkSelectionPopup, DetailPanelOverlays) hand-rolled its own copy.
 */
export default function FloatingSelectPopup({ open, title, onClose, leftSlot, onRefresh, refreshing, closeOnBackdropClick = false, zIndexClassName = 'z-[9000]', minHeightClassName = 'min-h-[300px]', bodyOverflow = 'hidden', ariaLabel, children, }) {
    const { pos, isDragging, onHeaderMouseDown, resetPos } = useDraggablePopup();
    React.useEffect(() => {
        if (open)
            resetPos();
    }, [open, resetPos]);
    if (!open)
        return null;
    return (_jsx("div", { className: `fixed inset-0 ${zIndexClassName} flex items-center justify-center bg-black/60`, onMouseDown: closeOnBackdropClick ? onClose : undefined, children: _jsxs("div", { className: `flex max-h-[min(650px,calc(100vh-230px))] w-[min(520px,calc(100vw-2rem))] ${minHeightClassName} flex-col overflow-hidden rounded-[15px] border border-[#2e3654] bg-[#0b0e19] text-white shadow-2xl [&_*]:[scrollbar-width:none] [&_*::-webkit-scrollbar]:hidden`, style: { transform: `translate(${pos.x}px, ${pos.y}px)` }, onMouseDown: (e) => e.stopPropagation(), role: "dialog", "aria-modal": "true", "aria-label": ariaLabel ?? title, children: [_jsx("div", { onMouseDown: onHeaderMouseDown, className: `select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`, children: _jsx(WalletNetworkHeader, { mode: "normal", title: title, leftSlot: leftSlot, onRefresh: onRefresh, refreshing: refreshing, refreshAriaLabel: `Refresh ${title.toLowerCase()}`, closeAriaLabel: `Close ${title.toLowerCase()}`, onClose: onClose }) }), _jsx("div", { className: `min-h-0 flex-1 ${bodyOverflow === 'auto'
                        ? 'scrollbar-hide overflow-y-auto overscroll-contain'
                        : 'flex flex-col overflow-hidden'}`, children: children })] }) }));
}

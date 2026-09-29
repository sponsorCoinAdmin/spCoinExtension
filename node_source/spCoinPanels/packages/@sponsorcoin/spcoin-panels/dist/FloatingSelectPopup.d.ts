import React from 'react';
export interface FloatingSelectPopupProps {
    open: boolean;
    title: string;
    onClose: () => void;
    /** Passed straight through to WalletHeader's own `leftSlot` — omit for
     *  the default spCoin-logo badge. */
    leftSlot?: React.ReactNode;
    onRefresh?: () => void;
    refreshing?: boolean;
    closeOnBackdropClick?: boolean;
    zIndexClassName?: string;
    minHeightClassName?: string;
    bodyOverflow?: 'hidden' | 'auto';
    ariaLabel?: string;
    children: React.ReactNode;
}
/**
 * Single source of truth for the floating, draggable "popup with a grey
 * title bar + X" shell. Previously each consumer (TokenListOverlay,
 * NetworkSelectionPopup, DetailPanelOverlays) hand-rolled its own copy.
 */
export default function FloatingSelectPopup({ open, title, onClose, leftSlot, onRefresh, refreshing, closeOnBackdropClick, zIndexClassName, minHeightClassName, bodyOverflow, ariaLabel, children, }: FloatingSelectPopupProps): React.JSX.Element | null;

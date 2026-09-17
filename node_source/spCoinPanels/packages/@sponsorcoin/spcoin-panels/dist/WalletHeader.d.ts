import React from 'react';
type WalletHeaderMode = 'selection' | 'normal';
export interface WalletHeaderProps {
    mode: WalletHeaderMode;
    /** Normal mode: falls back to the default MeritTitleComponent badge+label
     *  when omitted. Selection mode: falls back to 'Select Active Account'. */
    title?: React.ReactNode;
    /** Omit for the default spCoin-logo badge. */
    leftSlot?: React.ReactNode;
    /** Src for the default leftSlot badge (only used when leftSlot is
     *  omitted). Defaults to the app's own hosted asset — override for any
     *  consumer that can't reach that origin. */
    iconSrc?: string;
    /** Src for MeritTitleComponent's own badge (only used when both leftSlot
     *  and title are omitted, i.e. the true default-normal-mode render). */
    titleBadgeSrc?: string;
    /** Forwarded to MeritTitleComponent — omit for an inert (non-clickable)
     *  default title. */
    onTitleClick?: () => void;
    onRefresh?: () => void;
    refreshing?: boolean;
    refreshAriaLabel?: string;
    closeAriaLabel?: string;
    onClose: () => void;
    /** 2026-09-14, on request ("the close X is fine in the web, but it has
     *  no purpose in the extension") — a standalone dismiss has nothing to
     *  reveal underneath in a Chrome side panel (unlike the web app's own
     *  floating overlay, where closing uncovers the page behind it), so a
     *  consumer whose "close" really means "open the real web app instead"
     *  passes an image here to swap for the default X icon. `onClose` still
     *  fires either way — only the icon changes; what "close" actually does
     *  is entirely the caller's own choice (see sidepanel.ts's own use,
     *  where it's rewired to the exact same handler as the Open button). */
    closeIconSrc?: string;
}
export default function WalletHeader({ mode, title, leftSlot, iconSrc, titleBadgeSrc, onTitleClick, onRefresh, refreshing, refreshAriaLabel, closeAriaLabel, onClose, closeIconSrc, }: WalletHeaderProps): import("react/jsx-runtime").JSX.Element;
export {};

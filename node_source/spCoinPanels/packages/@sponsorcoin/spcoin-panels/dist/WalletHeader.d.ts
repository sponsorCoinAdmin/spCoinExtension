import React from 'react';
import { APP_TYPE } from '@sponsorcoin/spcoin-common';
type WalletNetworkHeaderMode = 'selection' | 'normal';
export interface WalletNetworkHeaderProps {
    mode: WalletNetworkHeaderMode;
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
    /** Whether to show the Merit badge in the default title. */
    showTitleBadge?: boolean;
    /** Forwarded to MeritTitleComponent — omit for an inert (non-clickable)
     *  default title. */
    onTitleClick?: () => void;
    onRefresh?: () => void;
    refreshing?: boolean;
    refreshAriaLabel?: string;
    closeAriaLabel?: string;
    onClose: () => void;
    /** 2026-09-21, on direct request — the platform this component is
     *  running in, the real source of truth for which close icon renders
     *  (`appType === EXTENSION` → `wwwIconSrc`, everything else → the
     *  default X). Replaces asking every caller to remember to pass the
     *  right icon manually (the class of bug that caused a real live
     *  regression: this exact icon silently reverted to the default X in
     *  the extension when a caller's own override was accidentally
     *  dropped). Optional — omitted (or any non-EXTENSION value, including
     *  the not-yet-wired I_PHONE/ANDROID) falls back to the default X,
     *  matching every current web-app caller's own existing behavior
     *  exactly, so nothing had to change there for this to land safely. */
    appType?: APP_TYPE;
    /** 2026-09-14, on request ("the close X is fine in the web, but it has
     *  no purpose in the extension") — a standalone dismiss has nothing to
     *  reveal underneath in a Chrome side panel (unlike the web app's own
     *  floating overlay, where closing uncovers the page behind it), so a
     *  consumer whose "close" really means "open the real web app instead"
     *  supplies this image, shown only when `appType === EXTENSION` (see
     *  above). `onClose` still fires either way — only the icon changes;
     *  what "close" actually does is entirely the caller's own choice (see
     *  sidepanel.ts's own use, where it's rewired to the exact same
     *  handler as the removed Open button). Only this package's own
     *  callers can resolve the real asset URL (`chrome.runtime.getURL`),
     *  so this stays an injected prop rather than something `appType`
     *  alone could resolve internally. */
    wwwIconSrc?: string;
    /** Explicit manual override, still supported for a consumer with a
     *  reason to show something other than either of the two `appType`-
     *  driven choices above — takes priority over both when set. */
    closeIconSrc?: string;
}
export default function WalletNetworkHeader({ mode, title, leftSlot, iconSrc, titleBadgeSrc, showTitleBadge, onTitleClick, onRefresh, refreshing, refreshAriaLabel, closeAriaLabel, onClose, appType, wwwIconSrc, closeIconSrc, }: WalletNetworkHeaderProps): React.JSX.Element;
export {};

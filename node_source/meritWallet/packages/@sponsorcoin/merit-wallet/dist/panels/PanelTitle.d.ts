import React from 'react';
export interface PanelTitleProps {
    /** Centered title text. Defaults to the app's own default post-boot
     *  panel (Trading Station — see PanelBootstrap.tsx) since that's the
     *  only title this component has a real default for without a live
     *  panel-tree to compute one from. */
    title?: React.ReactNode;
    /** Omit for an inert back button (no panel tree to go back in yet). */
    onBackClick?: () => void;
    /** Omit for an inert menu button. */
    onMenuClick?: () => void;
    /** Purely visual — highlights the menu button while whatever it opens
     *  (e.g. MenuTabHeaderBar) is open. No effect on behavior. */
    menuOpen?: boolean;
    /** 2026-10-03, on request — render nothing (not an inert button) where the
     *  back button goes. A same-width spacer keeps the title centered. Used while
     *  the password panel is active: there is nothing to go back to before the
     *  wallet is unlocked. */
    hideBackButton?: boolean;
    /** Same, for the hamburger menu button on the right. */
    hideMenuButton?: boolean;
}
export default function PanelTitle({ title, onBackClick, onMenuClick, menuOpen, hideBackButton, hideMenuButton, }: PanelTitleProps): React.JSX.Element;

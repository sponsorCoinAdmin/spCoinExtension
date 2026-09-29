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
}
export default function PanelTitle({ title, onBackClick, onMenuClick, menuOpen, }: PanelTitleProps): React.JSX.Element;

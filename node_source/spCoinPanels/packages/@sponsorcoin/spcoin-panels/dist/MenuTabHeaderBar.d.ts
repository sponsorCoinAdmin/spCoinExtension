import React from 'react';
export type MenuTabKey = 'SWAP' | 'SEND' | 'SPONSOR' | 'REWARDS' | 'CONFIG';
export interface TabRowProps {
    /** The tab row's own visibility — true expands the strip, false
     *  collapses it to nothing (matches the real component's slide
     *  transition). Defaults to true. */
    open?: boolean;
    /** Which tab reads as active. Defaults to 'SWAP' — the app's own default
     *  post-boot panel (see PanelBootstrap.tsx). Pass `null` explicitly
     *  (2026-09-22, for the web app's own AccountPanelTabBar.tsx, whose
     *  `activeKey` really can be null — e.g. while an overlay covers the
     *  tabs with no snapshot to restore) for "no tab currently reads as
     *  active," distinct from omitting the prop entirely (which falls back
     *  to the 'SWAP' default below). */
    activeTab?: MenuTabKey | null;
    /** Omit for an inert strip with nothing wired to tab clicks yet. */
    onTabClick?: (tab: MenuTabKey) => void;
    /** 2026-09-22, added for the web app's own real wallet-lock gate
     *  (useSpCoinWallet in AccountPanelTabBar.tsx) — disables every tab
     *  button (including Config) and swaps each one's tooltip for
     *  `disabledTitle`. Omit (default false) for a consumer with no such
     *  gate — e.g. the extension, which has no wallet-lock concept today. */
    disabled?: boolean;
    /** Tooltip shown on every tab while `disabled` is true. */
    disabledTitle?: string;
}
export interface MenuTabHeaderBarProps extends TabRowProps {
    /**
     * The active tab's own body (e.g. TradingStationPanel/SendTabPanel) —
     * 2026-09-12, on request ("this should be a library fix", after the
     * scroll-boundary bug was first patched in the extension's own HTML
     * instead). In the real app, MENU_TAB_HEADER_BAR's own tab strip
     * (AccountPanelTabBar.tsx) stays fixed while WalletRadioPanels — a
     * SEPARATE sibling, not part of this component there — scrolls
     * independently beneath it. This component takes on that pairing
     * directly: `children` renders in its own bounded, vertically-scrolling
     * region below the (fixed) tab row, so a consumer gets the correct
     * scroll boundary for free instead of having to reconstruct the
     * fixed-header/scrollable-body split by hand in page-level CSS (the
     * mistake made the first time — the extension's own #content-scroll
     * wrapped the tab bar AND the header rows above it AND this body all in
     * one scrolling region, so scrolling dragged the whole wallet, headers
     * included, off screen instead of just the body). Omit for a
     * height-collapsing tab strip with nothing beneath it.
     */
    children?: React.ReactNode;
}
/** The tab strip itself — see this file's own header comment for why it's
 *  exported separately from MenuTabHeaderBar. */
export declare function TabRow({ open, activeTab, onTabClick, disabled, disabledTitle, }: TabRowProps): React.JSX.Element;
export default function MenuTabHeaderBar({ open, activeTab, onTabClick, disabled, disabledTitle, children, }: MenuTabHeaderBarProps): React.JSX.Element;

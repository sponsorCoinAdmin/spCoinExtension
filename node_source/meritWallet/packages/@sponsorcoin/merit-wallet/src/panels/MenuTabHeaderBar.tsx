// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MenuTabHeaderBar.tsx
// Portable shell for MENU_TAB_HEADER_BAR (2026-09-12, reworked 2026-09-22 —
// see WalletHeader.tsx's own "opaque slot" precedent). The real app's tab
// strip (components/views/RadioOverlayPanels/AccountPanel/
// AccountPanelTabBar.tsx) has two things this file didn't originally have:
// a real wallet-lock gate (useSpCoinWallet, disables the tabs and swaps
// their tooltip while locked — its own doc comment there calls this
// "purely a visual/UX nicety," the real enforcement lives centrally in
// panelTreeCallbacks.ts's openPanel), and a separate sibling body
// component (WalletRadioPanels.tsx) rather than this file's own fused
// `children` wrapper below. `TabRow` is now exported separately so the
// web app can reuse this file's own tab-button markup/padding directly
// (via its own `disabled`/`disabledTitle` props, which express the gate
// without this shell needing to know anything about wallet locking
// itself) while keeping its own separate body component untouched —
// `MenuTabHeaderBar` itself stays exactly as it always was, a thin
// TabRow + scrollable-body composite, unchanged for the extension's own
// call site (MeritWallet.tsx here).
//
// Sizing scaled down from the real app's min-w-[92px]/px-4 py-2 tabs to
// this panel's own established compact scale, matching AgentSelectDropDown/
// NetworkSelectDropDown's font sizes rather than copying the popup-sized
// numbers verbatim.

'use client';

import { walletColors, walletTints } from '@sponsorcoin/spcoin-common/styles';
import React, { useState } from 'react';

export type MenuTabKey = 'SWAP' | 'SEND' | 'SPONSOR' | 'REWARDS' | 'CONFIG';

const TABS: ReadonlyArray<{ key: Exclude<MenuTabKey, 'CONFIG'>; label: string }> = [
  { key: 'SWAP', label: 'Swap' },
  { key: 'SEND', label: 'Send' },
  { key: 'SPONSOR', label: 'Sponsor' },
  { key: 'REWARDS', label: 'Rewards' },
];

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

function TabButton({
  label,
  active,
  onClick,
  disabled,
  title,
}: {
  label: string;
  active: boolean;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        // 2026-09-22, on live report ("why is the tab styling different
        // between the web app and the extension") — the exact same
        // box-sizing pitfall already caught and fixed in PanelTitle.tsx
        // (see that file's own comment): `minWidth` + `padding` + `border`
        // compute a DIFFERENT total rendered width depending on the
        // ambient box-sizing default, and this component never had the
        // defensive fix PanelTitle.tsx got at the time. The web app's
        // Tailwind preflight forces border-box globally; the extension has
        // no such guarantee for a plain inline-styled button — explicit
        // here removes the dependency on either app's ambient CSS.
        boxSizing: 'border-box',
        display: 'inline-flex',
        minWidth: 62,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        borderRadius: '6px 6px 0 0',
        border: '1px solid',
        borderColor: active ? walletColors.oneOffAccentDeep : walletTints.oneOffSlateDarkTint70,
        background: active ? walletColors.panel : hovered ? walletColors.oneOffSurfaceInk : walletColors.oneOffSurfaceDeep,
        color: active ? walletColors.oneOffAccentMist : walletColors.textSoft,
        padding: '5px 8px',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.08em',
        cursor: disabled ? 'not-allowed' : onClick ? 'pointer' : 'default',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

/** The tab strip itself — see this file's own header comment for why it's
 *  exported separately from MenuTabHeaderBar. */
export function TabRow({
  open = true,
  activeTab = 'SWAP',
  onTabClick,
  disabled = false,
  disabledTitle,
}: TabRowProps) {
  const handleClick = (tab: MenuTabKey) =>
    onTabClick && !disabled ? () => onTabClick(tab) : undefined;

  return (
    <div
      style={{
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'max-height 300ms ease-in-out, opacity 300ms ease-in-out',
        maxHeight: open ? 60 : 0,
        opacity: open ? 1 : 0,
      }}
    >
      {/* 2026-09-12 — matches the real app's own AccountPanelTabBar.tsx
          exactly: `overflow-x-auto` (real, functional horizontal scroll —
          removing it entirely was an overcorrection; a caller narrower
          than the tab strip's natural width must still be able to reach
          every tab) + `scrollbar-hide` (the VISIBLE bar hidden via the
          standard cross-browser trick — scrollbarWidth/msOverflowStyle
          inline, ::-webkit-scrollbar via the scoped <style> below, since
          pseudo-elements can't be targeted with inline styles). Two
          different asks — "remove the scroll" vs. "remove the scrollBAR"
          — conflated once already; this is the real app's own answer to
          the second one specifically. */}
      <style>{'.spcoinMenuTabScroll::-webkit-scrollbar, .spcoinMenuTabBodyScroll::-webkit-scrollbar { display: none; }'}</style>
      <div
        className="spcoinMenuTabScroll"
        style={{
          // Defensive, same reasoning as TabButton's own boxSizing above —
          // this row pairs its own left/right padding with its content, so
          // it's just as exposed to the ambient box-sizing pitfall.
          boxSizing: 'border-box',
          display: 'flex',
          flexWrap: 'nowrap',
          alignItems: 'center',
          gap: 4,
          borderBottom: '1px solid rgba(51,65,85,0.7)',
          // 2026-09-22, on direct request — 6px (was 8), matching the two
          // header rows' own canonical left/right buffer (WalletHeader.tsx/
          // WalletAccountHeader.tsx). Top/bottom padding and every
          // TabButton's own per-button metrics are untouched.
          paddingLeft: 6,
          paddingRight: 6,
          paddingTop: 4,
          paddingBottom: 4,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {TABS.map((tab) => (
          <TabButton
            key={tab.key}
            label={tab.label}
            active={activeTab === tab.key}
            onClick={handleClick(tab.key)}
            disabled={disabled}
            title={disabled ? disabledTitle : undefined}
          />
        ))}
        <TabButton
          label="Config"
          active={activeTab === 'CONFIG'}
          onClick={handleClick('CONFIG')}
          disabled={disabled}
          title={disabled ? disabledTitle : undefined}
        />
      </div>
    </div>
  );
}

export default function MenuTabHeaderBar({
  open = true,
  activeTab = 'SWAP',
  onTabClick,
  disabled,
  disabledTitle,
  children,
}: MenuTabHeaderBarProps) {
  return (
    // 2026-09-12 — this outer element is now the flex column that owns
    // the fixed-tab-row/scrollable-body split; it needs to actually be
    // GIVEN the remaining vertical space by its own parent (flex:1 or an
    // explicit height) to have anything to distribute — a plain block
    // parent leaves this shrunk to content height, and the inner
    // scrollable div below never gets a bounded height to scroll within.
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, overflow: 'hidden' }}>
      <TabRow
        open={open}
        activeTab={activeTab}
        onTabClick={onTabClick}
        disabled={disabled}
        disabledTitle={disabledTitle}
      />
      {/* The scrollable body — matches the real app's WalletRadioPanels
          (a sibling of AccountPanelTabBar there, folded into this
          component here): flex:1/minHeight:0 lets it claim exactly the
          space left over after the fixed tab row above, overflow-y:auto
          scrolls ONLY this region, overflow-x:hidden per the same CSS-
          spec gotcha documented on the extension's own #content-scroll
          (one axis set non-`visible` silently makes the other `auto`
          too). Not tied to `open` — in the real app the body's own
          visibility (WALLET_RADIO_PANELS) is independent of the tab strip's
          collapse state (MENU_TAB_HEADER_BAR), so it doesn't collapse
          away when the tab row above it does either.
          scrollbarWidth/msOverflowStyle + the .spcoinMenuTabBodyScroll
          ::-webkit-scrollbar rule (in TabRow's own <style> above) hide the
          visible bar — confirmed the real WalletRadioPanels.tsx uses the
          exact same pairing (`flex-1 overflow-y-auto` + its own
          `scrollbar-hide` class): it scrolls exactly like this, it just
          never shows a visible bar doing it. Missing this (not a layout
          bug) was the actual cause of "the extension shows a scrollbar
          the web page doesn't" — both genuinely scroll the same way. */}
      {children && (
        <div
          className="spcoinMenuTabBodyScroll"
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

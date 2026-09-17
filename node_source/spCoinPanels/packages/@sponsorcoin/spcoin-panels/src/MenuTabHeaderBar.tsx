// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MenuTabHeaderBar.tsx
// Portable placeholder for MENU_TAB_HEADER_BAR (2026-09-12). The real app's
// MENU_TAB_HEADER_BAR panel is just a visibility flag (no children of its
// own — see panelRegistry.ts's own comment); its actual visual content is
// components/views/RadioOverlayPanels/AccountPanel/AccountPanelTabBar.tsx,
// the Swap/Send/Sponsor/Rewards/Config tab strip, whose `open` prop reads
// that same flag. Real tab clicks there open real radio panels
// (TRADING_STATION_PANEL, SEND_PANEL, etc.) and check a real wallet-lock
// gate (useSpCoinWallet) — none of which exist in a standalone consumer
// (the extension, today). This is the same tab-strip shape, entirely
// inert unless the caller wires `onTabClick` — same "presentation only,
// no sync yet" scope every other extension-bound component here follows.
// Inline styles (no Tailwind), same reasoning as every sibling component.
//
// Sizing scaled down from the real app's min-w-[92px]/px-4 py-2 tabs to
// this panel's own established compact scale, matching AgentSelectDropDown/
// NetworkSelectDropDown's font sizes rather than copying the popup-sized
// numbers verbatim.

'use client';

import React, { useState } from 'react';

export type MenuTabKey = 'SWAP' | 'SEND' | 'SPONSOR' | 'REWARDS' | 'CONFIG';

const TABS: ReadonlyArray<{ key: Exclude<MenuTabKey, 'CONFIG'>; label: string }> = [
  { key: 'SWAP', label: 'Swap' },
  { key: 'SEND', label: 'Send' },
  { key: 'SPONSOR', label: 'Sponsor' },
  { key: 'REWARDS', label: 'Rewards' },
];

export interface MenuTabHeaderBarProps {
  /** MENU_TAB_HEADER_BAR's own visibility — true expands the strip, false
   *  collapses it to nothing (matches the real component's slide
   *  transition). Defaults to true (today's look before anything toggles
   *  it). */
  open?: boolean;
  /** Which tab reads as active. Defaults to 'SWAP' — the app's own default
   *  post-boot panel (see PanelBootstrap.tsx). */
  activeTab?: MenuTabKey;
  /** Omit for an inert strip with nothing wired to tab clicks yet. */
  onTabClick?: (tab: MenuTabKey) => void;
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
}: {
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        minWidth: 62,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        borderRadius: '6px 6px 0 0',
        border: '1px solid',
        borderColor: active ? '#596fe8' : 'rgba(51,65,85,0.7)',
        background: active ? '#243056' : hovered ? '#1a2034' : '#11162a',
        color: active ? '#9db0ff' : '#cbd5e1',
        padding: '5px 8px',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.08em',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {label}
    </button>
  );
}

export default function MenuTabHeaderBar({
  open = true,
  activeTab = 'SWAP',
  onTabClick,
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
          display: 'flex',
          flexWrap: 'nowrap',
          alignItems: 'center',
          gap: 4,
          borderBottom: '1px solid rgba(51,65,85,0.7)',
          paddingLeft: 8,
          paddingRight: 8,
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
            onClick={onTabClick ? () => onTabClick(tab.key) : undefined}
          />
        ))}
        <TabButton
          label="Config"
          active={activeTab === 'CONFIG'}
          onClick={onTabClick ? () => onTabClick('CONFIG') : undefined}
        />
      </div>
      </div>
      {/* The scrollable body — matches the real app's WalletRadioPanels
          (a sibling of AccountPanelTabBar there, folded into this
          component here): flex:1/minHeight:0 lets it claim exactly the
          space left over after the fixed tab row above, overflow-y:auto
          scrolls ONLY this region, overflow-x:hidden per the same CSS-
          spec gotcha documented on the extension's own #content-scroll
          (one axis set non-`visible` silently makes the other `auto`
          too). Not tied to `open` — in the real app the body's own
          visibility (RADIO_PANELS) is independent of the tab strip's
          collapse state (MENU_TAB_HEADER_BAR), so it doesn't collapse
          away when the tab row above it does either.
          scrollbarWidth/msOverflowStyle + the .spcoinMenuTabBodyScroll
          ::-webkit-scrollbar rule above hide the visible bar — confirmed
          the real WalletRadioPanels.tsx uses the exact same pairing
          (`flex-1 overflow-y-auto` + its own `scrollbar-hide` class): it
          scrolls exactly like this, it just never shows a visible bar
          doing it. Missing this (not a layout bug) was the actual cause
          of "the extension shows a scrollbar the web page doesn't" —
          both genuinely scroll the same way. */}
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

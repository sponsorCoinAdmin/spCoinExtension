// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/TokenSelectDropDown.tsx
//
// 2026-09-18, moved in from node_source/spCoinPanels/AssetSelectDropDowns/
// (web-app-only glue) — fourth of the five real dropdown wrapper
// components. Same treatment as AccountSelectDropDown: built on
// AssetSelectDropDown directly rather than duplicated inline-style markup,
// since this component's own unique logic (icon resolution, default click
// behavior) is small relative to what it reuses.
//
// The web app's real wrapper owns two separate concerns this component
// deliberately has no knowledge of: (1) which of Swap/Sponsor/Send's own
// tradeData field (sellTokenContract/buyTokenContract/a controlled `token`
// prop) this instance is bound to, and which detail panel its icon should
// open (targetPanel — TOKEN_SELL_SWAP_PANEL vs. TOKEN_BUY_PANEL vs. plain
// TOKEN_PANEL, depending on which tab is visible); (2) the actual
// openActiveListPanel(feedType, onCommit, peerAddress) call. Both are real
// ExchangeContext-runtime concerns — this component only renders whatever
// icon/symbol/address/click-handler it's handed.

'use client';

import React, { useCallback, useRef } from 'react';
import { AssetSelectDropDown, ASSET_SELECT_DISPLAY } from '@sponsorcoin/spcoin-panels';

export interface TokenSelectDropDownProps {
  /** Rendered in the icon slot when a token is selected — the real caller
   *  resolves this (TokenLogo), same convention as every other promoted
   *  dropdown's icon prop. */
  icon?: React.ReactNode;
  hasEntity?: boolean;
  address?: string;
  symbol?: string;
  name?: string;
  /** Fallback label shown (before ": ") when no token is selected. */
  label?: string;
  /** Row click — no default open-a-picker behavior: the real caller
   *  supplies its own openActiveListPanel orchestration, since which feed
   *  to open (and the re-entrancy guard around it) is an ExchangeContext-
   *  runtime concern this package has no knowledge of. Omit for an inert
   *  pill. */
  onSelectClick?: (e: React.SyntheticEvent) => void;
  onAddressClick?: (e: React.MouseEvent) => void;
  /** Whether a chevron renders at all — Token's chevron has no open/closed
   *  direction toggle (unlike Account/Agent/Recipient's CHEVRON_UP/DN),
   *  just present-or-absent, matching the original's
   *  `chevronPanelId !== undefined` check. */
  showChevron?: boolean;
  /** Bitmask (see ASSET_SELECT_DISPLAY, re-exported from AssetSelectDropDown) overriding the default entirely. */
  showDisplay?: number;
  addrPrePostSize?: number;
  showSymbol?: boolean;
  showName?: boolean;
  collapseKey?: unknown;
  onExpandedChange?: (expanded: boolean) => void;
  /** When true, only the chevron opens the token list; the rest of the pill (including the icon) is otherwise inert to row-open clicks. */
  restrictRowClickToChevron?: boolean;
  copyLabel?: string;
  /** Outer wrapper's own positioning — matches the original's absolute top-[12px]/right-[20px]/min-w-[50px], now inline so it doesn't depend on Tailwind. Override for a caller needing different placement. */
  style?: React.CSSProperties;
  /** Debug/test hook only (see the original's own data-panel-root usage) — which tradeData root this instance is bound to. Purely cosmetic, no rendering effect. */
  dataPanelRoot?: string;
  panelGateId?: number;
  panelGate?: React.ComponentType<{
    panel: number;
    children: React.ReactNode;
    lazyLoad?: boolean;
    className?: string;
  }>;
}

const DEFAULT_WRAPPER_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 20,
  minWidth: 50,
};

export default function TokenSelectDropDown({
  icon,
  hasEntity = false,
  address,
  symbol,
  name,
  label = 'Select Token',
  onSelectClick,
  onAddressClick,
  showChevron = false,
  showDisplay,
  addrPrePostSize = 4,
  showSymbol = false,
  showName = false,
  collapseKey,
  onExpandedChange,
  restrictRowClickToChevron = false,
  copyLabel = 'Copy token address',
  style,
  dataPanelRoot,
  panelGateId,
  panelGate,
}: TokenSelectDropDownProps) {
  // Guard against re-entrancy while a previous click is still settling —
  // real behavior (not just logging, see the original's own doc comment on
  // why this survived a debug-cleanup pass), kept here since it's about
  // this component's own click affordance, not the ExchangeContext write
  // the click eventually triggers.
  const openingRef = useRef(false);

  const handleRowClick = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (openingRef.current) return;
      openingRef.current = true;
      setTimeout(() => {
        openingRef.current = false;
      }, 400);
      onSelectClick?.(e);
    },
    [onSelectClick],
  );

  const resolvedShowDisplay =
    showDisplay ??
    (ASSET_SELECT_DISPLAY.ICON |
      ASSET_SELECT_DISPLAY.SYMBOL |
      ASSET_SELECT_DISPLAY.ADDRESS |
      ASSET_SELECT_DISPLAY.COPY |
      ASSET_SELECT_DISPLAY.ADDR_COMP |
      (showChevron ? ASSET_SELECT_DISPLAY.CHEVRON_DN : 0));

  return (
    <div style={{ ...DEFAULT_WRAPPER_STYLE, ...style }} data-panel-root={dataPanelRoot}>
      <AssetSelectDropDown
        rootId="TokenSelectDropDown"
        hasEntity={hasEntity}
        icon={icon}
        symbol={symbol}
        name={name}
        address={address ?? ''}
        placeholderLabel={label}
        copyLabel={copyLabel}
        showDisplay={resolvedShowDisplay}
        showSymbol={showSymbol}
        showName={showName}
        onRowClick={handleRowClick}
        onAddressClick={onAddressClick}
        restrictRowClickToChevron={restrictRowClickToChevron}
        addrPrePostSize={addrPrePostSize}
        panelGateId={panelGateId}
        panelGate={panelGate}
        collapseKey={collapseKey}
        onExpandedChange={onExpandedChange}
      />
    </div>
  );
}

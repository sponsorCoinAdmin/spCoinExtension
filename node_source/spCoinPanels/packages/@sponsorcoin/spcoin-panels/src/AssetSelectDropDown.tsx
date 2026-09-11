// File: node_source/spCoinPanels/AssetSelectDropDowns/AssetSelectDropDown.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import type { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';

// Inlined (2026-09-11, portability pass) rather than imported from the
// app-internal '@/lib/utils/addressUtils' (doesn't resolve outside this
// app's own build). @sponsorcoin/spcoin-lib@1.0.4 now has the same
// function published — tried switching to it during the 2026-09-11
// cleanup pass, reverted: spcoin-lib is genuinely ESM-only ("type":
// "module", confirmed by reading its real dist output) while this
// package is CommonJS — Node can't require() real ESM content, and
// spcoin-lib's own "require" exports condition doesn't actually work
// despite claiming to (a latent misconfiguration, not a fixable typo
// here). Fixing that properly means either making this package ESM or
// dual-publishing spcoin-lib as CJS+ESM — real, disproportionate cost
// for a stable 5-line function. Kept duplicated on purpose; byte-
// identical to the published version, so the duplication carries no
// drift risk in practice.
function truncateMiddle(addr: string, start = 10, end = 8): string {
  return addr.length > start + end + 3
    ? `${addr.slice(0, start)}...${addr.slice(-end)}`
    : addr;
}

/**
 * Bitwise flags controlling which sub-elements AssetSelectDropDown renders.
 * Shared by AccountSelectDropDown and TokenSelectDropDown.
 */
export const ASSET_SELECT_DISPLAY = {
  ICON: 1,
  ADDRESS: 2,
  SYMBOL: 4,
  NAME: 8,
  CHEVRON_UP: 16,
  CHEVRON_DN: 32,
  COPY: 64,
  /** When set, the address/copy/chevron render inside the styled (bg + rounded) pill container; otherwise they render bare. */
  ADDR_COMP: 128,
  /** Modifies ADDR_COMP: frosted-glass pill (backdrop-blur + translucent bg) instead of the solid one. No effect unless ADDR_COMP is also set. */
  ADDR_COMP_BLUR: 256,
} as const;

export interface AssetSelectDropDownProps {
  /** Rendered inside the icon slot (e.g. AccountAvatar / TokenLogo). Only shown when hasEntity && ICON bit set. */
  icon?: React.ReactNode;
  /** Entity's symbol, for the "$symbol | $name" line. */
  symbol?: string;
  /** Entity's name, for the "$symbol | $name" line. */
  name?: string;
  /** Entity's raw address (this component truncates it for display). */
  address?: string;
  /** Overrides the address span's hover title. Defaults to `address` itself when omitted — set this to show extra hover-only context (e.g. network auth source) without changing the visible label. */
  addressTitle?: string;
  /** Whether an entity is currently selected. When false, placeholderLabel renders instead of the address. */
  hasEntity: boolean;
  /** Text shown (before ": ") when hasEntity is false; also used as the chevron's title/aria-label. */
  placeholderLabel?: string;
  /** aria-label/title for the copy button. */
  copyLabel?: string;
  /** Bitmask (see ASSET_SELECT_DISPLAY) controlling which sub-elements render. */
  showDisplay: number;
  /** Convenience additive flag — shows the "$symbol | $name" line's symbol half on top of whatever showDisplay already sets. Defaults to false. */
  showSymbol?: boolean;
  /** Convenience additive flag — shows the "$symbol | $name" line's name half on top of whatever showDisplay already sets. Defaults to false. */
  showName?: boolean;
  /**
   * Extra content rendered inline at the end of the "$symbol | $name" line
   * itself (e.g. an "Active" badge) — same line as the name text, not the
   * icon/button column on the far right. No effect unless that line is
   * actually showing (hasEntity && (showSymbol || showName)).
   */
  nameLineSuffix?: React.ReactNode;
  /** Overrides the "$symbol | $name" line's className (default: text-sm font-semibold leading-tight text-white) — e.g. a caller showing an error message in that slot instead of a real symbol/name (see ErrorAssetPreview.tsx). */
  nameLineClassName?: string;
  /** Click handler for the row (chevron, and the address when onAddressClick isn't given). */
  onRowClick?: (e: React.SyntheticEvent) => void;
  /**
   * Optional separate click handler for the address text only. When provided,
   * clicking the address stops propagation and calls this instead of
   * onRowClick. Omit to keep the address bubbling into onRowClick.
   */
  onAddressClick?: (e: React.MouseEvent) => void;
  /**
   * Optional override for the icon/avatar click, uniform across every
   * inheriting member (AccountSelectDropDown, TokenSelectDropDown) — neither
   * has to wire this into its own icon component. Intercepted in the capture
   * phase so it preempts whatever default click behavior the icon itself
   * implements (e.g. AccountAvatar opening the asset view — the same
   * openAccountComponent call the info.png button uses). When omitted, no
   * capture handler is attached and the icon's own default behavior runs
   * unmodified, so "open the asset view" still resolves to exactly that same
   * method.
   */
  onIconClick?: (e: React.MouseEvent) => void;
  /**
   * Right-click override for the icon/avatar, same uniform interception
   * pattern as onIconClick (capture phase, preventDefault to suppress the
   * native browser context menu). Omit to leave the native context menu
   * untouched.
   */
  onIconContextMenu?: (e: React.MouseEvent) => void;
  /**
   * Number of characters kept from the start (including "0x") and from the
   * end of the address before/after the "..." filler, e.g. 4 → "0xf3...2266".
   * 0 suppresses the address entirely (regardless of the ADDRESS bit).
   * Omitted/undefined shows the full, untruncated address.
   */
  addrPrePostSize?: number;
  /**
   * Overrides the address row's text-size class for the bare (non-ADDR_COMP)
   * case only — callers with extra vertical room to spare (e.g. a top-level
   * list row) can size the address up from the text-sm default. No effect
   * when ADDR_COMP is set — that pill case has its own fixed text-[17px].
   */
  addressSizeClassName?: string;
  /** Panel id this instance is gated by. If omitted, renders unconditionally (no PanelGate). */
  panelGateId?: SP_COIN_DISPLAY;
  /**
   * The PanelGate implementation to gate with, when panelGateId is set.
   * Injected rather than imported directly (2026-09-11, portability pass)
   * so this file has no hardcoded dependency on any one app's PanelGate —
   * the web app passes its real '@/components/utility/PanelGate'; a future
   * standalone consumer (e.g. the extension) would pass its own or omit
   * gating entirely. No effect when panelGateId is omitted. If panelGateId
   * IS set but this is omitted, renders unconditionally rather than
   * throwing — this is a display component, not a security gate, so
   * failing open (visible) is the safe default for a misconfigured caller.
   */
  panelGate?: React.ComponentType<{
    panel: SP_COIN_DISPLAY;
    children: React.ReactNode;
    lazyLoad?: boolean;
    className?: string;
  }>;
  /** Root element id. */
  rootId?: string;
  /**
   * Starting/reset state for the compact<->full address toggle (only
   * meaningful when addrPrePostSize is set, i.e. canToggleAddress). Defaults
   * to false (today's look — starts compact). A caller showing one single
   * important address (not a long list row) can start it expanded while
   * still leaving it collapsible via the same click.
   */
  defaultExpanded?: boolean;
  /**
   * When true, onRowClick only fires from the chevron itself — the rest of
   * the pill (icon, name, address) becomes inert to clicks instead of the
   * whole row opening the picker. Default false (existing behavior: the
   * whole row is clickable), which is still correct for list rows (each row
   * IS the thing being picked) and existing trigger pills elsewhere. Only
   * meaningful when a chevron is actually shown (CHEVRON_UP/CHEVRON_DN) —
   * with neither bit set, nothing would open onRowClick at all.
   */
  restrictRowClickToChevron?: boolean;
  /**
   * Any value that changes when this row's own tab/panel becomes visible
   * again (e.g. pass usePanelVisible(SEND_PANEL) — a boolean flipping
   * false→true counts as a change). Forces the compact/full address toggle
   * back to defaultExpanded when it changes. Without this, a row that stays
   * mounted-but-hidden across tab switches (the norm in this app, to avoid
   * remount/refetch churn) keeps whatever expand state the user last left
   * it in instead of reopening collapsed. Omit for rows that don't live
   * inside a switchable tab (nothing to reset on).
   */
  collapseKey?: unknown;
  /**
   * Fires whenever the compact/full address toggle changes (both from a
   * user click and from the collapseKey-driven reset above). Callers whose
   * own layout has a label/other content positioned where the expanded
   * (untruncated) address pill can grow into it — see SendSelectPanel/
   * SendRecipientPanel's own absolute-positioned label — use this to hide
   * that content while expanded instead of letting the two overlap.
   */
  onExpandedChange?: (expanded: boolean) => void;
  /**
   * Overrides the icon slot's default `h-10 w-10` sizing (the rest of that
   * box's classes — shrink-0/overflow-hidden/rounded-lg/etc. — are
   * unaffected, only the size). Omit to keep every existing consumer's
   * look unchanged; a caller wanting a bigger/smaller icon than the shared
   * 40px default passes its own size classes here instead of this
   * component growing a special case per caller.
   */
  iconSizeClassName?: string;
}

export default function AssetSelectDropDown({
  icon,
  symbol,
  name,
  address = '',
  addressTitle,
  hasEntity,
  placeholderLabel = 'Select',
  copyLabel = 'Copy address',
  showDisplay,
  showSymbol: showSymbolProp = false,
  showName: showNameProp = false,
  nameLineSuffix,
  nameLineClassName = 'text-sm font-semibold leading-tight text-white',
  onRowClick,
  onAddressClick,
  onIconClick,
  onIconContextMenu,
  addrPrePostSize,
  addressSizeClassName = 'text-sm',
  panelGateId,
  panelGate: PanelGate,
  rootId = 'ASSET_SELECT_DROP_DOWN',
  defaultExpanded = false,
  restrictRowClickToChevron = false,
  collapseKey,
  onExpandedChange,
  iconSizeClassName = 'h-10 w-10',
}: AssetSelectDropDownProps) {
  const [copied, setCopied] = useState(false);
  // Clicking the address toggles between compact and full display — separate
  // from addrPrePostSize, which just sets what "compact" means.
  const [addressExpanded, setAddressExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setAddressExpanded(defaultExpanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, defaultExpanded, collapseKey]);

  useEffect(() => {
    onExpandedChange?.(addressExpanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressExpanded]);

  const showIcon = !!(showDisplay & ASSET_SELECT_DISPLAY.ICON);
  const showAddress = !!(showDisplay & ASSET_SELECT_DISPLAY.ADDRESS);
  const showSymbol = !!(showDisplay & ASSET_SELECT_DISPLAY.SYMBOL) || showSymbolProp;
  const showName = !!(showDisplay & ASSET_SELECT_DISPLAY.NAME) || showNameProp;
  const showChevronUp = !!(showDisplay & ASSET_SELECT_DISPLAY.CHEVRON_UP);
  const showChevronDn = !!(showDisplay & ASSET_SELECT_DISPLAY.CHEVRON_DN);
  const showCopy = !!(showDisplay & ASSET_SELECT_DISPLAY.COPY);
  const showAddrComp = !!(showDisplay & ASSET_SELECT_DISPLAY.ADDR_COMP);
  const showAddrCompBlur = !!(showDisplay & ASSET_SELECT_DISPLAY.ADDR_COMP_BLUR);
  const showDivider = showSymbol && showName;

  const renderAddress = showAddress && addrPrePostSize !== 0;
  // Toggling only makes sense when there's actually a compact form to expand
  // out of — full-address mode (addrPrePostSize undefined) has nothing to
  // toggle between.
  const canToggleAddress = addrPrePostSize !== undefined;
  const displayedAddress =
    addrPrePostSize === undefined
      ? address
      : addressExpanded
        ? address
        : truncateMiddle(address, addrPrePostSize, addrPrePostSize);

  const handleAddressClick = useCallback(
    (e: React.MouseEvent) => {
      // Always stop propagation: clicking the address must never fall
      // through to onRowClick (which returns the entity to the caller) —
      // that's the icon's job, not the address's.
      e.preventDefault();
      e.stopPropagation();
      if (onAddressClick) {
        onAddressClick(e);
        return;
      }
      if (canToggleAddress) {
        setAddressExpanded((prev) => !prev);
      }
    },
    [onAddressClick, canToggleAddress],
  );

  const addrRowClassName = showAddrComp
    ? showAddrCompBlur
      // text-[14px], not the original text-[17px] — the expanded (untruncated,
      // addrPrePostSize undefined) 42-char address form was overflowing this
      // pill's container off the edge of the panel; a modest size step down
      // is enough to fit it without needing a different truncation strategy.
      ? 'flex h-[25px] items-center gap-1 rounded-full backdrop-blur-md bg-blue-600/30 ring-1 ring-inset ring-blue-300/30 px-2 font-bold text-[14px] text-white'
      : 'flex h-[25px] items-center gap-1 rounded-full bg-[#243056] px-2 font-bold text-[14px] text-white'
    // Sized explicitly (default text-sm, matching the symbol/name line above
    // it) so it reads at a consistent scale regardless of whatever ambient
    // font-size the caller's own container happens to set.
    : `flex items-center gap-1 ${addressSizeClassName}`;

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!address) return;
      navigator.clipboard.writeText(address).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    },
    [address],
  );

  const content = (
    <div
      id={rootId}
      className={`flex items-center gap-1 ${restrictRowClickToChevron ? '' : 'cursor-pointer'}`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={restrictRowClickToChevron ? undefined : onRowClick}
    >
      {hasEntity && showIcon && icon && (
        <div
          className={`flex ${iconSizeClassName} shrink-0 items-center justify-center overflow-hidden rounded-lg relative -top-[2px] ${onIconClick ? 'cursor-pointer' : ''}`}
          onClickCapture={
            onIconClick
              ? (e) => {
                  // Capture phase: runs before the icon's own bubble-phase
                  // onClick (e.g. AccountAvatar's), so stopping here fully
                  // preempts it instead of racing/duplicating with it.
                  e.stopPropagation();
                  onIconClick(e);
                }
              : undefined
          }
          onContextMenuCapture={
            onIconContextMenu
              ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onIconContextMenu(e);
                }
              : undefined
          }
        >
          {icon}
        </div>
      )}

      <div className="flex flex-col justify-center">
        {/* (symbol || name): hasEntity alone isn't enough to justify this row
            — AccountSelectDropDown's "unselected placeholder" entity (blank
            address, see its isUnselected) intentionally passes neither, so
            there's nothing to show here and no empty "|" divider line. */}
        {hasEntity && (showSymbol || showName) && (symbol || name) && (
          <div className={`flex items-center gap-1 ${nameLineClassName}`}>
            {showSymbol && <span>{symbol}</span>}
            {showDivider && <span className="text-slate-400">|</span>}
            {showName && <span>{name}</span>}
            {nameLineSuffix}
          </div>
        )}

        <div className={addrRowClassName}>
          {hasEntity ? (
            renderAddress &&
            (address ? (
              <span
                title={addressTitle ?? address}
                onClick={handleAddressClick}
                onMouseDown={(e) => e.stopPropagation()}
                className={onAddressClick || canToggleAddress ? 'cursor-pointer' : undefined}
              >
                {displayedAddress}
              </span>
            ) : (
              // hasEntity but no address yet — a caller-supplied "unselected"
              // placeholder entity (see AccountSelectDropDown's N/A/fallback-
              // icon handling), distinct from hasEntity===false below: that
              // path also suppresses the icon and symbol/name row, which a
              // caller deliberately showing placeholder icon/N/A content
              // doesn't want.
              <span className="text-slate-400">{placeholderLabel}</span>
            ))
          ) : (
            <>&nbsp;{placeholderLabel}: </>
          )}
          {address && showCopy && (
            <button
              type="button"
              onClick={handleCopy}
              onMouseDown={(e) => e.stopPropagation()}
              className="shrink-0 flex items-center justify-center rounded hover:bg-white/10 p-0.5"
              aria-label={copyLabel}
              title={copyLabel}
            >
              {copied
                ? <Check size={14} className="text-green-400" />
                : <Copy size={14} />
              }
            </button>
          )}
          {(showChevronUp || showChevronDn) && (
            <span
              className={`inline-flex ${restrictRowClickToChevron ? 'cursor-pointer' : ''}`}
              title={placeholderLabel}
              onClick={
                restrictRowClickToChevron
                  ? (e) => {
                      e.stopPropagation();
                      onRowClick?.(e);
                    }
                  : undefined
              }
              onMouseDown={restrictRowClickToChevron ? (e) => e.stopPropagation() : undefined}
            >
              {showChevronUp && <ChevronUp size={16} aria-label={placeholderLabel} />}
              {showChevronDn && <ChevronDown size={16} aria-label={placeholderLabel} />}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (panelGateId === undefined || !PanelGate) return content;

  return (
    <PanelGate panel={panelGateId} lazyLoad={false}>
      {content}
    </PanelGate>
  );
}

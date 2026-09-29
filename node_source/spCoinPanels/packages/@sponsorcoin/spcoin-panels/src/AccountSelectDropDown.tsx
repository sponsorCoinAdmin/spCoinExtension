// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AccountSelectDropDown.tsx
//
// 2026-09-18, moved in from node_source/spCoinPanels/AssetSelectDropDowns/
// (web-app-only glue) — third of the five real dropdown wrapper components,
// and the shared base Token/Agent/Recipient's own wrappers build on. Same
// treatment as PoolSelectDropDown/AgentSelectDropDown: every
// ExchangeContext-hook-derived value (the resolved account's icon/address/
// symbol/name, the open/close click handler, the list-open state driving
// chevron direction) becomes an optional prop; this component itself calls
// no hooks and has no dependency on `spCoinAccount`/`@/lib/...` at all. The
// web app's own AccountSelectDropDown (now a thin wrapper) resolves
// AccountAvatar-or-QuestionRed-fallback icon, calls useOpenActiveListPanel/
// useSelectionCommit/usePanelVisible, and feeds the results down — same
// split StakingStatusPanelLayoutContainer.tsx already established for
// TradeAmountRow.
//
// Built on AssetSelectDropDown directly (like PoolSelectDropDown) rather
// than duplicated inline-style markup (like AgentSelectDropDown) — this
// component's own unique logic (icon/symbol/name resolution, default click
// behavior) is small relative to the ~683 lines of real, already-portable
// layout/truncation/copy/chevron logic AssetSelectDropDown owns; re-
// implementing that a second time would be exactly the kind of duplication
// this migration exists to remove. See AssetSelectDropDown.tsx's own
// styling: every Tailwind className there already has a matching inline
// `style` (including a regex parser for caller-supplied size overrides) —
// confirmed genuinely portable, not just nominally so.

'use client';

import React, { useCallback } from 'react';
import AssetSelectDropDown, { ASSET_SELECT_DISPLAY } from './AssetSelectDropDown';

/** Re-exported under this name for callers that only ever use it for accounts — same bit values as every other *_SELECT_DISPLAY alias. */
export const ACCOUNT_SELECT_DISPLAY = ASSET_SELECT_DISPLAY;

export interface AccountSelectDropDownProps {
  /** Rendered in the icon slot when an account is selected — the real
   *  caller resolves this (AccountAvatar, or the QuestionRed.png
   *  placeholder for a real-but-blank "unselected" account), same
   *  convention as TradeAmountRow's tokenIcon/AgentSelectDropDown's icon. */
  icon?: React.ReactNode;
  /** Whether an account entity exists at all (distinct from address being
   *  empty — see AssetSelectDropDown's own hasEntity doc comment: a
   *  caller-supplied "unselected" placeholder entity still wants the
   *  placeholderLabel shown in the address slot, not the bare "$label: "
   *  fallback hasEntity=false renders instead). */
  hasEntity?: boolean;
  address?: string;
  symbol?: string;
  name?: string;
  /** Row click — no default open-a-picker behavior (unlike the old web-app
   *  version's hardcoded REMOTE_ACCOUNT_RECIPIENT_LIST open/close): the
   *  real caller supplies its own open/close orchestration, since which
   *  list feed to open is an ExchangeContext-runtime concern this package
   *  has no knowledge of. Omit for an inert pill. */
  onSelectClick?: (e: React.SyntheticEvent) => void;
  /** Whether the picker this trigger opens is currently open — flips the
   *  chevron direction, same convention as AgentSelectDropDown's listOpen. */
  listOpen?: boolean;
  /** Fallback label shown (before ": ") when nothing is selected. */
  label?: string;
  /** Bitmask (see ACCOUNT_SELECT_DISPLAY) controlling which sub-elements render. Defaults to icon+address+chevron+copy+pill. */
  showDisplay?: number;
  showSymbol?: boolean;
  showName?: boolean;
  nameLineSuffix?: React.ReactNode;
  nameLineClassName?: string;
  onAddressClick?: (e: React.MouseEvent) => void;
  onIconClick?: (e: React.MouseEvent) => void;
  onIconContextMenu?: (e: React.MouseEvent) => void;
  /** Chars kept before/after the "..." filler (see AssetSelectDropDown). Defaults to 4. */
  addrPrePostSize?: number;
  addressSizeClassName?: string;
  addressTitle?: string;
  copyLabel?: string;
  collapseKey?: unknown;
  onExpandedChange?: (expanded: boolean) => void;
  iconSizeClassName?: string;
  pillHeightClassName?: string;
  pillFontClassName?: string;
  chevronSize?: number;
  copyIconSize?: number;
  /** Panel id this instance is gated by. If omitted, renders unconditionally (no PanelGate) — same contract as AssetSelectDropDown's own panelGateId/panelGate pair. */
  panelGateId?: number;
  /** The PanelGate implementation to gate with, when panelGateId is set — injected so this file has no hardcoded dependency on any one app's PanelGate. */
  panelGate?: React.ComponentType<{
    panel: number;
    children: React.ReactNode;
    lazyLoad?: boolean;
    className?: string;
  }>;
}

const AccountSelectDropDown: React.FC<AccountSelectDropDownProps> = ({
  icon,
  hasEntity = false,
  address,
  symbol,
  name,
  onSelectClick,
  listOpen,
  label = 'Select Account',
  showDisplay,
  showSymbol = false,
  showName = false,
  nameLineSuffix,
  nameLineClassName,
  onAddressClick,
  onIconClick,
  onIconContextMenu,
  addrPrePostSize = 4,
  addressSizeClassName,
  addressTitle,
  copyLabel = 'Copy Address',
  collapseKey,
  onExpandedChange,
  iconSizeClassName,
  pillHeightClassName,
  pillFontClassName,
  chevronSize,
  copyIconSize,
  panelGateId,
  panelGate,
}) => {
  const resolvedShowDisplay =
    showDisplay ??
    (ACCOUNT_SELECT_DISPLAY.ICON |
      ACCOUNT_SELECT_DISPLAY.ADDRESS |
      (listOpen ? ACCOUNT_SELECT_DISPLAY.CHEVRON_UP : ACCOUNT_SELECT_DISPLAY.CHEVRON_DN) |
      ACCOUNT_SELECT_DISPLAY.COPY |
      ACCOUNT_SELECT_DISPLAY.ADDR_COMP);

  const handleRowClick = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectClick?.(e);
    },
    [onSelectClick],
  );

  return (
    <AssetSelectDropDown
      rootId="ACCOUNT_SELECT_DROP_DOWN"
      hasEntity={hasEntity}
      icon={icon}
      symbol={symbol}
      name={name}
      address={address}
      placeholderLabel={label}
      copyLabel={copyLabel}
      showDisplay={resolvedShowDisplay}
      showSymbol={showSymbol}
      showName={showName}
      nameLineSuffix={nameLineSuffix}
      nameLineClassName={nameLineClassName}
      onRowClick={handleRowClick}
      onAddressClick={onAddressClick}
      onIconClick={onIconClick}
      onIconContextMenu={onIconContextMenu}
      addrPrePostSize={addrPrePostSize}
      addressSizeClassName={addressSizeClassName}
      addressTitle={addressTitle}
      panelGateId={panelGateId}
      panelGate={panelGate}
      collapseKey={collapseKey}
      onExpandedChange={onExpandedChange}
      iconSizeClassName={iconSizeClassName}
      pillHeightClassName={pillHeightClassName}
      pillFontClassName={pillFontClassName}
      chevronSize={chevronSize}
      copyIconSize={copyIconSize}
    />
  );
};

export default AccountSelectDropDown;

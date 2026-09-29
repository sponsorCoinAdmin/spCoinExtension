// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AssetListRow.tsx
// Portable version of the real app's TokenListItem.tsx/AccountListItem.tsx
// (2026-09-15) — the single row shape shared by all four "TOKEN META"-style
// ACTIVE_LIST_PANEL_MODES screens (REMOTE_TOKEN_LIST, REMOTE_ACCOUNT_AGENT_LIST,
// REMOTE_ACCOUNT_RECIPIENT_LIST, REMOTE_ACCOUNT_SEND_LIST). Every sizing value
// below (row height, padding, pill/icon/info-button dimensions) is copied
// from the real components' own doc comments, which record the same-day
// measurements this package was built to match — not re-guessed here.
// Placeholder in the same sense every other file in this package is:
// `onClick`/`onInfoClick` are plain optional callbacks, no real
// select/preview logic behind them.

'use client';

import React from 'react';
import AssetSelectDropDown, { ASSET_SELECT_DISPLAY } from './AssetSelectDropDown';

const DEFAULT_INFO_ICON_SRC = '/assets/miscellaneous/info.png';

export interface AssetListRowProps {
  icon?: React.ReactNode;
  /** Convenience alternative to `icon` — a resolved image URL/data URL
   *  that this row turns into an actual <img> itself, same convention as
   *  MeritWalletNetworkRow.iconSrc/AccountListEntry.iconSrc (this
   *  package's network/account row equivalents). Ignored when `icon` is
   *  already given. */
  iconSrc?: string;
  symbol?: string;
  name?: string;
  address?: string;
  onSelect?: () => void;
  onInfoClick?: () => void;
  /** Overrides the info button's own icon — see WalletHeader.tsx's
   *  identical `iconSrc` doc comment for why this is a prop rather than a
   *  hardcoded app-relative path (the extension bundles its own copy and
   *  passes `chrome.runtime.getURL(...)` in). */
  infoIconSrc?: string;
  /** 2026-09-15, added for AccountListCard.tsx's own reuse of this row —
   *  an inline suffix on the Symbol|Name line itself (e.g. an "ACTIVE"
   *  tag), matching the real app's AccountRow.tsx own nameLineSuffix use.
   *  Forwarded straight through to AssetSelectDropDown; omitted by every
   *  other caller of this row (Token/Agent/Recipient/Account-list), which
   *  have no such badge. */
  badge?: React.ReactNode;
  /** 2026-09-22, Phase B.2 Stage 4 follow-up (ERC20 send) — pure passthrough
   *  data, not rendered by this row at all. `fetchTokenList`'s own items
   *  already carry this (allData=true), just not previously threaded
   *  through row-building into MeritWallet.tsx's onSelect commit — see
   *  that file's own PickedEntry.decimals doc comment for the real
   *  consumer. Optional and ignored by every non-token row (accounts have
   *  no decimals concept). */
  decimals?: number;
}

export default function AssetListRow({
  icon,
  iconSrc,
  symbol,
  name,
  address,
  onSelect,
  onInfoClick,
  infoIconSrc = DEFAULT_INFO_ICON_SRC,
  badge,
}: AssetListRowProps) {
  const metaLabel = `${symbol || name || 'Asset'} Meta Data`;
  // 2026-09-16, on request ("find the icons like the web page finds them")
  // — resolved here, once, rather than requiring every caller (token list,
  // agent/recipient list, account list) to convert iconSrc itself the way
  // MeritWallet.tsx already has to for NetworkListRow's rows.
  const resolvedIcon =
    icon ??
    (iconSrc ? (
      <img src={iconSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    ) : undefined);

  return (
    // 2026-09-16, on request ("do this as well for every row, add 2px top
    // and bottom buffer") — scaled to match NetworkListRow.tsx's own
    // Rewards-table-derived compact scale (row ~22.5px, 14px icon, 10px
    // pill height, 9px pill font, 10px name/symbol, 9px chevron/copy/info
    // icon), same reasoning as that file's own comment: no exact
    // Rewards-table equivalent exists for icon/pill/info-button sizing
    // (that table has none), so these are the same proportional scale-down
    // NetworkListRow already uses, not a second independently-measured
    // value. paddingTop/Bottom: 2 is new — the compact scale had zero
    // vertical breathing room otherwise (a fixed-height box with content
    // centered edge-to-edge).
    <div
      style={{
        width: '100%',
        // 2026-09-16, corrected — same fix as NetworkListRow.tsx: the row
        // needs to genuinely grow 4px taller (2px top + 2px bottom), not
        // just gain inner padding within an unchanged maxHeight. 22.5 + 4
        // = 26.5.
        minHeight: 26.5,
        maxHeight: 26.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 2,
        paddingBottom: 2,
        paddingLeft: 5,
        paddingRight: 10,
        boxSizing: 'border-box',
      }}
    >
      <AssetSelectDropDown
        icon={resolvedIcon}
        symbol={symbol}
        name={name}
        address={address ?? ''}
        hasEntity={!!address}
        showDisplay={
          ASSET_SELECT_DISPLAY.ICON |
          ASSET_SELECT_DISPLAY.ADDRESS |
          ASSET_SELECT_DISPLAY.SYMBOL |
          ASSET_SELECT_DISPLAY.NAME |
          ASSET_SELECT_DISPLAY.COPY |
          ASSET_SELECT_DISPLAY.ADDR_COMP
        }
        addrPrePostSize={4}
        onRowClick={onSelect}
        iconSizeClassName="h-[17.5px] w-[17.5px]"
        pillHeightClassName="h-[10px]"
        pillFontClassName="text-[9px]"
        chevronSize={9}
        copyIconSize={9}
        nameLineClassName="text-[10px] font-semibold leading-tight text-white"
        nameLineSuffix={badge}
      />
      <button
        type="button"
        onClick={onInfoClick}
        aria-label={metaLabel}
        title={metaLabel}
        style={{
          borderRadius: 4,
          width: 14,
          height: 14,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: 'transparent',
          cursor: onInfoClick ? 'pointer' : 'default',
          padding: 0,
        }}
      >
        <img
          src={infoIconSrc}
          alt="Info"
          width={11}
          height={11}
          style={{ height: 11, width: 11, objectFit: 'contain' }}
        />
      </button>
    </div>
  );
}
